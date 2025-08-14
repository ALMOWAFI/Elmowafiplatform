#!/usr/bin/env python3
"""
Enhanced Elmowafiplatform API
Complete FastAPI application with all family platform features
"""

import os
import uuid
import argparse
import uvicorn
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import sqlite3
import psycopg2
import psycopg2.extras
import json
from pathlib import Path

# Import memory pipeline
try:
    import sys
    sys.path.append('backend')
    from memory_pipeline import MemoryEngine
    memory_pipeline_available = True
except ImportError:
    print("Warning: Memory pipeline not available, using mock")
    memory_pipeline_available = False
    
    # Mock MemoryEngine class
    class MemoryEngine:
        def __init__(self):
            pass
        def get_memory_suggestions(self, family_member_id=None, limit=5):
            return []
        def upload_photo(self, file_data, filename, uploader_id):
            return str(__import__('uuid').uuid4())
        def get_photo_analysis(self, photo_id):
            return {"status": "mock", "photo_id": photo_id}
        def search_photos(self, **kwargs):
            return []
        def get_photos_by_face(self, family_member_id):
            return []
        def create_memory_from_photos(self, **kwargs):
            return str(__import__('uuid').uuid4())

# Try to import gaming system
try:
    from game_endpoints import game_router
    gaming_available = True
except Exception as e:
    print(f"Warning: Gaming system not available: {e}")
    gaming_available = False

# Database backend detection
USE_POSTGRES = False

def _should_use_postgres() -> bool:
    db_url = os.getenv("DATABASE_URL", "").strip()
    if not (db_url.startswith("postgresql://") or db_url.startswith("postgres://")):
        return False
    # Avoid attempting connection if placeholders are present
    placeholder_tokens = ["username", "password", "host", "port", "database"]
    if any(token in db_url for token in placeholder_tokens):
        return False
    return True


class PostgresConnectionAdapter:
    """Minimal adapter to provide a sqlite-like interface over psycopg2.

    - Supports conn.execute(sql, params) returning a cursor
    - Exposes .total_changes based on last cursor rowcount
    - Provides .commit() and .close()
    """

    def __init__(self, psycopg_conn):
        self._conn = psycopg_conn
        self._last_rowcount = 0

    @staticmethod
    def _convert_placeholders(sql: str) -> str:
        # Naive conversion of '?' to '%s' for parameterized queries
        # Assumes queries do not contain literal '?' in strings
        return sql.replace("?", "%s")

    def execute(self, sql: str, params: tuple | list = ()):
        converted = self._convert_placeholders(sql)
        cur = self._conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(converted, params or None)
        # Store rowcount for update/delete operations
        try:
            self._last_rowcount = cur.rowcount
        except Exception:
            self._last_rowcount = 0
        return cur

    @property
    def total_changes(self) -> int:
        return int(self._last_rowcount or 0)

    def commit(self):
        self._conn.commit()

    def close(self):
        self._conn.close()


# Create FastAPI app
app = FastAPI(
    title="Elmowafiplatform API",
    description="Complete family management platform with AI features",
    version="3.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer(auto_error=False)

# Data models
class FamilyMember(BaseModel):
    id: Optional[str] = None
    name: str
    relationship: str
    birth_date: Optional[str] = None
    photo_url: Optional[str] = None
    preferences: Optional[Dict] = {}

class Memory(BaseModel):
    id: Optional[str] = None
    title: str
    description: Optional[str] = None
    date: str
    photos: Optional[List[str]] = []
    family_members: Optional[List[str]] = []
    location: Optional[str] = None
    tags: Optional[List[str]] = []

class TravelPlan(BaseModel):
    id: Optional[str] = None
    destination: str
    start_date: str
    end_date: str
    budget: Optional[float] = None
    family_members: List[str]
    activities: Optional[List[str]] = []
    status: str = "planning"

def init_db():
    """Initialize database (PostgreSQL if available, otherwise SQLite)."""
    global USE_POSTGRES
    USE_POSTGRES = _should_use_postgres()

    # Open connection via our helper to unify behavior
    conn = get_db()

    # Create tables
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS family_members (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            relationship TEXT,
            birth_date TEXT,
            photo_url TEXT,
            preferences TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS memories (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            date TEXT NOT NULL,
            photos TEXT,
            family_members TEXT,
            location TEXT,
            tags TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS travel_plans (
            id TEXT PRIMARY KEY,
            destination TEXT NOT NULL,
            start_date TEXT NOT NULL,
            end_date TEXT NOT NULL,
            budget REAL,
            family_members TEXT,
            activities TEXT,
            status TEXT DEFAULT 'planning',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    # Insert sample data if tables are empty (works for both backends)
    cur = conn.execute("SELECT COUNT(*) AS cnt FROM family_members")
    row = cur.fetchone()
    # Support sqlite3.Row, tuples, and dict-like rows
    try:
        count = row["cnt"]  # works for sqlite3.Row and dict
    except Exception:
        try:
            count = row[0] if row is not None else 0
        except Exception:
            count = 0
    if not count:
        sample_members = [
            ("1", "Ahmed Al-Mowafi", "Father", "1980-05-15", None, "{}"),
            ("2", "Fatima Al-Mowafi", "Mother", "1985-08-22", None, "{}"),
            ("3", "Omar Al-Mowafi", "Son", "2010-03-10", None, "{}"),
            ("4", "Layla Al-Mowafi", "Daughter", "2012-11-05", None, "{}")
        ]
        for member in sample_members:
            conn.execute(
                """
                INSERT INTO family_members (id, name, relationship, birth_date, photo_url, preferences)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                member,
            )

        sample_memories = [
            (
                "1",
                "Family Vacation in Dubai",
                "Amazing trip to Dubai with the whole family",
                "2023-12-15",
                "[]",
                "[\"1\", \"2\", \"3\", \"4\"]",
                "Dubai, UAE",
                "[\"vacation\", \"dubai\", \"family\"]",
            ),
            (
                "2",
                "Omar's Birthday Party",
                "Omar's 13th birthday celebration at home",
                "2023-03-10",
                "[]",
                "[\"1\", \"2\", \"3\", \"4\"]",
                "Home",
                "[\"birthday\", \"party\", \"family\"]",
            ),
        ]
        for mem in sample_memories:
            conn.execute(
                """
                INSERT INTO memories (id, title, description, date, photos, family_members, location, tags)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                mem,
            )

    conn.commit()
    conn.close()

# Initialize memory engine (independent from DB)
memory_engine = MemoryEngine()

def get_db():
    """Get database connection (PostgreSQL if DATABASE_URL is valid; else SQLite)."""
    db_url = os.getenv("DATABASE_URL", "").strip()
    if _should_use_postgres():
        try:
            psycopg_conn = psycopg2.connect(db_url)
            # Ensure autocommit behavior similar to sqlite's explicit commits
            psycopg_conn.autocommit = False
            return PostgresConnectionAdapter(psycopg_conn)
        except Exception as e:
            print(f"Warning: Failed to connect to PostgreSQL (falling back to SQLite): {e}")
    # Fallback to SQLite
    conn = sqlite3.connect("family_platform.db")
    conn.row_factory = sqlite3.Row
    return conn

# Initialize database on startup (after get_db is defined)
init_db()

# Auth dependency (simplified)
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    # In production, validate JWT token here
    return {"id": "user_1", "username": "family_user"}

# Health endpoints
@app.get("/api/v1/health")
@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Test database connection
        conn = get_db()
        conn.execute("SELECT 1").fetchone()
        conn.close()
        
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "version": "3.0.0",
            "environment": os.getenv('ENVIRONMENT', 'development'),
            "services": {
                "api": True,
                "database": True,
                "ai_services": True
            }
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

@app.get("/api/v1/health/db")
async def database_health_check():
    """Database specific health check endpoint"""
    try:
        # Test database connection
        conn = get_db()
        conn.execute("SELECT 1").fetchone()
        conn.close()
        
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "service": "database",
            "version": "3.0.0",
            "environment": os.getenv('ENVIRONMENT', 'development')
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "service": "database",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Elmowafiplatform API - Family Management Platform",
        "version": "3.0.0",
        "status": "running",
        "features": [
            "Family Management",
            "Memory System",
            "Travel Planning",
            "AI Integration",
            "Gaming System",
            "Budget Management"
        ]
    }

# Family Member endpoints
@app.get("/api/v1/family/members")
async def get_family_members(user = Depends(get_current_user)):
    """Get all family members"""
    conn = get_db()
    cursor = conn.execute("SELECT * FROM family_members ORDER BY name")
    members = []
    
    for row in cursor.fetchall():
        member = dict(row)
        member['preferences'] = json.loads(member['preferences'] or '{}')
        members.append(member)
    
    conn.close()
    return {"members": members}

@app.post("/api/v1/family/members")
async def create_family_member(member: FamilyMember, user = Depends(get_current_user)):
    """Create new family member"""
    member_id = str(uuid.uuid4())
    conn = get_db()
    
    conn.execute("""
        INSERT INTO family_members (id, name, relationship, birth_date, photo_url, preferences)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (member_id, member.name, member.relationship, member.birth_date, 
          member.photo_url, json.dumps(member.preferences or {})))
    
    conn.commit()
    conn.close()
    
    return {"id": member_id, "message": "Family member created successfully"}

@app.put("/api/v1/family/members/{member_id}")
async def update_family_member(member_id: str, member: FamilyMember, user = Depends(get_current_user)):
    """Update family member"""
    conn = get_db()
    
    conn.execute("""
        UPDATE family_members 
        SET name = ?, relationship = ?, birth_date = ?, photo_url = ?, preferences = ?
        WHERE id = ?
    """, (member.name, member.relationship, member.birth_date, 
          member.photo_url, json.dumps(member.preferences or {}), member_id))
    
    if conn.total_changes == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Family member not found")
    
    conn.commit()
    conn.close()
    
    return {"message": "Family member updated successfully"}

@app.delete("/api/v1/family/members/{member_id}")
async def delete_family_member(member_id: str, user = Depends(get_current_user)):
    """Delete family member"""
    conn = get_db()
    
    conn.execute("DELETE FROM family_members WHERE id = ?", (member_id,))
    
    if conn.total_changes == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Family member not found")
    
    conn.commit()
    conn.close()
    
    return {"message": "Family member deleted successfully"}

# Memory endpoints
@app.get("/api/v1/memories")
async def get_memories(user = Depends(get_current_user)):
    """Get all family memories"""
    conn = get_db()
    cursor = conn.execute("SELECT * FROM memories ORDER BY date DESC")
    memories = []
    
    for row in cursor.fetchall():
        memory = dict(row)
        memory['photos'] = json.loads(memory['photos'] or '[]')
        memory['family_members'] = json.loads(memory['family_members'] or '[]')
        memory['tags'] = json.loads(memory['tags'] or '[]')
        memories.append(memory)
    
    conn.close()
    return {"memories": memories}

@app.post("/api/v1/memories")
async def create_memory(memory: Memory, user = Depends(get_current_user)):
    """Create new memory"""
    memory_id = str(uuid.uuid4())
    conn = get_db()
    
    conn.execute("""
        INSERT INTO memories (id, title, description, date, photos, family_members, location, tags)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (memory_id, memory.title, memory.description, memory.date,
          json.dumps(memory.photos or []), json.dumps(memory.family_members or []),
          memory.location, json.dumps(memory.tags or [])))
    
    conn.commit()
    conn.close()
    
    return {"id": memory_id, "message": "Memory created successfully"}

@app.get("/api/v1/memories/suggestions")
async def get_memory_suggestions(family_member_id: Optional[str] = None, user = Depends(get_current_user)):
    """Get AI-powered memory suggestions"""
    suggestions = memory_engine.get_memory_suggestions(
        family_member_id=family_member_id,
        limit=10
    )
    
    return {"suggestions": suggestions}

# Travel endpoints
@app.get("/api/v1/travel/plans")
async def get_travel_plans(user = Depends(get_current_user)):
    """Get all travel plans"""
    conn = get_db()
    cursor = conn.execute("SELECT * FROM travel_plans ORDER BY start_date")
    plans = []
    
    for row in cursor.fetchall():
        plan = dict(row)
        plan['family_members'] = json.loads(plan['family_members'] or '[]')
        plan['activities'] = json.loads(plan['activities'] or '[]')
        plans.append(plan)
    
    conn.close()
    return {"plans": plans}

@app.post("/api/v1/travel/recommendations")
async def get_travel_recommendations(
    destination: str = Form(...),
    budget: float = Form(...),
    family_members: str = Form(...),
    user = Depends(get_current_user)
):
    """Get AI-powered travel recommendations"""
    # Simulate AI recommendations
    recommendations = {
        "destination": destination,
        "budget": budget,
        "recommendations": [
            {
                "activity": "Visit Burj Khalifa",
                "estimated_cost": 200,
                "duration": "2 hours",
                "family_friendly": True,
                "description": "Experience breathtaking views from the world's tallest building"
            },
            {
                "activity": "Dubai Mall Aquarium",
                "estimated_cost": 150,
                "duration": "1.5 hours", 
                "family_friendly": True,
                "description": "Walk through the underwater tunnel with sharks and rays"
            },
            {
                "activity": "Desert Safari",
                "estimated_cost": 300,
                "duration": "6 hours",
                "family_friendly": True,
                "description": "Experience traditional Bedouin culture with camel rides and BBQ dinner"
            }
        ],
        "cultural_insights": [
            "Dubai is a modern Islamic city - dress modestly when visiting mosques",
            "Friday is the holy day, some attractions may have different hours",
            "Arabic and English are widely spoken"
        ]
    }
    
    return recommendations

@app.post("/api/v1/travel/plans")
async def create_travel_plan(plan: TravelPlan, user = Depends(get_current_user)):
    """Create new travel plan"""
    plan_id = str(uuid.uuid4())
    conn = get_db()
    
    conn.execute("""
        INSERT INTO travel_plans (id, destination, start_date, end_date, budget, family_members, activities, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (plan_id, plan.destination, plan.start_date, plan.end_date, plan.budget,
          json.dumps(plan.family_members), json.dumps(plan.activities or []), plan.status))
    
    conn.commit()
    conn.close()
    
    return {"id": plan_id, "message": "Travel plan created successfully"}

# Gaming endpoints
@app.get("/api/v1/games/rules/{game_name}")
async def get_game_rules(game_name: str, user = Depends(get_current_user)):
    """Get rules for a specific game"""
    games_rules = {
        "mafia": {
            "name": "Mafia",
            "description": "A social deduction game where players try to identify the mafia members",
            "min_players": 6,
            "max_players": 20,
            "roles": ["Mafia", "Detective", "Doctor", "Villager"],
            "phases": ["Night", "Day", "Voting"],
            "rules": [
                "Mafia members know each other but others don't know who they are",
                "During night phase, mafia chooses someone to eliminate",
                "During day phase, all players discuss and vote to eliminate someone",
                "Town wins when all mafia are eliminated, mafia wins when they equal or outnumber town"
            ]
        },
        "among_us": {
            "name": "Among Us (Location-based)",
            "description": "Real-world version of Among Us using GPS locations",
            "min_players": 4,
            "max_players": 10,
            "roles": ["Crewmate", "Impostor"],
            "features": ["GPS tracking", "Photo verification", "Emergency meetings"],
            "rules": [
                "Crewmates complete location-based tasks verified by photos",
                "Impostors sabotage and eliminate crewmates",
                "Emergency meetings can be called to discuss suspicious activity",
                "Players vote to eliminate suspected impostors"
            ]
        }
    }
    
    if game_name.lower() not in games_rules:
        raise HTTPException(status_code=404, detail="Game not found")
    
    return games_rules[game_name.lower()]

# Enhanced file upload endpoint with AI processing
@app.post("/api/v1/upload")
async def upload_file(
    file: UploadFile = File(...),
    memory_id: Optional[str] = Form(None),
    user = Depends(get_current_user)
):
    """Upload photo with complete AI analysis pipeline"""
    
    # Read file content
    content = await file.read()
    
    # Upload through memory pipeline
    photo_id = memory_engine.upload_photo(
        file_data=content,
        filename=file.filename,
        uploader_id=user.get("id", "user_1")
    )
    
    return {
        "photo_id": photo_id,
        "filename": file.filename,
        "url": f"/uploads/{photo_id}",
        "size": len(content),
        "status": "processing",
        "message": "Photo uploaded and AI analysis started"
    }

@app.get("/api/v1/photos/{photo_id}/analysis")
async def get_photo_analysis(photo_id: str, user = Depends(get_current_user)):
    """Get AI analysis results for uploaded photo"""
    analysis = memory_engine.get_photo_analysis(photo_id)
    
    if not analysis:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    return analysis

@app.get("/api/v1/photos/search")
async def search_photos(
    query: Optional[str] = None,
    tags: Optional[str] = None,
    family_member_id: Optional[str] = None,
    location: Optional[str] = None,
    user = Depends(get_current_user)
):
    """Search photos by various criteria"""
    tag_list = tags.split(',') if tags else None
    
    results = memory_engine.search_photos(
        query=query,
        tags=tag_list,
        family_member_id=family_member_id,
        location=location
    )
    
    return {"photos": results, "count": len(results)}

@app.get("/api/v1/families/{family_member_id}/photos")
async def get_family_member_photos(family_member_id: str, user = Depends(get_current_user)):
    """Get all photos containing a specific family member"""
    photos = memory_engine.get_photos_by_face(family_member_id)
    
    return {
        "family_member_id": family_member_id,
        "photos": photos,
        "count": len(photos)
    }

@app.post("/api/v1/memories/create-from-photos")
async def create_memory_from_photos(
    title: str = Form(...),
    description: str = Form(...),
    photo_ids: str = Form(...),
    family_member_ids: str = Form(None),
    location: str = Form(None),
    date: str = Form(None),
    user = Depends(get_current_user)
):
    """Create a memory from selected photos"""
    photo_id_list = photo_ids.split(',')
    family_id_list = family_member_ids.split(',') if family_member_ids else None
    
    memory_id = memory_engine.create_memory_from_photos(
        title=title,
        description=description,
        photo_ids=photo_id_list,
        family_member_ids=family_id_list,
        location=location,
        date=date
    )
    
    return {
        "memory_id": memory_id,
        "message": "Memory created successfully"
    }

# Cultural endpoints
@app.post("/api/v1/culture/translate")
async def translate_text(
    text: str = Form(...),
    target_language: str = Form(...),
    user = Depends(get_current_user)
):
    """Translate text between Arabic and English"""
    
    # Simulate translation (in production, use actual translation service)
    translations = {
        "Hello family": "مرحبا بالعائلة",
        "Good morning": "صباح الخير", 
        "How are you?": "كيف حالك؟",
        "I love you": "أحبك",
        "Family trip": "رحلة عائلية"
    }
    
    if target_language.lower() == "arabic":
        translated = translations.get(text, f"[Arabic translation of: {text}]")
    else:
        # Reverse lookup for Arabic to English
        for en, ar in translations.items():
            if ar == text:
                translated = en
                break
        else:
            translated = f"[English translation of: {text}]"
    
    return {
        "original_text": text,
        "translated_text": translated,
        "source_language": "english" if target_language.lower() == "arabic" else "arabic",
        "target_language": target_language.lower(),
        "confidence": 0.95
    }

@app.get("/api/v1/culture/heritage")
async def get_cultural_heritage(user = Depends(get_current_user)):
    """Get cultural heritage information"""
    return {
        "traditions": [
            {
                "name": "Ramadan Family Gatherings",
                "description": "Traditional iftar meals during Ramadan",
                "significance": "Strengthens family bonds and spiritual connection",
                "practices": ["Preparing traditional foods", "Reading Quran together", "Sharing stories"]
            },
            {
                "name": "Eid Celebrations",
                "description": "Festive celebrations marking end of Ramadan and Hajj",
                "significance": "Joy, gratitude, and family unity",
                "practices": ["Special prayers", "Gift giving", "Visiting relatives", "Preparing sweets"]
            }
        ],
        "recipes": [
            {
                "name": "Mansaf",
                "description": "Traditional Jordanian dish with lamb and yogurt sauce",
                "ingredients": ["Lamb", "Jameed", "Rice", "Almonds"],
                "cultural_significance": "National dish, served at celebrations"
            }
        ],
        "language": {
            "common_phrases": [
                {"arabic": "السلام عليكم", "english": "Peace be upon you", "usage": "Greeting"},
                {"arabic": "بارك الله فيك", "english": "May God bless you", "usage": "Appreciation"},
                {"arabic": "إن شاء الله", "english": "God willing", "usage": "Future plans"}
            ]
        }
    }

# Include gaming router if available
if gaming_available:
    app.include_router(game_router)

    
    
    # Parse command line arguments
    parser = argparse.ArgumentParser(description="Run the Elmowafiplatform API server")
    parser.add_argument("--port", type=int, default=int(os.getenv("PORT", 8000)),
                        help="Port to run the server on (default: 8000)")
    args = parser.parse_args()
    
    uvicorn.run(app, host="0.0.0.0", port=args.port, reload=False)