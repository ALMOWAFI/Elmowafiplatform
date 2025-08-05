#!/usr/bin/env python3
"""
AI Services Gateway - Unified interface to all AI processing services
Connects FastAPI gateway to AI services (hack2, photo analysis, etc.)
"""

import os
import json
import httpx
import asyncio
import logging
from typing import Dict, Any, Optional, List, BinaryIO
from datetime import datetime
from contextlib import asynccontextmanager

logger = logging.getLogger(__name__)

class AIServiceGateway:
    """Unified gateway to all AI services"""
    
    def __init__(self):
        self.base_urls = {
            'family_ai': os.getenv('FAMILY_AI_URL', 'http://localhost:5001'),
            'photo_analysis': os.getenv('PHOTO_ANALYSIS_URL', 'http://localhost:5002'),
            'memory_processing': os.getenv('MEMORY_PROCESSING_URL', 'http://localhost:5003')
        }
        self.timeout = httpx.Timeout(30.0)
        
    @asynccontextmanager
    async def get_client(self):
        """Get async HTTP client with proper configuration"""
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            yield client
    
    async def health_check(self) -> Dict[str, Any]:
        """Check health of all AI services"""
        health_status = {}
        
        async with self.get_client() as client:
            for service, url in self.base_urls.items():
                try:
                    response = await client.get(f"{url}/health")
                    if response.status_code == 200:
                        health_status[service] = {
                            'status': 'healthy',
                            'response_time': response.elapsed.total_seconds(),
                            'data': response.json()
                        }
                    else:
                        health_status[service] = {
                            'status': 'unhealthy',
                            'error': f"HTTP {response.status_code}"
                        }
                except Exception as e:
                    health_status[service] = {
                        'status': 'unreachable',
                        'error': str(e)
                    }
        
        return health_status
    
    async def analyze_family_photo(
        self, 
        photo_data: bytes, 
        filename: str,
        family_group_id: str,
        family_members: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Analyze family photo for faces, quality, and suggestions"""
        try:
            async with self.get_client() as client:
                # Prepare multipart data
                files = {
                    'photo': (filename, photo_data, 'image/jpeg')
                }
                data = {
                    'family_group_id': family_group_id,
                    'family_members': ','.join(family_members) if family_members else ''
                }
                
                response = await client.post(
                    f"{self.base_urls['family_ai']}/api/analyze-photo",
                    files=files,
                    data=data
                )
                
                if response.status_code == 200:
                    result = response.json()
                    result['service'] = 'family_ai'
                    result['processed_at'] = datetime.now().isoformat()
                    return result
                else:
                    return {
                        'error': f"Photo analysis failed: HTTP {response.status_code}",
                        'details': response.text
                    }
                    
        except Exception as e:
            logger.error(f"Photo analysis error: {e}")
            return {
                'error': f"Photo analysis service error: {str(e)}"
            }
    
    async def get_travel_suggestions(
        self,
        family_size: int,
        budget: str,
        interests: List[str],
        location_preferences: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Get AI-powered travel suggestions for family"""
        try:
            async with self.get_client() as client:
                payload = {
                    'family_size': family_size,
                    'budget': budget,
                    'interests': interests,
                    'location_preferences': location_preferences or []
                }
                
                response = await client.post(
                    f"{self.base_urls['family_ai']}/api/travel-suggestions",
                    json=payload
                )
                
                if response.status_code == 200:
                    result = response.json()
                    result['service'] = 'family_ai'
                    result['generated_at'] = datetime.now().isoformat()
                    return result
                else:
                    return {
                        'error': f"Travel suggestions failed: HTTP {response.status_code}",
                        'details': response.text
                    }
                    
        except Exception as e:
            logger.error(f"Travel suggestions error: {e}")
            return {
                'error': f"Travel suggestions service error: {str(e)}"
            }
    
    async def get_memory_suggestions(
        self,
        family_group_id: str,
        current_date: Optional[str] = None,
        memory_types: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Get smart memory suggestions for family"""
        try:
            async with self.get_client() as client:
                payload = {
                    'family_group_id': family_group_id,
                    'date': current_date or datetime.now().isoformat(),
                    'memory_types': memory_types or ['photo', 'video', 'story']
                }
                
                response = await client.post(
                    f"{self.base_urls['family_ai']}/api/memory-suggestions",
                    json=payload
                )
                
                if response.status_code == 200:
                    result = response.json()
                    result['service'] = 'family_ai'
                    result['generated_at'] = datetime.now().isoformat()
                    return result
                else:
                    return {
                        'error': f"Memory suggestions failed: HTTP {response.status_code}",
                        'details': response.text
                    }
                    
        except Exception as e:
            logger.error(f"Memory suggestions error: {e}")
            return {
                'error': f"Memory suggestions service error: {str(e)}"
            }
    
    async def process_facial_recognition(
        self,
        photo_data: bytes,
        filename: str,
        known_faces: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Process facial recognition against known family members"""
        try:
            async with self.get_client() as client:
                files = {
                    'photo': (filename, photo_data, 'image/jpeg')
                }
                data = {
                    'known_faces': json.dumps(known_faces)
                }
                
                response = await client.post(
                    f"{self.base_urls['photo_analysis']}/api/facial-recognition",
                    files=files,
                    data=data
                )
                
                if response.status_code == 200:
                    result = response.json()
                    result['service'] = 'photo_analysis'
                    result['processed_at'] = datetime.now().isoformat()
                    return result
                else:
                    return {
                        'error': f"Facial recognition failed: HTTP {response.status_code}",
                        'details': response.text
                    }
                    
        except Exception as e:
            logger.error(f"Facial recognition error: {e}")
            return {
                'error': f"Facial recognition service error: {str(e)}"
            }
    
    async def enhance_photo_metadata(
        self,
        photo_data: bytes,
        filename: str,
        existing_metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Enhance photo metadata with AI analysis"""
        try:
            async with self.get_client() as client:
                files = {
                    'photo': (filename, photo_data, 'image/jpeg')
                }
                data = {
                    'existing_metadata': json.dumps(existing_metadata or {})
                }
                
                response = await client.post(
                    f"{self.base_urls['photo_analysis']}/api/enhance-metadata",
                    files=files,
                    data=data
                )
                
                if response.status_code == 200:
                    result = response.json()
                    result['service'] = 'photo_analysis'
                    result['enhanced_at'] = datetime.now().isoformat()
                    return result
                else:
                    return {
                        'error': f"Photo metadata enhancement failed: HTTP {response.status_code}",
                        'details': response.text
                    }
                    
        except Exception as e:
            logger.error(f"Photo metadata enhancement error: {e}")
            return {
                'error': f"Photo metadata enhancement service error: {str(e)}"
            }
    
    async def generate_memory_timeline(
        self,
        family_group_id: str,
        photos: List[Dict[str, Any]],
        date_range: Optional[tuple] = None
    ) -> Dict[str, Any]:
        """Generate smart memory timeline"""
        try:
            async with self.get_client() as client:
                payload = {
                    'family_group_id': family_group_id,
                    'photos': photos,
                    'date_range': date_range
                }
                
                response = await client.post(
                    f"{self.base_urls['memory_processing']}/api/generate-timeline",
                    json=payload
                )
                
                if response.status_code == 200:
                    result = response.json()
                    result['service'] = 'memory_processing'
                    result['generated_at'] = datetime.now().isoformat()
                    return result
                else:
                    return {
                        'error': f"Timeline generation failed: HTTP {response.status_code}",
                        'details': response.text
                    }
                    
        except Exception as e:
            logger.error(f"Timeline generation error: {e}")
            return {
                'error': f"Timeline generation service error: {str(e)}"
            }
    
    async def cluster_photos_by_similarity(
        self,
        photos: List[Dict[str, Any]],
        clustering_method: str = 'facial_similarity'
    ) -> Dict[str, Any]:
        """Cluster photos by similarity for album suggestions"""
        try:
            async with self.get_client() as client:
                payload = {
                    'photos': photos,
                    'clustering_method': clustering_method
                }
                
                response = await client.post(
                    f"{self.base_urls['memory_processing']}/api/cluster-photos",
                    json=payload
                )
                
                if response.status_code == 200:
                    result = response.json()
                    result['service'] = 'memory_processing'
                    result['clustered_at'] = datetime.now().isoformat()
                    return result
                else:
                    return {
                        'error': f"Photo clustering failed: HTTP {response.status_code}",
                        'details': response.text
                    }
                    
        except Exception as e:
            logger.error(f"Photo clustering error: {e}")
            return {
                'error': f"Photo clustering service error: {str(e)}"
            }

# Global AI service gateway instance
ai_gateway = AIServiceGateway()

def get_ai_gateway() -> AIServiceGateway:
    """Get the global AI gateway instance"""
    return ai_gateway