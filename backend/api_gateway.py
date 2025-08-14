#!/usr/bin/env python3
"""
API Gateway for Elmowafiplatform
Centralized routing, rate limiting, authentication, and monitoring
"""

import json
import time
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass
from enum import Enum

from fastapi import FastAPI, Request, Response, HTTPException, Depends
from fastapi.routing import APIRouter
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.responses import JSONResponse
from starlette.responses import Response as StarletteResponse

from backend.redis_manager_simple import redis_manager

logger = logging.getLogger(__name__)

class ServiceType(Enum):
    """Service types for routing"""
    FAMILY = "family"
    MEMORY = "memory"
    TRAVEL = "travel"
    AI = "ai"
    GAME = "game"
    BUDGET = "budget"
    AUTH = "auth"
    ADMIN = "admin"

@dataclass
class ServiceRoute:
    """Service route configuration"""
    service_type: ServiceType
    path_prefix: str
    target_url: Optional[str] = None
    rate_limit: int = 100  # requests per minute
    auth_required: bool = True
    cache_ttl: int = 300  # seconds
    timeout: int = 30  # seconds
    retry_count: int = 3
    circuit_breaker_enabled: bool = True

@dataclass
class RateLimitRule:
    """Rate limiting rule"""
    endpoint: str
    max_requests: int
    window_seconds: int
    per_user: bool = True
    per_ip: bool = False

class APIGateway:
    """Central API Gateway with routing, rate limiting, and monitoring"""
    
    def __init__(self):
        self.services: Dict[str, ServiceRoute] = {}
        self.rate_limits: Dict[str, RateLimitRule] = {}
        self.circuit_breakers: Dict[str, Dict] = {}
        self.metrics: Dict[str, Any] = {
            'total_requests': 0,
            'successful_requests': 0,
            'failed_requests': 0,
            'cache_hits': 0,
            'cache_misses': 0,
            'rate_limit_violations': 0,
            'circuit_breaker_trips': 0,
            'response_times': [],
            'service_health': {}
        }
        
        # Register default services
        self._register_default_services()
        self._register_default_rate_limits()
    
    def _register_default_services(self):
        """Register default service routes"""
        self.services = {
            'family': ServiceRoute(
                service_type=ServiceType.FAMILY,
                path_prefix='/api/v1/family',
                rate_limit=50,
                cache_ttl=600,
                auth_required=True
            ),
            'memory': ServiceRoute(
                service_type=ServiceType.MEMORY,
                path_prefix='/api/v1/memories',
                rate_limit=100,
                cache_ttl=300,
                auth_required=True
            ),
            'travel': ServiceRoute(
                service_type=ServiceType.TRAVEL,
                path_prefix='/api/v1/travel',
                rate_limit=30,
                cache_ttl=900,
                auth_required=True
            ),
            'ai': ServiceRoute(
                service_type=ServiceType.AI,
                path_prefix='/api/v1/ai',
                rate_limit=20,
                cache_ttl=0,  # No caching for AI responses
                auth_required=True,
                timeout=60
            ),
            'game': ServiceRoute(
                service_type=ServiceType.GAME,
                path_prefix='/api/v1/games',
                rate_limit=60,
                cache_ttl=120,
                auth_required=True
            ),
            'budget': ServiceRoute(
                service_type=ServiceType.BUDGET,
                path_prefix='/api/v1/budget',
                rate_limit=40,
                cache_ttl=600,
                auth_required=True
            ),
            'auth': ServiceRoute(
                service_type=ServiceType.AUTH,
                path_prefix='/api/v1/auth',
                rate_limit=10,
                cache_ttl=0,
                auth_required=False
            ),
            'admin': ServiceRoute(
                service_type=ServiceType.ADMIN,
                path_prefix='/api/v1/admin',
                rate_limit=20,
                cache_ttl=60,
                auth_required=True
            )
        }
    
    def _register_default_rate_limits(self):
        """Register default rate limiting rules"""
        self.rate_limits = {
            '/api/v1/auth/login': RateLimitRule(
                endpoint='/api/v1/auth/login',
                max_requests=5,
                window_seconds=300,  # 5 attempts per 5 minutes
                per_user=False,
                per_ip=True
            ),
            '/api/v1/auth/register': RateLimitRule(
                endpoint='/api/v1/auth/register',
                max_requests=3,
                window_seconds=3600,  # 3 registrations per hour
                per_user=False,
                per_ip=True
            ),
            '/api/v1/ai/analyze': RateLimitRule(
                endpoint='/api/v1/ai/analyze',
                max_requests=10,
                window_seconds=600,  # 10 AI analyses per 10 minutes
                per_user=True
            ),
            '/api/v1/memories/upload': RateLimitRule(
                endpoint='/api/v1/memories/upload',
                max_requests=20,
                window_seconds=3600,  # 20 uploads per hour
                per_user=True
            )
        }
    
    def register_service(self, service_id: str, service_route: ServiceRoute):
        """Register a new service route"""
        self.services[service_id] = service_route
        logger.info(f"Registered service: {service_id} -> {service_route.path_prefix}")
    
    def register_rate_limit(self, rule: RateLimitRule):
        """Register a rate limiting rule"""
        self.rate_limits[rule.endpoint] = rule
        logger.info(f"Registered rate limit: {rule.endpoint} -> {rule.max_requests}/{rule.window_seconds}s")
    
    async def check_rate_limit(self, request: Request, endpoint: str) -> bool:
        """Check if request exceeds rate limit"""
        rule = self.rate_limits.get(endpoint)
        if not rule:
            # Check for wildcard patterns
            for pattern, rule_obj in self.rate_limits.items():
                if endpoint.startswith(pattern.replace('*', '')):
                    rule = rule_obj
                    break
        
        if not rule:
            return True  # No rate limit configured
        
        # Determine rate limit key
        if rule.per_user:
            user_id = getattr(request.state, 'user_id', None)
            if not user_id:
                return True  # No user context, allow request
            key = f"rate_limit:user:{user_id}:{endpoint}"
        elif rule.per_ip:
            client_ip = request.client.host if request.client else "unknown"
            key = f"rate_limit:ip:{client_ip}:{endpoint}"
        else:
            key = f"rate_limit:global:{endpoint}"
        
        # Check current count
        current_count = await redis_manager.get(key, namespace="rate_limits")
        if current_count is None:
            current_count = 0
        else:
            try:
                current_count = int(current_count)
            except:
                current_count = 0
        
        if current_count >= rule.max_requests:
            self.metrics['rate_limit_violations'] += 1
            return False
        
        # Increment counter
        new_count = current_count + 1
        await redis_manager.set(
            key, 
            str(new_count), 
            ttl=rule.window_seconds,
            namespace="rate_limits"
        )
        
        return True
    
    def get_service_for_path(self, path: str) -> Optional[ServiceRoute]:
        """Get service configuration for a given path"""
        for service_id, service in self.services.items():
            if path.startswith(service.path_prefix):
                return service
        return None
    
    async def check_circuit_breaker(self, service_id: str) -> bool:
        """Check if circuit breaker allows request"""
        if service_id not in self.circuit_breakers:
            self.circuit_breakers[service_id] = {
                'failures': 0,
                'last_failure': None,
                'state': 'closed',  # closed, open, half-open
                'failure_threshold': 5,
                'timeout': 60
            }
        
        breaker = self.circuit_breakers[service_id]
        
        if breaker['state'] == 'open':
            # Check if timeout has passed
            if (breaker['last_failure'] and 
                time.time() - breaker['last_failure'] > breaker['timeout']):
                breaker['state'] = 'half-open'
                logger.info(f"Circuit breaker {service_id} moved to half-open")
            else:
                self.metrics['circuit_breaker_trips'] += 1
                return False
        
        return True
    
    async def record_service_response(self, service_id: str, success: bool, response_time: float):
        """Record service response for circuit breaker logic"""
        if service_id not in self.circuit_breakers:
            return
        
        breaker = self.circuit_breakers[service_id]
        
        if success:
            if breaker['state'] == 'half-open':
                breaker['state'] = 'closed'
                breaker['failures'] = 0
                logger.info(f"Circuit breaker {service_id} closed")
        else:
            breaker['failures'] += 1
            breaker['last_failure'] = time.time()
            
            if breaker['failures'] >= breaker['failure_threshold']:
                breaker['state'] = 'open'
                logger.warning(f"Circuit breaker {service_id} opened after {breaker['failures']} failures")
        
        # Update service health metrics
        if service_id not in self.metrics['service_health']:
            self.metrics['service_health'][service_id] = {
                'total_requests': 0,
                'successful_requests': 0,
                'failed_requests': 0,
                'average_response_time': 0.0,
                'last_request': datetime.now().isoformat()
            }
        
        health = self.metrics['service_health'][service_id]
        health['total_requests'] += 1
        health['last_request'] = datetime.now().isoformat()
        
        if success:
            health['successful_requests'] += 1
        else:
            health['failed_requests'] += 1
        
        # Update average response time (simple moving average)
        current_avg = health['average_response_time']
        total_requests = health['total_requests']
        health['average_response_time'] = ((current_avg * (total_requests - 1)) + response_time) / total_requests
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get gateway metrics"""
        total_requests = self.metrics['total_requests']
        success_rate = (self.metrics['successful_requests'] / total_requests * 100) if total_requests > 0 else 0
        
        avg_response_time = 0
        if self.metrics['response_times']:
            avg_response_time = sum(self.metrics['response_times']) / len(self.metrics['response_times'])
        
        return {
            **self.metrics,
            'success_rate_percent': round(success_rate, 2),
            'average_response_time_ms': round(avg_response_time * 1000, 2),
            'circuit_breaker_states': {
                service_id: breaker['state'] 
                for service_id, breaker in self.circuit_breakers.items()
            },
            'timestamp': datetime.now().isoformat()
        }

# Global gateway instance
api_gateway = APIGateway()

class GatewayMiddleware(BaseHTTPMiddleware):
    """API Gateway middleware for request processing"""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.time()
        
        # Update request metrics
        api_gateway.metrics['total_requests'] += 1
        
        # Skip gateway processing for health checks and docs
        if request.url.path in ['/health', '/docs', '/redoc', '/openapi.json']:
            response = await call_next(request)
            return response
        
        try:
            # Get service configuration
            service = api_gateway.get_service_for_path(request.url.path)
            if not service:
                # No specific service config, use default processing
                response = await call_next(request)
                processing_time = time.time() - start_time
                api_gateway.metrics['response_times'].append(processing_time)
                return response
            
            service_id = service.service_type.value
            
            # Check circuit breaker
            if service.circuit_breaker_enabled:
                if not await api_gateway.check_circuit_breaker(service_id):
                    return JSONResponse(
                        status_code=503,
                        content={
                            "error": "Service temporarily unavailable",
                            "service": service_id,
                            "retry_after": 60
                        }
                    )
            
            # Check rate limiting
            if not await api_gateway.check_rate_limit(request, request.url.path):
                return JSONResponse(
                    status_code=429,
                    content={
                        "error": "Rate limit exceeded",
                        "message": "Too many requests. Please try again later."
                    },
                    headers={"Retry-After": "300"}
                )
            
            # Process request through service
            response = await call_next(request)
            processing_time = time.time() - start_time
            
            # Record metrics
            success = response.status_code < 400
            await api_gateway.record_service_response(service_id, success, processing_time)
            
            if success:
                api_gateway.metrics['successful_requests'] += 1
            else:
                api_gateway.metrics['failed_requests'] += 1
            
            api_gateway.metrics['response_times'].append(processing_time)
            
            # Add gateway headers
            response.headers["X-Gateway-Service"] = service_id
            response.headers["X-Gateway-Response-Time"] = f"{processing_time:.3f}s"
            response.headers["X-Gateway-Version"] = "1.0.0"
            
            return response
            
        except Exception as e:
            processing_time = time.time() - start_time
            logger.error(f"Gateway error processing request: {e}")
            
            # Record failure metrics
            api_gateway.metrics['failed_requests'] += 1
            api_gateway.metrics['response_times'].append(processing_time)
            
            return JSONResponse(
                status_code=500,
                content={
                    "error": "Gateway error",
                    "message": "Internal gateway error occurred"
                }
            )

# Enhanced rate limiting decorator
def enhanced_rate_limit(
    max_requests: int = 60,
    window_seconds: int = 60,
    per_user: bool = True,
    per_ip: bool = False,
    error_message: str = "Rate limit exceeded"
):
    """Enhanced rate limiting decorator with flexible configuration"""
    
    def decorator(func):
        async def wrapper(request: Request, *args, **kwargs):
            # Determine rate limit key
            key_parts = [f"rate_limit:{func.__name__}"]
            
            if per_user:
                user_id = getattr(request.state, 'user_id', 'anonymous')
                key_parts.append(f"user:{user_id}")
            
            if per_ip:
                client_ip = request.client.host if request.client else "unknown"
                key_parts.append(f"ip:{client_ip}")
            
            rate_key = ":".join(key_parts)
            
            # Check current count
            current_count = await redis_manager.get(rate_key, namespace="rate_limits")
            if current_count is None:
                current_count = 0
            else:
                try:
                    current_count = int(current_count)
                except:
                    current_count = 0
            
            if current_count >= max_requests:
                raise HTTPException(
                    status_code=429,
                    detail={
                        "error": "rate_limit_exceeded",
                        "message": error_message,
                        "max_requests": max_requests,
                        "window_seconds": window_seconds,
                        "retry_after": window_seconds
                    },
                    headers={"Retry-After": str(window_seconds)}
                )
            
            # Increment counter
            new_count = current_count + 1
            await redis_manager.set(
                rate_key,
                str(new_count),
                ttl=window_seconds,
                namespace="rate_limits"
            )
            
            # Add rate limit headers to response
            result = await func(request, *args, **kwargs)
            
            if hasattr(result, 'headers'):
                result.headers["X-RateLimit-Limit"] = str(max_requests)
                result.headers["X-RateLimit-Remaining"] = str(max_requests - new_count)
                result.headers["X-RateLimit-Reset"] = str(int(time.time()) + window_seconds)
            
            return result
        
        return wrapper
    return decorator

# Circuit breaker decorator
def circuit_breaker(
    failure_threshold: int = 5,
    recovery_timeout: int = 60,
    expected_exception: type = Exception
):
    """Circuit breaker decorator for service protection"""
    
    def decorator(func):
        circuit_state = {
            'failures': 0,
            'last_failure': None,
            'state': 'closed'  # closed, open, half-open
        }
        
        async def wrapper(*args, **kwargs):
            # Check circuit state
            if circuit_state['state'] == 'open':
                if (circuit_state['last_failure'] and 
                    time.time() - circuit_state['last_failure'] > recovery_timeout):
                    circuit_state['state'] = 'half-open'
                    logger.info(f"Circuit breaker for {func.__name__} moved to half-open")
                else:
                    raise HTTPException(
                        status_code=503,
                        detail={
                            "error": "service_unavailable",
                            "message": f"Service {func.__name__} is temporarily unavailable",
                            "retry_after": recovery_timeout
                        }
                    )
            
            try:
                result = await func(*args, **kwargs)
                
                # Success - reset circuit breaker if in half-open state
                if circuit_state['state'] == 'half-open':
                    circuit_state['state'] = 'closed'
                    circuit_state['failures'] = 0
                    logger.info(f"Circuit breaker for {func.__name__} closed")
                
                return result
                
            except expected_exception as e:
                circuit_state['failures'] += 1
                circuit_state['last_failure'] = time.time()
                
                if circuit_state['failures'] >= failure_threshold:
                    circuit_state['state'] = 'open'
                    logger.warning(f"Circuit breaker for {func.__name__} opened after {circuit_state['failures']} failures")
                
                raise e
        
        return wrapper
    return decorator

# Request logging middleware
class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware for detailed request logging"""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.time()
        
        # Log request details
        logger.info(f"Request: {request.method} {request.url.path} from {request.client.host if request.client else 'unknown'}")
        
        # Process request
        response = await call_next(request)
        
        # Log response details
        processing_time = time.time() - start_time
        logger.info(f"Response: {response.status_code} in {processing_time:.3f}s")
        
        return response

# Health check utilities
async def check_service_health(service_id: str) -> Dict[str, Any]:
    """Check health of a specific service"""
    service = api_gateway.services.get(service_id)
    if not service:
        return {"status": "unknown", "error": "Service not found"}
    
    try:
        # For internal services, check if they're responsive
        health_data = {
            "status": "healthy",
            "service_type": service.service_type.value,
            "rate_limit": service.rate_limit,
            "cache_ttl": service.cache_ttl,
            "circuit_breaker_state": api_gateway.circuit_breakers.get(service_id, {}).get('state', 'closed'),
            "timestamp": datetime.now().isoformat()
        }
        
        # Add service-specific health metrics
        if service_id in api_gateway.metrics['service_health']:
            health_data.update(api_gateway.metrics['service_health'][service_id])
        
        return health_data
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

async def get_gateway_status() -> Dict[str, Any]:
    """Get comprehensive gateway status"""
    return {
        "status": "healthy",
        "version": "1.0.0",
        "uptime_seconds": time.time(),  # Simplified uptime
        "registered_services": len(api_gateway.services),
        "active_rate_limits": len(api_gateway.rate_limits),
        "circuit_breakers": len(api_gateway.circuit_breakers),
        "metrics": api_gateway.get_metrics(),
        "redis_available": redis_manager.redis_available,
        "timestamp": datetime.now().isoformat()
    }