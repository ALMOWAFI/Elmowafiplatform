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
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from pathlib import Path

import uvicorn
from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import aiofiles
import requests

# Add the hack2 directory to the path to import AI services
sys.path.append('../hack2')

try:
    from math_analyzer.improved_error_localization import MathErrorDetector
    AI_AVAILABLE = True
except ImportError:
    print("Warning: AI modules not found. Running in demo mode.")
    AI_AVAILABLE = False

# Initialize FastAPI app
app = FastAPI(
    title="Elmowafiplatform API",
    description="Unified API for AI-powered family memory and travel platform",
    version="1.0.0"
)

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Vite and React dev servers
    allow_credentials=True,
    allow_methods=["*"],
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

# In-memory storage (replace with database in production)
family_members_db: Dict[str, FamilyMember] = {}
memories_db: Dict[str, Memory] = {}
travel_plans_db: Dict[str, TravelPlan] = {}

# Load sample data
def load_sample_data():
    """Load sample family data for testing"""
    # Sample family members
    family_members_db["1"] = FamilyMember(
        id="1",
        name="Ahmed Al-Mowafi",
        nameArabic="أحمد المعوافي",
        birthDate="1975-06-15",
        location="Dubai, UAE",
        relationships=[{"memberId": "2", "type": "spouse"}]
    )
    
    family_members_db["2"] = FamilyMember(
        id="2",
        name="Fatima Al-Mowafi",
        nameArabic="فاطمة المعوافي",
        birthDate="1978-03-22",
        location="Dubai, UAE",
        relationships=[{"memberId": "1", "type": "spouse"}]
    )
    
    # Sample memory
    memories_db["1"] = Memory(
        id="1",
        title="Family Trip to Istanbul",
        description="Amazing family vacation exploring Turkish culture",
        date="2024-01-15",
        location="Istanbul, Turkey",
        tags=["travel", "family", "culture"],
        familyMembers=["1", "2"]
    )

# Initialize sample data
load_sample_data()

# Helper Functions
async def save_uploaded_file(file: UploadFile, directory: Path) -> str:
    """Save uploaded file and return the filename"""
    file_extension = file.filename.split(".")[-1] if file.filename else "jpg"
    filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = directory / filename
    
    async with aiofiles.open(file_path, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    return filename

async def analyze_image_with_ai(image_path: str, analysis_type: str) -> Dict[str, Any]:
    """Call AI service to analyze image"""
    if not AI_AVAILABLE:
        return {
            "success": False,
            "analysis": {"text": "AI service not available in demo mode"},
            "error": "AI service not configured"
        }
    
    try:
        # Call the math detection service for educational content
        if analysis_type in ["math", "educational", "memory"]:
            with open(image_path, 'rb') as f:
                files = {'file': f}
                data = {'teaching_style': 'detailed', 'student_work': '', 'correct_solution': ''}
                
                response = requests.post(
                    f"{AI_SERVICE_URL}/detect",
                    files=files,
                    data=data,
                    timeout=30
                )
                
                if response.status_code == 200:
                    ai_result = response.json()
                    # Transform AI service response into our format
                    return {
                        "success": ai_result.get("success", True),
                        "analysis": {
                            "text": ai_result.get("expert_feedback", ""),
                            "errors_detected": ai_result.get("error_count", 0),
                            "errors": ai_result.get("errors", []),
                            "practice_suggestions": ai_result.get("practice_sheet", ""),
                            "marked_image_url": ai_result.get("marked_image", ""),
                            "type": "educational_content"
                        }
                    }
                else:
                    return {
                        "success": False,
                        "error": f"AI service error: {response.status_code}"
                    }
        else:
            # For other types, return basic analysis
            return {
                "success": True,
                "analysis": {
                    "text": f"Image analyzed as {analysis_type}",
                    "type": analysis_type,
                    "detected_objects": [],
                    "faces_count": 0
                }
            }
    except Exception as e:
        return {
            "success": False,
            "error": f"AI analysis failed: {str(e)}"
        }

# API Endpoints

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    ai_status = False
    try:
        response = requests.get(f"{AI_SERVICE_URL}/", timeout=5)
        ai_status = response.status_code == 200
    except:
        pass
    
    return {
        "status": "healthy",
        "services": {
            "api": True,
            "ai": ai_status
        },
        "timestamp": datetime.now().isoformat()
    }

# Family Member Endpoints
@app.get("/api/family/members", response_model=List[FamilyMember])
async def get_family_members():
    """Get all family members"""
    return list(family_members_db.values())

@app.post("/api/family/members", response_model=FamilyMember)
async def create_family_member(member: FamilyMember):
    """Create a new family member"""
    member.id = str(uuid.uuid4())
    family_members_db[member.id] = member
    return member

@app.put("/api/family/members/{member_id}", response_model=FamilyMember)
async def update_family_member(member_id: str, updates: Dict[str, Any]):
    """Update a family member"""
    if member_id not in family_members_db:
        raise HTTPException(status_code=404, detail="Family member not found")
    
    member = family_members_db[member_id]
    for key, value in updates.items():
        if hasattr(member, key):
            setattr(member, key, value)
    
    return member

# Memory Endpoints
@app.get("/api/memories", response_model=List[Memory])
async def get_memories(
    familyMemberId: Optional[str] = None,
    startDate: Optional[str] = None,
    endDate: Optional[str] = None,
    tags: Optional[List[str]] = None
):
    """Get memories with optional filters"""
    memories = list(memories_db.values())
    
    if familyMemberId:
        memories = [m for m in memories if familyMemberId in m.familyMembers]
    
    if startDate and endDate:
        memories = [m for m in memories if startDate <= m.date <= endDate]
    
    if tags:
        memories = [m for m in memories if any(tag in m.tags for tag in tags)]
    
    return memories

@app.post("/api/memories/upload", response_model=Memory)
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
    memory_id = str(uuid.uuid4())
    image_url = None
    
    if image:
        filename = await save_uploaded_file(image, MEMORY_DIR)
        image_url = f"/memories/{filename}"
        
        # Schedule AI analysis in background
        background_tasks.add_task(
            process_memory_ai_analysis,
            memory_id,
            MEMORY_DIR / filename,
            json.loads(familyMembers)
        )
    
    memory = Memory(
        id=memory_id,
        title=title,
        description=description,
        date=date,
        location=location,
        imageUrl=image_url,
        tags=json.loads(tags),
        familyMembers=json.loads(familyMembers)
    )
    
    memories_db[memory_id] = memory
    return memory

async def process_memory_ai_analysis(memory_id: str, image_path: Path, family_context: List[str]):
    """Background task to process memory with AI"""
    try:
        analysis = await analyze_image_with_ai(str(image_path), "memory")
        
        if memory_id in memories_db:
            memories_db[memory_id].aiAnalysis = analysis.get("analysis", {})
    except Exception as e:
        print(f"AI analysis failed for memory {memory_id}: {e}")

@app.post("/api/memories/{memory_id}/analyze")
async def analyze_memory(memory_id: str):
    """Trigger AI analysis for a specific memory"""
    if memory_id not in memories_db:
        raise HTTPException(status_code=404, detail="Memory not found")
    
    memory = memories_db[memory_id]
    if not memory.imageUrl:
        raise HTTPException(status_code=400, detail="Memory has no image to analyze")
    
    # Extract filename from URL and construct path
    filename = memory.imageUrl.split("/")[-1]
    image_path = MEMORY_DIR / filename
    
    analysis = await analyze_image_with_ai(str(image_path), "memory")
    memory.aiAnalysis = analysis.get("analysis", {})
    
    return analysis

# Travel Planning Endpoints
@app.get("/api/travel/plans", response_model=List[TravelPlan])
async def get_travel_plans(familyMemberId: Optional[str] = None):
    """Get travel plans"""
    plans = list(travel_plans_db.values())
    
    if familyMemberId:
        plans = [p for p in plans if familyMemberId in p.participants]
    
    return plans

@app.post("/api/travel/plans", response_model=TravelPlan)
async def create_travel_plan(plan: TravelPlan):
    """Create a new travel plan"""
    plan.id = str(uuid.uuid4())
    travel_plans_db[plan.id] = plan
    return plan

@app.post("/api/travel/recommendations")
async def get_travel_recommendations(request: Dict[str, Any]):
    """Get AI-powered travel recommendations"""
    destination = request.get("destination", "")
    family_preferences = request.get("familyPreferences", {})
    
    # Simple mock recommendations (replace with AI service call)
    recommendations = [
        f"Visit the historic districts of {destination}",
        f"Try local family-friendly restaurants in {destination}",
        f"Explore cultural sites suitable for all ages"
    ]
    
    return {
        "recommendations": recommendations,
        "estimatedBudget": 2000,  # Mock budget
        "suggestedActivities": [
            {
                "id": str(uuid.uuid4()),
                "name": f"City Tour of {destination}",
                "location": destination,
                "date": datetime.now().isoformat(),
                "cost": 150,
                "description": "Guided family tour"
            }
        ]
    }

# Smart Memory Features
@app.get("/api/memories/suggestions")
async def get_memory_suggestions(date: Optional[str] = None):
    """Get smart memory suggestions"""
    target_date = date or datetime.now().strftime("%Y-%m-%d")
    
    # Mock suggestions (implement AI logic)
    on_this_day = []
    similar = list(memories_db.values())[:3]  # Mock similar memories
    
    recommendations = [
        "Share this memory with family members",
        "Create a photo album for this trip",
        "Plan a return visit to this location"
    ]
    
    return {
        "onThisDay": on_this_day,
        "similar": similar,
        "recommendations": recommendations
    }

@app.post("/api/memories/search", response_model=List[Memory])
async def search_memories(request: Dict[str, Any]):
    """Search memories with AI assistance"""
    query = request.get("query", "")
    filters = request.get("filters", {})
    
    # Simple text search (enhance with AI)
    memories = list(memories_db.values())
    
    if query:
        memories = [
            m for m in memories 
            if query.lower() in m.title.lower() 
            or (m.description and query.lower() in m.description.lower())
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

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    ) 