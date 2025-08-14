#!/usr/bin/env python3
"""
Database Migration Implementation for Elmowafiplatform

This script implements the actual database migration process from SQLite to PostgreSQL,
building on the enhancements in database_migration_enhancements.py.

Features:
1. Asynchronous migration process
2. Progress tracking and reporting
3. Data validation during migration
4. Error handling and recovery
"""

import os
import sys
import json
import logging
import asyncio
import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple, Set

# Try to import required libraries
try:
    import asyncpg
    import aiosqlite
    ASYNC_LIBS_AVAILABLE = True
except ImportError:
    ASYNC_LIBS_AVAILABLE = False
    logging.warning("asyncpg and/or aiosqlite not available, falling back to synchronous mode")

try:
    import psycopg2
    import sqlite3
    SYNC_LIBS_AVAILABLE = True
except ImportError:
    SYNC_LIBS_AVAILABLE = False
    if not ASYNC_LIBS_AVAILABLE:
        logging.error("No database libraries available. Please install psycopg2 or asyncpg/aiosqlite")
        sys.exit(1)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class MigrationProgress:
    """Tracks and reports migration progress"""
    
    def __init__(self, total_tables: int = 0, total_rows: int = 0):
        self.start_time = datetime.datetime.now()
        self.end_time: Optional[datetime.datetime] = None
        self.total_tables = total_tables
        self.processed_tables = 0
        self.total_rows = total_rows
        self.processed_rows = 0
        self.current_table = ""
        self.errors: List[Dict[str, Any]] = []
        self.warnings: List[Dict[str, Any]] = []
        self.table_stats: Dict[str, Dict[str, Any]] = {}
    
    def start_table(self, table_name: str, row_count: int):
        """Mark the start of processing a table"""
        self.current_table = table_name
        self.table_stats[table_name] = {
            "start_time": datetime.datetime.now(),
            "end_time": None,
            "row_count": row_count,
            "processed_rows": 0,
            "errors": 0,
            "warnings": 0
        }
        logger.info(f"Starting migration of table '{table_name}' with {row_count} rows")
    
    def update_row_progress(self, rows_processed: int):
        """Update the row processing progress"""
        self.processed_rows += rows_processed
        if self.current_table in self.table_stats:
            self.table_stats[self.current_table]["processed_rows"] += rows_processed
    
    def finish_table(self):
        """Mark the completion of processing a table"""
        if self.current_table in self.table_stats:
            self.table_stats[self.current_table]["end_time"] = datetime.datetime.now()
        self.processed_tables += 1
        logger.info(f"Completed migration of table '{self.current_table}'")
        self.current_table = ""
    
    def add_error(self, table_name: str, error_type: str, details: Any):
        """Add an error to the progress tracking"""
        error = {
            "table": table_name,
            "type": error_type,
            "details": str(details),
            "timestamp": datetime.datetime.now().isoformat()
        }
        self.errors.append(error)
        if table_name in self.table_stats:
            self.table_stats[table_name]["errors"] += 1
        logger.error(f"Error in table '{table_name}': {error_type} - {details}")
    
    def add_warning(self, table_name: str, warning_type: str, details: Any):
        """Add a warning to the progress tracking"""
        warning = {
            "table": table_name,
            "type": warning_type,
            "details": str(details),
            "timestamp": datetime.datetime.now().isoformat()
        }
        self.warnings.append(warning)
        if table_name in self.table_stats:
            self.table_stats[table_name]["warnings"] += 1
        logger.warning(f"Warning in table '{table_name}': {warning_type} - {details}")
    
    def complete(self):
        """Mark the migration as complete"""
        self.end_time = datetime.datetime.now()
        duration = self.end_time - self.start_time
        logger.info(f"Migration completed in {duration}")
        logger.info(f"Processed {self.processed_tables} tables and {self.processed_rows} rows")
        logger.info(f"Encountered {len(self.errors)} errors and {len(self.warnings)} warnings")
    
    def get_summary(self) -> Dict[str, Any]:
        """Get a summary of the migration progress"""
        duration = None
        if self.end_time:
            duration = (self.end_time - self.start_time).total_seconds()
        elif self.start_time:
            duration = (datetime.datetime.now() - self.start_time).total_seconds()
        
        return {
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "duration_seconds": duration,
            "total_tables": self.total_tables,
            "processed_tables": self.processed_tables,
            "total_rows": self.total_rows,
            "processed_rows": self.processed_rows,
            "current_table": self.current_table,
            "table_stats": self.table_stats,
            "error_count": len(self.errors),
            "warning_count": len(self.warnings),
            "status": "completed" if self.end_time else "in_progress"
        }
    
    def save_report(self, file_path: str):
        """Save a detailed report to a file"""
        report = {
            "summary": self.get_summary(),
            "errors": self.errors,
            "warnings": self.warnings,
            "table_details": self.table_stats
        }
        
        with open(file_path, "w") as f:
            json.dump(report, f, indent=2)
        
        logger.info(f"Migration report saved to {file_path}")

class DatabaseMigrator:
    """Implements the database migration process"""
    
    def __init__(self, sqlite_path: str, postgres_url: str):
        self.sqlite_path = sqlite_path
        self.postgres_url = postgres_url
        self.progress = MigrationProgress()
        self.batch_size = 1000  # Number of rows to process in a batch
        
        # Set of tables to exclude from migration (system tables, etc.)
        self.excluded_tables = {
            "sqlite_sequence",  # SQLite internal table
            "sqlite_stat1",    # SQLite internal table
            "sqlite_stat4",    # SQLite internal table
            "health_check"     # Created by health monitoring
        }
    
    async def run_async_migration(self):
        """Run the migration process using async libraries"""
        if not ASYNC_LIBS_AVAILABLE:
            logger.error("Async libraries not available. Please install asyncpg and aiosqlite")
            return False
        
        logger.info(f"Starting async migration from {self.sqlite_path} to PostgreSQL")
        
        try:
            # Connect to SQLite database
            sqlite_conn = await aiosqlite.connect(self.sqlite_path)
            sqlite_conn.row_factory = aiosqlite.Row
            
            # Connect to PostgreSQL database
            pg_conn = await asyncpg.connect(self.postgres_url)
            
            # Get list of tables from SQLite
            tables = await self.get_sqlite_tables_async(sqlite_conn)
            
            # Count total rows for progress tracking
            total_rows = 0
            for table in tables:
                if table in self.excluded_tables:
                    continue
                count = await self.count_table_rows_async(sqlite_conn, table)
                total_rows += count
            
            self.progress.total_tables = len(tables) - len(self.excluded_tables)
            self.progress.total_rows = total_rows
            
            # Process each table
            for table in tables:
                if table in self.excluded_tables:
                    logger.info(f"Skipping excluded table: {table}")
                    continue
                
                # Get table schema
                schema = await self.get_table_schema_async(sqlite_conn, table)
                
                # Create table in PostgreSQL
                await self.create_pg_table_async(pg_conn, table, schema)
                
                # Count rows for progress tracking
                row_count = await self.count_table_rows_async(sqlite_conn, table)
                self.progress.start_table(table, row_count)
                
                # Migrate data
                await self.migrate_table_data_async(sqlite_conn, pg_conn, table, schema)
                
                self.progress.finish_table()
            
            # Close connections
            await sqlite_conn.close()
            await pg_conn.close()
            
            self.progress.complete()
            return True
            
        except Exception as e:
            logger.error(f"Error during async migration: {e}")
            self.progress.add_error("global", "migration_error", str(e))
            return False
    
    def run_sync_migration(self):
        """Run the migration process using synchronous libraries"""
        if not SYNC_LIBS_AVAILABLE:
            logger.error("Sync libraries not available. Please install psycopg2 and sqlite3")
            return False
        
        logger.info(f"Starting sync migration from {self.sqlite_path} to PostgreSQL")
        
        try:
            # Connect to SQLite database
            sqlite_conn = sqlite3.connect(self.sqlite_path)
            sqlite_conn.row_factory = sqlite3.Row
            
            # Connect to PostgreSQL database
            pg_conn = psycopg2.connect(self.postgres_url)
            pg_conn.autocommit = False
            
            # Get list of tables from SQLite
            tables = self.get_sqlite_tables_sync(sqlite_conn)
            
            # Count total rows for progress tracking
            total_rows = 0
            for table in tables:
                if table in self.excluded_tables:
                    continue
                count = self.count_table_rows_sync(sqlite_conn, table)
                total_rows += count
            
            self.progress.total_tables = len(tables) - len(self.excluded_tables)
            self.progress.total_rows = total_rows
            
            # Process each table
            for table in tables:
                if table in self.excluded_tables:
                    logger.info(f"Skipping excluded table: {table}")
                    continue
                
                # Get table schema
                schema = self.get_table_schema_sync(sqlite_conn, table)
                
                # Create table in PostgreSQL
                self.create_pg_table_sync(pg_conn, table, schema)
                
                # Count rows for progress tracking
                row_count = self.count_table_rows_sync(sqlite_conn, table)
                self.progress.start_table(table, row_count)
                
                # Migrate data
                self.migrate_table_data_sync(sqlite_conn, pg_conn, table, schema)
                
                self.progress.finish_table()
            
            # Close connections
            sqlite_conn.close()
            pg_conn.close()
            
            self.progress.complete()
            return True
            
        except Exception as e:
            logger.error(f"Error during sync migration: {e}")
            self.progress.add_error("global", "migration_error", str(e))
            return False
    
    async def get_sqlite_tables_async(self, conn) -> List[str]:
        """Get list of tables from SQLite database (async)"""
        query = "SELECT name FROM sqlite_master WHERE type='table';"
        cursor = await conn.execute(query)
        rows = await cursor.fetchall()
        return [row[0] for row in rows]
    
    def get_sqlite_tables_sync(self, conn) -> List[str]:
        """Get list of tables from SQLite database (sync)"""
        query = "SELECT name FROM sqlite_master WHERE type='table';"
        cursor = conn.cursor()
        cursor.execute(query)
        rows = cursor.fetchall()
        return [row[0] for row in rows]
    
    async def count_table_rows_async(self, conn, table: str) -> int:
        """Count rows in a table (async)"""
        query = f"SELECT COUNT(*) FROM '{table}';"
        cursor = await conn.execute(query)
        row = await cursor.fetchone()
        return row[0] if row else 0
    
    def count_table_rows_sync(self, conn, table: str) -> int:
        """Count rows in a table (sync)"""
        query = f"SELECT COUNT(*) FROM '{table}';"
        cursor = conn.cursor()
        cursor.execute(query)
        row = cursor.fetchone()
        return row[0] if row else 0
    
    async def get_table_schema_async(self, conn, table: str) -> List[Dict[str, Any]]:
        """Get table schema from SQLite (async)"""
        query = f"PRAGMA table_info('{table}');"
        cursor = await conn.execute(query)
        rows = await cursor.fetchall()
        
        schema = []
        for row in rows:
            column = {
                "cid": row[0],
                "name": row[1],
                "type": row[2],
                "notnull": row[3],
                "dflt_value": row[4],
                "pk": row[5]
            }
            schema.append(column)
        
        return schema
    
    def get_table_schema_sync(self, conn, table: str) -> List[Dict[str, Any]]:
        """Get table schema from SQLite (sync)"""
        query = f"PRAGMA table_info('{table}');"
        cursor = conn.cursor()
        cursor.execute(query)
        rows = cursor.fetchall()
        
        schema = []
        for row in rows:
            column = {
                "cid": row[0],
                "name": row[1],
                "type": row[2],
                "notnull": row[3],
                "dflt_value": row[4],
                "pk": row[5]
            }
            schema.append(column)
        
        return schema
    
    def sqlite_to_pg_type(self, sqlite_type: str) -> str:
        """Convert SQLite type to PostgreSQL type"""
        sqlite_type = sqlite_type.upper()
        
        # Type mapping
        type_map = {
            "INTEGER": "INTEGER",
            "INT": "INTEGER",
            "TINYINT": "SMALLINT",
            "SMALLINT": "SMALLINT",
            "MEDIUMINT": "INTEGER",
            "BIGINT": "BIGINT",
            "UNSIGNED BIG INT": "BIGINT",
            "INT2": "SMALLINT",
            "INT8": "BIGINT",
            "TEXT": "TEXT",
            "CLOB": "TEXT",
            "CHARACTER": "CHAR",
            "VARCHAR": "VARCHAR",
            "VARYING CHARACTER": "VARCHAR",
            "NCHAR": "CHAR",
            "NATIVE CHARACTER": "CHAR",
            "NVARCHAR": "VARCHAR",
            "REAL": "REAL",
            "DOUBLE": "DOUBLE PRECISION",
            "DOUBLE PRECISION": "DOUBLE PRECISION",
            "FLOAT": "REAL",
            "NUMERIC": "NUMERIC",
            "DECIMAL": "DECIMAL",
            "BOOLEAN": "BOOLEAN",
            "DATE": "DATE",
            "DATETIME": "TIMESTAMP",
            "TIMESTAMP": "TIMESTAMP",
            "BLOB": "BYTEA"
        }
        
        # Extract base type and size if present
        base_type = sqlite_type.split("(")[0].strip()
        size_match = None
        
        if "(" in sqlite_type and ")" in sqlite_type:
            size_match = sqlite_type[sqlite_type.find("(") + 1:sqlite_type.find(")")]
        
        # Get PostgreSQL type
        pg_type = type_map.get(base_type, "TEXT")  # Default to TEXT for unknown types
        
        # Add size if applicable
        if size_match and pg_type in ["VARCHAR", "CHAR", "NUMERIC", "DECIMAL"]:
            pg_type = f"{pg_type}({size_match})"
        
        return pg_type
    
    async def create_pg_table_async(self, conn, table: str, schema: List[Dict[str, Any]]):
        """Create table in PostgreSQL (async)"""
        # Build column definitions
        columns = []
        primary_keys = []
        
        for column in schema:
            name = column["name"]
            pg_type = self.sqlite_to_pg_type(column["type"])
            not_null = "NOT NULL" if column["notnull"] else ""
            default = f"DEFAULT {column['dflt_value']}" if column["dflt_value"] is not None else ""
            
            columns.append(f"\"{name}\" {pg_type} {not_null} {default}".strip())
            
            if column["pk"]:
                primary_keys.append(name)
        
        # Add primary key constraint if applicable
        if primary_keys:
            pk_constraint = f", PRIMARY KEY ({', '.join([f'\"{pk}\"' for pk in primary_keys])})"
        else:
            pk_constraint = ""
        
        # Create table query
        create_query = f"CREATE TABLE IF NOT EXISTS \"{table}\" ({', '.join(columns)}{pk_constraint});"
        
        try:
            # Create table
            await conn.execute(create_query)
            logger.info(f"Created table '{table}' in PostgreSQL")
            
        except Exception as e:
            logger.error(f"Error creating table '{table}' in PostgreSQL: {e}")
            self.progress.add_error(table, "create_table_error", str(e))
            raise
    
    def create_pg_table_sync(self, conn, table: str, schema: List[Dict[str, Any]]):
        """Create table in PostgreSQL (sync)"""
        # Build column definitions
        columns = []
        primary_keys = []
        
        for column in schema:
            name = column["name"]
            pg_type = self.sqlite_to_pg_type(column["type"])
            not_null = "NOT NULL" if column["notnull"] else ""
            default = f"DEFAULT {column['dflt_value']}" if column["dflt_value"] is not None else ""
            
            columns.append(f"\"{name}\" {pg_type} {not_null} {default}".strip())
            
            if column["pk"]:
                primary_keys.append(name)
        
        # Add primary key constraint if applicable
        if primary_keys:
            pk_constraint = f", PRIMARY KEY ({', '.join([f'\"{pk}\"' for pk in primary_keys])})"
        else:
            pk_constraint = ""
        
        # Create table query
        create_query = f"CREATE TABLE IF NOT EXISTS \"{table}\" ({', '.join(columns)}{pk_constraint});"
        
        try:
            # Create table
            cursor = conn.cursor()
            cursor.execute(create_query)
            conn.commit()
            logger.info(f"Created table '{table}' in PostgreSQL")
            
        except Exception as e:
            conn.rollback()
            logger.error(f"Error creating table '{table}' in PostgreSQL: {e}")
            self.progress.add_error(table, "create_table_error", str(e))
            raise
    
    async def migrate_table_data_async(self, sqlite_conn, pg_conn, table: str, schema: List[Dict[str, Any]]):
        """Migrate data from SQLite to PostgreSQL (async)"""
        # Get column names
        column_names = [column["name"] for column in schema]
        columns_str = ", ".join([f'"{name}"' for name in column_names])
        
        # Prepare query to fetch data from SQLite
        sqlite_query = f"SELECT {columns_str} FROM '{table}';"
        
        try:
            # Fetch all rows from SQLite
            cursor = await sqlite_conn.execute(sqlite_query)
            
            # Process in batches
            batch = []
            batch_count = 0
            total_migrated = 0
            
            async for row in cursor:
                # Convert row to dict
                row_dict = {column_names[i]: row[i] for i in range(len(column_names))}
                batch.append(row_dict)
                batch_count += 1
                
                # Process batch when it reaches batch size
                if batch_count >= self.batch_size:
                    await self.insert_batch_async(pg_conn, table, column_names, batch)
                    total_migrated += batch_count
                    self.progress.update_row_progress(batch_count)
                    batch = []
                    batch_count = 0
            
            # Process remaining rows
            if batch:
                await self.insert_batch_async(pg_conn, table, column_names, batch)
                total_migrated += batch_count
                self.progress.update_row_progress(batch_count)
            
            logger.info(f"Migrated {total_migrated} rows from table '{table}'")
            
        except Exception as e:
            logger.error(f"Error migrating data for table '{table}': {e}")
            self.progress.add_error(table, "data_migration_error", str(e))
            raise
    
    def migrate_table_data_sync(self, sqlite_conn, pg_conn, table: str, schema: List[Dict[str, Any]]):
        """Migrate data from SQLite to PostgreSQL (sync)"""
        # Get column names
        column_names = [column["name"] for column in schema]
        columns_str = ", ".join([f'"{name}"' for name in column_names])
        
        # Prepare query to fetch data from SQLite
        sqlite_query = f"SELECT {columns_str} FROM '{table}';"
        
        try:
            # Fetch all rows from SQLite
            sqlite_cursor = sqlite_conn.cursor()
            sqlite_cursor.execute(sqlite_query)
            
            # Process in batches
            batch = []
            batch_count = 0
            total_migrated = 0
            
            while True:
                rows = sqlite_cursor.fetchmany(self.batch_size)
                if not rows:
                    break
                
                # Convert rows to dicts
                for row in rows:
                    row_dict = {column_names[i]: row[i] for i in range(len(column_names))}
                    batch.append(row_dict)
                    batch_count += 1
                
                # Insert batch
                self.insert_batch_sync(pg_conn, table, column_names, batch)
                total_migrated += batch_count
                self.progress.update_row_progress(batch_count)
                batch = []
                batch_count = 0
            
            logger.info(f"Migrated {total_migrated} rows from table '{table}'")
            
        except Exception as e:
            logger.error(f"Error migrating data for table '{table}': {e}")
            self.progress.add_error(table, "data_migration_error", str(e))
            raise
    
    async def insert_batch_async(self, conn, table: str, column_names: List[str], batch: List[Dict[str, Any]]):
        """Insert a batch of rows into PostgreSQL (async)"""
        if not batch:
            return
        
        # Prepare column names string
        columns_str = ", ".join([f'"{name}"' for name in column_names])
        
        # Prepare values placeholders
        placeholders = []
        values = []
        
        for i, row in enumerate(batch):
            row_placeholders = []
            for j, col in enumerate(column_names):
                placeholder = f"${len(values) + 1}"
                row_placeholders.append(placeholder)
                values.append(row.get(col))
            
            placeholders.append(f"({', '.join(row_placeholders)})")
        
        # Prepare insert query
        insert_query = f"INSERT INTO \"{table}\" ({columns_str}) VALUES {', '.join(placeholders)};"
        
        # Execute insert
        try:
            await conn.execute(insert_query, *values)
        except Exception as e:
            logger.error(f"Error inserting batch into table '{table}': {e}")
            self.progress.add_error(table, "batch_insert_error", str(e))
            raise
    
    def insert_batch_sync(self, conn, table: str, column_names: List[str], batch: List[Dict[str, Any]]):
        """Insert a batch of rows into PostgreSQL (sync)"""
        if not batch:
            return
        
        # Prepare column names string
        columns_str = ", ".join([f'"{name}"' for name in column_names])
        
        # Prepare values placeholders
        placeholders = []
        for i in range(len(batch)):
            row_placeholders = []
            for j in range(len(column_names)):
                row_placeholders.append(f"%s")
            
            placeholders.append(f"({', '.join(row_placeholders)})")
        
        # Prepare values
        values = []
        for row in batch:
            row_values = [row.get(col) for col in column_names]
            values.extend(row_values)
        
        # Prepare insert query
        insert_query = f"INSERT INTO \"{table}\" ({columns_str}) VALUES {', '.join(placeholders)};"
        
        # Execute insert
        try:
            cursor = conn.cursor()
            cursor.execute(insert_query, values)
            conn.commit()
        except Exception as e:
            conn.rollback()
            logger.error(f"Error inserting batch into table '{table}': {e}")
            self.progress.add_error(table, "batch_insert_error", str(e))
            raise

    def run_migration(self):
        """Run the migration process using the best available method"""
        # Create report directory
        report_dir = Path(os.path.dirname(os.path.abspath(__file__))) / "migration_reports"
        report_dir.mkdir(exist_ok=True)
        
        # Generate report filename
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        report_file = report_dir / f"migration_report_{timestamp}.json"
        
        try:
            # Run migration using the best available method
            if ASYNC_LIBS_AVAILABLE:
                success = asyncio.run(self.run_async_migration())
            elif SYNC_LIBS_AVAILABLE:
                success = self.run_sync_migration()
            else:
                logger.error("No database libraries available")
                return False
            
            # Save migration report
            self.progress.save_report(str(report_file))
            
            return success
            
        except Exception as e:
            logger.error(f"Migration failed: {e}")
            self.progress.add_error("global", "migration_failure", str(e))
            self.progress.complete()
            self.progress.save_report(str(report_file))
            return False

def main():
    """Main function to run the migration"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Database Migration Tool for Elmowafiplatform")
    parser.add_argument("--sqlite", help="Path to SQLite database file", default="data/elmowafiplatform.db")
    parser.add_argument("--postgres", help="PostgreSQL connection URL", default=os.getenv("DATABASE_URL"))
    args = parser.parse_args()
    
    if not args.postgres:
        logger.error("PostgreSQL connection URL not provided. Set DATABASE_URL environment variable or use --postgres")
        return 1
    
    # Run migration
    migrator = DatabaseMigrator(args.sqlite, args.postgres)
    success = migrator.run_migration()
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())