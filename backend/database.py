#!/usr/bin/env python3
"""
Database management for Elmowafiplatform
Handles SQLite database operations for family data, memories, and AI analysis results
"""

import sqlite3
import json
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

class ElmowafyDatabase:
    """SQLite database manager for family platform"""
    
    def __init__(self, db_path: str = "data/elmowafiplatform.db"):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(exist_ok=True)
        self.init_database()
    
    def get_connection(self):
        """Get database connection with row factory"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    def init_database(self):
        """Initialize database with required tables"""
        with self.get_connection() as conn:
            # Family Members table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS family_members (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    name_arabic TEXT,
                    birth_date TEXT,
                    location TEXT,
                    avatar TEXT,
                    relationships TEXT,  -- JSON string
                    created_at TEXT,
                    updated_at TEXT
                )
            """)
            
            # Memories table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS memories (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    description TEXT,
                    date TEXT NOT NULL,
                    location TEXT,
                    image_url TEXT,
                    tags TEXT,  -- JSON string
                    family_members TEXT,  -- JSON string
                    ai_analysis TEXT,  -- JSON string
                    created_at TEXT,
                    updated_at TEXT
                )
            """)
            
            # Travel Plans table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS travel_plans (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    destination TEXT NOT NULL,
                    start_date TEXT NOT NULL,
                    end_date TEXT NOT NULL,
                    budget REAL,
                    participants TEXT,  -- JSON string
                    activities TEXT,  -- JSON string
                    created_at TEXT,
                    updated_at TEXT
                )
            """)
            
            # AI Game Sessions table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS game_sessions (
                    id TEXT PRIMARY KEY,
                    game_type TEXT NOT NULL,
                    players TEXT NOT NULL,  -- JSON string
                    status TEXT NOT NULL,
                    game_state TEXT,  -- JSON string
                    settings TEXT,  -- JSON string
                    current_phase TEXT,
                    ai_decisions TEXT,  -- JSON string
                    created_at TEXT,
                    updated_at TEXT
                )
            """)
            
            # Cultural Heritage table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS cultural_heritage (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    title_arabic TEXT,
                    description TEXT,
                    description_arabic TEXT,
                    category TEXT,
                    family_members TEXT,  -- JSON string
                    cultural_significance TEXT,
                    tags TEXT,  -- JSON string
                    preservation_date TEXT,
                    created_at TEXT,
                    updated_at TEXT
                )
            """)
            
            # Users table for authentication
            conn.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    username TEXT UNIQUE NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    is_active BOOLEAN DEFAULT 1,
                    family_member_id TEXT,
                    created_at TEXT,
                    updated_at TEXT,
                    FOREIGN KEY (family_member_id) REFERENCES family_members(id)
                )
            """)
            
            # Albums table for photo clustering
            conn.execute("""
                CREATE TABLE IF NOT EXISTS albums (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    cover_memory_id TEXT,
                    memory_ids TEXT,  -- JSON array of memory IDs
                    album_type TEXT DEFAULT 'manual',  -- manual, ai_generated, date_based, location_based
                    clustering_algorithm TEXT,
                    family_members TEXT,  -- JSON string
                    tags TEXT,  -- JSON string
                    created_at TEXT,
                    updated_at TEXT,
                    FOREIGN KEY (cover_memory_id) REFERENCES memories(id)
                )
            """)
            
            # Face recognition training data
            conn.execute("""
                CREATE TABLE IF NOT EXISTS face_training_data (
                    id TEXT PRIMARY KEY,
                    family_member_id TEXT NOT NULL,
                    image_path TEXT NOT NULL,
                    face_encoding TEXT,  -- JSON array of face encoding
                    verified BOOLEAN DEFAULT 0,
                    training_quality_score REAL,
                    created_at TEXT,
                    FOREIGN KEY (family_member_id) REFERENCES family_members(id)
                )
            """)
            
            # GPS verification and location challenges
            conn.execute("""
                CREATE TABLE IF NOT EXISTS location_challenges (
                    id TEXT PRIMARY KEY,
                    game_session_id TEXT NOT NULL,
                    challenge_name TEXT NOT NULL,
                    target_location TEXT NOT NULL,
                    target_latitude REAL NOT NULL,
                    target_longitude REAL NOT NULL,
                    challenge_type TEXT NOT NULL,
                    points_reward INTEGER DEFAULT 100,
                    time_limit_minutes INTEGER DEFAULT 60,
                    verification_radius_meters REAL DEFAULT 50.0,
                    requirements TEXT,  -- JSON string
                    status TEXT DEFAULT 'active',  -- active, completed, expired
                    created_at TEXT,
                    expires_at TEXT,
                    FOREIGN KEY (game_session_id) REFERENCES game_sessions(id)
                )
            """)
            
            # Location verification history
            conn.execute("""
                CREATE TABLE IF NOT EXISTS location_verifications (
                    id TEXT PRIMARY KEY,
                    player_id TEXT NOT NULL,
                    game_session_id TEXT NOT NULL,
                    challenge_id TEXT,
                    target_latitude REAL NOT NULL,
                    target_longitude REAL NOT NULL,
                    actual_latitude REAL NOT NULL,
                    actual_longitude REAL NOT NULL,
                    distance_meters REAL,
                    verification_status TEXT NOT NULL,  -- verified, failed, suspicious
                    photo_evidence_path TEXT,
                    gps_metadata TEXT,  -- JSON string
                    spoofing_detected BOOLEAN DEFAULT 0,
                    points_awarded INTEGER DEFAULT 0,
                    created_at TEXT,
                    FOREIGN KEY (game_session_id) REFERENCES game_sessions(id),
                    FOREIGN KEY (challenge_id) REFERENCES location_challenges(id)
                )
            """)
            
            # Smart memory suggestions tracking
            conn.execute("""
                CREATE TABLE IF NOT EXISTS memory_suggestions (
                    id TEXT PRIMARY KEY,
                    memory_id TEXT NOT NULL,
                    suggestion_type TEXT NOT NULL,  -- on_this_day, similar_content, family_connection
                    suggested_to_user TEXT,
                    suggestion_date TEXT,
                    relevance_score REAL,
                    user_interaction TEXT,  -- viewed, dismissed, saved
                    created_at TEXT,
                    FOREIGN KEY (memory_id) REFERENCES memories(id)
                )
            """)
            
            # AI analysis cache for performance
            conn.execute("""
                CREATE TABLE IF NOT EXISTS ai_analysis_cache (
                    id TEXT PRIMARY KEY,
                    content_hash TEXT UNIQUE NOT NULL,
                    analysis_type TEXT NOT NULL,
                    analysis_result TEXT NOT NULL,  -- JSON string
                    family_context_hash TEXT,
                    created_at TEXT,
                    expires_at TEXT
                )
            """)
            
            # WebSocket connections and presence
            conn.execute("""
                CREATE TABLE IF NOT EXISTS user_presence (
                    user_id TEXT PRIMARY KEY,
                    status TEXT NOT NULL,  -- online, offline, away
                    last_seen TEXT,
                    connection_type TEXT,  -- family_member, game_player, travel_planner, memory_viewer
                    current_room_type TEXT,
                    current_room_id TEXT,
                    updated_at TEXT
                )
            """)
            
            # Real-time collaboration sessions
            conn.execute("""
                CREATE TABLE IF NOT EXISTS collaboration_sessions (
                    id TEXT PRIMARY KEY,
                    session_type TEXT NOT NULL,  -- travel_planning, memory_viewing, game_session
                    resource_id TEXT NOT NULL,  -- travel_plan_id, memory_id, game_session_id
                    participants TEXT NOT NULL,  -- JSON array of user IDs
                    session_data TEXT,  -- JSON string for session-specific data
                    status TEXT DEFAULT 'active',
                    created_at TEXT,
                    updated_at TEXT
                )
            """)
            
            conn.commit()
            logger.info("Database initialized successfully")
    
    # Family Members operations
    def create_family_member(self, member_data: Dict[str, Any]) -> str:
        """Create a new family member"""
        member_id = str(uuid.uuid4())
        now = datetime.now().isoformat()
        
        with self.get_connection() as conn:
            conn.execute("""
                INSERT INTO family_members 
                (id, name, name_arabic, birth_date, location, avatar, relationships, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                member_id,
                member_data.get("name", ""),
                member_data.get("nameArabic", ""),
                member_data.get("birthDate", ""),
                member_data.get("location", ""),
                member_data.get("avatar", ""),
                json.dumps(member_data.get("relationships", [])),
                now,
                now
            ))
            conn.commit()
        
        return member_id
    
    def get_family_members(self) -> List[Dict[str, Any]]:
        """Get all family members"""
        with self.get_connection() as conn:
            cursor = conn.execute("SELECT * FROM family_members")
            rows = cursor.fetchall()
            
            members = []
            for row in rows:
                member = {
                    "id": row["id"],
                    "name": row["name"],
                    "nameArabic": row["name_arabic"],
                    "birthDate": row["birth_date"],
                    "location": row["location"],
                    "avatar": row["avatar"],
                    "relationships": json.loads(row["relationships"]) if row["relationships"] else []
                }
                members.append(member)
            
            return members
    
    def update_family_member(self, member_id: str, updates: Dict[str, Any]) -> bool:
        """Update family member"""
        now = datetime.now().isoformat()
        
        with self.get_connection() as conn:
            # Build dynamic update query
            set_clauses = []
            values = []
            
            if "name" in updates:
                set_clauses.append("name = ?")
                values.append(updates["name"])
            if "nameArabic" in updates:
                set_clauses.append("name_arabic = ?")
                values.append(updates["nameArabic"])
            if "birthDate" in updates:
                set_clauses.append("birth_date = ?")
                values.append(updates["birthDate"])
            if "location" in updates:
                set_clauses.append("location = ?")
                values.append(updates["location"])
            if "avatar" in updates:
                set_clauses.append("avatar = ?")
                values.append(updates["avatar"])
            if "relationships" in updates:
                set_clauses.append("relationships = ?")
                values.append(json.dumps(updates["relationships"]))
            
            set_clauses.append("updated_at = ?")
            values.append(now)
            values.append(member_id)
            
            query = f"UPDATE family_members SET {', '.join(set_clauses)} WHERE id = ?"
            
            cursor = conn.execute(query, values)
            conn.commit()
            
            return cursor.rowcount > 0
    
    # Memories operations
    def create_memory(self, memory_data: Dict[str, Any]) -> str:
        """Create a new memory"""
        memory_id = str(uuid.uuid4())
        now = datetime.now().isoformat()
        
        with self.get_connection() as conn:
            conn.execute("""
                INSERT INTO memories 
                (id, title, description, date, location, image_url, tags, family_members, ai_analysis, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                memory_id,
                memory_data.get("title", ""),
                memory_data.get("description", ""),
                memory_data.get("date", ""),
                memory_data.get("location", ""),
                memory_data.get("imageUrl", ""),
                json.dumps(memory_data.get("tags", [])),
                json.dumps(memory_data.get("familyMembers", [])),
                json.dumps(memory_data.get("aiAnalysis", {})) if memory_data.get("aiAnalysis") else None,
                now,
                now
            ))
            conn.commit()
        
        return memory_id
    
    def get_memories(self, filters: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """Get memories with optional filters"""
        query = "SELECT * FROM memories"
        params = []
        where_clauses = []
        
        if filters:
            if filters.get("familyMemberId"):
                where_clauses.append("family_members LIKE ?")
                params.append(f'%"{filters["familyMemberId"]}"%')
            
            if filters.get("startDate") and filters.get("endDate"):
                where_clauses.append("date BETWEEN ? AND ?")
                params.extend([filters["startDate"], filters["endDate"]])
            
            if filters.get("tags"):
                for tag in filters["tags"]:
                    where_clauses.append("tags LIKE ?")
                    params.append(f'%"{tag}"%')
        
        if where_clauses:
            query += " WHERE " + " AND ".join(where_clauses)
        
        query += " ORDER BY date DESC"
        
        with self.get_connection() as conn:
            cursor = conn.execute(query, params)
            rows = cursor.fetchall()
            
            memories = []
            for row in rows:
                memory = {
                    "id": row["id"],
                    "title": row["title"],
                    "description": row["description"],
                    "date": row["date"],
                    "location": row["location"],
                    "imageUrl": row["image_url"],
                    "tags": json.loads(row["tags"]) if row["tags"] else [],
                    "familyMembers": json.loads(row["family_members"]) if row["family_members"] else [],
                    "aiAnalysis": json.loads(row["ai_analysis"]) if row["ai_analysis"] else None
                }
                memories.append(memory)
            
            return memories
    
    def update_memory(self, memory_id: str, updates: Dict[str, Any]) -> bool:
        """Update memory"""
        now = datetime.now().isoformat()
        
        with self.get_connection() as conn:
            set_clauses = []
            values = []
            
            for field in ["title", "description", "date", "location"]:
                if field in updates:
                    db_field = "image_url" if field == "imageUrl" else field
                    set_clauses.append(f"{db_field} = ?")
                    values.append(updates[field])
            
            if "imageUrl" in updates:
                set_clauses.append("image_url = ?")
                values.append(updates["imageUrl"])
            
            if "tags" in updates:
                set_clauses.append("tags = ?")
                values.append(json.dumps(updates["tags"]))
            
            if "familyMembers" in updates:
                set_clauses.append("family_members = ?")
                values.append(json.dumps(updates["familyMembers"]))
            
            if "aiAnalysis" in updates:
                set_clauses.append("ai_analysis = ?")
                values.append(json.dumps(updates["aiAnalysis"]))
            
            set_clauses.append("updated_at = ?")
            values.append(now)
            values.append(memory_id)
            
            query = f"UPDATE memories SET {', '.join(set_clauses)} WHERE id = ?"
            
            cursor = conn.execute(query, values)
            conn.commit()
            
            return cursor.rowcount > 0
    
    # Travel Plans operations
    def create_travel_plan(self, plan_data: Dict[str, Any]) -> str:
        """Create a new travel plan"""
        plan_id = str(uuid.uuid4())
        now = datetime.now().isoformat()
        
        with self.get_connection() as conn:
            conn.execute("""
                INSERT INTO travel_plans 
                (id, name, destination, start_date, end_date, budget, participants, activities, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                plan_id,
                plan_data.get("name", ""),
                plan_data.get("destination", ""),
                plan_data.get("startDate", ""),
                plan_data.get("endDate", ""),
                plan_data.get("budget", 0),
                json.dumps(plan_data.get("participants", [])),
                json.dumps(plan_data.get("activities", [])),
                now,
                now
            ))
            conn.commit()
        
        return plan_id
    
    def get_travel_plans(self, family_member_id: str = None) -> List[Dict[str, Any]]:
        """Get travel plans"""
        query = "SELECT * FROM travel_plans"
        params = []
        
        if family_member_id:
            query += " WHERE participants LIKE ?"
            params.append(f'%"{family_member_id}"%')
        
        query += " ORDER BY start_date DESC"
        
        with self.get_connection() as conn:
            cursor = conn.execute(query, params)
            rows = cursor.fetchall()
            
            plans = []
            for row in rows:
                plan = {
                    "id": row["id"],
                    "name": row["name"],
                    "destination": row["destination"],
                    "startDate": row["start_date"],
                    "endDate": row["end_date"],
                    "budget": row["budget"],
                    "participants": json.loads(row["participants"]) if row["participants"] else [],
                    "activities": json.loads(row["activities"]) if row["activities"] else []
                }
                plans.append(plan)
            
            return plans
    
    def update_travel_plan(self, plan_id: str, updates: Dict[str, Any]) -> bool:
        """Update travel plan"""
        now = datetime.now().isoformat()
        
        with self.get_connection() as conn:
            set_clauses = []
            values = []
            
            for field in ["name", "destination", "start_date", "end_date", "budget"]:
                if field in updates:
                    db_field = field
                    if field == "startDate":
                        db_field = "start_date"
                    elif field == "endDate":
                        db_field = "end_date"
                    
                    set_clauses.append(f"{db_field} = ?")
                    values.append(updates[field])
            
            if "participants" in updates:
                set_clauses.append("participants = ?")
                values.append(json.dumps(updates["participants"]))
            
            if "activities" in updates:
                set_clauses.append("activities = ?")
                values.append(json.dumps(updates["activities"]))
            
            set_clauses.append("updated_at = ?")
            values.append(now)
            values.append(plan_id)
            
            query = f"UPDATE travel_plans SET {', '.join(set_clauses)} WHERE id = ?"
            
            cursor = conn.execute(query, values)
            conn.commit()
            
            return cursor.rowcount > 0
    
    # Game Sessions operations
    def create_game_session(self, game_data: Dict[str, Any]) -> str:
        """Create a new game session"""
        game_id = game_data.get("id", str(uuid.uuid4()))
        now = datetime.now().isoformat()
        
        with self.get_connection() as conn:
            conn.execute("""
                INSERT INTO game_sessions 
                (id, game_type, players, status, game_state, settings, current_phase, ai_decisions, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                game_id,
                game_data.get("type", ""),
                json.dumps(game_data.get("players", [])),
                game_data.get("status", "setup"),
                json.dumps(game_data.get("game_state", {})),
                json.dumps(game_data.get("settings", {})),
                game_data.get("current_phase", "setup"),
                json.dumps(game_data.get("ai_decisions", [])),
                now,
                now
            ))
            conn.commit()
        
        return game_id
    
    def get_game_session(self, game_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific game session"""
        with self.get_connection() as conn:
            cursor = conn.execute("SELECT * FROM game_sessions WHERE id = ?", (game_id,))
            row = cursor.fetchone()
            
            if row:
                return {
                    "id": row["id"],
                    "type": row["game_type"],  
                    "players": json.loads(row["players"]) if row["players"] else [],
                    "status": row["status"],
                    "game_state": json.loads(row["game_state"]) if row["game_state"] else {},
                    "settings": json.loads(row["settings"]) if row["settings"] else {},
                    "current_phase": row["current_phase"],
                    "ai_decisions": json.loads(row["ai_decisions"]) if row["ai_decisions"] else [],
                    "created_at": row["created_at"]
                }
            
            return None
    
    def update_game_session(self, game_id: str, updates: Dict[str, Any]) -> bool:
        """Update game session"""
        now = datetime.now().isoformat()
        
        with self.get_connection() as conn:
            set_clauses = []
            values = []
            
            if "players" in updates:
                set_clauses.append("players = ?")
                values.append(json.dumps(updates["players"]))
            
            if "status" in updates:
                set_clauses.append("status = ?")
                values.append(updates["status"])
            
            if "game_state" in updates:
                set_clauses.append("game_state = ?")
                values.append(json.dumps(updates["game_state"]))
            
            if "current_phase" in updates:
                set_clauses.append("current_phase = ?")
                values.append(updates["current_phase"])
            
            if "ai_decisions" in updates:
                set_clauses.append("ai_decisions = ?")
                values.append(json.dumps(updates["ai_decisions"]))
            
            set_clauses.append("updated_at = ?")
            values.append(now)
            values.append(game_id)
            
            query = f"UPDATE game_sessions SET {', '.join(set_clauses)} WHERE id = ?"
            
            cursor = conn.execute(query, values)
            conn.commit()
            
            return cursor.rowcount > 0
    
    def get_active_game_sessions(self) -> List[Dict[str, Any]]:
        """Get all active game sessions"""
        with self.get_connection() as conn:
            cursor = conn.execute("SELECT * FROM game_sessions WHERE status = 'active' ORDER BY created_at DESC")
            rows = cursor.fetchall()
            
            sessions = []
            for row in rows:
                session = {
                    "id": row["id"],
                    "type": row["game_type"],
                    "status": row["status"],
                    "playerCount": len(json.loads(row["players"])) if row["players"] else 0,
                    "createdAt": row["created_at"]
                }
                sessions.append(session)
            
            return sessions
    
    # Cultural Heritage operations
    def save_cultural_heritage(self, heritage_data: Dict[str, Any]) -> str:
        """Save cultural heritage content"""
        heritage_id = str(uuid.uuid4())
        now = datetime.now().isoformat()
        
        with self.get_connection() as conn:
            conn.execute("""
                INSERT INTO cultural_heritage 
                (id, title, title_arabic, description, description_arabic, category, 
                 family_members, cultural_significance, tags, preservation_date, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                heritage_id,
                heritage_data.get("title", ""),
                heritage_data.get("titleArabic", ""),
                heritage_data.get("description", ""),
                heritage_data.get("descriptionArabic", ""),
                heritage_data.get("category", "tradition"),
                json.dumps(heritage_data.get("familyMembers", [])),
                heritage_data.get("culturalSignificance", ""),
                json.dumps(heritage_data.get("tags", [])),
                heritage_data.get("preservationDate", now),
                now,
                now
            ))
            conn.commit()
        
        return heritage_id
    
    def get_cultural_heritage(self, category: str = None) -> List[Dict[str, Any]]:
        """Get cultural heritage content"""
        query = "SELECT * FROM cultural_heritage"
        params = []
        
        if category:
            query += " WHERE category = ?"
            params.append(category)
        
        query += " ORDER BY preservation_date DESC"
        
        with self.get_connection() as conn:
            cursor = conn.execute(query, params)
            rows = cursor.fetchall()
            
            heritage_items = []
            for row in rows:
                item = {
                    "id": row["id"],
                    "title": row["title"],
                    "titleArabic": row["title_arabic"],
                    "description": row["description"],
                    "descriptionArabic": row["description_arabic"],
                    "category": row["category"],
                    "familyMembers": json.loads(row["family_members"]) if row["family_members"] else [],
                    "culturalSignificance": row["cultural_significance"],
                    "tags": json.loads(row["tags"]) if row["tags"] else [],
                    "preservationDate": row["preservation_date"]
                }
                heritage_items.append(item)
            
            return heritage_items

# Global database instance
db = ElmowafyDatabase()