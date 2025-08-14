#!/usr/bin/env python3
"""
Family Memory Processor for AI-powered memory analysis and management
"""

import os
import json
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional
from pathlib import Path
import cv2
import numpy as np
from PIL import Image, ExifTags
import asyncio

logger = logging.getLogger(__name__)

class FamilyMemoryProcessor:
    """Processes family photos and memories with AI analysis"""
    
    def __init__(self):
        self.face_cascade = None
        self.initialize()
    
    def initialize(self):
        """Initialize the memory processor"""
        try:
            # Initialize OpenCV face detection
            cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
            if os.path.exists(cascade_path):
                self.face_cascade = cv2.CascadeClassifier(cascade_path)
                logger.info("Face detection initialized")
        except Exception as e:
            logger.error(f"Error initializing memory processor: {e}")
    
    def process_family_photo(self, image_path: str, metadata: Dict[str, Any] = None) -> Dict[str, Any]:
        """Process a family photo with AI analysis"""
        try:
            if not os.path.exists(image_path):
                return {"error": "Image file not found"}
            
            # Load image
            image = cv2.imread(image_path)
            if image is None:
                return {"error": "Could not load image"}
            
            # Extract EXIF data
            exif_data = self._extract_exif_data(image_path)
            
            # Basic image analysis
            image_properties = self._analyze_image_properties(image)
            
            # Face detection
            faces_data = self._detect_faces(image)
            
            # Scene analysis
            scene_analysis = self._analyze_scene(image)
            
            # Generate smart tags
            smart_tags = self._generate_smart_tags(image, faces_data, scene_analysis, metadata)
            
            result = {
                "timestamp": datetime.now().isoformat(),
                "image_path": image_path,
                "image_properties": image_properties,
                "exif_data": exif_data,
                "faces": faces_data,
                "scene_analysis": scene_analysis,
                "smart_tags": smart_tags,
                "metadata": metadata or {},
                "processing_version": "1.0"
            }
            
            logger.info(f"Successfully processed family photo: {image_path}")
            return result
            
        except Exception as e:
            logger.error(f"Error processing family photo {image_path}: {e}")
            return {"error": str(e)}
    
    def _extract_exif_data(self, image_path: str) -> Dict[str, Any]:
        """Extract EXIF data from image"""
        try:
            image = Image.open(image_path)
            exif_dict = {}
            
            if hasattr(image, '_getexif') and image._getexif() is not None:
                exif = image._getexif()
                
                for tag, value in exif.items():
                    tag_name = ExifTags.TAGS.get(tag, tag)
                    exif_dict[tag_name] = str(value)
            
            return {
                "has_exif": len(exif_dict) > 0,
                "camera_make": exif_dict.get("Make", "unknown"),
                "camera_model": exif_dict.get("Model", "unknown"),
                "datetime_taken": exif_dict.get("DateTime"),
                "gps_info": exif_dict.get("GPSInfo"),
                "orientation": exif_dict.get("Orientation"),
                "flash": exif_dict.get("Flash")
            }
            
        except Exception as e:
            logger.warning(f"Could not extract EXIF data: {e}")
            return {"has_exif": False}
    
    def _analyze_image_properties(self, image: np.ndarray) -> Dict[str, Any]:
        """Analyze basic image properties"""
        height, width = image.shape[:2]
        
        # Convert to grayscale for analysis
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Calculate brightness and contrast
        brightness = np.mean(gray)
        contrast = np.std(gray)
        
        # Detect blurriness using Laplacian variance
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        is_blurry = laplacian_var < 100
        
        # Color analysis
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        dominant_hue = np.mean(hsv[:, :, 0])
        saturation = np.mean(hsv[:, :, 1])
        
        return {
            "dimensions": {"width": width, "height": height},
            "aspect_ratio": width / height,
            "brightness": float(brightness),
            "contrast": float(contrast),
            "is_blurry": is_blurry,
            "blur_score": float(laplacian_var),
            "color_analysis": {
                "dominant_hue": float(dominant_hue),
                "saturation": float(saturation),
                "is_colorful": saturation > 100
            },
            "quality_score": min(100, max(0, laplacian_var / 10))
        }
    
    def _detect_faces(self, image: np.ndarray) -> Dict[str, Any]:
        """Detect faces in the image"""
        if self.face_cascade is None:
            return {"count": 0, "faces": []}
        
        try:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            faces = self.face_cascade.detectMultiScale(gray, 1.1, 4)
            
            face_data = []
            for i, (x, y, w, h) in enumerate(faces):
                # Extract face region for additional analysis
                face_region = gray[y:y+h, x:x+w]
                
                face_info = {
                    "id": i,
                    "position": {
                        "x": int(x), 
                        "y": int(y), 
                        "width": int(w), 
                        "height": int(h)
                    },
                    "center": {
                        "x": int(x + w/2), 
                        "y": int(y + h/2)
                    },
                    "confidence": 0.8,  # OpenCV doesn't provide confidence scores
                    "size_category": self._categorize_face_size(w, h, image.shape),
                    "position_category": self._categorize_face_position(x + w/2, y + h/2, image.shape)
                }
                
                face_data.append(face_info)
            
            return {
                "count": len(faces),
                "faces": face_data,
                "detection_method": "opencv_haar"
            }
            
        except Exception as e:
            logger.error(f"Face detection error: {e}")
            return {"count": 0, "faces": [], "error": str(e)}
    
    def _categorize_face_size(self, width: int, height: int, image_shape: tuple) -> str:
        """Categorize face size relative to image"""
        img_height, img_width = image_shape[:2]
        face_area = width * height
        image_area = img_width * img_height
        area_ratio = face_area / image_area
        
        if area_ratio > 0.15:
            return "large"
        elif area_ratio > 0.05:
            return "medium"
        else:
            return "small"
    
    def _categorize_face_position(self, center_x: float, center_y: float, image_shape: tuple) -> str:
        """Categorize face position in image"""
        img_height, img_width = image_shape[:2]
        
        # Normalize coordinates
        norm_x = center_x / img_width
        norm_y = center_y / img_height
        
        # Determine position
        if norm_x < 0.33:
            horizontal = "left"
        elif norm_x > 0.67:
            horizontal = "right"
        else:
            horizontal = "center"
        
        if norm_y < 0.33:
            vertical = "top"
        elif norm_y > 0.67:
            vertical = "bottom"
        else:
            vertical = "middle"
        
        return f"{vertical}_{horizontal}"
    
    def _analyze_scene(self, image: np.ndarray) -> Dict[str, Any]:
        """Analyze the scene in the image"""
        # Convert to HSV for color analysis
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        height, width = image.shape[:2]
        
        # Color-based scene detection
        scene_indicators = {}
        
        # Sky detection (blue areas in upper part)
        upper_region = hsv[:height//3, :, :]
        blue_mask = cv2.inRange(upper_region, (100, 50, 50), (130, 255, 255))
        sky_ratio = np.sum(blue_mask > 0) / (upper_region.shape[0] * upper_region.shape[1])
        scene_indicators["sky"] = sky_ratio
        
        # Vegetation detection (green areas)
        green_mask = cv2.inRange(hsv, (35, 50, 50), (85, 255, 255))
        vegetation_ratio = np.sum(green_mask > 0) / (height * width)
        scene_indicators["vegetation"] = vegetation_ratio
        
        # Indoor/outdoor classification
        outdoor_score = sky_ratio + vegetation_ratio
        scene_type = "outdoor" if outdoor_score > 0.2 else "indoor"
        
        # Setting classification
        if vegetation_ratio > 0.3:
            setting = "nature"
        elif sky_ratio > 0.2:
            setting = "outdoor_urban"
        else:
            setting = "indoor"
        
        # Lighting analysis
        brightness = np.mean(image)
        lighting = "bright" if brightness > 150 else "normal" if brightness > 100 else "dim"
        
        return {
            "scene_type": scene_type,
            "setting": setting,
            "lighting": lighting,
            "color_indicators": scene_indicators,
            "outdoor_confidence": min(1.0, outdoor_score),
            "estimated_time": "day" if brightness > 120 else "evening"
        }
    
    def _generate_smart_tags(
        self, 
        image: np.ndarray, 
        faces_data: Dict, 
        scene_analysis: Dict, 
        metadata: Dict = None
    ) -> List[str]:
        """Generate intelligent tags for the photo"""
        tags = []
        
        # Face-based tags
        face_count = faces_data.get("count", 0)
        if face_count > 0:
            tags.append("people")
            if face_count == 1:
                tags.append("portrait")
            elif face_count >= 2:
                tags.append("group")
            if face_count >= 4:
                tags.append("family_gathering")
        
        # Scene-based tags
        scene_type = scene_analysis.get("scene_type", "unknown")
        setting = scene_analysis.get("setting", "unknown")
        lighting = scene_analysis.get("lighting", "unknown")
        
        tags.extend([scene_type, setting, lighting])
        
        # Color-based tags
        color_indicators = scene_analysis.get("color_indicators", {})
        if color_indicators.get("sky", 0) > 0.2:
            tags.append("sky")
        if color_indicators.get("vegetation", 0) > 0.2:
            tags.append("nature")
        
        # Metadata-based tags
        if metadata:
            if metadata.get("location"):
                tags.append("travel")
            if metadata.get("date"):
                tags.append("memory")
            if metadata.get("family_members"):
                tags.append("family")
        
        # Quality-based tags
        image_props = self._analyze_image_properties(image)
        if image_props.get("is_blurry"):
            tags.append("blurry")
        if image_props.get("quality_score", 0) > 80:
            tags.append("high_quality")
        
        # Remove duplicates and return
        return list(set(tag for tag in tags if tag != "unknown"))
    
    def create_family_timeline(self, photos_dir: str) -> List[Dict[str, Any]]:
        """Create a timeline of family memories from photos directory"""
        try:
            timeline = []
            
            if not os.path.exists(photos_dir):
                return timeline
            
            # Get all image files
            image_extensions = {'.jpg', '.jpeg', '.png', '.bmp', '.tiff'}
            image_files = []
            
            for file_path in Path(photos_dir).rglob('*'):
                if file_path.suffix.lower() in image_extensions:
                    image_files.append(file_path)
            
            # Process each image
            for image_path in image_files:
                try:
                    # Get file modification time as fallback date
                    file_stat = image_path.stat()
                    default_date = datetime.fromtimestamp(file_stat.st_mtime)
                    
                    # Process the photo
                    analysis = self.process_family_photo(str(image_path))
                    
                    if "error" not in analysis:
                        # Extract date from EXIF or use file date
                        photo_date = default_date
                        if analysis.get("exif_data", {}).get("datetime_taken"):
                            try:
                                exif_date = analysis["exif_data"]["datetime_taken"]
                                photo_date = datetime.strptime(exif_date, "%Y:%m:%d %H:%M:%S")
                            except:
                                pass
                        
                        timeline_entry = {
                            "id": str(image_path.stem),
                            "file_path": str(image_path),
                            "date": photo_date.isoformat(),
                            "title": f"Memory from {photo_date.strftime('%B %d, %Y')}",
                            "faces_detected": analysis.get("faces", {}).get("count", 0),
                            "scene_type": analysis.get("scene_analysis", {}).get("scene_type", "unknown"),
                            "tags": analysis.get("smart_tags", []),
                            "quality_score": analysis.get("image_properties", {}).get("quality_score", 0),
                            "analysis": analysis
                        }
                        
                        timeline.append(timeline_entry)
                        
                except Exception as e:
                    logger.warning(f"Could not process {image_path}: {e}")
                    continue
            
            # Sort timeline by date
            timeline.sort(key=lambda x: x["date"], reverse=True)
            
            logger.info(f"Created timeline with {len(timeline)} memories")
            return timeline
            
        except Exception as e:
            logger.error(f"Error creating family timeline: {e}")
            return []
    
    def get_memory_suggestions(self, date: str = None, family_member: str = None) -> Dict[str, Any]:
        """Get smart memory suggestions"""
        try:
            suggestions = {
                "on_this_day": [],
                "similar_memories": [],
                "suggestions": [
                    "Upload more family photos to build your memory collection",
                    "Add descriptions to your photos for better organization",
                    "Create albums to group related memories together"
                ],
                "generated_at": datetime.now().isoformat()
            }
            
            # Add date-specific suggestions
            if date:
                target_date = datetime.fromisoformat(date) if isinstance(date, str) else date
                suggestions["suggestions"].insert(0, 
                    f"Looking for memories from {target_date.strftime('%B %d')} in previous years"
                )
            
            # Add family member specific suggestions
            if family_member:
                suggestions["suggestions"].insert(0, 
                    f"Searching for photos featuring {family_member}"
                )
            
            return suggestions
            
        except Exception as e:
            logger.error(f"Error generating memory suggestions: {e}")
            return {
                "on_this_day": [],
                "similar_memories": [],
                "suggestions": ["Add more photos to start building your memory collection"],
                "generated_at": datetime.now().isoformat()
            }