#!/usr/bin/env python3
"""
API Gateway Management Endpoints
Admin endpoints for managing gateway configuration, monitoring, and health checks
"""

import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any

from fastapi import APIRouter, HTTPException, Depends, Request, Response
from pydantic import BaseModel

from backend.api_gateway import api_gateway, ServiceRoute, RateLimitRule, ServiceType, check_service_health, get_gateway_status
from backend.enhanced_redis_manager import enhanced_redis
from backend.auth import get_current_user

logger = logging.getLogger(__name__)

# Create router for gateway endpoints
router = APIRouter(prefix="/gateway", tags=["API Gateway"])

# Request/Response models
class ServiceRouteRequest(BaseModel):
    service_type: str
    path_prefix: str
    target_url: Optional[str] = None
    rate_limit: int = 100
    auth_required: bool = True
    cache_ttl: int = 300
    timeout: int = 30
    retry_count: int = 3
    circuit_breaker_enabled: bool = True

class RateLimitRequest(BaseModel):
    endpoint: str
    max_requests: int
    window_seconds: int
    per_user: bool = True
    per_ip: bool = False

class GatewayConfigRequest(BaseModel):
    default_rate_limit: int = 60
    default_cache_ttl: int = 300
    circuit_breaker_threshold: int = 5
    circuit_breaker_timeout: int = 60

# Gateway status and health endpoints
@router.get("/status")
async def get_gateway_status_endpoint():
    """Get comprehensive gateway status"""
    try:
        status = await get_gateway_status()
        return status
    except Exception as e:
        logger.error(f"Error getting gateway status: {e}")
        raise HTTPException(status_code=500, detail="Failed to get gateway status")

@router.get("/health")
async def gateway_health_check():
    """Simple health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }

@router.get("/metrics")
async def get_gateway_metrics(current_user: dict = Depends(get_current_user)):
    """Get detailed gateway metrics"""
    try:
        metrics = api_gateway.get_metrics()
        cache_stats = await enhanced_redis.get_cache_stats()
        
        return {
            "gateway_metrics": metrics,
            "cache_metrics": cache_stats,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting gateway metrics: {e}")
        raise HTTPException(status_code=500, detail="Failed to get metrics")

# Service management endpoints
@router.get("/services")
async def list_services(current_user: dict = Depends(get_current_user)):
    """List all registered services"""
    try:
        services = {}
        for service_id, service in api_gateway.services.items():
            services[service_id] = {
                "service_type": service.service_type.value,
                "path_prefix": service.path_prefix,
                "target_url": service.target_url,
                "rate_limit": service.rate_limit,
                "auth_required": service.auth_required,
                "cache_ttl": service.cache_ttl,
                "timeout": service.timeout,
                "retry_count": service.retry_count,
                "circuit_breaker_enabled": service.circuit_breaker_enabled,
                "health": await check_service_health(service_id)
            }
        
        return {
            "services": services,
            "total_services": len(services)
        }
    except Exception as e:
        logger.error(f"Error listing services: {e}")
        raise HTTPException(status_code=500, detail="Failed to list services")

@router.post("/services/{service_id}")
async def register_service(
    service_id: str,
    service_request: ServiceRouteRequest,
    current_user: dict = Depends(get_current_user)
):
    """Register or update a service route"""
    try:
        # Validate service type
        try:
            service_type = ServiceType(service_request.service_type)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid service type")
        
        # Create service route
        service_route = ServiceRoute(
            service_type=service_type,
            path_prefix=service_request.path_prefix,
            target_url=service_request.target_url,
            rate_limit=service_request.rate_limit,
            auth_required=service_request.auth_required,
            cache_ttl=service_request.cache_ttl,
            timeout=service_request.timeout,
            retry_count=service_request.retry_count,
            circuit_breaker_enabled=service_request.circuit_breaker_enabled
        )
        
        # Register service
        api_gateway.register_service(service_id, service_route)
        
        return {
            "message": f"Service {service_id} registered successfully",
            "service_id": service_id,
            "service_config": service_request.dict()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error registering service {service_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to register service")

@router.delete("/services/{service_id}")
async def unregister_service(
    service_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Unregister a service route"""
    try:
        if service_id not in api_gateway.services:
            raise HTTPException(status_code=404, detail="Service not found")
        
        del api_gateway.services[service_id]
        
        # Also clean up circuit breaker state
        if service_id in api_gateway.circuit_breakers:
            del api_gateway.circuit_breakers[service_id]
        
        return {
            "message": f"Service {service_id} unregistered successfully",
            "service_id": service_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error unregistering service {service_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to unregister service")

@router.get("/services/{service_id}/health")
async def get_service_health(
    service_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get health status of a specific service"""
    try:
        if service_id not in api_gateway.services:
            raise HTTPException(status_code=404, detail="Service not found")
        
        health = await check_service_health(service_id)
        return health
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking service health for {service_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to check service health")

# Rate limiting management
@router.get("/rate-limits")
async def list_rate_limits(current_user: dict = Depends(get_current_user)):
    """List all rate limiting rules"""
    try:
        rate_limits = {}
        for endpoint, rule in api_gateway.rate_limits.items():
            rate_limits[endpoint] = {
                "endpoint": rule.endpoint,
                "max_requests": rule.max_requests,
                "window_seconds": rule.window_seconds,
                "per_user": rule.per_user,
                "per_ip": rule.per_ip
            }
        
        return {
            "rate_limits": rate_limits,
            "total_rules": len(rate_limits)
        }
        
    except Exception as e:
        logger.error(f"Error listing rate limits: {e}")
        raise HTTPException(status_code=500, detail="Failed to list rate limits")

@router.post("/rate-limits")
async def add_rate_limit(
    rate_limit_request: RateLimitRequest,
    current_user: dict = Depends(get_current_user)
):
    """Add or update a rate limiting rule"""
    try:
        rule = RateLimitRule(
            endpoint=rate_limit_request.endpoint,
            max_requests=rate_limit_request.max_requests,
            window_seconds=rate_limit_request.window_seconds,
            per_user=rate_limit_request.per_user,
            per_ip=rate_limit_request.per_ip
        )
        
        api_gateway.register_rate_limit(rule)
        
        return {
            "message": f"Rate limit rule added for {rate_limit_request.endpoint}",
            "rule": rate_limit_request.dict()
        }
        
    except Exception as e:
        logger.error(f"Error adding rate limit rule: {e}")
        raise HTTPException(status_code=500, detail="Failed to add rate limit rule")

@router.delete("/rate-limits/{endpoint:path}")
async def remove_rate_limit(
    endpoint: str,
    current_user: dict = Depends(get_current_user)
):
    """Remove a rate limiting rule"""
    try:
        # URL decode the endpoint path
        import urllib.parse
        endpoint = urllib.parse.unquote(endpoint)
        
        if endpoint not in api_gateway.rate_limits:
            raise HTTPException(status_code=404, detail="Rate limit rule not found")
        
        del api_gateway.rate_limits[endpoint]
        
        return {
            "message": f"Rate limit rule removed for {endpoint}",
            "endpoint": endpoint
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing rate limit rule: {e}")
        raise HTTPException(status_code=500, detail="Failed to remove rate limit rule")

# Circuit breaker management
@router.get("/circuit-breakers")
async def list_circuit_breakers(current_user: dict = Depends(get_current_user)):
    """List all circuit breaker states"""
    try:
        circuit_breakers = {}
        for service_id, breaker in api_gateway.circuit_breakers.items():
            circuit_breakers[service_id] = {
                "service_id": service_id,
                "state": breaker["state"],
                "failures": breaker["failures"],
                "last_failure": datetime.fromtimestamp(breaker["last_failure"]).isoformat() if breaker["last_failure"] else None,
                "failure_threshold": breaker["failure_threshold"],
                "timeout": breaker["timeout"]
            }
        
        return {
            "circuit_breakers": circuit_breakers,
            "total_breakers": len(circuit_breakers)
        }
        
    except Exception as e:
        logger.error(f"Error listing circuit breakers: {e}")
        raise HTTPException(status_code=500, detail="Failed to list circuit breakers")

@router.post("/circuit-breakers/{service_id}/reset")
async def reset_circuit_breaker(
    service_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Reset a circuit breaker to closed state"""
    try:
        if service_id not in api_gateway.circuit_breakers:
            raise HTTPException(status_code=404, detail="Circuit breaker not found")
        
        breaker = api_gateway.circuit_breakers[service_id]
        breaker["state"] = "closed"
        breaker["failures"] = 0
        breaker["last_failure"] = None
        
        logger.info(f"Circuit breaker {service_id} manually reset to closed state")
        
        return {
            "message": f"Circuit breaker {service_id} reset successfully",
            "service_id": service_id,
            "new_state": "closed"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resetting circuit breaker {service_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to reset circuit breaker")

# Cache management endpoints
@router.get("/cache/stats")
async def get_cache_statistics(current_user: dict = Depends(get_current_user)):
    """Get detailed cache statistics"""
    try:
        cache_stats = await enhanced_redis.get_cache_stats()
        return cache_stats
    except Exception as e:
        logger.error(f"Error getting cache stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to get cache statistics")

@router.delete("/cache")
async def clear_cache(
    namespace: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Clear cache entries"""
    try:
        success = await enhanced_redis.clear_cache(namespace)
        
        if success:
            return {
                "message": f"Cache cleared successfully",
                "namespace": namespace or "all",
                "timestamp": datetime.now().isoformat()
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to clear cache")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error clearing cache: {e}")
        raise HTTPException(status_code=500, detail="Failed to clear cache")

@router.delete("/cache/invalidate/tag/{tag}")
async def invalidate_cache_by_tag(
    tag: str,
    current_user: dict = Depends(get_current_user)
):
    """Invalidate cache entries by tag"""
    try:
        count = await enhanced_redis.invalidate_by_tag(tag)
        return {
            "message": f"Invalidated {count} cache entries",
            "tag": tag,
            "entries_invalidated": count,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error invalidating cache by tag {tag}: {e}")
        raise HTTPException(status_code=500, detail="Failed to invalidate cache")

@router.delete("/cache/invalidate/pattern/{pattern}")
async def invalidate_cache_by_pattern(
    pattern: str,
    namespace: str = "default",
    current_user: dict = Depends(get_current_user)
):
    """Invalidate cache entries by pattern"""
    try:
        count = await enhanced_redis.invalidate_by_pattern(pattern, namespace)
        return {
            "message": f"Invalidated {count} cache entries",
            "pattern": pattern,
            "namespace": namespace,
            "entries_invalidated": count,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error invalidating cache by pattern {pattern}: {e}")
        raise HTTPException(status_code=500, detail="Failed to invalidate cache")

# Request tracking and analytics
@router.get("/analytics/requests")
async def get_request_analytics(
    hours: int = 24,
    current_user: dict = Depends(get_current_user)
):
    """Get request analytics for the specified time period"""
    try:
        # This is a simplified implementation
        # In a real system, you'd store request logs and analyze them
        
        analytics = {
            "time_period_hours": hours,
            "total_requests": api_gateway.metrics["total_requests"],
            "successful_requests": api_gateway.metrics["successful_requests"],
            "failed_requests": api_gateway.metrics["failed_requests"],
            "cache_hits": api_gateway.metrics["cache_hits"],
            "cache_misses": api_gateway.metrics["cache_misses"],
            "rate_limit_violations": api_gateway.metrics["rate_limit_violations"],
            "circuit_breaker_trips": api_gateway.metrics["circuit_breaker_trips"],
            "top_endpoints": [],  # Would be populated from request logs
            "error_breakdown": {},  # Would be populated from error logs
            "response_time_percentiles": {
                "p50": 0,
                "p95": 0,
                "p99": 0
            },
            "timestamp": datetime.now().isoformat()
        }
        
        # Calculate response time percentiles if we have data
        if api_gateway.metrics["response_times"]:
            import statistics
            response_times = api_gateway.metrics["response_times"]
            
            analytics["response_time_percentiles"] = {
                "p50": round(statistics.median(response_times) * 1000, 2),
                "p95": round(statistics.quantiles(response_times, n=20)[18] * 1000, 2) if len(response_times) >= 20 else 0,
                "p99": round(statistics.quantiles(response_times, n=100)[98] * 1000, 2) if len(response_times) >= 100 else 0
            }
        
        return analytics
        
    except Exception as e:
        logger.error(f"Error getting request analytics: {e}")
        raise HTTPException(status_code=500, detail="Failed to get analytics")

# Configuration management
@router.get("/config")
async def get_gateway_config(current_user: dict = Depends(get_current_user)):
    """Get current gateway configuration"""
    try:
        config = {
            "services": len(api_gateway.services),
            "rate_limit_rules": len(api_gateway.rate_limits),
            "circuit_breakers": len(api_gateway.circuit_breakers),
            "redis_available": enhanced_redis.redis_available,
            "timestamp": datetime.now().isoformat()
        }
        
        return config
        
    except Exception as e:
        logger.error(f"Error getting gateway config: {e}")
        raise HTTPException(status_code=500, detail="Failed to get configuration")

@router.post("/config/reload")
async def reload_gateway_config(current_user: dict = Depends(get_current_user)):
    """Reload gateway configuration"""
    try:
        # In a real implementation, this would reload configuration from files or database
        # For now, we'll just re-register default services
        api_gateway._register_default_services()
        api_gateway._register_default_rate_limits()
        
        return {
            "message": "Gateway configuration reloaded successfully",
            "services": len(api_gateway.services),
            "rate_limits": len(api_gateway.rate_limits),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error reloading gateway config: {e}")
        raise HTTPException(status_code=500, detail="Failed to reload configuration")

# Export/Import configuration
@router.get("/config/export")
async def export_gateway_config(current_user: dict = Depends(get_current_user)):
    """Export gateway configuration as JSON"""
    try:
        config = {
            "services": {
                service_id: {
                    "service_type": service.service_type.value,
                    "path_prefix": service.path_prefix,
                    "target_url": service.target_url,
                    "rate_limit": service.rate_limit,
                    "auth_required": service.auth_required,
                    "cache_ttl": service.cache_ttl,
                    "timeout": service.timeout,
                    "retry_count": service.retry_count,
                    "circuit_breaker_enabled": service.circuit_breaker_enabled
                }
                for service_id, service in api_gateway.services.items()
            },
            "rate_limits": {
                endpoint: {
                    "endpoint": rule.endpoint,
                    "max_requests": rule.max_requests,
                    "window_seconds": rule.window_seconds,
                    "per_user": rule.per_user,
                    "per_ip": rule.per_ip
                }
                for endpoint, rule in api_gateway.rate_limits.items()
            },
            "exported_at": datetime.now().isoformat(),
            "version": "1.0.0"
        }
        
        return config
        
    except Exception as e:
        logger.error(f"Error exporting gateway config: {e}")
        raise HTTPException(status_code=500, detail="Failed to export configuration")

@router.post("/config/import")
async def import_gateway_config(
    config: Dict[str, Any],
    current_user: dict = Depends(get_current_user)
):
    """Import gateway configuration from JSON"""
    try:
        imported_services = 0
        imported_rate_limits = 0
        
        # Import services
        if "services" in config:
            for service_id, service_config in config["services"].items():
                try:
                    service_type = ServiceType(service_config["service_type"])
                    service_route = ServiceRoute(
                        service_type=service_type,
                        path_prefix=service_config["path_prefix"],
                        target_url=service_config.get("target_url"),
                        rate_limit=service_config.get("rate_limit", 100),
                        auth_required=service_config.get("auth_required", True),
                        cache_ttl=service_config.get("cache_ttl", 300),
                        timeout=service_config.get("timeout", 30),
                        retry_count=service_config.get("retry_count", 3),
                        circuit_breaker_enabled=service_config.get("circuit_breaker_enabled", True)
                    )
                    api_gateway.register_service(service_id, service_route)
                    imported_services += 1
                except Exception as e:
                    logger.error(f"Failed to import service {service_id}: {e}")
        
        # Import rate limits
        if "rate_limits" in config:
            for endpoint, rule_config in config["rate_limits"].items():
                try:
                    rule = RateLimitRule(
                        endpoint=rule_config["endpoint"],
                        max_requests=rule_config["max_requests"],
                        window_seconds=rule_config["window_seconds"],
                        per_user=rule_config.get("per_user", True),
                        per_ip=rule_config.get("per_ip", False)
                    )
                    api_gateway.register_rate_limit(rule)
                    imported_rate_limits += 1
                except Exception as e:
                    logger.error(f"Failed to import rate limit for {endpoint}: {e}")
        
        return {
            "message": "Gateway configuration imported successfully",
            "imported_services": imported_services,
            "imported_rate_limits": imported_rate_limits,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error importing gateway config: {e}")
        raise HTTPException(status_code=500, detail="Failed to import configuration")