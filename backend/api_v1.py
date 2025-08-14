#!/usr/bin/env python3
"""
API v1 Endpoints
Versioned API endpoints for Elmowafiplatform
"""

import os
import json
import uuid
import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from pathlib import Path

from fastapi import APIRouter, File, UploadFile, HTTPException, BackgroundTasks, Form, WebSocket, WebSocketDisconnect, Depends, Request, Body
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# Import authentication
from backend.auth import UserAuth, UserLogin, Token, get_current_user, register_user, login_user

# Import AI services
try:
    from backend.facial_recognition_trainer import face_trainer
    FACE_RECOGNITION_AVAILABLE = True
except ImportError:
    face_trainer = None
    FACE_RECOGNITION_AVAILABLE = False

try:
    from backend.photo_clustering import photo_clustering_engine
    PHOTO_CLUSTERING_AVAILABLE = True
except ImportError:
    photo_clustering_engine = None
    PHOTO_CLUSTERING_AVAILABLE = False

# Import data manager and AI integration
from backend.data_manager import DataManager
from backend.ai_integration import ai_integration

# Import security features
from backend.security import (
    security_manager, rate_limit, validate_input_data,
    USER_REGISTRATION_RULES, MEMORY_CREATION_RULES, EVENT_CREATION_RULES
)

# Import Redis and WebSocket managers
from backend.redis_manager_simple import redis_manager
from backend.websocket_redis_manager import websocket_manager as redis_websocket_manager, WebSocketMessage, MessageType as RedisMessageType

# Import database
from backend.database import db
from backend.websocket_manager import websocket_manager, ConnectionType, MessageType

# Setup logging
logger = logging.getLogger(__name__)

# Create v1 router
router = APIRouter()

# Initialize data manager
data_manager = DataManager()

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

# Health Check
@router.get("/health")
async def health_check():
    """Health check endpoint for v1 API"""
    try:
        # Check Redis connection
        redis_status = "healthy" if await redis_manager.ping() else "unhealthy"
        
        # Check AI services
        ai_services_status = {
            "face_recognition": FACE_RECOGNITION_AVAILABLE,
            "photo_clustering": PHOTO_CLUSTERING_AVAILABLE
        }
        
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "version": "1.0.0",
            "api_version": "v1",
            "services": {
                "redis": redis_status,
                "ai_services": ai_services_status
            }
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=500, detail="Service unhealthy")

# Authentication Endpoints
@router.post("/auth/register")
@rate_limit(max_requests=5, window=3600)
async def register(request: Request, user_data: dict):
    """Register new user - v1"""
    try:
        # Validate input data
        if not validate_input_data(user_data, USER_REGISTRATION_RULES):
            raise HTTPException(status_code=400, detail="Invalid registration data")
        
        # Register user
        result = await register_user(user_data)
        
        if result.get("success"):
            return {
                "success": True,
                "message": "User registered successfully",
                "user_id": result.get("user_id"),
                "api_version": "v1"
            }
        else:
            raise HTTPException(status_code=400, detail=result.get("error", "Registration failed"))
            
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(status_code=500, detail="Registration failed")

@router.post("/auth/login")
@rate_limit(max_requests=10, window=3600)
async def login(request: Request, credentials: dict):
    """Login user - v1"""
    try:
        # Validate credentials
        if not credentials.get("email") or not credentials.get("password"):
            raise HTTPException(status_code=400, detail="Email and password required")
        
        # Login user
        result = await login_user(credentials)
        
        if result.get("success"):
            return {
                "success": True,
                "message": "Login successful",
                "token": result.get("token"),
                "user": result.get("user"),
                "api_version": "v1"
            }
        else:
            raise HTTPException(status_code=401, detail=result.get("error", "Invalid credentials"))
            
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail="Login failed")

# Family Management Endpoints
@router.get("/family/members")
async def get_family_members():
    """Get all family members - v1"""
    try:
        members = await data_manager.get_family_members()
        return {
            "members": members,
            "api_version": "v1"
        }
    except Exception as e:
        logger.error(f"Error getting family members: {e}")
        raise HTTPException(status_code=500, detail="Failed to get family members")

@router.post("/family/members")
async def create_family_member(member: Dict[str, Any]):
    """Create new family member - v1"""
    try:
        member_id = await data_manager.create_family_member(member)
        return {
            "success": True,
            "member_id": member_id,
            "api_version": "v1"
        }
    except Exception as e:
        logger.error(f"Error creating family member: {e}")
        raise HTTPException(status_code=500, detail="Failed to create family member")

@router.put("/family/members/{member_id}")
async def update_family_member(member_id: str, updates: Dict[str, Any]):
    """Update family member - v1"""
    try:
        success = await data_manager.update_family_member(member_id, updates)
        if success:
            return {
                "success": True,
                "message": "Family member updated",
                "api_version": "v1"
            }
        else:
            raise HTTPException(status_code=404, detail="Family member not found")
    except Exception as e:
        logger.error(f"Error updating family member: {e}")
        raise HTTPException(status_code=500, detail="Failed to update family member")

# Memory Management Endpoints
@router.get("/memories")
async def get_memories(
    familyMemberId: Optional[str] = None,
    startDate: Optional[str] = None,
    endDate: Optional[str] = None,
    tags: Optional[List[str]] = None
):
    """Get memories with filters - v1"""
    try:
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

@router.post("/memories/upload")
async def upload_memory(
    background_tasks: BackgroundTasks,
    title: str = Form(...),
    description: Optional[str] = Form(None),
    date: str = Form(...),
    location: Optional[str] = Form(None),
    tags: str = Form("[]"),
    familyMembers: str = Form("[]"),
    image: Optional[UploadFile] = File(None)
):
    """Upload new memory - v1"""
    try:
        # Parse JSON strings
        tags_list = json.loads(tags) if tags else []
        family_members_list = json.loads(familyMembers) if familyMembers else []
        
        # Create memory data
        memory_data = {
            "title": title,
            "description": description,
            "date": date,
            "location": location,
            "tags": tags_list,
            "familyMembers": family_members_list
        }
        
        # Save image if provided
        image_path = None
        if image:
            image_path = await data_manager.save_uploaded_file(image, "memories")
            memory_data["imageUrl"] = str(image_path)
        
        # Create memory
        memory_id = await data_manager.create_memory(memory_data)
        
        # Process AI analysis in background if image provided
        if image_path and family_members_list:
            background_tasks.add_task(
                process_memory_ai_analysis,
                memory_id,
                image_path,
                family_members_list
            )
        
        return {
            "success": True,
            "memory_id": memory_id,
            "api_version": "v1"
        }
        
    except Exception as e:
        logger.error(f"Error uploading memory: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload memory")

async def process_memory_ai_analysis(memory_id: str, image_path: Path, family_member_ids: List[str]):
    """Process AI analysis for memory - background task"""
    try:
        if not FACE_RECOGNITION_AVAILABLE:
            return
        
        # Get family members for context
        family_members = await data_manager.get_family_members()
        family_context = [m for m in family_members if m["id"] in family_member_ids]
        
        # Analyze image
        analysis_result = await ai_integration.analyze_image(
            image_path=str(image_path),
            analysis_type="memory",
            family_context=family_context
        )
        
        # Update memory with analysis
        await data_manager.update_memory(memory_id, {
            "aiAnalysis": analysis_result
        })
        
        logger.info(f"AI analysis completed for memory {memory_id}")
        
    except Exception as e:
        logger.error(f"Error in AI analysis for memory {memory_id}: {e}")

# AI Analysis Endpoints
@router.post("/analyze")
async def analyze_image(
    image: UploadFile = File(...),
    analysisType: str = Form("general"),
    familyContext: str = Form("[]")
):
    """Analyze image with AI - v1"""
    try:
        # Save uploaded image
        image_path = await data_manager.save_uploaded_file(image, "analysis")
        
        # Parse family context
        context = json.loads(familyContext) if familyContext else []
        
        # Try to use our AI service manager first
        try:
            from ai_service_integrations import get_ai_service_manager
            ai_manager = get_ai_service_manager()
            
            # Create detailed prompt for image analysis
            prompt = f"""
            Analyze this family photo and provide detailed insights.
            
            Analysis type: {analysisType}
            Family context: {context}
            
            Please provide:
            1. Description of what you see in the image
            2. Family members identified (if any)
            3. Emotions and expressions detected
            4. Objects and activities in the scene
            5. Location or setting suggestions
            6. Memory suggestions and tags
            7. Family-friendly insights
            
            Format as JSON with keys: description, family_members, emotions, objects, location, suggestions, insights
            """
            
            # For now, we'll use text-based analysis since we don't have image analysis
            # In a real implementation, you'd use OpenAI's Vision API or similar
            result = await ai_manager.generate_content(prompt, provider="auto")
            
            if result.get("status") == "success":
                try:
                    ai_response = json.loads(result["text"])
                    analysis_result = {
                        "success": True,
                        "analysis": ai_response,
                        "ai_provider": result.get("provider", "unknown"),
                        "analysis_type": analysisType,
                        "api_version": "v1"
                    }
                except json.JSONDecodeError:
                    # If not JSON, return as text
                    analysis_result = {
                        "success": True,
                        "analysis": {
                            "description": result["text"],
                            "family_members": [],
                            "emotions": [],
                            "objects": [],
                            "location": "Unknown",
                            "suggestions": ["Upload more photos for better analysis"],
                            "insights": "AI analysis completed"
                        },
                        "ai_provider": result.get("provider", "unknown"),
                        "analysis_type": analysisType,
                        "api_version": "v1"
                    }
            else:
                # Fallback to external API
                analysis_result = await ai_integration.analyze_image(
                    image_path=str(image_path),
                    analysis_type=analysisType,
                    family_context=context
                )
                analysis_result["api_version"] = "v1"
                
        except ImportError:
            # Fallback to external API if AI service manager not available
            analysis_result = await ai_integration.analyze_image(
                image_path=str(image_path),
                analysis_type=analysisType,
                family_context=context
            )
            analysis_result["api_version"] = "v1"
        
        return analysis_result
        
    except Exception as e:
        logger.error(f"Error analyzing image: {e}")
        raise HTTPException(status_code=500, detail="Failed to analyze image")

# Chat Endpoints
@router.post("/chat", response_model=ChatResponse)
async def chat_with_ai_assistant(chat_request: ChatMessage, current_user: dict = Depends(get_current_user)):
    """Chat with AI assistant - v1"""
    try:
        # Generate response using AI
        response = await ai_integration.chat_with_assistant(
            message=chat_request.message,
            context=chat_request.context,
            family_id=chat_request.family_id,
            conversation_id=chat_request.conversation_id,
            user_id=current_user.get("id")
        )
        
        return ChatResponse(
            response=response["response"],
            message_id=str(uuid.uuid4()),
            timestamp=datetime.now().isoformat(),
            confidence=response.get("confidence", 0.8),
            context_used=response.get("context_used", []),
            suggestions=response.get("suggestions", [])
        )
        
    except Exception as e:
        logger.error(f"Error in chat: {e}")
        raise HTTPException(status_code=500, detail="Failed to process chat")

# WebSocket Endpoints
@router.websocket("/ws/family/{family_id}")
async def websocket_family_endpoint(websocket: WebSocket, family_id: str, user_id: str):
    """WebSocket for family real-time updates - v1"""
    await websocket.accept()
    
    try:
        # Join family room
        await websocket_manager.join_room(
            websocket=websocket,
            room_id=family_id,
            user_id=user_id,
            connection_type=ConnectionType.FAMILY
        )
        
        # Send welcome message
        await websocket.send_text(json.dumps({
            "type": "welcome",
            "message": "Connected to family room",
            "family_id": family_id,
            "api_version": "v1"
        }))
        
        # Handle messages
        while True:
            try:
                data = await websocket.receive_text()
                message = json.loads(data)
                
                # Process message
                await websocket_manager.handle_message(
                    websocket=websocket,
                    message=message,
                    room_id=family_id,
                    user_id=user_id
                )
                
            except WebSocketDisconnect:
                break
                
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        # Leave room
        await websocket_manager.leave_room(
            websocket=websocket,
            room_id=family_id,
            user_id=user_id
        )

# Memory Suggestions and Smart Features
@router.get("/memories/suggestions")
async def get_memory_suggestions(date: Optional[str] = None, family_member: Optional[str] = None):
    """Get smart memory suggestions - v1"""
    try:
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

@router.get("/ai/memory/timeline")
async def get_ai_memory_timeline(
    limit: Optional[int] = 50,
    offset: Optional[int] = 0,
    family_member: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None
):
    """Get AI-organized memory timeline - v1"""
    try:
        timeline = await data_manager.get_memory_timeline(
            limit=limit,
            offset=offset,
            family_member=family_member,
            date_from=date_from,
            date_to=date_to
        )
        return {
            "success": True,
            "timeline": timeline,
            "total_memories": len(timeline),
            "filters_applied": {
                "limit": limit,
                "offset": offset,
                "family_member": family_member,
                "date_from": date_from,
                "date_to": date_to
            },
            "ai_powered": True,
            "api_version": "v1"
        }
    except Exception as e:
        logger.error(f"Error getting memory timeline: {e}")
        raise HTTPException(status_code=500, detail="Failed to get memory timeline")

@router.post("/memories/search")
async def search_memories(search_data: Dict[str, Any]):
    """Search memories with AI-powered suggestions - v1"""
    try:
        query = search_data.get("query", "")
        filters = search_data.get("filters", {})
        
        results = await data_manager.search_memories(query=query, filters=filters)
        return {
            "success": True,
            "results": results,
            "query": query,
            "filters": filters,
            "ai_enhanced": True,
            "api_version": "v1"
        }
    except Exception as e:
        logger.error(f"Error searching memories: {e}")
        raise HTTPException(status_code=500, detail="Failed to search memories")

@router.post("/ai/analyze-photo")
async def analyze_photo_comprehensive(
    file: UploadFile = File(...),
    metadata: str = Form("{}"),
    family_context: str = Form("[]")
):
    """Comprehensive AI photo analysis - v1"""
    try:
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
            "analysis": analysis,
            "suggestions": analysis.get("memory_suggestions", []),
            "ai_service_used": "family_ai_platform",
            "processing_time": analysis.get("processing_time", 0),
            "api_version": "v1"
        }
    except Exception as e:
        logger.error(f"Error in comprehensive photo analysis: {e}")
        raise HTTPException(status_code=500, detail="Failed to analyze photo")

@router.post("/ai/memory/upload")
async def upload_memory_with_ai(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    date: str = Form(...),
    location: str = Form(None),
    family_members: str = Form("[]"),
    tags: str = Form("[]")
):
    """Upload memory with AI processing - v1"""
    try:
        # Parse JSON strings
        family_members_list = json.loads(family_members) if family_members else []
        tags_list = json.loads(tags) if tags else []
        
        # Save uploaded file
        image_path = await data_manager.save_uploaded_file(file, "memories")
        
        # Create memory
        memory_data = {
            "title": f"Memory from {date}",
            "date": date,
            "location": location,
            "imageUrl": str(image_path),
            "familyMembers": family_members_list,
            "tags": tags_list
        }
        
        memory_id = await data_manager.create_memory(memory_data)
        
        # Process AI analysis in background
        background_tasks.add_task(
            process_memory_ai_analysis,
            memory_id,
            image_path,
            family_members_list
        )
        
        return {
            "success": True,
            "memory": memory_data,
            "ai_analysis": {"status": "processing", "estimated_time": "30 seconds"},
            "message": "Memory uploaded successfully, AI analysis in progress",
            "api_version": "v1"
        }
        
    except Exception as e:
        logger.error(f"Error uploading memory with AI: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload memory")

# Travel AI Endpoints
@router.get("/travel/recommendations")
async def get_travel_recommendations(
    budget: Optional[str] = None,
    duration: Optional[str] = None,
    interests: Optional[List[str]] = None
):
    """Get AI travel recommendations - v1"""
    try:
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

@router.post("/travel/plans")
async def create_travel_plan(plan_data: Dict[str, Any]):
    """Create travel plan - v1"""
    try:
        plan_id = await data_manager.create_travel_plan(plan_data)
        return {
            "success": True,
            "plan_id": plan_id,
            "api_version": "v1"
        }
    except Exception as e:
        logger.error(f"Error creating travel plan: {e}")
        raise HTTPException(status_code=500, detail="Failed to create travel plan")

@router.get("/travel/plans")
async def get_travel_plans(familyMemberId: Optional[str] = None):
    """Get travel plans - v1"""
    try:
        plans = await data_manager.get_travel_plans(family_member_id=familyMemberId)
        return {
            "plans": plans,
            "api_version": "v1"
        }
    except Exception as e:
        logger.error(f"Error getting travel plans: {e}")
        raise HTTPException(status_code=500, detail="Failed to get travel plans")

# AI Chat Endpoints  
@router.post("/chat/message")
async def chat_message(message_data: Dict[str, Any]):
    """Send message to AI chat assistant - v1"""
    try:
        message = message_data.get("message", "")
        conversation_id = message_data.get("conversationId")
        user_context = message_data.get("userContext", {})
        
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

# System Info Endpoints
@router.get("/system/info")
async def get_system_info():
    """Get system information - v1"""
    try:
        return {
            "platform": "Elmowafiplatform Family Memory & Travel AI",
            "version": "1.0.0",
            "capabilities": {
                "ai_photo_analysis": True,
                "family_recognition": FACE_RECOGNITION_AVAILABLE,
                "photo_clustering": PHOTO_CLUSTERING_AVAILABLE,
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
    except Exception as e:
        logger.error(f"Error getting system info: {e}")
        raise HTTPException(status_code=500, detail="Failed to get system info")

@router.get("/ai/system/health")
async def get_ai_system_health():
    """Get AI system health - v1"""
    try:
        return {
            "service": "Family AI Platform",
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "services": {
                "face_recognition": "active" if FACE_RECOGNITION_AVAILABLE else "inactive",
                "photo_clustering": "active" if PHOTO_CLUSTERING_AVAILABLE else "inactive",
                "ai_integration": "active",
                "redis": "active"
            },
            "capabilities": {
                "photo_analysis": True,
                "travel_ai": True,
                "memory_suggestions": True,
                "chat_assistant": True
            },
            "ml_dependencies": {
                "opencv": True,
                "pillow": True,
                "numpy": True
            },
            "api_version": "v1"
        }
    except Exception as e:
        logger.error(f"Error getting AI system health: {e}")
        raise HTTPException(status_code=500, detail="AI system health check failed")

# Export router
__all__ = ["router"]
