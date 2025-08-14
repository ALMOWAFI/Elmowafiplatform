#!/usr/bin/env python3
"""
Fixed Database Configuration for Elmowafiplatform
Proper PostgreSQL detection, async operations, and connection pooling
"""

import os
import logging
from typing import Optional, Generator, Dict, Any
from contextlib import contextmanager

from sqlalchemy import create_engine, event, MetaData
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool, QueuePool
from sqlalchemy.engine import Engine
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

# Import models
from database_models import Base

logger = logging.getLogger(__name__)

class FixedDatabaseConfig:
    """Production-ready database configuration with proper PostgreSQL detection"""
    
    def __init__(self):
        # Environment detection
        self.environment = os.getenv('ENVIRONMENT', 'development')
        
        # Database URL detection with proper logic
        self.database_url = self._get_database_url()
        self.is_postgres = self.database_url.startswith(("postgresql://", "postgres://"))
        
        # Connection settings
        self.pool_size = int(os.getenv('DB_POOL_SIZE', '20' if self.is_postgres else '1'))
        self.max_overflow = int(os.getenv('DB_MAX_OVERFLOW', '30' if self.is_postgres else '0'))
        self.pool_timeout = int(os.getenv('DB_POOL_TIMEOUT', '30'))
        self.pool_recycle = int(os.getenv('DB_POOL_RECYCLE', '3600'))
        
        # Create engines
        self.engine = self._create_sync_engine()
        self.async_engine = self._create_async_engine()
        
        # Create session factories
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        self.AsyncSessionLocal = async_sessionmaker(
            self.async_engine, 
            class_=AsyncSession, 
            expire_on_commit=False
        )
        
        logger.info(f"Database configured: {'PostgreSQL' if self.is_postgres else 'SQLite'}")
        logger.info(f"Environment: {self.environment}")
    
    def _get_database_url(self) -> str:
        """Get database URL with proper detection logic"""
        # Check for explicit DATABASE_URL
        db_url = os.getenv("DATABASE_URL", "").strip()
        
        if db_url:
            # Validate PostgreSQL URL
            if db_url.startswith(("postgresql://", "postgres://")):
                # Check if it's a real URL, not just placeholders
                if not any(placeholder in db_url for placeholder in [
                    "username", "password", "host", "port", "database", "your_"
                ]):
                    logger.info("Using PostgreSQL from DATABASE_URL")
                    return db_url
                else:
                    logger.warning("DATABASE_URL contains placeholders, falling back to SQLite")
        
        # Check for individual PostgreSQL environment variables
        db_host = os.getenv('DB_HOST')
        db_port = os.getenv('DB_PORT', '5432')
        db_name = os.getenv('DB_NAME')
        db_user = os.getenv('DB_USER')
        db_password = os.getenv('DB_PASSWORD')
        
        if all([db_host, db_name, db_user, db_password]):
            # All PostgreSQL variables are set
            postgres_url = f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
            logger.info("Using PostgreSQL from individual environment variables")
            return postgres_url
        
        # Fallback to SQLite
        logger.info("Using SQLite as fallback")
        return "sqlite:///./data/family_platform.db"
    
    def _create_sync_engine(self) -> Engine:
        """Create synchronous SQLAlchemy engine"""
        if self.is_postgres:
            # PostgreSQL configuration
            engine = create_engine(
                self.database_url,
                poolclass=QueuePool,
                pool_size=self.pool_size,
                max_overflow=self.max_overflow,
                pool_timeout=self.pool_timeout,
                pool_recycle=self.pool_recycle,
                pool_pre_ping=True,
                echo=self.environment == 'development'
            )
            
            # Add PostgreSQL-specific event listeners
            @event.listens_for(engine, "connect")
            def set_postgres_settings(dbapi_connection, connection_record):
                with dbapi_connection.cursor() as cursor:
                    cursor.execute("SET timezone='UTC'")
                    cursor.execute("SET statement_timeout='30000'")  # 30 seconds
                    cursor.execute("SET idle_in_transaction_session_timeout='60000'")  # 60 seconds
            
            logger.info("PostgreSQL sync engine created with connection pooling")
            
        else:
            # SQLite configuration
            engine = create_engine(
                self.database_url,
                poolclass=StaticPool,
                connect_args={"check_same_thread": False},
                echo=self.environment == 'development'
            )
            logger.info("SQLite sync engine created")
        
        return engine
    
    def _create_async_engine(self) -> Optional[Engine]:
        """Create asynchronous SQLAlchemy engine (PostgreSQL only)"""
        if not self.is_postgres:
            logger.warning("Async engine not available for SQLite")
            return None
        
        # Convert to async URL
        async_url = self.database_url.replace("postgresql://", "postgresql+asyncpg://")
        
        try:
            engine = create_async_engine(
                async_url,
                pool_size=self.pool_size,
                max_overflow=self.max_overflow,
                pool_timeout=self.pool_timeout,
                pool_recycle=self.pool_recycle,
                pool_pre_ping=True,
                echo=self.environment == 'development'
            )
            logger.info("PostgreSQL async engine created")
            return engine
            
        except Exception as e:
            logger.error(f"Failed to create async engine: {e}")
            return None
    
    def create_database(self):
        """Create all database tables"""
        Base.metadata.create_all(bind=self.engine)
        logger.info("Database tables created")
    
    def drop_database(self):
        """Drop all database tables (use with caution!)"""
        Base.metadata.drop_all(bind=self.engine)
        logger.warning("Database tables dropped")
    
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
    
    async def get_async_session(self) -> AsyncSession:
        """Get async database session"""
        if not self.async_engine:
            raise RuntimeError("Async engine not available")
        
        async with self.AsyncSessionLocal() as session:
            return session
    
    def get_session_dependency(self) -> Generator[Session, None, None]:
        """FastAPI dependency for database sessions"""
        session = self.SessionLocal()
        try:
            yield session
        finally:
            session.close()
    
    async def get_async_session_dependency(self) -> Generator[AsyncSession, None, None]:
        """FastAPI dependency for async database sessions"""
        if not self.async_engine:
            raise RuntimeError("Async engine not available")
        
        async with self.AsyncSessionLocal() as session:
            yield session
    
    def health_check(self) -> Dict[str, Any]:
        """Check database connectivity"""
        status = {
            'database': False,
            'database_type': 'PostgreSQL' if self.is_postgres else 'SQLite',
            'async_support': self.async_engine is not None,
            'details': {}
        }
        
        # Test database connection
        try:
            with self.get_session() as session:
                session.execute("SELECT 1")
                status['database'] = True
                status['details']['database'] = 'Connected'
                
                # Get connection pool info
                if self.is_postgres:
                    pool = self.engine.pool
                    status['details']['pool_size'] = pool.size()
                    status['details']['checked_in'] = pool.checkedin()
                    status['details']['checked_out'] = pool.checkedout()
                    status['details']['overflow'] = pool.overflow()
                    
        except Exception as e:
            status['details']['database'] = f'Error: {str(e)}'
            logger.error(f"Database health check failed: {e}")
        
        return status

# Global database config instance
db_config = FixedDatabaseConfig()

# Convenience functions
def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency for database sessions"""
    return db_config.get_session_dependency()

async def get_async_db() -> Generator[AsyncSession, None, None]:
    """FastAPI dependency for async database sessions"""
    return db_config.get_async_session_dependency()
