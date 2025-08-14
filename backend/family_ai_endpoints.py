#!/usr/bin/env python3
"""
Family AI API Endpoints - Enhanced endpoints for Master Architecture Guide
Integrates family personality learning, running jokes, and privacy modes
"""

import json
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.family_ai_service import FamilyAIService
from backend.family_ai_models import FamilyPersonality, RunningJoke, FamilyDynamics, FamilyPrivacySettings
from backend.security import rate_limit, validate_input_data
from backend.database_config import get_db

logger = logging.getLogger(__name__)

# Create router for family AI endpoints
router = APIRouter(prefix="/api/family-ai", tags=["Family AI"])

# Pydantic models for request/response validation
class ChatRequest(BaseModel):
    family_id: str = Field(..., description="Family ID")
    member_id: str = Field(..., description="Family member ID")
    message: str = Field(..., min_length=1, max_length=2000, description="User message")
    privacy_level: str = Field(default="family", description="Privacy level: private, family, public")
    context_type: str = Field(default="chat", description="Context type for AI response")

class ChatResponse(BaseModel):
    response: str
    context_used: List[str]
    jokes_referenced: List[str]
    personality_learned: bool
    privacy_mode: str
    timestamp: datetime

class FamilyContextRequest(BaseModel):
    family_id: str = Field(..., description="Family ID")
    member_id: Optional[str] = Field(None, description="Optional specific member ID")
    include_jokes: bool = Field(default=True, description="Include running jokes")
    include_dynamics: bool = Field(default=True, description="Include family dynamics")

class MemoryLearningRequest(BaseModel):
    family_id: str = Field(..., description="Family ID")
    memory_data: Dict[str, Any] = Field(..., description="Memory data for learning")
    learn_personalities: bool = Field(default=True, description="Learn personality traits")
    create_jokes: bool = Field(default=True, description="Create running jokes")
    analyze_dynamics: bool = Field(default=True, description="Analyze family dynamics")

class PersonalityUpdateRequest(BaseModel):
    member_id: str = Field(..., description="Family member ID")
    personality_traits: Dict[str, float] = Field(..., description="Personality traits with scores")
    interests: List[str] = Field(default=[], description="Member interests")
    communication_style: Optional[str] = Field(None, description="Communication style")
    humor_style: Optional[str] = Field(None, description="Humor style")

class RunningJokeRequest(BaseModel):
    family_id: str = Field(..., description="Family ID")
    joke_title: str = Field(..., min_length=1, max_length=255, description="Joke title")
    joke_context: str = Field(..., min_length=1, description="Joke context/story")
    trigger_words: List[str] = Field(..., description="Words that trigger this joke")
    participants: List[str] = Field(..., description="Family member IDs involved")
    appropriate_contexts: List[str] = Field(default=["general"], description="When to use this joke")

class PrivacySettingsRequest(BaseModel):
    family_id: str = Field(..., description="Family ID")
    member_id: str = Field(..., description="Family member ID")
    default_privacy_mode: str = Field(default="family", description="Default privacy mode")
    allow_ai_learning: bool = Field(default=True, description="Allow AI personality learning")
    allow_personality_analysis: bool = Field(default=True, description="Allow personality analysis")
    allow_joke_creation: bool = Field(default=True, description="Allow running joke creation")
    ai_response_style: str = Field(default="balanced", description="AI response style preference")
    preferred_language: str = Field(default="en", description="Preferred language")

# Enhanced Chat Endpoint with Family Context
@router.post("/chat", response_model=ChatResponse)
@rate_limit(max_requests=30, window=60)  # 30 requests per minute
async def enhanced_family_chat(
    request: ChatRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Enhanced chat endpoint with family personality and context awareness"""
    try:
        # Validate input
        validate_input_data(request.dict(), {
            'message': {'min_length': 1, 'max_length': 2000},
            'privacy_level': {'allowed_values': ['private', 'family', 'public']}
        })
        
        # Initialize AI service
        ai_service = FamilyAIService(db)
        
        # Process AI response with family context
        result = await ai_service.process_ai_response(
            family_id=request.family_id,
            member_id=request.member_id,
            user_input=request.message,
            response_type=request.context_type
        )
        
        # Schedule background learning tasks
        background_tasks.add_task(
            ai_service.cleanup_expired_contexts
        )
        
        return ChatResponse(
            response=result['response'],
            context_used=result.get('context_used', []),
            jokes_referenced=result.get('jokes_referenced', []),
            personality_learned=result.get('personality_learned', False),
            privacy_mode=result.get('privacy_mode', 'family'),
            timestamp=datetime.utcnow()
        )
        
    except Exception as e:
        logger.error(f"Error in enhanced family chat: {e}")
        raise HTTPException(status_code=500, detail=f"Chat processing failed: {str(e)}")

# Get Family Context for AI
@router.get("/context/{family_id}")
@rate_limit(max_requests=60, window=60)
async def get_family_context(
    family_id: str,
    member_id: Optional[str] = None,
    include_jokes: bool = True,
    include_dynamics: bool = True,
    db: Session = Depends(get_db)
):
    """Get comprehensive family context for AI responses"""
    try:
        ai_service = FamilyAIService(db)
        context = await ai_service.get_family_context(family_id, member_id)
        
        # Filter context based on parameters
        if not include_jokes:
            context.pop('running_jokes', None)
        if not include_dynamics:
            context.pop('dynamics', None)
        
        return {
            'family_id': family_id,
            'context': context,
            'timestamp': datetime.utcnow()
        }
        
    except Exception as e:
        logger.error(f"Error getting family context: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get family context: {str(e)}")

# Memory Learning Endpoint
@router.post("/learn-from-memory")
@rate_limit(max_requests=20, window=60)
async def learn_from_memory(
    request: MemoryLearningRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Learn personality traits and create running jokes from uploaded memories"""
    try:
        ai_service = FamilyAIService(db)
        
        # Process memory learning
        learning_results = await ai_service.learn_from_memory(
            memory_data=request.memory_data,
            family_id=request.family_id
        )
        
        return {
            'success': True,
            'learning_results': learning_results,
            'timestamp': datetime.utcnow()
        }
        
    except Exception as e:
        logger.error(f"Error learning from memory: {e}")
        raise HTTPException(status_code=500, detail=f"Memory learning failed: {str(e)}")

# Personality Management Endpoints
@router.get("/personalities/{family_id}")
@rate_limit(max_requests=60, window=60)
async def get_family_personalities(
    family_id: str,
    db: Session = Depends(get_db)
):
    """Get all family member personalities"""
    try:
        ai_service = FamilyAIService(db)
        personalities = await ai_service._get_family_personalities(family_id)
        
        return {
            'family_id': family_id,
            'personalities': personalities,
            'count': len(personalities),
            'timestamp': datetime.utcnow()
        }
        
    except Exception as e:
        logger.error(f"Error getting family personalities: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get personalities: {str(e)}")

@router.post("/personalities/update")
@rate_limit(max_requests=10, window=60)
async def update_personality(
    request: PersonalityUpdateRequest,
    db: Session = Depends(get_db)
):
    """Update personality traits for a family member"""
    try:
        ai_service = FamilyAIService(db)
        
        insights = {
            'traits': request.personality_traits,
            'interests': request.interests,
            'communication_style': request.communication_style,
            'humor_style': request.humor_style
        }
        
        await ai_service._update_personality_insights(request.member_id, insights)
        
        return {
            'success': True,
            'member_id': request.member_id,
            'updated_traits': list(request.personality_traits.keys()),
            'timestamp': datetime.utcnow()
        }
        
    except Exception as e:
        logger.error(f"Error updating personality: {e}")
        raise HTTPException(status_code=500, detail=f"Personality update failed: {str(e)}")

# Running Jokes Management
@router.get("/jokes/{family_id}")
@rate_limit(max_requests=60, window=60)
async def get_running_jokes(
    family_id: str,
    active_only: bool = True,
    db: Session = Depends(get_db)
):
    """Get family running jokes"""
    try:
        ai_service = FamilyAIService(db)
        
        if active_only:
            jokes = await ai_service._get_active_running_jokes(family_id)
        else:
            # Get all jokes including inactive ones
            all_jokes = db.query(RunningJoke).filter(
                RunningJoke.family_id == family_id
            ).all()
            
            jokes = [
                {
                    'id': str(joke.id),
                    'title': joke.joke_title,
                    'context': joke.joke_context,
                    'trigger_words': joke.trigger_words,
                    'usage_count': joke.usage_count,
                    'effectiveness_score': joke.effectiveness_score,
                    'created_at': joke.created_at.isoformat()
                }
                for joke in all_jokes
            ]
        
        return {
            'family_id': family_id,
            'jokes': jokes,
            'count': len(jokes),
            'active_only': active_only,
            'timestamp': datetime.utcnow()
        }
        
    except Exception as e:
        logger.error(f"Error getting running jokes: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get jokes: {str(e)}")

@router.post("/jokes/create")
@rate_limit(max_requests=5, window=60)
async def create_running_joke(
    request: RunningJokeRequest,
    db: Session = Depends(get_db)
):
    """Create a new running joke"""
    try:
        new_joke = RunningJoke(
            family_id=request.family_id,
            joke_title=request.joke_title,
            joke_context=request.joke_context,
            trigger_words=request.trigger_words,
            participants=request.participants,
            appropriate_contexts=request.appropriate_contexts,
            effectiveness_score=0.5  # Start with neutral effectiveness
        )
        
        db.add(new_joke)
        db.commit()
        db.refresh(new_joke)
        
        return {
            'success': True,
            'joke_id': str(new_joke.id),
            'title': new_joke.joke_title,
            'timestamp': datetime.utcnow()
        }
        
    except Exception as e:
        logger.error(f"Error creating running joke: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create joke: {str(e)}")

# Privacy Settings Management
@router.get("/privacy/{family_id}/{member_id}")
@rate_limit(max_requests=60, window=60)
async def get_privacy_settings(
    family_id: str,
    member_id: str,
    db: Session = Depends(get_db)
):
    """Get privacy settings for a family member"""
    try:
        settings = db.query(FamilyPrivacySettings).filter(
            FamilyPrivacySettings.family_id == family_id,
            FamilyPrivacySettings.member_id == member_id
        ).first()
        
        if not settings:
            # Return default settings
            return {
                'family_id': family_id,
                'member_id': member_id,
                'settings': {
                    'default_privacy_mode': 'family',
                    'allow_ai_learning': True,
                    'allow_personality_analysis': True,
                    'allow_joke_creation': True,
                    'ai_response_style': 'balanced',
                    'preferred_language': 'en'
                },
                'is_default': True,
                'timestamp': datetime.utcnow()
            }
        
        return {
            'family_id': family_id,
            'member_id': member_id,
            'settings': {
                'default_privacy_mode': settings.default_privacy_mode,
                'allow_ai_learning': settings.allow_ai_learning,
                'allow_personality_analysis': settings.allow_personality_analysis,
                'allow_joke_creation': settings.allow_joke_creation,
                'ai_response_style': settings.ai_response_style,
                'preferred_language': settings.preferred_language,
                'history_retention_days': settings.history_retention_days
            },
            'is_default': False,
            'timestamp': datetime.utcnow()
        }
        
    except Exception as e:
        logger.error(f"Error getting privacy settings: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get privacy settings: {str(e)}")

@router.post("/privacy/update")
@rate_limit(max_requests=10, window=60)
async def update_privacy_settings(
    request: PrivacySettingsRequest,
    db: Session = Depends(get_db)
):
    """Update privacy settings for a family member"""
    try:
        settings = db.query(FamilyPrivacySettings).filter(
            FamilyPrivacySettings.family_id == request.family_id,
            FamilyPrivacySettings.member_id == request.member_id
        ).first()
        
        if not settings:
            settings = FamilyPrivacySettings(
                family_id=request.family_id,
                member_id=request.member_id
            )
            db.add(settings)
        
        # Update settings
        settings.default_privacy_mode = request.default_privacy_mode
        settings.allow_ai_learning = request.allow_ai_learning
        settings.allow_personality_analysis = request.allow_personality_analysis
        settings.allow_joke_creation = request.allow_joke_creation
        settings.ai_response_style = request.ai_response_style
        settings.preferred_language = request.preferred_language
        
        db.commit()
        
        return {
            'success': True,
            'family_id': request.family_id,
            'member_id': request.member_id,
            'updated_settings': request.dict(),
            'timestamp': datetime.utcnow()
        }
        
    except Exception as e:
        logger.error(f"Error updating privacy settings: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update privacy settings: {str(e)}")

# Analytics and Insights
@router.get("/analytics/{family_id}")
@rate_limit(max_requests=20, window=60)
async def get_family_ai_analytics(
    family_id: str,
    days: int = 30,
    db: Session = Depends(get_db)
):
    """Get AI analytics and insights for the family"""
    try:
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        # Get interaction statistics
        from family_ai_models import AIInteractionLog
        
        interactions = db.query(AIInteractionLog).filter(
            AIInteractionLog.family_id == family_id,
            AIInteractionLog.created_at >= cutoff_date
        ).all()
        
        # Calculate analytics
        total_interactions = len(interactions)
        interaction_types = {}
        avg_satisfaction = 0.0
        
        for interaction in interactions:
            interaction_type = interaction.interaction_type
            interaction_types[interaction_type] = interaction_types.get(interaction_type, 0) + 1
            
            if interaction.user_satisfaction:
                avg_satisfaction += interaction.user_satisfaction
        
        if total_interactions > 0:
            avg_satisfaction /= total_interactions
        
        return {
            'family_id': family_id,
            'period_days': days,
            'analytics': {
                'total_interactions': total_interactions,
                'interaction_types': interaction_types,
                'average_satisfaction': round(avg_satisfaction, 2),
                'active_jokes': len(await ai_service._get_active_running_jokes(family_id)),
                'personality_profiles': len(await ai_service._get_family_personalities(family_id))
            },
            'timestamp': datetime.utcnow()
        }
        
    except Exception as e:
        logger.error(f"Error getting AI analytics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get analytics: {str(e)}")
