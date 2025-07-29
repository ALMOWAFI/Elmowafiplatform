import re
import hashlib
import secrets
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from functools import wraps
import logging
from fastapi import HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
import jwt

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Security configuration
SECURITY_CONFIG = {
    "max_login_attempts": 5,
    "lockout_duration": 900,  # 15 minutes
    "session_timeout": 3600,  # 1 hour
    "password_min_length": 8,
    "rate_limit_requests": 100,
    "rate_limit_window": 3600,  # 1 hour
    "allowed_file_types": ['.jpg', '.jpeg', '.png', '.gif', '.mp4', '.mov'],
    "max_file_size": 50 * 1024 * 1024,  # 50MB
}

class SecurityManager:
    def __init__(self):
        self.failed_attempts = {}
        self.rate_limits = {}
        self.pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        
    def validate_input(self, data: Dict[str, Any], validation_rules: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and sanitize input data"""
        validated_data = {}
        errors = []
        
        for field, rules in validation_rules.items():
            value = data.get(field)
            
            # Required field check
            if rules.get('required', False) and not value:
                errors.append(f"{field} is required")
                continue
            
            if value is None:
                continue
                
            # Type validation
            expected_type = rules.get('type')
            if expected_type and not isinstance(value, expected_type):
                errors.append(f"{field} must be of type {expected_type.__name__}")
                continue
            
            # Length validation
            if isinstance(value, str):
                min_length = rules.get('min_length', 0)
                max_length = rules.get('max_length', 10000)
                
                if len(value) < min_length:
                    errors.append(f"{field} must be at least {min_length} characters")
                    continue
                    
                if len(value) > max_length:
                    errors.append(f"{field} must be no more than {max_length} characters")
                    continue
            
            # Pattern validation
            pattern = rules.get('pattern')
            if pattern and isinstance(value, str):
                if not re.match(pattern, value):
                    errors.append(f"{field} format is invalid")
                    continue
            
            # Custom validation
            validator = rules.get('validator')
            if validator:
                try:
                    value = validator(value)
                except ValueError as e:
                    errors.append(f"{field}: {str(e)}")
                    continue
            
            # Sanitization
            if isinstance(value, str):
                value = self.sanitize_string(value)
            
            validated_data[field] = value
        
        if errors:
            raise HTTPException(status_code=400, detail={"validation_errors": errors})
        
        return validated_data
    
    def sanitize_string(self, value: str) -> str:
        """Sanitize string input to prevent XSS and injection attacks"""
        if not isinstance(value, str):
            return value
        
        # Remove potentially dangerous characters
        dangerous_chars = ['<', '>', '"', "'", '&', '\x00', '\n', '\r', '\t']
        for char in dangerous_chars:
            value = value.replace(char, '')
        
        # Limit length
        value = value[:1000]
        
        # Strip whitespace
        value = value.strip()
        
        return value
    
    def validate_password(self, password: str) -> bool:
        """Validate password strength"""
        if len(password) < SECURITY_CONFIG["password_min_length"]:
            raise ValueError(f"Password must be at least {SECURITY_CONFIG['password_min_length']} characters")
        
        # Check for at least one uppercase, one lowercase, one digit
        if not re.search(r'[A-Z]', password):
            raise ValueError("Password must contain at least one uppercase letter")
        
        if not re.search(r'[a-z]', password):
            raise ValueError("Password must contain at least one lowercase letter")
        
        if not re.search(r'\d', password):
            raise ValueError("Password must contain at least one digit")
        
        return True
    
    def validate_email(self, email: str) -> str:
        """Validate and normalize email address"""
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        
        if not re.match(email_pattern, email):
            raise ValueError("Invalid email format")
        
        return email.lower().strip()
    
    def hash_password(self, password: str) -> str:
        """Hash password securely"""
        self.validate_password(password)
        return self.pwd_context.hash(password)
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify password against hash"""
        return self.pwd_context.verify(plain_password, hashed_password)
    
    def check_rate_limit(self, identifier: str, max_requests: int = None, window: int = None) -> bool:
        """Check if request is within rate limits"""
        max_requests = max_requests or SECURITY_CONFIG["rate_limit_requests"]
        window = window or SECURITY_CONFIG["rate_limit_window"]
        
        current_time = time.time()
        
        if identifier not in self.rate_limits:
            self.rate_limits[identifier] = []
        
        # Remove old requests outside the window
        self.rate_limits[identifier] = [
            req_time for req_time in self.rate_limits[identifier]
            if current_time - req_time < window
        ]
        
        # Check if limit exceeded
        if len(self.rate_limits[identifier]) >= max_requests:
            return False
        
        # Add current request
        self.rate_limits[identifier].append(current_time)
        return True
    
    def track_failed_login(self, identifier: str) -> None:
        """Track failed login attempts"""
        current_time = time.time()
        
        if identifier not in self.failed_attempts:
            self.failed_attempts[identifier] = []
        
        # Remove old attempts
        cutoff_time = current_time - SECURITY_CONFIG["lockout_duration"]
        self.failed_attempts[identifier] = [
            attempt_time for attempt_time in self.failed_attempts[identifier]
            if attempt_time > cutoff_time
        ]
        
        # Add current failed attempt
        self.failed_attempts[identifier].append(current_time)
    
    def is_account_locked(self, identifier: str) -> bool:
        """Check if account is locked due to failed attempts"""
        if identifier not in self.failed_attempts:
            return False
        
        current_time = time.time()
        cutoff_time = current_time - SECURITY_CONFIG["lockout_duration"]
        
        # Count recent failed attempts
        recent_attempts = [
            attempt_time for attempt_time in self.failed_attempts[identifier]
            if attempt_time > cutoff_time
        ]
        
        return len(recent_attempts) >= SECURITY_CONFIG["max_login_attempts"]
    
    def clear_failed_attempts(self, identifier: str) -> None:
        """Clear failed login attempts after successful login"""
        if identifier in self.failed_attempts:
            del self.failed_attempts[identifier]
    
    def validate_file_upload(self, filename: str, file_size: int, content_type: str) -> bool:
        """Validate file upload security"""
        # Check file extension
        file_ext = '.' + filename.split('.')[-1].lower()
        if file_ext not in SECURITY_CONFIG["allowed_file_types"]:
            raise HTTPException(
                status_code=400, 
                detail=f"File type {file_ext} not allowed. Allowed types: {SECURITY_CONFIG['allowed_file_types']}"
            )
        
        # Check file size
        if file_size > SECURITY_CONFIG["max_file_size"]:
            raise HTTPException(
                status_code=400,
                detail=f"File size {file_size} exceeds maximum allowed size of {SECURITY_CONFIG['max_file_size']} bytes"
            )
        
        # Validate content type matches extension
        content_type_mapping = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.mp4': 'video/mp4',
            '.mov': 'video/quicktime'
        }
        
        expected_content_type = content_type_mapping.get(file_ext)
        if expected_content_type and content_type != expected_content_type:
            raise HTTPException(
                status_code=400,
                detail=f"Content type {content_type} doesn't match file extension {file_ext}"
            )
        
        return True
    
    def generate_secure_token(self, length: int = 32) -> str:
        """Generate a cryptographically secure random token"""
        return secrets.token_urlsafe(length)
    
    def log_security_event(self, event_type: str, details: Dict[str, Any], request: Request = None):
        """Log security-related events"""
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "event_type": event_type,
            "details": details,
            "ip_address": request.client.host if request else None,
            "user_agent": request.headers.get("user-agent") if request else None
        }
        
        logger.warning(f"SECURITY EVENT: {event_type} - {details}")
        
        # In production, also send to security monitoring service
        # self.send_to_security_monitoring(log_entry)

# Global security manager instance
security_manager = SecurityManager()

# Decorators for security
def rate_limit(max_requests: int = None, window: int = None):
    """Rate limiting decorator"""
    def decorator(func):
        @wraps(func)
        async def wrapper(request: Request, *args, **kwargs):
            client_ip = request.client.host
            
            if not security_manager.check_rate_limit(client_ip, max_requests, window):
                security_manager.log_security_event(
                    "RATE_LIMIT_EXCEEDED",
                    {"ip": client_ip, "endpoint": request.url.path},
                    request
                )
                raise HTTPException(
                    status_code=429, 
                    detail="Rate limit exceeded. Please try again later."
                )
            
            return await func(request, *args, **kwargs)
        return wrapper
    return decorator

def validate_input_data(validation_rules: Dict[str, Any]):
    """Input validation decorator"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract request data (this is simplified - in practice you'd extract from request body)
            request_data = kwargs.get('data', {})
            
            if request_data:
                validated_data = security_manager.validate_input(request_data, validation_rules)
                kwargs['data'] = validated_data
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator

# Validation rules for common endpoints
USER_REGISTRATION_RULES = {
    'email': {
        'required': True,
        'type': str,
        'validator': security_manager.validate_email,
        'max_length': 255
    },
    'password': {
        'required': True,
        'type': str,
        'validator': security_manager.validate_password,
        'min_length': 8,
        'max_length': 128
    },
    'full_name': {
        'required': True,
        'type': str,
        'min_length': 2,
        'max_length': 100,
        'pattern': r'^[a-zA-Z\s\-\'\.]+$'
    },
    'phone': {
        'required': False,
        'type': str,
        'pattern': r'^\+?[\d\s\-\(\)]+$',
        'max_length': 20
    }
}

MEMORY_CREATION_RULES = {
    'title': {
        'required': True,
        'type': str,
        'min_length': 1,
        'max_length': 200
    },
    'description': {
        'required': False,
        'type': str,
        'max_length': 2000
    },
    'tags': {
        'required': False,
        'type': list,
        'max_length': 10
    },
    'location': {
        'required': False,
        'type': str,
        'max_length': 200
    }
}

EVENT_CREATION_RULES = {
    'title': {
        'required': True,
        'type': str,
        'min_length': 1,
        'max_length': 200
    },
    'description': {
        'required': False,
        'type': str,
        'max_length': 1000
    },
    'date': {
        'required': True,
        'type': str,
        'pattern': r'^\d{4}-\d{2}-\d{2}$'
    },
    'time': {
        'required': True,
        'type': str,
        'pattern': r'^\d{2}:\d{2}$'
    }
}

# CORS configuration for production
CORS_CONFIG = {
    "allow_origins": [
        "https://elmowafiplatform.vercel.app",  # Your Vercel domain
        "https://www.elmowafiplatform.com",     # Custom domain if you get one
        "http://localhost:3000",                # Local development
        "http://localhost:5173"                 # Vite dev server
    ],
    "allow_credentials": True,
    "allow_methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "allow_headers": ["*"],
    "expose_headers": ["*"]
}

def get_cors_origins():
    """Get CORS origins based on environment"""
    import os
    environment = os.getenv("ENVIRONMENT", "development")
    
    if environment == "production":
        return [
            "https://elmowafiplatform.vercel.app",
            "https://www.elmowafiplatform.com"
        ]
    else:
        return [
            "http://localhost:3000",
            "http://localhost:5173",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5173"
        ] 