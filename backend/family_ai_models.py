#!/usr/bin/env python3
"""
Family AI Models - Extended database models for Master Architecture Guide
Implements family personality learning, running jokes, and family dynamics
"""

import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.sql import func

Base = declarative_base()

class FamilyPersonality(Base):
    """AI-learned personality traits for each family member"""
    __tablename__ = 'family_personalities'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    family_member_id = Column(UUID(as_uuid=True), ForeignKey('family_members.id'), nullable=False)
    
    # Core personality traits
    humor_style = Column(String(50))  # "sarcastic", "playful", "dry", "warm"
    communication_style = Column(String(50))  # "direct", "gentle", "enthusiastic", "reserved"
    interests = Column(ARRAY(String), default=list)  # ["cooking", "travel", "photography"]
    personality_traits = Column(JSONB, default=dict)  # {"forgetful": 0.8, "kind": 0.9, "adventurous": 0.7}
    
    # Behavioral patterns
    typical_responses = Column(JSONB, default=list)  # Common phrases and responses
    preferred_activities = Column(ARRAY(String), default=list)
    dislikes = Column(ARRAY(String), default=list)
    
    # Cultural context
    cultural_preferences = Column(JSONB, default=dict)  # Language preferences, cultural references
    family_role = Column(String(100))  # "patriarch", "organizer", "jokester", "peacemaker"
    
    # AI learning metadata
    confidence_score = Column(Float, default=0.0)  # How confident AI is about these traits
    last_updated_from_interaction = Column(DateTime(timezone=True))
    interaction_count = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    __table_args__ = (
        Index('idx_family_personality_member', 'family_member_id'),
        Index('idx_family_personality_updated', 'updated_at'),
    )

class RunningJoke(Base):
    """Family running jokes and humor tracking"""
    __tablename__ = 'running_jokes'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    family_id = Column(UUID(as_uuid=True), nullable=False)  # References family group
    
    # Joke content and context
    joke_title = Column(String(255), nullable=False)
    joke_context = Column(Text, nullable=False)  # The story behind the joke
    trigger_words = Column(ARRAY(String), default=list)  # Words that trigger this joke
    participants = Column(ARRAY(String), default=list)  # Family member IDs involved
    
    # Usage tracking
    usage_count = Column(Integer, default=0)
    last_used = Column(DateTime(timezone=True))
    effectiveness_score = Column(Float, default=0.0)  # How well it lands (0-1)
    
    # Context and metadata
    origin_memory_id = Column(UUID(as_uuid=True))  # Memory where this joke originated
    related_locations = Column(ARRAY(String), default=list)
    seasonal_relevance = Column(String(50))  # "always", "summer", "holidays"
    
    # AI usage guidelines
    appropriate_contexts = Column(ARRAY(String), default=list)  # When to use this joke
    avoid_contexts = Column(ARRAY(String), default=list)  # When NOT to use
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    __table_args__ = (
        Index('idx_running_joke_family', 'family_id'),
        Index('idx_running_joke_triggers', 'trigger_words'),
        Index('idx_running_joke_usage', 'usage_count'),
    )

class FamilyDynamics(Base):
    """Relationship dynamics between family members"""
    __tablename__ = 'family_dynamics'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    family_id = Column(UUID(as_uuid=True), nullable=False)
    member1_id = Column(UUID(as_uuid=True), ForeignKey('family_members.id'), nullable=False)
    member2_id = Column(UUID(as_uuid=True), ForeignKey('family_members.id'), nullable=False)
    
    # Relationship type and dynamics
    relationship_type = Column(String(100), nullable=False)  # "siblings", "parent_child", "cousins"
    interaction_style = Column(JSONB, default=dict)  # {"teasing": True, "protective": False, "competitive": True}
    
    # Communication patterns
    typical_interactions = Column(JSONB, default=list)  # Common interaction patterns
    shared_interests = Column(ARRAY(String), default=list)
    conflict_areas = Column(ARRAY(String), default=list)
    
    # AI insights
    relationship_strength = Column(Float, default=0.5)  # 0-1 scale
    communication_frequency = Column(String(50))  # "daily", "weekly", "occasional"
    influence_level = Column(Float, default=0.5)  # How much they influence each other
    
    # Context for AI responses
    appropriate_tone = Column(String(50))  # "formal", "casual", "playful", "respectful"
    shared_memories_count = Column(Integer, default=0)
    last_interaction = Column(DateTime(timezone=True))
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    __table_args__ = (
        Index('idx_family_dynamics_members', 'member1_id', 'member2_id'),
        Index('idx_family_dynamics_family', 'family_id'),
        Index('idx_family_dynamics_relationship', 'relationship_type'),
    )

class AIMemoryContext(Base):
    """AI memory context and conversation history"""
    __tablename__ = 'ai_memory_contexts'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    family_id = Column(UUID(as_uuid=True), nullable=False)
    context_type = Column(String(50), nullable=False)  # "conversation", "memory_analysis", "joke_usage"
    
    # Context data
    context_data = Column(JSONB, nullable=False)  # The actual context information
    participants = Column(ARRAY(String), default=list)  # Family members involved
    
    # Memory classification
    memory_layer = Column(String(20), nullable=False)  # "short_term", "medium_term", "long_term"
    importance_score = Column(Float, default=0.5)  # How important this context is
    
    # Usage tracking
    access_count = Column(Integer, default=0)
    last_accessed = Column(DateTime(timezone=True))
    
    # Expiration and cleanup
    expires_at = Column(DateTime(timezone=True))  # When this context should be archived
    is_archived = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    __table_args__ = (
        Index('idx_ai_memory_family', 'family_id'),
        Index('idx_ai_memory_type', 'context_type'),
        Index('idx_ai_memory_layer', 'memory_layer'),
        Index('idx_ai_memory_expires', 'expires_at'),
    )

class FamilyPrivacySettings(Base):
    """Privacy settings and modes for family interactions"""
    __tablename__ = 'family_privacy_settings'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    family_id = Column(UUID(as_uuid=True), nullable=False)
    member_id = Column(UUID(as_uuid=True), ForeignKey('family_members.id'), nullable=False)
    
    # Privacy modes
    default_privacy_mode = Column(String(20), default='family')  # "private", "family", "public"
    allow_ai_learning = Column(Boolean, default=True)
    allow_personality_analysis = Column(Boolean, default=True)
    allow_joke_creation = Column(Boolean, default=True)
    
    # Content sharing preferences
    share_memories_with = Column(ARRAY(String), default=list)  # Family member IDs
    share_location_with = Column(ARRAY(String), default=list)
    share_activities_with = Column(ARRAY(String), default=list)
    
    # AI interaction preferences
    ai_response_style = Column(String(50), default='balanced')  # "formal", "casual", "humorous", "balanced"
    preferred_language = Column(String(10), default='en')  # "en", "ar", "mixed"
    cultural_sensitivity_level = Column(String(20), default='high')  # "low", "medium", "high"
    
    # Data retention preferences
    keep_conversation_history = Column(Boolean, default=True)
    history_retention_days = Column(Integer, default=365)
    allow_data_export = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    __table_args__ = (
        Index('idx_privacy_family_member', 'family_id', 'member_id'),
        Index('idx_privacy_mode', 'default_privacy_mode'),
    )

class AIInteractionLog(Base):
    """Log of AI interactions for learning and improvement"""
    __tablename__ = 'ai_interaction_logs'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    family_id = Column(UUID(as_uuid=True), nullable=False)
    member_id = Column(UUID(as_uuid=True), ForeignKey('family_members.id'))
    
    # Interaction details
    interaction_type = Column(String(50), nullable=False)  # "chat", "memory_upload", "game_action"
    user_input = Column(Text)
    ai_response = Column(Text)
    
    # Context and analysis
    context_used = Column(JSONB, default=list)  # What context was used for the response
    personality_applied = Column(JSONB, default=dict)  # Which personality traits were applied
    jokes_referenced = Column(ARRAY(String), default=list)  # Running joke IDs used
    
    # Feedback and learning
    user_satisfaction = Column(Float)  # User rating of the response (0-1)
    response_effectiveness = Column(Float)  # How well the response worked
    learning_extracted = Column(JSONB, default=dict)  # What the AI learned from this interaction
    
    # Privacy and compliance
    privacy_mode = Column(String(20), nullable=False)
    data_retention_until = Column(DateTime(timezone=True))
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (
        Index('idx_ai_log_family', 'family_id'),
        Index('idx_ai_log_member', 'member_id'),
        Index('idx_ai_log_type', 'interaction_type'),
        Index('idx_ai_log_created', 'created_at'),
    )
