#!/usr/bin/env python3
"""
AI Integration Endpoints for Family Platform
Connects React frontend with hack2 AI services for memory processing
"""

import os
import json
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from pathlib import Path

from fastapi import APIRouter, File, UploadFile, Form, HTTPException, BackgroundTasks
from pydantic import BaseModel
import requests
import aiohttp

from .family_ai_bridge import family_ai_bridge

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/v1", tags=["AI Integration"])

# Hack2 service configuration
HACK2_SERVICE_URL = os.getenv("HACK2_SERVICE_URL", "http://localhost:5000")
HACK2_AVAILABLE = True

# Request/Response Models
class AIPhotoAnalysisRequest(BaseModel):
    metadata: Optional[Dict[str, Any]] = None
    family_context: Optional[List[Dict[str, Any]]] = None
    analysis_type: str = "family_memory"

class AIPhotoAnalysisResponse(BaseModel):
    success: bool
    analysis: Dict[str, Any]
    suggestions: Dict[str, Any]
    ai_service_used: str
    processing_time: float

class AITravelRequest(BaseModel):
    destination: Optional[str] = None
    budget: Optional[float] = None
    family_size: int = 4
    interests: List[str] = []
    travel_dates: Optional[str] = None

class AITravelResponse(BaseModel):
    success: bool
    recommendations: List[Dict[str, Any]]
    cultural_insights: Dict[str, Any]
    ai_powered: bool

# Photo Analysis Endpoints (connecting to hack2)
@router.post("/ai/analyze-photo", response_model=AIPhotoAnalysisResponse)
async def analyze_family_photo(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    metadata: str = Form("{}"),
    family_context: str = Form("[]")
):
    """
    Analyze family photo using hack2 AI services
    """
    try:
        # Validate file
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Parse metadata and context
        try:
            metadata_dict = json.loads(metadata)
            family_context_list = json.loads(family_context)
        except json.JSONDecodeError as e:
            raise HTTPException(status_code=400, detail=f"Invalid JSON in metadata or family_context: {e}")
        
        # Save uploaded file
        upload_dir = Path("uploads")
        upload_dir.mkdir(exist_ok=True)
        
        file_extension = Path(file.filename).suffix if file.filename else ".jpg"
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"analysis_{timestamp}{file_extension}"
        file_path = upload_dir / filename
        
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
        
        # Process with AI bridge (which uses hack2)
        analysis_result = await family_ai_bridge.process_family_photo(
            str(file_path), 
            metadata_dict
        )
        
        return AIPhotoAnalysisResponse(
            success=analysis_result["success"],
            analysis=analysis_result["analysis"],
            suggestions=analysis_result["suggestions"],
            ai_service_used=analysis_result["ai_service"],
            processing_time=1.5  # Mock timing
        )
        
    except Exception as e:
        logger.error(f"Photo analysis error: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@router.post("/ai/memory/upload")
async def upload_memory_with_ai(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    date: str = Form(...),
    location: Optional[str] = Form(None),
    family_members: str = Form("[]"),
    tags: str = Form("[]")
):
    """
    Upload memory photo and process with AI
    """
    try:
        # Parse form data
        family_members_list = json.loads(family_members)
        tags_list = json.loads(tags)
        
        # Save file
        upload_dir = Path("uploads")
        upload_dir.mkdir(exist_ok=True)
        
        file_extension = Path(file.filename).suffix if file.filename else ".jpg"
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"memory_{timestamp}{file_extension}"
        file_path = upload_dir / filename
        
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
        
        # Prepare metadata
        metadata = {
            "date": date,
            "location": location,
            "family_members": family_members_list,
            "tags": tags_list
        }
        
        # Process with hack2 AI
        analysis_result = await family_ai_bridge.process_family_photo(
            str(file_path),
            metadata
        )
        
        # Create memory record with AI analysis
        memory_data = {
            "id": f"memory_{timestamp}",
            "title": analysis_result.get("suggestions", {}).get("memory_title", "Family Memory"),
            "description": analysis_result.get("analysis", {}).get("description", ""),
            "date": date,
            "location": location,
            "imageUrl": f"/uploads/{filename}",
            "tags": tags_list + analysis_result.get("suggestions", {}).get("memory_tags", []),
            "familyMembers": family_members_list,
            "aiAnalysis": analysis_result.get("analysis", {}),
            "confidence": analysis_result.get("analysis", {}).get("confidence", 0.8)
        }
        
        # Schedule background processing
        background_tasks.add_task(
            _process_memory_background,
            str(file_path),
            memory_data
        )
        
        return {
            "success": True,
            "memory": memory_data,
            "ai_analysis": analysis_result,
            "message": "Memory uploaded and analyzed successfully"
        }
        
    except Exception as e:
        logger.error(f"Memory upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

# Travel AI Endpoints (connecting to hack2)
@router.post("/ai/travel/recommendations", response_model=AITravelResponse)
async def get_ai_travel_recommendations(request: AITravelRequest):
    """
    Get AI-powered travel recommendations using hack2
    """
    try:
        # Convert request to hack2 format
        travel_request = {
            "destination": request.destination,
            "budget": request.budget,
            "family_size": request.family_size,
            "interests": request.interests,
            "travel_dates": request.travel_dates
        }
        
        # Get recommendations from AI bridge
        recommendations = await family_ai_bridge.get_travel_recommendations(travel_request)
        
        return AITravelResponse(
            success=recommendations["success"],
            recommendations=recommendations["recommendations"],
            cultural_insights=recommendations.get("cultural_considerations", {}),
            ai_powered=recommendations["ai_powered"]
        )
        
    except Exception as e:
        logger.error(f"Travel recommendations error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get recommendations: {str(e)}")

@router.post("/ai/travel/itinerary")
async def plan_ai_itinerary(
    destination: str,
    duration_days: int = 7,
    family_members: List[Dict[str, Any]] = []
):
    """
    Plan detailed itinerary using hack2 AI
    """
    try:
        itinerary = await family_ai_bridge.plan_family_itinerary(
            destination=destination,
            duration_days=duration_days,
            family_members=family_members
        )
        
        return itinerary
        
    except Exception as e:
        logger.error(f"Itinerary planning error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to plan itinerary: {str(e)}")

# Memory Timeline and Suggestions
@router.get("/ai/memory/timeline")
async def get_ai_memory_timeline(
    limit: int = 50,
    family_member: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None
):
    """
    Get AI-enhanced memory timeline
    """
    try:
        # Build filters
        filters = {}
        if family_member:
            filters["family_member"] = family_member
        if date_from:
            filters["date_from"] = date_from
        if date_to:
            filters["date_to"] = date_to
        if limit:
            filters["limit"] = limit
        
        # Use uploads directory for now
        timeline = await family_ai_bridge.create_family_timeline("uploads", filters)
        
        return {
            "success": True,
            "timeline": timeline,
            "total_memories": len(timeline),
            "filters_applied": filters,
            "ai_powered": family_ai_bridge.hack2_available
        }
        
    except Exception as e:
        logger.error(f"Timeline creation error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create timeline: {str(e)}")

@router.get("/ai/memory/suggestions")
async def get_ai_memory_suggestions(
    date: Optional[str] = None,
    family_member: Optional[str] = None
):
    """
    Get AI-powered memory suggestions
    """
    try:
        suggestions = await family_ai_bridge.get_memory_suggestions(date, family_member)
        return suggestions
        
    except Exception as e:
        logger.error(f"Memory suggestions error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get suggestions: {str(e)}")

# AI System Status and Health
@router.get("/ai/health")
async def get_ai_health():
    """
    Check AI integration health
    """
    try:
        health = await family_ai_bridge.health_check()
        
        # Test hack2 direct connection
        hack2_status = await _test_hack2_connection()
        health["hack2_direct"] = hack2_status
        
        return health
        
    except Exception as e:
        logger.error(f"AI health check error: {e}")
        return {
            "service": "AI Integration",
            "status": "error",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

@router.get("/ai/capabilities")
async def get_ai_capabilities():
    """
    Get AI integration capabilities
    """
    return {
        "service": "Family Platform AI Integration",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat(),
        "integration_status": {
            "hack2_bridge": family_ai_bridge.hack2_available,
            "hack2_direct": HACK2_AVAILABLE,
            "fallback_mode": not family_ai_bridge.hack2_available
        },
        "available_endpoints": {
            "photo_analysis": "/ai/analyze-photo",
            "memory_upload": "/ai/memory/upload", 
            "travel_recommendations": "/ai/travel/recommendations",
            "travel_itinerary": "/ai/travel/itinerary",
            "memory_timeline": "/ai/memory/timeline",
            "memory_suggestions": "/ai/memory/suggestions"
        },
        "supported_features": {
            "family_photo_analysis": True,
            "memory_categorization": True,
            "travel_planning": True,
            "cultural_insights": True,
            "timeline_generation": True,
            "smart_suggestions": True
        },
        "ai_models": {
            "hack2_family_processor": family_ai_bridge.hack2_available,
            "hack2_travel_ai": family_ai_bridge.hack2_available
        }
    }

# Direct hack2 integration endpoints (optional)
@router.post("/ai/hack2/direct-analysis")
async def direct_hack2_analysis(
    file: UploadFile = File(...),
    metadata: str = Form("{}")
):
    """
    Direct connection to hack2 for testing
    """
    try:
        if not HACK2_AVAILABLE:
            raise HTTPException(status_code=503, detail="hack2 service not available")
        
        # Save file temporarily
        upload_dir = Path("uploads")
        upload_dir.mkdir(exist_ok=True)
        
        file_extension = Path(file.filename).suffix if file.filename else ".jpg"
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"direct_{timestamp}{file_extension}"
        file_path = upload_dir / filename
        
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
        
        # Call hack2 directly
        async with aiohttp.ClientSession() as session:
            with open(file_path, 'rb') as f:
                data = aiohttp.FormData()
                data.add_field('file', f, filename=filename, content_type=file.content_type)
                data.add_field('metadata', metadata)
                
                async with session.post(f"{HACK2_SERVICE_URL}/api/memory/upload-photo", data=data) as resp:
                    if resp.status == 200:
                        result = await resp.json()
                        return {
                            "success": True,
                            "hack2_response": result,
                            "direct_connection": True
                        }
                    else:
                        error_text = await resp.text()
                        raise HTTPException(status_code=resp.status, detail=f"hack2 error: {error_text}")
        
    except Exception as e:
        logger.error(f"Direct hack2 analysis error: {e}")
        raise HTTPException(status_code=500, detail=f"Direct analysis failed: {str(e)}")

# Background task functions
async def _process_memory_background(file_path: str, memory_data: Dict[str, Any]):
    """Process additional memory tasks in background"""
    try:
        logger.info(f"Processing memory background tasks for: {file_path}")
        
        # Could do additional processing here:
        # - Generate thumbnails
        # - Extract EXIF data
        # - Update search indexes
        # - Send notifications
        
        logger.info(f"Background processing completed for memory: {memory_data['id']}")
        
    except Exception as e:
        logger.error(f"Background processing error: {e}")

async def _test_hack2_connection() -> Dict[str, Any]:
    """Test direct connection to hack2 service"""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{HACK2_SERVICE_URL}/api/health") as resp:
                if resp.status == 200:
                    data = await resp.json()
                    return {
                        "status": "healthy",
                        "response": data,
                        "connection": "direct"
                    }
                else:
                    return {
                        "status": "error",
                        "status_code": resp.status,
                        "connection": "failed"
                    }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "connection": "failed"
        }