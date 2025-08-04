"""
Real Photo Analysis Engine
Combines Azure Computer Vision, OpenCV, and Gemini AI for comprehensive family photo analysis
"""

import os
import cv2
import numpy as np
import logging
from typing import Dict, List, Any, Optional, Tuple
import json
from datetime import datetime

# Setup logging first
logger = logging.getLogger(__name__)

try:
    import face_recognition
    FACE_RECOGNITION_AVAILABLE = True
except ImportError:
    FACE_RECOGNITION_AVAILABLE = False
    print("Warning: face_recognition library not available - facial recognition disabled")
import google.generativeai as genai
from azure.cognitiveservices.vision.computervision import ComputerVisionClient
from azure.cognitiveservices.vision.computervision.models import OperationStatusCodes
from azure.cognitiveservices.vision.face import FaceClient
from msrest.authentication import CognitiveServicesCredentials
import requests
import time
from PIL import Image, ExifTags
import base64
import io

logger = logging.getLogger(__name__)

class PhotoAnalysisEngine:
    """Advanced photo analysis using multiple AI services"""
    
    def __init__(self, azure_key: str = None, azure_endpoint: str = None, gemini_model=None):
        self.azure_key = azure_key or os.getenv('AZURE_COMPUTER_VISION_KEY')
        self.azure_endpoint = azure_endpoint or os.getenv('AZURE_COMPUTER_VISION_ENDPOINT')
        self.gemini_model = gemini_model
        
        # Initialize Azure clients
        try:
            credentials = CognitiveServicesCredentials(self.azure_key)
            self.cv_client = ComputerVisionClient(self.azure_endpoint, credentials)
            # Face API requires separate endpoint
            face_endpoint = self.azure_endpoint.replace('/vision/v1.0', '').rstrip('/')
            self.face_client = FaceClient(face_endpoint, credentials)
            logger.info("✅ Azure Computer Vision clients initialized")
        except Exception as e:
            logger.error(f"❌ Failed to initialize Azure clients: {e}")
            self.cv_client = None
            self.face_client = None
        
        # Load face recognition model
        self.known_face_encodings = []
        self.known_face_names = []
        self._load_family_faces()
    
    async def analyze_family_photo(self, image_path: str, family_context: Dict = None) -> Dict[str, Any]:
        """Comprehensive family photo analysis"""
        try:
            start_time = time.time()
            
            # Initialize results
            analysis_result = {
                "success": True,
                "filename": os.path.basename(image_path),
                "analysis_time": 0,
                "azure_analysis": {},
                "face_analysis": {},
                "scene_analysis": {},
                "gemini_insights": "",
                "family_context": {},
                "technical_details": {},
                "suggestions": []
            }
            
            # 1. Basic image processing with OpenCV
            opencv_analysis = await self._analyze_with_opencv(image_path)
            analysis_result["technical_details"] = opencv_analysis
            
            # 2. Azure Computer Vision analysis
            if self.cv_client:
                azure_analysis = await self._analyze_with_azure(image_path)
                analysis_result["azure_analysis"] = azure_analysis
            
            # 3. Face detection and recognition
            face_analysis = await self._analyze_faces(image_path)
            analysis_result["face_analysis"] = face_analysis
            
            # 4. Scene and context analysis
            scene_analysis = await self._analyze_scene_context(image_path, azure_analysis)
            analysis_result["scene_analysis"] = scene_analysis
            
            # 5. Gemini AI insights
            if self.gemini_model:
                gemini_insights = await self._generate_gemini_insights(analysis_result, family_context)
                analysis_result["gemini_insights"] = gemini_insights
            
            # 6. Family context integration
            if family_context:
                family_analysis = await self._integrate_family_context(analysis_result, family_context)
                analysis_result["family_context"] = family_analysis
            
            # 7. Generate suggestions
            suggestions = await self._generate_photo_suggestions(analysis_result)
            analysis_result["suggestions"] = suggestions
            
            # Calculate analysis time
            analysis_result["analysis_time"] = round(time.time() - start_time, 2)
            
            return analysis_result
            
        except Exception as e:
            logger.error(f"Photo analysis failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "filename": os.path.basename(image_path) if image_path else "unknown"
            }
    
    async def _analyze_with_opencv(self, image_path: str) -> Dict[str, Any]:
        """Basic image analysis with OpenCV"""
        try:
            # Load image
            image = cv2.imread(image_path)
            if image is None:
                return {"error": "Could not load image"}
            
            # Basic properties
            height, width, channels = image.shape
            
            # Color analysis
            avg_color = np.mean(image, axis=(0, 1))
            brightness = np.mean(cv2.cvtColor(image, cv2.COLOR_BGR2GRAY))
            
            # Detect edges for composition analysis
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            edges = cv2.Canny(gray, 50, 150)
            edge_density = np.sum(edges > 0) / (width * height)
            
            # Blur detection (Laplacian variance)
            blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()
            
            # Get EXIF data if available
            exif_data = self._extract_exif_data(image_path)
            
            return {
                "dimensions": {"width": width, "height": height, "channels": channels},
                "color_analysis": {
                    "avg_blue": float(avg_color[0]),
                    "avg_green": float(avg_color[1]),
                    "avg_red": float(avg_color[2]),
                    "brightness": float(brightness)
                },
                "composition": {
                    "edge_density": float(edge_density),
                    "blur_score": float(blur_score),
                    "quality": "high" if blur_score > 100 else "medium" if blur_score > 50 else "low"
                },
                "exif_data": exif_data
            }
            
        except Exception as e:
            logger.error(f"OpenCV analysis failed: {e}")
            return {"error": str(e)}
    
    async def _analyze_with_azure(self, image_path: str) -> Dict[str, Any]:
        """Advanced analysis with Azure Computer Vision"""
        try:
            # Read image
            with open(image_path, 'rb') as image_stream:
                # Analyze image
                analysis = self.cv_client.analyze_image_in_stream(
                    image_stream,
                    visual_features=[
                        "Categories", "Description", "Faces", "Objects", 
                        "Tags", "Color", "ImageType", "Adult"
                    ]
                )
            
            result = {
                "description": {
                    "captions": [{"text": cap.text, "confidence": cap.confidence} 
                               for cap in analysis.description.captions],
                    "tags": [tag.name for tag in analysis.description.tags]
                },
                "categories": [{"name": cat.name, "score": cat.score} 
                             for cat in analysis.categories],
                "tags": [{"name": tag.name, "confidence": tag.confidence} 
                        for tag in analysis.tags],
                "objects": [{"object": obj.object_property, "confidence": obj.confidence,
                           "rectangle": obj.rectangle.__dict__} 
                          for obj in analysis.objects] if analysis.objects else [],
                "faces": [{"age": face.age, "gender": face.gender,
                         "rectangle": face.face_rectangle.__dict__} 
                        for face in analysis.faces] if analysis.faces else [],
                "color": {
                    "dominant_colors": analysis.color.dominant_colors,
                    "accent_color": analysis.color.accent_color,
                    "is_bw": analysis.color.is_bw_img
                } if analysis.color else {},
                "adult_content": {
                    "is_adult": analysis.adult.is_adult_content,
                    "adult_score": analysis.adult.adult_score,
                    "racy_score": analysis.adult.racy_score
                } if analysis.adult else {}
            }
            
            return result
            
        except Exception as e:
            logger.error(f"Azure analysis failed: {e}")
            return {"error": str(e)}
    
    async def _analyze_faces(self, image_path: str) -> Dict[str, Any]:
        """Face detection and recognition"""
        try:
            if not FACE_RECOGNITION_AVAILABLE:
                return {
                    "total_faces": 0,
                    "recognized_faces": [],
                    "unknown_faces": 0,
                    "face_locations": [],
                    "note": "Face recognition disabled - library not available"
                }
            
            # Load image for face_recognition
            image = face_recognition.load_image_file(image_path)
            face_locations = face_recognition.face_locations(image)
            face_encodings = face_recognition.face_encodings(image, face_locations)
            
            recognized_faces = []
            unknown_faces = 0
            
            for face_encoding in face_encodings:
                # Compare with known faces
                matches = face_recognition.compare_faces(self.known_face_encodings, face_encoding)
                name = "Unknown"
                
                if True in matches:
                    match_index = matches.index(True)
                    name = self.known_face_names[match_index]
                else:
                    unknown_faces += 1
                
                recognized_faces.append({
                    "name": name,
                    "confidence": 0.9 if name != "Unknown" else 0.3
                })
            
            return {
                "total_faces": len(face_locations),
                "recognized_faces": recognized_faces,
                "unknown_faces": unknown_faces,
                "face_locations": [{"top": loc[0], "right": loc[1], 
                                  "bottom": loc[2], "left": loc[3]} 
                                 for loc in face_locations]
            }
            
        except Exception as e:
            logger.error(f"Face analysis failed: {e}")
            return {"error": str(e)}
    
    async def _analyze_scene_context(self, image_path: str, azure_analysis: Dict) -> Dict[str, Any]:
        """Analyze scene context and activities"""
        try:
            scene_info = {
                "setting": "unknown",
                "activity": "unknown",
                "time_of_day": "unknown",
                "location_type": "unknown",
                "mood": "neutral"
            }
            
            if azure_analysis and not azure_analysis.get("error"):
                # Analyze categories and tags
                categories = azure_analysis.get("categories", [])
                tags = azure_analysis.get("tags", [])
                
                # Determine setting
                indoor_keywords = ["indoor", "room", "kitchen", "bedroom", "living", "house"]
                outdoor_keywords = ["outdoor", "sky", "tree", "grass", "beach", "mountain", "park"]
                
                tag_names = [tag.get("name", "").lower() for tag in tags]
                
                if any(keyword in " ".join(tag_names) for keyword in outdoor_keywords):
                    scene_info["setting"] = "outdoor"
                elif any(keyword in " ".join(tag_names) for keyword in indoor_keywords):
                    scene_info["setting"] = "indoor"
                
                # Determine activity
                activity_keywords = {
                    "celebration": ["birthday", "party", "cake", "celebration", "wedding"],
                    "travel": ["vacation", "tourist", "landmark", "hotel", "airport"],
                    "sports": ["sport", "game", "ball", "field", "court"],
                    "dining": ["food", "restaurant", "eating", "meal", "kitchen"],
                    "family_time": ["family", "group", "together", "home", "gathering"]
                }
                
                for activity, keywords in activity_keywords.items():
                    if any(keyword in " ".join(tag_names) for keyword in keywords):
                        scene_info["activity"] = activity
                        break
                
                # Analyze colors for mood
                colors = azure_analysis.get("color", {})
                dominant_colors = colors.get("dominant_colors", [])
                
                warm_colors = ["Red", "Orange", "Yellow"]
                cool_colors = ["Blue", "Green", "Purple"]
                
                if any(color in dominant_colors for color in warm_colors):
                    scene_info["mood"] = "warm"
                elif any(color in dominant_colors for color in cool_colors):
                    scene_info["mood"] = "cool"
            
            return scene_info
            
        except Exception as e:
            logger.error(f"Scene analysis failed: {e}")
            return {"error": str(e)}
    
    async def _generate_gemini_insights(self, analysis_result: Dict, family_context: Dict) -> str:
        """Generate AI insights about the photo"""
        try:
            # Build context for Gemini
            context = []
            
            # Add technical details
            tech = analysis_result.get("technical_details", {})
            if tech and not tech.get("error"):
                context.append(f"Image quality: {tech.get('composition', {}).get('quality', 'unknown')}")
                context.append(f"Brightness level: {tech.get('color_analysis', {}).get('brightness', 0):.1f}")
            
            # Add Azure analysis
            azure = analysis_result.get("azure_analysis", {})
            if azure and not azure.get("error"):
                descriptions = azure.get("description", {}).get("captions", [])
                if descriptions:
                    context.append(f"Scene: {descriptions[0].get('text', '')}")
                
                tags = azure.get("tags", [])[:5]  # Top 5 tags
                if tags:
                    tag_names = [tag.get("name") for tag in tags]
                    context.append(f"Key elements: {', '.join(tag_names)}")
            
            # Add face information
            faces = analysis_result.get("face_analysis", {})
            if faces and not faces.get("error"):
                total_faces = faces.get("total_faces", 0)
                recognized = len([f for f in faces.get("recognized_faces", []) if f.get("name") != "Unknown"])
                context.append(f"People: {total_faces} faces detected, {recognized} recognized family members")
            
            # Add scene context
            scene = analysis_result.get("scene_analysis", {})
            if scene and not scene.get("error"):
                context.append(f"Setting: {scene.get('setting')} {scene.get('activity')}")
                context.append(f"Mood: {scene.get('mood')}")
            
            # Add family context
            if family_context:
                context.append(f"Family size: {family_context.get('family_size', 'unknown')}")
                context.append(f"Occasion: {family_context.get('occasion', 'everyday moment')}")
            
            prompt = f"""
            Analyze this family photo and provide warm, insightful commentary:
            
            Photo Context:
            {chr(10).join(context)}
            
            Provide a 2-3 sentence analysis that:
            - Captures the essence and mood of the moment
            - Suggests why this photo is meaningful for the family
            - Offers a heartwarming perspective on family bonding
            
            Write as a warm family friend who appreciates these precious moments.
            """
            
            response = self.gemini_model.generate_content(prompt)
            return response.text.strip()
            
        except Exception as e:
            logger.error(f"Gemini insights failed: {e}")
            return "This appears to be a meaningful family moment worth preserving in your memory collection."
    
    async def _integrate_family_context(self, analysis_result: Dict, family_context: Dict) -> Dict[str, Any]:
        """Integrate photo analysis with family context"""
        try:
            integration = {
                "family_relevance": "medium",
                "memory_category": "general",
                "suggested_tags": [],
                "family_connections": []
            }
            
            # Analyze family connections
            faces = analysis_result.get("face_analysis", {})
            recognized_faces = faces.get("recognized_faces", []) if faces else []
            
            family_members_present = [f.get("name") for f in recognized_faces if f.get("name") != "Unknown"]
            
            if len(family_members_present) >= 3:
                integration["family_relevance"] = "high"
                integration["memory_category"] = "family_gathering"
            elif len(family_members_present) >= 2:
                integration["family_relevance"] = "medium"
                integration["memory_category"] = "quality_time"
            
            # Add family connections
            integration["family_connections"] = family_members_present
            
            # Generate suggested tags
            scene = analysis_result.get("scene_analysis", {})
            if scene:
                activity = scene.get("activity", "")
                setting = scene.get("setting", "")
                
                tags = []
                if activity != "unknown":
                    tags.append(activity)
                if setting != "unknown":
                    tags.append(setting)
                if family_members_present:
                    tags.extend(family_members_present)
                
                integration["suggested_tags"] = list(set(tags))
            
            return integration
            
        except Exception as e:
            logger.error(f"Family context integration failed: {e}")
            return {"error": str(e)}
    
    async def _generate_photo_suggestions(self, analysis_result: Dict) -> List[str]:
        """Generate actionable suggestions based on analysis"""
        suggestions = []
        
        try:
            # Quality-based suggestions
            tech = analysis_result.get("technical_details", {})
            if tech and not tech.get("error"):
                quality = tech.get("composition", {}).get("quality", "")
                if quality == "low":
                    suggestions.append("Consider retaking in better lighting for clearer family photos")
                elif quality == "high":
                    suggestions.append("Great photo quality! Perfect for printing or sharing")
            
            # Face-based suggestions
            faces = analysis_result.get("face_analysis", {})
            if faces and not faces.get("error"):
                unknown_faces = faces.get("unknown_faces", 0)
                if unknown_faces > 0:
                    suggestions.append(f"Add {unknown_faces} unrecognized faces to your family database")
                
                total_faces = faces.get("total_faces", 0)
                if total_faces > 5:
                    suggestions.append("Large group photo! Consider creating a family event album")
            
            # Activity-based suggestions
            scene = analysis_result.get("scene_analysis", {})
            if scene and not scene.get("error"):
                activity = scene.get("activity", "")
                if activity == "celebration":
                    suggestions.append("Create a celebration album for this special occasion")
                elif activity == "travel":
                    suggestions.append("Add to your travel memories and tag the location")
                elif activity == "family_time":
                    suggestions.append("Perfect for your everyday family moments collection")
            
            # Family context suggestions
            family_context = analysis_result.get("family_context", {})
            if family_context and not family_context.get("error"):
                relevance = family_context.get("family_relevance", "")
                if relevance == "high":
                    suggestions.append("High family significance - consider featuring in your timeline")
                
                suggested_tags = family_context.get("suggested_tags", [])
                if suggested_tags:
                    suggestions.append(f"Suggested tags: {', '.join(suggested_tags[:3])}")
            
            # Default suggestions if none generated
            if not suggestions:
                suggestions = [
                    "Add this photo to your family timeline",
                    "Tag family members for better organization",
                    "Consider adding a description or story"
                ]
            
            return suggestions[:5]  # Limit to 5 suggestions
            
        except Exception as e:
            logger.error(f"Suggestion generation failed: {e}")
            return ["Add to your family memories"]
    
    def _extract_exif_data(self, image_path: str) -> Dict[str, Any]:
        """Extract EXIF metadata from image"""
        try:
            image = Image.open(image_path)
            exif_data = {}
            
            if hasattr(image, '_getexif') and image._getexif():
                exif = image._getexif()
                for tag_id, value in exif.items():
                    tag = ExifTags.TAGS.get(tag_id, tag_id)
                    exif_data[tag] = str(value)
            
            return exif_data
            
        except Exception as e:
            logger.error(f"EXIF extraction failed: {e}")
            return {}
    
    def _load_family_faces(self):
        """Load known family member faces for recognition"""
        try:
            # This would load from a family face database
            # For now, initialize empty - would be populated by family face training
            self.known_face_encodings = []
            self.known_face_names = []
            logger.info("Family face database initialized (empty)")
            
        except Exception as e:
            logger.error(f"Failed to load family faces: {e}")

# Global instance
photo_engine = None

def initialize_photo_engine(azure_key: str = None, azure_endpoint: str = None, gemini_model=None):
    """Initialize the photo analysis engine"""
    global photo_engine
    photo_engine = PhotoAnalysisEngine(azure_key, azure_endpoint, gemini_model)
    return photo_engine

def get_photo_engine():
    """Get the photo analysis engine instance"""
    return photo_engine