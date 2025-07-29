#!/usr/bin/env python3
"""
WebSocket Redis Manager for Elmowafiplatform
Scalable real-time communication with Redis pub/sub backend
"""

import json
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Set, Optional, Any, Callable
from dataclasses import dataclass, asdict
from enum import Enum

from fastapi import WebSocket, WebSocketDisconnect
# Redis not directly imported - using simple manager instead
from redis_manager_simple import redis_manager

logger = logging.getLogger(__name__)

class MessageType(Enum):
    """WebSocket message types"""
    # System messages
    CONNECT = "connect"
    DISCONNECT = "disconnect"
    HEARTBEAT = "heartbeat"
    ERROR = "error"
    
    # Family updates
    FAMILY_MEMBER_UPDATE = "family_member_update"
    FAMILY_MEMBER_ONLINE = "family_member_online"
    FAMILY_MEMBER_OFFLINE = "family_member_offline"
    
    # Memory updates
    MEMORY_CREATED = "memory_created"
    MEMORY_UPDATED = "memory_updated"
    MEMORY_LIKED = "memory_liked"
    MEMORY_COMMENT = "memory_comment"
    
    # Budget updates
    BUDGET_UPDATED = "budget_updated"
    EXPENSE_ADDED = "expense_added"
    BUDGET_ALERT = "budget_alert"
    BUDGET_GOAL_REACHED = "budget_goal_reached"
    
    # Travel updates
    TRAVEL_PLAN_UPDATE = "travel_plan_update"
    LOCATION_UPDATE = "location_update"
    TRAVEL_INVITATION = "travel_invitation"
    
    # Gaming updates
    GAME_INVITATION = "game_invitation"
    GAME_UPDATE = "game_update"
    ACHIEVEMENT_UNLOCKED = "achievement_unlocked"
    CHALLENGE_COMPLETED = "challenge_completed"
    
    # Notifications
    NOTIFICATION = "notification"
    SYSTEM_ANNOUNCEMENT = "system_announcement"
    
    # Chat/Communication
    CHAT_MESSAGE = "chat_message"
    TYPING_INDICATOR = "typing_indicator"
    READ_RECEIPT = "read_receipt"

@dataclass
class WebSocketMessage:
    """Structured WebSocket message"""
    type: MessageType
    data: Dict[str, Any]
    timestamp: str = None
    sender_id: str = None
    target_users: List[str] = None
    channel: str = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now().isoformat()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            'type': self.type.value,
            'data': self.data,
            'timestamp': self.timestamp,
            'sender_id': self.sender_id,
            'channel': self.channel
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'WebSocketMessage':
        """Create from dictionary"""
        return cls(
            type=MessageType(data['type']),
            data=data['data'],
            timestamp=data.get('timestamp'),
            sender_id=data.get('sender_id'),
            target_users=data.get('target_users'),
            channel=data.get('channel')
        )

@dataclass
class ConnectionInfo:
    """WebSocket connection information"""
    user_id: str
    family_id: str
    websocket: WebSocket
    connected_at: datetime
    last_heartbeat: datetime
    subscribed_channels: Set[str]
    metadata: Dict[str, Any]

class WebSocketRedisManager:
    """Scalable WebSocket manager with Redis pub/sub"""
    
    def __init__(self):
        # Active connections: connection_id -> ConnectionInfo
        self.connections: Dict[str, ConnectionInfo] = {}
        
        # User to connections mapping: user_id -> Set[connection_id]
        self.user_connections: Dict[str, Set[str]] = {}
        
        # Family to connections mapping: family_id -> Set[connection_id]
        self.family_connections: Dict[str, Set[str]] = {}
        
        # Channel subscriptions: channel -> Set[connection_id]
        self.channel_subscriptions: Dict[str, Set[str]] = {}
        
        # Redis pub/sub
        self.redis_pubsub = None
        self.pubsub_task: Optional[asyncio.Task] = None
        
        # Message handlers
        self.message_handlers: Dict[MessageType, List[Callable]] = {}
        
        # Performance metrics
        self.total_messages_sent = 0
        self.total_messages_received = 0
        self.connections_count = 0
        
    async def startup(self):
        """Initialize WebSocket manager"""
        # Setup Redis pub/sub listener
        self.redis_pubsub = redis_manager.async_redis
        self.pubsub_task = asyncio.create_task(self._listen_to_redis())
        
        logger.info("WebSocket Redis Manager started")
    
    async def shutdown(self):
        """Cleanup WebSocket manager"""
        if self.pubsub_task:
            self.pubsub_task.cancel()
            
        # Close all active connections
        for connection_id in list(self.connections.keys()):
            await self._disconnect_user(connection_id)
        
        logger.info("WebSocket Redis Manager shutdown")
    
    async def connect_user(self, 
                          websocket: WebSocket, 
                          user_id: str, 
                          family_id: str,
                          metadata: Dict[str, Any] = None) -> str:
        """Connect a user WebSocket"""
        await websocket.accept()
        
        # Generate unique connection ID
        connection_id = f"{user_id}_{datetime.now().timestamp()}"
        
        # Create connection info
        connection_info = ConnectionInfo(
            user_id=user_id,
            family_id=family_id,
            websocket=websocket,
            connected_at=datetime.now(),
            last_heartbeat=datetime.now(),
            subscribed_channels=set(),
            metadata=metadata or {}
        )
        
        # Store connection
        self.connections[connection_id] = connection_info
        
        # Update user connections mapping
        if user_id not in self.user_connections:
            self.user_connections[user_id] = set()
        self.user_connections[user_id].add(connection_id)
        
        # Update family connections mapping
        if family_id not in self.family_connections:
            self.family_connections[family_id] = set()
        self.family_connections[family_id].add(connection_id)
        
        # Auto-subscribe to user and family channels
        await self._subscribe_connection(connection_id, f"user:{user_id}")
        await self._subscribe_connection(connection_id, f"family:{family_id}")
        
        # Update presence in Redis
        await self._update_user_presence(user_id, "online", {
            'last_seen': datetime.now().isoformat(),
            'family_id': family_id
        })
        
        # Notify family members about user coming online
        await self.broadcast_to_family(
            family_id,
            WebSocketMessage(
                type=MessageType.FAMILY_MEMBER_ONLINE,
                data={'user_id': user_id, 'timestamp': datetime.now().isoformat()},
                sender_id=user_id
            ),
            exclude_users=[user_id]
        )
        
        # Send welcome message
        await self.send_to_connection(
            connection_id,
            WebSocketMessage(
                type=MessageType.CONNECT,
                data={
                    'connection_id': connection_id,
                    'user_id': user_id,
                    'family_id': family_id,
                    'server_time': datetime.now().isoformat()
                }
            )
        )
        
        self.connections_count += 1
        logger.info(f"User {user_id} connected with connection {connection_id}")
        
        return connection_id
    
    async def disconnect_user(self, connection_id: str):
        """Disconnect a user WebSocket"""
        await self._disconnect_user(connection_id)
    
    async def _disconnect_user(self, connection_id: str):
        """Internal disconnect logic"""
        if connection_id not in self.connections:
            return
        
        connection_info = self.connections[connection_id]
        user_id = connection_info.user_id
        family_id = connection_info.family_id
        
        # Remove from all mappings
        self.connections.pop(connection_id, None)
        
        if user_id in self.user_connections:
            self.user_connections[user_id].discard(connection_id)
            if not self.user_connections[user_id]:
                self.user_connections.pop(user_id, None)
        
        if family_id in self.family_connections:
            self.family_connections[family_id].discard(connection_id)
            if not self.family_connections[family_id]:
                self.family_connections.pop(family_id, None)
        
        # Remove from channel subscriptions
        for channel in connection_info.subscribed_channels:
            if channel in self.channel_subscriptions:
                self.channel_subscriptions[channel].discard(connection_id)
                if not self.channel_subscriptions[channel]:
                    self.channel_subscriptions.pop(channel, None)
        
        # Update presence if no more connections for this user
        if user_id not in self.user_connections:
            await self._update_user_presence(user_id, "offline", {
                'last_seen': datetime.now().isoformat(),
                'family_id': family_id
            })
            
            # Notify family members about user going offline
            await self.broadcast_to_family(
                family_id,
                WebSocketMessage(
                    type=MessageType.FAMILY_MEMBER_OFFLINE,
                    data={'user_id': user_id, 'timestamp': datetime.now().isoformat()},
                    sender_id=user_id
                ),
                exclude_users=[user_id]
            )
        
        self.connections_count -= 1
        logger.info(f"User {user_id} disconnected (connection {connection_id})")
    
    async def send_to_connection(self, connection_id: str, message: WebSocketMessage):
        """Send message to specific connection"""
        if connection_id not in self.connections:
            return False
        
        connection_info = self.connections[connection_id]
        
        try:
            await connection_info.websocket.send_text(json.dumps(message.to_dict()))
            self.total_messages_sent += 1
            return True
            
        except Exception as e:
            logger.error(f"Failed to send message to connection {connection_id}: {e}")
            await self._disconnect_user(connection_id)
            return False
    
    async def send_to_user(self, user_id: str, message: WebSocketMessage):
        """Send message to all connections of a user"""
        if user_id not in self.user_connections:
            return 0
        
        sent_count = 0
        connections = list(self.user_connections[user_id])  # Copy to avoid modification during iteration
        
        for connection_id in connections:
            if await self.send_to_connection(connection_id, message):
                sent_count += 1
        
        return sent_count
    
    async def broadcast_to_family(self, 
                                 family_id: str, 
                                 message: WebSocketMessage,
                                 exclude_users: List[str] = None):
        """Broadcast message to all family members"""
        if family_id not in self.family_connections:
            return 0
        
        exclude_users = exclude_users or []
        sent_count = 0
        connections = list(self.family_connections[family_id])
        
        for connection_id in connections:
            connection_info = self.connections.get(connection_id)
            if connection_info and connection_info.user_id not in exclude_users:
                if await self.send_to_connection(connection_id, message):
                    sent_count += 1
        
        return sent_count
    
    async def broadcast_to_channel(self, channel: str, message: WebSocketMessage):
        """Broadcast message to all channel subscribers"""
        if channel not in self.channel_subscriptions:
            return 0
        
        sent_count = 0
        connections = list(self.channel_subscriptions[channel])
        
        for connection_id in connections:
            if await self.send_to_connection(connection_id, message):
                sent_count += 1
        
        return sent_count
    
    async def subscribe_to_channel(self, connection_id: str, channel: str):
        """Subscribe connection to a channel"""
        await self._subscribe_connection(connection_id, channel)
    
    async def unsubscribe_from_channel(self, connection_id: str, channel: str):
        """Unsubscribe connection from a channel"""
        if connection_id not in self.connections:
            return
        
        connection_info = self.connections[connection_id]
        connection_info.subscribed_channels.discard(channel)
        
        if channel in self.channel_subscriptions:
            self.channel_subscriptions[channel].discard(connection_id)
            if not self.channel_subscriptions[channel]:
                self.channel_subscriptions.pop(channel, None)
    
    async def _subscribe_connection(self, connection_id: str, channel: str):
        """Internal subscribe logic"""
        if connection_id not in self.connections:
            return
        
        connection_info = self.connections[connection_id]
        connection_info.subscribed_channels.add(channel)
        
        if channel not in self.channel_subscriptions:
            self.channel_subscriptions[channel] = set()
        self.channel_subscriptions[channel].add(connection_id)
    
    async def publish_to_redis(self, channel: str, message: WebSocketMessage):
        """Publish message to Redis for cross-server communication"""
        redis_channel = f"ws:{channel}"
        message_data = json.dumps(message.to_dict())
        
        await redis_manager.publish(redis_channel, message_data)
    
    async def _listen_to_redis(self):
        """Listen to Redis pub/sub for cross-server messages"""
        async def message_handler(channel: str, message_data: str):
            try:
                # Remove 'ws:' prefix
                target_channel = channel[3:] if channel.startswith('ws:') else channel
                
                message_dict = json.loads(message_data)
                message = WebSocketMessage.from_dict(message_dict)
                
                # Broadcast to local connections
                await self.broadcast_to_channel(target_channel, message)
                
            except Exception as e:
                logger.error(f"Failed to process Redis message: {e}")
        
        # Subscribe to all WebSocket channels
        channels = ["ws:*"]
        await redis_manager.subscribe(channels, message_handler)
    
    async def handle_incoming_message(self, connection_id: str, message_data: str):
        """Handle incoming WebSocket message"""
        if connection_id not in self.connections:
            return
        
        try:
            message_dict = json.loads(message_data)
            message = WebSocketMessage.from_dict(message_dict)
            connection_info = self.connections[connection_id]
            
            # Update heartbeat
            if message.type == MessageType.HEARTBEAT:
                connection_info.last_heartbeat = datetime.now()
                return
            
            # Set sender info
            message.sender_id = connection_info.user_id
            
            # Call message handlers
            await self._call_message_handlers(message, connection_info)
            
            # Handle specific message types
            await self._handle_message_routing(message, connection_info)
            
            self.total_messages_received += 1
            
        except Exception as e:
            logger.error(f"Failed to handle incoming message from {connection_id}: {e}")
            
            # Send error response
            error_message = WebSocketMessage(
                type=MessageType.ERROR,
                data={'error': str(e), 'original_message': message_data}
            )
            await self.send_to_connection(connection_id, error_message)
    
    async def _handle_message_routing(self, message: WebSocketMessage, connection_info: ConnectionInfo):
        """Route messages based on type"""
        if message.type == MessageType.CHAT_MESSAGE:
            # Route chat message to family or specific users
            if message.target_users:
                for user_id in message.target_users:
                    await self.send_to_user(user_id, message)
            else:
                await self.broadcast_to_family(connection_info.family_id, message)
        
        elif message.type == MessageType.TYPING_INDICATOR:
            # Route typing indicator
            if message.target_users:
                for user_id in message.target_users:
                    await self.send_to_user(user_id, message)
            else:
                await self.broadcast_to_family(
                    connection_info.family_id, 
                    message,
                    exclude_users=[connection_info.user_id]
                )
        
        elif message.type in [MessageType.MEMORY_CREATED, MessageType.MEMORY_UPDATED, 
                             MessageType.BUDGET_UPDATED, MessageType.TRAVEL_PLAN_UPDATE]:
            # Broadcast family updates
            await self.broadcast_to_family(connection_info.family_id, message)
            
            # Also publish to Redis for cross-server
            await self.publish_to_redis(f"family:{connection_info.family_id}", message)
        
        elif message.type == MessageType.GAME_INVITATION:
            # Send game invitation to specific users
            if message.target_users:
                for user_id in message.target_users:
                    await self.send_to_user(user_id, message)
    
    def register_message_handler(self, message_type: MessageType, handler: Callable):
        """Register a message handler for specific message type"""
        if message_type not in self.message_handlers:
            self.message_handlers[message_type] = []
        self.message_handlers[message_type].append(handler)
    
    async def _call_message_handlers(self, message: WebSocketMessage, connection_info: ConnectionInfo):
        """Call registered message handlers"""
        handlers = self.message_handlers.get(message.type, [])
        
        for handler in handlers:
            try:
                await handler(message, connection_info)
            except Exception as e:
                logger.error(f"Message handler error for {message.type}: {e}")
    
    async def _update_user_presence(self, user_id: str, status: str, metadata: Dict[str, Any]):
        """Update user presence in Redis"""
        presence_key = f"presence:{user_id}"
        presence_data = {
            'status': status,
            'updated_at': datetime.now().isoformat(),
            **metadata
        }
        
        await redis_manager.set(presence_key, presence_data, ttl=3600, namespace="presence")
    
    async def get_user_presence(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user presence from Redis"""
        presence_key = f"presence:{user_id}"
        return await redis_manager.get(presence_key, namespace="presence")
    
    async def get_family_presence(self, family_id: str) -> Dict[str, Any]:
        """Get presence status for all family members"""
        family_members = await self._get_family_members(family_id)
        presence_data = {}
        
        for member_id in family_members:
            presence = await self.get_user_presence(member_id)
            presence_data[member_id] = presence or {'status': 'offline'}
        
        return presence_data
    
    async def _get_family_members(self, family_id: str) -> List[str]:
        """Get family member IDs from cache or database"""
        # This would typically query your family database
        # For now, return users currently in family connections
        family_users = set()
        connections = self.family_connections.get(family_id, set())
        
        for connection_id in connections:
            connection_info = self.connections.get(connection_id)
            if connection_info:
                family_users.add(connection_info.user_id)
        
        return list(family_users)
    
    async def send_notification(self, 
                               user_ids: List[str], 
                               notification_type: str,
                               title: str,
                               message: str,
                               data: Dict[str, Any] = None):
        """Send notification to specific users"""
        notification_message = WebSocketMessage(
            type=MessageType.NOTIFICATION,
            data={
                'notification_type': notification_type,
                'title': title,
                'message': message,
                'data': data or {},
                'id': f"notif_{datetime.now().timestamp()}"
            }
        )
        
        sent_count = 0
        for user_id in user_ids:
            sent_count += await self.send_to_user(user_id, notification_message)
        
        return sent_count
    
    async def cleanup_stale_connections(self):
        """Remove stale connections that haven't sent heartbeat"""
        current_time = datetime.now()
        stale_threshold = timedelta(minutes=5)  # 5 minutes without heartbeat
        
        stale_connections = []
        
        for connection_id, connection_info in self.connections.items():
            if current_time - connection_info.last_heartbeat > stale_threshold:
                stale_connections.append(connection_id)
        
        for connection_id in stale_connections:
            logger.info(f"Removing stale connection: {connection_id}")
            await self._disconnect_user(connection_id)
        
        return len(stale_connections)
    
    def get_stats(self) -> Dict[str, Any]:
        """Get WebSocket manager statistics"""
        return {
            'active_connections': len(self.connections),
            'unique_users': len(self.user_connections),
            'active_families': len(self.family_connections),
            'subscribed_channels': len(self.channel_subscriptions),
            'total_messages_sent': self.total_messages_sent,
            'total_messages_received': self.total_messages_received,
            'connections_count': self.connections_count
        }

# Global WebSocket manager instance
websocket_manager = WebSocketRedisManager() 