#!/usr/bin/env python3
"""
Structured Logging Configuration for Elmowafiplatform
Provides production-ready logging with structured output
"""

import os
import sys
import logging
import structlog
from datetime import datetime
from typing import Any, Dict

# Configure structlog for production
def configure_structured_logging():
    """Configure structured logging for the application"""
    
    # Configure structlog processors
    structlog.configure(
        processors=[
            # Add timestamp
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            # JSON output for production
            structlog.processors.JSONRenderer() if os.getenv('ENVIRONMENT') == 'production' 
            else structlog.dev.ConsoleRenderer()
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

def get_logger(name: str = None) -> structlog.BoundLogger:
    """Get a structured logger instance"""
    return structlog.get_logger(name)

# Custom log processors
def add_request_id(logger, method_name, event_dict):
    """Add request ID to log entries"""
    import uuid
    if 'request_id' not in event_dict:
        event_dict['request_id'] = str(uuid.uuid4())
    return event_dict

def add_user_context(logger, method_name, event_dict):
    """Add user context to log entries"""
    # This would be populated from request context
    if 'user_id' not in event_dict:
        event_dict['user_id'] = 'anonymous'
    return event_dict

def add_performance_metrics(logger, method_name, event_dict):
    """Add performance metrics to log entries"""
    if 'duration_ms' not in event_dict:
        event_dict['duration_ms'] = 0
    return event_dict

# Logging middleware for FastAPI
class StructuredLoggingMiddleware:
    """Middleware to add structured logging to FastAPI requests"""
    
    def __init__(self, app):
        self.app = app
        self.logger = get_logger("http")
    
    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            # Generate request ID
            request_id = str(uuid.uuid4())
            
            # Log request start
            self.logger.info(
                "request.start",
                request_id=request_id,
                method=scope["method"],
                path=scope["path"],
                client_ip=scope.get("client", ["unknown"])[0],
                user_agent=dict(scope["headers"]).get(b"user-agent", b"").decode(),
            )
            
            # Track timing
            start_time = datetime.now()
            
            # Process request
            try:
                await self.app(scope, receive, send)
                
                # Log successful response
                duration = (datetime.now() - start_time).total_seconds() * 1000
                self.logger.info(
                    "request.complete",
                    request_id=request_id,
                    duration_ms=duration,
                    status_code=200,  # Would need to capture actual status
                )
                
            except Exception as e:
                # Log error
                duration = (datetime.now() - start_time).total_seconds() * 1000
                self.logger.error(
                    "request.error",
                    request_id=request_id,
                    duration_ms=duration,
                    error=str(e),
                    error_type=type(e).__name__,
                )
                raise
        else:
            await self.app(scope, receive, send)

# Database logging
class DatabaseLogger:
    """Structured logger for database operations"""
    
    def __init__(self):
        self.logger = get_logger("database")
    
    def log_query(self, query: str, params: tuple = None, duration_ms: float = 0):
        """Log database query with performance metrics"""
        self.logger.info(
            "database.query",
            query=query,
            params_count=len(params) if params else 0,
            duration_ms=duration_ms,
        )
    
    def log_connection(self, action: str, pool_size: int = None):
        """Log database connection events"""
        self.logger.info(
            "database.connection",
            action=action,
            pool_size=pool_size,
        )
    
    def log_error(self, error: str, operation: str = None):
        """Log database errors"""
        self.logger.error(
            "database.error",
            error=error,
            operation=operation,
        )

# API logging
class APILogger:
    """Structured logger for API operations"""
    
    def __init__(self):
        self.logger = get_logger("api")
    
    def log_endpoint_call(self, endpoint: str, method: str, user_id: str = None, duration_ms: float = 0):
        """Log API endpoint calls"""
        self.logger.info(
            "api.endpoint",
            endpoint=endpoint,
            method=method,
            user_id=user_id,
            duration_ms=duration_ms,
        )
    
    def log_validation_error(self, endpoint: str, field: str, error: str):
        """Log validation errors"""
        self.logger.warning(
            "api.validation_error",
            endpoint=endpoint,
            field=field,
            error=error,
        )
    
    def log_business_error(self, endpoint: str, error: str, error_code: str = None):
        """Log business logic errors"""
        self.logger.error(
            "api.business_error",
            endpoint=endpoint,
            error=error,
            error_code=error_code,
        )

# Performance logging
class PerformanceLogger:
    """Structured logger for performance metrics"""
    
    def __init__(self):
        self.logger = get_logger("performance")
    
    def log_memory_usage(self, memory_mb: float):
        """Log memory usage"""
        self.logger.info(
            "performance.memory",
            memory_mb=memory_mb,
        )
    
    def log_database_performance(self, operation: str, duration_ms: float, rows_affected: int = None):
        """Log database performance metrics"""
        self.logger.info(
            "performance.database",
            operation=operation,
            duration_ms=duration_ms,
            rows_affected=rows_affected,
        )
    
    def log_api_performance(self, endpoint: str, method: str, duration_ms: float):
        """Log API performance metrics"""
        self.logger.info(
            "performance.api",
            endpoint=endpoint,
            method=method,
            duration_ms=duration_ms,
        )

# Security logging
class SecurityLogger:
    """Structured logger for security events"""
    
    def __init__(self):
        self.logger = get_logger("security")
    
    def log_authentication(self, user_id: str, success: bool, method: str = "password"):
        """Log authentication events"""
        self.logger.info(
            "security.authentication",
            user_id=user_id,
            success=success,
            method=method,
        )
    
    def log_authorization_failure(self, user_id: str, resource: str, action: str):
        """Log authorization failures"""
        self.logger.warning(
            "security.authorization_failure",
            user_id=user_id,
            resource=resource,
            action=action,
        )
    
    def log_suspicious_activity(self, ip_address: str, activity: str, details: Dict[str, Any] = None):
        """Log suspicious activity"""
        self.logger.warning(
            "security.suspicious_activity",
            ip_address=ip_address,
            activity=activity,
            details=details or {},
        )

# Initialize logging on import
configure_structured_logging()

# Export loggers
__all__ = [
    'get_logger',
    'StructuredLoggingMiddleware',
    'DatabaseLogger',
    'APILogger',
    'PerformanceLogger',
    'SecurityLogger',
] 