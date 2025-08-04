#!/usr/bin/env python3
"""
Unified Database Adapter for Elmowafiplatform
Handles all database operations for the unified PostgreSQL schema
"""

import os
import json
import uuid
import logging
import time
import threading
from datetime import datetime, timedelta
import psycopg2
from psycopg2.pool import SimpleConnectionPool
from typing import List, Dict, Any, Optional
from psycopg2.extras import RealDictCursor
import asyncio
import contextlib
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)

class ConnectionState(Enum):
    """Connection pool states"""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    RECOVERING = "recovering"

@dataclass
class PoolMetrics:
    """Connection pool metrics"""
    total_connections: int = 0
    active_connections: int = 0
    idle_connections: int = 0
    failed_connections: int = 0
    connection_errors: int = 0
    avg_connection_time: float = 0.0
    last_health_check: datetime = None
    pool_state: ConnectionState = ConnectionState.HEALTHY

class UnifiedDatabase:
    """Unified PostgreSQL database manager for all platform features"""
    
    def __init__(self, database_url: str = None):
        self.database_url = database_url or os.getenv('DATABASE_URL')
        if not self.database_url:
            raise ValueError("DATABASE_URL environment variable is required")
        
        # Initialize connection pool
        self.pool = None
        self.metrics = PoolMetrics()
        self.min_connections = 5
        self.max_connections = 20
        self._initialize_pool()
    
    def _initialize_pool(self):
        """Initialize the connection pool"""
        try:
            # Get pool configuration from environment
            self.min_connections = int(os.getenv('DB_MIN_CONNECTIONS', '5'))
            self.max_connections = int(os.getenv('DB_MAX_CONNECTIONS', '20'))
            
            self.pool = SimpleConnectionPool(
                minconn=self.min_connections,
                maxconn=self.max_connections,
                dsn=self.database_url
            )
            
            # Update metrics
            self.metrics.total_connections = self.max_connections
            self.metrics.idle_connections = self.min_connections
            self.metrics.pool_state = ConnectionState.HEALTHY
            self.metrics.last_health_check = datetime.now()
            
            logger.info(f"Database connection pool initialized: {self.min_connections}-{self.max_connections} connections")
        except Exception as e:
            self.metrics.pool_state = ConnectionState.UNHEALTHY
            self.metrics.connection_errors += 1
            logger.error(f"Failed to initialize connection pool: {e}")
            raise
    
    def get_connection(self):
        """Get database connection from pool"""
        try:
            if self.pool is None:
                self._initialize_pool()
            return self.pool.getconn()
        except Exception as e:
            logger.error(f"Failed to get connection from pool: {e}")
            return None
    
    def return_connection(self, conn):
        """Return connection to pool"""
        try:
            if conn and self.pool:
                self.pool.putconn(conn)
        except Exception as e:
            logger.error(f"Failed to return connection to pool: {e}")
    
    @contextlib.contextmanager
    def get_db_connection(self):
        """Context manager for database connections"""
        conn = None
        try:
            conn = self.get_connection()
            if conn:
                yield conn
            else:
                raise Exception("Failed to get database connection")
        except Exception as e:
            logger.error(f"Database connection error: {e}")
            raise
        finally:
            if conn:
                self.return_connection(conn)
    
    def close_pool(self):
        """Close the connection pool"""
        if self.pool:
            self.pool.closeall()
            logger.info("Database connection pool closed")
    
    def get_pool_health(self) -> Dict[str, Any]:
        """Get pool health status"""
        try:
            # Update metrics before returning
            self.metrics.last_health_check = datetime.now()
            
            # Try to get a connection to test pool health
            if self.pool:
                try:
                    conn = self.pool.getconn()
                    if conn:
                        self.pool.putconn(conn)
                        self.metrics.pool_state = ConnectionState.HEALTHY
                except Exception as e:
                    logger.warning(f"Pool health check failed: {e}")
                    self.metrics.pool_state = ConnectionState.DEGRADED
                    self.metrics.connection_errors += 1
            else:
                self.metrics.pool_state = ConnectionState.UNHEALTHY
            
            return {
                "state": self.metrics.pool_state.value,
                "total_connections": self.metrics.total_connections,
                "active_connections": self.metrics.active_connections,
                "idle_connections": self.metrics.idle_connections,
                "failed_connections": self.metrics.failed_connections,
                "connection_errors": self.metrics.connection_errors,
                "avg_connection_time": self.metrics.avg_connection_time,
                "last_health_check": self.metrics.last_health_check.isoformat() if self.metrics.last_health_check else None,
                "min_connections": self.min_connections,
                "max_connections": self.max_connections
            }
        except Exception as e:
            logger.error(f"Error getting pool health: {e}")
            return {
                "state": ConnectionState.UNHEALTHY.value,
                "error": str(e),
                "last_health_check": datetime.now().isoformat()
            }

    # ============================================================================
    # USER AND FAMILY MANAGEMENT
    # ============================================================================
    
    def create_user(self, user_data: Dict[str, Any]) -> str:
        """Create a new user"""
        user_id = str(uuid.uuid4())
        
        try:
            with self.get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("""
                        INSERT INTO users (id, email, username, display_name, password_hash, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        RETURNING id
                    """, (
                        user_id,
                        user_data['email'],
                        user_data.get('username'),
                        user_data.get('display_name'),
                        user_data['password_hash'],
                        datetime.now().isoformat(),
                        datetime.now().isoformat()
                    ))
                    
                    result = cur.fetchone()
                    conn.commit()
                    return result['id'] if result else user_id
                    
        except Exception as e:
            logger.error(f"Error creating user: {e}")
            return None
    
    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user by email"""
        try:
            with self.get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("""
                        SELECT * FROM users WHERE email = %s
                    """, (email,))
                    
                    result = cur.fetchone()
                    return dict(result) if result else None
                    
        except Exception as e:
            logger.error(f"Error getting user: {e}")
            return None
    
    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID"""
        try:
            with self.get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("""
                        SELECT * FROM users WHERE id = %s
                    """, (user_id,))
                    
                    result = cur.fetchone()
                    return dict(result) if result else None
                    
        except Exception as e:
            logger.error(f"Error getting user by ID: {e}")
            return None
    
    def update_user_last_login(self, user_id: str) -> bool:
        """Update user's last login timestamp"""
        try:
            with self.get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        UPDATE users SET last_login_at = %s WHERE id = %s
                    """, (datetime.now(), user_id))
                    
                    conn.commit()
                    return cur.rowcount > 0
                    
        except Exception as e:
            logger.error(f"Error updating last login: {e}")
            return False
    
    def get_user_family_groups(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all family groups for a user"""
        try:
            with self.get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("""
                        SELECT fg.id, fg.name, fg.description, fgm.role, fgm.joined_at
                        FROM family_groups fg
                        JOIN family_group_members fgm ON fg.id = fgm.family_group_id
                        JOIN family_members fm ON fgm.family_member_id = fm.id
                        WHERE fm.user_id = %s
                        ORDER BY fgm.joined_at DESC
                    """, (user_id,))
                    
                    results = cur.fetchall()
                    return [dict(row) for row in results]
                    
        except Exception as e:
            logger.error(f"Error getting user family groups: {e}")
            return []
    
    def get_user_roles(self, user_id: str) -> List[str]:
        """Get all roles for a user across family groups"""
        try:
            with self.get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("""
                        SELECT DISTINCT fgm.role
                        FROM family_group_members fgm
                        JOIN family_members fm ON fgm.family_member_id = fm.id
                        WHERE fm.user_id = %s
                    """, (user_id,))
                    
                    results = cur.fetchall()
                    roles = [row['role'] for row in results]
                    return roles if roles else ['member']
                    
        except Exception as e:
            logger.error(f"Error getting user roles: {e}")
            return ['member']
    
    def create_family_group(self, group_data: Dict[str, Any]) -> str:
        """Create a new family group"""
        group_id = str(uuid.uuid4())
        
        try:
            with self.get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("""
                        INSERT INTO family_groups (id, name, description, owner_id, settings, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        RETURNING id
                    """, (
                        group_id,
                        group_data['name'],
                        group_data.get('description', ''),
                        group_data['owner_id'],
                        json.dumps(group_data.get('settings', {})),
                        datetime.now(),
                        datetime.now()
                    ))
                    
                    result = cur.fetchone()
                    conn.commit()
                    return result['id'] if result else group_id
                    
        except Exception as e:
            logger.error(f"Error creating family group: {e}")
            return None
    
    def add_family_member_to_group(self, family_group_id: str, family_member_id: str, role: str = 'member') -> bool:
        """Add family member to family group"""
        try:
            with self.get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO family_group_members (id, family_group_id, family_member_id, role, joined_at)
                        VALUES (%s, %s, %s, %s, %s)
                        ON CONFLICT (family_group_id, family_member_id) DO UPDATE SET role = %s
                    """, (
                        str(uuid.uuid4()),
                        family_group_id,
                        family_member_id,
                        role,
                        datetime.now(),
                        role
                    ))
                    
                    conn.commit()
                    return cur.rowcount > 0
                    
        except Exception as e:
            logger.error(f"Error adding family member to group: {e}")
            return False
    
    def create_family_member(self, member_data: Dict[str, Any]) -> str:
        """Create a new family member"""
        member_id = str(uuid.uuid4())
        
        try:
            with self.get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("""
                        INSERT INTO family_members (id, user_id, name, name_arabic, birth_date, 
                                                  location, avatar, relationships, role, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        RETURNING id
                    """, (
                        member_id,
                        member_data.get('user_id'),
                        member_data['name'],
                        member_data.get('name_arabic'),
                        member_data.get('birth_date'),
                        member_data.get('location'),
                        member_data.get('avatar'),
                        json.dumps(member_data.get('relationships', {})),
                        member_data.get('role', 'member'),
                        datetime.now().isoformat(),
                        datetime.now().isoformat()
                    ))
                    
                    result = cur.fetchone()
                    conn.commit()
                    return result['id'] if result else member_id
                    
        except Exception as e:
            logger.error(f"Error creating family member: {e}")
            return None
    
    def get_family_members(self, family_group_id: str = None) -> List[Dict[str, Any]]:
        """Get family members, optionally filtered by family group"""
        try:
            with self.get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    if family_group_id:
                        cur.execute("""
                            SELECT fm.* FROM family_members fm
                            JOIN family_group_members fgm ON fm.id = fgm.family_member_id
                            WHERE fgm.family_group_id = %s
                            ORDER BY fm.name
                        """, (family_group_id,))
                    else:
                        cur.execute("""
                            SELECT * FROM family_members ORDER BY name
                        """)
                    
                    results = cur.fetchall()
                    return [dict(row) for row in results]
                    
        except Exception as e:
            logger.error(f"Error getting family members: {e}")
            return []
    
    def create_family_group(self, group_data: Dict[str, Any]) -> str:
        """Create a new family group"""
        group_id = str(uuid.uuid4())
        
        try:
            with self.get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("""
                        INSERT INTO family_groups (id, name, description, owner_id, settings, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        RETURNING id
                    """, (
                        group_id,
                        group_data['name'],
                        group_data.get('description'),
                        group_data.get('owner_id'),
                        json.dumps(group_data.get('settings', {})),
                        datetime.now().isoformat(),
                        datetime.now().isoformat()
                    ))
                    
                    result = cur.fetchone()
                    conn.commit()
                    return result['id'] if result else group_id
                    
        except Exception as e:
            logger.error(f"Error creating family group: {e}")
            return None
    
    # ============================================================================
    # MEMORY AND PHOTO MANAGEMENT
    # ============================================================================
    
    def create_memory(self, memory_data: Dict[str, Any]) -> str:
        """Create a new memory (photo, video, story)"""
        memory_id = str(uuid.uuid4())
        
        try:
            with self.get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("""
                        INSERT INTO memories (id, family_group_id, title, description, date, 
                                           location, image_url, thumbnail_url, tags, family_members,
                                           ai_analysis, memory_type, privacy_level, created_by,
                                           created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        RETURNING id
                    """, (
                        memory_id,
                        memory_data['family_group_id'],
                        memory_data['title'],
                        memory_data.get('description'),
                        memory_data['date'],
                        memory_data.get('location'),
                        memory_data.get('image_url'),
                        memory_data.get('thumbnail_url'),
                        json.dumps(memory_data.get('tags', [])),
                        json.dumps(memory_data.get('family_members', [])),
                        json.dumps(memory_data.get('ai_analysis', {})),
                        memory_data.get('memory_type', 'photo'),
                        memory_data.get('privacy_level', 'family'),
                        memory_data.get('created_by'),
                        datetime.now().isoformat(),
                        datetime.now().isoformat()
                    ))
                    
                    result = cur.fetchone()
                    conn.commit()
                    return result['id'] if result else memory_id
                    
        except Exception as e:
            logger.error(f"Error creating memory: {e}")
            return None
    
    def get_memories(self, family_group_id: str = None, filters: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """Get memories with optional filtering"""
        try:
            with self.get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    query = "SELECT * FROM memories WHERE 1=1"
                    params = []
                    
                    if family_group_id:
                        query += " AND family_group_id = %s"
                        params.append(family_group_id)
                    
                    if filters:
                        if filters.get('date_from'):
                            query += " AND date >= %s"
                            params.append(filters['date_from'])
                        
                        if filters.get('date_to'):
                            query += " AND date <= %s"
                            params.append(filters['date_to'])
                        
                        if filters.get('memory_type'):
                            query += " AND memory_type = %s"
                            params.append(filters['memory_type'])
                        
                        if filters.get('tags'):
                            # Search for memories containing any of the specified tags
                            tag_conditions = []
                            for tag in filters['tags']:
                                tag_conditions.append("tags::text ILIKE %s")
                                params.append(f'%"{tag}"%')
                            query += f" AND ({' OR '.join(tag_conditions)})"
                    
                    query += " ORDER BY date DESC"
                    
                    cur.execute(query, params)
                    results = cur.fetchall()
                    return [dict(row) for row in results]
                    
        except Exception as e:
            logger.error(f"Error getting memories: {e}")
            return []
    
    def create_album(self, album_data: Dict[str, Any]) -> str:
        """Create a new album"""
        album_id = str(uuid.uuid4())
        
        try:
            with self.get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("""
                        INSERT INTO albums (id, family_group_id, name, description, cover_memory_id,
                                         album_type, clustering_algorithm, family_members, tags,
                                         created_by, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        RETURNING id
                    """, (
                        album_id,
                        album_data['family_group_id'],
                        album_data['name'],
                        album_data.get('description'),
                        album_data.get('cover_memory_id'),
                        album_data.get('album_type', 'manual'),
                        album_data.get('clustering_algorithm'),
                        json.dumps(album_data.get('family_members', [])),
                        json.dumps(album_data.get('tags', [])),
                        album_data.get('created_by'),
                        datetime.now().isoformat(),
                        datetime.now().isoformat()
                    ))
                    
                    result = cur.fetchone()
                    conn.commit()
                    return result['id'] if result else album_id
                    
        except Exception as e:
            logger.error(f"Error creating album: {e}")
            return None
    
    def add_memory_to_album(self, album_id: str, memory_id: str, position: int = None) -> bool:
        """Add a memory to an album"""
        try:
            with self.get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    if position is None:
                        # Get the next position
                        cur.execute("""
                            SELECT COALESCE(MAX(position), 0) + 1 as next_position
                            FROM album_memories WHERE album_id = %s
                        """, (album_id,))
                        result = cur.fetchone()
                        position = result['next_position'] if result else 1
                    
                    cur.execute("""
                        INSERT INTO album_memories (id, album_id, memory_id, position, added_at)
                        VALUES (%s, %s, %s, %s, %s)
                        ON CONFLICT (album_id, memory_id) DO NOTHING
                    """, (
                        str(uuid.uuid4()),
                        album_id,
                        memory_id,
                        position,
                        datetime.now().isoformat()
                    ))
                    
                    conn.commit()
                    return True
                    
        except Exception as e:
            logger.error(f"Error adding memory to album: {e}")
            return False
    
    # ============================================================================
    # BUDGET MANAGEMENT
    # ============================================================================
    
    def create_budget_profile(self, profile_data: Dict[str, Any]) -> str:
        """Create a new budget profile"""
        profile_id = str(uuid.uuid4())
        
        try:
            with self.get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("""
                        INSERT INTO budget_profiles (id, family_group_id, name, description, currency, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        RETURNING id
                    """, (
                        profile_id,
                        profile_data['family_group_id'],
                        profile_data['name'],
                        profile_data.get('description'),
                        profile_data.get('currency', 'USD'),
                        datetime.now().isoformat(),
                        datetime.now().isoformat()
                    ))
                    
                    result = cur.fetchone()
                    conn.commit()
                    return result['id'] if result else profile_id
                    
        except Exception as e:
            logger.error(f"Error creating budget profile: {e}")
            return None
    
    def create_budget_envelope(self, envelope_data: Dict[str, Any]) -> str:
        """Create a new budget envelope (category)"""
        envelope_id = str(uuid.uuid4())
        
        try:
            with self.get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("""
                        INSERT INTO budget_envelopes (id, budget_profile_id, name, amount, spent, category, color, icon, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        RETURNING id
                    """, (
                        envelope_id,
                        envelope_data['budget_profile_id'],
                        envelope_data['name'],
                        envelope_data.get('amount', 0),
                        envelope_data.get('spent', 0),
                        envelope_data.get('category'),
                        envelope_data.get('color'),
                        envelope_data.get('icon'),
                        datetime.now().isoformat(),
                        datetime.now().isoformat()
                    ))
                    
                    result = cur.fetchone()
                    conn.commit()
                    return result['id'] if result else envelope_id
                    
        except Exception as e:
            logger.error(f"Error creating budget envelope: {e}")
            return None
    
    def add_budget_transaction(self, transaction_data: Dict[str, Any]) -> str:
        """Add a new budget transaction"""
        transaction_id = str(uuid.uuid4())
        
        try:
            with self.get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("""
                        INSERT INTO budget_transactions (id, budget_profile_id, envelope_id, family_member_id,
                                                      description, amount, transaction_type, date, location,
                                                      receipt_url, tags, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        RETURNING id
                    """, (
                        transaction_id,
                        transaction_data['budget_profile_id'],
                        transaction_data.get('envelope_id'),
                        transaction_data.get('family_member_id'),
                        transaction_data['description'],
                        transaction_data['amount'],
                        transaction_data['transaction_type'],
                        transaction_data['date'],
                        transaction_data.get('location'),
                        transaction_data.get('receipt_url'),
                        json.dumps(transaction_data.get('tags', [])),
                        datetime.now().isoformat(),
                        datetime.now().isoformat()
                    ))
                    
                    # Update envelope spent amount if this is an expense
                    if transaction_data['transaction_type'] == 'EXPENSE' and transaction_data.get('envelope_id'):
                        cur.execute("""
                            UPDATE budget_envelopes 
                            SET spent = spent + %s, updated_at = %s
                            WHERE id = %s
                        """, (
                            transaction_data['amount'],
                            datetime.now().isoformat(),
                            transaction_data['envelope_id']
                        ))
                    
                    result = cur.fetchone()
                    conn.commit()
                    return result['id'] if result else transaction_id
                    
        except Exception as e:
            logger.error(f"Error adding budget transaction: {e}")
            return None
    
    def get_budget_summary(self, budget_profile_id: str) -> Dict[str, Any]:
        """Get budget summary with envelopes and recent transactions"""
        try:
            with self.get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    # Get budget profile
                    cur.execute("""
                        SELECT * FROM budget_profiles WHERE id = %s
                    """, (budget_profile_id,))
                    profile = cur.fetchone()
                    
                    if not profile:
                        return {}
                    
                    # Get envelopes
                    cur.execute("""
                        SELECT * FROM budget_envelopes 
                        WHERE budget_profile_id = %s AND is_archived = false
                        ORDER BY name
                    """, (budget_profile_id,))
                    envelopes = cur.fetchall()
                    
                    # Get recent transactions
                    cur.execute("""
                        SELECT bt.*, be.name as envelope_name 
                        FROM budget_transactions bt
                        LEFT JOIN budget_envelopes be ON bt.envelope_id = be.id
                        WHERE bt.budget_profile_id = %s 
                        ORDER BY bt.date DESC 
                        LIMIT 20
                    """, (budget_profile_id,))
                    transactions = cur.fetchall()
                    
                    # Calculate totals
                    total_budgeted = sum(float(env['amount']) for env in envelopes)
                    total_spent = sum(float(env['spent']) for env in envelopes)
                    remaining = total_budgeted - total_spent
                    
                    return {
                        'profile': dict(profile),
                        'envelopes': [dict(env) for env in envelopes],
                        'transactions': [dict(txn) for txn in transactions],
                        'summary': {
                            'total_budgeted': total_budgeted,
                            'total_spent': total_spent,
                            'remaining': remaining,
                            'envelope_count': len(envelopes),
                            'transaction_count': len(transactions)
                        }
                    }
                    
        except Exception as e:
            logger.error(f"Error getting budget summary: {e}")
            return {}
    
    # ============================================================================
    # GAME SESSION MANAGEMENT
    # ============================================================================
    
    def create_game_session(self, session_data: Dict[str, Any]) -> str:
        """Create a new game session"""
        session_id = str(uuid.uuid4())
        
        try:
            with self.get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("""
                        INSERT INTO game_sessions (id, family_group_id, game_type, title, description,
                                                players, status, game_state, settings, current_phase,
                                                ai_decisions, score_data, created_by, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        RETURNING id
                    """, (
                        session_id,
                        session_data['family_group_id'],
                        session_data['game_type'],
                        session_data.get('title'),
                        session_data.get('description'),
                        json.dumps(session_data['players']),
                        session_data.get('status', 'active'),
                        json.dumps(session_data.get('game_state', {})),
                        json.dumps(session_data.get('settings', {})),
                        session_data.get('current_phase'),
                        json.dumps(session_data.get('ai_decisions', [])),
                        json.dumps(session_data.get('score_data', {})),
                        session_data.get('created_by'),
                        datetime.now().isoformat(),
                        datetime.now().isoformat()
                    ))
                    
                    result = cur.fetchone()
                    conn.commit()
                    return result['id'] if result else session_id
                    
        except Exception as e:
            logger.error(f"Error creating game session: {e}")
            return None
    
    def update_game_session(self, session_id: str, updates: Dict[str, Any]) -> bool:
        """Update a game session"""
        try:
            with self.get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    # Build dynamic update query
                    set_clauses = []
                    params = []
                    
                    for key, value in updates.items():
                        if key in ['game_state', 'settings', 'ai_decisions', 'score_data', 'players']:
                            set_clauses.append(f"{key} = %s")
                            params.append(json.dumps(value))
                        else:
                            set_clauses.append(f"{key} = %s")
                            params.append(value)
                    
                    set_clauses.append("updated_at = %s")
                    params.append(datetime.now().isoformat())
                    params.append(session_id)
                    
                    query = f"UPDATE game_sessions SET {', '.join(set_clauses)} WHERE id = %s"
                    cur.execute(query, params)
                    
                    conn.commit()
                    return cur.rowcount > 0
                    
        except Exception as e:
            logger.error(f"Error updating game session: {e}")
            return False
    
    def get_active_game_sessions(self, family_group_id: str = None) -> List[Dict[str, Any]]:
        """Get active game sessions"""
        try:
            with self.get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    if family_group_id:
                        cur.execute("""
                            SELECT * FROM game_sessions 
                            WHERE family_group_id = %s AND status = 'active'
                            ORDER BY created_at DESC
                        """, (family_group_id,))
                    else:
                        cur.execute("""
                            SELECT * FROM game_sessions 
                            WHERE status = 'active'
                            ORDER BY created_at DESC
                        """)
                    
                    results = cur.fetchall()
                    return [dict(row) for row in results]
                    
        except Exception as e:
            logger.error(f"Error getting active game sessions: {e}")
            return []
    
    # ============================================================================
    # TRAVEL PLANNING
    # ============================================================================
    
    def create_travel_plan(self, plan_data: Dict[str, Any]) -> str:
        """Create a new travel plan"""
        plan_id = str(uuid.uuid4())
        
        try:
            with self.get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("""
                        INSERT INTO travel_plans (id, family_group_id, name, destination, start_date,
                                               end_date, budget, budget_profile_id, participants,
                                               activities, status, created_by, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        RETURNING id
                    """, (
                        plan_id,
                        plan_data['family_group_id'],
                        plan_data['name'],
                        plan_data['destination'],
                        plan_data['start_date'],
                        plan_data['end_date'],
                        plan_data.get('budget'),
                        plan_data.get('budget_profile_id'),
                        json.dumps(plan_data.get('participants', [])),
                        json.dumps(plan_data.get('activities', [])),
                        plan_data.get('status', 'planning'),
                        plan_data.get('created_by'),
                        datetime.now().isoformat(),
                        datetime.now().isoformat()
                    ))
                    
                    result = cur.fetchone()
                    conn.commit()
                    return result['id'] if result else plan_id
                    
        except Exception as e:
            logger.error(f"Error creating travel plan: {e}")
            return None
    
    def get_travel_plans(self, family_group_id: str = None) -> List[Dict[str, Any]]:
        """Get travel plans"""
        try:
            with self.get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    if family_group_id:
                        cur.execute("""
                            SELECT * FROM travel_plans 
                            WHERE family_group_id = %s
                            ORDER BY start_date DESC
                        """, (family_group_id,))
                    else:
                        cur.execute("""
                            SELECT * FROM travel_plans 
                            ORDER BY start_date DESC
                        """)
                    
                    results = cur.fetchall()
                    return [dict(row) for row in results]
                    
        except Exception as e:
            logger.error(f"Error getting travel plans: {e}")
            return []
    
    # ============================================================================
    # CULTURAL HERITAGE
    # ============================================================================
    
    def save_cultural_heritage(self, heritage_data: Dict[str, Any]) -> str:
        """Save cultural heritage item"""
        heritage_id = str(uuid.uuid4())
        
        try:
            with self.get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("""
                        INSERT INTO cultural_heritage (id, family_group_id, title, title_arabic,
                                                    description, description_arabic, category,
                                                    family_members, cultural_significance, tags,
                                                    preservation_date, media_urls, created_by,
                                                    created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        RETURNING id
                    """, (
                        heritage_id,
                        heritage_data['family_group_id'],
                        heritage_data['title'],
                        heritage_data.get('title_arabic'),
                        heritage_data.get('description'),
                        heritage_data.get('description_arabic'),
                        heritage_data.get('category'),
                        json.dumps(heritage_data.get('family_members', [])),
                        heritage_data.get('cultural_significance'),
                        json.dumps(heritage_data.get('tags', [])),
                        heritage_data.get('preservation_date'),
                        json.dumps(heritage_data.get('media_urls', [])),
                        heritage_data.get('created_by'),
                        datetime.now().isoformat(),
                        datetime.now().isoformat()
                    ))
                    
                    result = cur.fetchone()
                    conn.commit()
                    return result['id'] if result else heritage_id
                    
        except Exception as e:
            logger.error(f"Error saving cultural heritage: {e}")
            return None
    
    def get_cultural_heritage(self, family_group_id: str = None, category: str = None) -> List[Dict[str, Any]]:
        """Get cultural heritage items"""
        try:
            with self.get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    query = "SELECT * FROM cultural_heritage WHERE 1=1"
                    params = []
                    
                    if family_group_id:
                        query += " AND family_group_id = %s"
                        params.append(family_group_id)
                    
                    if category:
                        query += " AND category = %s"
                        params.append(category)
                    
                    query += " ORDER BY created_at DESC"
                    
                    cur.execute(query, params)
                    results = cur.fetchall()
                    return [dict(row) for row in results]
                    
        except Exception as e:
            logger.error(f"Error getting cultural heritage: {e}")
            return []
    
    # ============================================================================
    # ANALYTICS AND DASHBOARD
    # ============================================================================
    
    def get_family_dashboard(self, family_group_id: str) -> Dict[str, Any]:
        """Get family dashboard data"""
        try:
            with self.get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    # Get dashboard view data
                    cur.execute("""
                        SELECT * FROM family_dashboard WHERE family_group_id = %s
                    """, (family_group_id,))
                    dashboard = cur.fetchone()
                    
                    # Get recent memories
                    cur.execute("""
                        SELECT * FROM memories 
                        WHERE family_group_id = %s 
                        ORDER BY created_at DESC 
                        LIMIT 5
                    """, (family_group_id,))
                    recent_memories = cur.fetchall()
                    
                    # Get budget summary
                    cur.execute("""
                        SELECT * FROM budget_summary 
                        WHERE budget_profile_id IN (
                            SELECT id FROM budget_profiles WHERE family_group_id = %s
                        )
                    """, (family_group_id,))
                    budget_summary = cur.fetchall()
                    
                    return {
                        'dashboard': dict(dashboard) if dashboard else {},
                        'recent_memories': [dict(memory) for memory in recent_memories],
                        'budget_summary': [dict(budget) for budget in budget_summary]
                    }
                    
        except Exception as e:
            logger.error(f"Error getting family dashboard: {e}")
            return {}
    
    def get_memory_analytics(self, family_group_id: str) -> List[Dict[str, Any]]:
        """Get memory analytics"""
        try:
            with self.get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("""
                        SELECT * FROM memory_analytics 
                        WHERE family_group_id = %s
                        ORDER BY month DESC
                        LIMIT 12
                    """, (family_group_id,))
                    
                    results = cur.fetchall()
                    return [dict(row) for row in results]
                    
        except Exception as e:
            logger.error(f"Error getting memory analytics: {e}")
            return []

# Global database instance
unified_db = None

def get_unified_database() -> UnifiedDatabase:
    """Get the global unified database instance"""
    global unified_db
    if unified_db is None:
        unified_db = UnifiedDatabase()
    return unified_db

def close_database_pool():
    """Close the database connection pool"""
    global unified_db
    if unified_db:
        unified_db.close_pool() 