#!/usr/bin/env python3
"""
Smart Memory Suggestions Engine for Elmowafiplatform
AI-powered system for suggesting relevant memories, "On This Day" features, and memory prompts
"""

import os
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from collections import defaultdict, Counter
from enum import Enum
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.cluster import KMeans

from unified_database import get_unified_database
from performance_monitoring import performance_monitor
from logging_config import get_logger

logger = get_logger("memory_suggestions")

class SuggestionType(Enum):
    """Types of memory suggestions"""
    ON_THIS_DAY = "on_this_day"
    SIMILAR_MEMORIES = "similar_memories"
    FORGOTTEN_GEMS = "forgotten_gems"
    ANNIVERSARY_REMINDER = "anniversary_reminder"
    PEOPLE_CONNECTIONS = "people_connections"
    LOCATION_MEMORIES = "location_memories"
    SEASONAL_MEMORIES = "seasonal_memories"
    MEMORY_GAPS = "memory_gaps"

@dataclass
class MemorySuggestion:
    """Individual memory suggestion"""
    id: str
    suggestion_type: SuggestionType
    title: str
    description: str
    memories: List[Dict[str, Any]]
    relevance_score: float
    reasoning: str
    action_prompt: Optional[str] = None
    metadata: Dict[str, Any] = None

@dataclass
class SuggestionContext:
    """Context for generating suggestions"""
    family_group_id: str
    current_date: datetime
    user_preferences: Dict[str, Any]
    recent_activity: List[Dict[str, Any]]
    family_members: List[Dict[str, Any]]

class SmartMemorySuggestionsEngine:
    """Advanced memory suggestions engine"""
    
    def __init__(self):
        self.db = get_unified_database()
        
        # Suggestion configuration
        self.max_suggestions_per_type = 5
        self.min_relevance_score = 0.3
        self.lookback_years = 10
        
        # Scoring weights
        self.scoring_weights = {
            'temporal_relevance': 0.25,
            'content_similarity': 0.20,
            'people_connections': 0.20,
            'engagement_history': 0.15,
            'uniqueness': 0.10,
            'completeness': 0.10
        }
        
        # Text analysis
        self.text_vectorizer = TfidfVectorizer(
            max_features=500,
            stop_words='english',
            ngram_range=(1, 2)
        )
        
    @performance_monitor.track_function_performance
    async def generate_suggestions(
        self,
        family_group_id: str,
        suggestion_types: Optional[List[SuggestionType]] = None,
        max_suggestions: int = 20
    ) -> List[MemorySuggestion]:
        """Generate comprehensive memory suggestions"""
        
        logger.info(f"Generating memory suggestions for family group: {family_group_id}")
        
        try:
            # Prepare context
            context = await self._prepare_suggestion_context(family_group_id)
            
            # Generate suggestions by type
            all_suggestions = []
            
            types_to_generate = suggestion_types or list(SuggestionType)
            
            for suggestion_type in types_to_generate:
                suggestions = await self._generate_suggestions_by_type(context, suggestion_type)
                all_suggestions.extend(suggestions)
            
            # Score and rank suggestions
            scored_suggestions = await self._score_and_rank_suggestions(all_suggestions, context)
            
            # Filter and limit results
            final_suggestions = [
                s for s in scored_suggestions 
                if s.relevance_score >= self.min_relevance_score
            ][:max_suggestions]
            
            # Save suggestions for tracking
            await self._save_suggestions(family_group_id, final_suggestions)
            
            logger.info(f"Generated {len(final_suggestions)} memory suggestions")
            return final_suggestions
            
        except Exception as e:
            logger.error(f"Error generating memory suggestions: {e}")
            return []
    
    async def _prepare_suggestion_context(self, family_group_id: str) -> SuggestionContext:
        """Prepare context information for suggestion generation"""
        
        current_date = datetime.now()
        
        # Get family members
        family_members = self.db.get_family_members(family_group_id)
        
        # Get recent user activity (last 30 days)
        recent_activity = []  # Could be expanded to track user interactions
        
        # Get user preferences (placeholder - could be expanded)
        user_preferences = {
            'preferred_memory_types': ['photo', 'video'],
            'notification_frequency': 'daily',
            'privacy_level': 'family'
        }
        
        return SuggestionContext(
            family_group_id=family_group_id,
            current_date=current_date,
            user_preferences=user_preferences,
            recent_activity=recent_activity,
            family_members=family_members
        )
    
    async def _generate_suggestions_by_type(
        self,
        context: SuggestionContext,
        suggestion_type: SuggestionType
    ) -> List[MemorySuggestion]:
        """Generate suggestions for a specific type"""
        
        if suggestion_type == SuggestionType.ON_THIS_DAY:
            return await self._generate_on_this_day_suggestions(context)
        elif suggestion_type == SuggestionType.SIMILAR_MEMORIES:
            return await self._generate_similar_memory_suggestions(context)
        elif suggestion_type == SuggestionType.FORGOTTEN_GEMS:
            return await self._generate_forgotten_gems_suggestions(context)
        elif suggestion_type == SuggestionType.ANNIVERSARY_REMINDER:
            return await self._generate_anniversary_reminders(context)
        elif suggestion_type == SuggestionType.PEOPLE_CONNECTIONS:
            return await self._generate_people_connection_suggestions(context)
        elif suggestion_type == SuggestionType.LOCATION_MEMORIES:
            return await self._generate_location_memory_suggestions(context)
        elif suggestion_type == SuggestionType.SEASONAL_MEMORIES:
            return await self._generate_seasonal_memory_suggestions(context)
        elif suggestion_type == SuggestionType.MEMORY_GAPS:
            return await self._generate_memory_gap_suggestions(context)
        else:
            return []
    
    async def _generate_on_this_day_suggestions(self, context: SuggestionContext) -> List[MemorySuggestion]:
        """Generate 'On This Day' style suggestions"""
        
        suggestions = []
        current_date = context.current_date
        
        # Look for memories from same date in previous years
        for years_ago in range(1, self.lookback_years + 1):
            target_date = current_date - timedelta(days=365 * years_ago)
            
            # Find memories within a week of this date
            date_range_start = target_date - timedelta(days=3)
            date_range_end = target_date + timedelta(days=3)
            
            memories = self.db.get_memories(
                family_group_id=context.family_group_id,
                filters={
                    'date_from': date_range_start.isoformat(),
                    'date_to': date_range_end.isoformat()
                }
            )
            
            if memories:
                if years_ago == 1:
                    title = "One Year Ago Today"
                else:
                    title = f"{years_ago} Years Ago Today"
                
                suggestion = MemorySuggestion(
                    id=f"on_this_day_{years_ago}_{current_date.strftime('%Y%m%d')}",
                    suggestion_type=SuggestionType.ON_THIS_DAY,
                    title=title,
                    description=f"Remember these special moments from {target_date.strftime('%B %d, %Y')}",
                    memories=memories,
                    relevance_score=0.0,  # Will be calculated later
                    reasoning=f"Memories from the same date {years_ago} years ago",
                    action_prompt="Take a moment to reminisce about these memories",
                    metadata={'years_ago': years_ago, 'original_date': target_date.isoformat()}
                )
                suggestions.append(suggestion)
        
        return suggestions[:self.max_suggestions_per_type]
    
    async def _generate_similar_memory_suggestions(self, context: SuggestionContext) -> List[MemorySuggestion]:
        """Generate suggestions based on content similarity"""
        
        suggestions = []
        
        try:
            # Get recent memories (last 30 days)
            recent_cutoff = context.current_date - timedelta(days=30)
            recent_memories = self.db.get_memories(
                family_group_id=context.family_group_id,
                filters={'date_from': recent_cutoff.isoformat()}
            )
            
            if not recent_memories:
                return suggestions
            
            # Get all historical memories
            all_memories = self.db.get_memories(
                family_group_id=context.family_group_id,
                filters={'date_to': recent_cutoff.isoformat()}
            )
            
            if len(all_memories) < 5:
                return suggestions
            
            # Create text representations
            recent_texts = [
                f"{mem.get('title', '')} {mem.get('description', '')} {' '.join(mem.get('tags', []))}"
                for mem in recent_memories
            ]
            
            historical_texts = [
                f"{mem.get('title', '')} {mem.get('description', '')} {' '.join(mem.get('tags', []))}"
                for mem in all_memories
            ]
            
            # Vectorize texts
            all_texts = recent_texts + historical_texts
            if len(all_texts) < 2:
                return suggestions
            
            text_vectors = self.text_vectorizer.fit_transform(all_texts)
            
            # Find similarities
            recent_vectors = text_vectors[:len(recent_texts)]
            historical_vectors = text_vectors[len(recent_texts):]
            
            similarity_matrix = cosine_similarity(recent_vectors, historical_vectors)
            
            # Find most similar historical memories for each recent memory
            for i, recent_memory in enumerate(recent_memories):
                similarities = similarity_matrix[i]
                
                # Get top similar memories
                top_indices = np.argsort(similarities)[-5:][::-1]
                top_similarities = similarities[top_indices]
                
                # Filter by minimum similarity threshold
                relevant_indices = [
                    idx for idx, sim in zip(top_indices, top_similarities)
                    if sim > 0.2
                ]
                
                if relevant_indices:
                    similar_memories = [all_memories[idx] for idx in relevant_indices]
                    
                    suggestion = MemorySuggestion(
                        id=f"similar_{recent_memory['id']}_{context.current_date.strftime('%Y%m%d')}",
                        suggestion_type=SuggestionType.SIMILAR_MEMORIES,
                        title=f"Memories Like '{recent_memory['title']}'",
                        description=f"Found {len(similar_memories)} similar memories from the past",
                        memories=similar_memories,
                        relevance_score=0.0,
                        reasoning=f"Content similarity to recent memory: {recent_memory['title']}",
                        action_prompt="Explore these related memories",
                        metadata={'reference_memory_id': recent_memory['id']}
                    )
                    suggestions.append(suggestion)
            
        except Exception as e:
            logger.error(f"Error generating similar memory suggestions: {e}")
        
        return suggestions[:self.max_suggestions_per_type]
    
    async def _generate_forgotten_gems_suggestions(self, context: SuggestionContext) -> List[MemorySuggestion]:
        """Suggest memories that haven't been viewed recently"""
        
        suggestions = []
        
        try:
            # Get memories older than 6 months that might be forgotten
            cutoff_date = context.current_date - timedelta(days=180)
            
            old_memories = self.db.get_memories(
                family_group_id=context.family_group_id,
                filters={'date_to': cutoff_date.isoformat()}
            )
            
            if not old_memories:
                return suggestions
            
            # Group by time periods
            memory_groups = defaultdict(list)
            for memory in old_memories:
                memory_date = datetime.fromisoformat(memory['date'])
                year_month = memory_date.strftime('%Y-%m')
                memory_groups[year_month].append(memory)
            
            # Find interesting periods with multiple memories
            for period, period_memories in memory_groups.items():
                if len(period_memories) >= 3:
                    period_date = datetime.strptime(period, '%Y-%m')
                    
                    suggestion = MemorySuggestion(
                        id=f"forgotten_gems_{period}",
                        suggestion_type=SuggestionType.FORGOTTEN_GEMS,
                        title=f"Rediscover {period_date.strftime('%B %Y')}",
                        description=f"Revisit {len(period_memories)} memories from this special time",
                        memories=period_memories,
                        relevance_score=0.0,
                        reasoning=f"Collection of memories from {period_date.strftime('%B %Y')} that might be forgotten",
                        action_prompt="Rediscover these forgotten gems",
                        metadata={'time_period': period}
                    )
                    suggestions.append(suggestion)
            
        except Exception as e:
            logger.error(f"Error generating forgotten gems suggestions: {e}")
        
        return suggestions[:self.max_suggestions_per_type]
    
    async def _generate_anniversary_reminders(self, context: SuggestionContext) -> List[MemorySuggestion]:
        """Generate anniversary and milestone reminders"""
        
        suggestions = []
        current_date = context.current_date
        
        try:
            # Look for memories that might be anniversaries (1, 5, 10 years ago)
            anniversary_years = [1, 5, 10, 15, 20]
            
            for years in anniversary_years:
                target_date = current_date - timedelta(days=365 * years)
                
                # Find memories within a week of anniversary date
                date_range_start = target_date - timedelta(days=7)
                date_range_end = target_date + timedelta(days=7)
                
                memories = self.db.get_memories(
                    family_group_id=context.family_group_id,
                    filters={
                        'date_from': date_range_start.isoformat(),
                        'date_to': date_range_end.isoformat()
                    }
                )
                
                # Filter for potentially important memories (weddings, birthdays, etc.)
                important_memories = [
                    mem for mem in memories
                    if any(tag.lower() in ['wedding', 'birthday', 'graduation', 'anniversary', 'celebration'] 
                          for tag in mem.get('tags', []))
                ]
                
                if important_memories:
                    suggestion = MemorySuggestion(
                        id=f"anniversary_{years}_{current_date.strftime('%Y%m%d')}",
                        suggestion_type=SuggestionType.ANNIVERSARY_REMINDER,
                        title=f"{years} Year Anniversary",
                        description=f"It's been {years} years since these special moments",
                        memories=important_memories,
                        relevance_score=0.0,
                        reasoning=f"Anniversary of important events from {years} years ago",
                        action_prompt="Celebrate this anniversary with family",
                        metadata={'anniversary_years': years}
                    )
                    suggestions.append(suggestion)
            
        except Exception as e:
            logger.error(f"Error generating anniversary reminders: {e}")
        
        return suggestions[:self.max_suggestions_per_type]
    
    async def _generate_people_connection_suggestions(self, context: SuggestionContext) -> List[MemorySuggestion]:
        """Suggest memories based on family member connections"""
        
        suggestions = []
        
        try:
            # Get all memories
            all_memories = self.db.get_memories(family_group_id=context.family_group_id)
            
            if not all_memories:
                return suggestions
            
            # Group memories by family member combinations
            people_combinations = defaultdict(list)
            
            for memory in all_memories:
                participants = memory.get('family_members', [])
                if len(participants) >= 2:
                    # Create combination key
                    combo_key = tuple(sorted(participants))
                    people_combinations[combo_key].append(memory)
            
            # Find interesting people combinations with multiple memories
            for people_combo, combo_memories in people_combinations.items():
                if len(combo_memories) >= 3:
                    people_names = list(people_combo)
                    
                    suggestion = MemorySuggestion(
                        id=f"people_connection_{'_'.join(people_names)}",
                        suggestion_type=SuggestionType.PEOPLE_CONNECTIONS,
                        title=f"Memories with {' & '.join(people_names)}",
                        description=f"Explore {len(combo_memories)} memories featuring these family members together",
                        memories=combo_memories,
                        relevance_score=0.0,
                        reasoning=f"Collection of memories featuring {' & '.join(people_names)} together",
                        action_prompt="Share these memories with the featured family members",
                        metadata={'featured_people': people_names}
                    )
                    suggestions.append(suggestion)
            
        except Exception as e:
            logger.error(f"Error generating people connection suggestions: {e}")
        
        return suggestions[:self.max_suggestions_per_type]
    
    async def _generate_location_memory_suggestions(self, context: SuggestionContext) -> List[MemorySuggestion]:
        """Suggest memories based on locations"""
        
        suggestions = []
        
        try:
            # Get memories with locations
            all_memories = self.db.get_memories(family_group_id=context.family_group_id)
            
            location_memories = defaultdict(list)
            for memory in all_memories:
                location = memory.get('location')
                if location:
                    location_memories[location].append(memory)
            
            # Find locations with multiple memories
            for location, memories in location_memories.items():
                if len(memories) >= 3:
                    suggestion = MemorySuggestion(
                        id=f"location_{location.replace(' ', '_')}",
                        suggestion_type=SuggestionType.LOCATION_MEMORIES,
                        title=f"Memories from {location}",
                        description=f"Revisit {len(memories)} memories from this special place",
                        memories=memories,
                        relevance_score=0.0,
                        reasoning=f"Collection of memories from {location}",
                        action_prompt="Plan another visit to this meaningful location",
                        metadata={'location': location}
                    )
                    suggestions.append(suggestion)
            
        except Exception as e:
            logger.error(f"Error generating location memory suggestions: {e}")
        
        return suggestions[:self.max_suggestions_per_type]
    
    async def _generate_seasonal_memory_suggestions(self, context: SuggestionContext) -> List[MemorySuggestion]:
        """Generate seasonal memory suggestions"""
        
        suggestions = []
        current_month = context.current_date.month
        
        try:
            # Define seasons
            seasons = {
                'Spring': [3, 4, 5],
                'Summer': [6, 7, 8],
                'Fall': [9, 10, 11],
                'Winter': [12, 1, 2]
            }
            
            # Find current season
            current_season = None
            for season, months in seasons.items():
                if current_month in months:
                    current_season = season
                    break
            
            if current_season:
                # Get memories from same season in previous years
                season_memories = []
                for year_offset in range(1, 5):  # Last 4 years
                    target_year = context.current_date.year - year_offset
                    
                    for month in seasons[current_season]:
                        memories = self.db.get_memories(
                            family_group_id=context.family_group_id,
                            filters={
                                'date_from': f"{target_year}-{month:02d}-01",
                                'date_to': f"{target_year}-{month:02d}-31"
                            }
                        )
                        season_memories.extend(memories)
                
                if season_memories:
                    suggestion = MemorySuggestion(
                        id=f"seasonal_{current_season.lower()}_{context.current_date.year}",
                        suggestion_type=SuggestionType.SEASONAL_MEMORIES,
                        title=f"{current_season} Memories",
                        description=f"Enjoy {len(season_memories)} memories from past {current_season.lower()} seasons",
                        memories=season_memories,
                        relevance_score=0.0,
                        reasoning=f"Seasonal memories from past {current_season.lower()} seasons",
                        action_prompt=f"Create new {current_season.lower()} memories this year",
                        metadata={'season': current_season}
                    )
                    suggestions.append(suggestion)
            
        except Exception as e:
            logger.error(f"Error generating seasonal memory suggestions: {e}")
        
        return suggestions
    
    async def _generate_memory_gap_suggestions(self, context: SuggestionContext) -> List[MemorySuggestion]:
        """Suggest creating memories to fill gaps"""
        
        suggestions = []
        
        try:
            # Analyze memory creation patterns
            all_memories = self.db.get_memories(family_group_id=context.family_group_id)
            
            if not all_memories:
                return suggestions
            
            # Group memories by month
            monthly_counts = defaultdict(int)
            for memory in all_memories:
                memory_date = datetime.fromisoformat(memory['date'])
                month_key = memory_date.strftime('%Y-%m')
                monthly_counts[month_key] += 1
            
            # Find recent months with no memories
            current_date = context.current_date
            gap_months = []
            
            for month_offset in range(1, 6):  # Check last 5 months
                target_date = current_date - timedelta(days=30 * month_offset)
                month_key = target_date.strftime('%Y-%m')
                
                if monthly_counts[month_key] == 0:
                    gap_months.append((target_date, month_key))
            
            if gap_months:
                gap_month = gap_months[0][0]  # Most recent gap
                
                suggestion = MemorySuggestion(
                    id=f"memory_gap_{gap_month.strftime('%Y%m')}",
                    suggestion_type=SuggestionType.MEMORY_GAPS,
                    title="Missing Memories",
                    description=f"No memories were captured in {gap_month.strftime('%B %Y')}",
                    memories=[],
                    relevance_score=0.0,
                    reasoning="Identified a gap in memory creation",
                    action_prompt="Add some memories from this time period if you have photos",
                    metadata={'gap_month': gap_month.strftime('%Y-%m')}
                )
                suggestions.append(suggestion)
            
        except Exception as e:
            logger.error(f"Error generating memory gap suggestions: {e}")
        
        return suggestions
    
    async def _score_and_rank_suggestions(
        self,
        suggestions: List[MemorySuggestion],
        context: SuggestionContext
    ) -> List[MemorySuggestion]:
        """Score and rank suggestions by relevance"""
        
        for suggestion in suggestions:
            score = 0.0
            
            # Temporal relevance
            temporal_score = self._calculate_temporal_relevance(suggestion, context)
            score += temporal_score * self.scoring_weights['temporal_relevance']
            
            # Content richness
            content_score = self._calculate_content_score(suggestion)
            score += content_score * self.scoring_weights['content_similarity']
            
            # People involvement
            people_score = self._calculate_people_score(suggestion, context)
            score += people_score * self.scoring_weights['people_connections']
            
            # Uniqueness (avoid duplicates)
            uniqueness_score = self._calculate_uniqueness_score(suggestion, suggestions)
            score += uniqueness_score * self.scoring_weights['uniqueness']
            
            suggestion.relevance_score = min(1.0, score)
        
        # Sort by relevance score
        return sorted(suggestions, key=lambda x: x.relevance_score, reverse=True)
    
    def _calculate_temporal_relevance(self, suggestion: MemorySuggestion, context: SuggestionContext) -> float:
        """Calculate temporal relevance score"""
        
        if suggestion.suggestion_type == SuggestionType.ON_THIS_DAY:
            return 1.0  # Always highly relevant
        elif suggestion.suggestion_type == SuggestionType.ANNIVERSARY_REMINDER:
            return 0.9  # Very relevant
        elif suggestion.suggestion_type == SuggestionType.SEASONAL_MEMORIES:
            return 0.7  # Seasonally relevant
        else:
            return 0.5  # Moderate relevance
    
    def _calculate_content_score(self, suggestion: MemorySuggestion) -> float:
        """Calculate content richness score"""
        
        if not suggestion.memories:
            return 0.0
        
        memory_count = len(suggestion.memories)
        
        # Score based on number of memories
        count_score = min(1.0, memory_count / 10)
        
        # Bonus for memories with descriptions
        described_memories = sum(
            1 for mem in suggestion.memories 
            if mem.get('description')
        )
        description_score = described_memories / len(suggestion.memories)
        
        return (count_score + description_score) / 2
    
    def _calculate_people_score(self, suggestion: MemorySuggestion, context: SuggestionContext) -> float:
        """Calculate people involvement score"""
        
        if not suggestion.memories:
            return 0.0
        
        # Count unique family members involved
        unique_people = set()
        for memory in suggestion.memories:
            unique_people.update(memory.get('family_members', []))
        
        # Score based on family member involvement
        family_size = len(context.family_members)
        if family_size == 0:
            return 0.5
        
        involvement_ratio = len(unique_people) / family_size
        return min(1.0, involvement_ratio)
    
    def _calculate_uniqueness_score(self, suggestion: MemorySuggestion, all_suggestions: List[MemorySuggestion]) -> float:
        """Calculate uniqueness score to avoid duplicates"""
        
        # Check for overlapping memories with other suggestions
        suggestion_memory_ids = {mem['id'] for mem in suggestion.memories}
        
        overlap_count = 0
        for other_suggestion in all_suggestions:
            if other_suggestion.id != suggestion.id:
                other_memory_ids = {mem['id'] for mem in other_suggestion.memories}
                overlap = len(suggestion_memory_ids & other_memory_ids)
                overlap_count += overlap
        
        # Higher uniqueness for less overlap
        if len(suggestion_memory_ids) == 0:
            return 0.5
        
        uniqueness = 1.0 - (overlap_count / len(suggestion_memory_ids))
        return max(0.0, uniqueness)
    
    async def _save_suggestions(self, family_group_id: str, suggestions: List[MemorySuggestion]):
        """Save generated suggestions for tracking"""
        
        try:
            suggestions_data = [asdict(s) for s in suggestions]
            
            with self.db.get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO memory_suggestions (memory_id, suggestion_type, suggested_to_user, suggestion_date, relevance_score, created_at)
                    VALUES (?, 'generated_suggestions', ?, ?, ?, ?)
                """, (
                    f"suggestions_{family_group_id}_{datetime.now().isoformat()}",
                    family_group_id,
                    datetime.now().date().isoformat(),
                    len(suggestions),
                    datetime.now().isoformat()
                ))
                conn.commit()
            
        except Exception as e:
            logger.error(f"Error saving suggestions: {e}")

# Global memory suggestions engine instance
memory_suggestions_engine = SmartMemorySuggestionsEngine()

def get_memory_suggestions_engine() -> SmartMemorySuggestionsEngine:
    """Get the global memory suggestions engine instance"""
    return memory_suggestions_engine