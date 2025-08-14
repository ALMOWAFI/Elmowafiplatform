#!/usr/bin/env python3
"""
Family AI Service - Core AI logic for family personality learning and context management
Implements the AI brain for the Elmowafy Family Platform according to Master Architecture Guide
"""

import json
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, func

from backend.family_ai_models import (
    FamilyPersonality, RunningJoke, FamilyDynamics, 
    FamilyPrivacySettings, AIMemoryContext, AIInteractionLog
)

logger = logging.getLogger(__name__)

class FamilyAIService:
    """Core AI service for family personality learning and intelligent responses"""
    
    def __init__(self, db_session: Session):
        self.db = db_session
        self.memory_layers = {
            'short_term': timedelta(hours=24),
            'medium_term': timedelta(days=30),
            'long_term': timedelta(days=365)
        }
    
    async def get_family_context(self, family_id: str, member_id: str = None) -> Dict[str, Any]:
        """Get comprehensive family context for AI responses"""
        try:
            context = {
                'family_id': family_id,
                'personalities': await self._get_family_personalities(family_id),
                'running_jokes': await self._get_active_running_jokes(family_id),
                'dynamics': await self._get_family_dynamics(family_id),
                'recent_memories': await self._get_recent_memory_context(family_id),
                'privacy_settings': await self._get_privacy_settings(family_id, member_id) if member_id else None
            }
            
            # Add member-specific context if provided
            if member_id:
                context['current_member'] = await self._get_member_personality(member_id)
                context['member_relationships'] = await self._get_member_relationships(member_id)
            
            return context
            
        except Exception as e:
            logger.error(f"Error getting family context: {e}")
            return {'family_id': family_id, 'error': str(e)}
    
    async def process_ai_response(self, family_id: str, member_id: str, user_input: str, 
                                 response_type: str = 'chat') -> Dict[str, Any]:
        """Process user input and generate contextual AI response"""
        try:
            # Get family context
            context = await self.get_family_context(family_id, member_id)
            
            # Check privacy settings
            privacy_settings = context.get('privacy_settings', {})
            if not privacy_settings.get('allow_ai_learning', True):
                return await self._generate_basic_response(user_input, response_type)
            
            # Analyze input for personality learning
            personality_insights = await self._analyze_input_for_personality(user_input, member_id)
            
            # Find relevant running jokes
            relevant_jokes = await self._find_relevant_jokes(user_input, family_id)
            
            # Generate contextual response
            ai_response = await self._generate_contextual_response(
                user_input, context, relevant_jokes, response_type
            )
            
            # Log interaction for learning
            await self._log_interaction(
                family_id, member_id, user_input, ai_response, 
                context, relevant_jokes, response_type
            )
            
            # Update personality if insights found
            if personality_insights:
                await self._update_personality_insights(member_id, personality_insights)
            
            return {
                'response': ai_response,
                'context_used': context.keys(),
                'jokes_referenced': [joke['id'] for joke in relevant_jokes],
                'personality_learned': bool(personality_insights),
                'privacy_mode': privacy_settings.get('default_privacy_mode', 'family')
            }
            
        except Exception as e:
            logger.error(f"Error processing AI response: {e}")
            return {
                'response': "I'm having trouble processing that right now. Let me try again!",
                'error': str(e)
            }
    
    async def learn_from_memory(self, memory_data: Dict[str, Any], family_id: str) -> Dict[str, Any]:
        """Learn personality traits and create running jokes from uploaded memories"""
        try:
            learning_results = {
                'personalities_updated': [],
                'jokes_created': [],
                'dynamics_learned': []
            }
            
            # Extract personality insights from memory
            if 'familyMembers' in memory_data and 'description' in memory_data:
                for member_id in memory_data['familyMembers']:
                    insights = await self._extract_personality_from_memory(
                        memory_data, member_id
                    )
                    if insights:
                        await self._update_personality_insights(member_id, insights)
                        learning_results['personalities_updated'].append(member_id)
            
            # Identify potential running jokes
            joke_potential = await self._identify_joke_potential(memory_data, family_id)
            if joke_potential:
                joke = await self._create_running_joke(joke_potential, family_id, memory_data['id'])
                learning_results['jokes_created'].append(joke['id'])
            
            # Learn family dynamics
            if len(memory_data.get('familyMembers', [])) > 1:
                dynamics = await self._analyze_family_dynamics(memory_data)
                for dynamic in dynamics:
                    await self._update_family_dynamics(dynamic)
                    learning_results['dynamics_learned'].append(dynamic['relationship'])
            
            return learning_results
            
        except Exception as e:
            logger.error(f"Error learning from memory: {e}")
            return {'error': str(e)}
    
    async def _get_family_personalities(self, family_id: str) -> List[Dict[str, Any]]:
        """Get all family member personalities"""
        try:
            personalities = self.db.query(FamilyPersonality).join(
                'family_member'
            ).filter(
                # Assuming family_members table has family_id
                # This would need to be adjusted based on actual schema
                FamilyPersonality.family_member_id.isnot(None)
            ).all()
            
            return [
                {
                    'member_id': p.family_member_id,
                    'humor_style': p.humor_style,
                    'communication_style': p.communication_style,
                    'personality_traits': p.personality_traits,
                    'interests': p.interests,
                    'confidence_score': p.confidence_score
                }
                for p in personalities
            ]
            
        except Exception as e:
            logger.error(f"Error getting family personalities: {e}")
            return []
    
    async def _get_active_running_jokes(self, family_id: str) -> List[Dict[str, Any]]:
        """Get active running jokes for the family"""
        try:
            jokes = self.db.query(RunningJoke).filter(
                and_(
                    RunningJoke.family_id == family_id,
                    RunningJoke.effectiveness_score > 0.3  # Only effective jokes
                )
            ).order_by(desc(RunningJoke.usage_count)).limit(10).all()
            
            return [
                {
                    'id': str(joke.id),
                    'title': joke.joke_title,
                    'context': joke.joke_context,
                    'trigger_words': joke.trigger_words,
                    'participants': joke.participants,
                    'usage_count': joke.usage_count,
                    'effectiveness_score': joke.effectiveness_score,
                    'appropriate_contexts': joke.appropriate_contexts
                }
                for joke in jokes
            ]
            
        except Exception as e:
            logger.error(f"Error getting running jokes: {e}")
            return []
    
    async def _get_family_dynamics(self, family_id: str) -> List[Dict[str, Any]]:
        """Get family relationship dynamics"""
        try:
            dynamics = self.db.query(FamilyDynamics).filter(
                FamilyDynamics.family_id == family_id
            ).all()
            
            return [
                {
                    'member1_id': str(d.member1_id),
                    'member2_id': str(d.member2_id),
                    'relationship_type': d.relationship_type,
                    'interaction_style': d.interaction_style,
                    'relationship_strength': d.relationship_strength,
                    'appropriate_tone': d.appropriate_tone,
                    'shared_interests': d.shared_interests
                }
                for d in dynamics
            ]
            
        except Exception as e:
            logger.error(f"Error getting family dynamics: {e}")
            return []
    
    async def _get_recent_memory_context(self, family_id: str, days: int = 7) -> List[Dict[str, Any]]:
        """Get recent memory context for AI responses"""
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            
            contexts = self.db.query(AIMemoryContext).filter(
                and_(
                    AIMemoryContext.family_id == family_id,
                    AIMemoryContext.created_at >= cutoff_date,
                    AIMemoryContext.memory_layer.in_(['short_term', 'medium_term'])
                )
            ).order_by(desc(AIMemoryContext.importance_score)).limit(20).all()
            
            return [
                {
                    'context_type': ctx.context_type,
                    'context_data': ctx.context_data,
                    'participants': ctx.participants,
                    'importance_score': ctx.importance_score,
                    'created_at': ctx.created_at.isoformat()
                }
                for ctx in contexts
            ]
            
        except Exception as e:
            logger.error(f"Error getting recent memory context: {e}")
            return []
    
    async def _find_relevant_jokes(self, user_input: str, family_id: str) -> List[Dict[str, Any]]:
        """Find running jokes relevant to user input"""
        try:
            input_words = user_input.lower().split()
            relevant_jokes = []
            
            jokes = await self._get_active_running_jokes(family_id)
            
            for joke in jokes:
                # Check if any trigger words match
                trigger_matches = any(
                    trigger.lower() in user_input.lower() 
                    for trigger in joke.get('trigger_words', [])
                )
                
                if trigger_matches:
                    # Check if context is appropriate
                    appropriate_contexts = joke.get('appropriate_contexts', [])
                    if not appropriate_contexts or 'general' in appropriate_contexts:
                        relevant_jokes.append(joke)
            
            # Sort by effectiveness and usage
            relevant_jokes.sort(
                key=lambda x: (x['effectiveness_score'], x['usage_count']), 
                reverse=True
            )
            
            return relevant_jokes[:3]  # Return top 3 relevant jokes
            
        except Exception as e:
            logger.error(f"Error finding relevant jokes: {e}")
            return []
    
    async def _generate_contextual_response(self, user_input: str, context: Dict[str, Any], 
                                          relevant_jokes: List[Dict[str, Any]], 
                                          response_type: str) -> str:
        """Generate AI response using family context"""
        try:
            # This would integrate with OpenAI API or other AI service
            # For now, return a contextual template response
            
            response_parts = []
            
            # Add personality-based greeting
            current_member = context.get('current_member', {})
            if current_member.get('communication_style') == 'enthusiastic':
                response_parts.append("Oh, that's exciting!")
            elif current_member.get('communication_style') == 'gentle':
                response_parts.append("That sounds lovely.")
            
            # Add relevant joke if appropriate
            if relevant_jokes and response_type == 'chat':
                joke = relevant_jokes[0]
                if 'general' in joke.get('appropriate_contexts', []):
                    response_parts.append(f"Speaking of that, {joke['context']} 😄")
            
            # Add main response based on type
            if response_type == 'memory_upload':
                response_parts.append("What a wonderful memory! I can see this means a lot to the family.")
            elif response_type == 'travel_planning':
                response_parts.append("Let me help you plan something amazing based on your family's preferences!")
            else:
                response_parts.append("I understand what you're looking for.")
            
            return " ".join(response_parts)
            
        except Exception as e:
            logger.error(f"Error generating contextual response: {e}")
            return "I'm here to help with whatever you need!"
    
    async def _log_interaction(self, family_id: str, member_id: str, user_input: str, 
                             ai_response: str, context: Dict[str, Any], 
                             relevant_jokes: List[Dict[str, Any]], response_type: str):
        """Log AI interaction for learning and improvement"""
        try:
            privacy_settings = context.get('privacy_settings', {})
            privacy_mode = privacy_settings.get('default_privacy_mode', 'family')
            
            # Calculate retention period
            retention_days = privacy_settings.get('history_retention_days', 365)
            retention_until = datetime.utcnow() + timedelta(days=retention_days)
            
            log_entry = AIInteractionLog(
                family_id=family_id,
                member_id=member_id,
                interaction_type=response_type,
                user_input=user_input if privacy_settings.get('keep_conversation_history', True) else None,
                ai_response=ai_response,
                context_used=list(context.keys()),
                jokes_referenced=[joke['id'] for joke in relevant_jokes],
                privacy_mode=privacy_mode,
                data_retention_until=retention_until
            )
            
            self.db.add(log_entry)
            self.db.commit()
            
        except Exception as e:
            logger.error(f"Error logging interaction: {e}")
            self.db.rollback()
    
    async def _update_personality_insights(self, member_id: str, insights: Dict[str, Any]):
        """Update personality insights for a family member"""
        try:
            personality = self.db.query(FamilyPersonality).filter(
                FamilyPersonality.family_member_id == member_id
            ).first()
            
            if not personality:
                personality = FamilyPersonality(
                    family_member_id=member_id,
                    personality_traits={},
                    interests=[],
                    typical_responses=[]
                )
                self.db.add(personality)
            
            # Update traits with new insights
            current_traits = personality.personality_traits or {}
            for trait, score in insights.get('traits', {}).items():
                current_traits[trait] = max(current_traits.get(trait, 0.0), score)
            
            personality.personality_traits = current_traits
            personality.interaction_count += 1
            personality.last_updated_from_interaction = datetime.utcnow()
            
            # Update confidence score
            personality.confidence_score = min(1.0, personality.interaction_count * 0.1)
            
            self.db.commit()
            
        except Exception as e:
            logger.error(f"Error updating personality insights: {e}")
            self.db.rollback()

    async def cleanup_expired_contexts(self):
        """Clean up expired AI memory contexts"""
        try:
            expired_contexts = self.db.query(AIMemoryContext).filter(
                and_(
                    AIMemoryContext.expires_at <= datetime.utcnow(),
                    AIMemoryContext.is_archived == False
                )
            ).all()
            
            for context in expired_contexts:
                context.is_archived = True
            
            self.db.commit()
            logger.info(f"Archived {len(expired_contexts)} expired contexts")
            
        except Exception as e:
            logger.error(f"Error cleaning up expired contexts: {e}")
            self.db.rollback()
