#!/usr/bin/env python3
"""
Supabase Client Integration for Elmowafiplatform
Unified database layer replacing SQLite with PostgreSQL + Real-time features
"""

import os
import logging
from typing import Optional, Dict, List, Any
from datetime import datetime
import asyncio
from supabase import create_client, Client
from supabase.lib.client_options import ClientOptions
import asyncpg
from postgrest import SyncAPIResponse

# Configure logging
logger = logging.getLogger(__name__)

class ElmowafiSupabaseClient:
    """
    Enhanced Supabase client for family platform
    Handles all database operations with real-time capabilities
    """
    
    def __init__(self):
        self.supabase_url = os.environ.get('SUPABASE_URL', 'https://sbp-3ff238b46587d965872a7702338a2d6f6fceae47.supabase.co')
        self.supabase_key = os.environ.get('SUPABASE_ANON_KEY', '')
        self.supabase_service_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')
        
        # Initialize clients
        self.client: Optional[Client] = None
        self.admin_client: Optional[Client] = None
        self.pg_pool = None
        
    async def initialize(self):
        """Initialize Supabase connections"""
        try:
            # Initialize standard client
            if self.supabase_key:
                self.client = create_client(
                    self.supabase_url,
                    self.supabase_key,
                    options=ClientOptions(
                        auto_refresh_token=True,
                        persist_session=True
                    )
                )
            
            # Initialize admin client for privileged operations
            if self.supabase_service_key:
                self.admin_client = create_client(
                    self.supabase_url,
                    self.supabase_service_key
                )
            
            # Initialize direct PostgreSQL connection for complex queries
            if self.supabase_url and self.supabase_service_key:
                db_url = self.supabase_url.replace('https://', 'postgresql://postgres:')
                db_url = db_url.replace('.supabase.co', '.supabase.co:5432/postgres')
                
                self.pg_pool = await asyncpg.create_pool(
                    db_url,
                    min_size=1,
                    max_size=10
                )
            
            logger.info("✅ Supabase client initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize Supabase client: {e}")
            return False
    
    async def close(self):
        """Close database connections"""
        if self.pg_pool:
            await self.pg_pool.close()
    
    # ================================================
    # FAMILY MANAGEMENT
    # ================================================
    
    async def create_family_group(self, name: str, description: str = None, 
                                 cultural_background: str = None) -> Dict[str, Any]:
        """Create a new family group"""
        try:
            response = self.admin_client.table('family_groups').insert({
                'name': name,
                'description': description,
                'cultural_background': cultural_background,
                'primary_language': 'ar',
                'secondary_language': 'en'
            }).execute()
            
            return {
                'success': True,
                'data': response.data[0] if response.data else None
            }
        except Exception as e:
            logger.error(f"Error creating family group: {e}")
            return {'success': False, 'error': str(e)}
    
    async def get_family_groups_for_user(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all family groups a user belongs to"""
        try:
            response = self.client.table('family_member_profiles').select(
                'family_group_id, family_group_name, cultural_background'
            ).eq('user_id', user_id).execute()
            
            return response.data if response.data else []
        except Exception as e:
            logger.error(f"Error getting family groups: {e}")
            return []
    
    async def add_family_member(self, family_group_id: str, user_id: str, 
                               name: str, name_arabic: str = None, 
                               role: str = 'member') -> Dict[str, Any]:
        """Add a member to a family group"""
        try:
            response = self.admin_client.table('family_members').insert({
                'family_group_id': family_group_id,
                'user_id': user_id,
                'name': name,
                'name_arabic': name_arabic,
                'role': role
            }).execute()
            
            return {
                'success': True,
                'data': response.data[0] if response.data else None
            }
        except Exception as e:
            logger.error(f"Error adding family member: {e}")
            return {'success': False, 'error': str(e)}
    
    # ================================================
    # MEMORY MANAGEMENT
    # ================================================
    
    async def create_memory_collection(self, family_group_id: str, name: str,
                                     collection_type: str = 'album',
                                     created_by: str = None) -> Dict[str, Any]:
        """Create a new memory collection"""
        try:
            response = self.client.table('memory_collections').insert({
                'family_group_id': family_group_id,
                'name': name,
                'collection_type': collection_type,
                'created_by': created_by
            }).execute()
            
            return {
                'success': True,
                'data': response.data[0] if response.data else None
            }
        except Exception as e:
            logger.error(f"Error creating memory collection: {e}")
            return {'success': False, 'error': str(e)}
    
    async def upload_memory(self, family_group_id: str, title: str,
                           file_url: str = None, ai_analysis: Dict = None,
                           created_by: str = None, collection_id: str = None,
                           tags: List[str] = None) -> Dict[str, Any]:
        """Upload a new family memory"""
        try:
            memory_data = {
                'family_group_id': family_group_id,
                'title': title,
                'file_url': file_url,
                'ai_analysis': ai_analysis,
                'created_by': created_by,
                'collection_id': collection_id,
                'tags': tags or [],
                'date_taken': datetime.now().isoformat()
            }
            
            response = self.client.table('memories').insert(memory_data).execute()
            
            return {
                'success': True,
                'data': response.data[0] if response.data else None
            }
        except Exception as e:
            logger.error(f"Error uploading memory: {e}")
            return {'success': False, 'error': str(e)}
    
    async def get_family_memories(self, family_group_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get recent memories for a family"""
        try:
            response = self.client.table('memories').select(
                '*'
            ).eq('family_group_id', family_group_id).order(
                'created_at', desc=True
            ).limit(limit).execute()
            
            return response.data if response.data else []
        except Exception as e:
            logger.error(f"Error getting family memories: {e}")
            return []
    
    async def add_memory_reaction(self, memory_id: str, family_member_id: str,
                                 reaction_type: str = 'like') -> Dict[str, Any]:
        """Add reaction to a memory"""
        try:
            response = self.client.table('memory_reactions').upsert({
                'memory_id': memory_id,
                'family_member_id': family_member_id,
                'reaction_type': reaction_type
            }).execute()
            
            return {
                'success': True,
                'data': response.data[0] if response.data else None
            }
        except Exception as e:
            logger.error(f"Error adding memory reaction: {e}")
            return {'success': False, 'error': str(e)}
    
    # ================================================
    # TRAVEL MANAGEMENT
    # ================================================
    
    async def create_travel_plan(self, family_group_id: str, name: str,
                                destination: str, start_date: str, end_date: str,
                                created_by: str = None) -> Dict[str, Any]:
        """Create a new travel plan"""
        try:
            response = self.client.table('travel_plans').insert({
                'family_group_id': family_group_id,
                'name': name,
                'destination': destination,
                'start_date': start_date,
                'end_date': end_date,
                'created_by': created_by,
                'status': 'planning'
            }).execute()
            
            return {
                'success': True,
                'data': response.data[0] if response.data else None
            }
        except Exception as e:
            logger.error(f"Error creating travel plan: {e}")
            return {'success': False, 'error': str(e)}
    
    async def get_family_travel_plans(self, family_group_id: str) -> List[Dict[str, Any]]:
        """Get travel plans for a family"""
        try:
            response = self.client.table('travel_plans').select(
                '*'
            ).eq('family_group_id', family_group_id).order(
                'start_date', desc=True
            ).execute()
            
            return response.data if response.data else []
        except Exception as e:
            logger.error(f"Error getting travel plans: {e}")
            return []
    
    # ================================================
    # GAMING SYSTEM
    # ================================================
    
    async def create_game_session(self, family_group_id: str, name: str,
                                 game_type: str, created_by: str = None,
                                 max_players: int = 10) -> Dict[str, Any]:
        """Create a new game session"""
        try:
            response = self.client.table('game_sessions').insert({
                'family_group_id': family_group_id,
                'name': name,
                'game_type': game_type,
                'created_by': created_by,
                'max_players': max_players,
                'status': 'waiting'
            }).execute()
            
            return {
                'success': True,
                'data': response.data[0] if response.data else None
            }
        except Exception as e:
            logger.error(f"Error creating game session: {e}")
            return {'success': False, 'error': str(e)}
    
    async def join_game_session(self, game_session_id: str, family_member_id: str) -> Dict[str, Any]:
        """Join a game session"""
        try:
            response = self.client.table('game_players').insert({
                'game_session_id': game_session_id,
                'family_member_id': family_member_id,
                'player_status': 'alive'
            }).execute()
            
            return {
                'success': True,
                'data': response.data[0] if response.data else None
            }
        except Exception as e:
            logger.error(f"Error joining game session: {e}")
            return {'success': False, 'error': str(e)}
    
    # ================================================
    # REAL-TIME FEATURES
    # ================================================
    
    def subscribe_to_family_chat(self, family_group_id: str, callback):
        """Subscribe to real-time family chat"""
        try:
            return self.client.table('chat_messages').on(
                'INSERT', callback
            ).filter('family_group_id', 'eq', family_group_id).subscribe()
        except Exception as e:
            logger.error(f"Error subscribing to chat: {e}")
            return None
    
    def subscribe_to_memory_reactions(self, callback):
        """Subscribe to real-time memory reactions"""
        try:
            return self.client.table('memory_reactions').on(
                'INSERT', callback
            ).subscribe()
        except Exception as e:
            logger.error(f"Error subscribing to reactions: {e}")
            return None
    
    def subscribe_to_game_events(self, game_session_id: str, callback):
        """Subscribe to real-time game events"""
        try:
            return self.client.table('game_events').on(
                'INSERT', callback
            ).filter('game_session_id', 'eq', game_session_id).subscribe()
        except Exception as e:
            logger.error(f"Error subscribing to game events: {e}")
            return None
    
    # ================================================
    # AI INTEGRATION
    # ================================================
    
    async def save_ai_suggestion(self, family_group_id: str, suggestion_type: str,
                                title: str, description: str, suggestion_data: Dict) -> Dict[str, Any]:
        """Save AI-generated suggestion"""
        try:
            response = self.client.table('ai_suggestions').insert({
                'family_group_id': family_group_id,
                'suggestion_type': suggestion_type,
                'title': title,
                'description': description,
                'suggestion_data': suggestion_data,
                'relevance_score': 0.8  # Default relevance
            }).execute()
            
            return {
                'success': True,
                'data': response.data[0] if response.data else None
            }
        except Exception as e:
            logger.error(f"Error saving AI suggestion: {e}")
            return {'success': False, 'error': str(e)}
    
    async def get_ai_suggestions(self, family_group_id: str) -> List[Dict[str, Any]]:
        """Get AI suggestions for family"""
        try:
            response = self.client.table('ai_suggestions').select(
                '*'
            ).eq('family_group_id', family_group_id).eq(
                'status', 'pending'
            ).order('relevance_score', desc=True).execute()
            
            return response.data if response.data else []
        except Exception as e:
            logger.error(f"Error getting AI suggestions: {e}")
            return []
    
    # ================================================
    # FILE STORAGE
    # ================================================
    
    async def upload_file(self, bucket: str, file_path: str, file_data: bytes) -> Optional[str]:
        """Upload file to Supabase Storage"""
        try:
            response = self.client.storage.from_(bucket).upload(
                file_path, file_data
            )
            
            if response.get('error'):
                logger.error(f"File upload error: {response['error']}")
                return None
            
            # Get public URL
            public_url = self.client.storage.from_(bucket).get_public_url(file_path)
            return public_url
            
        except Exception as e:
            logger.error(f"Error uploading file: {e}")
            return None
    
    async def get_file_url(self, bucket: str, file_path: str) -> Optional[str]:
        """Get public URL for file"""
        try:
            return self.client.storage.from_(bucket).get_public_url(file_path)
        except Exception as e:
            logger.error(f"Error getting file URL: {e}")
            return None

# ================================================
# GLOBAL INSTANCE
# ================================================

# Global Supabase client instance
supabase_client = ElmowafiSupabaseClient()

async def init_supabase():
    """Initialize global Supabase client"""
    return await supabase_client.initialize()

async def get_supabase_client() -> ElmowafiSupabaseClient:
    """Get the global Supabase client"""
    if not supabase_client.client:
        await supabase_client.initialize()
    return supabase_client

# ================================================
# HELPER FUNCTIONS
# ================================================

async def health_check() -> Dict[str, Any]:
    """Check Supabase connection health"""
    try:
        client = await get_supabase_client()
        
        # Test connection with a simple query
        response = client.client.table('family_groups').select('id').limit(1).execute()
        
        return {
            'status': 'healthy',
            'database': 'connected',
            'timestamp': datetime.now().isoformat()
        }
    except Exception as e:
        return {
            'status': 'unhealthy',
            'database': 'disconnected',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }