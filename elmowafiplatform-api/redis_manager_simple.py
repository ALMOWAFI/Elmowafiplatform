#!/usr/bin/env python3
"""
Simple Redis Manager for Elmowafiplatform - Compatible with aioredis 1.3.1
"""

import json
import asyncio
import logging
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

class SimpleRedisManager:
    """Simple Redis manager without complex features - for development"""
    
    def __init__(self):
        self.redis_available = False
        self.cache = {}  # In-memory fallback cache
        
    async def connect(self):
        """Try to connect to Redis, fallback to in-memory cache"""
        try:
            import aioredis
            # For aioredis 1.3.1 compatibility
            self.redis = await aioredis.create_redis_pool('redis://localhost:6379')
            await self.redis.ping()
            self.redis_available = True
            logger.info("Redis connected successfully")
        except Exception as e:
            logger.warning(f"Redis not available, using in-memory cache: {e}")
            self.redis_available = False
    
    async def disconnect(self):
        """Disconnect from Redis"""
        if self.redis_available and hasattr(self, 'redis'):
            self.redis.close()
            await self.redis.wait_closed()
    
    async def get(self, key: str) -> Optional[str]:
        """Get value from cache"""
        if self.redis_available:
            try:
                return await self.redis.get(key)
            except:
                pass
        return self.cache.get(key)
    
    async def set(self, key: str, value: str, expire: Optional[int] = None) -> bool:
        """Set value in cache"""
        if self.redis_available:
            try:
                if expire:
                    await self.redis.setex(key, expire, value)
                else:
                    await self.redis.set(key, value)
                return True
            except:
                pass
        
        # Fallback to in-memory cache
        self.cache[key] = value
        return True
    
    async def delete(self, key: str) -> bool:
        """Delete key from cache"""
        if self.redis_available:
            try:
                await self.redis.delete(key)
            except:
                pass
        
        self.cache.pop(key, None)
        return True
    
    async def exists(self, key: str) -> bool:
        """Check if key exists"""
        if self.redis_available:
            try:
                return await self.redis.exists(key)
            except:
                pass
        return key in self.cache

# Global instance
redis_manager = SimpleRedisManager()

async def init_redis():
    """Initialize Redis connection"""
    await redis_manager.connect()

async def close_redis():
    """Close Redis connection"""
    await redis_manager.disconnect()