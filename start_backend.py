#!/usr/bin/env python3
"""
Simple backend startup script
"""

import uvicorn
import sys
import os

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def start_server():
    """Start the FastAPI server"""
    print("Starting Elmowafiplatform Backend Server...")
    
    # Create required directories
    os.makedirs("data", exist_ok=True)
    os.makedirs("data/uploads", exist_ok=True)
    os.makedirs("data/memories", exist_ok=True)
    os.makedirs("data/analysis", exist_ok=True)
    os.makedirs("logs", exist_ok=True)
    
    # Import and create the app
    from backend.main import app
    
    print("Server starting on http://localhost:8000")
    print("API documentation available at http://localhost:8000/docs")
    print("Press Ctrl+C to stop the server")
    
    # Start server without reload to avoid issues
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")

if __name__ == "__main__":
    start_server()