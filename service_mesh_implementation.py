#!/usr/bin/env python3
"""
Service Mesh Implementation for Elmowafiplatform

This script implements a service mesh for microservices communication in the Elmowafiplatform.
It provides service discovery, health checking, load balancing, and circuit breaking capabilities.
"""

import os
import json
import time
import random
import logging
import asyncio
from typing import Dict, List, Any, Optional, Union, Callable
from datetime import datetime, timedelta
from enum import Enum

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Try to import required libraries
try:
    import httpx
    HTTPX_AVAILABLE = True
except ImportError:
    HTTPX_AVAILABLE = False
    logger.warning("httpx not available, HTTP client will be limited")

try:
    from fastapi import FastAPI, APIRouter, Depends, HTTPException, status
    from fastapi.responses import JSONResponse
    FASTAPI_AVAILABLE = True
except ImportError:
    FASTAPI_AVAILABLE = False
    logger.warning("fastapi not available, API routing will be limited")

# Service health status enum
class ServiceStatus(str, Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    UNKNOWN = "unknown"

# Circuit breaker states
class CircuitState(str, Enum):
    CLOSED = "closed"  # Normal operation, requests flow through
    OPEN = "open"      # Circuit is open, requests fail fast
    HALF_OPEN = "half_open"  # Testing if service is healthy again

# Service information class
class ServiceInfo:
    """Information about a service in the mesh"""
    
    def __init__(self, name: str, url: str, version: str = "1.0.0", tags: List[str] = None):
        self.name = name
        self.url = url
        self.version = version
        self.tags = tags or []
        self.health_status = ServiceStatus.UNKNOWN
        self.last_health_check = datetime.now()
        self.circuit_state = CircuitState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.circuit_trip_time = None
        self.endpoints = {}
        self.metadata = {}
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        return {
            "name": self.name,
            "url": self.url,
            "version": self.version,
            "tags": self.tags,
            "health_status": self.health_status,
            "last_health_check": self.last_health_check.isoformat(),
            "circuit_state": self.circuit_state,
            "endpoints": list(self.endpoints.keys()),
            "metadata": self.metadata
        }

# Circuit breaker class
class CircuitBreaker:
    """Circuit breaker for service calls"""
    
    def __init__(self, failure_threshold: int = 5, recovery_timeout: int = 30, half_open_max_calls: int = 3):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout  # seconds
        self.half_open_max_calls = half_open_max_calls
    
    def should_allow_request(self, service: ServiceInfo) -> bool:
        """Determine if a request should be allowed based on circuit state"""
        now = datetime.now()
        
        # If circuit is closed, always allow
        if service.circuit_state == CircuitState.CLOSED:
            return True
        
        # If circuit is open, check if recovery timeout has elapsed
        if service.circuit_state == CircuitState.OPEN:
            if service.circuit_trip_time and (now - service.circuit_trip_time).total_seconds() >= self.recovery_timeout:
                # Transition to half-open
                service.circuit_state = CircuitState.HALF_OPEN
                service.success_count = 0
                logger.info(f"Circuit for {service.name} transitioning from OPEN to HALF_OPEN")
                return True
            return False
        
        # If circuit is half-open, allow limited requests
        if service.circuit_state == CircuitState.HALF_OPEN:
            return service.success_count < self.half_open_max_calls
        
        return True
    
    def record_success(self, service: ServiceInfo) -> None:
        """Record a successful call to the service"""
        if service.circuit_state == CircuitState.HALF_OPEN:
            service.success_count += 1
            if service.success_count >= self.half_open_max_calls:
                # Transition back to closed
                service.circuit_state = CircuitState.CLOSED
                service.failure_count = 0
                logger.info(f"Circuit for {service.name} transitioning from HALF_OPEN to CLOSED")
        
        # Reset failure count on success
        service.failure_count = 0
    
    def record_failure(self, service: ServiceInfo) -> None:
        """Record a failed call to the service"""
        service.failure_count += 1
        
        # If we've reached the failure threshold, open the circuit
        if service.failure_count >= self.failure_threshold and service.circuit_state != CircuitState.OPEN:
            service.circuit_state = CircuitState.OPEN
            service.circuit_trip_time = datetime.now()
            logger.warning(f"Circuit for {service.name} OPENED due to {service.failure_count} failures")

# Load balancer class
class LoadBalancer:
    """Load balancer for service instances"""
    
    def __init__(self, strategy: str = "round_robin"):
        self.strategy = strategy
        self.current_index = {}
    
    def select_instance(self, service_name: str, instances: List[ServiceInfo]) -> Optional[ServiceInfo]:
        """Select an instance based on the load balancing strategy"""
        if not instances:
            return None
        
        # Filter out unhealthy instances
        healthy_instances = [i for i in instances if i.health_status != ServiceStatus.UNHEALTHY]
        if not healthy_instances:
            logger.warning(f"No healthy instances available for {service_name}")
            # Fall back to any instance if all are unhealthy
            healthy_instances = instances
        
        if self.strategy == "random":
            return random.choice(healthy_instances)
        
        elif self.strategy == "round_robin":
            if service_name not in self.current_index:
                self.current_index[service_name] = 0
            
            instance = healthy_instances[self.current_index[service_name] % len(healthy_instances)]
            self.current_index[service_name] = (self.current_index[service_name] + 1) % len(healthy_instances)
            return instance
        
        # Default to first instance
        return healthy_instances[0]

# Service mesh class
class ServiceMesh:
    """Service mesh for microservices communication"""
    
    def __init__(self, mesh_name: str = "elmowafiplatform-mesh"):
        self.mesh_name = mesh_name
        self.services = {}  # Dict[service_name, List[ServiceInfo]]
        self.circuit_breaker = CircuitBreaker()
        self.load_balancer = LoadBalancer()
        self.http_client = httpx.AsyncClient() if HTTPX_AVAILABLE else None
        self.health_check_interval = 30  # seconds
        self.health_check_task = None
    
    async def start(self):
        """Start the service mesh"""
        logger.info(f"Starting service mesh: {self.mesh_name}")
        if self.http_client is None and HTTPX_AVAILABLE:
            self.http_client = httpx.AsyncClient()
        
        # Start health check loop
        self.health_check_task = asyncio.create_task(self._health_check_loop())
    
    async def stop(self):
        """Stop the service mesh"""
        logger.info(f"Stopping service mesh: {self.mesh_name}")
        
        # Cancel health check loop
        if self.health_check_task:
            self.health_check_task.cancel()
            try:
                await self.health_check_task
            except asyncio.CancelledError:
                pass
        
        # Close HTTP client
        if self.http_client:
            await self.http_client.aclose()
            self.http_client = None
    
    def register_service(self, name: str, url: str, version: str = "1.0.0", tags: List[str] = None) -> ServiceInfo:
        """Register a service with the mesh"""
        service = ServiceInfo(name, url, version, tags)
        
        if name not in self.services:
            self.services[name] = []
        
        # Check if service with same URL already exists
        for existing in self.services[name]:
            if existing.url == url:
                logger.warning(f"Service {name} at {url} already registered, updating")
                existing.version = version
                existing.tags = tags or []
                return existing
        
        # Add new service
        self.services[name].append(service)
        logger.info(f"Registered service: {name} at {url}")
        return service
    
    def deregister_service(self, name: str, url: str) -> bool:
        """Deregister a service from the mesh"""
        if name not in self.services:
            return False
        
        # Find and remove service with matching URL
        for i, service in enumerate(self.services[name]):
            if service.url == url:
                self.services[name].pop(i)
                logger.info(f"Deregistered service: {name} at {url}")
                
                # Remove service list if empty
                if not self.services[name]:
                    del self.services[name]
                
                return True
        
        return False
    
    def get_service(self, name: str) -> Optional[ServiceInfo]:
        """Get a service instance using load balancing"""
        if name not in self.services or not self.services[name]:
            return None
        
        return self.load_balancer.select_instance(name, self.services[name])
    
    def get_all_services(self) -> Dict[str, List[Dict[str, Any]]]:
        """Get all registered services"""
        result = {}
        for name, instances in self.services.items():
            result[name] = [instance.to_dict() for instance in instances]
        return result
    
    async def check_service_health(self, service: ServiceInfo) -> ServiceStatus:
        """Check the health of a service"""
        if not self.http_client:
            return ServiceStatus.UNKNOWN
        
        # Try standard health endpoints
        health_endpoints = [
            "/health",
            "/api/health",
            "/api/v1/health",
            "/status",
            "/ping"
        ]
        
        for endpoint in health_endpoints:
            try:
                url = f"{service.url.rstrip('/')}{endpoint}"
                response = await self.http_client.get(url, timeout=5.0)
                
                if response.status_code == 200:
                    # Parse response if JSON
                    try:
                        data = response.json()
                        status = data.get("status", "")
                        
                        if status.lower() == "ok" or status.lower() == "healthy":
                            return ServiceStatus.HEALTHY
                        elif status.lower() == "degraded":
                            return ServiceStatus.DEGRADED
                        else:
                            return ServiceStatus.HEALTHY  # Default to healthy if 200 OK
                    except:
                        return ServiceStatus.HEALTHY  # Default to healthy if 200 OK but not JSON
                
                elif response.status_code >= 500:
                    return ServiceStatus.UNHEALTHY
                
            except Exception as e:
                logger.debug(f"Health check failed for {service.name} at {endpoint}: {str(e)}")
                continue
        
        # If we couldn't determine health from standard endpoints, try a simple connection test
        try:
            url = service.url.rstrip('/')
            response = await self.http_client.get(url, timeout=5.0)
            
            if response.status_code < 500:
                return ServiceStatus.HEALTHY
            else:
                return ServiceStatus.UNHEALTHY
        except Exception as e:
            logger.warning(f"Connection test failed for {service.name}: {str(e)}")
            return ServiceStatus.UNHEALTHY
    
    async def _health_check_loop(self):
        """Background task to periodically check service health"""
        while True:
            try:
                await self._check_all_services_health()
                await asyncio.sleep(self.health_check_interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in health check loop: {str(e)}")
                await asyncio.sleep(self.health_check_interval)
    
    async def _check_all_services_health(self):
        """Check health of all registered services"""
        for name, instances in self.services.items():
            for service in instances:
                try:
                    status = await self.check_service_health(service)
                    service.health_status = status
                    service.last_health_check = datetime.now()
                    logger.debug(f"Health check for {name} at {service.url}: {status}")
                except Exception as e:
                    logger.error(f"Error checking health for {name} at {service.url}: {str(e)}")
                    service.health_status = ServiceStatus.UNKNOWN
    
    async def call_service(self, service_name: str, endpoint: str, method: str = "GET", 
                          data: Any = None, headers: Dict[str, str] = None, 
                          timeout: float = 30.0) -> Dict[str, Any]:
        """Call a service through the mesh with circuit breaking"""
        if not self.http_client:
            raise RuntimeError("HTTP client not available")
        
        # Get service using load balancer
        service = self.get_service(service_name)
        if not service:
            raise ValueError(f"Service '{service_name}' not registered or available")
        
        # Check circuit breaker
        if not self.circuit_breaker.should_allow_request(service):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Circuit breaker open for service: {service_name}"
            )
        
        # Prepare request
        url = f"{service.url.rstrip('/')}/{endpoint.lstrip('/')}"
        headers = headers or {}
        
        # Add default headers
        if "Content-Type" not in headers and data is not None:
            headers["Content-Type"] = "application/json"
        
        # Add tracing headers
        headers["X-Mesh-Name"] = self.mesh_name
        headers["X-Mesh-Trace-ID"] = f"trace-{int(time.time())}-{random.randint(1000, 9999)}"
        
        try:
            # Make request
            if method.upper() == "GET":
                response = await self.http_client.get(url, headers=headers, timeout=timeout)
            elif method.upper() == "POST":
                json_data = data if isinstance(data, dict) else None
                response = await self.http_client.post(url, json=json_data, headers=headers, timeout=timeout)
            elif method.upper() == "PUT":
                json_data = data if isinstance(data, dict) else None
                response = await self.http_client.put(url, json=json_data, headers=headers, timeout=timeout)
            elif method.upper() == "DELETE":
                response = await self.http_client.delete(url, headers=headers, timeout=timeout)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
            
            # Check response
            response.raise_for_status()
            
            # Record success
            self.circuit_breaker.record_success(service)
            
            # Parse response
            try:
                return response.json()
            except:
                return {"status": "success", "statusCode": response.status_code, "text": response.text}
            
        except Exception as e:
            # Record failure
            self.circuit_breaker.record_failure(service)
            
            # Re-raise as HTTP exception
            if isinstance(e, httpx.HTTPStatusError):
                status_code = e.response.status_code
                try:
                    detail = e.response.json()
                except:
                    detail = e.response.text or str(e)
                raise HTTPException(status_code=status_code, detail=detail)
            else:
                raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))

# Create FastAPI router for service mesh if FastAPI is available
if FASTAPI_AVAILABLE:
    mesh_router = APIRouter(prefix="/api/v1/mesh")
    
    # Create service mesh instance
    service_mesh = ServiceMesh()
    
    @mesh_router.on_event("startup")
    async def startup_mesh():
        await service_mesh.start()
    
    @mesh_router.on_event("shutdown")
    async def shutdown_mesh():
        await service_mesh.stop()
    
    @mesh_router.get("/services")
    async def list_services():
        """List all registered services"""
        return service_mesh.get_all_services()
    
    @mesh_router.post("/services")
    async def register_service(service_data: Dict[str, Any]):
        """Register a new service"""
        required_fields = ["name", "url"]
        for field in required_fields:
            if field not in service_data:
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
        
        service = service_mesh.register_service(
            name=service_data["name"],
            url=service_data["url"],
            version=service_data.get("version", "1.0.0"),
            tags=service_data.get("tags", [])
        )
        
        return service.to_dict()
    
    @mesh_router.delete("/services/{name}")
    async def deregister_service(name: str, url: str):
        """Deregister a service"""
        success = service_mesh.deregister_service(name, url)
        if not success:
            raise HTTPException(status_code=404, detail=f"Service not found: {name} at {url}")
        
        return {"status": "success", "message": f"Service {name} at {url} deregistered"}
    
    @mesh_router.get("/services/{name}/health")
    async def check_service_health(name: str):
        """Check health of a service"""
        service = service_mesh.get_service(name)
        if not service:
            raise HTTPException(status_code=404, detail=f"Service not found: {name}")
        
        status = await service_mesh.check_service_health(service)
        return {
            "name": service.name,
            "url": service.url,
            "status": status,
            "last_check": datetime.now().isoformat()
        }
    
    @mesh_router.post("/call/{service_name}/{endpoint:path}")
    async def call_service(service_name: str, endpoint: str, request_data: Dict[str, Any] = None):
        """Call a service through the mesh"""
        method = request_data.get("method", "GET") if request_data else "GET"
        data = request_data.get("data") if request_data else None
        headers = request_data.get("headers", {}) if request_data else {}
        
        result = await service_mesh.call_service(
            service_name=service_name,
            endpoint=endpoint,
            method=method,
            data=data,
            headers=headers
        )
        
        return result

# Example usage
def setup_service_mesh(app: FastAPI = None):
    """Set up service mesh for a FastAPI application"""
    if not FASTAPI_AVAILABLE:
        logger.error("FastAPI is required to set up service mesh")
        return None
    
    if app:
        app.include_router(mesh_router)
        logger.info("Service mesh router added to FastAPI application")
    
    # Register some example services
    service_mesh.register_service("budget-service", "http://budget-service:8080")
    service_mesh.register_service("memory-service", "http://memory-service:8080")
    service_mesh.register_service("travel-service", "http://travel-service:8080")
    
    return service_mesh

# Standalone usage
if __name__ == "__main__":
    if FASTAPI_AVAILABLE:
        app = FastAPI(title="Elmowafiplatform Service Mesh", version="1.0.0")
        mesh = setup_service_mesh(app)
        
        # This would normally be in a separate file
        import uvicorn
        uvicorn.run(app, host="0.0.0.0", port=8001)
    else:
        logger.error("FastAPI is required to run this script")