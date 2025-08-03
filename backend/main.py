#!/usr/bin/env python3
"""
Unified API Server for Elmowafiplatform
Bridges React frontend with Python AI services and provides central data management
"""

import os
import sys
import json
import uuid
import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from pathlib import Path

import uvicorn
from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks, Form, WebSocket, WebSocketDisconnect, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import aiofiles
import requests

# Import authentication
from auth import UserAuth, UserLogin, Token, get_current_user, register_user, login_user

# Add the hack2 directory to the path to import AI services
sys.path.append('../hack2')

try:
    from facial_recognition_trainer import face_trainer
    FACE_RECOGNITION_AVAILABLE = True
except ImportError:
    print("Face recognition not available - install face-recognition package for full AI features")
    face_trainer = None
    FACE_RECOGNITION_AVAILABLE = False

try:
    from photo_clustering import photo_clustering_engine
    PHOTO_CLUSTERING_AVAILABLE = True
except ImportError:
    print("Photo clustering not available - check AI dependencies")
    photo_clustering_engine = None
    PHOTO_CLUSTERING_AVAILABLE = False

# Import the data manager
from data_manager import DataManager

# Import security features
from security import (
    security_manager, rate_limit, validate_input_data,
    USER_REGISTRATION_RULES, MEMORY_CREATION_RULES, EVENT_CREATION_RULES,
    get_cors_origins
)

# Import Redis and WebSocket managers
from redis_manager_simple import redis_manager, init_redis, close_redis
from websocket_redis_manager import websocket_manager as redis_websocket_manager, WebSocketMessage, MessageType as RedisMessageType
# Ensure we're using the correct WebSocketManager with startup/shutdown methods
from cache_middleware import CacheMiddleware

# Initialize data manager
data_manager = DataManager()

# Initialize logging
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="Elmowafiplatform API", version="1.0.0")

# Add cache middleware
app.add_middleware(CacheMiddleware)

# Startup and shutdown events
@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    try:
        # Initialize Redis
        await init_redis()
        
        # Initialize WebSocket manager
        await redis_websocket_manager.startup()
        
        # Load initial data - commented out as function doesn't exist
        # load_sample_data()
        
        logger.info("All services initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize services: {e}")
        raise

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup services on shutdown"""
    try:
        # Close WebSocket manager
        await redis_websocket_manager.shutdown()
        
        # Close Redis connections
        await close_redis()
        
        logger.info("All services shut down successfully")
    except Exception as e:
        logger.error(f"Error during shutdown: {e}")

# Enable CORS for React frontend
# Update CORS configuration for production
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Create directories
UPLOAD_DIR = Path("uploads")
MEMORY_DIR = Path("memories")
DATA_DIR = Path("data")

for directory in [UPLOAD_DIR, MEMORY_DIR, DATA_DIR]:
    directory.mkdir(exist_ok=True)

# Serve static files
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
app.mount("/memories", StaticFiles(directory="memories"), name="memories")

# AI Service URLs
AI_SERVICE_URL = os.getenv("AI_SERVICE_URL", "http://localhost:5000")
MATH_ANALYZER_URL = os.getenv("MATH_ANALYZER_URL", "http://localhost:8000")

# Data Models
class FamilyMember(BaseModel):
    id: Optional[str] = None
    name: str
    nameArabic: Optional[str] = None
    birthDate: Optional[str] = None
    location: Optional[str] = None
    avatar: Optional[str] = None
    relationships: List[Dict[str, str]] = []

class Memory(BaseModel):
    id: Optional[str] = None
    title: str
    description: Optional[str] = None
    date: str
    location: Optional[str] = None
    imageUrl: Optional[str] = None
    tags: List[str] = []
    familyMembers: List[str] = []  # Family member IDs
    aiAnalysis: Optional[Dict[str, Any]] = None

class TravelPlan(BaseModel):
    id: Optional[str] = None
    name: str
    destination: str
    startDate: str
    endDate: str
    budget: Optional[float] = None
    participants: List[str] = []  # Family member IDs
    activities: List[Dict[str, Any]] = []

class AIAnalysisRequest(BaseModel):
    analysisType: str
    familyContext: Optional[List[Dict[str, Any]]] = None

class LocationVerificationRequest(BaseModel):
    player_id: str
    game_session_id: str
    target_latitude: float
    target_longitude: float
    actual_latitude: float
    actual_longitude: float
    challenge_id: Optional[str] = None
    gps_metadata: Optional[Dict[str, Any]] = None

class LocationChallenge(BaseModel):
    game_session_id: str
    challenge_name: str
    target_location: str
    target_latitude: float
    target_longitude: float
    challenge_type: str = "reach_point"
    points_reward: int = 100
    time_limit_minutes: int = 60
    verification_radius: Optional[float] = None
    requirements: Optional[Dict[str, Any]] = None

# Import database, WebSocket manager, facial recognition trainer, and photo clustering
from database import db
from websocket_manager import websocket_manager, ConnectionType, MessageType

# Optional imports for AI features
try:
    from facial_recognition_trainer import face_trainer
    FACE_RECOGNITION_AVAILABLE = True
except ImportError:
    print("Face recognition not available - install face-recognition package for full AI features")
    face_trainer = None
    FACE_RECOGNITION_AVAILABLE = False

try:
    from photo_clustering import photo_clustering_engine
    PHOTO_CLUSTERING_AVAILABLE = True
except ImportError:
    print("Photo clustering not available - check AI dependencies")
    photo_clustering_engine = None
    PHOTO_CLUSTERING_AVAILABLE = False

# CORS middleware - fix OPTIONS requests
from fastapi.middleware.cors import CORSMiddleware

# Add security-enhanced authentication endpoints
@app.post("/api/auth/register")
@rate_limit(max_requests=5, window=3600)  # 5 registrations per hour
async def register(request: Request, user_data: dict):
    """Register a new user with input validation and security"""
    try:
        # Validate input data
        validated_data = security_manager.validate_input(user_data, USER_REGISTRATION_RULES)
        
        # Check if user already exists
        email = validated_data['email']
        # In real implementation, check database
        
        # Hash password securely
        hashed_password = security_manager.hash_password(validated_data['password'])
        
        # Create user record (in real implementation, save to database)
        user_record = {
            "id": security_manager.generate_secure_token(16),
            "email": email,
            "full_name": validated_data['full_name'],
            "phone": validated_data.get('phone'),
            "password_hash": hashed_password,
            "created_at": datetime.now().isoformat(),
            "is_active": True
        }
        
        # Generate JWT token
        access_token = create_access_token(data={"sub": email, "user_id": user_record["id"]})
        
        security_manager.log_security_event(
            "USER_REGISTERED",
            {"email": email, "user_id": user_record["id"]},
            request
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user_record["id"],
                "email": email,
                "full_name": validated_data['full_name']
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        security_manager.log_security_event(
            "REGISTRATION_ERROR",
            {"error": str(e), "email": user_data.get('email', 'unknown')},
            request
        )
        raise HTTPException(status_code=500, detail="Registration failed")

@app.post("/api/auth/login")
@rate_limit(max_requests=10, window=3600)  # 10 login attempts per hour
async def login(request: Request, credentials: dict):
    """Secure login with rate limiting and attempt tracking"""
    try:
        email = credentials.get('email', '').lower().strip()
        password = credentials.get('password', '')
        
        if not email or not password:
            raise HTTPException(status_code=400, detail="Email and password required")
        
        # Check if account is locked
        if security_manager.is_account_locked(email):
            security_manager.log_security_event(
                "LOGIN_BLOCKED_LOCKED_ACCOUNT",
                {"email": email},
                request
            )
            raise HTTPException(
                status_code=429, 
                detail=f"Account locked due to too many failed attempts. Try again in {SECURITY_CONFIG['lockout_duration']/60} minutes."
            )
        
        # Validate credentials (in real implementation, check against database)
        # For demo, accept specific credentials
        demo_users = {
            "ahmad@elmowafi.com": security_manager.hash_password("Ahmad123!"),
            "fatima@elmowafi.com": security_manager.hash_password("Fatima123!"),
            "omar@elmowafi.com": security_manager.hash_password("Omar123!"),
            "layla@elmowafi.com": security_manager.hash_password("Layla123!")
        }
        
        if email not in demo_users or not security_manager.verify_password(password, demo_users[email]):
            security_manager.track_failed_login(email)
            security_manager.log_security_event(
                "LOGIN_FAILED",
                {"email": email},
                request
            )
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Clear failed attempts on successful login
        security_manager.clear_failed_attempts(email)
        
        # Generate JWT token
        user_id = email.split('@')[0]  # Simple user ID for demo
        access_token = create_access_token(data={"sub": email, "user_id": user_id})
        
        security_manager.log_security_event(
            "LOGIN_SUCCESS",
            {"email": email, "user_id": user_id},
            request
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user_id,
                "email": email,
                "full_name": email.split('@')[0].title()
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        security_manager.log_security_event(
            "LOGIN_ERROR",
            {"error": str(e), "email": credentials.get('email', 'unknown')},
            request
        )
        raise HTTPException(status_code=500, detail="Login failed")

# Family Member Endpoints
@app.get("/api/family/members")
async def get_family_members():
    """Get all family members"""
    return db.get_family_members()

@app.post("/api/family/members")
async def create_family_member(member: Dict[str, Any]):
    """Create a new family member"""
    member_id = db.create_family_member(member)
    # Return the created member
    members = db.get_family_members()
    return next((m for m in members if m["id"] == member_id), None)

@app.put("/api/family/members/{member_id}")
async def update_family_member(member_id: str, updates: Dict[str, Any]):
    """Update a family member"""
    success = db.update_family_member(member_id, updates)
    if not success:
        raise HTTPException(status_code=404, detail="Family member not found")
    
    # Return updated member
    members = db.get_family_members()
    return next((m for m in members if m["id"] == member_id), None)

# Memory Endpoints
@app.get("/api/memories")
async def get_memories(
    familyMemberId: Optional[str] = None,
    startDate: Optional[str] = None,
    endDate: Optional[str] = None,
    tags: Optional[List[str]] = None
):
    """Get memories with optional filters"""
    filters = {}
    if familyMemberId:
        filters["familyMemberId"] = familyMemberId
    if startDate and endDate:
        filters["startDate"] = startDate
        filters["endDate"] = endDate
    if tags:
        filters["tags"] = tags
    
    return db.get_memories(filters)

@app.post("/api/memories/upload")
async def upload_memory(
    background_tasks: BackgroundTasks,
    title: str = Form(...),
    description: Optional[str] = Form(None),
    date: str = Form(...),
    location: Optional[str] = Form(None),
    tags: str = Form("[]"),  # JSON string
    familyMembers: str = Form("[]"),  # JSON string
    image: Optional[UploadFile] = File(None)
):
    """Upload a new memory with optional image"""
    image_url = None
    
    if image:
        filename = await save_uploaded_file(image, MEMORY_DIR)
        image_url = f"/memories/{filename}"
    
    memory_data = {
        "title": title,
        "description": description,
        "date": date,
        "location": location,
        "imageUrl": image_url,
        "tags": json.loads(tags),
        "familyMembers": json.loads(familyMembers)
    }
    
    memory_id = db.create_memory(memory_data)
    
    if image:
        # Schedule AI analysis in background
        background_tasks.add_task(
            process_memory_ai_analysis,
            memory_id,
            MEMORY_DIR / filename,
            json.loads(familyMembers)
        )
    
    # Return the created memory
    memories = db.get_memories()
    return next((m for m in memories if m["id"] == memory_id), None)

async def process_memory_ai_analysis(memory_id: str, image_path: Path, family_member_ids: List[str]):
    """Background task to process memory with AI"""
    try:
        # Get family context for AI analysis
        all_members = db.get_family_members()
        family_context = []
        for member_id in family_member_ids:
            member = next((m for m in all_members if m["id"] == member_id), None)
            if member:
                family_context.append({
                    "id": member["id"],
                    "name": member["name"],
                    "nameArabic": member["nameArabic"]
                })
        
        analysis = await analyze_image_with_ai(str(image_path), "memory", family_context)
        
        # Update memory with AI analysis
        updates = {"aiAnalysis": analysis.get("analysis", {})}
        
        # Auto-update family members based on AI detection
        if analysis.get("success") and "faces" in analysis.get("analysis", {}):
            faces_data = analysis["analysis"]["faces"]
            if isinstance(faces_data, dict) and "family_members_detected" in faces_data:
                detected_members = faces_data["family_members_detected"]
                detected_ids = [member.get("member_id") for member in detected_members if member.get("member_id")]
                if detected_ids:
                    updates["familyMembers"] = list(set(family_member_ids + detected_ids))
        
        # Auto-add smart tags
        smart_tags = analysis.get("analysis", {}).get("smart_tags", [])
        if smart_tags:
            current_memory = next((m for m in db.get_memories() if m["id"] == memory_id), None)
            if current_memory:
                existing_tags = current_memory.get("tags", [])
                updates["tags"] = list(set(existing_tags + smart_tags))
        
        db.update_memory(memory_id, updates)
                
    except Exception as e:
        print(f"AI analysis failed for memory {memory_id}: {e}")

@app.post("/api/memories/{memory_id}/analyze")
async def analyze_memory(memory_id: str):
    """Trigger AI analysis for a specific memory"""
    memories = db.get_memories()
    memory = next((m for m in memories if m["id"] == memory_id), None)
    
    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found")
    
    if not memory.get("imageUrl"):
        raise HTTPException(status_code=400, detail="Memory has no image to analyze")
    
    # Extract filename from URL and construct path
    filename = memory["imageUrl"].split("/")[-1]
    image_path = MEMORY_DIR / filename
    
    # Get family context
    all_members = db.get_family_members()
    family_context = []
    for member_id in memory.get("familyMembers", []):
        member = next((m for m in all_members if m["id"] == member_id), None)
        if member:
            family_context.append({
                "id": member["id"],
                "name": member["name"],
                "nameArabic": member["nameArabic"]
            })
    
    analysis = await analyze_image_with_ai(str(image_path), "memory", family_context)
    
    # Update memory with analysis
    db.update_memory(memory_id, {"aiAnalysis": analysis.get("analysis", {})})
    
    return analysis

# Travel Planning Endpoints
@app.get("/api/travel/plans")
async def get_travel_plans(familyMemberId: Optional[str] = None):
    """Get travel plans"""
    return db.get_travel_plans(familyMemberId)

@app.post("/api/travel/plans")
async def create_travel_plan(plan: Dict[str, Any]):
    """Create a new travel plan"""
    plan_id = db.create_travel_plan(plan)
    # Return the created plan
    plans = db.get_travel_plans()
    return next((p for p in plans if p["id"] == plan_id), None)

@app.post("/api/travel/recommendations")
async def get_travel_recommendations(request: Dict[str, Any]):
    """Get AI-powered travel recommendations based on family history"""
    destination = request.get("destination", "")
    family_preferences = request.get("familyPreferences", {})
    
    if AI_AVAILABLE:
        try:
            # Get past travel history from memories
            past_travels = []
            memories = db.get_memories()
            for memory in memories:
                if memory.get("location") and "travel" in memory.get("tags", []):
                    past_travels.append({
                        "destination": memory["location"],
                        "date": memory["date"],
                        "familyMembers": memory.get("familyMembers", [])
                    })
            
            # Get AI-powered recommendations
            ai_recommendations = await travel_ai_assistant.get_travel_recommendations(
                destination, 
                family_preferences,
                past_travels
            )
            
            return {
                "recommendations": ai_recommendations.get("destination_analysis", {}),
                "familyActivities": ai_recommendations.get("family_activities", []),
                "culturalExperiences": ai_recommendations.get("cultural_experiences", []),
                "estimatedBudget": ai_recommendations.get("budget_estimate", {}).get("total_estimate", 2000),
                "budgetBreakdown": ai_recommendations.get("budget_estimate", {}).get("breakdown", {}),
                "travelTips": ai_recommendations.get("travel_tips", []),
                "similarDestinations": ai_recommendations.get("similar_destinations", []),
                "suggestedActivities": ai_recommendations.get("family_activities", []),
                "ai_powered": True,
                "based_on_history": len(past_travels) > 0
            }
            
        except Exception as e:
            print(f"AI travel recommendations failed: {e}")
    
    # Fallback to basic recommendations
    recommendations = [
        f"Visit the historic districts of {destination}",
        f"Try local family-friendly restaurants in {destination}", 
        f"Explore cultural sites suitable for all ages"
    ]
    
    return {
        "recommendations": recommendations,
        "estimatedBudget": 2000,
        "suggestedActivities": [
            {
                "id": str(uuid.uuid4()),
                "name": f"City Tour of {destination}",
                "location": destination,
                "date": datetime.now().isoformat(),
                "cost": 150,
                "description": "Guided family tour"
            }
        ],
        "ai_powered": False
    }

# Smart Memory Features
@app.get("/api/memories/suggestions")
async def get_memory_suggestions(date: Optional[str] = None):
    """Get smart memory suggestions powered by AI"""
    target_date = date or datetime.now().strftime("%Y-%m-%d")
    
    if AI_AVAILABLE:
        try:
            from ai_services import SmartMemorySuggestions
            
            # Convert database memories to dict format for SmartMemorySuggestions
            memories = db.get_memories()
            memories_dict = {m["id"]: m for m in memories}
            suggestions_engine = SmartMemorySuggestions(memories_dict)
            
            # Get "On this day" memories
            on_this_day = suggestions_engine.get_on_this_day_memories(target_date)
            
            # Get intelligent recommendations
            family_members = db.get_family_members()
            recommendations = suggestions_engine.generate_memory_recommendations(
                [{"id": m["id"], "name": m["name"]} for m in family_members]
            )
            
            # Get similar memories (if any memories exist)
            similar = []
            if memories:
                latest_memory = max(memories, key=lambda x: x["date"])
                similar = suggestions_engine.get_similar_memories(latest_memory["id"], limit=3)
            
            return {
                "onThisDay": on_this_day,
                "similar": similar,
                "recommendations": recommendations,
                "ai_powered": True
            }
        except Exception as e:
            print(f"AI suggestions failed: {e}")
    
    # Fallback to basic suggestions
    on_this_day = []
    memories = db.get_memories()
    similar = memories[:3]
    
    recommendations = [
        "Share this memory with family members",
        "Create a photo album for this trip", 
        "Plan a return visit to this location"
    ]
    
    return {
        "onThisDay": on_this_day,
        "similar": similar,
        "recommendations": recommendations,
        "ai_powered": False
    }

@app.post("/api/memories/search")
async def search_memories(request: Dict[str, Any]):
    """Search memories with AI assistance"""
    query = request.get("query", "")
    filters = request.get("filters", {})
    
    # Simple text search (enhance with AI)
    memories = db.get_memories()
    
    if query:
        memories = [
            m for m in memories 
            if query.lower() in m["title"].lower() 
            or (m.get("description") and query.lower() in m["description"].lower())
        ]
    
    return memories

# AI Analysis Endpoint
@app.post("/api/analyze")
async def analyze_image(
    image: UploadFile = File(...),
    analysisType: str = Form("general"),
    familyContext: str = Form("[]")
):
    """Direct AI analysis endpoint"""
    # Save uploaded image
    filename = await save_uploaded_file(image, UPLOAD_DIR)
    image_path = UPLOAD_DIR / filename
    
    # Analyze with AI
    analysis = await analyze_image_with_ai(str(image_path), analysisType)
    
    return analysis

# AI Game Master Endpoints
@app.post("/api/games/create")
async def create_game_session(request: Dict[str, Any]):
    """Create new AI-managed game session"""
    game_type = request.get("gameType", "")
    players = request.get("players", [])
    settings = request.get("settings", {})
    
    if not AI_AVAILABLE:
        return {
            "error": "AI Game Master not available",
            "fallback": "Manual game setup required"
        }
    
    try:
        # Convert family member data to player format
        all_members = db.get_family_members()
        game_players = []
        for player_data in players:
            if isinstance(player_data, str):  # Family member ID
                member = next((m for m in all_members if m["id"] == player_data), None)
                if member:
                    game_players.append({
                        "id": member["id"],
                        "name": member["name"],
                        "nameArabic": member["nameArabic"]
                    })
            else:
                game_players.append(player_data)
        
        game_session = await ai_game_master.create_game_session(
            game_type, 
            game_players, 
            settings
        )
        
        # Save to database
        db.create_game_session(game_session)
        
        return game_session
        
    except Exception as e:
        return {"error": f"Failed to create game session: {str(e)}"}

@app.get("/api/games/{game_id}")
async def get_game_session(game_id: str):
    """Get current game session state"""
    if not AI_AVAILABLE:
        return {"error": "AI Game Master not available"}
    
    game_session = db.get_game_session(game_id)
    if game_session:
        return game_session
    else:
        return {"error": "Game session not found"}

@app.post("/api/games/{game_id}/action")
async def process_game_action(game_id: str, action: Dict[str, Any]):
    """Process game action through AI Game Master"""
    if not AI_AVAILABLE:
        return {"error": "AI Game Master not available"}
    
    try:
        result = await ai_game_master.process_game_action(game_id, action)
        return result
    except Exception as e:
        return {"error": f"Failed to process game action: {str(e)}"}

@app.get("/api/games/rules/{game_type}")
async def get_game_rules(game_type: str):
    """Get rules and information for a specific game type"""
    if not AI_AVAILABLE:
        return {"error": "AI Game Master not available"}
    
    rules = ai_game_master.game_rules.get(game_type, {})
    if rules:
        return {
            "gameType": game_type,
            "rules": rules,
            "aiFeatures": [
                "Automatic role assignment",
                "Fair play monitoring", 
                "Real-time rule enforcement",
                "Intelligent game progression",
                "Multi-language support (Arabic/English)"
            ]
        }
    else:
        return {"error": f"Game type '{game_type}' not supported"}

@app.get("/api/games/active")
async def get_active_games():
    """Get all active game sessions"""
    if not AI_AVAILABLE:
        return {"activeGames": [], "ai_available": False}
    
    active_games = db.get_active_game_sessions()
    
    return {
        "activeGames": active_games,
        "ai_available": True,
        "supportedGames": list(ai_game_master.game_rules.keys())
    }

# Cultural Heritage Endpoints
@app.post("/api/culture/translate")
async def translate_content(request: Dict[str, Any]):
    """Translate content between Arabic and English for cultural preservation"""
    text = request.get("text", "")
    source_lang = request.get("sourceLang", "auto")
    target_lang = request.get("targetLang", "en")
    
    # Mock translation service (would integrate with actual translation API)
    if target_lang == "ar":
        # English to Arabic
        translations = {
            "family": "عائلة",
            "memory": "ذكرى",
            "travel": "سفر",
            "celebration": "احتفال",
            "home": "بيت",
            "love": "حب"
        }
        
        translated_text = text
        for en_word, ar_word in translations.items():
            translated_text = translated_text.replace(en_word, ar_word)
    else:
        # Arabic to English
        translations = {
            "عائلة": "family",
            "ذكرى": "memory", 
            "سفر": "travel",
            "احتفال": "celebration",
            "بيت": "home",
            "حب": "love"
        }
        
        translated_text = text
        for ar_word, en_word in translations.items():
            translated_text = translated_text.replace(ar_word, en_word)
    
    return {
        "originalText": text,
        "translatedText": translated_text,
        "sourceLang": source_lang,
        "targetLang": target_lang,
        "culturalContext": {
            "preservedMeaning": True,
            "culturalNotes": "Translation maintains family context and cultural significance"
        }
    }

@app.post("/api/culture/heritage/save")
async def save_cultural_heritage_content(content: Dict[str, Any]):
    """Save cultural heritage content with bilingual support"""
    heritage_id = db.save_cultural_heritage(content)
    
    # Return the saved content
    heritage_items = db.get_cultural_heritage()
    return next((item for item in heritage_items if item["id"] == heritage_id), None)

@app.get("/api/culture/heritage")
async def get_cultural_heritage(category: Optional[str] = None):
    """Get cultural heritage content"""
    return db.get_cultural_heritage(category)

# Chat/AI Assistant Endpoints
class ChatMessage(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = None
    family_id: Optional[str] = None
    conversation_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    message_id: str
    timestamp: str
    confidence: float
    context_used: List[str]
    suggestions: List[str]

@app.post("/api/chat", response_model=ChatResponse)
async def chat_with_ai_assistant(chat_request: ChatMessage, current_user: dict = Depends(get_current_user)):
    """Chat with family AI assistant"""
    try:
        # Generate conversation ID if not provided
        conversation_id = chat_request.conversation_id or str(uuid.uuid4())
        message_id = str(uuid.uuid4())
        timestamp = datetime.now().isoformat()
        
        # Get family context if family_id provided
        family_context = []
        if chat_request.family_id:
            try:
                family_members = data_manager.get_family_members()
                memories = data_manager.get_memories()
                family_context = [
                    f"Family has {len(family_members)} members",
                    f"Family has {len(memories)} memories stored"
                ]
            except Exception as e:
                logger.warning(f"Could not load family context: {e}")
        
        # Generate AI response (simplified for now)
        user_message = chat_request.message.lower()
        
        # Simple rule-based responses for key family features
        if any(word in user_message for word in ["travel", "trip", "vacation"]):
            response = "I can help you plan amazing family trips! Would you like me to suggest destinations based on your family's interests and budget?"
            suggestions = ["Show travel plans", "Get destination suggestions", "Check travel budget"]
        
        elif any(word in user_message for word in ["memory", "photo", "remember"]):
            response = "I love helping families preserve their precious memories! I can help you organize photos, create memory timelines, and suggest related memories."
            suggestions = ["Upload photos", "View memory timeline", "Find similar memories"]
        
        elif any(word in user_message for word in ["game", "play", "mafia", "among us"]):
            response = "Ready for some family fun? I can set up games like Mafia, location-based challenges, or traditional card games for your family!"
            suggestions = ["Start Mafia game", "Create location challenge", "Show game rules"]
        
        elif any(word in user_message for word in ["family", "member", "tree"]):
            response = "Let me help you with family information! I can show you family members, relationships, and help you add new family information."
            suggestions = ["View family tree", "Add family member", "Update relationships"]
        
        else:
            response = f"Hello! I'm your family AI assistant. I can help with travel planning, memory management, gaming, and family organization. What would you like to do today?"
            suggestions = ["Plan a trip", "Organize memories", "Start a game", "Manage family"]
        
        # Save conversation to database
        try:
            # Save the conversation message to database
            db.save_chat_message({
                "conversation_id": conversation_id,
                "message_id": message_id,
                "user_message": chat_request.message,
                "ai_response": response,
                "timestamp": timestamp,
                "user_id": current_user.get("id"),
                "family_id": chat_request.family_id,
                "confidence": 0.85,
                "context_used": family_context
            })
        except Exception as e:
            logger.warning(f"Could not save conversation: {e}")
        
        return ChatResponse(
            response=response,
            message_id=message_id,
            timestamp=timestamp,
            confidence=0.85,
            context_used=family_context[:3],  # Limit context
            suggestions=suggestions
        )
        
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=f"Chat processing failed: {str(e)}")

@app.get("/api/chat/conversations/{conversation_id}")
async def get_conversation_history(conversation_id: str, current_user: dict = Depends(get_current_user)):
    """Get chat conversation history"""
    try:
        # Fetch conversation messages from database
        messages = db.get_chat_messages(conversation_id, current_user.get("id"))
        
        if not messages:
            return {
                "conversation_id": conversation_id,
                "messages": [],
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
        
        return {
            "conversation_id": conversation_id,
            "messages": messages,
            "created_at": messages[0].get("timestamp") if messages else datetime.now().isoformat(),
            "updated_at": messages[-1].get("timestamp") if messages else datetime.now().isoformat(),
            "total_messages": len(messages)
        }
    except Exception as e:
        logger.error(f"Error fetching conversation: {e}")
        raise HTTPException(status_code=500, detail=f"Could not fetch conversation: {str(e)}")

@app.get("/api/chat/conversations")
async def get_user_conversations(current_user: dict = Depends(get_current_user)):
    """Get all user conversations"""
    try:
        # Fetch user's conversations from database
        conversations = db.get_user_conversations(current_user.get("id"))
        
        return {
            "conversations": conversations,
            "total": len(conversations)
        }
    except Exception as e:
        logger.error(f"Error fetching conversations: {e}")
        raise HTTPException(status_code=500, detail=f"Could not fetch conversations: {str(e)}")

# WebSocket Endpoints for Real-time Collaboration
@app.websocket("/ws/family/{family_id}")
async def websocket_family_endpoint(websocket: WebSocket, family_id: str, user_id: str):
    """WebSocket endpoint for family collaboration"""
    connection_id = await websocket_manager.connect(
        websocket, 
        user_id, 
        ConnectionType.FAMILY_MEMBER,
        {"family_id": family_id}
    )
    
    # Join family room
    await websocket_manager.join_room(connection_id, "family", family_id)
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            # Process the message
            await websocket_manager.process_message(connection_id, message_data)
            
    except WebSocketDisconnect:
        await websocket_manager.disconnect(connection_id)

@app.websocket("/ws/game/{game_id}")
async def websocket_game_endpoint(websocket: WebSocket, game_id: str, user_id: str):
    """WebSocket endpoint for real-time gaming"""
    connection_id = await websocket_manager.connect(
        websocket,
        user_id,
        ConnectionType.GAME_PLAYER,
        {"game_id": game_id}
    )
    
    # Join game room
    await websocket_manager.join_room(connection_id, "game", game_id)
    
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            # Process game-specific messages
            await websocket_manager.process_message(connection_id, message_data)
            
            # Also update game state in database if needed
            if message_data.get("type") == MessageType.PLAYER_ACTION.value:
                game_session = db.get_game_session(game_id)
                if game_session and AI_AVAILABLE:
                    # Process through AI Game Master
                    result = await ai_game_master.process_game_action(game_id, message_data.get("action", {}))
                    
                    # Update database
                    db.update_game_session(game_id, {
                        "game_state": result.get("game_state", {}),
                        "status": result.get("status", "active")
                    })
                    
                    # Broadcast game state update
                    await websocket_manager.broadcast_to_room("game", game_id, {
                        "type": MessageType.GAME_STATE_CHANGED.value,
                        "game_id": game_id,
                        "game_state": result.get("game_state", {}),
                        "result": result,
                        "timestamp": datetime.now().isoformat()
                    })
            
    except WebSocketDisconnect:
        await websocket_manager.disconnect(connection_id)

@app.websocket("/ws/travel/{travel_plan_id}")
async def websocket_travel_endpoint(websocket: WebSocket, travel_plan_id: str, user_id: str):
    """WebSocket endpoint for collaborative travel planning"""
    connection_id = await websocket_manager.connect(
        websocket,
        user_id,
        ConnectionType.TRAVEL_PLANNER,
        {"travel_plan_id": travel_plan_id}
    )
    
    # Join travel planning room
    await websocket_manager.join_room(connection_id, "travel", travel_plan_id)
    
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            await websocket_manager.process_message(connection_id, message_data)
            
            # Update travel plan in database if needed
            if message_data.get("type") == MessageType.TRAVEL_PLAN_UPDATED.value:
                updates = message_data.get("updates", {})
                success = db.update_travel_plan(travel_plan_id, updates)
                if success:
                    # Broadcast successful update
                    await websocket_manager.broadcast_to_room("travel", travel_plan_id, {
                        "type": MessageType.TRAVEL_PLAN_UPDATED.value,
                        "travel_plan_id": travel_plan_id,
                        "updates": updates,
                        "updated_by": user_id,
                        "timestamp": datetime.now().isoformat(),
                        "success": True
                    })
            
    except WebSocketDisconnect:
        await websocket_manager.disconnect(connection_id)

@app.websocket("/ws/memory/{memory_id}")
async def websocket_memory_endpoint(websocket: WebSocket, memory_id: str, user_id: str):
    """WebSocket endpoint for collaborative memory viewing and commenting"""
    connection_id = await websocket_manager.connect(
        websocket,
        user_id,
        ConnectionType.MEMORY_VIEWER,
        {"memory_id": memory_id}
    )
    
    # Join memory room
    await websocket_manager.join_room(connection_id, "memory", memory_id)
    
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            await websocket_manager.process_message(connection_id, message_data)
            
    except WebSocketDisconnect:
        await websocket_manager.disconnect(connection_id)

# WebSocket utility endpoints
@app.get("/api/ws/rooms/{room_type}/{room_id}/members")
async def get_room_members(room_type: str, room_id: str):
    """Get current members in a WebSocket room"""
    members = websocket_manager.get_room_members(room_type, room_id)
    return {
        "room_type": room_type,
        "room_id": room_id,
        "members": members,
        "member_count": len(members)
    }

@app.get("/api/ws/presence/{user_id}")
async def get_user_presence(user_id: str):
    """Get user presence information"""
    presence = websocket_manager.get_user_presence(user_id)
    if presence:
        return presence
    else:
        return {
            "status": "offline",
            "last_seen": None,
            "connection_type": None
        }

@app.get("/api/ws/presence")
async def get_all_presence():
    """Get all user presence information"""
    return websocket_manager.get_all_presence()

@app.post("/api/ws/notify")
async def send_notification(request: Dict[str, Any]):
    """Send real-time notification to users"""
    user_ids = request.get("user_ids", [])
    message = request.get("message", "")
    notification_type = request.get("type", "info")
    
    notification = {
        "type": MessageType.NOTIFICATION.value,
        "notification_type": notification_type,
        "message": message,
        "timestamp": datetime.now().isoformat(),
        "data": request.get("data", {})
    }
    
    success_count = 0
    for user_id in user_ids:
        if await websocket_manager.send_to_user(user_id, notification):
            success_count += 1
    
    return {
        "success": True,
        "notifications_sent": success_count,
        "total_users": len(user_ids)
    }

# Advanced Facial Recognition Endpoints
@app.post("/api/ai/faces/train")
async def train_face_recognition(
    family_member_id: str = Form(...),
    verified: bool = Form(False),
    image: UploadFile = File(...)
):
    """Add training sample for facial recognition"""
    if not image.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Save uploaded image
    filename = await save_uploaded_file(image, UPLOAD_DIR)
    image_path = UPLOAD_DIR / filename
    
    # Add training sample
    result = face_trainer.add_training_sample(
        family_member_id, 
        str(image_path), 
        verified
    )
    
    # Notify family members about training update via WebSocket
    if result["success"]:
        family_members = db.get_family_members()
        member = next((m for m in family_members if m["id"] == family_member_id), None)
        if member:
            # Broadcast to family
            await websocket_manager.broadcast_to_family("main", {
                "type": MessageType.SYSTEM_MESSAGE.value,
                "message": f"Face recognition updated for {member['name']}",
                "data": {
                    "family_member_id": family_member_id,
                    "training_result": result
                },
                "timestamp": datetime.now().isoformat()
            })
    
    return result

@app.post("/api/ai/faces/identify")
async def identify_faces_in_image(image: UploadFile = File(...)):
    """Identify faces in uploaded image using trained model"""
    if not image.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Save uploaded image
    filename = await save_uploaded_file(image, UPLOAD_DIR)
    image_path = UPLOAD_DIR / filename
    
    # Identify faces
    results = face_trainer.identify_faces(str(image_path))
    
    # Enhance results with family member details
    family_members = db.get_family_members()
    enhanced_results = []
    
    for result in results:
        enhanced_result = result.copy()
        if result.get("family_member_id"):
            member = next((m for m in family_members if m["id"] == result["family_member_id"]), None)
            if member:
                enhanced_result["family_member"] = {
                    "name": member["name"],
                    "nameArabic": member["nameArabic"]
                }
        enhanced_results.append(enhanced_result)
    
    return {
        "image_path": f"/uploads/{filename}",
        "faces_detected": len(results),
        "identification_results": enhanced_results
    }

@app.get("/api/ai/faces/suggestions/{family_member_id}")
async def get_training_suggestions(family_member_id: str):
    """Get training suggestions for improving face recognition"""
    suggestions = face_trainer.get_training_suggestions(family_member_id)
    
    # Add family member details
    family_members = db.get_family_members()
    member = next((m for m in family_members if m["id"] == family_member_id), None)
    if member:
        suggestions["family_member"] = {
            "name": member["name"],
            "nameArabic": member["nameArabic"]
        }
    
    return suggestions

@app.get("/api/ai/faces/analysis")
async def get_training_analysis():
    """Get analysis of current facial recognition training quality"""
    analysis = face_trainer.analyze_training_quality()
    
    # Add family member details
    family_members = db.get_family_members()
    member_details = {}
    for member in family_members:
        member_details[member["id"]] = {
            "name": member["name"],
            "nameArabic": member["nameArabic"]
        }
    
    analysis["family_members"] = member_details
    return analysis

@app.post("/api/ai/faces/retrain")
async def retrain_face_model():
    """Manually trigger face recognition model retraining"""
    result = face_trainer.train_classifier()
    
    # Notify family members about retraining
    if result["success"]:
        await websocket_manager.broadcast_to_family("main", {
            "type": MessageType.SYSTEM_MESSAGE.value,
            "message": f"Face recognition model retrained with {result['accuracy']:.1%} accuracy",
            "data": result,
            "timestamp": datetime.now().isoformat()
        })
    
    return result

@app.get("/api/ai/faces/history")
async def get_training_history():
    """Get facial recognition training history"""
    return face_trainer.get_training_history()

@app.delete("/api/ai/faces/{family_member_id}")
async def remove_face_training_data(family_member_id: str):
    """Remove all facial recognition training data for a family member"""
    success = face_trainer.remove_training_samples(family_member_id)
    
    if success:
        # Notify family about removal
        family_members = db.get_family_members()
        member = next((m for m in family_members if m["id"] == family_member_id), None)
        if member:
            await websocket_manager.broadcast_to_family("main", {
                "type": MessageType.SYSTEM_MESSAGE.value,
                "message": f"Face recognition data removed for {member['name']}",
                "data": {"family_member_id": family_member_id},
                "timestamp": datetime.now().isoformat()
            })
    
    return {
        "success": success,
        "family_member_id": family_member_id
    }

# Photo Clustering and Album Generation Endpoints
@app.post("/api/albums/auto-create")
async def create_automatic_albums(request: Dict[str, Any]):
    """Create albums automatically using AI clustering"""
    algorithm = request.get("algorithm", "auto")
    memory_filters = request.get("filters", {})
    
    # Get memories based on filters
    memories = db.get_memories(memory_filters)
    
    if not memories:
        return {
            "success": False,
            "error": "No memories found to cluster",
            "albums_created": 0
        }
    
    # Create automatic albums
    result = photo_clustering_engine.create_automatic_albums(memories, algorithm)
    
    # Notify family members about new albums
    if result["success"] and result["albums_created"] > 0:
        await websocket_manager.broadcast_to_family("main", {
            "type": MessageType.SYSTEM_MESSAGE.value,
            "message": f"Created {result['albums_created']} new albums automatically",
            "data": {
                "albums_created": result["albums_created"],
                "algorithm": result["algorithm_used"]
            },
            "timestamp": datetime.now().isoformat()
        })
    
    return result

@app.get("/api/albums")
async def get_albums(album_type: Optional[str] = None):
    """Get all albums"""
    albums = photo_clustering_engine.get_albums(album_type)
    
    # Enhance albums with memory details and cover images
    enhanced_albums = []
    all_memories = db.get_memories()
    memories_dict = {m["id"]: m for m in all_memories}
    
    for album in albums:
        enhanced_album = album.copy()
        
        # Add memory details
        album_memories = []
        for memory_id in album["memory_ids"]:
            if memory_id in memories_dict:
                album_memories.append(memories_dict[memory_id])
        
        enhanced_album["memories"] = album_memories
        enhanced_album["memory_count"] = len(album_memories)
        
        # Add cover image URL
        if album["cover_memory_id"] and album["cover_memory_id"] in memories_dict:
            cover_memory = memories_dict[album["cover_memory_id"]]
            enhanced_album["cover_image_url"] = cover_memory.get("imageUrl")
        
        enhanced_albums.append(enhanced_album)
    
    return enhanced_albums

@app.get("/api/albums/suggestions")
async def get_album_suggestions():
    """Get suggestions for new albums"""
    memories = db.get_memories()
    suggestions = photo_clustering_engine.suggest_new_albums(memories)
    return suggestions

@app.get("/api/albums/clustering-analysis")
async def get_clustering_analysis():
    """Analyze memories for clustering potential"""
    memories = db.get_memories()
    analysis = photo_clustering_engine.analyze_memories_for_clustering(memories)
    return analysis

@app.get("/api/albums/history")
async def get_clustering_history():
    """Get clustering session history"""
    return photo_clustering_engine.get_clustering_history()

@app.get("/api/albums/{album_id}")
async def get_album_details(album_id: str):
    """Get detailed information about a specific album"""
    albums = photo_clustering_engine.get_albums()
    album = next((a for a in albums if a["id"] == album_id), None)
    
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")
    
    # Get memory details
    all_memories = db.get_memories()
    memories_dict = {m["id"]: m for m in all_memories}
    
    album_memories = []
    for memory_id in album["memory_ids"]:
        if memory_id in memories_dict:
            album_memories.append(memories_dict[memory_id])
    
    album["memories"] = album_memories
    album["memory_count"] = len(album_memories)
    
    return album

# GPS Location Verification and Travel Games Endpoints

@app.post("/api/games/location/verify")
async def verify_location(request: LocationVerificationRequest, photo: UploadFile = File(None)):
    """Verify player location for travel games and challenges"""
    try:
        photo_path = None
        
        # Save uploaded photo if provided
        if photo:
            photo_filename = f"verification_{uuid.uuid4()}_{photo.filename}"
            photo_path = UPLOAD_DIR / photo_filename
            
            async with aiofiles.open(photo_path, 'wb') as f:
                content = await photo.read()
                await f.write(content)
        
        # Perform GPS verification
        verification_result = await gps_verifier.verify_location(
            player_id=request.player_id,
            game_session_id=request.game_session_id,
            target_lat=request.target_latitude,
            target_lon=request.target_longitude,
            actual_lat=request.actual_latitude,
            actual_lon=request.actual_longitude,
            challenge_id=request.challenge_id,
            photo_evidence=str(photo_path) if photo_path else None,
            gps_metadata=request.gps_metadata
        )
        
        # Send real-time notification to game participants
        if verification_result["status"] == "verified":
            await websocket_manager.broadcast_to_room(
                f"game_{request.game_session_id}",
                {
                    "type": MessageType.GAME_UPDATE.value,
                    "data": {
                        "event": "location_verified",
                        "player_id": request.player_id,
                        "challenge_id": request.challenge_id,
                        "verification_result": verification_result
                    }
                }
            )
        
        return verification_result
        
    except Exception as e:
        logger.error(f"Error in location verification: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/games/location/challenges")
async def create_location_challenge(challenge: LocationChallenge):
    """Create a new location-based challenge for travel games"""
    try:
        challenge_id = await gps_verifier.create_location_challenge(
            game_session_id=challenge.game_session_id,
            challenge_name=challenge.challenge_name,
            target_location=challenge.target_location,
            target_lat=challenge.target_latitude,
            target_lon=challenge.target_longitude,
            challenge_type=challenge.challenge_type,
            points_reward=challenge.points_reward,
            time_limit_minutes=challenge.time_limit_minutes,
            verification_radius=challenge.verification_radius,
            requirements=challenge.requirements
        )
        
        if not challenge_id:
            raise HTTPException(status_code=500, detail="Failed to create challenge")
        
        # Notify game participants about new challenge
        await websocket_manager.broadcast_to_room(
            f"game_{challenge.game_session_id}",
            {
                "type": MessageType.GAME_UPDATE.value,
                "data": {
                    "event": "new_challenge",
                    "challenge_id": challenge_id,
                    "challenge_name": challenge.challenge_name,
                    "challenge_type": challenge.challenge_type,
                    "points_reward": challenge.points_reward
                }
            }
        )
        
        challenge_data = challenge.dict()
        challenge_data["id"] = challenge_id
        return challenge_data
        
    except Exception as e:
        logger.error(f"Error creating location challenge: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/games/{game_session_id}/location/challenges")
async def get_active_challenges(game_session_id: str):
    """Get all active location challenges for a game session"""
    try:
        challenges = await gps_verifier.get_active_challenges(game_session_id)
        return {"challenges": challenges}
        
    except Exception as e:
        logger.error(f"Error getting active challenges: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/games/location/challenges/{challenge_id}/complete")
async def complete_location_challenge(
    challenge_id: str, 
    verification_request: LocationVerificationRequest,
    photo: UploadFile = File(None)
):
    """Complete a location challenge with verification"""
    try:
        # First verify the location
        photo_path = None
        if photo:
            photo_filename = f"challenge_{challenge_id}_{uuid.uuid4()}_{photo.filename}"
            photo_path = UPLOAD_DIR / photo_filename
            
            async with aiofiles.open(photo_path, 'wb') as f:
                content = await photo.read()
                await f.write(content)
        
        verification_result = await gps_verifier.verify_location(
            player_id=verification_request.player_id,
            game_session_id=verification_request.game_session_id,
            target_lat=verification_request.target_latitude,
            target_lon=verification_request.target_longitude,
            actual_lat=verification_request.actual_latitude,
            actual_lon=verification_request.actual_longitude,
            challenge_id=challenge_id,
            photo_evidence=str(photo_path) if photo_path else None,
            gps_metadata=verification_request.gps_metadata
        )
        
        # Complete the challenge if verification passed
        completion_result = await gps_verifier.complete_challenge(
            challenge_id, verification_request.player_id, verification_result
        )
        
        # Notify game participants
        if completion_result["success"]:
            await websocket_manager.broadcast_to_room(
                f"game_{verification_request.game_session_id}",
                {
                    "type": MessageType.GAME_UPDATE.value,
                    "data": {
                        "event": "challenge_completed",
                        "player_id": verification_request.player_id,
                        "challenge_id": challenge_id,
                        "points_awarded": completion_result["points_awarded"],
                        "completion_result": completion_result
                    }
                }
            )
        
        return {
            "verification": verification_result,
            "completion": completion_result
        }
        
    except Exception as e:
        logger.error(f"Error completing location challenge: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/games/location/verification-history")
async def get_verification_history(
    player_id: Optional[str] = None,
    game_session_id: Optional[str] = None,
    limit: int = 50
):
    """Get location verification history"""
    try:
        history = await gps_verifier.get_verification_history(
            player_id=player_id,
            game_session_id=game_session_id,
            limit=limit
        )
        return {"verifications": history}
        
    except Exception as e:
        logger.error(f"Error getting verification history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/games/location/spoofing-alerts")
async def get_spoofing_alerts(game_session_id: Optional[str] = None):
    """Get GPS spoofing detection alerts"""
    try:
        # This would query the spoofing detection table
        # For now, return basic info
        return {
            "alerts": [],
            "spoofing_detection_enabled": gps_verifier.spoofing_detection_enabled,
            "verification_radius_meters": gps_verifier.verification_radius_meters
        }
        
    except Exception as e:
        logger.error(f"Error getting spoofing alerts: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/games/location/settings")
async def update_gps_settings(settings: Dict[str, Any]):
    """Update GPS verification settings"""
    try:
        if "verification_radius_meters" in settings:
            gps_verifier.verification_radius_meters = settings["verification_radius_meters"]
        
        if "spoofing_detection_enabled" in settings:
            gps_verifier.spoofing_detection_enabled = settings["spoofing_detection_enabled"]
        
        return {
            "success": True,
            "current_settings": {
                "verification_radius_meters": gps_verifier.verification_radius_meters,
                "spoofing_detection_enabled": gps_verifier.spoofing_detection_enabled
            }
        }
        
    except Exception as e:
        logger.error(f"Error updating GPS settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# WebSocket endpoint for real-time features
@app.websocket("/ws/{user_id}")
async def websocket_connection(websocket: WebSocket, user_id: str, family_id: str = "elmowafi_family"):
    """WebSocket endpoint for real-time communication"""
    await websocket_endpoint(websocket, user_id, family_id)

# WebSocket status endpoint
@app.get("/api/realtime/status")
async def get_realtime_status():
    """Get real-time connection status"""
    return connection_manager.get_connection_stats()

# Send notification to user
@app.post("/api/realtime/notify/{user_id}")
async def send_notification_to_user(user_id: str, notification: dict):
    """Send a real-time notification to a specific user"""
    success = await connection_manager.send_notification(user_id, notification)
    return {"success": success, "user_id": user_id}

# Data Export/Import endpoints
@app.post("/api/data/export")
async def export_family_data(
    format: str = "json", 
    family_id: str = "elmowafi_family",
    current_user: dict = Depends(get_current_user)
):
    """Export family data in specified format"""
    try:
        result = data_manager.export_all_data(family_id, format)
        return {"success": True, "export_info": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")

@app.post("/api/data/import")
async def import_family_data(
    import_file: str,
    merge_strategy: str = "merge",
    family_id: str = "elmowafi_family",
    current_user: dict = Depends(get_current_user)
):
    """Import family data from file"""
    try:
        result = data_manager.import_data(import_file, family_id, merge_strategy)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")

@app.post("/api/data/backup")
async def create_database_backup(current_user: dict = Depends(get_current_user)):
    """Create a database backup"""
    try:
        result = data_manager.backup_database()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Backup failed: {str(e)}")

@app.post("/api/data/restore")
async def restore_from_backup(
    backup_file: str,
    current_user: dict = Depends(get_current_user)
):
    """Restore database from backup"""
    try:
        result = data_manager.restore_from_backup(backup_file)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Restore failed: {str(e)}")

@app.get("/api/data/exports")
async def list_data_exports(current_user: dict = Depends(get_current_user)):
    """List all available data exports"""
    try:
        exports = data_manager.list_exports()
        return {"exports": exports}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list exports: {str(e)}")

@app.get("/api/data/backups")
async def list_data_backups(current_user: dict = Depends(get_current_user)):
    """List all available database backups"""
    try:
        backups = data_manager.list_backups()
        return {"backups": backups}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list backups: {str(e)}")

@app.delete("/api/data/cleanup")
async def cleanup_old_files(
    keep_count: int = 10,
    current_user: dict = Depends(get_current_user)
):
    """Clean up old export and backup files"""
    try:
        result = data_manager.cleanup_old_exports(keep_count)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cleanup failed: {str(e)}")

# Enhanced AI Services Integration
@app.post("/api/ai/analyze-photo")
async def analyze_photo_with_ai(
    file: UploadFile = File(...),
    family_context: str = Form(None),
    current_user: dict = Depends(get_current_user)
):
    """Comprehensive AI photo analysis including facial recognition and scene analysis"""
    try:
        # Save uploaded image temporarily
        import tempfile
        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_path = temp_file.name
        
        try:
            # Parse family context
            family_members = []
            if family_context:
                try:
                    family_members = json.loads(family_context)
                except:
                    pass
            
            # Perform comprehensive AI analysis
            analysis_result = await family_ai_analyzer.analyze_family_photo(temp_path, family_members)
            
            # Add facial recognition results
            if FACE_RECOGNITION_AVAILABLE:
                face_results = face_trainer.identify_faces(temp_path)
                analysis_result["facial_recognition"] = face_results
            
            # Generate insights and suggestions
            insights = await family_ai_analyzer.generate_family_insights(
                cv2.imread(temp_path), 
                family_members
            )
            analysis_result["ai_insights"] = insights
            
            return {
                "success": True,
                "analysis": analysis_result,
                "file_processed": file.filename,
                "ai_services_used": [
                    "scene_analysis",
                    "face_detection", 
                    "emotion_detection",
                    "object_detection",
                    "facial_recognition" if FACE_RECOGNITION_AVAILABLE else None
                ]
            }
            
        finally:
            # Clean up temporary file
            if os.path.exists(temp_path):
                os.unlink(temp_path)
                
    except Exception as e:
        logger.error(f"AI photo analysis error: {e}")
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")

@app.post("/api/ai/train-face-recognition")
async def train_face_recognition(
    family_member_id: str = Form(...),
    file: UploadFile = File(...),
    verified: bool = Form(False),
    current_user: dict = Depends(get_current_user)
):
    """Train facial recognition system with new family member photos"""
    try:
        if not FACE_RECOGNITION_AVAILABLE:
            raise HTTPException(status_code=503, detail="Facial recognition service not available")
        
        # Save uploaded training image
        training_dir = Path("data/training_images") 
        training_dir.mkdir(parents=True, exist_ok=True)
        
        file_extension = Path(file.filename).suffix
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{family_member_id}_{timestamp}{file_extension}"
        file_path = training_dir / filename
        
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
        
        # Add training sample
        result = face_trainer.add_training_sample(family_member_id, str(file_path), verified)
        
        return {
            "success": result["success"],
            "message": "Training sample added successfully" if result["success"] else "Failed to add training sample",
            "training_result": result,
            "training_suggestions": face_trainer.get_training_suggestions(family_member_id)
        }
        
    except Exception as e:
        logger.error(f"Face recognition training error: {e}")
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")

@app.get("/api/ai/face-recognition-status")
async def get_face_recognition_status(current_user: dict = Depends(get_current_user)):
    """Get current status of face recognition training"""
    try:
        if not FACE_RECOGNITION_AVAILABLE:
            return {
                "available": False,
                "reason": "face_recognition library not installed"
            }
        
        # Get training analysis
        analysis = face_trainer.analyze_training_quality()
        training_history = face_trainer.get_training_history()
        
        # Get suggestions for each family member
        family_members = get_family_members()  # Assume this function exists
        member_suggestions = {}
        for member in family_members:
            member_suggestions[member["id"]] = face_trainer.get_training_suggestions(member["id"])
        
        return {
            "available": True,
            "training_analysis": analysis,
            "training_history": training_history[:5],  # Last 5 sessions
            "member_suggestions": member_suggestions,
            "recommendations": analysis.get("recommendations", [])
        }
        
    except Exception as e:
        logger.error(f"Face recognition status error: {e}")
        return {
            "available": False,
            "error": str(e)
        }

@app.post("/api/ai/smart-album-creation")
async def create_smart_albums(
    algorithm: str = "auto",
    current_user: dict = Depends(get_current_user)
):
    """Create smart photo albums using AI clustering"""
    try:
        if not PHOTO_CLUSTERING_AVAILABLE:
            raise HTTPException(status_code=503, detail="Photo clustering service not available")
        
        # Get all memories for clustering
        memories = get_all_memories()  # Assume this function exists
        
        # Create automatic albums
        result = photo_clustering_engine.create_automatic_albums(memories, algorithm)
        
        if result["success"]:
            return {
                "success": True,
                "message": f"Created {result['albums_created']} smart albums",
                "clustering_result": result,
                "albums": result["albums"]
            }
        else:
            return {
                "success": False,
                "error": result.get("error", "Unknown clustering error"),
                "analysis": result.get("clustering_analysis")
            }
            
    except Exception as e:
        logger.error(f"Smart album creation error: {e}")
        raise HTTPException(status_code=500, detail=f"Album creation failed: {str(e)}")

@app.get("/api/ai/album-suggestions")
async def get_album_suggestions(current_user: dict = Depends(get_current_user)):
    """Get AI suggestions for new albums"""
    try:
        if not PHOTO_CLUSTERING_AVAILABLE:
            raise HTTPException(status_code=503, detail="Photo clustering service not available")
        
        # Get all memories
        memories = get_all_memories()  # Assume this function exists
        
        # Get suggestions
        suggestions = photo_clustering_engine.suggest_new_albums(memories)
        
        return {
            "success": True,
            "suggestions": suggestions["suggestions"],
            "unclustered_count": suggestions["unclustered_count"],
            "analysis": suggestions.get("clustering_analysis")
        }
        
    except Exception as e:
        logger.error(f"Album suggestions error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get suggestions: {str(e)}")

@app.post("/api/ai/enhance-memory")
async def enhance_memory_with_ai(
    memory_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Enhance memory with AI-generated tags, descriptions, and insights"""
    try:
        # Get memory data
        memory = get_memory_by_id(memory_id)  # Assume this function exists
        if not memory:
            raise HTTPException(status_code=404, detail="Memory not found")
        
        enhancements = {}
        
        # If memory has an image, analyze it
        if memory.get("imageUrl") and os.path.exists(memory["imageUrl"]):
            analysis = await family_ai_analyzer.analyze_family_photo(
                memory["imageUrl"], 
                get_family_members()
            )
            enhancements["photo_analysis"] = analysis
            
            # Extract AI-suggested tags
            if analysis.get("ai_insights"):
                suggested_tags = analysis["ai_insights"].get("suggested_tags", [])
                enhancements["suggested_tags"] = suggested_tags
        
        # Generate smart description if missing
        if not memory.get("description") or len(memory.get("description", "")) < 10:
            # Generate description based on available data
            smart_description = generate_smart_description(memory)
            enhancements["suggested_description"] = smart_description
        
        # Get related memories
        related_memories = find_related_memories(memory)
        enhancements["related_memories"] = related_memories[:5]
        
        # Generate family insights
        family_insights = await family_ai_analyzer.generate_family_insights(
            None, 
            get_family_members()
        )
        enhancements["family_insights"] = family_insights
        
        return {
            "success": True,
            "memory_id": memory_id,
            "enhancements": enhancements,
            "ai_confidence": 0.85
        }
        
    except Exception as e:
        logger.error(f"Memory enhancement error: {e}")
        raise HTTPException(status_code=500, detail=f"Enhancement failed: {str(e)}")

@app.get("/api/ai/platform-insights")
async def get_platform_insights(current_user: dict = Depends(get_current_user)):
    """Get comprehensive AI insights about family platform usage"""
    try:
        insights = {
            "timestamp": datetime.now().isoformat(),
            "family_statistics": {},
            "memory_analysis": {},
            "travel_insights": {},
            "ai_system_status": {}
        }
        
        # Family statistics
        family_members = get_family_members()
        memories = get_all_memories()
        
        insights["family_statistics"] = {
            "total_members": len(family_members),
            "total_memories": len(memories),
            "memories_with_images": len([m for m in memories if m.get("imageUrl")]),
            "memories_with_locations": len([m for m in memories if m.get("location")]),
            "average_memories_per_month": calculate_monthly_memory_average(memories)
        }
        
        # Memory analysis
        if memories:
            memory_analysis = photo_clustering_engine.analyze_memories_for_clustering(memories)
            insights["memory_analysis"] = memory_analysis
        
        # AI system status
        insights["ai_system_status"] = {
            "facial_recognition": {
                "available": FACE_RECOGNITION_AVAILABLE,
                "trained_people": len(face_trainer.face_encodings) if FACE_RECOGNITION_AVAILABLE else 0,
                "model_trained": face_trainer.face_classifier is not None if FACE_RECOGNITION_AVAILABLE else False
            },
            "photo_clustering": {
                "available": PHOTO_CLUSTERING_AVAILABLE,
                "total_albums": len(photo_clustering_engine.get_albums()) if PHOTO_CLUSTERING_AVAILABLE else 0
            },
            "smart_features": {
                "memory_suggestions": True,
                "travel_planning": True,
                "family_chat": True
            }
        }
        
        # Generate recommendations
        recommendations = []
        if FACE_RECOGNITION_AVAILABLE and face_trainer.face_classifier is None:
            recommendations.append("Train facial recognition with family photos for better organization")
        
        if len(memories) >= 10 and PHOTO_CLUSTERING_AVAILABLE:
            albums = photo_clustering_engine.get_albums()
            if len(albums) == 0:
                recommendations.append("Create smart albums to organize your memories automatically")
        
        insights["recommendations"] = recommendations
        
        return insights
        
    except Exception as e:
        logger.error(f"Platform insights error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate insights: {str(e)}")

# Helper functions for AI services
def get_memory_by_id(memory_id: str) -> Optional[Dict[str, Any]]:
    """Get memory by ID from the database"""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.execute("SELECT * FROM memories WHERE id = ?", (memory_id,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return {
                "id": row["id"],
                "title": row["title"],
                "description": row["description"],
                "date": row["date"],
                "location": row["location"],
                "imageUrl": row["image_url"],
                "familyMembers": json.loads(row["family_members"]) if row["family_members"] else [],
                "tags": json.loads(row["tags"]) if row["tags"] else [],
                "created_at": row["created_at"]
            }
        return None
    except Exception as e:
        logger.error(f"Error getting memory by ID: {e}")
        return None

def get_all_memories() -> List[Dict[str, Any]]:
    """Get all memories from the database"""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.execute("SELECT * FROM memories ORDER BY date DESC")
        memories = []
        
        for row in cursor.fetchall():
            memory = {
                "id": row["id"],
                "title": row["title"],
                "description": row["description"],
                "date": row["date"],
                "location": row["location"],
                "imageUrl": row["image_url"],
                "familyMembers": json.loads(row["family_members"]) if row["family_members"] else [],
                "tags": json.loads(row["tags"]) if row["tags"] else [],
                "created_at": row["created_at"]
            }
            memories.append(memory)
        
        conn.close()
        return memories
    except Exception as e:
        logger.error(f"Error getting all memories: {e}")
        return []

def get_family_members() -> List[Dict[str, Any]]:
    """Get all family members from the database"""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.execute("SELECT * FROM family_members ORDER BY name")
        members = []
        
        for row in cursor.fetchall():
            member = {
                "id": row["id"],
                "name": row["name"],
                "relationship": row["relationship"],
                "birthDate": row["birth_date"],
                "email": row["email"],
                "phone": row["phone"],
                "profileImage": row["profile_image"],
                "created_at": row["created_at"]
            }
            members.append(member)
        
        conn.close()
        return members
    except Exception as e:
        logger.error(f"Error getting family members: {e}")
        return []

def generate_smart_description(memory: Dict[str, Any]) -> str:
    """Generate AI-enhanced description for a memory"""
    try:
        description_parts = []
        
        # Add location context
        if memory.get("location"):
            description_parts.append(f"A memorable moment captured at {memory['location']}")
        
        # Add family context
        family_members = memory.get("familyMembers", [])
        if family_members:
            if len(family_members) == 1:
                description_parts.append(f"featuring {family_members[0]}")
            elif len(family_members) == 2:
                description_parts.append(f"featuring {family_members[0]} and {family_members[1]}")
            else:
                description_parts.append(f"featuring {family_members[0]} and {len(family_members) - 1} others")
        
        # Add date context
        if memory.get("date"):
            try:
                date_obj = datetime.fromisoformat(memory["date"])
                season = get_season(date_obj.month)
                description_parts.append(f"during {season} {date_obj.year}")
            except:
                pass
        
        # Add tag context
        tags = memory.get("tags", [])
        if tags:
            main_tags = tags[:2]  # Use first 2 tags
            description_parts.append(f"capturing {', '.join(main_tags)}")
        
        if description_parts:
            return ". ".join(description_parts) + "."
        else:
            return "A special family moment worth remembering."
            
    except Exception as e:
        logger.error(f"Error generating smart description: {e}")
        return "A meaningful family memory."

def get_season(month: int) -> str:
    """Get season name from month number"""
    if month in [12, 1, 2]:
        return "winter"
    elif month in [3, 4, 5]:
        return "spring"
    elif month in [6, 7, 8]:
        return "summer"
    else:
        return "autumn"

def find_related_memories(memory: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Find memories related to the given memory"""
    try:
        all_memories = get_all_memories()
        related = []
        
        for other_memory in all_memories:
            if other_memory["id"] == memory["id"]:
                continue
            
            similarity_score = 0
            
            # Location similarity
            if memory.get("location") and other_memory.get("location"):
                if memory["location"] == other_memory["location"]:
                    similarity_score += 3
            
            # Family member similarity
            memory_members = set(memory.get("familyMembers", []))
            other_members = set(other_memory.get("familyMembers", []))
            common_members = memory_members.intersection(other_members)
            similarity_score += len(common_members)
            
            # Tag similarity
            memory_tags = set(memory.get("tags", []))
            other_tags = set(other_memory.get("tags", []))
            common_tags = memory_tags.intersection(other_tags)
            similarity_score += len(common_tags)
            
            # Date proximity (within 30 days gets bonus)
            if memory.get("date") and other_memory.get("date"):
                try:
                    date1 = datetime.fromisoformat(memory["date"])
                    date2 = datetime.fromisoformat(other_memory["date"])
                    days_diff = abs((date1 - date2).days)
                    if days_diff <= 30:
                        similarity_score += 2
                    elif days_diff <= 90:
                        similarity_score += 1
                except:
                    pass
            
            if similarity_score >= 2:  # Minimum threshold
                other_memory["similarity_score"] = similarity_score
                related.append(other_memory)
        
        # Sort by similarity score
        related.sort(key=lambda x: x["similarity_score"], reverse=True)
        return related
        
    except Exception as e:
        logger.error(f"Error finding related memories: {e}")
        return []

def calculate_monthly_memory_average(memories: List[Dict[str, Any]]) -> float:
    """Calculate average memories per month"""
    try:
        if not memories:
            return 0.0
        
        # Get date range
        dates = [m.get("date") for m in memories if m.get("date")]
        if not dates:
            return 0.0
        
        dates_sorted = sorted(dates)
        start_date = datetime.fromisoformat(dates_sorted[0])
        end_date = datetime.fromisoformat(dates_sorted[-1])
        
        # Calculate months difference
        months_diff = ((end_date.year - start_date.year) * 12 + 
                      (end_date.month - start_date.month)) + 1
        
        return len(memories) / months_diff if months_diff > 0 else len(memories)
        
    except Exception as e:
        logger.error(f"Error calculating monthly average: {e}")
        return 0.0

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )