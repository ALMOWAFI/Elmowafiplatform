#!/usr/bin/env python3
"""
Game Endpoints Module for Elmowafiplatform

Provides gaming functionality and endpoints for the family platform.
Includes WebSocket support for real-time gaming experiences.

This file imports the game_router from the backend directory.
"""

import sys
import os

# Add backend directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

# Import game_router from backend
try:
    from backend.game_endpoints import game_router
except ImportError as e:
    print(f"Error importing game_router from backend: {e}")
    # Create a dummy router if import fails
    from fastapi import APIRouter
    game_router = APIRouter(prefix="/api/games", tags=["Games"])