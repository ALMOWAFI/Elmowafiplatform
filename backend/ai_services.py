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
from typing import List, Dict, Any, Optional
from pathlib import Path
import requests
import cv2
import numpy as np
from PIL import Image
import base64
from datetime import datetime

# Import from backend modules instead of using sys.path.append

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
        """Detect emotions in the image with enhanced analysis"""
        try:
            # Try to use advanced emotion detection if available
            try:
                # This would integrate with Azure Face API or similar
                # For now, use enhanced heuristics
                pass
            except Exception:
                logger.info("Advanced emotion detection not available, using enhanced heuristics")
            
            # Enhanced emotion detection based on image analysis
            hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
            brightness = np.mean(hsv[:, :, 2])
            saturation = np.mean(hsv[:, :, 1])
            
            # Analyze color distribution
            blue_channel = image[:, :, 0]
            green_channel = image[:, :, 1]
            red_channel = image[:, :, 2]
            
            blue_ratio = np.mean(blue_channel) / 255
            green_ratio = np.mean(green_channel) / 255
            red_ratio = np.mean(red_channel) / 255
            
            # Determine emotions based on multiple factors
            emotions = []
            
            # Brightness-based emotions
            if brightness > 180:
                emotions.extend(["happy", "joyful", "excited"])
            elif brightness > 120:
                emotions.extend(["peaceful", "content", "calm"])
            elif brightness > 80:
                emotions.extend(["contemplative", "serene", "relaxed"])
            else:
                emotions.extend(["mysterious", "dramatic", "intense"])
            
            # Color-based emotions
            if red_ratio > 0.4:
                emotions.extend(["warm", "passionate"])
            if blue_ratio > 0.4:
                emotions.extend(["cool", "tranquil"])
            if green_ratio > 0.4:
                emotions.extend(["natural", "fresh"])
            
            # Saturation-based emotions
            if saturation > 100:
                emotions.extend(["vibrant", "energetic"])
            else:
                emotions.extend(["soft", "gentle"])
            
            # Remove duplicates and limit to top emotions
            unique_emotions = list(dict.fromkeys(emotions))
            return unique_emotions[:4]  # Return top 4 emotions
            
        except Exception as e:
            logger.error(f"Error in emotion detection: {e}")
            return ["neutral", "calm"]  # Fallback emotions
    
    async def _detect_objects(self, image: np.ndarray) -> List[Dict[str, Any]]:
        """Detect objects in the image with enhanced analysis"""
        try:
            height, width = image.shape[:2]
            objects = []
            
            # Enhanced color-based detection
            hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
            
            # Sky detection (blue)
            blue_mask = cv2.inRange(hsv, (100, 50, 50), (130, 255, 255))
            blue_ratio = np.sum(blue_mask > 0) / (height * width)
            
            if blue_ratio > 0.3:
                objects.append({
                    "name": "sky", 
                    "confidence": min(0.9, blue_ratio * 2), 
                    "category": "nature",
                    "position": {"x": 0, "y": 0, "width": width, "height": int(height * 0.6)}
                })
            
            # Vegetation detection (green)
            green_mask = cv2.inRange(hsv, (40, 50, 50), (80, 255, 255))
            green_ratio = np.sum(green_mask > 0) / (height * width)
            
            if green_ratio > 0.2:
                objects.append({
                    "name": "vegetation", 
                    "confidence": min(0.8, green_ratio * 3), 
                    "category": "nature",
                    "position": {"x": 0, "y": int(height * 0.4), "width": width, "height": int(height * 0.6)}
                })
            
            # Water detection (blue-green)
            water_mask = cv2.inRange(hsv, (90, 100, 100), (120, 255, 255))
            water_ratio = np.sum(water_mask > 0) / (height * width)
            
            if water_ratio > 0.15:
                objects.append({
                    "name": "water", 
                    "confidence": min(0.85, water_ratio * 4), 
                    "category": "nature",
                    "position": {"x": 0, "y": int(height * 0.5), "width": width, "height": int(height * 0.5)}
                })
            
            # Building/indoor detection (gray/brown)
            gray_mask = cv2.inRange(hsv, (0, 0, 50), (180, 30, 200))
            gray_ratio = np.sum(gray_mask > 0) / (height * width)
            
            if gray_ratio > 0.4:
                objects.append({
                    "name": "building", 
                    "confidence": min(0.75, gray_ratio * 1.5), 
                    "category": "architecture",
                    "position": {"x": 0, "y": 0, "width": width, "height": height}
                })
            
            # Face-based object detection
            if self.face_cascade:
                gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
                faces = self.face_cascade.detectMultiScale(gray, 1.1, 4)
                
                for i, (x, y, w, h) in enumerate(faces):
                    objects.append({
                        "name": f"person_{i+1}", 
                        "confidence": 0.9, 
                        "category": "person",
                        "position": {"x": int(x), "y": int(y), "width": int(w), "height": int(h)}
                    })
            
            # Scene classification
            if len(objects) == 0:
                # Indoor scene
                objects.append({
                    "name": "indoor setting", 
                    "confidence": 0.6, 
                    "category": "location",
                    "position": {"x": 0, "y": 0, "width": width, "height": height}
                })
            elif any(obj["category"] == "nature" for obj in objects):
                # Outdoor scene
                objects.append({
                    "name": "outdoor setting", 
                    "confidence": 0.8, 
                    "category": "location",
                    "position": {"x": 0, "y": 0, "width": width, "height": height}
                })
            
            # Family gathering detection
            person_count = len([obj for obj in objects if obj["category"] == "person"])
            if person_count >= 2:
                objects.append({
                    "name": "family gathering", 
                    "confidence": 0.7, 
                    "category": "event",
                    "position": {"x": 0, "y": 0, "width": width, "height": height}
                })
            
            return objects
            
        except Exception as e:
            logger.error(f"Error in object detection: {e}")
            return [
                {
                    "name": "general scene", 
                    "confidence": 0.5, 
                    "category": "general",
                    "position": {"x": 0, "y": 0, "width": 100, "height": 100}
                }
            ]
    
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
            # Try to use Tesseract OCR if available
            try:
                import pytesseract
                from PIL import Image
                
                # Open image with PIL
                pil_image = Image.open(image_path)
                
                # Extract text using Tesseract
                text = pytesseract.image_to_string(pil_image)
                
                # Clean up the text
                if text and text.strip():
                    return text.strip()
                    
            except ImportError:
                logger.info("Tesseract not available, using mock OCR")
            
            # Mock OCR for development/testing
            import random
            mock_texts = [
                "Happy Birthday!",
                "Family Reunion 2024",
                "Best vacation ever!",
                "Love you all",
                "Memories forever",
                "Family time",
                "Special moment",
                "Together forever"
            ]
            
            # Return mock text with 30% probability
            if random.random() < 0.3:
                return random.choice(mock_texts)
            
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
    
    def __init__(self):
        self.travel_knowledge_base = self._load_travel_knowledge()
    
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
    
    async def get_travel_recommendations(
        self, 
        destination: str, 
        family_preferences: Dict[str, Any],
        past_travels: List[Dict] = None
    ) -> Dict[str, Any]:
        """Generate AI-powered travel recommendations"""
        
        recommendations = {
            "destination_analysis": await self._analyze_destination(destination),
            "family_activities": await self._suggest_family_activities(destination, family_preferences),
            "cultural_experiences": await self._suggest_cultural_experiences(destination),
            "budget_estimate": await self._estimate_budget(destination, family_preferences),
            "travel_tips": await self._generate_travel_tips(destination, family_preferences),
            "similar_destinations": await self._find_similar_destinations(destination, past_travels)
        }
        
        return recommendations
    
    async def _analyze_destination(self, destination: str) -> Dict[str, Any]:
        """Analyze destination for family suitability"""
        dest_info = self.travel_knowledge_base["destinations"].get(destination, {})
        
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
        
        # Generate challenges and create balanced teams
        challenges = await self._generate_treasure_hunt_challenges(difficulty)
        teams = await self._create_teams(players)
        
        # Initialize game state
        session["game_state"] = {
            "challenges": challenges,
            "teams": teams,
            "total_challenges": len(challenges),
            "max_hints_per_team": 3,
            "hint_penalty": 5,  # Points deducted for using a hint
            "phase": "active",
            "winning_team": None,
            "start_time": datetime.now().isoformat(),
            "game_duration": 3600,  # Default 1 hour game duration
            "leaderboard": {}  # Will be updated as teams complete challenges
        }
        
        session["status"] = "active"
        return session
    
    async def _generate_treasure_hunt_challenges(self, difficulty: str) -> List[Dict]:
        """Generate challenges for treasure hunt"""
        import uuid
        
        # Define challenge difficulty multipliers
        difficulty_multipliers = {
            "easy": 0.8,
            "medium": 1.0,
            "hard": 1.5
        }
        
        multiplier = difficulty_multipliers.get(difficulty, 1.0)
        
        # Base challenges with proper structure for solution verification
        base_challenges = [
            {
                "id": str(uuid.uuid4()),
                "level": 1,
                "type": "text",
                "title": "Family Riddle",
                "description": "What has many keys but can't open a single lock?",
                "points": int(100 * multiplier),
                "solution": "piano",
                "hints": [
                    "It's a musical instrument",
                    "It has black and white keys",
                    "You play it with your fingers"
                ]
            },
            {
                "id": str(uuid.uuid4()),
                "level": 2,
                "type": "multiple_choice",
                "title": "Family Traditions",
                "description": "Which of these is traditionally considered a family value?",
                "options": ["Independence", "Loyalty", "Competition", "Isolation"],
                "correct_options": ["Loyalty"],
                "points": int(150 * multiplier),
                "hints": [
                    "Think about what keeps families together",
                    "It involves being faithful to one another",
                    "It's about standing by your family members"
                ]
            },
            {
                "id": str(uuid.uuid4()),
                "level": 3,
                "type": "image",
                "title": "Family Photo Challenge",
                "description": "Take a photo that represents 'togetherness' and identify what it shows",
                "points": int(200 * multiplier),
                "solution_tags": ["family", "together", "group", "hug", "holding hands", "embrace", "unity"],
                "hints": [
                    "Think about physical expressions of family bonds",
                    "Consider how family members show they care about each other",
                    "Actions that show unity and connection"
                ]
            },
            {
                "id": str(uuid.uuid4()),
                "level": 4,
                "type": "text",
                "title": "Family Word Scramble",
                "description": "Unscramble these letters to find a word related to family: IRTADNITO",
                "points": int(175 * multiplier),
                "solution": "tradition",
                "hints": [
                    "It's something families pass down through generations",
                    "It relates to customs and practices",
                    "It starts with 'T' and ends with 'N'"
                ]
            },
            {
                "id": str(uuid.uuid4()),
                "level": 5,
                "type": "location",
                "title": "Family Landmark",
                "description": "Find the coordinates of a famous family-friendly landmark in your city",
                "points": int(250 * multiplier),
                "solution": "40.689247,-74.044502",  # Example: Statue of Liberty coordinates
                "proximity_threshold": 0.005,  # Approximately 500m radius
                "hints": [
                    "It's a place where families often take photos",
                    "It's a well-known tourist attraction",
                    "It's a symbol of freedom and welcome"
                ]
            }
        ]
        
        # Add time limits based on difficulty
        time_limits = {
            "easy": 3600,    # 60 minutes
            "medium": 2700,  # 45 minutes
            "hard": 1800     # 30 minutes
        }
        
        for challenge in base_challenges:
            challenge["time_limit"] = time_limits.get(difficulty, 2700)
        
        return base_challenges
    
    async def _create_teams(self, players: List[Dict]) -> List[Dict]:
        """Create balanced teams for treasure hunt game"""
        import random
        import uuid
        
        # Shuffle players for random team assignment
        random.shuffle(players)
        
        # Determine team size based on player count
        # For smaller groups, create 2-3 teams
        # For larger groups, aim for 3-4 players per team
        if len(players) <= 6:
            team_size = max(1, len(players) // 2)  # 2-3 players per team for small groups
        else:
            team_size = max(2, len(players) // 3)  # 3-4 players per team for larger groups
        
        teams = []
        team_names = ["Explorers", "Adventurers", "Pathfinders", "Navigators", "Voyagers", "Discoverers"]
        
        for i in range(0, len(players), team_size):
            team_players = players[i:i+team_size]
            
            # Get a team name or generate a numbered one if we run out of names
            team_name = team_names[len(teams)] if len(teams) < len(team_names) else f"Team {len(teams) + 1}"
            
            team = {
                "id": str(uuid.uuid4()),
                "name": team_name,
                "players": team_players,
                "score": 0,
                "challenges_completed": [],
                "current_challenge": 1,  # Start at first challenge
                "hints_used": 0,
                "hints_used_for_challenges": {},
                "wrong_attempts": 0,
                "last_activity": datetime.now().isoformat()
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
        
    async def _process_mafia_night_action(self, game: Dict, action: Dict) -> Dict:
        """Process night actions in Mafia game"""
        player_id = action.get("player_id")
        target_id = action.get("target_id")
        action_role = action.get("role")
        
        # Find player and target
        player = None
        target = None
        
        for p in game["players"]:
            if p["id"] == player_id:
                player = p
            if p["id"] == target_id:
                target = p
        
        if not player or not target:
            return {"error": "Player not found"}
        
        if player["status"] != "alive":
            return {"error": "Dead players cannot perform night actions"}
        
        if player["role"] != action_role:
            return {"error": "Player cannot perform this role's action"}
        
        # Record night action
        night_actions = game["game_state"].get("night_actions", {})
        night_actions[player_id] = {
            "target_id": target_id,
            "action_type": action_role
        }
        game["game_state"]["night_actions"] = night_actions
        
        # Check if all role players have submitted their night actions
        role_players = [p for p in game["players"] if p["status"] == "alive" and 
                       p["role"] in ["godfather", "assassin", "detective", "doctor"]]
        
        if len(night_actions) >= len(role_players):
            return await self._resolve_mafia_night_actions(game)
        
        return {
            "success": True,
            "message": f"{player['name']} performed {action_role} action on {target['name']}",
            "actions_remaining": len(role_players) - len(night_actions)
        }
    
    async def _resolve_mafia_night_actions(self, game: Dict) -> Dict:
        """Resolve all night actions and determine outcomes"""
        night_actions = game["game_state"]["night_actions"]
        players = game["players"]
        
        # Track protected and targeted players
        protected_ids = set()
        targeted_ids = set()
        investigated_ids = set()
        
        # Process protection actions first
        for player_id, action in night_actions.items():
            player = next((p for p in players if p["id"] == player_id), None)
            if not player or player["status"] != "alive":
                continue
                
            if player["role"] == "doctor":
                protected_ids.add(action["target_id"])
        
        # Process killing actions
        for player_id, action in night_actions.items():
            player = next((p for p in players if p["id"] == player_id), None)
            if not player or player["status"] != "alive":
                continue
                
            if player["role"] in ["godfather", "assassin"]:
                targeted_ids.add(action["target_id"])
        
        # Process investigation actions
        for player_id, action in night_actions.items():
            player = next((p for p in players if p["id"] == player_id), None)
            if not player or player["status"] != "alive":
                continue
                
            if player["role"] == "detective":
                investigated_ids.add(action["target_id"])
        
        # Determine elimination
        eliminated_id = None
        for target_id in targeted_ids:
            if target_id not in protected_ids:
                eliminated_id = target_id
                # Eliminate player
                for player in players:
                    if player["id"] == eliminated_id:
                        player["status"] = "eliminated"
                        game["game_state"]["eliminated_players"].append(player)
                        break
        
        # Prepare investigation results
        investigation_results = {}
        for target_id in investigated_ids:
            target = next((p for p in players if p["id"] == target_id), None)
            if target:
                is_mafia = target["role"] in ["godfather", "assassin"]
                investigation_results[target_id] = is_mafia
        
        # Clear night actions
        game["game_state"]["night_actions"] = {}
        
        # Check win conditions
        win_check = await self._check_mafia_win_conditions(game)
        if win_check["game_over"]:
            game["status"] = "finished"
            return win_check
        
        # Advance to day phase
        game["game_state"]["phase"] = "day"
        
        result = {
            "phase_changed": True,
            "new_phase": "day",
            "investigation_results": investigation_results
        }
        
        if eliminated_id:
            result["elimination"] = True
            result["eliminated_player"] = eliminated_id
            result["message"] = f"Player {eliminated_id} was eliminated during the night"
        else:
            result["elimination"] = False
            result["message"] = "No one was eliminated during the night"
        
        return result
    
    async def _advance_mafia_phase(self, game: Dict) -> Dict:
        """Advance game to next phase"""
        current_phase = game["game_state"]["phase"]
        
        if current_phase == "night":
            # If night phase is ending without all actions, resolve what we have
            if game["game_state"].get("night_actions", {}):
                return await self._resolve_mafia_night_actions(game)
            else:
                game["game_state"]["phase"] = "day"
                return {
                    "phase_changed": True,
                    "new_phase": "day",
                    "message": "Night phase ended with no actions. Day phase begins."
                }
        
        elif current_phase == "day":
            game["game_state"]["phase"] = "voting"
            return {
                "phase_changed": True,
                "new_phase": "voting",
                "message": "Day phase ended. Voting phase begins."
            }
        
        elif current_phase == "voting":
            # If voting phase is ending without all votes, resolve what we have
            if game["game_state"].get("voting_results", {}):
                result = await self._resolve_mafia_voting(game)
                # After voting resolution, move to night phase and increment round
                game["game_state"]["phase"] = "night"
                game["game_state"]["round"] = game["game_state"].get("round", 1) + 1
                
                result["phase_changed"] = True
                result["new_phase"] = "night"
                result["new_round"] = game["game_state"]["round"]
                return result
            else:
                game["game_state"]["phase"] = "night"
                game["game_state"]["round"] = game["game_state"].get("round", 1) + 1
                return {
                    "phase_changed": True,
                    "new_phase": "night",
                    "new_round": game["game_state"]["round"],
                    "message": "Voting phase ended with no votes. Night phase begins."
                }
        
        return {"error": "Unknown phase"}
    
    async def _process_among_us_action(self, game: Dict, action: Dict) -> Dict:
        """Process Among Us family variant actions"""
        action_type = action.get("type")
        player_id = action.get("player_id")
        
        # Find player
        player = None
        for p in game["players"]:
            if p["id"] == player_id:
                player = p
                break
        
        if not player:
            return {"error": "Player not found"}
            
        if player["status"] != "alive":
            return {"error": "Eliminated players cannot perform actions"}
        
        if action_type == "complete_task":
            return await self._process_among_us_task_completion(game, player, action)
        elif action_type == "emergency_meeting":
            return await self._call_among_us_emergency_meeting(game, player)
        elif action_type == "report_body":
            target_id = action.get("target_id")
            return await self._report_among_us_body(game, player, target_id)
        elif action_type == "vote":
            target_id = action.get("target_id")
            return await self._process_among_us_vote(game, player, target_id)
        
        return {"error": "Unknown action type"}
    
    async def _process_among_us_task_completion(self, game: Dict, player: Dict, action: Dict) -> Dict:
        """Process task completion in Among Us family variant"""
        task_id = action.get("task_id")
        verification = action.get("verification_data")
        
        # Impostors can fake task completion
        if player["role"] == "impostor":
            return {
                "success": True,
                "message": "Task completion faked",
                "is_fake": True
            }
        
        # For crewmates, verify and update task completion
        if verification:
            # Increment completed tasks
            player["tasks_completed"] = player.get("tasks_completed", 0) + 1
            game["game_state"]["tasks_completed"] = game["game_state"].get("tasks_completed", 0) + 1
            
            # Check win condition for tasks
            if game["game_state"]["tasks_completed"] >= game["game_state"]["tasks_total"]:
                game["status"] = "finished"
                return {
                    "game_over": True,
                    "winner": "crewmates",
                    "message": "Crewmates win! All tasks completed."
                }
            
            return {
                "success": True,
                "message": "Task completed successfully",
                "tasks_completed": player["tasks_completed"],
                "total_tasks_completed": game["game_state"]["tasks_completed"],
                "total_tasks": game["game_state"]["tasks_total"]
            }
        
        return {"error": "Task verification failed"}
    
    async def _call_among_us_emergency_meeting(self, game: Dict, player: Dict) -> Dict:
        """Call emergency meeting in Among Us family variant"""
        if game["game_state"]["emergency_meetings_left"] <= 0:
            return {"error": "No emergency meetings left"}
        
        # Reduce available emergency meetings
        game["game_state"]["emergency_meetings_left"] -= 1
        
        # Record meeting
        meeting = {
            "caller": player["id"],
            "type": "emergency",
            "timestamp": datetime.now().isoformat()
        }
        game["game_state"]["meetings_called"].append(meeting)
        
        # Set game to meeting phase
        game["game_state"]["phase"] = "meeting"
        game["game_state"]["voting_results"] = {}
        
        return {
            "success": True,
            "message": f"Emergency meeting called by {player['name']}",
            "meetings_left": game["game_state"]["emergency_meetings_left"],
            "phase": "meeting"
        }
    
    async def _report_among_us_body(self, game: Dict, player: Dict, target_id: str) -> Dict:
        """Report eliminated player in Among Us family variant"""
        # Find target player
        target = None
        for p in game["players"]:
            if p["id"] == target_id:
                target = p
                break
        
        if not target:
            return {"error": "Target player not found"}
        
        if target["status"] != "eliminated":
            return {"error": "Cannot report a player who is not eliminated"}
        
        # Record meeting
        meeting = {
            "caller": player["id"],
            "type": "body_report",
            "reported_player": target_id,
            "timestamp": datetime.now().isoformat()
        }
        game["game_state"]["meetings_called"].append(meeting)
        
        # Set game to meeting phase
        game["game_state"]["phase"] = "meeting"
        game["game_state"]["voting_results"] = {}
        
        return {
            "success": True,
            "message": f"{player['name']} reported {target['name']}'s body",
            "phase": "meeting"
        }
    
    async def _process_among_us_vote(self, game: Dict, voter: Dict, target_id: str) -> Dict:
        """Process voting in Among Us family variant"""
        if game["game_state"].get("phase") != "meeting":
            return {"error": "Voting is only allowed during meetings"}
        
        # Find target
        target = None
        if target_id != "skip":
            for p in game["players"]:
                if p["id"] == target_id:
                    target = p
                    break
            
            if not target:
                return {"error": "Target player not found"}
            
            if target["status"] != "alive":
                return {"error": "Cannot vote for eliminated players"}
        
        # Record vote
        voting_results = game["game_state"].get("voting_results", {})
        voting_results[voter["id"]] = target_id
        game["game_state"]["voting_results"] = voting_results
        
        # Check if all alive players have voted
        alive_players = [p for p in game["players"] if p["status"] == "alive"]
        if len(voting_results) >= len(alive_players):
            return await self._resolve_among_us_voting(game)
        
        return {
            "success": True,
            "message": f"{voter['name']} voted" + (f" for {target['name']}" if target_id != "skip" else " to skip"),
            "votes_remaining": len(alive_players) - len(voting_results)
        }
    
    async def _resolve_among_us_voting(self, game: Dict) -> Dict:
        """Resolve voting results in Among Us family variant"""
        voting_results = game["game_state"]["voting_results"]
        
        # Count votes
        vote_counts = {}
        for target_id in voting_results.values():
            vote_counts[target_id] = vote_counts.get(target_id, 0) + 1
        
        # Find player with most votes
        if vote_counts:
            max_votes = max(vote_counts.values())
            most_voted = [pid for pid, count in vote_counts.items() if count == max_votes]
            
            # Check for tie or skip winning
            if len(most_voted) > 1 or ("skip" in most_voted):
                # Clear voting results
                game["game_state"]["voting_results"] = {}
                game["game_state"]["phase"] = "tasks"
                
                return {
                    "result": "no_elimination",
                    "message": "No one was ejected (tie or skip vote)",
                    "phase": "tasks"
                }
            
            eliminated_id = most_voted[0]
            
            # Eliminate player
            eliminated_player = None
            for player in game["players"]:
                if player["id"] == eliminated_id:
                    player["status"] = "eliminated"
                    game["game_state"]["eliminated_players"].append(player)
                    eliminated_player = player
                    break
            
            # Clear voting results
            game["game_state"]["voting_results"] = {}
            game["game_state"]["phase"] = "tasks"
            
            # Check win conditions
            win_check = await self._check_among_us_win_conditions(game)
            if win_check["game_over"]:
                game["status"] = "finished"
                return win_check
            
            return {
                "result": "elimination",
                "eliminated_player": eliminated_id,
                "was_impostor": eliminated_player["role"] == "impostor" if eliminated_player else False,
                "message": f"{eliminated_player['name']} was ejected" + 
                          (" (They were an Impostor)" if eliminated_player["role"] == "impostor" else " (They were not an Impostor)"),
                "phase": "tasks"
            }
        
        return {"result": "no_elimination", "message": "No votes cast"}
    
    async def _check_among_us_win_conditions(self, game: Dict) -> Dict:
        """Check if Among Us family game has ended"""
        alive_players = [p for p in game["players"] if p["status"] == "alive"]
        impostors_alive = [p for p in alive_players if p["role"] == "impostor"]
        crewmates_alive = [p for p in alive_players if p["role"] == "crewmate"]
        
        # Check if all tasks are completed
        tasks_completed = game["game_state"].get("tasks_completed", 0)
        tasks_total = game["game_state"].get("tasks_total", 0)
        
        if tasks_completed >= tasks_total:
            return {
                "game_over": True,
                "winner": "crewmates",
                "message": "Crewmates win! All tasks completed."
            }
        
        # Check if all impostors are eliminated
        if len(impostors_alive) == 0:
            return {
                "game_over": True,
                "winner": "crewmates",
                "message": "Crewmates win! All impostors have been eliminated."
            }
        
        # Check if impostors equal or outnumber crewmates
        if len(impostors_alive) >= len(crewmates_alive):
            return {
                "game_over": True,
                "winner": "impostors",
                "message": "Impostors win! They equal or outnumber the crewmates."
            }
        
        return {"game_over": False}
    
    async def _process_treasure_hunt_action(self, game: Dict, action: Dict) -> Dict:
        """Process Treasure Hunt game actions"""
        action_type = action.get("type")
        team_id = action.get("team_id")
        
        # Find team
        team = None
        for t in game["teams"]:
            if t["id"] == team_id:
                team = t
                break
        
        if not team:
            return {"error": "Team not found"}
        
        if action_type == "solve_challenge":
            challenge_id = action.get("challenge_id")
            solution = action.get("solution")
            return await self._process_treasure_hunt_challenge(game, team, challenge_id, solution)
        elif action_type == "use_hint":
            challenge_id = action.get("challenge_id")
            return await self._use_treasure_hunt_hint(game, team, challenge_id)
        elif action_type == "advance_team":
            return await self._advance_treasure_hunt_team(game, team)
        
        return {"error": "Unknown action type"}
    
    async def _process_treasure_hunt_challenge(self, game: Dict, team: Dict, challenge_id: str, solution: str) -> Dict:
        """Process challenge solution in Treasure Hunt game"""
        # Find the challenge
        challenge = None
        for c in game["game_state"]["challenges"]:
            if c["id"] == challenge_id:
                challenge = c
                break
        
        if not challenge:
            return {"error": "Challenge not found"}
        
        # Check if team is at the right challenge level
        if team["current_challenge"] != challenge["level"]:
            return {"error": "Team is not at this challenge level"}
        
        # Check solution
        if self._verify_treasure_hunt_solution(challenge, solution):
            # Update team progress
            team["challenges_completed"].append(challenge_id)
            team["score"] += challenge["points"]
            
            # Check if this was the final challenge
            if challenge["level"] >= game["game_state"]["total_challenges"]:
                # Check if this team is the first to finish
                if not game["game_state"].get("winning_team"):
                    game["game_state"]["winning_team"] = team["id"]
                    game["status"] = "finished"
                    
                    return {
                        "success": True,
                        "message": f"Team {team['name']} has found the treasure and won the game!",
                        "game_over": True,
                        "winner": team["name"]
                    }
                else:
                    return {
                        "success": True,
                        "message": f"Team {team['name']} has found the treasure, but another team already won!",
                        "team_finished": True
                    }
            
            # Prepare for next challenge
            team["current_challenge"] += 1
            next_challenge = None
            for c in game["game_state"]["challenges"]:
                if c["level"] == team["current_challenge"]:
                    next_challenge = c
                    break
            
            return {
                "success": True,
                "message": f"Challenge solved correctly! Moving to next challenge.",
                "points_earned": challenge["points"],
                "team_score": team["score"],
                "next_challenge": {
                    "level": next_challenge["level"],
                    "title": next_challenge["title"],
                    "description": next_challenge["description"],
                    "type": next_challenge["type"]
                } if next_challenge else None
            }
        else:
            # Wrong solution
            team["wrong_attempts"] = team.get("wrong_attempts", 0) + 1
            
            return {
                "success": False,
                "message": "Incorrect solution. Try again!",
                "wrong_attempts": team["wrong_attempts"]
            }
    
    def _verify_treasure_hunt_solution(self, challenge: Dict, solution: str) -> bool:
        """Verify if the solution for a treasure hunt challenge is correct"""
        challenge_type = challenge.get("type")
        
        if challenge_type == "text":
            # Simple text comparison (case insensitive)
            return solution.lower() == challenge["solution"].lower()
        elif challenge_type == "multiple_choice":
            # Check if solution matches one of the correct options
            return solution in challenge["correct_options"]
        elif challenge_type == "location":
            # For location-based challenges, verify coordinates are within range
            try:
                lat, lng = map(float, solution.split(','))
                target_lat, target_lng = map(float, challenge["solution"].split(','))
                
                # Calculate distance between points (simplified)
                distance = ((lat - target_lat) ** 2 + (lng - target_lng) ** 2) ** 0.5
                return distance <= challenge.get("proximity_threshold", 0.001)  # Default ~100m
            except:
                return False
        elif challenge_type == "image":
            # For image recognition challenges, solution might be a tag or description
            return solution.lower() in [tag.lower() for tag in challenge["solution_tags"]]
        
        return False
    
    async def _use_treasure_hunt_hint(self, game: Dict, team: Dict, challenge_id: str) -> Dict:
        """Use a hint for a treasure hunt challenge"""
        # Find the challenge
        challenge = None
        for c in game["game_state"]["challenges"]:
            if c["id"] == challenge_id:
                challenge = c
                break
        
        if not challenge:
            return {"error": "Challenge not found"}
        
        # Check if team is at the right challenge level
        if team["current_challenge"] != challenge["level"]:
            return {"error": "Team is not at this challenge level"}
        
        # Check if team has hints left
        if team.get("hints_used", 0) >= game["game_state"].get("max_hints_per_team", 3):
            return {"error": "No hints left for this team"}
        
        # Get next hint
        hints_used_for_challenge = team.get("hints_used_for_challenges", {}).get(challenge_id, 0)
        if hints_used_for_challenge >= len(challenge.get("hints", [])):
            return {"error": "No more hints available for this challenge"}
        
        # Update hint usage
        team["hints_used"] = team.get("hints_used", 0) + 1
        
        if "hints_used_for_challenges" not in team:
            team["hints_used_for_challenges"] = {}
        
        team["hints_used_for_challenges"][challenge_id] = hints_used_for_challenge + 1
        
        # Apply score penalty if configured
        hint_penalty = game["game_state"].get("hint_penalty", 5)
        if hint_penalty > 0:
            team["score"] = max(0, team["score"] - hint_penalty)
        
        return {
            "success": True,
            "hint": challenge["hints"][hints_used_for_challenge],
            "hints_used": team["hints_used"],
            "hints_remaining": game["game_state"].get("max_hints_per_team", 3) - team["hints_used"],
            "score_penalty": hint_penalty,
            "team_score": team["score"]
        }
    
    async def _advance_treasure_hunt_team(self, game: Dict, team: Dict) -> Dict:
        """Advance a team to the next challenge (admin function)"""
        # Check if team is already at the final challenge
        if team["current_challenge"] >= game["game_state"]["total_challenges"]:
            return {"error": "Team is already at the final challenge"}
        
        # Find current challenge
        current_challenge = None
        for c in game["game_state"]["challenges"]:
            if c["level"] == team["current_challenge"]:
                current_challenge = c
                break
        
        if current_challenge:
            # Add to completed challenges if not already there
            if current_challenge["id"] not in team["challenges_completed"]:
                team["challenges_completed"].append(current_challenge["id"])
        
        # Advance to next challenge
        team["current_challenge"] += 1
        
        # Find next challenge
        next_challenge = None
        for c in game["game_state"]["challenges"]:
            if c["level"] == team["current_challenge"]:
                next_challenge = c
                break
        
        if not next_challenge:
            return {"error": "Next challenge not found"}
        
        return {
            "success": True,
            "message": f"Team {team['name']} advanced to challenge level {team['current_challenge']}",
            "next_challenge": {
                "level": next_challenge["level"],
                "title": next_challenge["title"],
                "description": next_challenge["description"],
                "type": next_challenge["type"]
            }
        }
    
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
                    game["game_state"]["eliminated_players"].append(player)
                    break
            
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