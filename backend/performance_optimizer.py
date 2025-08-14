#!/usr/bin/env python3
"""
Performance Optimization Module
Monitors and optimizes data flow in the integration layer
"""

import asyncio
import json
import logging
import time
import psutil
import gc
from typing import Dict, List, Optional, Any, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from collections import defaultdict, deque
import threading
import weakref

# Setup logging
logger = logging.getLogger(__name__)

@dataclass
class PerformanceMetric:
    """Performance metric data structure"""
    timestamp: datetime
    operation: str
    duration: float
    memory_usage: float
    cpu_usage: float
    success: bool
    error_message: Optional[str] = None
    metadata: Dict[str, Any] = None

@dataclass
class CacheMetrics:
    """Cache performance metrics"""
    hits: int
    misses: int
    size: int
    max_size: int
    hit_rate: float
    evictions: int

class PerformanceMonitor:
    """Monitors system performance metrics"""
    
    def __init__(self, max_metrics: int = 1000):
        self.max_metrics = max_metrics
        self.metrics: deque = deque(maxlen=max_metrics)
        self.operation_timers: Dict[str, float] = {}
        self.memory_baseline = psutil.virtual_memory().used
        self.cpu_baseline = psutil.cpu_percent()
        
    def start_operation(self, operation: str):
        """Start timing an operation"""
        self.operation_timers[operation] = time.time()
    
    def end_operation(self, operation: str, success: bool = True, error_message: str = None, metadata: Dict[str, Any] = None):
        """End timing an operation and record metrics"""
        if operation not in self.operation_timers:
            return
        
        start_time = self.operation_timers.pop(operation)
        duration = time.time() - start_time
        
        # Get current system metrics
        memory_usage = psutil.virtual_memory().used - self.memory_baseline
        cpu_usage = psutil.cpu_percent() - self.cpu_baseline
        
        metric = PerformanceMetric(
            timestamp=datetime.utcnow(),
            operation=operation,
            duration=duration,
            memory_usage=memory_usage,
            cpu_usage=cpu_usage,
            success=success,
            error_message=error_message,
            metadata=metadata or {}
        )
        
        self.metrics.append(metric)
        
        # Log slow operations
        if duration > 1.0:  # More than 1 second
            logger.warning(f"Slow operation detected: {operation} took {duration:.2f}s")
    
    def get_operation_stats(self, operation: str = None) -> Dict[str, Any]:
        """Get statistics for specific operation or all operations"""
        if operation:
            op_metrics = [m for m in self.metrics if m.operation == operation]
        else:
            op_metrics = list(self.metrics)
        
        if not op_metrics:
            return {}
        
        durations = [m.duration for m in op_metrics]
        memory_usage = [m.memory_usage for m in op_metrics]
        cpu_usage = [m.cpu_usage for m in op_metrics]
        success_rate = sum(1 for m in op_metrics if m.success) / len(op_metrics)
        
        return {
            "count": len(op_metrics),
            "avg_duration": sum(durations) / len(durations),
            "max_duration": max(durations),
            "min_duration": min(durations),
            "avg_memory": sum(memory_usage) / len(memory_usage),
            "avg_cpu": sum(cpu_usage) / len(cpu_usage),
            "success_rate": success_rate,
            "recent_errors": [m.error_message for m in op_metrics[-10:] if not m.success and m.error_message]
        }
    
    def get_system_health(self) -> Dict[str, Any]:
        """Get overall system health metrics"""
        memory = psutil.virtual_memory()
        cpu = psutil.cpu_percent(interval=1)
        disk = psutil.disk_usage('/')
        
        return {
            "memory": {
                "total": memory.total,
                "available": memory.available,
                "used": memory.used,
                "percent": memory.percent
            },
            "cpu": {
                "usage_percent": cpu,
                "count": psutil.cpu_count()
            },
            "disk": {
                "total": disk.total,
                "used": disk.used,
                "free": disk.free,
                "percent": (disk.used / disk.total) * 100
            },
            "network": {
                "connections": len(psutil.net_connections())
            }
        }

class CacheOptimizer:
    """Optimizes caching strategies"""
    
    def __init__(self, max_size: int = 1000):
        self.max_size = max_size
        self.cache: Dict[str, Any] = {}
        self.access_times: Dict[str, datetime] = {}
        self.access_counts: Dict[str, int] = defaultdict(int)
        self.metrics = CacheMetrics(0, 0, 0, max_size, 0.0, 0)
        
    def get(self, key: str) -> Optional[Any]:
        """Get item from cache with LRU eviction"""
        if key in self.cache:
            # Update access time and count
            self.access_times[key] = datetime.utcnow()
            self.access_counts[key] += 1
            self.metrics.hits += 1
            return self.cache[key]
        else:
            self.metrics.misses += 1
            return None
    
    def set(self, key: str, value: Any, ttl: int = 3600):
        """Set item in cache with TTL"""
        # Evict if cache is full
        if len(self.cache) >= self.max_size:
            self._evict_lru()
        
        self.cache[key] = {
            "value": value,
            "expires_at": datetime.utcnow() + timedelta(seconds=ttl)
        }
        self.access_times[key] = datetime.utcnow()
        self.access_counts[key] = 1
        self.metrics.size = len(self.cache)
        
        # Update hit rate
        total_accesses = self.metrics.hits + self.metrics.misses
        self.metrics.hit_rate = self.metrics.hits / total_accesses if total_accesses > 0 else 0.0
    
    def _evict_lru(self):
        """Evict least recently used item"""
        if not self.cache:
            return
        
        # Find LRU item
        lru_key = min(self.access_times.keys(), key=lambda k: self.access_times[k])
        
        # Remove from cache
        del self.cache[lru_key]
        del self.access_times[lru_key]
        del self.access_counts[lru_key]
        
        self.metrics.evictions += 1
        self.metrics.size = len(self.cache)
    
    def cleanup_expired(self):
        """Remove expired items from cache"""
        now = datetime.utcnow()
        expired_keys = [
            key for key, item in self.cache.items()
            if item["expires_at"] < now
        ]
        
        for key in expired_keys:
            del self.cache[key]
            del self.access_times[key]
            del self.access_counts[key]
        
        self.metrics.size = len(self.cache)
    
    def get_metrics(self) -> CacheMetrics:
        """Get cache performance metrics"""
        self.metrics.size = len(self.cache)
        total_accesses = self.metrics.hits + self.metrics.misses
        self.metrics.hit_rate = self.metrics.hits / total_accesses if total_accesses > 0 else 0.0
        return self.metrics

class DatabaseOptimizer:
    """Optimizes database operations"""
    
    def __init__(self, monitor: PerformanceMonitor):
        self.monitor = monitor
        self.query_cache = CacheOptimizer(max_size=500)
        self.connection_pool_stats = {
            "active_connections": 0,
            "idle_connections": 0,
            "max_connections": 20
        }
    
    async def optimize_query(self, query: str, params: Dict[str, Any] = None) -> str:
        """Optimize database query"""
        # Add query optimization logic here
        # This is a placeholder for actual query optimization
        return query
    
    def get_query_stats(self) -> Dict[str, Any]:
        """Get database query statistics"""
        return {
            "cache_metrics": asdict(self.query_cache.get_metrics()),
            "connection_pool": self.connection_pool_stats,
            "slow_queries": self.monitor.get_operation_stats("database_query")
        }

class MemoryOptimizer:
    """Optimizes memory usage"""
    
    def __init__(self, monitor: PerformanceMonitor):
        self.monitor = monitor
        self.memory_threshold = 0.8  # 80% memory usage threshold
        self.gc_threshold = 0.7  # 70% memory usage threshold for garbage collection
        
    def check_memory_usage(self) -> Dict[str, Any]:
        """Check current memory usage and optimize if needed"""
        memory = psutil.virtual_memory()
        memory_percent = memory.percent / 100
        
        optimizations = []
        
        if memory_percent > self.memory_threshold:
            optimizations.append("High memory usage detected")
            
            # Force garbage collection
            if memory_percent > self.gc_threshold:
                collected = gc.collect()
                optimizations.append(f"Garbage collection freed {collected} objects")
            
            # Suggest memory optimization
            optimizations.append("Consider reducing cache size or optimizing data structures")
        
        return {
            "memory_percent": memory_percent,
            "memory_used": memory.used,
            "memory_available": memory.available,
            "optimizations_applied": optimizations
        }
    
    def optimize_data_structures(self, data: Any) -> Any:
        """Optimize data structures for memory efficiency"""
        # This is a placeholder for actual data structure optimization
        # Could include converting lists to tuples, using __slots__, etc.
        return data

class AsyncTaskOptimizer:
    """Optimizes async task execution"""
    
    def __init__(self, max_concurrent: int = 10):
        self.max_concurrent = max_concurrent
        self.semaphore = asyncio.Semaphore(max_concurrent)
        self.active_tasks: Dict[str, asyncio.Task] = {}
        self.task_queue: deque = deque()
        
    async def execute_task(self, task_id: str, coro: Callable, *args, **kwargs):
        """Execute task with concurrency control"""
        async with self.semaphore:
            task = asyncio.create_task(coro(*args, **kwargs))
            self.active_tasks[task_id] = task
            
            try:
                result = await task
                return result
            except Exception as e:
                logger.error(f"Task {task_id} failed: {e}")
                raise
            finally:
                if task_id in self.active_tasks:
                    del self.active_tasks[task_id]
    
    def get_task_stats(self) -> Dict[str, Any]:
        """Get async task statistics"""
        return {
            "active_tasks": len(self.active_tasks),
            "queued_tasks": len(self.task_queue),
            "max_concurrent": self.max_concurrent,
            "available_slots": self.semaphore._value
        }

class PerformanceOptimizer:
    """Main performance optimization orchestrator"""
    
    def __init__(self):
        self.monitor = PerformanceMonitor()
        self.cache_optimizer = CacheOptimizer()
        self.db_optimizer = DatabaseOptimizer(self.monitor)
        self.memory_optimizer = MemoryOptimizer(self.monitor)
        self.task_optimizer = AsyncTaskOptimizer()
        
        # Start background optimization tasks
        self.optimization_task = None
        self.start_background_optimization()
    
    def start_background_optimization(self):
        """Start background optimization tasks"""
        async def background_optimization():
            while True:
                try:
                    # Clean up expired cache items
                    self.cache_optimizer.cleanup_expired()
                    
                    # Check memory usage
                    memory_status = self.memory_optimizer.check_memory_usage()
                    if memory_status["optimizations_applied"]:
                        logger.info(f"Memory optimizations applied: {memory_status['optimizations_applied']}")
                    
                    # Log performance metrics
                    self._log_performance_summary()
                    
                    # Wait before next optimization cycle
                    await asyncio.sleep(60)  # Run every minute
                    
                except Exception as e:
                    logger.error(f"Background optimization error: {e}")
                    await asyncio.sleep(60)
        
        self.optimization_task = asyncio.create_task(background_optimization())
    
    def _log_performance_summary(self):
        """Log performance summary"""
        system_health = self.monitor.get_system_health()
        cache_metrics = self.cache_optimizer.get_metrics()
        
        logger.info(f"Performance Summary - "
                   f"Memory: {system_health['memory']['percent']:.1f}%, "
                   f"CPU: {system_health['cpu']['usage_percent']:.1f}%, "
                   f"Cache Hit Rate: {cache_metrics.hit_rate:.2f}")
    
    def get_optimization_report(self) -> Dict[str, Any]:
        """Get comprehensive optimization report"""
        return {
            "system_health": self.monitor.get_system_health(),
            "cache_metrics": asdict(self.cache_optimizer.get_metrics()),
            "database_stats": self.db_optimizer.get_query_stats(),
            "memory_status": self.memory_optimizer.check_memory_usage(),
            "task_stats": self.task_optimizer.get_task_stats(),
            "operation_stats": {
                "api_calls": self.monitor.get_operation_stats("api_call"),
                "database_queries": self.monitor.get_operation_stats("database_query"),
                "websocket_messages": self.monitor.get_operation_stats("websocket_message"),
                "ai_operations": self.monitor.get_operation_stats("ai_operation")
            }
        }
    
    def optimize_endpoint(self, endpoint: str, data: Any) -> Any:
        """Optimize specific endpoint data"""
        # Start monitoring
        self.monitor.start_operation(f"endpoint_{endpoint}")
        
        try:
            # Apply optimizations
            optimized_data = self.memory_optimizer.optimize_data_structures(data)
            
            # Cache the result
            cache_key = f"endpoint_{endpoint}_{hash(str(data))}"
            self.cache_optimizer.set(cache_key, optimized_data, ttl=300)  # 5 minutes
            
            # End monitoring
            self.monitor.end_operation(f"endpoint_{endpoint}", success=True)
            
            return optimized_data
            
        except Exception as e:
            self.monitor.end_operation(f"endpoint_{endpoint}", success=False, error_message=str(e))
            raise
    
    async def shutdown(self):
        """Shutdown the performance optimizer"""
        if self.optimization_task:
            self.optimization_task.cancel()
            try:
                await self.optimization_task
            except asyncio.CancelledError:
                pass

# Global performance optimizer instance
performance_optimizer: Optional[PerformanceOptimizer] = None

def get_performance_optimizer() -> PerformanceOptimizer:
    """Get global performance optimizer instance"""
    global performance_optimizer
    if performance_optimizer is None:
        performance_optimizer = PerformanceOptimizer()
    return performance_optimizer

async def shutdown_performance_optimizer():
    """Shutdown global performance optimizer"""
    global performance_optimizer
    if performance_optimizer:
        await performance_optimizer.shutdown()
        performance_optimizer = None
