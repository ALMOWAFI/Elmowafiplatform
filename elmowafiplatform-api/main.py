#!/usr/bin/env python3
"""
Unified Elmowafiplatform API
Production-ready FastAPI application with all production features
"""

import os
import logging
from datetime import datetime
from fastapi import FastAPI, Depends, HTTPException, Request, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

# Import production features
from logging_config import configure_structured_logging, get_logger, StructuredLoggingMiddleware
from error_tracking import initialize_sentry, set_user_context, capture_exception
from performance_monitoring import performance_monitor, PrometheusMiddleware, metrics_endpoint
from rate_limiting import RateLimitMiddleware, rate_limit, check_rate_limit
from circuit_breakers import circuit_breaker_manager, circuit_breaker
from graceful_shutdown import lifespan, graceful_shutdown
from secrets_management import secrets_manager, validate_production_secrets
from unified_database import get_unified_database, UnifiedDatabase

# Import JWT authentication
from auth_jwt import (
    get_authenticator,
    get_current_user,
    get_optional_user,
    require_roles,
    require_family_access,
    require_family_role,
    UserCredentials,
    UserRegistration,
    TokenResponse,
    PasswordReset,
    PasswordResetConfirm,
    AuthUser
)

# Import standardized error responses
from error_responses import (
    create_error_response,
    create_authentication_error_response,
    create_authorization_error_response,
    create_not_found_error_response,
    create_server_error_response,
    create_validation_error_response,
    StandardHTTPException,
    AuthenticationException,
    AuthorizationException,
    NotFoundException,
    ValidationException,
    ErrorCodes,
    ErrorDetail,
    get_request_id
)

# Import new photo and game systems
from photo_upload import get_photo_upload_system, get_album_management, get_family_photo_linking
from game_state import get_game_state_manager

# Enhanced database functionality now in unified_database

# Import enhanced circuit breakers
from circuit_breakers_enhanced import (
    circuit_breaker_manager,
    database_circuit_breaker,
    photo_upload_circuit_breaker,
    game_state_circuit_breaker,
    ai_service_circuit_breaker,
    get_circuit_breaker_health
)

# Import enhanced performance monitoring
from performance_monitoring_enhanced import performance_monitor

# Configure structured logging
configure_structured_logging()
logger = get_logger("main")

# Initialize Sentry error tracking
initialize_sentry()

# Validate production secrets
if os.getenv('ENVIRONMENT') == 'production':
    if not validate_production_secrets():
        logger.error("Production secrets validation failed")
        raise RuntimeError("Required production secrets are missing")

# Create FastAPI app with lifespan
app = FastAPI(
    title="Elmowafiplatform Unified API",
    description="Unified platform linking budget, photos, games, and family data",
    version="2.0.0",
    lifespan=lifespan
)

# API Version configuration
API_V1_PREFIX = "/api/v1"
API_VERSION = "v1"

# Add production middleware
app.add_middleware(StructuredLoggingMiddleware)
app.add_middleware(PrometheusMiddleware)
app.add_middleware(RateLimitMiddleware)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv('CORS_ORIGINS', 'http://localhost:3000').split(','),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class FamilyMemberCreate(BaseModel):
    name: str
    name_arabic: Optional[str] = None
    birth_date: Optional[str] = None
    location: Optional[str] = None
    avatar: Optional[str] = None
    relationships: Optional[Dict[str, Any]] = None
    role: str = "member"

class MemoryCreate(BaseModel):
    family_group_id: str
    title: str
    description: Optional[str] = None
    date: str
    location: Optional[str] = None
    image_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    tags: Optional[List[str]] = None
    family_members: Optional[List[str]] = None
    memory_type: str = "photo"
    privacy_level: str = "family"

class BudgetProfileCreate(BaseModel):
    family_group_id: str
    name: str
    description: Optional[str] = None
    currency: str = "USD"

class BudgetEnvelopeCreate(BaseModel):
    budget_profile_id: str
    name: str
    amount: float = 0
    category: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None

class BudgetTransactionCreate(BaseModel):
    budget_profile_id: str
    envelope_id: Optional[str] = None
    family_member_id: Optional[str] = None
    description: str
    amount: float
    transaction_type: str  # EXPENSE, INCOME, TRANSFER
    date: str
    location: Optional[str] = None
    tags: Optional[List[str]] = None

class GameSessionCreate(BaseModel):
    family_group_id: str
    game_type: str
    title: Optional[str] = None
    description: Optional[str] = None
    players: List[str]
    settings: Optional[Dict[str, Any]] = None

class TravelPlanCreate(BaseModel):
    family_group_id: str
    name: str
    destination: str
    start_date: str
    end_date: str
    budget: Optional[float] = None
    participants: Optional[List[str]] = None
    activities: Optional[List[str]] = None

class CulturalHeritageCreate(BaseModel):
    family_group_id: str
    title: str
    title_arabic: Optional[str] = None
    description: Optional[str] = None
    description_arabic: Optional[str] = None
    category: Optional[str] = None
    family_members: Optional[List[str]] = None
    cultural_significance: Optional[str] = None
    tags: Optional[List[str]] = None
    preservation_date: Optional[str] = None
    media_urls: Optional[List[str]] = None

# Photo Upload Models
class PhotoUploadRequest(BaseModel):
    family_group_id: str
    family_members: Optional[List[str]] = None
    album_id: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    privacy_level: str = "family"

class AlbumCreateRequest(BaseModel):
    family_group_id: str
    name: str
    description: Optional[str] = None
    album_type: str = "custom"
    privacy_level: str = "family"
    cover_photo_id: Optional[str] = None

class FamilyPhotoLinkRequest(BaseModel):
    memory_id: str
    family_member_ids: List[str]
    confidence_scores: Optional[List[float]] = None

# Game State Models
class GameSessionCreateRequest(BaseModel):
    family_group_id: str
    game_type: str
    title: Optional[str] = None
    description: Optional[str] = None
    players: List[str] = None
    settings: Optional[Dict[str, Any]] = None
    created_by: Optional[str] = None

class GameJoinRequest(BaseModel):
    session_id: str
    player_id: str
    player_name: str

class GameMoveRequest(BaseModel):
    session_id: str
    player_id: str
    move_data: Dict[str, Any]

# Database dependency
def get_db() -> UnifiedDatabase:
    return get_unified_database()

# Initialize authenticator
def get_auth():
    """Get authenticator instance"""
    db = get_db()
    return get_authenticator(db)

# Enhanced database functionality now in unified_database

# Health check endpoint
@app.get("/api/health")
async def health_check():
    """Health check endpoint with production monitoring"""
    try:
        # Check database connection
        db = get_db()
        with db.get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
        
        # Check circuit breakers
        circuit_breaker_states = circuit_breaker_manager.get_all_states()
        open_circuits = [
            name for name, state in circuit_breaker_states.items() 
            if state["state"] == "open"
    ]
    
    return {
            "status": "healthy" if not open_circuits else "degraded",
            "timestamp": datetime.now().isoformat(),
            "version": "2.0.0",
            "database": "connected",
            "open_circuits": open_circuits,
            "uptime": performance_monitor.get_uptime()
            }
        except Exception as e:
        logger.error(f"Health check failed: {e}")
        capture_exception(e)
        raise StandardHTTPException(
            status_code=500,
            error="Health Check Failed",
            message="System health check encountered an error",
            error_code=ErrorCodes.SERVICE_UNAVAILABLE
        )

# Prometheus metrics endpoint
@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint"""
    return await metrics_endpoint()

# Database health check endpoint
@app.get("/api/v1/database/health")
async def database_health_check():
    """Database health check with detailed pool metrics"""
    try:
        db = get_db()
        pool_health = db.get_pool_health()
        
        return {
            "status": "healthy" if pool_health["state"] == "healthy" else "degraded",
            "timestamp": datetime.now().isoformat(),
            "pool_health": pool_health,
            "database_url_configured": bool(os.getenv('DATABASE_URL')),
            "environment": os.getenv('ENVIRONMENT', 'development')
        }
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        capture_exception(e)
        raise StandardHTTPException(
            status_code=500,
            error="Database Health Check Failed",
            message="Database connection health check failed",
            error_code=ErrorCodes.DATABASE_CONNECTION_FAILED
        )

# Circuit breaker health check endpoint
@app.get("/api/v1/circuit-breakers/health")
async def circuit_breaker_health_check():
    """Circuit breaker health check with detailed metrics"""
    try:
        circuit_health = get_circuit_breaker_health()
        
            return {
            "status": circuit_health["overall_status"],
            "timestamp": circuit_health["timestamp"],
            "total_circuit_breakers": circuit_health["total_circuit_breakers"],
            "circuit_breakers": circuit_health["circuit_breakers"],
            "environment": os.getenv('ENVIRONMENT', 'development')
        }
    except Exception as e:
        logger.error(f"Circuit breaker health check failed: {e}")
        capture_exception(e)
        raise StandardHTTPException(
            status_code=500,
            error="Circuit Breaker Health Check Failed",
            message="Circuit breaker health monitoring failed",
            error_code=ErrorCodes.SERVICE_UNAVAILABLE
        )

# Performance monitoring endpoint
@app.get("/api/v1/performance/summary")
async def performance_summary():
    """Get comprehensive performance summary"""
    try:
        performance_data = performance_monitor.get_performance_summary()
        
        return {
            "status": "success",
            "timestamp": performance_data["timestamp"],
            "performance": performance_data,
            "environment": os.getenv('ENVIRONMENT', 'development')
        }
    except Exception as e:
        logger.error(f"Performance summary failed: {e}")
        capture_exception(e)
        raise StandardHTTPException(
            status_code=500,
            error="Performance Summary Failed",
            message="Unable to retrieve performance metrics",
            error_code=ErrorCodes.SERVICE_UNAVAILABLE
        )

# ============================================================================
# AUTHENTICATION ENDPOINTS
# ============================================================================

@app.post(f"{API_V1_PREFIX}/auth/register", response_model=TokenResponse)
@rate_limit("auth")
async def register_user(user_data: UserRegistration):
    """Register a new user"""
    try:
        auth = get_auth()
        result = await auth.register_user(user_data)
        
        logger.info(f"New user registered: {user_data.email}")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration endpoint error: {e}")
        capture_exception(e)
        raise StandardHTTPException(
            status_code=500,
            error="Registration Failed",
            message="Unable to complete user registration",
            error_code=ErrorCodes.INTERNAL_SERVER_ERROR
        )

@app.post(f"{API_V1_PREFIX}/auth/login", response_model=TokenResponse)
@rate_limit("auth")
async def login_user(credentials: UserCredentials):
    """Authenticate user and return tokens"""
    try:
        auth = get_auth()
        result = await auth.authenticate_user(credentials)
        
        logger.info(f"User logged in: {credentials.email}")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login endpoint error: {e}")
        capture_exception(e)
        raise AuthenticationException(
            message="Authentication service error",
            error_code=ErrorCodes.INTERNAL_SERVER_ERROR
        )

@app.post(f"{API_V1_PREFIX}/auth/refresh", response_model=TokenResponse)
@rate_limit("auth")
async def refresh_access_token(refresh_token: str):
    """Refresh access token"""
    try:
        auth = get_auth()
        result = await auth.refresh_token(refresh_token)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token refresh endpoint error: {e}")
        capture_exception(e)
        raise AuthenticationException(
            message="Token refresh service error",
            error_code=ErrorCodes.INTERNAL_SERVER_ERROR
        )

@app.get(f"{API_V1_PREFIX}/auth/me", response_model=Dict[str, Any])
async def get_current_user_info(current_user: AuthUser = Depends(get_current_user)):
    """Get current user information"""
    try:
        return {
            "id": current_user.id,
            "email": current_user.email,
            "username": current_user.username,
            "display_name": current_user.display_name,
            "is_active": current_user.is_active,
            "family_groups": current_user.family_groups,
            "roles": current_user.roles
        }
    except Exception as e:
        logger.error(f"Get user info error: {e}")
        capture_exception(e)
        raise StandardHTTPException(
            status_code=500,
            error="User Info Retrieval Failed",
            message="Unable to retrieve user information",
            error_code=ErrorCodes.INTERNAL_SERVER_ERROR
        )

@app.post(f"{API_V1_PREFIX}/auth/logout")
async def logout_user(current_user: AuthUser = Depends(get_current_user)):
    """Logout user (invalidate tokens on client side)"""
    try:
        logger.info(f"User logged out: {current_user.email}")
        return {"message": "Successfully logged out"}
    except Exception as e:
        logger.error(f"Logout error: {e}")
        capture_exception(e)
        raise StandardHTTPException(
            status_code=500,
            error="Logout Failed",
            message="Unable to complete logout process",
            error_code=ErrorCodes.INTERNAL_SERVER_ERROR
        )

# ============================================================================
# FAMILY MANAGEMENT ENDPOINTS (Now with Authentication)
# ============================================================================

# Family management endpoints
@app.post(f"{API_V1_PREFIX}/family/members", response_model=Dict[str, str])
@rate_limit("api")
async def create_family_member(
    member: FamilyMemberCreate, 
    db: UnifiedDatabase = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user)
):
    """Create a new family member"""
    try:
        with performance_monitor.track_api_request(
            endpoint="/api/family/members",
            method="POST",
            duration=0
        ):
            member_id = db.create_family_member(member.dict())
            if member_id:
                logger.info(f"Family member created: {member_id}")
                return {"id": member_id, "status": "created"}
            else:
                raise StandardHTTPException(
                    status_code=500,
                    error="Family Member Creation Failed",
                    message="Unable to create family member record",
                    error_code=ErrorCodes.DATABASE_ERROR
                )
    except Exception as e:
        logger.error(f"Error creating family member: {e}")
        capture_exception(e)
        raise StandardHTTPException(
            status_code=500,
            error="Family Member Creation Error",
            message="An error occurred while creating family member",
            error_code=ErrorCodes.INTERNAL_SERVER_ERROR
        )

@app.get(f"{API_V1_PREFIX}/family/members", response_model=List[Dict[str, Any]])
@rate_limit("api")
async def get_family_members(
    family_group_id: Optional[str] = None,
    db: UnifiedDatabase = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user)
):
    """Get family members"""
    try:
        members = db.get_family_members(family_group_id)
        return members
    except Exception as e:
        logger.error(f"Error getting family members: {e}")
        capture_exception(e)
        raise StandardHTTPException(
            status_code=500,
            error="Family Members Retrieval Error",
            message="Unable to retrieve family members",
            error_code=ErrorCodes.INTERNAL_SERVER_ERROR
        )

# Memory management endpoints
@app.post("/api/memories", response_model=Dict[str, str])
@rate_limit("api")
async def create_memory(
    memory: MemoryCreate, 
    db: UnifiedDatabase = Depends(get_db)
):
    """Create a new memory"""
    try:
        memory_id = db.create_memory(memory.dict())
        if memory_id:
            # Track business metric
            performance_monitor.track_business_metric(
                'memory_created',
                memory.family_group_id,
                memory_type=memory.memory_type
            )
            logger.info(f"Memory created: {memory_id}")
            return {"id": memory_id, "status": "created"}
        else:
            raise StandardHTTPException(
                status_code=500,
                error="Memory Creation Failed",
                message="Unable to create memory record",
                error_code=ErrorCodes.DATABASE_ERROR
            )
    except Exception as e:
        logger.error(f"Error creating memory: {e}")
        capture_exception(e)
        raise StandardHTTPException(
            status_code=500,
            error="Memory Creation Error",
            message="An error occurred while creating memory",
            error_code=ErrorCodes.INTERNAL_SERVER_ERROR
        )

@app.get("/api/memories", response_model=List[Dict[str, Any]])
@rate_limit("api")
async def get_memories(
    family_group_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    memory_type: Optional[str] = None,
    tags: Optional[List[str]] = None,
    db: UnifiedDatabase = Depends(get_db)
):
    """Get memories with optional filtering"""
    try:
        filters = {}
        if date_from:
            filters['date_from'] = date_from
        if date_to:
            filters['date_to'] = date_to
        if memory_type:
            filters['memory_type'] = memory_type
        if tags:
            filters['tags'] = tags
        
        memories = db.get_memories(family_group_id, filters)
        return memories
            except Exception as e:
        logger.error(f"Error getting memories: {e}")
        capture_exception(e)
        raise StandardHTTPException(
            status_code=500,
            error="Memory Retrieval Error",
            message="Unable to retrieve memories",
            error_code=ErrorCodes.INTERNAL_SERVER_ERROR
        )

# Budget management endpoints
@app.post("/api/v1/budget/profiles", response_model=Dict[str, str])
@rate_limit("api")
async def create_budget_profile(
    profile: BudgetProfileCreate, 
    db: UnifiedDatabase = Depends(get_db)
):
    """Create a new budget profile"""
    try:
        profile_id = db.create_budget_profile(profile.dict())
        if profile_id:
            logger.info(f"Budget profile created: {profile_id}")
            return {"id": profile_id, "status": "created"}
        else:
            raise StandardHTTPException(
                status_code=500,
                error="Budget Profile Creation Failed",
                message="Unable to create budget profile record",
                error_code=ErrorCodes.DATABASE_ERROR
            )
        except Exception as e:
        logger.error(f"Error creating budget profile: {e}")
        capture_exception(e)
        raise StandardHTTPException(
            status_code=500,
            error="Budget Profile Creation Error",
            message="An error occurred while creating budget profile",
            error_code=ErrorCodes.INTERNAL_SERVER_ERROR
        )

@app.post("/api/v1/budget/envelopes", response_model=Dict[str, str])
@rate_limit("api")
async def create_budget_envelope(
    envelope: BudgetEnvelopeCreate, 
    db: UnifiedDatabase = Depends(get_db)
):
    """Create a new budget envelope"""
    try:
        envelope_id = db.create_budget_envelope(envelope.dict())
        if envelope_id:
            logger.info(f"Budget envelope created: {envelope_id}")
            return {"id": envelope_id, "status": "created"}
        else:
            raise StandardHTTPException(
                status_code=500,
                error="Budget Envelope Creation Failed",
                message="Unable to create budget envelope record",
                error_code=ErrorCodes.DATABASE_ERROR
            )
    except Exception as e:
        logger.error(f"Error creating budget envelope: {e}")
        capture_exception(e)
        raise StandardHTTPException(
            status_code=500,
            error="Budget Envelope Creation Error",
            message="An error occurred while creating budget envelope",
            error_code=ErrorCodes.INTERNAL_SERVER_ERROR
        )

@app.post("/api/v1/budget/transactions", response_model=Dict[str, str])
@rate_limit("api")
async def add_budget_transaction(
    transaction: BudgetTransactionCreate, 
    db: UnifiedDatabase = Depends(get_db)
):
    """Add a new budget transaction"""
    try:
        transaction_id = db.add_budget_transaction(transaction.dict())
        if transaction_id:
            # Track business metric
            performance_monitor.track_business_metric(
                'budget_transaction',
                transaction_type=transaction.transaction_type
            )
            logger.info(f"Budget transaction created: {transaction_id}")
            return {"id": transaction_id, "status": "created"}
    else:
            raise StandardHTTPException(
                status_code=500,
                error="Budget Transaction Failed",
                message="Unable to add budget transaction",
                error_code=ErrorCodes.DATABASE_ERROR
            )
    except Exception as e:
        logger.error(f"Error adding budget transaction: {e}")
        capture_exception(e)
        raise StandardHTTPException(
            status_code=500,
            error="Budget Transaction Error",
            message="An error occurred while adding budget transaction",
            error_code=ErrorCodes.INTERNAL_SERVER_ERROR
        )

@app.get("/api/v1/budget/summary/{profile_id}", response_model=Dict[str, Any])
@rate_limit("api")
async def get_budget_summary(
    profile_id: str, 
    db: UnifiedDatabase = Depends(get_db)
):
    """Get budget summary"""
    try:
        summary = db.get_budget_summary(profile_id)
        return summary
    except Exception as e:
        logger.error(f"Error getting budget summary: {e}")
        capture_exception(e)
        raise StandardHTTPException(
            status_code=500,
            error="Budget Summary Error",
            message="Unable to retrieve budget summary",
            error_code=ErrorCodes.INTERNAL_SERVER_ERROR
        )

# Game session endpoints
@app.post("/api/v1/games/sessions", response_model=Dict[str, str])
@rate_limit("api")
async def create_game_session(
    session: GameSessionCreate, 
    db: UnifiedDatabase = Depends(get_db)
):
    """Create a new game session"""
    try:
        session_id = db.create_game_session(session.dict())
        if session_id:
            logger.info(f"Game session created: {session_id}")
            return {"id": session_id, "status": "created"}
        else:
            raise StandardHTTPException(
                status_code=500,
                error="Game Session Creation Failed",
                message="Unable to create game session",
                error_code=ErrorCodes.DATABASE_ERROR
            )
    except Exception as e:
        logger.error(f"Error creating game session: {e}")
        capture_exception(e)
        raise StandardHTTPException(
            status_code=500,
            error="Game Session Error",
            message="An error occurred while creating game session",
            error_code=ErrorCodes.INTERNAL_SERVER_ERROR
        )

@app.get("/api/v1/games/sessions/active", response_model=List[Dict[str, Any]])
@rate_limit("api")
async def get_active_game_sessions(
    family_group_id: Optional[str] = None,
    db: UnifiedDatabase = Depends(get_db)
):
    """Get active game sessions"""
    try:
        sessions = db.get_active_game_sessions(family_group_id)
        return sessions
    except Exception as e:
        logger.error(f"Error getting active game sessions: {e}")
        capture_exception(e)
        raise StandardHTTPException(
            status_code=500,
            error="Game Sessions Retrieval Error",
            message="Unable to retrieve active game sessions",
            error_code=ErrorCodes.INTERNAL_SERVER_ERROR
        )

@app.put("/api/v1/games/sessions/{session_id}")
@rate_limit("api")
async def update_game_session(
    session_id: str,
    updates: Dict[str, Any],
    db: UnifiedDatabase = Depends(get_db)
):
    """Update a game session"""
    try:
        success = db.update_game_session(session_id, updates)
        if success:
            logger.info(f"Game session updated: {session_id}")
            return {"status": "updated"}
        else:
            raise NotFoundException(
                resource_type="Game session",
                resource_id=session_id
            )
    except Exception as e:
        logger.error(f"Error updating game session: {e}")
        capture_exception(e)
        raise StandardHTTPException(
            status_code=500,
            error="Game Session Update Error",
            message="An error occurred while updating game session",
            error_code=ErrorCodes.INTERNAL_SERVER_ERROR
        )

# Travel planning endpoints
@app.post("/api/v1/travel/plans", response_model=Dict[str, str])
@rate_limit("api")
async def create_travel_plan(
    plan: TravelPlanCreate, 
    db: UnifiedDatabase = Depends(get_db)
):
    """Create a new travel plan"""
    try:
        plan_id = db.create_travel_plan(plan.dict())
        if plan_id:
            logger.info(f"Travel plan created: {plan_id}")
            return {"id": plan_id, "status": "created"}
        else:
            raise StandardHTTPException(
                status_code=500,
                error="Travel Plan Creation Failed",
                message="Unable to create travel plan",
                error_code=ErrorCodes.DATABASE_ERROR
            )
    except Exception as e:
        logger.error(f"Error creating travel plan: {e}")
        capture_exception(e)
        raise StandardHTTPException(
            status_code=500,
            error="Travel Plan Creation Error",
            message="An error occurred while creating travel plan",
            error_code=ErrorCodes.INTERNAL_SERVER_ERROR
        )

@app.get("/api/v1/travel/plans", response_model=List[Dict[str, Any]])
@rate_limit("api")
async def get_travel_plans(
    family_group_id: Optional[str] = None,
    db: UnifiedDatabase = Depends(get_db)
):
    """Get travel plans"""
    try:
        plans = db.get_travel_plans(family_group_id)
        return plans
    except Exception as e:
        logger.error(f"Error getting travel plans: {e}")
        capture_exception(e)
        raise StandardHTTPException(
            status_code=500,
            error="Travel Plans Retrieval Error",
            message="Unable to retrieve travel plans",
            error_code=ErrorCodes.INTERNAL_SERVER_ERROR
        )

# Cultural heritage endpoints
@app.post("/api/cultural-heritage", response_model=Dict[str, str])
@rate_limit("api")
async def create_cultural_heritage(
    heritage: CulturalHeritageCreate, 
    db: UnifiedDatabase = Depends(get_db)
):
    """Create cultural heritage item"""
    try:
        heritage_id = db.save_cultural_heritage(heritage.dict())
        if heritage_id:
            logger.info(f"Cultural heritage created: {heritage_id}")
            return {"id": heritage_id, "status": "created"}
        else:
            raise StandardHTTPException(
                status_code=500,
                error="Cultural Heritage Creation Failed",
                message="Unable to create cultural heritage entry",
                error_code=ErrorCodes.DATABASE_ERROR
            )
    except Exception as e:
        logger.error(f"Error creating cultural heritage: {e}")
        capture_exception(e)
        raise StandardHTTPException(
            status_code=500,
            error="Cultural Heritage Creation Error",
            message="An error occurred while creating cultural heritage",
            error_code=ErrorCodes.INTERNAL_SERVER_ERROR
        )

@app.get("/api/cultural-heritage", response_model=List[Dict[str, Any]])
@rate_limit("api")
async def get_cultural_heritage(
    family_group_id: Optional[str] = None,
    category: Optional[str] = None,
    db: UnifiedDatabase = Depends(get_db)
):
    """Get cultural heritage items"""
    try:
        heritage = db.get_cultural_heritage(family_group_id, category)
        return heritage
    except Exception as e:
        logger.error(f"Error getting cultural heritage: {e}")
        capture_exception(e)
        raise StandardHTTPException(
            status_code=500,
            error="Cultural Heritage Retrieval Error",
            message="Unable to retrieve cultural heritage data",
            error_code=ErrorCodes.INTERNAL_SERVER_ERROR
        )

# Dashboard and analytics endpoints
@app.get("/api/v1/dashboard/{family_group_id}", response_model=Dict[str, Any])
@rate_limit("api")
async def get_family_dashboard(
    family_group_id: str, 
    db: UnifiedDatabase = Depends(get_db)
):
    """Get family dashboard data"""
    try:
        dashboard = db.get_family_dashboard(family_group_id)
        return dashboard
    except Exception as e:
        logger.error(f"Error getting family dashboard: {e}")
        capture_exception(e)
        raise StandardHTTPException(
            status_code=500,
            error="Family Dashboard Error",
            message="Unable to retrieve family dashboard data",
            error_code=ErrorCodes.INTERNAL_SERVER_ERROR
        )

@app.get("/api/v1/analytics/memories/{family_group_id}", response_model=List[Dict[str, Any]])
@rate_limit("api")
async def get_memory_analytics(
    family_group_id: str, 
    db: UnifiedDatabase = Depends(get_db)
):
    """Get memory analytics"""
    try:
        analytics = db.get_memory_analytics(family_group_id)
        return analytics
    except Exception as e:
        logger.error(f"Error getting memory analytics: {e}")
        capture_exception(e)
        raise StandardHTTPException(
            status_code=500,
            error="Memory Analytics Error",
            message="Unable to retrieve memory analytics",
            error_code=ErrorCodes.INTERNAL_SERVER_ERROR
        )

# Photo Upload Endpoints
@app.post("/api/v1/memories/upload", response_model=Dict[str, Any])
@rate_limit("upload")
async def upload_photo(
    file: UploadFile,
    family_group_id: str,
    family_members: Optional[List[str]] = None,
    album_id: Optional[str] = None,
    description: Optional[str] = None,
    tags: Optional[List[str]] = None,
    privacy_level: str = "family"
):
    """Upload and process a photo with family member linking"""
    try:
        # Read file data
        file_data = await file.read()
        
        # Get photo upload system
        photo_system = get_photo_upload_system()
        
        # Upload photo
        result = await photo_system.upload_photo(
            file_data=file_data,
            filename=file.filename,
            family_group_id=family_group_id,
            family_members=family_members,
            album_id=album_id,
            description=description,
            tags=tags,
            privacy_level=privacy_level
        )
        
        if result["success"]:
            logger.info(f"Photo uploaded successfully: {result['memory_id']}")
            return result
        else:
            raise ValidationException([
                ErrorDetail(
                    message=result["error"],
                    code="PHOTO_UPLOAD_FAILED"
                )
            ])
            
    except Exception as e:
        logger.error(f"Photo upload failed: {e}")
        capture_exception(e)
        raise StandardHTTPException(
            status_code=500,
            error="Photo Upload Failed",
            message="An error occurred during photo upload",
            error_code=ErrorCodes.FILE_UPLOAD_FAILED
        )

@app.post("/api/albums", response_model=Dict[str, str])
@rate_limit("api")
async def create_album(album: AlbumCreateRequest):
    """Create a new album"""
    try:
        album_system = get_album_management()
        result = album_system.create_album(
            family_group_id=album.family_group_id,
            name=album.name,
            description=album.description,
            album_type=album.album_type,
            privacy_level=album.privacy_level,
            cover_photo_id=album.cover_photo_id
        )
        
        if result["success"]:
            logger.info(f"Album created: {result['album_id']}")
            return {"id": result["album_id"], "status": "created"}
        else:
            raise ValidationException([
                ErrorDetail(
                    message=result["error"],
                    code="ALBUM_CREATION_FAILED"
                )
            ])
        
    except Exception as e:
        logger.error(f"Album creation failed: {e}")
        capture_exception(e)
        raise StandardHTTPException(
            status_code=500,
            error="Album Creation Failed",
            message="An error occurred during album creation",
            error_code=ErrorCodes.INTERNAL_SERVER_ERROR
        )

@app.post("/api/v1/memories/{memory_id}/link-family", response_model=Dict[str, Any])
@rate_limit("api")
async def link_photo_to_family(link_request: FamilyPhotoLinkRequest):
    """Link a photo to family members"""
    try:
        family_linking = get_family_photo_linking()
        result = await family_linking.link_photo_to_family_members(
            memory_id=link_request.memory_id,
            family_member_ids=link_request.family_member_ids,
            confidence_scores=link_request.confidence_scores
        )
        
        if result["success"]:
            logger.info(f"Photo linked to {len(result['linked_members'])} family members")
            return result
        else:
            raise ValidationException([
                ErrorDetail(
                    message=result["error"],
                    code="PHOTO_LINKING_FAILED"
                )
            ])
        
    except Exception as e:
        logger.error(f"Family photo linking failed: {e}")
        capture_exception(e)
        raise StandardHTTPException(
            status_code=500,
            error="Family Photo Linking Failed",
            message="An error occurred during family photo linking",
            error_code=ErrorCodes.INTERNAL_SERVER_ERROR
        )

@app.post("/api/v1/memories/{memory_id}/auto-link-faces", response_model=Dict[str, Any])
@rate_limit("api")
async def auto_link_faces_in_photo(memory_id: str):
    """Automatically link faces in photo to family members"""
    try:
        family_linking = get_family_photo_linking()
        result = await family_linking.auto_link_faces_in_photo(memory_id)
        
        if result["success"]:
            logger.info(f"Auto-linked {result['auto_linked_count']} faces in photo")
            return result
        else:
            raise ValidationException([
                ErrorDetail(
                    message=result["error"],
                    code="AUTO_FACE_LINKING_FAILED"
                )
            ])
        
    except Exception as e:
        logger.error(f"Auto face linking failed: {e}")
        capture_exception(e)
        raise StandardHTTPException(
            status_code=500,
            error="Auto Face Linking Failed",
            message="An error occurred during automatic face linking",
            error_code=ErrorCodes.EXTERNAL_SERVICE_ERROR
        )

# Game State Endpoints
@app.post("/api/v1/games/create-session", response_model=Dict[str, Any])
@rate_limit("api")
async def create_game_session_endpoint(session: GameSessionCreateRequest):
    """Create a new game session"""
    try:
        game_manager = get_game_state_manager()
        result = await game_manager.create_game_session(
            family_group_id=session.family_group_id,
            game_type=session.game_type,
            title=session.title,
            description=session.description,
            players=session.players,
            settings=session.settings,
            created_by=session.created_by
        )
        
        if result["success"]:
            logger.info(f"Game session created: {result['session_id']}")
            return result
        else:
            raise ValidationException([
                ErrorDetail(
                    message=result["error"],
                    code="GAME_SESSION_CREATION_FAILED"
                )
            ])
            
    except Exception as e:
        logger.error(f"Game session creation failed: {e}")
        capture_exception(e)
        raise StandardHTTPException(
            status_code=500,
            error="Game Session Creation Failed",
            message="An error occurred during game session creation",
            error_code=ErrorCodes.INTERNAL_SERVER_ERROR
        )

@app.post("/api/v1/games/join", response_model=Dict[str, Any])
@rate_limit("api")
async def join_game_session(join_request: GameJoinRequest):
    """Join an existing game session"""
    try:
        game_manager = get_game_state_manager()
        result = await game_manager.join_game_session(
            session_id=join_request.session_id,
            player_id=join_request.player_id,
            player_name=join_request.player_name
        )
        
        if result["success"]:
            logger.info(f"Player {join_request.player_name} joined game {join_request.session_id}")
            return result
        else:
            raise ValidationException([
                ErrorDetail(
                    message=result["error"],
                    code="GAME_JOIN_FAILED"
                )
            ])
            
    except Exception as e:
        logger.error(f"Join game failed: {e}")
        capture_exception(e)
        raise StandardHTTPException(
            status_code=500,
            error="Join Game Failed",
            message="An error occurred while joining the game",
            error_code=ErrorCodes.INTERNAL_SERVER_ERROR
        )

@app.post("/api/v1/games/start", response_model=Dict[str, Any])
@rate_limit("api")
async def start_game_session(session_id: str):
    """Start a game session"""
    try:
        game_manager = get_game_state_manager()
        result = await game_manager.start_game(session_id)
        
        if result["success"]:
            logger.info(f"Game {session_id} started")
            return result
        else:
            raise ValidationException([
                ErrorDetail(
                    message=result["error"],
                    code="GAME_START_FAILED"
                )
            ])
            
    except Exception as e:
        logger.error(f"Start game failed: {e}")
        capture_exception(e)
        raise StandardHTTPException(
            status_code=500,
            error="Start Game Failed",
            message="An error occurred while starting the game",
            error_code=ErrorCodes.INTERNAL_SERVER_ERROR
        )

@app.post("/api/v1/games/move", response_model=Dict[str, Any])
@rate_limit("api")
async def make_game_move(move_request: GameMoveRequest):
    """Make a move in the game"""
    try:
        game_manager = get_game_state_manager()
        result = await game_manager.make_game_move(
            session_id=move_request.session_id,
            player_id=move_request.player_id,
            move_data=move_request.move_data
        )
        
        if result["success"]:
            logger.info(f"Game move made by {move_request.player_id}")
            return result
        else:
            raise ValidationException([
                ErrorDetail(
                    message=result["error"],
                    code="GAME_MOVE_FAILED"
                )
            ])
        
    except Exception as e:
        logger.error(f"Game move failed: {e}")
        capture_exception(e)
        raise StandardHTTPException(
            status_code=500,
            error="Game Move Failed",
            message="An error occurred while processing game move",
            error_code=ErrorCodes.INTERNAL_SERVER_ERROR
        )

@app.get("/api/v1/games/session/{session_id}", response_model=Dict[str, Any])
@rate_limit("api")
async def get_game_session(session_id: str):
    """Get game session details"""
    try:
        game_manager = get_game_state_manager()
        # This would need to be implemented in the game manager
        # For now, return a placeholder
        return {
            "session_id": session_id,
            "status": "active",
            "message": "Game session details endpoint - to be implemented"
        }
    except Exception as e:
        logger.error(f"Get game session failed: {e}")
        capture_exception(e)
        raise StandardHTTPException(
            status_code=500,
            error="Get Game Session Failed",
            message="An error occurred while retrieving game session",
            error_code=ErrorCodes.INTERNAL_SERVER_ERROR
        )

# Production monitoring endpoints
@app.get("/api/v1/production/status")
async def get_production_status():
    """Get production status and metrics"""
    try:
        return {
            "status": "operational",
            "timestamp": datetime.now().isoformat(),
            "version": "2.0.0",
            "environment": os.getenv('ENVIRONMENT', 'development'),
            "uptime": performance_monitor.get_uptime(),
            "circuit_breakers": circuit_breaker_manager.get_all_states(),
            "secrets_valid": validate_production_secrets(),
            "graceful_shutdown": {
                "is_shutting_down": graceful_shutdown.is_shutting_down,
                "handlers_count": len(graceful_shutdown.shutdown_handlers)
            }
        }
    except Exception as e:
        logger.error(f"Error getting production status: {e}")
        capture_exception(e)
        raise StandardHTTPException(
            status_code=500,
            error="Production Status Error",
            message="Unable to retrieve production status",
            error_code=ErrorCodes.INTERNAL_SERVER_ERROR
        )

# Error handling middleware
@app.exception_handler(StandardHTTPException)
async def standard_exception_handler(request: Request, exc: StandardHTTPException):
    """Handle standardized HTTP exceptions"""
    request_id = get_request_id(request)
    exc.error_response["request_id"] = request_id
    
    logger.warning(f"Standard exception [{request_id}]: {exc.error_response}")
    return JSONResponse(
        status_code=exc.status_code,
        content=exc.error_response
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle FastAPI HTTP exceptions with standardized format"""
    request_id = get_request_id(request)
    
    # Convert to standardized format
    error_response = create_error_response(
        status_code=exc.status_code,
        error="HTTP Error",
        message=str(exc.detail),
        error_code=f"HTTP_{exc.status_code}",
        request_id=request_id
    )
    
    logger.warning(f"HTTP exception [{request_id}]: {exc.status_code} - {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content=error_response
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler with error tracking and standardized response"""
    request_id = get_request_id(request)
    
    logger.error(f"Unhandled exception [{request_id}]: {exc}")
    capture_exception(exc)
    
    # Create standardized error response
    error_response = create_server_error_response(
        message="An unexpected error occurred. Please try again later.",
        error_code=ErrorCodes.INTERNAL_SERVER_ERROR,
        request_id=request_id
    )
    
    return JSONResponse(
        status_code=500,
        content=error_response
    )

# Startup event
@app.on_event("startup")
async def startup_event():
    """Application startup"""
    logger.info("Elmowafiplatform Unified API starting up")
    logger.info(f"Environment: {os.getenv('ENVIRONMENT', 'development')}")
    logger.info(f"Database URL configured: {'DATABASE_URL' in os.environ}")
    logger.info(f"Production secrets valid: {validate_production_secrets()}")

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Application shutdown"""
    logger.info("Elmowafiplatform Unified API shutting down")

if __name__ == "__main__":
    import uvicorn
    
    # Get port from environment
    port = int(os.getenv('PORT', 8000))
    
    # Run the application
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=os.getenv('ENVIRONMENT') == 'development',
        log_level=os.getenv('LOG_LEVEL', 'info')
    ) 