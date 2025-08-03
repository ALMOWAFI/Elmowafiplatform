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
            # Set async_redis to self.redis for compatibility with websocket_redis_manager
            self.async_redis = self.redis
            logger.info("Redis connected successfully")
        except Exception as e:
            logger.warning(f"Redis not available, using in-memory cache: {e}")
            self.redis_available = False
            # Create a dummy async_redis for compatibility
            self.async_redis = None
    
    async def disconnect(self):
        """Disconnect from Redis"""
        if self.redis_available and hasattr(self, 'redis'):
            self.redis.close()
            await self.redis.wait_closed()
    
    async def get(self, key: str, namespace: str = "default") -> Optional[str]:
        """Get value from cache"""
        # Add namespace to key
        namespaced_key = f"{namespace}:{key}" if namespace else key
        
        if self.redis_available:
            try:
                return await self.redis.get(namespaced_key)
            except:
                pass
        return self.cache.get(namespaced_key)
    
    async def set(self, key: str, value: str, ttl: Optional[int] = None, namespace: str = "default", tags: Optional[list] = None) -> bool:
        """Set value in cache"""
        # Add namespace to key
        namespaced_key = f"{namespace}:{key}" if namespace else key
        
        if self.redis_available:
            try:
                if ttl:
                    await self.redis.setex(namespaced_key, ttl, value)
                else:
                    await self.redis.set(namespaced_key, value)
                return True
            except Exception as e:
                logger.error(f"Redis set error: {e}")
        
        # Fallback to in-memory cache
        self.cache[namespaced_key] = value
        return True
    
    async def delete(self, key: str, namespace: str = "default") -> bool:
        """Delete key from cache"""
        # Add namespace to key
        namespaced_key = f"{namespace}:{key}" if namespace else key
        
        if self.redis_available:
            try:
                await self.redis.delete(namespaced_key)
            except Exception as e:
                logger.error(f"Redis delete error: {e}")
        
        self.cache.pop(namespaced_key, None)
        return True
    
    async def exists(self, key: str, namespace: str = "default") -> bool:
        """Check if key exists"""
        # Add namespace to key
        namespaced_key = f"{namespace}:{key}" if namespace else key
        
        if self.redis_available:
            try:
                return await self.redis.exists(namespaced_key)
            except Exception as e:
                logger.error(f"Redis exists error: {e}")
        return namespaced_key in self.cache
        
    async def publish(self, channel: str, message: str) -> int:
        """Publish message to Redis channel"""
        if self.redis_available:
            try:
                return await self.redis.publish(channel, message)
            except Exception as e:
                logger.error(f"Redis publish error: {e}")
        return 0
    
    async def subscribe(self, channels: list, callback: callable) -> None:
        """Subscribe to Redis channels"""
        if self.redis_available:
            try:
                # For aioredis 1.3.1 compatibility
                res = await self.redis.subscribe(*channels)
                channel = res[0]
                
                async def reader():
                    while await channel.wait_message():
                        msg = await channel.get()
                        await callback(channel.name.decode(), msg.decode())
                
                asyncio.create_task(reader())
                return True
            except Exception as e:
                logger.error(f"Redis subscribe error: {e}")
        return False
        
    async def invalidate_by_tag(self, tag: str) -> bool:
        """Invalidate cache by tag - simplified version"""
        # In a full implementation, this would delete all keys associated with the tag
        # For this simple version, we'll just log that it was called
        logger.info(f"Cache invalidation for tag {tag} requested (not implemented in simple version)")
        return True

# Global instance
redis_manager = SimpleRedisManager()

async def init_redis():
    """Initialize Redis connection"""
    await redis_manager.connect()

async def close_redis():
    """Close Redis connection"""
    await redis_manager.disconnect()