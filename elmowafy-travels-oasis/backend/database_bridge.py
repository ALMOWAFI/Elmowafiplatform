"""Database Bridge Module

This module provides a bridge between MongoDB and PostgreSQL databases during the migration period.
It allows the Python backend to read from both databases and write to PostgreSQL.
"""

import os
import logging
from typing import Dict, List, Optional, Any, Union
from datetime import datetime

import motor.motor_asyncio
from pymongo import MongoClient
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select

from database_config import get_postgres_connection_string, get_sqlite_connection_string
from database_models import Base, User, FamilyMember, Memory, TravelPlan, FamilyGroup

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# MongoDB configuration
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/elmowafy")

# PostgreSQL configuration
POSTGRES_URI = get_postgres_connection_string()

# Create MongoDB clients
try:
    async_mongo_client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URI)
    async_mongo_db = async_mongo_client.get_default_database()

    sync_mongo_client = MongoClient(MONGODB_URI)
    sync_mongo_db = sync_mongo_client.get_default_database()
    logger.info("MongoDB connection established")
except Exception as e:
    logger.error(f"Error connecting to MongoDB: {e}")
    async_mongo_client = None
    async_mongo_db = None
    sync_mongo_client = None
    sync_mongo_db = None

# Create PostgreSQL engines and sessions
try:
    sync_engine = create_engine(POSTGRES_URI)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=sync_engine)

    # Use asyncpg driver for async engine
    async_postgres_uri = POSTGRES_URI.replace('postgresql://', 'postgresql+asyncpg://')
    async_engine = create_async_engine(async_postgres_uri)
    AsyncSessionLocal = sessionmaker(
        bind=async_engine, class_=AsyncSession, expire_on_commit=False
    )
    logger.info("PostgreSQL connection established")
except Exception as e:
    logger.error(f"Error connecting to PostgreSQL: {e}")
    sync_engine = None
    SessionLocal = None
    async_engine = None
    AsyncSessionLocal = None

# Create tables if they don't exist
if sync_engine:
    try:
        Base.metadata.create_all(bind=sync_engine)
        logger.info("PostgreSQL tables created if they didn't exist")
    except Exception as e:
        logger.error(f"Error creating PostgreSQL tables: {e}")


class DatabaseBridge:
    """Bridge between MongoDB and PostgreSQL databases."""

    @staticmethod
    async def get_user_by_email(email: str) -> Optional[Dict]:
        """Get user by email from either database."""
        # Try PostgreSQL first
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(User).where(User.email == email))
            user = result.scalars().first()
            if user:
                return user.__dict__

        # Fall back to MongoDB
        mongo_user = await async_mongo_db.users.find_one({"email": email})
        if mongo_user:
            # Convert MongoDB ObjectId to string
            mongo_user["_id"] = str(mongo_user["_id"])
            return mongo_user

        return None

    @staticmethod
    async def get_family_member_by_id(member_id: str) -> Optional[Dict]:
        """Get family member by ID from either database."""
        # Try PostgreSQL first
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(FamilyMember).where(FamilyMember.id == member_id))
            member = result.scalars().first()
            if member:
                return member.__dict__

        # Fall back to MongoDB
        try:
            from bson.objectid import ObjectId
            mongo_member = await async_mongo_db.familyMembers.find_one({"_id": ObjectId(member_id)})
            if mongo_member:
                # Convert MongoDB ObjectId to string
                mongo_member["_id"] = str(mongo_member["_id"])
                return mongo_member
        except Exception as e:
            logger.error(f"Error fetching from MongoDB: {e}")

        return None

    @staticmethod
    async def get_all_family_members() -> List[Dict]:
        """Get all family members from PostgreSQL, falling back to MongoDB if needed."""
        # Try PostgreSQL first
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(FamilyMember))
            members = result.scalars().all()
            if members:
                return [member.__dict__ for member in members]

        # Fall back to MongoDB
        mongo_members = []
        async for member in async_mongo_db.familyMembers.find({}):
            # Convert MongoDB ObjectId to string
            member["_id"] = str(member["_id"])
            mongo_members.append(member)

        return mongo_members

    @staticmethod
    async def get_travel_plan_by_id(plan_id: str) -> Optional[Dict]:
        """Get travel plan by ID from either database."""
        # Try PostgreSQL first
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(TravelPlan).where(TravelPlan.id == plan_id))
            plan = result.scalars().first()
            if plan:
                return plan.__dict__

        # Fall back to MongoDB
        try:
            from bson.objectid import ObjectId
            mongo_plan = await async_mongo_db.trips.find_one({"_id": ObjectId(plan_id)})
            if mongo_plan:
                # Convert MongoDB ObjectId to string
                mongo_plan["_id"] = str(mongo_plan["_id"])
                return mongo_plan
        except Exception as e:
            logger.error(f"Error fetching from MongoDB: {e}")

        return None

    @staticmethod
    async def get_all_travel_plans() -> List[Dict]:
        """Get all travel plans from PostgreSQL, falling back to MongoDB if needed."""
        # Try PostgreSQL first
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(TravelPlan))
            plans = result.scalars().all()
            if plans:
                return [plan.__dict__ for plan in plans]

        # Fall back to MongoDB
        mongo_plans = []
        async for plan in async_mongo_db.trips.find({}):
            # Convert MongoDB ObjectId to string
            plan["_id"] = str(plan["_id"])
            mongo_plans.append(plan)

        return mongo_plans

    @staticmethod
    async def get_memory_by_id(memory_id: str) -> Optional[Dict]:
        """Get memory by ID from either database."""
        # Try PostgreSQL first
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(Memory).where(Memory.id == memory_id))
            memory = result.scalars().first()
            if memory:
                return memory.__dict__

        # Fall back to MongoDB
        try:
            from bson.objectid import ObjectId
            mongo_memory = await async_mongo_db.memories.find_one({"_id": ObjectId(memory_id)})
            if mongo_memory:
                # Convert MongoDB ObjectId to string
                mongo_memory["_id"] = str(mongo_memory["_id"])
                return mongo_memory
        except Exception as e:
            logger.error(f"Error fetching from MongoDB: {e}")

        return None

    @staticmethod
    async def get_all_memories() -> List[Dict]:
        """Get all memories from PostgreSQL, falling back to MongoDB if needed."""
        # Try PostgreSQL first
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(Memory))
            memories = result.scalars().all()
            if memories:
                return [memory.__dict__ for memory in memories]

        # Fall back to MongoDB
        mongo_memories = []
        async for memory in async_mongo_db.memories.find({}):
            # Convert MongoDB ObjectId to string
            memory["_id"] = str(memory["_id"])
            mongo_memories.append(memory)

        return mongo_memories

    @staticmethod
    async def create_user(user_data: Dict) -> Dict:
        """Create a new user in PostgreSQL only."""
        async with AsyncSessionLocal() as session:
            new_user = User(
                email=user_data.get("email"),
                username=user_data.get("username") or user_data.get("email").split("@")[0],
                display_name=user_data.get("display_name") or user_data.get("name"),
                avatar_url=user_data.get("avatar_url") or user_data.get("photo"),
                password_hash=user_data.get("password_hash") or user_data.get("password"),
                is_active=user_data.get("is_active", True),
                created_at=user_data.get("created_at") or datetime.now(),
                updated_at=user_data.get("updated_at") or datetime.now(),
            )
            session.add(new_user)
            await session.commit()
            await session.refresh(new_user)
            return new_user.__dict__

    @staticmethod
    async def create_family_member(member_data: Dict) -> Dict:
        """Create a new family member in PostgreSQL only."""
        # Get or create default family group
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(FamilyGroup).where(FamilyGroup.name == "Default Family")
            )
            family_group = result.scalars().first()
            
            if not family_group:
                family_group = FamilyGroup(
                    name="Default Family",
                    description="Default family group created during migration",
                    created_at=datetime.now(),
                    updated_at=datetime.now(),
                )
                session.add(family_group)
                await session.commit()
                await session.refresh(family_group)
            
            # Create new family member
            new_member = FamilyMember(
                user_id=member_data.get("user_id"),
                family_group_id=family_group.id,
                name=member_data.get("name"),
                name_arabic=member_data.get("name_arabic") or member_data.get("arabicName"),
                birth_date=member_data.get("birth_date") or member_data.get("birthDate"),
                location=member_data.get("location"),
                avatar=member_data.get("avatar") or member_data.get("profilePicture"),
                role=member_data.get("role", "member"),
                is_active=member_data.get("is_active", True),
                created_at=member_data.get("created_at") or datetime.now(),
                updated_at=member_data.get("updated_at") or datetime.now(),
            )
            session.add(new_member)
            await session.commit()
            await session.refresh(new_member)
            return new_member.__dict__

    @staticmethod
    async def create_travel_plan(plan_data: Dict) -> Dict:
        """Create a new travel plan in PostgreSQL only."""
        async with AsyncSessionLocal() as session:
            # Get default family group
            result = await session.execute(
                select(FamilyGroup).where(FamilyGroup.name == "Default Family")
            )
            family_group = result.scalars().first()
            
            if not family_group:
                family_group = FamilyGroup(
                    name="Default Family",
                    description="Default family group created during migration",
                    created_at=datetime.now(),
                    updated_at=datetime.now(),
                )
                session.add(family_group)
                await session.commit()
                await session.refresh(family_group)
            
            # Create new travel plan
            new_plan = TravelPlan(
                user_id=plan_data.get("user_id"),
                family_group_id=family_group.id,
                destination=plan_data.get("destination"),
                start_date=plan_data.get("start_date") or plan_data.get("startDate"),
                end_date=plan_data.get("end_date") or plan_data.get("endDate"),
                budget=plan_data.get("budget", 0),
                status=plan_data.get("status", "planning"),
                notes=plan_data.get("notes") or plan_data.get("description"),
                created_at=plan_data.get("created_at") or datetime.now(),
                updated_at=plan_data.get("updated_at") or datetime.now(),
            )
            session.add(new_plan)
            await session.commit()
            await session.refresh(new_plan)
            return new_plan.__dict__

    @staticmethod
    async def create_memory(memory_data: Dict) -> Dict:
        """Create a new memory in PostgreSQL only."""
        async with AsyncSessionLocal() as session:
            new_memory = Memory(
                user_id=memory_data.get("user_id"),
                family_member_id=memory_data.get("family_member_id"),
                title=memory_data.get("title"),
                description=memory_data.get("description") or memory_data.get("content"),
                location=memory_data.get("location"),
                date=memory_data.get("date") or memory_data.get("memoryDate"),
                media_urls=memory_data.get("media_urls") or memory_data.get("photos") or [],
                tags=memory_data.get("tags") or [],
                ai_analysis=memory_data.get("ai_analysis") or {},
                created_at=memory_data.get("created_at") or datetime.now(),
                updated_at=memory_data.get("updated_at") or datetime.now(),
            )
            session.add(new_memory)
            await session.commit()
            await session.refresh(new_memory)
            return new_memory.__dict__


# Dependency to get database bridge
def get_db_bridge() -> DatabaseBridge:
    """Get database bridge instance."""
    return DatabaseBridge()


# Dependency to get database session
def get_db() -> Session:
    """Get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Async dependency to get database session
async def get_async_db() -> AsyncSession:
    """Get async database session."""
    async with AsyncSessionLocal() as session:
        yield session