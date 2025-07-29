#!/usr/bin/env python3
"""
Intelligent Photo Clustering and Album Generation for Elmowafiplatform
Uses AI to automatically organize family photos into meaningful albums
"""

import os
import cv2
import numpy as np
import json
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional, Any
import logging
from sklearn.cluster import DBSCAN, KMeans
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.decomposition import PCA
import sqlite3
from collections import Counter, defaultdict

logger = logging.getLogger(__name__)

class PhotoClusteringEngine:
    """Intelligent photo clustering and album generation system"""
    
    def __init__(self, db_path: str = "data/elmowafiplatform.db"):
        self.db_path = db_path
        self.albums_dir = Path("data/albums")
        self.albums_dir.mkdir(parents=True, exist_ok=True)
        
        # Clustering parameters
        self.time_threshold_days = 7  # Days to consider photos as temporally related
        self.location_threshold_km = 5  # Kilometers to consider photos as spatially related
        self.face_similarity_threshold = 0.7
        self.min_album_size = 3
        self.max_album_size = 100
        
        # Feature extractors
        self.text_vectorizer = TfidfVectorizer(max_features=1000, stop_words='english')
        
        # Initialize database tables
        self._init_database()
    
    def _init_database(self):
        """Initialize database tables for albums"""
        try:
            conn = sqlite3.connect(self.db_path)
            
            # Albums table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS photo_albums (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    album_type TEXT NOT NULL, -- 'auto', 'manual', 'ai_suggested'
                    created_by TEXT, -- family_member_id or 'system'
                    cover_memory_id TEXT,
                    memory_ids TEXT NOT NULL, -- JSON array
                    clustering_features TEXT, -- JSON object with clustering metadata
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
            """)
            
            # Album clustering sessions
            conn.execute("""
                CREATE TABLE IF NOT EXISTS clustering_sessions (
                    id TEXT PRIMARY KEY,
                    algorithm TEXT NOT NULL,
                    parameters TEXT NOT NULL, -- JSON
                    memories_processed INTEGER NOT NULL,
                    albums_created INTEGER NOT NULL,
                    clustering_time TEXT NOT NULL,
                    quality_score REAL,
                    created_at TEXT NOT NULL
                )
            """)
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Error initializing album database: {e}")
    
    def analyze_memories_for_clustering(self, memories: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze memories to determine clustering potential"""
        if not memories:
            return {
                "can_cluster": False,
                "reason": "No memories to analyze",
                "memory_count": 0
            }
        
        # Analyze memory features
        has_images = sum(1 for m in memories if m.get("imageUrl"))
        has_locations = sum(1 for m in memories if m.get("location"))
        has_dates = sum(1 for m in memories if m.get("date"))
        has_family_members = sum(1 for m in memories if m.get("familyMembers"))
        has_tags = sum(1 for m in memories if m.get("tags"))
        
        # Calculate date range
        dates = [m.get("date") for m in memories if m.get("date")]
        date_range_days = 0
        if len(dates) > 1:
            dates_sorted = sorted(dates)
            start_date = datetime.fromisoformat(dates_sorted[0])
            end_date = datetime.fromisoformat(dates_sorted[-1])
            date_range_days = (end_date - start_date).days
        
        # Analyze clustering potential
        can_cluster = (
            len(memories) >= self.min_album_size and
            (has_images >= self.min_album_size or has_locations >= self.min_album_size)
        )
        
        clustering_features = []
        if has_images >= self.min_album_size:
            clustering_features.append("visual_similarity")
        if has_locations >= self.min_album_size:
            clustering_features.append("location_proximity")
        if has_dates >= self.min_album_size:
            clustering_features.append("temporal_proximity")
        if has_family_members >= self.min_album_size:
            clustering_features.append("family_member_similarity")
        if has_tags >= self.min_album_size:
            clustering_features.append("tag_similarity")
        
        return {
            "can_cluster": can_cluster,
            "memory_count": len(memories),
            "feature_availability": {
                "images": has_images,
                "locations": has_locations,
                "dates": has_dates,
                "family_members": has_family_members,
                "tags": has_tags
            },
            "clustering_features": clustering_features,
            "date_range_days": date_range_days,
            "recommended_algorithm": self._recommend_clustering_algorithm(clustering_features, len(memories))
        }
    
    def _recommend_clustering_algorithm(self, features: List[str], memory_count: int) -> str:
        """Recommend the best clustering algorithm based on available features"""
        if "temporal_proximity" in features and "location_proximity" in features:
            return "spatiotemporal"
        elif "family_member_similarity" in features and len(features) >= 3:
            return "multi_feature"
        elif "visual_similarity" in features and memory_count >= 20:
            return "visual_clustering"
        elif "temporal_proximity" in features:
            return "temporal"
        else:
            return "simple_grouping"
    
    def create_automatic_albums(self, memories: List[Dict[str, Any]], algorithm: str = "auto") -> Dict[str, Any]:
        """Create albums automatically using AI clustering"""
        try:
            # Analyze clustering potential
            analysis = self.analyze_memories_for_clustering(memories)
            if not analysis["can_cluster"]:
                return {
                    "success": False,
                    "error": analysis["reason"],
                    "albums_created": 0
                }
            
            # Use recommended algorithm if auto
            if algorithm == "auto":
                algorithm = analysis["recommended_algorithm"]
            
            # Perform clustering based on algorithm
            if algorithm == "spatiotemporal":
                clusters = self._spatiotemporal_clustering(memories)
            elif algorithm == "multi_feature":
                clusters = self._multi_feature_clustering(memories)
            elif algorithm == "visual_clustering":
                clusters = self._visual_clustering(memories)
            elif algorithm == "temporal":
                clusters = self._temporal_clustering(memories)
            else:
                clusters = self._simple_grouping(memories)
            
            # Create albums from clusters
            albums_created = []
            for i, cluster in enumerate(clusters):
                if len(cluster) >= self.min_album_size:
                    album = self._create_album_from_cluster(cluster, algorithm, i)
                    if album:
                        albums_created.append(album)
            
            # Log clustering session
            self._log_clustering_session(
                algorithm, 
                len(memories), 
                len(albums_created),
                self._calculate_clustering_quality(clusters, memories)
            )
            
            return {
                "success": True,
                "algorithm_used": algorithm,
                "memories_processed": len(memories),
                "albums_created": len(albums_created),
                "albums": albums_created,
                "clustering_analysis": analysis
            }
            
        except Exception as e:
            logger.error(f"Error creating automatic albums: {e}")
            return {
                "success": False,
                "error": str(e),
                "albums_created": 0
            }
    
    def _spatiotemporal_clustering(self, memories: List[Dict[str, Any]]) -> List[List[Dict]]:
        """Cluster memories based on space and time proximity"""
        clusters = []
        
        # Extract spatiotemporal features
        features = []
        valid_memories = []
        
        for memory in memories:
            if memory.get("date") and memory.get("location"):
                try:
                    date_obj = datetime.fromisoformat(memory["date"])
                    # Use location as a simple string for now (could be enhanced with geocoding)
                    location = memory["location"]
                    
                    # Create feature vector [day_of_year, location_hash]
                    day_of_year = date_obj.timetuple().tm_yday
                    location_hash = hash(location.lower()) % 1000  # Simple location encoding
                    
                    features.append([day_of_year, location_hash])
                    valid_memories.append(memory)
                    
                except Exception as e:
                    logger.warning(f"Error processing memory {memory.get('id')}: {e}")
        
        if len(valid_memories) < self.min_album_size:
            return []
        
        # Apply DBSCAN clustering
        features_array = np.array(features)
        
        # Normalize features
        from sklearn.preprocessing import StandardScaler
        scaler = StandardScaler()
        features_normalized = scaler.fit_transform(features_array)
        
        # Cluster
        clustering = DBSCAN(eps=0.5, min_samples=self.min_album_size)
        cluster_labels = clustering.fit_predict(features_normalized)
        
        # Group memories by cluster
        cluster_groups = defaultdict(list)
        for memory, label in zip(valid_memories, cluster_labels):
            if label != -1:  # Ignore noise points
                cluster_groups[label].append(memory)
        
        return list(cluster_groups.values())
    
    def _multi_feature_clustering(self, memories: List[Dict[str, Any]]) -> List[List[Dict]]:
        """Cluster using multiple features: family members, tags, location, time"""
        features = []
        valid_memories = []
        
        # Collect all unique family members and tags for encoding
        all_family_members = set()
        all_tags = set()
        all_locations = set()
        
        for memory in memories:
            all_family_members.update(memory.get("familyMembers", []))
            all_tags.update(memory.get("tags", []))
            if memory.get("location"):
                all_locations.add(memory["location"])
        
        family_members_list = list(all_family_members)
        tags_list = list(all_tags)
        locations_list = list(all_locations)
        
        # Create feature vectors
        for memory in memories:
            # Family member features (binary encoding)
            family_features = [1 if member in memory.get("familyMembers", []) else 0 
                             for member in family_members_list]
            
            # Tag features (binary encoding)
            tag_features = [1 if tag in memory.get("tags", []) else 0 
                           for tag in tags_list]
            
            # Location features (binary encoding)
            location_features = [1 if memory.get("location") == loc else 0 
                               for loc in locations_list]
            
            # Temporal features
            temporal_features = [0, 0]  # [month, season]
            if memory.get("date"):
                try:
                    date_obj = datetime.fromisoformat(memory["date"])
                    temporal_features[0] = date_obj.month / 12.0  # Normalize month
                    temporal_features[1] = (date_obj.month - 1) // 3 / 4.0  # Season
                except:
                    pass
            
            # Combine all features
            feature_vector = family_features + tag_features + location_features + temporal_features
            features.append(feature_vector)
            valid_memories.append(memory)
        
        if len(valid_memories) < self.min_album_size:
            return []
        
        # Apply K-means clustering
        n_clusters = min(max(2, len(valid_memories) // 5), 10)  # Adaptive cluster count
        
        features_array = np.array(features)
        clustering = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        cluster_labels = clustering.fit_predict(features_array)
        
        # Group memories by cluster
        cluster_groups = defaultdict(list)
        for memory, label in zip(valid_memories, cluster_labels):
            cluster_groups[label].append(memory)
        
        return [cluster for cluster in cluster_groups.values() if len(cluster) >= self.min_album_size]
    
    def _visual_clustering(self, memories: List[Dict[str, Any]]) -> List[List[Dict]]:
        """Cluster memories based on visual similarity (placeholder)"""
        # This would implement actual image similarity using deep learning features
        # For now, group by similar tags as a proxy
        
        tag_groups = defaultdict(list)
        
        for memory in memories:
            if memory.get("imageUrl") and memory.get("tags"):
                # Group by most common tag
                most_common_tag = Counter(memory["tags"]).most_common(1)[0][0]
                tag_groups[most_common_tag].append(memory)
            elif memory.get("imageUrl"):
                tag_groups["uncategorized"].append(memory)
        
        return [group for group in tag_groups.values() if len(group) >= self.min_album_size]
    
    def _temporal_clustering(self, memories: List[Dict[str, Any]]) -> List[List[Dict]]:
        """Cluster memories based on temporal proximity"""
        # Sort memories by date
        dated_memories = [m for m in memories if m.get("date")]
        dated_memories.sort(key=lambda x: x["date"])
        
        if not dated_memories:
            return []
        
        clusters = []
        current_cluster = [dated_memories[0]]
        
        for memory in dated_memories[1:]:
            try:
                current_date = datetime.fromisoformat(memory["date"])
                last_date = datetime.fromisoformat(current_cluster[-1]["date"])
                
                # If within time threshold, add to current cluster
                if (current_date - last_date).days <= self.time_threshold_days:
                    current_cluster.append(memory)
                else:
                    # Start new cluster if current one is large enough
                    if len(current_cluster) >= self.min_album_size:
                        clusters.append(current_cluster)
                    current_cluster = [memory]
                    
            except Exception as e:
                logger.warning(f"Error processing date for memory {memory.get('id')}: {e}")
        
        # Add final cluster if large enough
        if len(current_cluster) >= self.min_album_size:
            clusters.append(current_cluster)
        
        return clusters
    
    def _simple_grouping(self, memories: List[Dict[str, Any]]) -> List[List[Dict]]:
        """Simple grouping by common attributes"""
        # Group by location first, then by family members
        location_groups = defaultdict(list)
        
        for memory in memories:
            location = memory.get("location", "unknown")
            location_groups[location].append(memory)
        
        clusters = []
        for location, group in location_groups.items():
            if len(group) >= self.min_album_size:
                clusters.append(group)
            elif len(group) >= 2:
                # Try to merge with other small groups
                clusters.append(group)
        
        return clusters
    
    def _create_album_from_cluster(self, cluster: List[Dict], algorithm: str, cluster_index: int) -> Optional[Dict[str, Any]]:
        """Create an album from a cluster of memories"""
        try:
            # Generate album name based on cluster characteristics
            album_name = self._generate_album_name(cluster)
            album_description = self._generate_album_description(cluster, algorithm)
            
            # Select cover memory (most representative)
            cover_memory = self._select_cover_memory(cluster)
            
            # Create album data
            album_id = f"auto_{algorithm}_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{cluster_index}"
            
            album_data = {
                "id": album_id,
                "name": album_name,
                "description": album_description,
                "album_type": "auto",
                "created_by": "system",
                "cover_memory_id": cover_memory["id"] if cover_memory else None,
                "memory_ids": [m["id"] for m in cluster],
                "clustering_features": {
                    "algorithm": algorithm,
                    "cluster_size": len(cluster),
                    "date_range": self._get_date_range(cluster),
                    "locations": list(set(m.get("location") for m in cluster if m.get("location"))),
                    "family_members": list(set(member for m in cluster for member in m.get("familyMembers", []))),
                    "common_tags": self._get_common_tags(cluster)
                },
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
            
            # Save to database
            self._save_album_to_database(album_data)
            
            return album_data
            
        except Exception as e:
            logger.error(f"Error creating album from cluster: {e}")
            return None
    
    def _generate_album_name(self, cluster: List[Dict]) -> str:
        """Generate a meaningful name for the album"""
        # Analyze cluster characteristics
        locations = [m.get("location") for m in cluster if m.get("location")]
        tags = [tag for m in cluster for tag in m.get("tags", [])]
        dates = [m.get("date") for m in cluster if m.get("date")]
        
        # Most common location
        if locations:
            most_common_location = Counter(locations).most_common(1)[0][0]
            # Get date range if available
            if dates and len(dates) > 1:
                dates_sorted = sorted(dates)
                start_date = datetime.fromisoformat(dates_sorted[0])
                end_date = datetime.fromisoformat(dates_sorted[-1])
                
                # If same year, show months
                if start_date.year == end_date.year:
                    if start_date.month == end_date.month:
                        return f"{most_common_location} - {start_date.strftime('%B %Y')}"
                    else:
                        return f"{most_common_location} - {start_date.strftime('%B')} to {end_date.strftime('%B %Y')}"
                else:
                    return f"{most_common_location} - {start_date.year} to {end_date.year}"
            else:
                # Single date or no dates
                if dates:
                    date_obj = datetime.fromisoformat(dates[0])
                    return f"{most_common_location} - {date_obj.strftime('%B %Y')}"
                else:
                    return f"{most_common_location} Memories"
        
        # Most common tag if no location
        elif tags:
            most_common_tag = Counter(tags).most_common(1)[0][0]
            return f"{most_common_tag.title()} Collection"
        
        # Date-based name
        elif dates:
            dates_sorted = sorted(dates)
            start_date = datetime.fromisoformat(dates_sorted[0])
            if len(dates) == 1:
                return f"Memories from {start_date.strftime('%B %Y')}"
            else:
                end_date = datetime.fromisoformat(dates_sorted[-1])
                if start_date.year == end_date.year:
                    return f"Memories from {start_date.year}"
                else:
                    return f"Memories {start_date.year}-{end_date.year}"
        
        # Fallback
        return f"Family Album ({len(cluster)} memories)"
    
    def _generate_album_description(self, cluster: List[Dict], algorithm: str) -> str:
        """Generate description for the album"""
        locations = list(set(m.get("location") for m in cluster if m.get("location")))
        family_members = list(set(member for m in cluster for member in m.get("familyMembers", [])))
        tags = [tag for m in cluster for tag in m.get("tags", [])]
        common_tags = [tag for tag, count in Counter(tags).most_common(3)]
        
        description_parts = [f"Automatically created album with {len(cluster)} memories"]
        
        if locations:
            if len(locations) == 1:
                description_parts.append(f"from {locations[0]}")
            else:
                description_parts.append(f"from {len(locations)} locations including {', '.join(locations[:2])}")
        
        if common_tags:
            description_parts.append(f"featuring {', '.join(common_tags)}")
        
        if family_members:
            description_parts.append(f"with {len(family_members)} family members")
        
        return ". ".join(description_parts) + "."
    
    def _select_cover_memory(self, cluster: List[Dict]) -> Optional[Dict]:
        """Select the most representative memory as album cover"""
        # Prefer memories with images
        image_memories = [m for m in cluster if m.get("imageUrl")]
        if image_memories:
            # Prefer memories with more family members
            image_memories.sort(key=lambda x: len(x.get("familyMembers", [])), reverse=True)
            return image_memories[0]
        
        # Fallback to any memory
        return cluster[0] if cluster else None
    
    def _get_date_range(self, cluster: List[Dict]) -> Dict[str, str]:
        """Get date range for cluster"""
        dates = [m.get("date") for m in cluster if m.get("date")]
        if not dates:
            return {"start": None, "end": None}
        
        dates_sorted = sorted(dates)
        return {"start": dates_sorted[0], "end": dates_sorted[-1]}
    
    def _get_common_tags(self, cluster: List[Dict]) -> List[str]:
        """Get most common tags in cluster"""
        tags = [tag for m in cluster for tag in m.get("tags", [])]
        return [tag for tag, count in Counter(tags).most_common(5)]
    
    def _calculate_clustering_quality(self, clusters: List[List[Dict]], memories: List[Dict]) -> float:
        """Calculate quality score for clustering results"""
        if not clusters:
            return 0.0
        
        # Calculate silhouette-like score based on intra-cluster similarity
        total_memories = len(memories)
        clustered_memories = sum(len(cluster) for cluster in clusters)
        
        # Coverage score
        coverage_score = clustered_memories / total_memories
        
        # Size distribution score (prefer balanced cluster sizes)
        cluster_sizes = [len(cluster) for cluster in clusters]
        size_variance = np.var(cluster_sizes) if len(cluster_sizes) > 1 else 0
        max_size = max(cluster_sizes) if cluster_sizes else 1
        size_score = 1.0 / (1.0 + size_variance / max_size)
        
        # Combine scores
        quality_score = (coverage_score * 0.7) + (size_score * 0.3)
        return min(1.0, quality_score)
    
    def _save_album_to_database(self, album_data: Dict[str, Any]):
        """Save album to database"""
        try:
            conn = sqlite3.connect(self.db_path)
            
            conn.execute("""
                INSERT INTO photo_albums 
                (id, name, description, album_type, created_by, cover_memory_id, 
                 memory_ids, clustering_features, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                album_data["id"],
                album_data["name"],
                album_data["description"],
                album_data["album_type"],
                album_data["created_by"],
                album_data["cover_memory_id"],
                json.dumps(album_data["memory_ids"]),
                json.dumps(album_data["clustering_features"]),
                album_data["created_at"],
                album_data["updated_at"]
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Error saving album to database: {e}")
    
    def _log_clustering_session(self, algorithm: str, memories_count: int, albums_count: int, quality_score: float):
        """Log clustering session results"""
        try:
            conn = sqlite3.connect(self.db_path)
            
            session_id = f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            conn.execute("""
                INSERT INTO clustering_sessions 
                (id, algorithm, parameters, memories_processed, albums_created, 
                 clustering_time, quality_score, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                session_id,
                algorithm,
                json.dumps({"min_album_size": self.min_album_size}),
                memories_count,
                albums_count,
                datetime.now().isoformat(),
                quality_score,
                datetime.now().isoformat()
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Error logging clustering session: {e}")
    
    def get_albums(self, album_type: str = None) -> List[Dict[str, Any]]:
        """Get albums from database"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            
            query = "SELECT * FROM photo_albums"
            params = []
            
            if album_type:
                query += " WHERE album_type = ?"
                params.append(album_type)
            
            query += " ORDER BY created_at DESC"
            
            cursor = conn.execute(query, params)
            albums = []
            
            for row in cursor.fetchall():
                album = {
                    "id": row["id"],
                    "name": row["name"],
                    "description": row["description"],
                    "album_type": row["album_type"],
                    "created_by": row["created_by"],
                    "cover_memory_id": row["cover_memory_id"],
                    "memory_ids": json.loads(row["memory_ids"]),
                    "clustering_features": json.loads(row["clustering_features"]) if row["clustering_features"] else {},
                    "created_at": row["created_at"],
                    "updated_at": row["updated_at"]
                }
                albums.append(album)
            
            conn.close()
            return albums
            
        except Exception as e:
            logger.error(f"Error getting albums: {e}")
            return []
    
    def get_clustering_history(self) -> List[Dict[str, Any]]:
        """Get clustering session history"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            
            cursor = conn.execute("""
                SELECT * FROM clustering_sessions 
                ORDER BY created_at DESC 
                LIMIT 20
            """)
            
            history = []
            for row in cursor.fetchall():
                session = {
                    "id": row["id"],
                    "algorithm": row["algorithm"],
                    "parameters": json.loads(row["parameters"]),
                    "memories_processed": row["memories_processed"],
                    "albums_created": row["albums_created"],
                    "clustering_time": row["clustering_time"],
                    "quality_score": row["quality_score"],
                    "created_at": row["created_at"]
                }
                history.append(session)
            
            conn.close()
            return history
            
        except Exception as e:
            logger.error(f"Error getting clustering history: {e}")
            return []
    
    def suggest_new_albums(self, memories: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Suggest new albums that could be created from unclustered memories"""
        try:
            # Get existing albums
            existing_albums = self.get_albums()
            existing_memory_ids = set()
            
            for album in existing_albums:
                existing_memory_ids.update(album["memory_ids"])
            
            # Find unclustered memories
            unclustered_memories = [m for m in memories if m["id"] not in existing_memory_ids]
            
            if not unclustered_memories:
                return {
                    "suggestions": [],
                    "unclustered_count": 0,
                    "message": "All memories are already organized into albums"
                }
            
            # Analyze unclustered memories
            analysis = self.analyze_memories_for_clustering(unclustered_memories)
            
            # Generate suggestions
            suggestions = []
            
            if analysis["can_cluster"]:
                # Suggest automatic clustering
                suggestions.append({
                    "type": "automatic_clustering",
                    "title": f"Auto-organize {len(unclustered_memories)} memories",
                    "description": f"Create albums automatically using {analysis['recommended_algorithm']} algorithm",
                    "algorithm": analysis["recommended_algorithm"],
                    "memory_count": len(unclustered_memories),
                    "estimated_albums": max(1, len(unclustered_memories) // 5)
                })
            
            # Suggest manual groupings based on patterns
            location_groups = defaultdict(list)
            time_groups = defaultdict(list)
            tag_groups = defaultdict(list)
            
            for memory in unclustered_memories:
                if memory.get("location"):
                    location_groups[memory["location"]].append(memory)
                
                if memory.get("date"):
                    try:
                        date_obj = datetime.fromisoformat(memory["date"])
                        month_year = f"{date_obj.strftime('%B %Y')}"
                        time_groups[month_year].append(memory)
                    except:
                        pass
                
                for tag in memory.get("tags", []):
                    tag_groups[tag].append(memory)
            
            # Suggest location-based albums
            for location, group in location_groups.items():
                if len(group) >= self.min_album_size:
                    suggestions.append({
                        "type": "location_album",
                        "title": f"{location} Album",
                        "description": f"Create album for {len(group)} memories from {location}",
                        "memory_count": len(group),
                        "criteria": {"location": location}
                    })
            
            # Suggest time-based albums
            for time_period, group in time_groups.items():
                if len(group) >= self.min_album_size:
                    suggestions.append({
                        "type": "time_album",
                        "title": f"{time_period} Memories",
                        "description": f"Create album for {len(group)} memories from {time_period}",
                        "memory_count": len(group),
                        "criteria": {"time_period": time_period}
                    })
            
            # Suggest tag-based albums
            for tag, group in tag_groups.items():
                if len(group) >= self.min_album_size:
                    suggestions.append({
                        "type": "tag_album",
                        "title": f"{tag.title()} Collection",
                        "description": f"Create album for {len(group)} memories tagged with '{tag}'",
                        "memory_count": len(group),
                        "criteria": {"tag": tag}
                    })
            
            return {
                "suggestions": suggestions[:10],  # Limit to top 10 suggestions
                "unclustered_count": len(unclustered_memories),
                "clustering_analysis": analysis
            }
            
        except Exception as e:
            logger.error(f"Error generating album suggestions: {e}")
            return {
                "suggestions": [],
                "unclustered_count": 0,
                "error": str(e)
            }

# Global clustering engine instance
photo_clustering_engine = PhotoClusteringEngine()