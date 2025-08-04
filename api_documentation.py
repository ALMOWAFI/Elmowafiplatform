#!/usr/bin/env python3
"""
Comprehensive API Documentation for Elmowafiplatform
OpenAPI/Swagger specifications with detailed examples and interactive explorer
"""

from typing import Dict, Any, List, Optional
from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi
from pydantic import BaseModel, Field
import json
import logging

logger = logging.getLogger(__name__)

# ============================================================================
# API DOCUMENTATION MODELS
# ============================================================================

class APIErrorResponse(BaseModel):
    """Standard error response model"""
    error: str = Field(..., description="Error message")
    code: str = Field(..., description="Error code")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional error details")
    timestamp: str = Field(..., description="Error timestamp")

class PaginationInfo(BaseModel):
    """Pagination information"""
    page: int = Field(..., description="Current page number")
    page_size: int = Field(..., description="Number of items per page")
    total_count: int = Field(..., description="Total number of items")
    total_pages: int = Field(..., description="Total number of pages")
    has_next: bool = Field(..., description="Whether there are more pages")
    has_previous: bool = Field(..., description="Whether there are previous pages")
    next_cursor: Optional[str] = Field(None, description="Next page cursor")
    previous_cursor: Optional[str] = Field(None, description="Previous page cursor")

class MemoryResponse(BaseModel):
    """Memory/Photo response model"""
    id: str = Field(..., description="Memory ID")
    title: str = Field(..., description="Memory title")
    description: Optional[str] = Field(None, description="Memory description")
    date: str = Field(..., description="Memory date")
    location: Optional[str] = Field(None, description="Memory location")
    image_url: Optional[str] = Field(None, description="Image URL")
    thumbnail_url: Optional[str] = Field(None, description="Thumbnail URL")
    tags: List[str] = Field(default=[], description="Memory tags")
    family_members: List[str] = Field(default=[], description="Linked family member IDs")
    ai_analysis: Optional[Dict[str, Any]] = Field(None, description="AI analysis results")
    memory_type: str = Field(..., description="Memory type (photo, video, etc.)")
    privacy_level: str = Field(..., description="Privacy level (family, private, public)")
    created_at: str = Field(..., description="Creation timestamp")
    updated_at: str = Field(..., description="Last update timestamp")

class AlbumResponse(BaseModel):
    """Album response model"""
    id: str = Field(..., description="Album ID")
    name: str = Field(..., description="Album name")
    description: Optional[str] = Field(None, description="Album description")
    album_type: str = Field(..., description="Album type")
    privacy_level: str = Field(..., description="Privacy level")
    cover_photo_id: Optional[str] = Field(None, description="Cover photo ID")
    photo_count: int = Field(..., description="Number of photos in album")
    created_at: str = Field(..., description="Creation timestamp")
    updated_at: str = Field(..., description="Last update timestamp")

class GameSessionResponse(BaseModel):
    """Game session response model"""
    id: str = Field(..., description="Game session ID")
    game_type: str = Field(..., description="Game type")
    title: str = Field(..., description="Game title")
    description: Optional[str] = Field(None, description="Game description")
    status: str = Field(..., description="Game status")
    current_phase: str = Field(..., description="Current game phase")
    players: List[Dict[str, Any]] = Field(default=[], description="Game players")
    current_round: int = Field(..., description="Current round number")
    total_rounds: int = Field(..., description="Total rounds")
    scores: Dict[str, Any] = Field(default={}, description="Player scores")
    created_at: str = Field(..., description="Creation timestamp")
    updated_at: str = Field(..., description="Last update timestamp")

class FamilyMemberResponse(BaseModel):
    """Family member response model"""
    id: str = Field(..., description="Family member ID")
    name: str = Field(..., description="Family member name")
    name_arabic: Optional[str] = Field(None, description="Arabic name")
    birth_date: Optional[str] = Field(None, description="Birth date")
    location: Optional[str] = Field(None, description="Location")
    avatar: Optional[str] = Field(None, description="Avatar URL")
    relationships: Dict[str, Any] = Field(default={}, description="Family relationships")
    role: str = Field(..., description="Family role")
    created_at: str = Field(..., description="Creation timestamp")
    updated_at: str = Field(..., description="Last update timestamp")

# ============================================================================
# API DOCUMENTATION MANAGER
# ============================================================================

class APIDocumentationManager:
    """Comprehensive API documentation manager"""
    
    def __init__(self, app: FastAPI):
        self.app = app
        self.api_info = {
            "title": "Elmowafiplatform API",
            "description": """
# 🏠 Elmowafiplatform API

A comprehensive family platform API for managing memories, photos, games, and family connections.

## 🌟 Features

- **📸 Photo Management**: Upload, organize, and share family photos with AI analysis
- **🎮 Game System**: Multiplayer family games with real-time updates
- **👨‍👩‍👧‍👦 Family Management**: Manage family members and relationships
- **📁 Album Organization**: Create and manage photo albums
- **🤖 AI Integration**: Face recognition and photo analysis
- **🔒 Security**: JWT authentication and role-based access control

## 🚀 Getting Started

1. **Authentication**: Use JWT tokens for API access
2. **Rate Limiting**: Respect rate limits for API stability
3. **Pagination**: Use cursor-based pagination for large datasets
4. **Error Handling**: Check error responses for detailed information

## 📋 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh token

### Family Management
- `GET /api/family/members` - Get family members
- `POST /api/family/members` - Create family member
- `PUT /api/family/members/{id}` - Update family member
- `DELETE /api/family/members/{id}` - Delete family member

### Photo Management
- `POST /api/memories/upload` - Upload photo with AI analysis
- `GET /api/memories` - Get paginated memories
- `GET /api/memories/{id}` - Get specific memory
- `PUT /api/memories/{id}` - Update memory
- `DELETE /api/memories/{id}` - Delete memory

### Album Management
- `POST /api/albums` - Create album
- `GET /api/albums` - Get family albums
- `GET /api/albums/{id}` - Get album details
- `PUT /api/albums/{id}` - Update album
- `DELETE /api/albums/{id}` - Delete album

### Game System
- `POST /api/games/create-session` - Create game session
- `POST /api/games/join` - Join game session
- `POST /api/games/start` - Start game
- `POST /api/games/move` - Make game move
- `GET /api/games/session/{id}` - Get game session

### Health & Monitoring
- `GET /api/health` - Overall system health
- `GET /api/database/health` - Database health
- `GET /api/circuit-breakers/health` - Circuit breaker health
- `GET /api/performance/summary` - Performance metrics
- `GET /metrics` - Prometheus metrics

## 🔐 Authentication

All API endpoints require JWT authentication except for health checks.

Include the JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## 📊 Response Formats

### Success Response
```json
{
  "data": {...},
  "pagination": {...},
  "links": {...}
}
```

### Error Response
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {...},
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## 🚦 Rate Limiting

- **Standard endpoints**: 100 requests per minute
- **Upload endpoints**: 10 requests per minute
- **AI processing**: 5 requests per minute

## 📝 Pagination

Use cursor-based pagination for optimal performance:

```
GET /api/memories?cursor=eyJpZCI6IjEyMyIsInRpbWVzdGFtcCI6IjIwMjQtMDEtMDFUMDA6MDA6MDBaIiwiZGF0ZV9oYXNoIjoiYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoifQ==&limit=20
```

## 🔍 Error Codes

- `AUTH_REQUIRED` - Authentication required
- `INVALID_TOKEN` - Invalid JWT token
- `PERMISSION_DENIED` - Insufficient permissions
- `RESOURCE_NOT_FOUND` - Resource not found
- `VALIDATION_ERROR` - Request validation failed
- `RATE_LIMIT_EXCEEDED` - Rate limit exceeded
- `INTERNAL_ERROR` - Internal server error

## 🛠️ Development

For development and testing, use the interactive API documentation at `/docs` or `/redoc`.
            """,
            "version": "1.0.0",
            "contact": {
                "name": "Elmowafiplatform Support",
                "email": "support@elmowafiplatform.com"
            },
            "license": {
                "name": "MIT",
                "url": "https://opensource.org/licenses/MIT"
            }
        }
        
        self.tags_metadata = [
            {
                "name": "Authentication",
                "description": "User authentication and authorization endpoints"
            },
            {
                "name": "Family Management",
                "description": "Family member and relationship management"
            },
            {
                "name": "Photo Management",
                "description": "Photo upload, organization, and AI analysis"
            },
            {
                "name": "Album Management",
                "description": "Photo album creation and management"
            },
            {
                "name": "Game System",
                "description": "Multiplayer family games and sessions"
            },
            {
                "name": "Health & Monitoring",
                "description": "System health checks and performance monitoring"
            }
        ]
        
        self._setup_openapi()
    
    def _setup_openapi(self):
        """Setup OpenAPI configuration"""
        def custom_openapi():
            if self.app.openapi_schema:
                return self.app.openapi_schema
            
            openapi_schema = get_openapi(
                title=self.api_info["title"],
                version=self.api_info["version"],
                description=self.api_info["description"],
                routes=self.app.routes,
                tags=self.tags_metadata,
                contact=self.api_info["contact"],
                license_info=self.api_info["license"]
            )
            
            # Add custom components
            openapi_schema["components"]["schemas"].update(self._get_custom_schemas())
            
            # Add security schemes
            openapi_schema["components"]["securitySchemes"] = {
                "BearerAuth": {
                    "type": "http",
                    "scheme": "bearer",
                    "bearerFormat": "JWT"
                }
            }
            
            # Add global security
            openapi_schema["security"] = [{"BearerAuth": []}]
            
            self.app.openapi_schema = openapi_schema
            return self.app.openapi_schema
        
        self.app.openapi = custom_openapi
    
    def _get_custom_schemas(self) -> Dict[str, Any]:
        """Get custom OpenAPI schemas"""
        return {
            "APIErrorResponse": {
                "type": "object",
                "properties": {
                    "error": {"type": "string", "description": "Error message"},
                    "code": {"type": "string", "description": "Error code"},
                    "details": {"type": "object", "description": "Additional error details"},
                    "timestamp": {"type": "string", "format": "date-time", "description": "Error timestamp"}
                },
                "required": ["error", "code", "timestamp"]
            },
            "PaginationInfo": {
                "type": "object",
                "properties": {
                    "page": {"type": "integer", "description": "Current page number"},
                    "page_size": {"type": "integer", "description": "Number of items per page"},
                    "total_count": {"type": "integer", "description": "Total number of items"},
                    "total_pages": {"type": "integer", "description": "Total number of pages"},
                    "has_next": {"type": "boolean", "description": "Whether there are more pages"},
                    "has_previous": {"type": "boolean", "description": "Whether there are previous pages"},
                    "next_cursor": {"type": "string", "description": "Next page cursor"},
                    "previous_cursor": {"type": "string", "description": "Previous page cursor"}
                },
                "required": ["page", "page_size", "total_count", "total_pages", "has_next", "has_previous"]
            },
            "MemoryResponse": {
                "type": "object",
                "properties": {
                    "id": {"type": "string", "description": "Memory ID"},
                    "title": {"type": "string", "description": "Memory title"},
                    "description": {"type": "string", "description": "Memory description"},
                    "date": {"type": "string", "format": "date", "description": "Memory date"},
                    "location": {"type": "string", "description": "Memory location"},
                    "image_url": {"type": "string", "description": "Image URL"},
                    "thumbnail_url": {"type": "string", "description": "Thumbnail URL"},
                    "tags": {"type": "array", "items": {"type": "string"}, "description": "Memory tags"},
                    "family_members": {"type": "array", "items": {"type": "string"}, "description": "Linked family member IDs"},
                    "ai_analysis": {"type": "object", "description": "AI analysis results"},
                    "memory_type": {"type": "string", "description": "Memory type"},
                    "privacy_level": {"type": "string", "description": "Privacy level"},
                    "created_at": {"type": "string", "format": "date-time", "description": "Creation timestamp"},
                    "updated_at": {"type": "string", "format": "date-time", "description": "Last update timestamp"}
                },
                "required": ["id", "title", "date", "memory_type", "privacy_level", "created_at", "updated_at"]
            },
            "AlbumResponse": {
                "type": "object",
                "properties": {
                    "id": {"type": "string", "description": "Album ID"},
                    "name": {"type": "string", "description": "Album name"},
                    "description": {"type": "string", "description": "Album description"},
                    "album_type": {"type": "string", "description": "Album type"},
                    "privacy_level": {"type": "string", "description": "Privacy level"},
                    "cover_photo_id": {"type": "string", "description": "Cover photo ID"},
                    "photo_count": {"type": "integer", "description": "Number of photos in album"},
                    "created_at": {"type": "string", "format": "date-time", "description": "Creation timestamp"},
                    "updated_at": {"type": "string", "format": "date-time", "description": "Last update timestamp"}
                },
                "required": ["id", "name", "album_type", "privacy_level", "photo_count", "created_at", "updated_at"]
            },
            "GameSessionResponse": {
                "type": "object",
                "properties": {
                    "id": {"type": "string", "description": "Game session ID"},
                    "game_type": {"type": "string", "description": "Game type"},
                    "title": {"type": "string", "description": "Game title"},
                    "description": {"type": "string", "description": "Game description"},
                    "status": {"type": "string", "description": "Game status"},
                    "current_phase": {"type": "string", "description": "Current game phase"},
                    "players": {"type": "array", "items": {"type": "object"}, "description": "Game players"},
                    "current_round": {"type": "integer", "description": "Current round number"},
                    "total_rounds": {"type": "integer", "description": "Total rounds"},
                    "scores": {"type": "object", "description": "Player scores"},
                    "created_at": {"type": "string", "format": "date-time", "description": "Creation timestamp"},
                    "updated_at": {"type": "string", "format": "date-time", "description": "Last update timestamp"}
                },
                "required": ["id", "game_type", "title", "status", "current_phase", "current_round", "total_rounds", "created_at", "updated_at"]
            }
        }
    
    def get_api_examples(self) -> Dict[str, Any]:
        """Get API request/response examples"""
        return {
            "upload_photo": {
                "request": {
                    "description": "Upload a family photo with AI analysis",
                    "content": {
                        "multipart/form-data": {
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "file": {"type": "string", "format": "binary"},
                                    "title": {"type": "string", "example": "Family Vacation 2024"},
                                    "description": {"type": "string", "example": "Amazing family vacation in Paris"},
                                    "date": {"type": "string", "format": "date", "example": "2024-07-15"},
                                    "location": {"type": "string", "example": "Paris, France"},
                                    "tags": {"type": "array", "items": {"type": "string"}, "example": ["vacation", "family", "paris"]},
                                    "family_members": {"type": "array", "items": {"type": "string"}, "example": ["member-1", "member-2"]},
                                    "privacy_level": {"type": "string", "example": "family"}
                                }
                            }
                        }
                    }
                },
                "response": {
                    "200": {
                        "description": "Photo uploaded successfully",
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/MemoryResponse"},
                                "example": {
                                    "id": "memory-123",
                                    "title": "Family Vacation 2024",
                                    "description": "Amazing family vacation in Paris",
                                    "date": "2024-07-15",
                                    "location": "Paris, France",
                                    "image_url": "/uploads/photos/memory-123.jpg",
                                    "thumbnail_url": "/uploads/thumbnails/memory-123.jpg",
                                    "tags": ["vacation", "family", "paris"],
                                    "family_members": ["member-1", "member-2"],
                                    "ai_analysis": {
                                        "faces_detected": 4,
                                        "objects": ["person", "building", "car"],
                                        "scene": "outdoor",
                                        "confidence": 0.95
                                    },
                                    "memory_type": "photo",
                                    "privacy_level": "family",
                                    "created_at": "2024-01-01T12:00:00Z",
                                    "updated_at": "2024-01-01T12:00:00Z"
                                }
                            }
                        }
                    }
                }
            },
            "create_game_session": {
                "request": {
                    "description": "Create a new game session",
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "game_type": {"type": "string", "example": "memory_match"},
                                    "title": {"type": "string", "example": "Family Memory Game"},
                                    "description": {"type": "string", "example": "Fun memory matching game"},
                                    "total_rounds": {"type": "integer", "example": 5},
                                    "players": {"type": "array", "items": {"type": "object"}, "example": [{"id": "player-1", "name": "John"}]}
                                },
                                "required": ["game_type", "title"]
                            },
                            "example": {
                                "game_type": "memory_match",
                                "title": "Family Memory Game",
                                "description": "Fun memory matching game",
                                "total_rounds": 5,
                                "players": [{"id": "player-1", "name": "John"}]
                            }
                        }
                    }
                },
                "response": {
                    "200": {
                        "description": "Game session created successfully",
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/GameSessionResponse"},
                                "example": {
                                    "id": "game-123",
                                    "game_type": "memory_match",
                                    "title": "Family Memory Game",
                                    "description": "Fun memory matching game",
                                    "status": "waiting",
                                    "current_phase": "setup",
                                    "players": [{"id": "player-1", "name": "John"}],
                                    "current_round": 0,
                                    "total_rounds": 5,
                                    "scores": {},
                                    "created_at": "2024-01-01T12:00:00Z",
                                    "updated_at": "2024-01-01T12:00:00Z"
                                }
                            }
                        }
                    }
                }
            }
        }
    
    def generate_api_docs(self) -> str:
        """Generate comprehensive API documentation"""
        docs = f"""
# 📚 Elmowafiplatform API Documentation

## 🏠 Overview

Elmowafiplatform is a comprehensive family platform API that enables families to:
- 📸 Upload and organize photos with AI analysis
- 🎮 Play multiplayer family games
- 👨‍👩‍👧‍👦 Manage family members and relationships
- 📁 Create and share photo albums
- 🤖 Use AI for face recognition and photo analysis

## 🚀 Quick Start

### 1. Authentication
```bash
# Login to get JWT token
curl -X POST "https://api.elmowafiplatform.com/api/auth/login" \\
  -H "Content-Type: application/json" \\
  -d '{"email": "user@example.com", "password": "password"}'
```

### 2. Upload a Photo
```bash
# Upload photo with AI analysis
curl -X POST "https://api.elmowafiplatform.com/api/memories/upload" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -F "file=@family_photo.jpg" \\
  -F "title=Family Vacation 2024" \\
  -F "description=Amazing family vacation in Paris" \\
  -F "date=2024-07-15" \\
  -F "location=Paris, France" \\
  -F "tags=vacation,family,paris" \\
  -F "privacy_level=family"
```

### 3. Create a Game Session
```bash
# Create multiplayer game session
curl -X POST "https://api.elmowafiplatform.com/api/games/create-session" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "game_type": "memory_match",
    "title": "Family Memory Game",
    "description": "Fun memory matching game",
    "total_rounds": 5
  }'
```

## 📋 API Endpoints

### Authentication Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/logout` | User logout |
| POST | `/api/auth/refresh` | Refresh token |

### Family Management Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/family/members` | Get family members |
| POST | `/api/family/members` | Create family member |
| PUT | `/api/family/members/{id}` | Update family member |
| DELETE | `/api/family/members/{id}` | Delete family member |

### Photo Management Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/memories/upload` | Upload photo with AI analysis |
| GET | `/api/memories` | Get paginated memories |
| GET | `/api/memories/{id}` | Get specific memory |
| PUT | `/api/memories/{id}` | Update memory |
| DELETE | `/api/memories/{id}` | Delete memory |

### Album Management Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/albums` | Create album |
| GET | `/api/albums` | Get family albums |
| GET | `/api/albums/{id}` | Get album details |
| PUT | `/api/albums/{id}` | Update album |
| DELETE | `/api/albums/{id}` | Delete album |

### Game System Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/games/create-session` | Create game session |
| POST | `/api/games/join` | Join game session |
| POST | `/api/games/start` | Start game |
| POST | `/api/games/move` | Make game move |
| GET | `/api/games/session/{id}` | Get game session |

### Health & Monitoring Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Overall system health |
| GET | `/api/database/health` | Database health |
| GET | `/api/circuit-breakers/health` | Circuit breaker health |
| GET | `/api/performance/summary` | Performance metrics |
| GET | `/metrics` | Prometheus metrics |

## 🔐 Authentication

All API endpoints require JWT authentication except for health checks.

### JWT Token Format
```
Authorization: Bearer <your-jwt-token>
```

### Token Structure
```json
{
  "sub": "user-id",
  "email": "user@example.com",
  "family_id": "family-123",
  "role": "member",
  "exp": 1640995200,
  "iat": 1640908800
}
```

## 📊 Response Formats

### Success Response
```json
{
  "data": {...},
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total_count": 100,
    "total_pages": 5,
    "has_next": true,
    "has_previous": false,
    "next_cursor": "eyJpZCI6IjEyMyIsInRpbWVzdGFtcCI6IjIwMjQtMDEtMDFUMDA6MDA6MDBaIiwiZGF0ZV9oYXNoIjoiYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoifQ=="
  },
  "links": {
    "self": "/api/memories",
    "next": "/api/memories?cursor=eyJpZCI6IjEyMyIsInRpbWVzdGFtcCI6IjIwMjQtMDEtMDFUMDA6MDA6MDBaIiwiZGF0ZV9oYXNoIjoiYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoifQ=="
  }
}
```

### Error Response
```json
{
  "error": "Resource not found",
  "code": "RESOURCE_NOT_FOUND",
  "details": {
    "resource_type": "memory",
    "resource_id": "memory-123"
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

## 🚦 Rate Limiting

| Endpoint Type | Rate Limit | Description |
|---------------|------------|-------------|
| Standard | 100 requests/minute | Regular API endpoints |
| Upload | 10 requests/minute | Photo upload endpoints |
| AI Processing | 5 requests/minute | AI analysis endpoints |
| Health Checks | No limit | System health endpoints |

### Rate Limit Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## 📝 Pagination

### Cursor-Based Pagination
For optimal performance with large datasets, use cursor-based pagination:

```
GET /api/memories?cursor=eyJpZCI6IjEyMyIsInRpbWVzdGFtcCI6IjIwMjQtMDEtMDFUMDA6MDA6MDBaIiwiZGF0ZV9oYXNoIjoiYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoifQ==&limit=20
```

### Page-Based Pagination
For smaller datasets, use traditional page-based pagination:

```
GET /api/family/members?page=1&page_size=20
```

## 🔍 Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `AUTH_REQUIRED` | Authentication required | 401 |
| `INVALID_TOKEN` | Invalid JWT token | 401 |
| `PERMISSION_DENIED` | Insufficient permissions | 403 |
| `RESOURCE_NOT_FOUND` | Resource not found | 404 |
| `VALIDATION_ERROR` | Request validation failed | 400 |
| `RATE_LIMIT_EXCEEDED` | Rate limit exceeded | 429 |
| `INTERNAL_ERROR` | Internal server error | 500 |

## 🛠️ Development

### Interactive Documentation
- **Swagger UI**: `/docs` - Interactive API explorer
- **ReDoc**: `/redoc` - Alternative documentation viewer

### Testing
```bash
# Run API tests
python -m pytest tests/api/

# Run specific endpoint tests
python -m pytest tests/api/test_photo_upload.py

# Run with coverage
python -m pytest --cov=app tests/
```

### Local Development
```bash
# Start development server
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Start with custom settings
ENVIRONMENT=development uvicorn main:app --reload
```

## 📈 Performance

### Response Times
- **Health checks**: < 50ms
- **Standard queries**: < 200ms
- **Photo uploads**: < 5 seconds
- **AI analysis**: < 10 seconds

### Caching
- **User sessions**: 24 hours
- **AI analysis results**: 1 week
- **Family tree data**: 30 minutes
- **Frequent data**: 5 minutes

## 🔒 Security

### Data Protection
- All data encrypted in transit (HTTPS)
- Sensitive data encrypted at rest
- JWT tokens with short expiration
- Role-based access control

### Input Validation
- File type validation for uploads
- Size limits (10MB max for photos)
- SQL injection prevention
- XSS protection

## 📞 Support

- **Email**: support@elmowafiplatform.com
- **Documentation**: https://docs.elmowafiplatform.com
- **GitHub**: https://github.com/ALMOWAFI/Elmowafiplatform
- **Status Page**: https://status.elmowafiplatform.com

---

*Last updated: January 2024*
        """
        return docs

# ============================================================================
# API DOCUMENTATION UTILITIES
# ============================================================================

def create_api_docs_endpoint(app: FastAPI):
    """Create API documentation endpoint"""
    from fastapi.responses import HTMLResponse
    
    @app.get("/api/docs", response_class=HTMLResponse, tags=["Documentation"])
    async def get_api_docs():
        """Get comprehensive API documentation"""
        docs_manager = APIDocumentationManager(app)
        return docs_manager.generate_api_docs()

def setup_api_documentation(app: FastAPI):
    """Setup comprehensive API documentation"""
    # Initialize documentation manager
    docs_manager = APIDocumentationManager(app)
    
    # Add documentation endpoint
    create_api_docs_endpoint(app)
    
    logger.info("✅ API documentation setup complete")
    return docs_manager

# Export components
__all__ = [
    'APIDocumentationManager',
    'APIErrorResponse',
    'PaginationInfo',
    'MemoryResponse',
    'AlbumResponse',
    'GameSessionResponse',
    'FamilyMemberResponse',
    'setup_api_documentation',
    'create_api_docs_endpoint'
] 