#!/usr/bin/env python3
"""
Startup script for Elmowafiplatform API Server
"""

import subprocess
import sys
import os
from pathlib import Path

def check_dependencies():
    """Check if required dependencies are installed"""
    try:
        import fastapi
        import uvicorn
        print("[OK] FastAPI dependencies found")
        return True
    except ImportError:
        print("[ERROR] Missing dependencies. Please install:")
        print("pip install -r requirements.txt")
        return False

def start_api_server():
    """Start the unified API server"""
    print("Starting Elmowafiplatform API Server...")
    print("Server will be available at: http://localhost:8001")
    print("API Documentation: http://localhost:8001/docs")
    print("Auto-reload enabled for development")
    print("\n" + "="*50)
    
    try:
        import uvicorn
        uvicorn.run(
            "main:app",
            host="0.0.0.0",
            port=8001,
            reload=True,
            log_level="info"
        )
    except KeyboardInterrupt:
        print("\nAPI Server stopped")
    except Exception as e:
        print(f"Error starting server: {e}")

def print_startup_instructions():
    """Print instructions for running the full platform"""
    print("\n" + "="*60)
    print("ELMOWAFIPLATFORM STARTUP INSTRUCTIONS")
    print("="*60)
    print()
    print("1. API Server (This Terminal):")
    print("   - Starting automatically...")
    print("   - Available at: http://localhost:8001")
    print()
    print("2. React Frontend (New Terminal):")
    print("   cd elmowafy-travels-oasis/")
    print("   npm install  # if not done already")
    print("   npm run dev")
    print("   - Available at: http://localhost:5173")
    print()
    print("3. AI Services (Optional - New Terminal):")
    print("   cd hack2/")
    print("   pip install -r requirements.txt  # if not done already")
    print("   python family_ai_app.py")
    print("   - Available at: http://localhost:5001")
    print()
    print("4. Budget System (Optional - New Terminal):")
    print("   cd envelope-budgeting-test/")
    print("   npm install  # if not done already")
    print("   npm run dev")
    print()
    print("FEATURES READY:")
    print("- Memory Upload & AI Analysis")
    print("- Family Data Management") 
    print("- Smart Memory Timeline")
    print("- AI-Powered Search")
    print("- Travel Planning Integration")
    print()
    print("Access the platform at: http://localhost:5173/memories")
    print("="*60)

if __name__ == "__main__":
    print_startup_instructions()
    
    if not check_dependencies():
        sys.exit(1)
    
    # Change to the script directory
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    start_api_server() 