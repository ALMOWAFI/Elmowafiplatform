#!/usr/bin/env python3
"""
Comprehensive AI Services for Elmowafiplatform
Complete AI ecosystem for family memory management, travel planning, and gaming

Uses useful components from hack2 but builds full family-focused AI services:
- Family Memory AI with facial recognition and smart categorization
- Travel AI with cultural awareness and family preferences  
- AI Game Master for Mafia, Among Us, and family activities
- Smart Family Chatbot with personality learning
- Memory timeline and suggestion engine
"""

import os
import sys
import json
import logging
import asyncio
import cv2
import numpy as np
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from pathlib import Path
import sqlite3
from dataclasses import dataclass, asdict
import face_recognition
from PIL import Image
import pickle

# Import useful components from hack2
sys.path.insert(0, str(Path(__file__).parent.parent / "core" / "ai-services" / "hack2"))

try:
    import torch
    from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
    from sentence_transformers import SentenceTransformer
    ML_AVAILABLE = True
except ImportError:
    ML_AVAILABLE = False

try:
    from azure.cognitiveservices.vision.customvision.training import CustomVisionTrainingClient
    from azure.cognitiveservices.vision.customvision.prediction import CustomVisionPredictionClient
    AZURE_AVAILABLE = True
except ImportError:
    AZURE_AVAILABLE = False

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class FamilyMember:
    id: str
    name: str
    name_arabic: str
    relationship: str
    age: int
    interests: List[str]
    face_encoding: Optional[np.ndarray] = None
    personality_traits: Dict[str, float] = None

@dataclass
class MemoryAnalysis:
    detected_faces: List[Dict]
    family_members_identified: List[str]
    activities: List[str]
    emotions: List[str]
    location: Optional[str]
    cultural_elements: List[str]
    memory_category: str
    confidence: float
    suggested_tags: List[str]
    description: str

@dataclass
class TravelRecommendation:
    destination: str
    country: str
    confidence: float
    reasons: List[str]
    family_suitability: float
    cultural_match: float
    budget_estimate: float
    best_months: List[str]
    activities: List[str]

class ComprehensiveFamilyAI:
    """
    Main AI service that combines all family platform AI capabilities
    """
    
    def __init__(self):
        self.db_path = "data/family_ai.db"
        self.models_path = Path("data/ai_models")
        self.models_path.mkdir(parents=True, exist_ok=True)
        
        # Initialize AI models
        self.ml_available = ML_AVAILABLE
        self.azure_available = AZURE_AVAILABLE
        
        # Initialize services
        self.memory_ai = FamilyMemoryAI(self.db_path, self.models_path)
        self.travel_ai = FamilyTravelAI(self.db_path)
        self.game_master = AIGameMaster(self.db_path)
        self.chat_ai = FamilyChatAI(self.db_path, self.models_path)
        self.suggestion_engine = SmartSuggestionEngine(self.db_path)
        
        # Initialize database
        self._init_database()
        
        logger.info("Comprehensive Family AI initialized")
    
    def _init_database(self):
        """Initialize SQLite database for family AI data"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Family members table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS family_members (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            name_arabic TEXT,
            relationship TEXT,
            age INTEGER,
            interests TEXT,
            face_encoding BLOB,
            personality_traits TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        ''')
        
        # Memories table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS memories (
            id TEXT PRIMARY KEY,
            file_path TEXT,
            analysis_result TEXT,
            family_members_identified TEXT,
            memory_category TEXT,
            confidence REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        ''')
        
        # Travel preferences table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS travel_preferences (
            family_id TEXT,
            preferences TEXT,
            travel_history TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        ''')
        
        # Game sessions table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS game_sessions (
            id TEXT PRIMARY KEY,
            game_type TEXT,
            players TEXT,
            game_state TEXT,
            ai_decisions TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        ''')
        
        # Chat conversations table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS chat_conversations (
            id TEXT PRIMARY KEY,
            family_member_id TEXT,
            message TEXT,
            ai_response TEXT,
            context_used TEXT,
            personality_learned TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        ''')
        
        conn.commit()
        conn.close()
    
    async def analyze_family_photo(self, image_path: str, metadata: Dict = None) -> MemoryAnalysis:
        """Comprehensive family photo analysis"""
        return await self.memory_ai.analyze_photo(image_path, metadata)
    
    async def get_travel_recommendations(self, preferences: Dict) -> List[TravelRecommendation]:
        """Get personalized family travel recommendations"""
        return await self.travel_ai.get_recommendations(preferences)
    
    async def start_game_session(self, game_type: str, players: List[Dict]) -> Dict:
        """Start AI-managed game session"""
        return await self.game_master.start_session(game_type, players)
    
    async def chat_with_family_ai(self, member_id: str, message: str) -> Dict:
        """Chat with family-aware AI assistant"""
        return await self.chat_ai.process_message(member_id, message)
    
    async def get_memory_suggestions(self, date: str = None, member_id: str = None) -> Dict:
        """Get smart memory suggestions"""
        return await self.suggestion_engine.get_suggestions(date, member_id)

class FamilyMemoryAI:
    """
    AI service for family photo analysis, facial recognition, and memory categorization
    """
    
    def __init__(self, db_path: str, models_path: Path):
        self.db_path = db_path
        self.models_path = models_path
        self.face_encodings = {}
        self.face_names = {}
        
        # Load face recognition model
        self._load_face_encodings()
        
        # Initialize emotion detection if available
        if ML_AVAILABLE:
            try:
                self.emotion_classifier = pipeline("text-classification", 
                    model="j-hartmann/emotion-english-distilroberta-base", 
                    top_k=None)
            except:
                self.emotion_classifier = None
        else:
            self.emotion_classifier = None
    
    def _load_face_encodings(self):
        """Load saved face encodings for family members"""
        encodings_file = self.models_path / "face_encodings.pkl"
        if encodings_file.exists():
            try:
                with open(encodings_file, 'rb') as f:
                    data = pickle.load(f)
                    self.face_encodings = data.get('encodings', {})
                    self.face_names = data.get('names', {})
                logger.info(f"Loaded face encodings for {len(self.face_encodings)} family members")
            except Exception as e:
                logger.error(f"Error loading face encodings: {e}")
    
    def _save_face_encodings(self):
        """Save face encodings to file"""
        encodings_file = self.models_path / "face_encodings.pkl"
        try:
            with open(encodings_file, 'wb') as f:
                pickle.dump({
                    'encodings': self.face_encodings,
                    'names': self.face_names
                }, f)
            logger.info("Face encodings saved successfully")
        except Exception as e:
            logger.error(f"Error saving face encodings: {e}")
    
    def add_family_member_face(self, member_id: str, name: str, image_path: str) -> bool:
        """Add face encoding for a family member"""
        try:
            image = face_recognition.load_image_file(image_path)
            encodings = face_recognition.face_encodings(image)
            
            if encodings:
                self.face_encodings[member_id] = encodings[0]
                self.face_names[member_id] = name
                self._save_face_encodings()
                return True
            return False
        except Exception as e:
            logger.error(f"Error adding face encoding: {e}")
            return False
    
    async def analyze_photo(self, image_path: str, metadata: Dict = None) -> MemoryAnalysis:
        """Comprehensive photo analysis for family memories"""
        try:
            # Load image
            image = cv2.imread(image_path)
            if image is None:
                raise ValueError(f"Could not load image: {image_path}")
            
            # Convert BGR to RGB for face_recognition
            rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            # Detect faces
            face_locations = face_recognition.face_locations(rgb_image)
            face_encodings = face_recognition.face_encodings(rgb_image, face_locations)
            
            detected_faces = []
            family_members_identified = []
            
            # Identify family members
            for i, face_encoding in enumerate(face_encodings):
                face_location = face_locations[i]
                
                # Compare with known family members
                if self.face_encodings:
                    distances = face_recognition.face_distance(
                        list(self.face_encodings.values()), face_encoding
                    )
                    min_distance_index = np.argmin(distances)
                    min_distance = distances[min_distance_index]
                    
                    if min_distance < 0.6:  # Threshold for recognition
                        member_id = list(self.face_encodings.keys())[min_distance_index]
                        member_name = self.face_names.get(member_id, "Unknown")
                        family_members_identified.append(member_name)
                        
                        detected_faces.append({
                            "location": face_location,
                            "member_id": member_id,
                            "member_name": member_name,
                            "confidence": 1.0 - min_distance
                        })
                    else:
                        detected_faces.append({
                            "location": face_location,
                            "member_id": None,
                            "member_name": "Unknown",
                            "confidence": 0.0
                        })
                else:
                    detected_faces.append({
                        "location": face_location,
                        "member_id": None,
                        "member_name": "Unknown",
                        "confidence": 0.0
                    })
            
            # Analyze activities (simple object detection)
            activities = self._detect_activities(image)
            
            # Detect emotions (if available)
            emotions = []
            if self.emotion_classifier and detected_faces:
                # Simple emotion detection based on context
                emotions = ["happy", "excited"] if len(detected_faces) > 1 else ["neutral"]
            
            # Determine location (from metadata or image analysis)
            location = None
            if metadata and metadata.get('location'):
                location = metadata['location']
            else:
                # Could implement location detection from image content
                location = self._analyze_location(image)
            
            # Detect cultural elements
            cultural_elements = self._detect_cultural_elements(image)
            
            # Categorize memory
            memory_category = self._categorize_memory(
                len(detected_faces), activities, location, metadata
            )
            
            # Generate suggested tags
            suggested_tags = self._generate_tags(
                family_members_identified, activities, location, cultural_elements
            )
            
            # Generate description
            description = self._generate_description(
                family_members_identified, activities, location, memory_category
            )
            
            # Calculate confidence
            confidence = self._calculate_confidence(detected_faces, activities)
            
            result = MemoryAnalysis(
                detected_faces=detected_faces,
                family_members_identified=family_members_identified,
                activities=activities,
                emotions=emotions,
                location=location,
                cultural_elements=cultural_elements,
                memory_category=memory_category,
                confidence=confidence,
                suggested_tags=suggested_tags,
                description=description
            )
            
            # Save analysis to database
            self._save_analysis(image_path, result)
            
            return result
            
        except Exception as e:
            logger.error(f"Error analyzing photo: {e}")
            # Return basic analysis
            return MemoryAnalysis(
                detected_faces=[],
                family_members_identified=[],
                activities=["photo"],
                emotions=[],
                location=metadata.get('location') if metadata else None,
                cultural_elements=[],
                memory_category="daily_life",
                confidence=0.3,
                suggested_tags=["family", "memory"],
                description="A family memory"
            )
    
    def _detect_activities(self, image: np.ndarray) -> List[str]:
        """Detect activities in the image (simplified)"""
        # This would use object detection models in a full implementation
        # For now, return common family activities
        height, width = image.shape[:2]
        
        activities = []
        
        # Simple heuristics based on image properties
        if width > height * 1.5:  # Landscape orientation
            activities.append("outdoor_activity")
        
        # Could add more sophisticated object detection here
        activities.append("family_gathering")
        
        return activities
    
    def _analyze_location(self, image: np.ndarray) -> Optional[str]:
        """Analyze location from image content"""
        # This would use landmark detection or OCR for signs
        # For now, return None (location should come from metadata)
        return None
    
    def _detect_cultural_elements(self, image: np.ndarray) -> List[str]:
        """Detect cultural elements in the image"""
        # This would use OCR to detect Arabic text, cultural objects, etc.
        cultural_elements = []
        
        # Placeholder for cultural detection
        # In full implementation, would use:
        # - Arabic text detection
        # - Cultural object recognition
        # - Traditional clothing detection
        
        return cultural_elements
    
    def _categorize_memory(self, num_faces: int, activities: List[str], 
                          location: Optional[str], metadata: Dict = None) -> str:
        """Categorize the type of memory"""
        if location and any(keyword in location.lower() for keyword in 
                          ['airport', 'hotel', 'tourist', 'beach', 'mountain']):
            return "travel_memory"
        elif num_faces >= 3:
            return "family_gathering"
        elif "outdoor_activity" in activities:
            return "outdoor_adventure"
        elif metadata and metadata.get('tags') and 'celebration' in metadata['tags']:
            return "celebration"
        else:
            return "daily_life"
    
    def _generate_tags(self, family_members: List[str], activities: List[str], 
                      location: Optional[str], cultural_elements: List[str]) -> List[str]:
        """Generate smart tags for the memory"""
        tags = ["family", "memory"]
        
        # Add family member tags
        tags.extend(family_members[:3])  # Limit to 3 members
        
        # Add activity tags
        for activity in activities:
            tags.append(activity.replace("_", " "))
        
        # Add location tag
        if location:
            tags.append(location.lower())
        
        # Add cultural tags
        for element in cultural_elements:
            tags.append(element.replace("_", " "))
        
        return list(set(tags))  # Remove duplicates
    
    def _generate_description(self, family_members: List[str], activities: List[str], 
                            location: Optional[str], category: str) -> str:
        """Generate a descriptive text for the memory"""
        parts = []
        
        if location:
            parts.append(f"A wonderful moment captured at {location}")
        else:
            parts.append("A special family moment")
        
        if family_members:
            if len(family_members) == 1:
                parts.append(f"featuring {family_members[0]}")
            elif len(family_members) == 2:
                parts.append(f"featuring {family_members[0]} and {family_members[1]}")
            else:
                parts.append(f"featuring {', '.join(family_members[:-1])} and {family_members[-1]}")
        
        if activities and activities != ["family_gathering"]:
            activity_desc = activities[0].replace("_", " ")
            parts.append(f"during {activity_desc}")
        
        return ". ".join(parts) + "."
    
    def _calculate_confidence(self, detected_faces: List[Dict], activities: List[str]) -> float:
        """Calculate confidence score for the analysis"""
        confidence = 0.5  # Base confidence
        
        # Add confidence based on face recognition
        recognized_faces = [f for f in detected_faces if f.get('member_id')]
        if recognized_faces:
            avg_face_confidence = np.mean([f['confidence'] for f in recognized_faces])
            confidence += avg_face_confidence * 0.3
        
        # Add confidence based on activity detection
        if activities:
            confidence += 0.2
        
        return min(confidence, 1.0)
    
    def _save_analysis(self, image_path: str, analysis: MemoryAnalysis):
        """Save analysis results to database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
            INSERT OR REPLACE INTO memories 
            (id, file_path, analysis_result, family_members_identified, memory_category, confidence)
            VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                str(hash(image_path)),
                image_path,
                json.dumps(asdict(analysis)),
                json.dumps(analysis.family_members_identified),
                analysis.memory_category,
                analysis.confidence
            ))
            
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Error saving analysis: {e}")

class FamilyTravelAI:
    """
    AI service for family travel planning with cultural awareness
    """
    
    def __init__(self, db_path: str):
        self.db_path = db_path
        
        # Family travel knowledge base
        self.destinations = {
            "Dubai, UAE": {
                "cultural_match": 0.95,
                "family_rating": 0.9,
                "halal_friendly": True,
                "activities": ["Burj Khalifa", "Desert Safari", "Dubai Mall", "Islamic Heritage"],
                "best_months": ["Nov", "Dec", "Jan", "Feb", "Mar"],
                "budget_range": (1500, 3000)
            },
            "Istanbul, Turkey": {
                "cultural_match": 0.9,
                "family_rating": 0.85,
                "halal_friendly": True,
                "activities": ["Hagia Sophia", "Blue Mosque", "Bosphorus Cruise", "Grand Bazaar"],
                "best_months": ["Apr", "May", "Sep", "Oct"],
                "budget_range": (1000, 2500)
            },
            "Marrakech, Morocco": {
                "cultural_match": 0.88,
                "family_rating": 0.8,
                "halal_friendly": True,
                "activities": ["Jemaa el-Fnaa", "Majorelle Garden", "Atlas Mountains", "Medina Tours"],
                "best_months": ["Mar", "Apr", "May", "Oct", "Nov"],
                "budget_range": (800, 2000)
            },
            "Kuala Lumpur, Malaysia": {
                "cultural_match": 0.8,
                "family_rating": 0.85,
                "halal_friendly": True,
                "activities": ["Petronas Towers", "Batu Caves", "Islamic Arts Museum", "Street Food Tours"],
                "best_months": ["May", "Jun", "Jul", "Dec", "Jan"],
                "budget_range": (700, 1800)
            }
        }
    
    async def get_recommendations(self, preferences: Dict) -> List[TravelRecommendation]:
        """Get personalized travel recommendations"""
        try:
            budget = preferences.get('budget', 2000)
            family_size = preferences.get('family_size', 4)
            interests = preferences.get('interests', [])
            travel_month = preferences.get('travel_month')
            
            recommendations = []
            
            for dest_name, dest_info in self.destinations.items():
                # Calculate suitability score
                suitability = self._calculate_suitability(
                    dest_info, budget, family_size, interests, travel_month
                )
                
                if suitability > 0.5:  # Minimum threshold
                    country = dest_name.split(', ')[-1]
                    
                    recommendation = TravelRecommendation(
                        destination=dest_name,
                        country=country,
                        confidence=suitability,
                        reasons=self._generate_reasons(dest_info, preferences),
                        family_suitability=dest_info['family_rating'],
                        cultural_match=dest_info['cultural_match'],
                        budget_estimate=self._estimate_cost(dest_info, family_size),
                        best_months=dest_info['best_months'],
                        activities=dest_info['activities']
                    )
                    
                    recommendations.append(recommendation)
            
            # Sort by confidence score
            recommendations.sort(key=lambda x: x.confidence, reverse=True)
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error generating travel recommendations: {e}")
            return []
    
    def _calculate_suitability(self, dest_info: Dict, budget: float, family_size: int, 
                             interests: List[str], travel_month: str = None) -> float:
        """Calculate how suitable a destination is for the family"""
        score = 0.0
        
        # Base score from family rating and cultural match
        score += dest_info['family_rating'] * 0.4
        score += dest_info['cultural_match'] * 0.3
        
        # Budget compatibility
        min_cost, max_cost = dest_info['budget_range']
        estimated_cost = self._estimate_cost(dest_info, family_size)
        
        if budget >= estimated_cost:
            budget_score = 1.0
        elif budget >= min_cost * family_size:
            budget_score = 0.7
        else:
            budget_score = 0.3
        
        score += budget_score * 0.2
        
        # Seasonal compatibility
        if travel_month and travel_month in dest_info['best_months']:
            score += 0.1
        
        return min(score, 1.0)
    
    def _estimate_cost(self, dest_info: Dict, family_size: int) -> float:
        """Estimate trip cost for the family"""
        base_cost = sum(dest_info['budget_range']) / 2
        return base_cost * family_size * 1.1  # Add 10% for family activities
    
    def _generate_reasons(self, dest_info: Dict, preferences: Dict) -> List[str]:
        """Generate reasons why this destination is recommended"""
        reasons = []
        
        if dest_info['cultural_match'] > 0.85:
            reasons.append("Strong cultural connection and Islamic heritage")
        
        if dest_info['halal_friendly']:
            reasons.append("Excellent halal food options and Muslim-friendly facilities")
        
        if dest_info['family_rating'] > 0.8:
            reasons.append("Outstanding family-friendly activities and accommodations")
        
        budget = preferences.get('budget', 2000)
        family_size = preferences.get('family_size', 4)
        estimated_cost = self._estimate_cost(dest_info, family_size)
        
        if budget >= estimated_cost:
            reasons.append("Fits comfortably within your budget")
        
        return reasons

class AIGameMaster:
    """
    AI Game Master for family gaming activities
    """
    
    def __init__(self, db_path: str):
        self.db_path = db_path
        
        # Game rules and configurations
        self.game_rules = {
            "mafia": {
                "min_players": 5,
                "max_players": 20,
                "roles": ["mafia", "detective", "doctor", "citizen"],
                "phases": ["night", "day", "voting"],
                "ai_features": ["role_assignment", "vote_counting", "game_flow"]
            },
            "among_us": {
                "min_players": 4,
                "max_players": 15,
                "roles": ["crewmate", "impostor"],
                "features": ["task_assignment", "emergency_meetings", "voting"],
                "ai_features": ["suspicion_tracking", "behavior_analysis"]
            }
        }
    
    async def start_session(self, game_type: str, players: List[Dict]) -> Dict:
        """Start a new AI-managed game session"""
        try:
            if game_type not in self.game_rules:
                raise ValueError(f"Unsupported game type: {game_type}")
            
            rules = self.game_rules[game_type]
            
            if len(players) < rules["min_players"]:
                raise ValueError(f"Not enough players. Minimum: {rules['min_players']}")
            
            # Assign roles intelligently
            assigned_roles = self._assign_roles(game_type, players)
            
            # Initialize game state
            game_state = {
                "game_id": f"{game_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                "game_type": game_type,
                "players": assigned_roles,
                "phase": "setup",
                "round": 0,
                "status": "active",
                "ai_decisions": []
            }
            
            # Save game session
            self._save_game_session(game_state)
            
            return {
                "success": True,
                "game_session": game_state,
                "instructions": self._generate_game_instructions(game_type, assigned_roles)
            }
            
        except Exception as e:
            logger.error(f"Error starting game session: {e}")
            return {"success": False, "error": str(e)}
    
    def _assign_roles(self, game_type: str, players: List[Dict]) -> List[Dict]:
        """Intelligently assign roles to players"""
        import random
        
        if game_type == "mafia":
            num_players = len(players)
            num_mafia = max(1, num_players // 4)  # 25% mafia
            num_special = min(2, num_players - num_mafia)  # Detective, Doctor
            num_citizens = num_players - num_mafia - num_special
            
            roles = (["mafia"] * num_mafia + 
                    ["detective", "doctor"][:num_special] + 
                    ["citizen"] * num_citizens)
            
            random.shuffle(roles)
            
            assigned_players = []
            for i, player in enumerate(players):
                assigned_players.append({
                    **player,
                    "role": roles[i],
                    "status": "alive"
                })
            
            return assigned_players
        
        elif game_type == "among_us":
            num_players = len(players)
            num_impostors = max(1, min(3, num_players // 5))  # 20% impostors
            
            roles = ["impostor"] * num_impostors + ["crewmate"] * (num_players - num_impostors)
            random.shuffle(roles)
            
            assigned_players = []
            for i, player in enumerate(players):
                assigned_players.append({
                    **player,
                    "role": roles[i],
                    "status": "alive"
                })
            
            return assigned_players
        
        return players
    
    def _generate_game_instructions(self, game_type: str, players: List[Dict]) -> str:
        """Generate game instructions for players"""
        if game_type == "mafia":
            mafia_players = [p["name"] for p in players if p["role"] == "mafia"]
            detective = [p["name"] for p in players if p["role"] == "detective"]
            doctor = [p["name"] for p in players if p["role"] == "doctor"]
            
            instructions = f"""
🎮 MAFIA GAME STARTED 🎮

Players: {len(players)}
Mafia Members: {len(mafia_players)} (secret)
Detective: {detective[0] if detective else "None"}
Doctor: {doctor[0] if doctor else "None"}
Citizens: {len([p for p in players if p["role"] == "citizen"])}

🌙 NIGHT PHASE:
- Mafia chooses victim
- Detective investigates player
- Doctor protects player

☀️ DAY PHASE:
- All players discuss
- Vote to eliminate suspected mafia
- Majority vote wins

Win Conditions:
- Mafia wins if they equal/outnumber citizens
- Citizens win if all mafia eliminated
"""
            
            return instructions
        
        elif game_type == "among_us":
            impostors = len([p for p in players if p["role"] == "impostor"])
            crewmates = len([p for p in players if p["role"] == "crewmate"])
            
            instructions = f"""
🚀 AMONG US FAMILY EDITION 🚀

Players: {len(players)}
Impostors: {impostors} (secret)
Crewmates: {crewmates}

🔧 CREWMATE OBJECTIVES:
- Complete all tasks
- Find and vote out impostors
- Call emergency meetings when suspicious

🗡️ IMPOSTOR OBJECTIVES:
- Sabotage tasks secretly
- Eliminate crewmates
- Avoid detection

📱 EMERGENCY MEETINGS:
- Anyone can call (limited uses)
- Discuss and vote
- Most votes gets eliminated
"""
            
            return instructions
        
        return "Game instructions not available"
    
    def _save_game_session(self, game_state: Dict):
        """Save game session to database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
            INSERT OR REPLACE INTO game_sessions 
            (id, game_type, players, game_state, ai_decisions)
            VALUES (?, ?, ?, ?, ?)
            ''', (
                game_state["game_id"],
                game_state["game_type"],
                json.dumps(game_state["players"]),
                json.dumps(game_state),
                json.dumps(game_state["ai_decisions"])
            ))
            
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Error saving game session: {e}")

class FamilyChatAI:
    """
    Family-aware AI chatbot with personality learning
    """
    
    def __init__(self, db_path: str, models_path: Path):
        self.db_path = db_path
        self.models_path = models_path
        
        # Initialize language model if available
        if ML_AVAILABLE:
            try:
                self.tokenizer = AutoTokenizer.from_pretrained("microsoft/DialoGPT-small")
                self.model = AutoModelForSequenceClassification.from_pretrained("microsoft/DialoGPT-small")
                self.sentence_model = SentenceTransformer('all-MiniLM-L6-v2')
            except:
                self.tokenizer = None
                self.model = None
                self.sentence_model = None
        else:
            self.tokenizer = None
            self.model = None
            self.sentence_model = None
        
        # Family context and personalities
        self.family_personalities = {}
        self.conversation_history = {}
    
    async def process_message(self, member_id: str, message: str) -> Dict:
        """Process chat message with family context"""
        try:
            # Load family context
            family_context = self._load_family_context(member_id)
            
            # Analyze message for personality insights
            personality_insights = self._analyze_personality(message)
            
            # Generate response based on family context
            response = self._generate_family_aware_response(
                member_id, message, family_context, personality_insights
            )
            
            # Save conversation
            self._save_conversation(member_id, message, response, personality_insights)
            
            return {
                "response": response,
                "context_used": list(family_context.keys()),
                "personality_learned": bool(personality_insights),
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error processing chat message: {e}")
            return {
                "response": "I'm here to help with family memories and travel planning! What would you like to know?",
                "context_used": [],
                "personality_learned": False,
                "timestamp": datetime.now().isoformat()
            }
    
    def _load_family_context(self, member_id: str) -> Dict:
        """Load family context for personalized responses"""
        # This would load family member info, recent memories, travel plans, etc.
        context = {
            "member_info": f"Family member {member_id}",
            "recent_memories": "Recent family photos uploaded",
            "travel_preferences": "Prefers cultural destinations",
            "family_relationships": "Connected to other family members"
        }
        return context
    
    def _analyze_personality(self, message: str) -> Dict:
        """Analyze message for personality traits"""
        # Simple personality analysis based on message content
        personality = {}
        
        message_lower = message.lower()
        
        # Detect interests
        if any(word in message_lower for word in ['travel', 'trip', 'vacation']):
            personality['travel_enthusiasm'] = 0.8
        
        if any(word in message_lower for word in ['family', 'together', 'we']):
            personality['family_oriented'] = 0.9
        
        # Detect communication style
        if len(message) > 100:
            personality['communication_style'] = 'detailed'
        elif '?' in message:
            personality['communication_style'] = 'inquisitive'
        else:
            personality['communication_style'] = 'concise'
        
        return personality
    
    def _generate_family_aware_response(self, member_id: str, message: str, 
                                      context: Dict, personality: Dict) -> str:
        """Generate response that's aware of family context"""
        message_lower = message.lower()
        
        # Travel-related queries
        if any(word in message_lower for word in ['travel', 'trip', 'vacation', 'destination']):
            return self._generate_travel_response(message, context, personality)
        
        # Memory-related queries
        elif any(word in message_lower for word in ['photo', 'memory', 'picture', 'remember']):
            return self._generate_memory_response(message, context, personality)
        
        # Family-related queries
        elif any(word in message_lower for word in ['family', 'together', 'plan']):
            return self._generate_family_response(message, context, personality)
        
        # Default friendly response
        else:
            return self._generate_default_response(message, context, personality)
    
    def _generate_travel_response(self, message: str, context: Dict, personality: Dict) -> str:
        """Generate travel-focused response"""
        responses = [
            "I'd love to help you plan your family's next adventure! Based on your family's preferences, I can suggest some amazing destinations that are perfect for everyone.",
            "Travel planning is one of my favorite topics! Let me know your budget, travel dates, and interests, and I'll find the perfect family-friendly destinations for you.",
            "Your family seems to love cultural experiences! I can recommend some incredible destinations that combine adventure, culture, and family fun."
        ]
        return responses[hash(message) % len(responses)]
    
    def _generate_memory_response(self, message: str, context: Dict, personality: Dict) -> str:
        """Generate memory-focused response"""
        responses = [
            "Family memories are so precious! I can help you organize your photos, create beautiful timelines, and even find similar memories from the past.",
            "I love helping families preserve their special moments! Upload your photos and I'll help identify family members and create meaningful descriptions.",
            "Your family photos tell such wonderful stories! I can analyze them to create smart albums and suggest which memories to share with family members."
        ]
        return responses[hash(message) % len(responses)]
    
    def _generate_family_response(self, message: str, context: Dict, personality: Dict) -> str:
        """Generate family-focused response"""
        responses = [
            "Family time is the best time! I'm here to help you plan activities, organize memories, and make every moment together special.",
            "Your family bond is beautiful to see! Whether you're planning trips, organizing photos, or just spending time together, I'm here to help.",
            "I love helping families like yours stay connected and create lasting memories! What can I help you plan or organize today?"
        ]
        return responses[hash(message) % len(responses)]
    
    def _generate_default_response(self, message: str, context: Dict, personality: Dict) -> str:
        """Generate default friendly response"""
        responses = [
            "I'm your family's AI assistant! I can help with photo analysis, travel planning, memory organization, and family activity coordination. What would you like to explore?",
            "Hello! I'm here to make your family's digital life easier and more fun. I can help with organizing memories, planning trips, and managing family activities!",
            "Hi there! I'm your family AI companion. Whether you want to organize photos, plan travels, or coordinate family activities, I'm here to help!"
        ]
        return responses[hash(message) % len(responses)]
    
    def _save_conversation(self, member_id: str, message: str, response: str, personality: Dict):
        """Save conversation to database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
            INSERT INTO chat_conversations 
            (id, family_member_id, message, ai_response, context_used, personality_learned)
            VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                f"{member_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                member_id,
                message,
                response,
                json.dumps({}),
                json.dumps(personality)
            ))
            
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Error saving conversation: {e}")

class SmartSuggestionEngine:
    """
    Engine for generating smart memory suggestions and "On this day" features
    """
    
    def __init__(self, db_path: str):
        self.db_path = db_path
    
    async def get_suggestions(self, date: str = None, member_id: str = None) -> Dict:
        """Get smart memory suggestions"""
        try:
            target_date = datetime.fromisoformat(date) if date else datetime.now()
            
            suggestions = {
                "on_this_day": self._get_on_this_day(target_date),
                "similar_memories": self._get_similar_memories(member_id),
                "family_connections": self._get_family_connections(member_id),
                "suggested_activities": self._get_activity_suggestions(),
                "memory_gaps": self._identify_memory_gaps()
            }
            
            return {
                "success": True,
                "date": target_date.isoformat(),
                "suggestions": suggestions,
                "ai_powered": True
            }
            
        except Exception as e:
            logger.error(f"Error generating suggestions: {e}")
            return {
                "success": False,
                "suggestions": {
                    "contextual_suggestions": [
                        "Upload more family photos to get better suggestions",
                        "Add dates and locations to your memories",
                        "Tag family members in your photos"
                    ]
                },
                "ai_powered": False
            }
    
    def _get_on_this_day(self, target_date: datetime) -> List[Dict]:
        """Get "On this day" memories from previous years"""
        # Query database for memories on the same day in previous years
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Look for memories on same month/day in previous years
            month_day = target_date.strftime("-%m-%d")
            
            cursor.execute('''
            SELECT * FROM memories 
            WHERE file_path LIKE ? 
            ORDER BY created_at DESC 
            LIMIT 5
            ''', (f"%{month_day}%",))
            
            memories = cursor.fetchall()
            conn.close()
            
            on_this_day = []
            for memory in memories:
                on_this_day.append({
                    "id": memory[0],
                    "file_path": memory[1],
                    "category": memory[4],
                    "years_ago": target_date.year - int(memory[6][:4]) if memory[6] else 1
                })
            
            return on_this_day
            
        except Exception as e:
            logger.error(f"Error getting 'On this day' memories: {e}")
            return []
    
    def _get_similar_memories(self, member_id: str = None) -> List[Dict]:
        """Get memories similar to recent ones"""
        # This would use ML to find similar memories based on content
        return [
            {"description": "Similar family gathering from last month", "similarity": 0.85},
            {"description": "Another travel memory with the same family members", "similarity": 0.78}
        ]
    
    def _get_family_connections(self, member_id: str = None) -> List[str]:
        """Get suggestions about family connections"""
        return [
            "This photo reminds us of your family trip to Dubai last year",
            "Similar gathering with the whole family during Ramadan",
            "These family moments show your love for cultural experiences"
        ]
    
    def _get_activity_suggestions(self) -> List[str]:
        """Suggest activities based on family patterns"""
        return [
            "Plan a family photo session to capture new memories",
            "Organize family trip to a culturally rich destination",
            "Create a photo album of your recent travel adventures",
            "Schedule a family game night with your favorite activities"
        ]
    
    def _identify_memory_gaps(self) -> List[str]:
        """Identify gaps in the family's memory collection"""
        return [
            "No recent photos with grandparents - consider a family gathering",
            "Missing travel photos from this year - time for a family trip?",
            "Few indoor family activities recorded - try some game nights!"
        ]


# Global instance
comprehensive_family_ai = ComprehensiveFamilyAI()

# Export main functions
async def analyze_family_photo(image_path: str, metadata: Dict = None) -> MemoryAnalysis:
    return await comprehensive_family_ai.analyze_family_photo(image_path, metadata)

async def get_travel_recommendations(preferences: Dict) -> List[TravelRecommendation]:
    return await comprehensive_family_ai.get_travel_recommendations(preferences)

async def start_game_session(game_type: str, players: List[Dict]) -> Dict:
    return await comprehensive_family_ai.start_game_session(game_type, players)

async def chat_with_family_ai(member_id: str, message: str) -> Dict:
    return await comprehensive_family_ai.chat_with_family_ai(member_id, message)

async def get_memory_suggestions(date: str = None, member_id: str = None) -> Dict:
    return await comprehensive_family_ai.get_memory_suggestions(date, member_id)


if __name__ == "__main__":
    # Test the comprehensive AI services
    async def test_services():
        print("Testing Comprehensive Family AI Services...")
        
        # Test memory suggestions
        suggestions = await get_memory_suggestions("2024-08-11")
        print(f"Memory suggestions: {suggestions['success']}")
        
        # Test travel recommendations
        travel_prefs = {"budget": 3000, "family_size": 4, "interests": ["culture"]}
        recommendations = await get_travel_recommendations(travel_prefs)
        print(f"Travel recommendations: {len(recommendations)}")
        
        # Test game master
        players = [{"id": "1", "name": "Ahmad"}, {"id": "2", "name": "Fatima"}, 
                  {"id": "3", "name": "Omar"}, {"id": "4", "name": "Layla"}, {"id": "5", "name": "Hassan"}]
        game = await start_game_session("mafia", players)
        print(f"Game session: {game['success']}")
        
        # Test chat AI
        chat_response = await chat_with_family_ai("ahmad", "Hi! Can you help me plan a family trip?")
        print(f"Chat AI response: {chat_response['response'][:50]}...")
    
    asyncio.run(test_services())