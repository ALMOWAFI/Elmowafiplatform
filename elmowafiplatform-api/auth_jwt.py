#!/usr/bin/env python3
"""
JWT Authentication System for Elmowafiplatform
Handles user authentication, token generation, and role-based access control
"""

import os
import jwt
import bcrypt
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from fastapi import HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)

# JWT Configuration
JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv('JWT_ACCESS_TOKEN_EXPIRE_MINUTES', '60'))
JWT_REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv('JWT_REFRESH_TOKEN_EXPIRE_DAYS', '30'))

# Security scheme
security = HTTPBearer()

class UserCredentials(BaseModel):
    email: str
    password: str

class UserRegistration(BaseModel):
    email: str
    username: Optional[str] = None
    display_name: str
    password: str
    family_group_name: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: Dict[str, Any]

class PasswordReset(BaseModel):
    email: str

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

class AuthUser(BaseModel):
    id: str
    email: str
    username: Optional[str]
    display_name: str
    is_active: bool
    family_groups: List[Dict[str, Any]]
    current_family_group: Optional[str] = None
    roles: List[str]

class JWTAuthenticator:
    """JWT Authentication manager"""
    
    def __init__(self, database):
        self.db = database
        
    def hash_password(self, password: str) -> str:
        """Hash password using bcrypt"""
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    def verify_password(self, password: str, hashed_password: str) -> bool:
        """Verify password against hash"""
        return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))
    
    def create_access_token(self, user_data: Dict[str, Any]) -> str:
        """Create JWT access token"""
        expire = datetime.utcnow() + timedelta(minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
        payload = {
            'user_id': user_data['id'],
            'email': user_data['email'],
            'family_groups': user_data.get('family_groups', []),
            'roles': user_data.get('roles', ['member']),
            'exp': expire,
            'iat': datetime.utcnow(),
            'type': 'access'
        }
        return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    
    def create_refresh_token(self, user_id: str) -> str:
        """Create JWT refresh token"""
        expire = datetime.utcnow() + timedelta(days=JWT_REFRESH_TOKEN_EXPIRE_DAYS)
        payload = {
            'user_id': user_id,
            'exp': expire,
            'iat': datetime.utcnow(),
            'type': 'refresh'
        }
        return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    
    def decode_token(self, token: str) -> Dict[str, Any]:
        """Decode and validate JWT token"""
        try:
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token has expired")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token")
    
    async def register_user(self, user_data: UserRegistration) -> TokenResponse:
        """Register a new user"""
        try:
            # Check if user already exists
            existing_user = self.db.get_user_by_email(user_data.email)
            if existing_user:
                raise HTTPException(status_code=400, detail="User with this email already exists")
            
            # Hash password
            hashed_password = self.hash_password(user_data.password)
            
            # Create user
            user_dict = {
                'email': user_data.email,
                'username': user_data.username,
                'display_name': user_data.display_name,
                'password_hash': hashed_password,
                'is_active': True,
                'email_verified': False
            }
            
            user_id = self.db.create_user(user_dict)
            if not user_id:
                raise HTTPException(status_code=500, detail="Failed to create user")
            
            # Create family member profile
            family_member_data = {
                'user_id': user_id,
                'name': user_data.display_name,
                'role': 'owner'  # First user becomes owner of their family group
            }
            
            family_member_id = self.db.create_family_member(family_member_data)
            
            # Create family group if specified
            family_group_id = None
            if user_data.family_group_name:
                family_group_data = {
                    'name': user_data.family_group_name,
                    'owner_id': user_id,
                    'settings': {}
                }
                family_group_id = self.db.create_family_group(family_group_data)
                
                # Add user to family group
                if family_group_id:
                    self.db.add_family_member_to_group(family_group_id, family_member_id, 'owner')
            
            # Get complete user data for token
            user = self.db.get_user_by_id(user_id)
            user['family_groups'] = self.db.get_user_family_groups(user_id)
            user['roles'] = ['owner'] if family_group_id else ['member']
            
            # Generate tokens
            access_token = self.create_access_token(user)
            refresh_token = self.create_refresh_token(user_id)
            
            logger.info(f"User registered successfully: {user_data.email}")
            
            return TokenResponse(
                access_token=access_token,
                refresh_token=refresh_token,
                expires_in=JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
                user={
                    'id': user_id,
                    'email': user['email'],
                    'display_name': user['display_name'],
                    'family_groups': user['family_groups'],
                    'roles': user['roles']
                }
            )
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"User registration failed: {e}")
            raise HTTPException(status_code=500, detail="Registration failed")
    
    async def authenticate_user(self, credentials: UserCredentials) -> TokenResponse:
        """Authenticate user and return tokens"""
        try:
            # Get user by email
            user = self.db.get_user_by_email(credentials.email)
            if not user:
                raise HTTPException(status_code=401, detail="Invalid email or password")
            
            # Verify password
            if not self.verify_password(credentials.password, user['password_hash']):
                raise HTTPException(status_code=401, detail="Invalid email or password")
            
            # Check if user is active
            if not user.get('is_active', True):
                raise HTTPException(status_code=401, detail="Account is disabled")
            
            # Get user's family groups and roles
            user['family_groups'] = self.db.get_user_family_groups(user['id'])
            user['roles'] = self.db.get_user_roles(user['id'])
            
            # Update last login
            self.db.update_user_last_login(user['id'])
            
            # Generate tokens
            access_token = self.create_access_token(user)
            refresh_token = self.create_refresh_token(user['id'])
            
            logger.info(f"User authenticated successfully: {credentials.email}")
            
            return TokenResponse(
                access_token=access_token,
                refresh_token=refresh_token,
                expires_in=JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
                user={
                    'id': user['id'],
                    'email': user['email'],
                    'display_name': user['display_name'],
                    'family_groups': user['family_groups'],
                    'roles': user['roles']
                }
            )
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Authentication failed: {e}")
            raise HTTPException(status_code=500, detail="Authentication failed")
    
    async def refresh_token(self, refresh_token: str) -> TokenResponse:
        """Refresh access token using refresh token"""
        try:
            # Decode refresh token
            payload = self.decode_token(refresh_token)
            
            if payload.get('type') != 'refresh':
                raise HTTPException(status_code=401, detail="Invalid token type")
            
            user_id = payload.get('user_id')
            if not user_id:
                raise HTTPException(status_code=401, detail="Invalid token payload")
            
            # Get current user data
            user = self.db.get_user_by_id(user_id)
            if not user or not user.get('is_active', True):
                raise HTTPException(status_code=401, detail="User not found or inactive")
            
            # Get updated user data
            user['family_groups'] = self.db.get_user_family_groups(user_id)
            user['roles'] = self.db.get_user_roles(user_id)
            
            # Generate new tokens
            access_token = self.create_access_token(user)
            new_refresh_token = self.create_refresh_token(user_id)
            
            return TokenResponse(
                access_token=access_token,
                refresh_token=new_refresh_token,
                expires_in=JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
                user={
                    'id': user['id'],
                    'email': user['email'],
                    'display_name': user['display_name'],
                    'family_groups': user['family_groups'],
                    'roles': user['roles']
                }
            )
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Token refresh failed: {e}")
            raise HTTPException(status_code=401, detail="Token refresh failed")

# Global authenticator instance
authenticator: Optional[JWTAuthenticator] = None

def get_authenticator(db=None):
    """Get authenticator instance"""
    global authenticator
    if authenticator is None and db:
        authenticator = JWTAuthenticator(db)
    return authenticator

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> AuthUser:
    """Get current authenticated user"""
    try:
        # Decode token
        payload = jwt.decode(credentials.credentials, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        
        if payload.get('type') != 'access':
            raise HTTPException(status_code=401, detail="Invalid token type")
        
        user_id = payload.get('user_id')
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        
        # Create AuthUser object
        return AuthUser(
            id=user_id,
            email=payload.get('email'),
            username=payload.get('username'),
            display_name=payload.get('display_name', ''),
            is_active=True,
            family_groups=payload.get('family_groups', []),
            roles=payload.get('roles', ['member'])
        )
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        logger.error(f"Get current user failed: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")

async def get_optional_user(request: Request) -> Optional[AuthUser]:
    """Get current user if authenticated, otherwise None"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return None
        
        token = auth_header.split(' ')[1]
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
        return await get_current_user(credentials)
    except:
        return None

def require_roles(required_roles: List[str]):
    """Decorator to require specific roles"""
    def decorator(current_user: AuthUser = Depends(get_current_user)):
        user_roles = set(current_user.roles)
        required_roles_set = set(required_roles)
        
        if not user_roles.intersection(required_roles_set):
            raise HTTPException(
                status_code=403, 
                detail=f"Insufficient permissions. Required roles: {required_roles}"
            )
        
        return current_user
    
    return decorator

def require_family_access(family_group_id: str):
    """Decorator to require access to specific family group"""
    def decorator(current_user: AuthUser = Depends(get_current_user)):
        user_family_groups = [fg['id'] for fg in current_user.family_groups]
        
        if family_group_id not in user_family_groups:
            raise HTTPException(
                status_code=403,
                detail="Access denied to this family group"
            )
        
        return current_user
    
    return decorator

def require_family_role(family_group_id: str, required_roles: List[str]):
    """Decorator to require specific role in family group"""
    def decorator(current_user: AuthUser = Depends(get_current_user)):
        # Find user's role in the specific family group
        user_role = None
        for fg in current_user.family_groups:
            if fg['id'] == family_group_id:
                user_role = fg.get('role', 'member')
                break
        
        if not user_role or user_role not in required_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Insufficient permissions in family group. Required roles: {required_roles}"
            )
        
        return current_user
    
    return decorator