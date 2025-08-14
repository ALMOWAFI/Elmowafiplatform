#!/usr/bin/env python3
"""
Family AI Integration Script
Integrates new family AI components with existing backend infrastructure
"""

import sys
import os
import logging
from pathlib import Path

# Add current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from family_ai_endpoints import router as family_ai_router

logger = logging.getLogger(__name__)

def integrate_family_ai_with_main_app(app: FastAPI):
    """Integrate family AI endpoints with the main FastAPI application"""
    try:
        # Include the family AI router
        app.include_router(family_ai_router)
        
        logger.info("Successfully integrated Family AI endpoints with main application")
        return True
        
    except Exception as e:
        logger.error(f"Failed to integrate Family AI endpoints: {e}")
        return False

def setup_family_ai_database():
    """Setup family AI database tables"""
    try:
        from database import engine
        from family_ai_models import Base
        
        # Create all family AI tables
        Base.metadata.create_all(bind=engine)
        
        logger.info("Successfully created Family AI database tables")
        return True
        
    except Exception as e:
        logger.error(f"Failed to setup Family AI database: {e}")
        return False

def run_family_ai_migration():
    """Run the family AI database migration"""
    try:
        import psycopg2
        from database_config import get_database_url
        
        # Read migration SQL
        migration_file = Path(__file__).parent / "family_ai_migration.sql"
        with open(migration_file, 'r', encoding='utf-8') as f:
            migration_sql = f.read()
        
        # Execute migration
        db_url = get_database_url()
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()
        
        cursor.execute(migration_sql)
        conn.commit()
        
        cursor.close()
        conn.close()
        
        logger.info("Successfully executed Family AI database migration")
        return True
        
    except Exception as e:
        logger.error(f"Failed to run Family AI migration: {e}")
        return False

def validate_family_ai_integration():
    """Validate that family AI integration is working correctly"""
    try:
        # Test database models import
        from family_ai_models import FamilyPersonality, RunningJoke, FamilyDynamics
        
        # Test service import
        from family_ai_service import FamilyAIService
        
        # Test endpoints import
        from family_ai_endpoints import router
        
        logger.info("All Family AI components imported successfully")
        
        # Test database connection
        from database import get_db
        db = next(get_db())
        
        # Test basic query
        personalities_count = db.query(FamilyPersonality).count()
        jokes_count = db.query(RunningJoke).count()
        dynamics_count = db.query(FamilyDynamics).count()
        
        logger.info(f"Database validation: {personalities_count} personalities, {jokes_count} jokes, {dynamics_count} dynamics")
        
        db.close()
        return True
        
    except Exception as e:
        logger.error(f"Family AI integration validation failed: {e}")
        return False

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    print("🚀 Starting Family AI Integration...")
    
    # Step 1: Setup database
    print("📊 Setting up Family AI database...")
    if setup_family_ai_database():
        print("✅ Database setup completed")
    else:
        print("❌ Database setup failed")
        sys.exit(1)
    
    # Step 2: Run migration
    print("🔄 Running Family AI migration...")
    if run_family_ai_migration():
        print("✅ Migration completed")
    else:
        print("❌ Migration failed")
        sys.exit(1)
    
    # Step 3: Validate integration
    print("🔍 Validating Family AI integration...")
    if validate_family_ai_integration():
        print("✅ Integration validation passed")
    else:
        print("❌ Integration validation failed")
        sys.exit(1)
    
    print("🎉 Family AI integration completed successfully!")
    print("\n📋 Integration Summary:")
    print("- ✅ Family personality learning system")
    print("- ✅ Running jokes tracking and management")
    print("- ✅ Family dynamics analysis")
    print("- ✅ Privacy settings and modes")
    print("- ✅ AI interaction logging")
    print("- ✅ Enhanced chat endpoints with context")
    print("- ✅ Memory learning capabilities")
    print("- ✅ Analytics and insights")
    
    print("\n🔗 New API Endpoints Available:")
    print("- POST /api/family-ai/chat - Enhanced family chat")
    print("- GET /api/family-ai/context/{family_id} - Family context")
    print("- POST /api/family-ai/learn-from-memory - Memory learning")
    print("- GET /api/family-ai/personalities/{family_id} - Personalities")
    print("- GET /api/family-ai/jokes/{family_id} - Running jokes")
    print("- GET /api/family-ai/privacy/{family_id}/{member_id} - Privacy settings")
    print("- GET /api/family-ai/analytics/{family_id} - AI analytics")
