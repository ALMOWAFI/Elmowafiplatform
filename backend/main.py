#!/usr/bin/env python3
"""
Unified API Server for Elmowafiplatform
Bridges React frontend with Python AI services and provides central data management
"""

import os
import sys
import json
import uuid
import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from pathlib import Path

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import uvicorn
from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks, Form, WebSocket, WebSocketDisconnect, Depends, Request, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import aiofiles
import requests
import sqlite3

# Missing imports
try:
    from backend.helper_functions import save_uploaded_file, analyze_image_with_ai
    HELPER_FUNCTIONS_AVAILABLE = True
except ImportError:
    HELPER_FUNCTIONS_AVAILABLE = False
    
DATABASE_PATH = "data/family_platform.db"

# Import authentication
from auth import UserAuth, UserLogin, Token, get_current_user, register_user, login_user

# Import AI services from modules
try:
    from backend.facial_recognition_trainer import face_trainer
    FACE_RECOGNITION_AVAILABLE = True
except ImportError:
    print("Face recognition not available - install face-recognition package for full AI features")
    face_trainer = None
    FACE_RECOGNITION_AVAILABLE = False

try:
    from backend.photo_clustering import photo_clustering_engine
    PHOTO_CLUSTERING_AVAILABLE = True
except ImportError:
    print("Photo clustering not available - check AI dependencies")
    photo_clustering_engine = None
    PHOTO_CLUSTERING_AVAILABLE = False

# Import the data manager and AI integration
from backend.data_manager import DataManager
from backend.ai_integration import ai_integration, ai_service_proxy

# Initialize logging early (used during conditional imports below)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import AI Proxy endpoints
try:
    from backend.ai_proxy_endpoints import router as ai_proxy_router
    AI_PROXY_AVAILABLE = True
    logger.info("AI Proxy endpoints loaded successfully")
except ImportError as e:
    logger.warning(f"AI Proxy endpoints not available: {e}")
    ai_proxy_router = None
    AI_PROXY_AVAILABLE = False

# Import AI Integration endpoints
try:
    from ai_integration_endpoints import router as ai_integration_router
    AI_INTEGRATION_AVAILABLE = True
    logger.info("AI Integration endpoints loaded successfully")
except ImportError as e:
    logger.warning(f"AI Integration endpoints not available: {e}")
    ai_integration_router = None
    AI_INTEGRATION_AVAILABLE = False

# Import security features
from backend.security import (
    security_manager, rate_limit, validate_input_data,
    USER_REGISTRATION_RULES, MEMORY_CREATION_RULES, EVENT_CREATION_RULES,
    get_cors_origins
)

# Import Redis and WebSocket managers
from backend.redis_manager_simple import redis_manager, init_redis, close_redis
from backend.enhanced_redis_manager import enhanced_redis, init_enhanced_redis, close_enhanced_redis
from websocket_redis_manager import websocket_manager as redis_websocket_manager, WebSocketMessage, MessageType as RedisMessageType
# Ensure we're using the correct WebSocketManager with startup/shutdown methods
from backend.cache_middleware import CacheMiddleware

# Import API Gateway components
from backend.api_gateway import api_gateway, GatewayMiddleware, RequestLoggingMiddleware
from backend.gateway_endpoints import router as gateway_router

# Import Family AI components
try:
    from family_ai_endpoints import router as family_ai_router
    from family_ai_service import FamilyAIService
    from family_ai_models import Base as FamilyAIBase
    FAMILY_AI_AVAILABLE = True
    logger.info("Family AI components loaded successfully")
except ImportError as e:
    logger.warning(f"Family AI components not available: {e}")
    family_ai_router = None
    FAMILY_AI_AVAILABLE = False

# Import Budget endpoints
try:
    from backend.budget_endpoints import router as budget_router
    BUDGET_AVAILABLE = True
    logger.info("Budget components loaded successfully")
except ImportError as e:
    logger.warning(f"Budget components not available: {e}")
    budget_router = None
    BUDGET_AVAILABLE = False

# Initialize data manager
data_manager = DataManager()

# Initialize FastAPI app
app = FastAPI(title="Elmowafiplatform API", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add API Gateway middleware (must be first)
app.add_middleware(GatewayMiddleware)

# Add request logging middleware
app.add_middleware(RequestLoggingMiddleware)

# Add cache middleware
app.add_middleware(CacheMiddleware)

# Import v1 API router
from backend.api_v1 import router as api_v1_router

# Import GraphQL router
try:
    from backend.graphql_endpoint import router as graphql_router
    GRAPHQL_AVAILABLE = True
    logger.info("GraphQL endpoints loaded successfully")
except ImportError as e:
    logger.warning(f"GraphQL not available: {e}")
    graphql_router = None
    GRAPHQL_AVAILABLE = False

# Include Family AI endpoints if available
if FAMILY_AI_AVAILABLE and family_ai_router is not None:
    try:
        # Mount family AI router under v1
        api_v1_router.include_router(family_ai_router, prefix="/family-ai")
        logger.info("Family AI endpoints mounted under /api/v1/family-ai")
    except Exception as e:
        logger.error(f"Failed to mount Family AI router: {e}")

# Include Budget endpoints if available
if BUDGET_AVAILABLE and budget_router is not None:
    try:
        # Mount budget router under v1
        api_v1_router.include_router(budget_router, prefix="/budget")
        logger.info("Budget endpoints mounted under /api/v1/budget")
    except Exception as e:
        logger.error(f"Failed to mount Budget router: {e}")

# Include GraphQL endpoints if available
if GRAPHQL_AVAILABLE and graphql_router is not None:
    try:
        # Mount GraphQL router under v1
        api_v1_router.include_router(graphql_router, prefix="/graphql")
        logger.info("GraphQL endpoints mounted under /api/v1/graphql")
    except Exception as e:
        logger.error(f"Failed to mount GraphQL router: {e}")

# Import Service Mesh endpoints
try:
    from service_mesh_endpoints import router as service_mesh_router
    SERVICE_MESH_AVAILABLE = True
    logger.info("Service Mesh endpoints loaded successfully")
except ImportError as e:
    logger.warning(f"Service Mesh not available: {e}")
    service_mesh_router = None
    SERVICE_MESH_AVAILABLE = False

# Include Service Mesh endpoints if available
if SERVICE_MESH_AVAILABLE and service_mesh_router is not None:
    try:
        # Mount Service Mesh router under v1
        api_v1_router.include_router(service_mesh_router, prefix="/service-mesh")
        logger.info("Service Mesh endpoints mounted under /api/v1/service-mesh")
    except Exception as e:
        logger.error(f"Failed to mount Service Mesh router: {e}")

# Mount the v1 API router
app.include_router(api_v1_router, prefix="/api/v1")

# Mount the gateway router
app.include_router(gateway_router, prefix="/api/v1/gateway")

# Basic health check endpoint
@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "timestamp": str(datetime.now()), "version": "1.0.0"}

# Startup event handler
@app.on_event("startup")
async def startup_event():
    # Initialize Redis connections
    await init_redis()
    await init_enhanced_redis()
    await redis_websocket_manager.startup()
    
    # Initialize Family AI database if available
    if FAMILY_AI_AVAILABLE:
        FamilyAIBase.metadata.create_all()

# Shutdown event handler
@app.on_event("shutdown")
async def shutdown_event():
    # Close Redis connections
    await close_redis()
    await close_enhanced_redis()
    await redis_websocket_manager.shutdown()

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)