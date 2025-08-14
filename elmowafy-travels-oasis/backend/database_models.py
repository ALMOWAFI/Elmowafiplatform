"""Database Models Module

This module defines SQLAlchemy models for the database.
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    photo = Column(String, nullable=True)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    family_members = relationship("FamilyMember", back_populates="user")

class FamilyMember(Base):
    __tablename__ = "family_members"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    arabic_name = Column(String, nullable=True)
    birth_date = Column(DateTime, nullable=True)
    location = Column(String, nullable=True)
    profile_picture = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    user = relationship("User", back_populates="family_members")
    
    family_group_id = Column(Integer, ForeignKey("family_groups.id"), nullable=True)
    family_group = relationship("FamilyGroup", back_populates="members")
    
    memories = relationship("Memory", back_populates="family_member")

class FamilyGroup(Base):
    __tablename__ = "family_groups"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    members = relationship("FamilyMember", back_populates="family_group")

class Memory(Base):
    __tablename__ = "memories"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    description = Column(Text, nullable=True)
    date = Column(DateTime, nullable=True)
    location = Column(String, nullable=True)
    media_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    family_member_id = Column(Integer, ForeignKey("family_members.id"))
    family_member = relationship("FamilyMember", back_populates="memories")

class TravelPlan(Base):
    __tablename__ = "travel_plans"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    destination = Column(JSON)
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    budget = Column(JSON, nullable=True)
    status = Column(String, default="planning")
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)