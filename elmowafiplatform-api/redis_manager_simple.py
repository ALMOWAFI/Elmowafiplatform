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
        self.async_redis = None  # Will be set during connect
        
    def is_connected(self) -> bool:
        """Check if Redis is connected and available"""
        return self.redis_available
        
    async def connect(self):
        """Try to connect to Redis, fallback to in-memory cache"""
        try:
            import aioredis
            import os
            
            # Get Redis URL from environment variable or use default
            redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')
            
            # For aioredis 1.3.1 compatibility
            self.redis = await aioredis.create_redis_pool(redis_url)
            # Set async_redis for pub/sub operations
            self.async_redis = self.redis
            
            await self.redis.ping()
            self.redis_available = True
            logger.info(f"Redis connected successfully to {redis_url}")
        except Exception as e:
            logger.warning(f"Redis not available, using in-memory cache: {e}")
            self.redis_available = False
            self.async_redis = None
    
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

# Add publish and subscribe methods to SimpleRedisManager
async def publish(self, channel: str, message: str):
    """Publish message to Redis channel"""
    if self.redis_available and self.async_redis:
        try:
            await self.async_redis.publish(channel, message)
            return True
        except Exception as e:
            logger.error(f"Failed to publish to Redis: {e}")
    return False

async def subscribe(self, channels: list, callback):
    """Subscribe to Redis channels"""
    if not self.redis_available or not self.async_redis:
        logger.warning("Redis not available for subscription")
        return False
    
    try:
        # For aioredis 1.3.1 compatibility
        res = await self.async_redis.subscribe(*channels)
        ch_obj = res[0]
        
        # Start listening for messages
        async def reader():
            while await ch_obj.wait_message():
                try:
                    msg = await ch_obj.get()
                    if callable(callback):
                        await callback(ch_obj.name.decode(), msg.decode())
                except Exception as e:
                    logger.error(f"Error processing Redis message: {e}")
        
        # Create task to read messages
        asyncio.create_task(reader())
        return True
    except Exception as e:
        logger.error(f"Failed to subscribe to Redis channels: {e}")
        return False

# Add methods to SimpleRedisManager class
SimpleRedisManager.publish = publish
SimpleRedisManager.subscribe = subscribe