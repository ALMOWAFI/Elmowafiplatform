#!/usr/bin/env python3
"""
Cache Middleware for Elmowafiplatform
Automatic caching for FastAPI endpoints with Redis backend
"""

import json
import hashlib
import asyncio
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Callable, Union
from functools import wraps

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response as StarletteResponse

from redis_manager import redis_manager
import logging

logger = logging.getLogger(__name__)

class CacheMiddleware(BaseHTTPMiddleware):
    """FastAPI middleware for automatic response caching"""
    
    def __init__(self, 
                 app,
                 default_ttl: int = 300,  # 5 minutes
                 cache_header: str = "X-Cache-Status",
                 skip_paths: List[str] = None,
                 cache_methods: List[str] = None):
        super().__init__(app)
        self.default_ttl = default_ttl
        self.cache_header = cache_header
        self.skip_paths = skip_paths or ["/docs", "/redoc", "/openapi.json", "/health"]
        self.cache_methods = cache_methods or ["GET"]
        
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request with caching logic"""
        
        # Skip caching for certain paths and methods
        if (request.url.path in self.skip_paths or 
            request.method not in self.cache_methods):
            response = await call_next(request)
            response.headers[self.cache_header] = "SKIP"
            return response
        
        # Generate cache key
        cache_key = self._generate_cache_key(request)
        
        # Try to get cached response
        cached_response = await redis_manager.get(cache_key, namespace="api_cache")
        
        if cached_response:
            # Return cached response
            response_data = json.loads(cached_response)
            response = JSONResponse(
                content=response_data["content"],
                status_code=response_data["status_code"],
                headers=response_data.get("headers", {})
            )
            response.headers[self.cache_header] = "HIT"
            response.headers["X-Cache-Key"] = cache_key
            return response
        
        # Process request
        response = await call_next(request)
        
        # Cache successful responses
        if (response.status_code == 200 and 
            hasattr(response, 'body') and 
            response.headers.get("content-type", "").startswith("application/json")):
            
            # Determine TTL from response headers or use default
            cache_ttl = self._get_cache_ttl(response)
            
            if cache_ttl > 0:
                # Cache the response
                await self._cache_response(cache_key, response, cache_ttl)
                response.headers[self.cache_header] = "MISS"
            else:
                response.headers[self.cache_header] = "NO-CACHE"
        else:
            response.headers[self.cache_header] = "NO-CACHE"
        
        response.headers["X-Cache-Key"] = cache_key
        return response
    
    def _generate_cache_key(self, request: Request) -> str:
        """Generate unique cache key for request"""
        # Include method, path, query params, and relevant headers
        key_parts = [
            request.method,
            request.url.path,
            str(sorted(request.query_params.items())),
        ]
        
        # Include user context if available
        user_id = getattr(request.state, 'user_id', None)
        if user_id:
            key_parts.append(f"user:{user_id}")
        
        # Include family context if available
        family_id = getattr(request.state, 'family_id', None)
        if family_id:
            key_parts.append(f"family:{family_id}")
        
        # Create hash
        key_string = "|".join(key_parts)
        return hashlib.md5(key_string.encode()).hexdigest()
    
    def _get_cache_ttl(self, response: Response) -> int:
        """Extract cache TTL from response headers or use default"""
        # Check for custom cache control header
        cache_control = response.headers.get("Cache-Control", "")
        
        if "no-cache" in cache_control or "no-store" in cache_control:
            return 0
        
        if "max-age=" in cache_control:
            try:
                max_age = int(cache_control.split("max-age=")[1].split(",")[0])
                return max_age
            except (ValueError, IndexError):
                pass
        
        # Check for custom TTL header
        ttl_header = response.headers.get("X-Cache-TTL")
        if ttl_header:
            try:
                return int(ttl_header)
            except ValueError:
                pass
        
        return self.default_ttl
    
    async def _cache_response(self, cache_key: str, response: Response, ttl: int):
        """Cache the response data"""
        try:
            # Read response body
            body = b""
            async for chunk in response.body_iterator:
                body += chunk
            
            # Parse JSON content
            content = json.loads(body.decode())
            
            # Store response data
            response_data = {
                "content": content,
                "status_code": response.status_code,
                "headers": dict(response.headers),
                "cached_at": datetime.now().isoformat()
            }
            
            await redis_manager.set(
                cache_key, 
                json.dumps(response_data), 
                ttl=ttl, 
                namespace="api_cache"
            )
            
            # Replace response body iterator
            response.body_iterator = self._create_body_iterator(body)
            
        except Exception as e:
            logger.error(f"Failed to cache response: {e}")
    
    def _create_body_iterator(self, body: bytes):
        """Create new body iterator from bytes"""
        async def generate():
            yield body
        return generate()

# Caching decorators

def cache_response(ttl: int = 300, 
                  namespace: str = "api_cache",
                  tags: List[str] = None,
                  key_builder: Callable = None,
                  condition: Callable = None):
    """Decorator for caching function responses"""
    
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Check condition
            if condition and not await condition(*args, **kwargs):
                return await func(*args, **kwargs)
            
            # Build cache key
            if key_builder:
                cache_key = key_builder(*args, **kwargs)
            else:
                cache_key = _default_key_builder(func, *args, **kwargs)
            
            # Try cache first
            cached_result = await redis_manager.get(cache_key, namespace)
            if cached_result is not None:
                return cached_result
            
            # Execute function
            result = await func(*args, **kwargs)
            
            # Cache result
            if result is not None:
                await redis_manager.set(
                    cache_key, 
                    result, 
                    ttl=ttl, 
                    namespace=namespace, 
                    tags=tags
                )
            
            return result
        
        return wrapper
    return decorator

def cache_database_query(ttl: int = 300,
                        namespace: str = "db_cache",
                        invalidate_on: List[str] = None):
    """Decorator for caching database query results"""
    
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key from function and parameters
            cache_key = _database_key_builder(func, *args, **kwargs)
            
            # Try cache first
            cached_result = await redis_manager.get(cache_key, namespace)
            if cached_result is not None:
                return cached_result
            
            # Execute query
            result = await func(*args, **kwargs)
            
            # Cache result with tags for invalidation
            tags = invalidate_on or []
            if result is not None:
                await redis_manager.set(
                    cache_key,
                    result,
                    ttl=ttl,
                    namespace=namespace,
                    tags=tags
                )
            
            return result
        
        return wrapper
    return decorator

def invalidate_cache(tags: List[str] = None, 
                    patterns: List[str] = None,
                    namespace: str = "default"):
    """Decorator for cache invalidation after function execution"""
    
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Execute function first
            result = await func(*args, **kwargs)
            
            # Invalidate cache by tags
            if tags:
                for tag in tags:
                    await redis_manager.invalidate_by_tag(tag)
            
            # Invalidate cache by patterns
            if patterns:
                for pattern in patterns:
                    await _invalidate_by_pattern(pattern, namespace)
            
            return result
        
        return wrapper
    return decorator

def _default_key_builder(func: Callable, *args, **kwargs) -> str:
    """Default cache key builder"""
    key_parts = [func.__name__]
    
    # Add positional args
    for arg in args:
        if hasattr(arg, 'id'):  # For objects with ID
            key_parts.append(f"{type(arg).__name__}:{arg.id}")
        else:
            key_parts.append(str(hash(str(arg))))
    
    # Add keyword args
    for key, value in sorted(kwargs.items()):
        if hasattr(value, 'id'):
            key_parts.append(f"{key}:{type(value).__name__}:{value.id}")
        else:
            key_parts.append(f"{key}:{hash(str(value))}")
    
    return ":".join(key_parts)

def _database_key_builder(func: Callable, *args, **kwargs) -> str:
    """Database-specific cache key builder"""
    key_parts = [f"db:{func.__name__}"]
    
    # Add SQL query hash if available
    query = kwargs.get('query') or (args[0] if args else None)
    if query and isinstance(query, str):
        query_hash = hashlib.md5(query.encode()).hexdigest()[:8]
        key_parts.append(f"query:{query_hash}")
    
    # Add parameters
    params = kwargs.get('params') or kwargs.get('values')
    if params:
        params_hash = hashlib.md5(str(sorted(params)).encode()).hexdigest()[:8]
        key_parts.append(f"params:{params_hash}")
    
    # Add table/model info if available
    table = kwargs.get('table') or kwargs.get('model')
    if table:
        table_name = table.__tablename__ if hasattr(table, '__tablename__') else str(table)
        key_parts.append(f"table:{table_name}")
    
    return ":".join(key_parts)

async def _invalidate_by_pattern(pattern: str, namespace: str):
    """Invalidate cache keys matching pattern"""
    # This is a simplified implementation
    # In production, you might want to use Redis SCAN for large datasets
    try:
        full_pattern = f"{redis_manager.cache_config.key_prefix}:{namespace}:{pattern}"
        keys = []
        
        # Use Redis SCAN to find matching keys
        async for key in redis_manager.async_redis.scan_iter(match=full_pattern):
            keys.append(key)
            
            # Delete in batches
            if len(keys) >= 100:
                await redis_manager.async_redis.delete(*keys)
                keys = []
        
        # Delete remaining keys
        if keys:
            await redis_manager.async_redis.delete(*keys)
            
    except Exception as e:
        logger.error(f"Failed to invalidate pattern {pattern}: {e}")

# Cache warming utilities

class CacheWarmer:
    """Utility for warming up cache with frequently accessed data"""
    
    def __init__(self):
        self.warm_tasks: List[asyncio.Task] = []
    
    async def warm_family_data(self, family_id: str):
        """Warm cache with family-related data"""
        tasks = [
            self._warm_family_members(family_id),
            self._warm_family_memories(family_id),
            self._warm_family_budgets(family_id),
            self._warm_family_travel_plans(family_id)
        ]
        
        await asyncio.gather(*tasks, return_exceptions=True)
    
    async def _warm_family_members(self, family_id: str):
        """Warm cache with family members data"""
        try:
            # This would call your actual data fetching functions
            # For now, we'll create placeholder cache entries
            cache_key = f"family_members:{family_id}"
            
            # Simulate data fetching and caching
            # In real implementation, you'd call your database functions
            family_members_data = {"family_id": family_id, "members": []}
            
            await redis_manager.set(
                cache_key,
                family_members_data,
                ttl=3600,
                namespace="warm_cache",
                tags=[f"family:{family_id}", "family_members"]
            )
            
        except Exception as e:
            logger.error(f"Failed to warm family members cache: {e}")
    
    async def _warm_family_memories(self, family_id: str):
        """Warm cache with family memories data"""
        try:
            cache_key = f"family_memories:{family_id}"
            memories_data = {"family_id": family_id, "memories": []}
            
            await redis_manager.set(
                cache_key,
                memories_data,
                ttl=1800,  # 30 minutes
                namespace="warm_cache",
                tags=[f"family:{family_id}", "memories"]
            )
            
        except Exception as e:
            logger.error(f"Failed to warm family memories cache: {e}")
    
    async def _warm_family_budgets(self, family_id: str):
        """Warm cache with family budget data"""
        try:
            cache_key = f"family_budgets:{family_id}"
            budgets_data = {"family_id": family_id, "budgets": []}
            
            await redis_manager.set(
                cache_key,
                budgets_data,
                ttl=900,  # 15 minutes
                namespace="warm_cache",
                tags=[f"family:{family_id}", "budgets"]
            )
            
        except Exception as e:
            logger.error(f"Failed to warm family budgets cache: {e}")
    
    async def _warm_family_travel_plans(self, family_id: str):
        """Warm cache with family travel plans"""
        try:
            cache_key = f"family_travel_plans:{family_id}"
            travel_data = {"family_id": family_id, "travel_plans": []}
            
            await redis_manager.set(
                cache_key,
                travel_data,
                ttl=1800,  # 30 minutes
                namespace="warm_cache",
                tags=[f"family:{family_id}", "travel"]
            )
            
        except Exception as e:
            logger.error(f"Failed to warm family travel plans cache: {e}")
    
    async def schedule_warming(self, family_id: str, interval: int = 3600):
        """Schedule periodic cache warming"""
        async def warm_periodically():
            while True:
                try:
                    await self.warm_family_data(family_id)
                    await asyncio.sleep(interval)
                except asyncio.CancelledError:
                    break
                except Exception as e:
                    logger.error(f"Cache warming error: {e}")
                    await asyncio.sleep(60)  # Wait before retrying
        
        task = asyncio.create_task(warm_periodically())
        self.warm_tasks.append(task)
        return task
    
    async def stop_all_warming(self):
        """Stop all warming tasks"""
        for task in self.warm_tasks:
            task.cancel()
        
        await asyncio.gather(*self.warm_tasks, return_exceptions=True)
        self.warm_tasks.clear()

# Performance monitoring

class CacheMetrics:
    """Cache performance metrics collector"""
    
    def __init__(self):
        self.metrics = {
            'hits': 0,
            'misses': 0,
            'sets': 0,
            'deletes': 0,
            'errors': 0
        }
    
    def record_hit(self):
        self.metrics['hits'] += 1
    
    def record_miss(self):
        self.metrics['misses'] += 1
    
    def record_set(self):
        self.metrics['sets'] += 1
    
    def record_delete(self):
        self.metrics['deletes'] += 1
    
    def record_error(self):
        self.metrics['errors'] += 1
    
    def get_hit_rate(self) -> float:
        total = self.metrics['hits'] + self.metrics['misses']
        return (self.metrics['hits'] / total * 100) if total > 0 else 0
    
    def get_metrics(self) -> Dict[str, Any]:
        return {
            **self.metrics,
            'hit_rate_percent': self.get_hit_rate(),
            'total_operations': sum(self.metrics.values())
        }
    
    def reset_metrics(self):
        for key in self.metrics:
            self.metrics[key] = 0

# Global instances
cache_warmer = CacheWarmer()
cache_metrics = CacheMetrics() 