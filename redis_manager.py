#!/usr/bin/env python3
"""
Redis Manager for Elmowafiplatform
Handles caching, pub/sub messaging, session management, and performance optimization
"""

import json
import pickle
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Union, Callable
from functools import wraps
from dataclasses import dataclass
from enum import Enum

import redis
import aioredis
from redis.connection import ConnectionPool
from redis.sentinel import Sentinel
from redis.exceptions import ConnectionError, RedisError

logger = logging.getLogger(__name__)

class CacheStrategy(Enum):
    """Cache invalidation strategies"""
    TIME_BASED = "time_based"
    TAG_BASED = "tag_based"
    DEPENDENCY_BASED = "dependency_based"
    WRITE_THROUGH = "write_through"
    WRITE_BACK = "write_back"

@dataclass
class CacheConfig:
    """Cache configuration settings"""
    default_ttl: int = 3600  # 1 hour
    max_memory: str = "256mb"
    eviction_policy: str = "allkeys-lru"
    key_prefix: str = "elmowafiplatform"
    compression: bool = True
    serialization: str = "json"  # json, pickle, msgpack

@dataclass
class RedisClusterConfig:
    """Redis cluster configuration"""
    nodes: List[Dict[str, Union[str, int]]]
    password: Optional[str] = None
    decode_responses: bool = True
    skip_full_coverage_check: bool = True
    health_check_interval: int = 30

class RedisManager:
    """Comprehensive Redis manager for caching and real-time features"""
    
    def __init__(self, 
                 redis_url: str = "redis://localhost:6379/0",
                 cache_config: Optional[CacheConfig] = None,
                 cluster_config: Optional[RedisClusterConfig] = None):
        self.redis_url = redis_url
        self.cache_config = cache_config or CacheConfig()
        self.cluster_config = cluster_config
        
        # Connection pools
        self.sync_redis: Optional[redis.Redis] = None
        self.async_redis: Optional[aioredis.Redis] = None
        self.pubsub: Optional[redis.client.PubSub] = None
        
        # Performance metrics
        self.cache_hits = 0
        self.cache_misses = 0
        self.total_operations = 0
        
        # Cache invalidation tracking
        self.tag_dependencies: Dict[str, set] = {}
        self.key_tags: Dict[str, set] = {}
        
    async def connect(self):
        """Initialize Redis connections"""
        try:
            # Synchronous connection
            if self.cluster_config:
                from rediscluster import RedisCluster
                self.sync_redis = RedisCluster(
                    startup_nodes=self.cluster_config.nodes,
                    password=self.cluster_config.password,
                    decode_responses=self.cluster_config.decode_responses,
                    skip_full_coverage_check=self.cluster_config.skip_full_coverage_check
                )
            else:
                self.sync_redis = redis.from_url(
                    self.redis_url,
                    decode_responses=True,
                    max_connections=20
                )
            
            # Asynchronous connection
            self.async_redis = await aioredis.from_url(
                self.redis_url,
                decode_responses=True,
                max_connections=20
            )
            
            # Test connections
            await self.async_redis.ping()
            self.sync_redis.ping()
            
            # Setup pub/sub
            self.pubsub = self.sync_redis.pubsub()
            
            logger.info("Redis connections established successfully")
            
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            raise ConnectionError(f"Redis connection failed: {e}")
    
    async def disconnect(self):
        """Close Redis connections"""
        if self.async_redis:
            await self.async_redis.aclose()
        if self.pubsub:
            self.pubsub.close()
        if self.sync_redis:
            self.sync_redis.close()
    
    def _serialize_value(self, value: Any) -> str:
        """Serialize value for Redis storage"""
        if self.cache_config.serialization == "pickle":
            return pickle.dumps(value).hex()
        elif self.cache_config.serialization == "json":
            return json.dumps(value, default=str)
        else:
            return str(value)
    
    def _deserialize_value(self, value: str) -> Any:
        """Deserialize value from Redis"""
        if not value:
            return None
            
        try:
            if self.cache_config.serialization == "pickle":
                return pickle.loads(bytes.fromhex(value))
            elif self.cache_config.serialization == "json":
                return json.loads(value)
            else:
                return value
        except Exception as e:
            logger.warning(f"Failed to deserialize value: {e}")
            return value
    
    def _build_key(self, key: str, namespace: str = "default") -> str:
        """Build namespaced cache key"""
        return f"{self.cache_config.key_prefix}:{namespace}:{key}"
    
    # CACHING OPERATIONS
    
    async def get(self, key: str, namespace: str = "default") -> Any:
        """Get value from cache"""
        redis_key = self._build_key(key, namespace)
        
        try:
            value = await self.async_redis.get(redis_key)
            if value is not None:
                self.cache_hits += 1
                self.total_operations += 1
                return self._deserialize_value(value)
            else:
                self.cache_misses += 1
                self.total_operations += 1
                return None
                
        except Exception as e:
            logger.error(f"Cache get error for key {redis_key}: {e}")
            self.cache_misses += 1
            self.total_operations += 1
            return None
    
    async def set(self, key: str, value: Any, ttl: Optional[int] = None, 
                  namespace: str = "default", tags: Optional[List[str]] = None) -> bool:
        """Set value in cache with optional TTL and tags"""
        redis_key = self._build_key(key, namespace)
        ttl = ttl or self.cache_config.default_ttl
        
        try:
            serialized_value = self._serialize_value(value)
            
            # Set the main cache entry
            result = await self.async_redis.setex(redis_key, ttl, serialized_value)
            
            # Handle tags for cache invalidation
            if tags:
                await self._set_cache_tags(redis_key, tags, ttl)
            
            self.total_operations += 1
            return result
            
        except Exception as e:
            logger.error(f"Cache set error for key {redis_key}: {e}")
            return False
    
    async def delete(self, key: str, namespace: str = "default") -> bool:
        """Delete value from cache"""
        redis_key = self._build_key(key, namespace)
        
        try:
            # Remove from tag tracking
            await self._remove_cache_tags(redis_key)
            
            # Delete the main key
            result = await self.async_redis.delete(redis_key)
            self.total_operations += 1
            return bool(result)
            
        except Exception as e:
            logger.error(f"Cache delete error for key {redis_key}: {e}")
            return False
    
    async def exists(self, key: str, namespace: str = "default") -> bool:
        """Check if key exists in cache"""
        redis_key = self._build_key(key, namespace)
        return bool(await self.async_redis.exists(redis_key))
    
    async def increment(self, key: str, amount: int = 1, namespace: str = "default") -> int:
        """Increment numeric value in cache"""
        redis_key = self._build_key(key, namespace)
        return await self.async_redis.incrby(redis_key, amount)
    
    async def expire(self, key: str, ttl: int, namespace: str = "default") -> bool:
        """Set expiration time for key"""
        redis_key = self._build_key(key, namespace)
        return await self.async_redis.expire(redis_key, ttl)
    
    # TAG-BASED CACHE INVALIDATION
    
    async def _set_cache_tags(self, cache_key: str, tags: List[str], ttl: int):
        """Associate cache key with tags for invalidation"""
        for tag in tags:
            tag_key = self._build_key(f"tag:{tag}", "tags")
            
            # Add cache key to tag set
            await self.async_redis.sadd(tag_key, cache_key)
            await self.async_redis.expire(tag_key, ttl + 3600)  # Tag lives longer than cache
    
    async def _remove_cache_tags(self, cache_key: str):
        """Remove cache key from all tag associations"""
        # This is a simplified version - in production, you'd want to track tags per key
        pass
    
    async def invalidate_by_tag(self, tag: str) -> int:
        """Invalidate all cache entries with a specific tag"""
        tag_key = self._build_key(f"tag:{tag}", "tags")
        
        try:
            # Get all keys associated with this tag
            keys = await self.async_redis.smembers(tag_key)
            
            if keys:
                # Delete all associated cache keys
                deleted = await self.async_redis.delete(*keys)
                
                # Remove the tag set itself
                await self.async_redis.delete(tag_key)
                
                logger.info(f"Invalidated {deleted} cache entries for tag: {tag}")
                return deleted
            
            return 0
            
        except Exception as e:
            logger.error(f"Tag invalidation error for tag {tag}: {e}")
            return 0
    
    # HASH OPERATIONS (for complex objects)
    
    async def hget(self, key: str, field: str, namespace: str = "default") -> Any:
        """Get hash field value"""
        redis_key = self._build_key(key, namespace)
        value = await self.async_redis.hget(redis_key, field)
        return self._deserialize_value(value) if value else None
    
    async def hset(self, key: str, field: str, value: Any, 
                   namespace: str = "default", ttl: Optional[int] = None) -> bool:
        """Set hash field value"""
        redis_key = self._build_key(key, namespace)
        serialized_value = self._serialize_value(value)
        
        result = await self.async_redis.hset(redis_key, field, serialized_value)
        
        if ttl:
            await self.async_redis.expire(redis_key, ttl)
        
        return bool(result)
    
    async def hgetall(self, key: str, namespace: str = "default") -> Dict[str, Any]:
        """Get all hash fields"""
        redis_key = self._build_key(key, namespace)
        hash_data = await self.async_redis.hgetall(redis_key)
        
        return {
            field: self._deserialize_value(value)
            for field, value in hash_data.items()
        }
    
    # LIST OPERATIONS (for queues and feeds)
    
    async def lpush(self, key: str, *values: Any, namespace: str = "default") -> int:
        """Push values to left of list"""
        redis_key = self._build_key(key, namespace)
        serialized_values = [self._serialize_value(v) for v in values]
        return await self.async_redis.lpush(redis_key, *serialized_values)
    
    async def rpush(self, key: str, *values: Any, namespace: str = "default") -> int:
        """Push values to right of list"""
        redis_key = self._build_key(key, namespace)
        serialized_values = [self._serialize_value(v) for v in values]
        return await self.async_redis.rpush(redis_key, *serialized_values)
    
    async def lpop(self, key: str, namespace: str = "default") -> Any:
        """Pop value from left of list"""
        redis_key = self._build_key(key, namespace)
        value = await self.async_redis.lpop(redis_key)
        return self._deserialize_value(value) if value else None
    
    async def lrange(self, key: str, start: int = 0, end: int = -1, 
                     namespace: str = "default") -> List[Any]:
        """Get range of list values"""
        redis_key = self._build_key(key, namespace)
        values = await self.async_redis.lrange(redis_key, start, end)
        return [self._deserialize_value(v) for v in values]
    
    # SET OPERATIONS (for unique collections)
    
    async def sadd(self, key: str, *values: Any, namespace: str = "default") -> int:
        """Add values to set"""
        redis_key = self._build_key(key, namespace)
        serialized_values = [self._serialize_value(v) for v in values]
        return await self.async_redis.sadd(redis_key, *serialized_values)
    
    async def srem(self, key: str, *values: Any, namespace: str = "default") -> int:
        """Remove values from set"""
        redis_key = self._build_key(key, namespace)
        serialized_values = [self._serialize_value(v) for v in values]
        return await self.async_redis.srem(redis_key, *serialized_values)
    
    async def smembers(self, key: str, namespace: str = "default") -> set:
        """Get all set members"""
        redis_key = self._build_key(key, namespace)
        values = await self.async_redis.smembers(redis_key)
        return {self._deserialize_value(v) for v in values}
    
    # PUB/SUB OPERATIONS
    
    async def publish(self, channel: str, message: Any) -> int:
        """Publish message to channel"""
        serialized_message = self._serialize_value(message)
        return await self.async_redis.publish(channel, serialized_message)
    
    async def subscribe(self, channels: List[str], callback: Callable):
        """Subscribe to channels with callback"""
        pubsub = self.async_redis.pubsub()
        
        try:
            await pubsub.subscribe(*channels)
            
            async for message in pubsub.listen():
                if message['type'] == 'message':
                    channel = message['channel']
                    data = self._deserialize_value(message['data'])
                    await callback(channel, data)
                    
        except Exception as e:
            logger.error(f"PubSub error: {e}")
        finally:
            await pubsub.unsubscribe(*channels)
            await pubsub.aclose()
    
    # SESSION MANAGEMENT
    
    async def create_session(self, user_id: str, session_data: Dict[str, Any], 
                           ttl: int = 86400) -> str:
        """Create user session"""
        session_id = f"session:{user_id}:{datetime.now().timestamp()}"
        session_key = self._build_key(session_id, "sessions")
        
        session_info = {
            'user_id': user_id,
            'created_at': datetime.now().isoformat(),
            'last_activity': datetime.now().isoformat(),
            'data': session_data
        }
        
        await self.set(session_key, session_info, ttl, "sessions")
        return session_id
    
    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get session data"""
        session_key = self._build_key(session_id, "sessions")
        return await self.get(session_key, "sessions")
    
    async def update_session(self, session_id: str, session_data: Dict[str, Any]) -> bool:
        """Update session data"""
        session = await self.get_session(session_id)
        if session:
            session['data'].update(session_data)
            session['last_activity'] = datetime.now().isoformat()
            return await self.set(session_id, session, namespace="sessions")
        return False
    
    async def delete_session(self, session_id: str) -> bool:
        """Delete session"""
        return await self.delete(session_id, "sessions")
    
    # RATE LIMITING
    
    async def rate_limit(self, key: str, limit: int, window: int, 
                        namespace: str = "rate_limit") -> Dict[str, Any]:
        """Token bucket rate limiting"""
        redis_key = self._build_key(key, namespace)
        current_time = int(datetime.now().timestamp())
        
        # Get current bucket state
        bucket = await self.hgetall(redis_key, namespace)
        
        if not bucket:
            # Initialize bucket
            bucket = {
                'tokens': limit,
                'last_refill': current_time
            }
        
        # Calculate tokens to add based on time passed
        time_passed = current_time - int(bucket.get('last_refill', current_time))
        tokens_to_add = (time_passed / window) * limit
        
        # Update bucket
        tokens = min(limit, bucket.get('tokens', 0) + tokens_to_add)
        
        if tokens >= 1:
            # Allow request
            tokens -= 1
            allowed = True
        else:
            # Deny request
            allowed = False
        
        # Update bucket state
        await self.hset(redis_key, 'tokens', tokens, namespace, window * 2)
        await self.hset(redis_key, 'last_refill', current_time, namespace, window * 2)
        
        return {
            'allowed': allowed,
            'tokens_remaining': int(tokens),
            'reset_time': current_time + window
        }
    
    # DISTRIBUTED LOCKS
    
    async def acquire_lock(self, lock_name: str, timeout: int = 10, 
                          ttl: int = 30) -> Optional[str]:
        """Acquire distributed lock"""
        lock_key = self._build_key(f"lock:{lock_name}", "locks")
        lock_value = f"{datetime.now().timestamp()}"
        
        # Try to acquire lock
        acquired = await self.async_redis.set(
            lock_key, lock_value, nx=True, ex=ttl
        )
        
        if acquired:
            return lock_value
        else:
            return None
    
    async def release_lock(self, lock_name: str, lock_value: str) -> bool:
        """Release distributed lock"""
        lock_key = self._build_key(f"lock:{lock_name}", "locks")
        
        # Lua script for atomic lock release
        lua_script = """
        if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
        else
            return 0
        end
        """
        
        result = await self.async_redis.eval(lua_script, 1, lock_key, lock_value)
        return bool(result)
    
    # PERFORMANCE MONITORING
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache performance statistics"""
        hit_rate = (self.cache_hits / max(self.total_operations, 1)) * 100
        
        return {
            'cache_hits': self.cache_hits,
            'cache_misses': self.cache_misses,
            'total_operations': self.total_operations,
            'hit_rate_percent': round(hit_rate, 2),
            'miss_rate_percent': round(100 - hit_rate, 2)
        }
    
    async def get_redis_info(self) -> Dict[str, Any]:
        """Get Redis server information"""
        try:
            info = await self.async_redis.info()
            
            return {
                'redis_version': info.get('redis_version'),
                'used_memory': info.get('used_memory_human'),
                'connected_clients': info.get('connected_clients'),
                'total_commands_processed': info.get('total_commands_processed'),
                'keyspace_hits': info.get('keyspace_hits', 0),
                'keyspace_misses': info.get('keyspace_misses', 0),
                'expired_keys': info.get('expired_keys', 0)
            }
        except Exception as e:
            logger.error(f"Failed to get Redis info: {e}")
            return {}
    
    async def clear_namespace(self, namespace: str) -> int:
        """Clear all keys in a namespace"""
        pattern = self._build_key("*", namespace)
        keys = []
        
        async for key in self.async_redis.scan_iter(match=pattern):
            keys.append(key)
            
            # Delete in batches to avoid blocking
            if len(keys) >= 100:
                deleted = await self.async_redis.delete(*keys)
                keys = []
        
        # Delete remaining keys
        if keys:
            await self.async_redis.delete(*keys)
        
        return len(keys)

# DECORATOR FOR AUTOMATIC CACHING

def cached(ttl: int = 3600, namespace: str = "default", 
           tags: Optional[List[str]] = None):
    """Decorator for automatic function result caching"""
    
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key from function name and arguments
            cache_key = f"{func.__name__}:{hash(str(args) + str(sorted(kwargs.items())))}"
            
            # Try to get from cache first
            redis_manager = kwargs.get('redis_manager') or getattr(func, 'redis_manager', None)
            if redis_manager:
                cached_result = await redis_manager.get(cache_key, namespace)
                if cached_result is not None:
                    return cached_result
            
            # Execute function
            result = await func(*args, **kwargs)
            
            # Cache the result
            if redis_manager and result is not None:
                await redis_manager.set(cache_key, result, ttl, namespace, tags)
            
            return result
        
        return wrapper
    return decorator

# Global Redis manager instance
redis_manager = RedisManager()

# Startup and shutdown handlers
async def init_redis():
    """Initialize Redis connections"""
    await redis_manager.connect()
    logger.info("Redis manager initialized")

async def close_redis():
    """Close Redis connections"""
    await redis_manager.disconnect()
    logger.info("Redis manager closed") 