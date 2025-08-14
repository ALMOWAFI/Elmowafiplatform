#!/usr/bin/env python3
"""
Elmowafiplatform Enhanced API Server with Supabase Integration
Unified family platform with real-time collaboration, AI services, and comprehensive database
"""

import os
import json
import uuid
import logging
import asyncio
import subprocess
from datetime import datetime
from typing import List, Optional, Dict, Any
from pathlib import Path

import uvicorn
from fastapi import FastAPI, File, UploadFile, HTTPException, Form, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import aiohttp
import aiofiles

from supabase_client import get_supabase_client, init_supabase, ElmowafiSupabaseClient

# Railway deployment configuration
PORT = int(os.environ.get("PORT", 8001))
HOST = "0.0.0.0"
AI_SERVICE_PORT = int(os.environ.get("AI_SERVICE_PORT", 5000))

# Initialize logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Elmowafiplatform API v2.0",
    description="AI-powered family memory and travel platform with real-time collaboration",
    version="2.0.0"
)

# Enable CORS for React frontend
ALLOWED_ORIGINS = os.environ.get('CORS_ORIGINS', '').split(',') or [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://elmowafy-travels-oasis-production.vercel.app"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS + ["*"],  # Allow all for development
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

# ================================================
# PYDANTIC MODELS
# ================================================

class FamilyGroupCreate(BaseModel):
    name: str
    description: Optional[str] = None
    cultural_background: Optional[str] = None

class FamilyMemberCreate(BaseModel):
    family_group_id: str
    name: str
    name_arabic: Optional[str] = None
    role: str = "member"

class MemoryCreate(BaseModel):
    family_group_id: str
    title: str
    description: Optional[str] = None
    collection_id: Optional[str] = None
    tags: List[str] = []

class TravelPlanCreate(BaseModel):
    family_group_id: str
    name: str
    destination: str
    start_date: str
    end_date: str
    description: Optional[str] = None

class GameSessionCreate(BaseModel):
    family_group_id: str
    name: str
    game_type: str
    max_players: int = 10

class ChatMessage(BaseModel):
    family_group_id: str
    content: str
    message_type: str = "text"

# ================================================
# AI SERVICE INTEGRATION
# ================================================

class AIServiceProxy:
    def __init__(self):
        self.session = None
        
    async def _get_session(self):
        if self.session is None:
            self.session = aiohttp.ClientSession()
        return self.session
        
    async def close(self):
        if self.session:
            await self.session.close()
            
ai_proxy = AIServiceProxy()

async def start_ai_service():
    """Start AI service in background"""
    ai_service_dir = Path(__file__).parent / "ai-services"
    if ai_service_dir.exists() and (ai_service_dir / "app.py").exists():
        logger.info(f"🤖 Starting AI service on port {AI_SERVICE_PORT}...")
        ai_env = os.environ.copy()
        ai_env['PORT'] = str(AI_SERVICE_PORT)
        ai_env['FLASK_ENV'] = 'production'
        
        subprocess.Popen([
            "python", str(ai_service_dir / "app.py")
        ], env=ai_env, cwd=str(ai_service_dir))
        
        logger.info(f"✅ AI service started on port {AI_SERVICE_PORT}")
    else:
        logger.warning("⚠️ AI service not found, continuing without AI features")

# ================================================
# STARTUP AND SHUTDOWN
# ================================================

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    logger.info("🚀 Starting Elmowafiplatform v2.0...")
    
    # Initialize Supabase
    supabase_init = await init_supabase()
    if supabase_init:
        logger.info("✅ Supabase database connected")
    else:
        logger.warning("⚠️ Supabase initialization failed")
    
    # Start AI service
    await start_ai_service()
    
    logger.info("🎉 Elmowafiplatform v2.0 ready!")

@app.on_event("shutdown")
async def shutdown_event():
    await ai_proxy.close()
    client = await get_supabase_client()
    await client.close()

# ================================================
# HEALTH ENDPOINTS
# ================================================

@app.get("/api/v1/health")
@app.get("/api/health")
async def health_check():
    """Comprehensive health check"""
    client = await get_supabase_client()
    
    # Test Supabase connection
    try:
        supabase_health = await client.health_check() if hasattr(client, 'health_check') else {"status": "unknown"}
    except:
        supabase_health = {"status": "error"}
    
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "2.0.0",
        "environment": os.environ.get("ENVIRONMENT", "development"),
        "services": {
            "api": True,
            "database": supabase_health.get("status") == "healthy",
            "ai_services": True,
            "supabase": supabase_health.get("status") == "healthy"
        },
        "database_info": {
            "type": "Supabase PostgreSQL",
            "status": supabase_health.get("status", "unknown")
        }
    }

@app.get("/api/v1/ai/health")
async def ai_health_check():
    """Check AI service health"""
    try:
        session = await ai_proxy._get_session()
        async with session.get(f"http://localhost:{AI_SERVICE_PORT}/api/health") as response:
            if response.status == 200:
                ai_health = await response.json()
                return {"status": "connected", "ai_service": ai_health}
            else:
                return {"status": "disconnected", "message": "AI service not responding"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# ================================================
# FAMILY MANAGEMENT ENDPOINTS
# ================================================

@app.post("/api/v1/family/groups")
async def create_family_group(group: FamilyGroupCreate):
    """Create a new family group"""
    client = await get_supabase_client()
    result = await client.create_family_group(
        name=group.name,
        description=group.description,
        cultural_background=group.cultural_background
    )
    
    if result['success']:
        return {"message": "Family group created", "group": result['data']}
    else:
        raise HTTPException(status_code=400, detail=result['error'])

@app.get("/api/v1/family/groups")
async def get_family_groups(user_id: str):
    """Get family groups for a user"""
    client = await get_supabase_client()
    groups = await client.get_family_groups_for_user(user_id)
    return {"groups": groups}

@app.post("/api/v1/family/members")
async def add_family_member(member: FamilyMemberCreate, user_id: str):
    """Add a member to a family group"""
    client = await get_supabase_client()
    result = await client.add_family_member(
        family_group_id=member.family_group_id,
        user_id=user_id,
        name=member.name,
        name_arabic=member.name_arabic,
        role=member.role
    )
    
    if result['success']:
        return {"message": "Family member added", "member": result['data']}
    else:
        raise HTTPException(status_code=400, detail=result['error'])

# ================================================
# MEMORY MANAGEMENT ENDPOINTS
# ================================================

@app.post("/api/v1/memories/upload")
@app.post("/api/v1/upload")
async def upload_memory_with_ai(
    file: UploadFile = File(...),
    title: str = Form(...),
    family_group_id: str = Form(...),
    description: Optional[str] = Form(None),
    collection_id: Optional[str] = Form(None),
    tags: str = Form("[]"),
    created_by: Optional[str] = Form(None)
):
    """Upload memory with AI analysis and save to Supabase"""
    try:
        # Save file locally first
        file_id = str(uuid.uuid4())
        file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
        local_file_path = UPLOAD_DIR / f"{file_id}.{file_extension}"
        
        async with aiofiles.open(local_file_path, 'wb') as f:
            content = await file.read()
            await f.write(content)
        
        # Get AI analysis
        ai_analysis = None
        try:
            session = await ai_proxy._get_session()
            data = aiohttp.FormData()
            data.add_field('file', content, filename=file.filename, content_type=file.content_type)
            
            async with session.post(f"http://localhost:{AI_SERVICE_PORT}/api/memory/upload-photo", data=data) as response:
                if response.status == 200:
                    ai_analysis = await response.json()
        except Exception as e:
            logger.warning(f"AI analysis failed: {e}")
        
        # TODO: Upload to Supabase Storage
        file_url = f"/uploads/{file_id}.{file_extension}"
        
        # Save memory to Supabase
        client = await get_supabase_client()
        memory_tags = json.loads(tags) if tags else []
        
        result = await client.upload_memory(
            family_group_id=family_group_id,
            title=title,
            file_url=file_url,
            ai_analysis=ai_analysis,
            created_by=created_by,
            collection_id=collection_id,
            tags=memory_tags
        )
        
        if result['success']:
            return {
                "status": "success",
                "message": "Memory uploaded with AI analysis",
                "data": {
                    "memory": result['data'],
                    "ai_analysis": ai_analysis,
                    "file_url": file_url
                }
            }
        else:
            raise HTTPException(status_code=500, detail=result['error'])
            
    except Exception as e:
        logger.error(f"Error uploading memory: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/memories")
async def get_family_memories(family_group_id: str, limit: int = 50):
    """Get memories for a family group"""
    client = await get_supabase_client()
    memories = await client.get_family_memories(family_group_id, limit)
    return {"memories": memories}

@app.post("/api/v1/memories/{memory_id}/react")
async def add_memory_reaction(memory_id: str, family_member_id: str, reaction_type: str = "like"):
    """Add reaction to a memory"""
    client = await get_supabase_client()
    result = await client.add_memory_reaction(memory_id, family_member_id, reaction_type)
    
    if result['success']:
        return {"message": "Reaction added", "reaction": result['data']}
    else:
        raise HTTPException(status_code=400, detail=result['error'])

# ================================================
# TRAVEL PLANNING ENDPOINTS
# ================================================

@app.post("/api/v1/travel/plans")
async def create_travel_plan(plan: TravelPlanCreate, created_by: str):
    """Create a new travel plan"""
    client = await get_supabase_client()
    result = await client.create_travel_plan(
        family_group_id=plan.family_group_id,
        name=plan.name,
        destination=plan.destination,
        start_date=plan.start_date,
        end_date=plan.end_date,
        created_by=created_by
    )
    
    if result['success']:
        return {"message": "Travel plan created", "plan": result['data']}
    else:
        raise HTTPException(status_code=400, detail=result['error'])

@app.get("/api/v1/travel/plans")
async def get_family_travel_plans(family_group_id: str):
    """Get travel plans for a family"""
    client = await get_supabase_client()
    plans = await client.get_family_travel_plans(family_group_id)
    return {"plans": plans}

# ================================================
# GAMING SYSTEM ENDPOINTS
# ================================================

@app.post("/api/v1/games/sessions")
async def create_game_session(session: GameSessionCreate, created_by: str):
    """Create a new game session"""
    client = await get_supabase_client()
    result = await client.create_game_session(
        family_group_id=session.family_group_id,
        name=session.name,
        game_type=session.game_type,
        created_by=created_by,
        max_players=session.max_players
    )
    
    if result['success']:
        return {"message": "Game session created", "session": result['data']}
    else:
        raise HTTPException(status_code=400, detail=result['error'])

@app.post("/api/v1/games/sessions/{session_id}/join")
async def join_game_session(session_id: str, family_member_id: str):
    """Join a game session"""
    client = await get_supabase_client()
    result = await client.join_game_session(session_id, family_member_id)
    
    if result['success']:
        return {"message": "Joined game session", "player": result['data']}
    else:
        raise HTTPException(status_code=400, detail=result['error'])

# ================================================
# AI INTEGRATION ENDPOINTS
# ================================================

@app.get("/api/v1/ai/suggestions")
async def get_ai_suggestions(family_group_id: str):
    """Get AI suggestions for a family"""
    client = await get_supabase_client()
    suggestions = await client.get_ai_suggestions(family_group_id)
    return {"suggestions": suggestions}

@app.post("/api/v1/ai/analyze")
async def analyze_image_direct(file: UploadFile = File(...)):
    """Direct image analysis endpoint"""
    try:
        content = await file.read()
        session = await ai_proxy._get_session()
        data = aiohttp.FormData()
        data.add_field('file', content, filename=file.filename, content_type=file.content_type)
        
        async with session.post(f"http://localhost:{AI_SERVICE_PORT}/api/memory/upload-photo", data=data) as response:
            if response.status == 200:
                result = await response.json()
                return {"status": "success", "analysis": result}
            else:
                return {"status": "error", "message": "AI analysis failed"}
                
    except Exception as e:
        logger.error(f"Error in AI analysis: {e}")
        return {"status": "error", "message": str(e)}

# ================================================
# REAL-TIME WEBSOCKET ENDPOINTS
# ================================================

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, family_group_id: str):
        await websocket.accept()
        if family_group_id not in self.active_connections:
            self.active_connections[family_group_id] = []
        self.active_connections[family_group_id].append(websocket)

    def disconnect(self, websocket: WebSocket, family_group_id: str):
        if family_group_id in self.active_connections:
            self.active_connections[family_group_id].remove(websocket)

    async def broadcast_to_family(self, family_group_id: str, message: dict):
        if family_group_id in self.active_connections:
            for connection in self.active_connections[family_group_id]:
                try:
                    await connection.send_text(json.dumps(message))
                except:
                    # Remove dead connections
                    self.active_connections[family_group_id].remove(connection)

manager = ConnectionManager()

@app.websocket("/ws/family/{family_group_id}")
async def websocket_family_endpoint(websocket: WebSocket, family_group_id: str):
    """Real-time family communication"""
    await manager.connect(websocket, family_group_id)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Broadcast to all family members
            await manager.broadcast_to_family(family_group_id, {
                "type": message.get("type", "chat"),
                "data": message,
                "timestamp": datetime.now().isoformat()
            })
    except WebSocketDisconnect:
        manager.disconnect(websocket, family_group_id)

# ================================================
# LEGACY ENDPOINTS (for compatibility)
# ================================================

@app.get("/api/sample-data")
async def get_sample_data():
    """Sample data for testing"""
    return {
        "message": "Elmowafiplatform v2.0 with Supabase integration",
        "features": [
            "Multi-family support",
            "Real-time collaboration",
            "AI-powered memory analysis",
            "Travel planning with family",
            "Gaming system with AI referee",
            "Cultural heritage preservation"
        ],
        "database": "Supabase PostgreSQL",
        "ai_services": "Integrated Flask AI service"
    }

if __name__ == "__main__":
    uvicorn.run(app, host=HOST, port=PORT)