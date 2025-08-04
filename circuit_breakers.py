#!/usr/bin/env python3
"""
Circuit Breakers for Elmowafiplatform
Implements circuit breakers for external services and database operations
"""

import time
import asyncio
from enum import Enum
from typing import Callable, Any, Optional
import logging

logger = logging.getLogger(__name__)

class CircuitState(Enum):
    """Circuit breaker states"""
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Failing, reject requests
    HALF_OPEN = "half_open"  # Testing if service recovered

class CircuitBreaker:
    """Circuit breaker implementation"""
    
    def __init__(
        self,
        name: str,
        failure_threshold: int = 5,
        recovery_timeout: int = 30,
        expected_exception: type = Exception
    ):
        self.name = name
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.expected_exception = expected_exception
        
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.last_failure_time = 0
        self.success_count = 0
        
        logger.info(f"Circuit breaker '{name}' initialized")
    
    def can_execute(self) -> bool:
        """Check if operation can be executed"""
        if self.state == CircuitState.OPEN:
            if time.time() - self.last_failure_time >= self.recovery_timeout:
                logger.info(f"Circuit breaker '{self.name}' transitioning to HALF_OPEN")
                self.state = CircuitState.HALF_OPEN
                return True
            return False
        return True
    
    def on_success(self):
        """Handle successful operation"""
        if self.state == CircuitState.HALF_OPEN:
            logger.info(f"Circuit breaker '{self.name}' transitioning to CLOSED")
            self.state = CircuitState.CLOSED
            self.failure_count = 0
            self.success_count = 0
        elif self.state == CircuitState.CLOSED:
            self.success_count += 1
    
    def on_failure(self):
        """Handle failed operation"""
        self.failure_count += 1
        self.last_failure_time = time.time()
        
        if self.state == CircuitState.CLOSED and self.failure_count >= self.failure_threshold:
            logger.warning(f"Circuit breaker '{self.name}' transitioning to OPEN")
            self.state = CircuitState.OPEN
        elif self.state == CircuitState.HALF_OPEN:
            logger.warning(f"Circuit breaker '{self.name}' staying OPEN due to failure")
            self.state = CircuitState.OPEN
    
    def get_state(self) -> dict:
        """Get current circuit breaker state"""
        return {
            "name": self.name,
            "state": self.state.value,
            "failure_count": self.failure_count,
            "success_count": self.success_count,
            "last_failure_time": self.last_failure_time,
            "can_execute": self.can_execute()
        }

class CircuitBreakerManager:
    """Manager for multiple circuit breakers"""
    
    def __init__(self):
        self.circuit_breakers = {}
    
    def get_circuit_breaker(self, name: str) -> CircuitBreaker:
        """Get or create circuit breaker"""
        if name not in self.circuit_breakers:
            self.circuit_breakers[name] = CircuitBreaker(name)
        return self.circuit_breakers[name]
    
    def get_all_states(self) -> dict:
        """Get states of all circuit breakers"""
        return {
            name: cb.get_state() 
            for name, cb in self.circuit_breakers.items()
        }

# Global circuit breaker manager
circuit_breaker_manager = CircuitBreakerManager()

def circuit_breaker(name: str, failure_threshold: int = 5, recovery_timeout: int = 30):
    """Decorator for circuit breaker pattern"""
    def decorator(func: Callable) -> Callable:
        async def async_wrapper(*args, **kwargs):
            cb = circuit_breaker_manager.get_circuit_breaker(name)
            
            if not cb.can_execute():
                raise CircuitBreakerOpenException(f"Circuit breaker '{name}' is OPEN")
            
            try:
                result = await func(*args, **kwargs)
                cb.on_success()
                return result
            except Exception as e:
                cb.on_failure()
                raise
        
        def sync_wrapper(*args, **kwargs):
            cb = circuit_breaker_manager.get_circuit_breaker(name)
            
            if not cb.can_execute():
                raise CircuitBreakerOpenException(f"Circuit breaker '{name}' is OPEN")
            
            try:
                result = func(*args, **kwargs)
                cb.on_success()
                return result
            except Exception as e:
                cb.on_failure()
                raise
        
        # Return async wrapper if function is async, sync otherwise
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator

class CircuitBreakerOpenException(Exception):
    """Exception raised when circuit breaker is open"""
    pass

# Database circuit breaker
class DatabaseCircuitBreaker:
    """Circuit breaker for database operations"""
    
    def __init__(self):
        self.cb = circuit_breaker_manager.get_circuit_breaker("database")
    
    async def execute_query(self, query_func: Callable, *args, **kwargs):
        """Execute database query with circuit breaker"""
        if not self.cb.can_execute():
            raise CircuitBreakerOpenException("Database circuit breaker is OPEN")
        
        try:
            result = await query_func(*args, **kwargs)
            self.cb.on_success()
            return result
        except Exception as e:
            self.cb.on_failure()
            logger.error(f"Database query failed: {e}")
            raise
    
    def get_state(self) -> dict:
        """Get database circuit breaker state"""
        return self.cb.get_state()

# AI service circuit breaker
class AIServiceCircuitBreaker:
    """Circuit breaker for AI services"""
    
    def __init__(self, service_name: str):
        self.service_name = service_name
        self.cb = circuit_breaker_manager.get_circuit_breaker(f"ai_service_{service_name}")
    
    async def execute_ai_call(self, ai_func: Callable, *args, **kwargs):
        """Execute AI service call with circuit breaker"""
        if not self.cb.can_execute():
            raise CircuitBreakerOpenException(f"AI service '{self.service_name}' circuit breaker is OPEN")
        
        try:
            result = await ai_func(*args, **kwargs)
            self.cb.on_success()
            return result
        except Exception as e:
            self.cb.on_failure()
            logger.error(f"AI service '{self.service_name}' call failed: {e}")
            raise
    
    def get_state(self) -> dict:
        """Get AI service circuit breaker state"""
        return self.cb.get_state()

# External API circuit breaker
class ExternalAPICircuitBreaker:
    """Circuit breaker for external API calls"""
    
    def __init__(self, api_name: str):
        self.api_name = api_name
        self.cb = circuit_breaker_manager.get_circuit_breaker(f"external_api_{api_name}")
    
    async def execute_api_call(self, api_func: Callable, *args, **kwargs):
        """Execute external API call with circuit breaker"""
        if not self.cb.can_execute():
            raise CircuitBreakerOpenException(f"External API '{self.api_name}' circuit breaker is OPEN")
        
        try:
            result = await api_func(*args, **kwargs)
            self.cb.on_success()
            return result
        except Exception as e:
            self.cb.on_failure()
            logger.error(f"External API '{self.api_name}' call failed: {e}")
            raise
    
    def get_state(self) -> dict:
        """Get external API circuit breaker state"""
        return self.cb.get_state()

# File upload circuit breaker
class FileUploadCircuitBreaker:
    """Circuit breaker for file upload operations"""
    
    def __init__(self):
        self.cb = circuit_breaker_manager.get_circuit_breaker("file_upload")
    
    async def execute_upload(self, upload_func: Callable, *args, **kwargs):
        """Execute file upload with circuit breaker"""
        if not self.cb.can_execute():
            raise CircuitBreakerOpenException("File upload circuit breaker is OPEN")
        
        try:
            result = await upload_func(*args, **kwargs)
            self.cb.on_success()
            return result
        except Exception as e:
            self.cb.on_failure()
            logger.error(f"File upload failed: {e}")
            raise
    
    def get_state(self) -> dict:
        """Get file upload circuit breaker state"""
        return self.cb.get_state()

# Health check for circuit breakers
async def circuit_breaker_health_check() -> dict:
    """Health check for all circuit breakers"""
    states = circuit_breaker_manager.get_all_states()
    
    # Check if any circuit breakers are open
    open_circuits = [
        name for name, state in states.items() 
        if state["state"] == CircuitState.OPEN.value
    ]
    
    return {
        "status": "healthy" if not open_circuits else "degraded",
        "open_circuits": open_circuits,
        "circuit_breakers": states
    }

# Circuit breaker monitoring
class CircuitBreakerMonitor:
    """Monitor circuit breaker states"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def log_state_change(self, circuit_name: str, old_state: CircuitState, new_state: CircuitState):
        """Log circuit breaker state changes"""
        self.logger.warning(
            f"Circuit breaker '{circuit_name}' state changed: {old_state.value} -> {new_state.value}"
        )
    
    def get_metrics(self) -> dict:
        """Get circuit breaker metrics"""
        states = circuit_breaker_manager.get_all_states()
        
        total_circuits = len(states)
        closed_circuits = len([s for s in states.values() if s["state"] == CircuitState.CLOSED.value])
        open_circuits = len([s for s in states.values() if s["state"] == CircuitState.OPEN.value])
        half_open_circuits = len([s for s in states.values() if s["state"] == CircuitState.HALF_OPEN.value])
        
        return {
            "total_circuits": total_circuits,
            "closed_circuits": closed_circuits,
            "open_circuits": open_circuits,
            "half_open_circuits": half_open_circuits,
            "health_percentage": (closed_circuits / total_circuits * 100) if total_circuits > 0 else 0
        }

# Export circuit breaker components
__all__ = [
    'CircuitBreaker',
    'CircuitBreakerManager',
    'circuit_breaker_manager',
    'circuit_breaker',
    'CircuitBreakerOpenException',
    'DatabaseCircuitBreaker',
    'AIServiceCircuitBreaker',
    'ExternalAPICircuitBreaker',
    'FileUploadCircuitBreaker',
    'circuit_breaker_health_check',
    'CircuitBreakerMonitor',
] 