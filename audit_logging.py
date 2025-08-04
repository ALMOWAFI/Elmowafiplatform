#!/usr/bin/env python3
"""
Comprehensive Audit Logging System for Elmowafiplatform
Tracks all data access and modifications with user context
"""

import logging
import json
import time
from typing import Dict, Any, List, Optional, Union
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
import hashlib
import os
from functools import wraps

logger = logging.getLogger(__name__)

class AuditEventType(Enum):
    """Audit event types"""
    # Authentication events
    LOGIN = "login"
    LOGOUT = "logout"
    TOKEN_REFRESH = "token_refresh"
    PASSWORD_CHANGE = "password_change"
    
    # Data access events
    READ_MEMORY = "read_memory"
    READ_ALBUM = "read_album"
    READ_FAMILY_MEMBER = "read_family_member"
    READ_GAME_SESSION = "read_game_session"
    
    # Data modification events
    CREATE_MEMORY = "create_memory"
    UPDATE_MEMORY = "update_memory"
    DELETE_MEMORY = "delete_memory"
    CREATE_ALBUM = "create_album"
    UPDATE_ALBUM = "update_album"
    DELETE_ALBUM = "delete_album"
    CREATE_FAMILY_MEMBER = "create_family_member"
    UPDATE_FAMILY_MEMBER = "update_family_member"
    DELETE_FAMILY_MEMBER = "delete_family_member"
    CREATE_GAME_SESSION = "create_game_session"
    UPDATE_GAME_SESSION = "update_game_session"
    DELETE_GAME_SESSION = "delete_game_session"
    
    # File operations
    UPLOAD_PHOTO = "upload_photo"
    DELETE_PHOTO = "delete_photo"
    DOWNLOAD_PHOTO = "download_photo"
    
    # AI operations
    AI_ANALYSIS = "ai_analysis"
    FACE_RECOGNITION = "face_recognition"
    
    # System events
    SYSTEM_ERROR = "system_error"
    SECURITY_VIOLATION = "security_violation"
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"

class AuditSeverity(Enum):
    """Audit severity levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

@dataclass
class AuditEvent:
    """Audit event data structure"""
    event_id: str
    event_type: AuditEventType
    timestamp: datetime
    user_id: Optional[str]
    session_id: Optional[str]
    ip_address: Optional[str]
    user_agent: Optional[str]
    resource_type: Optional[str]
    resource_id: Optional[str]
    action: str
    details: Dict[str, Any]
    severity: AuditSeverity
    success: bool
    error_message: Optional[str] = None
    duration_ms: Optional[int] = None

class AuditLogger:
    """Comprehensive audit logging system"""
    
    def __init__(self, log_file: str = None, max_log_size: int = 100 * 1024 * 1024):  # 100MB
        self.log_file = log_file or "audit.log"
        self.max_log_size = max_log_size
        self.audit_logger = self._setup_audit_logger()
        
        # Audit event storage (in production, this would be a database)
        self.audit_events: List[AuditEvent] = []
        self.event_counter = 0
    
    def _setup_audit_logger(self) -> logging.Logger:
        """Setup audit logger"""
        audit_logger = logging.getLogger("audit")
        audit_logger.setLevel(logging.INFO)
        
        # File handler
        file_handler = logging.FileHandler(self.log_file)
        file_handler.setLevel(logging.INFO)
        
        # Formatter
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        file_handler.setFormatter(formatter)
        
        audit_logger.addHandler(file_handler)
        
        return audit_logger
    
    def _generate_event_id(self) -> str:
        """Generate unique event ID"""
        self.event_counter += 1
        timestamp = int(time.time() * 1000)
        return f"audit_{timestamp}_{self.event_counter}"
    
    def log_event(self, event: AuditEvent):
        """Log audit event"""
        try:
            # Add to memory storage
            self.audit_events.append(event)
            
            # Log to file
            log_entry = {
                "event_id": event.event_id,
                "event_type": event.event_type.value,
                "timestamp": event.timestamp.isoformat(),
                "user_id": event.user_id,
                "session_id": event.session_id,
                "ip_address": event.ip_address,
                "user_agent": event.user_agent,
                "resource_type": event.resource_type,
                "resource_id": event.resource_id,
                "action": event.action,
                "details": event.details,
                "severity": event.severity.value,
                "success": event.success,
                "error_message": event.error_message,
                "duration_ms": event.duration_ms
            }
            
            self.audit_logger.info(json.dumps(log_entry))
            
            # Rotate log file if needed
            self._rotate_log_file()
            
        except Exception as e:
            logger.error(f"Failed to log audit event: {e}")
    
    def _rotate_log_file(self):
        """Rotate log file if it exceeds max size"""
        try:
            if os.path.exists(self.log_file):
                file_size = os.path.getsize(self.log_file)
                if file_size > self.max_log_size:
                    # Create backup
                    backup_file = f"{self.log_file}.{int(time.time())}"
                    os.rename(self.log_file, backup_file)
                    
                    # Create new log file
                    open(self.log_file, 'a').close()
                    
                    logger.info(f"Audit log rotated: {backup_file}")
        except Exception as e:
            logger.error(f"Log rotation failed: {e}")
    
    def create_event(self, event_type: AuditEventType, user_id: Optional[str] = None,
                    session_id: Optional[str] = None, ip_address: Optional[str] = None,
                    user_agent: Optional[str] = None, resource_type: Optional[str] = None,
                    resource_id: Optional[str] = None, action: str = "",
                    details: Dict[str, Any] = None, severity: AuditSeverity = AuditSeverity.MEDIUM,
                    success: bool = True, error_message: Optional[str] = None,
                    duration_ms: Optional[int] = None) -> AuditEvent:
        """Create audit event"""
        return AuditEvent(
            event_id=self._generate_event_id(),
            event_type=event_type,
            timestamp=datetime.now(),
            user_id=user_id,
            session_id=session_id,
            ip_address=ip_address,
            user_agent=user_agent,
            resource_type=resource_type,
            resource_id=resource_id,
            action=action,
            details=details or {},
            severity=severity,
            success=success,
            error_message=error_message,
            duration_ms=duration_ms
        )

# ============================================================================
# SPECIALIZED AUDIT LOGGERS
# ============================================================================

class AuthenticationAuditLogger:
    """Audit logger for authentication events"""
    
    def __init__(self, audit_logger: AuditLogger):
        self.audit_logger = audit_logger
    
    def log_login(self, user_id: str, ip_address: str, user_agent: str, success: bool,
                  error_message: Optional[str] = None):
        """Log login event"""
        event = self.audit_logger.create_event(
            event_type=AuditEventType.LOGIN,
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            action="user_login",
            details={"login_method": "password"},
            severity=AuditSeverity.HIGH if success else AuditSeverity.CRITICAL,
            success=success,
            error_message=error_message
        )
        self.audit_logger.log_event(event)
    
    def log_logout(self, user_id: str, session_id: str, ip_address: str):
        """Log logout event"""
        event = self.audit_logger.create_event(
            event_type=AuditEventType.LOGOUT,
            user_id=user_id,
            session_id=session_id,
            ip_address=ip_address,
            action="user_logout",
            details={"logout_method": "user_initiated"},
            severity=AuditSeverity.MEDIUM,
            success=True
        )
        self.audit_logger.log_event(event)
    
    def log_token_refresh(self, user_id: str, session_id: str, success: bool):
        """Log token refresh event"""
        event = self.audit_logger.create_event(
            event_type=AuditEventType.TOKEN_REFRESH,
            user_id=user_id,
            session_id=session_id,
            action="token_refresh",
            details={"refresh_method": "jwt"},
            severity=AuditSeverity.MEDIUM,
            success=success
        )
        self.audit_logger.log_event(event)

class DataAccessAuditLogger:
    """Audit logger for data access events"""
    
    def __init__(self, audit_logger: AuditLogger):
        self.audit_logger = audit_logger
    
    def log_memory_access(self, user_id: str, memory_id: str, action: str,
                         ip_address: str, success: bool, duration_ms: Optional[int] = None):
        """Log memory access event"""
        event = self.audit_logger.create_event(
            event_type=AuditEventType.READ_MEMORY,
            user_id=user_id,
            ip_address=ip_address,
            resource_type="memory",
            resource_id=memory_id,
            action=action,
            details={"access_type": "read"},
            severity=AuditSeverity.LOW,
            success=success,
            duration_ms=duration_ms
        )
        self.audit_logger.log_event(event)
    
    def log_album_access(self, user_id: str, album_id: str, action: str,
                        ip_address: str, success: bool, duration_ms: Optional[int] = None):
        """Log album access event"""
        event = self.audit_logger.create_event(
            event_type=AuditEventType.READ_ALBUM,
            user_id=user_id,
            ip_address=ip_address,
            resource_type="album",
            resource_id=album_id,
            action=action,
            details={"access_type": "read"},
            severity=AuditSeverity.LOW,
            success=success,
            duration_ms=duration_ms
        )
        self.audit_logger.log_event(event)
    
    def log_family_member_access(self, user_id: str, member_id: str, action: str,
                                ip_address: str, success: bool, duration_ms: Optional[int] = None):
        """Log family member access event"""
        event = self.audit_logger.create_event(
            event_type=AuditEventType.READ_FAMILY_MEMBER,
            user_id=user_id,
            ip_address=ip_address,
            resource_type="family_member",
            resource_id=member_id,
            action=action,
            details={"access_type": "read"},
            severity=AuditSeverity.LOW,
            success=success,
            duration_ms=duration_ms
        )
        self.audit_logger.log_event(event)

class DataModificationAuditLogger:
    """Audit logger for data modification events"""
    
    def __init__(self, audit_logger: AuditLogger):
        self.audit_logger = audit_logger
    
    def log_memory_creation(self, user_id: str, memory_id: str, memory_data: Dict[str, Any],
                           ip_address: str, success: bool, error_message: Optional[str] = None):
        """Log memory creation event"""
        event = self.audit_logger.create_event(
            event_type=AuditEventType.CREATE_MEMORY,
            user_id=user_id,
            ip_address=ip_address,
            resource_type="memory",
            resource_id=memory_id,
            action="create_memory",
            details={"memory_data": memory_data},
            severity=AuditSeverity.MEDIUM,
            success=success,
            error_message=error_message
        )
        self.audit_logger.log_event(event)
    
    def log_memory_update(self, user_id: str, memory_id: str, update_data: Dict[str, Any],
                         ip_address: str, success: bool, error_message: Optional[str] = None):
        """Log memory update event"""
        event = self.audit_logger.create_event(
            event_type=AuditEventType.UPDATE_MEMORY,
            user_id=user_id,
            ip_address=ip_address,
            resource_type="memory",
            resource_id=memory_id,
            action="update_memory",
            details={"update_data": update_data},
            severity=AuditSeverity.MEDIUM,
            success=success,
            error_message=error_message
        )
        self.audit_logger.log_event(event)
    
    def log_memory_deletion(self, user_id: str, memory_id: str, ip_address: str,
                           success: bool, error_message: Optional[str] = None):
        """Log memory deletion event"""
        event = self.audit_logger.create_event(
            event_type=AuditEventType.DELETE_MEMORY,
            user_id=user_id,
            ip_address=ip_address,
            resource_type="memory",
            resource_id=memory_id,
            action="delete_memory",
            details={"deletion_reason": "user_requested"},
            severity=AuditSeverity.HIGH,
            success=success,
            error_message=error_message
        )
        self.audit_logger.log_event(event)
    
    def log_album_creation(self, user_id: str, album_id: str, album_data: Dict[str, Any],
                          ip_address: str, success: bool, error_message: Optional[str] = None):
        """Log album creation event"""
        event = self.audit_logger.create_event(
            event_type=AuditEventType.CREATE_ALBUM,
            user_id=user_id,
            ip_address=ip_address,
            resource_type="album",
            resource_id=album_id,
            action="create_album",
            details={"album_data": album_data},
            severity=AuditSeverity.MEDIUM,
            success=success,
            error_message=error_message
        )
        self.audit_logger.log_event(event)

class FileOperationAuditLogger:
    """Audit logger for file operations"""
    
    def __init__(self, audit_logger: AuditLogger):
        self.audit_logger = audit_logger
    
    def log_photo_upload(self, user_id: str, file_name: str, file_size: int,
                        ip_address: str, success: bool, error_message: Optional[str] = None):
        """Log photo upload event"""
        event = self.audit_logger.create_event(
            event_type=AuditEventType.UPLOAD_PHOTO,
            user_id=user_id,
            ip_address=ip_address,
            action="upload_photo",
            details={
                "file_name": file_name,
                "file_size": file_size,
                "upload_method": "http_upload"
            },
            severity=AuditSeverity.MEDIUM,
            success=success,
            error_message=error_message
        )
        self.audit_logger.log_event(event)
    
    def log_photo_download(self, user_id: str, photo_id: str, ip_address: str,
                          success: bool, error_message: Optional[str] = None):
        """Log photo download event"""
        event = self.audit_logger.create_event(
            event_type=AuditEventType.DOWNLOAD_PHOTO,
            user_id=user_id,
            ip_address=ip_address,
            resource_type="photo",
            resource_id=photo_id,
            action="download_photo",
            details={"download_method": "http_download"},
            severity=AuditSeverity.LOW,
            success=success,
            error_message=error_message
        )
        self.audit_logger.log_event(event)

class AIOperationAuditLogger:
    """Audit logger for AI operations"""
    
    def __init__(self, audit_logger: AuditLogger):
        self.audit_logger = audit_logger
    
    def log_ai_analysis(self, user_id: str, photo_id: str, analysis_type: str,
                       ip_address: str, success: bool, duration_ms: Optional[int] = None,
                       error_message: Optional[str] = None):
        """Log AI analysis event"""
        event = self.audit_logger.create_event(
            event_type=AuditEventType.AI_ANALYSIS,
            user_id=user_id,
            ip_address=ip_address,
            resource_type="photo",
            resource_id=photo_id,
            action="ai_analysis",
            details={
                "analysis_type": analysis_type,
                "ai_provider": "azure_computer_vision"
            },
            severity=AuditSeverity.MEDIUM,
            success=success,
            duration_ms=duration_ms,
            error_message=error_message
        )
        self.audit_logger.log_event(event)
    
    def log_face_recognition(self, user_id: str, photo_id: str, faces_detected: int,
                            ip_address: str, success: bool, duration_ms: Optional[int] = None,
                            error_message: Optional[str] = None):
        """Log face recognition event"""
        event = self.audit_logger.create_event(
            event_type=AuditEventType.FACE_RECOGNITION,
            user_id=user_id,
            ip_address=ip_address,
            resource_type="photo",
            resource_id=photo_id,
            action="face_recognition",
            details={
                "faces_detected": faces_detected,
                "recognition_method": "azure_face_api"
            },
            severity=AuditSeverity.MEDIUM,
            success=success,
            duration_ms=duration_ms,
            error_message=error_message
        )
        self.audit_logger.log_event(event)

# ============================================================================
# AUDIT DECORATORS
# ============================================================================

def audit_event(event_type: AuditEventType, resource_type: Optional[str] = None,
                severity: AuditSeverity = AuditSeverity.MEDIUM):
    """Decorator to audit function calls"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Get audit logger
            audit_logger = get_audit_logger()
            if not audit_logger:
                return func(*args, **kwargs)
            
            start_time = time.time()
            success = True
            error_message = None
            
            try:
                result = func(*args, **kwargs)
                return result
            except Exception as e:
                success = False
                error_message = str(e)
                raise
            finally:
                duration_ms = int((time.time() - start_time) * 1000)
                
                # Create audit event
                event = audit_logger.create_event(
                    event_type=event_type,
                    action=func.__name__,
                    resource_type=resource_type,
                    details={"function": func.__name__, "args": str(args), "kwargs": str(kwargs)},
                    severity=severity,
                    success=success,
                    error_message=error_message,
                    duration_ms=duration_ms
                )
                audit_logger.log_event(event)
        
        return wrapper
    return decorator

# ============================================================================
# AUDIT REPORTING
# ============================================================================

class AuditReporter:
    """Generate audit reports and compliance data"""
    
    def __init__(self, audit_logger: AuditLogger):
        self.audit_logger = audit_logger
    
    def get_audit_summary(self, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Get audit summary for date range"""
        events = [event for event in self.audit_logger.audit_events
                 if start_date <= event.timestamp <= end_date]
        
        summary = {
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "total_events": len(events),
            "events_by_type": {},
            "events_by_severity": {},
            "success_rate": 0,
            "unique_users": len(set(event.user_id for event in events if event.user_id)),
            "security_events": len([e for e in events if e.severity in [AuditSeverity.HIGH, AuditSeverity.CRITICAL]])
        }
        
        # Calculate success rate
        successful_events = len([e for e in events if e.success])
        summary["success_rate"] = (successful_events / len(events) * 100) if events else 0
        
        # Events by type
        for event in events:
            event_type = event.event_type.value
            summary["events_by_type"][event_type] = summary["events_by_type"].get(event_type, 0) + 1
        
        # Events by severity
        for event in events:
            severity = event.severity.value
            summary["events_by_severity"][severity] = summary["events_by_severity"].get(severity, 0) + 1
        
        return summary
    
    def get_user_activity_report(self, user_id: str, days: int = 30) -> Dict[str, Any]:
        """Get user activity report"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        user_events = [event for event in self.audit_logger.audit_events
                      if event.user_id == user_id and start_date <= event.timestamp <= end_date]
        
        return {
            "user_id": user_id,
            "period_days": days,
            "total_activities": len(user_events),
            "activities_by_type": {},
            "last_activity": max(event.timestamp for event in user_events).isoformat() if user_events else None,
            "successful_activities": len([e for e in user_events if e.success]),
            "failed_activities": len([e for e in user_events if not e.success])
        }
    
    def get_security_report(self, days: int = 7) -> Dict[str, Any]:
        """Get security report"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        security_events = [event for event in self.audit_logger.audit_events
                          if event.severity in [AuditSeverity.HIGH, AuditSeverity.CRITICAL]
                          and start_date <= event.timestamp <= end_date]
        
        return {
            "period_days": days,
            "total_security_events": len(security_events),
            "critical_events": len([e for e in security_events if e.severity == AuditSeverity.CRITICAL]),
            "high_events": len([e for e in security_events if e.severity == AuditSeverity.HIGH]),
            "failed_logins": len([e for e in security_events if e.event_type == AuditEventType.LOGIN and not e.success]),
            "security_violations": len([e for e in security_events if e.event_type == AuditEventType.SECURITY_VIOLATION])
        }

# ============================================================================
# GLOBAL AUDIT LOGGER
# ============================================================================

_audit_logger = None

def get_audit_logger() -> Optional[AuditLogger]:
    """Get global audit logger instance"""
    global _audit_logger
    if _audit_logger is None:
        _audit_logger = AuditLogger()
    return _audit_logger

def get_authentication_audit_logger() -> AuthenticationAuditLogger:
    """Get authentication audit logger"""
    return AuthenticationAuditLogger(get_audit_logger())

def get_data_access_audit_logger() -> DataAccessAuditLogger:
    """Get data access audit logger"""
    return DataAccessAuditLogger(get_audit_logger())

def get_data_modification_audit_logger() -> DataModificationAuditLogger:
    """Get data modification audit logger"""
    return DataModificationAuditLogger(get_audit_logger())

def get_file_operation_audit_logger() -> FileOperationAuditLogger:
    """Get file operation audit logger"""
    return FileOperationAuditLogger(get_audit_logger())

def get_ai_operation_audit_logger() -> AIOperationAuditLogger:
    """Get AI operation audit logger"""
    return AIOperationAuditLogger(get_audit_logger())

def get_audit_reporter() -> AuditReporter:
    """Get audit reporter"""
    return AuditReporter(get_audit_logger())

# Export components
__all__ = [
    'AuditLogger',
    'AuditEvent',
    'AuditEventType',
    'AuditSeverity',
    'AuthenticationAuditLogger',
    'DataAccessAuditLogger',
    'DataModificationAuditLogger',
    'FileOperationAuditLogger',
    'AIOperationAuditLogger',
    'AuditReporter',
    'audit_event',
    'get_audit_logger',
    'get_authentication_audit_logger',
    'get_data_access_audit_logger',
    'get_data_modification_audit_logger',
    'get_file_operation_audit_logger',
    'get_ai_operation_audit_logger',
    'get_audit_reporter'
] 