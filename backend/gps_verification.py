#!/usr/bin/env python3
"""
GPS-based Location Verification System for Elmowafiplatform Travel Games
Enables location-based challenges, treasure hunts, and real-world game mechanics
"""

import math
import json
import sqlite3
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional, Any
import logging
from pathlib import Path
import asyncio
import cv2
import numpy as np
from PIL import Image, ExifTags
import requests
import uuid

logger = logging.getLogger(__name__)

class GPSLocationVerifier:
    """GPS-based location verification for travel games and challenges"""
    
    def __init__(self, db_path: str = "data/elmowafiplatform.db"):
        self.db_path = db_path
        self.verification_radius_meters = 50  # Default verification radius
        self.spoofing_detection_enabled = True
        self.location_history = {}  # player_id -> list of locations
        self.verification_cache = {}  # Cache for recent verifications
        
        # Initialize database tables
        self._init_database()
    
    def _init_database(self):
        """Initialize database tables for GPS verification"""
        try:
            conn = sqlite3.connect(self.db_path)
            
            # Location verifications table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS location_verifications (
                    id TEXT PRIMARY KEY,
                    player_id TEXT NOT NULL,
                    game_session_id TEXT NOT NULL,
                    challenge_id TEXT,
                    target_latitude REAL NOT NULL,
                    target_longitude REAL NOT NULL,
                    actual_latitude REAL NOT NULL,
                    actual_longitude REAL NOT NULL,
                    distance_meters REAL NOT NULL,
                    verification_status TEXT NOT NULL, -- 'verified', 'failed', 'suspicious'
                    verification_method TEXT NOT NULL, -- 'gps', 'photo_geo', 'manual'
                    confidence_score REAL NOT NULL,
                    timestamp TEXT NOT NULL,
                    photo_evidence TEXT, -- Path to verification photo
                    metadata TEXT -- JSON with additional verification data
                )
            """)
            
            # GPS spoofing detection logs
            conn.execute("""
                CREATE TABLE IF NOT EXISTS gps_spoofing_detection (
                    id TEXT PRIMARY KEY,
                    player_id TEXT NOT NULL,
                    game_session_id TEXT NOT NULL,
                    latitude REAL NOT NULL,
                    longitude REAL NOT NULL,
                    suspicious_indicators TEXT NOT NULL, -- JSON array
                    detection_confidence REAL NOT NULL,
                    timestamp TEXT NOT NULL,
                    action_taken TEXT -- 'flagged', 'blocked', 'warning'
                )
            """)
            
            # Location challenges table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS location_challenges (
                    id TEXT PRIMARY KEY,
                    game_session_id TEXT NOT NULL,
                    challenge_name TEXT NOT NULL,
                    target_location TEXT NOT NULL, -- Human readable location
                    target_latitude REAL NOT NULL,
                    target_longitude REAL NOT NULL,
                    verification_radius REAL NOT NULL,
                    challenge_type TEXT NOT NULL, -- 'reach_point', 'photo_at_location', 'treasure_hunt'
                    requirements TEXT, -- JSON with challenge requirements
                    points_reward INTEGER NOT NULL,
                    time_limit_minutes INTEGER,
                    created_at TEXT NOT NULL,
                    status TEXT NOT NULL -- 'active', 'completed', 'expired'
                )
            """)
            
            # Player location history for spoofing detection
            conn.execute("""
                CREATE TABLE IF NOT EXISTS player_location_history (
                    id TEXT PRIMARY KEY,
                    player_id TEXT NOT NULL,
                    latitude REAL NOT NULL,
                    longitude REAL NOT NULL,
                    accuracy_meters REAL,
                    altitude REAL,
                    speed_mps REAL,
                    bearing_degrees REAL,
                    timestamp TEXT NOT NULL,
                    source TEXT NOT NULL -- 'gps', 'network', 'passive'
                )
            """)
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Error initializing GPS verification database: {e}")
    
    def calculate_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate distance between two GPS coordinates using Haversine formula"""
        # Convert latitude and longitude from degrees to radians
        lat1_rad = math.radians(lat1)
        lon1_rad = math.radians(lon1)
        lat2_rad = math.radians(lat2)
        lon2_rad = math.radians(lon2)
        
        # Haversine formula
        dlat = lat2_rad - lat1_rad
        dlon = lon2_rad - lon1_rad
        
        a = (math.sin(dlat/2)**2 + 
             math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon/2)**2)
        c = 2 * math.asin(math.sqrt(a))
        
        # Earth's radius in meters
        earth_radius = 6371000
        
        return earth_radius * c
    
    async def verify_location(
        self,
        player_id: str,
        game_session_id: str,
        target_lat: float,
        target_lon: float,
        actual_lat: float,
        actual_lon: float,
        challenge_id: str = None,
        photo_evidence: str = None,
        gps_metadata: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Verify player location against target coordinates"""
        
        try:
            verification_id = str(uuid.uuid4())
            timestamp = datetime.now().isoformat()
            
            # Calculate distance between target and actual location
            distance_meters = self.calculate_distance(target_lat, target_lon, actual_lat, actual_lon)
            
            # Determine verification status
            verification_status = "verified" if distance_meters <= self.verification_radius_meters else "failed"
            confidence_score = max(0.0, 1.0 - (distance_meters / (self.verification_radius_meters * 2)))
            
            # Check for GPS spoofing if enabled
            spoofing_result = None
            if self.spoofing_detection_enabled:
                spoofing_result = await self._detect_gps_spoofing(
                    player_id, actual_lat, actual_lon, gps_metadata
                )
                
                if spoofing_result["is_suspicious"]:
                    verification_status = "suspicious"
                    confidence_score *= 0.3  # Reduce confidence for suspicious locations
            
            # Enhanced verification with photo evidence
            photo_verification = None
            if photo_evidence:
                photo_verification = await self._verify_photo_location(
                    photo_evidence, target_lat, target_lon
                )
                
                if photo_verification["location_match"]:
                    confidence_score = min(1.0, confidence_score + 0.3)  # Boost confidence
                    if verification_status == "failed" and photo_verification["confidence"] > 0.7:
                        verification_status = "verified"  # Override failed GPS with good photo
            
            # Store verification record
            verification_record = {
                "id": verification_id,
                "player_id": player_id,
                "game_session_id": game_session_id,
                "challenge_id": challenge_id,
                "target_latitude": target_lat,
                "target_longitude": target_lon,
                "actual_latitude": actual_lat,
                "actual_longitude": actual_lon,
                "distance_meters": distance_meters,
                "verification_status": verification_status,
                "verification_method": "gps" + ("_photo" if photo_evidence else ""),
                "confidence_score": confidence_score,
                "timestamp": timestamp,
                "photo_evidence": photo_evidence,
                "metadata": json.dumps({
                    "spoofing_check": spoofing_result,
                    "photo_verification": photo_verification,
                    "gps_metadata": gps_metadata
                })
            }
            
            await self._store_verification_record(verification_record)
            
            # Store location in player history for spoofing detection
            await self._store_location_history(player_id, actual_lat, actual_lon, gps_metadata)
            
            return {
                "verification_id": verification_id,
                "status": verification_status,
                "distance_meters": distance_meters,
                "confidence_score": confidence_score,
                "within_radius": distance_meters <= self.verification_radius_meters,
                "spoofing_detected": spoofing_result["is_suspicious"] if spoofing_result else False,
                "photo_verified": photo_verification["location_match"] if photo_verification else None,
                "timestamp": timestamp
            }
            
        except Exception as e:
            logger.error(f"Error verifying location: {e}")
            return {
                "verification_id": None,
                "status": "error",
                "error": str(e),
                "distance_meters": None,
                "confidence_score": 0.0
            }
    
    async def _detect_gps_spoofing(
        self,
        player_id: str,
        latitude: float,
        longitude: float,
        gps_metadata: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Detect potential GPS spoofing using various heuristics"""
        
        suspicious_indicators = []
        detection_confidence = 0.0
        
        # Get player's recent location history
        recent_locations = await self._get_recent_locations(player_id, minutes=30)
        
        if len(recent_locations) >= 2:
            # Check for impossible travel speeds
            last_location = recent_locations[0]
            time_diff = (datetime.now() - datetime.fromisoformat(last_location["timestamp"])).total_seconds()
            
            if time_diff > 0:
                distance = self.calculate_distance(
                    last_location["latitude"], last_location["longitude"],
                    latitude, longitude
                )
                speed_mps = distance / time_diff
                speed_kmh = speed_mps * 3.6
                
                # Flag impossibly fast travel (>500 km/h)
                if speed_kmh > 500:
                    suspicious_indicators.append(f"impossible_speed: {speed_kmh:.1f} km/h")
                    detection_confidence += 0.8
                
                # Flag very fast travel without reasonable explanation (>120 km/h)
                elif speed_kmh > 120:
                    suspicious_indicators.append(f"very_fast_travel: {speed_kmh:.1f} km/h")
                    detection_confidence += 0.4
        
        # Check GPS metadata for spoofing indicators
        if gps_metadata:
            # Low accuracy or missing accuracy
            accuracy = gps_metadata.get("accuracy_meters")
            if accuracy is None or accuracy > 100:
                suspicious_indicators.append("poor_gps_accuracy")
                detection_confidence += 0.2
            
            # Repeated identical coordinates
            if len(recent_locations) >= 3:
                identical_count = sum(1 for loc in recent_locations[:3] 
                                    if abs(loc["latitude"] - latitude) < 0.0001 
                                    and abs(loc["longitude"] - longitude) < 0.0001)
                if identical_count >= 2:
                    suspicious_indicators.append("identical_coordinates")
                    detection_confidence += 0.3
            
            # Check for mock location settings (Android)
            if gps_metadata.get("mock_location", False):
                suspicious_indicators.append("mock_location_enabled")
                detection_confidence += 0.9
            
            # Check provider consistency
            provider = gps_metadata.get("provider", "")
            if provider in ["mock", "test", "simulator"]:
                suspicious_indicators.append(f"suspicious_provider: {provider}")
                detection_confidence += 0.7
        
        # Check for location patterns that suggest spoofing
        if len(recent_locations) >= 5:
            # Check for perfect grid patterns or geometric shapes
            lats = [loc["latitude"] for loc in recent_locations[:5]] + [latitude]
            lons = [loc["longitude"] for loc in recent_locations[:5]] + [longitude]
            
            # Check for suspiciously regular patterns
            lat_diffs = [abs(lats[i+1] - lats[i]) for i in range(len(lats)-1)]
            lon_diffs = [abs(lons[i+1] - lons[i]) for i in range(len(lons)-1)]
            
            # If all differences are very similar, it might be programmatic
            if len(set(round(diff, 6) for diff in lat_diffs)) == 1:
                suspicious_indicators.append("geometric_pattern")
                detection_confidence += 0.5
        
        is_suspicious = detection_confidence > 0.5
        
        # Log suspicious activity
        if is_suspicious:
            await self._log_spoofing_detection(
                player_id, latitude, longitude, suspicious_indicators, detection_confidence
            )
        
        return {
            "is_suspicious": is_suspicious,
            "confidence": min(1.0, detection_confidence),
            "indicators": suspicious_indicators
        }
    
    async def _verify_photo_location(
        self,
        photo_path: str,
        target_lat: float,
        target_lon: float
    ) -> Dict[str, Any]:
        """Verify location using photo EXIF data and visual analysis"""
        
        try:
            # Extract GPS data from photo EXIF
            exif_location = self._extract_gps_from_exif(photo_path)
            
            location_match = False
            confidence = 0.0
            
            if exif_location:
                photo_lat, photo_lon = exif_location
                distance = self.calculate_distance(target_lat, target_lon, photo_lat, photo_lon)
                
                # Consider it a match if within 200m (larger radius for photo verification)
                if distance <= 200:
                    location_match = True
                    confidence = max(0.5, 1.0 - (distance / 400))
            
            # Additional visual verification could be added here
            # (landmark recognition, visual similarity, etc.)
            
            return {
                "location_match": location_match,
                "confidence": confidence,
                "exif_coordinates": exif_location,
                "verification_method": "exif_gps"
            }
            
        except Exception as e:
            logger.error(f"Error verifying photo location: {e}")
            return {
                "location_match": False,
                "confidence": 0.0,
                "error": str(e)
            }
    
    def _extract_gps_from_exif(self, photo_path: str) -> Optional[Tuple[float, float]]:
        """Extract GPS coordinates from photo EXIF data"""
        try:
            image = Image.open(photo_path)
            exif_data = image._getexif()
            
            if not exif_data:
                return None
            
            gps_info = {}
            for tag, value in exif_data.items():
                decoded = ExifTags.TAGS.get(tag, tag)
                if decoded == "GPSInfo":
                    for t in value:
                        sub_decoded = ExifTags.GPSTAGS.get(t, t)
                        gps_info[sub_decoded] = value[t]
            
            if "GPSLatitude" in gps_info and "GPSLongitude" in gps_info:
                lat = self._convert_to_degrees(gps_info["GPSLatitude"])
                lon = self._convert_to_degrees(gps_info["GPSLongitude"])
                
                # Apply hemisphere corrections
                if gps_info.get("GPSLatitudeRef") == "S":
                    lat = -lat
                if gps_info.get("GPSLongitudeRef") == "W":
                    lon = -lon
                
                return (lat, lon)
            
            return None
            
        except Exception as e:
            logger.error(f"Error extracting GPS from EXIF: {e}")
            return None
    
    def _convert_to_degrees(self, value):
        """Convert GPS coordinates from EXIF format to decimal degrees"""
        d, m, s = value
        return d + (m / 60.0) + (s / 3600.0)
    
    async def create_location_challenge(
        self,
        game_session_id: str,
        challenge_name: str,
        target_location: str,
        target_lat: float,
        target_lon: float,
        challenge_type: str = "reach_point",
        points_reward: int = 100,
        time_limit_minutes: int = 60,
        verification_radius: float = None,
        requirements: Dict[str, Any] = None
    ) -> str:
        """Create a new location-based challenge"""
        
        challenge_id = str(uuid.uuid4())
        
        try:
            conn = sqlite3.connect(self.db_path)
            
            conn.execute("""
                INSERT INTO location_challenges
                (id, game_session_id, challenge_name, target_location, target_latitude, 
                 target_longitude, verification_radius, challenge_type, requirements, 
                 points_reward, time_limit_minutes, created_at, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                challenge_id,
                game_session_id,
                challenge_name,
                target_location,
                target_lat,
                target_lon,
                verification_radius or self.verification_radius_meters,
                challenge_type,
                json.dumps(requirements or {}),
                points_reward,
                time_limit_minutes,
                datetime.now().isoformat(),
                "active"
            ))
            
            conn.commit()
            conn.close()
            
            logger.info(f"Created location challenge: {challenge_name} at {target_location}")
            return challenge_id
            
        except Exception as e:
            logger.error(f"Error creating location challenge: {e}")
            return None
    
    async def get_active_challenges(self, game_session_id: str) -> List[Dict[str, Any]]:
        """Get all active location challenges for a game session"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            
            cursor = conn.execute("""
                SELECT * FROM location_challenges 
                WHERE game_session_id = ? AND status = 'active'
                ORDER BY created_at DESC
            """, (game_session_id,))
            
            challenges = []
            for row in cursor.fetchall():
                challenge = {
                    "id": row["id"],
                    "challenge_name": row["challenge_name"],
                    "target_location": row["target_location"],
                    "target_latitude": row["target_latitude"],
                    "target_longitude": row["target_longitude"],
                    "verification_radius": row["verification_radius"],
                    "challenge_type": row["challenge_type"],
                    "requirements": json.loads(row["requirements"]) if row["requirements"] else {},
                    "points_reward": row["points_reward"],
                    "time_limit_minutes": row["time_limit_minutes"],
                    "created_at": row["created_at"],
                    "status": row["status"]
                }
                challenges.append(challenge)
            
            conn.close()
            return challenges
            
        except Exception as e:
            logger.error(f"Error getting active challenges: {e}")
            return []
    
    async def complete_challenge(
        self,
        challenge_id: str,
        player_id: str,
        verification_result: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Complete a location challenge with verification result"""
        
        try:
            if verification_result["status"] != "verified":
                return {
                    "success": False,
                    "reason": "Location verification failed",
                    "verification_status": verification_result["status"]
                }
            
            # Get challenge details
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            
            cursor = conn.execute(
                "SELECT * FROM location_challenges WHERE id = ?", 
                (challenge_id,)
            )
            challenge = cursor.fetchone()
            
            if not challenge:
                return {"success": False, "reason": "Challenge not found"}
            
            if challenge["status"] != "active":
                return {"success": False, "reason": "Challenge is not active"}
            
            # Check time limit
            created_at = datetime.fromisoformat(challenge["created_at"])
            time_limit = timedelta(minutes=challenge["time_limit_minutes"])
            
            if datetime.now() > created_at + time_limit:
                # Mark challenge as expired
                conn.execute(
                    "UPDATE location_challenges SET status = 'expired' WHERE id = ?",
                    (challenge_id,)
                )
                conn.commit()
                return {"success": False, "reason": "Challenge time limit exceeded"}
            
            # Mark challenge as completed
            conn.execute(
                "UPDATE location_challenges SET status = 'completed' WHERE id = ?",
                (challenge_id,)
            )
            conn.commit()
            conn.close()
            
            return {
                "success": True,
                "points_awarded": challenge["points_reward"],
                "challenge_name": challenge["challenge_name"],
                "completion_time": datetime.now().isoformat(),
                "verification_confidence": verification_result["confidence_score"]
            }
            
        except Exception as e:
            logger.error(f"Error completing challenge: {e}")
            return {"success": False, "reason": str(e)}
    
    async def get_verification_history(
        self, 
        player_id: str = None, 
        game_session_id: str = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Get location verification history"""
        
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            
            query = "SELECT * FROM location_verifications"
            params = []
            where_clauses = []
            
            if player_id:
                where_clauses.append("player_id = ?")
                params.append(player_id)
            
            if game_session_id:
                where_clauses.append("game_session_id = ?")
                params.append(game_session_id)
            
            if where_clauses:
                query += " WHERE " + " AND ".join(where_clauses)
            
            query += " ORDER BY timestamp DESC LIMIT ?"
            params.append(limit)
            
            cursor = conn.execute(query, params)
            verifications = []
            
            for row in cursor.fetchall():
                verification = {
                    "id": row["id"],
                    "player_id": row["player_id"],
                    "game_session_id": row["game_session_id"],
                    "challenge_id": row["challenge_id"],
                    "distance_meters": row["distance_meters"],
                    "verification_status": row["verification_status"],
                    "confidence_score": row["confidence_score"],
                    "timestamp": row["timestamp"],
                    "photo_evidence": row["photo_evidence"] is not None
                }
                verifications.append(verification)
            
            conn.close()
            return verifications
            
        except Exception as e:
            logger.error(f"Error getting verification history: {e}")
            return []
    
    async def _store_verification_record(self, record: Dict[str, Any]):
        """Store verification record in database"""
        try:
            conn = sqlite3.connect(self.db_path)
            
            conn.execute("""
                INSERT INTO location_verifications
                (id, player_id, game_session_id, challenge_id, target_latitude, target_longitude,
                 actual_latitude, actual_longitude, distance_meters, verification_status,
                 verification_method, confidence_score, timestamp, photo_evidence, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                record["id"], record["player_id"], record["game_session_id"], 
                record["challenge_id"], record["target_latitude"], record["target_longitude"],
                record["actual_latitude"], record["actual_longitude"], record["distance_meters"],
                record["verification_status"], record["verification_method"], 
                record["confidence_score"], record["timestamp"], record["photo_evidence"],
                record["metadata"]
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Error storing verification record: {e}")
    
    async def _store_location_history(
        self, 
        player_id: str, 
        latitude: float, 
        longitude: float, 
        metadata: Dict[str, Any] = None
    ):
        """Store player location in history for spoofing detection"""
        try:
            conn = sqlite3.connect(self.db_path)
            
            conn.execute("""
                INSERT INTO player_location_history
                (id, player_id, latitude, longitude, accuracy_meters, altitude, 
                 speed_mps, bearing_degrees, timestamp, source)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                str(uuid.uuid4()),
                player_id,
                latitude,
                longitude,
                metadata.get("accuracy_meters") if metadata else None,
                metadata.get("altitude") if metadata else None,
                metadata.get("speed_mps") if metadata else None,
                metadata.get("bearing_degrees") if metadata else None,
                datetime.now().isoformat(),
                metadata.get("provider", "gps") if metadata else "gps"
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Error storing location history: {e}")
    
    async def _get_recent_locations(self, player_id: str, minutes: int) -> List[Dict[str, Any]]:
        """Get player's recent location history"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            
            cutoff_time = datetime.now() - timedelta(minutes=minutes)
            
            cursor = conn.execute("""
                SELECT * FROM player_location_history 
                WHERE player_id = ? AND timestamp > ?
                ORDER BY timestamp DESC
            """, (player_id, cutoff_time.isoformat()))
            
            locations = []
            for row in cursor.fetchall():
                location = {
                    "latitude": row["latitude"],
                    "longitude": row["longitude"],
                    "timestamp": row["timestamp"],
                    "accuracy_meters": row["accuracy_meters"],
                    "source": row["source"]
                }
                locations.append(location)
            
            conn.close()
            return locations
            
        except Exception as e:
            logger.error(f"Error getting recent locations: {e}")
            return []
    
    async def _log_spoofing_detection(
        self,
        player_id: str,
        latitude: float,
        longitude: float,
        indicators: List[str],
        confidence: float
    ):
        """Log GPS spoofing detection"""
        try:
            conn = sqlite3.connect(self.db_path)
            
            action_taken = "flagged"
            if confidence > 0.8:
                action_taken = "blocked"
            elif confidence > 0.6:
                action_taken = "warning"
            
            conn.execute("""
                INSERT INTO gps_spoofing_detection
                (id, player_id, game_session_id, latitude, longitude, 
                 suspicious_indicators, detection_confidence, timestamp, action_taken)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                str(uuid.uuid4()),
                player_id,
                "",  # We don't always have game_session_id during detection
                latitude,
                longitude,
                json.dumps(indicators),
                confidence,
                datetime.now().isoformat(),
                action_taken
            ))
            
            conn.commit()
            conn.close()
            
            logger.warning(f"GPS spoofing detected for player {player_id}: {indicators}")
            
        except Exception as e:
            logger.error(f"Error logging spoofing detection: {e}")

# Global GPS verification instance
gps_verifier = GPSLocationVerifier()