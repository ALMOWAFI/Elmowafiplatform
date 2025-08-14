#!/usr/bin/env python3
"""
Database Configuration for Elmowafiplatform
PostgreSQL, Redis, and connection management for production deployment
"""

import os
import redis
from typing import Optional, Generator
from contextlib import contextmanager

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool, QueuePool
from sqlalchemy.engine import Engine

from backend.database_models import Base

class DatabaseConfig:
    """Production-ready database configuration"""
    
    def __init__(self):
        # PostgreSQL Configuration
        self.db_host = os.getenv('DB_HOST', 'localhost')
        self.db_port = os.getenv('DB_PORT', '5432')
        self.db_name = os.getenv('DB_NAME', 'elmowafiplatform')
        self.db_user = os.getenv('DB_USER', 'postgres')
        self.db_password = os.getenv('DB_PASSWORD', 'your_password_here')
        
        # Redis Configuration
        self.redis_host = os.getenv('REDIS_HOST', 'localhost')
        self.redis_port = int(os.getenv('REDIS_PORT', '6379'))
        self.redis_password = os.getenv('REDIS_PASSWORD', None)
        self.redis_db = int(os.getenv('REDIS_DB', '0'))
        
        # Connection settings
        self.pool_size = int(os.getenv('DB_POOL_SIZE', '20'))
        self.max_overflow = int(os.getenv('DB_MAX_OVERFLOW', '30'))
        self.pool_timeout = int(os.getenv('DB_POOL_TIMEOUT', '30'))
        self.pool_recycle = int(os.getenv('DB_POOL_RECYCLE', '3600'))
        
        # Environment
        self.environment = os.getenv('ENVIRONMENT', 'development')
        
        # Build database URL
        self.database_url = self._build_database_url()
        
        # Create engine and session
        self.engine = self._create_engine()
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        
        # Redis connection
        self.redis_client = self._create_redis_client()
    
    def _build_database_url(self) -> str:
        """Build PostgreSQL connection URL"""
        if self.environment == 'development':
            # For development, allow fallback to SQLite
            if os.getenv('USE_SQLITE', 'false').lower() == 'true':
                return "sqlite:///./data/elmowafiplatform.db"
        
        return f"postgresql://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"
    
    def _create_engine(self) -> Engine:
        """Create SQLAlchemy engine with optimized settings"""
        if self.database_url.startswith('sqlite'):
            # SQLite configuration for development
            engine = create_engine(
                self.database_url,
                poolclass=StaticPool,
                connect_args={"check_same_thread": False},
                echo=self.environment == 'development'
            )
        else:
            # PostgreSQL configuration for production
            engine = create_engine(
                self.database_url,
                poolclass=QueuePool,
                pool_size=self.pool_size,
                max_overflow=self.max_overflow,
                pool_timeout=self.pool_timeout,
                pool_recycle=self.pool_recycle,
                pool_pre_ping=True,  # Validate connections before use
                echo=self.environment == 'development'
            )
            
            # Add PostgreSQL-specific event listeners
            @event.listens_for(engine, "connect")
            def set_sqlite_pragma(dbapi_connection, connection_record):
                if engine.dialect.name == 'postgresql':
                    with dbapi_connection.cursor() as cursor:
                        cursor.execute("SET timezone='UTC'")
        
        return engine
    
    def _create_redis_client(self) -> redis.Redis:
        """Create Redis client for caching and pub/sub"""
        try:
            client = redis.Redis(
                host=self.redis_host,
                port=self.redis_port,
                password=self.redis_password,
                db=self.redis_db,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5,
                retry_on_timeout=True,
                health_check_interval=30
            )
            
            # Test connection
            client.ping()
            return client
            
        except redis.ConnectionError:
            print(f"Warning: Could not connect to Redis at {self.redis_host}:{self.redis_port}")
            print("Continuing without Redis caching...")
            return None
    
    def create_database(self):
        """Create all database tables"""
        Base.metadata.create_all(bind=self.engine)
    
    def drop_database(self):
        """Drop all database tables (use with caution!)"""
        Base.metadata.drop_all(bind=self.engine)
    
    @contextmanager
    def get_session(self) -> Generator[Session, None, None]:
        """Get database session with proper cleanup"""
        session = self.SessionLocal()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()
    
    def get_session_dependency(self) -> Generator[Session, None, None]:
        """FastAPI dependency for database sessions"""
        session = self.SessionLocal()
        try:
            yield session
        finally:
            session.close()
    
    def health_check(self) -> dict:
        """Check database and Redis connectivity"""
        status = {
            'database': False,
            'redis': False,
            'details': {}
        }
        
        # Test database connection
        try:
            with self.get_session() as session:
                session.execute("SELECT 1")
                status['database'] = True
                status['details']['database'] = 'Connected'
        except Exception as e:
            status['details']['database'] = f'Error: {str(e)}'
        
        # Test Redis connection
        if self.redis_client:
            try:
                self.redis_client.ping()
                status['redis'] = True
                status['details']['redis'] = 'Connected'
            except Exception as e:
                status['details']['redis'] = f'Error: {str(e)}'
        else:
            status['details']['redis'] = 'Not configured'
        
        return status

class CacheManager:
    """Redis-based caching manager"""
    
    def __init__(self, redis_client: Optional[redis.Redis]):
        self.redis = redis_client
        self.default_ttl = 3600  # 1 hour
    
    def get(self, key: str) -> Optional[str]:
        """Get value from cache"""
        if not self.redis:
            return None
        
        try:
            return self.redis.get(key)
        except Exception:
            return None
    
    def set(self, key: str, value: str, ttl: Optional[int] = None) -> bool:
        """Set value in cache"""
        if not self.redis:
            return False
        
        try:
            return self.redis.setex(key, ttl or self.default_ttl, value)
        except Exception:
            return False
    
    def delete(self, key: str) -> bool:
        """Delete key from cache"""
        if not self.redis:
            return False
        
        try:
            return bool(self.redis.delete(key))
        except Exception:
            return False
    
    def exists(self, key: str) -> bool:
        """Check if key exists in cache"""
        if not self.redis:
            return False
        
        try:
            return bool(self.redis.exists(key))
        except Exception:
            return False
    
    def clear_pattern(self, pattern: str) -> int:
        """Clear all keys matching pattern"""
        if not self.redis:
            return 0
        
        try:
            keys = self.redis.keys(pattern)
            if keys:
                return self.redis.delete(*keys)
            return 0
        except Exception:
            return 0
    
    def get_financial_summary_key(self, user_id: str, period: str) -> str:
        """Generate cache key for financial summary"""
        return f"financial_summary:{user_id}:{period}"
    
    def get_budget_analysis_key(self, budget_id: str) -> str:
        """Generate cache key for budget analysis"""
        return f"budget_analysis:{budget_id}"
    
    def get_spending_trends_key(self, account_id: str, period: str) -> str:
        """Generate cache key for spending trends"""
        return f"spending_trends:{account_id}:{period}"

class DatabaseMigration:
    """Database migration utilities"""
    
    def __init__(self, config: DatabaseConfig):
        self.config = config
    
    def migrate_from_sqlite(self, sqlite_db_path: str = "data/elmowafiplatform.db"):
        """Migrate data from existing SQLite database to PostgreSQL"""
        import sqlite3
        import json
        from database_models import (
            User, FamilyMember, Memory, TravelPlan, GameSession,
            CulturalHeritage, Album
        )
        
        # Connect to SQLite
        sqlite_conn = sqlite3.connect(sqlite_db_path)
        sqlite_conn.row_factory = sqlite3.Row
        
        with self.config.get_session() as session:
            # Migrate family members
            cursor = sqlite_conn.execute("SELECT * FROM family_members")
            for row in cursor.fetchall():
                family_member = FamilyMember(
                    id=row['id'],
                    name=row['name'],
                    name_arabic=row['name_arabic'],
                    birth_date=row['birth_date'],
                    location=row['location'],
                    avatar=row['avatar'],
                    relationships=json.loads(row['relationships']) if row['relationships'] else []
                )
                session.merge(family_member)
            
            # Migrate memories
            cursor = sqlite_conn.execute("SELECT * FROM memories")
            for row in cursor.fetchall():
                memory = Memory(
                    id=row['id'],
                    title=row['title'],
                    description=row['description'],
                    memory_date=row['date'],
                    location=row['location'],
                    image_url=row['image_url'],
                    tags=json.loads(row['tags']) if row['tags'] else [],
                    ai_analysis=json.loads(row['ai_analysis']) if row['ai_analysis'] else {}
                )
                session.merge(memory)
            
            # Migrate travel plans
            cursor = sqlite_conn.execute("SELECT * FROM travel_plans")
            for row in cursor.fetchall():
                travel_plan = TravelPlan(
                    id=row['id'],
                    name=row['name'],
                    destination=row['destination'],
                    start_date=row['start_date'],
                    end_date=row['end_date'],
                    estimated_budget=row['budget'],
                    activities=json.loads(row['activities']) if row['activities'] else []
                )
                session.merge(travel_plan)
            
            # Migrate game sessions
            cursor = sqlite_conn.execute("SELECT * FROM game_sessions")
            for row in cursor.fetchall():
                game_session = GameSession(
                    id=row['id'],
                    game_type=row['game_type'],
                    status=row['status'],
                    game_state=json.loads(row['game_state']) if row['game_state'] else {},
                    settings=json.loads(row['settings']) if row['settings'] else {},
                    current_phase=row['current_phase'],
                    ai_decisions=json.loads(row['ai_decisions']) if row['ai_decisions'] else []
                )
                session.merge(game_session)
            
            # Migrate cultural heritage
            try:
                cursor = sqlite_conn.execute("SELECT * FROM cultural_heritage")
                for row in cursor.fetchall():
                    heritage = CulturalHeritage(
                        id=row['id'],
                        title=row['title'],
                        title_arabic=row['title_arabic'],
                        description=row['description'],
                        description_arabic=row['description_arabic'],
                        category=row['category'],
                        cultural_significance=row['cultural_significance'],
                        tags=json.loads(row['tags']) if row['tags'] else [],
                        family_members=json.loads(row['family_members']) if row['family_members'] else []
                    )
                    session.merge(heritage)
            except sqlite3.OperationalError:
                pass  # Table might not exist in older SQLite versions
        
        sqlite_conn.close()
        print("Migration from SQLite to PostgreSQL completed successfully!")

# Global instances
db_config = DatabaseConfig()
cache_manager = CacheManager(db_config.redis_client)

# FastAPI dependencies
def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency for database sessions"""
    return db_config.get_session_dependency()

def get_cache() -> CacheManager:
    """FastAPI dependency for cache manager"""
    return cache_manager