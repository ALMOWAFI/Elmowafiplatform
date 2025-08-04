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

# Import new photo and game systems
from photo_upload import get_photo_upload_system, get_album_management, get_family_photo_linking
from game_state import get_game_state_manager

# Import enhanced database
from database_enhanced import get_enhanced_database

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

def get_enhanced_db():
    """Get enhanced database instance"""
    return get_enhanced_database()

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
        raise HTTPException(status_code=500, detail="Health check failed")

# Prometheus metrics endpoint
@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint"""
    return await metrics_endpoint()

# Database health check endpoint
@app.get("/api/database/health")
async def database_health_check():
    """Database health check with detailed pool metrics"""
    try:
        enhanced_db = get_enhanced_db()
        pool_health = enhanced_db.get_pool_health()
        
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
        raise HTTPException(status_code=500, detail="Database health check failed")

# Circuit breaker health check endpoint
@app.get("/api/circuit-breakers/health")
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
        raise HTTPException(status_code=500, detail="Circuit breaker health check failed")

# Performance monitoring endpoint
@app.get("/api/performance/summary")
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
        raise HTTPException(status_code=500, detail="Performance summary failed")

# Family management endpoints
@app.post("/api/family/members", response_model=Dict[str, str])
@rate_limit("api")
async def create_family_member(
    member: FamilyMemberCreate, 
    db: UnifiedDatabase = Depends(get_db),
    request: Request = None
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
                raise HTTPException(status_code=500, detail="Failed to create family member")
    except Exception as e:
        logger.error(f"Error creating family member: {e}")
        capture_exception(e)
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/family/members", response_model=List[Dict[str, Any]])
@rate_limit("api")
async def get_family_members(
    family_group_id: Optional[str] = None,
    db: UnifiedDatabase = Depends(get_db)
):
    """Get family members"""
    try:
        members = db.get_family_members(family_group_id)
        return members
    except Exception as e:
        logger.error(f"Error getting family members: {e}")
        capture_exception(e)
        raise HTTPException(status_code=500, detail="Internal server error")

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
            raise HTTPException(status_code=500, detail="Failed to create memory")
    except Exception as e:
        logger.error(f"Error creating memory: {e}")
        capture_exception(e)
        raise HTTPException(status_code=500, detail="Internal server error")

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
        raise HTTPException(status_code=500, detail="Internal server error")

# Budget management endpoints
@app.post("/api/budget/profiles", response_model=Dict[str, str])
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
            raise HTTPException(status_code=500, detail="Failed to create budget profile")
        except Exception as e:
        logger.error(f"Error creating budget profile: {e}")
        capture_exception(e)
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/api/budget/envelopes", response_model=Dict[str, str])
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
            raise HTTPException(status_code=500, detail="Failed to create budget envelope")
    except Exception as e:
        logger.error(f"Error creating budget envelope: {e}")
        capture_exception(e)
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/api/budget/transactions", response_model=Dict[str, str])
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
            raise HTTPException(status_code=500, detail="Failed to add budget transaction")
    except Exception as e:
        logger.error(f"Error adding budget transaction: {e}")
        capture_exception(e)
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/budget/summary/{profile_id}", response_model=Dict[str, Any])
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
        raise HTTPException(status_code=500, detail="Internal server error")

# Game session endpoints
@app.post("/api/games/sessions", response_model=Dict[str, str])
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
            raise HTTPException(status_code=500, detail="Failed to create game session")
    except Exception as e:
        logger.error(f"Error creating game session: {e}")
        capture_exception(e)
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/games/sessions/active", response_model=List[Dict[str, Any]])
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
        raise HTTPException(status_code=500, detail="Internal server error")

@app.put("/api/games/sessions/{session_id}")
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
            raise HTTPException(status_code=404, detail="Game session not found")
    except Exception as e:
        logger.error(f"Error updating game session: {e}")
        capture_exception(e)
        raise HTTPException(status_code=500, detail="Internal server error")

# Travel planning endpoints
@app.post("/api/travel/plans", response_model=Dict[str, str])
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
            raise HTTPException(status_code=500, detail="Failed to create travel plan")
    except Exception as e:
        logger.error(f"Error creating travel plan: {e}")
        capture_exception(e)
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/travel/plans", response_model=List[Dict[str, Any]])
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
        raise HTTPException(status_code=500, detail="Internal server error")

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
            raise HTTPException(status_code=500, detail="Failed to create cultural heritage")
    except Exception as e:
        logger.error(f"Error creating cultural heritage: {e}")
        capture_exception(e)
        raise HTTPException(status_code=500, detail="Internal server error")

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
        raise HTTPException(status_code=500, detail="Internal server error")

# Dashboard and analytics endpoints
@app.get("/api/dashboard/{family_group_id}", response_model=Dict[str, Any])
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
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/analytics/memories/{family_group_id}", response_model=List[Dict[str, Any]])
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
        raise HTTPException(status_code=500, detail="Internal server error")

# Photo Upload Endpoints
@app.post("/api/memories/upload", response_model=Dict[str, Any])
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
            raise HTTPException(status_code=400, detail=result["error"])
            
    except Exception as e:
        logger.error(f"Photo upload failed: {e}")
        capture_exception(e)
        raise HTTPException(status_code=500, detail="Photo upload failed")

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
            raise HTTPException(status_code=400, detail=result["error"])
        
    except Exception as e:
        logger.error(f"Album creation failed: {e}")
        capture_exception(e)
        raise HTTPException(status_code=500, detail="Album creation failed")

@app.post("/api/memories/{memory_id}/link-family", response_model=Dict[str, Any])
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
            raise HTTPException(status_code=400, detail=result["error"])
        
    except Exception as e:
        logger.error(f"Family photo linking failed: {e}")
        capture_exception(e)
        raise HTTPException(status_code=500, detail="Family photo linking failed")

@app.post("/api/memories/{memory_id}/auto-link-faces", response_model=Dict[str, Any])
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
            raise HTTPException(status_code=400, detail=result["error"])
        
    except Exception as e:
        logger.error(f"Auto face linking failed: {e}")
        capture_exception(e)
        raise HTTPException(status_code=500, detail="Auto face linking failed")

# Game State Endpoints
@app.post("/api/games/create-session", response_model=Dict[str, Any])
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
            raise HTTPException(status_code=400, detail=result["error"])
            
    except Exception as e:
        logger.error(f"Game session creation failed: {e}")
        capture_exception(e)
        raise HTTPException(status_code=500, detail="Game session creation failed")

@app.post("/api/games/join", response_model=Dict[str, Any])
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
            raise HTTPException(status_code=400, detail=result["error"])
            
    except Exception as e:
        logger.error(f"Join game failed: {e}")
        capture_exception(e)
        raise HTTPException(status_code=500, detail="Join game failed")

@app.post("/api/games/start", response_model=Dict[str, Any])
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
            raise HTTPException(status_code=400, detail=result["error"])
            
    except Exception as e:
        logger.error(f"Start game failed: {e}")
        capture_exception(e)
        raise HTTPException(status_code=500, detail="Start game failed")

@app.post("/api/games/move", response_model=Dict[str, Any])
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
            raise HTTPException(status_code=400, detail=result["error"])
        
    except Exception as e:
        logger.error(f"Game move failed: {e}")
        capture_exception(e)
        raise HTTPException(status_code=500, detail="Game move failed")

@app.get("/api/games/session/{session_id}", response_model=Dict[str, Any])
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
        raise HTTPException(status_code=500, detail="Get game session failed")

# Production monitoring endpoints
@app.get("/api/production/status")
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
        raise HTTPException(status_code=500, detail="Internal server error")

# Error handling middleware
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler with error tracking"""
    logger.error(f"Unhandled exception: {exc}")
    capture_exception(exc)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc)}
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