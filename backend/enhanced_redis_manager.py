#!/usr/bin/env python3
"""
Enhanced Redis Manager for Elmowafiplatform
Advanced caching strategies, pub/sub, clustering support
"""

import json
import pickle
import hashlib
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Union, Callable, Set
from dataclasses import dataclass, asdict
from enum import Enum
import time

logger = logging.getLogger(__name__)

class CacheStrategy(Enum):
    """Cache invalidation strategies"""
    TTL_ONLY = "ttl_only"
    WRITE_THROUGH = "write_through"
    WRITE_BEHIND = "write_behind"
    CACHE_ASIDE = "cache_aside"
    READ_THROUGH = "read_through"

class SerializationFormat(Enum):
    """Serialization formats for cached data"""
    JSON = "json"
    PICKLE = "pickle"
    STRING = "string"
    MSGPACK = "msgpack"

@dataclass
class CachePolicy:
    """Cache policy configuration"""
    ttl: int = 300  # Time to live in seconds
    strategy: CacheStrategy = CacheStrategy.CACHE_ASIDE
    compression: bool = False
    serialization: SerializationFormat = SerializationFormat.JSON
    tags: List[str] = None
    namespace: str = "default"
    max_memory_percent: float = 80.0
    eviction_policy: str = "allkeys-lru"

@dataclass
class CacheEntry:
    """Cache entry with metadata"""
    key: str
    value: Any
    created_at: datetime
    expires_at: Optional[datetime]
    access_count: int = 0
    last_accessed: Optional[datetime] = None
    tags: Set[str] = None
    size_bytes: int = 0

class EnhancedRedisManager:
    """Enhanced Redis manager with advanced caching capabilities"""
    
    def __init__(self, redis_url: str = "redis://localhost:6379"):
        self.redis_url = redis_url
        self.redis = None
        self.redis_available = False
        self.local_cache: Dict[str, CacheEntry] = {}
        self.cache_stats = {
            'hits': 0,
            'misses': 0,
            'sets': 0,
            'deletes': 0,
            'expires': 0,
            'evictions': 0,
            'memory_usage': 0
        }
        self.subscribers: Dict[str, List[Callable]] = {}
        self.default_policy = CachePolicy()
        
    async def connect(self):
        """Connect to Redis with enhanced configuration"""
        try:
            import aioredis
            
            # Try different connection methods based on aioredis version
            try:
                # For aioredis 2.0+
                self.redis = aioredis.from_url(
                    self.redis_url,
                    encoding="utf-8",
                    decode_responses=True,
                    max_connections=20,
                    retry_on_timeout=True
                )
                await self.redis.ping()
            except (AttributeError, TypeError):
                # For aioredis 1.3.x
                self.redis = await aioredis.create_redis_pool(
                    self.redis_url,
                    encoding="utf-8",
                    minsize=1,
                    maxsize=20
                )
                await self.redis.ping()
            
            self.redis_available = True
            logger.info("Enhanced Redis connected successfully")
            
            # Configure Redis for optimal performance
            await self._configure_redis()
            
        except Exception as e:
            logger.warning(f"Redis not available, using local cache: {e}")
            self.redis_available = False
    
    async def disconnect(self):
        """Disconnect from Redis"""
        if self.redis_available and self.redis:
            try:
                if hasattr(self.redis, 'close'):
                    self.redis.close()
                if hasattr(self.redis, 'wait_closed'):
                    await self.redis.wait_closed()
            except:
                pass
            self.redis_available = False
    
    async def _configure_redis(self):
        """Configure Redis for optimal performance"""
        if not self.redis_available:
            return
        
        try:
            # Set memory policy
            await self.redis.config_set("maxmemory-policy", "allkeys-lru")
            
            # Enable keyspace notifications for cache invalidation
            await self.redis.config_set("notify-keyspace-events", "Ex")
            
            # Set reasonable timeout values
            await self.redis.config_set("timeout", "300")
            
            logger.info("Redis configuration applied successfully")
            
        except Exception as e:
            logger.warning(f"Could not configure Redis: {e}")
    
    def _serialize_value(self, value: Any, format_type: SerializationFormat) -> bytes:
        """Serialize value based on format type"""
        if format_type == SerializationFormat.JSON:
            return json.dumps(value, default=str).encode('utf-8')
        elif format_type == SerializationFormat.PICKLE:
            return pickle.dumps(value)
        elif format_type == SerializationFormat.STRING:
            return str(value).encode('utf-8')
        else:  # Default to JSON
            return json.dumps(value, default=str).encode('utf-8')
    
    def _deserialize_value(self, data: bytes, format_type: SerializationFormat) -> Any:
        """Deserialize value based on format type"""
        if format_type == SerializationFormat.JSON:
            return json.loads(data.decode('utf-8'))
        elif format_type == SerializationFormat.PICKLE:
            return pickle.loads(data)
        elif format_type == SerializationFormat.STRING:
            return data.decode('utf-8')
        else:  # Default to JSON
            return json.loads(data.decode('utf-8'))
    
    def _generate_cache_key(self, key: str, namespace: str = "default") -> str:
        """Generate namespaced cache key"""
        return f"{namespace}:{key}"
    
    def _compress_data(self, data: bytes) -> bytes:
        """Compress data using gzip"""
        try:
            import gzip
            return gzip.compress(data)
        except:
            return data
    
    def _decompress_data(self, data: bytes) -> bytes:
        """Decompress data using gzip"""
        try:
            import gzip
            return gzip.decompress(data)
        except:
            return data
    
    async def get(self, 
                  key: str, 
                  namespace: str = "default",
                  policy: Optional[CachePolicy] = None) -> Optional[Any]:
        """Enhanced get with policy support"""
        cache_key = self._generate_cache_key(key, namespace)
        policy = policy or self.default_policy
        
        # Try Redis first
        if self.redis_available:
            try:
                data = await self.redis.get(cache_key)
                if data:
                    # Handle compressed data
                    if policy.compression:
                        data = self._decompress_data(data.encode('latin-1'))
                    else:
                        data = data.encode('utf-8')
                    
                    value = self._deserialize_value(data, policy.serialization)
                    self.cache_stats['hits'] += 1
                    
                    # Update access statistics
                    await self._update_access_stats(cache_key)
                    
                    return value
                else:
                    self.cache_stats['misses'] += 1
            except Exception as e:
                logger.error(f"Redis get error: {e}")
        
        # Fallback to local cache
        if cache_key in self.local_cache:
            entry = self.local_cache[cache_key]
            if entry.expires_at is None or entry.expires_at > datetime.now():
                entry.access_count += 1
                entry.last_accessed = datetime.now()
                self.cache_stats['hits'] += 1
                return entry.value
            else:
                # Expired entry
                del self.local_cache[cache_key]
                self.cache_stats['expires'] += 1
        
        self.cache_stats['misses'] += 1
        return None
    
    async def set(self, 
                  key: str, 
                  value: Any,
                  ttl: Optional[int] = None,
                  namespace: str = "default",
                  policy: Optional[CachePolicy] = None,
                  tags: Optional[List[str]] = None) -> bool:
        """Enhanced set with policy support"""
        cache_key = self._generate_cache_key(key, namespace)
        policy = policy or self.default_policy
        ttl = ttl or policy.ttl
        tags = tags or policy.tags or []
        
        # Serialize value
        try:
            serialized_data = self._serialize_value(value, policy.serialization)
            
            # Compress if needed
            if policy.compression:
                serialized_data = self._compress_data(serialized_data)
            
            # Store in Redis
            if self.redis_available:
                try:
                    if ttl:
                        await self.redis.setex(cache_key, ttl, serialized_data.decode('latin-1'))
                    else:
                        await self.redis.set(cache_key, serialized_data.decode('latin-1'))
                    
                    # Store tags for invalidation
                    if tags:
                        await self._store_tags(cache_key, tags)
                    
                    self.cache_stats['sets'] += 1
                    return True
                    
                except Exception as e:
                    logger.error(f"Redis set error: {e}")
            
            # Store in local cache as fallback
            expires_at = datetime.now() + timedelta(seconds=ttl) if ttl else None
            entry = CacheEntry(
                key=cache_key,
                value=value,
                created_at=datetime.now(),
                expires_at=expires_at,
                tags=set(tags),
                size_bytes=len(serialized_data)
            )
            
            self.local_cache[cache_key] = entry
            self.cache_stats['sets'] += 1
            
            # Manage local cache size
            await self._manage_local_cache_size()
            
            return True
            
        except Exception as e:
            logger.error(f"Error setting cache key {cache_key}: {e}")
            return False
    
    async def delete(self, key: str, namespace: str = "default") -> bool:
        """Enhanced delete with cleanup"""
        cache_key = self._generate_cache_key(key, namespace)
        
        deleted = False
        
        # Delete from Redis
        if self.redis_available:
            try:
                result = await self.redis.delete(cache_key)
                deleted = result > 0
            except Exception as e:
                logger.error(f"Redis delete error: {e}")
        
        # Delete from local cache
        if cache_key in self.local_cache:
            del self.local_cache[cache_key]
            deleted = True
        
        if deleted:
            self.cache_stats['deletes'] += 1
        
        return deleted
    
    async def exists(self, key: str, namespace: str = "default") -> bool:
        """Check if key exists"""
        cache_key = self._generate_cache_key(key, namespace)
        
        # Check Redis first
        if self.redis_available:
            try:
                return await self.redis.exists(cache_key) > 0
            except Exception as e:
                logger.error(f"Redis exists error: {e}")
        
        # Check local cache
        if cache_key in self.local_cache:
            entry = self.local_cache[cache_key]
            if entry.expires_at is None or entry.expires_at > datetime.now():
                return True
            else:
                # Expired entry
                del self.local_cache[cache_key]
        
        return False
    
    async def expire(self, key: str, ttl: int, namespace: str = "default") -> bool:
        """Set expiration for existing key"""
        cache_key = self._generate_cache_key(key, namespace)
        
        # Set expiration in Redis
        if self.redis_available:
            try:
                return await self.redis.expire(cache_key, ttl) == 1
            except Exception as e:
                logger.error(f"Redis expire error: {e}")
        
        # Set expiration in local cache
        if cache_key in self.local_cache:
            entry = self.local_cache[cache_key]
            entry.expires_at = datetime.now() + timedelta(seconds=ttl)
            return True
        
        return False
    
    async def increment(self, key: str, amount: int = 1, namespace: str = "default") -> int:
        """Increment counter"""
        cache_key = self._generate_cache_key(key, namespace)
        
        if self.redis_available:
            try:
                return await self.redis.incrby(cache_key, amount)
            except Exception as e:
                logger.error(f"Redis increment error: {e}")
        
        # Fallback to local cache
        current_value = 0
        if cache_key in self.local_cache:
            try:
                current_value = int(self.local_cache[cache_key].value)
            except (ValueError, TypeError):
                current_value = 0
        
        new_value = current_value + amount
        await self.set(key, new_value, namespace=namespace)
        return new_value
    
    async def _store_tags(self, cache_key: str, tags: List[str]):
        """Store tags for cache invalidation"""
        if not self.redis_available:
            return
        
        try:
            for tag in tags:
                tag_key = f"tag:{tag}"
                await self.redis.sadd(tag_key, cache_key)
                # Set expiration for tag keys to prevent memory leaks
                await self.redis.expire(tag_key, 3600)
        except Exception as e:
            logger.error(f"Error storing tags: {e}")
    
    async def invalidate_by_tag(self, tag: str) -> int:
        """Invalidate all cache entries with specific tag"""
        if not self.redis_available:
            return 0
        
        try:
            tag_key = f"tag:{tag}"
            cache_keys = await self.redis.smembers(tag_key)
            
            if cache_keys:
                # Delete all cached entries
                await self.redis.delete(*cache_keys)
                # Delete the tag key
                await self.redis.delete(tag_key)
                
                logger.info(f"Invalidated {len(cache_keys)} cache entries for tag: {tag}")
                return len(cache_keys)
            
            return 0
            
        except Exception as e:
            logger.error(f"Error invalidating by tag {tag}: {e}")
            return 0
    
    async def invalidate_by_pattern(self, pattern: str, namespace: str = "default") -> int:
        """Invalidate cache entries matching pattern"""
        if not self.redis_available:
            return 0
        
        try:
            search_pattern = f"{namespace}:{pattern}"
            keys = []
            
            # Use scan for memory-efficient iteration
            async for key in self.redis.scan_iter(match=search_pattern):
                keys.append(key)
            
            if keys:
                await self.redis.delete(*keys)
                logger.info(f"Invalidated {len(keys)} cache entries matching pattern: {pattern}")
                return len(keys)
            
            return 0
            
        except Exception as e:
            logger.error(f"Error invalidating by pattern {pattern}: {e}")
            return 0
    
    async def _update_access_stats(self, cache_key: str):
        """Update access statistics"""
        if self.redis_available:
            try:
                stats_key = f"stats:{cache_key}"
                await self.redis.hincrby(stats_key, "access_count", 1)
                await self.redis.hset(stats_key, "last_accessed", datetime.now().isoformat())
                await self.redis.expire(stats_key, 3600)  # Keep stats for 1 hour
            except Exception as e:
                logger.error(f"Error updating access stats: {e}")
    
    async def _manage_local_cache_size(self):
        """Manage local cache size using LRU eviction"""
        max_entries = 1000  # Configurable limit
        
        if len(self.local_cache) > max_entries:
            # Sort by last accessed time and remove oldest entries
            sorted_entries = sorted(
                self.local_cache.items(),
                key=lambda x: x[1].last_accessed or x[1].created_at
            )
            
            # Remove oldest 10% of entries
            entries_to_remove = int(max_entries * 0.1)
            for i in range(entries_to_remove):
                key, _ = sorted_entries[i]
                del self.local_cache[key]
                self.cache_stats['evictions'] += 1
    
    async def get_cache_stats(self) -> Dict[str, Any]:
        """Get comprehensive cache statistics"""
        stats = dict(self.cache_stats)
        
        # Calculate hit rate
        total_requests = stats['hits'] + stats['misses']
        hit_rate = (stats['hits'] / total_requests * 100) if total_requests > 0 else 0
        
        # Local cache stats
        local_cache_size = len(self.local_cache)
        local_memory_usage = sum(entry.size_bytes for entry in self.local_cache.values())
        
        # Redis stats
        redis_info = {}
        if self.redis_available:
            try:
                redis_info = await self.redis.info()
            except:
                pass
        
        return {
            **stats,
            'hit_rate_percent': round(hit_rate, 2),
            'local_cache_entries': local_cache_size,
            'local_memory_usage_bytes': local_memory_usage,
            'redis_available': self.redis_available,
            'redis_info': {
                'used_memory': redis_info.get('used_memory', 0),
                'used_memory_human': redis_info.get('used_memory_human', 'N/A'),
                'connected_clients': redis_info.get('connected_clients', 0),
                'total_commands_processed': redis_info.get('total_commands_processed', 0)
            },
            'timestamp': datetime.now().isoformat()
        }
    
    async def clear_cache(self, namespace: str = None) -> bool:
        """Clear cache entries"""
        try:
            if namespace:
                # Clear specific namespace
                pattern = f"{namespace}:*"
                await self.invalidate_by_pattern("*", namespace)
                
                # Clear from local cache
                keys_to_remove = [key for key in self.local_cache.keys() if key.startswith(f"{namespace}:")]
                for key in keys_to_remove:
                    del self.local_cache[key]
            else:
                # Clear all cache
                if self.redis_available:
                    await self.redis.flushdb()
                
                self.local_cache.clear()
            
            logger.info(f"Cache cleared for namespace: {namespace or 'all'}")
            return True
            
        except Exception as e:
            logger.error(f"Error clearing cache: {e}")
            return False
    
    # Pub/Sub functionality
    async def publish(self, channel: str, message: Any) -> int:
        """Publish message to channel"""
        if not self.redis_available:
            return 0
        
        try:
            serialized_message = json.dumps(message, default=str)
            return await self.redis.publish(channel, serialized_message)
        except Exception as e:
            logger.error(f"Error publishing to channel {channel}: {e}")
            return 0
    
    async def subscribe(self, channels: List[str], callback: Callable[[str, Any], None]):
        """Subscribe to channels with callback"""
        if not self.redis_available:
            logger.warning("Redis not available for subscription")
            return
        
        try:
            pubsub = self.redis.pubsub()
            await pubsub.subscribe(*channels)
            
            async def message_handler():
                async for message in pubsub.listen():
                    if message['type'] == 'message':
                        try:
                            data = json.loads(message['data'])
                            await callback(message['channel'], data)
                        except Exception as e:
                            logger.error(f"Error processing message: {e}")
            
            # Start message handler task
            asyncio.create_task(message_handler())
            
        except Exception as e:
            logger.error(f"Error subscribing to channels: {e}")
    
    # Advanced cache warming strategies
    async def warm_cache_batch(self, entries: List[Dict[str, Any]], policy: Optional[CachePolicy] = None):
        """Warm cache with batch of entries"""
        policy = policy or self.default_policy
        
        tasks = []
        for entry in entries:
            task = self.set(
                entry['key'],
                entry['value'],
                ttl=entry.get('ttl', policy.ttl),
                namespace=entry.get('namespace', policy.namespace),
                policy=policy,
                tags=entry.get('tags')
            )
            tasks.append(task)
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        successful = sum(1 for result in results if result is True)
        
        logger.info(f"Cache warming completed: {successful}/{len(entries)} entries loaded")
        return successful

# Global enhanced Redis manager
enhanced_redis = EnhancedRedisManager()

# Cache decorators using enhanced manager
def enhanced_cache(
    ttl: int = 300,
    namespace: str = "default",
    policy: Optional[CachePolicy] = None,
    key_generator: Optional[Callable] = None
):
    """Enhanced caching decorator with policy support"""
    
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Generate cache key
            if key_generator:
                cache_key = key_generator(*args, **kwargs)
            else:
                # Default key generation
                key_parts = [func.__name__]
                key_parts.extend([str(arg) for arg in args])
                key_parts.extend([f"{k}:{v}" for k, v in sorted(kwargs.items())])
                cache_key = hashlib.md5(":".join(key_parts).encode()).hexdigest()
            
            # Try to get cached result
            cached_result = await enhanced_redis.get(cache_key, namespace, policy)
            if cached_result is not None:
                return cached_result
            
            # Execute function and cache result
            result = await func(*args, **kwargs)
            
            if result is not None:
                await enhanced_redis.set(
                    cache_key,
                    result,
                    ttl=ttl,
                    namespace=namespace,
                    policy=policy
                )
            
            return result
        
        return wrapper
    return decorator

# Initialize enhanced Redis manager
async def init_enhanced_redis():
    """Initialize enhanced Redis manager"""
    await enhanced_redis.connect()

async def close_enhanced_redis():
    """Close enhanced Redis manager"""
    await enhanced_redis.disconnect()