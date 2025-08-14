#!/usr/bin/env python3
"""
WebSocket Authentication Module
Provides secure authentication for WebSocket connections
"""

import asyncio
import json
import logging
import time
import jwt
from typing import Dict, Optional, Any
from datetime import datetime, timedelta
from fastapi import WebSocket, WebSocketDisconnect, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.websockets import WebSocketState

# Setup logging
logger = logging.getLogger(__name__)

class WebSocketAuthManager:
    """Manages WebSocket authentication and authorization"""
    
    def __init__(self, secret_key: str, algorithm: str = "HS256"):
        self.secret_key = secret_key
        self.algorithm = algorithm
        self.active_connections: Dict[str, WebSocket] = {}
        self.user_sessions: Dict[str, Dict[str, Any]] = {}
        self.rate_limits: Dict[str, Dict[str, Any]] = {}
        
    def create_access_token(self, data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
        """Create JWT access token for WebSocket authentication"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=15)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        return encoded_jwt
    
    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify JWT token and return payload"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return payload
        except jwt.ExpiredSignatureError:
            logger.warning("Token has expired")
            return None
        except jwt.JWTError as e:
            logger.error(f"JWT verification failed: {e}")
            return None
    
    async def authenticate_websocket(self, websocket: WebSocket) -> Optional[Dict[str, Any]]:
        """Authenticate WebSocket connection"""
        try:
            # Get token from query parameters or headers
            token = None
            
            # Check query parameters first
            if websocket.query_params.get("token"):
                token = websocket.query_params.get("token")
            # Check headers
            elif "authorization" in websocket.headers:
                auth_header = websocket.headers["authorization"]
                if auth_header.startswith("Bearer "):
                    token = auth_header[7:]
            
            if not token:
                await websocket.close(code=4001, reason="Authentication required")
                return None
            
            # Verify token
            payload = self.verify_token(token)
            if not payload:
                await websocket.close(code=4001, reason="Invalid token")
                return None
            
            # Check rate limiting
            user_id = payload.get("sub")
            if user_id and not self.check_rate_limit(user_id):
                await websocket.close(code=4029, reason="Rate limit exceeded")
                return None
            
            # Store connection
            self.active_connections[user_id] = websocket
            self.user_sessions[user_id] = {
                "user_id": user_id,
                "connected_at": datetime.utcnow(),
                "last_activity": datetime.utcnow(),
                "permissions": payload.get("permissions", []),
                "metadata": payload.get("metadata", {})
            }
            
            logger.info(f"WebSocket authenticated for user {user_id}")
            return payload
            
        except Exception as e:
            logger.error(f"WebSocket authentication failed: {e}")
            await websocket.close(code=4001, reason="Authentication failed")
            return None
    
    def check_rate_limit(self, user_id: str) -> bool:
        """Check if user has exceeded rate limits"""
        now = datetime.utcnow()
        
        if user_id not in self.rate_limits:
            self.rate_limits[user_id] = {
                "connection_attempts": 0,
                "last_attempt": now,
                "blocked_until": None
            }
        
        user_limits = self.rate_limits[user_id]
        
        # Check if user is blocked
        if user_limits["blocked_until"] and now < user_limits["blocked_until"]:
            return False
        
        # Reset counter if more than 1 hour has passed
        if now - user_limits["last_attempt"] > timedelta(hours=1):
            user_limits["connection_attempts"] = 0
        
        # Increment attempt counter
        user_limits["connection_attempts"] += 1
        user_limits["last_attempt"] = now
        
        # Block if too many attempts
        if user_limits["connection_attempts"] > 10:
            user_limits["blocked_until"] = now + timedelta(minutes=30)
            return False
        
        return True
    
    def update_user_activity(self, user_id: str):
        """Update user's last activity timestamp"""
        if user_id in self.user_sessions:
            self.user_sessions[user_id]["last_activity"] = datetime.utcnow()
    
    def disconnect_user(self, user_id: str):
        """Disconnect user and clean up session"""
        if user_id in self.active_connections:
            websocket = self.active_connections[user_id]
            if websocket.client_state != WebSocketState.DISCONNECTED:
                asyncio.create_task(websocket.close())
            del self.active_connections[user_id]
        
        if user_id in self.user_sessions:
            del self.user_sessions[user_id]
        
        logger.info(f"User {user_id} disconnected")
    
    def get_user_permissions(self, user_id: str) -> list:
        """Get user's permissions"""
        if user_id in self.user_sessions:
            return self.user_sessions[user_id].get("permissions", [])
        return []
    
    def has_permission(self, user_id: str, permission: str) -> bool:
        """Check if user has specific permission"""
        permissions = self.get_user_permissions(user_id)
        return permission in permissions or "admin" in permissions
    
    async def broadcast_to_users(self, message: Dict[str, Any], user_ids: list = None):
        """Broadcast message to specific users or all users"""
        if user_ids is None:
            user_ids = list(self.active_connections.keys())
        
        disconnected_users = []
        
        for user_id in user_ids:
            if user_id in self.active_connections:
                websocket = self.active_connections[user_id]
                try:
                    await websocket.send_text(json.dumps(message))
                except Exception as e:
                    logger.error(f"Failed to send message to user {user_id}: {e}")
                    disconnected_users.append(user_id)
        
        # Clean up disconnected users
        for user_id in disconnected_users:
            self.disconnect_user(user_id)
    
    def get_connection_stats(self) -> Dict[str, Any]:
        """Get connection statistics"""
        now = datetime.utcnow()
        active_users = len(self.active_connections)
        
        # Calculate average session duration
        total_duration = timedelta()
        active_sessions = 0
        
        for session in self.user_sessions.values():
            if session["connected_at"]:
                duration = now - session["connected_at"]
                total_duration += duration
                active_sessions += 1
        
        avg_duration = total_duration / active_sessions if active_sessions > 0 else timedelta()
        
        return {
            "active_connections": active_users,
            "total_sessions": len(self.user_sessions),
            "average_session_duration": str(avg_duration),
            "rate_limited_users": len([u for u, limits in self.rate_limits.items() 
                                     if limits.get("blocked_until") and now < limits["blocked_until"]])
        }

class WebSocketSecurityMiddleware:
    """Middleware for WebSocket security"""
    
    def __init__(self, auth_manager: WebSocketAuthManager):
        self.auth_manager = auth_manager
    
    async def __call__(self, websocket: WebSocket, call_next):
        """Process WebSocket request with security checks"""
        try:
            # Authenticate connection
            user_data = await self.auth_manager.authenticate_websocket(websocket)
            if not user_data:
                return
            
            # Add user data to websocket scope
            websocket.scope["user"] = user_data
            
            # Process the request
            await call_next(websocket)
            
        except WebSocketDisconnect:
            # Clean up on disconnect
            user_id = websocket.scope.get("user", {}).get("sub")
            if user_id:
                self.auth_manager.disconnect_user(user_id)
        except Exception as e:
            logger.error(f"WebSocket security middleware error: {e}")
            await websocket.close(code=1011, reason="Internal server error")

# Security decorators
def require_permission(permission: str):
    """Decorator to require specific permission for WebSocket handlers"""
    def decorator(func):
        async def wrapper(websocket: WebSocket, *args, **kwargs):
            user_data = websocket.scope.get("user")
            if not user_data:
                await websocket.close(code=4001, reason="Authentication required")
                return
            
            user_id = user_data.get("sub")
            auth_manager = websocket.app.state.websocket_auth_manager
            
            if not auth_manager.has_permission(user_id, permission):
                await websocket.close(code=4003, reason="Insufficient permissions")
                return
            
            return await func(websocket, *args, **kwargs)
        return wrapper
    return decorator

def require_admin(func):
    """Decorator to require admin permission"""
    return require_permission("admin")(func)

# Rate limiting decorator
def rate_limit(max_requests: int = 100, window_seconds: int = 60):
    """Decorator to implement rate limiting for WebSocket messages"""
    def decorator(func):
        async def wrapper(websocket: WebSocket, *args, **kwargs):
            user_data = websocket.scope.get("user")
            if not user_data:
                return await func(websocket, *args, **kwargs)
            
            user_id = user_data.get("sub")
            auth_manager = websocket.app.state.websocket_auth_manager
            
            # Check message rate limit
            now = datetime.utcnow()
            if user_id not in auth_manager.rate_limits:
                auth_manager.rate_limits[user_id] = {
                    "message_count": 0,
                    "message_window_start": now
                }
            
            user_limits = auth_manager.rate_limits[user_id]
            
            # Reset window if needed
            if now - user_limits["message_window_start"] > timedelta(seconds=window_seconds):
                user_limits["message_count"] = 0
                user_limits["message_window_start"] = now
            
            # Check limit
            if user_limits["message_count"] >= max_requests:
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": "Rate limit exceeded"
                }))
                return
            
            # Increment counter
            user_limits["message_count"] += 1
            
            return await func(websocket, *args, **kwargs)
        return wrapper
    return decorator

# Message validation
def validate_message_schema(schema: Dict[str, Any]):
    """Decorator to validate WebSocket message schema"""
    def decorator(func):
        async def wrapper(websocket: WebSocket, message: Dict[str, Any], *args, **kwargs):
            # Validate required fields
            for field, field_type in schema.items():
                if field not in message:
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "message": f"Missing required field: {field}"
                    }))
                    return
                
                if not isinstance(message[field], field_type):
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "message": f"Invalid type for field {field}"
                    }))
                    return
            
            return await func(websocket, message, *args, **kwargs)
        return wrapper
    return decorator

# Example usage:
# @require_permission("memory_write")
# @rate_limit(max_requests=50, window_seconds=60)
# @validate_message_schema({"type": str, "data": dict})
# async def handle_memory_update(websocket: WebSocket, message: Dict[str, Any]):
#     # Handle memory update
#     pass
