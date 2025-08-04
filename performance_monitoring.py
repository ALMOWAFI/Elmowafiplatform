#!/usr/bin/env python3
"""
Performance Monitoring for Elmowafiplatform
Implements Prometheus metrics for production monitoring
"""

import os
import time
import psutil
from prometheus_client import Counter, Histogram, Gauge, Summary, generate_latest, CONTENT_TYPE_LATEST
from fastapi import Request, Response
from typing import Dict, Any, Optional
import threading

# Database metrics
DB_QUERY_DURATION = Histogram(
    'db_query_duration_seconds',
    'Database query duration in seconds',
    ['operation', 'table']
)

DB_CONNECTION_GAUGE = Gauge(
    'db_connections_active',
    'Number of active database connections'
)

DB_QUERY_COUNTER = Counter(
    'db_queries_total',
    'Total number of database queries',
    ['operation', 'status']
)

# API metrics
API_REQUEST_DURATION = Histogram(
    'api_request_duration_seconds',
    'API request duration in seconds',
    ['endpoint', 'method', 'status_code']
)

API_REQUEST_COUNTER = Counter(
    'api_requests_total',
    'Total number of API requests',
    ['endpoint', 'method', 'status_code']
)

API_REQUEST_SIZE = Histogram(
    'api_request_size_bytes',
    'API request size in bytes',
    ['endpoint', 'method']
)

# Memory metrics
MEMORY_USAGE_GAUGE = Gauge(
    'memory_usage_bytes',
    'Memory usage in bytes',
    ['type']
)

# File upload metrics
FILE_UPLOAD_DURATION = Histogram(
    'file_upload_duration_seconds',
    'File upload duration in seconds',
    ['file_type', 'size_category']
)

FILE_UPLOAD_COUNTER = Counter(
    'file_uploads_total',
    'Total number of file uploads',
    ['file_type', 'status']
)

# AI service metrics
AI_SERVICE_DURATION = Histogram(
    'ai_service_duration_seconds',
    'AI service call duration in seconds',
    ['service', 'operation']
)

AI_SERVICE_COUNTER = Counter(
    'ai_service_calls_total',
    'Total number of AI service calls',
    ['service', 'operation', 'status']
)

# Business metrics
FAMILY_MEMBERS_GAUGE = Gauge(
    'family_members_total',
    'Total number of family members',
    ['family_group_id']
)

MEMORIES_COUNTER = Counter(
    'memories_created_total',
    'Total number of memories created',
    ['memory_type', 'family_group_id']
)

BUDGET_TRANSACTIONS_COUNTER = Counter(
    'budget_transactions_total',
    'Total number of budget transactions',
    ['transaction_type', 'family_group_id']
)

class PerformanceMonitor:
    """Performance monitoring for the application"""
    
    def __init__(self):
        self.start_time = time.time()
        self._start_memory_monitoring()
    
    def _start_memory_monitoring(self):
        """Start memory monitoring in background thread"""
        def monitor_memory():
            while True:
                try:
                    process = psutil.Process()
                    memory_info = process.memory_info()
                    
                    MEMORY_USAGE_GAUGE.labels(type='rss').set(memory_info.rss)
                    MEMORY_USAGE_GAUGE.labels(type='vms').set(memory_info.vms)
                    
                    time.sleep(30)  # Update every 30 seconds
                except Exception as e:
                    print(f"Memory monitoring error: {e}")
                    time.sleep(60)  # Wait longer on error
        
        thread = threading.Thread(target=monitor_memory, daemon=True)
        thread.start()
    
    def track_database_query(self, operation: str, table: str, duration: float, success: bool = True):
        """Track database query performance"""
        status = 'success' if success else 'error'
        
        DB_QUERY_DURATION.labels(operation=operation, table=table).observe(duration)
        DB_QUERY_COUNTER.labels(operation=operation, status=status).inc()
    
    def track_api_request(self, endpoint: str, method: str, duration: float, status_code: int, request_size: int = 0):
        """Track API request performance"""
        API_REQUEST_DURATION.labels(
            endpoint=endpoint, 
            method=method, 
            status_code=status_code
        ).observe(duration)
        
        API_REQUEST_COUNTER.labels(
            endpoint=endpoint, 
            method=method, 
            status_code=status_code
        ).inc()
        
        if request_size > 0:
            API_REQUEST_SIZE.labels(
                endpoint=endpoint, 
                method=method
            ).observe(request_size)
    
    def track_file_upload(self, file_type: str, duration: float, file_size: int, success: bool = True):
        """Track file upload performance"""
        status = 'success' if success else 'error'
        size_category = self._get_size_category(file_size)
        
        FILE_UPLOAD_DURATION.labels(
            file_type=file_type, 
            size_category=size_category
        ).observe(duration)
        
        FILE_UPLOAD_COUNTER.labels(
            file_type=file_type, 
            status=status
        ).inc()
    
    def track_ai_service(self, service: str, operation: str, duration: float, success: bool = True):
        """Track AI service performance"""
        status = 'success' if success else 'error'
        
        AI_SERVICE_DURATION.labels(
            service=service, 
            operation=operation
        ).observe(duration)
        
        AI_SERVICE_COUNTER.labels(
            service=service, 
            operation=operation, 
            status=status
        ).inc()
    
    def track_business_metric(self, metric_type: str, family_group_id: str = None, **kwargs):
        """Track business metrics"""
        if metric_type == 'family_member_created':
            FAMILY_MEMBERS_GAUGE.labels(
                family_group_id=family_group_id or 'unknown'
            ).inc()
        
        elif metric_type == 'memory_created':
            memory_type = kwargs.get('memory_type', 'unknown')
            MEMORIES_COUNTER.labels(
                memory_type=memory_type,
                family_group_id=family_group_id or 'unknown'
            ).inc()
        
        elif metric_type == 'budget_transaction':
            transaction_type = kwargs.get('transaction_type', 'unknown')
            BUDGET_TRANSACTIONS_COUNTER.labels(
                transaction_type=transaction_type,
                family_group_id=family_group_id or 'unknown'
            ).inc()
    
    def _get_size_category(self, size_bytes: int) -> str:
        """Get size category for metrics"""
        if size_bytes < 1024 * 1024:  # < 1MB
            return 'small'
        elif size_bytes < 10 * 1024 * 1024:  # < 10MB
            return 'medium'
        else:
            return 'large'
    
    def get_uptime(self) -> float:
        """Get application uptime in seconds"""
        return time.time() - self.start_time

# Global performance monitor instance
performance_monitor = PerformanceMonitor()

# FastAPI middleware for request tracking
class PrometheusMiddleware:
    """Middleware to track API requests with Prometheus metrics"""
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            # Track request start
            start_time = time.time()
            request_size = 0
            
            # Get request size if available
            if "headers" in scope:
                for name, value in scope["headers"]:
                    if name == b"content-length":
                        request_size = int(value)
                        break
            
            # Process request
            try:
                await self.app(scope, receive, send)
                
                # Track successful request
                duration = time.time() - start_time
                performance_monitor.track_api_request(
                    endpoint=scope["path"],
                    method=scope["method"],
                    duration=duration,
                    status_code=200,  # Would need to capture actual status
                    request_size=request_size
                )
                
            except Exception as e:
                # Track failed request
                duration = time.time() - start_time
                performance_monitor.track_api_request(
                    endpoint=scope["path"],
                    method=scope["method"],
                    duration=duration,
                    status_code=500,
                    request_size=request_size
                )
                raise
        else:
            await self.app(scope, receive, send)

# Prometheus metrics endpoint
async def metrics_endpoint():
    """Return Prometheus metrics"""
    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST
    )

# Database connection monitoring
class DatabaseConnectionMonitor:
    """Monitor database connection pool"""
    
    def __init__(self, database):
        self.database = database
    
    def update_connection_metrics(self):
        """Update database connection metrics"""
        try:
            if hasattr(self.database, 'pool') and self.database.pool:
                # Get pool statistics
                pool_size = self.database.pool.maxconn
                active_connections = pool_size - self.database.pool.idle
                
                DB_CONNECTION_GAUGE.set(active_connections)
        except Exception as e:
            print(f"Error updating connection metrics: {e}")

# Context managers for performance tracking
class DatabaseQueryTracker:
    """Context manager for tracking database queries"""
    
    def __init__(self, operation: str, table: str):
        self.operation = operation
        self.table = table
        self.start_time = None
    
    def __enter__(self):
        self.start_time = time.time()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        duration = time.time() - self.start_time
        success = exc_type is None
        
        performance_monitor.track_database_query(
            operation=self.operation,
            table=self.table,
            duration=duration,
            success=success
        )

class AIServiceTracker:
    """Context manager for tracking AI service calls"""
    
    def __init__(self, service: str, operation: str):
        self.service = service
        self.operation = operation
        self.start_time = None
    
    def __enter__(self):
        self.start_time = time.time()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        duration = time.time() - self.start_time
        success = exc_type is None
        
        performance_monitor.track_ai_service(
            service=self.service,
            operation=self.operation,
            duration=duration,
            success=success
        )

# Export monitoring components
__all__ = [
    'performance_monitor',
    'PrometheusMiddleware',
    'metrics_endpoint',
    'DatabaseConnectionMonitor',
    'DatabaseQueryTracker',
    'AI serviceTracker',
] 