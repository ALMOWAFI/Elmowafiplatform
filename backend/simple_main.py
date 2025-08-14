#!/usr/bin/env python3
"""
Simplified API Server for Elmowafiplatform
Core functionality without complex dependencies
"""

import os
import json
import uuid
import logging
from datetime import datetime
from typing import List, Optional, Dict, Any
from pathlib import Path

import uvicorn
from fastapi import FastAPI, File, UploadFile, HTTPException, Form, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import aiohttp
import aiofiles

# Railway deployment configuration
PORT = int(os.environ.get("PORT", 8001))
HOST = "0.0.0.0"

# Initialize logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(title="Elmowafiplatform API", version="1.0.0")

# Enable CORS for React frontend (including production URLs)
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174", 
    "http://localhost:5175",
    "http://localhost:5176",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    # Railway/Vercel frontend URLs will be added
    "https://*.railway.app",
    "https://*.vercel.app",
    "https://*.netlify.app"
]

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex="https://.*\\.(railway|vercel|netlify)\\.app|http://localhost:.*",
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

# In-memory data storage (for testing)
family_members = []
memories = []
travel_plans = []

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
    familyMembers: List[str] = []
    aiAnalysis: Optional[Dict[str, Any]] = None

class TravelPlan(BaseModel):
    id: Optional[str] = None
    name: str
    destination: str
    startDate: str
    endDate: str
    budget: Optional[float] = None
    participants: List[str] = []
    activities: List[Dict[str, Any]] = []

# Health endpoints
@app.get("/api/health")
@app.get("/api/v1/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "3.0.0",
        "environment": "development",
        "services": {
            "api": True,
            "database": True,
            "ai_services": True
        }
    }

# Family Members endpoints
@app.get("/api/family/members")
async def get_family_members():
    return {"members": family_members}

@app.post("/api/family/members")
async def create_family_member(member: FamilyMember):
    member.id = str(uuid.uuid4())
    family_members.append(member.dict())
    return {"message": "Family member created", "member": member.dict()}

# Memories endpoints
@app.get("/api/memories")
async def get_memories(
    familyMemberId: Optional[str] = None,
    startDate: Optional[str] = None,
    endDate: Optional[str] = None,
    tags: Optional[List[str]] = None
):
    filtered_memories = memories
    
    if familyMemberId:
        filtered_memories = [m for m in filtered_memories if familyMemberId in m.get("familyMembers", [])]
    
    return {"memories": filtered_memories}

@app.post("/api/memories/upload")
async def upload_memory(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    date: str = Form(...),
    location: Optional[str] = Form(None),
    tags: str = Form("[]"),
    familyMembers: str = Form("[]"),
    image: Optional[UploadFile] = File(None)
):
    memory = {
        "id": str(uuid.uuid4()),
        "title": title,
        "description": description,
        "date": date,
        "location": location,
        "tags": json.loads(tags),
        "familyMembers": json.loads(familyMembers),
        "imageUrl": None
    }
    
    if image:
        # Save image
        image_path = UPLOAD_DIR / f"{memory['id']}_{image.filename}"
        with open(image_path, "wb") as f:
            content = await image.read()
            f.write(content)
        memory["imageUrl"] = f"/uploads/{memory['id']}_{image.filename}"
    
    memories.append(memory)
    return {"message": "Memory created", "memory": memory}

# Travel endpoints
@app.get("/api/travel/plans")
async def get_travel_plans(familyMemberId: Optional[str] = None):
    filtered_plans = travel_plans
    
    if familyMemberId:
        filtered_plans = [p for p in filtered_plans if familyMemberId in p.get("participants", [])]
    
    return {"plans": filtered_plans}

@app.post("/api/travel/plans")
async def create_travel_plan(plan: TravelPlan):
    plan.id = str(uuid.uuid4())
    travel_plans.append(plan.dict())
    return {"message": "Travel plan created", "plan": plan.dict()}

# AI endpoints (simplified)
@app.post("/api/analyze")
async def analyze_image(
    image: UploadFile = File(...),
    analysisType: str = Form("general"),
    familyContext: str = Form("[]")
):
    # Save image
    image_id = str(uuid.uuid4())
    image_path = UPLOAD_DIR / f"{image_id}_{image.filename}"
    with open(image_path, "wb") as f:
        content = await image.read()
        f.write(content)
    
    # Simple analysis response
    analysis = {
        "imageUrl": f"/uploads/{image_id}_{image.filename}",
        "analysis": {
            "type": analysisType,
            "description": f"Analysis of {image.filename}",
            "tags": ["family", "memory"],
            "confidence": 0.85
        }
    }
    
    return analysis

# WebSocket endpoint (simplified)
@app.websocket("/ws/{user_id}")
async def websocket_connection(websocket: WebSocket, user_id: str):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Echo back with timestamp
            response = {
                "message": message.get("message", ""),
                "timestamp": datetime.now().isoformat(),
                "user_id": user_id
            }
            
            await websocket.send_text(json.dumps(response))
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for user {user_id}")

# Sample data endpoint
@app.get("/api/sample-data")
async def get_sample_data():
    return {
        "family_members": [
            {
                "id": "1",
                "name": "Ahmed",
                "nameArabic": "أحمد",
                "birthDate": "1990-01-01",
                "location": "Riyadh",
                "avatar": None,
                "relationships": []
            },
            {
                "id": "2", 
                "name": "Fatima",
                "nameArabic": "فاطمة",
                "birthDate": "1992-05-15",
                "location": "Jeddah",
                "avatar": None,
                "relationships": []
            }
        ],
        "memories": [
            {
                "id": "1",
                "title": "Family Trip to Makkah",
                "description": "Amazing spiritual journey with the family",
                "date": "2024-01-15",
                "location": "Makkah",
                "tags": ["travel", "spiritual", "family"],
                "familyMembers": ["1", "2"],
                "imageUrl": None
            }
        ]
    }

# Include budget endpoints directly in main app
envelopes_db = [
    {"id": 1, "name": "Groceries", "amount": 800, "spent": 650, "category": "Essentials", "userId": "demo-user-1", "createdAt": datetime.now(), "updatedAt": datetime.now()},
    {"id": 2, "name": "Entertainment", "amount": 400, "spent": 320, "category": "Lifestyle", "userId": "demo-user-1", "createdAt": datetime.now(), "updatedAt": datetime.now()},
    {"id": 3, "name": "Transportation", "amount": 500, "spent": 380, "category": "Essentials", "userId": "demo-user-1", "createdAt": datetime.now(), "updatedAt": datetime.now()},
    {"id": 4, "name": "Dining Out", "amount": 600, "spent": 520, "category": "Lifestyle", "userId": "demo-user-1", "createdAt": datetime.now(), "updatedAt": datetime.now()},
    {"id": 5, "name": "Utilities", "amount": 350, "spent": 330, "category": "Housing", "userId": "demo-user-1", "createdAt": datetime.now(), "updatedAt": datetime.now()},
    {"id": 6, "name": "Savings", "amount": 1000, "spent": 0, "category": "Financial", "userId": "demo-user-1", "createdAt": datetime.now(), "updatedAt": datetime.now()},
]

transactions_db = [
    {"id": 1, "amount": 150, "description": "Weekly groceries", "date": datetime.now(), "type": "EXPENSE", "envelopeId": 1, "userId": "demo-user-1", "createdAt": datetime.now(), "updatedAt": datetime.now()},
    {"id": 2, "amount": 80, "description": "Movie tickets", "date": datetime.now(), "type": "EXPENSE", "envelopeId": 2, "userId": "demo-user-1", "createdAt": datetime.now(), "updatedAt": datetime.now()},
    {"id": 3, "amount": 5000, "description": "Monthly salary", "date": datetime.now(), "type": "INCOME", "envelopeId": None, "userId": "demo-user-1", "createdAt": datetime.now(), "updatedAt": datetime.now()},
]

# Budget endpoints
@app.get("/api/v1/budget/envelopes")
async def get_envelopes():
    return {"status": "success", "data": envelopes_db}

@app.get("/api/v1/budget/transactions")
async def get_transactions():
    return {"status": "success", "data": transactions_db}

@app.get("/api/v1/budget/profiles")
async def get_budget_profiles():
    profiles_db = [{"id": 1, "name": "Family Budget", "userId": "demo-user-1", "createdAt": datetime.now(), "updatedAt": datetime.now()}]
    return {"status": "success", "data": profiles_db}

logger.info("Budget endpoints added directly to main app")
logger.info(f"Loaded {len(envelopes_db)} envelopes and {len(transactions_db)} transactions")

# AI Service Integration
AI_SERVICE_URL = "http://localhost:5000"

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

# AI endpoints
@app.post("/api/v1/upload")
async def upload_photo(file: UploadFile = File(...), memory_id: Optional[str] = Form(None)):
    """Upload photo with AI analysis"""
    try:
        # Save file locally
        file_path = UPLOAD_DIR / f"{str(uuid.uuid4())}_{file.filename}"
        async with aiofiles.open(file_path, 'wb') as f:
            content = await file.read()
            await f.write(content)
        
        # Call AI service for analysis
        session = await ai_proxy._get_session()
        data = aiohttp.FormData()
        data.add_field('file', content, filename=file.filename, content_type=file.content_type)
        
        async with session.post(f"{AI_SERVICE_URL}/api/memory/upload-photo", data=data) as response:
            if response.status == 200:
                ai_result = await response.json()
                result = {
                    "id": str(uuid.uuid4()),
                    "filename": file.filename,
                    "file_path": str(file_path),
                    "ai_analysis": ai_result,
                    "upload_time": datetime.now().isoformat()
                }
                logger.info(f"Photo uploaded and analyzed: {file.filename}")
                return {"status": "success", "data": result}
            else:
                # Fallback if AI service unavailable
                result = {
                    "id": str(uuid.uuid4()),
                    "filename": file.filename,
                    "file_path": str(file_path),
                    "ai_analysis": {"status": "AI service unavailable", "message": "Photo saved, analysis pending"},
                    "upload_time": datetime.now().isoformat()
                }
                return {"status": "success", "data": result}
                
    except Exception as e:
        logger.error(f"Error uploading photo: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/api/v1/ai/health")
async def ai_health_check():
    """Check AI service health"""
    try:
        session = await ai_proxy._get_session()
        async with session.get(f"{AI_SERVICE_URL}/api/health") as response:
            if response.status == 200:
                ai_health = await response.json()
                return {"status": "connected", "ai_service": ai_health}
            else:
                return {"status": "disconnected", "message": "AI service not responding"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/v1/ai/analyze")
async def analyze_image(file: UploadFile = File(...)):
    """Direct image analysis endpoint"""
    try:
        content = await file.read()
        session = await ai_proxy._get_session()
        data = aiohttp.FormData()
        data.add_field('file', content, filename=file.filename, content_type=file.content_type)
        
        async with session.post(f"{AI_SERVICE_URL}/api/memory/upload-photo", data=data) as response:
            if response.status == 200:
                result = await response.json()
                return {"status": "success", "analysis": result}
            else:
                return {"status": "error", "message": "AI analysis failed"}
                
    except Exception as e:
        logger.error(f"Error in AI analysis: {e}")
        return {"status": "error", "message": str(e)}

logger.info("AI integration endpoints added")
logger.info(f"AI service configured at: {AI_SERVICE_URL}")

@app.on_event("shutdown")
async def shutdown_event():
    await ai_proxy.close()

async def start_ai_service():
    """Start AI service in background"""
    import subprocess
    import os
    from pathlib import Path
    
    ai_service_dir = Path(__file__).parent / "ai-services"
    if ai_service_dir.exists() and (ai_service_dir / "app.py").exists():
        logger.info("Starting AI service in background...")
        ai_env = os.environ.copy()
        ai_env['PORT'] = '5000'
        ai_env['FLASK_ENV'] = 'production'
        
        subprocess.Popen([
            "python", str(ai_service_dir / "app.py")
        ], env=ai_env, cwd=str(ai_service_dir))
        
        logger.info("AI service started on port 5000")
    else:
        logger.warning("AI service not found, continuing without AI features")

if __name__ == "__main__":
    import asyncio
    
    # Start AI service in background
    asyncio.run(start_ai_service())
    
    # Start main server
    uvicorn.run(app, host=HOST, port=PORT)
