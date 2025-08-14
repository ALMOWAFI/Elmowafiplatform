#!/usr/bin/env python3
"""
Startup script for Elmowafiplatform
Ensures all necessary directories and dependencies are available
"""

import os
import sys
from pathlib import Path

def setup_environment():
    """Setup necessary directories and environment"""
    # Create backend directory if it doesn't exist
    backend_dir = Path("backend")
    backend_dir.mkdir(exist_ok=True)
    
    # Create uploads directory
    uploads_dir = Path("uploads")
    uploads_dir.mkdir(exist_ok=True)
    
    # Create data directory
    data_dir = Path("data")
    data_dir.mkdir(exist_ok=True)
    
    # Create logs directory
    logs_dir = Path("logs")
    logs_dir.mkdir(exist_ok=True)
    
    print("Environment setup completed")

if __name__ == "__main__":
    setup_environment()
    
    # Import and run the main application
    from main import app
    import uvicorn
    
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)