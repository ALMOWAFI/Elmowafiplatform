#!/usr/bin/env python3
"""
Game Endpoints Module for Elmowafiplatform

Provides gaming functionality and endpoints for the family platform.
Includes WebSocket support for real-time gaming experiences.
"""

import os
import json
import uuid
import asyncio
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Depends
from pydantic import BaseModel, Field

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create router for game endpoints
game_router = APIRouter(prefix="/api/games", tags=["Games"])

# Game models
class GameCreate(BaseModel):
    name: str
    game_type: str
    max_players: int = Field(default=4)
    description: Optional[str] = None
    settings: Dict[str, Any] = Field(default_factory=dict)

class GameJoin(BaseModel):
    player_name: str
    avatar: Optional[str] = None

class GameAction(BaseModel):
    action_type: str
    action_data: Dict[str, Any] = Field(default_factory=dict)

# In-memory game storage (would be replaced with database in production)
games_db = {}
active_sessions = {}

# Game endpoints
@game_router.post("/create")
async def create_game(game: GameCreate):
    """
    Create a new game session
    """
    game_id = str(uuid.uuid4())
    
    games_db[game_id] = {
        "id": game_id,
        "name": game.name,
        "game_type": game.game_type,
        "max_players": game.max_players,
        "description": game.description,
        "settings": game.settings,
        "created_at": datetime.now().isoformat(),
        "status": "waiting",
        "players": [],
        "current_state": {}
    }
    
    logger.info(f"Game created: {game_id}")
    return {"game_id": game_id, "status": "created"}

@game_router.get("/list")
async def list_games(status: Optional[str] = None):
    """
    List available games, optionally filtered by status
    """
    result = []
    
    for game_id, game in games_db.items():
        if status is None or game["status"] == status:
            result.append({
                "id": game_id,
                "name": game["name"],
                "game_type": game["game_type"],
                "max_players": game["max_players"],
                "description": game["description"],
                "status": game["status"],
                "player_count": len(game["players"])
            })
    
    return {"games": result}

@game_router.post("/{game_id}/join")
async def join_game(game_id: str, join_request: GameJoin):
    """
    Join an existing game
    """
    if game_id not in games_db:
        raise HTTPException(status_code=404, detail="Game not found")
    
    game = games_db[game_id]
    
    if len(game["players"]) >= game["max_players"]:
        raise HTTPException(status_code=400, detail="Game is full")
    
    if game["status"] != "waiting":
        raise HTTPException(status_code=400, detail="Game already started")
    
    player_id = str(uuid.uuid4())
    player = {
        "id": player_id,
        "name": join_request.player_name,
        "avatar": join_request.avatar,
        "joined_at": datetime.now().isoformat(),
        "status": "ready"
    }
    
    game["players"].append(player)
    
    logger.info(f"Player {player_id} joined game {game_id}")
    return {"player_id": player_id, "game": game}

@game_router.post("/{game_id}/start")
async def start_game(game_id: str):
    """
    Start a game that has players waiting
    """
    if game_id not in games_db:
        raise HTTPException(status_code=404, detail="Game not found")
    
    game = games_db[game_id]
    
    if len(game["players"]) < 2:
        raise HTTPException(status_code=400, detail="Not enough players")
    
    if game["status"] != "waiting":
        raise HTTPException(status_code=400, detail="Game already started or ended")
    
    game["status"] = "active"
    game["started_at"] = datetime.now().isoformat()
    
    # Initialize game state based on game type
    if game["game_type"] == "mafia":
        game["current_state"] = initialize_mafia_game(game)
    elif game["game_type"] == "trivia":
        game["current_state"] = initialize_trivia_game(game)
    elif game["game_type"] == "location_challenge":
        game["current_state"] = initialize_location_challenge(game)
    else:
        game["current_state"] = {"round": 1, "active_player": game["players"][0]["id"]}
    
    logger.info(f"Game {game_id} started")
    return {"status": "started", "game": game}

@game_router.post("/{game_id}/action")
async def game_action(game_id: str, action: GameAction):
    """
    Process a game action from a player
    """
    if game_id not in games_db:
        raise HTTPException(status_code=404, detail="Game not found")
    
    game = games_db[game_id]
    
    if game["status"] != "active":
        raise HTTPException(status_code=400, detail="Game not active")
    
    # Process action based on game type
    result = {"status": "processed", "action": action.action_type}
    
    # Update game state based on action
    # This would be more complex in a real implementation
    game["current_state"]["last_action"] = {
        "type": action.action_type,
        "data": action.action_data,
        "timestamp": datetime.now().isoformat()
    }
    
    logger.info(f"Action {action.action_type} processed for game {game_id}")
    return result

# Helper functions for game initialization
def initialize_mafia_game(game):
    """
    Initialize a Mafia game state
    """
    import random
    
    players = game["players"]
    roles = ["mafia"] * (len(players) // 3)
    roles += ["detective"]
    roles += ["doctor"]
    roles += ["villager"] * (len(players) - len(roles))
    
    random.shuffle(roles)
    
    player_roles = {}
    for i, player in enumerate(players):
        player_roles[player["id"]] = roles[i]
    
    return {
        "phase": "night",
        "round": 1,
        "player_roles": player_roles,
        "alive_players": [p["id"] for p in players],
        "votes": {},
        "messages": ["The game has started. Night falls on the village..."]
    }

def initialize_trivia_game(game):
    """
    Initialize a Trivia game state
    """
    return {
        "round": 1,
        "current_question": 0,
        "scores": {p["id"]: 0 for p in game["players"]},
        "questions": [
            {
                "text": "What is the capital of France?",
                "options": ["Paris", "London", "Berlin", "Madrid"],
                "correct": 0
            },
            {
                "text": "Which planet is known as the Red Planet?",
                "options": ["Venus", "Mars", "Jupiter", "Saturn"],
                "correct": 1
            },
            {
                "text": "What is the largest ocean on Earth?",
                "options": ["Atlantic", "Arctic", "Indian", "Pacific"],
                "correct": 3
            }
        ]
    }

def initialize_location_challenge(game):
    """
    Initialize a Location Challenge game state
    """
    return {
        "challenge_id": str(uuid.uuid4()),
        "title": "Find the Landmark",
        "description": "Take a photo of the specified landmark",
        "target_location": {
            "name": "Eiffel Tower",
            "latitude": 48.8584,
            "longitude": 2.2945
        },
        "time_limit": 3600,  # 1 hour in seconds
        "started_at": datetime.now().isoformat(),
        "completed_by": [],
        "submissions": {}
    }

# Location Challenge Models
class TargetLocation(BaseModel):
    latitude: float
    longitude: float

class LocationChallenge(BaseModel):
    challenge_name: str
    description: str = ""
    target_location: Optional[TargetLocation] = None
    target_latitude: Optional[float] = None
    target_longitude: Optional[float] = None
    radius: int = 50
    points: int = 100
    challenge_type: str = "reach_point"
    time_limit_minutes: int = 60

class LocationChallengeResponse(BaseModel):
    id: str
    challenge_name: str
    description: str
    target_location: Optional[TargetLocation] = None
    target_latitude: Optional[float] = None
    target_longitude: Optional[float] = None
    challenge_type: str
    points: int
    radius: int
    time_limit_minutes: int
    status: str
    created_at: str

# Location Challenge endpoints
@game_router.get("/{game_id}/location/challenges")
async def get_location_challenges(game_id: str):
    """
    Get all location challenges for a game
    """
    if game_id not in games_db:
        raise HTTPException(status_code=404, detail="Game not found")
    
    # Check if the game has location challenges
    if "location_challenges" not in games_db[game_id]:
        games_db[game_id]["location_challenges"] = []
    
    challenges = []
    for challenge in games_db[game_id]["location_challenges"]:
        challenges.append({
            "id": challenge["id"],
            "challenge_name": challenge["challenge_name"],
            "description": challenge.get("description", ""),
            "target_location": challenge.get("target_location", None),
            "target_latitude": challenge.get("target_latitude", None),
            "target_longitude": challenge.get("target_longitude", None),
            "challenge_type": challenge["challenge_type"],
            "points": challenge.get("points", challenge.get("points_reward", 100)),
            "radius": challenge.get("radius", challenge.get("verification_radius", 50)),
            "time_limit_minutes": challenge["time_limit_minutes"],
            "status": challenge["status"],
            "created_at": challenge["created_at"]
        })
    
    return {"challenges": challenges}

@game_router.post("/{game_id}/location/challenges")
async def create_location_challenge(game_id: str, challenge: LocationChallenge):
    """
    Create a new location challenge for a game
    """
    if game_id not in games_db:
        raise HTTPException(status_code=404, detail="Game not found")
    
    # Check if the game has location challenges
    if "location_challenges" not in games_db[game_id]:
        games_db[game_id]["location_challenges"] = []
    
    # Handle target location from either nested object or direct coordinates
    target_latitude = challenge.target_latitude
    target_longitude = challenge.target_longitude
    target_location = None
    
    if challenge.target_location:
        target_latitude = challenge.target_location.latitude
        target_longitude = challenge.target_location.longitude
        target_location = {"latitude": target_latitude, "longitude": target_longitude}
    
    challenge_id = str(uuid.uuid4())
    new_challenge = {
        "id": challenge_id,
        "challenge_name": challenge.challenge_name,
        "description": challenge.description,
        "target_location": target_location,
        "target_latitude": target_latitude,
        "target_longitude": target_longitude,
        "challenge_type": challenge.challenge_type,
        "points": challenge.points,
        "radius": challenge.radius,
        "time_limit_minutes": challenge.time_limit_minutes,
        "status": "active",
        "created_at": datetime.now().isoformat()
    }
    
    games_db[game_id]["location_challenges"].append(new_challenge)
    
    return new_challenge

@game_router.post("/location/challenges")
async def create_global_location_challenge(challenge: LocationChallenge):
    """
    Create a new global location challenge that can be used across games
    """
    # Initialize global challenges if not exists
    if "global_challenges" not in globals():
        globals()["global_challenges"] = []
        
    # Handle target location from either nested object or direct coordinates
    target_latitude = challenge.target_latitude
    target_longitude = challenge.target_longitude
    target_location = None
    
    if challenge.target_location:
        target_latitude = challenge.target_location.latitude
        target_longitude = challenge.target_location.longitude
        target_location = {"latitude": target_latitude, "longitude": target_longitude}
    
    challenge_id = str(uuid.uuid4())
    new_challenge = {
        "id": challenge_id,
        "challenge_name": challenge.challenge_name,
        "description": challenge.description,
        "target_location": target_location,
        "target_latitude": target_latitude,
        "target_longitude": target_longitude,
        "challenge_type": challenge.challenge_type,
        "points": challenge.points,
        "radius": challenge.radius,
        "time_limit_minutes": challenge.time_limit_minutes,
        "status": "active",
        "created_at": datetime.now().isoformat()
    }
    
    globals()["global_challenges"].append(new_challenge)
    
    return new_challenge

@game_router.get("/location/challenges")
async def get_global_location_challenges():
    """
    Get all global location challenges
    """
    # Initialize global challenges if not exists
    if "global_challenges" not in globals():
        globals()["global_challenges"] = []
    
    challenges = []
    for challenge in globals()["global_challenges"]:
        challenges.append({
            "id": challenge["id"],
            "challenge_name": challenge["challenge_name"],
            "description": challenge.get("description", ""),
            "target_location": challenge.get("target_location", None),
            "target_latitude": challenge.get("target_latitude", None),
            "target_longitude": challenge.get("target_longitude", None),
            "challenge_type": challenge["challenge_type"],
            "points": challenge.get("points", challenge.get("points_reward", 100)),
            "radius": challenge.get("radius", challenge.get("verification_radius", 50)),
            "time_limit_minutes": challenge["time_limit_minutes"],
            "status": challenge["status"],
            "created_at": challenge["created_at"]
        })
    
    return {"challenges": challenges}

# WebSocket connection manager for real-time gaming
class GameConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Dict[str, Any]] = {}
        self.game_rooms: Dict[str, List[str]] = {}
    
    async def connect(self, websocket: WebSocket, game_id: str, player_id: str):
        await websocket.accept()
        connection_id = str(uuid.uuid4())
        
        self.active_connections[connection_id] = {
            "websocket": websocket,
            "game_id": game_id,
            "player_id": player_id,
            "connected_at": datetime.now().isoformat()
        }
        
        if game_id not in self.game_rooms:
            self.game_rooms[game_id] = []
        
        self.game_rooms[game_id].append(connection_id)
        
        return connection_id
    
    async def disconnect(self, connection_id: str):
        if connection_id not in self.active_connections:
            return
        
        game_id = self.active_connections[connection_id]["game_id"]
        
        if game_id in self.game_rooms and connection_id in self.game_rooms[game_id]:
            self.game_rooms[game_id].remove(connection_id)
        
        del self.active_connections[connection_id]
    
    async def send_personal_message(self, message: Dict[str, Any], connection_id: str):
        if connection_id not in self.active_connections:
            return
        
        websocket = self.active_connections[connection_id]["websocket"]
        await websocket.send_json(message)
    
    async def broadcast_to_game(self, message: Dict[str, Any], game_id: str):
        if game_id not in self.game_rooms:
            return
        
        for connection_id in self.game_rooms[game_id]:
            await self.send_personal_message(message, connection_id)

# Initialize connection manager
game_manager = GameConnectionManager()

# WebSocket endpoint for real-time gaming
@game_router.websocket("/ws/{game_id}/{player_id}")
async def websocket_game_endpoint(websocket: WebSocket, game_id: str, player_id: str):
    """
    WebSocket endpoint for real-time game updates
    """
    if game_id not in games_db:
        await websocket.close(code=4004, reason="Game not found")
        return
    
    game = games_db[game_id]
    player_exists = any(p["id"] == player_id for p in game["players"])
    
    if not player_exists:
        await websocket.close(code=4003, reason="Player not in game")
        return
    
    connection_id = await game_manager.connect(websocket, game_id, player_id)
    
    try:
        # Send initial game state
        await game_manager.send_personal_message(
            {
                "type": "game_state",
                "game_id": game_id,
                "state": game["current_state"],
                "timestamp": datetime.now().isoformat()
            },
            connection_id
        )
        
        # Notify others that player connected
        await game_manager.broadcast_to_game(
            {
                "type": "player_connected",
                "game_id": game_id,
                "player_id": player_id,
                "timestamp": datetime.now().isoformat()
            },
            game_id
        )
        
        # Process messages
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Process game-specific messages
            if message.get("type") == "game_action":
                # Update game state based on action
                action_type = message.get("action_type")
                action_data = message.get("action_data", {})
                
                # Process action and update game state
                # This would be more complex in a real implementation
                game["current_state"]["last_action"] = {
                    "type": action_type,
                    "player_id": player_id,
                    "data": action_data,
                    "timestamp": datetime.now().isoformat()
                }
                
                # Broadcast updated state to all players
                await game_manager.broadcast_to_game(
                    {
                        "type": "game_update",
                        "game_id": game_id,
                        "state": game["current_state"],
                        "action": {
                            "type": action_type,
                            "player_id": player_id,
                            "data": action_data
                        },
                        "timestamp": datetime.now().isoformat()
                    },
                    game_id
                )
            
            elif message.get("type") == "chat":
                # Broadcast chat message to all players
                await game_manager.broadcast_to_game(
                    {
                        "type": "chat",
                        "game_id": game_id,
                        "player_id": player_id,
                        "message": message.get("message", ""),
                        "timestamp": datetime.now().isoformat()
                    },
                    game_id
                )
    
    except WebSocketDisconnect:
        await game_manager.disconnect(connection_id)
        
        # Notify others that player disconnected
        await game_manager.broadcast_to_game(
            {
                "type": "player_disconnected",
                "game_id": game_id,
                "player_id": player_id,
                "timestamp": datetime.now().isoformat()
            },
            game_id
        )
    
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await game_manager.disconnect(connection_id)