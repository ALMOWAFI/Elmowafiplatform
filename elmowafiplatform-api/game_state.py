#!/usr/bin/env python3
"""
Game State Management System for Elmowafiplatform
Handles game sessions, state transitions, multiplayer support, and real-time updates
"""

import os
import uuid
import logging
import asyncio
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from enum import Enum
import json
import random

# Import existing modules
from unified_database import get_unified_database
from logging_config import get_logger
from performance_monitoring import performance_monitor
from rate_limiting import rate_limit
from circuit_breakers import circuit_breaker
from websocket_redis_manager import get_websocket_manager

logger = get_logger("game_state")

class GameType(Enum):
    """Supported game types"""
    MEMORY_MATCH = "memory_match"
    FAMILY_TRIVIA = "family_trivia"
    PHOTO_QUIZ = "photo_quiz"
    STORY_BUILDER = "story_builder"
    WORD_ASSOCIATION = "word_association"
    TIMELINE_GAME = "timeline_game"

class GameState(Enum):
    """Game state enumeration"""
    WAITING = "waiting"
    ACTIVE = "active"
    PAUSED = "paused"
    FINISHED = "finished"
    CANCELLED = "cancelled"

class GamePhase(Enum):
    """Game phase enumeration"""
    SETUP = "setup"
    ROUND_START = "round_start"
    PLAYING = "playing"
    ROUND_END = "round_end"
    GAME_END = "game_end"

class GameStateManager:
    """Comprehensive game state management system"""
    
    def __init__(self):
        self.db = get_unified_database()
        self.websocket_manager = get_websocket_manager()
        
        # Game configuration
        self.max_players = int(os.getenv('MAX_GAME_PLAYERS', 8))
        self.game_timeout = int(os.getenv('GAME_TIMEOUT_SECONDS', 300))  # 5 minutes
        self.round_timeout = int(os.getenv('ROUND_TIMEOUT_SECONDS', 60))  # 1 minute
        
        # Active games cache
        self.active_games = {}
        
        logger.info("Game State Manager initialized")
    
    @circuit_breaker("game_state")
    async def create_game_session(
        self,
        family_group_id: str,
        game_type: str,
        title: Optional[str] = None,
        description: Optional[str] = None,
        players: List[str] = None,
        settings: Dict[str, Any] = None,
        created_by: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a new game session"""
        
        try:
            # Validate game type
            if game_type not in [gt.value for gt in GameType]:
                return {
                    "success": False,
                    "error": f"Invalid game type. Supported: {[gt.value for gt in GameType]}"
                }
            
            # Generate game session data
            session_id = str(uuid.uuid4())
            game_data = {
                "family_group_id": family_group_id,
                "game_type": game_type,
                "title": title or f"{game_type.replace('_', ' ').title()} Game",
                "description": description or f"Family {game_type} game",
                "players": players or [],
                "status": GameState.WAITING.value,
                "current_phase": GamePhase.SETUP.value,
                "game_state": self._initialize_game_state(game_type),
                "settings": settings or self._get_default_settings(game_type),
                "current_round": 0,
                "total_rounds": settings.get("total_rounds", 5) if settings else 5,
                "scores": {},
                "created_at": datetime.now().isoformat(),
                "created_by": created_by or "system"
            }
            
            # Save to database
            session_id = self.db.create_game_session(game_data)
            
            if not session_id:
                return {"success": False, "error": "Failed to create game session"}
            
            # Add to active games cache
            self.active_games[session_id] = game_data
            
            # Track business metric
            performance_monitor.track_business_metric(
                'game_session_created',
                family_group_id,
                game_type=game_type
            )
            
            logger.info(f"Game session created: {session_id}")
            
            return {
                "success": True,
                "session_id": session_id,
                "game_data": game_data
            }
            
        except Exception as e:
            logger.error(f"Game session creation failed: {e}")
            return {"success": False, "error": str(e)}
    
    def _initialize_game_state(self, game_type: str) -> Dict[str, Any]:
        """Initialize game state based on game type"""
        
        if game_type == GameType.MEMORY_MATCH.value:
            return {
                "cards": self._generate_memory_cards(),
                "flipped_cards": [],
                "matched_pairs": [],
                "current_player": None,
                "turn_count": 0
            }
        
        elif game_type == GameType.FAMILY_TRIVIA.value:
            return {
                "questions": self._generate_family_questions(),
                "current_question": 0,
                "answers": {},
                "correct_answers": 0,
                "question_timer": None
            }
        
        elif game_type == GameType.PHOTO_QUIZ.value:
            return {
                "photos": self._get_family_photos(),
                "current_photo": 0,
                "guesses": {},
                "correct_guesses": 0,
                "photo_timer": None
            }
        
        elif game_type == GameType.STORY_BUILDER.value:
            return {
                "story_parts": [],
                "current_speaker": None,
                "story_length": 0,
                "contributions": {},
                "story_timer": None
            }
        
        elif game_type == GameType.WORD_ASSOCIATION.value:
            return {
                "words": self._generate_association_words(),
                "current_word": 0,
                "associations": {},
                "word_timer": None,
                "round_words": []
            }
        
        elif game_type == GameType.TIMELINE_GAME.value:
            return {
                "events": self._get_family_events(),
                "current_event": 0,
                "timeline_guesses": {},
                "correct_chronology": 0,
                "event_timer": None
            }
        
        return {}
    
    def _get_default_settings(self, game_type: str) -> Dict[str, Any]:
        """Get default settings for game type"""
        
        defaults = {
            GameType.MEMORY_MATCH.value: {
                "grid_size": 4,
                "time_limit": 60,
                "hints_enabled": True
            },
            GameType.FAMILY_TRIVIA.value: {
                "question_count": 10,
                "time_per_question": 30,
                "difficulty": "medium"
            },
            GameType.PHOTO_QUIZ.value: {
                "photo_count": 15,
                "time_per_photo": 20,
                "hint_level": 2
            },
            GameType.STORY_BUILDER.value: {
                "story_length": 10,
                "time_per_turn": 30,
                "story_theme": "family"
            },
            GameType.WORD_ASSOCIATION.value: {
                "word_count": 20,
                "time_per_word": 15,
                "association_limit": 3
            },
            GameType.TIMELINE_GAME.value: {
                "event_count": 12,
                "time_per_event": 25,
                "chronology_hints": True
            }
        }
        
        return defaults.get(game_type, {})
    
    async def join_game_session(
        self,
        session_id: str,
        player_id: str,
        player_name: str
    ) -> Dict[str, Any]:
        """Join an existing game session"""
        
        try:
            # Get game session
            game_session = self.db.get_game_session(session_id)
            if not game_session:
                return {"success": False, "error": "Game session not found"}
            
            # Check if game is joinable
            if game_session["status"] != GameState.WAITING.value:
                return {"success": False, "error": "Game is not accepting new players"}
            
            # Check player limit
            if len(game_session["players"]) >= self.max_players:
                return {"success": False, "error": "Game is full"}
            
            # Add player to game
            player_data = {
                "id": player_id,
                "name": player_name,
                "joined_at": datetime.now().isoformat(),
                "score": 0,
                "ready": False
            }
            
            success = self.db.add_player_to_game(session_id, player_data)
            
            if success:
                # Update active games cache
                if session_id in self.active_games:
                    self.active_games[session_id]["players"].append(player_data)
                
                # Notify other players via WebSocket
                await self._notify_game_update(session_id, "player_joined", player_data)
                
                logger.info(f"Player {player_name} joined game {session_id}")
                
                return {
                    "success": True,
                    "session_id": session_id,
                    "player_data": player_data,
                    "game_data": game_session
                }
            else:
                return {"success": False, "error": "Failed to join game"}
                
        except Exception as e:
            logger.error(f"Join game failed: {e}")
            return {"success": False, "error": str(e)}
    
    async def start_game(self, session_id: str) -> Dict[str, Any]:
        """Start a game session"""
        
        try:
            # Get game session
            game_session = self.db.get_game_session(session_id)
            if not game_session:
                return {"success": False, "error": "Game session not found"}
            
            # Check if game can be started
            if game_session["status"] != GameState.WAITING.value:
                return {"success": False, "error": "Game cannot be started"}
            
            if len(game_session["players"]) < 2:
                return {"success": False, "error": "Need at least 2 players to start"}
            
            # Update game state
            updates = {
                "status": GameState.ACTIVE.value,
                "current_phase": GamePhase.ROUND_START.value,
                "started_at": datetime.now().isoformat(),
                "current_round": 1
            }
            
            success = self.db.update_game_session(session_id, updates)
            
            if success:
                # Update active games cache
                if session_id in self.active_games:
                    self.active_games[session_id].update(updates)
                
                # Initialize first round
                await self._start_round(session_id, 1)
                
                # Notify players
                await self._notify_game_update(session_id, "game_started", updates)
                
                logger.info(f"Game {session_id} started")
                
                return {
                    "success": True,
                    "session_id": session_id,
                    "game_state": updates
                }
            else:
                return {"success": False, "error": "Failed to start game"}
                
        except Exception as e:
            logger.error(f"Start game failed: {e}")
            return {"success": False, "error": str(e)}
    
    async def make_game_move(
        self,
        session_id: str,
        player_id: str,
        move_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Make a move in the game"""
        
        try:
            # Get game session
            game_session = self.db.get_game_session(session_id)
            if not game_session:
                return {"success": False, "error": "Game session not found"}
            
            # Validate move
            move_validation = await self._validate_move(game_session, player_id, move_data)
            if not move_validation["valid"]:
                return move_validation
            
            # Process move
            move_result = await self._process_move(game_session, player_id, move_data)
            
            # Update game state
            success = self.db.update_game_session(session_id, move_result["game_updates"])
            
            if success:
                # Update active games cache
                if session_id in self.active_games:
                    self.active_games[session_id].update(move_result["game_updates"])
                
                # Notify players
                await self._notify_game_update(session_id, "move_made", {
                    "player_id": player_id,
                    "move_data": move_data,
                    "result": move_result
                })
                
                # Check for round/game end
                if move_result.get("round_complete"):
                    await self._end_round(session_id)
                
                if move_result.get("game_complete"):
                    await self._end_game(session_id)
                
                return {
                    "success": True,
                    "move_result": move_result
                }
            else:
                return {"success": False, "error": "Failed to process move"}
                
        except Exception as e:
            logger.error(f"Game move failed: {e}")
            return {"success": False, "error": str(e)}
    
    async def _validate_move(
        self,
        game_session: Dict[str, Any],
        player_id: str,
        move_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Validate a game move"""
        
        # Check if game is active
        if game_session["status"] != GameState.ACTIVE.value:
            return {"valid": False, "error": "Game is not active"}
        
        # Check if it's player's turn (for turn-based games)
        game_type = game_session["game_type"]
        if game_type in [GameType.MEMORY_MATCH.value, GameType.STORY_BUILDER.value]:
            current_player = game_session["game_state"].get("current_player")
            if current_player and current_player != player_id:
                return {"valid": False, "error": "Not your turn"}
        
        # Check if player is in the game
        player_ids = [p["id"] for p in game_session["players"]]
        if player_id not in player_ids:
            return {"valid": False, "error": "Player not in game"}
        
        return {"valid": True}
    
    async def _process_move(
        self,
        game_session: Dict[str, Any],
        player_id: str,
        move_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Process a game move"""
        
        game_type = game_session["game_type"]
        game_state = game_session["game_state"]
        
        if game_type == GameType.MEMORY_MATCH.value:
            return await self._process_memory_match_move(game_state, player_id, move_data)
        
        elif game_type == GameType.FAMILY_TRIVIA.value:
            return await self._process_trivia_move(game_state, player_id, move_data)
        
        elif game_type == GameType.PHOTO_QUIZ.value:
            return await self._process_photo_quiz_move(game_state, player_id, move_data)
        
        elif game_type == GameType.STORY_BUILDER.value:
            return await self._process_story_move(game_state, player_id, move_data)
        
        elif game_type == GameType.WORD_ASSOCIATION.value:
            return await self._process_word_association_move(game_state, player_id, move_data)
        
        elif game_type == GameType.TIMELINE_GAME.value:
            return await self._process_timeline_move(game_state, player_id, move_data)
        
        return {"game_updates": {}, "round_complete": False, "game_complete": False}
    
    async def _process_memory_match_move(
        self,
        game_state: Dict[str, Any],
        player_id: str,
        move_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Process memory match move"""
        
        card_index = move_data.get("card_index")
        if card_index is None:
            return {"game_updates": {}, "error": "Invalid move"}
        
        flipped_cards = game_state.get("flipped_cards", [])
        cards = game_state.get("cards", [])
        
        # Add card to flipped cards
        flipped_cards.append({"index": card_index, "player": player_id})
        
        # Check for match
        if len(flipped_cards) == 2:
            card1, card2 = flipped_cards[-2:]
            if cards[card1["index"]] == cards[card2["index"]]:
                # Match found
                matched_pairs = game_state.get("matched_pairs", [])
                matched_pairs.extend([card1["index"], card2["index"]])
                
                # Update scores
                scores = game_state.get("scores", {})
                scores[player_id] = scores.get(player_id, 0) + 10
                
                # Check if game is complete
                game_complete = len(matched_pairs) == len(cards)
                
                return {
                    "game_updates": {
                        "game_state": {
                            **game_state,
                            "flipped_cards": [],
                            "matched_pairs": matched_pairs,
                            "scores": scores
                        }
                    },
                    "round_complete": game_complete,
                    "game_complete": game_complete
                }
            else:
                # No match, reset flipped cards after delay
                return {
                    "game_updates": {
                        "game_state": {
                            **game_state,
                            "flipped_cards": flipped_cards
                        }
                    },
                    "round_complete": False,
                    "game_complete": False
                }
        else:
            return {
                "game_updates": {
                    "game_state": {
                        **game_state,
                        "flipped_cards": flipped_cards
                    }
                },
                "round_complete": False,
                "game_complete": False
            }
    
    async def _process_trivia_move(
        self,
        game_state: Dict[str, Any],
        player_id: str,
        move_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Process trivia move"""
        
        answer = move_data.get("answer")
        current_question = game_state.get("current_question", 0)
        questions = game_state.get("questions", [])
        
        if current_question >= len(questions):
            return {"game_updates": {}, "round_complete": True, "game_complete": True}
        
        # Check answer
        correct_answer = questions[current_question].get("correct_answer")
        is_correct = answer == correct_answer
        
        # Update scores
        scores = game_state.get("scores", {})
        if is_correct:
            scores[player_id] = scores.get(player_id, 0) + 10
        
        # Move to next question
        next_question = current_question + 1
        
        return {
            "game_updates": {
                "game_state": {
                    **game_state,
                    "current_question": next_question,
                    "scores": scores
                }
            },
            "round_complete": next_question >= len(questions),
            "game_complete": next_question >= len(questions)
        }
    
    async def _process_photo_quiz_move(
        self,
        game_state: Dict[str, Any],
        player_id: str,
        move_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Process photo quiz move"""
        
        guess = move_data.get("guess")
        current_photo = game_state.get("current_photo", 0)
        photos = game_state.get("photos", [])
        
        if current_photo >= len(photos):
            return {"game_updates": {}, "round_complete": True, "game_complete": True}
        
        # Check guess
        correct_answer = photos[current_photo].get("correct_answer")
        is_correct = guess == correct_answer
        
        # Update scores
        scores = game_state.get("scores", {})
        if is_correct:
            scores[player_id] = scores.get(player_id, 0) + 10
        
        # Move to next photo
        next_photo = current_photo + 1
        
        return {
            "game_updates": {
                "game_state": {
                    **game_state,
                    "current_photo": next_photo,
                    "scores": scores
                }
            },
            "round_complete": next_photo >= len(photos),
            "game_complete": next_photo >= len(photos)
        }
    
    async def _process_story_move(
        self,
        game_state: Dict[str, Any],
        player_id: str,
        move_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Process story builder move"""
        
        story_part = move_data.get("story_part")
        story_parts = game_state.get("story_parts", [])
        story_length = game_state.get("story_length", 10)
        
        # Add story part
        story_parts.append({
            "player_id": player_id,
            "part": story_part,
            "timestamp": datetime.now().isoformat()
        })
        
        # Check if story is complete
        story_complete = len(story_parts) >= story_length
        
        return {
            "game_updates": {
                "game_state": {
                    **game_state,
                    "story_parts": story_parts
                }
            },
            "round_complete": story_complete,
            "game_complete": story_complete
        }
    
    async def _process_word_association_move(
        self,
        game_state: Dict[str, Any],
        player_id: str,
        move_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Process word association move"""
        
        association = move_data.get("association")
        current_word = game_state.get("current_word", 0)
        words = game_state.get("words", [])
        associations = game_state.get("associations", {})
        
        # Add association
        if player_id not in associations:
            associations[player_id] = []
        associations[player_id].append({
            "word_index": current_word,
            "association": association
        })
        
        # Move to next word
        next_word = current_word + 1
        
        return {
            "game_updates": {
                "game_state": {
                    **game_state,
                    "current_word": next_word,
                    "associations": associations
                }
            },
            "round_complete": next_word >= len(words),
            "game_complete": next_word >= len(words)
        }
    
    async def _process_timeline_move(
        self,
        game_state: Dict[str, Any],
        player_id: str,
        move_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Process timeline game move"""
        
        event_order = move_data.get("event_order")
        current_event = game_state.get("current_event", 0)
        events = game_state.get("events", [])
        
        # Check if order is correct
        correct_order = events[current_event].get("correct_order")
        is_correct = event_order == correct_order
        
        # Update scores
        scores = game_state.get("scores", {})
        if is_correct:
            scores[player_id] = scores.get(player_id, 0) + 10
        
        # Move to next event
        next_event = current_event + 1
        
        return {
            "game_updates": {
                "game_state": {
                    **game_state,
                    "current_event": next_event,
                    "scores": scores
                }
            },
            "round_complete": next_event >= len(events),
            "game_complete": next_event >= len(events)
        }
    
    async def _start_round(self, session_id: str, round_number: int) -> None:
        """Start a new round"""
        
        try:
            # Get game session
            game_session = self.db.get_game_session(session_id)
            if not game_session:
                return
            
            # Update round state
            updates = {
                "current_round": round_number,
                "current_phase": GamePhase.PLAYING.value,
                "round_started_at": datetime.now().isoformat()
            }
            
            self.db.update_game_session(session_id, updates)
            
            # Notify players
            await self._notify_game_update(session_id, "round_started", {
                "round_number": round_number,
                "game_state": game_session["game_state"]
            })
            
            logger.info(f"Round {round_number} started for game {session_id}")
            
        except Exception as e:
            logger.error(f"Start round failed: {e}")
    
    async def _end_round(self, session_id: str) -> None:
        """End current round"""
        
        try:
            # Get game session
            game_session = self.db.get_game_session(session_id)
            if not game_session:
                return
            
            current_round = game_session.get("current_round", 0)
            total_rounds = game_session.get("total_rounds", 5)
            
            if current_round < total_rounds:
                # Start next round
                await self._start_round(session_id, current_round + 1)
            else:
                # End game
                await self._end_game(session_id)
            
            logger.info(f"Round {current_round} ended for game {session_id}")
            
        except Exception as e:
            logger.error(f"End round failed: {e}")
    
    async def _end_game(self, session_id: str) -> None:
        """End the game"""
        
        try:
            # Get game session
            game_session = self.db.get_game_session(session_id)
            if not game_session:
                return
            
            # Calculate final scores and winner
            scores = game_session.get("game_state", {}).get("scores", {})
            winner = max(scores.items(), key=lambda x: x[1]) if scores else None
            
            # Update game state
            updates = {
                "status": GameState.FINISHED.value,
                "current_phase": GamePhase.GAME_END.value,
                "ended_at": datetime.now().isoformat(),
                "winner": winner[0] if winner else None,
                "final_scores": scores
            }
            
            self.db.update_game_session(session_id, updates)
            
            # Remove from active games
            if session_id in self.active_games:
                del self.active_games[session_id]
            
            # Notify players
            await self._notify_game_update(session_id, "game_ended", updates)
            
            # Track business metric
            performance_monitor.track_business_metric(
                'game_completed',
                game_session["family_group_id"],
                game_type=game_session["game_type"]
            )
            
            logger.info(f"Game {session_id} ended. Winner: {winner[0] if winner else 'None'}")
            
        except Exception as e:
            logger.error(f"End game failed: {e}")
    
    async def _notify_game_update(
        self,
        session_id: str,
        event_type: str,
        data: Dict[str, Any]
    ) -> None:
        """Notify players of game updates via WebSocket"""
        
        try:
            message = {
                "type": "game_update",
                "session_id": session_id,
                "event": event_type,
                "data": data,
                "timestamp": datetime.now().isoformat()
            }
            
            await self.websocket_manager.broadcast_to_game(session_id, message)
            
        except Exception as e:
            logger.error(f"Failed to notify game update: {e}")
    
    # Helper methods for game data generation
    def _generate_memory_cards(self) -> List[str]:
        """Generate memory match cards"""
        symbols = ["🌟", "🎈", "🎨", "🎮", "🎵", "🎪", "🎭", "🎯", "🎲", "🎸", "🎹", "🎺"]
        cards = symbols * 2  # Each symbol appears twice
        random.shuffle(cards)
        return cards
    
    def _generate_family_questions(self) -> List[Dict[str, Any]]:
        """Generate family trivia questions"""
        return [
            {
                "question": "What is the family's favorite vacation spot?",
                "options": ["Beach", "Mountains", "City", "Countryside"],
                "correct_answer": "Beach"
            },
            {
                "question": "Who is the oldest family member?",
                "options": ["Grandma", "Grandpa", "Mom", "Dad"],
                "correct_answer": "Grandma"
            }
        ]
    
    def _get_family_photos(self) -> List[Dict[str, Any]]:
        """Get family photos for photo quiz"""
        # This would integrate with the photo system
        return [
            {
                "photo_url": "/uploads/photos/sample1.jpg",
                "question": "Who is in this photo?",
                "options": ["Mom", "Dad", "Sister", "Brother"],
                "correct_answer": "Mom"
            }
        ]
    
    def _generate_association_words(self) -> List[str]:
        """Generate words for word association game"""
        return ["Family", "Love", "Home", "Together", "Happy", "Fun", "Memory", "Share"]
    
    def _get_family_events(self) -> List[Dict[str, Any]]:
        """Get family events for timeline game"""
        return [
            {
                "event": "Family vacation",
                "year": 2023,
                "correct_order": 1
            },
            {
                "event": "Birthday party",
                "year": 2022,
                "correct_order": 2
            }
        ]

# Global game state manager instance
game_state_manager = GameStateManager()

def get_game_state_manager():
    """Get game state manager instance"""
    return game_state_manager 