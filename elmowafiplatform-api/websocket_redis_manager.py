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
    GAME_JOINED = "game_joined"
    GAME_LEFT = "game_left"
    GAME_STARTED = "game_started"
    GAME_ENDED = "game_ended"
    GAME_PAUSED = "game_paused" 
    GAME_RESUMED = "game_resumed"
    PLAYER_JOINED = "player_joined"
    PLAYER_LEFT = "player_left"
    PLAYER_READY = "player_ready"
    PLAYER_NOT_READY = "player_not_ready"
    ACHIEVEMENT_UNLOCKED = "achievement_unlocked"
    CHALLENGE_COMPLETED = "challenge_completed"
    
    # Mafia Game Specific
    MAFIA_ROLE_ASSIGNED = "mafia_role_assigned"
    MAFIA_PHASE_CHANGE = "mafia_phase_change"
    MAFIA_VOTING_STARTED = "mafia_voting_started"
    MAFIA_VOTE_CAST = "mafia_vote_cast"
    MAFIA_PLAYER_ELIMINATED = "mafia_player_eliminated"
    MAFIA_GAME_OVER = "mafia_game_over"
    MAFIA_NIGHT_ACTION = "mafia_night_action"
    MAFIA_DAY_DISCUSSION = "mafia_day_discussion"
    MAFIA_REFEREE_DECISION = "mafia_referee_decision"
    
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
        # Setup Redis pub/sub listener if Redis is available
        if redis_manager.is_connected() and redis_manager.async_redis:
            self.redis_pubsub = redis_manager.async_redis
            self.pubsub_task = asyncio.create_task(self._listen_to_redis())
            logger.info("WebSocket Redis Manager started with Redis pub/sub")
        else:
            logger.warning("WebSocket Redis Manager started without Redis pub/sub")
            self.redis_pubsub = None
            self.pubsub_task = None
    
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
        # Skip if Redis is not available
        if not redis_manager.is_connected() or not redis_manager.async_redis:
            logger.warning("Redis not available for pub/sub, skipping listener setup")
            return
            
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
        
        try:
            # Subscribe to all WebSocket channels
            channels = ["ws:*"]
            success = await redis_manager.subscribe(channels, message_handler)
            if success:
                logger.info("Successfully subscribed to Redis pub/sub channels")
            else:
                logger.warning("Failed to subscribe to Redis pub/sub channels")
        except Exception as e:
            logger.error(f"Error setting up Redis pub/sub listener: {e}")
    
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
    
    # Gaming-specific methods
    async def broadcast_to_game(self, session_id: str, message: WebSocketMessage):
        """Broadcast message to all players in a game session"""
        channel = f"game:{session_id}"
        return await self.broadcast_to_channel(channel, message)
    
    async def subscribe_to_game(self, connection_id: str, session_id: str):
        """Subscribe connection to game updates"""
        channel = f"game:{session_id}"
        await self.subscribe_to_channel(connection_id, channel)
    
    async def unsubscribe_from_game(self, connection_id: str, session_id: str):
        """Unsubscribe connection from game updates"""
        channel = f"game:{session_id}"
        await self.unsubscribe_from_channel(connection_id, channel)
    
    async def send_game_invitation(self, 
                                  host_user_id: str,
                                  invited_user_ids: List[str], 
                                  game_data: Dict[str, Any]):
        """Send game invitation to specific users"""
        invitation_message = WebSocketMessage(
            type=MessageType.GAME_INVITATION,
            data={
                'host_user_id': host_user_id,
                'game_type': game_data.get('game_type'),
                'session_id': game_data.get('session_id'),
                'title': game_data.get('title'),
                'description': game_data.get('description'),
                'max_players': game_data.get('max_players'),
                'invitation_id': f"invite_{datetime.now().timestamp()}"
            },
            sender_id=host_user_id,
            target_users=invited_user_ids
        )
        
        sent_count = 0
        for user_id in invited_user_ids:
            sent_count += await self.send_to_user(user_id, invitation_message)
        
        return sent_count
    
    async def notify_game_state_change(self, 
                                     session_id: str,
                                     event_type: MessageType,
                                     data: Dict[str, Any],
                                     exclude_users: List[str] = None):
        """Notify all game participants of state changes"""
        message = WebSocketMessage(
            type=event_type,
            data={
                'session_id': session_id,
                'timestamp': datetime.now().isoformat(),
                **data
            }
        )
        
        return await self.broadcast_to_game(session_id, message)
    
    async def send_mafia_role_assignment(self, 
                                       session_id: str,
                                       player_id: str,
                                       role_data: Dict[str, Any]):
        """Send private role assignment to Mafia player"""
        role_message = WebSocketMessage(
            type=MessageType.MAFIA_ROLE_ASSIGNED,
            data={
                'session_id': session_id,
                'role': role_data['role'],
                'abilities': role_data.get('abilities', []),
                'team': role_data.get('team'),
                'description': role_data.get('description'),
                'secret_info': role_data.get('secret_info')
            }
        )
        
        return await self.send_to_user(player_id, role_message)
    
    async def broadcast_mafia_phase_change(self, 
                                         session_id: str,
                                         phase_data: Dict[str, Any]):
        """Broadcast Mafia game phase changes to all players"""
        phase_message = WebSocketMessage(
            type=MessageType.MAFIA_PHASE_CHANGE,
            data={
                'session_id': session_id,
                'current_phase': phase_data['phase'],
                'phase_description': phase_data.get('description'),
                'time_limit': phase_data.get('time_limit'),
                'allowed_actions': phase_data.get('allowed_actions', []),
                'round_number': phase_data.get('round_number'),
                'day_number': phase_data.get('day_number')
            }
        )
        
        return await self.broadcast_to_game(session_id, phase_message)
    
    async def send_mafia_night_actions_request(self, 
                                             session_id: str,
                                             player_actions: Dict[str, Dict[str, Any]]):
        """Send night action requests to specific Mafia players"""
        sent_count = 0
        
        for player_id, action_data in player_actions.items():
            action_message = WebSocketMessage(
                type=MessageType.MAFIA_NIGHT_ACTION,
                data={
                    'session_id': session_id,
                    'action_type': 'request',
                    'available_actions': action_data.get('available_actions', []),
                    'target_options': action_data.get('target_options', []),
                    'time_limit': action_data.get('time_limit', 60)
                }
            )
            
            if await self.send_to_user(player_id, action_message):
                sent_count += 1
        
        return sent_count
    
    async def broadcast_mafia_voting_start(self, 
                                         session_id: str,
                                         voting_data: Dict[str, Any]):
        """Broadcast start of Mafia voting phase"""
        voting_message = WebSocketMessage(
            type=MessageType.MAFIA_VOTING_STARTED,
            data={
                'session_id': session_id,
                'voting_type': voting_data['voting_type'],
                'candidates': voting_data.get('candidates', []),
                'time_limit': voting_data.get('time_limit', 120),
                'voting_round': voting_data.get('voting_round', 1),
                'required_majority': voting_data.get('required_majority')
            }
        )
        
        return await self.broadcast_to_game(session_id, voting_message)
    
    async def broadcast_mafia_vote_cast(self, 
                                      session_id: str,
                                      vote_data: Dict[str, Any]):
        """Broadcast that a vote was cast (without revealing the vote)"""
        vote_message = WebSocketMessage(
            type=MessageType.MAFIA_VOTE_CAST,
            data={
                'session_id': session_id,
                'voter_id': vote_data['voter_id'],
                'timestamp': datetime.now().isoformat(),
                'votes_remaining': vote_data.get('votes_remaining'),
                'anonymous': vote_data.get('anonymous', True)
            }
        )
        
        return await self.broadcast_to_game(session_id, vote_message)
    
    async def broadcast_mafia_elimination(self, 
                                        session_id: str,
                                        elimination_data: Dict[str, Any]):
        """Broadcast player elimination in Mafia game"""
        elimination_message = WebSocketMessage(
            type=MessageType.MAFIA_PLAYER_ELIMINATED,
            data={
                'session_id': session_id,
                'eliminated_player_id': elimination_data['player_id'],
                'elimination_reason': elimination_data.get('reason'),
                'revealed_role': elimination_data.get('revealed_role'),
                'elimination_message': elimination_data.get('message'),
                'remaining_players': elimination_data.get('remaining_players', [])
            }
        )
        
        return await self.broadcast_to_game(session_id, elimination_message)
    
    async def send_ai_referee_decision(self, 
                                     session_id: str,
                                     decision_data: Dict[str, Any],
                                     target_players: List[str] = None):
        """Send AI referee decision to players"""
        decision_message = WebSocketMessage(
            type=MessageType.MAFIA_REFEREE_DECISION,
            data={
                'session_id': session_id,
                'decision_type': decision_data['decision_type'],
                'decision_reason': decision_data.get('reason'),
                'affected_players': decision_data.get('affected_players', []),
                'referee_message': decision_data.get('message'),
                'enforcement_action': decision_data.get('enforcement_action')
            }
        )
        
        if target_players:
            sent_count = 0
            for player_id in target_players:
                sent_count += await self.send_to_user(player_id, decision_message)
            return sent_count
        else:
            return await self.broadcast_to_game(session_id, decision_message)
    
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
        
    def is_connected(self) -> bool:
        """Check if WebSocket manager is connected and available"""
        # Consider the WebSocket manager connected if Redis is available
        # or if we have active connections
        return redis_manager.is_connected() or len(self.connections) > 0

# Global WebSocket manager instance
websocket_manager = WebSocketRedisManager()

def get_websocket_manager() -> WebSocketRedisManager:
    """Get the global WebSocket manager instance"""
    return websocket_manager