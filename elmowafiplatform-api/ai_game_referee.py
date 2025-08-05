#!/usr/bin/env python3
"""
AI Game Referee System for Elmowafiplatform
Intelligent referee for family games with cheat detection, rule enforcement, and adaptive gameplay
"""

import os
import json
import logging
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple, Set
from dataclasses import dataclass, asdict
from enum import Enum
import random
import numpy as np
from collections import defaultdict, Counter
import statistics

from unified_database import get_unified_database
from redis_manager import redis_manager
from logging_config import get_logger
from performance_monitoring import performance_monitor
from mafia_game_engine import MafiaRole, GamePhase, MafiaGameState, get_mafia_engine
from cheat_detection_algorithms import get_cheat_detector, CheatDetectionResult, CheatIndicator

logger = get_logger("ai_referee")

class CheatType(Enum):
    """Types of cheating behaviors"""
    COMMUNICATION_OUTSIDE_GAME = "external_communication"
    VOTING_MANIPULATION = "voting_manipulation"
    ROLE_CLAIMING_ABUSE = "role_claiming_abuse"
    TIMING_MANIPULATION = "timing_manipulation"
    PATTERN_GAMING = "pattern_gaming"
    GHOSTING = "ghosting"
    METAGAMING = "metagaming"

class RefereeBehavior(Enum):
    """AI Referee behavior modes"""
    STRICT = "strict"           # Strict rule enforcement
    BALANCED = "balanced"       # Balanced enforcement with warnings
    CASUAL = "casual"          # Lenient for family play
    ADAPTIVE = "adaptive"      # Adapts to player behavior

class PlayerPersonality(Enum):
    """Player personality types for AI adaptation"""
    COMPETITIVE = "competitive"
    CASUAL = "casual"
    ANALYTICAL = "analytical"
    SOCIAL = "social"
    CHAOTIC = "chaotic"

@dataclass
class CheatDetection:
    """Cheat detection result"""
    player_id: str
    cheat_type: CheatType
    confidence: float
    evidence: Dict[str, Any]
    timestamp: datetime
    action_taken: str

@dataclass
class PlayerAnalytics:
    """Player behavior analytics"""
    player_id: str
    games_played: int
    win_rate: float
    average_action_time: float
    communication_patterns: Dict[str, Any]
    voting_patterns: Dict[str, Any]
    role_performance: Dict[str, float]
    suspected_cheats: List[CheatDetection]
    personality_type: PlayerPersonality
    trust_score: float

@dataclass
class GameBalance:
    """Game balance analysis"""
    role_balance_score: float
    player_skill_variance: float
    predicted_game_length: int
    recommended_adjustments: List[str]
    difficulty_level: float

class AIGameReferee:
    """Intelligent AI referee for family games"""
    
    def __init__(self):
        self.db = get_unified_database()
        self.mafia_engine = get_mafia_engine()
        self.cheat_detector = get_cheat_detector()
        
        # Referee configuration
        self.behavior_mode = RefereeBehavior.BALANCED
        self.cheat_detection_sensitivity = 0.7
        self.auto_punishment = False
        self.family_friendly_mode = True
        
        # Player analytics storage
        self.player_analytics: Dict[str, PlayerAnalytics] = {}
        
        # Cheat detection thresholds
        self.cheat_thresholds = {
            CheatType.COMMUNICATION_OUTSIDE_GAME: 0.8,
            CheatType.VOTING_MANIPULATION: 0.75,
            CheatType.ROLE_CLAIMING_ABUSE: 0.6,
            CheatType.TIMING_MANIPULATION: 0.7,
            CheatType.PATTERN_GAMING: 0.65,
            CheatType.GHOSTING: 0.9,
            CheatType.METAGAMING: 0.7
        }
        
        # Language support
        self.messages = {
            "en": {
                "role_assigned": "You have been assigned the role of {role}. {description}",
                "cheat_warning": "Warning: Suspicious behavior detected. Please play fairly.",
                "rule_reminder": "Reminder: {rule}",
                "game_balance": "Game balance adjusted for fair play.",
                "player_eliminated": "{player} has been eliminated from the game."
            },
            "ar": {
                "role_assigned": "تم تعيين دور {role} لك. {description}",
                "cheat_warning": "تحذير: تم اكتشاف سلوك مشبوه. يرجى اللعب بعدالة.",
                "rule_reminder": "تذكير: {rule}",
                "game_balance": "تم تعديل توازن اللعبة للعب العادل.",
                "player_eliminated": "تم إقصاء {player} من اللعبة."
            }
        }
    
    @performance_monitor.track_function_performance
    async def initialize_referee_for_game(
        self,
        session_id: str,
        family_group_id: str,
        referee_settings: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Initialize AI referee for a game session"""
        
        try:
            # Load referee settings
            settings = referee_settings or {}
            self.behavior_mode = RefereeBehavior(settings.get("behavior_mode", "balanced"))
            self.cheat_detection_sensitivity = settings.get("sensitivity", 0.7)
            self.family_friendly_mode = settings.get("family_friendly", True)
            
            # Load player analytics
            await self._load_player_analytics(family_group_id)
            
            # Store referee configuration
            referee_config = {
                "session_id": session_id,
                "behavior_mode": self.behavior_mode.value,
                "sensitivity": self.cheat_detection_sensitivity,
                "family_friendly": self.family_friendly_mode,
                "initialized_at": datetime.now().isoformat()
            }
            
            await redis_manager.set(
                f"referee_config:{session_id}",
                referee_config,
                ttl=86400,
                namespace="games"
            )
            
            logger.info(f"AI Referee initialized for game: {session_id}")
            
            return {
                "success": True,
                "referee_active": True,
                "behavior_mode": self.behavior_mode.value,
                "message": "AI Referee is now monitoring the game"
            }
            
        except Exception as e:
            logger.error(f"Error initializing AI referee: {e}")
            return {"success": False, "error": str(e)}
    
    async def assign_balanced_roles(
        self,
        session_id: str,
        players: Dict[str, Any]
    ) -> Dict[str, Any]:
        """AI-powered balanced role assignment"""
        
        try:
            # Analyze player skill levels and preferences
            player_analysis = await self._analyze_players_for_assignment(players)
            
            # Calculate optimal role distribution
            role_distribution = await self._calculate_optimal_roles(len(players), player_analysis)
            
            # Assign roles with balancing algorithm
            role_assignments = await self._assign_roles_intelligently(players, role_distribution, player_analysis)
            
            # Predict game balance
            game_balance = await self._predict_game_balance(role_assignments, player_analysis)
            
            # Save assignment for monitoring
            await self._save_role_assignment_data(session_id, role_assignments, game_balance)
            
            logger.info(f"AI Referee assigned balanced roles for game: {session_id}")
            
            return {
                "success": True,
                "role_assignments": role_assignments,
                "game_balance": asdict(game_balance),
                "message": "Roles assigned for optimal balance"
            }
            
        except Exception as e:
            logger.error(f"Error in AI role assignment: {e}")
            return {"success": False, "error": str(e)}
    
    async def monitor_game_action(
        self,
        session_id: str,
        player_id: str,
        action_type: str,
        action_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Monitor and validate game actions for cheating"""
        
        try:
            # Load game state
            game_state = await self._load_game_state(session_id)
            if not game_state:
                return {"success": False, "error": "Game not found"}
            
            # Advanced behavioral cheat detection
            action_history = await self._get_player_action_history(session_id, player_id)
            game_data = await self._prepare_game_data_for_analysis(session_id, game_state)
            
            # Run comprehensive cheat detection
            cheat_detection_result = await self.cheat_detector.analyze_player_behavior(
                player_id=player_id,
                session_id=session_id,
                game_data=game_data,
                action_history=action_history
            )
            
            # Legacy analysis for immediate action validation
            cheat_analysis = await self._analyze_action_for_cheating(
                session_id, player_id, action_type, action_data, game_state
            )
            
            # Combine results
            combined_analysis = self._combine_cheat_analyses(cheat_analysis, cheat_detection_result)
            
            # Update player behavior patterns
            await self._update_player_patterns(player_id, action_type, action_data)
            
            # Take action if cheating detected
            if combined_analysis["suspicious"] or cheat_detection_result.overall_cheat_probability > self.cheat_detection_sensitivity:
                response = await self._handle_advanced_cheat_detection(
                    session_id, player_id, combined_analysis, cheat_detection_result
                )
                return response
            
            # Validate action legality
            validation = await self._validate_action_legality(
                player_id, action_type, action_data, game_state
            )
            
            if not validation["legal"]:
                return {
                    "success": False,
                    "blocked": True,
                    "reason": validation["reason"],
                    "message": "Action blocked by AI Referee"
                }
            
            return {
                "success": True,
                "action_allowed": True,
                "cheat_score": cheat_analysis["confidence"]
            }
            
        except Exception as e:
            logger.error(f"Error monitoring game action: {e}")
            return {"success": False, "error": str(e)}
    
    async def _analyze_players_for_assignment(self, players: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze players for intelligent role assignment"""
        
        analysis = {}
        
        for player_id, player_data in players.items():
            # Get player analytics if available
            if player_id in self.player_analytics:
                analytics = self.player_analytics[player_id]
                
                analysis[player_id] = {
                    "skill_level": self._calculate_skill_level(analytics),
                    "preferred_roles": self._get_preferred_roles(analytics),
                    "personality": analytics.personality_type.value,
                    "trust_score": analytics.trust_score,
                    "experience": analytics.games_played
                }
            else:
                # New player - assign defaults
                analysis[player_id] = {
                    "skill_level": 0.5,  # Average
                    "preferred_roles": [],
                    "personality": PlayerPersonality.CASUAL.value,
                    "trust_score": 1.0,
                    "experience": 0
                }
        
        return analysis
    
    def _calculate_skill_level(self, analytics: PlayerAnalytics) -> float:
        """Calculate player skill level from analytics"""
        
        if analytics.games_played == 0:
            return 0.5
        
        # Weighted skill calculation
        win_rate_score = analytics.win_rate
        experience_score = min(1.0, analytics.games_played / 20)  # Cap at 20 games
        
        # Role performance average
        role_performance_score = 0.5
        if analytics.role_performance:
            role_performance_score = statistics.mean(analytics.role_performance.values())
        
        # Combine scores
        skill_level = (
            win_rate_score * 0.4 +
            experience_score * 0.3 +
            role_performance_score * 0.3
        )
        
        return max(0.1, min(1.0, skill_level))
    
    def _get_preferred_roles(self, analytics: PlayerAnalytics) -> List[str]:
        """Get player's preferred roles based on performance"""
        
        if not analytics.role_performance:
            return []
        
        # Sort roles by performance
        sorted_roles = sorted(
            analytics.role_performance.items(),
            key=lambda x: x[1],
            reverse=True
        )
        
        # Return top 3 roles
        return [role for role, score in sorted_roles[:3] if score > 0.6]
    
    async def _calculate_optimal_roles(
        self,
        player_count: int,
        player_analysis: Dict[str, Any]
    ) -> Dict[MafiaRole, int]:
        """Calculate optimal role distribution for balanced gameplay"""
        
        # Base distribution (same as mafia engine)
        if player_count <= 5:
            base_distribution = {
                MafiaRole.GODFATHER: 1,
                MafiaRole.DETECTIVE: 1,
                MafiaRole.DOCTOR: 1,
                MafiaRole.CIVILIAN: player_count - 3
            }
        elif player_count <= 8:
            base_distribution = {
                MafiaRole.GODFATHER: 1,
                MafiaRole.ASSASSIN: 1,
                MafiaRole.DETECTIVE: 1,
                MafiaRole.DOCTOR: 1,
                MafiaRole.BODYGUARD: 1,
                MafiaRole.CIVILIAN: player_count - 5
            }
        else:
            base_distribution = {
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
        
        # Adjust based on player skill variance
        skill_levels = [p["skill_level"] for p in player_analysis.values()]
        skill_variance = statistics.variance(skill_levels) if len(skill_levels) > 1 else 0
        
        # If high skill variance, add more complex roles
        if skill_variance > 0.15 and player_count >= 6:
            # Replace some civilians with special roles
            if base_distribution.get(MafiaRole.CIVILIAN, 0) > 0:
                base_distribution[MafiaRole.CIVILIAN] -= 1
                base_distribution[MafiaRole.MAYOR] = 1
        
        return base_distribution
    
    async def _assign_roles_intelligently(
        self,
        players: Dict[str, Any],
        role_distribution: Dict[MafiaRole, int],
        player_analysis: Dict[str, Any]
    ) -> Dict[str, str]:
        """Intelligently assign roles based on player analysis"""
        
        # Create role pool
        role_pool = []
        for role, count in role_distribution.items():
            role_pool.extend([role] * count)
        
        # Categorize roles by complexity
        complex_roles = [MafiaRole.GODFATHER, MafiaRole.DETECTIVE, MafiaRole.CONSIGLIERE, MafiaRole.MAYOR]
        medium_roles = [MafiaRole.ASSASSIN, MafiaRole.DOCTOR, MafiaRole.BODYGUARD, MafiaRole.VIGILANTE]
        simple_roles = [MafiaRole.CIVILIAN, MafiaRole.MAFIOSO]
        neutral_roles = [MafiaRole.JESTER, MafiaRole.SURVIVOR, MafiaRole.EXECUTIONER]
        
        # Sort players by skill level
        sorted_players = sorted(
            players.items(),
            key=lambda x: player_analysis[x[0]]["skill_level"],
            reverse=True
        )
        
        assignments = {}
        available_roles = role_pool.copy()
        
        # First pass: Assign complex roles to skilled players
        for player_id, player_data in sorted_players:
            analysis = player_analysis[player_id]
            
            # Check preferred roles first
            preferred = [r for r in analysis["preferred_roles"] if r in available_roles]
            if preferred and analysis["skill_level"] > 0.6:
                role = MafiaRole(preferred[0])
                assignments[player_id] = role.value
                available_roles.remove(role)
                continue
            
            # Assign based on skill level
            if analysis["skill_level"] > 0.7 and any(r in available_roles for r in complex_roles):
                # High skill - complex role
                suitable_roles = [r for r in complex_roles if r in available_roles]
                if suitable_roles:
                    role = random.choice(suitable_roles)
                    assignments[player_id] = role.value
                    available_roles.remove(role)
                    continue
            
            elif analysis["skill_level"] > 0.4 and any(r in available_roles for r in medium_roles):
                # Medium skill - medium role
                suitable_roles = [r for r in medium_roles if r in available_roles]
                if suitable_roles:
                    role = random.choice(suitable_roles)
                    assignments[player_id] = role.value
                    available_roles.remove(role)
                    continue
        
        # Second pass: Assign remaining roles randomly
        remaining_players = [pid for pid in players.keys() if pid not in assignments]
        random.shuffle(remaining_players)
        
        for player_id in remaining_players:
            if available_roles:
                role = random.choice(available_roles)
                assignments[player_id] = role.value
                available_roles.remove(role)
        
        return assignments
    
    async def _predict_game_balance(
        self,
        role_assignments: Dict[str, str],
        player_analysis: Dict[str, Any]
    ) -> GameBalance:
        """Predict game balance and suggest adjustments"""
        
        # Calculate team balance
        mafia_players = []
        town_players = []
        neutral_players = []
        
        for player_id, role_str in role_assignments.items():
            role = MafiaRole(role_str)
            team = self._get_role_team(role)
            
            if team == "mafia":
                mafia_players.append(player_id)
            elif team == "town":
                town_players.append(player_id)
            else:
                neutral_players.append(player_id)
        
        # Calculate team skill levels
        mafia_skill = statistics.mean([player_analysis[p]["skill_level"] for p in mafia_players]) if mafia_players else 0
        town_skill = statistics.mean([player_analysis[p]["skill_level"] for p in town_players]) if town_players else 0
        
        # Balance score (1.0 = perfectly balanced)
        skill_difference = abs(mafia_skill - town_skill)
        role_balance_score = 1.0 - skill_difference
        
        # Player skill variance
        all_skills = [player_analysis[p]["skill_level"] for p in player_analysis.keys()]
        skill_variance = statistics.variance(all_skills) if len(all_skills) > 1 else 0
        
        # Predict game length (in rounds)
        base_length = len(role_assignments) // 2
        skill_modifier = 1.0 + (skill_variance * 2)
        predicted_length = int(base_length * skill_modifier)
        
        # Generate recommendations
        recommendations = []
        if skill_difference > 0.2:
            recommendations.append("Consider swapping roles between teams for better balance")
        if skill_variance > 0.3:
            recommendations.append("High skill variance detected - expect longer game")
        if len(mafia_players) / len(role_assignments) > 0.35:
            recommendations.append("Mafia team may be too large for balanced play")
        
        return GameBalance(
            role_balance_score=role_balance_score,
            player_skill_variance=skill_variance,
            predicted_game_length=predicted_length,
            recommended_adjustments=recommendations,
            difficulty_level=statistics.mean(all_skills)
        )
    
    def _get_role_team(self, role: MafiaRole) -> str:
        """Get team affiliation for role"""
        
        role_teams = {
            MafiaRole.GODFATHER: "mafia",
            MafiaRole.ASSASSIN: "mafia",
            MafiaRole.CONSIGLIERE: "mafia",
            MafiaRole.MAFIOSO: "mafia",
            MafiaRole.DETECTIVE: "town",
            MafiaRole.DOCTOR: "town",
            MafiaRole.BODYGUARD: "town",
            MafiaRole.VIGILANTE: "town",
            MafiaRole.MAYOR: "town",
            MafiaRole.CIVILIAN: "town",
            MafiaRole.JESTER: "neutral",
            MafiaRole.SURVIVOR: "neutral",
            MafiaRole.EXECUTIONER: "neutral"
        }
        
        return role_teams.get(role, "neutral")
    
    async def _analyze_action_for_cheating(
        self,
        session_id: str,
        player_id: str,
        action_type: str,
        action_data: Dict[str, Any],
        game_state: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Analyze game action for potential cheating"""
        
        suspicion_score = 0.0
        evidence = {}
        detected_cheats = []
        
        # Load player's action history
        action_history = await self._get_player_action_history(session_id, player_id)
        
        # 1. Timing analysis
        timing_analysis = await self._analyze_action_timing(player_id, action_type, action_history)
        if timing_analysis["suspicious"]:
            suspicion_score += 0.3
            evidence["timing"] = timing_analysis
            detected_cheats.append(CheatType.TIMING_MANIPULATION)
        
        # 2. Pattern analysis
        pattern_analysis = await self._analyze_behavior_patterns(player_id, action_type, action_history)
        if pattern_analysis["suspicious"]:
            suspicion_score += 0.25
            evidence["patterns"] = pattern_analysis
            detected_cheats.append(CheatType.PATTERN_GAMING)
        
        # 3. Communication analysis
        if action_type == "chat":
            comm_analysis = await self._analyze_communication(session_id, player_id, action_data)
            if comm_analysis["suspicious"]:
                suspicion_score += 0.4
                evidence["communication"] = comm_analysis
                detected_cheats.append(CheatType.COMMUNICATION_OUTSIDE_GAME)
        
        # 4. Voting analysis
        if action_type == "vote":
            vote_analysis = await self._analyze_voting_behavior(session_id, player_id, action_data, action_history)
            if vote_analysis["suspicious"]:
                suspicion_score += 0.35
                evidence["voting"] = vote_analysis
                detected_cheats.append(CheatType.VOTING_MANIPULATION)
        
        # 5. Role claiming analysis
        if action_type == "chat" and self._contains_role_claim(action_data.get("message", "")):
            claim_analysis = await self._analyze_role_claim(session_id, player_id, action_data)
            if claim_analysis["suspicious"]:
                suspicion_score += 0.3
                evidence["role_claim"] = claim_analysis
                detected_cheats.append(CheatType.ROLE_CLAIMING_ABUSE)
        
        return {
            "suspicious": suspicion_score > self.cheat_detection_sensitivity,
            "confidence": min(1.0, suspicion_score),
            "evidence": evidence,
            "detected_cheats": detected_cheats
        }
    
    async def _analyze_action_timing(
        self,
        player_id: str,
        action_type: str,
        action_history: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Analyze action timing for suspicious patterns"""
        
        # Get recent actions of same type
        recent_actions = [
            a for a in action_history[-10:]  # Last 10 actions
            if a.get("action_type") == action_type
        ]
        
        if len(recent_actions) < 3:
            return {"suspicious": False, "reason": "Insufficient data"}
        
        # Calculate response times
        response_times = []
        for action in recent_actions:
            if "response_time" in action:
                response_times.append(action["response_time"])
        
        if not response_times:
            return {"suspicious": False, "reason": "No timing data"}
        
        # Statistical analysis
        mean_time = statistics.mean(response_times)
        std_dev = statistics.stdev(response_times) if len(response_times) > 1 else 0
        
        # Check for suspiciously consistent timing (bot-like behavior)
        if std_dev < 0.5 and len(response_times) > 5:
            return {
                "suspicious": True,
                "reason": "Suspiciously consistent response times",
                "mean_time": mean_time,
                "std_dev": std_dev
            }
        
        # Check for impossibly fast responses
        if mean_time < 0.5:  # Less than 500ms average
            return {
                "suspicious": True,
                "reason": "Impossibly fast response times",
                "mean_time": mean_time
            }
        
        return {"suspicious": False, "timing_normal": True}
    
    async def _analyze_behavior_patterns(
        self,
        player_id: str,
        action_type: str,
        action_history: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Analyze behavior patterns for gaming detection"""
        
        # Look for repetitive patterns
        if len(action_history) < 10:
            return {"suspicious": False, "reason": "Insufficient history"}
        
        # Check for repeated action sequences
        recent_actions = [a.get("action_type") for a in action_history[-10:]]
        
        # Count action type frequencies
        action_counts = Counter(recent_actions)
        
        # Check for excessive repetition of specific actions
        max_count = max(action_counts.values()) if action_counts else 0
        total_actions = len(recent_actions)
        
        if max_count / total_actions > 0.8:  # 80% of actions are the same type
            return {
                "suspicious": True,
                "reason": "Excessive repetition of action type",
                "dominant_action": max(action_counts, key=action_counts.get),
                "repetition_rate": max_count / total_actions
            }
        
        return {"suspicious": False, "patterns_normal": True}
    
    async def _analyze_communication(
        self,
        session_id: str,
        player_id: str,
        action_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Analyze communication for external coordination"""
        
        message = action_data.get("message", "").lower()
        
        # Suspicious phrases that might indicate external communication
        suspicious_phrases = [
            "told me", "said to", "outside", "discord", "whatsapp", "call me",
            "text me", "pm me", "private message", "dms", "chat outside"
        ]
        
        # Check for suspicious phrases
        for phrase in suspicious_phrases:
            if phrase in message:
                return {
                    "suspicious": True,
                    "reason": f"Potential external communication reference: '{phrase}'",
                    "message_fragment": phrase
                }
        
        # Check for unusual information sharing
        info_sharing_phrases = [
            "i know", "trust me", "100% sure", "definitely", "for certain",
            "i can confirm", "told you so", "called it"
        ]
        
        confidence_count = sum(1 for phrase in info_sharing_phrases if phrase in message)
        if confidence_count >= 2:
            return {
                "suspicious": True,
                "reason": "Unusually confident information sharing",
                "confidence_indicators": confidence_count
            }
        
        return {"suspicious": False, "communication_normal": True}
    
    async def _analyze_voting_behavior(
        self,
        session_id: str,
        player_id: str,
        action_data: Dict[str, Any],
        action_history: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Analyze voting behavior for manipulation"""
        
        # Get recent voting history
        recent_votes = [
            a for a in action_history[-20:]  # Last 20 actions
            if a.get("action_type") == "vote"
        ]
        
        if len(recent_votes) < 3:
            return {"suspicious": False, "reason": "Insufficient voting history"}
        
        # Analyze voting patterns
        vote_targets = [v.get("target_id") for v in recent_votes if v.get("target_id")]
        
        # Check for vote switching patterns
        vote_switches = 0
        for i in range(1, len(recent_votes)):
            if recent_votes[i].get("target_id") != recent_votes[i-1].get("target_id"):
                vote_switches += 1
        
        # Excessive vote switching might indicate manipulation
        if len(recent_votes) > 5 and vote_switches / len(recent_votes) > 0.6:
            return {
                "suspicious": True,
                "reason": "Excessive vote switching behavior",
                "switch_rate": vote_switches / len(recent_votes)
            }
        
        return {"suspicious": False, "voting_normal": True}
    
    def _contains_role_claim(self, message: str) -> bool:
        """Check if message contains role claim"""
        
        message_lower = message.lower()
        role_keywords = [
            "i am", "im", "my role", "role is", "detective", "doctor", "mafia",
            "godfather", "civilian", "bodyguard", "vigilante", "jester"
        ]
        
        return any(keyword in message_lower for keyword in role_keywords)
    
    async def _analyze_role_claim(
        self,
        session_id: str,
        player_id: str,
        action_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Analyze role claiming behavior"""
        
        # This would require more sophisticated NLP analysis
        # For now, implement basic detection
        
        message = action_data.get("message", "").lower()
        
        # Count role claims in message
        role_mentions = message.count("i am") + message.count("im") + message.count("my role")
        
        if role_mentions > 1:
            return {
                "suspicious": True,
                "reason": "Multiple role claims in single message",
                "claim_count": role_mentions
            }
        
        return {"suspicious": False, "role_claim_normal": True}
    
    async def _get_player_action_history(self, session_id: str, player_id: str) -> List[Dict[str, Any]]:
        """Get comprehensive action history for a player in the game"""
        try:
            # Get from Redis action log
            action_key = f"game_actions:{session_id}:{player_id}"
            actions = await redis_manager.get(action_key, namespace="games") or []
            
            # Also get from database for persistence
            with self.db.get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT action_type, action_data, timestamp, response_time, metadata
                    FROM game_actions 
                    WHERE session_id = ? AND player_id = ?
                    ORDER BY timestamp ASC
                """, (session_id, player_id))
                
                db_actions = []
                for row in cursor.fetchall():
                    db_actions.append({
                        'action_type': row[0],
                        'action_data': json.loads(row[1]) if row[1] else {},
                        'timestamp': row[2],
                        'response_time': row[3],
                        'metadata': json.loads(row[4]) if row[4] else {},
                        'player_id': player_id,
                        'session_id': session_id
                    })
                
                # Combine and deduplicate
                all_actions = actions + db_actions
                
                # Sort by timestamp and remove duplicates
                unique_actions = {}
                for action in all_actions:
                    key = f"{action.get('timestamp')}_{action.get('action_type')}"
                    if key not in unique_actions:
                        unique_actions[key] = action
                
                sorted_actions = sorted(unique_actions.values(), 
                                      key=lambda x: x.get('timestamp', ''))
                
                return sorted_actions
                
        except Exception as e:
            logger.error(f"Failed to get player action history: {e}")
            return []
    
    async def _prepare_game_data_for_analysis(self, session_id: str, game_state: MafiaGameState) -> Dict[str, Any]:
        """Prepare game data in format expected by cheat detector"""
        return {
            'session_id': session_id,
            'created_at': game_state.created_at.isoformat(),
            'current_phase': game_state.phase.value,
            'day_number': game_state.day_number,
            'players': {
                player_id: {
                    'id': player.id,
                    'name': player.name,
                    'role': player.role.value,
                    'is_alive': player.is_alive,
                    'family_member_id': player.family_member_id
                }
                for player_id, player in game_state.players.items()
            },
            'game_settings': game_state.game_settings,
            'language': game_state.language
        }
    
    def _combine_cheat_analyses(
        self,
        legacy_analysis: Dict[str, Any],
        advanced_result: CheatDetectionResult
    ) -> Dict[str, Any]:
        """Combine legacy and advanced cheat detection results"""
        
        # Use higher of the two confidence scores
        legacy_confidence = legacy_analysis.get("confidence", 0.0)
        advanced_confidence = advanced_result.overall_cheat_probability
        
        combined_confidence = max(legacy_confidence, advanced_confidence)
        
        # Combine detected issues
        legacy_suspicious = legacy_analysis.get("suspicious", False)
        advanced_suspicious = len(advanced_result.indicators) > 0
        
        combined_suspicious = legacy_suspicious or advanced_suspicious
        
        # Combine evidence
        combined_evidence = {
            **legacy_analysis.get("evidence", {}),
            'advanced_indicators': [indicator.value for indicator in advanced_result.indicators],
            'advanced_confidence_scores': {
                indicator.value: score 
                for indicator, score in advanced_result.confidence_scores.items()
            },
            'advanced_evidence': advanced_result.evidence
        }
        
        return {
            'suspicious': combined_suspicious,
            'confidence': combined_confidence,
            'evidence': combined_evidence,
            'detection_method': 'combined_analysis',
            'legacy_detected': legacy_suspicious,
            'advanced_detected': advanced_suspicious,
            'recommended_action': advanced_result.recommended_action,
            'severity_level': advanced_result.severity_level
        }
    
    async def _handle_advanced_cheat_detection(
        self,
        session_id: str,
        player_id: str,
        combined_analysis: Dict[str, Any],
        cheat_result: CheatDetectionResult
    ) -> Dict[str, Any]:
        """Handle advanced cheat detection results with family-friendly approach"""
        
        try:
            # Create comprehensive cheat detection record
            detection_record = {
                'player_id': player_id,
                'session_id': session_id,
                'detection_timestamp': datetime.now().isoformat(),
                'indicators': [indicator.value for indicator in cheat_result.indicators],
                'confidence': cheat_result.overall_cheat_probability,
                'evidence': cheat_result.evidence,
                'recommended_action': cheat_result.recommended_action,
                'severity_level': cheat_result.severity_level,
                'false_positive_probability': cheat_result.false_positive_probability
            }
            
            # Store detection record
            await self._store_advanced_detection_record(detection_record)
            
            # Determine family-friendly response based on severity
            response = await self._create_family_friendly_response(
                session_id, player_id, combined_analysis, cheat_result
            )
            
            # Log for monitoring
            logger.info(f"Advanced cheat detection for player {player_id}: "
                       f"probability={cheat_result.overall_cheat_probability:.2f}, "
                       f"action={cheat_result.recommended_action}")
            
            return response
            
        except Exception as e:
            logger.error(f"Failed to handle advanced cheat detection: {e}")
            return {
                "success": False,
                "error": "Failed to process cheat detection",
                "cheat_score": 0.0
            }
    
    async def _create_family_friendly_response(
        self,
        session_id: str,
        player_id: str,
        combined_analysis: Dict[str, Any],
        cheat_result: CheatDetectionResult
    ) -> Dict[str, Any]:
        """Create appropriate family-friendly response to cheat detection"""
        
        severity = cheat_result.severity_level
        confidence = cheat_result.overall_cheat_probability
        action = cheat_result.recommended_action
        
        # Family-friendly messages based on severity
        if severity <= 1:  # Low severity - gentle reminder
            message = "Hey! Just a friendly reminder to play fair and have fun with everyone! 😊"
            action_type = "gentle_reminder"
            
        elif severity <= 2:  # Medium severity - helpful suggestion
            message = "I noticed some unusual gameplay patterns. Remember, the most fun games are when everyone plays their best! 🎮"
            action_type = "gameplay_suggestion"
            
        elif severity <= 3:  # Higher severity - direct but kind
            message = "I'm seeing some patterns that might give you an unfair advantage. Let's keep things fun and fair for everyone! 🤝"
            action_type = "fairness_reminder"
            
        elif severity <= 4:  # High severity - clear warning
            message = "I need to pause and remind everyone about fair play. Let's reset and make sure everyone can enjoy the game equally! ⏸️"
            action_type = "fair_play_warning"
            
        else:  # Maximum severity - game intervention
            message = "I'm implementing a brief timeout to ensure everyone has the best gaming experience. Thanks for understanding! ⭐"
            action_type = "timeout_intervention"
        
        # Apply appropriate intervention
        intervention_result = await self._apply_family_friendly_intervention(
            session_id, player_id, action_type, severity
        )
        
        return {
            "success": True,
            "cheat_detected": True,
            "cheat_score": confidence,
            "severity_level": severity,
            "action_taken": action_type,
            "message": message,
            "intervention_result": intervention_result,
            "family_friendly": True,
            "educational_moment": True
        }
    
    async def _apply_family_friendly_intervention(
        self,
        session_id: str,
        player_id: str,
        action_type: str,
        severity: int
    ) -> Dict[str, Any]:
        """Apply family-friendly interventions based on detection"""
        
        interventions = []
        
        if action_type == "gentle_reminder":
            # Just log and send private message
            interventions.append({
                'type': 'private_message',
                'message': 'Remember to play fair and have fun! 🎯'
            })
            
        elif action_type == "gameplay_suggestion":
            # Provide helpful tips
            interventions.append({
                'type': 'gameplay_tip',
                'message': 'Try mixing up your strategy to keep the game exciting for everyone! 💡'
            })
            
        elif action_type == "fairness_reminder":
            # Brief explanation of fair play
            interventions.append({
                'type': 'educational_message',
                'message': 'Fair play makes games more fun for everyone. Let me help you play your best! 📚'
            })
            
        elif action_type == "fair_play_warning":
            # Temporary action slowdown
            interventions.append({
                'type': 'action_cooldown',
                'duration': 30,  # 30 seconds
                'message': 'Taking a quick 30-second break to ensure fair play! ⏰'
            })
            
        elif action_type == "timeout_intervention":
            # Brief timeout with explanation
            interventions.append({
                'type': 'temporary_timeout',
                'duration': 120,  # 2 minutes
                'message': 'Brief timeout to ensure the best experience for all players! 🕐'
            })
        
        # Store intervention record
        await self._store_intervention_record(session_id, player_id, interventions)
        
        return {
            'interventions_applied': len(interventions),
            'intervention_types': [i['type'] for i in interventions],
            'educational': True,
            'punitive': False
        }
    
    async def _store_advanced_detection_record(self, detection_record: Dict[str, Any]):
        """Store advanced cheat detection record for analysis"""
        try:
            # Store in Redis for immediate access
            key = f"cheat_detection:{detection_record['session_id']}:{detection_record['player_id']}:{int(datetime.now().timestamp())}"
            await redis_manager.set(key, detection_record, ttl=86400, namespace="games")
            
            # Store in database for long-term analysis
            with self.db.get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO advanced_cheat_detections (
                        player_id, session_id, detection_timestamp, indicators,
                        confidence, evidence, recommended_action, severity_level,
                        false_positive_probability, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    detection_record['player_id'],
                    detection_record['session_id'],
                    detection_record['detection_timestamp'],
                    json.dumps(detection_record['indicators']),
                    detection_record['confidence'],
                    json.dumps(detection_record['evidence']),
                    detection_record['recommended_action'],
                    detection_record['severity_level'],
                    detection_record['false_positive_probability'],
                    datetime.now().isoformat()
                ))
                conn.commit()
                
        except Exception as e:
            logger.error(f"Failed to store advanced detection record: {e}")
    
    async def _store_intervention_record(self, session_id: str, player_id: str, interventions: List[Dict[str, Any]]):
        """Store intervention record for tracking"""
        try:
            record = {
                'session_id': session_id,
                'player_id': player_id,
                'interventions': interventions,
                'timestamp': datetime.now().isoformat()
            }
            
            key = f"interventions:{session_id}:{player_id}:{int(datetime.now().timestamp())}"
            await redis_manager.set(key, record, ttl=86400, namespace="games")
            
        except Exception as e:
            logger.error(f"Failed to store intervention record: {e}")
    
    async def _handle_suspicious_behavior(
        self,
        session_id: str,
        player_id: str,
        cheat_analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Handle detected suspicious behavior"""
        
        confidence = cheat_analysis["confidence"]
        detected_cheats = cheat_analysis.get("detected_cheats", [])
        
        # Create cheat detection record
        detection = CheatDetection(
            player_id=player_id,
            cheat_type=detected_cheats[0] if detected_cheats else CheatType.PATTERN_GAMING,
            confidence=confidence,
            evidence=cheat_analysis["evidence"],
            timestamp=datetime.now(),
            action_taken="warning"
        )
        
        # Determine response based on behavior mode and confidence
        if self.behavior_mode == RefereeBehavior.STRICT and confidence > 0.8:
            # Strict mode - immediate action
            await self._issue_penalty(session_id, player_id, detection)
            return {
                "success": False,
                "blocked": True,
                "reason": "Action blocked due to suspicious behavior",
                "penalty_issued": True
            }
        
        elif confidence > 0.9:
            # Very high confidence - issue warning regardless of mode
            await self._issue_warning(session_id, player_id, detection)
            return {
                "success": True,
                "action_allowed": True,
                "warning_issued": True,
                "message": "Warning issued for suspicious behavior"
            }
        
        else:
            # Low confidence - just log
            await self._log_suspicious_behavior(session_id, player_id, detection)
            return {
                "success": True,
                "action_allowed": True,
                "logged": True
            }
    
    async def _issue_warning(self, session_id: str, player_id: str, detection: CheatDetection):
        """Issue warning to player"""
        
        # Get game language
        game_state = await self._load_game_state(session_id)
        language = game_state.get("language", "en") if game_state else "en"
        
        warning_message = self.messages[language]["cheat_warning"]
        
        # Send private warning message
        await self._send_private_referee_message(session_id, player_id, {
            "type": "warning",
            "message": warning_message,
            "cheat_type": detection.cheat_type.value,
            "confidence": detection.confidence
        })
        
        # Update player analytics
        if player_id in self.player_analytics:
            self.player_analytics[player_id].suspected_cheats.append(detection)
            self.player_analytics[player_id].trust_score *= 0.9  # Reduce trust
        
        logger.warning(f"Warning issued to player {player_id} for {detection.cheat_type.value}")
    
    async def _issue_penalty(self, session_id: str, player_id: str, detection: CheatDetection):
        """Issue penalty to player"""
        
        # For family-friendly mode, penalties are gentler
        if self.family_friendly_mode:
            await self._issue_warning(session_id, player_id, detection)
            return
        
        # Implement penalty (could be action blocking, role restriction, etc.)
        penalty_data = {
            "type": "penalty",
            "player_id": player_id,
            "cheat_type": detection.cheat_type.value,
            "penalty": "action_restriction",
            "duration": 60  # 1 minute restriction
        }
        
        # Store penalty
        await redis_manager.set(
            f"penalty:{session_id}:{player_id}",
            penalty_data,
            ttl=60,
            namespace="games"
        )
        
        logger.warning(f"Penalty issued to player {player_id} for {detection.cheat_type.value}")
    
    async def _validate_action_legality(
        self,
        player_id: str,
        action_type: str,
        action_data: Dict[str, Any],
        game_state: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Validate if action is legal according to game rules"""
        
        # Check if player has pending penalty
        penalty = await redis_manager.get(f"penalty:{game_state['session_id']}:{player_id}", "games")
        if penalty:
            return {
                "legal": False,
                "reason": "Player has active penalty restriction"
            }
        
        # Validate action based on game phase and player role
        current_phase = game_state.get("phase")
        player_role = None
        
        # Get player role from game state
        players = game_state.get("players", {})
        if player_id in players:
            player_role = players[player_id].get("role")
        
        # Phase-based validation
        if current_phase == "night":
            # Only night action roles can act at night
            if action_type not in ["kill", "investigate", "heal", "protect", "vest"]:
                return {
                    "legal": False,
                    "reason": "Invalid action for night phase"
                }
        
        elif current_phase == "day":
            # Only chat allowed during day
            if action_type != "chat":
                return {
                    "legal": False,
                    "reason": "Only chat allowed during day phase"
                }
        
        elif current_phase == "voting":
            # Only voting actions allowed
            if action_type not in ["vote", "abstain"]:
                return {
                    "legal": False,
                    "reason": "Only voting allowed during voting phase"
                }
        
        return {"legal": True, "reason": "Action is legal"}
    
    async def _load_game_state(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Load game state from Redis"""
        
        return await redis_manager.get(f"mafia_game:{session_id}", "games")
    
    async def _get_player_action_history(self, session_id: str, player_id: str) -> List[Dict[str, Any]]:
        """Get player's action history for analysis"""
        
        history_key = f"action_history:{session_id}:{player_id}"
        history = await redis_manager.lrange(history_key, 0, -1, "games")
        
        # Convert back to dicts
        return [json.loads(action) if isinstance(action, str) else action for action in history]
    
    async def _update_player_patterns(
        self,
        player_id: str,
        action_type: str,
        action_data: Dict[str, Any]
    ):
        """Update player behavior patterns"""
        
        # This would update the player analytics with new behavior data
        # Implementation would depend on the specific analytics structure
        pass
    
    async def _send_private_referee_message(
        self,
        session_id: str,
        player_id: str,
        message_data: Dict[str, Any]
    ):
        """Send private message from AI referee to player"""
        
        referee_message = {
            "from": "ai_referee",
            "type": "private_message",
            "timestamp": datetime.now().isoformat(),
            "data": message_data
        }
        
        # Send via Redis to player's private channel
        await redis_manager.publish(f"referee_message:{session_id}:{player_id}", referee_message)
    
    async def _load_player_analytics(self, family_group_id: str):
        """Load player analytics for family group"""
        
        # This would load from database
        # For now, create empty analytics
        self.player_analytics = {}
    
    async def _save_role_assignment_data(
        self,
        session_id: str,
        role_assignments: Dict[str, str],
        game_balance: GameBalance
    ):
        """Save role assignment data for monitoring"""
        
        assignment_data = {
            "session_id": session_id,
            "assignments": role_assignments,
            "balance": asdict(game_balance),
            "assigned_at": datetime.now().isoformat()
        }
        
        await redis_manager.set(
            f"role_assignment:{session_id}",
            assignment_data,
            ttl=86400,
            namespace="games"
        )
    
    async def _log_suspicious_behavior(
        self,
        session_id: str,
        player_id: str,
        detection: CheatDetection
    ):
        """Log suspicious behavior for analysis"""
        
        log_entry = {
            "session_id": session_id,
            "detection": asdict(detection),
            "logged_at": datetime.now().isoformat()
        }
        
        # Store in Redis list for analysis
        await redis_manager.lpush(
            f"suspicious_behavior_log:{session_id}",
            log_entry,
            namespace="games"
        )

# Global AI referee instance
ai_referee = AIGameReferee()

def get_ai_referee() -> AIGameReferee:
    """Get the global AI referee instance"""
    return ai_referee