#!/usr/bin/env python3
"""
Enhanced Performance Monitoring for Elmowafiplatform
Tracks performance metrics for all systems
"""

import time
import threading
import psutil
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from collections import defaultdict
import json

logger = logging.getLogger(__name__)

@dataclass
class PerformanceMetric:
    """Performance metric data structure"""
    name: str
    value: float
    timestamp: datetime
    tags: Dict[str, str] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class SystemMetrics:
    """System performance metrics"""
    cpu_usage: float = 0.0
    memory_usage: float = 0.0
    disk_usage: float = 0.0
    network_io: Dict[str, float] = field(default_factory=dict)
    active_connections: int = 0
    response_time_avg: float = 0.0
    error_rate: float = 0.0
    throughput: float = 0.0

class EnhancedPerformanceMonitor:
    """Enhanced performance monitoring system"""
    
    def __init__(self):
        self.metrics: List[PerformanceMetric] = []
        self.system_metrics = SystemMetrics()
        self.monitoring_thread = None
        self.shutdown_event = threading.Event()
        self.lock = threading.Lock()
        
        # Performance thresholds
        self.thresholds = {
            "cpu_usage": 80.0,  # 80% CPU usage
            "memory_usage": 85.0,  # 85% memory usage
            "response_time": 2.0,  # 2 seconds
            "error_rate": 5.0,  # 5% error rate
        }
        
        # Start monitoring
        self._start_monitoring()
    
    def _start_monitoring(self):
        """Start background performance monitoring"""
        def monitor():
            while not self.shutdown_event.is_set():
                try:
                    self._collect_system_metrics()
                    self._check_thresholds()
                    time.sleep(30)  # Collect metrics every 30 seconds
                except Exception as e:
                    logger.error(f"Performance monitoring error: {e}")
                    time.sleep(10)
        
        self.monitoring_thread = threading.Thread(target=monitor, daemon=True)
        self.monitoring_thread.start()
        logger.info("Enhanced performance monitoring started")
    
    def _collect_system_metrics(self):
        """Collect system performance metrics"""
        try:
            # CPU usage
            cpu_percent = psutil.cpu_percent(interval=1)
            
            # Memory usage
            memory = psutil.virtual_memory()
            memory_percent = memory.percent
            
            # Disk usage
            disk = psutil.disk_usage('/')
            disk_percent = (disk.used / disk.total) * 100
            
            # Network I/O
            network = psutil.net_io_counters()
            network_io = {
                "bytes_sent": network.bytes_sent,
                "bytes_recv": network.bytes_recv,
                "packets_sent": network.packets_sent,
                "packets_recv": network.packets_recv
            }
            
            # Update system metrics
            with self.lock:
                self.system_metrics.cpu_usage = cpu_percent
                self.system_metrics.memory_usage = memory_percent
                self.system_metrics.disk_usage = disk_percent
                self.system_metrics.network_io = network_io
            
            # Add performance metric
            self.add_metric("system.cpu_usage", cpu_percent, {"system": "overall"})
            self.add_metric("system.memory_usage", memory_percent, {"system": "overall"})
            self.add_metric("system.disk_usage", disk_percent, {"system": "overall"})
            
        except Exception as e:
            logger.error(f"Error collecting system metrics: {e}")
    
    def _check_thresholds(self):
        """Check performance thresholds and alert if exceeded"""
        with self.lock:
            if self.system_metrics.cpu_usage > self.thresholds["cpu_usage"]:
                logger.warning(f"High CPU usage: {self.system_metrics.cpu_usage}%")
            
            if self.system_metrics.memory_usage > self.thresholds["memory_usage"]:
                logger.warning(f"High memory usage: {self.system_metrics.memory_usage}%")
            
            if self.system_metrics.response_time_avg > self.thresholds["response_time"]:
                logger.warning(f"High response time: {self.system_metrics.response_time_avg}s")
            
            if self.system_metrics.error_rate > self.thresholds["error_rate"]:
                logger.warning(f"High error rate: {self.system_metrics.error_rate}%")
    
    def add_metric(self, name: str, value: float, tags: Dict[str, str] = None, metadata: Dict[str, Any] = None):
        """Add a performance metric"""
        metric = PerformanceMetric(
            name=name,
            value=value,
            timestamp=datetime.now(),
            tags=tags or {},
            metadata=metadata or {}
        )
        
        with self.lock:
            self.metrics.append(metric)
            
            # Keep only last 1000 metrics to prevent memory issues
            if len(self.metrics) > 1000:
                self.metrics = self.metrics[-1000:]
    
    def track_database_operation(self, operation_name: str, duration: float, success: bool):
        """Track database operation performance"""
        self.add_metric(
            f"database.{operation_name}.duration",
            duration,
            {"operation": operation_name, "system": "database"}
        )
        
        self.add_metric(
            f"database.{operation_name}.success",
            1.0 if success else 0.0,
            {"operation": operation_name, "system": "database"}
        )
        
        # Update system metrics
        with self.lock:
            if success:
                self.system_metrics.response_time_avg = (
                    (self.system_metrics.response_time_avg + duration) / 2
                )
    
    def track_photo_upload_operation(self, operation_name: str, duration: float, file_size: int, success: bool):
        """Track photo upload operation performance"""
        self.add_metric(
            f"photo_upload.{operation_name}.duration",
            duration,
            {"operation": operation_name, "system": "photo_upload"}
        )
        
        self.add_metric(
            f"photo_upload.{operation_name}.file_size",
            file_size,
            {"operation": operation_name, "system": "photo_upload"}
        )
        
        self.add_metric(
            f"photo_upload.{operation_name}.success",
            1.0 if success else 0.0,
            {"operation": operation_name, "system": "photo_upload"}
        )
    
    def track_game_operation(self, operation_name: str, duration: float, game_type: str, success: bool):
        """Track game operation performance"""
        self.add_metric(
            f"game.{operation_name}.duration",
            duration,
            {"operation": operation_name, "game_type": game_type, "system": "game"}
        )
        
        self.add_metric(
            f"game.{operation_name}.success",
            1.0 if success else 0.0,
            {"operation": operation_name, "game_type": game_type, "system": "game"}
        )
    
    def track_circuit_breaker_operation(self, breaker_name: str, duration: float, state: str, success: bool):
        """Track circuit breaker operation performance"""
        self.add_metric(
            f"circuit_breaker.{breaker_name}.duration",
            duration,
            {"breaker": breaker_name, "system": "circuit_breaker"}
        )
        
        self.add_metric(
            f"circuit_breaker.{breaker_name}.state",
            1.0 if state == "closed" else 0.0,
            {"breaker": breaker_name, "system": "circuit_breaker"}
        )
        
        self.add_metric(
            f"circuit_breaker.{breaker_name}.success",
            1.0 if success else 0.0,
            {"breaker": breaker_name, "system": "circuit_breaker"}
        )
    
    def track_api_request(self, endpoint: str, method: str, duration: float, status_code: int):
        """Track API request performance"""
        success = 200 <= status_code < 400
        
        self.add_metric(
            f"api.{method.lower()}.{endpoint}.duration",
            duration,
            {"endpoint": endpoint, "method": method, "system": "api"}
        )
        
        self.add_metric(
            f"api.{method.lower()}.{endpoint}.status_code",
            status_code,
            {"endpoint": endpoint, "method": method, "system": "api"}
        )
        
        self.add_metric(
            f"api.{method.lower()}.{endpoint}.success",
            1.0 if success else 0.0,
            {"endpoint": endpoint, "method": method, "system": "api"}
        )
        
        # Update system metrics
        with self.lock:
            self.system_metrics.response_time_avg = (
                (self.system_metrics.response_time_avg + duration) / 2
            )
            
            if not success:
                self.system_metrics.error_rate = min(100.0, self.system_metrics.error_rate + 1.0)
    
    def get_performance_summary(self) -> Dict[str, Any]:
        """Get performance summary"""
        with self.lock:
            # Calculate averages for different metrics
            db_metrics = [m for m in self.metrics if m.tags.get("system") == "database"]
            photo_metrics = [m for m in self.metrics if m.tags.get("system") == "photo_upload"]
            game_metrics = [m for m in self.metrics if m.tags.get("system") == "game"]
            api_metrics = [m for m in self.metrics if m.tags.get("system") == "api"]
            
            def calculate_avg(metrics, name_suffix):
                relevant_metrics = [m for m in metrics if m.name.endswith(name_suffix)]
                if relevant_metrics:
                    return sum(m.value for m in relevant_metrics) / len(relevant_metrics)
                return 0.0
            
            return {
                "timestamp": datetime.now().isoformat(),
                "system_metrics": {
                    "cpu_usage": self.system_metrics.cpu_usage,
                    "memory_usage": self.system_metrics.memory_usage,
                    "disk_usage": self.system_metrics.disk_usage,
                    "response_time_avg": self.system_metrics.response_time_avg,
                    "error_rate": self.system_metrics.error_rate,
                    "active_connections": self.system_metrics.active_connections
                },
                "database_performance": {
                    "avg_duration": calculate_avg(db_metrics, "duration"),
                    "success_rate": calculate_avg(db_metrics, "success") * 100,
                    "total_operations": len(db_metrics) // 2  # Each operation has 2 metrics
                },
                "photo_upload_performance": {
                    "avg_duration": calculate_avg(photo_metrics, "duration"),
                    "success_rate": calculate_avg(photo_metrics, "success") * 100,
                    "avg_file_size": calculate_avg(photo_metrics, "file_size"),
                    "total_uploads": len(photo_metrics) // 3  # Each upload has 3 metrics
                },
                "game_performance": {
                    "avg_duration": calculate_avg(game_metrics, "duration"),
                    "success_rate": calculate_avg(game_metrics, "success") * 100,
                    "total_operations": len(game_metrics) // 2  # Each operation has 2 metrics
                },
                "api_performance": {
                    "avg_duration": calculate_avg(api_metrics, "duration"),
                    "success_rate": calculate_avg(api_metrics, "success") * 100,
                    "total_requests": len(api_metrics) // 3  # Each request has 3 metrics
                },
                "circuit_breaker_status": self._get_circuit_breaker_status(),
                "alerts": self._get_performance_alerts()
            }
    
    def _get_circuit_breaker_status(self) -> Dict[str, Any]:
        """Get circuit breaker status"""
        try:
            from circuit_breakers_enhanced import get_circuit_breaker_health
            cb_health = get_circuit_breaker_health()
            return {
                "overall_status": cb_health.get("overall_status", "unknown"),
                "total_circuit_breakers": cb_health.get("total_circuit_breakers", 0),
                "circuit_breakers": cb_health.get("circuit_breakers", {})
            }
        except Exception as e:
            logger.error(f"Error getting circuit breaker status: {e}")
            return {"overall_status": "error", "total_circuit_breakers": 0, "circuit_breakers": {}}
    
    def _get_performance_alerts(self) -> List[str]:
        """Get performance alerts"""
        alerts = []
        
        with self.lock:
            if self.system_metrics.cpu_usage > self.thresholds["cpu_usage"]:
                alerts.append(f"High CPU usage: {self.system_metrics.cpu_usage}%")
            
            if self.system_metrics.memory_usage > self.thresholds["memory_usage"]:
                alerts.append(f"High memory usage: {self.system_metrics.memory_usage}%")
            
            if self.system_metrics.response_time_avg > self.thresholds["response_time"]:
                alerts.append(f"High response time: {self.system_metrics.response_time_avg}s")
            
            if self.system_metrics.error_rate > self.thresholds["error_rate"]:
                alerts.append(f"High error rate: {self.system_metrics.error_rate}%")
        
        return alerts
    
    def get_metrics_by_time_range(self, start_time: datetime, end_time: datetime) -> List[PerformanceMetric]:
        """Get metrics within a time range"""
        with self.lock:
            return [
                metric for metric in self.metrics
                if start_time <= metric.timestamp <= end_time
            ]
    
    def get_metrics_by_name(self, name: str) -> List[PerformanceMetric]:
        """Get metrics by name"""
        with self.lock:
            return [metric for metric in self.metrics if metric.name == name]
    
    def clear_old_metrics(self, hours: int = 24):
        """Clear metrics older than specified hours"""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        
        with self.lock:
            self.metrics = [
                metric for metric in self.metrics
                if metric.timestamp > cutoff_time
            ]
        
        logger.info(f"Cleared metrics older than {hours} hours")
    
    def shutdown(self):
        """Shutdown performance monitoring"""
        self.shutdown_event.set()
        if self.monitoring_thread:
            self.monitoring_thread.join(timeout=5)
        logger.info("Enhanced performance monitoring shutdown")

# Global performance monitor
performance_monitor = EnhancedPerformanceMonitor()

# Performance tracking decorators
def track_performance(operation_name: str, system: str):
    """Decorator to track function performance"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                duration = time.time() - start_time
                performance_monitor.add_metric(
                    f"{system}.{operation_name}.duration",
                    duration,
                    {"operation": operation_name, "system": system}
                )
                performance_monitor.add_metric(
                    f"{system}.{operation_name}.success",
                    1.0,
                    {"operation": operation_name, "system": system}
                )
                return result
            except Exception as e:
                duration = time.time() - start_time
                performance_monitor.add_metric(
                    f"{system}.{operation_name}.duration",
                    duration,
                    {"operation": operation_name, "system": system}
                )
                performance_monitor.add_metric(
                    f"{system}.{operation_name}.success",
                    0.0,
                    {"operation": operation_name, "system": system}
                )
                raise
        return wrapper
    return decorator

def track_async_performance(operation_name: str, system: str):
    """Decorator to track async function performance"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = await func(*args, **kwargs)
                duration = time.time() - start_time
                performance_monitor.add_metric(
                    f"{system}.{operation_name}.duration",
                    duration,
                    {"operation": operation_name, "system": system}
                )
                performance_monitor.add_metric(
                    f"{system}.{operation_name}.success",
                    1.0,
                    {"operation": operation_name, "system": system}
                )
                return result
            except Exception as e:
                duration = time.time() - start_time
                performance_monitor.add_metric(
                    f"{system}.{operation_name}.duration",
                    duration,
                    {"operation": operation_name, "system": system}
                )
                performance_monitor.add_metric(
                    f"{system}.{operation_name}.success",
                    0.0,
                    {"operation": operation_name, "system": system}
                )
                raise
        return wrapper
    return decorator

# Export components
__all__ = [
    'EnhancedPerformanceMonitor',
    'performance_monitor',
    'track_performance',
    'track_async_performance',
    'PerformanceMetric',
    'SystemMetrics'
] 