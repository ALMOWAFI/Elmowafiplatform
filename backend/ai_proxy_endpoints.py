#!/usr/bin/env python3
"""
AI Proxy Endpoints - Integration layer between React frontend and Python AI services
"""

import os
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, File, UploadFile, HTTPException, Form, BackgroundTasks
from pydantic import BaseModel

from .ai_integration import ai_service_proxy, ai_integration
from .data_manager import DataManager

router = APIRouter()
data_manager = DataManager()

# Request/Response Models
class AIMemoryRequest(BaseModel):
    date: Optional[str] = None
    location: Optional[str] = None
    family_members: Optional[List[str]] = None

class TravelRecommendationRequest(BaseModel):
    travel_dates: Optional[str] = None
    budget: Optional[float] = None
    family_size: Optional[int] = 4
    interests: Optional[List[str]] = []
    duration_days: Optional[int] = 7

class ItineraryRequest(BaseModel):
    destination: str
    duration_days: Optional[int] = 7
    family_members: Optional[List[Dict[str, Any]]] = []

class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    family_context: Optional[Dict[str, Any]] = None

# Memory Processing Endpoints with AI Integration
@router.post("/api/v1/memory/upload-with-ai")
async def upload_memory_with_ai(
    background_tasks: BackgroundTasks,
    title: str = Form(...),
    description: Optional[str] = Form(None),
    date: str = Form(...),
    location: Optional[str] = Form(None),
    tags: str = Form("[]"),
    family_members: str = Form("[]"),
    file: Optional[UploadFile] = File(None)
):
    """Upload memory and process with AI services"""
    try:
        import json
        
        # Parse form data
        tags_list = json.loads(tags) if tags else []
        family_members_list = json.loads(family_members) if family_members else []
        
        # Handle file upload first
        image_url = None
        ai_analysis = {}
        
        if file:
            # Read file data
            file_content = await file.read()
            
            # Process with AI service
            metadata = {
                'date': date,
                'location': location,
                'family_members': family_members_list
            }
            
            ai_result = await ai_service_proxy.upload_family_photo(
                file_content, file.filename, metadata
            )
            
            if ai_result.get("success"):
                ai_analysis = ai_result.get("analysis", {})
                # Use AI service image URL or save locally
                image_url = ai_result.get("image_url")
            
        # Create memory in main database
        memory_data = {
            "title": title,
            "description": description,
            "date": date,
            "location": location,
            "imageUrl": image_url,
            "tags": tags_list,
            "familyMembers": family_members_list,
            "aiAnalysis": ai_analysis
        }
        
        memory_id = data_manager.create_memory(memory_data)
        
        # Return created memory
        memories = data_manager.get_memories()
        memory = next((m for m in memories if m["id"] == memory_id), None)
        
        return {
            "success": True,
            "memory": memory,
            "ai_analysis": ai_analysis,
            "message": "Memory uploaded and processed with AI"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.get("/api/v1/memory/timeline-enhanced")
async def get_enhanced_memory_timeline():
    """Get memory timeline with AI enhancements"""
    try:
        # Get timeline from AI service
        ai_timeline = await ai_service_proxy.get_family_timeline()
        
        # Get memories from main database
        local_memories = data_manager.get_memories()
        
        # Merge and enhance data
        if ai_timeline.get("success"):
            timeline_data = ai_timeline.get("timeline", [])
        else:
            timeline_data = []
        
        return {
            "success": True,
            "timeline": timeline_data,
            "local_memories": local_memories,
            "total_memories": len(local_memories),
            "ai_enhanced": ai_timeline.get("success", False)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Timeline error: {str(e)}")

@router.get("/api/v1/memory/suggestions-ai")
async def get_ai_memory_suggestions(date: Optional[str] = None, family_member: Optional[str] = None):
    """Get AI-powered memory suggestions"""
    try:
        # Get suggestions from AI service
        ai_suggestions = await ai_service_proxy.get_memory_suggestions(date, family_member)
        
        # Get local memory data for context
        local_memories = data_manager.get_memories()
        
        if ai_suggestions.get("success"):
            suggestions_data = ai_suggestions.get("suggestions", {})
        else:
            # Fallback to basic suggestions
            suggestions_data = {
                "onThisDay": [],
                "similar": local_memories[:3] if local_memories else [],
                "recommendations": [
                    "Upload more family photos",
                    "Add descriptions to your memories",
                    "Create photo albums"
                ]
            }
        
        return {
            "success": True,
            "suggestions": suggestions_data,
            "ai_powered": ai_suggestions.get("success", False),
            "date": date,
            "family_member": family_member
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Suggestions error: {str(e)}")

# Travel Planning Endpoints with AI Integration
@router.post("/api/v1/travel/recommendations-ai")
async def get_ai_travel_recommendations(request: TravelRecommendationRequest):
    """Get AI-powered travel recommendations"""
    try:
        # Prepare data for AI service
        travel_data = {
            "travel_dates": request.travel_dates,
            "budget": request.budget,
            "family_size": request.family_size,
            "interests": request.interests,
            "duration_days": request.duration_days
        }
        
        # Get recommendations from AI service
        ai_recommendations = await ai_service_proxy.get_travel_recommendations(travel_data)
        
        if ai_recommendations.get("success"):
            recommendations_data = ai_recommendations.get("recommendations", {})
        else:
            # Fallback recommendations
            recommendations_data = {
                "destinations": [
                    {
                        "name": "Dubai, UAE",
                        "reason": "Family-friendly with cultural experiences",
                        "estimated_budget": request.budget or 2000
                    }
                ],
                "family_activities": [
                    "Visit family-friendly attractions",
                    "Experience local culture together",
                    "Try traditional cuisine"
                ]
            }
        
        return {
            "success": True,
            "recommendations": recommendations_data,
            "request_details": travel_data,
            "ai_powered": ai_recommendations.get("success", False)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Travel recommendations error: {str(e)}")

@router.post("/api/v1/travel/itinerary-ai")
async def create_ai_itinerary(request: ItineraryRequest):
    """Create AI-powered family itinerary"""
    try:
        # Prepare data for AI service
        itinerary_data = {
            "destination": request.destination,
            "duration_days": request.duration_days,
            "family_members": request.family_members
        }
        
        # Get itinerary from AI service
        ai_itinerary = await ai_service_proxy.create_family_itinerary(itinerary_data)
        
        if ai_itinerary.get("success"):
            itinerary_details = ai_itinerary.get("itinerary", {})
        else:
            # Fallback itinerary
            itinerary_details = {
                "destination": request.destination,
                "days": [
                    {
                        "day": 1,
                        "activities": [
                            f"Arrive in {request.destination}",
                            "Family dinner at local restaurant"
                        ]
                    }
                ]
            }
        
        return {
            "success": True,
            "itinerary": itinerary_details,
            "ai_powered": ai_itinerary.get("success", False)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Itinerary creation error: {str(e)}")

@router.get("/api/v1/travel/cultural-insights/{destination}")
async def get_cultural_insights(destination: str):
    """Get cultural insights for destination"""
    try:
        ai_insights = await ai_service_proxy.get_cultural_insights(destination)
        
        if ai_insights.get("success"):
            insights_data = ai_insights.get("insights", {})
        else:
            # Fallback insights
            insights_data = {
                "cultural_tips": [
                    f"Research local customs in {destination}",
                    "Learn basic local phrases",
                    "Respect religious and cultural sites"
                ],
                "family_considerations": [
                    "Check child-friendly facilities",
                    "Consider local meal times",
                    "Plan for family rest periods"
                ]
            }
        
        return {
            "success": True,
            "insights": insights_data,
            "destination": destination,
            "ai_powered": ai_insights.get("success", False)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cultural insights error: {str(e)}")

@router.get("/api/v1/travel/patterns-ai")
async def analyze_travel_patterns():
    """Analyze family travel patterns with AI"""
    try:
        ai_patterns = await ai_service_proxy.analyze_travel_patterns()
        
        # Get local travel data for context
        local_travel_plans = data_manager.get_travel_plans()
        local_memories = data_manager.get_memories()
        
        # Extract travel-related memories
        travel_memories = [m for m in local_memories if 'travel' in m.get('tags', [])]
        
        if ai_patterns.get("success"):
            patterns_data = ai_patterns.get("analysis", {})
        else:
            # Fallback pattern analysis
            patterns_data = {
                "travel_frequency": "seasonal",
                "preferred_destinations": ["Middle East", "Europe"],
                "average_trip_duration": 7,
                "family_travel_style": "cultural_adventure"
            }
        
        return {
            "success": True,
            "analysis": patterns_data,
            "local_data": {
                "travel_plans": len(local_travel_plans),
                "travel_memories": len(travel_memories)
            },
            "ai_powered": ai_patterns.get("success", False)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pattern analysis error: {str(e)}")

# AI Chat Integration
@router.post("/api/v1/chat/ai-assistant")
async def chat_with_ai_assistant(request: ChatRequest):
    """Chat with AI assistant with family context"""
    try:
        # Get family context if not provided
        if not request.family_context:
            family_members = data_manager.get_family_members()
            memories = data_manager.get_memories()
            request.family_context = {
                "family_members": family_members,
                "memories": memories,
                "total_memories": len(memories)
            }
        
        # Generate AI response using integrated personality engine
        ai_response = await ai_integration.get_ai_response(
            request.message, 
            request.family_context
        )
        
        return {
            "success": True,
            "response": {
                "message": ai_response["response"],
                "personality": ai_response.get("personality"),
                "style": ai_response.get("style"),
                "timestamp": ai_response.get("timestamp"),
                "conversationId": request.conversation_id,
                "context": request.family_context,
                "suggestions": ai_response.get("suggestions", [])
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")

# System Integration Endpoints
@router.get("/api/v1/ai/health-check")
async def ai_services_health_check():
    """Check health of all AI services"""
    try:
        # Check AI service health
        ai_health = await ai_service_proxy.health_check()
        
        return {
            "status": "healthy" if ai_health.get("status") == "healthy" else "degraded",
            "ai_service": ai_health,
            "integration_status": "active",
            "timestamp": ai_health.get("timestamp"),
            "capabilities": {
                "memory_processing": ai_health.get("status") == "healthy",
                "travel_planning": ai_health.get("status") == "healthy",
                "ai_chat": True,
                "personality_engine": True
            }
        }
        
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "integration_status": "failed",
            "capabilities": {
                "memory_processing": False,
                "travel_planning": False,
                "ai_chat": True,  # Local fallback available
                "personality_engine": True
            }
        }

# Batch Processing Endpoints
@router.post("/api/v1/memory/batch-process")
async def batch_process_memories(background_tasks: BackgroundTasks):
    """Process existing memories with AI in background"""
    try:
        # Get unprocessed memories
        memories = data_manager.get_memories()
        unprocessed = [m for m in memories if not m.get("aiAnalysis")]
        
        # Schedule background processing
        background_tasks.add_task(process_memories_batch, unprocessed)
        
        return {
            "success": True,
            "message": f"Started background processing of {len(unprocessed)} memories",
            "total_memories": len(memories),
            "unprocessed_count": len(unprocessed)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch processing error: {str(e)}")

async def process_memories_batch(memories: List[Dict[str, Any]]):
    """Background task to process memories with AI"""
    for memory in memories:
        try:
            if memory.get("imageUrl"):
                # This would process each memory with AI
                # For now, just add a placeholder analysis
                ai_analysis = {
                    "processed_at": "2024-01-01T00:00:00",
                    "faces_detected": 0,
                    "objects": [],
                    "emotions": [],
                    "batch_processed": True
                }
                
                # Update memory with AI analysis
                data_manager.update_memory(memory["id"], {"aiAnalysis": ai_analysis})
                
        except Exception as e:
            print(f"Error processing memory {memory.get('id')}: {str(e)}")