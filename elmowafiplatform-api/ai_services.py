#!/usr/bin/env python3
"""
Enhanced AI Services for Elmowafiplatform
Integrates advanced AI capabilities for family memory analysis, facial recognition, and intelligent processing
"""

import os
import sys
import json
import asyncio
import logging
from functools import lru_cache
from typing import List, Dict, Any, Optional
from pathlib import Path
import requests
import cv2
import numpy as np
from PIL import Image

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
import base64
from datetime import datetime

# Add hack2 directory to path for importing existing AI modules
sys.path.append('../hack2')

try:
    from math_analyzer.improved_error_localization import MathErrorDetector
    from hackthon.hackthon.azure_math_integration import AzureMathRecognizer, AzureEnhancedTutor
    AZURE_AI_AVAILABLE = True
except ImportError:
    print("Warning: Azure AI modules not found. Some features will be limited.")
    AZURE_AI_AVAILABLE = False

logger = logging.getLogger(__name__)

class FamilyAIAnalyzer:
    """Advanced AI analyzer for family memories with facial recognition and context awareness"""
    
    def __init__(self):
        self.face_cascade = None
        self.emotion_detector = None
        self.object_detector = None
        self.family_face_database = {}
        self.initialize_ai_models()
    
    def initialize_ai_models(self):
        """Initialize AI models for analysis"""
        try:
            # Initialize OpenCV face detection
            cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
            if os.path.exists(cascade_path):
                self.face_cascade = cv2.CascadeClassifier(cascade_path)
                logger.info("Face detection model loaded")
            
            # Initialize other AI models if available
            if AZURE_AI_AVAILABLE:
                self.azure_recognizer = AzureMathRecognizer()
                logger.info("Azure AI services initialized")
                
        except Exception as e:
            logger.error(f"Error initializing AI models: {e}")
    
    async def analyze_family_photo(self, image_path: str, family_context: List[Dict] = None) -> Dict[str, Any]:
        """Comprehensive analysis of family photos"""
        try:
            # Load image
            image = cv2.imread(image_path)
            if image is None:
                return {"error": "Could not load image"}
            
            results = {
                "timestamp": datetime.now().isoformat(),
                "image_properties": self._get_image_properties(image),
                "faces": await self._detect_faces(image, family_context),
                "emotions": await self._detect_emotions(image),
                "objects": await self._detect_objects(image),
                "scene_analysis": await self._analyze_scene(image),
                "text": await self._extract_text(image_path),
                "family_insights": await self._generate_family_insights(image, family_context)
            }
            
            return results
            
        except Exception as e:
            logger.error(f"Error analyzing family photo: {e}")
            return {"error": str(e)}
    
    def _get_image_properties(self, image: np.ndarray) -> Dict[str, Any]:
        """Extract basic image properties"""
        height, width = image.shape[:2]
        
        # Calculate brightness and contrast
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        brightness = np.mean(gray)
        contrast = np.std(gray)
        
        # Detect if image is blurry
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        is_blurry = laplacian_var < 100
        
        return {
            "width": width,
            "height": height,
            "brightness": float(brightness),
            "contrast": float(contrast),
            "is_blurry": is_blurry,
            "quality_score": min(100, max(0, laplacian_var / 10))
        }
    
    async def _detect_faces(self, image: np.ndarray, family_context: List[Dict] = None) -> Dict[str, Any]:
        """Detect and analyze faces in the image with advanced recognition"""
        # Save image temporarily for facial recognition
        import tempfile
        temp_path = None
        
        try:
            # Create temporary file
            with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as temp_file:
                temp_path = temp_file.name
                cv2.imwrite(temp_path, image)
            
            # Use advanced facial recognition trainer
            from facial_recognition_trainer import face_trainer
            identification_results = face_trainer.identify_faces(temp_path)
            
            # Basic face detection with OpenCV as fallback
            if self.face_cascade is None:
                return {"count": 0, "faces": [], "family_members_detected": []}
            
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            faces = self.face_cascade.detectMultiScale(gray, 1.1, 4)
            
            detected_faces = []
            family_members_detected = []
            
            for i, (x, y, w, h) in enumerate(faces):
                face_data = {
                    "id": i,
                    "position": {"x": int(x), "y": int(y), "width": int(w), "height": int(h)},
                    "confidence": 0.8,
                    "estimated_age": "adult",
                    "estimated_gender": "unknown"
                }
                
                # Use advanced facial recognition results if available
                if i < len(identification_results) and identification_results[i].get("family_member_id"):
                    member_id = identification_results[i]["family_member_id"]
                    confidence = identification_results[i]["confidence"]
                    
                    # Find member details from family context
                    member_name = "Unknown"
                    if family_context:
                        member = next((m for m in family_context if m.get("id") == member_id), None)
                        if member:
                            member_name = member.get("name", "Unknown")
                    
                    family_members_detected.append({
                        "member_id": member_id,
                        "name": member_name,
                        "confidence": confidence,
                        "face_position": face_data["position"],
                        "recognition_method": "advanced_ai"
                    })
                    
                    face_data["recognized_as"] = member_id
                    face_data["recognition_confidence"] = confidence
                
                detected_faces.append(face_data)
            
            return {
                "count": len(faces),
                "faces": detected_faces,
                "family_members_detected": family_members_detected,
                "advanced_recognition_used": True
            }
            
        except Exception as e:
            logger.error(f"Error in advanced face detection: {e}")
            # Fallback to basic detection
            return await self._basic_face_detection(image, family_context)
        
        finally:
            # Clean up temporary file
            if temp_path and os.path.exists(temp_path):
                os.unlink(temp_path)
    
    async def _basic_face_detection(self, image: np.ndarray, family_context: List[Dict] = None) -> Dict[str, Any]:
        """Basic face detection fallback"""
        if self.face_cascade is None:
            return {"count": 0, "faces": [], "family_members_detected": []}
        
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        faces = self.face_cascade.detectMultiScale(gray, 1.1, 4)
        
        detected_faces = []
        family_members_detected = []
        
        for i, (x, y, w, h) in enumerate(faces):
            face_data = {
                "id": i,
                "position": {"x": int(x), "y": int(y), "width": int(w), "height": int(h)},
                "confidence": 0.8,
                "estimated_age": "adult",
                "estimated_gender": "unknown"
            }
            
            # Basic family member matching based on context
            if family_context and len(family_context) > i:
                family_member = family_context[i]
                family_members_detected.append({
                    "member_id": family_member.get("id"),
                    "name": family_member.get("name"),
                    "confidence": 0.5,  # Lower confidence for basic detection
                    "face_position": face_data["position"],
                    "recognition_method": "basic_context"
                })
            
            detected_faces.append(face_data)
        
        return {
            "count": len(faces),
            "faces": detected_faces,
            "family_members_detected": family_members_detected,
            "advanced_recognition_used": False
        }
    
    async def _detect_emotions(self, image: np.ndarray) -> List[str]:
        """Detect emotions in the image (mock implementation)"""
        # This would integrate with actual emotion detection AI
        emotions = ["happy", "excited", "peaceful", "joyful"]
        
        # Simple heuristic based on brightness and colors
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        brightness = np.mean(hsv[:, :, 2])
        
        if brightness > 150:
            return ["happy", "joyful"]
        elif brightness > 100:
            return ["peaceful", "content"]
        else:
            return ["contemplative", "serene"]
    
    async def _detect_objects(self, image: np.ndarray) -> List[Dict[str, Any]]:
        """Detect objects in the image"""
        # Mock object detection (would integrate with YOLO or similar)
        height, width = image.shape[:2]
        
        # Simple color-based detection for common family objects
        objects = []
        
        # Check for blue (sky/water)
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        blue_mask = cv2.inRange(hsv, (100, 50, 50), (130, 255, 255))
        blue_ratio = np.sum(blue_mask > 0) / (height * width)
        
        if blue_ratio > 0.3:
            objects.append({"name": "sky", "confidence": 0.8, "category": "nature"})
        
        # Check for green (vegetation)
        green_mask = cv2.inRange(hsv, (40, 50, 50), (80, 255, 255))
        green_ratio = np.sum(green_mask > 0) / (height * width)
        
        if green_ratio > 0.2:
            objects.append({"name": "vegetation", "confidence": 0.7, "category": "nature"})
        
        # Add common family objects based on context
        objects.extend([
            {"name": "family gathering", "confidence": 0.6, "category": "event"},
            {"name": "indoor setting", "confidence": 0.5, "category": "location"}
        ])
        
        return objects
    
    async def _analyze_scene(self, image: np.ndarray) -> Dict[str, Any]:
        """Analyze the overall scene"""
        height, width = image.shape[:2]
        
        # Analyze composition
        aspect_ratio = width / height
        
        # Color analysis
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        dominant_hue = np.mean(hsv[:, :, 0])
        saturation = np.mean(hsv[:, :, 1])
        
        # Scene classification
        scene_type = "indoor"
        if saturation > 100:
            scene_type = "outdoor"
        
        setting = "home"
        if dominant_hue < 30 or dominant_hue > 150:
            setting = "nature"
        elif 60 < dominant_hue < 120:
            setting = "park"
        
        return {
            "scene_type": scene_type,
            "setting": setting,
            "composition": {
                "aspect_ratio": float(aspect_ratio),
                "dominant_colors": ["blue", "green", "brown"][int(dominant_hue) // 60],
                "color_saturation": float(saturation)
            },
            "estimated_time_of_day": "day" if np.mean(image) > 100 else "evening",
            "photo_style": "casual" if saturation < 100 else "vibrant"
        }
    
    async def _extract_text(self, image_path: str) -> Optional[str]:
        """Extract text from image using OCR"""
        try:
            # Would integrate with Tesseract or Azure OCR
            # For now, return mock text detection
            return None
        except Exception as e:
            logger.error(f"Text extraction error: {e}")
            return None
    
    async def _generate_family_insights(self, image: np.ndarray, family_context: List[Dict] = None) -> Dict[str, Any]:
        """Generate intelligent insights about the family photo"""
        insights = {
            "memory_type": "family_gathering",
            "suggested_tags": ["family", "together", "memories"],
            "estimated_occasion": "casual_moment",
            "recommendations": []
        }
        
        # Analyze people count for occasion type
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        if self.face_cascade:
            faces = self.face_cascade.detectMultiScale(gray, 1.1, 4)
            face_count = len(faces)
            
            if face_count >= 5:
                insights["estimated_occasion"] = "family_celebration"
                insights["suggested_tags"].extend(["celebration", "gathering", "special_moment"])
            elif face_count >= 2:
                insights["estimated_occasion"] = "family_time"
                insights["suggested_tags"].extend(["bonding", "together"])
            else:
                insights["estimated_occasion"] = "personal_moment"
        
        # Generate recommendations
        insights["recommendations"] = [
            "Consider adding family member names to enhance searchability",
            "This photo would be great for a family album",
            "Share this memory with family members who aren't tagged"
        ]
        
        return insights
    
    def generate_memory_suggestions(self, recent_memories: List[Dict], target_date: str) -> Dict[str, Any]:
        """Generate AI-powered memory suggestions"""
        try:
            # Simple rule-based suggestions for now
            suggestions = [
                "Consider adding more photos from recent family gatherings",
                "Upload travel photos to preserve those precious moments", 
                "Add descriptions to your memories to make them more meaningful"
            ]
            
            # Add context-specific suggestions based on recent memories
            if recent_memories:
                locations = set(m.get("location") for m in recent_memories if m.get("location"))
                if len(locations) > 2:
                    suggestions.append("You've been to many places recently - create a travel album!")
                
                family_count = sum(len(m.get("familyMembers", [])) for m in recent_memories)
                if family_count > 10:
                    suggestions.append("Lots of family moments captured - consider sharing with extended family")
            
            return {
                "suggestions": suggestions[:3],  # Limit to top 3
                "confidence": 0.8,
                "generated_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error generating memory suggestions: {e}")
            return {
                "suggestions": ["Add more family photos to build your memory collection"],
                "confidence": 0.3,
                "generated_at": datetime.now().isoformat()
            }

    def generate_family_chat_response(
        self, 
        message: str, 
        chat_mode: str = 'general',
        family_context: Dict = None,
        conversation_history: List = None,
        language: str = 'en',
        quick_action: bool = False
    ) -> Dict[str, Any]:
        """Generate intelligent chat response with family context"""
        try:
            is_arabic = language == 'ar'
            family_context = family_context or {}
            conversation_history = conversation_history or []
            
            # Analyze the message intent
            message_lower = message.lower()
            
            # Memory-related queries
            if any(word in message_lower for word in ['memory', 'memories', 'photo', 'photos', 'picture', 'remember', 'ذكرى', 'ذكريات', 'صورة', 'صور']):
                return self._handle_memory_query(message, family_context, is_arabic)
            
            # Travel-related queries
            elif any(word in message_lower for word in ['travel', 'trip', 'visit', 'go to', 'vacation', 'سفر', 'رحلة', 'زيارة', 'إجازة']):
                return self._handle_travel_query(message, family_context, is_arabic)
            
            # Family-related queries
            elif any(word in message_lower for word in ['family', 'member', 'relative', 'عائلة', 'أفراد', 'أقارب']):
                return self._handle_family_query(message, family_context, is_arabic)
            
            # Greeting and general conversation
            elif any(word in message_lower for word in ['hello', 'hi', 'hey', 'good morning', 'good evening', 'مرحبا', 'أهلا', 'السلام عليكم']):
                return self._handle_greeting(message, family_context, is_arabic)
            
            # Default general response
            else:
                return self._handle_general_query(message, family_context, is_arabic)
                
        except Exception as e:
            logger.error(f"Error generating family chat response: {e}")
            return {
                "response": "عذراً، واجهت مشكلة في الرد." if language == 'ar' else "Sorry, I encountered an issue.",
                "context": {"type": "general"},
                "suggestions": []
            }
    
    def _handle_memory_query(self, message: str, family_context: Dict, is_arabic: bool) -> Dict[str, Any]:
        """Handle memory-related queries"""
        if is_arabic:
            response = "يمكنني مساعدتك في استكشاف ذكرياتك العائلية! "
            if 'اليوم' in message or 'today' in message.lower():
                response += "دعني أبحث عن الذكريات من هذا اليوم في السنوات الماضية."
            else:
                response += "عن أي ذكريات تريد أن تسأل؟"
            
            suggestions = ['أظهر ذكريات من هذا اليوم', 'ابحث في الصور', 'اقترح ألبوم جديد']
        else:
            response = "I can help you explore your family memories! "
            if 'today' in message.lower():
                response += "Let me search for memories from this day in previous years."
            else:
                response += "What memories would you like to explore?"
            
            suggestions = ['Show memories from today', 'Search photos', 'Suggest new album']
        
        return {
            "response": response,
            "context": {"type": "memory"},
            "suggestions": suggestions,
            "actionType": "memory_search" if 'search' in message.lower() else None
        }
    
    def _handle_travel_query(self, message: str, family_context: Dict, is_arabic: bool) -> Dict[str, Any]:
        """Handle travel-related queries"""
        destinations = self._extract_destinations(message)
        
        if is_arabic:
            if destinations:
                response = f"رائع! أرى أنك مهتم بـ {', '.join(destinations)}. "
                response += "يمكنني مساعدتك في التخطيط لرحلة عائلية مثالية هناك!"
            else:
                response = "أحب التخطيط للرحلات العائلية! إلى أين تفكر في السفر؟"
            
            suggestions = ['اقترح وجهات قريبة', 'خطط رحلة نهاية أسبوع', 'أماكن صديقة للعائلة']
        else:
            if destinations:
                response = f"Great! I see you're interested in {', '.join(destinations)}. "
                response += "I can help you plan the perfect family trip there!"
            else:
                response = "I love helping with family travel planning! Where are you thinking of going?"
            
            suggestions = ['Suggest nearby destinations', 'Plan weekend trip', 'Family-friendly places']
        
        return {
            "response": response,
            "context": {"type": "travel", "destinations": destinations},
            "suggestions": suggestions,
            "actionType": "travel_plan" if destinations else None,
            "destination": destinations[0] if destinations else None
        }
    
    def _handle_family_query(self, message: str, family_context: Dict, is_arabic: bool) -> Dict[str, Any]:
        """Handle family-related queries"""
        members = family_context.get('members', [])
        member_count = len(members)
        
        if is_arabic:
            response = f"لديك عائلة جميلة مكونة من {member_count} أفراد! "
            if member_count > 0:
                names = [m.get('name', 'غير معروف') for m in members[:3]]
                response += f"أرى {', '.join(names)}"
                if member_count > 3:
                    response += f" و{member_count - 3} آخرين"
                response += " في عائلتك."
            
            suggestions = ['أظهر شجرة العائلة', 'ذكريات العائلة', 'إحصائيات العائلة']
        else:
            response = f"You have a beautiful family of {member_count} members! "
            if member_count > 0:
                names = [m.get('name', 'Unknown') for m in members[:3]]
                response += f"I can see {', '.join(names)}"
                if member_count > 3:
                    response += f" and {member_count - 3} others"
                response += " in your family."
            
            suggestions = ['Show family tree', 'Family memories', 'Family statistics']
        
        return {
            "response": response,
            "context": {"type": "family", "member_count": member_count},
            "suggestions": suggestions
        }
    
    def _handle_greeting(self, message: str, family_context: Dict, is_arabic: bool) -> Dict[str, Any]:
        """Handle greetings and initial conversation"""
        if is_arabic:
            responses = [
                "أهلاً وسهلاً! كيف يمكنني مساعدتك اليوم؟",
                "مرحباً بك! أنا هنا لمساعدتك مع ذكرياتك العائلية ورحلاتك.",
                "السلام عليكم! كيف حالك اليوم؟"
            ]
            suggestions = ['أظهر ذكريات اليوم', 'اقترح رحلة', 'معلومات العائلة']
        else:
            responses = [
                "Hello! How can I help you today?",
                "Hi there! I'm here to help with your family memories and travel planning.",
                "Good to see you! What would you like to explore today?"
            ]
            suggestions = ['Show today\'s memories', 'Suggest a trip', 'Family info']
        
        import random
        return {
            "response": random.choice(responses),
            "context": {"type": "general"},
            "suggestions": suggestions
        }
    
    def _handle_general_query(self, message: str, family_context: Dict, is_arabic: bool) -> Dict[str, Any]:
        """Handle general queries"""
        if is_arabic:
            response = "يمكنني مساعدتك في العديد من الأمور! أنا متخصص في إدارة الذكريات العائلية، التخطيط للرحلات، واقتراح الأنشطة العائلية."
            suggestions = ['ما يمكنك فعله؟', 'أظهر الذكريات', 'خطط رحلة']
        else:
            response = "I can help you with many things! I specialize in family memory management, travel planning, and suggesting family activities."
            suggestions = ['What can you do?', 'Show memories', 'Plan a trip']
        
        return {
            "response": response,
            "context": {"type": "general"},
            "suggestions": suggestions
        }
    
    def _extract_destinations(self, message: str) -> List[str]:
        """Extract destination names from message"""
        # Simple destination extraction - could be enhanced with NLP
        common_destinations = [
            'dubai', 'abu dhabi', 'sharjah', 'london', 'paris', 'tokyo', 'new york',
            'دبي', 'أبوظبي', 'الشارقة', 'لندن', 'باريس', 'طوكيو'
        ]
        
        found_destinations = []
        message_lower = message.lower()
        
        for dest in common_destinations:
            if dest in message_lower:
                found_destinations.append(dest.title())
        
        return found_destinations

class TravelAIAssistant:
    """AI assistant specialized in family travel planning and recommendations"""
    
    def __init__(self, db_manager=None):
        self.travel_knowledge_base = self._load_travel_knowledge()
        self.db_manager = db_manager # Properly initialize db_manager
    
    def _load_travel_knowledge(self) -> Dict[str, Any]:
        """Load travel knowledge base"""
        return {
            "destinations": {
                "Dubai": {
                    "family_friendly": True,
                    "best_season": "winter",
                    "attractions": ["Burj Khalifa", "Dubai Mall", "Palm Jumeirah"],
                    "cultural_significance": "Modern Islamic architecture"
                },
                "Istanbul": {
                    "family_friendly": True,
                    "best_season": "spring",
                    "attractions": ["Hagia Sophia", "Blue Mosque", "Grand Bazaar"],
                    "cultural_significance": "Byzantine and Ottoman heritage"
                }
            }
        }
    
    @lru_cache(maxsize=128)
    async def get_travel_recommendations(
        self, 
        destination: str, 
        family_preferences: Dict[str, Any],
        past_travels: List[Dict] = None
    ) -> Dict[str, Any]:
        """Generate AI-powered travel recommendations with caching and error handling."""
        logger.info(f"Fetching travel recommendations for destination: {destination}")
        try:
            # This combines the logic from the helper methods into a complete, robust function.
            recommendations = {
                "destination_analysis": await self._analyze_destination(destination),
                "family_activities": await self._suggest_family_activities(destination, family_preferences),
                "cultural_experiences": await self._suggest_cultural_experiences(destination),
                "budget_estimate": await self._estimate_budget(destination, family_preferences),
                "travel_tips": await self._generate_travel_tips(destination, family_preferences),
                "similar_destinations": await self._find_similar_destinations(destination, past_travels)
            }
            logger.info(f"Successfully generated recommendations for {destination}")
            return recommendations
        except Exception as e:
            logger.error(f"Error in get_travel_recommendations for {destination}: {e}", exc_info=True)
            return {"error": "Failed to generate travel recommendations.", "details": str(e)}

    async def _analyze_destination(self, destination: str) -> Dict[str, Any]:
        """Analyze destination for family suitability"""
        # Fallback for when db_manager is not available
        if not self.db_manager:
            logger.warning("db_manager not available for destination analysis. Using knowledge base.")
            dest_info = self.travel_knowledge_base["destinations"].get(destination, {})
        else:
            dest_info = self.db_manager.get_destination_info(destination)
        
        return {
            "family_friendly_score": 85 if dest_info.get("family_friendly") else 60,
            "best_time_to_visit": dest_info.get("best_season", "spring/fall"),
            "cultural_richness": 90 if "heritage" in dest_info.get("cultural_significance", "") else 70,
            "safety_rating": 85,
            "accessibility": 80
        }
    
    async def _suggest_family_activities(self, destination: str, preferences: Dict) -> List[Dict]:
        """Suggest activities based on family preferences"""
        activities = [
            {
                "name": f"Family City Tour of {destination}",
                "duration": "4 hours",
                "age_suitability": "all_ages",
                "cost_estimate": 150,
                "category": "sightseeing"
            },
            {
                "name": "Cultural Heritage Experience",
                "duration": "3 hours", 
                "age_suitability": "8+",
                "cost_estimate": 100,
                "category": "cultural"
            },
            {
                "name": "Family Food Tour",
                "duration": "2 hours",
                "age_suitability": "all_ages", 
                "cost_estimate": 80,
                "category": "culinary"
            }
        ]
        
        # Customize based on family preferences
        if preferences.get("interests"):
            if "adventure" in preferences["interests"]:
                activities.append({
                    "name": "Family Adventure Park",
                    "duration": "6 hours",
                    "age_suitability": "6+",
                    "cost_estimate": 200,
                    "category": "adventure"
                })
        
        return activities
    
    async def _suggest_cultural_experiences(self, destination: str) -> List[Dict]:
        """Suggest cultural experiences for family education"""
        dest_info = self.travel_knowledge_base["destinations"].get(destination, {})
        attractions = dest_info.get("attractions", [])
        
        experiences = []
        for attraction in attractions:
            experiences.append({
                "name": attraction,
                "type": "historical_site",
                "educational_value": "high",
                "family_engagement": "interactive_tour_available"
            })
        
        return experiences
    
    async def _estimate_budget(self, destination: str, preferences: Dict) -> Dict[str, Any]:
        """Estimate travel budget for family"""
        family_size = len(preferences.get("members", []))
        duration = preferences.get("duration_days", 5)
        
        base_costs = {
            "accommodation": 120 * duration,
            "meals": 50 * family_size * duration,
            "activities": 200 * duration,
            "transportation": 300,
            "miscellaneous": 200
        }
        
        total = sum(base_costs.values())
        
        return {
            "total_estimate": total,
            "breakdown": base_costs,
            "per_person": total / family_size if family_size > 0 else total,
            "currency": "USD",
            "confidence": 0.8
        }
    
    async def _generate_travel_tips(self, destination: str, preferences: Dict) -> List[str]:
        """Generate personalized travel tips"""
        tips = [
            f"Book accommodations in advance for {destination}",
            "Pack comfortable walking shoes for family sightseeing",
            "Learn basic local phrases for better cultural experience",
            "Consider purchasing a family city pass for attractions"
        ]
        
        # Add destination-specific tips
        if destination == "Dubai":
            tips.extend([
                "Dress modestly when visiting religious sites",
                "Stay hydrated in the desert climate",
                "Use the metro system for efficient transportation"
            ])
        elif destination == "Istanbul":
            tips.extend([
                "Try traditional Turkish breakfast as a family",
                "Visit mosques during non-prayer times",
                "Bargain politely in the Grand Bazaar"
            ])
        
        return tips
    
    async def _find_similar_destinations(self, destination: str, past_travels: List[Dict] = None) -> List[str]:
        """Find similar destinations based on travel history"""
        similar = []
        
        if destination == "Dubai":
            similar = ["Abu Dhabi", "Doha", "Kuwait City"]
        elif destination == "Istanbul":
            similar = ["Athens", "Rome", "Budapest"]
        
        # Filter out places already visited
        if past_travels:
            visited = [travel.get("destination") for travel in past_travels]
            similar = [dest for dest in similar if dest not in visited]
        
        return similar

class AIGameMaster:
    """AI Game Master for family games and activities"""
    
    def __init__(self):
        self.active_games = {}
        self.game_rules = self._load_game_rules()
    
    def _load_game_rules(self) -> Dict[str, Any]:
        """Load game rules and configurations"""
        return {
            "mafia": {
                "min_players": 4,
                "max_players": 12,
                "roles": ["godfather", "assassin", "detective", "doctor", "bodyguard", "jester", "survivor"],
                "phases": ["night", "day", "voting"],
                "win_conditions": {
                    "mafia": "eliminate_all_civilians",
                    "civilians": "eliminate_all_mafia"
                }
            },
            "among_us_family": {
                "min_players": 4,
                "max_players": 10,
                "roles": ["impostor", "crewmate"],
                "tasks": ["location_check", "photo_verification", "quiz_challenge"],
                "meeting_triggers": ["emergency_button", "body_found", "suspicious_activity"]
            },
            "treasure_hunt": {
                "min_players": 2,
                "max_players": 20,
                "challenge_types": ["riddle", "photo", "location", "trivia"],
                "difficulty_levels": ["easy", "medium", "hard"]
            }
        }
    
    async def create_game_session(
        self, 
        game_type: str, 
        players: List[Dict], 
        settings: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Create a new game session with AI management"""
        
        game_id = f"{game_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        game_session = {
            "id": game_id,
            "type": game_type,
            "players": players,
            "status": "setup",
            "created_at": datetime.now().isoformat(),
            "settings": settings or {},
            "current_phase": "setup",
            "game_state": {},
            "ai_decisions": []
        }
        
        if game_type == "mafia":
            game_session = await self._setup_mafia_game(game_session)
        elif game_type == "among_us_family":
            game_session = await self._setup_among_us_game(game_session)
        elif game_type == "treasure_hunt":
            game_session = await self._setup_treasure_hunt(game_session)
        
        self.active_games[game_id] = game_session
        return game_session
    
    async def _setup_mafia_game(self, session: Dict) -> Dict:
        """Set up Mafia game with role assignment"""
        players = session["players"]
        player_count = len(players)
        
        # Calculate role distribution
        mafia_count = max(1, player_count // 4)
        special_roles = min(2, player_count - mafia_count - 1)
        civilian_count = player_count - mafia_count - special_roles
        
        # Assign roles
        roles = ["godfather"] + ["assassin"] * (mafia_count - 1)
        roles += ["detective", "doctor"][:special_roles]
        roles += ["civilian"] * civilian_count
        
        # Shuffle and assign
        import random
        random.shuffle(roles)
        
        for i, player in enumerate(players):
            player["role"] = roles[i] if i < len(roles) else "civilian"
            player["status"] = "alive"
            player["votes"] = 0
        
        session["game_state"] = {
            "phase": "night",
            "round": 1,
            "eliminated_players": [],
            "voting_results": {},
            "night_actions": {}
        }
        
        session["status"] = "active"
        return session
    
    async def _setup_among_us_game(self, session: Dict) -> Dict:
        """Set up Among Us family variant"""
        players = session["players"]
        impostor_count = max(1, len(players) // 5)
        
        # Assign roles
        import random
        impostors = random.sample(players, impostor_count)
        
        for player in players:
            if player in impostors:
                player["role"] = "impostor"
                player["tasks_completed"] = 0
                player["max_tasks"] = 0
            else:
                player["role"] = "crewmate"
                player["tasks_completed"] = 0
                player["max_tasks"] = 5
            player["status"] = "alive"
        
        session["game_state"] = {
            "tasks_total": len(players) * 5,
            "tasks_completed": 0,
            "emergency_meetings_left": 3,
            "meetings_called": [],
            "eliminated_players": []
        }
        
        session["status"] = "active"
        return session
    
    async def _setup_treasure_hunt(self, session: Dict) -> Dict:
        """Set up treasure hunt with location-based challenges"""
        players = session["players"]
        difficulty = session["settings"].get("difficulty", "medium")
        
        challenges = await self._generate_treasure_hunt_challenges(difficulty)
        
        session["game_state"] = {
            "challenges": challenges,
            "teams": await self._create_teams(players),
            "current_challenge_index": 0,
            "leaderboard": {},
            "completed_challenges": []
        }
        
        session["status"] = "active"
        return session
    
    async def _generate_treasure_hunt_challenges(self, difficulty: str) -> List[Dict]:
        """Generate challenges for treasure hunt"""
        base_challenges = [
            {
                "id": 1,
                "type": "photo",
                "title": "Family Portrait",
                "description": "Take a creative family photo at a landmark",
                "points": 100,
                "verification": "ai_photo_analysis"
            },
            {
                "id": 2,
                "type": "riddle",
                "title": "Cultural Knowledge",
                "description": "Solve a riddle about local culture",
                "points": 150,
                "verification": "answer_check"
            },
            {
                "id": 3,
                "type": "location",
                "title": "Scavenger Hunt",
                "description": "Find specific items at designated location",
                "points": 200,
                "verification": "gps_check"
            }
        ]
        
        if difficulty == "hard":
            for challenge in base_challenges:
                challenge["points"] *= 1.5
                challenge["time_limit"] = 1800  # 30 minutes
        
        return base_challenges
    
    async def _create_teams(self, players: List[Dict]) -> List[Dict]:
        """Create balanced teams for group activities"""
        import random
        random.shuffle(players)
        
        team_size = max(2, len(players) // 3)
        teams = []
        
        for i in range(0, len(players), team_size):
            team_players = players[i:i+team_size]
            team = {
                "id": f"team_{len(teams) + 1}",
                "name": f"Team {len(teams) + 1}",
                "players": team_players,
                "score": 0,
                "completed_challenges": []
            }
            teams.append(team)
        
        return teams
    
    async def process_game_action(
        self, 
        game_id: str, 
        action: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Process game actions and update game state"""
        
        if game_id not in self.active_games:
            return {"error": "Game not found"}
        
        game = self.active_games[game_id]
        game_type = game["type"]
        
        if game_type == "mafia":
            return await self._process_mafia_action(game, action)
        elif game_type == "among_us_family":
            return await self._process_among_us_action(game, action)
        elif game_type == "treasure_hunt":
            return await self._process_treasure_hunt_action(game, action)
        
        return {"error": "Unknown game type"}
    
    async def _process_mafia_action(self, game: Dict, action: Dict) -> Dict:
        """Process Mafia game actions"""
        action_type = action.get("type")
        player_id = action.get("player_id")
        
        if action_type == "vote":
            target_id = action.get("target_id")
            return await self._process_mafia_vote(game, player_id, target_id)
        elif action_type == "night_action":
            return await self._process_mafia_night_action(game, action)
        elif action_type == "advance_phase":
            return await self._advance_mafia_phase(game)
        
        return {"error": "Unknown action type"}
    
    async def _process_mafia_vote(self, game: Dict, voter_id: str, target_id: str) -> Dict:
        """Process voting in Mafia game"""
        # Find voter and target
        voter = None
        target = None
        
        for player in game["players"]:
            if player["id"] == voter_id:
                voter = player
            if player["id"] == target_id:
                target = player
        
        if not voter or not target:
            return {"error": "Player not found"}
        
        if voter["status"] != "alive":
            return {"error": "Dead players cannot vote"}
        
        # Record vote
        voting_results = game["game_state"].get("voting_results", {})
        voting_results[voter_id] = target_id
        game["game_state"]["voting_results"] = voting_results
        
        # Check if all alive players have voted
        alive_players = [p for p in game["players"] if p["status"] == "alive"]
        if len(voting_results) >= len(alive_players):
            return await self._resolve_mafia_voting(game)
        
        return {
            "success": True,
            "message": f"{voter['name']} voted for {target['name']}",
            "votes_remaining": len(alive_players) - len(voting_results)
        }
    
    async def _resolve_mafia_voting(self, game: Dict) -> Dict:
        """Resolve voting results in Mafia game"""
        voting_results = game["game_state"]["voting_results"]
        
        # Count votes
        vote_counts = {}
        for target_id in voting_results.values():
            vote_counts[target_id] = vote_counts.get(target_id, 0) + 1
        
        # Find player with most votes
        if vote_counts:
            eliminated_id = max(vote_counts, key=vote_counts.get)
            max_votes = vote_counts[eliminated_id]
            
            # Check for tie
            tied_players = [pid for pid, count in vote_counts.items() if count == max_votes]
            
            if len(tied_players) > 1:
                return {
                    "result": "tie",
                    "message": "Voting resulted in a tie. No one is eliminated.",
                    "tied_players": tied_players
                }
            
            # Eliminate player
            for player in game["players"]:
                if player["id"] == eliminated_id:
                    player["status"] = "eliminated"
                    game["game_state"]["eliminated_players"].append({"id": player["id"], "name": player["name"], "role": player["role"]})
                    return {
                        "result": "elimination",
                        "message": f"{player['name']} has been eliminated.",
                        "eliminated_player": {"id": player["id"], "name": player["name"], "role": player["role"]}
                    }
            
            # Clear voting results
            game["game_state"]["voting_results"] = {}
            
            # Check win conditions
            win_check = await self._check_mafia_win_conditions(game)
            if win_check["game_over"]:
                game["status"] = "finished"
                return win_check
            
            return {
                "result": "elimination",
                "eliminated_player": eliminated_id,
                "message": f"Player {eliminated_id} has been eliminated by vote"
            }
        
        return {"result": "no_elimination", "message": "No votes cast"}
    
    async def _check_mafia_win_conditions(self, game: Dict) -> Dict:
        """Check if game has ended"""
        alive_players = [p for p in game["players"] if p["status"] == "alive"]
        mafia_alive = [p for p in alive_players if p["role"] in ["godfather", "assassin"]]
        civilians_alive = [p for p in alive_players if p["role"] not in ["godfather", "assassin"]]
        
        if len(mafia_alive) == 0:
            return {
                "game_over": True,
                "winner": "civilians",
                "message": "Civilians win! All mafia members have been eliminated."
            }
        elif len(mafia_alive) >= len(civilians_alive):
            return {
                "game_over": True,
                "winner": "mafia", 
                "message": "Mafia wins! They equal or outnumber the civilians."
            }
        
        return {"game_over": False}

# Export AI services
family_ai_analyzer = FamilyAIAnalyzer()
travel_ai_assistant = TravelAIAssistant()
ai_game_master = AIGameMaster() 