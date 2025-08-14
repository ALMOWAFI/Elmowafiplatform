#!/usr/bin/env python3
"""
Async Database Operations for Elmowafiplatform
High-performance async operations with pagination and caching
"""

import logging
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime
from sqlalchemy import select, func, desc, asc
from sqlalchemy.orm import selectinload, joinedload
from sqlalchemy.ext.asyncio import AsyncSession

# Import models and config
from database_models import (
    FamilyMember, Memory, TravelPlan, User, Budget, Transaction,
    GameSession, CulturalHeritage, Album, Photo, LocationChallenge,
    MemorySuggestion, AIAnalysisCache, family_memory_association,
    travel_participant_association, game_player_association
)
from database_config_fixed import db_config

logger = logging.getLogger(__name__)

class AsyncFamilyDatabase:
    """Async database operations for family platform with pagination and optimization"""
    
    def __init__(self):
        self.db_config = db_config
    
    async def get_family_members_paginated(
        self, 
        limit: int = 50, 
        offset: int = 0,
        search: Optional[str] = None,
        sort_by: str = "name",
        sort_order: str = "asc"
    ) -> Dict[str, Any]:
        """Get family members with pagination, search, and sorting"""
        try:
            async with self.db_config.AsyncSessionLocal() as session:
                # Build base query
                query = select(FamilyMember).options(
                    selectinload(FamilyMember.user),
                    selectinload(FamilyMember.memories),
                    selectinload(FamilyMember.travel_plans)
                )
                
                # Add search filter
                if search:
                    search_filter = (
                        FamilyMember.name.ilike(f"%{search}%") |
                        FamilyMember.name_arabic.ilike(f"%{search}%") |
                        FamilyMember.location.ilike(f"%{search}%")
                    )
                    query = query.where(search_filter)
                
                # Get total count
                count_query = select(func.count(FamilyMember.id))
                if search:
                    count_query = count_query.where(search_filter)
                total_count = await session.scalar(count_query)
                
                # Add sorting
                if sort_by == "name":
                    sort_column = FamilyMember.name
                elif sort_by == "birth_date":
                    sort_column = FamilyMember.birth_date
                elif sort_by == "location":
                    sort_column = FamilyMember.location
                else:
                    sort_column = FamilyMember.name
                
                if sort_order.lower() == "desc":
                    query = query.order_by(desc(sort_column))
                else:
                    query = query.order_by(asc(sort_column))
                
                # Add pagination
                query = query.limit(limit).offset(offset)
                
                # Execute query
                result = await session.execute(query)
                members = result.scalars().all()
                
                # Format response
                members_data = []
                for member in members:
                    member_data = {
                        "id": str(member.id),
                        "name": member.name,
                        "nameArabic": member.name_arabic,
                        "birthDate": member.birth_date.isoformat() if member.birth_date else None,
                        "location": member.location,
                        "avatar": member.avatar,
                        "relationships": member.relationships or {},
                        "user": {
                            "id": str(member.user.id),
                            "username": member.user.username,
                            "email": member.user.email,
                            "isActive": member.user.is_active
                        } if member.user else None,
                        "memoryCount": len(member.memories) if member.memories else 0,
                        "travelPlanCount": len(member.travel_plans) if member.travel_plans else 0,
                        "createdAt": member.created_at.isoformat() if member.created_at else None,
                        "updatedAt": member.updated_at.isoformat() if member.updated_at else None
                    }
                    members_data.append(member_data)
                
                return {
                    "members": members_data,
                    "pagination": {
                        "total": total_count,
                        "limit": limit,
                        "offset": offset,
                        "hasMore": (offset + limit) < total_count,
                        "totalPages": (total_count + limit - 1) // limit,
                        "currentPage": (offset // limit) + 1
                    },
                    "search": search,
                    "sortBy": sort_by,
                    "sortOrder": sort_order
                }
                
        except Exception as e:
            logger.error(f"Error getting family members: {e}")
            raise
    
    async def get_memories_paginated(
        self, 
        family_member_id: Optional[str] = None,
        limit: int = 20, 
        offset: int = 0,
        search: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        tags: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Get memories with pagination, filtering, and search"""
        try:
            async with self.db_config.AsyncSessionLocal() as session:
                # Build base query with joins
                query = select(Memory).options(
                    selectinload(Memory.family_members),
                    selectinload(Memory.photos),
                    selectinload(Memory.ai_analysis_cache)
                )
                
                # Add family member filter
                if family_member_id:
                    query = query.join(family_memory_association).where(
                        family_memory_association.c.family_member_id == family_member_id
                    )
                
                # Add search filter
                if search:
                    search_filter = (
                        Memory.title.ilike(f"%{search}%") |
                        Memory.description.ilike(f"%{search}%") |
                        Memory.location.ilike(f"%{search}%")
                    )
                    query = query.where(search_filter)
                
                # Add date range filter
                if date_from:
                    query = query.where(Memory.date >= date_from)
                if date_to:
                    query = query.where(Memory.date <= date_to)
                
                # Add tags filter
                if tags:
                    # This is a simplified tag search - you might want to implement full-text search
                    for tag in tags:
                        query = query.where(Memory.tags.contains([tag]))
                
                # Get total count
                count_query = select(func.count(Memory.id))
                if family_member_id:
                    count_query = count_query.join(family_memory_association).where(
                        family_memory_association.c.family_member_id == family_member_id
                    )
                if search:
                    count_query = count_query.where(search_filter)
                if date_from:
                    count_query = count_query.where(Memory.date >= date_from)
                if date_to:
                    count_query = count_query.where(Memory.date <= date_to)
                
                total_count = await session.scalar(count_query)
                
                # Add sorting and pagination
                query = query.order_by(desc(Memory.date)).limit(limit).offset(offset)
                
                # Execute query
                result = await session.execute(query)
                memories = result.scalars().all()
                
                # Format response
                memories_data = []
                for memory in memories:
                    memory_data = {
                        "id": str(memory.id),
                        "title": memory.title,
                        "description": memory.description,
                        "date": memory.date.isoformat() if memory.date else None,
                        "location": memory.location,
                        "imageUrl": memory.image_url,
                        "tags": memory.tags or [],
                        "familyMembers": [
                            {
                                "id": str(fm.id),
                                "name": fm.name,
                                "nameArabic": fm.name_arabic
                            }
                            for fm in memory.family_members
                        ] if memory.family_members else [],
                        "photos": [
                            {
                                "id": str(photo.id),
                                "url": photo.url,
                                "thumbnail": photo.thumbnail_url
                            }
                            for photo in memory.photos
                        ] if memory.photos else [],
                        "aiAnalysis": memory.ai_analysis or {},
                        "createdAt": memory.created_at.isoformat() if memory.created_at else None,
                        "updatedAt": memory.updated_at.isoformat() if memory.updated_at else None
                    }
                    memories_data.append(memory_data)
                
                return {
                    "memories": memories_data,
                    "pagination": {
                        "total": total_count,
                        "limit": limit,
                        "offset": offset,
                        "hasMore": (offset + limit) < total_count,
                        "totalPages": (total_count + limit - 1) // limit,
                        "currentPage": (offset // limit) + 1
                    },
                    "filters": {
                        "familyMemberId": family_member_id,
                        "search": search,
                        "dateFrom": date_from.isoformat() if date_from else None,
                        "dateTo": date_to.isoformat() if date_to else None,
                        "tags": tags
                    }
                }
                
        except Exception as e:
            logger.error(f"Error getting memories: {e}")
            raise
    
    async def create_memory(self, memory_data: Dict[str, Any]) -> str:
        """Create a new memory asynchronously"""
        try:
            async with self.db_config.AsyncSessionLocal() as session:
                # Create memory object
                memory = Memory(
                    title=memory_data.get("title", ""),
                    description=memory_data.get("description", ""),
                    date=datetime.fromisoformat(memory_data.get("date")) if memory_data.get("date") else datetime.now(),
                    location=memory_data.get("location", ""),
                    image_url=memory_data.get("imageUrl", ""),
                    tags=memory_data.get("tags", []),
                    ai_analysis=memory_data.get("aiAnalysis", {})
                )
                
                # Add family members if specified
                if memory_data.get("familyMembers"):
                    family_member_ids = memory_data["familyMembers"]
                    family_members = await session.execute(
                        select(FamilyMember).where(FamilyMember.id.in_(family_member_ids))
                    )
                    memory.family_members = family_members.scalars().all()
                
                session.add(memory)
                await session.commit()
                await session.refresh(memory)
                
                logger.info(f"Created memory: {memory.id}")
                return str(memory.id)
                
        except Exception as e:
            logger.error(f"Error creating memory: {e}")
            raise
    
    async def update_memory(self, memory_id: str, memory_data: Dict[str, Any]) -> bool:
        """Update an existing memory"""
        try:
            async with self.db_config.AsyncSessionLocal() as session:
                # Get existing memory
                memory = await session.get(Memory, memory_id)
                if not memory:
                    return False
                
                # Update fields
                if "title" in memory_data:
                    memory.title = memory_data["title"]
                if "description" in memory_data:
                    memory.description = memory_data["description"]
                if "date" in memory_data:
                    memory.date = datetime.fromisoformat(memory_data["date"])
                if "location" in memory_data:
                    memory.location = memory_data["location"]
                if "imageUrl" in memory_data:
                    memory.image_url = memory_data["imageUrl"]
                if "tags" in memory_data:
                    memory.tags = memory_data["tags"]
                if "aiAnalysis" in memory_data:
                    memory.ai_analysis = memory_data["aiAnalysis"]
                
                # Update family members if specified
                if "familyMembers" in memory_data:
                    family_member_ids = memory_data["familyMembers"]
                    family_members = await session.execute(
                        select(FamilyMember).where(FamilyMember.id.in_(family_member_ids))
                    )
                    memory.family_members = family_members.scalars().all()
                
                memory.updated_at = datetime.now()
                await session.commit()
                
                logger.info(f"Updated memory: {memory_id}")
                return True
                
        except Exception as e:
            logger.error(f"Error updating memory: {e}")
            raise
    
    async def delete_memory(self, memory_id: str) -> bool:
        """Delete a memory"""
        try:
            async with self.db_config.AsyncSessionLocal() as session:
                memory = await session.get(Memory, memory_id)
                if not memory:
                    return False
                
                await session.delete(memory)
                await session.commit()
                
                logger.info(f"Deleted memory: {memory_id}")
                return True
                
        except Exception as e:
            logger.error(f"Error deleting memory: {e}")
            raise
    
    async def get_family_member_by_id(self, member_id: str) -> Optional[Dict[str, Any]]:
        """Get a single family member by ID with all related data"""
        try:
            async with self.db_config.AsyncSessionLocal() as session:
                member = await session.execute(
                    select(FamilyMember).options(
                        selectinload(FamilyMember.user),
                        selectinload(FamilyMember.memories),
                        selectinload(FamilyMember.travel_plans),
                        selectinload(FamilyMember.game_sessions)
                    ).where(FamilyMember.id == member_id)
                )
                
                member = member.scalar_one_or_none()
                if not member:
                    return None
                
                return {
                    "id": str(member.id),
                    "name": member.name,
                    "nameArabic": member.name_arabic,
                    "birthDate": member.birth_date.isoformat() if member.birth_date else None,
                    "location": member.location,
                    "avatar": member.avatar,
                    "relationships": member.relationships or {},
                    "user": {
                        "id": str(member.user.id),
                        "username": member.user.username,
                        "email": member.user.email,
                        "isActive": member.user.is_active
                    } if member.user else None,
                    "memories": [
                        {
                            "id": str(m.id),
                            "title": m.title,
                            "date": m.date.isoformat() if m.date else None
                        }
                        for m in member.memories
                    ] if member.memories else [],
                    "travelPlans": [
                        {
                            "id": str(tp.id),
                            "destination": tp.destination,
                            "startDate": tp.start_date.isoformat() if tp.start_date else None
                        }
                        for tp in member.travel_plans
                    ] if member.travel_plans else [],
                    "createdAt": member.created_at.isoformat() if member.created_at else None,
                    "updatedAt": member.updated_at.isoformat() if member.updated_at else None
                }
                
        except Exception as e:
            logger.error(f"Error getting family member: {e}")
            raise
    
    async def get_database_stats(self) -> Dict[str, Any]:
        """Get database statistics for monitoring"""
        try:
            async with self.db_config.AsyncSessionLocal() as session:
                stats = {}
                
                # Count family members
                family_count = await session.scalar(select(func.count(FamilyMember.id)))
                stats["familyMembers"] = family_count
                
                # Count memories
                memory_count = await session.scalar(select(func.count(Memory.id)))
                stats["memories"] = memory_count
                
                # Count travel plans
                travel_count = await session.scalar(select(func.count(TravelPlan.id)))
                stats["travelPlans"] = travel_count
                
                # Count users
                user_count = await session.scalar(select(func.count(User.id)))
                stats["users"] = user_count
                
                # Count budgets
                budget_count = await session.scalar(select(func.count(Budget.id)))
                stats["budgets"] = budget_count
                
                # Count transactions
                transaction_count = await session.scalar(select(func.count(Transaction.id)))
                stats["transactions"] = transaction_count
                
                # Count game sessions
                game_count = await session.scalar(select(func.count(GameSession.id)))
                stats["gameSessions"] = game_count
                
                # Count photos
                photo_count = await session.scalar(select(func.count(Photo.id)))
                stats["photos"] = photo_count
                
                return stats
                
        except Exception as e:
            logger.error(f"Error getting database stats: {e}")
            raise

# Global async database instance
async_db = AsyncFamilyDatabase()
