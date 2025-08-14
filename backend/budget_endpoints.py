#!/usr/bin/env python3
"""
Budget System Endpoints
Provides API endpoints for the budget system with caching, real-time updates, and AI insights
"""

import os
import json
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, Body
from fastapi.responses import JSONResponse

# Import budget bridge
import sys
sys.path.append('..')
from budget_bridge import get_budget_bridge, initialize_budget_bridge

# Import Redis for caching
try:
    from backend.redis_manager_simple import redis_manager
    REDIS_AVAILABLE = True
except ImportError:
    print("Redis not available - caching disabled for budget endpoints")
    REDIS_AVAILABLE = False

# Import WebSocket manager for real-time updates
try:
    from backend.websocket_redis_manager import websocket_manager, MessageType
    WEBSOCKET_AVAILABLE = True
except ImportError:
    print("WebSocket manager not available - real-time updates disabled")
    WEBSOCKET_AVAILABLE = False

# Import rate limiting
try:
    from backend.security import rate_limit
    RATE_LIMIT_AVAILABLE = True
except ImportError:
    print("Rate limiting not available - using dummy implementation")
    RATE_LIMIT_AVAILABLE = False
    # Dummy rate limit decorator
    def rate_limit(max_requests=100, window=60):
        def decorator(func):
            return func
        return decorator

# Import auth
try:
    from backend.auth import get_current_user
    AUTH_AVAILABLE = True
except ImportError:
    print("Auth not available - using dummy implementation")
    AUTH_AVAILABLE = False
    # Dummy auth
    async def get_current_user(request: Request = None):
        return {"id": "dummy_user", "email": "user@example.com"}

# Setup logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/budget", tags=["Budget"])

# Initialize budget bridge if not already initialized
if not get_budget_bridge():
    initialize_budget_bridge()

# Cache helpers
async def get_cached_data(cache_key: str) -> Optional[Dict]:
    """Get data from cache if available"""
    if not REDIS_AVAILABLE:
        return None
    
    try:
        cached_data = await redis_manager.get(cache_key)
        if cached_data:
            return json.loads(cached_data)
    except Exception as e:
        logger.error(f"Cache error: {e}")
    
    return None

async def set_cached_data(cache_key: str, data: Dict, expire_seconds: int = 300) -> bool:
    """Set data in cache with expiration"""
    if not REDIS_AVAILABLE:
        return False
    
    try:
        await redis_manager.set(
            cache_key,
            json.dumps(data),
            expire=expire_seconds
        )
        return True
    except Exception as e:
        logger.error(f"Cache error: {e}")
        return False

# Endpoints
@router.get("/summary")
@rate_limit(max_requests=20, window=60) if RATE_LIMIT_AVAILABLE else None
async def get_budget_summary(request: Request, user = Depends(get_current_user)):
    """Get comprehensive budget summary for a family"""
    user_id = user.get("id") or user.get("email")
    cache_key = f"budget:summary:{user_id}"
    
    # Try to get from cache first
    cached_data = await get_cached_data(cache_key)
    if cached_data:
        return cached_data
    
    # Get from budget bridge
    budget_bridge = get_budget_bridge()
    if not budget_bridge:
        raise HTTPException(status_code=503, detail="Budget service unavailable")
    
    budget_data = await budget_bridge.get_family_budget_summary(user_id)
    
    # Cache the result
    await set_cached_data(cache_key, budget_data, expire_seconds=300)  # 5 minutes cache
    
    return budget_data

@router.post("/envelopes")
@rate_limit(max_requests=10, window=60) if RATE_LIMIT_AVAILABLE else None
async def create_budget_envelope(request: Request, envelope_data: Dict = Body(...), user = Depends(get_current_user)):
    """Create new budget envelope/category"""
    user_id = user.get("id") or user.get("email")
    
    # Get from budget bridge
    budget_bridge = get_budget_bridge()
    if not budget_bridge:
        raise HTTPException(status_code=503, detail="Budget service unavailable")
    
    result = await budget_bridge.create_budget_envelope(user_id, envelope_data)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    # Invalidate cache
    if REDIS_AVAILABLE:
        await redis_manager.delete(f"budget:summary:{user_id}")
    
    # Send real-time update
    if WEBSOCKET_AVAILABLE:
        await websocket_manager.broadcast_to_user(
            user_id=user_id,
            message_type=MessageType.BUDGET_UPDATED,
            data={
                "type": "envelope_created",
                "envelope": result["envelope"],
                "timestamp": datetime.now().isoformat()
            }
        )
    
    return result

@router.post("/transactions")
@rate_limit(max_requests=20, window=60) if RATE_LIMIT_AVAILABLE else None
async def add_transaction(request: Request, transaction_data: Dict = Body(...), user = Depends(get_current_user)):
    """Add new transaction to budget"""
    user_id = user.get("id") or user.get("email")
    
    # Get from budget bridge
    budget_bridge = get_budget_bridge()
    if not budget_bridge:
        raise HTTPException(status_code=503, detail="Budget service unavailable")
    
    result = await budget_bridge.add_transaction(user_id, transaction_data)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    # Invalidate cache
    if REDIS_AVAILABLE:
        await redis_manager.delete(f"budget:summary:{user_id}")
    
    # Send real-time update
    if WEBSOCKET_AVAILABLE:
        await websocket_manager.broadcast_to_user(
            user_id=user_id,
            message_type=MessageType.BUDGET_UPDATED,
            data={
                "type": "transaction_added",
                "transaction": result["transaction"],
                "timestamp": datetime.now().isoformat()
            }
        )
    
    # Check if budget alert needed
    if transaction_data.get("type") == "EXPENSE" and WEBSOCKET_AVAILABLE:
        # Get updated budget summary to check health
        budget_data = await budget_bridge.get_family_budget_summary(user_id)
        
        # Send alert if budget health is warning or critical
        if budget_data.get("budget_health") in ["warning", "critical"]:
            await websocket_manager.broadcast_to_user(
                user_id=user_id,
                message_type=MessageType.BUDGET_ALERT,
                data={
                    "type": "budget_health_alert",
                    "health": budget_data.get("budget_health"),
                    "remaining": budget_data.get("remaining"),
                    "total_budget": budget_data.get("total_budget"),
                    "timestamp": datetime.now().isoformat()
                }
            )
    
    return result

@router.get("/travel-recommendations")
@rate_limit(max_requests=10, window=60) if RATE_LIMIT_AVAILABLE else None
async def get_travel_budget_recommendations(
    request: Request,
    destination: Optional[str] = None,
    estimated_budget: Optional[float] = None,
    user = Depends(get_current_user)
):
    """Get travel budget recommendations based on destination and estimated budget"""
    user_id = user.get("id") or user.get("email")
    
    # Create cache key based on parameters
    cache_key = f"budget:travel:{user_id}:{destination}:{estimated_budget}"
    
    # Try to get from cache first
    cached_data = await get_cached_data(cache_key)
    if cached_data:
        return cached_data
    
    # Simple mock implementation - in production would use AI service
    recommendations = {
        "destination": destination or "Unknown",
        "estimated_budget": estimated_budget or 2000,
        "recommendations": [
            {
                "category": "Accommodation",
                "allocation": 0.4,  # 40% of budget
                "amount": (estimated_budget or 2000) * 0.4,
                "tips": [
                    "Consider booking apartments for longer stays",
                    "Look for family discounts at hotels"
                ]
            },
            {
                "category": "Food",
                "allocation": 0.25,  # 25% of budget
                "amount": (estimated_budget or 2000) * 0.25,
                "tips": [
                    "Local markets can save money on groceries",
                    "Lunch specials are often cheaper than dinner"
                ]
            },
            {
                "category": "Activities",
                "allocation": 0.20,  # 20% of budget
                "amount": (estimated_budget or 2000) * 0.20,
                "tips": [
                    "Many museums have free entry days",
                    "Family passes often provide better value"
                ]
            },
            {
                "category": "Transportation",
                "allocation": 0.10,  # 10% of budget
                "amount": (estimated_budget or 2000) * 0.10,
                "tips": [
                    "Public transportation passes save money",
                    "Consider walking for short distances"
                ]
            },
            {
                "category": "Miscellaneous",
                "allocation": 0.05,  # 5% of budget
                "amount": (estimated_budget or 2000) * 0.05,
                "tips": [
                    "Keep a small emergency fund",
                    "Budget for souvenirs and gifts"
                ]
            }
        ],
        "general_tips": [
            "Track expenses daily to stay on budget",
            "Look for family discounts at attractions",
            "Consider travel insurance for unexpected expenses"
        ],
        "timestamp": datetime.now().isoformat()
    }
    
    # Cache the result
    await set_cached_data(cache_key, recommendations, expire_seconds=3600)  # 1 hour cache
    
    return recommendations

@router.get("/analytics")
@rate_limit(max_requests=5, window=60) if RATE_LIMIT_AVAILABLE else None
async def get_budget_analytics(request: Request, user = Depends(get_current_user)):
    """Get budget analytics and insights"""
    user_id = user.get("id") or user.get("email")
    cache_key = f"budget:analytics:{user_id}"
    
    # Try to get from cache first
    cached_data = await get_cached_data(cache_key)
    if cached_data:
        return cached_data
    
    # Get budget summary first
    budget_bridge = get_budget_bridge()
    if not budget_bridge:
        raise HTTPException(status_code=503, detail="Budget service unavailable")
    
    budget_data = await budget_bridge.get_family_budget_summary(user_id)
    
    # Generate analytics
    analytics = {
        "spending_trends": {
            "last_30_days": {
                "total": budget_data.get("total_spent", 0),
                "by_category": {
                    cat["name"]: cat["spent"] for cat in budget_data.get("categories", [])
                }
            }
        },
        "budget_health": budget_data.get("budget_health", "unknown"),
        "insights": budget_data.get("ai_insights", "No insights available"),
        "recommendations": [
            "Consider reallocating funds from under-utilized categories",
            "Set up automatic savings for travel goals",
            "Review recurring expenses for potential savings"
        ],
        "timestamp": datetime.now().isoformat()
    }
    
    # Cache the result
    await set_cached_data(cache_key, analytics, expire_seconds=1800)  # 30 minutes cache
    
    return analytics

# Performance monitoring endpoint
@router.get("/performance")
async def get_budget_performance(request: Request, user = Depends(get_current_user)):
    """Get budget performance metrics"""
    # This would typically be an admin-only endpoint
    # For now, return mock performance data
    return {
        "api_metrics": {
            "avg_response_time_ms": 120,
            "cache_hit_rate": 0.85,
            "requests_per_minute": 12
        },
        "system_health": {
            "status": "healthy",
            "database_connection": "connected",
            "cache_status": "operational"
        },
        "timestamp": datetime.now().isoformat()
    }