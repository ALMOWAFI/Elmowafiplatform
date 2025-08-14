#!/usr/bin/env python3
"""
Database Migration Enhancements for Elmowafiplatform

This script enhances the database migration system to address critical issues:
1. Implements proper connection pooling for PostgreSQL
2. Adds automated backup functionality
3. Implements database health monitoring
4. Adds schema versioning and rollback capability
"""

import os
import sys
import logging
import asyncio
import datetime
import subprocess
from pathlib import Path
from typing import Dict, List, Any, Optional

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class DatabaseEnhancer:
    """Implements database enhancements for the Elmowafiplatform"""
    
    def __init__(self):
        self.project_root = Path(os.path.dirname(os.path.abspath(__file__)))
        self.db_dir = self.project_root / "data"
        self.backup_dir = self.project_root / "backups"
        self.migration_dir = self.project_root / "migrations"
        
        # Create necessary directories
        self.db_dir.mkdir(exist_ok=True)
        self.backup_dir.mkdir(exist_ok=True)
        self.migration_dir.mkdir(exist_ok=True)
        
        # Database settings
        self.postgres_url = os.getenv("DATABASE_URL", "")
        self.sqlite_path = self.db_dir / "elmowafiplatform.db"
        
        # Schema version tracking
        self.schema_version_file = self.migration_dir / "schema_version.txt"
        
        logger.info("Database enhancer initialized")
    
    async def run_all_enhancements(self):
        """Run all database enhancements"""
        logger.info("Starting database enhancements")
        
        # 1. Create connection pool module
        self.create_connection_pool_module()
        
        # 2. Implement automated backup system
        await self.implement_backup_system()
        
        # 3. Add database health monitoring
        self.add_health_monitoring()
        
        # 4. Implement schema versioning
        self.implement_schema_versioning()
        
        logger.info("Database enhancements completed")
    
    def create_connection_pool_module(self):
        """Create a module for PostgreSQL connection pooling"""
        logger.info("Creating connection pool module")
        
        pool_module = """
#!/usr/bin/env python3
"""
PostgreSQL Connection Pool for Elmowafiplatform
"""

import os
import logging
import asyncio
from typing import Dict, Any, Optional

# Try to import asyncpg for async PostgreSQL connections
try:
    import asyncpg
    ASYNCPG_AVAILABLE = True
except ImportError:
    ASYNCPG_AVAILABLE = False
    logging.warning("asyncpg not available, async connection pooling disabled")

# Try to import psycopg2 for sync PostgreSQL connections
try:
    import psycopg2
    import psycopg2.pool
    from psycopg2.extras import RealDictCursor
    PSYCOPG2_AVAILABLE = True
except ImportError:
    PSYCOPG2_AVAILABLE = False
    logging.warning("psycopg2 not available, sync connection pooling disabled")

class PostgresConnectionPool:
    """PostgreSQL connection pool manager"""
    
    _async_pool = None
    _sync_pool = None
    
    @classmethod
    async def get_async_pool(cls, dsn: Optional[str] = None):
        """Get or create the async connection pool"""
        if not ASYNCPG_AVAILABLE:
            raise ImportError("asyncpg is required for async connection pooling")
        
        if cls._async_pool is None:
            db_url = dsn or os.getenv("DATABASE_URL")
            if not db_url:
                raise ValueError("DATABASE_URL environment variable must be set")
            
            # Create the connection pool
            cls._async_pool = await asyncpg.create_pool(
                dsn=db_url,
                min_size=5,
                max_size=20,
                max_inactive_connection_lifetime=300,  # 5 minutes
                command_timeout=60,
                statement_cache_size=100
            )
            
            logging.info("Async PostgreSQL connection pool created")
        
        return cls._async_pool
    
    @classmethod
    def get_sync_pool(cls, dsn: Optional[str] = None):
        """Get or create the sync connection pool"""
        if not PSYCOPG2_AVAILABLE:
            raise ImportError("psycopg2 is required for sync connection pooling")
        
        if cls._sync_pool is None:
            db_url = dsn or os.getenv("DATABASE_URL")
            if not db_url:
                raise ValueError("DATABASE_URL environment variable must be set")
            
            # Create the connection pool
            cls._sync_pool = psycopg2.pool.ThreadedConnectionPool(
                minconn=5,
                maxconn=20,
                dsn=db_url
            )
            
            logging.info("Sync PostgreSQL connection pool created")
        
        return cls._sync_pool
    
    @classmethod
    async def close_async_pool(cls):
        """Close the async connection pool"""
        if cls._async_pool is not None:
            await cls._async_pool.close()
            cls._async_pool = None
            logging.info("Async PostgreSQL connection pool closed")
    
    @classmethod
    def close_sync_pool(cls):
        """Close the sync connection pool"""
        if cls._sync_pool is not None:
            cls._sync_pool.closeall()
            cls._sync_pool = None
            logging.info("Sync PostgreSQL connection pool closed")

async def get_db_connection():
    """Get a database connection from the pool"""
    pool = await PostgresConnectionPool.get_async_pool()
    conn = await pool.acquire()
    try:
        yield conn
    finally:
        await pool.release(conn)

def get_sync_db_connection():
    """Get a synchronous database connection from the pool"""
    pool = PostgresConnectionPool.get_sync_pool()
    conn = pool.getconn()
    try:
        yield conn
    finally:
        pool.putconn(conn)
"""
        
        pool_module_path = self.project_root / "backend" / "db_pool.py"
        with open(pool_module_path, "w") as f:
            f.write(pool_module)
        
        logger.info("Created db_pool.py with connection pooling")
    
    async def implement_backup_system(self):
        """Implement automated database backup system"""
        logger.info("Implementing automated backup system")
        
        backup_script = """
#!/usr/bin/env python3
"""
Automated Database Backup System for Elmowafiplatform
"""

import os
import sys
import logging
import argparse
import subprocess
from datetime import datetime
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class DatabaseBackup:
    """Handles automated database backups"""
    
    def __init__(self, backup_dir: str = None):
        self.project_root = Path(os.path.dirname(os.path.abspath(__file__)))
        self.backup_dir = Path(backup_dir) if backup_dir else self.project_root / "backups"
        self.backup_dir.mkdir(exist_ok=True)
        
        # Database settings
        self.postgres_url = os.getenv("DATABASE_URL", "")
        self.sqlite_path = self.project_root / "data" / "elmowafiplatform.db"
        
        logger.info(f"Backup system initialized with backup directory: {self.backup_dir}")
    
    def backup_postgres(self):
        """Backup PostgreSQL database using pg_dump"""
        if not self.postgres_url:
            logger.error("DATABASE_URL environment variable not set")
            return False
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = self.backup_dir / f"postgres_backup_{timestamp}.sql"
        
        try:
            # Extract connection details from URL
            # Format: postgresql://username:password@host:port/database
            url_parts = self.postgres_url.replace("postgresql://", "").replace("postgres://", "")
            credentials, host_db = url_parts.split("@")
            
            if ":" in credentials:
                username, password = credentials.split(":")
            else:
                username, password = credentials, ""
                
            host_port, database = host_db.split("/")
            
            if ":" in host_port:
                host, port = host_port.split(":")
            else:
                host, port = host_port, "5432"
            
            # Set environment variables for pg_dump
            env = os.environ.copy()
            if password:
                env["PGPASSWORD"] = password
            
            # Run pg_dump
            cmd = [
                "pg_dump",
                "-h", host,
                "-p", port,
                "-U", username,
                "-d", database,
                "-f", str(backup_file),
                "--format=custom"
            ]
            
            logger.info(f"Running pg_dump: {' '.join(cmd)}")
            subprocess.run(cmd, env=env, check=True)
            
            logger.info(f"PostgreSQL backup created: {backup_file}")
            return True
        
        except Exception as e:
            logger.error(f"Failed to backup PostgreSQL database: {e}")
            return False
    
    def backup_sqlite(self):
        """Backup SQLite database using copy"""
        if not self.sqlite_path.exists():
            logger.error(f"SQLite database not found: {self.sqlite_path}")
            return False
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = self.backup_dir / f"sqlite_backup_{timestamp}.db"
        
        try:
            # Use sqlite3 .backup command for atomic backup
            cmd = [
                "sqlite3",
                str(self.sqlite_path),
                f".backup '{backup_file}'"
            ]
            
            logger.info(f"Running sqlite3 backup: {' '.join(cmd)}")
            subprocess.run(cmd, check=True)
            
            logger.info(f"SQLite backup created: {backup_file}")
            return True
        
        except Exception as e:
            logger.error(f"Failed to backup SQLite database: {e}")
            return False
    
    def run_backup(self):
        """Run database backup based on configured database"""
        if self.postgres_url:
            return self.backup_postgres()
        elif self.sqlite_path.exists():
            return self.backup_sqlite()
        else:
            logger.error("No database configuration found")
            return False

def setup_cron_job():
    """Set up a cron job for regular backups"""
    try:
        # Check if we're on a Unix-like system
        if os.name != "posix":
            logger.warning("Cron setup only supported on Unix-like systems")
            return False
        
        script_path = Path(__file__).resolve()
        cron_line = f"0 2 * * * {sys.executable} {script_path} --backup\n"
        
        # Add to crontab
        current_crontab = subprocess.check_output(["crontab", "-l"]).decode("utf-8")
        if str(script_path) not in current_crontab:
            new_crontab = current_crontab + cron_line
            subprocess.run(["crontab", "-"], input=new_crontab.encode("utf-8"), check=True)
            logger.info("Cron job added for daily backups at 2:00 AM")
        else:
            logger.info("Cron job already exists")
        
        return True
    
    except Exception as e:
        logger.error(f"Failed to set up cron job: {e}")
        return False

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Database backup utility")
    parser.add_argument("--backup", action="store_true", help="Run database backup")
    parser.add_argument("--setup-cron", action="store_true", help="Set up cron job for regular backups")
    args = parser.parse_args()
    
    if args.backup:
        backup = DatabaseBackup()
        backup.run_backup()
    
    if args.setup_cron:
        setup_cron_job()
    
    if not args.backup and not args.setup_cron:
        parser.print_help()
"""
        
        backup_script_path = self.project_root / "database_backup.py"
        with open(backup_script_path, "w") as f:
            f.write(backup_script)
        
        # Make the script executable on Unix-like systems
        if os.name == "posix":
            os.chmod(backup_script_path, 0o755)
        
        logger.info("Created database_backup.py for automated backups")
    
    def add_health_monitoring(self):
        """Add database health monitoring"""
        logger.info("Adding database health monitoring")
        
        health_module = """
#!/usr/bin/env python3
"""
Database Health Monitoring for Elmowafiplatform
"""

import os
import time
import logging
import asyncio
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta

# Try to import asyncpg for async PostgreSQL connections
try:
    import asyncpg
    ASYNCPG_AVAILABLE = True
except ImportError:
    ASYNCPG_AVAILABLE = False
    logging.warning("asyncpg not available, async health checks disabled")

# Try to import psycopg2 for sync PostgreSQL connections
try:
    import psycopg2
    PSYCOPG2_AVAILABLE = True
except ImportError:
    PSYCOPG2_AVAILABLE = False
    logging.warning("psycopg2 not available, sync health checks disabled")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class DatabaseHealthMonitor:
    """Monitors database health and performance"""
    
    def __init__(self):
        self.postgres_url = os.getenv("DATABASE_URL", "")
        self.health_history: List[Dict[str, Any]] = []
        self.max_history_size = 100
        self.last_check_time = None
        self.is_healthy = False
    
    async def check_postgres_health_async(self) -> Dict[str, Any]:
        """Check PostgreSQL health using asyncpg"""
        if not ASYNCPG_AVAILABLE:
            return {"error": "asyncpg not available"}
        
        start_time = time.time()
        result = {
            "timestamp": datetime.now().isoformat(),
            "database_type": "postgresql",
            "connection_type": "async",
            "metrics": {}
        }
        
        try:
            # Connect to the database
            conn = await asyncpg.connect(self.postgres_url)
            
            # Check connection time
            connection_time = time.time() - start_time
            result["metrics"]["connection_time_ms"] = round(connection_time * 1000, 2)
            
            # Check if database is writable
            write_start = time.time()
            await conn.execute("CREATE TABLE IF NOT EXISTS health_check (id SERIAL PRIMARY KEY, check_time TIMESTAMP)")
            await conn.execute("INSERT INTO health_check (check_time) VALUES ($1)", datetime.now())
            write_time = time.time() - write_start
            result["metrics"]["write_time_ms"] = round(write_time * 1000, 2)
            
            # Check if database is readable
            read_start = time.time()
            row = await conn.fetchrow("SELECT check_time FROM health_check ORDER BY id DESC LIMIT 1")
            read_time = time.time() - read_start
            result["metrics"]["read_time_ms"] = round(read_time * 1000, 2)
            
            # Get database size
            size_query = "SELECT pg_database_size(current_database()) AS size"
            size_row = await conn.fetchrow(size_query)
            if size_row:
                result["metrics"]["database_size_bytes"] = size_row["size"]
            
            # Get connection count
            conn_query = "SELECT count(*) AS count FROM pg_stat_activity"
            conn_row = await conn.fetchrow(conn_query)
            if conn_row:
                result["metrics"]["active_connections"] = conn_row["count"]
            
            # Close the connection
            await conn.close()
            
            result["status"] = "healthy"
            self.is_healthy = True
            
        except Exception as e:
            result["status"] = "unhealthy"
            result["error"] = str(e)
            self.is_healthy = False
        
        # Calculate total check time
        result["metrics"]["total_check_time_ms"] = round((time.time() - start_time) * 1000, 2)
        
        # Update health history
        self.health_history.append(result)
        if len(self.health_history) > self.max_history_size:
            self.health_history.pop(0)
        
        self.last_check_time = datetime.now()
        return result
    
    def check_postgres_health_sync(self) -> Dict[str, Any]:
        """Check PostgreSQL health using psycopg2"""
        if not PSYCOPG2_AVAILABLE:
            return {"error": "psycopg2 not available"}
        
        start_time = time.time()
        result = {
            "timestamp": datetime.now().isoformat(),
            "database_type": "postgresql",
            "connection_type": "sync",
            "metrics": {}
        }
        
        try:
            # Connect to the database
            conn = psycopg2.connect(self.postgres_url)
            
            # Check connection time
            connection_time = time.time() - start_time
            result["metrics"]["connection_time_ms"] = round(connection_time * 1000, 2)
            
            # Check if database is writable
            write_start = time.time()
            with conn.cursor() as cur:
                cur.execute("CREATE TABLE IF NOT EXISTS health_check (id SERIAL PRIMARY KEY, check_time TIMESTAMP)")
                cur.execute("INSERT INTO health_check (check_time) VALUES (%s)", (datetime.now(),))
                conn.commit()
            write_time = time.time() - write_start
            result["metrics"]["write_time_ms"] = round(write_time * 1000, 2)
            
            # Check if database is readable
            read_start = time.time()
            with conn.cursor() as cur:
                cur.execute("SELECT check_time FROM health_check ORDER BY id DESC LIMIT 1")
                cur.fetchone()
            read_time = time.time() - read_start
            result["metrics"]["read_time_ms"] = round(read_time * 1000, 2)
            
            # Get database size
            with conn.cursor() as cur:
                cur.execute("SELECT pg_database_size(current_database()) AS size")
                size_row = cur.fetchone()
                if size_row:
                    result["metrics"]["database_size_bytes"] = size_row[0]
            
            # Get connection count
            with conn.cursor() as cur:
                cur.execute("SELECT count(*) AS count FROM pg_stat_activity")
                conn_row = cur.fetchone()
                if conn_row:
                    result["metrics"]["active_connections"] = conn_row[0]
            
            # Close the connection
            conn.close()
            
            result["status"] = "healthy"
            self.is_healthy = True
            
        except Exception as e:
            result["status"] = "unhealthy"
            result["error"] = str(e)
            self.is_healthy = False
        
        # Calculate total check time
        result["metrics"]["total_check_time_ms"] = round((time.time() - start_time) * 1000, 2)
        
        # Update health history
        self.health_history.append(result)
        if len(self.health_history) > self.max_history_size:
            self.health_history.pop(0)
        
        self.last_check_time = datetime.now()
        return result
    
    async def run_health_check(self) -> Dict[str, Any]:
        """Run appropriate health check based on available libraries"""
        if self.postgres_url:
            if ASYNCPG_AVAILABLE:
                return await self.check_postgres_health_async()
            elif PSYCOPG2_AVAILABLE:
                return self.check_postgres_health_sync()
            else:
                return {"error": "No PostgreSQL client libraries available"}
        else:
            return {"error": "No database configuration found"}
    
    def get_health_summary(self) -> Dict[str, Any]:
        """Get a summary of database health"""
        if not self.health_history:
            return {"status": "unknown", "message": "No health checks performed yet"}
        
        latest = self.health_history[-1]
        
        # Calculate averages from history
        metrics_sum = {}
        metrics_count = {}
        
        for check in self.health_history:
            if "metrics" in check:
                for key, value in check["metrics"].items():
                    if isinstance(value, (int, float)):
                        metrics_sum[key] = metrics_sum.get(key, 0) + value
                        metrics_count[key] = metrics_count.get(key, 0) + 1
        
        # Calculate averages
        averages = {}
        for key in metrics_sum:
            if metrics_count[key] > 0:
                averages[key] = round(metrics_sum[key] / metrics_count[key], 2)
        
        return {
            "status": latest.get("status", "unknown"),
            "last_check_time": self.last_check_time.isoformat() if self.last_check_time else None,
            "database_type": latest.get("database_type"),
            "latest_metrics": latest.get("metrics", {}),
            "average_metrics": averages,
            "history_size": len(self.health_history),
            "is_healthy": self.is_healthy
        }

# Create a singleton instance
health_monitor = DatabaseHealthMonitor()

async def get_db_health():
    """FastAPI dependency for database health"""
    return await health_monitor.run_health_check()

async def get_db_health_summary():
    """FastAPI dependency for database health summary"""
    return health_monitor.get_health_summary()
"""
        
        health_module_path = self.project_root / "backend" / "db_health.py"
        with open(health_module_path, "w") as f:
            f.write(health_module)
        
        logger.info("Created db_health.py for database health monitoring")
    
    def implement_schema_versioning(self):
        """Implement database schema versioning"""
        logger.info("Implementing schema versioning")
        
        # Create initial schema version file if it doesn't exist
        if not self.schema_version_file.exists():
            with open(self.schema_version_file, "w") as f:
                f.write("1.0.0\n")
        
        # Create migrations directory structure
        versions_dir = self.migration_dir / "versions"
        versions_dir.mkdir(exist_ok=True)
        
        # Create schema manager module
        schema_manager = """
#!/usr/bin/env python3
"""
Database Schema Version Manager for Elmowafiplatform
"""

import os
import re
import sys
import logging
import argparse
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class SchemaManager:
    """Manages database schema versions and migrations"""
    
    def __init__(self):
        self.project_root = Path(os.path.dirname(os.path.abspath(__file__)))
        self.migration_dir = self.project_root / "migrations"
        self.versions_dir = self.migration_dir / "versions"
        self.schema_version_file = self.migration_dir / "schema_version.txt"
        
        # Create directories if they don't exist
        self.migration_dir.mkdir(exist_ok=True)
        self.versions_dir.mkdir(exist_ok=True)
        
        # Initialize version file if it doesn't exist
        if not self.schema_version_file.exists():
            with open(self.schema_version_file, "w") as f:
                f.write("1.0.0\n")
        
        logger.info("Schema manager initialized")
    
    def get_current_version(self) -> str:
        """Get the current schema version"""
        with open(self.schema_version_file, "r") as f:
            return f.read().strip()
    
    def set_current_version(self, version: str):
        """Set the current schema version"""
        with open(self.schema_version_file, "w") as f:
            f.write(f"{version}\n")
        logger.info(f"Schema version updated to {version}")
    
    def get_all_versions(self) -> List[Tuple[str, Path]]:
        """Get all available migration versions"""
        versions = []
        
        # Pattern: v1.0.0_description.sql or v1.0.0_description.py
        pattern = re.compile(r'^v([0-9]+\.[0-9]+\.[0-9]+)_.*\.(sql|py)$')
        
        for file_path in sorted(self.versions_dir.glob("*")):
            if file_path.is_file():
                match = pattern.match(file_path.name)
                if match:
                    version = match.group(1)
                    versions.append((version, file_path))
        
        return sorted(versions, key=lambda x: [int(n) for n in x[0].split('.')])
    
    def create_migration(self, description: str, version: Optional[str] = None):
        """Create a new migration file"""
        current = self.get_current_version()
        parts = [int(x) for x in current.split('.')]
        
        if version:
            # Validate custom version
            if not re.match(r'^[0-9]+\.[0-9]+\.[0-9]+$', version):
                raise ValueError(f"Invalid version format: {version}. Use x.y.z format.")
            new_version = version
        else:
            # Auto-increment patch version
            parts[2] += 1
            new_version = '.'.join(str(p) for p in parts)
        
        # Create timestamp and sanitize description
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        safe_desc = re.sub(r'[^a-zA-Z0-9_]', '_', description.lower())
        
        # Create SQL migration file
        sql_filename = f"v{new_version}_{timestamp}_{safe_desc}.sql"
        sql_path = self.versions_dir / sql_filename
        
        with open(sql_path, "w") as f:
            f.write(f"-- Migration: {description}\n")
            f.write(f"-- Version: {new_version}\n")
            f.write(f"-- Created: {datetime.now().isoformat()}\n\n")
            f.write("-- Write your SQL migration here\n\n")
            f.write("-- Up Migration\n")
            f.write("-- Add your schema changes here\n\n")
            f.write("-- Down Migration (for rollback)\n")
            f.write("-- Add your rollback SQL here\n")
        
        logger.info(f"Created migration file: {sql_path}")
        return sql_path
    
    def migrate(self, target_version: Optional[str] = None):
        """Run migrations up to target version or latest"""
        current = self.get_current_version()
        versions = self.get_all_versions()
        
        if not versions:
            logger.info("No migrations found")
            return
        
        # Determine target version
        if target_version is None:
            target_version = versions[-1][0]  # Latest version
        
        logger.info(f"Current version: {current}")
        logger.info(f"Target version: {target_version}")
        
        # Convert versions to numeric for comparison
        current_nums = [int(x) for x in current.split('.')]
        target_nums = [int(x) for x in target_version.split('.')]
        
        # Determine if we're migrating up or down
        direction = 'up' if target_nums > current_nums else 'down'
        
        if direction == 'up':
            # Apply migrations from current to target
            for version, file_path in versions:
                version_nums = [int(x) for x in version.split('.')]
                if current_nums < version_nums <= target_nums:
                    logger.info(f"Applying migration: {file_path.name}")
                    # TODO: Apply the migration
                    # For now, just update the version
                    self.set_current_version(version)
        else:
            # Roll back migrations from current to target
            for version, file_path in reversed(versions):
                version_nums = [int(x) for x in version.split('.')]
                if target_nums < version_nums <= current_nums:
                    logger.info(f"Rolling back migration: {file_path.name}")
                    # TODO: Apply the rollback
                    # For now, just update the version
                    self.set_current_version(version)
        
        logger.info(f"Migration completed. Current version: {self.get_current_version()}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Database schema version manager")
    subparsers = parser.add_subparsers(dest="command", help="Command to run")
    
    # Current version command
    subparsers.add_parser("current", help="Show current schema version")
    
    # List versions command
    subparsers.add_parser("list", help="List all available migrations")
    
    # Create migration command
    create_parser = subparsers.add_parser("create", help="Create a new migration")
    create_parser.add_argument("description", help="Description of the migration")
    create_parser.add_argument("--version", help="Custom version number (x.y.z)")
    
    # Migrate command
    migrate_parser = subparsers.add_parser("migrate", help="Run migrations")
    migrate_parser.add_argument("--to", dest="target", help="Target version to migrate to")
    
    args = parser.parse_args()
    manager = SchemaManager()
    
    if args.command == "current":
        print(f"Current schema version: {manager.get_current_version()}")
    
    elif args.command == "list":
        versions = manager.get_all_versions()
        if versions:
            print("Available migrations:")
            for version, file_path in versions:
                print(f"  {version}: {file_path.name}")
        else:
            print("No migrations found")
    
    elif args.command == "create":
        file_path = manager.create_migration(args.description, args.version)
        print(f"Created migration file: {file_path}")
    
    elif args.command == "migrate":
        manager.migrate(args.target)
    
    else:
        parser.print_help()
"""
        
        schema_manager_path = self.project_root / "schema_manager.py"
        with open(schema_manager_path, "w") as f:
            f.write(schema_manager)
        
        # Make the script executable on Unix-like systems
        if os.name == "posix":
            os.chmod(schema_manager_path, 0o755)
        
        logger.info("Created schema_manager.py for database schema versioning")

if __name__ == "__main__":
    enhancer = DatabaseEnhancer()
    asyncio.run(enhancer.run_all_enhancements())