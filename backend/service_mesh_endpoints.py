#!/usr/bin/env python3
"""
Service Mesh API Endpoints
Provides endpoints for service mesh management and monitoring
"""

import logging
from typing import Dict, List, Optional, Any
from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# Import service mesh
from backend.service_mesh import (
    ServiceMesh, ServiceInstance, ServiceType, ServiceStatus,
    get_service_mesh, shutdown_service_mesh
)

# Import auth
try:
    from backend.auth import get_current_user
    AUTH_AVAILABLE = True
except ImportError:
    AUTH_AVAILABLE = False
    async def get_current_user(request: Request = None):
        return {"id": "admin", "email": "admin@elmowafi.com"}

# Import rate limiting
try:
    from backend.security import rate_limit
    RATE_LIMIT_AVAILABLE = True
except ImportError:
    RATE_LIMIT_AVAILABLE = False
    def rate_limit(max_requests=100, window=60):
        def decorator(func):
            return func
        return decorator

# Setup logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/service-mesh", tags=["Service Mesh"])

# Pydantic models
class ServiceInstanceRequest(BaseModel):
    """Request model for service instance registration"""
    name: str
    service_type: str
    host: str
    port: int
    health_endpoint: str = "/health"
    metadata: Optional[Dict[str, Any]] = None
    load_balancer_weight: float = 1.0
    version: str = "1.0.0"

class ServiceInstanceResponse(BaseModel):
    """Response model for service instance"""
    id: str
    name: str
    service_type: str
    host: str
    port: int
    health_endpoint: str
    status: str
    last_health_check: str
    metadata: Dict[str, Any]
    load_balancer_weight: float
    version: str

class ServiceRequest(BaseModel):
    """Request model for service mesh requests"""
    service_type: str
    method: str
    path: str
    headers: Optional[Dict[str, str]] = None
    body: Optional[Dict[str, Any]] = None
    timeout: float = 30.0

class ServiceResponse(BaseModel):
    """Response model for service mesh responses"""
    request_id: str
    status_code: int
    headers: Dict[str, str]
    body: Any
    response_time: float
    timestamp: str

class MetricsResponse(BaseModel):
    """Response model for service mesh metrics"""
    requests: int
    errors: int
    error_rate: float
    average_response_time: float
    active_services: int
    circuit_breakers: Dict[str, str]

# Service Mesh Management Endpoints
@router.post("/services", response_model=ServiceInstanceResponse)
@rate_limit(max_requests=10, window=60) if RATE_LIMIT_AVAILABLE else None
async def register_service(
    request: Request,
    service_data: ServiceInstanceRequest,
    user = Depends(get_current_user)
):
    """Register a new service with the service mesh"""
    try:
        service_mesh = await get_service_mesh()
        
        # Create service instance
        service_instance = ServiceInstance(
            id=f"{service_data.name}-{datetime.now().timestamp()}",
            name=service_data.name,
            service_type=ServiceType(service_data.service_type),
            host=service_data.host,
            port=service_data.port,
            health_endpoint=service_data.health_endpoint,
            status=ServiceStatus.STARTING,
            last_health_check=datetime.now(),
            metadata=service_data.metadata or {},
            load_balancer_weight=service_data.load_balancer_weight,
            version=service_data.version
        )
        
        # Register service
        await service_mesh.register_service(service_instance)
        
        return ServiceInstanceResponse(
            id=service_instance.id,
            name=service_instance.name,
            service_type=service_instance.service_type.value,
            host=service_instance.host,
            port=service_instance.port,
            health_endpoint=service_instance.health_endpoint,
            status=service_instance.status.value,
            last_health_check=service_instance.last_health_check.isoformat(),
            metadata=service_instance.metadata,
            load_balancer_weight=service_instance.load_balancer_weight,
            version=service_instance.version
        )
        
    except Exception as e:
        logger.error(f"Failed to register service: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to register service: {str(e)}")

@router.delete("/services/{service_id}")
@rate_limit(max_requests=10, window=60) if RATE_LIMIT_AVAILABLE else None
async def deregister_service(
    request: Request,
    service_id: str,
    user = Depends(get_current_user)
):
    """Deregister a service from the service mesh"""
    try:
        service_mesh = await get_service_mesh()
        
        # Find service name from ID
        service_name = None
        for lb in service_mesh.load_balancers.values():
            for instance in lb.instances:
                if instance.id == service_id:
                    service_name = instance.name
                    break
            if service_name:
                break
        
        if not service_name:
            raise HTTPException(status_code=404, detail="Service not found")
        
        # Deregister service
        await service_mesh.deregister_service(service_id, service_name)
        
        return {
            "success": True,
            "message": f"Service {service_name} deregistered successfully",
            "service_id": service_id
        }
        
    except Exception as e:
        logger.error(f"Failed to deregister service: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to deregister service: {str(e)}")

@router.get("/services", response_model=List[ServiceInstanceResponse])
@rate_limit(max_requests=20, window=60) if RATE_LIMIT_AVAILABLE else None
async def list_services(
    request: Request,
    service_type: Optional[str] = None,
    user = Depends(get_current_user)
):
    """List all registered services"""
    try:
        service_mesh = await get_service_mesh()
        
        services = []
        for lb_service_type, load_balancer in service_mesh.load_balancers.items():
            if service_type and lb_service_type != service_type:
                continue
                
            for instance in load_balancer.instances:
                services.append(ServiceInstanceResponse(
                    id=instance.id,
                    name=instance.name,
                    service_type=instance.service_type.value,
                    host=instance.host,
                    port=instance.port,
                    health_endpoint=instance.health_endpoint,
                    status=instance.status.value,
                    last_health_check=instance.last_health_check.isoformat(),
                    metadata=instance.metadata,
                    load_balancer_weight=instance.load_balancer_weight,
                    version=instance.version
                ))
        
        return services
        
    except Exception as e:
        logger.error(f"Failed to list services: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list services: {str(e)}")

@router.get("/services/{service_id}", response_model=ServiceInstanceResponse)
@rate_limit(max_requests=20, window=60) if RATE_LIMIT_AVAILABLE else None
async def get_service(
    request: Request,
    service_id: str,
    user = Depends(get_current_user)
):
    """Get specific service details"""
    try:
        service_mesh = await get_service_mesh()
        
        for lb in service_mesh.load_balancers.values():
            for instance in lb.instances:
                if instance.id == service_id:
                    return ServiceInstanceResponse(
                        id=instance.id,
                        name=instance.name,
                        service_type=instance.service_type.value,
                        host=instance.host,
                        port=instance.port,
                        health_endpoint=instance.health_endpoint,
                        status=instance.status.value,
                        last_health_check=instance.last_health_check.isoformat(),
                        metadata=instance.metadata,
                        load_balancer_weight=instance.load_balancer_weight,
                        version=instance.version
                    )
        
        raise HTTPException(status_code=404, detail="Service not found")
        
    except Exception as e:
        logger.error(f"Failed to get service: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get service: {str(e)}")

# Service Mesh Request Endpoints
@router.post("/request", response_model=ServiceResponse)
@rate_limit(max_requests=50, window=60) if RATE_LIMIT_AVAILABLE else None
async def make_service_request(
    request: Request,
    service_request: ServiceRequest,
    user = Depends(get_current_user)
):
    """Make a request through the service mesh"""
    try:
        service_mesh = await get_service_mesh()
        
        # Make request through service mesh
        response = await service_mesh.make_request(
            service_type=ServiceType(service_request.service_type),
            method=service_request.method,
            path=service_request.path,
            headers=service_request.headers,
            body=service_request.body,
            timeout=service_request.timeout
        )
        
        return ServiceResponse(
            request_id=response.request_id,
            status_code=response.status_code,
            headers=response.headers,
            body=response.body,
            response_time=response.response_time,
            timestamp=response.timestamp.isoformat()
        )
        
    except Exception as e:
        logger.error(f"Service request failed: {e}")
        raise HTTPException(status_code=500, detail=f"Service request failed: {str(e)}")

# Health Check Endpoints
@router.post("/health-check")
@rate_limit(max_requests=5, window=60) if RATE_LIMIT_AVAILABLE else None
async def health_check_all_services(
    request: Request,
    user = Depends(get_current_user)
):
    """Perform health check on all registered services"""
    try:
        service_mesh = await get_service_mesh()
        
        # Perform health checks
        await service_mesh.health_check_all_services()
        
        # Get updated service statuses
        services = []
        for lb in service_mesh.load_balancers.values():
            for instance in lb.instances:
                services.append({
                    "id": instance.id,
                    "name": instance.name,
                    "status": instance.status.value,
                    "last_health_check": instance.last_health_check.isoformat()
                })
        
        return {
            "success": True,
            "message": "Health check completed",
            "services": services,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")

# Metrics Endpoints
@router.get("/metrics", response_model=MetricsResponse)
@rate_limit(max_requests=10, window=60) if RATE_LIMIT_AVAILABLE else None
async def get_service_mesh_metrics(
    request: Request,
    user = Depends(get_current_user)
):
    """Get service mesh metrics"""
    try:
        service_mesh = await get_service_mesh()
        
        metrics = service_mesh.get_metrics()
        
        return MetricsResponse(
            requests=metrics["requests"],
            errors=metrics["errors"],
            error_rate=metrics["error_rate"],
            average_response_time=metrics["average_response_time"],
            active_services=metrics["active_services"],
            circuit_breakers=metrics["circuit_breakers"]
        )
        
    except Exception as e:
        logger.error(f"Failed to get metrics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get metrics: {str(e)}")

# Service Discovery Endpoints
@router.get("/discover/{service_name}")
@rate_limit(max_requests=20, window=60) if RATE_LIMIT_AVAILABLE else None
async def discover_services(
    request: Request,
    service_name: str,
    user = Depends(get_current_user)
):
    """Discover services by name"""
    try:
        service_mesh = await get_service_mesh()
        
        # Discover services
        instances = await service_mesh.service_discovery.discover_services(service_name)
        
        services = []
        for instance in instances:
            services.append({
                "id": instance.id,
                "name": instance.name,
                "service_type": instance.service_type.value,
                "host": instance.host,
                "port": instance.port,
                "health_endpoint": instance.health_endpoint,
                "status": instance.status.value,
                "last_health_check": instance.last_health_check.isoformat(),
                "metadata": instance.metadata,
                "version": instance.version
            })
        
        return {
            "service_name": service_name,
            "instances": services,
            "count": len(services)
        }
        
    except Exception as e:
        logger.error(f"Service discovery failed: {e}")
        raise HTTPException(status_code=500, detail=f"Service discovery failed: {str(e)}")

# Service Mesh Status Endpoint
@router.get("/status")
@rate_limit(max_requests=10, window=60) if RATE_LIMIT_AVAILABLE else None
async def get_service_mesh_status(
    request: Request,
    user = Depends(get_current_user)
):
    """Get service mesh status"""
    try:
        service_mesh = await get_service_mesh()
        
        # Get metrics
        metrics = service_mesh.get_metrics()
        
        # Count services by type
        service_counts = {}
        for lb_service_type, load_balancer in service_mesh.load_balancers.items():
            service_counts[lb_service_type] = len(load_balancer.instances)
        
        # Count circuit breakers by state
        circuit_breaker_states = {}
        for service, cb in service_mesh.circuit_breakers.items():
            state = cb.state
            if state not in circuit_breaker_states:
                circuit_breaker_states[state] = 0
            circuit_breaker_states[state] += 1
        
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "service_counts": service_counts,
            "total_services": metrics["active_services"],
            "circuit_breaker_states": circuit_breaker_states,
            "metrics": {
                "requests": metrics["requests"],
                "errors": metrics["errors"],
                "error_rate": metrics["error_rate"],
                "average_response_time": metrics["average_response_time"]
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to get service mesh status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get service mesh status: {str(e)}")

# Export router
__all__ = ["router"]
