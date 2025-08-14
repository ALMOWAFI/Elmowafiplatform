#!/usr/bin/env python3
"""
PostgreSQL Database Models for Elmowafiplatform
SQLAlchemy models with comprehensive financial management, family data, and AI features
"""

import uuid
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from decimal import Decimal
from enum import Enum as PyEnum

from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Text, 
    ForeignKey, Table, Numeric, Enum, Index, UniqueConstraint
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, Session
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.sql import func

Base = declarative_base()

# Enums for better type safety
class TransactionType(PyEnum):
    INCOME = "income"
    EXPENSE = "expense"
    TRANSFER = "transfer"

class BudgetPeriod(PyEnum):
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"

class GameStatus(PyEnum):
    SETUP = "setup"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class VerificationStatus(PyEnum):
    PENDING = "pending"
    VERIFIED = "verified"
    FAILED = "failed"
    SUSPICIOUS = "suspicious"

# Association tables for many-to-many relationships
family_memory_association = Table(
    'family_memory_association',
    Base.metadata,
    Column('family_member_id', UUID(as_uuid=True), ForeignKey('family_members.id')),
    Column('memory_id', UUID(as_uuid=True), ForeignKey('memories.id'))
)

travel_participant_association = Table(
    'travel_participant_association',
    Base.metadata,
    Column('travel_plan_id', UUID(as_uuid=True), ForeignKey('travel_plans.id')),
    Column('family_member_id', UUID(as_uuid=True), ForeignKey('family_members.id'))
)

game_player_association = Table(
    'game_player_association',
    Base.metadata,
    Column('game_session_id', UUID(as_uuid=True), ForeignKey('game_sessions.id')),
    Column('family_member_id', UUID(as_uuid=True), ForeignKey('family_members.id'))
)

# Core Models
class User(Base):
    __tablename__ = 'users'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    family_member_id = Column(UUID(as_uuid=True), ForeignKey('family_members.id'))
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login = Column(DateTime(timezone=True))
    
    # Relationships
    family_member = relationship("FamilyMember", back_populates="user")
    budgets = relationship("Budget", back_populates="created_by_user")
    transactions = relationship("Transaction", back_populates="created_by_user")

class FamilyMember(Base):
    __tablename__ = 'family_members'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    name_arabic = Column(String(100))
    birth_date = Column(DateTime)
    location = Column(String(255))
    avatar = Column(String(500))  # URL to avatar image
    phone = Column(String(20))
    bio = Column(Text)
    bio_arabic = Column(Text)
    
    # Family relationships stored as JSONB
    relationships = Column(JSONB, default=list)
    
    # Financial preferences
    default_currency = Column(String(3), default='USD')
    timezone = Column(String(50), default='UTC')
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="family_member", uselist=False)
    memories = relationship("Memory", secondary=family_memory_association, back_populates="family_members")
    travel_plans = relationship("TravelPlan", secondary=travel_participant_association, back_populates="participants")
    game_sessions = relationship("GameSession", secondary=game_player_association, back_populates="players")
    transactions = relationship("Transaction", back_populates="family_member")
    account_memberships = relationship("AccountMember", back_populates="family_member")

# Financial Management Models
class Account(Base):
    __tablename__ = 'accounts'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    account_type = Column(String(50), nullable=False)  # checking, savings, investment, cash
    currency = Column(String(3), default='USD')
    initial_balance = Column(Numeric(15, 2), default=0)
    current_balance = Column(Numeric(15, 2), default=0)
    
    # External account integration
    bank_name = Column(String(100))
    account_number_masked = Column(String(20))  # Last 4 digits only
    plaid_account_id = Column(String(100))
    plaid_access_token = Column(String(500))
    
    # Account settings
    is_active = Column(Boolean, default=True)
    is_shared = Column(Boolean, default=False)
    icon = Column(String(50), default='bank')
    color = Column(String(7), default='#3B82F6')  # Hex color
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    members = relationship("AccountMember", back_populates="account")
    transactions = relationship("Transaction", back_populates="account")
    budgets = relationship("Budget", back_populates="account")

class AccountMember(Base):
    __tablename__ = 'account_members'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_id = Column(UUID(as_uuid=True), ForeignKey('accounts.id'), nullable=False)
    family_member_id = Column(UUID(as_uuid=True), ForeignKey('family_members.id'), nullable=False)
    role = Column(String(20), default='member')  # owner, admin, member, viewer
    permissions = Column(JSONB, default=dict)  # View, create, edit, delete transactions
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    account = relationship("Account", back_populates="members")
    family_member = relationship("FamilyMember", back_populates="account_memberships")

class Category(Base):
    __tablename__ = 'categories'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    name_arabic = Column(String(100))
    parent_id = Column(UUID(as_uuid=True), ForeignKey('categories.id'))  # For subcategories
    icon = Column(String(50), default='folder')
    color = Column(String(7), default='#6B7280')
    description = Column(Text)
    
    # Category type
    is_income_category = Column(Boolean, default=False)
    is_system_category = Column(Boolean, default=False)  # Cannot be deleted
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    parent = relationship("Category", remote_side=[id])
    subcategories = relationship("Category")
    transactions = relationship("Transaction", back_populates="category")
    budget_categories = relationship("BudgetCategory", back_populates="category")

class Transaction(Base):
    __tablename__ = 'transactions'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_id = Column(UUID(as_uuid=True), ForeignKey('accounts.id'), nullable=False)
    category_id = Column(UUID(as_uuid=True), ForeignKey('categories.id'))
    family_member_id = Column(UUID(as_uuid=True), ForeignKey('family_members.id'))
    created_by_user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    
    # Transaction details
    type = Column(Enum(TransactionType), nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    currency = Column(String(3), default='USD')
    description = Column(String(255), nullable=False)
    notes = Column(Text)
    
    # Transaction timing
    transaction_date = Column(DateTime(timezone=True), nullable=False)
    
    # External transaction data
    external_id = Column(String(100))  # For bank/Plaid integration
    plaid_transaction_id = Column(String(100))
    
    # Receipt and proof
    receipt_url = Column(String(500))
    receipt_metadata = Column(JSONB, default=dict)
    
    # Location and context
    location = Column(String(255))
    latitude = Column(Float)
    longitude = Column(Float)
    merchant_name = Column(String(100))
    
    # AI analysis
    ai_categorized = Column(Boolean, default=False)
    ai_confidence = Column(Float)
    ai_analysis = Column(JSONB, default=dict)
    
    # Status and verification
    is_verified = Column(Boolean, default=False)
    is_recurring = Column(Boolean, default=False)
    recurring_rule_id = Column(UUID(as_uuid=True), ForeignKey('recurring_transactions.id'))
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    account = relationship("Account", back_populates="transactions")
    category = relationship("Category", back_populates="transactions")
    family_member = relationship("FamilyMember", back_populates="transactions")
    created_by_user = relationship("User", back_populates="transactions")
    recurring_rule = relationship("RecurringTransaction", back_populates="transactions")
    
    # Indexes
    __table_args__ = (
        Index('idx_transaction_date', 'transaction_date'),
        Index('idx_transaction_account_date', 'account_id', 'transaction_date'),
        Index('idx_transaction_category', 'category_id'),
        Index('idx_transaction_external', 'external_id'),
    )

class RecurringTransaction(Base):
    __tablename__ = 'recurring_transactions'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_id = Column(UUID(as_uuid=True), ForeignKey('accounts.id'), nullable=False)
    category_id = Column(UUID(as_uuid=True), ForeignKey('categories.id'))
    family_member_id = Column(UUID(as_uuid=True), ForeignKey('family_members.id'))
    
    # Recurring transaction template
    type = Column(Enum(TransactionType), nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    currency = Column(String(3), default='USD')
    description = Column(String(255), nullable=False)
    
    # Recurrence pattern
    frequency = Column(String(20), nullable=False)  # daily, weekly, monthly, yearly
    interval_amount = Column(Integer, default=1)  # Every N days/weeks/months
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True))
    next_due_date = Column(DateTime(timezone=True))
    
    # Status
    is_active = Column(Boolean, default=True)
    auto_create = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    transactions = relationship("Transaction", back_populates="recurring_rule")

class Budget(Base):
    __tablename__ = 'budgets'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    account_id = Column(UUID(as_uuid=True), ForeignKey('accounts.id'))
    created_by_user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    
    # Budget period
    period_type = Column(Enum(BudgetPeriod), nullable=False)
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=False)
    
    # Budget settings
    total_budget = Column(Numeric(15, 2), nullable=False)
    currency = Column(String(3), default='USD')
    rollover_unused = Column(Boolean, default=False)
    
    # Status
    is_active = Column(Boolean, default=True)
    is_template = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    account = relationship("Account", back_populates="budgets")
    created_by_user = relationship("User", back_populates="budgets")
    categories = relationship("BudgetCategory", back_populates="budget")

class BudgetCategory(Base):
    __tablename__ = 'budget_categories'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    budget_id = Column(UUID(as_uuid=True), ForeignKey('budgets.id'), nullable=False)
    category_id = Column(UUID(as_uuid=True), ForeignKey('categories.id'), nullable=False)
    
    # Budget allocation
    allocated_amount = Column(Numeric(15, 2), nullable=False)
    spent_amount = Column(Numeric(15, 2), default=0)
    
    # Settings
    alert_threshold = Column(Float, default=0.8)  # Alert at 80% of budget
    is_flexible = Column(Boolean, default=True)  # Can exceed budget
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    budget = relationship("Budget", back_populates="categories")
    category = relationship("Category", back_populates="budget_categories")

class SavingsGoal(Base):
    __tablename__ = 'savings_goals'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    target_amount = Column(Numeric(15, 2), nullable=False)
    current_amount = Column(Numeric(15, 2), default=0)
    currency = Column(String(3), default='USD')
    
    # Goal timeline
    target_date = Column(DateTime(timezone=True))
    created_by_user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    
    # Goal settings
    is_shared_goal = Column(Boolean, default=False)
    icon = Column(String(50), default='piggy-bank')
    color = Column(String(7), default='#10B981')
    
    # Status
    is_completed = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    completed_at = Column(DateTime(timezone=True))

# Existing models adapted for PostgreSQL
class Memory(Base):
    __tablename__ = 'memories'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    memory_date = Column(DateTime(timezone=True), nullable=False)
    location = Column(String(255))
    
    # Media
    image_url = Column(String(500))
    image_metadata = Column(JSONB, default=dict)
    tags = Column(ARRAY(String), default=list)
    
    # AI Analysis
    ai_analysis = Column(JSONB, default=dict)
    ai_generated_title = Column(String(255))
    ai_generated_description = Column(Text)
    
    # Privacy and sharing
    is_private = Column(Boolean, default=False)
    shared_with = Column(ARRAY(String), default=list)  # User IDs
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    family_members = relationship("FamilyMember", secondary=family_memory_association, back_populates="memories")

class TravelPlan(Base):
    __tablename__ = 'travel_plans'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    destination = Column(String(255), nullable=False)
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=False)
    
    # Budget and costs
    estimated_budget = Column(Numeric(15, 2))
    actual_cost = Column(Numeric(15, 2), default=0)
    currency = Column(String(3), default='USD')
    
    # Travel details
    activities = Column(JSONB, default=list)
    accommodations = Column(JSONB, default=dict)
    transportation = Column(JSONB, default=dict)
    
    # Planning status
    status = Column(String(20), default='planning')  # planning, booked, active, completed, cancelled
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    participants = relationship("FamilyMember", secondary=travel_participant_association, back_populates="travel_plans")

class GameSession(Base):
    __tablename__ = 'game_sessions'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    game_type = Column(String(50), nullable=False)
    status = Column(Enum(GameStatus), default=GameStatus.SETUP)
    
    # Game configuration
    game_state = Column(JSONB, default=dict)
    settings = Column(JSONB, default=dict)
    current_phase = Column(String(50), default='setup')
    
    # AI Game Master
    ai_decisions = Column(JSONB, default=list)
    ai_personality = Column(String(50), default='friendly')
    difficulty_level = Column(Integer, default=1)
    
    # Game progress
    score_data = Column(JSONB, default=dict)
    achievements = Column(JSONB, default=list)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    completed_at = Column(DateTime(timezone=True))
    
    # Relationships
    players = relationship("FamilyMember", secondary=game_player_association, back_populates="game_sessions")
    location_challenges = relationship("LocationChallenge", back_populates="game_session")

class LocationChallenge(Base):
    __tablename__ = 'location_challenges'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    game_session_id = Column(UUID(as_uuid=True), ForeignKey('game_sessions.id'), nullable=False)
    challenge_name = Column(String(255), nullable=False)
    
    # Target location
    target_location = Column(String(255), nullable=False)
    target_latitude = Column(Float, nullable=False)
    target_longitude = Column(Float, nullable=False)
    verification_radius_meters = Column(Float, default=50.0)
    
    # Challenge details
    challenge_type = Column(String(50), nullable=False)
    points_reward = Column(Integer, default=100)
    time_limit_minutes = Column(Integer, default=60)
    requirements = Column(JSONB, default=dict)
    
    # Status
    status = Column(String(20), default='active')
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True))
    
    # Relationships
    game_session = relationship("GameSession", back_populates="location_challenges")
    verifications = relationship("LocationVerification", back_populates="challenge")

class LocationVerification(Base):
    __tablename__ = 'location_verifications'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    player_id = Column(UUID(as_uuid=True), ForeignKey('family_members.id'), nullable=False)
    game_session_id = Column(UUID(as_uuid=True), ForeignKey('game_sessions.id'), nullable=False)
    challenge_id = Column(UUID(as_uuid=True), ForeignKey('location_challenges.id'))
    
    # Location data
    target_latitude = Column(Float, nullable=False)
    target_longitude = Column(Float, nullable=False)
    actual_latitude = Column(Float, nullable=False)
    actual_longitude = Column(Float, nullable=False)
    distance_meters = Column(Float)
    
    # Verification results
    verification_status = Column(Enum(VerificationStatus), nullable=False)
    photo_evidence_path = Column(String(500))
    gps_metadata = Column(JSONB, default=dict)
    spoofing_detected = Column(Boolean, default=False)
    points_awarded = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    challenge = relationship("LocationChallenge", back_populates="verifications")

# Cultural and AI features
class CulturalHeritage(Base):
    __tablename__ = 'cultural_heritage'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    title_arabic = Column(String(255))
    description = Column(Text)
    description_arabic = Column(Text)
    
    # Classification
    category = Column(String(50), default='tradition')
    cultural_significance = Column(Text)
    tags = Column(ARRAY(String), default=list)
    
    # Associated family members
    family_members = Column(JSONB, default=list)
    
    # Preservation
    preservation_date = Column(DateTime(timezone=True))
    preservation_method = Column(String(100))
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Album(Base):
    __tablename__ = 'albums'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    cover_memory_id = Column(UUID(as_uuid=True), ForeignKey('memories.id'))
    
    # Album configuration
    album_type = Column(String(50), default='manual')
    clustering_algorithm = Column(String(50))
    memory_ids = Column(ARRAY(String), default=list)
    
    # AI and metadata
    family_members = Column(JSONB, default=list)
    tags = Column(ARRAY(String), default=list)
    ai_generated = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

# Analytics and insights
class FinancialInsight(Base):
    __tablename__ = 'financial_insights'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    insight_type = Column(String(50), nullable=False)  # spending_pattern, budget_alert, saving_opportunity
    
    # Insight data
    title = Column(String(255), nullable=False)
    description = Column(Text)
    data = Column(JSONB, default=dict)
    priority = Column(String(20), default='medium')  # low, medium, high, critical
    
    # User interaction
    is_read = Column(Boolean, default=False)
    is_dismissed = Column(Boolean, default=False)
    action_taken = Column(String(100))
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True))

# Notification system
class Notification(Base):
    __tablename__ = 'notifications'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    notification_type = Column(String(50), nullable=False)
    
    # Notification content
    title = Column(String(255), nullable=False)
    message = Column(Text)
    data = Column(JSONB, default=dict)
    
    # Delivery settings
    priority = Column(String(20), default='normal')
    channels = Column(ARRAY(String), default=list)  # email, push, sms, in_app
    
    # Status
    is_read = Column(Boolean, default=False)
    is_sent = Column(Boolean, default=False)
    sent_at = Column(DateTime(timezone=True))
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True))

# Performance and caching
class AnalyticsCache(Base):
    __tablename__ = 'analytics_cache'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cache_key = Column(String(255), unique=True, nullable=False, index=True)
    cache_type = Column(String(50), nullable=False)  # financial_summary, spending_trends, budget_analysis
    
    # Cache data
    data = Column(JSONB, nullable=False)
    cache_metadata = Column(JSONB, default=dict)  # This is already correctly named to avoid conflict with SQLAlchemy's reserved 'metadata' attribute
    
    # Cache management
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    account_id = Column(UUID(as_uuid=True), ForeignKey('accounts.id'))
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    accessed_at = Column(DateTime(timezone=True))
    access_count = Column(Integer, default=0)