#!/usr/bin/env python3
"""
Game State Synchronization Engine for Elmowafiplatform
Redis-backed persistent game state management with real-time synchronization
"""

import os
import json
import uuid
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Set, Tuple, Callable
from dataclasses import dataclass, asdict
from enum import Enum
import pickle
import hashlib
from collections import defaultdict

from redis_manager import redis_manager
from logging_config import get_logger
from performance_monitoring import performance_monitor
from unified_database import get_unified_database

logger = get_logger("game_state_sync")

class SyncOperationType(Enum):
    """Types of synchronization operations"""
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    MERGE = "merge"
    CONFLICT = "conflict"

class GameStateType(Enum):
    """Types of game states that can be synchronized"""
    MAFIA_GAME = "mafia_game"
    MEMORY_MATCH = "memory_match"
    FAMILY_TRIVIA = "family_trivia"
    PHOTO_QUIZ = "photo_quiz"
    STORY_BUILDER = "story_builder"
    WORD_ASSOCIATION = "word_association"
    TIMELINE_GAME = "timeline_game"

@dataclass
class GameStateDelta:
    """Represents a change in game state"""
    session_id: str
    operation_type: SyncOperationType
    field_path: str  # dot-notation path like "players.player1.health"
    old_value: Any
    new_value: Any
    timestamp: datetime
    server_id: str
    player_id: Optional[str] = None
    sequence_number: int = 0
    checksum: str = ""
    
    def __post_init__(self):
        if not self.checksum:
            self.checksum = self._calculate_checksum()
    
    def _calculate_checksum(self) -> str:
        """Calculate checksum for delta integrity"""
        data = f"{self.session_id}{self.field_path}{self.old_value}{self.new_value}{self.timestamp.isoformat()}"
        return hashlib.md5(data.encode()).hexdigest()

@dataclass 
class GameStateSnapshot:
    """Complete game state snapshot"""
    session_id: str
    game_type: GameStateType
    state_data: Dict[str, Any]
    version: int
    timestamp: datetime
    server_id: str
    checksum: str = ""
    
    def __post_init__(self):
        if not self.checksum:
            self.checksum = self._calculate_checksum()
    
    def _calculate_checksum(self) -> str:
        """Calculate checksum for state integrity"""
        state_json = json.dumps(self.state_data, sort_keys=True, default=str)
        data = f"{self.session_id}{state_json}{self.version}{self.timestamp.isoformat()}"
        return hashlib.md5(data.encode()).hexdigest()

class GameStateSynchronizer:
    """Redis-backed game state synchronization engine"""
    
    def __init__(self):
        self.db = get_unified_database()
        self.server_id = os.getenv('SERVER_ID', f'server_{uuid.uuid4().hex[:8]}')
        
        # Configuration
        self.state_ttl = int(os.getenv('GAME_STATE_TTL', 86400))  # 24 hours
        self.delta_ttl = int(os.getenv('GAME_DELTA_TTL', 3600))   # 1 hour
        self.sync_interval = int(os.getenv('SYNC_INTERVAL', 5))   # 5 seconds
        self.max_deltas_per_sync = int(os.getenv('MAX_DELTAS_PER_SYNC', 100))
        
        # In-memory caches
        self.local_state_cache: Dict[str, GameStateSnapshot] = {}
        self.pending_deltas: Dict[str, List[GameStateDelta]] = defaultdict(list)
        self.conflict_handlers: Dict[str, Callable] = {}
        
        # Synchronization tracking
        self.last_sync_timestamps: Dict[str, datetime] = {}
        self.sequence_numbers: Dict[str, int] = defaultdict(int)
        
        # Performance metrics
        self.sync_operations = 0
        self.conflict_resolutions = 0
        self.state_writes = 0
        self.state_reads = 0
        
        logger.info(f"Game State Synchronizer initialized for server: {self.server_id}")
    
    async def startup(self):
        """Initialize synchronization system"""
        try:
            # Start background sync task
            self.sync_task = asyncio.create_task(self._background_sync_loop())
            
            # Register default conflict handlers
            self._register_default_conflict_handlers()
            
            logger.info("Game State Synchronizer started successfully")
        except Exception as e:
            logger.error(f"Failed to start Game State Synchronizer: {e}")
            raise
    
    async def shutdown(self):
        """Cleanup synchronization system"""
        try:
            if hasattr(self, 'sync_task'):
                self.sync_task.cancel()
                try:
                    await self.sync_task
                except asyncio.CancelledError:
                    pass
            
            # Final sync of pending changes
            await self._sync_all_pending_deltas()
            
            logger.info("Game State Synchronizer shut down successfully")
        except Exception as e:
            logger.error(f"Error during Game State Synchronizer shutdown: {e}")
    
    @performance_monitor.track_function_performance
    async def create_game_state(
        self,
        session_id: str,
        game_type: GameStateType,
        initial_state: Dict[str, Any]
    ) -> bool:
        """Create new game state with Redis persistence"""
        try:
            # Create snapshot
            snapshot = GameStateSnapshot(
                session_id=session_id,
                game_type=game_type,
                state_data=initial_state,
                version=1,
                timestamp=datetime.now(),
                server_id=self.server_id
            )
            
            # Store in Redis
            success = await self._store_game_state(snapshot)
            
            if success:
                # Cache locally
                self.local_state_cache[session_id] = snapshot
                
                # Create delta for creation
                delta = GameStateDelta(
                    session_id=session_id,
                    operation_type=SyncOperationType.CREATE,
                    field_path="",
                    old_value=None,
                    new_value=initial_state,
                    timestamp=datetime.now(),
                    server_id=self.server_id,
                    sequence_number=self._get_next_sequence(session_id)
                )
                
                await self._store_delta(delta)
                self.state_writes += 1
                
                logger.info(f"Game state created: {session_id}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to create game state {session_id}: {e}")
            return False
    
    @performance_monitor.track_function_performance
    async def update_game_state(
        self,
        session_id: str,
        field_path: str,
        new_value: Any,
        player_id: Optional[str] = None
    ) -> bool:
        """Update specific field in game state with conflict detection"""
        try:
            # Get current state
            current_snapshot = await self.get_game_state(session_id)
            if not current_snapshot:
                logger.error(f"Game state not found: {session_id}")
                return False
            
            # Get old value
            old_value = self._get_nested_value(current_snapshot.state_data, field_path)
            
            # Check for conflicts with pending deltas
            conflict_detected = await self._check_for_conflicts(session_id, field_path, old_value)
            
            if conflict_detected:
                logger.warning(f"Conflict detected for {session_id}:{field_path}")
                await self._handle_conflict(session_id, field_path, old_value, new_value, player_id)
                return False
            
            # Apply update
            updated_state = current_snapshot.state_data.copy()
            self._set_nested_value(updated_state, field_path, new_value)
            
            # Create new snapshot
            new_snapshot = GameStateSnapshot(
                session_id=session_id,
                game_type=current_snapshot.game_type,
                state_data=updated_state,
                version=current_snapshot.version + 1,
                timestamp=datetime.now(),
                server_id=self.server_id
            )
            
            # Store updated state
            success = await self._store_game_state(new_snapshot)
            
            if success:
                # Update local cache
                self.local_state_cache[session_id] = new_snapshot
                
                # Create delta
                delta = GameStateDelta(
                    session_id=session_id,
                    operation_type=SyncOperationType.UPDATE,
                    field_path=field_path,
                    old_value=old_value,
                    new_value=new_value,
                    timestamp=datetime.now(),
                    server_id=self.server_id,
                    player_id=player_id,
                    sequence_number=self._get_next_sequence(session_id)
                )
                
                await self._store_delta(delta)
                self.state_writes += 1
                
                logger.debug(f"Game state updated: {session_id}:{field_path}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to update game state {session_id}:{field_path}: {e}")
            return False
    
    @performance_monitor.track_function_performance
    async def get_game_state(self, session_id: str) -> Optional[GameStateSnapshot]:
        """Get current game state with Redis fallback"""
        try:
            # Check local cache first
            if session_id in self.local_state_cache:
                cached_snapshot = self.local_state_cache[session_id]
                
                # Check if cache is still fresh (within 30 seconds)
                if (datetime.now() - cached_snapshot.timestamp).seconds < 30:
                    return cached_snapshot
            
            # Fetch from Redis
            snapshot = await self._load_game_state(session_id)
            
            if snapshot:
                # Update local cache
                self.local_state_cache[session_id] = snapshot
                self.state_reads += 1
                return snapshot
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to get game state {session_id}: {e}")
            return None
    
    async def delete_game_state(self, session_id: str) -> bool:
        """Delete game state and cleanup associated data"""
        try:
            # Create deletion delta
            delta = GameStateDelta(
                session_id=session_id,
                operation_type=SyncOperationType.DELETE,
                field_path="",
                old_value=None,
                new_value=None,
                timestamp=datetime.now(),
                server_id=self.server_id,
                sequence_number=self._get_next_sequence(session_id)
            )
            
            # Store delta first
            await self._store_delta(delta)
            
            # Remove from Redis
            state_key = f"game_state:{session_id}"
            deltas_key = f"game_deltas:{session_id}"
            
            success = await redis_manager.delete(state_key, namespace="games")
            await redis_manager.delete(deltas_key, namespace="games")
            
            # Remove from local cache
            self.local_state_cache.pop(session_id, None)
            self.pending_deltas.pop(session_id, None)
            self.last_sync_timestamps.pop(session_id, None)
            
            logger.info(f"Game state deleted: {session_id}")
            return success
            
        except Exception as e:
            logger.error(f"Failed to delete game state {session_id}: {e}")
            return False
    
    async def batch_update_game_state(
        self,
        session_id: str,
        updates: List[Tuple[str, Any]],
        player_id: Optional[str] = None
    ) -> bool:
        """Perform multiple updates atomically"""
        try:
            # Get current state
            current_snapshot = await self.get_game_state(session_id)
            if not current_snapshot:
                return False
            
            # Apply all updates
            updated_state = current_snapshot.state_data.copy()
            deltas = []
            
            for field_path, new_value in updates:
                old_value = self._get_nested_value(updated_state, field_path)
                self._set_nested_value(updated_state, field_path, new_value)
                
                delta = GameStateDelta(
                    session_id=session_id,
                    operation_type=SyncOperationType.UPDATE,
                    field_path=field_path,
                    old_value=old_value,
                    new_value=new_value,
                    timestamp=datetime.now(),
                    server_id=self.server_id,
                    player_id=player_id,
                    sequence_number=self._get_next_sequence(session_id)
                )
                deltas.append(delta)
            
            # Create new snapshot
            new_snapshot = GameStateSnapshot(
                session_id=session_id,
                game_type=current_snapshot.game_type,
                state_data=updated_state,
                version=current_snapshot.version + 1,
                timestamp=datetime.now(),
                server_id=self.server_id
            )
            
            # Store atomically
            success = await self._store_game_state(new_snapshot)
            
            if success:
                # Store all deltas
                for delta in deltas:
                    await self._store_delta(delta)
                
                # Update local cache
                self.local_state_cache[session_id] = new_snapshot
                self.state_writes += 1
                
                logger.debug(f"Batch update completed: {session_id} ({len(updates)} updates)")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to batch update game state {session_id}: {e}")
            return False
    
    async def get_game_deltas(
        self,
        session_id: str,
        since_timestamp: Optional[datetime] = None,
        max_count: int = 100
    ) -> List[GameStateDelta]:
        """Get game state deltas for synchronization"""
        try:
            deltas_key = f"game_deltas:{session_id}"
            deltas_data = await redis_manager.get(deltas_key, namespace="games")
            
            if not deltas_data:
                return []
            
            all_deltas = []
            for delta_json in deltas_data:
                try:
                    delta_dict = json.loads(delta_json)
                    delta = GameStateDelta(
                        session_id=delta_dict['session_id'],
                        operation_type=SyncOperationType(delta_dict['operation_type']),
                        field_path=delta_dict['field_path'],
                        old_value=delta_dict['old_value'],
                        new_value=delta_dict['new_value'],
                        timestamp=datetime.fromisoformat(delta_dict['timestamp']),
                        server_id=delta_dict['server_id'],
                        player_id=delta_dict.get('player_id'),
                        sequence_number=delta_dict.get('sequence_number', 0),
                        checksum=delta_dict.get('checksum', '')
                    )
                    all_deltas.append(delta)
                except Exception as e:
                    logger.error(f"Failed to deserialize delta: {e}")
                    continue
            
            # Filter by timestamp if provided
            if since_timestamp:
                all_deltas = [d for d in all_deltas if d.timestamp > since_timestamp]
            
            # Sort by sequence number and limit
            all_deltas.sort(key=lambda d: d.sequence_number)
            return all_deltas[:max_count]
            
        except Exception as e:
            logger.error(f"Failed to get game deltas {session_id}: {e}")
            return []
    
    async def register_conflict_handler(
        self,
        field_pattern: str,
        handler: Callable[[str, str, Any, Any, Optional[str]], Any]
    ):
        """Register custom conflict resolution handler"""
        self.conflict_handlers[field_pattern] = handler
        logger.info(f"Conflict handler registered for pattern: {field_pattern}")
    
    async def get_synchronization_stats(self) -> Dict[str, Any]:
        """Get synchronization performance statistics"""
        return {
            'server_id': self.server_id,
            'active_games': len(self.local_state_cache),
            'pending_deltas': sum(len(deltas) for deltas in self.pending_deltas.values()),
            'sync_operations': self.sync_operations,
            'conflict_resolutions': self.conflict_resolutions,
            'state_writes': self.state_writes,
            'state_reads': self.state_reads,
            'last_sync': max(self.last_sync_timestamps.values()) if self.last_sync_timestamps else None,
            'cache_size': len(self.local_state_cache)
        }
    
    async def force_synchronization(self, session_id: str) -> bool:
        """Force immediate synchronization for a specific game"""
        try:
            await self._sync_game_deltas(session_id)
            logger.info(f"Forced synchronization completed for: {session_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to force synchronization for {session_id}: {e}")
            return False
    
    # Private methods
    
    async def _store_game_state(self, snapshot: GameStateSnapshot) -> bool:
        """Store game state snapshot in Redis"""
        try:
            state_key = f"game_state:{snapshot.session_id}"
            state_data = {
                'session_id': snapshot.session_id,
                'game_type': snapshot.game_type.value,
                'state_data': snapshot.state_data,
                'version': snapshot.version,
                'timestamp': snapshot.timestamp.isoformat(),
                'server_id': snapshot.server_id,
                'checksum': snapshot.checksum
            }
            
            return await redis_manager.set(
                state_key,
                state_data,
                ttl=self.state_ttl,
                namespace="games"
            )
        except Exception as e:
            logger.error(f"Failed to store game state: {e}")
            return False
    
    async def _load_game_state(self, session_id: str) -> Optional[GameStateSnapshot]:
        """Load game state snapshot from Redis"""
        try:
            state_key = f"game_state:{session_id}"
            state_data = await redis_manager.get(state_key, namespace="games")
            
            if not state_data:
                return None
            
            return GameStateSnapshot(
                session_id=state_data['session_id'],
                game_type=GameStateType(state_data['game_type']),
                state_data=state_data['state_data'],
                version=state_data['version'],
                timestamp=datetime.fromisoformat(state_data['timestamp']),
                server_id=state_data['server_id'],
                checksum=state_data.get('checksum', '')
            )
        except Exception as e:
            logger.error(f"Failed to load game state: {e}")
            return None
    
    async def _store_delta(self, delta: GameStateDelta) -> bool:
        """Store game state delta in Redis"""
        try:
            deltas_key = f"game_deltas:{delta.session_id}"
            delta_data = {
                'session_id': delta.session_id,
                'operation_type': delta.operation_type.value,
                'field_path': delta.field_path,
                'old_value': delta.old_value,
                'new_value': delta.new_value,
                'timestamp': delta.timestamp.isoformat(),
                'server_id': delta.server_id,
                'player_id': delta.player_id,
                'sequence_number': delta.sequence_number,
                'checksum': delta.checksum
            }
            
            # Add to list of deltas
            success = await redis_manager.list_push(
                deltas_key,
                json.dumps(delta_data, default=str),
                namespace="games"
            )
            
            # Set TTL on the list
            if success:
                await redis_manager.expire(deltas_key, self.delta_ttl, namespace="games")
            
            return success
        except Exception as e:
            logger.error(f"Failed to store delta: {e}")
            return False
    
    def _get_nested_value(self, data: Dict[str, Any], field_path: str) -> Any:
        """Get value from nested dictionary using dot notation"""
        if not field_path:
            return data
        
        keys = field_path.split('.')
        current = data
        
        for key in keys:
            if isinstance(current, dict) and key in current:
                current = current[key]
            else:
                return None
        
        return current
    
    def _set_nested_value(self, data: Dict[str, Any], field_path: str, value: Any):
        """Set value in nested dictionary using dot notation"""
        if not field_path:
            return
        
        keys = field_path.split('.')
        current = data
        
        for key in keys[:-1]:
            if key not in current:
                current[key] = {}
            current = current[key]
        
        current[keys[-1]] = value
    
    def _get_next_sequence(self, session_id: str) -> int:
        """Get next sequence number for session"""
        self.sequence_numbers[session_id] += 1
        return self.sequence_numbers[session_id]
    
    async def _check_for_conflicts(
        self,
        session_id: str,
        field_path: str,
        expected_old_value: Any
    ) -> bool:
        """Check for conflicts with other pending updates"""
        try:
            # Get recent deltas for this field
            recent_deltas = await self.get_game_deltas(
                session_id,
                since_timestamp=datetime.now() - timedelta(seconds=30)
            )
            
            # Check for conflicts
            for delta in recent_deltas:
                if (delta.field_path == field_path and 
                    delta.server_id != self.server_id and
                    delta.new_value != expected_old_value):
                    return True
            
            return False
        except Exception:
            return False
    
    async def _handle_conflict(
        self,
        session_id: str,
        field_path: str,
        old_value: Any,
        new_value: Any,
        player_id: Optional[str]
    ):
        """Handle state conflict using registered handlers"""
        try:
            # Find matching conflict handler
            handler = None
            for pattern, h in self.conflict_handlers.items():
                if pattern in field_path:
                    handler = h
                    break
            
            if handler:
                resolved_value = await handler(session_id, field_path, old_value, new_value, player_id)
                
                # Apply resolved value
                if resolved_value is not None:
                    await self.update_game_state(session_id, field_path, resolved_value, player_id)
                    
            self.conflict_resolutions += 1
        except Exception as e:
            logger.error(f"Failed to handle conflict: {e}")
    
    def _register_default_conflict_handlers(self):
        """Register default conflict resolution handlers"""
        
        async def last_writer_wins(session_id, field_path, old_value, new_value, player_id):
            return new_value
        
        async def merge_lists(session_id, field_path, old_value, new_value, player_id):
            if isinstance(old_value, list) and isinstance(new_value, list):
                return list(set(old_value + new_value))
            return new_value
        
        async def max_value_wins(session_id, field_path, old_value, new_value, player_id):
            if isinstance(old_value, (int, float)) and isinstance(new_value, (int, float)):
                return max(old_value, new_value)
            return new_value
        
        # Register default handlers
        self.conflict_handlers["default"] = last_writer_wins
        self.conflict_handlers["players"] = merge_lists
        self.conflict_handlers["score"] = max_value_wins
        self.conflict_handlers["health"] = max_value_wins
    
    async def _background_sync_loop(self):
        """Background task for periodic synchronization"""
        while True:
            try:
                await asyncio.sleep(self.sync_interval)
                await self._sync_all_pending_deltas()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in background sync loop: {e}")
    
    async def _sync_all_pending_deltas(self):
        """Synchronize all pending deltas"""
        for session_id in list(self.local_state_cache.keys()):
            await self._sync_game_deltas(session_id)
    
    async def _sync_game_deltas(self, session_id: str):
        """Synchronize deltas for a specific game"""
        try:
            # Get deltas since last sync
            last_sync = self.last_sync_timestamps.get(session_id, datetime.now() - timedelta(hours=1))
            deltas = await self.get_game_deltas(session_id, since_timestamp=last_sync)
            
            if deltas:
                # Apply deltas from other servers
                for delta in deltas:
                    if delta.server_id != self.server_id:
                        await self._apply_remote_delta(delta)
                
                self.sync_operations += 1
            
            # Update last sync timestamp
            self.last_sync_timestamps[session_id] = datetime.now()
            
        except Exception as e:
            logger.error(f"Failed to sync game deltas for {session_id}: {e}")
    
    async def _apply_remote_delta(self, delta: GameStateDelta):
        """Apply delta from remote server"""
        try:
            if delta.operation_type == SyncOperationType.UPDATE:
                # Get current state
                current_snapshot = await self.get_game_state(delta.session_id)
                if current_snapshot:
                    # Apply the update
                    updated_state = current_snapshot.state_data.copy()
                    self._set_nested_value(updated_state, delta.field_path, delta.new_value)
                    
                    # Update local cache
                    new_snapshot = GameStateSnapshot(
                        session_id=delta.session_id,
                        game_type=current_snapshot.game_type,
                        state_data=updated_state,
                        version=current_snapshot.version + 1,
                        timestamp=delta.timestamp,
                        server_id=delta.server_id
                    )
                    
                    self.local_state_cache[delta.session_id] = new_snapshot
                    
        except Exception as e:
            logger.error(f"Failed to apply remote delta: {e}")

# Global synchronizer instance
game_synchronizer = GameStateSynchronizer()

def get_game_synchronizer() -> GameStateSynchronizer:
    """Get the global game state synchronizer instance"""
    return game_synchronizer