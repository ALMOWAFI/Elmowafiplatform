#!/usr/bin/env python3
"""
Real-time WebSocket Manager for Elmowafiplatform
Handles live family collaboration, gaming, and memory sharing
"""

import json
import uuid
import asyncio
import logging
from datetime import datetime
from typing import Dict, List, Set, Any, Optional
from fastapi import WebSocket, WebSocketDisconnect
from enum import Enum

logger = logging.getLogger(__name__)

class ConnectionType(Enum):
    FAMILY_MEMBER = "family_member"
    GAME_PLAYER = "game_player"
    TRAVEL_PLANNER = "travel_planner"
    MEMORY_VIEWER = "memory_viewer"

class MessageType(Enum):
    # Family collaboration
    FAMILY_JOIN = "family_join"
    FAMILY_LEAVE = "family_leave"
    MEMORY_SHARED = "memory_shared"
    MEMORY_UPDATED = "memory_updated"
    MEMORY_LIKED = "memory_liked"
    MEMORY_COMMENTED = "memory_commented"
    
    # Travel planning
    TRAVEL_PLAN_UPDATED = "travel_plan_updated"
    TRAVEL_SUGGESTION = "travel_suggestion"
    TRAVEL_VOTE = "travel_vote"
    LOCATION_SHARED = "location_shared"
    
    # Gaming
    GAME_STARTED = "game_started"
    GAME_STATE_CHANGED = "game_state_changed"
    PLAYER_ACTION = "player_action"
    GAME_MESSAGE = "game_message"
    GAME_ENDED = "game_ended"
    
    # Real-time updates
    TYPING_INDICATOR = "typing_indicator"
    USER_STATUS = "user_status"
    NOTIFICATION = "notification"
    SYSTEM_MESSAGE = "system_message"

class WebSocketConnection:
    def __init__(self, websocket: WebSocket, user_id: str, connection_type: ConnectionType):
        self.websocket = websocket
        self.user_id = user_id
        self.connection_id = str(uuid.uuid4())
        self.connection_type = connection_type
        self.connected_at = datetime.now()
        self.last_activity = datetime.now()
        self.current_room = None
        self.metadata = {}

class WebSocketManager:
    """Manages WebSocket connections for real-time family collaboration"""
    
    def __init__(self):
        # Store active connections
        self.connections: Dict[str, WebSocketConnection] = {}
        
        # Room-based organization
        self.family_rooms: Dict[str, Set[str]] = {}  # family_id -> connection_ids
        self.game_rooms: Dict[str, Set[str]] = {}    # game_id -> connection_ids
        self.travel_rooms: Dict[str, Set[str]] = {}  # travel_plan_id -> connection_ids
        self.memory_rooms: Dict[str, Set[str]] = {}  # memory_id -> connection_ids
        
        # User presence tracking
        self.user_presence: Dict[str, Dict[str, Any]] = {}  # user_id -> presence_info
        
        # Message queue for offline users
        self.pending_messages: Dict[str, List[Dict]] = {}  # user_id -> messages
    
    async def connect(self, websocket: WebSocket, user_id: str, connection_type: ConnectionType, metadata: Dict = None):
        """Accept new WebSocket connection"""
        await websocket.accept()
        
        connection = WebSocketConnection(websocket, user_id, connection_type)
        connection.metadata = metadata or {}
        
        self.connections[connection.connection_id] = connection
        
        # Update user presence
        self.user_presence[user_id] = {
            "status": "online",
            "last_seen": datetime.now().isoformat(),
            "connection_type": connection_type.value,
            "metadata": metadata or {}
        }
        
        # Send pending messages if any
        if user_id in self.pending_messages:
            for message in self.pending_messages[user_id]:
                await self.send_to_connection(connection.connection_id, message)
            del self.pending_messages[user_id]
        
        # Notify about user coming online
        await self._broadcast_user_status(user_id, "online")
        
        logger.info(f"User {user_id} connected with connection {connection.connection_id}")
        return connection.connection_id
    
    async def disconnect(self, connection_id: str):
        """Handle connection disconnect"""
        if connection_id in self.connections:
            connection = self.connections[connection_id]
            user_id = connection.user_id
            
            # Remove from all rooms
            await self._leave_all_rooms(connection_id)
            
            # Remove connection
            del self.connections[connection_id]
            
            # Update user presence if no other connections
            user_connections = [c for c in self.connections.values() if c.user_id == user_id]
            if not user_connections:
                self.user_presence[user_id] = {
                    "status": "offline",
                    "last_seen": datetime.now().isoformat(),
                    "connection_type": connection.connection_type.value,
                    "metadata": connection.metadata
                }
                await self._broadcast_user_status(user_id, "offline")
            
            logger.info(f"User {user_id} disconnected (connection {connection_id})")
    
    async def join_room(self, connection_id: str, room_type: str, room_id: str):
        """Join a specific room for targeted messaging"""
        if connection_id not in self.connections:
            return False
        
        connection = self.connections[connection_id]
        
        # Add to appropriate room
        if room_type == "family":
            if room_id not in self.family_rooms:
                self.family_rooms[room_id] = set()
            self.family_rooms[room_id].add(connection_id)
        elif room_type == "game":
            if room_id not in self.game_rooms:
                self.game_rooms[room_id] = set()
            self.game_rooms[room_id].add(connection_id)
        elif room_type == "travel":
            if room_id not in self.travel_rooms:
                self.travel_rooms[room_id] = set()
            self.travel_rooms[room_id].add(connection_id)
        elif room_type == "memory":
            if room_id not in self.memory_rooms:
                self.memory_rooms[room_id] = set()
            self.memory_rooms[room_id].add(connection_id)
        
        connection.current_room = f"{room_type}:{room_id}"
        
        # Notify room about new member
        await self.broadcast_to_room(room_type, room_id, {
            "type": MessageType.FAMILY_JOIN.value,
            "user_id": connection.user_id,
            "timestamp": datetime.now().isoformat(),
            "room_id": room_id
        }, exclude_connections={connection_id})
        
        return True
    
    async def leave_room(self, connection_id: str, room_type: str, room_id: str):
        """Leave a specific room"""
        if connection_id not in self.connections:
            return False
        
        connection = self.connections[connection_id]
        
        # Remove from room
        if room_type == "family" and room_id in self.family_rooms:
            self.family_rooms[room_id].discard(connection_id)
            if not self.family_rooms[room_id]:
                del self.family_rooms[room_id]
        elif room_type == "game" and room_id in self.game_rooms:
            self.game_rooms[room_id].discard(connection_id)
            if not self.game_rooms[room_id]:
                del self.game_rooms[room_id]
        elif room_type == "travel" and room_id in self.travel_rooms:
            self.travel_rooms[room_id].discard(connection_id)
            if not self.travel_rooms[room_id]:
                del self.travel_rooms[room_id]
        elif room_type == "memory" and room_id in self.memory_rooms:
            self.memory_rooms[room_id].discard(connection_id)
            if not self.memory_rooms[room_id]:
                del self.memory_rooms[room_id]
        
        connection.current_room = None
        
        # Notify room about member leaving
        await self.broadcast_to_room(room_type, room_id, {
            "type": MessageType.FAMILY_LEAVE.value,
            "user_id": connection.user_id,
            "timestamp": datetime.now().isoformat(),
            "room_id": room_id
        })
        
        return True
    
    async def send_to_connection(self, connection_id: str, message: Dict[str, Any]):
        """Send message to specific connection"""
        if connection_id in self.connections:
            connection = self.connections[connection_id]
            try:
                await connection.websocket.send_text(json.dumps(message))
                connection.last_activity = datetime.now()
                return True
            except Exception as e:
                logger.error(f"Error sending message to connection {connection_id}: {e}")
                await self.disconnect(connection_id)
                return False
        return False
    
    async def send_to_user(self, user_id: str, message: Dict[str, Any]):
        """Send message to all connections of a specific user"""
        user_connections = [c for c in self.connections.values() if c.user_id == user_id]
        
        if user_connections:
            success_count = 0
            for connection in user_connections:
                if await self.send_to_connection(connection.connection_id, message):
                    success_count += 1
            return success_count > 0
        else:
            # User is offline, queue message
            if user_id not in self.pending_messages:
                self.pending_messages[user_id] = []
            self.pending_messages[user_id].append(message)
            return True
    
    async def broadcast_to_room(self, room_type: str, room_id: str, message: Dict[str, Any], exclude_connections: Set[str] = None):
        """Broadcast message to all connections in a room"""
        exclude_connections = exclude_connections or set()
        
        room_connections = set()
        if room_type == "family" and room_id in self.family_rooms:
            room_connections = self.family_rooms[room_id]
        elif room_type == "game" and room_id in self.game_rooms:
            room_connections = self.game_rooms[room_id]
        elif room_type == "travel" and room_id in self.travel_rooms:
            room_connections = self.travel_rooms[room_id]
        elif room_type == "memory" and room_id in self.memory_rooms:
            room_connections = self.memory_rooms[room_id]
        
        success_count = 0
        for connection_id in room_connections:
            if connection_id not in exclude_connections:
                if await self.send_to_connection(connection_id, message):
                    success_count += 1
        
        return success_count
    
    async def broadcast_to_family(self, family_id: str, message: Dict[str, Any]):
        """Broadcast to all family members"""
        return await self.broadcast_to_room("family", family_id, message)
    
    async def process_message(self, connection_id: str, message_data: Dict[str, Any]):
        """Process incoming WebSocket message"""
        if connection_id not in self.connections:
            return
        
        connection = self.connections[connection_id]
        message_type = message_data.get("type")
        
        try:
            if message_type == MessageType.MEMORY_SHARED.value:
                await self._handle_memory_shared(connection, message_data)
            elif message_type == MessageType.MEMORY_LIKED.value:
                await self._handle_memory_liked(connection, message_data)
            elif message_type == MessageType.MEMORY_COMMENTED.value:
                await self._handle_memory_commented(connection, message_data)
            elif message_type == MessageType.TRAVEL_PLAN_UPDATED.value:
                await self._handle_travel_plan_updated(connection, message_data)
            elif message_type == MessageType.TRAVEL_VOTE.value:
                await self._handle_travel_vote(connection, message_data)
            elif message_type == MessageType.LOCATION_SHARED.value:
                await self._handle_location_shared(connection, message_data)
            elif message_type == MessageType.PLAYER_ACTION.value:
                await self._handle_player_action(connection, message_data)
            elif message_type == MessageType.TYPING_INDICATOR.value:
                await self._handle_typing_indicator(connection, message_data)
            else:
                logger.warning(f"Unknown message type: {message_type}")
                
        except Exception as e:
            logger.error(f"Error processing message from {connection_id}: {e}")
            await self.send_to_connection(connection_id, {
                "type": MessageType.SYSTEM_MESSAGE.value,
                "message": "Error processing your message",
                "timestamp": datetime.now().isoformat()
            })
    
    async def _handle_memory_shared(self, connection: WebSocketConnection, message_data: Dict):
        """Handle memory sharing event"""
        memory_id = message_data.get("memory_id")
        family_id = message_data.get("family_id")
        
        if memory_id and family_id:
            # Broadcast to family members
            await self.broadcast_to_family(family_id, {
                "type": MessageType.MEMORY_SHARED.value,
                "memory_id": memory_id,
                "shared_by": connection.user_id,
                "timestamp": datetime.now().isoformat(),
                "message": message_data.get("message", "")
            })
    
    async def _handle_memory_liked(self, connection: WebSocketConnection, message_data: Dict):
        """Handle memory like event"""
        memory_id = message_data.get("memory_id")
        
        if memory_id:
            # Broadcast to memory viewers
            await self.broadcast_to_room("memory", memory_id, {
                "type": MessageType.MEMORY_LIKED.value,
                "memory_id": memory_id,
                "liked_by": connection.user_id,
                "timestamp": datetime.now().isoformat()
            }, exclude_connections={connection.connection_id})
    
    async def _handle_memory_commented(self, connection: WebSocketConnection, message_data: Dict):
        """Handle memory comment event"""
        memory_id = message_data.get("memory_id")
        comment = message_data.get("comment", "")
        
        if memory_id and comment:
            # Broadcast to memory viewers
            await self.broadcast_to_room("memory", memory_id, {
                "type": MessageType.MEMORY_COMMENTED.value,
                "memory_id": memory_id,
                "comment": comment,
                "commented_by": connection.user_id,
                "timestamp": datetime.now().isoformat()
            })
    
    async def _handle_travel_plan_updated(self, connection: WebSocketConnection, message_data: Dict):
        """Handle travel plan update"""
        travel_plan_id = message_data.get("travel_plan_id")
        updates = message_data.get("updates", {})
        
        if travel_plan_id:
            # Broadcast to travel planners
            await self.broadcast_to_room("travel", travel_plan_id, {
                "type": MessageType.TRAVEL_PLAN_UPDATED.value,
                "travel_plan_id": travel_plan_id,
                "updates": updates,
                "updated_by": connection.user_id,
                "timestamp": datetime.now().isoformat()
            }, exclude_connections={connection.connection_id})
    
    async def _handle_travel_vote(self, connection: WebSocketConnection, message_data: Dict):
        """Handle travel vote"""
        travel_plan_id = message_data.get("travel_plan_id")
        vote_type = message_data.get("vote_type")  # "destination", "activity", "date"
        vote_value = message_data.get("vote_value")
        
        if travel_plan_id and vote_type:
            # Broadcast vote to travel planners
            await self.broadcast_to_room("travel", travel_plan_id, {
                "type": MessageType.TRAVEL_VOTE.value,
                "travel_plan_id": travel_plan_id,
                "vote_type": vote_type,
                "vote_value": vote_value,
                "voted_by": connection.user_id,
                "timestamp": datetime.now().isoformat()
            })
    
    async def _handle_location_shared(self, connection: WebSocketConnection, message_data: Dict):
        """Handle real-time location sharing"""
        room_id = message_data.get("room_id")
        room_type = message_data.get("room_type", "family")
        latitude = message_data.get("latitude")
        longitude = message_data.get("longitude")
        accuracy = message_data.get("accuracy")
        
        if room_id and latitude and longitude:
            # Broadcast location to room members
            await self.broadcast_to_room(room_type, room_id, {
                "type": MessageType.LOCATION_SHARED.value,
                "user_id": connection.user_id,
                "location": {
                    "latitude": latitude,
                    "longitude": longitude,
                    "accuracy": accuracy,
                    "timestamp": datetime.now().isoformat()
                }
            }, exclude_connections={connection.connection_id})
    
    async def _handle_player_action(self, connection: WebSocketConnection, message_data: Dict):
        """Handle game player action"""
        game_id = message_data.get("game_id")
        action = message_data.get("action")
        
        if game_id and action:
            # Broadcast to game players
            await self.broadcast_to_room("game", game_id, {
                "type": MessageType.PLAYER_ACTION.value,
                "game_id": game_id,
                "action": action,
                "player_id": connection.user_id,
                "timestamp": datetime.now().isoformat()
            })
    
    async def _handle_typing_indicator(self, connection: WebSocketConnection, message_data: Dict):
        """Handle typing indicator"""
        room_id = message_data.get("room_id")
        room_type = message_data.get("room_type", "family")
        is_typing = message_data.get("is_typing", False)
        
        if room_id:
            # Broadcast typing status to room
            await self.broadcast_to_room(room_type, room_id, {
                "type": MessageType.TYPING_INDICATOR.value,
                "user_id": connection.user_id,
                "is_typing": is_typing,
                "timestamp": datetime.now().isoformat()
            }, exclude_connections={connection.connection_id})
    
    async def _broadcast_user_status(self, user_id: str, status: str):
        """Broadcast user status change to all relevant rooms"""
        message = {
            "type": MessageType.USER_STATUS.value,
            "user_id": user_id,
            "status": status,
            "timestamp": datetime.now().isoformat()
        }
        
        # Broadcast to all rooms where this user might be relevant
        for room_connections in [self.family_rooms.values(), self.game_rooms.values(), 
                               self.travel_rooms.values(), self.memory_rooms.values()]:
            for connections in room_connections:
                for connection_id in connections:
                    if connection_id in self.connections:
                        connection = self.connections[connection_id]
                        # Only notify if they know this user (same family, game, etc.)
                        await self.send_to_connection(connection_id, message)
    
    async def _leave_all_rooms(self, connection_id: str):
        """Remove connection from all rooms"""
        # Remove from all room types
        for room_dict in [self.family_rooms, self.game_rooms, self.travel_rooms, self.memory_rooms]:
            for room_id, connections in list(room_dict.items()):
                if connection_id in connections:
                    connections.discard(connection_id)
                    if not connections:
                        del room_dict[room_id]
    
    def get_room_members(self, room_type: str, room_id: str) -> List[Dict[str, Any]]:
        """Get all members in a room"""
        room_connections = set()
        if room_type == "family" and room_id in self.family_rooms:
            room_connections = self.family_rooms[room_id]
        elif room_type == "game" and room_id in self.game_rooms:
            room_connections = self.game_rooms[room_id]
        elif room_type == "travel" and room_id in self.travel_rooms:
            room_connections = self.travel_rooms[room_id]
        elif room_type == "memory" and room_id in self.memory_rooms:
            room_connections = self.memory_rooms[room_id]
        
        members = []
        for connection_id in room_connections:
            if connection_id in self.connections:
                connection = self.connections[connection_id]
                members.append({
                    "user_id": connection.user_id,
                    "connection_id": connection_id,
                    "connected_at": connection.connected_at.isoformat(),
                    "last_activity": connection.last_activity.isoformat(),
                    "metadata": connection.metadata
                })
        
        return members
    
    def get_user_presence(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user presence information"""
        return self.user_presence.get(user_id)
    
    def get_all_presence(self) -> Dict[str, Dict[str, Any]]:
        """Get all user presence information"""
        return self.user_presence.copy()

# Global WebSocket manager instance
websocket_manager = WebSocketManager()