#!/usr/bin/env python3
"""
Security Implementation for Elmowafiplatform

This script implements security enhancements to address critical security issues:
1. Secure authentication with JWT and proper password handling
2. File upload security with validation and sanitization
3. Rate limiting and brute force protection
4. Secure environment variable management
"""

import os
import re
import time
import uuid
import secrets
import logging
import hashlib
import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple, Union, Set
from dataclasses import dataclass

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Try to import required libraries
try:
    import jwt
    from jwt.exceptions import InvalidTokenError, ExpiredSignatureError
    JWT_AVAILABLE = True
except ImportError:
    JWT_AVAILABLE = False
    logger.warning("PyJWT not available, JWT authentication will be limited")

try:
    from passlib.context import CryptContext
    PASSLIB_AVAILABLE = True
except ImportError:
    PASSLIB_AVAILABLE = False
    logger.warning("passlib not available, password hashing will use fallback methods")

try:
    from dotenv import load_dotenv, set_key
    DOTENV_AVAILABLE = True
    # Load environment variables from .env file
    load_dotenv()
except ImportError:
    DOTENV_AVAILABLE = False
    logger.warning("python-dotenv not available, environment variable management will be limited")

@dataclass
class SecurityConfig:
    """Security configuration settings"""
    # JWT settings
    jwt_secret_key: str = os.getenv("JWT_SECRET_KEY", "")
    jwt_algorithm: str = "HS256"
    jwt_expiration_minutes: int = 60
    jwt_refresh_expiration_days: int = 7
    
    # Password settings
    password_min_length: int = 8
    password_require_uppercase: bool = True
    password_require_lowercase: bool = True
    password_require_digit: bool = True
    password_require_special: bool = True
    password_max_common_substring: int = 4  # Max length of common substring with username/email
    
    # Rate limiting settings
    login_max_attempts: int = 5
    login_lockout_minutes: int = 15
    api_rate_limit_per_minute: int = 60
    
    # File upload settings
    upload_max_size_mb: int = 10
    upload_allowed_extensions: Set[str] = None
    upload_base_dir: str = "uploads"
    
    def __post_init__(self):
        # Set default allowed extensions if not provided
        if self.upload_allowed_extensions is None:
            self.upload_allowed_extensions = {
                ".jpg", ".jpeg", ".png", ".gif", ".pdf", ".doc", ".docx", ".txt"
            }
        
        # Generate JWT secret key if not provided
        if not self.jwt_secret_key:
            self.jwt_secret_key = secrets.token_hex(32)
            logger.warning("JWT_SECRET_KEY not found in environment, generated a temporary one")
            logger.warning("Please set JWT_SECRET_KEY in your .env file for production use")
            
            # Try to save to .env file
            if DOTENV_AVAILABLE:
                try:
                    env_file = Path(".env")
                    if env_file.exists():
                        set_key(str(env_file), "JWT_SECRET_KEY", self.jwt_secret_key)
                        logger.info("JWT_SECRET_KEY saved to .env file")
                    else:
                        with open(env_file, "w") as f:
                            f.write(f"JWT_SECRET_KEY={self.jwt_secret_key}\n")
                        logger.info(".env file created with JWT_SECRET_KEY")
                except Exception as e:
                    logger.error(f"Failed to save JWT_SECRET_KEY to .env file: {e}")

# Create a global security configuration
security_config = SecurityConfig()

class PasswordManager:
    """Manages password hashing, verification, and complexity requirements"""
    
    def __init__(self, config: SecurityConfig = None):
        self.config = config or security_config
        
        # Set up password hashing context if passlib is available
        if PASSLIB_AVAILABLE:
            self.pwd_context = CryptContext(
                schemes=["bcrypt"],
                deprecated="auto",
                bcrypt__rounds=12
            )
    
    def hash_password(self, password: str) -> str:
        """Hash a password using the appropriate algorithm"""
        if PASSLIB_AVAILABLE:
            return self.pwd_context.hash(password)
        else:
            # Fallback to hashlib with salt
            salt = secrets.token_hex(16)
            hash_obj = hashlib.sha256((password + salt).encode())
            return f"sha256${salt}${hash_obj.hexdigest()}"
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password against a hash"""
        if PASSLIB_AVAILABLE:
            return self.pwd_context.verify(plain_password, hashed_password)
        else:
            # Fallback verification for hashlib
            if hashed_password.startswith("sha256$"):
                _, salt, hash_value = hashed_password.split("$")
                hash_obj = hashlib.sha256((plain_password + salt).encode())
                return hash_obj.hexdigest() == hash_value
            return False
    
    def check_password_strength(self, password: str, username: str = "", email: str = "") -> Tuple[bool, str]:
        """Check if a password meets the complexity requirements"""
        if len(password) < self.config.password_min_length:
            return False, f"Password must be at least {self.config.password_min_length} characters long"
        
        if self.config.password_require_uppercase and not any(c.isupper() for c in password):
            return False, "Password must contain at least one uppercase letter"
        
        if self.config.password_require_lowercase and not any(c.islower() for c in password):
            return False, "Password must contain at least one lowercase letter"
        
        if self.config.password_require_digit and not any(c.isdigit() for c in password):
            return False, "Password must contain at least one digit"
        
        if self.config.password_require_special and not any(not c.isalnum() for c in password):
            return False, "Password must contain at least one special character"
        
        # Check for common substrings with username or email
        if username and self._has_common_substring(password.lower(), username.lower()):
            return False, "Password contains too much of your username"
        
        if email and self._has_common_substring(password.lower(), email.lower()):
            return False, "Password contains too much of your email"
        
        # Check against common password list (simplified version)
        common_passwords = ["password", "123456", "qwerty", "admin", "welcome", "letmein"]
        if password.lower() in common_passwords:
            return False, "Password is too common"
        
        return True, "Password meets complexity requirements"
    
    def _has_common_substring(self, password: str, identifier: str) -> bool:
        """Check if password has a common substring with identifier"""
        max_common = self.config.password_max_common_substring
        
        for i in range(len(identifier) - max_common + 1):
            substring = identifier[i:i + max_common]
            if substring in password:
                return True
        
        return False

class JWTManager:
    """Manages JWT token generation, validation, and refresh"""
    
    def __init__(self, config: SecurityConfig = None):
        self.config = config or security_config
        
        if not JWT_AVAILABLE:
            logger.error("PyJWT is required for JWT authentication")
    
    def create_access_token(self, data: Dict[str, Any]) -> str:
        """Create a new JWT access token"""
        if not JWT_AVAILABLE:
            raise ImportError("PyJWT is required for JWT authentication")
        
        to_encode = data.copy()
        expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=self.config.jwt_expiration_minutes)
        to_encode.update({"exp": expire, "type": "access"})
        
        encoded_jwt = jwt.encode(
            to_encode,
            self.config.jwt_secret_key,
            algorithm=self.config.jwt_algorithm
        )
        
        return encoded_jwt
    
    def create_refresh_token(self, data: Dict[str, Any]) -> str:
        """Create a new JWT refresh token"""
        if not JWT_AVAILABLE:
            raise ImportError("PyJWT is required for JWT authentication")
        
        to_encode = data.copy()
        expire = datetime.datetime.utcnow() + datetime.timedelta(days=self.config.jwt_refresh_expiration_days)
        to_encode.update({"exp": expire, "type": "refresh"})
        
        encoded_jwt = jwt.encode(
            to_encode,
            self.config.jwt_secret_key,
            algorithm=self.config.jwt_algorithm
        )
        
        return encoded_jwt
    
    def decode_token(self, token: str) -> Dict[str, Any]:
        """Decode and validate a JWT token"""
        if not JWT_AVAILABLE:
            raise ImportError("PyJWT is required for JWT authentication")
        
        try:
            payload = jwt.decode(
                token,
                self.config.jwt_secret_key,
                algorithms=[self.config.jwt_algorithm]
            )
            return payload
        except ExpiredSignatureError:
            raise ValueError("Token has expired")
        except InvalidTokenError:
            raise ValueError("Invalid token")
    
    def refresh_access_token(self, refresh_token: str) -> str:
        """Create a new access token from a refresh token"""
        if not JWT_AVAILABLE:
            raise ImportError("PyJWT is required for JWT authentication")
        
        try:
            payload = self.decode_token(refresh_token)
            
            # Verify it's a refresh token
            if payload.get("type") != "refresh":
                raise ValueError("Not a refresh token")
            
            # Create a new access token with the same data (except exp and type)
            data = {k: v for k, v in payload.items() if k not in ["exp", "type"]}
            return self.create_access_token(data)
            
        except Exception as e:
            raise ValueError(f"Invalid refresh token: {str(e)}")

class RateLimiter:
    """Implements rate limiting and brute force protection"""
    
    def __init__(self, config: SecurityConfig = None):
        self.config = config or security_config
        self.login_attempts = {}  # {username: [(timestamp, ip_address), ...]}
        self.api_requests = {}  # {ip_address: [timestamp, ...]}
    
    def check_login_attempts(self, username: str, ip_address: str) -> Tuple[bool, Optional[int]]:
        """Check if a user has exceeded login attempts"""
        now = time.time()
        username_lower = username.lower()
        
        # Clean up old attempts
        self._cleanup_old_attempts()
        
        # Get recent attempts for this username
        attempts = self.login_attempts.get(username_lower, [])
        
        # Filter attempts within the lockout window
        lockout_seconds = self.config.login_lockout_minutes * 60
        recent_attempts = [attempt for attempt in attempts if now - attempt[0] < lockout_seconds]
        
        # Update attempts list
        self.login_attempts[username_lower] = recent_attempts
        
        # Check if user is locked out
        if len(recent_attempts) >= self.config.login_max_attempts:
            # Calculate remaining lockout time
            oldest_attempt = min(recent_attempts, key=lambda x: x[0])
            lockout_end = oldest_attempt[0] + lockout_seconds
            remaining_seconds = int(lockout_end - now)
            
            if remaining_seconds > 0:
                return False, remaining_seconds
        
        # Add this attempt
        recent_attempts.append((now, ip_address))
        self.login_attempts[username_lower] = recent_attempts
        
        return True, None
    
    def reset_login_attempts(self, username: str):
        """Reset login attempts for a user after successful login"""
        username_lower = username.lower()
        if username_lower in self.login_attempts:
            del self.login_attempts[username_lower]
    
    def check_api_rate_limit(self, ip_address: str) -> bool:
        """Check if an IP has exceeded API rate limits"""
        now = time.time()
        
        # Clean up old requests
        self._cleanup_old_requests()
        
        # Get recent requests for this IP
        requests = self.api_requests.get(ip_address, [])
        
        # Filter requests within the rate limit window (1 minute)
        recent_requests = [req for req in requests if now - req < 60]
        
        # Update requests list
        self.api_requests[ip_address] = recent_requests
        
        # Check if rate limit exceeded
        if len(recent_requests) >= self.config.api_rate_limit_per_minute:
            return False
        
        # Add this request
        recent_requests.append(now)
        self.api_requests[ip_address] = recent_requests
        
        return True
    
    def _cleanup_old_attempts(self):
        """Clean up old login attempts"""
        now = time.time()
        lockout_seconds = self.config.login_lockout_minutes * 60
        
        for username, attempts in list(self.login_attempts.items()):
            # Keep only attempts within the lockout window
            recent_attempts = [attempt for attempt in attempts if now - attempt[0] < lockout_seconds]
            
            if recent_attempts:
                self.login_attempts[username] = recent_attempts
            else:
                del self.login_attempts[username]
    
    def _cleanup_old_requests(self):
        """Clean up old API requests"""
        now = time.time()
        
        for ip, requests in list(self.api_requests.items()):
            # Keep only requests within the last minute
            recent_requests = [req for req in requests if now - req < 60]
            
            if recent_requests:
                self.api_requests[ip] = recent_requests
            else:
                del self.api_requests[ip]

class FileUploadSecurity:
    """Implements secure file upload handling"""
    
    def __init__(self, config: SecurityConfig = None):
        self.config = config or security_config
        
        # Create upload directory if it doesn't exist
        self.upload_dir = Path(self.config.upload_base_dir)
        self.upload_dir.mkdir(exist_ok=True)
    
    def validate_file(self, filename: str, content_type: str, file_size: int) -> Tuple[bool, str]:
        """Validate a file before upload"""
        # Check file size
        max_size_bytes = self.config.upload_max_size_mb * 1024 * 1024
        if file_size > max_size_bytes:
            return False, f"File size exceeds maximum allowed size of {self.config.upload_max_size_mb}MB"
        
        # Check file extension
        _, ext = os.path.splitext(filename)
        if ext.lower() not in self.config.upload_allowed_extensions:
            return False, f"File extension {ext} is not allowed"
        
        # Basic content type validation
        if content_type:
            # Map extensions to expected content types
            content_type_map = {
                ".jpg": "image/jpeg",
                ".jpeg": "image/jpeg",
                ".png": "image/png",
                ".gif": "image/gif",
                ".pdf": "application/pdf",
                ".doc": "application/msword",
                ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                ".txt": "text/plain"
            }
            
            expected_type = content_type_map.get(ext.lower())
            if expected_type and not content_type.startswith(expected_type):
                return False, f"Content type {content_type} does not match file extension {ext}"
        
        return True, ""
    
    def sanitize_filename(self, filename: str) -> str:
        """Sanitize a filename to prevent path traversal and other attacks"""
        # Get just the filename without path
        filename = os.path.basename(filename)
        
        # Remove any potentially dangerous characters
        filename = re.sub(r'[^\w\.-]', '_', filename)
        
        # Ensure filename doesn't start with a dot (hidden file)
        if filename.startswith("."):
            filename = f"__{filename}"
        
        return filename
    
    def generate_secure_filename(self, original_filename: str) -> str:
        """Generate a secure filename with a UUID to prevent collisions"""
        # Get file extension
        _, ext = os.path.splitext(original_filename)
        
        # Generate a UUID
        unique_id = str(uuid.uuid4())
        
        # Create a secure filename
        sanitized_name = self.sanitize_filename(original_filename)
        base_name = os.path.splitext(sanitized_name)[0]
        
        # Combine parts with a limited length of original name to prevent very long filenames
        secure_name = f"{base_name[:50]}_{unique_id}{ext}"
        
        return secure_name
    
    def get_upload_path(self, filename: str, user_id: Optional[str] = None) -> Path:
        """Get the path where a file should be uploaded"""
        # Create user directory if user_id is provided
        if user_id:
            user_dir = self.upload_dir / user_id
            user_dir.mkdir(exist_ok=True)
            return user_dir / filename
        
        # Otherwise use the base upload directory
        return self.upload_dir / filename
    
    async def save_uploaded_file(self, file_content: bytes, original_filename: str, 
                           content_type: str, user_id: Optional[str] = None) -> Tuple[bool, str, Optional[Path]]:
        """Save an uploaded file securely"""
        # Validate file
        valid, message = self.validate_file(original_filename, content_type, len(file_content))
        if not valid:
            return False, message, None
        
        # Generate secure filename
        secure_filename = self.generate_secure_filename(original_filename)
        
        # Get upload path
        upload_path = self.get_upload_path(secure_filename, user_id)
        
        try:
            # Save file
            with open(upload_path, "wb") as f:
                f.write(file_content)
            
            return True, "File uploaded successfully", upload_path
            
        except Exception as e:
            logger.error(f"Error saving uploaded file: {e}")
            return False, f"Error saving file: {str(e)}", None

# Create global instances
password_manager = PasswordManager()
jwt_manager = JWTManager()
rate_limiter = RateLimiter()
file_upload_security = FileUploadSecurity()

# Example of how to use these security components in FastAPI
"""
from fastapi import FastAPI, Depends, HTTPException, status, Request, UploadFile, File, Form
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm

app = FastAPI()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# User authentication
@app.post("/api/v1/token")
async def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends()):
    # Get client IP address
    client_ip = request.client.host
    
    # Check rate limiting
    allowed, lockout_seconds = rate_limiter.check_login_attempts(form_data.username, client_ip)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many login attempts. Try again in {lockout_seconds} seconds"
        )
    
    # Authenticate user (example)
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Reset login attempts on successful login
    rate_limiter.reset_login_attempts(form_data.username)
    
    # Create tokens
    access_token = jwt_manager.create_access_token(data={"sub": user["id"]})
    refresh_token = jwt_manager.create_refresh_token(data={"sub": user["id"]})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

# Token refresh
@app.post("/api/v1/token/refresh")
async def refresh_token(request: Request, refresh_token: str):
    # Check API rate limiting
    client_ip = request.client.host
    if not rate_limiter.check_api_rate_limit(client_ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded"
        )
    
    try:
        # Create new access token
        access_token = jwt_manager.refresh_access_token(refresh_token)
        return {"access_token": access_token, "token_type": "bearer"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )

# User registration
@app.post("/api/v1/users")
async def register_user(request: Request, username: str = Form(...), email: str = Form(...), password: str = Form(...)):
    # Check API rate limiting
    client_ip = request.client.host
    if not rate_limiter.check_api_rate_limit(client_ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded"
        )
    
    # Check password strength
    is_strong, message = password_manager.check_password_strength(password, username, email)
    if not is_strong:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    
    # Hash password
    hashed_password = password_manager.hash_password(password)
    
    # Create user (example)
    user_id = create_user(username, email, hashed_password)
    
    return {"id": user_id, "username": username, "email": email}

# File upload
@app.post("/api/v1/upload")
async def upload_file(
    request: Request,
    file: UploadFile = File(...),
    token: str = Depends(oauth2_scheme)
):
    # Check API rate limiting
    client_ip = request.client.host
    if not rate_limiter.check_api_rate_limit(client_ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded"
        )
    
    # Verify token and get user ID
    try:
        payload = jwt_manager.decode_token(token)
        user_id = payload.get("sub")
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Read file content
    file_content = await file.read()
    
    # Save file securely
    success, message, file_path = await file_upload_security.save_uploaded_file(
        file_content,
        file.filename,
        file.content_type,
        user_id
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    
    return {"filename": file_path.name, "message": message}
"""

if __name__ == "__main__":
    # Example usage
    print("Security Configuration:")
    print(f"JWT Secret Key: {security_config.jwt_secret_key[:5]}...")
    print(f"Password Min Length: {security_config.password_min_length}")
    print(f"Upload Max Size: {security_config.upload_max_size_mb}MB")
    print(f"Allowed Extensions: {security_config.upload_allowed_extensions}")
    
    # Test password strength
    test_password = "Secure123!"
    is_strong, message = password_manager.check_password_strength(test_password, "user", "user@example.com")
    print(f"\nPassword '{test_password}' is strong: {is_strong}")
    print(f"Message: {message}")
    
    # Test JWT token
    if JWT_AVAILABLE:
        token = jwt_manager.create_access_token({"sub": "user123"})
        print(f"\nJWT Token: {token[:20]}...")
        
        try:
            payload = jwt_manager.decode_token(token)
            print(f"Decoded Token: {payload}")
        except ValueError as e:
            print(f"Token Error: {e}")
    
    # Test file upload security
    test_filename = "../../../etc/passwd.jpg"
    secure_name = file_upload_security.generate_secure_filename(test_filename)
    print(f"\nOriginal Filename: {test_filename}")
    print(f"Secure Filename: {secure_name}")