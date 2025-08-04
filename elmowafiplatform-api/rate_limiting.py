#!/usr/bin/env python3
"""
Rate Limiting for Elmowafiplatform
Implements rate limiting for API endpoints
"""

import time
import asyncio
from collections import defaultdict
from typing import Dict, Tuple, Optional
from fastapi import Request, HTTPException, status
import logging

logger = logging.getLogger(__name__)

class RateLimiter:
    """Simple in-memory rate limiter"""
    
    def __init__(self):
        self.requests = defaultdict(list)
        self.limits = {
            # API endpoints
            "api": {"requests": 100, "window": 60},  # 100 requests per minute
            "auth": {"requests": 10, "window": 60},  # 10 auth attempts per minute
            "upload": {"requests": 20, "window": 60},  # 20 uploads per minute
            "ai": {"requests": 50, "window": 60},  # 50 AI calls per minute
            
            # Database operations
            "db_read": {"requests": 200, "window": 60},
            "db_write": {"requests": 100, "window": 60},
            
            # File operations
            "file_upload": {"requests": 30, "window": 60},
            "file_download": {"requests": 100, "window": 60},
        }
    
    def is_allowed(self, key: str, limit_type: str = "api") -> bool:
        """Check if request is allowed"""
        now = time.time()
        limit = self.limits.get(limit_type, self.limits["api"])
        
        # Clean old requests
        self.requests[key] = [
            req_time for req_time in self.requests[key]
            if now - req_time < limit["window"]
        ]
        
        # Check if limit exceeded
        if len(self.requests[key]) >= limit["requests"]:
            return False
        
        # Add current request
        self.requests[key].append(now)
        return True
    
    def get_remaining(self, key: str, limit_type: str = "api") -> int:
        """Get remaining requests for key"""
        now = time.time()
        limit = self.limits.get(limit_type, self.limits["api"])
        
        # Clean old requests
        self.requests[key] = [
            req_time for req_time in self.requests[key]
            if now - req_time < limit["window"]
        ]
        
        return max(0, limit["requests"] - len(self.requests[key]))
    
    def get_reset_time(self, key: str, limit_type: str = "api") -> float:
        """Get time until rate limit resets"""
        now = time.time()
        limit = self.limits.get(limit_type, self.limits["api"])
        
        if not self.requests[key]:
            return now
        
        oldest_request = min(self.requests[key])
        return oldest_request + limit["window"]

# Global rate limiter instance
rate_limiter = RateLimiter()

def get_client_ip(request: Request) -> str:
    """Get client IP address"""
    # Check for forwarded headers
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    
    # Check for real IP header
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    
    # Fallback to client host
    return request.client.host if request.client else "unknown"

def get_user_id(request: Request) -> Optional[str]:
    """Get user ID from request (if authenticated)"""
    # This would be implemented based on your auth system
    # For now, return None
    return None

def get_rate_limit_key(request: Request, limit_type: str = "api") -> str:
    """Generate rate limit key"""
    client_ip = get_client_ip(request)
    user_id = get_user_id(request)
    
    if user_id:
        return f"{limit_type}:user:{user_id}"
    else:
        return f"{limit_type}:ip:{client_ip}"

async def check_rate_limit(request: Request, limit_type: str = "api"):
    """Check rate limit for request"""
    key = get_rate_limit_key(request, limit_type)
    
    if not rate_limiter.is_allowed(key, limit_type):
        remaining_time = rate_limiter.get_reset_time(key, limit_type) - time.time()
        
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": "Rate limit exceeded",
                "limit_type": limit_type,
                "retry_after": max(1, int(remaining_time))
            },
            headers={
                "X-RateLimit-Limit": str(rate_limiter.limits[limit_type]["requests"]),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(int(rate_limiter.get_reset_time(key, limit_type))),
                "Retry-After": str(max(1, int(remaining_time)))
            }
        )

def rate_limit(limit_type: str = "api"):
    """Decorator for rate limiting endpoints"""
    def decorator(func):
        async def wrapper(*args, request: Request = None, **kwargs):
            if request:
                await check_rate_limit(request, limit_type)
            return await func(*args, **kwargs)
        return wrapper
    return decorator

# Rate limiting middleware
class RateLimitMiddleware:
    """Middleware for rate limiting"""
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            # Create request object
            request = Request(scope, receive)
            
            # Determine limit type based on path
            path = scope["path"]
            method = scope["method"]
            
            limit_type = "api"  # Default
            
            if path.startswith("/api/auth"):
                limit_type = "auth"
            elif path.startswith("/api/upload") or path.startswith("/api/memories/upload"):
                limit_type = "upload"
            elif path.startswith("/api/ai"):
                limit_type = "ai"
            elif method in ["POST", "PUT", "DELETE"]:
                limit_type = "db_write"
            elif method == "GET":
                limit_type = "db_read"
            
            # Check rate limit
            try:
                await check_rate_limit(request, limit_type)
            except HTTPException as e:
                # Send rate limit response
                response_body = {
                    "error": "Rate limit exceeded",
                    "detail": e.detail,
                    "retry_after": e.headers.get("Retry-After", "60")
                }
                
                await send({
                    "type": "http.response.start",
                    "status": 429,
                    "headers": [
                        (b"content-type", b"application/json"),
                        (b"x-ratelimit-limit", str(rate_limiter.limits[limit_type]["requests"]).encode()),
                        (b"x-ratelimit-remaining", "0".encode()),
                        (b"retry-after", e.headers.get("Retry-After", "60").encode()),
                    ]
                })
                
                await send({
                    "type": "http.response.body",
                    "body": str(response_body).encode()
                })
                return
            
            # Continue with request
            await self.app(scope, receive, send)
        else:
            await self.app(scope, receive, send)

# Database rate limiting
class DatabaseRateLimiter:
    """Rate limiter for database operations"""
    
    def __init__(self):
        self.rate_limiter = rate_limiter
    
    def check_db_read_limit(self, user_id: str = None, ip: str = None) -> bool:
        """Check database read rate limit"""
        key = f"db_read:user:{user_id}" if user_id else f"db_read:ip:{ip}"
        return self.rate_limiter.is_allowed(key, "db_read")
    
    def check_db_write_limit(self, user_id: str = None, ip: str = None) -> bool:
        """Check database write rate limit"""
        key = f"db_write:user:{user_id}" if user_id else f"db_write:ip:{ip}"
        return self.rate_limiter.is_allowed(key, "db_write")
    
    def get_db_remaining(self, operation: str, user_id: str = None, ip: str = None) -> int:
        """Get remaining database operations"""
        key = f"{operation}:user:{user_id}" if user_id else f"{operation}:ip:{ip}"
        return self.rate_limiter.get_remaining(key, operation)

# File upload rate limiting
class FileUploadRateLimiter:
    """Rate limiter for file uploads"""
    
    def __init__(self):
        self.rate_limiter = rate_limiter
    
    def check_upload_limit(self, user_id: str = None, ip: str = None) -> bool:
        """Check file upload rate limit"""
        key = f"upload:user:{user_id}" if user_id else f"upload:ip:{ip}"
        return self.rate_limiter.is_allowed(key, "upload")
    
    def check_download_limit(self, user_id: str = None, ip: str = None) -> bool:
        """Check file download rate limit"""
        key = f"download:user:{user_id}" if user_id else f"download:ip:{ip}"
        return self.rate_limiter.is_allowed(key, "file_download")

# AI service rate limiting
class AIServiceRateLimiter:
    """Rate limiter for AI services"""
    
    def __init__(self):
        self.rate_limiter = rate_limiter
    
    def check_ai_limit(self, service: str, user_id: str = None, ip: str = None) -> bool:
        """Check AI service rate limit"""
        key = f"ai:{service}:user:{user_id}" if user_id else f"ai:{service}:ip:{ip}"
        return self.rate_limiter.is_allowed(key, "ai")
    
    def get_ai_remaining(self, service: str, user_id: str = None, ip: str = None) -> int:
        """Get remaining AI service calls"""
        key = f"ai:{service}:user:{user_id}" if user_id else f"ai:{service}:ip:{ip}"
        return self.rate_limiter.get_remaining(key, "ai")

# Export rate limiting components
__all__ = [
    'rate_limiter',
    'RateLimitMiddleware',
    'rate_limit',
    'check_rate_limit',
    'get_client_ip',
    'get_rate_limit_key',
    'DatabaseRateLimiter',
    'FileUploadRateLimiter',
    'AIServiceRateLimiter',
] 