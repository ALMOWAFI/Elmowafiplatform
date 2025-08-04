#!/usr/bin/env python3
"""
Standardized Error Response System for Elmowafiplatform
Provides consistent error response formats across all API endpoints
"""

from typing import Dict, Any, Optional, List
from datetime import datetime
from fastapi import HTTPException, Request
from pydantic import BaseModel
import logging
import uuid

logger = logging.getLogger(__name__)

class ErrorDetail(BaseModel):
    """Standard error detail structure"""
    message: str
    field: Optional[str] = None
    code: Optional[str] = None

class StandardErrorResponse(BaseModel):
    """Standard error response format"""
    success: bool = False
    error: str
    message: str
    details: Optional[List[ErrorDetail]] = None
    error_code: str
    timestamp: str
    request_id: str
    status_code: int

class ValidationErrorResponse(StandardErrorResponse):
    """Validation error response format"""
    validation_errors: List[ErrorDetail]

class AuthenticationErrorResponse(StandardErrorResponse):
    """Authentication error response format"""
    authentication_required: bool = True
    auth_url: Optional[str] = None

# Error codes for different types of errors
class ErrorCodes:
    # Authentication & Authorization
    INVALID_CREDENTIALS = "AUTH_INVALID_CREDENTIALS"
    TOKEN_EXPIRED = "AUTH_TOKEN_EXPIRED"
    TOKEN_INVALID = "AUTH_TOKEN_INVALID"
    INSUFFICIENT_PERMISSIONS = "AUTH_INSUFFICIENT_PERMISSIONS"
    ACCOUNT_DISABLED = "AUTH_ACCOUNT_DISABLED"
    
    # Validation Errors
    VALIDATION_FAILED = "VALIDATION_FAILED"
    REQUIRED_FIELD_MISSING = "VALIDATION_REQUIRED_FIELD"
    INVALID_FORMAT = "VALIDATION_INVALID_FORMAT"
    VALUE_TOO_LONG = "VALIDATION_VALUE_TOO_LONG"
    VALUE_TOO_SHORT = "VALIDATION_VALUE_TOO_SHORT"
    
    # Resource Errors
    RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND"
    RESOURCE_ALREADY_EXISTS = "RESOURCE_ALREADY_EXISTS"
    RESOURCE_CONFLICT = "RESOURCE_CONFLICT"
    
    # Family & Access Control
    FAMILY_ACCESS_DENIED = "FAMILY_ACCESS_DENIED"
    FAMILY_NOT_FOUND = "FAMILY_NOT_FOUND"
    FAMILY_MEMBER_NOT_FOUND = "FAMILY_MEMBER_NOT_FOUND"
    
    # File Upload Errors
    FILE_TOO_LARGE = "FILE_TOO_LARGE"
    FILE_TYPE_NOT_ALLOWED = "FILE_TYPE_NOT_ALLOWED"
    FILE_CORRUPTED = "FILE_CORRUPTED"
    FILE_UPLOAD_FAILED = "FILE_UPLOAD_FAILED"
    
    # Database Errors
    DATABASE_ERROR = "DATABASE_ERROR"
    DATABASE_CONNECTION_FAILED = "DATABASE_CONNECTION_FAILED"
    
    # Rate Limiting
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"
    
    # Server Errors
    INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR"
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"
    EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR"

def create_error_response(
    status_code: int,
    error: str,
    message: str,
    error_code: str,
    details: Optional[List[ErrorDetail]] = None,
    request_id: Optional[str] = None
) -> Dict[str, Any]:
    """Create a standardized error response"""
    
    return {
        "success": False,
        "error": error,
        "message": message,
        "details": details or [],
        "error_code": error_code,
        "timestamp": datetime.now().isoformat(),
        "request_id": request_id or str(uuid.uuid4()),
        "status_code": status_code
    }

def create_validation_error_response(
    validation_errors: List[ErrorDetail],
    request_id: Optional[str] = None
) -> Dict[str, Any]:
    """Create a validation error response"""
    
    return {
        "success": False,
        "error": "Validation Failed",
        "message": f"Request validation failed with {len(validation_errors)} error(s)",
        "details": validation_errors,
        "validation_errors": validation_errors,
        "error_code": ErrorCodes.VALIDATION_FAILED,
        "timestamp": datetime.now().isoformat(),
        "request_id": request_id or str(uuid.uuid4()),
        "status_code": 422
    }

def create_authentication_error_response(
    message: str = "Authentication required",
    error_code: str = ErrorCodes.INVALID_CREDENTIALS,
    auth_url: Optional[str] = None,
    request_id: Optional[str] = None
) -> Dict[str, Any]:
    """Create an authentication error response"""
    
    response = {
        "success": False,
        "error": "Authentication Error",
        "message": message,
        "error_code": error_code,
        "authentication_required": True,
        "timestamp": datetime.now().isoformat(),
        "request_id": request_id or str(uuid.uuid4()),
        "status_code": 401
    }
    
    if auth_url:
        response["auth_url"] = auth_url
    
    return response

def create_authorization_error_response(
    message: str = "Insufficient permissions",
    required_roles: Optional[List[str]] = None,
    request_id: Optional[str] = None
) -> Dict[str, Any]:
    """Create an authorization error response"""
    
    details = []
    if required_roles:
        details.append(ErrorDetail(
            message=f"Required roles: {', '.join(required_roles)}",
            code="REQUIRED_ROLES"
        ))
    
    return {
        "success": False,
        "error": "Authorization Error", 
        "message": message,
        "details": details,
        "error_code": ErrorCodes.INSUFFICIENT_PERMISSIONS,
        "timestamp": datetime.now().isoformat(),
        "request_id": request_id or str(uuid.uuid4()),
        "status_code": 403
    }

def create_not_found_error_response(
    resource_type: str = "Resource",
    resource_id: Optional[str] = None,
    request_id: Optional[str] = None
) -> Dict[str, Any]:
    """Create a not found error response"""
    
    message = f"{resource_type} not found"
    if resource_id:
        message += f" with ID: {resource_id}"
    
    return {
        "success": False,
        "error": "Not Found",
        "message": message,
        "error_code": ErrorCodes.RESOURCE_NOT_FOUND,
        "timestamp": datetime.now().isoformat(),
        "request_id": request_id or str(uuid.uuid4()),
        "status_code": 404
    }

def create_conflict_error_response(
    message: str,
    resource_type: str = "Resource",
    request_id: Optional[str] = None
) -> Dict[str, Any]:
    """Create a conflict error response"""
    
    return {
        "success": False,
        "error": f"{resource_type} Conflict",
        "message": message,
        "error_code": ErrorCodes.RESOURCE_CONFLICT,
        "timestamp": datetime.now().isoformat(),
        "request_id": request_id or str(uuid.uuid4()),
        "status_code": 409
    }

def create_rate_limit_error_response(
    retry_after: Optional[int] = None,
    request_id: Optional[str] = None
) -> Dict[str, Any]:
    """Create a rate limit error response"""
    
    message = "Rate limit exceeded. Please try again later."
    if retry_after:
        message += f" Retry after {retry_after} seconds."
    
    response = {
        "success": False,
        "error": "Rate Limit Exceeded",
        "message": message,
        "error_code": ErrorCodes.RATE_LIMIT_EXCEEDED,
        "timestamp": datetime.now().isoformat(),
        "request_id": request_id or str(uuid.uuid4()),
        "status_code": 429
    }
    
    if retry_after:
        response["retry_after"] = retry_after
    
    return response

def create_server_error_response(
    message: str = "Internal server error occurred",
    error_code: str = ErrorCodes.INTERNAL_SERVER_ERROR,
    request_id: Optional[str] = None
) -> Dict[str, Any]:
    """Create a server error response"""
    
    return {
        "success": False,
        "error": "Server Error",
        "message": message,
        "error_code": error_code,
        "timestamp": datetime.now().isoformat(),
        "request_id": request_id or str(uuid.uuid4()),
        "status_code": 500
    }

class StandardHTTPException(HTTPException):
    """Extended HTTPException with standardized error response"""
    
    def __init__(
        self,
        status_code: int,
        error: str,
        message: str,
        error_code: str,
        details: Optional[List[ErrorDetail]] = None,
        request_id: Optional[str] = None
    ):
        self.error_response = create_error_response(
            status_code=status_code,
            error=error,
            message=message,
            error_code=error_code,
            details=details,
            request_id=request_id
        )
        super().__init__(status_code=status_code, detail=self.error_response)

# Common exception classes
class AuthenticationException(StandardHTTPException):
    def __init__(self, message: str = "Authentication required", error_code: str = ErrorCodes.INVALID_CREDENTIALS):
        super().__init__(
            status_code=401,
            error="Authentication Error",
            message=message,
            error_code=error_code
        )

class AuthorizationException(StandardHTTPException):
    def __init__(self, message: str = "Insufficient permissions", required_roles: Optional[List[str]] = None):
        details = []
        if required_roles:
            details.append(ErrorDetail(
                message=f"Required roles: {', '.join(required_roles)}",
                code="REQUIRED_ROLES"
            ))
        
        super().__init__(
            status_code=403,
            error="Authorization Error",
            message=message,
            error_code=ErrorCodes.INSUFFICIENT_PERMISSIONS,
            details=details
        )

class ValidationException(StandardHTTPException):
    def __init__(self, validation_errors: List[ErrorDetail]):
        super().__init__(
            status_code=422,
            error="Validation Failed",
            message=f"Request validation failed with {len(validation_errors)} error(s)",
            error_code=ErrorCodes.VALIDATION_FAILED,
            details=validation_errors
        )

class NotFoundException(StandardHTTPException):
    def __init__(self, resource_type: str = "Resource", resource_id: Optional[str] = None):
        message = f"{resource_type} not found"
        if resource_id:
            message += f" with ID: {resource_id}"
        
        super().__init__(
            status_code=404,
            error="Not Found",
            message=message,
            error_code=ErrorCodes.RESOURCE_NOT_FOUND
        )

class ConflictException(StandardHTTPException):
    def __init__(self, message: str, resource_type: str = "Resource"):
        super().__init__(
            status_code=409,
            error=f"{resource_type} Conflict",
            message=message,
            error_code=ErrorCodes.RESOURCE_CONFLICT
        )

# Helper function to get request ID from request
def get_request_id(request: Request) -> str:
    """Get or generate request ID for tracing"""
    return request.headers.get("X-Request-ID", str(uuid.uuid4()))