#!/usr/bin/env python3
"""
Redis Caching Strategy for Elmowafiplatform
Implements caching for user sessions, AI analysis, family tree data, and frequently accessed data
"""

import redis
import json
import logging
import time
import hashlib
from typing import Dict, Any, Optional, List, Union
from datetime import datetime, timedelta
from functools import wraps
import pickle
import os

logger = logging.getLogger(__name__)

class RedisCacheManager:
    """Comprehensive Redis caching manager for Elmowafiplatform"""
    
    def __init__(self, redis_url: str = None):
        self.redis_url = redis_url or os.getenv('REDIS_URL', 'redis://localhost:6379')
        self.redis_client = None
        self.cache_prefix = "elmowafi:"
        
        # Cache configuration
        self.default_ttl = 3600  # 1 hour
        self.session_ttl = 86400  # 24 hours
        self.ai_analysis_ttl = 604800  # 1 week
        self.family_tree_ttl = 1800  # 30 minutes
        self.frequent_data_ttl = 300  # 5 minutes
        
        # Initialize Redis connection
        self._initialize_redis()
    
    def _initialize_redis(self):
        """Initialize Redis connection with error handling"""
        try:
            self.redis_client = redis.from_url(self.redis_url)
            # Test connection
            self.redis_client.ping()
            logger.info("✅ Redis connection established")
        except Exception as e:
            logger.error(f"❌ Redis connection failed: {e}")
            self.redis_client = None
    
    def _get_cache_key(self, category: str, key: str) -> str:
        """Generate cache key with prefix and category"""
        return f"{self.cache_prefix}{category}:{key}"
    
    def _serialize_data(self, data: Any) -> bytes:
        """Serialize data for Redis storage"""
        try:
            return pickle.dumps(data)
        except Exception as e:
            logger.error(f"Serialization error: {e}")
            return pickle.dumps(str(data))
    
    def _deserialize_data(self, data: bytes) -> Any:
        """Deserialize data from Redis storage"""
        try:
            return pickle.loads(data)
        except Exception as e:
            logger.error(f"Deserialization error: {e}")
            return None
    
    def set_cache(self, category: str, key: str, data: Any, ttl: int = None) -> bool:
        """Set cache data with TTL"""
        if not self.redis_client:
            return False
        
        try:
            cache_key = self._get_cache_key(category, key)
            serialized_data = self._serialize_data(data)
            ttl = ttl or self.default_ttl
            
            result = self.redis_client.setex(cache_key, ttl, serialized_data)
            logger.debug(f"Cache set: {cache_key} (TTL: {ttl}s)")
            return result
        except Exception as e:
            logger.error(f"Cache set error: {e}")
            return False
    
    def get_cache(self, category: str, key: str) -> Optional[Any]:
        """Get cache data"""
        if not self.redis_client:
            return None
        
        try:
            cache_key = self._get_cache_key(category, key)
            data = self.redis_client.get(cache_key)
            
            if data:
                deserialized_data = self._deserialize_data(data)
                logger.debug(f"Cache hit: {cache_key}")
                return deserialized_data
            else:
                logger.debug(f"Cache miss: {cache_key}")
                return None
        except Exception as e:
            logger.error(f"Cache get error: {e}")
            return None
    
    def delete_cache(self, category: str, key: str) -> bool:
        """Delete cache data"""
        if not self.redis_client:
            return False
        
        try:
            cache_key = self._get_cache_key(category, key)
            result = self.redis_client.delete(cache_key)
            logger.debug(f"Cache deleted: {cache_key}")
            return result > 0
        except Exception as e:
            logger.error(f"Cache delete error: {e}")
            return False
    
    def clear_category(self, category: str) -> bool:
        """Clear all cache entries in a category"""
        if not self.redis_client:
            return False
        
        try:
            pattern = f"{self.cache_prefix}{category}:*"
            keys = self.redis_client.keys(pattern)
            if keys:
                result = self.redis_client.delete(*keys)
                logger.info(f"Cleared {len(keys)} cache entries for category: {category}")
                return result > 0
            return True
        except Exception as e:
            logger.error(f"Clear category error: {e}")
            return False
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        if not self.redis_client:
            return {"error": "Redis not connected"}
        
        try:
            info = self.redis_client.info()
            return {
                "connected": True,
                "memory_used": info.get('used_memory_human', 'N/A'),
                "keyspace_hits": info.get('keyspace_hits', 0),
                "keyspace_misses": info.get('keyspace_misses', 0),
                "total_commands": info.get('total_commands_processed', 0),
                "connected_clients": info.get('connected_clients', 0)
            }
        except Exception as e:
            logger.error(f"Cache stats error: {e}")
            return {"error": str(e)}

# ============================================================================
# SPECIALIZED CACHE MANAGERS
# ============================================================================

class UserSessionCache:
    """Cache manager for user sessions"""
    
    def __init__(self, cache_manager: RedisCacheManager):
        self.cache_manager = cache_manager
        self.category = "user_sessions"
        self.ttl = cache_manager.session_ttl
    
    def cache_user_session(self, user_id: str, session_data: Dict[str, Any]) -> bool:
        """Cache user session data"""
        return self.cache_manager.set_cache(
            self.category, user_id, session_data, self.ttl
        )
    
    def get_user_session(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get cached user session"""
        return self.cache_manager.get_cache(self.category, user_id)
    
    def invalidate_user_session(self, user_id: str) -> bool:
        """Invalidate user session cache"""
        return self.cache_manager.delete_cache(self.category, user_id)
    
    def cache_user_preferences(self, user_id: str, preferences: Dict[str, Any]) -> bool:
        """Cache user preferences"""
        key = f"{user_id}:preferences"
        return self.cache_manager.set_cache(self.category, key, preferences, self.ttl)

class AIAnalysisCache:
    """Cache manager for AI analysis results"""
    
    def __init__(self, cache_manager: RedisCacheManager):
        self.cache_manager = cache_manager
        self.category = "ai_analysis"
        self.ttl = cache_manager.ai_analysis_ttl
    
    def cache_analysis_result(self, image_hash: str, analysis_result: Dict[str, Any]) -> bool:
        """Cache AI analysis result"""
        return self.cache_manager.set_cache(
            self.category, image_hash, analysis_result, self.ttl
        )
    
    def get_cached_analysis(self, image_hash: str) -> Optional[Dict[str, Any]]:
        """Get cached AI analysis result"""
        return self.cache_manager.get_cache(self.category, image_hash)
    
    def cache_face_recognition(self, face_hash: str, recognition_result: Dict[str, Any]) -> bool:
        """Cache face recognition results"""
        key = f"face_recognition:{face_hash}"
        return self.cache_manager.set_cache(self.category, key, recognition_result, self.ttl)
    
    def get_cached_face_recognition(self, face_hash: str) -> Optional[Dict[str, Any]]:
        """Get cached face recognition result"""
        key = f"face_recognition:{face_hash}"
        return self.cache_manager.get_cache(self.category, key)

class FamilyTreeCache:
    """Cache manager for family tree data"""
    
    def __init__(self, cache_manager: RedisCacheManager):
        self.cache_manager = cache_manager
        self.category = "family_tree"
        self.ttl = cache_manager.family_tree_ttl
    
    def cache_family_tree(self, family_id: str, tree_data: Dict[str, Any]) -> bool:
        """Cache family tree data"""
        return self.cache_manager.set_cache(
            self.category, family_id, tree_data, self.ttl
        )
    
    def get_cached_family_tree(self, family_id: str) -> Optional[Dict[str, Any]]:
        """Get cached family tree data"""
        return self.cache_manager.get_cache(self.category, family_id)
    
    def cache_family_members(self, family_id: str, members_data: List[Dict[str, Any]]) -> bool:
        """Cache family members data"""
        key = f"{family_id}:members"
        return self.cache_manager.set_cache(self.category, key, members_data, self.ttl)
    
    def get_cached_family_members(self, family_id: str) -> Optional[List[Dict[str, Any]]]:
        """Get cached family members data"""
        key = f"{family_id}:members"
        return self.cache_manager.get_cache(self.category, key)
    
    def invalidate_family_cache(self, family_id: str) -> bool:
        """Invalidate all family-related cache"""
        return self.cache_manager.clear_category(self.category)

class FrequentDataCache:
    """Cache manager for frequently accessed data"""
    
    def __init__(self, cache_manager: RedisCacheManager):
        self.cache_manager = cache_manager
        self.category = "frequent_data"
        self.ttl = cache_manager.frequent_data_ttl
    
    def cache_memories(self, family_id: str, memories_data: List[Dict[str, Any]]) -> bool:
        """Cache family memories"""
        key = f"{family_id}:memories"
        return self.cache_manager.set_cache(self.category, key, memories_data, self.ttl)
    
    def get_cached_memories(self, family_id: str) -> Optional[List[Dict[str, Any]]]:
        """Get cached family memories"""
        key = f"{family_id}:memories"
        return self.cache_manager.get_cache(self.category, key)
    
    def cache_albums(self, family_id: str, albums_data: List[Dict[str, Any]]) -> bool:
        """Cache family albums"""
        key = f"{family_id}:albums"
        return self.cache_manager.set_cache(self.category, key, albums_data, self.ttl)
    
    def get_cached_albums(self, family_id: str) -> Optional[List[Dict[str, Any]]]:
        """Get cached family albums"""
        key = f"{family_id}:albums"
        return self.cache_manager.get_cache(self.category, key)
    
    def cache_game_sessions(self, family_id: str, sessions_data: List[Dict[str, Any]]) -> bool:
        """Cache active game sessions"""
        key = f"{family_id}:game_sessions"
        return self.cache_manager.set_cache(self.category, key, sessions_data, self.ttl)
    
    def get_cached_game_sessions(self, family_id: str) -> Optional[List[Dict[str, Any]]]:
        """Get cached game sessions"""
        key = f"{family_id}:game_sessions"
        return self.cache_manager.get_cache(self.category, key)

# ============================================================================
# CACHE DECORATORS
# ============================================================================

def cache_result(category: str, key_func=None, ttl: int = None):
    """Decorator to cache function results"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Get cache manager
            cache_manager = get_redis_cache_manager()
            if not cache_manager:
                return func(*args, **kwargs)
            
            # Generate cache key
            if key_func:
                cache_key = key_func(*args, **kwargs)
            else:
                # Default key generation
                key_parts = [func.__name__]
                key_parts.extend([str(arg) for arg in args])
                key_parts.extend([f"{k}:{v}" for k, v in sorted(kwargs.items())])
                cache_key = hashlib.md5(":".join(key_parts).encode()).hexdigest()
            
            # Try to get from cache
            cached_result = cache_manager.get_cache(category, cache_key)
            if cached_result is not None:
                logger.debug(f"Cache hit for {func.__name__}")
                return cached_result
            
            # Execute function and cache result
            result = func(*args, **kwargs)
            cache_manager.set_cache(category, cache_key, result, ttl)
            logger.debug(f"Cache miss for {func.__name__}, cached result")
            
            return result
        return wrapper
    return decorator

def invalidate_cache(category: str, key_func=None):
    """Decorator to invalidate cache after function execution"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            result = func(*args, **kwargs)
            
            # Invalidate cache
            cache_manager = get_redis_cache_manager()
            if cache_manager and key_func:
                cache_key = key_func(*args, **kwargs)
                cache_manager.delete_cache(category, cache_key)
                logger.debug(f"Invalidated cache for {func.__name__}")
            
            return result
        return wrapper
    return decorator

# ============================================================================
# GLOBAL CACHE MANAGER INSTANCE
# ============================================================================

_redis_cache_manager = None

def get_redis_cache_manager() -> Optional[RedisCacheManager]:
    """Get global Redis cache manager instance"""
    global _redis_cache_manager
    if _redis_cache_manager is None:
        _redis_cache_manager = RedisCacheManager()
    return _redis_cache_manager

def get_user_session_cache() -> UserSessionCache:
    """Get user session cache manager"""
    return UserSessionCache(get_redis_cache_manager())

def get_ai_analysis_cache() -> AIAnalysisCache:
    """Get AI analysis cache manager"""
    return AIAnalysisCache(get_redis_cache_manager())

def get_family_tree_cache() -> FamilyTreeCache:
    """Get family tree cache manager"""
    return FamilyTreeCache(get_redis_cache_manager())

def get_frequent_data_cache() -> FrequentDataCache:
    """Get frequent data cache manager"""
    return FrequentDataCache(get_redis_cache_manager())

# ============================================================================
# CACHE HEALTH CHECK
# ============================================================================

def check_cache_health() -> Dict[str, Any]:
    """Check Redis cache health"""
    cache_manager = get_redis_cache_manager()
    if not cache_manager:
        return {"status": "error", "message": "Redis not connected"}
    
    try:
        stats = cache_manager.get_cache_stats()
        if "error" in stats:
            return {"status": "error", "message": stats["error"]}
        
        # Calculate hit rate
        hits = stats.get("keyspace_hits", 0)
        misses = stats.get("keyspace_misses", 0)
        total_requests = hits + misses
        hit_rate = (hits / total_requests * 100) if total_requests > 0 else 0
        
        return {
            "status": "healthy",
            "connected": True,
            "hit_rate": round(hit_rate, 2),
            "memory_used": stats.get("memory_used", "N/A"),
            "connected_clients": stats.get("connected_clients", 0),
            "total_requests": total_requests
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

# ============================================================================
# CACHE UTILITY FUNCTIONS
# ============================================================================

def clear_all_caches() -> Dict[str, bool]:
    """Clear all caches"""
    cache_manager = get_redis_cache_manager()
    if not cache_manager:
        return {"error": "Redis not connected"}
    
    categories = ["user_sessions", "ai_analysis", "family_tree", "frequent_data"]
    results = {}
    
    for category in categories:
        results[category] = cache_manager.clear_category(category)
    
    return results

def get_cache_keys(category: str = None) -> List[str]:
    """Get all cache keys (for debugging)"""
    cache_manager = get_redis_cache_manager()
    if not cache_manager or not cache_manager.redis_client:
        return []
    
    try:
        if category:
            pattern = f"{cache_manager.cache_prefix}{category}:*"
        else:
            pattern = f"{cache_manager.cache_prefix}*"
        
        keys = cache_manager.redis_client.keys(pattern)
        return [key.decode() for key in keys]
    except Exception as e:
        logger.error(f"Error getting cache keys: {e}")
        return []

# Export components
__all__ = [
    'RedisCacheManager',
    'UserSessionCache',
    'AIAnalysisCache',
    'FamilyTreeCache',
    'FrequentDataCache',
    'cache_result',
    'invalidate_cache',
    'get_redis_cache_manager',
    'get_user_session_cache',
    'get_ai_analysis_cache',
    'get_family_tree_cache',
    'get_frequent_data_cache',
    'check_cache_health',
    'clear_all_caches',
    'get_cache_keys'
] 