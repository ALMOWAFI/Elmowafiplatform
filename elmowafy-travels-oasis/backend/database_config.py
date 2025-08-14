"""Database Configuration Module

This module provides configuration for database connections.
"""

import os

def get_postgres_connection_string():
    """Get PostgreSQL connection string from environment variables"""
    host = os.getenv("DB_HOST", "localhost")
    port = os.getenv("DB_PORT", "5432")
    database = os.getenv("DB_NAME", "elmowafy")
    user = os.getenv("DB_USER", "postgres")
    password = os.getenv("DB_PASSWORD", "postgres")
    
    return f"postgresql://{user}:{password}@{host}:{port}/{database}"

def get_sqlite_connection_string():
    """Get SQLite connection string"""
    return "sqlite:///./elmowafy.db"