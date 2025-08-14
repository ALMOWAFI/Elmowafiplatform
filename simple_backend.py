#!/usr/bin/env python3
"""
Simplified Backend Server for API Testing
Only includes essential components for API integration
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

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import uvicorn
from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks, Form, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# Initialize logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import our essential modules
try:
    from backend.data_manager import DataManager
    from backend.ai_integration import ai_integration
    DATA_MANAGER_AVAILABLE = True
    logger.info("DataManager and AI integration loaded successfully")
except ImportError as e:
    logger.error(f"Failed to import essential modules: {e}")
    DATA_MANAGER_AVAILABLE = False

# Initialize data manager
data_manager = DataManager() if DATA_MANAGER_AVAILABLE else None

# Initialize FastAPI app
app = FastAPI(
    title="Elmowafiplatform API", 
    version="1.0.0",
    description="Family Memory & Travel AI Platform API"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

# === HEALTH ENDPOINTS ===

@app.get("/")
async def root():
    return {
        "service": "Elmowafiplatform API",
        "version": "1.0.0",
        "status": "running",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }

@app.get("/api/v1/health")
async def health_check_v1():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0",
        "api_version": "v1",
        "services": {
            "data_manager": DATA_MANAGER_AVAILABLE,
            "ai_integration": DATA_MANAGER_AVAILABLE
        }
    }

# === SYSTEM INFO ===

@app.get("/api/v1/system/info")
async def get_system_info():
    return {
        "platform": "Elmowafiplatform Family Memory & Travel AI",
        "version": "1.0.0",
        "capabilities": {
            "ai_photo_analysis": True,
            "family_recognition": False,  # Simplified for testing
            "photo_clustering": False,    # Simplified for testing
            "travel_recommendations": True,
            "memory_suggestions": True,
            "chat_assistant": True
        },
        "supportedFormats": {
            "images": ["jpg", "jpeg", "png"],
            "documents": ["pdf", "txt"]
        },
        "limits": {
            "max_file_size": "10MB",
            "max_family_members": 50,
            "max_memories_per_request": 100
        },
        "api_version": "v1"
    }

# === FAMILY ENDPOINTS ===

@app.get("/api/v1/family/members")
async def get_family_members():
    try:
        if not data_manager:
            return {"members": [], "api_version": "v1"}
        
        members = data_manager.get_family_members()
        return {
            "members": members,
            "api_version": "v1"
        }
    except Exception as e:
        logger.error(f"Error getting family members: {e}")
        raise HTTPException(status_code=500, detail="Failed to get family members")

@app.post("/api/v1/family/members")
async def create_family_member(member: Dict[str, Any]):
    try:
        if not data_manager:
            member_id = str(uuid.uuid4())
            return {"success": True, "member_id": member_id, "api_version": "v1"}
        
        member_id = await data_manager.create_family_member(member)
        return {
            "success": True,
            "member_id": member_id,
            "api_version": "v1"
        }
    except Exception as e:
        logger.error(f"Error creating family member: {e}")
        raise HTTPException(status_code=500, detail="Failed to create family member")

# === MEMORY ENDPOINTS ===

@app.get("/api/v1/memories")
async def get_memories(
    familyMemberId: Optional[str] = None,
    startDate: Optional[str] = None,
    endDate: Optional[str] = None,
    tags: Optional[List[str]] = None
):
    try:
        if not data_manager:
            return {"memories": [], "api_version": "v1"}
        
        memories = await data_manager.get_memories(
            family_member_id=familyMemberId,
            start_date=startDate,
            end_date=endDate,
            tags=tags
        )
        return {
            "memories": memories,
            "api_version": "v1"
        }
    except Exception as e:
        logger.error(f"Error getting memories: {e}")
        raise HTTPException(status_code=500, detail="Failed to get memories")

@app.get("/api/v1/memories/suggestions")
async def get_memory_suggestions(date: Optional[str] = None, family_member: Optional[str] = None):
    try:
        if not data_manager:
            return {
                "success": True,
                "date": date or datetime.now().isoformat()[:10],
                "family_member": family_member,
                "suggestions": {
                    "on_this_day": [],
                    "similar_memories": [],
                    "family_connections": [],
                    "contextual_suggestions": ["Start by uploading some family photos!"]
                },
                "ai_powered": True,
                "generated_at": datetime.now().isoformat(),
                "api_version": "v1"
            }
        
        suggestions = await data_manager.get_memory_suggestions(date=date, family_member=family_member)
        return {
            "success": True,
            "date": date or datetime.now().isoformat()[:10],
            "family_member": family_member,
            "suggestions": suggestions,
            "ai_powered": True,
            "generated_at": datetime.now().isoformat(),
            "api_version": "v1"
        }
    except Exception as e:
        logger.error(f"Error getting memory suggestions: {e}")
        raise HTTPException(status_code=500, detail="Failed to get memory suggestions")

# === TRAVEL ENDPOINTS ===

@app.get("/api/v1/travel/recommendations")
async def get_travel_recommendations(
    budget: Optional[str] = None,
    duration: Optional[str] = None,
    interests: Optional[List[str]] = None
):
    try:
        if not data_manager:
            return {
                "recommendations": [
                    {
                        "destination": "Dubai, UAE",
                        "reason": "Perfect for family activities with modern attractions",
                        "activities": ["Burj Khalifa", "Dubai Mall", "Desert Safari"],
                        "estimated_budget": budget or "$2000-3000",
                        "family_friendly": True
                    }
                ],
                "reasoning": "AI-powered family recommendations",
                "confidence": 0.8,
                "ai_powered": True,
                "family_context": {"visited_locations": 0},
                "api_version": "v1"
            }
        
        recommendations = await data_manager.get_travel_recommendations(
            budget=budget,
            duration=duration,
            interests=interests or []
        )
        return {
            "recommendations": recommendations.get("suggestions", []),
            "reasoning": recommendations.get("reasoning", "AI-powered recommendations"),
            "confidence": recommendations.get("confidence", 0.8),
            "ai_powered": True,
            "family_context": recommendations.get("family_context", {}),
            "api_version": "v1"
        }
    except Exception as e:
        logger.error(f"Error getting travel recommendations: {e}")
        raise HTTPException(status_code=500, detail="Failed to get travel recommendations")

@app.get("/api/v1/travel/plans")
async def get_travel_plans(familyMemberId: Optional[str] = None):
    try:
        if not data_manager:
            return {"plans": [], "api_version": "v1"}
        
        plans = await data_manager.get_travel_plans(family_member_id=familyMemberId)
        return {
            "plans": plans,
            "api_version": "v1"
        }
    except Exception as e:
        logger.error(f"Error getting travel plans: {e}")
        raise HTTPException(status_code=500, detail="Failed to get travel plans")

# === AI CHAT ===

@app.post("/api/v1/chat/message")
async def chat_message(message_data: Dict[str, Any]):
    try:
        message = message_data.get("message", "")
        conversation_id = message_data.get("conversationId")
        user_context = message_data.get("userContext", {})
        
        if not data_manager:
            return {
                "success": True,
                "response": {
                    "message": f"Hello! I'm here to help with your family memories and travel planning. You asked: '{message}'. Unfortunately, full AI features are not available in this simplified mode, but the API integration is working!",
                    "timestamp": datetime.now().isoformat(),
                    "conversationId": conversation_id or str(uuid.uuid4()),
                    "context": user_context
                },
                "api_version": "v1"
            }
        
        response = await ai_integration.chat_with_assistant(
            message=message,
            conversation_id=conversation_id,
            context=user_context
        )
        
        return {
            "success": True,
            "response": {
                "message": response.get("response", "I'm here to help with your family memories and travel planning!"),
                "timestamp": datetime.now().isoformat(),
                "conversationId": conversation_id or str(uuid.uuid4()),
                "context": response.get("context", {})
            },
            "api_version": "v1"
        }
    except Exception as e:
        logger.error(f"Error in chat message: {e}")
        raise HTTPException(status_code=500, detail="Failed to process chat message")

# === AUTHENTICATION ENDPOINTS ===

@app.post("/api/v1/auth/register")
async def register(user_data: Dict[str, Any]):
    try:
        name = user_data.get("name")
        email = user_data.get("email")
        password = user_data.get("password")
        password_confirm = user_data.get("passwordConfirm")
        
        if not all([name, email, password, password_confirm]):
            raise HTTPException(status_code=400, detail="All fields are required")
            
        if password != password_confirm:
            raise HTTPException(status_code=400, detail="Passwords do not match")
            
        if len(password) < 8:
            raise HTTPException(status_code=400, detail="Password must be at least 8 characters long")
        
        # Check if user already exists (simplified check)
        if email == "test@example.com":  # Simulate existing user
            raise HTTPException(status_code=400, detail="User already exists with this email")
        
        # Create user (simplified - in real app would save to database)
        user_id = str(uuid.uuid4())
        access_token = f"token_{user_id}"
        
        user = {
            "id": user_id,
            "name": name,
            "email": email,
            "role": "user",
            "avatar": None
        }
        
        return {
            "success": True,
            "message": "Registration successful",
            "accessToken": access_token,
            "data": {
                "user": user
            },
            "api_version": "v1"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(status_code=500, detail="Registration failed")

@app.post("/api/v1/auth/login")
async def login(user_data: Dict[str, Any]):
    try:
        email = user_data.get("email")
        password = user_data.get("password")
        
        if not email or not password:
            raise HTTPException(status_code=400, detail="Email and password are required")
        
        # Simplified login check (in real app would check database)
        if email == "admin@elmowafi.com" and password == "password123":
            user_id = "admin_user_id"
            user = {
                "id": user_id,
                "name": "Ahmad El-Mowafi",
                "email": email,
                "role": "admin",
                "avatar": None
            }
        else:
            # For demo, accept any email/password combination
            user_id = str(uuid.uuid4())
            user = {
                "id": user_id,
                "name": email.split("@")[0].title(),
                "email": email,
                "role": "user", 
                "avatar": None
            }
        
        access_token = f"token_{user_id}"
        
        return {
            "success": True,
            "message": "Login successful", 
            "accessToken": access_token,
            "data": {
                "user": user
            },
            "api_version": "v1"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail="Login failed")

@app.post("/api/v1/auth/logout")
async def logout():
    return {
        "success": True,
        "message": "Logout successful",
        "api_version": "v1"
    }

@app.get("/api/v1/auth/me")
async def get_current_user():
    # For demo purposes, return a mock user
    # In real app, would decode JWT token and fetch user from database
    return {
        "success": True,
        "data": {
            "user": {
                "id": "demo_user_id",
                "name": "Demo User",
                "email": "demo@elmowafi.com", 
                "role": "user",
                "avatar": None
            }
        },
        "api_version": "v1"
    }

@app.post("/api/v1/auth/refresh")
async def refresh_token():
    # For demo purposes, return a new token
    new_token = f"token_{uuid.uuid4()}"
    return {
        "success": True,
        "accessToken": new_token,
        "api_version": "v1"
    }

@app.patch("/api/v1/auth/updateMe")
async def update_profile(user_data: Dict[str, Any]):
    try:
        name = user_data.get("name")
        email = user_data.get("email")
        
        if not name or not email:
            raise HTTPException(status_code=400, detail="Name and email are required")
        
        updated_user = {
            "id": "demo_user_id",
            "name": name,
            "email": email,
            "role": "user",
            "avatar": None
        }
        
        return {
            "success": True,
            "message": "Profile updated successfully",
            "data": {
                "user": updated_user
            },
            "api_version": "v1"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Profile update error: {e}")
        raise HTTPException(status_code=500, detail="Profile update failed")

@app.patch("/api/v1/auth/updatePassword")
async def update_password(password_data: Dict[str, Any]):
    try:
        current_password = password_data.get("currentPassword")
        new_password = password_data.get("newPassword")
        password_confirm = password_data.get("passwordConfirm")
        
        if not all([current_password, new_password, password_confirm]):
            raise HTTPException(status_code=400, detail="All password fields are required")
            
        if new_password != password_confirm:
            raise HTTPException(status_code=400, detail="New passwords do not match")
            
        if len(new_password) < 8:
            raise HTTPException(status_code=400, detail="Password must be at least 8 characters long")
        
        # For demo, accept any current password
        new_token = f"token_{uuid.uuid4()}"
        
        return {
            "success": True,
            "message": "Password updated successfully",
            "accessToken": new_token,
            "api_version": "v1"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Password update error: {e}")
        raise HTTPException(status_code=500, detail="Password update failed")

# === PHOTO ANALYSIS ===

@app.post("/api/v1/ai/analyze-photo")
async def analyze_photo_comprehensive(
    file: UploadFile = File(...),
    metadata: str = Form("{}"),
    family_context: str = Form("[]")
):
    try:
        if not data_manager:
            return {
                "success": True,
                "analysis": {
                    "description": "Family photo uploaded successfully (simplified mode)",
                    "family_members": [],
                    "emotions": ["happy"],
                    "objects": ["photo", "family"],
                    "location": "Unknown",
                    "tags": ["family", "memory", "photo"],
                    "suggested_title": f"Family Memory {datetime.now().strftime('%Y-%m-%d')}"
                },
                "suggestions": [
                    "Add location tags for better organization",
                    "Include family members in the photo",
                    "Consider creating a travel album"
                ],
                "ai_service_used": "family_ai_platform",
                "processing_time": 1.0,
                "api_version": "v1"
            }
        
        # Save uploaded file
        image_path = await data_manager.save_uploaded_file(file, "analysis")
        
        # Parse metadata and context
        metadata_dict = json.loads(metadata) if metadata else {}
        family_context_list = json.loads(family_context) if family_context else []
        
        # Analyze with AI
        analysis = await ai_integration.analyze_photo_comprehensive(
            image_path=str(image_path),
            metadata=metadata_dict,
            family_context=family_context_list
        )
        
        return {
            "success": True,
            "analysis": analysis.get("analysis", {}),
            "suggestions": analysis.get("memory_suggestions", []),
            "ai_service_used": "family_ai_platform",
            "processing_time": analysis.get("processing_time", 0),
            "api_version": "v1"
        }
    except Exception as e:
        logger.error(f"Error in comprehensive photo analysis: {e}")
        raise HTTPException(status_code=500, detail="Failed to analyze photo")

if __name__ == "__main__":
    print("Starting Elmowafiplatform Simplified Backend...")
    print("Creating required directories...")
    
    # Create required directories
    for dir_path in ["data", "data/uploads", "data/memories", "data/analysis", "logs"]:
        os.makedirs(dir_path, exist_ok=True)
    
    print("Server starting on http://localhost:8001")
    print("API documentation available at http://localhost:8001/docs")
    print("Press Ctrl+C to stop the server")
    
    uvicorn.run(app, host="0.0.0.0", port=8001, log_level="info")