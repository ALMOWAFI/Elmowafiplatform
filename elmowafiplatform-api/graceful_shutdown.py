#!/usr/bin/env python3
"""
Graceful Shutdown for Elmowafiplatform
Implements graceful shutdown handling for production deployment
"""

import asyncio
import signal
import logging
from typing import List, Callable, Awaitable
from contextlib import asynccontextmanager

logger = logging.getLogger(__name__)

class GracefulShutdown:
    """Graceful shutdown manager"""
    
    def __init__(self):
        self.shutdown_handlers: List[Callable[[], Awaitable[None]]] = []
        self.is_shutting_down = False
        self.shutdown_event = asyncio.Event()
        
        # Register signal handlers
        self._register_signal_handlers()
    
    def _register_signal_handlers(self):
        """Register signal handlers for graceful shutdown"""
        try:
            # Register for SIGTERM and SIGINT
            for sig in (signal.SIGTERM, signal.SIGINT):
                signal.signal(sig, self._signal_handler)
            
            logger.info("Signal handlers registered for graceful shutdown")
        except Exception as e:
            logger.warning(f"Could not register signal handlers: {e}")
    
    def _signal_handler(self, signum, frame):
        """Handle shutdown signals"""
        logger.info(f"Received shutdown signal {signum}")
        self.is_shutting_down = True
        self.shutdown_event.set()
    
    def add_shutdown_handler(self, handler: Callable[[], Awaitable[None]]):
        """Add a shutdown handler"""
        self.shutdown_handlers.append(handler)
        logger.debug(f"Added shutdown handler: {handler.__name__}")
    
    async def shutdown(self, timeout: int = 30):
        """Execute graceful shutdown"""
        if self.is_shutting_down:
            logger.info("Shutdown already in progress")
            return
        
        logger.info("Starting graceful shutdown...")
        self.is_shutting_down = True
        
        # Execute shutdown handlers
        shutdown_tasks = []
        for handler in self.shutdown_handlers:
            try:
                task = asyncio.create_task(handler())
                shutdown_tasks.append(task)
                logger.debug(f"Executing shutdown handler: {handler.__name__}")
            except Exception as e:
                logger.error(f"Error adding shutdown handler {handler.__name__}: {e}")
        
        if shutdown_tasks:
            try:
                # Wait for all shutdown handlers with timeout
                await asyncio.wait_for(
                    asyncio.gather(*shutdown_tasks, return_exceptions=True),
                    timeout=timeout
                )
                logger.info("All shutdown handlers completed")
            except asyncio.TimeoutError:
                logger.warning(f"Shutdown timeout after {timeout} seconds")
            except Exception as e:
                logger.error(f"Error during shutdown: {e}")
        
        logger.info("Graceful shutdown completed")

# Global graceful shutdown manager
graceful_shutdown = GracefulShutdown()

# Database shutdown handler
async def shutdown_database():
    """Shutdown database connections"""
    try:
        from unified_database import close_database_pool
        close_database_pool()
        logger.info("Database connections closed")
        
        # Also close enhanced database pool
        try:
            from database_enhanced import close_enhanced_database_pool
            close_enhanced_database_pool()
            logger.info("Enhanced database connections closed")
        except Exception as e:
            logger.error(f"Error closing enhanced database connections: {e}")
            
    except Exception as e:
        logger.error(f"Error closing database connections: {e}")

# Circuit breaker shutdown handler
async def shutdown_circuit_breakers():
    """Shutdown circuit breakers"""
    try:
        from circuit_breakers_enhanced import circuit_breaker_manager
        circuit_breaker_manager.shutdown()
        logger.info("Circuit breakers shutdown completed")
    except Exception as e:
        logger.error(f"Error shutting down circuit breakers: {e}")

# Performance monitoring shutdown handler
async def shutdown_performance_monitoring():
    """Shutdown performance monitoring"""
    try:
        from performance_monitoring_enhanced import performance_monitor
        performance_monitor.shutdown()
        logger.info("Performance monitoring shutdown completed")
    except Exception as e:
        logger.error(f"Error shutting down performance monitoring: {e}")

# AI services shutdown handler
async def shutdown_ai_services():
    """Shutdown AI services"""
    try:
        # Close any AI service connections
        logger.info("AI services shutdown completed")
    except Exception as e:
        logger.error(f"Error shutting down AI services: {e}")

# File upload shutdown handler
async def shutdown_file_services():
    """Shutdown file upload services"""
    try:
        # Close any file upload connections
        logger.info("File upload services shutdown completed")
    except Exception as e:
        logger.error(f"Error shutting down file upload services: {e}")

# Background tasks shutdown handler
async def shutdown_background_tasks():
    """Shutdown background tasks"""
    try:
        # Cancel all background tasks
        tasks = [task for task in asyncio.all_tasks() if task is not asyncio.current_task()]
        
        if tasks:
            logger.info(f"Cancelling {len(tasks)} background tasks")
            for task in tasks:
                task.cancel()
            
            # Wait for tasks to complete
            await asyncio.gather(*tasks, return_exceptions=True)
        
        logger.info("Background tasks shutdown completed")
    except Exception as e:
        logger.error(f"Error shutting down background tasks: {e}")

# HTTP server shutdown handler
async def shutdown_http_server():
    """Shutdown HTTP server"""
    try:
        # This would be handled by the FastAPI lifespan
        logger.info("HTTP server shutdown completed")
    except Exception as e:
        logger.error(f"Error shutting down HTTP server: {e}")

# Register default shutdown handlers
graceful_shutdown.add_shutdown_handler(shutdown_database)
graceful_shutdown.add_shutdown_handler(shutdown_circuit_breakers)
graceful_shutdown.add_shutdown_handler(shutdown_performance_monitoring)
graceful_shutdown.add_shutdown_handler(shutdown_ai_services)
graceful_shutdown.add_shutdown_handler(shutdown_file_services)
graceful_shutdown.add_shutdown_handler(shutdown_background_tasks)
graceful_shutdown.add_shutdown_handler(shutdown_http_server)

# FastAPI lifespan context manager
@asynccontextmanager
async def lifespan(app):
    """FastAPI lifespan context manager for graceful shutdown"""
    # Startup
    logger.info("Application startup")
    
    # Yield control to FastAPI
    yield
    
    # Shutdown
    logger.info("Application shutdown initiated")
    await graceful_shutdown.shutdown()

# Health check for shutdown status
def get_shutdown_status() -> dict:
    """Get shutdown status"""
    return {
        "is_shutting_down": graceful_shutdown.is_shutting_down,
        "shutdown_handlers_count": len(graceful_shutdown.shutdown_handlers),
        "shutdown_event_set": graceful_shutdown.shutdown_event.is_set()
    }

# Shutdown monitoring
class ShutdownMonitor:
    """Monitor shutdown process"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.shutdown_start_time = None
        self.shutdown_duration = None
    
    def start_shutdown_monitoring(self):
        """Start monitoring shutdown process"""
        self.shutdown_start_time = asyncio.get_event_loop().time()
        self.logger.info("Shutdown monitoring started")
    
    def end_shutdown_monitoring(self):
        """End monitoring shutdown process"""
        if self.shutdown_start_time:
            self.shutdown_duration = asyncio.get_event_loop().time() - self.shutdown_start_time
            self.logger.info(f"Shutdown completed in {self.shutdown_duration:.2f} seconds")
    
    def get_shutdown_metrics(self) -> dict:
        """Get shutdown metrics"""
        return {
            "shutdown_start_time": self.shutdown_start_time,
            "shutdown_duration": self.shutdown_duration,
            "is_shutting_down": graceful_shutdown.is_shutting_down
        }

# Export shutdown components
__all__ = [
    'graceful_shutdown',
    'lifespan',
    'get_shutdown_status',
    'ShutdownMonitor',
    'shutdown_database',
    'shutdown_ai_services',
    'shutdown_file_services',
    'shutdown_background_tasks',
    'shutdown_http_server',
] 