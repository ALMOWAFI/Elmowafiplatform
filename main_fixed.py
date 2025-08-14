#!/usr/bin/env python3
"""
Fixed Elmowafiplatform API with PostgreSQL and Async Operations
Complete FastAPI application with proper database handling
"""

import os
import uuid
import logging
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from pathlib import Path

# Import fixed database configuration
from database_config_fixed import db_config, get_db, get_async_db
from database_async_operations import async_db

# Import existing modules
try:
    from backend.redis_manager import RedisManager
    redis_available = True
except ImportError:
    print("Warning: Redis manager not available")
    redis_available = False

try:
    from backend.ai_services import FamilyAIAnalyzer
    ai_available = True
except ImportError:
    print("Warning: AI services not available")
    ai_available = False

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Elmowafiplatform API (Fixed)",
    description="Complete family management platform with PostgreSQL and async operations",
    version="3.1.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer(auto_error=False)

# Initialize Redis if available
redis_manager = None
if redis_available:
    try:
        redis_manager = RedisManager(
            redis_url=os.getenv("REDIS_URL", "redis://localhost:6379/0")
        )
        logger.info("Redis manager initialized")
    except Exception as e:
        logger.warning(f"Failed to initialize Redis: {e}")

# Data models
class FamilyMember(BaseModel):
    id: Optional[str] = None
    name: str
    nameArabic: Optional[str] = None
    birthDate: Optional[str] = None
    location: Optional[str] = None
    avatar: Optional[str] = None
    relationships: Optional[Dict] = {}

class Memory(BaseModel):
    id: Optional[str] = None
    title: str
    description: Optional[str] = None
    date: str
    location: Optional[str] = None
    imageUrl: Optional[str] = None
    tags: Optional[List[str]] = []
    familyMembers: Optional[List[str]] = []
    aiAnalysis: Optional[Dict] = {}

class TravelPlan(BaseModel):
    id: Optional[str] = None
    destination: str
    startDate: str
    endDate: str
    budget: Optional[float] = None
    familyMembers: List[str]
    activities: Optional[List[str]] = []
    status: str = "planning"

# Authentication (simplified for now)
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current authenticated user (simplified)"""
    # This is a simplified version - you should implement proper JWT validation
    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication required")
    return {"id": "user-123", "email": "user@example.com"}

# Database initialization
@app.on_event("startup")
async def startup_event():
    """Initialize database and services on startup"""
    try:
        # Create database tables
        db_config.create_database()
        logger.info("Database tables created/verified")
        
        # Initialize Redis if available
        if redis_manager:
            await redis_manager.connect()
            logger.info("Redis connected")
        
        # Log database status
        health_status = db_config.health_check()
        logger.info(f"Database health: {health_status}")
        
    except Exception as e:
        logger.error(f"Startup error: {e}")
        raise

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    try:
        if redis_manager and redis_manager.async_redis:
            await redis_manager.async_redis.close()
            logger.info("Redis disconnected")
    except Exception as e:
        logger.error(f"Shutdown error: {e}")

# Health check endpoint
@app.get("/api/v1/health")
async def health_check():
    """Comprehensive health check"""
    try:
        # Database health
        db_health = db_config.health_check()
        
        # Redis health
        redis_health = False
        if redis_manager:
            try:
                await redis_manager.async_redis.ping()
                redis_health = True
            except:
                pass
        
        # AI services health
        ai_health = ai_available
        
        return {
            "status": "healthy" if db_health["database"] else "unhealthy",
            "timestamp": datetime.now().isoformat(),
            "version": "3.1.0",
            "database": db_health,
            "redis": redis_health,
            "ai_services": ai_health,
            "environment": os.getenv("ENVIRONMENT", "development")
        }
    except Exception as e:
        logger.error(f"Health check error: {e}")
        return JSONResponse(
            status_code=500,
            content={"status": "unhealthy", "error": str(e)}
        )

# Database statistics
@app.get("/api/v1/stats")
async def get_database_stats(current_user: Dict = Depends(get_current_user)):
    """Get database statistics"""
    try:
        stats = await async_db.get_database_stats()
        return {
            "success": True,
            "stats": stats,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": "Failed to get statistics"}
        )

# Family Members endpoints
@app.get("/api/v1/family-members")
async def get_family_members(
    page: int = 1,
    limit: int = 50,
    search: Optional[str] = None,
    sort_by: str = "name",
    sort_order: str = "asc",
    current_user: Dict = Depends(get_current_user)
):
    """Get family members with pagination, search, and sorting"""
    try:
        offset = (page - 1) * limit
        
        result = await async_db.get_family_members_paginated(
            limit=limit,
            offset=offset,
            search=search,
            sort_by=sort_by,
            sort_order=sort_order
        )
        
        return {
            "success": True,
            "data": result,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting family members: {e}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": "Failed to load family members"}
        )

@app.get("/api/v1/family-members/{member_id}")
async def get_family_member(
    member_id: str,
    current_user: Dict = Depends(get_current_user)
):
    """Get a single family member by ID"""
    try:
        member = await async_db.get_family_member_by_id(member_id)
        
        if not member:
            return JSONResponse(
                status_code=404,
                content={"success": False, "error": "Family member not found"}
            )
        
        return {
            "success": True,
            "data": member,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting family member: {e}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": "Failed to load family member"}
        )

# Memories endpoints
@app.get("/api/v1/memories")
async def get_memories(
    page: int = 1,
    limit: int = 20,
    family_member_id: Optional[str] = None,
    search: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    tags: Optional[str] = None,
    current_user: Dict = Depends(get_current_user)
):
    """Get memories with pagination and filtering"""
    try:
        offset = (page - 1) * limit
        
        # Parse date filters
        date_from_obj = None
        date_to_obj = None
        if date_from:
            date_from_obj = datetime.fromisoformat(date_from)
        if date_to:
            date_to_obj = datetime.fromisoformat(date_to)
        
        # Parse tags
        tags_list = None
        if tags:
            tags_list = [tag.strip() for tag in tags.split(",")]
        
        result = await async_db.get_memories_paginated(
            family_member_id=family_member_id,
            limit=limit,
            offset=offset,
            search=search,
            date_from=date_from_obj,
            date_to=date_to_obj,
            tags=tags_list
        )
        
        return {
            "success": True,
            "data": result,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting memories: {e}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": "Failed to load memories"}
        )

@app.post("/api/v1/memories")
async def create_memory(
    memory: Memory,
    background_tasks: BackgroundTasks,
    current_user: Dict = Depends(get_current_user)
):
    """Create a new memory"""
    try:
        memory_data = memory.dict()
        
        # Create memory
        memory_id = await async_db.create_memory(memory_data)
        
        # Start background AI analysis if image is provided
        if memory.imageUrl and ai_available:
            background_tasks.add_task(
                analyze_image_background,
                memory.imageUrl,
                memory_id,
                memory_data.get("familyMembers", [])
            )
        
        return {
            "success": True,
            "data": {"id": memory_id},
            "message": "Memory created successfully",
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error creating memory: {e}")
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": str(e)}
        )

@app.put("/api/v1/memories/{memory_id}")
async def update_memory(
    memory_id: str,
    memory: Memory,
    current_user: Dict = Depends(get_current_user)
):
    """Update an existing memory"""
    try:
        memory_data = memory.dict()
        success = await async_db.update_memory(memory_id, memory_data)
        
        if not success:
            return JSONResponse(
                status_code=404,
                content={"success": False, "error": "Memory not found"}
            )
        
        return {
            "success": True,
            "message": "Memory updated successfully",
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error updating memory: {e}")
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": str(e)}
        )

@app.delete("/api/v1/memories/{memory_id}")
async def delete_memory(
    memory_id: str,
    current_user: Dict = Depends(get_current_user)
):
    """Delete a memory"""
    try:
        success = await async_db.delete_memory(memory_id)
        
        if not success:
            return JSONResponse(
                status_code=404,
                content={"success": False, "error": "Memory not found"}
            )
        
        return {
            "success": True,
            "message": "Memory deleted successfully",
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error deleting memory: {e}")
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": str(e)}
        )

# Background task for AI analysis
async def analyze_image_background(image_path: str, memory_id: str, family_members: List[str]):
    """Background task for AI image analysis"""
    try:
        if not ai_available:
            logger.warning("AI services not available for background analysis")
            return
        
        analyzer = FamilyAIAnalyzer()
        analysis_result = await analyzer.analyze_family_photo(image_path, family_members)
        
        # Update memory with AI analysis
        await async_db.update_memory(memory_id, {"aiAnalysis": analysis_result})
        
        logger.info(f"AI analysis completed for memory {memory_id}")
        
    except Exception as e:
        logger.error(f"Background AI analysis failed: {e}")

# File upload endpoint
@app.post("/api/v1/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: Dict = Depends(get_current_user)
):
    """Upload a file"""
    try:
        # Validate file
        if not file.filename:
            return JSONResponse(
                status_code=400,
                content={"success": False, "error": "No file provided"}
            )
        
        # Check file size (10MB limit)
        if file.size and file.size > 10 * 1024 * 1024:
            return JSONResponse(
                status_code=400,
                content={"success": False, "error": "File too large (max 10MB)"}
            )
        
        # Generate secure filename
        file_extension = Path(file.filename).suffix
        secure_filename = f"{uuid.uuid4()}{file_extension}"
        
        # Save file
        upload_dir = Path("uploads")
        upload_dir.mkdir(exist_ok=True)
        
        file_path = upload_dir / secure_filename
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        return {
            "success": True,
            "data": {
                "filename": secure_filename,
                "originalName": file.filename,
                "size": len(content),
                "url": f"/uploads/{secure_filename}"
            },
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error uploading file: {e}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": "Failed to upload file"}
        )

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Elmowafiplatform API (Fixed)",
        "version": "3.1.0",
        "status": "running",
        "database": "PostgreSQL" if db_config.is_postgres else "SQLite",
        "async_support": db_config.async_engine is not None,
        "redis": redis_manager is not None,
        "ai_services": ai_available,
        "timestamp": datetime.now().isoformat(),
        "docs": "/docs",
        "health": "/api/v1/health"
    }

if __name__ == "__main__":
    import uvicorn
    
    # Get port from environment or default
    port = int(os.getenv("PORT", 8001))
    
    # Run the application
    uvicorn.run(
        "main_fixed:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )
