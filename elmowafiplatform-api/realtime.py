import asyncio
import json
import logging
from typing import Dict, Set, List, Optional
from datetime import datetime
import uuid
from fastapi import WebSocket, WebSocketDisconnect
from enum import Enum

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MessageType(Enum):
    # User status
    USER_ONLINE = "user_online"
    USER_OFFLINE = "user_offline"
    USER_TYPING = "user_typing"
    
    # Notifications
    NOTIFICATION = "notification"
    NOTIFICATION_READ = "notification_read"
    
    # Family updates
    MEMORY_SHARED = "memory_shared"
    TRAVEL_UPDATE = "travel_update"
    ACHIEVEMENT_UNLOCKED = "achievement_unlocked"
    EVENT_REMINDER = "event_reminder"
    
    # Chat
    CHAT_MESSAGE = "chat_message"
    CHAT_HISTORY = "chat_history"
    
    # Location
    LOCATION_UPDATE = "location_update"
    
    # System
    SYSTEM_MESSAGE = "system_message"
    ERROR = "error"
    PING = "ping"
    PONG = "pong"

class ConnectionManager:
    def __init__(self):
        # Active connections by user_id
        self.active_connections: Dict[str, WebSocket] = {}
        # Family groups - each user belongs to a family
        self.family_groups: Dict[str, Set[str]] = {}
        # User sessions
        self.user_sessions: Dict[str, dict] = {}
        
    async def connect(self, websocket: WebSocket, user_id: str, family_id: str = "elmowafi_family"):
        """Connect a user to the WebSocket"""
        await websocket.accept()
        
        # Disconnect any existing session for this user
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].close()
            except:
                pass
        
        # Add new connection
        self.active_connections[user_id] = websocket
        
        # Add to family group
        if family_id not in self.family_groups:
            self.family_groups[family_id] = set()
        self.family_groups[family_id].add(user_id)
        
        # Create session
        self.user_sessions[user_id] = {
            "family_id": family_id,
            "connected_at": datetime.now().isoformat(),
            "last_activity": datetime.now().isoformat()
        }
        
        # Notify family members
        await self.broadcast_to_family(family_id, {
            "type": MessageType.USER_ONLINE.value,
            "user_id": user_id,
            "timestamp": datetime.now().isoformat()
        }, exclude_user=user_id)
        
        logger.info(f"User {user_id} connected to family {family_id}")

    def disconnect(self, user_id: str):
        """Disconnect a user"""
        if user_id in self.active_connections:
            del self.active_connections[user_id]
        
        # Get family_id before removing session
        family_id = None
        if user_id in self.user_sessions:
            family_id = self.user_sessions[user_id]["family_id"]
            del self.user_sessions[user_id]
        
        # Remove from family group
        if family_id and family_id in self.family_groups:
            self.family_groups[family_id].discard(user_id)
            
            # Notify family members
            asyncio.create_task(self.broadcast_to_family(family_id, {
                "type": MessageType.USER_OFFLINE.value,
                "user_id": user_id,
                "timestamp": datetime.now().isoformat()
            }, exclude_user=user_id))
        
        logger.info(f"User {user_id} disconnected")

    async def send_personal_message(self, user_id: str, message: dict):
        """Send a message to a specific user"""
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_text(json.dumps(message))
                return True
            except Exception as e:
                logger.error(f"Failed to send message to {user_id}: {e}")
                self.disconnect(user_id)
                return False
        return False

    async def broadcast_to_family(self, family_id: str, message: dict, exclude_user: str = None):
        """Broadcast a message to all family members"""
        if family_id not in self.family_groups:
            return
        
        disconnected_users = []
        for user_id in self.family_groups[family_id]:
            if exclude_user and user_id == exclude_user:
                continue
                
            success = await self.send_personal_message(user_id, message)
            if not success:
                disconnected_users.append(user_id)
        
        # Clean up disconnected users
        for user_id in disconnected_users:
            self.disconnect(user_id)

    async def handle_message(self, user_id: str, message: dict):
        """Handle incoming WebSocket messages"""
        try:
            message_type = message.get("type")
            family_id = self.user_sessions.get(user_id, {}).get("family_id")
            
            if not family_id:
                await self.send_personal_message(user_id, {
                    "type": MessageType.ERROR.value,
                    "message": "User session not found"
                })
                return

            # Update last activity
            if user_id in self.user_sessions:
                self.user_sessions[user_id]["last_activity"] = datetime.now().isoformat()

            if message_type == MessageType.PING.value:
                await self.send_personal_message(user_id, {
                    "type": MessageType.PONG.value,
                    "timestamp": datetime.now().isoformat()
                })
            
            elif message_type == MessageType.CHAT_MESSAGE.value:
                await self.handle_chat_message(user_id, family_id, message)
            
            elif message_type == MessageType.USER_TYPING.value:
                await self.handle_typing_indicator(user_id, family_id, message)
            
            elif message_type == MessageType.LOCATION_UPDATE.value:
                await self.handle_location_update(user_id, family_id, message)
            
            elif message_type == MessageType.NOTIFICATION_READ.value:
                await self.handle_notification_read(user_id, family_id, message)
            
            else:
                logger.warning(f"Unknown message type: {message_type}")

        except Exception as e:
            logger.error(f"Error handling message from {user_id}: {e}")
            await self.send_personal_message(user_id, {
                "type": MessageType.ERROR.value,
                "message": "Failed to process message"
            })

    async def handle_chat_message(self, user_id: str, family_id: str, message: dict):
        """Handle chat messages"""
        chat_message = {
            "type": MessageType.CHAT_MESSAGE.value,
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "content": message.get("content", ""),
            "timestamp": datetime.now().isoformat(),
            "family_id": family_id
        }
        
        # Broadcast to all family members
        await self.broadcast_to_family(family_id, chat_message)

    async def handle_typing_indicator(self, user_id: str, family_id: str, message: dict):
        """Handle typing indicators"""
        typing_message = {
            "type": MessageType.USER_TYPING.value,
            "user_id": user_id,
            "is_typing": message.get("is_typing", False),
            "timestamp": datetime.now().isoformat()
        }
        
        # Broadcast to family members (excluding sender)
        await self.broadcast_to_family(family_id, typing_message, exclude_user=user_id)

    async def handle_location_update(self, user_id: str, family_id: str, message: dict):
        """Handle location updates"""
        location_message = {
            "type": MessageType.LOCATION_UPDATE.value,
            "user_id": user_id,
            "latitude": message.get("latitude"),
            "longitude": message.get("longitude"),
            "address": message.get("address", ""),
            "timestamp": datetime.now().isoformat()
        }
        
        # Broadcast to family members
        await self.broadcast_to_family(family_id, location_message)

    async def handle_notification_read(self, user_id: str, family_id: str, message: dict):
        """Handle notification read status"""
        notification_message = {
            "type": MessageType.NOTIFICATION_READ.value,
            "user_id": user_id,
            "notification_id": message.get("notification_id"),
            "timestamp": datetime.now().isoformat()
        }
        
        # Could be used for read receipts or analytics
        logger.info(f"User {user_id} read notification {message.get('notification_id')}")

    # Utility methods for external services to send real-time updates
    async def send_notification(self, user_id: str, notification: dict):
        """Send a notification to a specific user"""
        message = {
            "type": MessageType.NOTIFICATION.value,
            **notification,
            "timestamp": datetime.now().isoformat()
        }
        await self.send_personal_message(user_id, message)

    async def broadcast_memory_shared(self, family_id: str, memory: dict, user_id: str):
        """Broadcast when a memory is shared"""
        message = {
            "type": MessageType.MEMORY_SHARED.value,
            "user_id": user_id,
            "memory": memory,
            "timestamp": datetime.now().isoformat()
        }
        await self.broadcast_to_family(family_id, message, exclude_user=user_id)

    async def broadcast_travel_update(self, family_id: str, update: dict, user_id: str):
        """Broadcast travel updates"""
        message = {
            "type": MessageType.TRAVEL_UPDATE.value,
            "user_id": user_id,
            "update": update,
            "timestamp": datetime.now().isoformat()
        }
        await self.broadcast_to_family(family_id, message)

    async def broadcast_achievement(self, family_id: str, achievement: dict, user_id: str):
        """Broadcast when someone unlocks an achievement"""
        message = {
            "type": MessageType.ACHIEVEMENT_UNLOCKED.value,
            "user_id": user_id,
            "achievement": achievement,
            "timestamp": datetime.now().isoformat()
        }
        await self.broadcast_to_family(family_id, message)

    def get_online_family_members(self, family_id: str) -> List[str]:
        """Get list of online family members"""
        if family_id not in self.family_groups:
            return []
        return [user_id for user_id in self.family_groups[family_id] 
                if user_id in self.active_connections]

    def get_connection_stats(self) -> dict:
        """Get connection statistics"""
        return {
            "total_connections": len(self.active_connections),
            "total_families": len(self.family_groups),
            "family_stats": {
                family_id: len(users) 
                for family_id, users in self.family_groups.items()
            }
        }

# Global connection manager instance
connection_manager = ConnectionManager()

async def websocket_endpoint(websocket: WebSocket, user_id: str = "demo_user", family_id: str = "elmowafi_family"):
    """WebSocket endpoint for real-time communication"""
    await connection_manager.connect(websocket, user_id, family_id)
    
    try:
        while True:
            # Receive message
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Handle the message
            await connection_manager.handle_message(user_id, message)
            
    except WebSocketDisconnect:
        connection_manager.disconnect(user_id)
    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {e}")
        connection_manager.disconnect(user_id) 