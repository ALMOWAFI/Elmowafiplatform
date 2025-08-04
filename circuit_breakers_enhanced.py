#!/usr/bin/env python3
"""
Enhanced Circuit Breakers for Elmowafiplatform
Integrates with photo upload, game state, and database operations
"""

import time
import logging
import asyncio
from typing import Dict, Any, Optional, Callable, List
from enum import Enum
from dataclasses import dataclass
from datetime import datetime, timedelta
import threading

logger = logging.getLogger(__name__)

class CircuitState(Enum):
    """Circuit breaker states"""
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Failing, reject requests
    HALF_OPEN = "half_open"  # Testing if service recovered

@dataclass
class CircuitMetrics:
    """Circuit breaker metrics"""
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    last_failure_time: Optional[datetime] = None
    last_success_time: Optional[datetime] = None
    consecutive_failures: int = 0
    consecutive_successes: int = 0
    avg_response_time: float = 0.0
    last_state_change: Optional[datetime] = None

class EnhancedCircuitBreaker:
    """Enhanced circuit breaker with detailed metrics and monitoring"""
    
    def __init__(
        self,
        name: str,
        failure_threshold: int = 5,
        recovery_timeout: int = 60,
        expected_exception: type = Exception,
        fallback_func: Optional[Callable] = None
    ):
        self.name = name
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.expected_exception = expected_exception
        self.fallback_func = fallback_func
        
        # State management
        self.state = CircuitState.CLOSED
        self.metrics = CircuitMetrics()
        self.lock = threading.Lock()
        
        # Monitoring
        self.state_change_callbacks: List[Callable] = []
        self.metrics_callbacks: List[Callable] = []
        
        logger.info(f"Enhanced circuit breaker '{name}' initialized")
    
    def add_state_change_callback(self, callback: Callable):
        """Add callback for state changes"""
        self.state_change_callbacks.append(callback)
    
    def add_metrics_callback(self, callback: Callable):
        """Add callback for metrics updates"""
        self.metrics_callbacks.append(callback)
    
    def _notify_state_change(self, old_state: CircuitState, new_state: CircuitState):
        """Notify state change callbacks"""
        for callback in self.state_change_callbacks:
            try:
                callback(self.name, old_state, new_state)
            except Exception as e:
                logger.error(f"State change callback error: {e}")
    
    def _notify_metrics_update(self):
        """Notify metrics update callbacks"""
        for callback in self.metrics_callbacks:
            try:
                callback(self.name, self.metrics)
            except Exception as e:
                logger.error(f"Metrics callback error: {e}")
    
    def _update_metrics(self, success: bool, response_time: float):
        """Update circuit breaker metrics"""
        with self.lock:
            self.metrics.total_requests += 1
            self.metrics.avg_response_time = (
                (self.metrics.avg_response_time + response_time) / 2
            )
            
            if success:
                self.metrics.successful_requests += 1
                self.metrics.consecutive_successes += 1
                self.metrics.consecutive_failures = 0
                self.metrics.last_success_time = datetime.now()
            else:
                self.metrics.failed_requests += 1
                self.metrics.consecutive_failures += 1
                self.metrics.consecutive_successes = 0
                self.metrics.last_failure_time = datetime.now()
            
            self._notify_metrics_update()
    
    def _should_attempt_reset(self) -> bool:
        """Check if circuit should attempt reset"""
        if self.state != CircuitState.OPEN:
            return False
        
        if not self.metrics.last_failure_time:
            return False
        
        time_since_failure = datetime.now() - self.metrics.last_failure_time
        return time_since_failure.total_seconds() >= self.recovery_timeout
    
    def _transition_to_half_open(self):
        """Transition to half-open state"""
        with self.lock:
            if self.state == CircuitState.OPEN and self._should_attempt_reset():
                old_state = self.state
                self.state = CircuitState.HALF_OPEN
                self.metrics.last_state_change = datetime.now()
                logger.info(f"Circuit '{self.name}' transitioning to HALF_OPEN")
                self._notify_state_change(old_state, self.state)
    
    def _transition_to_open(self):
        """Transition to open state"""
        with self.lock:
            if (self.state == CircuitState.CLOSED or self.state == CircuitState.HALF_OPEN) and \
               self.metrics.consecutive_failures >= self.failure_threshold:
                old_state = self.state
                self.state = CircuitState.OPEN
                self.metrics.last_state_change = datetime.now()
                logger.warning(f"Circuit '{self.name}' opened after {self.metrics.consecutive_failures} failures")
                self._notify_state_change(old_state, self.state)
    
    def _transition_to_closed(self):
        """Transition to closed state"""
        with self.lock:
            if self.state == CircuitState.HALF_OPEN and \
               self.metrics.consecutive_successes >= self.failure_threshold:
                old_state = self.state
                self.state = CircuitState.CLOSED
                self.metrics.last_state_change = datetime.now()
                logger.info(f"Circuit '{self.name}' closed after {self.metrics.consecutive_successes} successes")
                self._notify_state_change(old_state, self.state)
    
    def call(self, func: Callable, *args, **kwargs) -> Any:
        """Execute function with circuit breaker protection"""
        start_time = time.time()
        
        # Check if circuit is open
        if self.state == CircuitState.OPEN:
            if not self._should_attempt_reset():
                logger.warning(f"Circuit '{self.name}' is OPEN, rejecting request")
                if self.fallback_func:
                    return self.fallback_func(*args, **kwargs)
                raise Exception(f"Circuit '{self.name}' is OPEN")
            else:
                self._transition_to_half_open()
        
        # Execute function
        try:
            result = func(*args, **kwargs)
            response_time = time.time() - start_time
            
            # Update metrics
            self._update_metrics(True, response_time)
            
            # Check for state transitions
            self._transition_to_closed()
            
            return result
            
        except self.expected_exception as e:
            response_time = time.time() - start_time
            
            # Update metrics
            self._update_metrics(False, response_time)
            
            # Check for state transitions
            self._transition_to_open()
            
            # Try fallback
            if self.fallback_func:
                logger.info(f"Circuit '{self.name}' using fallback after failure")
                return self.fallback_func(*args, **kwargs)
            
            raise
    
    async def call_async(self, func: Callable, *args, **kwargs) -> Any:
        """Execute async function with circuit breaker protection"""
        start_time = time.time()
        
        # Check if circuit is open
        if self.state == CircuitState.OPEN:
            if not self._should_attempt_reset():
                logger.warning(f"Circuit '{self.name}' is OPEN, rejecting request")
                if self.fallback_func:
                    return self.fallback_func(*args, **kwargs)
                raise Exception(f"Circuit '{self.name}' is OPEN")
            else:
                self._transition_to_half_open()
        
        # Execute function
        try:
            result = await func(*args, **kwargs)
            response_time = time.time() - start_time
            
            # Update metrics
            self._update_metrics(True, response_time)
            
            # Check for state transitions
            self._transition_to_closed()
            
            return result
            
        except self.expected_exception as e:
            response_time = time.time() - start_time
            
            # Update metrics
            self._update_metrics(False, response_time)
            
            # Check for state transitions
            self._transition_to_open()
            
            # Try fallback
            if self.fallback_func:
                logger.info(f"Circuit '{self.name}' using fallback after failure")
                return self.fallback_func(*args, **kwargs)
            
            raise
    
    def get_state(self) -> Dict[str, Any]:
        """Get current circuit state and metrics"""
        return {
            "name": self.name,
            "state": self.state.value,
            "failure_threshold": self.failure_threshold,
            "recovery_timeout": self.recovery_timeout,
            "metrics": {
                "total_requests": self.metrics.total_requests,
                "successful_requests": self.metrics.successful_requests,
                "failed_requests": self.metrics.failed_requests,
                "success_rate": (
                    self.metrics.successful_requests / self.metrics.total_requests * 100
                    if self.metrics.total_requests > 0 else 0
                ),
                "consecutive_failures": self.metrics.consecutive_failures,
                "consecutive_successes": self.metrics.consecutive_successes,
                "avg_response_time": self.metrics.avg_response_time,
                "last_failure_time": self.metrics.last_failure_time.isoformat() if self.metrics.last_failure_time else None,
                "last_success_time": self.metrics.last_success_time.isoformat() if self.metrics.last_success_time else None,
                "last_state_change": self.metrics.last_state_change.isoformat() if self.metrics.last_state_change else None
            }
        }

class EnhancedCircuitBreakerManager:
    """Manager for multiple circuit breakers"""
    
    def __init__(self):
        self.circuit_breakers: Dict[str, EnhancedCircuitBreaker] = {}
        self.monitoring_thread = None
        self.shutdown_event = threading.Event()
        
        # Start monitoring
        self._start_monitoring()
    
    def _start_monitoring(self):
        """Start background monitoring"""
        def monitor():
            while not self.shutdown_event.is_set():
                try:
                    self._check_circuit_breakers()
                    time.sleep(10)  # Check every 10 seconds
                except Exception as e:
                    logger.error(f"Circuit breaker monitoring error: {e}")
                    time.sleep(5)
        
        self.monitoring_thread = threading.Thread(target=monitor, daemon=True)
        self.monitoring_thread.start()
        logger.info("Circuit breaker monitoring started")
    
    def _check_circuit_breakers(self):
        """Check all circuit breakers for state transitions"""
        for breaker in self.circuit_breakers.values():
            try:
                # Check for transitions
                breaker._transition_to_half_open()
                breaker._transition_to_open()
                breaker._transition_to_closed()
            except Exception as e:
                logger.error(f"Error checking circuit breaker {breaker.name}: {e}")
    
    def create_circuit_breaker(
        self,
        name: str,
        failure_threshold: int = 5,
        recovery_timeout: int = 60,
        expected_exception: type = Exception,
        fallback_func: Optional[Callable] = None
    ) -> EnhancedCircuitBreaker:
        """Create a new circuit breaker"""
        if name in self.circuit_breakers:
            logger.warning(f"Circuit breaker '{name}' already exists")
            return self.circuit_breakers[name]
        
        breaker = EnhancedCircuitBreaker(
            name=name,
            failure_threshold=failure_threshold,
            recovery_timeout=recovery_timeout,
            expected_exception=expected_exception,
            fallback_func=fallback_func
        )
        
        self.circuit_breakers[name] = breaker
        logger.info(f"Created circuit breaker '{name}'")
        
        return breaker
    
    def get_circuit_breaker(self, name: str) -> Optional[EnhancedCircuitBreaker]:
        """Get circuit breaker by name"""
        return self.circuit_breakers.get(name)
    
    def get_all_states(self) -> Dict[str, Dict[str, Any]]:
        """Get states of all circuit breakers"""
        return {
            name: breaker.get_state()
            for name, breaker in self.circuit_breakers.items()
        }
    
    def reset_circuit_breaker(self, name: str):
        """Reset a circuit breaker to closed state"""
        breaker = self.circuit_breakers.get(name)
        if breaker:
            with breaker.lock:
                old_state = breaker.state
                breaker.state = CircuitState.CLOSED
                breaker.metrics.consecutive_failures = 0
                breaker.metrics.consecutive_successes = 0
                breaker.metrics.last_state_change = datetime.now()
                breaker._notify_state_change(old_state, breaker.state)
            logger.info(f"Reset circuit breaker '{name}'")
    
    def shutdown(self):
        """Shutdown the circuit breaker manager"""
        self.shutdown_event.set()
        if self.monitoring_thread:
            self.monitoring_thread.join(timeout=5)
        logger.info("Circuit breaker manager shutdown")

# Global circuit breaker manager
circuit_breaker_manager = EnhancedCircuitBreakerManager()

# Specialized circuit breakers for different services
def create_database_circuit_breaker():
    """Create circuit breaker for database operations"""
    def database_fallback(*args, **kwargs):
        logger.warning("Database circuit breaker using fallback")
        return {"error": "Database temporarily unavailable", "fallback": True}
    
    return circuit_breaker_manager.create_circuit_breaker(
        name="database",
        failure_threshold=3,
        recovery_timeout=30,
        expected_exception=Exception,
        fallback_func=database_fallback
    )

def create_photo_upload_circuit_breaker():
    """Create circuit breaker for photo upload operations"""
    def photo_upload_fallback(*args, **kwargs):
        logger.warning("Photo upload circuit breaker using fallback")
        return {"error": "Photo upload temporarily unavailable", "fallback": True}
    
    return circuit_breaker_manager.create_circuit_breaker(
        name="photo_upload",
        failure_threshold=5,
        recovery_timeout=60,
        expected_exception=Exception,
        fallback_func=photo_upload_fallback
    )

def create_game_state_circuit_breaker():
    """Create circuit breaker for game state operations"""
    def game_state_fallback(*args, **kwargs):
        logger.warning("Game state circuit breaker using fallback")
        return {"error": "Game state temporarily unavailable", "fallback": True}
    
    return circuit_breaker_manager.create_circuit_breaker(
        name="game_state",
        failure_threshold=3,
        recovery_timeout=30,
        expected_exception=Exception,
        fallback_func=game_state_fallback
    )

def create_ai_service_circuit_breaker():
    """Create circuit breaker for AI service operations"""
    def ai_service_fallback(*args, **kwargs):
        logger.warning("AI service circuit breaker using fallback")
        return {"error": "AI service temporarily unavailable", "fallback": True}
    
    return circuit_breaker_manager.create_circuit_breaker(
        name="ai_service",
        failure_threshold=2,
        recovery_timeout=120,
        expected_exception=Exception,
        fallback_func=ai_service_fallback
    )

def create_external_api_circuit_breaker():
    """Create circuit breaker for external API calls"""
    def external_api_fallback(*args, **kwargs):
        logger.warning("External API circuit breaker using fallback")
        return {"error": "External API temporarily unavailable", "fallback": True}
    
    return circuit_breaker_manager.create_circuit_breaker(
        name="external_api",
        failure_threshold=3,
        recovery_timeout=60,
        expected_exception=Exception,
        fallback_func=external_api_fallback
    )

# Initialize specialized circuit breakers
database_circuit_breaker = create_database_circuit_breaker()
photo_upload_circuit_breaker = create_photo_upload_circuit_breaker()
game_state_circuit_breaker = create_game_state_circuit_breaker()
ai_service_circuit_breaker = create_ai_service_circuit_breaker()
external_api_circuit_breaker = create_external_api_circuit_breaker()

# Circuit breaker decorator
def circuit_breaker(name: str):
    """Decorator to apply circuit breaker to functions"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            breaker = circuit_breaker_manager.get_circuit_breaker(name)
            if not breaker:
                breaker = circuit_breaker_manager.create_circuit_breaker(name)
            return breaker.call(func, *args, **kwargs)
        return wrapper
    return decorator

# Async circuit breaker decorator
def async_circuit_breaker(name: str):
    """Decorator to apply circuit breaker to async functions"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            breaker = circuit_breaker_manager.get_circuit_breaker(name)
            if not breaker:
                breaker = circuit_breaker_manager.create_circuit_breaker(name)
            return await breaker.call_async(func, *args, **kwargs)
        return wrapper
    return decorator

# Health check endpoint data
def get_circuit_breaker_health() -> Dict[str, Any]:
    """Get health status of all circuit breakers"""
    return {
        "timestamp": datetime.now().isoformat(),
        "total_circuit_breakers": len(circuit_breaker_manager.circuit_breakers),
        "circuit_breakers": circuit_breaker_manager.get_all_states(),
        "overall_status": "healthy" if all(
            state["state"] == "closed" 
            for state in circuit_breaker_manager.get_all_states().values()
        ) else "degraded"
    }

# Monitoring callbacks
def log_state_change(name: str, old_state: CircuitState, new_state: CircuitState):
    """Log circuit breaker state changes"""
    logger.info(f"Circuit breaker '{name}' changed from {old_state.value} to {new_state.value}")

def log_metrics_update(name: str, metrics: CircuitMetrics):
    """Log circuit breaker metrics updates"""
    if metrics.total_requests % 10 == 0:  # Log every 10 requests
        success_rate = (metrics.successful_requests / metrics.total_requests * 100) if metrics.total_requests > 0 else 0
        logger.info(f"Circuit breaker '{name}' metrics: {success_rate:.1f}% success rate, {metrics.avg_response_time:.3f}s avg")

# Register callbacks
for breaker in circuit_breaker_manager.circuit_breakers.values():
    breaker.add_state_change_callback(log_state_change)
    breaker.add_metrics_callback(log_metrics_update)

# Export components
__all__ = [
    'EnhancedCircuitBreaker',
    'EnhancedCircuitBreakerManager',
    'circuit_breaker_manager',
    'database_circuit_breaker',
    'photo_upload_circuit_breaker',
    'game_state_circuit_breaker',
    'ai_service_circuit_breaker',
    'external_api_circuit_breaker',
    'circuit_breaker',
    'async_circuit_breaker',
    'get_circuit_breaker_health',
    'CircuitState'
] 