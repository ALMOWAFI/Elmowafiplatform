#!/usr/bin/env python3
"""
Asynchronous Database Operations for Elmowafiplatform

This script implements asynchronous database operations to address performance bottlenecks
identified in the critical issues. It provides a set of utilities for performing database
operations asynchronously, improving application responsiveness and throughput.
"""

import os
import logging
import asyncio
from typing import Dict, List, Any, Optional, Tuple, Union, Callable
from contextlib import asynccontextmanager

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Try to import asyncpg for PostgreSQL async operations
try:
    import asyncpg
    ASYNCPG_AVAILABLE = True
except ImportError:
    ASYNCPG_AVAILABLE = False
    logger.warning("asyncpg not available, async PostgreSQL operations will be limited")

# Try to import aiosqlite for SQLite async operations
try:
    import aiosqlite
    AIOSQLITE_AVAILABLE = True
except ImportError:
    AIOSQLITE_AVAILABLE = False
    logger.warning("aiosqlite not available, async SQLite operations will be limited")

class AsyncDatabaseClient:
    """Client for asynchronous database operations"""
    
    def __init__(self):
        self.postgres_url = os.getenv("DATABASE_URL", "")
        self.sqlite_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "elmowafiplatform.db")
        self.pg_pool = None
        self.use_postgres = bool(self.postgres_url)
        self._initialized = False
        self._init_lock = asyncio.Lock()
    
    async def ensure_initialized(self):
        """Ensure that the database pools are initialized"""
        if not self._initialized:
            async with self._init_lock:
                if not self._initialized:
                    await self._initialize_pools()
                    self._initialized = True
    
    async def _initialize_pools(self):
        """Initialize database connection pools"""
        if self.use_postgres and ASYNCPG_AVAILABLE:
            try:
                self.pg_pool = await asyncpg.create_pool(
                    dsn=self.postgres_url,
                    min_size=5,
                    max_size=20,
                    max_inactive_connection_lifetime=300,  # 5 minutes
                    command_timeout=60,
                    statement_cache_size=100
                )
                logger.info("PostgreSQL connection pool initialized")
            except Exception as e:
                logger.error(f"Failed to initialize PostgreSQL connection pool: {e}")
                self.pg_pool = None
                self.use_postgres = False
    
    # This method is now defined in the __init__ method
    
    @asynccontextmanager
    async def get_connection(self):
        """Get a database connection from the appropriate pool"""
        await self.ensure_initialized()
        
        if self.use_postgres and self.pg_pool:
            # Use PostgreSQL connection
            async with self.pg_pool.acquire() as conn:
                yield conn
        elif AIOSQLITE_AVAILABLE:
            # Use SQLite connection
            async with aiosqlite.connect(self.sqlite_path) as conn:
                conn.row_factory = aiosqlite.Row
                yield AsyncSQLiteConnection(conn)
        else:
            raise RuntimeError("No async database connection available")
    
    async def execute(self, query: str, *args, **kwargs):
        """Execute a query without returning results"""
        async with self.get_connection() as conn:
            return await conn.execute(query, *args, **kwargs)
    
    async def fetch(self, query: str, *args, **kwargs):
        """Execute a query and return all results"""
        async with self.get_connection() as conn:
            return await conn.fetch(query, *args, **kwargs)
    
    async def fetchrow(self, query: str, *args, **kwargs):
        """Execute a query and return the first row"""
        async with self.get_connection() as conn:
            return await conn.fetchrow(query, *args, **kwargs)
    
    async def fetchval(self, query: str, *args, column: int = 0, **kwargs):
        """Execute a query and return a single value"""
        async with self.get_connection() as conn:
            return await conn.fetchval(query, *args, column=column, **kwargs)
    
    async def transaction(self):
        """Start a transaction"""
        await self.ensure_initialized()
        
        if self.use_postgres and self.pg_pool:
            # Use PostgreSQL transaction
            conn = await self.pg_pool.acquire()
            tr = conn.transaction()
            await tr.start()
            
            try:
                yield conn
                await tr.commit()
            except Exception:
                await tr.rollback()
                raise
            finally:
                await self.pg_pool.release(conn)
        elif AIOSQLITE_AVAILABLE:
            # Use SQLite transaction
            async with aiosqlite.connect(self.sqlite_path) as conn:
                conn.row_factory = aiosqlite.Row
                await conn.execute("BEGIN")
                
                try:
                    yield AsyncSQLiteConnection(conn)
                    await conn.commit()
                except Exception:
                    await conn.rollback()
                    raise
        else:
            raise RuntimeError("No async database connection available")
    
    async def close(self):
        """Close all database connections"""
        if self.pg_pool:
            await self.pg_pool.close()
            self.pg_pool = None
            logger.info("PostgreSQL connection pool closed")

class AsyncSQLiteConnection:
    """Wrapper for aiosqlite connection to provide a consistent interface"""
    
    def __init__(self, conn):
        self.conn = conn
    
    async def execute(self, query: str, *args, **kwargs):
        """Execute a query without returning results"""
        return await self.conn.execute(query, *args, **kwargs)
    
    async def fetch(self, query: str, *args, **kwargs):
        """Execute a query and return all results"""
        cursor = await self.conn.execute(query, *args, **kwargs)
        rows = await cursor.fetchall()
        return rows
    
    async def fetchrow(self, query: str, *args, **kwargs):
        """Execute a query and return the first row"""
        cursor = await self.conn.execute(query, *args, **kwargs)
        row = await cursor.fetchone()
        return row
    
    async def fetchval(self, query: str, *args, column: int = 0, **kwargs):
        """Execute a query and return a single value"""
        cursor = await self.conn.execute(query, *args, **kwargs)
        row = await cursor.fetchone()
        return row[column] if row else None

# Create a singleton instance but don't initialize it yet
db_client = None

async def get_db_client():
    """Get or create the database client"""
    global db_client
    if db_client is None:
        db_client = AsyncDatabaseClient()
    await db_client.ensure_initialized()
    return db_client

# Utility functions for common database operations
async def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    """Get a user by ID"""
    query = "SELECT * FROM users WHERE id = $1"
    client = await get_db_client()
    row = await client.fetchrow(query, user_id)
    return dict(row) if row else None

async def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    """Get a user by email"""
    query = "SELECT * FROM users WHERE email = $1"
    row = await db_client.fetchrow(query, email)
    return dict(row) if row else None

async def create_user(user_data: Dict[str, Any]) -> str:
    """Create a new user"""
    query = """
    INSERT INTO users (id, email, password_hash, first_name, last_name, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id
    """
    user_id = await db_client.fetchval(
        query,
        user_data["id"],
        user_data["email"],
        user_data["password_hash"],
        user_data["first_name"],
        user_data["last_name"],
        user_data["created_at"],
        user_data["updated_at"]
    )
    return user_id

async def update_user(user_id: str, user_data: Dict[str, Any]) -> bool:
    """Update a user"""
    # Build SET clause dynamically based on provided fields
    set_clauses = []
    params = []
    param_index = 1
    
    for key, value in user_data.items():
        if key not in ["id", "created_at"]:
            set_clauses.append(f"{key} = ${param_index}")
            params.append(value)
            param_index += 1
    
    # Add updated_at timestamp
    set_clauses.append(f"updated_at = ${param_index}")
    params.append(user_data.get("updated_at"))
    param_index += 1
    
    # Add user_id as the last parameter
    params.append(user_id)
    
    query = f"""
    UPDATE users
    SET {', '.join(set_clauses)}
    WHERE id = ${param_index}
    """
    
    result = await db_client.execute(query, *params)
    return result is not None

async def delete_user(user_id: str) -> bool:
    """Delete a user"""
    query = "DELETE FROM users WHERE id = $1"
    result = await db_client.execute(query, user_id)
    return result is not None

async def get_memories_by_user(user_id: str) -> List[Dict[str, Any]]:
    """Get all memories for a user"""
    query = "SELECT * FROM memories WHERE user_id = $1 ORDER BY created_at DESC"
    rows = await db_client.fetch(query, user_id)
    return [dict(row) for row in rows]

async def get_memory_by_id(memory_id: str) -> Optional[Dict[str, Any]]:
    """Get a memory by ID"""
    query = "SELECT * FROM memories WHERE id = $1"
    row = await db_client.fetchrow(query, memory_id)
    return dict(row) if row else None

async def create_memory(memory_data: Dict[str, Any]) -> str:
    """Create a new memory"""
    query = """
    INSERT INTO memories (id, user_id, title, description, image_path, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id
    """
    memory_id = await db_client.fetchval(
        query,
        memory_data["id"],
        memory_data["user_id"],
        memory_data["title"],
        memory_data["description"],
        memory_data["image_path"],
        memory_data["created_at"],
        memory_data["updated_at"]
    )
    return memory_id

async def update_memory(memory_id: str, memory_data: Dict[str, Any]) -> bool:
    """Update a memory"""
    # Build SET clause dynamically based on provided fields
    set_clauses = []
    params = []
    param_index = 1
    
    for key, value in memory_data.items():
        if key not in ["id", "user_id", "created_at"]:
            set_clauses.append(f"{key} = ${param_index}")
            params.append(value)
            param_index += 1
    
    # Add updated_at timestamp
    set_clauses.append(f"updated_at = ${param_index}")
    params.append(memory_data.get("updated_at"))
    param_index += 1
    
    # Add memory_id as the last parameter
    params.append(memory_id)
    
    query = f"""
    UPDATE memories
    SET {', '.join(set_clauses)}
    WHERE id = ${param_index}
    """
    
    result = await db_client.execute(query, *params)
    return result is not None

async def delete_memory(memory_id: str) -> bool:
    """Delete a memory"""
    query = "DELETE FROM memories WHERE id = $1"
    result = await db_client.execute(query, memory_id)
    return result is not None

async def get_budget_by_user(user_id: str) -> Optional[Dict[str, Any]]:
    """Get budget for a user"""
    query = "SELECT * FROM budgets WHERE user_id = $1"
    row = await db_client.fetchrow(query, user_id)
    return dict(row) if row else None

async def get_budget_items_by_budget(budget_id: str) -> List[Dict[str, Any]]:
    """Get all budget items for a budget"""
    query = "SELECT * FROM budget_items WHERE budget_id = $1"
    rows = await db_client.fetch(query, budget_id)
    return [dict(row) for row in rows]

async def create_budget(budget_data: Dict[str, Any]) -> str:
    """Create a new budget"""
    query = """
    INSERT INTO budgets (id, user_id, name, total_amount, currency, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id
    """
    budget_id = await db_client.fetchval(
        query,
        budget_data["id"],
        budget_data["user_id"],
        budget_data["name"],
        budget_data["total_amount"],
        budget_data["currency"],
        budget_data["created_at"],
        budget_data["updated_at"]
    )
    return budget_id

async def create_budget_item(item_data: Dict[str, Any]) -> str:
    """Create a new budget item"""
    query = """
    INSERT INTO budget_items (id, budget_id, name, amount, category, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id
    """
    item_id = await db_client.fetchval(
        query,
        item_data["id"],
        item_data["budget_id"],
        item_data["name"],
        item_data["amount"],
        item_data["category"],
        item_data["created_at"],
        item_data["updated_at"]
    )
    return item_id

async def get_travel_recommendations(user_id: str) -> List[Dict[str, Any]]:
    """Get travel recommendations for a user"""
    query = "SELECT * FROM travel_recommendations WHERE user_id = $1"
    rows = await db_client.fetch(query, user_id)
    return [dict(row) for row in rows]

async def create_travel_recommendation(recommendation_data: Dict[str, Any]) -> str:
    """Create a new travel recommendation"""
    query = """
    INSERT INTO travel_recommendations 
    (id, user_id, destination, description, budget_estimate, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id
    """
    recommendation_id = await db_client.fetchval(
        query,
        recommendation_data["id"],
        recommendation_data["user_id"],
        recommendation_data["destination"],
        recommendation_data["description"],
        recommendation_data["budget_estimate"],
        recommendation_data["created_at"],
        recommendation_data["updated_at"]
    )
    return recommendation_id

# Example of a more complex query with joins
async def get_user_profile_with_memories(user_id: str) -> Dict[str, Any]:
    """Get a user profile with all their memories"""
    # Get user data
    user_query = "SELECT * FROM users WHERE id = $1"
    user_row = await db_client.fetchrow(user_query, user_id)
    
    if not user_row:
        return None
    
    user_data = dict(user_row)
    
    # Get user memories
    memories_query = "SELECT * FROM memories WHERE user_id = $1 ORDER BY created_at DESC"
    memory_rows = await db_client.fetch(memories_query, user_id)
    user_data["memories"] = [dict(row) for row in memory_rows]
    
    # Get user budget
    budget_query = "SELECT * FROM budgets WHERE user_id = $1"
    budget_row = await db_client.fetchrow(budget_query, user_id)
    
    if budget_row:
        budget_data = dict(budget_row)
        
        # Get budget items
        items_query = "SELECT * FROM budget_items WHERE budget_id = $1"
        item_rows = await db_client.fetch(items_query, budget_data["id"])
        budget_data["items"] = [dict(row) for row in item_rows]
        
        user_data["budget"] = budget_data
    
    # Get travel recommendations
    recommendations_query = "SELECT * FROM travel_recommendations WHERE user_id = $1"
    recommendation_rows = await db_client.fetch(recommendations_query, user_id)
    user_data["travel_recommendations"] = [dict(row) for row in recommendation_rows]
    
    return user_data

# Example of a search function
async def search_memories(user_id: str, search_term: str) -> List[Dict[str, Any]]:
    """Search for memories by title or description"""
    query = """
    SELECT * FROM memories 
    WHERE user_id = $1 AND (title ILIKE $2 OR description ILIKE $2)
    ORDER BY created_at DESC
    """
    search_pattern = f"%{search_term}%"
    rows = await db_client.fetch(query, user_id, search_pattern)
    return [dict(row) for row in rows]

# Example of a batch operation
async def batch_create_memories(memories: List[Dict[str, Any]]) -> List[str]:
    """Create multiple memories in a single transaction"""
    memory_ids = []
    
    async with db_client.transaction() as conn:
        for memory_data in memories:
            query = """
            INSERT INTO memories (id, user_id, title, description, image_path, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id
            """
            memory_id = await conn.fetchval(
                query,
                memory_data["id"],
                memory_data["user_id"],
                memory_data["title"],
                memory_data["description"],
                memory_data["image_path"],
                memory_data["created_at"],
                memory_data["updated_at"]
            )
            memory_ids.append(memory_id)
    
    return memory_ids

# Example of a database health check
async def check_database_health() -> Dict[str, Any]:
    """Check database health and connectivity"""
    try:
        # Simple query to check if database is responsive
        start_time = asyncio.get_event_loop().time()
        await db_client.fetchval("SELECT 1")
        end_time = asyncio.get_event_loop().time()
        
        response_time = (end_time - start_time) * 1000  # Convert to milliseconds
        
        return {
            "status": "healthy",
            "response_time_ms": round(response_time, 2),
            "database_type": "postgresql" if db_client.use_postgres else "sqlite",
            "timestamp": datetime.datetime.now().isoformat()
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "database_type": "postgresql" if db_client.use_postgres else "sqlite",
            "timestamp": datetime.datetime.now().isoformat()
        }

# Example usage in FastAPI endpoints
"""
from fastapi import FastAPI, Depends, HTTPException, status
from typing import List

app = FastAPI()

@app.get("/api/v1/users/{user_id}")
async def get_user(user_id: str):
    user = await get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.get("/api/v1/users/{user_id}/profile")
async def get_user_profile(user_id: str):
    profile = await get_user_profile_with_memories(user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")
    return profile

@app.get("/api/v1/users/{user_id}/memories")
async def list_user_memories(user_id: str):
    memories = await get_memories_by_user(user_id)
    return memories

@app.get("/api/v1/users/{user_id}/memories/search")
async def search_user_memories(user_id: str, q: str):
    memories = await search_memories(user_id, q)
    return memories

@app.get("/api/v1/health/db")
async def db_health_check():
    health = await check_database_health()
    if health["status"] != "healthy":
        return health, status.HTTP_503_SERVICE_UNAVAILABLE
    return health
"""

if __name__ == "__main__":
    # Example of how to use the async database client
    async def main():
        # Check database health
        health = await check_database_health()
        print(f"Database health: {health}")
        
        # Close connections
        await db_client.close()
    
    asyncio.run(main())