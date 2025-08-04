#!/usr/bin/env python3
"""
Database Migration Scripts for Elmowafiplatform
Handles migration from SQLite to PostgreSQL unified database
"""

import os
import json
import uuid
import logging
import psycopg2
import sqlite3
from datetime import datetime
from typing import Dict, List, Any, Optional
from psycopg2.extras import RealDictCursor
import asyncio

logger = logging.getLogger(__name__)

class DatabaseMigrator:
    """Handles migration from SQLite to PostgreSQL unified database"""
    
    def __init__(self, postgres_url: str, sqlite_path: str = "data/elmowafiplatform.db"):
        self.postgres_url = postgres_url
        self.sqlite_path = sqlite_path
        self.migration_log = []
    
    async def get_postgres_connection(self):
        """Get PostgreSQL connection"""
        try:
            conn = psycopg2.connect(self.postgres_url)
            return conn
        except Exception as e:
            logger.error(f"Failed to connect to PostgreSQL: {e}")
            return None
    
    def get_sqlite_connection(self):
        """Get SQLite connection"""
        try:
            conn = sqlite3.connect(self.sqlite_path)
            conn.row_factory = sqlite3.Row
            return conn
        except Exception as e:
            logger.error(f"Failed to connect to SQLite: {e}")
            return None
    
    async def run_migration(self):
        """Run complete migration process"""
        logger.info("Starting database migration...")
        
        # Step 1: Create unified schema
        await self.create_unified_schema()
        
        # Step 2: Migrate users and family data
        await self.migrate_users_and_family()
        
        # Step 3: Migrate memories and photos
        await self.migrate_memories()
        
        # Step 4: Migrate budget data (if available)
        await self.migrate_budget_data()
        
        # Step 5: Migrate game sessions
        await self.migrate_game_sessions()
        
        # Step 6: Migrate travel plans
        await self.migrate_travel_plans()
        
        # Step 7: Migrate cultural heritage
        await self.migrate_cultural_heritage()
        
        # Step 8: Create default family groups
        await self.create_default_family_groups()
        
        logger.info("Migration completed successfully!")
        return self.migration_log
    
    async def create_unified_schema(self):
        """Create the unified database schema"""
        logger.info("Creating unified database schema...")
        
        conn = await self.get_postgres_connection()
        if not conn:
            return
        
        try:
            with conn.cursor() as cur:
                # Read and execute the unified schema
                with open('unified_database_schema.sql', 'r') as f:
                    schema_sql = f.read()
                
                # Split by semicolon and execute each statement
                statements = schema_sql.split(';')
                for statement in statements:
                    statement = statement.strip()
                    if statement and not statement.startswith('--'):
                        cur.execute(statement)
                
                conn.commit()
                logger.info("Unified schema created successfully")
                
        except Exception as e:
            logger.error(f"Error creating schema: {e}")
            conn.rollback()
        finally:
            conn.close()
    
    async def migrate_users_and_family(self):
        """Migrate users and family members from SQLite"""
        logger.info("Migrating users and family members...")
        
        sqlite_conn = self.get_sqlite_connection()
        postgres_conn = await self.get_postgres_connection()
        
        if not sqlite_conn or not postgres_conn:
            return
        
        try:
            # Get existing family members from SQLite
            with sqlite_conn:
                cur = sqlite_conn.cursor()
                cur.execute("SELECT * FROM family_members")
                family_members = cur.fetchall()
            
            # Migrate family members to PostgreSQL
            with postgres_conn.cursor() as cur:
                for member in family_members:
                    # Create user record
                    user_id = str(uuid.uuid4())
                    cur.execute("""
                        INSERT INTO users (id, email, username, display_name, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        ON CONFLICT (id) DO NOTHING
                    """, (
                        user_id,
                        f"{member['name'].lower().replace(' ', '.')}@family.com",
                        member['name'].lower().replace(' ', '_'),
                        member['name'],
                        member['created_at'],
                        member['updated_at']
                    ))
                    
                    # Create family member record
                    cur.execute("""
                        INSERT INTO family_members (id, user_id, name, name_arabic, birth_date, 
                                                  location, avatar, relationships, role, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (id) DO NOTHING
                    """, (
                        member['id'],
                        user_id,
                        member['name'],
                        member.get('name_arabic'),
                        member.get('birth_date'),
                        member.get('location'),
                        member.get('avatar'),
                        member.get('relationships'),
                        'member',
                        member['created_at'],
                        member['updated_at']
                    ))
            
            postgres_conn.commit()
            logger.info(f"Migrated {len(family_members)} family members")
            
        except Exception as e:
            logger.error(f"Error migrating family members: {e}")
            postgres_conn.rollback()
        finally:
            sqlite_conn.close()
            postgres_conn.close()
    
    async def migrate_memories(self):
        """Migrate memories and photos from SQLite"""
        logger.info("Migrating memories and photos...")
        
        sqlite_conn = self.get_sqlite_connection()
        postgres_conn = await self.get_postgres_connection()
        
        if not sqlite_conn or not postgres_conn:
            return
        
        try:
            # Get existing memories from SQLite
            with sqlite_conn:
                cur = sqlite_conn.cursor()
                cur.execute("SELECT * FROM memories")
                memories = cur.fetchall()
            
            # Create default family group for migration
            with postgres_conn.cursor() as cur:
                # Create a default family group
                default_family_group_id = str(uuid.uuid4())
                cur.execute("""
                    INSERT INTO family_groups (id, name, description, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO NOTHING
                """, (
                    default_family_group_id,
                    "Default Family",
                    "Family group created during migration",
                    datetime.now().isoformat(),
                    datetime.now().isoformat()
                ))
                
                # Migrate memories
                for memory in memories:
                    cur.execute("""
                        INSERT INTO memories (id, family_group_id, title, description, date, 
                                           location, image_url, tags, family_members, ai_analysis,
                                           memory_type, privacy_level, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (id) DO NOTHING
                    """, (
                        memory['id'],
                        default_family_group_id,
                        memory['title'],
                        memory.get('description'),
                        memory['date'],
                        memory.get('location'),
                        memory.get('image_url'),
                        memory.get('tags'),
                        memory.get('family_members'),
                        memory.get('ai_analysis'),
                        'photo',
                        'family',
                        memory['created_at'],
                        memory['updated_at']
                    ))
            
            postgres_conn.commit()
            logger.info(f"Migrated {len(memories)} memories")
            
        except Exception as e:
            logger.error(f"Error migrating memories: {e}")
            postgres_conn.rollback()
        finally:
            sqlite_conn.close()
            postgres_conn.close()
    
    async def migrate_budget_data(self):
        """Migrate budget data from Wasp system (if available)"""
        logger.info("Migrating budget data...")
        
        # This would connect to the Wasp budget database
        # For now, we'll create a placeholder migration
        postgres_conn = await self.get_postgres_connection()
        
        if not postgres_conn:
            return
        
        try:
            with postgres_conn.cursor() as cur:
                # Create a default budget profile for the default family group
                default_family_group_id = cur.execute("""
                    SELECT id FROM family_groups WHERE name = 'Default Family' LIMIT 1
                """).fetchone()
                
                if default_family_group_id:
                    budget_profile_id = str(uuid.uuid4())
                    cur.execute("""
                        INSERT INTO budget_profiles (id, family_group_id, name, description, currency, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (id) DO NOTHING
                    """, (
                        budget_profile_id,
                        default_family_group_id[0],
                        "Default Budget",
                        "Budget profile created during migration",
                        "USD",
                        datetime.now().isoformat(),
                        datetime.now().isoformat()
                    ))
                    
                    # Create some default budget envelopes
                    default_envelopes = [
                        ("Food & Dining", "Food and dining expenses", "🍽️", "#FF6B6B"),
                        ("Transportation", "Transportation and travel expenses", "🚗", "#4ECDC4"),
                        ("Entertainment", "Entertainment and recreation", "🎮", "#45B7D1"),
                        ("Shopping", "Shopping and personal items", "🛍️", "#96CEB4"),
                        ("Bills & Utilities", "Bills and utility payments", "💡", "#FFEAA7")
                    ]
                    
                    for name, description, icon, color in default_envelopes:
                        cur.execute("""
                            INSERT INTO budget_envelopes (id, budget_profile_id, name, description, 
                                                        icon, color, created_at, updated_at)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        """, (
                            str(uuid.uuid4()),
                            budget_profile_id,
                            name,
                            description,
                            icon,
                            color,
                            datetime.now().isoformat(),
                            datetime.now().isoformat()
                        ))
            
            postgres_conn.commit()
            logger.info("Created default budget profile and envelopes")
            
        except Exception as e:
            logger.error(f"Error migrating budget data: {e}")
            postgres_conn.rollback()
        finally:
            postgres_conn.close()
    
    async def migrate_game_sessions(self):
        """Migrate game sessions from SQLite"""
        logger.info("Migrating game sessions...")
        
        sqlite_conn = self.get_sqlite_connection()
        postgres_conn = await self.get_postgres_connection()
        
        if not sqlite_conn or not postgres_conn:
            return
        
        try:
            # Get existing game sessions from SQLite
            with sqlite_conn:
                cur = sqlite_conn.cursor()
                cur.execute("SELECT * FROM game_sessions")
                game_sessions = cur.fetchall()
            
            # Get default family group
            with postgres_conn.cursor() as cur:
                default_family_group = cur.execute("""
                    SELECT id FROM family_groups WHERE name = 'Default Family' LIMIT 1
                """).fetchone()
                
                if default_family_group:
                    for session in game_sessions:
                        cur.execute("""
                            INSERT INTO game_sessions (id, family_group_id, game_type, title, description,
                                                    players, status, game_state, settings, current_phase,
                                                    ai_decisions, score_data, created_at, updated_at)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                            ON CONFLICT (id) DO NOTHING
                        """, (
                            session['id'],
                            default_family_group[0],
                            session['game_type'],
                            f"{session['game_type'].title()} Session",
                            f"Game session from {session['created_at']}",
                            session['players'],
                            session['status'],
                            session.get('game_state'),
                            session.get('settings'),
                            session.get('current_phase'),
                            session.get('ai_decisions'),
                            '{}',  # Default empty score data
                            session['created_at'],
                            session['updated_at']
                        ))
            
            postgres_conn.commit()
            logger.info(f"Migrated {len(game_sessions)} game sessions")
            
        except Exception as e:
            logger.error(f"Error migrating game sessions: {e}")
            postgres_conn.rollback()
        finally:
            sqlite_conn.close()
            postgres_conn.close()
    
    async def migrate_travel_plans(self):
        """Migrate travel plans from SQLite"""
        logger.info("Migrating travel plans...")
        
        sqlite_conn = self.get_sqlite_connection()
        postgres_conn = await self.get_postgres_connection()
        
        if not sqlite_conn or not postgres_conn:
            return
        
        try:
            # Get existing travel plans from SQLite
            with sqlite_conn:
                cur = sqlite_conn.cursor()
                cur.execute("SELECT * FROM travel_plans")
                travel_plans = cur.fetchall()
            
            # Get default family group
            with postgres_conn.cursor() as cur:
                default_family_group = cur.execute("""
                    SELECT id FROM family_groups WHERE name = 'Default Family' LIMIT 1
                """).fetchone()
                
                if default_family_group:
                    for plan in travel_plans:
                        cur.execute("""
                            INSERT INTO travel_plans (id, family_group_id, name, destination, start_date,
                                                   end_date, budget, participants, activities, status,
                                                   created_at, updated_at)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                            ON CONFLICT (id) DO NOTHING
                        """, (
                            plan['id'],
                            default_family_group[0],
                            plan['name'],
                            plan['destination'],
                            plan['start_date'],
                            plan['end_date'],
                            plan.get('budget'),
                            plan.get('participants'),
                            plan.get('activities'),
                            'planning',
                            plan['created_at'],
                            plan['updated_at']
                        ))
            
            postgres_conn.commit()
            logger.info(f"Migrated {len(travel_plans)} travel plans")
            
        except Exception as e:
            logger.error(f"Error migrating travel plans: {e}")
            postgres_conn.rollback()
        finally:
            sqlite_conn.close()
            postgres_conn.close()
    
    async def migrate_cultural_heritage(self):
        """Migrate cultural heritage from SQLite"""
        logger.info("Migrating cultural heritage...")
        
        sqlite_conn = self.get_sqlite_connection()
        postgres_conn = await self.get_postgres_connection()
        
        if not sqlite_conn or not postgres_conn:
            return
        
        try:
            # Get existing cultural heritage from SQLite
            with sqlite_conn:
                cur = sqlite_conn.cursor()
                cur.execute("SELECT * FROM cultural_heritage")
                heritage_items = cur.fetchall()
            
            # Get default family group
            with postgres_conn.cursor() as cur:
                default_family_group = cur.execute("""
                    SELECT id FROM family_groups WHERE name = 'Default Family' LIMIT 1
                """).fetchone()
                
                if default_family_group:
                    for item in heritage_items:
                        cur.execute("""
                            INSERT INTO cultural_heritage (id, family_group_id, title, title_arabic,
                                                        description, description_arabic, category,
                                                        family_members, cultural_significance, tags,
                                                        preservation_date, created_at, updated_at)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                            ON CONFLICT (id) DO NOTHING
                        """, (
                            item['id'],
                            default_family_group[0],
                            item['title'],
                            item.get('title_arabic'),
                            item.get('description'),
                            item.get('description_arabic'),
                            item.get('category'),
                            item.get('family_members'),
                            item.get('cultural_significance'),
                            item.get('tags'),
                            item.get('preservation_date'),
                            item['created_at'],
                            item['updated_at']
                        ))
            
            postgres_conn.commit()
            logger.info(f"Migrated {len(heritage_items)} cultural heritage items")
            
        except Exception as e:
            logger.error(f"Error migrating cultural heritage: {e}")
            postgres_conn.rollback()
        finally:
            sqlite_conn.close()
            postgres_conn.close()
    
    async def create_default_family_groups(self):
        """Create default family groups and link existing data"""
        logger.info("Creating default family groups...")
        
        postgres_conn = await self.get_postgres_connection()
        
        if not postgres_conn:
            return
        
        try:
            with postgres_conn.cursor() as cur:
                # Link family members to the default family group
                cur.execute("""
                    INSERT INTO family_group_members (id, family_group_id, family_member_id, role, joined_at)
                    SELECT 
                        uuid_generate_v4(),
                        fg.id,
                        fm.id,
                        'member',
                        fm.created_at
                    FROM family_groups fg
                    CROSS JOIN family_members fm
                    WHERE fg.name = 'Default Family'
                    ON CONFLICT (family_group_id, family_member_id) DO NOTHING
                """)
            
            postgres_conn.commit()
            logger.info("Linked family members to default family group")
            
        except Exception as e:
            logger.error(f"Error creating default family groups: {e}")
            postgres_conn.rollback()
        finally:
            postgres_conn.close()

async def run_migration():
    """Main migration function"""
    # Get database URL from environment
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        logger.error("DATABASE_URL environment variable not set")
        return
    
    migrator = DatabaseMigrator(database_url)
    await migrator.run_migration()

if __name__ == "__main__":
    asyncio.run(run_migration()) 