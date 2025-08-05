#!/usr/bin/env python3
"""
Advanced Cheat Detection Algorithms for Family Gaming
Behavioral analysis, pattern recognition, and statistical anomaly detection
"""

import os
import json
import math
import logging
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple, Set, Union
from dataclasses import dataclass, asdict
from enum import Enum
import numpy as np
from collections import defaultdict, Counter, deque
import statistics
from scipy import stats
import pandas as pd
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import IsolationForest

from logging_config import get_logger
from performance_monitoring import performance_monitor

logger = get_logger("cheat_detection")

class CheatIndicator(Enum):
    """Specific indicators of cheating behavior"""
    # Timing-based indicators
    CONSISTENT_FAST_RESPONSES = "consistent_fast_responses"
    SUSPICIOUS_REACTION_TIMES = "suspicious_reaction_times"
    UNNATURAL_DELAY_PATTERNS = "unnatural_delay_patterns"
    
    # Voting pattern indicators
    VOTE_COORDINATION = "vote_coordination"
    BANDWAGON_FOLLOWING = "bandwagon_following"
    EARLY_VOTE_SWITCHING = "early_vote_switching"
    VOTE_TIMING_SYNCHRONIZATION = "vote_timing_sync"
    
    # Communication indicators
    KNOWLEDGE_LEAKAGE = "knowledge_leakage"
    COORDINATED_ACTIONS = "coordinated_actions"
    INFORMATION_ASYMMETRY = "information_asymmetry"
    
    # Behavioral indicators
    PLAY_STYLE_INCONSISTENCY = "play_style_inconsistency"
    STATISTICAL_ANOMALY = "statistical_anomaly"
    ROLE_PERFORMANCE_MISMATCH = "role_performance_mismatch"
    
    # Meta-gaming indicators
    PREVIOUS_GAME_INFLUENCE = "previous_game_influence"
    EXTERNAL_INFORMATION_USE = "external_information_use"

@dataclass
class BehaviorProfile:
    """Player's behavioral profile for analysis"""
    player_id: str
    session_id: str
    
    # Timing characteristics
    average_response_time: float
    response_time_variance: float
    response_time_distribution: List[float]
    
    # Voting patterns
    voting_consistency: float
    vote_timing_patterns: List[float]
    vote_change_frequency: float
    
    # Communication patterns  
    message_timing: List[float]
    message_length_stats: Dict[str, float]
    communication_frequency: float
    
    # Decision making
    decision_confidence: float
    role_adherence_score: float
    strategic_complexity: float
    
    # Historical performance
    win_rate_by_role: Dict[str, float]
    performance_consistency: float
    learning_rate: float
    
    created_at: datetime = None
    updated_at: datetime = None

@dataclass 
class CheatDetectionResult:
    """Result of cheat detection analysis"""
    player_id: str
    session_id: str
    indicators: List[CheatIndicator]
    confidence_scores: Dict[CheatIndicator, float]
    overall_cheat_probability: float
    evidence: Dict[str, Any]
    recommended_action: str
    severity_level: int  # 1-5 scale
    false_positive_probability: float

class AdvancedCheatDetector:
    """Advanced behavioral cheat detection system"""
    
    def __init__(self):
        # Configuration
        self.detection_window = timedelta(minutes=10)
        self.min_samples_for_analysis = 5
        self.anomaly_threshold = 2.0  # Standard deviations
        self.coordination_threshold = 0.8
        
        # Machine learning models
        self.isolation_forest = IsolationForest(contamination=0.1, random_state=42)
        self.is_model_trained = False
        
        # Behavioral baselines
        self.baseline_profiles: Dict[str, BehaviorProfile] = {}
        self.family_baselines: Dict[str, Dict[str, Any]] = {}
        
        # Detection algorithms
        self.detection_algorithms = {
            CheatIndicator.CONSISTENT_FAST_RESPONSES: self._detect_consistent_fast_responses,
            CheatIndicator.SUSPICIOUS_REACTION_TIMES: self._detect_suspicious_reaction_times,
            CheatIndicator.VOTE_COORDINATION: self._detect_vote_coordination,
            CheatIndicator.KNOWLEDGE_LEAKAGE: self._detect_knowledge_leakage,
            CheatIndicator.COORDINATED_ACTIONS: self._detect_coordinated_actions,
            CheatIndicator.PLAY_STYLE_INCONSISTENCY: self._detect_play_style_inconsistency,
            CheatIndicator.STATISTICAL_ANOMALY: self._detect_statistical_anomaly,
            CheatIndicator.VOTE_TIMING_SYNCHRONIZATION: self._detect_vote_timing_sync,
            CheatIndicator.BANDWAGON_FOLLOWING: self._detect_bandwagon_following,
            CheatIndicator.ROLE_PERFORMANCE_MISMATCH: self._detect_role_performance_mismatch
        }
        
        logger.info("Advanced Cheat Detector initialized")
    
    @performance_monitor.track_function_performance
    async def analyze_player_behavior(
        self,
        player_id: str,
        session_id: str,
        game_data: Dict[str, Any],
        action_history: List[Dict[str, Any]]
    ) -> CheatDetectionResult:
        """Comprehensive behavioral analysis for cheat detection"""
        
        try:
            # Build current behavior profile
            current_profile = await self._build_behavior_profile(
                player_id, session_id, game_data, action_history
            )
            
            # Run all detection algorithms
            detected_indicators = []
            confidence_scores = {}
            evidence = {}
            
            for indicator, algorithm in self.detection_algorithms.items():
                try:
                    result = await algorithm(current_profile, game_data, action_history)
                    if result['detected']:
                        detected_indicators.append(indicator)
                        confidence_scores[indicator] = result['confidence']
                        evidence[indicator.value] = result['evidence']
                except Exception as e:
                    logger.error(f"Detection algorithm failed for {indicator}: {e}")
                    continue
            
            # Calculate overall cheat probability
            overall_probability = self._calculate_overall_cheat_probability(
                detected_indicators, confidence_scores
            )
            
            # Determine recommended action
            recommended_action, severity = self._determine_action_and_severity(
                overall_probability, detected_indicators
            )
            
            # Calculate false positive probability
            false_positive_prob = self._estimate_false_positive_probability(
                current_profile, detected_indicators
            )
            
            return CheatDetectionResult(
                player_id=player_id,
                session_id=session_id,
                indicators=detected_indicators,
                confidence_scores=confidence_scores,
                overall_cheat_probability=overall_probability,
                evidence=evidence,
                recommended_action=recommended_action,
                severity_level=severity,
                false_positive_probability=false_positive_prob
            )
            
        except Exception as e:
            logger.error(f"Cheat detection analysis failed: {e}")
            return CheatDetectionResult(
                player_id=player_id,
                session_id=session_id,
                indicators=[],
                confidence_scores={},
                overall_cheat_probability=0.0,
                evidence={},
                recommended_action="no_action",
                severity_level=0,
                false_positive_probability=1.0
            )
    
    async def _build_behavior_profile(
        self,
        player_id: str,
        session_id: str,
        game_data: Dict[str, Any],
        action_history: List[Dict[str, Any]]
    ) -> BehaviorProfile:
        """Build comprehensive behavioral profile for player"""
        
        # Extract timing data
        response_times = [
            action.get('response_time', 0) for action in action_history
            if action.get('response_time') and action.get('response_time') > 0
        ]
        
        # Calculate timing statistics
        avg_response_time = statistics.mean(response_times) if response_times else 5.0
        response_variance = statistics.variance(response_times) if len(response_times) > 1 else 0.0
        
        # Extract voting patterns
        votes = [action for action in action_history if action.get('action_type') == 'vote']
        vote_timings = [vote.get('timestamp') for vote in votes if vote.get('timestamp')]
        
        # Convert timestamps to intervals
        vote_intervals = []
        if len(vote_timings) > 1:
            for i in range(1, len(vote_timings)):
                prev_time = datetime.fromisoformat(vote_timings[i-1]) if isinstance(vote_timings[i-1], str) else vote_timings[i-1]
                curr_time = datetime.fromisoformat(vote_timings[i]) if isinstance(vote_timings[i], str) else vote_timings[i]
                interval = (curr_time - prev_time).total_seconds()
                vote_intervals.append(interval)
        
        voting_consistency = self._calculate_voting_consistency(votes)
        vote_change_freq = len([v for v in votes if v.get('is_change', False)]) / max(len(votes), 1)
        
        # Extract communication patterns
        messages = [action for action in action_history if action.get('action_type') == 'chat']
        message_lengths = [len(msg.get('message', '')) for msg in messages]
        message_timings = [
            datetime.fromisoformat(msg.get('timestamp')) if isinstance(msg.get('timestamp'), str) 
            else msg.get('timestamp') for msg in messages if msg.get('timestamp')
        ]
        
        # Calculate message timing intervals
        message_intervals = []
        if len(message_timings) > 1:
            for i in range(1, len(message_timings)):
                interval = (message_timings[i] - message_timings[i-1]).total_seconds()
                message_intervals.append(interval)
        
        message_stats = {
            'avg_length': statistics.mean(message_lengths) if message_lengths else 0,
            'length_variance': statistics.variance(message_lengths) if len(message_lengths) > 1 else 0,
            'frequency': len(messages) / max((datetime.now() - datetime.fromisoformat(game_data.get('created_at', datetime.now().isoformat()))).total_seconds() / 3600, 0.1)
        }
        
        # Calculate decision confidence and role adherence
        decision_confidence = self._calculate_decision_confidence(action_history)
        role_adherence = self._calculate_role_adherence(player_id, game_data, action_history)
        strategic_complexity = self._calculate_strategic_complexity(action_history)
        
        return BehaviorProfile(
            player_id=player_id,
            session_id=session_id,
            average_response_time=avg_response_time,
            response_time_variance=response_variance,
            response_time_distribution=response_times,
            voting_consistency=voting_consistency,
            vote_timing_patterns=vote_intervals,
            vote_change_frequency=vote_change_freq,
            message_timing=message_intervals,
            message_length_stats=message_stats,
            communication_frequency=message_stats['frequency'],
            decision_confidence=decision_confidence,
            role_adherence_score=role_adherence,
            strategic_complexity=strategic_complexity,
            win_rate_by_role={},  # Would be populated from historical data
            performance_consistency=0.5,  # Default value
            learning_rate=0.1,  # Default value
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
    
    # Cheat Detection Algorithms
    
    async def _detect_consistent_fast_responses(
        self,
        profile: BehaviorProfile,
        game_data: Dict[str, Any],
        action_history: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Detect unnaturally consistent fast responses"""
        
        response_times = profile.response_time_distribution
        if len(response_times) < self.min_samples_for_analysis:
            return {'detected': False, 'confidence': 0.0, 'evidence': {}}
        
        # Check for responses that are consistently too fast
        fast_responses = [t for t in response_times if t < 2.0]  # Less than 2 seconds
        fast_response_ratio = len(fast_responses) / len(response_times)
        
        # Check variance - bot-like behavior has very low variance
        coefficient_of_variation = (profile.response_time_variance ** 0.5) / profile.average_response_time if profile.average_response_time > 0 else 0
        
        # Detect if responses are suspiciously consistent
        detected = (
            fast_response_ratio > 0.7 and  # More than 70% fast responses
            coefficient_of_variation < 0.3 and  # Very low variance
            profile.average_response_time < 3.0  # Average response very fast
        )
        
        confidence = min(1.0, fast_response_ratio * (1 - coefficient_of_variation))
        
        evidence = {
            'fast_response_ratio': fast_response_ratio,
            'coefficient_of_variation': coefficient_of_variation,
            'average_response_time': profile.average_response_time,
            'suspicious_consistency': coefficient_of_variation < 0.2
        }
        
        return {'detected': detected, 'confidence': confidence, 'evidence': evidence}
    
    async def _detect_suspicious_reaction_times(
        self,
        profile: BehaviorProfile,
        game_data: Dict[str, Any],
        action_history: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Detect reaction times that suggest advance knowledge"""
        
        # Look for suspiciously fast reactions to game events
        game_events = [action for action in action_history if action.get('action_type') in ['elimination', 'role_reveal', 'phase_change']]
        reactions = []
        
        for i, event in enumerate(game_events):
            event_time = datetime.fromisoformat(event.get('timestamp')) if isinstance(event.get('timestamp'), str) else event.get('timestamp')
            
            # Find player actions within 30 seconds after the event
            player_actions = [
                action for action in action_history[i+1:i+10]  # Look at next few actions
                if action.get('player_id') == profile.player_id and
                   datetime.fromisoformat(action.get('timestamp')) if isinstance(action.get('timestamp'), str) else action.get('timestamp') - event_time < timedelta(seconds=30)
            ]
            
            for action in player_actions:
                action_time = datetime.fromisoformat(action.get('timestamp')) if isinstance(action.get('timestamp'), str) else action.get('timestamp')
                reaction_time = (action_time - event_time).total_seconds()
                reactions.append({
                    'event_type': event.get('action_type'),
                    'reaction_time': reaction_time,
                    'action_type': action.get('action_type')
                })
        
        if not reactions:
            return {'detected': False, 'confidence': 0.0, 'evidence': {}}
        
        # Analyze for suspiciously fast strategic reactions
        strategic_reactions = [r for r in reactions if r['action_type'] in ['vote', 'accuse', 'defend']]
        avg_strategic_reaction = statistics.mean([r['reaction_time'] for r in strategic_reactions]) if strategic_reactions else 10.0
        
        # Detect if strategic reactions are too fast (suggesting advance knowledge)
        detected = avg_strategic_reaction < 3.0 and len(strategic_reactions) >= 3
        
        confidence = max(0.0, 1.0 - (avg_strategic_reaction / 10.0)) if detected else 0.0
        
        evidence = {
            'strategic_reactions': strategic_reactions,
            'average_strategic_reaction_time': avg_strategic_reaction,
            'total_reactions': len(reactions)
        }
        
        return {'detected': detected, 'confidence': confidence, 'evidence': evidence}
    
    async def _detect_vote_coordination(
        self,
        profile: BehaviorProfile,
        game_data: Dict[str, Any],
        action_history: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Detect coordinated voting patterns between players"""
        
        # Get all votes in the current session
        all_votes = [action for action in action_history if action.get('action_type') == 'vote']
        player_votes = [vote for vote in all_votes if vote.get('player_id') == profile.player_id]
        
        if len(player_votes) < 3:
            return {'detected': False, 'confidence': 0.0, 'evidence': {}}
        
        # Group votes by voting rounds
        voting_rounds = defaultdict(list)
        for vote in all_votes:
            round_id = vote.get('round_id', 0)
            voting_rounds[round_id].append(vote)
        
        coordination_indicators = []
        
        for round_id, round_votes in voting_rounds.items():
            if len(round_votes) < 4:  # Need at least 4 votes to detect coordination
                continue
            
            # Sort votes by timestamp
            round_votes.sort(key=lambda x: x.get('timestamp', ''))
            
            # Look for timing coordination (votes within 5 seconds of each other)
            player_vote = next((v for v in round_votes if v.get('player_id') == profile.player_id), None)
            if not player_vote:
                continue
            
            player_vote_time = datetime.fromisoformat(player_vote.get('timestamp')) if isinstance(player_vote.get('timestamp'), str) else player_vote.get('timestamp')
            player_target = player_vote.get('target_id')
            
            # Find votes for same target within coordination window
            coordinated_votes = []
            for vote in round_votes:
                if vote.get('player_id') == profile.player_id:
                    continue
                
                vote_time = datetime.fromisoformat(vote.get('timestamp')) if isinstance(vote.get('timestamp'), str) else vote.get('timestamp')
                time_diff = abs((vote_time - player_vote_time).total_seconds())
                
                if (vote.get('target_id') == player_target and 
                    time_diff < 5.0):  # Within 5 seconds
                    coordinated_votes.append({
                        'voter_id': vote.get('player_id'),
                        'time_difference': time_diff,
                        'target': vote.get('target_id')
                    })
            
            if len(coordinated_votes) >= 1:  # At least one coordinated vote
                coordination_indicators.append({
                    'round_id': round_id,
                    'coordinated_votes': coordinated_votes,
                    'coordination_strength': len(coordinated_votes) / len(round_votes)
                })
        
        # Calculate overall coordination score
        if not coordination_indicators:
            return {'detected': False, 'confidence': 0.0, 'evidence': {}}
        
        avg_coordination = statistics.mean([ind['coordination_strength'] for ind in coordination_indicators])
        coordination_frequency = len(coordination_indicators) / len(voting_rounds)
        
        detected = avg_coordination > 0.3 and coordination_frequency > 0.5
        confidence = min(1.0, avg_coordination * coordination_frequency * 2)
        
        evidence = {
            'coordination_indicators': coordination_indicators,
            'average_coordination_strength': avg_coordination,
            'coordination_frequency': coordination_frequency
        }
        
        return {'detected': detected, 'confidence': confidence, 'evidence': evidence}
    
    async def _detect_knowledge_leakage(
        self,
        profile: BehaviorProfile,
        game_data: Dict[str, Any],
        action_history: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Detect knowledge of information that should be unknown"""
        
        player_role = game_data.get('players', {}).get(profile.player_id, {}).get('role')
        if not player_role:
            return {'detected': False, 'confidence': 0.0, 'evidence': {}}
        
        player_messages = [
            action for action in action_history 
            if action.get('action_type') == 'chat' and action.get('player_id') == profile.player_id
        ]
        
        knowledge_leaks = []
        
        for message in player_messages:
            message_text = message.get('message', '').lower()
            message_time = datetime.fromisoformat(message.get('timestamp')) if isinstance(message.get('timestamp'), str) else message.get('timestamp')
            
            # Check for role-specific knowledge leaks
            if player_role == 'civilian':
                # Civilians shouldn't know detailed mafia strategies
                suspicious_phrases = ['mafia should', 'mafia will', 'our team', 'we need to kill']
                for phrase in suspicious_phrases:
                    if phrase in message_text:
                        knowledge_leaks.append({
                            'type': 'role_knowledge_leak',
                            'message': message_text,
                            'timestamp': message_time.isoformat(),
                            'suspicious_phrase': phrase
                        })
            
            elif player_role in ['mafia', 'godfather']:
                # Mafia shouldn't reveal detective results in public
                if 'detective found' in message_text or 'investigation showed' in message_text:
                    knowledge_leaks.append({
                        'type': 'investigation_leak',
                        'message': message_text,
                        'timestamp': message_time.isoformat(),
                        'reason': 'Mafia revealing detective information'
                    })
            
            # Check for premature knowledge of events
            future_events = [
                action for action in action_history
                if (datetime.fromisoformat(action.get('timestamp')) if isinstance(action.get('timestamp'), str) else action.get('timestamp')) > message_time and
                   action.get('action_type') in ['elimination', 'role_reveal']
            ]
            
            for event in future_events[:3]:  # Check next few events
                event_type = event.get('action_type')
                event_target = event.get('target_id', '')
                
                # Check if message predicted the event
                if (event_target in message_text and 
                    any(keyword in message_text for keyword in ['will die', 'is going to', 'next victim'])):
                    time_diff = (datetime.fromisoformat(event.get('timestamp')) if isinstance(event.get('timestamp'), str) else event.get('timestamp') - message_time).total_seconds()
                    if time_diff > 60:  # Predicted more than 1 minute in advance
                        knowledge_leaks.append({
                            'type': 'future_knowledge',
                            'message': message_text,
                            'predicted_event': event_type,
                            'predicted_target': event_target,
                            'prediction_accuracy': time_diff
                        })
        
        detected = len(knowledge_leaks) > 0
        confidence = min(1.0, len(knowledge_leaks) * 0.3)
        
        evidence = {
            'knowledge_leaks': knowledge_leaks,
            'leak_count': len(knowledge_leaks),
            'player_role': player_role
        }
        
        return {'detected': detected, 'confidence': confidence, 'evidence': evidence}
    
    async def _detect_coordinated_actions(
        self,
        profile: BehaviorProfile,
        game_data: Dict[str, Any],
        action_history: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Detect coordinated actions between multiple players"""
        
        player_actions = [action for action in action_history if action.get('player_id') == profile.player_id]
        
        coordination_events = []
        
        for action in player_actions:
            action_time = datetime.fromisoformat(action.get('timestamp')) if isinstance(action.get('timestamp'), str) else action.get('timestamp')
            action_type = action.get('action_type')
            
            # Find similar actions by other players within coordination window
            time_window_start = action_time - timedelta(seconds=10)
            time_window_end = action_time + timedelta(seconds=10)
            
            similar_actions = []
            for other_action in action_history:
                if other_action.get('player_id') == profile.player_id:
                    continue
                
                other_time = datetime.fromisoformat(other_action.get('timestamp')) if isinstance(other_action.get('timestamp'), str) else other_action.get('timestamp')
                
                if (time_window_start <= other_time <= time_window_end and
                    other_action.get('action_type') == action_type):
                    
                    time_diff = abs((other_time - action_time).total_seconds())
                    similar_actions.append({
                        'player_id': other_action.get('player_id'),
                        'time_difference': time_diff,
                        'action_type': action_type
                    })
            
            if len(similar_actions) >= 2:  # Coordinated with at least 2 others
                coordination_events.append({
                    'action_type': action_type,
                    'timestamp': action_time.isoformat(),
                    'coordinated_players': similar_actions,
                    'coordination_strength': len(similar_actions)
                })
        
        if not coordination_events:
            return {'detected': False, 'confidence': 0.0, 'evidence': {}}
        
        avg_coordination_strength = statistics.mean([event['coordination_strength'] for event in coordination_events])
        coordination_frequency = len(coordination_events) / max(len(player_actions), 1)
        
        detected = avg_coordination_strength >= 2.0 and coordination_frequency > 0.3
        confidence = min(1.0, (avg_coordination_strength / 3.0) * coordination_frequency)
        
        evidence = {
            'coordination_events': coordination_events,
            'average_coordination_strength': avg_coordination_strength,
            'coordination_frequency': coordination_frequency
        }
        
        return {'detected': detected, 'confidence': confidence, 'evidence': evidence}
    
    async def _detect_play_style_inconsistency(
        self,
        profile: BehaviorProfile,
        game_data: Dict[str, Any],
        action_history: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Detect inconsistencies in play style that suggest account sharing"""
        
        # Get baseline profile if available
        baseline = self.baseline_profiles.get(profile.player_id)
        if not baseline:
            return {'detected': False, 'confidence': 0.0, 'evidence': {}}
        
        inconsistencies = []
        
        # Compare response time patterns
        response_time_change = abs(profile.average_response_time - baseline.average_response_time)
        if response_time_change > baseline.average_response_time * 0.5:  # 50% change
            inconsistencies.append({
                'type': 'response_time_change',
                'current': profile.average_response_time,
                'baseline': baseline.average_response_time,
                'change_percentage': (response_time_change / baseline.average_response_time) * 100
            })
        
        # Compare communication patterns
        comm_freq_change = abs(profile.communication_frequency - baseline.communication_frequency)
        if comm_freq_change > baseline.communication_frequency * 0.4:  # 40% change
            inconsistencies.append({
                'type': 'communication_frequency_change',
                'current': profile.communication_frequency,
                'baseline': baseline.communication_frequency,
                'change_percentage': (comm_freq_change / baseline.communication_frequency) * 100
            })
        
        # Compare strategic complexity
        strategy_change = abs(profile.strategic_complexity - baseline.strategic_complexity)
        if strategy_change > 0.3:  # Significant strategy change
            inconsistencies.append({
                'type': 'strategic_complexity_change',
                'current': profile.strategic_complexity,
                'baseline': baseline.strategic_complexity,
                'change_amount': strategy_change
            })
        
        detected = len(inconsistencies) >= 2
        confidence = min(1.0, len(inconsistencies) * 0.4)
        
        evidence = {
            'inconsistencies': inconsistencies,
            'baseline_available': True,
            'games_since_baseline': getattr(baseline, 'games_played', 0)
        }
        
        return {'detected': detected, 'confidence': confidence, 'evidence': evidence}
    
    async def _detect_statistical_anomaly(
        self,
        profile: BehaviorProfile,
        game_data: Dict[str, Any],
        action_history: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Detect statistical anomalies in gameplay patterns"""
        
        if not self.is_model_trained or len(profile.response_time_distribution) < 5:
            return {'detected': False, 'confidence': 0.0, 'evidence': {}}
        
        # Prepare feature vector for anomaly detection
        features = [
            profile.average_response_time,
            profile.response_time_variance,
            profile.voting_consistency,
            profile.vote_change_frequency,
            profile.communication_frequency,
            profile.decision_confidence,
            profile.role_adherence_score,
            profile.strategic_complexity
        ]
        
        # Normalize features
        scaler = StandardScaler()
        features_scaled = scaler.fit_transform([features])
        
        # Use Isolation Forest to detect anomalies
        anomaly_score = self.isolation_forest.decision_function(features_scaled)[0]
        is_anomaly = self.isolation_forest.predict(features_scaled)[0] == -1
        
        # Additional statistical tests
        response_time_z_score = abs(stats.zscore([profile.average_response_time, 5.0, 10.0, 15.0]))[0]
        
        detected = is_anomaly or response_time_z_score > self.anomaly_threshold
        confidence = min(1.0, abs(anomaly_score) + (response_time_z_score / 3.0))
        
        evidence = {
            'anomaly_score': float(anomaly_score),
            'is_statistical_outlier': is_anomaly,
            'response_time_z_score': float(response_time_z_score),
            'feature_vector': features
        }
        
        return {'detected': detected, 'confidence': confidence, 'evidence': evidence}
    
    async def _detect_vote_timing_sync(
        self,
        profile: BehaviorProfile,
        game_data: Dict[str, Any],
        action_history: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Detect synchronized voting timing patterns"""
        
        # This would implement advanced timing correlation analysis
        return {'detected': False, 'confidence': 0.0, 'evidence': {}}
    
    async def _detect_bandwagon_following(
        self,
        profile: BehaviorProfile,
        game_data: Dict[str, Any],
        action_history: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Detect excessive bandwagon following behavior"""
        
        # This would analyze voting sequence patterns
        return {'detected': False, 'confidence': 0.0, 'evidence': {}}
    
    async def _detect_role_performance_mismatch(
        self,
        profile: BehaviorProfile,
        game_data: Dict[str, Any],
        action_history: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Detect performance that doesn't match assigned role"""
        
        # This would compare role-specific performance metrics
        return {'detected': False, 'confidence': 0.0, 'evidence': {}}
    
    # Helper methods
    
    def _calculate_voting_consistency(self, votes: List[Dict[str, Any]]) -> float:
        """Calculate how consistent a player's voting pattern is"""
        if len(votes) < 2:
            return 1.0
        
        # Analyze vote changes and timing consistency
        vote_changes = sum(1 for vote in votes if vote.get('is_change', False))
        consistency = 1.0 - (vote_changes / len(votes))
        return max(0.0, consistency)
    
    def _calculate_decision_confidence(self, action_history: List[Dict[str, Any]]) -> float:
        """Calculate how confident/decisive a player appears"""
        decisions = [action for action in action_history if action.get('action_type') in ['vote', 'accuse', 'defend']]
        if not decisions:
            return 0.5
        
        # Measure based on response time and message length
        quick_decisions = sum(1 for d in decisions if d.get('response_time', 10) < 5)
        confidence = quick_decisions / len(decisions)
        return confidence
    
    def _calculate_role_adherence(self, player_id: str, game_data: Dict[str, Any], action_history: List[Dict[str, Any]]) -> float:
        """Calculate how well player adheres to their role"""
        # This would implement role-specific behavior analysis
        return 0.8  # Placeholder
    
    def _calculate_strategic_complexity(self, action_history: List[Dict[str, Any]]) -> float:
        """Calculate the strategic complexity of player's actions"""
        # This would analyze strategic depth of moves
        return 0.5  # Placeholder
    
    def _calculate_overall_cheat_probability(
        self,
        indicators: List[CheatIndicator],
        confidence_scores: Dict[CheatIndicator, float]
    ) -> float:
        """Calculate overall probability of cheating"""
        if not indicators:
            return 0.0
        
        # Weighted combination of indicator confidences
        weights = {
            CheatIndicator.KNOWLEDGE_LEAKAGE: 0.9,
            CheatIndicator.COORDINATED_ACTIONS: 0.8,
            CheatIndicator.VOTE_COORDINATION: 0.7,
            CheatIndicator.CONSISTENT_FAST_RESPONSES: 0.6,
            CheatIndicator.STATISTICAL_ANOMALY: 0.5,
            CheatIndicator.PLAY_STYLE_INCONSISTENCY: 0.4,
            CheatIndicator.SUSPICIOUS_REACTION_TIMES: 0.7
        }
        
        weighted_score = 0.0
        total_weight = 0.0
        
        for indicator in indicators:
            weight = weights.get(indicator, 0.5)
            confidence = confidence_scores.get(indicator, 0.0)
            weighted_score += weight * confidence
            total_weight += weight
        
        return min(1.0, weighted_score / max(total_weight, 1.0))
    
    def _determine_action_and_severity(
        self,
        cheat_probability: float,
        indicators: List[CheatIndicator]
    ) -> Tuple[str, int]:
        """Determine recommended action and severity level"""
        
        if cheat_probability < 0.3:
            return "no_action", 0
        elif cheat_probability < 0.5:
            return "warning", 1
        elif cheat_probability < 0.7:
            return "close_monitoring", 2
        elif cheat_probability < 0.8:
            return "temporary_restriction", 3
        elif cheat_probability < 0.9:
            return "game_timeout", 4
        else:
            return "remove_from_game", 5
    
    def _estimate_false_positive_probability(
        self,
        profile: BehaviorProfile,
        indicators: List[CheatIndicator]
    ) -> float:
        """Estimate probability that detection is a false positive"""
        
        # Consider factors that increase false positive risk
        risk_factors = []
        
        # New players have higher false positive risk
        if not self.baseline_profiles.get(profile.player_id):
            risk_factors.append(0.3)
        
        # Certain personality types may trigger false positives
        if profile.strategic_complexity > 0.8:  # Highly strategic players
            risk_factors.append(0.2)
        
        # Time of day effects (late night gaming might affect behavior)
        current_hour = datetime.now().hour
        if current_hour < 6 or current_hour > 22:
            risk_factors.append(0.1)
        
        base_false_positive_rate = 0.1  # 10% base rate
        additional_risk = sum(risk_factors)
        
        return min(0.8, base_false_positive_rate + additional_risk)

# Global instance
cheat_detector = AdvancedCheatDetector()

def get_cheat_detector() -> AdvancedCheatDetector:
    """Get the global cheat detector instance"""
    return cheat_detector