#!/usr/bin/env python3
"""
Elmowafy Travels Oasis Backend

This is the main entry point for the Elmowafy Travels Oasis backend service.
It integrates with the MongoDB database from the Node.js server and provides
API endpoints for the frontend to access both databases during migration.
"""

import os
import sys
import logging
from pathlib import Path

import uvicorn
from fastapi import FastAPI, Depends, HTTPException, Request, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

# Import MongoDB integration
from mongodb_integration import router as mongodb_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Elmowafy Travels Oasis Backend",
    description="Backend service for Elmowafy Travels Oasis platform",
    version="1.0.0",
)

# Configure CORS
origins = [
    "http://localhost:3000",  # React frontend
    "http://localhost:5173",  # Vite dev server
    "http://localhost:8000",  # FastAPI backend
    "http://localhost",       # Docker container
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"Request: {request.method} {request.url.path}")
    response = await call_next(request)
    logger.info(f"Response: {response.status_code}")
    return response

# Include routers
app.include_router(mongodb_router)

# Create a dedicated router for AI endpoints
ai_router = APIRouter(prefix="/v1/ai", tags=["ai"])

@ai_router.get("/health")
async def ai_health_check():
    try:
        # Basic health check that doesn't require database connections
        return {"status": "ok", "message": "AI Service is running"}
    except Exception as e:
        logger.error(f"AI health check failed: {e}")
        return {"status": "error", "message": str(e)}

# Include the AI router at the root level
app.include_router(ai_router)

# Also include the AI router with the /api prefix to support both URL patterns
# This creates /api/v1/ai/health endpoint
app.include_router(ai_router, prefix="/api")

# Health check endpoints
@app.get("/health")
@app.get("/api/health")
async def health_check():
    try:
        # Basic health check that doesn't require database connections
        return {"status": "ok", "message": "Elmowafy Travels Oasis Backend is running"}
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {"status": "error", "message": str(e)}

# Direct AI health check endpoints
@app.get("/v1/ai/health")
@app.get("/api/v1/ai/health")
async def direct_ai_health_check():
    try:
        # Basic health check for AI service
        return {
            "status": "ok", 
            "message": "AI Service is running",
            "service": "ai",
            "version": "1.0.0"
        }
    except Exception as e:
        logger.error(f"AI health check failed: {e}")
        return {"status": "error", "message": str(e)}

# Create static directory if it doesn't exist
static_dir = Path("static")
if not static_dir.exists():
    static_dir.mkdir(exist_ok=True)
    logger.info(f"Created static directory: {static_dir}")

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )

# Run the application
if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    
    logger.info(f"Starting Elmowafy Travels Oasis Backend on {host}:{port}")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=True,
        log_level="info",
    )