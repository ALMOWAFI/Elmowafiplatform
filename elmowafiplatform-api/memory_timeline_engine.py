#!/usr/bin/env python3
"""
Advanced Memory Timeline Generation Engine for Elmowafiplatform
Creates intelligent, contextual timelines from family photos, events, and memories
"""

import os
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from collections import defaultdict
from enum import Enum
import sqlite3
import numpy as np
from sklearn.cluster import DBSCAN
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from unified_database import get_unified_database
from performance_monitoring import performance_monitor
from logging_config import get_logger

logger = get_logger("memory_timeline")

class EventType(Enum):
    """Types of timeline events"""
    PHOTO = "photo"
    VIDEO = "video"
    STORY = "story"
    TRIP = "trip"
    BIRTHDAY = "birthday"
    HOLIDAY = "holiday"
    MILESTONE = "milestone"
    GATHERING = "gathering"
    CUSTOM = "custom"

class TimelineClusterType(Enum):
    """Types of timeline clustering"""
    TEMPORAL = "temporal"  # Group by time periods
    SPATIAL = "spatial"    # Group by locations
    PEOPLE = "people"      # Group by family members
    EVENTS = "events"      # Group by event types
    THEMES = "themes"      # Group by content themes

@dataclass
class TimelineEvent:
    """Individual timeline event"""
    id: str
    event_type: EventType
    title: str
    description: Optional[str]
    date: datetime
    location: Optional[str]
    participants: List[str]  # Family member IDs
    media_urls: List[str]
    tags: List[str]
    metadata: Dict[str, Any]
    importance_score: float = 0.0
    ai_summary: Optional[str] = None

@dataclass
class TimelineCluster:
    """Cluster of related timeline events"""
    id: str
    cluster_type: TimelineClusterType
    title: str
    description: str
    date_range: Tuple[datetime, datetime]
    events: List[TimelineEvent]
    participants: List[str]
    locations: List[str]
    tags: List[str]
    cluster_score: float = 0.0
    ai_narrative: Optional[str] = None

@dataclass
class FamilyTimeline:
    """Complete family timeline"""
    family_group_id: str
    title: str
    date_range: Tuple[datetime, datetime]
    clusters: List[TimelineCluster]
    total_events: int
    participants: List[str]
    generated_at: datetime
    ai_insights: List[str]

class MemoryTimelineEngine:
    """Advanced memory timeline generation and management system"""
    
    def __init__(self):
        self.db = get_unified_database()
        
        # Timeline generation parameters
        self.temporal_cluster_days = 7  # Days to group events together
        self.spatial_cluster_km = 10   # Kilometers to group events together
        self.people_cluster_threshold = 0.7  # Similarity threshold for people grouping
        self.min_cluster_size = 2
        self.max_cluster_size = 20
        
        # Importance scoring weights
        self.importance_weights = {
            'recency': 0.2,
            'frequency': 0.2,
            'people_count': 0.3,
            'media_count': 0.2,
            'manual_rating': 0.1
        }
        
        # Content analysis
        self.text_vectorizer = TfidfVectorizer(
            max_features=1000,
            stop_words='english',
            ngram_range=(1, 2)
        )
        
    @performance_monitor.track_function_performance
    async def generate_family_timeline(
        self,
        family_group_id: str,
        date_range: Optional[Tuple[datetime, datetime]] = None,
        cluster_type: TimelineClusterType = TimelineClusterType.TEMPORAL,
        include_ai_insights: bool = True
    ) -> FamilyTimeline:
        """Generate comprehensive family timeline"""
        
        logger.info(f"Generating timeline for family group: {family_group_id}")
        
        try:
            # 1. Collect all memories and events
            events = await self._collect_family_events(family_group_id, date_range)
            
            if not events:
                logger.warning(f"No events found for family group: {family_group_id}")
                return self._create_empty_timeline(family_group_id)
            
            # 2. Calculate importance scores
            events = await self._calculate_importance_scores(events)
            
            # 3. Cluster events based on specified type
            clusters = await self._cluster_events(events, cluster_type)
            
            # 4. Generate AI narratives for clusters
            if include_ai_insights:
                clusters = await self._generate_cluster_narratives(clusters)
            
            # 5. Create timeline object
            timeline = self._create_timeline(
                family_group_id, clusters, events, include_ai_insights
            )
            
            # 6. Save timeline to database
            await self._save_timeline(timeline)
            
            logger.info(
                f"Generated timeline with {len(clusters)} clusters "
                f"and {len(events)} events"
            )
            
            return timeline
            
        except Exception as e:
            logger.error(f"Error generating timeline: {e}")
            raise
    
    async def _collect_family_events(
        self,
        family_group_id: str,
        date_range: Optional[Tuple[datetime, datetime]] = None
    ) -> List[TimelineEvent]:
        """Collect all family events from database"""
        
        events = []
        
        try:
            # Get memories (photos, videos, stories)
            memories = self.db.get_memories(
                family_group_id=family_group_id,
                filters={
                    'date_from': date_range[0].isoformat() if date_range else None,
                    'date_to': date_range[1].isoformat() if date_range else None
                }
            )
            
            for memory in memories:
                event = TimelineEvent(
                    id=memory['id'],
                    event_type=EventType(memory.get('memory_type', 'photo')),
                    title=memory['title'],
                    description=memory.get('description'),
                    date=datetime.fromisoformat(memory['date']),
                    location=memory.get('location'),
                    participants=memory.get('family_members', []),
                    media_urls=[memory.get('image_url')] if memory.get('image_url') else [],
                    tags=memory.get('tags', []),
                    metadata=memory.get('ai_analysis', {})
                )
                events.append(event)
            
            # Get travel plans as events
            travel_plans = self.db.get_travel_plans(family_group_id)
            for travel in travel_plans:
                event = TimelineEvent(
                    id=travel['id'],
                    event_type=EventType.TRIP,
                    title=f"Trip to {travel['destination']}",
                    description=travel.get('description'),
                    date=datetime.fromisoformat(travel['start_date']),
                    location=travel['destination'],
                    participants=travel.get('participants', []),
                    media_urls=[],
                    tags=['travel', 'trip'],
                    metadata={'end_date': travel['end_date'], 'budget': travel.get('budget')}
                )
                events.append(event)
            
            # Sort events by date
            events.sort(key=lambda x: x.date)
            
            logger.info(f"Collected {len(events)} events for timeline")
            return events
            
        except Exception as e:
            logger.error(f"Error collecting family events: {e}")
            return []
    
    async def _calculate_importance_scores(self, events: List[TimelineEvent]) -> List[TimelineEvent]:
        """Calculate importance scores for timeline events"""
        
        current_date = datetime.now()
        
        for event in events:
            score = 0.0
            
            # Recency score (more recent = higher score)
            days_ago = (current_date - event.date).days
            recency_score = max(0, 1 - (days_ago / 365))  # Normalize to 1 year
            score += recency_score * self.importance_weights['recency']
            
            # People count score
            people_count = len(event.participants)
            people_score = min(1.0, people_count / 10)  # Normalize to max 10 people
            score += people_score * self.importance_weights['people_count']
            
            # Media count score
            media_count = len(event.media_urls)
            media_score = min(1.0, media_count / 5)  # Normalize to max 5 media items
            score += media_score * self.importance_weights['media_count']
            
            # Tag-based importance (holidays, birthdays get higher scores)
            important_tags = {'birthday', 'wedding', 'graduation', 'holiday', 'anniversary'}
            if any(tag.lower() in important_tags for tag in event.tags):
                score += 0.3
            
            event.importance_score = min(1.0, score)
        
        return events
    
    async def _cluster_events(
        self,
        events: List[TimelineEvent],
        cluster_type: TimelineClusterType
    ) -> List[TimelineCluster]:
        """Cluster events based on specified clustering strategy"""
        
        if cluster_type == TimelineClusterType.TEMPORAL:
            return await self._cluster_by_time(events)
        elif cluster_type == TimelineClusterType.SPATIAL:
            return await self._cluster_by_location(events)
        elif cluster_type == TimelineClusterType.PEOPLE:
            return await self._cluster_by_people(events)
        elif cluster_type == TimelineClusterType.EVENTS:
            return await self._cluster_by_event_type(events)
        elif cluster_type == TimelineClusterType.THEMES:
            return await self._cluster_by_themes(events)
        else:
            return await self._cluster_by_time(events)  # Default fallback
    
    async def _cluster_by_time(self, events: List[TimelineEvent]) -> List[TimelineCluster]:
        """Cluster events by temporal proximity"""
        
        clusters = []
        current_cluster_events = []
        cluster_start_date = None
        
        for event in events:
            if not current_cluster_events:
                # Start new cluster
                current_cluster_events = [event]
                cluster_start_date = event.date
            else:
                # Check if event should be added to current cluster
                days_diff = (event.date - cluster_start_date).days
                
                if days_diff <= self.temporal_cluster_days:
                    current_cluster_events.append(event)
                else:
                    # Create cluster from current events
                    if len(current_cluster_events) >= self.min_cluster_size:
                        cluster = self._create_cluster(
                            current_cluster_events,
                            TimelineClusterType.TEMPORAL
                        )
                        clusters.append(cluster)
                    
                    # Start new cluster
                    current_cluster_events = [event]
                    cluster_start_date = event.date
        
        # Handle last cluster
        if len(current_cluster_events) >= self.min_cluster_size:
            cluster = self._create_cluster(
                current_cluster_events,
                TimelineClusterType.TEMPORAL
            )
            clusters.append(cluster)
        
        return clusters
    
    async def _cluster_by_location(self, events: List[TimelineEvent]) -> List[TimelineCluster]:
        """Cluster events by spatial proximity"""
        
        # Group events by location
        location_groups = defaultdict(list)
        
        for event in events:
            location = event.location or "Unknown Location"
            location_groups[location].append(event)
        
        clusters = []
        for location, location_events in location_groups.items():
            if len(location_events) >= self.min_cluster_size:
                cluster = self._create_cluster(
                    location_events,
                    TimelineClusterType.SPATIAL,
                    title_prefix=f"Memories from {location}"
                )
                clusters.append(cluster)
        
        return clusters
    
    async def _cluster_by_people(self, events: List[TimelineEvent]) -> List[TimelineCluster]:
        """Cluster events by participating family members"""
        
        # Create participant signature for each event
        participant_groups = defaultdict(list)
        
        for event in events:
            # Create a sorted tuple of participants as key
            participants_key = tuple(sorted(event.participants))
            participant_groups[participants_key].append(event)
        
        clusters = []
        for participants, participant_events in participant_groups.items():
            if len(participant_events) >= self.min_cluster_size:
                participant_names = ", ".join(participants[:3])  # First 3 names
                title = f"Memories with {participant_names}"
                if len(participants) > 3:
                    title += f" and {len(participants) - 3} others"
                
                cluster = self._create_cluster(
                    participant_events,
                    TimelineClusterType.PEOPLE,
                    title_prefix=title
                )
                clusters.append(cluster)
        
        return clusters
    
    async def _cluster_by_event_type(self, events: List[TimelineEvent]) -> List[TimelineCluster]:
        """Cluster events by event type"""
        
        type_groups = defaultdict(list)
        
        for event in events:
            type_groups[event.event_type].append(event)
        
        clusters = []
        for event_type, type_events in type_groups.items():
            if len(type_events) >= self.min_cluster_size:
                cluster = self._create_cluster(
                    type_events,
                    TimelineClusterType.EVENTS,
                    title_prefix=f"{event_type.value.title()} Collection"
                )
                clusters.append(cluster)
        
        return clusters
    
    async def _cluster_by_themes(self, events: List[TimelineEvent]) -> List[TimelineCluster]:
        """Cluster events by content themes using text analysis"""
        
        # Prepare text data for clustering
        event_texts = []
        for event in events:
            text_content = f"{event.title} {event.description or ''} {' '.join(event.tags)}"
            event_texts.append(text_content)
        
        if len(event_texts) < self.min_cluster_size:
            return []
        
        try:
            # Vectorize text content
            text_vectors = self.text_vectorizer.fit_transform(event_texts)
            
            # Apply DBSCAN clustering
            clustering = DBSCAN(
                eps=0.5,
                min_samples=self.min_cluster_size,
                metric='cosine'
            )
            cluster_labels = clustering.fit_predict(text_vectors.toarray())
            
            # Group events by cluster labels
            theme_groups = defaultdict(list)
            for i, label in enumerate(cluster_labels):
                if label != -1:  # Ignore noise points
                    theme_groups[label].append(events[i])
            
            clusters = []
            for theme_id, theme_events in theme_groups.items():
                if len(theme_events) >= self.min_cluster_size:
                    # Generate theme title from most common tags
                    all_tags = [tag for event in theme_events for tag in event.tags]
                    common_tags = [tag for tag, count in Counter(all_tags).most_common(3)]
                    theme_title = f"Theme: {', '.join(common_tags)}" if common_tags else f"Theme {theme_id + 1}"
                    
                    cluster = self._create_cluster(
                        theme_events,
                        TimelineClusterType.THEMES,
                        title_prefix=theme_title
                    )
                    clusters.append(cluster)
            
            return clusters
            
        except Exception as e:
            logger.error(f"Error in theme clustering: {e}")
            return []
    
    def _create_cluster(
        self,
        events: List[TimelineEvent],
        cluster_type: TimelineClusterType,
        title_prefix: Optional[str] = None
    ) -> TimelineCluster:
        """Create timeline cluster from events"""
        
        if not events:
            raise ValueError("Cannot create cluster from empty events list")
        
        # Sort events by date
        events.sort(key=lambda x: x.date)
        
        # Generate cluster title
        if title_prefix:
            title = title_prefix
        else:
            date_range = f"{events[0].date.strftime('%B %Y')}"
            if len(events) > 1 and events[-1].date.month != events[0].date.month:
                date_range += f" - {events[-1].date.strftime('%B %Y')}"
            title = f"Memories from {date_range}"
        
        # Generate description
        event_types = list(set(event.event_type.value for event in events))
        description = f"{len(events)} memories including {', '.join(event_types)}"
        
        # Collect metadata
        all_participants = list(set(
            participant 
            for event in events 
            for participant in event.participants
        ))
        
        all_locations = list(set(
            event.location 
            for event in events 
            if event.location
        ))
        
        all_tags = list(set(
            tag 
            for event in events 
            for tag in event.tags
        ))
        
        # Calculate cluster score (average importance)
        cluster_score = sum(event.importance_score for event in events) / len(events)
        
        return TimelineCluster(
            id=f"cluster_{datetime.now().timestamp()}_{len(events)}",
            cluster_type=cluster_type,
            title=title,
            description=description,
            date_range=(events[0].date, events[-1].date),
            events=events,
            participants=all_participants,
            locations=all_locations,
            tags=all_tags,
            cluster_score=cluster_score
        )
    
    async def _generate_cluster_narratives(self, clusters: List[TimelineCluster]) -> List[TimelineCluster]:
        """Generate AI narratives for timeline clusters"""
        
        for cluster in clusters:
            try:
                # Generate narrative based on cluster content
                narrative = await self._create_cluster_narrative(cluster)
                cluster.ai_narrative = narrative
                
            except Exception as e:
                logger.error(f"Error generating narrative for cluster {cluster.id}: {e}")
                cluster.ai_narrative = f"A collection of {len(cluster.events)} family memories"
        
        return clusters
    
    async def _create_cluster_narrative(self, cluster: TimelineCluster) -> str:
        """Create narrative description for timeline cluster"""
        
        # Simple rule-based narrative generation
        # In production, this could use more sophisticated AI
        
        events_count = len(cluster.events)
        date_range = cluster.date_range
        participants = cluster.participants[:3]  # First 3 participants
        locations = cluster.locations[:2]  # First 2 locations
        
        narrative_parts = []
        
        # Time context
        if date_range[0].date() == date_range[1].date():
            time_context = f"on {date_range[0].strftime('%B %d, %Y')}"
        else:
            time_context = f"between {date_range[0].strftime('%B %d')} and {date_range[1].strftime('%B %d, %Y')}"
        
        narrative_parts.append(f"This collection contains {events_count} memories captured {time_context}")
        
        # People context
        if participants:
            people_text = ", ".join(participants)
            if len(cluster.participants) > 3:
                people_text += f" and {len(cluster.participants) - 3} others"
            narrative_parts.append(f"featuring {people_text}")
        
        # Location context
        if locations:
            location_text = " and ".join(locations)
            narrative_parts.append(f"at {location_text}")
        
        # Event types
        event_types = list(set(event.event_type.value for event in cluster.events))
        if len(event_types) == 1:
            narrative_parts.append(f"These are all {event_types[0]} memories")
        else:
            narrative_parts.append(f"including {', '.join(event_types)} memories")
        
        return ". ".join(narrative_parts) + "."
    
    def _create_timeline(
        self,
        family_group_id: str,
        clusters: List[TimelineCluster],
        events: List[TimelineEvent],
        include_ai_insights: bool = True
    ) -> FamilyTimeline:
        """Create final timeline object"""
        
        # Calculate overall date range
        if events:
            date_range = (
                min(event.date for event in events),
                max(event.date for event in events)
            )
        else:
            date_range = (datetime.now(), datetime.now())
        
        # Collect all participants
        all_participants = list(set(
            participant
            for event in events
            for participant in event.participants
        ))
        
        # Generate AI insights
        ai_insights = []
        if include_ai_insights:
            ai_insights = self._generate_timeline_insights(events, clusters)
        
        return FamilyTimeline(
            family_group_id=family_group_id,
            title=f"Family Timeline ({date_range[0].strftime('%Y')} - {date_range[1].strftime('%Y')})",
            date_range=date_range,
            clusters=clusters,
            total_events=len(events),
            participants=all_participants,
            generated_at=datetime.now(),
            ai_insights=ai_insights
        )
    
    def _generate_timeline_insights(
        self,
        events: List[TimelineEvent],
        clusters: List[TimelineCluster]
    ) -> List[str]:
        """Generate AI insights about the timeline"""
        
        insights = []
        
        if not events:
            return insights
        
        # Memory frequency insight
        total_days = (max(event.date for event in events) - min(event.date for event in events)).days
        if total_days > 0:
            memories_per_day = len(events) / total_days
            if memories_per_day > 1:
                insights.append("This family is very active in creating memories!")
            elif memories_per_day > 0.1:
                insights.append("This family regularly captures special moments.")
        
        # Participant insights
        participant_counts = Counter(
            participant
            for event in events
            for participant in event.participants
        )
        
        if participant_counts:
            most_active = participant_counts.most_common(1)[0]
            insights.append(f"{most_active[0]} appears in the most memories ({most_active[1]} events)")
        
        # Location insights
        location_counts = Counter(
            event.location
            for event in events
            if event.location
        )
        
        if location_counts:
            favorite_location = location_counts.most_common(1)[0]
            insights.append(f"Most memories were created at {favorite_location[0]}")
        
        # Time pattern insights
        month_counts = Counter(event.date.month for event in events)
        if month_counts:
            busiest_month = month_counts.most_common(1)[0]
            month_name = datetime(2000, busiest_month[0], 1).strftime('%B')
            insights.append(f"{month_name} is the busiest month for family memories")
        
        return insights
    
    def _create_empty_timeline(self, family_group_id: str) -> FamilyTimeline:
        """Create empty timeline when no events found"""
        
        return FamilyTimeline(
            family_group_id=family_group_id,
            title="Family Timeline",
            date_range=(datetime.now(), datetime.now()),
            clusters=[],
            total_events=0,
            participants=[],
            generated_at=datetime.now(),
            ai_insights=["No memories found yet. Start creating some family memories!"]
        )
    
    async def _save_timeline(self, timeline: FamilyTimeline):
        """Save generated timeline to database"""
        
        try:
            # Convert timeline to JSON for storage
            timeline_data = {
                'family_group_id': timeline.family_group_id,
                'title': timeline.title,
                'date_range': [dt.isoformat() for dt in timeline.date_range],
                'clusters': [asdict(cluster) for cluster in timeline.clusters],
                'total_events': timeline.total_events,
                'participants': timeline.participants,
                'generated_at': timeline.generated_at.isoformat(),
                'ai_insights': timeline.ai_insights
            }
            
            # Save to database (using a simple approach - could be enhanced)
            with self.db.get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO ai_analysis_cache (content_hash, analysis_type, analysis_result, created_at)
                    VALUES (?, 'timeline', ?, ?)
                """, (
                    f"timeline_{timeline.family_group_id}_{timeline.generated_at.isoformat()}",
                    json.dumps(timeline_data),
                    timeline.generated_at.isoformat()
                ))
                conn.commit()
            
            logger.info(f"Timeline saved for family group: {timeline.family_group_id}")
            
        except Exception as e:
            logger.error(f"Error saving timeline: {e}")

# Global timeline engine instance
timeline_engine = MemoryTimelineEngine()

def get_timeline_engine() -> MemoryTimelineEngine:
    """Get the global timeline engine instance"""
    return timeline_engine