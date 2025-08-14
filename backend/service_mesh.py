#!/usr/bin/env python3
"""
Service Mesh for Elmowafiplatform
Handles microservices communication, service discovery, and load balancing
"""

import asyncio
import json
import logging
import time
import uuid
from typing import Dict, List, Optional, Any, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
import aiohttp
import consul
from consul import Consul

# Setup logging
logger = logging.getLogger(__name__)

class ServiceStatus(Enum):
    """Service status enumeration"""
    HEALTHY = "healthy"
    UNHEALTHY = "unhealthy"
    STARTING = "starting"
    STOPPING = "stopping"

class ServiceType(Enum):
    """Service type enumeration"""
    API = "api"
    AI = "ai"
    BUDGET = "budget"
    AUTH = "auth"
    DATABASE = "database"
    CACHE = "cache"
    WEBSOCKET = "websocket"

@dataclass
class ServiceInstance:
    """Service instance information"""
    id: str
    name: str
    service_type: ServiceType
    host: str
    port: int
    health_endpoint: str
    status: ServiceStatus
    last_health_check: datetime
    metadata: Dict[str, Any]
    load_balancer_weight: float = 1.0
    version: str = "1.0.0"

@dataclass
class ServiceRequest:
    """Service request information"""
    id: str
    service_name: str
    method: str
    path: str
    headers: Dict[str, str]
    body: Optional[Dict[str, Any]]
    timestamp: datetime
    timeout: float = 30.0

@dataclass
class ServiceResponse:
    """Service response information"""
    request_id: str
    status_code: int
    headers: Dict[str, str]
    body: Any
    response_time: float
    timestamp: datetime

class CircuitBreaker:
    """Circuit breaker pattern implementation"""
    
    def __init__(self, failure_threshold: int = 5, recovery_timeout: float = 60.0):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failure_count = 0
        self.last_failure_time = None
        self.state = "CLOSED"  # CLOSED, OPEN, HALF_OPEN
        
    def record_failure(self):
        """Record a service failure"""
        self.failure_count += 1
        self.last_failure_time = datetime.now()
        
        if self.failure_count >= self.failure_threshold:
            self.state = "OPEN"
            logger.warning(f"Circuit breaker opened after {self.failure_count} failures")
    
    def record_success(self):
        """Record a service success"""
        self.failure_count = 0
        if self.state == "HALF_OPEN":
            self.state = "CLOSED"
            logger.info("Circuit breaker closed after successful request")
    
    def can_execute(self) -> bool:
        """Check if request can be executed"""
        if self.state == "CLOSED":
            return True
        elif self.state == "OPEN":
            if self.last_failure_time and \
               datetime.now() - self.last_failure_time > timedelta(seconds=self.recovery_timeout):
                self.state = "HALF_OPEN"
                return True
            return False
        elif self.state == "HALF_OPEN":
            return True
        return False

class LoadBalancer:
    """Load balancer implementation"""
    
    def __init__(self, strategy: str = "round_robin"):
        self.strategy = strategy
        self.current_index = 0
        self.instances: List[ServiceInstance] = []
        
    def add_instance(self, instance: ServiceInstance):
        """Add service instance to load balancer"""
        self.instances.append(instance)
        logger.info(f"Added service instance {instance.id} to load balancer")
    
    def remove_instance(self, instance_id: str):
        """Remove service instance from load balancer"""
        self.instances = [inst for inst in self.instances if inst.id != instance_id]
        logger.info(f"Removed service instance {instance_id} from load balancer")
    
    def get_next_instance(self) -> Optional[ServiceInstance]:
        """Get next service instance based on load balancing strategy"""
        if not self.instances:
            return None
            
        if self.strategy == "round_robin":
            instance = self.instances[self.current_index]
            self.current_index = (self.current_index + 1) % len(self.instances)
            return instance
        elif self.strategy == "weighted":
            # Weighted round-robin based on load_balancer_weight
            total_weight = sum(inst.load_balancer_weight for inst in self.instances)
            if total_weight == 0:
                return self.instances[0]
            
            # Simple weighted selection
            weights = [inst.load_balancer_weight for inst in self.instances]
            selected = self.instances[weights.index(max(weights))]
            return selected
        else:
            return self.instances[0]

class ServiceDiscovery:
    """Service discovery implementation"""
    
    def __init__(self, consul_host: str = "localhost", consul_port: int = 8500):
        self.consul_client = Consul(host=consul_host, port=consul_port)
        self.services: Dict[str, List[ServiceInstance]] = {}
        
    async def register_service(self, service: ServiceInstance):
        """Register service with Consul"""
        try:
            service_data = {
                "id": service.id,
                "name": service.name,
                "address": service.host,
                "port": service.port,
                "check": {
                    "http": f"http://{service.host}:{service.port}{service.health_endpoint}",
                    "interval": "10s",
                    "timeout": "5s"
                },
                "tags": [service.service_type.value, f"version:{service.version}"],
                "meta": service.metadata
            }
            
            self.consul_client.agent.service.register(**service_data)
            logger.info(f"Registered service {service.name} with Consul")
            
        except Exception as e:
            logger.error(f"Failed to register service {service.name}: {e}")
    
    async def deregister_service(self, service_id: str):
        """Deregister service from Consul"""
        try:
            self.consul_client.agent.service.deregister(service_id)
            logger.info(f"Deregistered service {service_id} from Consul")
        except Exception as e:
            logger.error(f"Failed to deregister service {service_id}: {e}")
    
    async def discover_services(self, service_name: str) -> List[ServiceInstance]:
        """Discover services by name"""
        try:
            services = self.consul_client.catalog.service.nodes(service_name)
            instances = []
            
            for service in services[1]:
                instance = ServiceInstance(
                    id=service["ServiceID"],
                    name=service["ServiceName"],
                    service_type=ServiceType(service["ServiceTags"][0]) if service["ServiceTags"] else ServiceType.API,
                    host=service["Address"],
                    port=service["ServicePort"],
                    health_endpoint="/health",
                    status=ServiceStatus.HEALTHY,
                    last_health_check=datetime.now(),
                    metadata=service.get("ServiceMeta", {}),
                    version=service["ServiceTags"][1].split(":")[1] if len(service["ServiceTags"]) > 1 else "1.0.0"
                )
                instances.append(instance)
            
            return instances
            
        except Exception as e:
            logger.error(f"Failed to discover services for {service_name}: {e}")
            return []

class ServiceMesh:
    """Main service mesh implementation"""
    
    def __init__(self, consul_host: str = "localhost", consul_port: int = 8500):
        self.service_discovery = ServiceDiscovery(consul_host, consul_port)
        self.load_balancers: Dict[str, LoadBalancer] = {}
        self.circuit_breakers: Dict[str, CircuitBreaker] = {}
        self.http_session: Optional[aiohttp.ClientSession] = None
        self.metrics: Dict[str, Any] = {
            "requests": 0,
            "errors": 0,
            "response_times": []
        }
        
    async def start(self):
        """Start the service mesh"""
        self.http_session = aiohttp.ClientSession()
        logger.info("Service mesh started")
        
    async def stop(self):
        """Stop the service mesh"""
        if self.http_session:
            await self.http_session.close()
        logger.info("Service mesh stopped")
    
    async def register_service(self, service: ServiceInstance):
        """Register a service with the mesh"""
        await self.service_discovery.register_service(service)
        
        # Create load balancer for service type if not exists
        if service.service_type.value not in self.load_balancers:
            self.load_balancers[service.service_type.value] = LoadBalancer()
        
        # Add instance to load balancer
        self.load_balancers[service.service_type.value].add_instance(service)
        
        # Create circuit breaker for service if not exists
        if service.name not in self.circuit_breakers:
            self.circuit_breakers[service.name] = CircuitBreaker()
    
    async def deregister_service(self, service_id: str, service_name: str):
        """Deregister a service from the mesh"""
        await self.service_discovery.deregister_service(service_id)
        
        # Remove from load balancer
        for lb in self.load_balancers.values():
            lb.remove_instance(service_id)
        
        # Remove circuit breaker
        if service_name in self.circuit_breakers:
            del self.circuit_breakers[service_name]
    
    async def make_request(
        self,
        service_type: ServiceType,
        method: str,
        path: str,
        headers: Optional[Dict[str, str]] = None,
        body: Optional[Dict[str, Any]] = None,
        timeout: float = 30.0
    ) -> ServiceResponse:
        """Make a request through the service mesh"""
        
        # Get load balancer for service type
        load_balancer = self.load_balancers.get(service_type.value)
        if not load_balancer:
            raise Exception(f"No load balancer found for service type {service_type.value}")
        
        # Get next available instance
        instance = load_balancer.get_next_instance()
        if not instance:
            raise Exception(f"No available instances for service type {service_type.value}")
        
        # Check circuit breaker
        circuit_breaker = self.circuit_breakers.get(instance.name)
        if circuit_breaker and not circuit_breaker.can_execute():
            raise Exception(f"Circuit breaker is open for service {instance.name}")
        
        # Create request
        request_id = str(uuid.uuid4())
        request = ServiceRequest(
            id=request_id,
            service_name=instance.name,
            method=method,
            path=path,
            headers=headers or {},
            body=body,
            timestamp=datetime.now(),
            timeout=timeout
        )
        
        # Make HTTP request
        start_time = time.time()
        try:
            url = f"http://{instance.host}:{instance.port}{path}"
            
            async with self.http_session.request(
                method=method,
                url=url,
                headers=headers,
                json=body,
                timeout=aiohttp.ClientTimeout(total=timeout)
            ) as response:
                
                response_body = await response.json() if response.content_type == "application/json" else await response.text()
                response_time = time.time() - start_time
                
                # Record success
                if circuit_breaker:
                    circuit_breaker.record_success()
                
                # Update metrics
                self.metrics["requests"] += 1
                self.metrics["response_times"].append(response_time)
                
                return ServiceResponse(
                    request_id=request_id,
                    status_code=response.status,
                    headers=dict(response.headers),
                    body=response_body,
                    response_time=response_time,
                    timestamp=datetime.now()
                )
                
        except Exception as e:
            response_time = time.time() - start_time
            
            # Record failure
            if circuit_breaker:
                circuit_breaker.record_failure()
            
            # Update metrics
            self.metrics["requests"] += 1
            self.metrics["errors"] += 1
            
            logger.error(f"Service request failed: {e}")
            raise e
    
    async def health_check_all_services(self):
        """Perform health check on all registered services"""
        for service_type, load_balancer in self.load_balancers.items():
            for instance in load_balancer.instances:
                try:
                    await self.make_request(
                        service_type=instance.service_type,
                        method="GET",
                        path=instance.health_endpoint,
                        timeout=5.0
                    )
                    instance.status = ServiceStatus.HEALTHY
                    instance.last_health_check = datetime.now()
                except Exception as e:
                    instance.status = ServiceStatus.UNHEALTHY
                    logger.warning(f"Health check failed for {instance.name}: {e}")
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get service mesh metrics"""
        avg_response_time = (
            sum(self.metrics["response_times"]) / len(self.metrics["response_times"])
            if self.metrics["response_times"] else 0
        )
        
        return {
            "requests": self.metrics["requests"],
            "errors": self.metrics["errors"],
            "error_rate": self.metrics["errors"] / self.metrics["requests"] if self.metrics["requests"] > 0 else 0,
            "average_response_time": avg_response_time,
            "active_services": sum(len(lb.instances) for lb in self.load_balancers.values()),
            "circuit_breakers": {
                service: cb.state for service, cb in self.circuit_breakers.items()
            }
        }

# Global service mesh instance
service_mesh: Optional[ServiceMesh] = None

async def get_service_mesh() -> ServiceMesh:
    """Get global service mesh instance"""
    global service_mesh
    if service_mesh is None:
        service_mesh = ServiceMesh()
        await service_mesh.start()
    return service_mesh

async def shutdown_service_mesh():
    """Shutdown global service mesh"""
    global service_mesh
    if service_mesh:
        await service_mesh.stop()
        service_mesh = None
