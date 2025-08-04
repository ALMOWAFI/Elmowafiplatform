#!/usr/bin/env python3
"""
Enhanced Database Adapter for Elmowafiplatform
Improved connection pooling, health monitoring, and error handling
"""

import os
import json
import uuid
import logging
import time
import threading
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
import psycopg2
from psycopg2.pool import SimpleConnectionPool
from psycopg2.extras import RealDictCursor
from psycopg2.extensions import connection
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

class EnhancedUnifiedDatabase:
    """Enhanced PostgreSQL database manager with improved connection pooling"""
    
    def __init__(self, database_url: str = None):
        self.database_url = database_url or os.getenv('DATABASE_URL')
        if not self.database_url:
            raise ValueError("DATABASE_URL environment variable is required")
        
        # Pool configuration
        self.min_connections = int(os.getenv('DB_MIN_CONNECTIONS', '5'))
        self.max_connections = int(os.getenv('DB_MAX_CONNECTIONS', '20'))
        self.connection_timeout = int(os.getenv('DB_CONNECTION_TIMEOUT', '30'))
        self.health_check_interval = int(os.getenv('DB_HEALTH_CHECK_INTERVAL', '60'))
        
        # Initialize pool and metrics
        self.pool = None
        self.metrics = PoolMetrics()
        self.pool_lock = threading.Lock()
        self.last_health_check = None
        self.health_check_thread = None
        self.shutdown_event = threading.Event()
        
        # Initialize pool
        self._initialize_pool()
        self._start_health_monitoring()
        
        logger.info(f"Enhanced database initialized with pool: {self.min_connections}-{self.max_connections}")
    
    def _initialize_pool(self):
        """Initialize the connection pool with error handling"""
        try:
            with self.pool_lock:
                if self.pool:
                    self.pool.closeall()
                
                self.pool = SimpleConnectionPool(
                    minconn=self.min_connections,
                    maxconn=self.max_connections,
                    dsn=self.database_url,
                    connect_timeout=self.connection_timeout
                )
                
                # Test initial connections
                self._test_pool_connections()
                
                logger.info(f"Connection pool initialized successfully: {self.min_connections}-{self.max_connections}")
                self.metrics.pool_state = ConnectionState.HEALTHY
                
        except Exception as e:
            logger.error(f"Failed to initialize connection pool: {e}")
            self.metrics.pool_state = ConnectionState.UNHEALTHY
            self.metrics.connection_errors += 1
            raise
    
    def _test_pool_connections(self):
        """Test pool connections to ensure they work"""
        test_connections = []
        try:
            # Test a few connections
            for _ in range(min(3, self.min_connections)):
                conn = self.pool.getconn()
                with conn.cursor() as cur:
                    cur.execute("SELECT 1")
                    result = cur.fetchone()
                    if result and result[0] == 1:
                        test_connections.append(conn)
                    else:
                        conn.close()
                        raise Exception("Connection test failed")
            
            # Return test connections to pool
            for conn in test_connections:
                self.pool.putconn(conn)
                
            logger.info("Pool connection test passed")
            
        except Exception as e:
            logger.error(f"Pool connection test failed: {e}")
            # Close any test connections
            for conn in test_connections:
                try:
                    conn.close()
                except:
                    pass
            raise
    
    def _start_health_monitoring(self):
        """Start background health monitoring"""
        def health_monitor():
            while not self.shutdown_event.is_set():
                try:
                    self._perform_health_check()
                    time.sleep(self.health_check_interval)
                except Exception as e:
                    logger.error(f"Health monitoring error: {e}")
                    time.sleep(10)  # Shorter sleep on error
        
        self.health_check_thread = threading.Thread(target=health_monitor, daemon=True)
        self.health_check_thread.start()
        logger.info("Health monitoring started")
    
    def _perform_health_check(self):
        """Perform health check on the connection pool"""
        try:
            with self.pool_lock:
                if not self.pool:
                    self.metrics.pool_state = ConnectionState.UNHEALTHY
                    return
                
                # Test a connection
                conn = self.pool.getconn()
                try:
                    with conn.cursor() as cur:
                        cur.execute("SELECT 1")
                        result = cur.fetchone()
                        if result and result[0] == 1:
                            self.metrics.pool_state = ConnectionState.HEALTHY
                            self.metrics.last_health_check = datetime.now()
                        else:
                            self.metrics.pool_state = ConnectionState.DEGRADED
                finally:
                    self.pool.putconn(conn)
                
                # Update metrics
                self._update_pool_metrics()
                
        except Exception as e:
            logger.warning(f"Health check failed: {e}")
            self.metrics.pool_state = ConnectionState.DEGRADED
            self.metrics.connection_errors += 1
    
    def _update_pool_metrics(self):
        """Update pool metrics"""
        try:
            if self.pool:
                self.metrics.total_connections = self.pool.maxconn
                self.metrics.active_connections = self.pool.maxconn - self.pool.idle
                self.metrics.idle_connections = self.pool.idle
        except Exception as e:
            logger.error(f"Failed to update pool metrics: {e}")
    
    def get_connection(self) -> Optional[connection]:
        """Get database connection from pool with enhanced error handling"""
        start_time = time.time()
        
        try:
            with self.pool_lock:
                if not self.pool:
                    self._initialize_pool()
                
                if self.metrics.pool_state == ConnectionState.UNHEALTHY:
                    logger.warning("Attempting to get connection from unhealthy pool")
                    self._attempt_pool_recovery()
                
                conn = self.pool.getconn()
                
                # Test connection
                with conn.cursor() as cur:
                    cur.execute("SELECT 1")
                    result = cur.fetchone()
                    if not result or result[0] != 1:
                        raise Exception("Connection test failed")
                
                # Update metrics
                connection_time = time.time() - start_time
                self.metrics.avg_connection_time = (
                    (self.metrics.avg_connection_time + connection_time) / 2
                )
                
                logger.debug(f"Connection obtained in {connection_time:.3f}s")
                return conn
                
        except Exception as e:
            connection_time = time.time() - start_time
            self.metrics.failed_connections += 1
            self.metrics.connection_errors += 1
            
            logger.error(f"Failed to get connection after {connection_time:.3f}s: {e}")
            
            # Attempt recovery if needed
            if self.metrics.pool_state == ConnectionState.HEALTHY:
                self.metrics.pool_state = ConnectionState.DEGRADED
            
            return None
    
    def return_connection(self, conn: connection):
        """Return connection to pool with error handling"""
        try:
            if conn and self.pool:
                # Test connection before returning
                try:
                    with conn.cursor() as cur:
                        cur.execute("SELECT 1")
                except:
                    # Connection is bad, close it instead of returning
                    conn.close()
                    logger.warning("Closed bad connection instead of returning to pool")
                    return
                
                self.pool.putconn(conn)
                logger.debug("Connection returned to pool")
                
        except Exception as e:
            logger.error(f"Failed to return connection to pool: {e}")
            try:
                conn.close()
            except:
                pass
    
    def _attempt_pool_recovery(self):
        """Attempt to recover the connection pool"""
        try:
            logger.info("Attempting pool recovery...")
            self.metrics.pool_state = ConnectionState.RECOVERING
            
            # Reinitialize pool
            self._initialize_pool()
            
            # Test recovery
            test_conn = self.get_connection()
            if test_conn:
                self.return_connection(test_conn)
                self.metrics.pool_state = ConnectionState.HEALTHY
                logger.info("Pool recovery successful")
            else:
                self.metrics.pool_state = ConnectionState.UNHEALTHY
                logger.error("Pool recovery failed")
                
        except Exception as e:
            logger.error(f"Pool recovery failed: {e}")
            self.metrics.pool_state = ConnectionState.UNHEALTHY
    
    @contextlib.contextmanager
    def get_db_connection(self):
        """Enhanced context manager for database connections"""
        conn = None
        start_time = time.time()
        
        try:
            conn = self.get_connection()
            if not conn:
                raise Exception("Failed to get database connection")
            
            yield conn
            
        except Exception as e:
            logger.error(f"Database connection error: {e}")
            if conn:
                try:
                    conn.rollback()
                except:
                    pass
            raise
            
        finally:
            if conn:
                self.return_connection(conn)
            
            # Log slow connections
            duration = time.time() - start_time
            if duration > 1.0:  # Log connections taking more than 1 second
                logger.warning(f"Slow database operation: {duration:.3f}s")
    
    def get_pool_health(self) -> Dict[str, Any]:
        """Get pool health status"""
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
    
    def close_pool(self):
        """Close the connection pool and stop monitoring"""
        try:
            self.shutdown_event.set()
            
            if self.health_check_thread:
                self.health_check_thread.join(timeout=5)
            
            if self.pool:
                self.pool.closeall()
                logger.info("Database connection pool closed")
                
        except Exception as e:
            logger.error(f"Error closing pool: {e}")
    
    # ============================================================================
    # ENHANCED DATABASE OPERATIONS WITH ERROR HANDLING
    # ============================================================================
    
    def execute_with_retry(self, operation_name: str, operation_func, max_retries: int = 3):
        """Execute database operation with retry logic"""
        last_error = None
        
        for attempt in range(max_retries):
            try:
                return operation_func()
                
            except psycopg2.OperationalError as e:
                last_error = e
                logger.warning(f"Database operational error in {operation_name} (attempt {attempt + 1}): {e}")
                
                if attempt < max_retries - 1:
                    time.sleep(0.1 * (2 ** attempt))  # Exponential backoff
                    continue
                    
            except psycopg2.Error as e:
                last_error = e
                logger.error(f"Database error in {operation_name}: {e}")
                break
                
            except Exception as e:
                last_error = e
                logger.error(f"Unexpected error in {operation_name}: {e}")
                break
        
        raise last_error
    
    def create_user(self, user_data: Dict[str, Any]) -> str:
        """Create a new user with enhanced error handling"""
        def operation():
            user_id = str(uuid.uuid4())
            with self.get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("""
                        INSERT INTO users (id, email, name, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s)
                    """, (
                        user_id,
                        user_data.get('email'),
                        user_data.get('name'),
                        datetime.now(),
                        datetime.now()
                    ))
                    conn.commit()
                    return user_id
        
        return self.execute_with_retry("create_user", operation)
    
    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user by email with enhanced error handling"""
        def operation():
            with self.get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("SELECT * FROM users WHERE email = %s", (email,))
                    result = cur.fetchone()
                    return dict(result) if result else None
        
        return self.execute_with_retry("get_user_by_email", operation)
    
    def create_family_member(self, member_data: Dict[str, Any]) -> str:
        """Create a new family member with enhanced error handling"""
        def operation():
            member_id = str(uuid.uuid4())
            with self.get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("""
                        INSERT INTO family_members (
                            id, family_group_id, name, name_arabic, birth_date, 
                            location, avatar, relationships, role, created_at, updated_at
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        member_id,
                        member_data.get('family_group_id'),
                        member_data.get('name'),
                        member_data.get('name_arabic'),
                        member_data.get('birth_date'),
                        member_data.get('location'),
                        member_data.get('avatar'),
                        json.dumps(member_data.get('relationships', {})),
                        member_data.get('role', 'member'),
                        datetime.now(),
                        datetime.now()
                    ))
                    conn.commit()
                    return member_id
        
        return self.execute_with_retry("create_family_member", operation)
    
    def get_family_members(self, family_group_id: str = None) -> List[Dict[str, Any]]:
        """Get family members with enhanced error handling"""
        def operation():
            with self.get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    if family_group_id:
                        cur.execute("""
                            SELECT * FROM family_members 
                            WHERE family_group_id = %s 
                            ORDER BY created_at DESC
                        """, (family_group_id,))
                    else:
                        cur.execute("""
                            SELECT * FROM family_members 
                            ORDER BY created_at DESC
                        """)
                    
                    results = cur.fetchall()
                    return [dict(row) for row in results]
        
        return self.execute_with_retry("get_family_members", operation)
    
    def create_memory(self, memory_data: Dict[str, Any]) -> str:
        """Create a new memory with enhanced error handling"""
        def operation():
            memory_id = str(uuid.uuid4())
            with self.get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("""
                        INSERT INTO memories (
                            id, family_group_id, title, description, date, location,
                            image_url, thumbnail_url, tags, family_members, ai_analysis,
                            memory_type, privacy_level, metadata, file_size, dimensions,
                            created_by, created_at, updated_at
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        memory_id,
                        memory_data.get('family_group_id'),
                        memory_data.get('title'),
                        memory_data.get('description'),
                        memory_data.get('date'),
                        memory_data.get('location'),
                        memory_data.get('image_url'),
                        memory_data.get('thumbnail_url'),
                        json.dumps(memory_data.get('tags', [])),
                        json.dumps(memory_data.get('family_members', [])),
                        json.dumps(memory_data.get('ai_analysis', {})),
                        memory_data.get('memory_type', 'photo'),
                        memory_data.get('privacy_level', 'family'),
                        json.dumps(memory_data.get('metadata', {})),
                        memory_data.get('file_size'),
                        json.dumps(memory_data.get('dimensions', {})),
                        memory_data.get('created_by'),
                        datetime.now(),
                        datetime.now()
                    ))
                    conn.commit()
                    return memory_id
        
        return self.execute_with_retry("create_memory", operation)
    
    def get_memories(self, family_group_id: str = None, filters: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """Get memories with enhanced error handling and filtering"""
        def operation():
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
                            # Search for memories containing any of the tags
                            tag_conditions = []
                            for tag in filters['tags']:
                                tag_conditions.append("tags::text ILIKE %s")
                                params.append(f'%"{tag}"%')
                            if tag_conditions:
                                query += f" AND ({' OR '.join(tag_conditions)})"
                    
                    query += " ORDER BY created_at DESC"
                    
                    cur.execute(query, params)
                    results = cur.fetchall()
                    return [dict(row) for row in results]
        
        return self.execute_with_retry("get_memories", operation)
    
    def create_album(self, album_data: Dict[str, Any]) -> str:
        """Create a new album with enhanced error handling"""
        def operation():
            album_id = str(uuid.uuid4())
            with self.get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("""
                        INSERT INTO albums (
                            id, family_group_id, name, description, album_type,
                            privacy_level, cover_photo_id, photo_count, created_at, updated_at
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        album_id,
                        album_data.get('family_group_id'),
                        album_data.get('name'),
                        album_data.get('description'),
                        album_data.get('album_type', 'custom'),
                        album_data.get('privacy_level', 'family'),
                        album_data.get('cover_photo_id'),
                        album_data.get('photo_count', 0),
                        datetime.now(),
                        datetime.now()
                    ))
                    conn.commit()
                    return album_id
        
        return self.execute_with_retry("create_album", operation)
    
    def add_photo_to_album(self, album_id: str, memory_id: str) -> bool:
        """Add a photo to an album with enhanced error handling"""
        def operation():
            with self.get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("""
                        INSERT INTO album_memories (album_id, memory_id, added_at)
                        VALUES (%s, %s, %s)
                    """, (album_id, memory_id, datetime.now()))
                    
                    # Update album photo count
                    cur.execute("""
                        UPDATE albums 
                        SET photo_count = photo_count + 1, updated_at = %s
                        WHERE id = %s
                    """, (datetime.now(), album_id))
                    
                    conn.commit()
                    return True
        
        return self.execute_with_retry("add_photo_to_album", operation)
    
    def update_album_photo_count(self, album_id: str) -> bool:
        """Update album photo count with enhanced error handling"""
        def operation():
            with self.get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("""
                        UPDATE albums 
                        SET photo_count = (
                            SELECT COUNT(*) FROM album_memories WHERE album_id = %s
                        ), updated_at = %s
                        WHERE id = %s
                    """, (album_id, datetime.now(), album_id))
                    conn.commit()
                    return True
        
        return self.execute_with_retry("update_album_photo_count", operation)
    
    def get_album_photos(self, album_id: str) -> List[Dict[str, Any]]:
        """Get photos in an album with enhanced error handling"""
        def operation():
            with self.get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("""
                        SELECT m.* FROM memories m
                        JOIN album_memories am ON m.id = am.memory_id
                        WHERE am.album_id = %s
                        ORDER BY am.added_at DESC
                    """, (album_id,))
                    results = cur.fetchall()
                    return [dict(row) for row in results]
        
        return self.execute_with_retry("get_album_photos", operation)
    
    def get_family_albums(self, family_group_id: str) -> List[Dict[str, Any]]:
        """Get family albums with enhanced error handling"""
        def operation():
            with self.get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("""
                        SELECT * FROM albums 
                        WHERE family_group_id = %s 
                        ORDER BY created_at DESC
                    """, (family_group_id,))
                    results = cur.fetchall()
                    return [dict(row) for row in results]
        
        return self.execute_with_retry("get_family_albums", operation)
    
    def create_game_session(self, session_data: Dict[str, Any]) -> str:
        """Create a new game session with enhanced error handling"""
        def operation():
            session_id = str(uuid.uuid4())
            with self.get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("""
                        INSERT INTO game_sessions (
                            id, family_group_id, game_type, title, description,
                            players, status, current_phase, game_state, settings,
                            current_round, total_rounds, scores, created_by, created_at, updated_at
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        session_id,
                        session_data.get('family_group_id'),
                        session_data.get('game_type'),
                        session_data.get('title'),
                        session_data.get('description'),
                        json.dumps(session_data.get('players', [])),
                        session_data.get('status'),
                        session_data.get('current_phase'),
                        json.dumps(session_data.get('game_state', {})),
                        json.dumps(session_data.get('settings', {})),
                        session_data.get('current_round', 0),
                        session_data.get('total_rounds', 5),
                        json.dumps(session_data.get('scores', {})),
                        session_data.get('created_by'),
                        datetime.now(),
                        datetime.now()
                    ))
                    conn.commit()
                    return session_id
        
        return self.execute_with_retry("create_game_session", operation)
    
    def get_game_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get game session with enhanced error handling"""
        def operation():
            with self.get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("SELECT * FROM game_sessions WHERE id = %s", (session_id,))
                    result = cur.fetchone()
                    return dict(result) if result else None
        
        return self.execute_with_retry("get_game_session", operation)
    
    def update_game_session(self, session_id: str, updates: Dict[str, Any]) -> bool:
        """Update game session with enhanced error handling"""
        def operation():
            with self.get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    # Build dynamic update query
                    set_clauses = []
                    params = []
                    
                    for key, value in updates.items():
                        if key in ['game_state', 'settings', 'scores', 'players']:
                            set_clauses.append(f"{key} = %s")
                            params.append(json.dumps(value))
                        else:
                            set_clauses.append(f"{key} = %s")
                            params.append(value)
                    
                    set_clauses.append("updated_at = %s")
                    params.append(datetime.now())
                    params.append(session_id)
                    
                    query = f"UPDATE game_sessions SET {', '.join(set_clauses)} WHERE id = %s"
                    cur.execute(query, params)
                    conn.commit()
                    return cur.rowcount > 0
        
        return self.execute_with_retry("update_game_session", operation)
    
    def add_player_to_game(self, session_id: str, player_data: Dict[str, Any]) -> bool:
        """Add player to game with enhanced error handling"""
        def operation():
            with self.get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    # Get current players
                    cur.execute("SELECT players FROM game_sessions WHERE id = %s", (session_id,))
                    result = cur.fetchone()
                    if not result:
                        return False
                    
                    current_players = result[0] or []
                    current_players.append(player_data)
                    
                    # Update players list
                    cur.execute("""
                        UPDATE game_sessions 
                        SET players = %s, updated_at = %s
                        WHERE id = %s
                    """, (json.dumps(current_players), datetime.now(), session_id))
                    conn.commit()
                    return True
        
        return self.execute_with_retry("add_player_to_game", operation)
    
    def link_memory_to_family_members(self, memory_id: str, family_member_ids: List[str], confidence_scores: List[float] = None) -> bool:
        """Link memory to family members with enhanced error handling"""
        def operation():
            with self.get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    # Update memory with family member links
                    cur.execute("""
                        UPDATE memories 
                        SET family_members = %s, updated_at = %s
                        WHERE id = %s
                    """, (json.dumps(family_member_ids), datetime.now(), memory_id))
                    conn.commit()
                    return True
        
        return self.execute_with_retry("link_memory_to_family_members", operation)
    
    def get_memory_family_members(self, memory_id: str) -> List[Dict[str, Any]]:
        """Get family members linked to a memory with enhanced error handling"""
        def operation():
            with self.get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("""
                        SELECT family_members FROM memories WHERE id = %s
                    """, (memory_id,))
                    result = cur.fetchone()
                    if result and result[0]:
                        # Get family member details
                        member_ids = result[0]
                        placeholders = ','.join(['%s'] * len(member_ids))
                        cur.execute(f"""
                            SELECT * FROM family_members 
                            WHERE id IN ({placeholders})
                        """, member_ids)
                        return [dict(row) for row in cur.fetchall()]
                    return []
        
        return self.execute_with_retry("get_memory_family_members", operation)
    
    def get_family_member_by_name(self, name: str, family_group_id: str) -> Optional[Dict[str, Any]]:
        """Get family member by name with enhanced error handling"""
        def operation():
            with self.get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("""
                        SELECT * FROM family_members 
                        WHERE name ILIKE %s AND family_group_id = %s
                    """, (f"%{name}%", family_group_id))
                    result = cur.fetchone()
                    return dict(result) if result else None
        
        return self.execute_with_retry("get_family_member_by_name", operation)

# Global enhanced database instance
enhanced_db = None

def get_enhanced_database() -> EnhancedUnifiedDatabase:
    """Get the global enhanced database instance"""
    global enhanced_db
    if enhanced_db is None:
        enhanced_db = EnhancedUnifiedDatabase()
    return enhanced_db

def close_enhanced_database_pool():
    """Close the enhanced database connection pool"""
    global enhanced_db
    if enhanced_db:
        enhanced_db.close_pool() 