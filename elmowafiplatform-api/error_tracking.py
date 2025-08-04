#!/usr/bin/env python3
"""
Error Tracking Configuration for Elmowafiplatform
Implements Sentry for production error monitoring
"""

import os
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
from sentry_sdk.integrations.redis import RedisIntegration
from sentry_sdk.integrations.logging import LoggingIntegration
import logging

def initialize_sentry():
    """Initialize Sentry for error tracking"""
    
    # Get Sentry DSN from environment
    sentry_dsn = os.getenv('SENTRY_DSN')
    
    if not sentry_dsn:
        print("Warning: SENTRY_DSN not set, error tracking disabled")
        return
    
    # Configure Sentry
    sentry_sdk.init(
        dsn=sentry_dsn,
        environment=os.getenv('ENVIRONMENT', 'development'),
        release=os.getenv('APP_VERSION', '1.0.0'),
        
        # Enable performance monitoring
        traces_sample_rate=float(os.getenv('SENTRY_TRACES_SAMPLE_RATE', '0.1')),
        profiles_sample_rate=float(os.getenv('SENTRY_PROFILES_SAMPLE_RATE', '0.1')),
        
        # Integrations
        integrations=[
            FastApiIntegration(),
            SqlalchemyIntegration(),
            RedisIntegration(),
            LoggingIntegration(
                level=logging.INFO,
                event_level=logging.ERROR
            ),
        ],
        
        # Customize error reporting
        before_send=lambda event, hint: before_send_callback(event, hint),
        before_breadcrumb=lambda breadcrumb, hint: before_breadcrumb_callback(breadcrumb, hint),
        
        # Set user context
        send_default_pii=False,  # Don't send PII by default
        
        # Debug mode for development
        debug=os.getenv('ENVIRONMENT') == 'development',
    )

def before_send_callback(event, hint):
    """Customize events before sending to Sentry"""
    
    # Filter out certain error types
    if hint and 'exc_info' in hint:
        exc_type, exc_value, exc_traceback = hint['exc_info']
        
        # Don't send database connection errors (too noisy)
        if 'psycopg2.OperationalError' in str(exc_type):
            return None
        
        # Don't send validation errors (handled by API)
        if 'ValidationError' in str(exc_type):
            return None
    
    # Add custom context
    event.setdefault('tags', {})
    event['tags']['service'] = 'elmowafiplatform-api'
    event['tags']['component'] = 'unified-platform'
    
    return event

def before_breadcrumb_callback(breadcrumb, hint):
    """Customize breadcrumbs before sending to Sentry"""
    
    # Filter out sensitive data
    if 'data' in breadcrumb:
        sensitive_keys = ['password', 'token', 'secret', 'key']
        for key in sensitive_keys:
            if key in breadcrumb['data']:
                breadcrumb['data'][key] = '[REDACTED]'
    
    return breadcrumb

def set_user_context(user_id: str, email: str = None, family_group_id: str = None):
    """Set user context for error tracking"""
    sentry_sdk.set_user({
        "id": user_id,
        "email": email,
        "family_group_id": family_group_id,
    })

def set_extra_context(**kwargs):
    """Set extra context for error tracking"""
    sentry_sdk.set_extra(**kwargs)

def set_tag(key: str, value: str):
    """Set a tag for error tracking"""
    sentry_sdk.set_tag(key, value)

def capture_exception(exception: Exception, context: dict = None):
    """Capture an exception with context"""
    if context:
        set_extra_context(**context)
    sentry_sdk.capture_exception(exception)

def capture_message(message: str, level: str = "info", context: dict = None):
    """Capture a message with context"""
    if context:
        set_extra_context(**context)
    sentry_sdk.capture_message(message, level)

# Performance monitoring
def start_transaction(name: str, op: str = "http.server"):
    """Start a performance transaction"""
    return sentry_sdk.start_transaction(name=name, op=op)

def start_span(name: str, op: str = "db.query"):
    """Start a performance span"""
    return sentry_sdk.start_span(name=name, op=op)

# Database monitoring
class DatabaseErrorTracker:
    """Track database errors with Sentry"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def track_connection_error(self, error: Exception, database_url: str = None):
        """Track database connection errors"""
        context = {
            "database_url": database_url or "[REDACTED]",
            "error_type": "connection_error",
        }
        capture_exception(error, context)
        self.logger.error(f"Database connection error: {error}")
    
    def track_query_error(self, error: Exception, query: str = None, params: tuple = None):
        """Track database query errors"""
        context = {
            "query": query,
            "params_count": len(params) if params else 0,
            "error_type": "query_error",
        }
        capture_exception(error, context)
        self.logger.error(f"Database query error: {error}")
    
    def track_pool_error(self, error: Exception, pool_size: int = None):
        """Track connection pool errors"""
        context = {
            "pool_size": pool_size,
            "error_type": "pool_error",
        }
        capture_exception(error, context)
        self.logger.error(f"Database pool error: {error}")

# API monitoring
class APIErrorTracker:
    """Track API errors with Sentry"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def track_validation_error(self, endpoint: str, field: str, error: str):
        """Track validation errors"""
        context = {
            "endpoint": endpoint,
            "field": field,
            "error_type": "validation_error",
        }
        capture_message(f"Validation error: {error}", "warning", context)
        self.logger.warning(f"Validation error in {endpoint}: {field} - {error}")
    
    def track_business_error(self, endpoint: str, error: str, error_code: str = None):
        """Track business logic errors"""
        context = {
            "endpoint": endpoint,
            "error_code": error_code,
            "error_type": "business_error",
        }
        capture_message(f"Business error: {error}", "error", context)
        self.logger.error(f"Business error in {endpoint}: {error}")
    
    def track_auth_error(self, endpoint: str, user_id: str = None, error: str = None):
        """Track authentication errors"""
        context = {
            "endpoint": endpoint,
            "user_id": user_id,
            "error_type": "auth_error",
        }
        capture_message(f"Authentication error: {error}", "warning", context)
        self.logger.warning(f"Authentication error in {endpoint}: {error}")

# Security monitoring
class SecurityErrorTracker:
    """Track security events with Sentry"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def track_suspicious_activity(self, ip_address: str, activity: str, details: dict = None):
        """Track suspicious activity"""
        context = {
            "ip_address": ip_address,
            "activity": activity,
            "details": details or {},
            "error_type": "suspicious_activity",
        }
        capture_message(f"Suspicious activity: {activity}", "warning", context)
        self.logger.warning(f"Suspicious activity from {ip_address}: {activity}")
    
    def track_rate_limit_exceeded(self, ip_address: str, endpoint: str):
        """Track rate limit violations"""
        context = {
            "ip_address": ip_address,
            "endpoint": endpoint,
            "error_type": "rate_limit_exceeded",
        }
        capture_message(f"Rate limit exceeded: {endpoint}", "warning", context)
        self.logger.warning(f"Rate limit exceeded from {ip_address} on {endpoint}")

# Initialize Sentry on import
initialize_sentry()

# Export trackers
__all__ = [
    'set_user_context',
    'set_extra_context',
    'set_tag',
    'capture_exception',
    'capture_message',
    'start_transaction',
    'start_span',
    'DatabaseErrorTracker',
    'APIErrorTracker',
    'SecurityErrorTracker',
] 