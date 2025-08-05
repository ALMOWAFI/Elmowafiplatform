#!/usr/bin/env python3
"""
Complete Mafia Game Engine for Elmowafiplatform
Production-ready Mafia game with AI referee, all roles, and Arabic/English support
"""

import os
import uuid
import json
import logging
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple, Set
from dataclasses import dataclass, asdict
from enum import Enum
import random
from collections import defaultdict, Counter

from unified_database import get_unified_database
from redis_manager import redis_manager
from logging_config import get_logger
from performance_monitoring import performance_monitor
from game_state_synchronization import get_game_synchronizer, GameStateType, SyncOperationType

logger = get_logger("mafia_game")

class MafiaRole(Enum):
    """All Mafia game roles with abilities"""
    # Mafia Team
    GODFATHER = "godfather"
    ASSASSIN = "assassin"
    CONSIGLIERE = "consigliere"
    
    # Town Team
    DETECTIVE = "detective"
    DOCTOR = "doctor"
    BODYGUARD = "bodyguard"
    VIGILANTE = "vigilante"
    MAYOR = "mayor"
    
    # Neutral Roles
    JESTER = "jester"
    SURVIVOR = "survivor"
    EXECUTIONER = "executioner"
    
    # Basic Roles
    CIVILIAN = "civilian"
    MAFIOSO = "mafioso"

class GamePhase(Enum):
    """Mafia game phases"""
    LOBBY = "lobby"
    ROLE_ASSIGNMENT = "role_assignment"
    NIGHT = "night"
    DAY = "day"
    VOTING = "voting"
    TRIAL = "trial"
    EXECUTION = "execution"
    GAME_OVER = "game_over"

class GameAction(Enum):
    """Available game actions"""
    KILL = "kill"
    INVESTIGATE = "investigate"
    HEAL = "heal"
    PROTECT = "protect"
    VOTE = "vote"
    ABSTAIN = "abstain"
    GUILTY = "guilty"
    INNOCENT = "innocent"
    CHAT = "chat"

class WinCondition(Enum):
    """Game ending conditions"""
    MAFIA_WIN = "mafia_win"
    TOWN_WIN = "town_win"
    JESTER_WIN = "jester_win"
    SURVIVOR_WIN = "survivor_win"
    DRAW = "draw"

@dataclass
class MafiaPlayer:
    """Individual Mafia player"""
    id: str
    name: str
    family_member_id: Optional[str]
    role: MafiaRole
    is_alive: bool = True
    is_revealed: bool = False
    votes_against: int = 0
    actions_remaining: int = 1
    protected_by: Optional[str] = None
    last_will: Optional[str] = None
    death_note: Optional[str] = None
    metadata: Dict[str, Any] = None

@dataclass
class GameAction:
    """Individual game action"""
    id: str
    player_id: str
    action_type: GameAction
    target_id: Optional[str]
    timestamp: datetime
    phase: GamePhase
    day_number: int
    successful: bool = True
    blocked: bool = False
    metadata: Dict[str, Any] = None

@dataclass
class MafiaGameState:
    """Complete Mafia game state"""
    session_id: str
    family_group_id: str
    host_id: str
    players: Dict[str, MafiaPlayer]
    phase: GamePhase
    day_number: int
    round_timer: Optional[datetime]
    voting_results: Dict[str, int]
    trial_target: Optional[str]
    actions_log: List[GameAction]
    chat_log: List[Dict[str, Any]]
    game_settings: Dict[str, Any]
    win_condition: Optional[WinCondition]
    winner_ids: List[str]
    created_at: datetime
    updated_at: datetime
    language: str = "en"

# Role configurations with abilities and team affiliations
ROLE_CONFIG = {
    MafiaRole.GODFATHER: {
        "team": "mafia",
        "night_action": True,
        "action_type": "kill",
        "detection_immune": True,
        "priority": 1,
        "description_en": "Leader of the Mafia. Can kill and appears innocent to investigations.",
        "description_ar": "زعيم المافيا. يمكنه القتل ويظهر بريئًا في التحقيقات."
    },
    MafiaRole.ASSASSIN: {
        "team": "mafia",
        "night_action": True,
        "action_type": "kill",
        "detection_immune": False,
        "priority": 2,
        "description_en": "Mafia killer. Can eliminate town members at night.",
        "description_ar": "قاتل المافيا. يمكنه القضاء على أعضاء المدينة ليلاً."
    },
    MafiaRole.CONSIGLIERE: {
        "team": "mafia",
        "night_action": True,
        "action_type": "investigate",
        "detection_immune": False,
        "priority": 3,
        "description_en": "Mafia investigator. Can learn the exact role of town members.",
        "description_ar": "محقق المافيا. يمكنه معرفة الدور الدقيق لأعضاء المدينة."
    },
    MafiaRole.DETECTIVE: {
        "team": "town",
        "night_action": True,
        "action_type": "investigate",
        "detection_immune": False,
        "priority": 4,
        "description_en": "Town investigator. Can determine if someone is suspicious.",
        "description_ar": "محقق المدينة. يمكنه تحديد ما إذا كان شخص ما مشبوهًا."
    },
    MafiaRole.DOCTOR: {
        "team": "town",
        "night_action": True,
        "action_type": "heal",
        "detection_immune": False,
        "priority": 5,
        "description_en": "Town healer. Can save someone from death each night.",
        "description_ar": "طبيب المدينة. يمكنه إنقاذ شخص من الموت كل ليلة."
    },
    MafiaRole.BODYGUARD: {
        "team": "town",
        "night_action": True,
        "action_type": "protect",
        "detection_immune": False,
        "priority": 6,
        "description_en": "Town protector. Can shield someone from attacks.",
        "description_ar": "حارس المدينة. يمكنه حماية شخص من الهجمات."
    },
    MafiaRole.VIGILANTE: {
        "team": "town",
        "night_action": True,
        "action_type": "kill",
        "detection_immune": False,
        "priority": 7,
        "description_en": "Town killer. Can eliminate suspected mafia members.",
        "description_ar": "قاتل المدينة. يمكنه القضاء على أعضاء المافيا المشتبه بهم."
    },
    MafiaRole.MAYOR: {
        "team": "town",
        "night_action": False,
        "action_type": "vote",
        "detection_immune": False,
        "priority": 8,
        "vote_weight": 2,
        "description_en": "Town leader. Vote counts as two votes.",
        "description_ar": "زعيم المدينة. صوته يُحسب كصوتين."
    },
    MafiaRole.JESTER: {
        "team": "neutral",
        "night_action": False,
        "action_type": None,
        "detection_immune": False,
        "priority": 9,
        "win_condition": "get_lynched",
        "description_en": "Wins if lynched by the town during the day.",
        "description_ar": "يفوز إذا تم إعدامه من قبل المدينة خلال النهار."
    },
    MafiaRole.SURVIVOR: {
        "team": "neutral",
        "night_action": True,
        "action_type": "vest",
        "detection_immune": False,
        "priority": 10,
        "win_condition": "survive",
        "description_en": "Wins by surviving until the end of the game.",
        "description_ar": "يفوز بالبقاء على قيد الحياة حتى نهاية اللعبة."
    },
    MafiaRole.EXECUTIONER: {
        "team": "neutral",
        "night_action": False,
        "action_type": None,
        "detection_immune": False,
        "priority": 11,
        "win_condition": "lynch_target",
        "description_en": "Wins by getting their assigned target lynched.",
        "description_ar": "يفوز بإعدام الهدف المخصص له."
    },
    MafiaRole.CIVILIAN: {
        "team": "town",
        "night_action": False,
        "action_type": "vote",
        "detection_immune": False,
        "priority": 12,
        "description_en": "Town member with no special abilities. Vote during the day.",
        "description_ar": "عضو في المدينة بدون قدرات خاصة. يصوت خلال النهار."
    },
    MafiaRole.MAFIOSO: {
        "team": "mafia",
        "night_action": False,
        "action_type": "vote",
        "detection_immune": False,
        "priority": 13,
        "description_en": "Basic mafia member. No special night abilities.",
        "description_ar": "عضو أساسي في المافيا. لا توجد قدرات ليلية خاصة."
    }
}

class MafiaGameEngine:
    """Complete Mafia game engine with AI referee"""
    
    def __init__(self):
        self.db = get_unified_database()
        self.synchronizer = get_game_synchronizer()
        
        # Game configuration
        self.min_players = 4
        self.max_players = 15
        self.phase_timers = {
            GamePhase.NIGHT: 60,  # 60 seconds for night actions
            GamePhase.DAY: 300,   # 5 minutes for day discussion
            GamePhase.VOTING: 120, # 2 minutes for voting
            GamePhase.TRIAL: 180  # 3 minutes for trial
        }
        
        # Active games storage (now backed by Redis synchronization)
        self.active_games: Dict[str, MafiaGameState] = {}
        
        # Register Mafia-specific conflict handlers
        self._register_conflict_handlers()
        
    @performance_monitor.track_function_performance
    async def create_game(
        self,
        family_group_id: str,
        host_id: str,
        game_settings: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create a new Mafia game session"""
        
        try:
            session_id = str(uuid.uuid4())
            
            # Default game settings
            default_settings = {
                "language": "en",
                "enable_roles": True,
                "enable_chat": True,
                "auto_assign_roles": True,
                "phase_timers": self.phase_timers.copy(),
                "allow_spectators": True,
                "custom_roles": []
            }
            default_settings.update(game_settings)
            
            # Create initial game state
            game_state = MafiaGameState(
                session_id=session_id,
                family_group_id=family_group_id,
                host_id=host_id,
                players={},
                phase=GamePhase.LOBBY,
                day_number=0,
                round_timer=None,
                voting_results={},
                trial_target=None,
                actions_log=[],
                chat_log=[],
                game_settings=default_settings,
                win_condition=None,
                winner_ids=[],
                created_at=datetime.now(),
                updated_at=datetime.now(),
                language=default_settings["language"]
            )
            
            # Store game state with Redis synchronization
            self.active_games[session_id] = game_state
            
            # Create synchronized game state
            state_dict = asdict(game_state)
            success = await self.synchronizer.create_game_state(
                session_id=session_id,
                game_type=GameStateType.MAFIA_GAME,
                initial_state=state_dict
            )
            
            if not success:
                logger.error(f"Failed to create synchronized game state: {session_id}")
                return {"success": False, "error": "Failed to initialize game state"}
            
            # Legacy Redis storage for compatibility
            await self._save_game_state(game_state)
            
            # Create database record
            await self._create_game_record(game_state)
            
            logger.info(f"Created Mafia game: {session_id} for family: {family_group_id}")
            
            return {
                "success": True,
                "session_id": session_id,
                "game_state": asdict(game_state),
                "message": "Mafia game created successfully"
            }
            
        except Exception as e:
            logger.error(f"Error creating Mafia game: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def join_game(
        self,
        session_id: str,
        player_id: str,
        player_name: str,
        family_member_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Add player to Mafia game"""
        
        try:
            if session_id not in self.active_games:
                return {"success": False, "error": "Game not found"}
            
            game_state = self.active_games[session_id]
            
            # Check game phase
            if game_state.phase != GamePhase.LOBBY:
                return {"success": False, "error": "Game already started"}
            
            # Check player limit
            if len(game_state.players) >= self.max_players:
                return {"success": False, "error": "Game is full"}
            
            # Check if player already joined
            if player_id in game_state.players:
                return {"success": False, "error": "Player already in game"}
            
            # Add player
            player = MafiaPlayer(
                id=player_id,
                name=player_name,
                family_member_id=family_member_id,
                role=MafiaRole.CIVILIAN,  # Temporary, will be assigned later
                metadata={"joined_at": datetime.now().isoformat()}
            )
            
            game_state.players[player_id] = player
            game_state.updated_at = datetime.now()
            
            # Update synchronized state
            await self.synchronizer.update_game_state(
                session_id=session_id,
                field_path=f"players.{player_id}",
                new_value=asdict(player),
                player_id=player_id
            )
            
            await self.synchronizer.update_game_state(
                session_id=session_id,
                field_path="updated_at",
                new_value=game_state.updated_at.isoformat(),
                player_id=player_id
            )
            
            # Legacy save for compatibility
            await self._save_game_state(game_state)
            await self._broadcast_game_update(session_id, "player_joined", {
                "player_id": player_id,
                "player_name": player_name,
                "player_count": len(game_state.players)
            })
            
            logger.info(f"Player {player_name} joined Mafia game: {session_id}")
            
            return {
                "success": True,
                "player_count": len(game_state.players),
                "can_start": len(game_state.players) >= self.min_players
            }
            
        except Exception as e:
            logger.error(f"Error joining Mafia game: {e}")
            return {"success": False, "error": str(e)}
    
    async def start_game(self, session_id: str, starter_id: str) -> Dict[str, Any]:
        """Start the Mafia game with role assignment"""
        
        try:
            if session_id not in self.active_games:
                return {"success": False, "error": "Game not found"}
            
            game_state = self.active_games[session_id]
            
            # Verify starter is host
            if starter_id != game_state.host_id:
                return {"success": False, "error": "Only host can start game"}
            
            # Check minimum players
            if len(game_state.players) < self.min_players:
                return {"success": False, "error": f"Need at least {self.min_players} players"}
            
            # Assign roles
            role_assignment = await self._assign_roles(game_state)
            
            # Update game state
            game_state.phase = GamePhase.ROLE_ASSIGNMENT
            game_state.day_number = 1
            game_state.updated_at = datetime.now()
            
            await self._save_game_state(game_state)
            
            # Send role assignments privately to each player
            for player_id, player in game_state.players.items():
                await self._send_private_message(session_id, player_id, "role_assignment", {
                    "role": player.role.value,
                    "role_config": ROLE_CONFIG[player.role],
                    "description": ROLE_CONFIG[player.role][f"description_{game_state.language}"]
                })
            
            # Start first night
            await asyncio.sleep(5)  # Give players time to read roles
            await self._advance_to_night(session_id)
            
            logger.info(f"Started Mafia game: {session_id} with {len(game_state.players)} players")
            
            return {
                "success": True,
                "phase": game_state.phase.value,
                "role_assignment": role_assignment,
                "message": "Game started! Check your role."
            }
            
        except Exception as e:
            logger.error(f"Error starting Mafia game: {e}")
            return {"success": False, "error": str(e)}
    
    async def _assign_roles(self, game_state: MafiaGameState) -> Dict[str, str]:
        """AI-powered role assignment for balanced gameplay"""
        
        player_count = len(game_state.players)
        player_ids = list(game_state.players.keys())
        
        # Calculate role distribution based on player count
        role_distribution = self._calculate_role_distribution(player_count)
        
        # Assign roles randomly but fairly
        assigned_roles = []
        for role, count in role_distribution.items():
            assigned_roles.extend([role] * count)
        
        random.shuffle(assigned_roles)
        random.shuffle(player_ids)
        
        # Apply role assignments
        role_assignment = {}
        for i, player_id in enumerate(player_ids):
            role = assigned_roles[i]
            game_state.players[player_id].role = role
            role_assignment[player_id] = role.value
            
            # Special role setup
            if role == MafiaRole.EXECUTIONER:
                # Assign random town target for executioner
                town_players = [
                    pid for pid, p in game_state.players.items() 
                    if ROLE_CONFIG[p.role]["team"] == "town" and pid != player_id
                ]
                if town_players:
                    target = random.choice(town_players)
                    game_state.players[player_id].metadata = {"target": target}
        
        return role_assignment
    
    def _calculate_role_distribution(self, player_count: int) -> Dict[MafiaRole, int]:
        """Calculate balanced role distribution"""
        
        # Basic distribution formulas
        if player_count <= 5:
            return {
                MafiaRole.GODFATHER: 1,
                MafiaRole.DETECTIVE: 1,
                MafiaRole.DOCTOR: 1,
                MafiaRole.CIVILIAN: player_count - 3
            }
        elif player_count <= 8:
            return {
                MafiaRole.GODFATHER: 1,
                MafiaRole.ASSASSIN: 1,
                MafiaRole.DETECTIVE: 1,
                MafiaRole.DOCTOR: 1,
                MafiaRole.BODYGUARD: 1,
                MafiaRole.CIVILIAN: player_count - 5
            }
        elif player_count <= 12:
            return {
                MafiaRole.GODFATHER: 1,
                MafiaRole.ASSASSIN: 1,
                MafiaRole.CONSIGLIERE: 1,
                MafiaRole.DETECTIVE: 1,
                MafiaRole.DOCTOR: 1,
                MafiaRole.BODYGUARD: 1,
                MafiaRole.VIGILANTE: 1,
                MafiaRole.JESTER: 1,
                MafiaRole.CIVILIAN: player_count - 8
            }
        else:  # 13-15 players
            return {
                MafiaRole.GODFATHER: 1,
                MafiaRole.ASSASSIN: 1,
                MafiaRole.CONSIGLIERE: 1,
                MafiaRole.MAFIOSO: 1,
                MafiaRole.DETECTIVE: 1,
                MafiaRole.DOCTOR: 1,
                MafiaRole.BODYGUARD: 1,
                MafiaRole.VIGILANTE: 1,
                MafiaRole.MAYOR: 1,
                MafiaRole.JESTER: 1,
                MafiaRole.SURVIVOR: 1,
                MafiaRole.CIVILIAN: player_count - 11
            }
    
    async def _advance_to_night(self, session_id: str):
        """Advance game to night phase"""
        
        game_state = self.active_games[session_id]
        game_state.phase = GamePhase.NIGHT
        game_state.round_timer = datetime.now() + timedelta(seconds=self.phase_timers[GamePhase.NIGHT])
        
        await self._save_game_state(game_state)
        await self._broadcast_game_update(session_id, "phase_change", {
            "phase": "night",
            "day_number": game_state.day_number,
            "timer": game_state.round_timer.isoformat(),
            "message": "Night falls. Those with night abilities, make your moves."
        })
        
        # Set timer for automatic phase advancement
        asyncio.create_task(self._auto_advance_phase(session_id, GamePhase.NIGHT))
    
    async def _advance_to_day(self, session_id: str):
        """Advance game to day phase and resolve night actions"""
        
        game_state = self.active_games[session_id]
        
        # Process night actions
        night_resolution = await self._resolve_night_actions(game_state)
        
        # Update game state
        game_state.phase = GamePhase.DAY
        game_state.round_timer = datetime.now() + timedelta(seconds=self.phase_timers[GamePhase.DAY])
        
        await self._save_game_state(game_state)
        
        # Broadcast night results
        await self._broadcast_game_update(session_id, "night_resolution", night_resolution)
        await self._broadcast_game_update(session_id, "phase_change", {
            "phase": "day",
            "day_number": game_state.day_number,
            "timer": game_state.round_timer.isoformat(),
            "message": "Dawn breaks. Discuss and find the mafia!"
        })
        
        # Check for game end
        win_condition = self._check_win_condition(game_state)
        if win_condition:
            await self._end_game(session_id, win_condition)
        else:
            asyncio.create_task(self._auto_advance_phase(session_id, GamePhase.DAY))
    
    async def _resolve_night_actions(self, game_state: MafiaGameState) -> Dict[str, Any]:
        """Process and resolve all night actions"""
        
        night_actions = [
            action for action in game_state.actions_log
            if action.phase == GamePhase.NIGHT and action.day_number == game_state.day_number
        ]
        
        # Sort actions by priority
        sorted_actions = sorted(night_actions, key=lambda x: ROLE_CONFIG[game_state.players[x.player_id].role]["priority"])
        
        resolution = {
            "deaths": [],
            "investigations": {},
            "protections": [],
            "blocks": [],
            "events": []
        }
        
        protected_players = set()
        
        # Process actions in priority order
        for action in sorted_actions:
            player = game_state.players[action.player_id]
            
            if not player.is_alive:
                continue
                
            if action.action_type == GameAction.KILL and action.target_id:
                target = game_state.players[action.target_id]
                
                if target.is_alive and action.target_id not in protected_players:
                    target.is_alive = False
                    target.death_note = f"Killed by {player.role.value}"
                    resolution["deaths"].append({
                        "player_id": action.target_id,
                        "player_name": target.name,
                        "cause": f"killed by {player.role.value}"
                    })
                    
            elif action.action_type == GameAction.HEAL and action.target_id:
                protected_players.add(action.target_id)
                resolution["protections"].append(action.target_id)
                
            elif action.action_type == GameAction.PROTECT and action.target_id:
                protected_players.add(action.target_id)
                resolution["protections"].append(action.target_id)
                
            elif action.action_type == GameAction.INVESTIGATE and action.target_id:
                target = game_state.players[action.target_id]
                
                if player.role == MafiaRole.DETECTIVE:
                    # Detective gets "suspicious" or "not suspicious"
                    result = "suspicious" if ROLE_CONFIG[target.role]["team"] == "mafia" else "not suspicious"
                    
                    # Godfather appears innocent
                    if target.role == MafiaRole.GODFATHER:
                        result = "not suspicious"
                        
                elif player.role == MafiaRole.CONSIGLIERE:
                    # Consigliere gets exact role
                    result = target.role.value
                    
                resolution["investigations"][action.player_id] = {
                    "target": action.target_id,
                    "result": result
                }
        
        return resolution
    
    async def perform_action(
        self,
        session_id: str,
        player_id: str,
        action_type: str,
        target_id: Optional[str] = None,
        additional_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Perform game action (vote, night action, etc.)"""
        
        try:
            if session_id not in self.active_games:
                return {"success": False, "error": "Game not found"}
            
            game_state = self.active_games[session_id]
            
            if player_id not in game_state.players:
                return {"success": False, "error": "Player not in game"}
            
            player = game_state.players[player_id]
            
            if not player.is_alive:
                return {"success": False, "error": "Dead players cannot act"}
            
            # Validate action based on current phase and player role
            validation_result = self._validate_action(game_state, player, action_type, target_id)
            if not validation_result["valid"]:
                return {"success": False, "error": validation_result["reason"]}
            
            # Create action record
            action = GameAction(
                id=str(uuid.uuid4()),
                player_id=player_id,
                action_type=GameAction(action_type),
                target_id=target_id,
                timestamp=datetime.now(),
                phase=game_state.phase,
                day_number=game_state.day_number,
                metadata=additional_data or {}
            )
            
            game_state.actions_log.append(action)
            
            # Handle specific actions
            if action_type == "vote" and game_state.phase == GamePhase.VOTING:
                await self._handle_vote(game_state, player_id, target_id)
            elif action_type == "chat":
                await self._handle_chat(session_id, player_id, additional_data.get("message", ""))
            
            game_state.updated_at = datetime.now()
            await self._save_game_state(game_state)
            
            return {"success": True, "action_recorded": True}
            
        except Exception as e:
            logger.error(f"Error performing action: {e}")
            return {"success": False, "error": str(e)}
    
    def _validate_action(
        self,
        game_state: MafiaGameState,
        player: MafiaPlayer,
        action_type: str,
        target_id: Optional[str]
    ) -> Dict[str, Any]:
        """Validate if player can perform the requested action"""
        
        role_config = ROLE_CONFIG[player.role]
        
        # Night actions
        if game_state.phase == GamePhase.NIGHT:
            if not role_config.get("night_action", False):
                return {"valid": False, "reason": "Your role has no night abilities"}
            
            if action_type != role_config.get("action_type"):
                return {"valid": False, "reason": "Invalid action for your role"}
        
        # Day phase actions
        elif game_state.phase == GamePhase.DAY:
            if action_type not in ["chat"]:
                return {"valid": False, "reason": "Only chat allowed during day phase"}
        
        # Voting phase
        elif game_state.phase == GamePhase.VOTING:
            if action_type not in ["vote", "abstain"]:
                return {"valid": False, "reason": "Only voting allowed during voting phase"}
        
        # Target validation
        if target_id and target_id in game_state.players:
            target = game_state.players[target_id]
            
            # Can't target dead players (except for some roles)
            if not target.is_alive and action_type not in ["investigate"]:
                return {"valid": False, "reason": "Cannot target dead players"}
            
            # Can't target self for most actions
            if target_id == player.id and action_type not in ["heal", "protect", "vest"]:
                return {"valid": False, "reason": "Cannot target yourself"}
        
        return {"valid": True, "reason": "Action is valid"}
    
    async def _handle_vote(self, game_state: MafiaGameState, voter_id: str, target_id: Optional[str]):
        """Handle voting action"""
        
        # Remove previous vote
        for target, voters in game_state.voting_results.items():
            if voter_id in voters:
                game_state.voting_results[target].remove(voter_id)
        
        # Add new vote
        if target_id:
            if target_id not in game_state.voting_results:
                game_state.voting_results[target_id] = []
            
            # Check vote weight (Mayor has double vote)
            vote_weight = ROLE_CONFIG[game_state.players[voter_id].role].get("vote_weight", 1)
            for _ in range(vote_weight):
                game_state.voting_results[target_id].append(voter_id)
    
    async def _handle_chat(self, session_id: str, player_id: str, message: str):
        """Handle chat message"""
        
        game_state = self.active_games[session_id]
        player = game_state.players[player_id]
        
        chat_entry = {
            "id": str(uuid.uuid4()),
            "player_id": player_id,
            "player_name": player.name,
            "message": message,
            "timestamp": datetime.now().isoformat(),
            "phase": game_state.phase.value,
            "day_number": game_state.day_number,
            "is_alive": player.is_alive
        }
        
        game_state.chat_log.append(chat_entry)
        
        # Broadcast chat message
        await self._broadcast_game_update(session_id, "chat_message", chat_entry)
    
    def _check_win_condition(self, game_state: MafiaGameState) -> Optional[WinCondition]:
        """Check if game has ended and determine winner"""
        
        alive_players = [p for p in game_state.players.values() if p.is_alive]
        
        # Count players by team
        team_counts = {"mafia": 0, "town": 0, "neutral": 0}
        for player in alive_players:
            team = ROLE_CONFIG[player.role]["team"]
            team_counts[team] += 1
        
        # Mafia wins if they equal or outnumber town
        if team_counts["mafia"] >= team_counts["town"]:
            return WinCondition.MAFIA_WIN
        
        # Town wins if no mafia left
        if team_counts["mafia"] == 0:
            return WinCondition.TOWN_WIN
        
        # Check neutral wins (Jester, Survivor, etc.)
        for player in game_state.players.values():
            if player.role == MafiaRole.JESTER and not player.is_alive:
                # Check if jester was lynched (not killed at night)
                last_death = None  # This would need more detailed tracking
                if last_death and last_death.get("cause") == "lynched":
                    return WinCondition.JESTER_WIN
        
        return None
    
    async def _end_game(self, session_id: str, win_condition: WinCondition):
        """End the game and announce winners"""
        
        game_state = self.active_games[session_id]
        game_state.phase = GamePhase.GAME_OVER
        game_state.win_condition = win_condition
        
        # Determine winners
        if win_condition == WinCondition.MAFIA_WIN:
            game_state.winner_ids = [
                p.id for p in game_state.players.values()
                if ROLE_CONFIG[p.role]["team"] == "mafia"
            ]
        elif win_condition == WinCondition.TOWN_WIN:
            game_state.winner_ids = [
                p.id for p in game_state.players.values()
                if ROLE_CONFIG[p.role]["team"] == "town"
            ]
        
        await self._save_game_state(game_state)
        
        # Broadcast game end
        await self._broadcast_game_update(session_id, "game_end", {
            "win_condition": win_condition.value,
            "winners": game_state.winner_ids,
            "final_roles": {p.id: p.role.value for p in game_state.players.values()},
            "message": f"Game Over! {win_condition.value.replace('_', ' ').title()}!"
        })
        
        logger.info(f"Mafia game ended: {session_id}, Winner: {win_condition.value}")
    
    async def _auto_advance_phase(self, session_id: str, current_phase: GamePhase):
        """Automatically advance to next phase when timer expires"""
        
        if session_id not in self.active_games:
            return
        
        game_state = self.active_games[session_id]
        
        if game_state.phase != current_phase:
            return  # Phase already changed
        
        # Wait for timer
        if game_state.round_timer:
            wait_time = (game_state.round_timer - datetime.now()).total_seconds()
            if wait_time > 0:
                await asyncio.sleep(wait_time)
        
        # Check if phase still matches (game might have advanced manually)
        if game_state.phase == current_phase:
            if current_phase == GamePhase.NIGHT:
                await self._advance_to_day(session_id)
            elif current_phase == GamePhase.DAY:
                await self._advance_to_voting(session_id)
            elif current_phase == GamePhase.VOTING:
                await self._resolve_voting(session_id)
    
    async def _advance_to_voting(self, session_id: str):
        """Advance to voting phase"""
        
        game_state = self.active_games[session_id]
        game_state.phase = GamePhase.VOTING
        game_state.voting_results = {}
        game_state.round_timer = datetime.now() + timedelta(seconds=self.phase_timers[GamePhase.VOTING])
        
        await self._save_game_state(game_state)
        await self._broadcast_game_update(session_id, "phase_change", {
            "phase": "voting",
            "timer": game_state.round_timer.isoformat(),
            "message": "Voting time! Choose who to lynch."
        })
        
        asyncio.create_task(self._auto_advance_phase(session_id, GamePhase.VOTING))
    
    async def _resolve_voting(self, session_id: str):
        """Resolve voting phase and determine if someone is lynched"""
        
        game_state = self.active_games[session_id]
        
        # Count votes
        vote_counts = {}
        for target_id, voters in game_state.voting_results.items():
            vote_counts[target_id] = len(voters)
        
        # Find player with most votes
        if vote_counts:
            max_votes = max(vote_counts.values())
            tied_players = [pid for pid, votes in vote_counts.items() if votes == max_votes]
            
            if len(tied_players) == 1 and max_votes > 0:
                # Lynch the player
                lynched_player_id = tied_players[0]
                lynched_player = game_state.players[lynched_player_id]
                lynched_player.is_alive = False
                
                await self._broadcast_game_update(session_id, "lynching", {
                    "player_id": lynched_player_id,
                    "player_name": lynched_player.name,
                    "role": lynched_player.role.value,
                    "vote_count": max_votes
                })
                
                # Check for game end
                win_condition = self._check_win_condition(game_state)
                if win_condition:
                    await self._end_game(session_id, win_condition)
                    return
        
        # Advance to next day
        game_state.day_number += 1
        await self._advance_to_night(session_id)
    
    async def _save_game_state(self, game_state: MafiaGameState):
        """Save game state to Redis"""
        
        await redis_manager.set(
            f"mafia_game:{game_state.session_id}",
            asdict(game_state),
            ttl=86400,  # 24 hours
            namespace="games"
        )
    
    async def _broadcast_game_update(self, session_id: str, event_type: str, data: Dict[str, Any]):
        """Broadcast game update to all players"""
        
        message = {
            "event": event_type,
            "session_id": session_id,
            "timestamp": datetime.now().isoformat(),
            "data": data
        }
        
        # Broadcast via Redis pub/sub
        await redis_manager.publish(f"mafia_game:{session_id}", message)
    
    async def _send_private_message(self, session_id: str, player_id: str, event_type: str, data: Dict[str, Any]):
        """Send private message to specific player"""
        
        message = {
            "event": event_type,
            "session_id": session_id,
            "timestamp": datetime.now().isoformat(),
            "data": data
        }
        
        # Send via Redis to specific player channel
        await redis_manager.publish(f"mafia_player:{session_id}:{player_id}", message)
    
    async def _create_game_record(self, game_state: MafiaGameState):
        """Create database record for game session"""
        
        try:
            with self.db.get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO game_sessions (id, family_group_id, game_type, title, players, status, game_state, created_by, created_at, updated_at)
                    VALUES (?, ?, 'mafia', ?, ?, 'active', ?, ?, ?, ?)
                """, (
                    game_state.session_id,
                    game_state.family_group_id,
                    f"Mafia Game - {len(game_state.players)} players",
                    json.dumps(list(game_state.players.keys())),
                    json.dumps(asdict(game_state)),
                    game_state.host_id,
                    game_state.created_at.isoformat(),
                    game_state.updated_at.isoformat()
                ))
                conn.commit()
                
        except Exception as e:
            logger.error(f"Error creating game record: {e}")
    
    async def _sync_update_game_state(
        self,
        session_id: str, 
        updates: List[Tuple[str, Any]],
        player_id: Optional[str] = None
    ) -> bool:
        """Helper method to update multiple game state fields with synchronization"""
        try:
            # Batch update with synchronization
            success = await self.synchronizer.batch_update_game_state(
                session_id=session_id,
                updates=updates,
                player_id=player_id
            )
            
            if success:
                # Update local cache from synchronized state
                snapshot = await self.synchronizer.get_game_state(session_id)
                if snapshot and session_id in self.active_games:
                    # Convert back to MafiaGameState object
                    updated_state = self._snapshot_to_game_state(snapshot)
                    self.active_games[session_id] = updated_state
                
                # Legacy save for compatibility
                if session_id in self.active_games:
                    await self._save_game_state(self.active_games[session_id])
            
            return success
        except Exception as e:
            logger.error(f"Failed to sync update game state: {e}")
            return False
    
    async def _load_game_state_from_sync(self, session_id: str) -> Optional[MafiaGameState]:
        """Load game state from synchronizer"""
        try:
            snapshot = await self.synchronizer.get_game_state(session_id)
            if snapshot:
                return self._snapshot_to_game_state(snapshot)
            return None
        except Exception as e:
            logger.error(f"Failed to load synchronized game state: {e}")
            return None
    
    def _snapshot_to_game_state(self, snapshot) -> MafiaGameState:
        """Convert GameStateSnapshot back to MafiaGameState"""
        state_data = snapshot.state_data
        
        # Convert player dictionaries back to MafiaPlayer objects
        players = {}
        for player_id, player_data in state_data.get("players", {}).items():
            players[player_id] = MafiaPlayer(
                id=player_data["id"],
                name=player_data["name"],
                family_member_id=player_data.get("family_member_id"),
                role=MafiaRole(player_data["role"]),
                is_alive=player_data.get("is_alive", True),
                voted_for=player_data.get("voted_for"),
                night_action_target=player_data.get("night_action_target"),
                last_activity=datetime.fromisoformat(player_data["last_activity"]) if player_data.get("last_activity") else datetime.now(),
                metadata=player_data.get("metadata", {})
            )
        
        return MafiaGameState(
            session_id=state_data["session_id"],
            family_group_id=state_data["family_group_id"],
            host_id=state_data["host_id"],
            players=players,
            phase=GamePhase(state_data["phase"]),
            day_number=state_data.get("day_number", 0),
            round_timer=datetime.fromisoformat(state_data["round_timer"]) if state_data.get("round_timer") else None,
            voting_results=state_data.get("voting_results", {}),
            trial_target=state_data.get("trial_target"),
            actions_log=state_data.get("actions_log", []),
            chat_log=state_data.get("chat_log", []),
            game_settings=state_data.get("game_settings", {}),
            win_condition=WinCondition(state_data["win_condition"]) if state_data.get("win_condition") else None,
            winner_ids=state_data.get("winner_ids", []),
            created_at=datetime.fromisoformat(state_data["created_at"]),
            updated_at=datetime.fromisoformat(state_data["updated_at"]),
            language=state_data.get("language", "en")
        )
    
    def _register_conflict_handlers(self):
        """Register Mafia game specific conflict resolution handlers"""
        async def voting_conflict_handler(session_id, field_path, old_value, new_value, player_id):
            """Handle voting conflicts - allow vote changes"""
            if "voting_results" in field_path and player_id:
                # Latest vote wins for this player
                return new_value
            return old_value
        
        async def player_action_conflict_handler(session_id, field_path, old_value, new_value, player_id):
            """Handle player action conflicts"""
            if "night_action_target" in field_path and player_id:
                # Latest action wins
                return new_value
            return old_value
        
        async def game_phase_conflict_handler(session_id, field_path, old_value, new_value, player_id):
            """Handle game phase conflicts - prevent race conditions"""
            if field_path == "phase":
                # Use sequence-based resolution - later timestamp wins
                return new_value
            return old_value
        
        # Register handlers with the synchronizer
        asyncio.create_task(self.synchronizer.register_conflict_handler(
            "voting_results", voting_conflict_handler
        ))
        asyncio.create_task(self.synchronizer.register_conflict_handler(
            "night_action_target", player_action_conflict_handler
        ))
        asyncio.create_task(self.synchronizer.register_conflict_handler(
            "phase", game_phase_conflict_handler
        ))

# Global Mafia game engine instance
mafia_engine = MafiaGameEngine()

def get_mafia_engine() -> MafiaGameEngine:
    """Get the global Mafia game engine instance"""
    return mafia_engine