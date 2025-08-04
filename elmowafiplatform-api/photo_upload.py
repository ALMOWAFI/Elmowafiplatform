#!/usr/bin/env python3
"""
Photo Upload System for Elmowafiplatform
Handles file uploads, image processing, family member linking, and album management
"""

import os
import uuid
import logging
import asyncio
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from pathlib import Path
import shutil
import mimetypes
from PIL import Image, ExifTags
import io
import base64

# Import existing modules
from unified_database import get_unified_database
from photo_analysis_engine import get_photo_engine
from logging_config import get_logger
from performance_monitoring import performance_monitor
from rate_limiting import rate_limit
from circuit_breakers import circuit_breaker

logger = get_logger("photo_upload")

class PhotoUploadSystem:
    """Comprehensive photo upload and management system"""
    
    def __init__(self):
        self.db = get_unified_database()
        self.photo_engine = get_photo_engine()
        
        # Upload configuration
        self.upload_dir = os.getenv('UPLOAD_DIR', 'uploads/photos')
        self.max_file_size = int(os.getenv('MAX_FILE_SIZE', 10 * 1024 * 1024))  # 10MB
        self.allowed_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'}
        self.thumbnail_sizes = [(150, 150), (300, 300), (800, 800)]
        
        # Create upload directories
        self._create_upload_directories()
    
    def _create_upload_directories(self):
        """Create necessary upload directories"""
        directories = [
            self.upload_dir,
            f"{self.upload_dir}/originals",
            f"{self.upload_dir}/thumbnails",
            f"{self.upload_dir}/processed",
            f"{self.upload_dir}/temp"
        ]
        
        for directory in directories:
            Path(directory).mkdir(parents=True, exist_ok=True)
            logger.info(f"Created upload directory: {directory}")
    
    @circuit_breaker("photo_upload")
    async def upload_photo(
        self,
        file_data: bytes,
        filename: str,
        family_group_id: str,
        family_members: List[str] = None,
        album_id: Optional[str] = None,
        description: Optional[str] = None,
        tags: List[str] = None,
        privacy_level: str = "family"
    ) -> Dict[str, Any]:
        """Upload and process a photo with family member linking"""
        
        try:
            start_time = datetime.now()
            
            # Validate file
            validation_result = await self._validate_upload(file_data, filename)
            if not validation_result["valid"]:
                return validation_result
            
            # Generate unique filename
            file_extension = Path(filename).suffix.lower()
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            
            # Save original file
            original_path = f"{self.upload_dir}/originals/{unique_filename}"
            with open(original_path, 'wb') as f:
                f.write(file_data)
            
            # Process image (create thumbnails, extract metadata)
            processing_result = await self._process_image(original_path, unique_filename)
            
            # Analyze photo with AI
            analysis_result = await self._analyze_photo(original_path, family_group_id)
            
            # Link to family members
            family_linking_result = await self._link_family_members(
                analysis_result, family_members, family_group_id
            )
            
            # Save to database
            memory_data = {
                "family_group_id": family_group_id,
                "title": filename,
                "description": description or analysis_result.get("description", ""),
                "date": datetime.now().isoformat(),
                "image_url": f"/uploads/photos/originals/{unique_filename}",
                "thumbnail_url": f"/uploads/photos/thumbnails/{unique_filename}",
                "tags": tags or [],
                "family_members": family_linking_result.get("linked_members", []),
                "ai_analysis": analysis_result,
                "memory_type": "photo",
                "privacy_level": privacy_level,
                "metadata": processing_result.get("metadata", {}),
                "file_size": len(file_data),
                "dimensions": processing_result.get("dimensions", {}),
                "created_by": "system"  # TODO: Get from auth
            }
            
            # Add to album if specified
            if album_id:
                memory_data["album_id"] = album_id
            
            # Save to database
            memory_id = self.db.create_memory(memory_data)
            
            if not memory_id:
                raise Exception("Failed to save memory to database")
            
            # Track performance metrics
            upload_duration = (datetime.now() - start_time).total_seconds()
            performance_monitor.track_file_upload(
                file_type="photo",
                duration=upload_duration,
                file_size=len(file_data),
                success=True
            )
            
            # Track business metric
            performance_monitor.track_business_metric(
                'memory_created',
                family_group_id,
                memory_type='photo'
            )
            
            logger.info(f"Photo uploaded successfully: {memory_id}")
            
            return {
                "success": True,
                "memory_id": memory_id,
                "filename": unique_filename,
                "original_url": memory_data["image_url"],
                "thumbnail_url": memory_data["thumbnail_url"],
                "analysis": analysis_result,
                "family_members": family_linking_result.get("linked_members", []),
                "upload_duration": upload_duration,
                "file_size": len(file_data)
            }
            
        except Exception as e:
            logger.error(f"Photo upload failed: {e}")
            performance_monitor.track_file_upload(
                file_type="photo",
                duration=0,
                file_size=len(file_data),
                success=False
            )
            return {
                "success": False,
                "error": str(e),
                "error_type": type(e).__name__
            }
    
    async def _validate_upload(self, file_data: bytes, filename: str) -> Dict[str, Any]:
        """Validate uploaded file"""
        
        # Check file size
        if len(file_data) > self.max_file_size:
            return {
                "valid": False,
                "error": f"File too large. Maximum size: {self.max_file_size / (1024*1024)}MB"
            }
        
        # Check file extension
        file_extension = Path(filename).suffix.lower()
        if file_extension not in self.allowed_extensions:
            return {
                "valid": False,
                "error": f"Invalid file type. Allowed: {', '.join(self.allowed_extensions)}"
            }
        
        # Check if it's actually an image
        try:
            image = Image.open(io.BytesIO(file_data))
            image.verify()
        except Exception as e:
            return {
                "valid": False,
                "error": f"Invalid image file: {str(e)}"
            }
        
        return {"valid": True}
    
    async def _process_image(self, image_path: str, filename: str) -> Dict[str, Any]:
        """Process image: create thumbnails, extract metadata"""
        
        try:
            with Image.open(image_path) as img:
                # Get image info
                width, height = img.size
                format_info = img.format
                mode = img.mode
                
                # Extract EXIF data
                exif_data = {}
                if hasattr(img, '_getexif') and img._getexif():
                    exif = img._getexif()
                    for tag_id, value in exif.items():
                        tag = ExifTags.TAGS.get(tag_id, tag_id)
                        exif_data[tag] = value
                
                # Create thumbnails
                thumbnail_paths = {}
                for size in self.thumbnail_sizes:
                    thumbnail_filename = f"{Path(filename).stem}_{size[0]}x{size[1]}{Path(filename).suffix}"
                    thumbnail_path = f"{self.upload_dir}/thumbnails/{thumbnail_filename}"
                    
                    # Create thumbnail
                    img_copy = img.copy()
                    img_copy.thumbnail(size, Image.Resampling.LANCZOS)
                    img_copy.save(thumbnail_path, quality=85, optimize=True)
                    thumbnail_paths[f"{size[0]}x{size[1]}"] = thumbnail_path
                
                return {
                    "dimensions": {"width": width, "height": height},
                    "format": format_info,
                    "mode": mode,
                    "exif_data": exif_data,
                    "thumbnail_paths": thumbnail_paths
                }
                
        except Exception as e:
            logger.error(f"Image processing failed: {e}")
            return {"error": str(e)}
    
    async def _analyze_photo(self, image_path: str, family_group_id: str) -> Dict[str, Any]:
        """Analyze photo using AI services"""
        
        try:
            # Get family context for analysis
            family_context = await self._get_family_context(family_group_id)
            
            # Analyze with photo engine
            analysis_result = await self.photo_engine.analyze_family_photo(
                image_path, family_context
            )
            
            return analysis_result
            
        except Exception as e:
            logger.error(f"Photo analysis failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "description": "Photo analysis failed"
            }
    
    async def _link_family_members(
        self, 
        analysis_result: Dict, 
        family_members: List[str], 
        family_group_id: str
    ) -> Dict[str, Any]:
        """Link photo to family members using face recognition"""
        
        linked_members = []
        
        try:
            # If family members are manually specified
            if family_members:
                linked_members.extend(family_members)
            
            # Use face recognition to auto-link
            if analysis_result.get("face_analysis", {}).get("faces_detected"):
                detected_faces = analysis_result["face_analysis"].get("face_details", [])
                
                for face in detected_faces:
                    if face.get("recognized_person"):
                        person_name = face["recognized_person"]
                        # Find family member by name
                        family_member = self.db.get_family_member_by_name(
                            person_name, family_group_id
                        )
                        if family_member and family_member["id"] not in linked_members:
                            linked_members.append(family_member["id"])
            
            return {
                "linked_members": linked_members,
                "faces_detected": analysis_result.get("face_analysis", {}).get("faces_detected", 0),
                "auto_linked": len(linked_members) > 0
            }
            
        except Exception as e:
            logger.error(f"Family member linking failed: {e}")
            return {
                "linked_members": linked_members,
                "error": str(e)
            }
    
    async def _get_family_context(self, family_group_id: str) -> Dict[str, Any]:
        """Get family context for photo analysis"""
        
        try:
            family_members = self.db.get_family_members(family_group_id)
            
            return {
                "family_group_id": family_group_id,
                "family_members": family_members,
                "member_count": len(family_members),
                "member_names": [member.get("name", "") for member in family_members]
            }
            
        except Exception as e:
            logger.error(f"Failed to get family context: {e}")
            return {"family_group_id": family_group_id}

class AlbumManagementSystem:
    """Album management system for organizing photos"""
    
    def __init__(self):
        self.db = get_unified_database()
    
    def create_album(
        self,
        family_group_id: str,
        name: str,
        description: Optional[str] = None,
        album_type: str = "custom",
        privacy_level: str = "family",
        cover_photo_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a new album"""
        
        try:
            album_data = {
                "family_group_id": family_group_id,
                "name": name,
                "description": description,
                "album_type": album_type,
                "privacy_level": privacy_level,
                "cover_photo_id": cover_photo_id,
                "created_at": datetime.now().isoformat(),
                "photo_count": 0
            }
            
            album_id = self.db.create_album(album_data)
            
            if album_id:
                logger.info(f"Album created: {album_id}")
                return {
                    "success": True,
                    "album_id": album_id,
                    "name": name
                }
            else:
                return {"success": False, "error": "Failed to create album"}
                
        except Exception as e:
            logger.error(f"Album creation failed: {e}")
            return {"success": False, "error": str(e)}
    
    def add_photo_to_album(self, album_id: str, memory_id: str) -> Dict[str, Any]:
        """Add a photo to an album"""
        
        try:
            success = self.db.add_photo_to_album(album_id, memory_id)
            
            if success:
                # Update album photo count
                self.db.update_album_photo_count(album_id)
                
                return {
                    "success": True,
                    "album_id": album_id,
                    "memory_id": memory_id
                }
            else:
                return {"success": False, "error": "Failed to add photo to album"}
                
        except Exception as e:
            logger.error(f"Failed to add photo to album: {e}")
            return {"success": False, "error": str(e)}
    
    def get_album_photos(self, album_id: str) -> List[Dict[str, Any]]:
        """Get all photos in an album"""
        
        try:
            photos = self.db.get_album_photos(album_id)
            return photos
        except Exception as e:
            logger.error(f"Failed to get album photos: {e}")
            return []
    
    def get_family_albums(self, family_group_id: str) -> List[Dict[str, Any]]:
        """Get all albums for a family group"""
        
        try:
            albums = self.db.get_family_albums(family_group_id)
            return albums
        except Exception as e:
            logger.error(f"Failed to get family albums: {e}")
            return []

class FamilyPhotoLinking:
    """Advanced family photo linking with face recognition"""
    
    def __init__(self):
        self.db = get_unified_database()
        self.photo_engine = get_photo_engine()
    
    async def link_photo_to_family_members(
        self,
        memory_id: str,
        family_member_ids: List[str],
        confidence_scores: List[float] = None
    ) -> Dict[str, Any]:
        """Link a photo to specific family members"""
        
        try:
            # Update memory with family member links
            success = self.db.link_memory_to_family_members(
                memory_id, family_member_ids, confidence_scores
            )
            
            if success:
                # Get linked family members
                linked_members = self.db.get_memory_family_members(memory_id)
                
                return {
                    "success": True,
                    "memory_id": memory_id,
                    "linked_members": linked_members,
                    "member_count": len(linked_members)
                }
            else:
                return {"success": False, "error": "Failed to link photo to family members"}
                
        except Exception as e:
            logger.error(f"Family member linking failed: {e}")
            return {"success": False, "error": str(e)}
    
    async def auto_link_faces_in_photo(self, memory_id: str) -> Dict[str, Any]:
        """Automatically link faces in photo to family members"""
        
        try:
            # Get memory details
            memory = self.db.get_memory(memory_id)
            if not memory:
                return {"success": False, "error": "Memory not found"}
            
            # Analyze photo for faces
            image_path = memory.get("image_url", "").replace("/uploads", "uploads")
            if not os.path.exists(image_path):
                return {"success": False, "error": "Image file not found"}
            
            # Analyze with face recognition
            analysis_result = await self.photo_engine.analyze_family_photo(image_path)
            
            # Extract recognized faces
            recognized_faces = []
            if analysis_result.get("face_analysis", {}).get("faces_detected"):
                for face in analysis_result["face_analysis"].get("face_details", []):
                    if face.get("recognized_person"):
                        recognized_faces.append({
                            "person_name": face["recognized_person"],
                            "confidence": face.get("confidence", 0.0),
                            "face_location": face.get("location", {})
                        })
            
            # Link recognized faces to family members
            linked_members = []
            for face in recognized_faces:
                family_member = self.db.get_family_member_by_name(
                    face["person_name"], memory["family_group_id"]
                )
                if family_member:
                    linked_members.append(family_member["id"])
            
            # Update memory with auto-linked members
            if linked_members:
                self.db.link_memory_to_family_members(memory_id, linked_members)
            
            return {
                "success": True,
                "faces_detected": len(recognized_faces),
                "linked_members": linked_members,
                "auto_linked_count": len(linked_members)
            }
            
        except Exception as e:
            logger.error(f"Auto face linking failed: {e}")
            return {"success": False, "error": str(e)}

# Global instances
photo_upload_system = PhotoUploadSystem()
album_management = AlbumManagementSystem()
family_photo_linking = FamilyPhotoLinking()

def get_photo_upload_system():
    """Get photo upload system instance"""
    return photo_upload_system

def get_album_management():
    """Get album management system instance"""
    return album_management

def get_family_photo_linking():
    """Get family photo linking system instance"""
    return family_photo_linking 