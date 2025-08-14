"""MongoDB Integration Endpoints

This module provides FastAPI endpoints to integrate with the MongoDB database
during the migration period. It allows the Python backend to access data from
the Node.js server's MongoDB database.
"""

import logging
from typing import Dict, List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from database_bridge import DatabaseBridge, get_db_bridge

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/mongodb-bridge", tags=["mongodb-bridge"])


# Pydantic models for request/response validation
class UserBase(BaseModel):
    email: str
    name: Optional[str] = None
    photo: Optional[str] = None
    active: Optional[bool] = True


class FamilyMemberBase(BaseModel):
    name: str
    arabicName: Optional[str] = None
    birthDate: Optional[str] = None
    location: Optional[str] = None
    profilePicture: Optional[str] = None
    isActive: Optional[bool] = True
    user: Optional[str] = None


class TripBase(BaseModel):
    title: str
    destination: Dict
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    budget: Optional[Dict] = None
    status: Optional[str] = "planning"
    description: Optional[str] = None
    createdBy: Optional[str] = None


class MemoryBase(BaseModel):
    title: str
    content: str
    memoryDate: Optional[str] = None
    location: Optional[str] = None
    photos: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    createdBy: Optional[str] = None
    familyMember: Optional[str] = None


# API endpoints
@router.get("/users/{email}", response_model=Dict)
async def get_user_by_email(
    email: str, db_bridge: DatabaseBridge = Depends(get_db_bridge)
):
    """Get user by email from either database."""
    user = await db_bridge.get_user_by_email(email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    return user


@router.get("/family-members/{member_id}", response_model=Dict)
async def get_family_member_by_id(
    member_id: str, db_bridge: DatabaseBridge = Depends(get_db_bridge)
):
    """Get family member by ID from either database."""
    member = await db_bridge.get_family_member_by_id(member_id)
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Family member not found"
        )
    return member


@router.get("/family-members", response_model=List[Dict])
async def get_all_family_members(db_bridge: DatabaseBridge = Depends(get_db_bridge)):
    """Get all family members from either database."""
    members = await db_bridge.get_all_family_members()
    return members


@router.get("/travel-plans/{plan_id}", response_model=Dict)
async def get_travel_plan_by_id(
    plan_id: str, db_bridge: DatabaseBridge = Depends(get_db_bridge)
):
    """Get travel plan by ID from either database."""
    plan = await db_bridge.get_travel_plan_by_id(plan_id)
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Travel plan not found"
        )
    return plan


@router.get("/travel-plans", response_model=List[Dict])
async def get_all_travel_plans(db_bridge: DatabaseBridge = Depends(get_db_bridge)):
    """Get all travel plans from either database."""
    plans = await db_bridge.get_all_travel_plans()
    return plans


@router.get("/memories/{memory_id}", response_model=Dict)
async def get_memory_by_id(
    memory_id: str, db_bridge: DatabaseBridge = Depends(get_db_bridge)
):
    """Get memory by ID from either database."""
    memory = await db_bridge.get_memory_by_id(memory_id)
    if not memory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Memory not found"
        )
    return memory


@router.get("/memories", response_model=List[Dict])
async def get_all_memories(db_bridge: DatabaseBridge = Depends(get_db_bridge)):
    """Get all memories from either database."""
    memories = await db_bridge.get_all_memories()
    return memories


@router.post("/users", response_model=Dict, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserBase, db_bridge: DatabaseBridge = Depends(get_db_bridge)
):
    """Create a new user in PostgreSQL only."""
    try:
        user = await db_bridge.create_user(user_data.dict())
        return user
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating user: {str(e)}",
        )


@router.post(
    "/family-members", response_model=Dict, status_code=status.HTTP_201_CREATED
)
async def create_family_member(
    member_data: FamilyMemberBase, db_bridge: DatabaseBridge = Depends(get_db_bridge)
):
    """Create a new family member in PostgreSQL only."""
    try:
        member = await db_bridge.create_family_member(member_data.dict())
        return member
    except Exception as e:
        logger.error(f"Error creating family member: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating family member: {str(e)}",
        )


@router.post("/travel-plans", response_model=Dict, status_code=status.HTTP_201_CREATED)
async def create_travel_plan(
    plan_data: TripBase, db_bridge: DatabaseBridge = Depends(get_db_bridge)
):
    """Create a new travel plan in PostgreSQL only."""
    try:
        plan = await db_bridge.create_travel_plan(plan_data.dict())
        return plan
    except Exception as e:
        logger.error(f"Error creating travel plan: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating travel plan: {str(e)}",
        )


@router.post("/memories", response_model=Dict, status_code=status.HTTP_201_CREATED)
async def create_memory(
    memory_data: MemoryBase, db_bridge: DatabaseBridge = Depends(get_db_bridge)
):
    """Create a new memory in PostgreSQL only."""
    try:
        memory = await db_bridge.create_memory(memory_data.dict())
        return memory
    except Exception as e:
        logger.error(f"Error creating memory: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating memory: {str(e)}",
        )


# Health check endpoint
@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "message": "MongoDB bridge is running"}