#!/usr/bin/env python3
"""
Security Enhancements for Elmowafiplatform

This script implements critical security fixes identified in the project:
1. Removes hardcoded credentials and secrets
2. Enhances file upload security
3. Improves authentication system
"""

import os
import sys
import re
import logging
import secrets
import hashlib
from pathlib import Path
from typing import List, Dict, Any, Optional

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class SecurityEnhancer:
    """Implements security enhancements for the Elmowafiplatform"""
    
    def __init__(self):
        self.project_root = Path(os.path.dirname(os.path.abspath(__file__)))
        self.env_file = self.project_root / ".env"
        self.auth_file = self.project_root / "backend" / "auth.py"
        self.upload_file = self.project_root / "backend" / "helper_functions.py"
        
        # Security settings
        self.allowed_extensions = {".jpg", ".jpeg", ".png", ".gif", ".heic", ".pdf"}
        self.max_upload_size = 10 * 1024 * 1024  # 10MB
        
        logger.info("Security enhancer initialized")
    
    def run_all_enhancements(self):
        """Run all security enhancements"""
        logger.info("Starting security enhancements")
        
        # 1. Fix hardcoded secrets
        self.fix_hardcoded_secrets()
        
        # 2. Enhance file upload security
        self.enhance_file_upload_security()
        
        # 3. Improve authentication system
        self.improve_authentication_system()
        
        logger.info("Security enhancements completed")
    
    def fix_hardcoded_secrets(self):
        """Fix hardcoded secrets and credentials"""
        logger.info("Fixing hardcoded secrets")
        
        # Generate a secure JWT secret
        jwt_secret = secrets.token_hex(32)
        
        # Create or update .env file
        env_content = ""
        if self.env_file.exists():
            with open(self.env_file, "r") as f:
                env_content = f.read()
        
        # Update JWT secret in .env
        if "JWT_SECRET_KEY" not in env_content:
            with open(self.env_file, "a") as f:
                f.write(f"\nJWT_SECRET_KEY={jwt_secret}\n")
            logger.info("Added JWT_SECRET_KEY to .env file")
        
        # Update auth.py to use environment variable
        if self.auth_file.exists():
            with open(self.auth_file, "r") as f:
                auth_content = f.read()
            
            # Replace hardcoded secret key
            auth_content = re.sub(
                r'SECRET_KEY = os\.getenv\("JWT_SECRET_KEY", "[^"]*"\)',
                'SECRET_KEY = os.getenv("JWT_SECRET_KEY")',
                auth_content
            )
            
            # Replace hardcoded admin credentials
            auth_content = re.sub(
                r'users_db = \{[^\}]*\}',
                'users_db = {}  # Users should be stored in the database, not hardcoded',
                auth_content
            )
            
            with open(self.auth_file, "w") as f:
                f.write(auth_content)
            
            logger.info("Removed hardcoded secrets from auth.py")
    
    def enhance_file_upload_security(self):
        """Enhance file upload security"""
        logger.info("Enhancing file upload security")
        
        if self.upload_file.exists():
            with open(self.upload_file, "r") as f:
                upload_content = f.read()
            
            # Find the save_uploaded_file function
            if "async def save_uploaded_file" in upload_content:
                # Add file validation code
                enhanced_function = """
async def save_uploaded_file(file: UploadFile, directory: Path) -> str:
    """Save an uploaded file with security validations"""
    # Validate file extension
    filename = file.filename
    _, ext = os.path.splitext(filename)
    if ext.lower() not in {".jpg", ".jpeg", ".png", ".gif", ".heic", ".pdf"}:
        raise ValueError(f"Unsupported file type: {ext}")
    
    # Validate file size
    file_size = 0
    chunk_size = 1024  # 1KB
    content = bytearray()
    
    # Read file in chunks to validate size
    while True:
        chunk = await file.read(chunk_size)
        if not chunk:
            break
        file_size += len(chunk)
        content.extend(chunk)
        
        # Check if file exceeds size limit (10MB)
        if file_size > 10 * 1024 * 1024:
            raise ValueError(f"File too large: {file_size} bytes")
    
    # Reset file position
    await file.seek(0)
    
    # Generate secure filename
    secure_filename = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex}{ext}"
    
    # Ensure directory exists
    os.makedirs(directory, exist_ok=True)
    
    # Validate path to prevent path traversal
    file_path = directory / secure_filename
    if not str(file_path).startswith(str(directory)):
        raise ValueError("Invalid file path")
    
    # Save file
    with open(file_path, "wb") as f:
        f.write(content)
    
    return secure_filename
"""
                
                # Replace the function
                upload_content = re.sub(
                    r'async def save_uploaded_file\([^\)]*\)[^\{]*\{[^\}]*\}',
                    enhanced_function,
                    upload_content
                )
                
                with open(self.upload_file, "w") as f:
                    f.write(upload_content)
                
                logger.info("Enhanced file upload security")
    
    def improve_authentication_system(self):
        """Improve authentication system"""
        logger.info("Improving authentication system")
        
        # Create auth_enhancements.py with improved authentication
        auth_enhancements = """
#!/usr/bin/env python3
"""
Enhanced Authentication System for Elmowafiplatform
"""

import os
import time
import bcrypt
import jwt
from datetime import datetime, timedelta
from typing import Dict, Optional, List
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, EmailStr, validator
import re

# Get JWT secret from environment
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("JWT_SECRET_KEY environment variable must be set")

# Token settings
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

# Rate limiting settings
MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_PERIOD_MINUTES = 15

# Password requirements
PASSWORD_MIN_LENGTH = 10
PASSWORD_REQUIRE_UPPERCASE = True
PASSWORD_REQUIRE_LOWERCASE = True
PASSWORD_REQUIRE_DIGIT = True
PASSWORD_REQUIRE_SPECIAL = True

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Models
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < PASSWORD_MIN_LENGTH:
            raise ValueError(f'Password must be at least {PASSWORD_MIN_LENGTH} characters')
        if PASSWORD_REQUIRE_UPPERCASE and not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if PASSWORD_REQUIRE_LOWERCASE and not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if PASSWORD_REQUIRE_DIGIT and not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        if PASSWORD_REQUIRE_SPECIAL and not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('Password must contain at least one special character')
        return v

class User(BaseModel):
    id: str
    username: str
    email: EmailStr
    is_active: bool
    created_at: datetime

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str

# Login attempt tracking
login_attempts: Dict[str, List[float]] = {}

def is_rate_limited(username: str) -> bool:
    """Check if a user is rate limited due to too many login attempts"""
    now = time.time()
    if username not in login_attempts:
        return False
    
    # Remove attempts older than lockout period
    cutoff = now - (LOCKOUT_PERIOD_MINUTES * 60)
    login_attempts[username] = [t for t in login_attempts[username] if t > cutoff]
    
    # Check if too many recent attempts
    return len(login_attempts[username]) >= MAX_LOGIN_ATTEMPTS

def record_login_attempt(username: str):
    """Record a login attempt for rate limiting"""
    now = time.time()
    if username not in login_attempts:
        login_attempts[username] = []
    login_attempts[username].append(now)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash"""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password)

def get_password_hash(password: str) -> bytes:
    """Generate a password hash"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm="HS256")
    return encoded_jwt

def create_refresh_token(data: dict):
    """Create a JWT refresh token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm="HS256")
    return encoded_jwt
"""
        
        auth_enhancements_path = self.project_root / "backend" / "auth_enhancements.py"
        with open(auth_enhancements_path, "w") as f:
            f.write(auth_enhancements)
        
        logger.info("Created auth_enhancements.py with improved authentication system")

if __name__ == "__main__":
    enhancer = SecurityEnhancer()
    enhancer.run_all_enhancements()