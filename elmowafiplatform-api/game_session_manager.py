"""
Real Game Session Manager
Implements actual game logic for Mafia, location challenges, and family activities
"""

import asyncio
import json
import logging
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
import random
from enum import Enum
import google.generativeai as genai

logger = logging.getLogger(__name__)

class GameStatus(Enum):
    WAITING = "waiting"
    STARTING = "starting"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class MafiaRole(Enum):
    MAFIA = "mafia"
    DETECTIVE = "detective"
    DOCTOR = "doctor"
    VILLAGER = "villager"
    NARRATOR = "narrator"

class GamePhase(Enum):
    SETUP = "setup"
    NIGHT = "night"
    DAY = "day"
    VOTING = "voting"
    ELIMINATION = "elimination"
    GAME_OVER = "game_over"

class Player:
    def __init__(self, user_id: str, name: str, avatar: str = None):
        self.id = user_id
        self.name = name
        self.avatar = avatar
        self.is_alive = True
        self.role = None
        self.votes = 0
        self.actions = []
        self.last_activity = datetime.now()

class GameSession:
    def __init__(self, game_type: str, host_id: str, session_id: str = None):
        self.id = session_id or str(uuid.uuid4())
        self.game_type = game_type
        self.host_id = host_id
        self.status = GameStatus.WAITING
        self.players = {}  # user_id -> Player
        self.created_at = datetime.now()
        self.started_at = None
        self.ended_at = None
        self.current_phase = GamePhase.SETUP
        self.phase_timer = None
        self.game_data = {}
        self.history = []
        self.winner = None
        self.settings = {}

class MafiaGame(GameSession):
    def __init__(self, host_id: str, session_id: str = None):
        super().__init__("mafia", host_id, session_id)
        self.roles_assigned = False
        self.night_actions = {}
        self.day_votes = {}
        self.eliminated_players = []
        self.round_number = 0
        
    def assign_roles(self) -> Dict[str, str]:
        """Assign roles to players for Mafia game"""
        player_count = len(self.players)
        if player_count < 4:
            raise ValueError("Need at least 4 players for Mafia")
        
        # Calculate role distribution
        mafia_count = max(1, player_count // 4)  # 25% mafia
        detective_count = 1
        doctor_count = 1 if player_count >= 6 else 0
        villager_count = player_count - mafia_count - detective_count - doctor_count
        
        # Create role list
        roles = []
        roles.extend([MafiaRole.MAFIA] * mafia_count)
        roles.extend([MafiaRole.DETECTIVE] * detective_count)
        roles.extend([MafiaRole.DOCTOR] * doctor_count)
        roles.extend([MafiaRole.VILLAGER] * villager_count)
        
        # Shuffle and assign
        random.shuffle(roles)
        role_assignments = {}
        
        for i, (player_id, player) in enumerate(self.players.items()):
            player.role = roles[i]
            role_assignments[player_id] = roles[i].value
        
        self.roles_assigned = True
        self.add_to_history("roles_assigned", {"assignments": role_assignments})
        
        return role_assignments
    
    def start_night_phase(self) -> Dict[str, Any]:
        """Start night phase where mafia and special roles act"""
        self.current_phase = GamePhase.NIGHT
        self.night_actions = {}
        self.round_number += 1
        
        phase_info = {
            "phase": "night",
            "round": self.round_number,
            "message": "Night falls. Mafia, choose your target. Detective and Doctor, make your choices.",
            "actions_needed": [],
            "time_limit": 60  # 60 seconds for night actions
        }
        
        # Determine who needs to act
        for player_id, player in self.players.items():
            if player.is_alive:
                if player.role == MafiaRole.MAFIA:
                    phase_info["actions_needed"].append({
                        "player_id": player_id,
                        "action_type": "kill",
                        "description": "Choose a player to eliminate"
                    })
                elif player.role == MafiaRole.DETECTIVE:
                    phase_info["actions_needed"].append({
                        "player_id": player_id,
                        "action_type": "investigate",
                        "description": "Choose a player to investigate"
                    })
                elif player.role == MafiaRole.DOCTOR:
                    phase_info["actions_needed"].append({
                        "player_id": player_id,
                        "action_type": "protect",
                        "description": "Choose a player to protect"
                    })
        
        self.add_to_history("night_started", phase_info)
        return phase_info
    
    def process_night_action(self, player_id: str, action: str, target_id: str) -> Dict[str, Any]:
        """Process a night action from a player"""
        player = self.players.get(player_id)
        if not player or not player.is_alive:
            return {"success": False, "error": "Player not found or dead"}
        
        if self.current_phase != GamePhase.NIGHT:
            return {"success": False, "error": "Not night phase"}
        
        # Validate action based on role
        valid_actions = {
            MafiaRole.MAFIA: "kill",
            MafiaRole.DETECTIVE: "investigate",
            MafiaRole.DOCTOR: "protect"
        }
        
        if valid_actions.get(player.role) != action:
            return {"success": False, "error": "Invalid action for your role"}
        
        # Record the action
        self.night_actions[player_id] = {
            "action": action,
            "target": target_id,
            "timestamp": datetime.now().isoformat()
        }
        
        # Check if all night actions are complete
        if self.all_night_actions_complete():
            return self.resolve_night_phase()
        
        return {"success": True, "message": "Action recorded"}
    
    def all_night_actions_complete(self) -> bool:
        """Check if all required night actions are complete"""
        required_actions = 0
        completed_actions = 0
        
        for player in self.players.values():
            if player.is_alive and player.role in [MafiaRole.MAFIA, MafiaRole.DETECTIVE, MafiaRole.DOCTOR]:
                required_actions += 1
                if player.id in self.night_actions:
                    completed_actions += 1
        
        return completed_actions >= required_actions
    
    def resolve_night_phase(self) -> Dict[str, Any]:
        """Resolve all night actions and transition to day"""
        results = {
            "eliminated": [],
            "protected": [],
            "investigated": [],
            "events": []
        }
        
        # Get actions
        kill_target = None
        protected_player = None
        investigation_results = []
        
        for player_id, action_data in self.night_actions.items():
            action = action_data["action"]
            target_id = action_data["target"]
            
            if action == "kill":
                kill_target = target_id
            elif action == "protect":
                protected_player = target_id
            elif action == "investigate":
                target_player = self.players.get(target_id)
                if target_player:
                    is_mafia = target_player.role == MafiaRole.MAFIA
                    investigation_results.append({
                        "investigator": player_id,
                        "target": target_id,
                        "result": "mafia" if is_mafia else "innocent"
                    })
        
        # Resolve elimination
        if kill_target and kill_target != protected_player:
            target_player = self.players.get(kill_target)
            if target_player:
                target_player.is_alive = False
                self.eliminated_players.append(kill_target)
                results["eliminated"].append({
                    "player_id": kill_target,
                    "player_name": target_player.name,
                    "cause": "eliminated_by_mafia"
                })
                results["events"].append(f"{target_player.name} was eliminated during the night")
        elif kill_target == protected_player:
            results["events"].append("The mafia's target was protected!")
        
        if protected_player:
            results["protected"].append(protected_player)
        
        results["investigated"] = investigation_results
        
        # Check win conditions
        win_result = self.check_win_condition()
        if win_result["game_over"]:
            self.current_phase = GamePhase.GAME_OVER
            self.status = GameStatus.COMPLETED
            self.winner = win_result["winner"]
            self.ended_at = datetime.now()
            results["game_over"] = True
            results["winner"] = win_result["winner"]
        else:
            # Transition to day phase
            self.current_phase = GamePhase.DAY
            results["next_phase"] = "day"
        
        self.add_to_history("night_resolved", results)
        return results
    
    def start_day_phase(self) -> Dict[str, Any]:
        """Start day phase for discussion and voting"""
        self.current_phase = GamePhase.DAY
        self.day_votes = {}
        
        alive_players = [p for p in self.players.values() if p.is_alive]
        
        phase_info = {
            "phase": "day",
            "round": self.round_number,
            "message": "Day breaks. Discuss and vote to eliminate a suspected mafia member.",
            "alive_players": [{"id": p.id, "name": p.name} for p in alive_players],
            "voting_time": 180,  # 3 minutes for discussion and voting
            "requires_majority": True
        }
        
        self.add_to_history("day_started", phase_info)
        return phase_info
    
    def cast_vote(self, voter_id: str, target_id: str) -> Dict[str, Any]:
        """Cast a vote to eliminate a player"""
        voter = self.players.get(voter_id)
        if not voter or not voter.is_alive:
            return {"success": False, "error": "You cannot vote"}
        
        if self.current_phase not in [GamePhase.DAY, GamePhase.VOTING]:
            return {"success": False, "error": "Not voting time"}
        
        target = self.players.get(target_id)
        if not target or not target.is_alive:
            return {"success": False, "error": "Invalid vote target"}
        
        # Record vote
        self.day_votes[voter_id] = target_id
        
        return {"success": True, "message": f"Vote cast for {target.name}"}
    
    def resolve_day_voting(self) -> Dict[str, Any]:
        """Resolve day phase voting"""
        vote_counts = {}
        
        # Count votes
        for target_id in self.day_votes.values():
            vote_counts[target_id] = vote_counts.get(target_id, 0) + 1
        
        if not vote_counts:
            return {"success": False, "message": "No votes cast"}
        
        # Find player with most votes
        max_votes = max(vote_counts.values())
        eliminated_candidates = [pid for pid, votes in vote_counts.items() if votes == max_votes]
        
        results = {
            "vote_counts": {self.players[pid].name: votes for pid, votes in vote_counts.items()},
            "eliminated": [],
            "tie": len(eliminated_candidates) > 1
        }
        
        if len(eliminated_candidates) == 1:
            # Single elimination
            eliminated_id = eliminated_candidates[0]
            eliminated_player = self.players[eliminated_id]
            eliminated_player.is_alive = False
            self.eliminated_players.append(eliminated_id)
            
            results["eliminated"].append({
                "player_id": eliminated_id,
                "player_name": eliminated_player.name,
                "role": eliminated_player.role.value,
                "votes": max_votes
            })
        
        # Check win conditions
        win_result = self.check_win_condition()
        if win_result["game_over"]:
            self.current_phase = GamePhase.GAME_OVER
            self.status = GameStatus.COMPLETED
            self.winner = win_result["winner"]
            self.ended_at = datetime.now()
            results["game_over"] = True
            results["winner"] = win_result["winner"]
        
        self.add_to_history("day_resolved", results)
        return results
    
    def check_win_condition(self) -> Dict[str, Any]:
        """Check if game should end"""
        alive_players = [p for p in self.players.values() if p.is_alive]
        mafia_alive = [p for p in alive_players if p.role == MafiaRole.MAFIA]
        villagers_alive = [p for p in alive_players if p.role != MafiaRole.MAFIA]
        
        if len(mafia_alive) == 0:
            return {"game_over": True, "winner": "villagers", "reason": "All mafia eliminated"}
        elif len(mafia_alive) >= len(villagers_alive):
            return {"game_over": True, "winner": "mafia", "reason": "Mafia equals or outnumbers villagers"}
        else:
            return {"game_over": False}
    
    def add_to_history(self, event_type: str, data: Dict[str, Any]):
        """Add event to game history"""
        self.history.append({
            "timestamp": datetime.now().isoformat(),
            "event": event_type,
            "data": data
        })

class GameSessionManager:
    """Manages all active game sessions"""
    
    def __init__(self, gemini_model=None):
        self.sessions = {}  # session_id -> GameSession
        self.gemini_model = gemini_model
        self.cleanup_task = None
        
    async def start_cleanup_task(self):
        """Start background task to cleanup old sessions"""
        if not self.cleanup_task:
            self.cleanup_task = asyncio.create_task(self._cleanup_sessions())
    
    async def _cleanup_sessions(self):
        """Background task to cleanup inactive sessions"""
        while True:
            try:
                current_time = datetime.now()
                sessions_to_remove = []
                
                for session_id, session in self.sessions.items():
                    # Remove sessions older than 2 hours or completed/cancelled
                    age = current_time - session.created_at
                    if (age > timedelta(hours=2) or 
                        session.status in [GameStatus.COMPLETED, GameStatus.CANCELLED]):
                        sessions_to_remove.append(session_id)
                
                for session_id in sessions_to_remove:
                    del self.sessions[session_id]
                    logger.info(f"Cleaned up game session: {session_id}")
                
                await asyncio.sleep(300)  # Check every 5 minutes
                
            except Exception as e:
                logger.error(f"Session cleanup error: {e}")
                await asyncio.sleep(60)  # Retry in 1 minute
    
    def create_mafia_game(self, host_id: str, host_name: str) -> str:
        """Create a new Mafia game session"""
        session = MafiaGame(host_id)
        session.players[host_id] = Player(host_id, host_name)
        self.sessions[session.id] = session
        
        logger.info(f"Created Mafia game session: {session.id}")
        return session.id
    
    def join_game(self, session_id: str, user_id: str, user_name: str) -> Dict[str, Any]:
        """Join an existing game session"""
        session = self.sessions.get(session_id)
        if not session:
            return {"success": False, "error": "Game session not found"}
        
        if session.status != GameStatus.WAITING:
            return {"success": False, "error": "Game already started"}
        
        if user_id in session.players:
            return {"success": False, "error": "Already in game"}
        
        if len(session.players) >= 12:  # Max players
            return {"success": False, "error": "Game is full"}
        
        session.players[user_id] = Player(user_id, user_name)
        
        return {
            "success": True,
            "message": f"{user_name} joined the game",
            "player_count": len(session.players)
        }
    
    def start_game(self, session_id: str, host_id: str) -> Dict[str, Any]:
        """Start a game session"""
        session = self.sessions.get(session_id)
        if not session:
            return {"success": False, "error": "Game session not found"}
        
        if session.host_id != host_id:
            return {"success": False, "error": "Only host can start game"}
        
        if len(session.players) < 4:
            return {"success": False, "error": "Need at least 4 players"}
        
        try:
            session.status = GameStatus.ACTIVE
            session.started_at = datetime.now()
            
            if isinstance(session, MafiaGame):
                role_assignments = session.assign_roles()
                night_phase = session.start_night_phase()
                
                return {
                    "success": True,
                    "message": "Game started!",
                    "role_assignments": role_assignments,
                    "current_phase": night_phase
                }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def get_game_state(self, session_id: str, user_id: str) -> Dict[str, Any]:
        """Get current game state for a player"""
        session = self.sessions.get(session_id)
        if not session:
            return {"success": False, "error": "Game session not found"}
        
        player = session.players.get(user_id)
        if not player:
            return {"success": False, "error": "You are not in this game"}
        
        # Base game state
        state = {
            "session_id": session.id,
            "game_type": session.game_type,
            "status": session.status.value,
            "current_phase": session.current_phase.value if hasattr(session, 'current_phase') else None,
            "players": [
                {
                    "id": p.id,
                    "name": p.name,
                    "is_alive": p.is_alive,
                    "is_host": p.id == session.host_id
                }
                for p in session.players.values()
            ],
            "your_role": player.role.value if player.role else None,
            "your_status": "alive" if player.is_alive else "eliminated"
        }
        
        # Add game-specific data
        if isinstance(session, MafiaGame):
            state.update({
                "round_number": session.round_number,
                "eliminated_players": [
                    {"id": pid, "name": session.players[pid].name}
                    for pid in session.eliminated_players
                ],
                "winner": session.winner
            })
        
        return {"success": True, "game_state": state}
    
    async def process_game_action(self, session_id: str, user_id: str, action: Dict[str, Any]) -> Dict[str, Any]:
        """Process a game action from a player"""
        session = self.sessions.get(session_id)
        if not session:
            return {"success": False, "error": "Game session not found"}
        
        if isinstance(session, MafiaGame):
            action_type = action.get("type")
            
            if action_type == "night_action":
                return session.process_night_action(
                    user_id,
                    action.get("action"),
                    action.get("target_id")
                )
            elif action_type == "vote":
                return session.cast_vote(user_id, action.get("target_id"))
            elif action_type == "resolve_voting":
                if session.host_id == user_id:
                    return session.resolve_day_voting()
                else:
                    return {"success": False, "error": "Only host can resolve voting"}
        
        return {"success": False, "error": "Unknown action"}
    
    async def get_ai_game_insights(self, session_id: str) -> str:
        """Get AI insights about the current game state"""
        if not self.gemini_model:
            return "AI insights unavailable"
        
        session = self.sessions.get(session_id)
        if not session:
            return "Game session not found"
        
        try:
            # Build context about the game
            context = f"""
            Game Type: {session.game_type}
            Status: {session.status.value}
            Players: {len(session.players)}
            Duration: {datetime.now() - session.created_at}
            """
            
            if isinstance(session, MafiaGame):
                alive_count = len([p for p in session.players.values() if p.is_alive])
                context += f"""
                Round: {session.round_number}
                Alive Players: {alive_count}
                Current Phase: {session.current_phase.value}
                Eliminated: {len(session.eliminated_players)}
                """
            
            prompt = f"""
            Analyze this family game session and provide helpful insights:
            
            {context}
            
            Provide 2-3 sentences about:
            - How the game is progressing
            - Tips for maintaining engagement
            - Suggestions for family fun
            
            Keep it positive and family-friendly.
            """
            
            response = self.gemini_model.generate_content(prompt)
            return response.text.strip()
            
        except Exception as e:
            logger.error(f"AI insights error: {e}")
            return "The game is progressing well! Keep the family engaged and have fun together."

# Global instance
game_manager = None

def initialize_game_manager(gemini_model=None):
    """Initialize the game session manager"""
    global game_manager
    game_manager = GameSessionManager(gemini_model)
    return game_manager

def get_game_manager():
    """Get the game session manager instance"""
    return game_manager