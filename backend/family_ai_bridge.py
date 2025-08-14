#!/usr/bin/env python3
"""
Family AI Bridge Service
Connects the main family platform backend with hack2 AI services
Provides family-focused photo processing, memory analysis, and travel recommendations
"""

import os
import sys
import json
import asyncio
import logging
from typing import Dict, List, Any, Optional
from pathlib import Path
import requests
import aiohttp
from datetime import datetime

# Add hack2 to path for imports
hack2_path = Path(__file__).parent.parent / "core" / "ai-services" / "hack2"
sys.path.insert(0, str(hack2_path))

# Import AI services from hack2
try:
    from family_memory_processor import FamilyMemoryProcessor
    from family_travel_ai import FamilyTravelAI
    HACK2_AVAILABLE = True
except ImportError as e:
    logging.warning(f"Could not import hack2 services: {e}")
    FamilyMemoryProcessor = None
    FamilyTravelAI = None
    HACK2_AVAILABLE = False

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FamilyAIBridge:
    """
    Bridge service that connects main platform with hack2 AI capabilities.
    Provides family-focused AI analysis, memory processing, and travel planning.
    """
    
    def __init__(self):
        self.hack2_available = HACK2_AVAILABLE
        self.ai_service_url = os.getenv("AI_SERVICE_URL", "http://localhost:5000")
        
        # Initialize AI processors if available
        if HACK2_AVAILABLE:
            try:
                self.memory_processor = FamilyMemoryProcessor()
                self.travel_ai = FamilyTravelAI()
                logger.info("Hack2 AI services initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize hack2 services: {e}")
                self.memory_processor = None
                self.travel_ai = None
                self.hack2_available = False
        else:
            self.memory_processor = None
            self.travel_ai = None
    
    async def process_family_photo(self, image_path: str, metadata: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Process a family photo using hack2 AI capabilities.
        
        Args:
            image_path: Path to the family photo
            metadata: Optional metadata (date, location, family members present)
            
        Returns:
            Dictionary with comprehensive family-focused analysis
        """
        if not self.hack2_available or not self.memory_processor:
            return await self._fallback_photo_analysis(image_path, metadata)
        
        try:
            # Use hack2's family memory processor
            analysis_result = self.memory_processor.process_family_photo(image_path, metadata)
            
            # Enhance for family platform needs
            enhanced_result = {
                "success": True,
                "image_path": image_path,
                "timestamp": datetime.now().isoformat(),
                "analysis_type": "family_photo",
                "ai_service": "hack2_family_processor",
                "analysis": {
                    "detected_faces": analysis_result["analysis"].get("detected_faces", []),
                    "family_members": analysis_result["analysis"].get("family_members", []),
                    "activities": analysis_result["analysis"].get("activities", []),
                    "location": analysis_result["analysis"].get("location"),
                    "cultural_elements": analysis_result["analysis"].get("cultural_elements", []),
                    "memory_category": analysis_result["analysis"].get("memory_category", "uncategorized"),
                    "confidence": 0.85,
                    "processing_time": "fast"
                },
                "suggestions": {
                    "similar_memories": analysis_result["suggestions"].get("similar_memories", []),
                    "family_connections": analysis_result["suggestions"].get("family_connections", []),
                    "travel_recommendations": analysis_result["suggestions"].get("travel_recommendations", []),
                    "memory_tags": self._generate_smart_tags(analysis_result),
                    "sharing_suggestions": self._generate_sharing_suggestions(analysis_result)
                },
                "metadata": metadata or {}
            }
            
            logger.info(f"Successfully processed family photo: {image_path}")
            return enhanced_result
            
        except Exception as e:
            logger.error(f"Error processing photo with hack2: {e}")
            return await self._fallback_photo_analysis(image_path, metadata)
    
    async def create_family_timeline(self, photos_directory: str, filters: Optional[Dict] = None) -> List[Dict[str, Any]]:
        """
        Create a family memory timeline from photos directory.
        
        Args:
            photos_directory: Directory containing family photos
            filters: Optional filters for timeline creation
            
        Returns:
            List of processed memories in chronological order
        """
        if not self.hack2_available or not self.memory_processor:
            return await self._fallback_timeline_creation(photos_directory)
        
        try:
            # Use hack2's timeline creation
            timeline = self.memory_processor.create_family_timeline(photos_directory)
            
            # Enhance timeline for family platform
            enhanced_timeline = []
            for memory in timeline:
                enhanced_memory = {
                    "id": f"memory_{hash(memory['image_path'])}",
                    "title": self._generate_memory_title(memory),
                    "description": self._generate_memory_description(memory),
                    "date": memory.get("timestamp", datetime.now().isoformat()),
                    "imageUrl": f"/uploads/{Path(memory['image_path']).name}",
                    "location": memory["analysis"].get("location", {}).get("city", "Unknown"),
                    "tags": self._generate_smart_tags(memory),
                    "familyMembers": [member["name"] for member in memory["analysis"].get("family_members", [])],
                    "aiAnalysis": memory["analysis"],
                    "confidence": memory["analysis"].get("confidence", 0.8),
                    "memory_category": memory["analysis"].get("memory_category", "daily_life")
                }
                enhanced_timeline.append(enhanced_memory)
            
            logger.info(f"Created family timeline with {len(enhanced_timeline)} memories")
            return enhanced_timeline
            
        except Exception as e:
            logger.error(f"Error creating timeline with hack2: {e}")
            return await self._fallback_timeline_creation(photos_directory)
    
    async def get_memory_suggestions(self, date: str = None, family_member: str = None) -> Dict[str, Any]:
        """
        Get smart memory suggestions using hack2 AI.
        
        Args:
            date: Target date for "On this day" suggestions
            family_member: Specific family member to focus on
            
        Returns:
            Dictionary with memory suggestions and recommendations
        """
        if not self.hack2_available or not self.memory_processor:
            return await self._fallback_memory_suggestions(date, family_member)
        
        try:
            suggestions = self.memory_processor.get_memory_suggestions(date, family_member)
            
            enhanced_suggestions = {
                "success": True,
                "date": date or datetime.now().strftime("%Y-%m-%d"),
                "family_member": family_member,
                "suggestions": {
                    "on_this_day": suggestions[:3] if suggestions else [],
                    "similar_memories": [],
                    "family_connections": [],
                    "contextual_suggestions": [
                        "Create a photo album for recent family gatherings",
                        "Share memories with family members who weren't present",
                        "Plan a return visit to memorable locations"
                    ]
                },
                "ai_powered": True,
                "generated_at": datetime.now().isoformat()
            }
            
            return enhanced_suggestions
            
        except Exception as e:
            logger.error(f"Error getting memory suggestions: {e}")
            return await self._fallback_memory_suggestions(date, family_member)
    
    async def get_travel_recommendations(self, travel_request: Dict[str, Any]) -> Dict[str, Any]:
        """
        Get AI-powered travel recommendations using hack2.
        
        Args:
            travel_request: Dictionary with travel preferences and constraints
            
        Returns:
            Dictionary with personalized travel recommendations
        """
        if not self.hack2_available or not self.travel_ai:
            return await self._fallback_travel_recommendations(travel_request)
        
        try:
            # Extract request parameters
            travel_dates = travel_request.get("travel_dates")
            budget = travel_request.get("budget")
            family_size = travel_request.get("family_size", 4)
            interests = travel_request.get("interests", [])
            
            # Get recommendations from hack2
            recommendations = self.travel_ai.get_destination_recommendations(
                travel_dates=travel_dates,
                budget=budget,
                family_size=family_size
            )
            
            # Enhance for family platform
            enhanced_response = {
                "success": True,
                "request_details": travel_request,
                "recommendations": recommendations,
                "ai_powered": True,
                "family_focused": True,
                "cultural_considerations": {
                    "halal_food_available": True,
                    "family_friendly_accommodations": True,
                    "cultural_sites_included": True
                },
                "generated_at": datetime.now().isoformat()
            }
            
            logger.info(f"Generated travel recommendations for {family_size} family members")
            return enhanced_response
            
        except Exception as e:
            logger.error(f"Error getting travel recommendations: {e}")
            return await self._fallback_travel_recommendations(travel_request)
    
    async def plan_family_itinerary(self, destination: str, duration_days: int, family_members: List[Dict]) -> Dict[str, Any]:
        """
        Create detailed family itinerary using hack2 AI.
        
        Args:
            destination: Travel destination
            duration_days: Length of stay
            family_members: List of family member details
            
        Returns:
            Detailed day-by-day family itinerary
        """
        if not self.hack2_available or not self.travel_ai:
            return await self._fallback_itinerary_planning(destination, duration_days, family_members)
        
        try:
            # Use hack2's itinerary planning
            itinerary = self.travel_ai.plan_family_itinerary(
                destination=destination,
                duration_days=duration_days,
                family_members=family_members
            )
            
            # Enhance with family platform features
            enhanced_itinerary = {
                "success": True,
                "destination": destination,
                "duration": duration_days,
                "family_size": len(family_members),
                "itinerary": itinerary,
                "budget_estimate": itinerary.get("estimated_budget", 1500 * len(family_members)),
                "cultural_highlights": self._extract_cultural_highlights(itinerary),
                "family_activities": self._extract_family_activities(itinerary),
                "ai_powered": True,
                "generated_at": datetime.now().isoformat()
            }
            
            return enhanced_itinerary
            
        except Exception as e:
            logger.error(f"Error planning itinerary: {e}")
            return await self._fallback_itinerary_planning(destination, duration_days, family_members)
    
    async def get_cultural_insights(self, destination: str) -> Dict[str, Any]:
        """
        Get cultural insights for family travel using hack2.
        
        Args:
            destination: Travel destination
            
        Returns:
            Cultural insights and family travel tips
        """
        if not self.hack2_available or not self.travel_ai:
            return await self._fallback_cultural_insights(destination)
        
        try:
            insights = self.travel_ai.get_cultural_insights(destination)
            
            enhanced_insights = {
                "success": True,
                "destination": destination,
                "insights": insights,
                "family_specific_tips": [
                    "Check for family-friendly prayer times and locations",
                    "Research halal food options and family restaurants",
                    "Look for cultural sites suitable for all ages",
                    "Learn basic local phrases for family interactions"
                ],
                "ai_powered": True,
                "generated_at": datetime.now().isoformat()
            }
            
            return enhanced_insights
            
        except Exception as e:
            logger.error(f"Error getting cultural insights: {e}")
            return await self._fallback_cultural_insights(destination)
    
    async def analyze_travel_patterns(self) -> Dict[str, Any]:
        """
        Analyze family travel patterns using hack2 AI.
        
        Returns:
            Analysis of family travel preferences and patterns
        """
        if not self.hack2_available or not self.travel_ai:
            return await self._fallback_travel_pattern_analysis()
        
        try:
            analysis = self.travel_ai.analyze_family_travel_patterns()
            
            enhanced_analysis = {
                "success": True,
                "analysis": analysis,
                "recommendations": [
                    "Consider destinations with similar cultural appeal",
                    "Plan trips during preferred seasons",
                    "Budget for family-focused activities",
                    "Include educational and cultural experiences"
                ],
                "ai_powered": True,
                "generated_at": datetime.now().isoformat()
            }
            
            return enhanced_analysis
            
        except Exception as e:
            logger.error(f"Error analyzing travel patterns: {e}")
            return await self._fallback_travel_pattern_analysis()
    
    async def health_check(self) -> Dict[str, Any]:
        """
        Check health status of AI bridge and hack2 services.
        
        Returns:
            Health status information
        """
        status = {
            "service": "Family AI Bridge",
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "services": {
                "hack2_available": self.hack2_available,
                "memory_processor": self.memory_processor is not None,
                "travel_ai": self.travel_ai is not None,
                "ai_service_url": self.ai_service_url
            }
        }
        
        # Test hack2 services if available
        if self.hack2_available:
            try:
                # Test memory processor
                if self.memory_processor:
                    status["services"]["memory_processor_config"] = bool(self.memory_processor.config)
                
                # Test travel AI
                if self.travel_ai:
                    status["services"]["travel_ai_preferences"] = bool(self.travel_ai.travel_preferences)
                
            except Exception as e:
                status["services"]["test_error"] = str(e)
                status["status"] = "degraded"
        
        return status
    
    # Helper methods for generating enhanced content
    def _generate_memory_title(self, memory: Dict[str, Any]) -> str:
        """Generate a meaningful title for a memory."""
        analysis = memory.get("analysis", {})
        
        # Use location if available
        location = analysis.get("location", {})
        if location and location.get("city") != "Unknown":
            return f"Memory at {location.get('city', 'Unknown Location')}"
        
        # Use activities
        activities = analysis.get("activities", [])
        if activities:
            return f"Family {activities[0].replace('_', ' ').title()}"
        
        # Use family members
        family_members = analysis.get("family_members", [])
        if family_members:
            if len(family_members) == 1:
                return f"Memory with {family_members[0].get('name', 'Family Member')}"
            else:
                return f"Family Memory with {len(family_members)} Members"
        
        return "Family Memory"
    
    def _generate_memory_description(self, memory: Dict[str, Any]) -> str:
        """Generate a description for a memory."""
        analysis = memory.get("analysis", {})
        
        parts = []
        
        # Add location context
        location = analysis.get("location", {})
        if location and location.get("city") != "Unknown":
            parts.append(f"A special moment captured at {location.get('city')}")
        
        # Add activity context
        activities = analysis.get("activities", [])
        if activities:
            activity_names = [act.replace('_', ' ') for act in activities[:2]]
            parts.append(f"featuring {' and '.join(activity_names)}")
        
        # Add family context
        family_members = analysis.get("family_members", [])
        if family_members:
            if len(family_members) == 1:
                parts.append(f"with {family_members[0].get('name', 'a family member')}")
            elif len(family_members) > 1:
                parts.append(f"with {len(family_members)} family members")
        
        if parts:
            return ". ".join(parts) + "."
        else:
            return "A meaningful family moment worth preserving."
    
    def _generate_smart_tags(self, memory: Dict[str, Any]) -> List[str]:
        """Generate smart tags for a memory."""
        tags = []
        analysis = memory.get("analysis", {})
        
        # Add category tag
        category = analysis.get("memory_category", "")
        if category:
            tags.append(category.replace("_", " "))
        
        # Add activity tags
        activities = analysis.get("activities", [])
        for activity in activities[:3]:  # Limit to 3 activities
            tags.append(activity.replace("_", " "))
        
        # Add cultural tags
        cultural_elements = analysis.get("cultural_elements", [])
        for element in cultural_elements:
            if element.get("type") == "arabic_text":
                tags.append("arabic culture")
        
        # Add location tag
        location = analysis.get("location", {})
        if location and location.get("city") != "Unknown":
            tags.append(location.get("city", "").lower())
        
        return list(set(tags))  # Remove duplicates
    
    def _generate_sharing_suggestions(self, memory: Dict[str, Any]) -> List[str]:
        """Generate suggestions for sharing memories."""
        suggestions = []
        analysis = memory.get("analysis", {})
        
        family_members = analysis.get("family_members", [])
        if family_members:
            suggestions.append(f"Share with {len(family_members)} family members in this photo")
        
        activities = analysis.get("activities", [])
        if "travel" in activities:
            suggestions.append("Create a travel album for this trip")
        
        if "family_gathering" in activities:
            suggestions.append("Add to family celebration memories")
        
        suggestions.append("Create a photo story for this memory")
        
        return suggestions
    
    def _extract_cultural_highlights(self, itinerary: Dict[str, Any]) -> List[str]:
        """Extract cultural highlights from itinerary."""
        highlights = []
        daily_plans = itinerary.get("daily_plans", [])
        
        for day_plan in daily_plans:
            activities = day_plan.get("activities", [])
            for activity in activities:
                if activity.get("cultural_significance"):
                    highlights.append(activity["cultural_significance"])
        
        return highlights[:5]  # Limit to 5 highlights
    
    def _extract_family_activities(self, itinerary: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract family-friendly activities from itinerary."""
        family_activities = []
        daily_plans = itinerary.get("daily_plans", [])
        
        for day_plan in daily_plans:
            activities = day_plan.get("activities", [])
            for activity in activities:
                if activity.get("family_friendly", False):
                    family_activities.append({
                        "name": activity.get("activity", ""),
                        "day": day_plan.get("day", 1),
                        "duration": activity.get("duration", ""),
                        "tips": activity.get("tips", [])
                    })
        
        return family_activities
    
    # Fallback methods when hack2 is not available
    async def _fallback_photo_analysis(self, image_path: str, metadata: Optional[Dict] = None) -> Dict[str, Any]:
        """Fallback photo analysis when hack2 is not available."""
        return {
            "success": True,
            "image_path": image_path,
            "analysis_type": "basic_fallback",
            "ai_service": "fallback",
            "analysis": {
                "detected_faces": [],
                "family_members": [],
                "activities": ["family_photo"],
                "location": {"city": "Unknown", "country": "Unknown"},
                "memory_category": "daily_life",
                "confidence": 0.5
            },
            "suggestions": {
                "similar_memories": [],
                "memory_tags": ["family", "photo"],
                "sharing_suggestions": ["Share with family members"]
            },
            "metadata": metadata or {}
        }
    
    async def _fallback_timeline_creation(self, photos_directory: str) -> List[Dict[str, Any]]:
        """Fallback timeline creation."""
        return [{
            "id": "fallback_memory_1",
            "title": "Family Memory",
            "description": "A special family moment",
            "date": datetime.now().isoformat(),
            "tags": ["family"],
            "aiAnalysis": {"confidence": 0.3, "service": "fallback"}
        }]
    
    async def _fallback_memory_suggestions(self, date: str = None, family_member: str = None) -> Dict[str, Any]:
        """Fallback memory suggestions."""
        return {
            "success": True,
            "ai_powered": False,
            "suggestions": {
                "on_this_day": [],
                "contextual_suggestions": [
                    "Upload more family photos for better suggestions",
                    "Add location and date information to memories",
                    "Tag family members in photos"
                ]
            }
        }
    
    async def _fallback_travel_recommendations(self, travel_request: Dict[str, Any]) -> Dict[str, Any]:
        """Fallback travel recommendations."""
        return {
            "success": True,
            "ai_powered": False,
            "recommendations": [
                {
                    "destination": "Dubai, UAE",
                    "confidence": 0.7,
                    "reasons": ["Family-friendly destination", "Rich culture", "Halal food options"],
                    "estimated_cost": 5000
                }
            ]
        }
    
    async def _fallback_itinerary_planning(self, destination: str, duration_days: int, family_members: List[Dict]) -> Dict[str, Any]:
        """Fallback itinerary planning."""
        return {
            "success": True,
            "ai_powered": False,
            "destination": destination,
            "duration": duration_days,
            "itinerary": {
                "daily_plans": [
                    {
                        "day": 1,
                        "theme": "Arrival and exploration",
                        "activities": [
                            {"time": "10:00", "activity": f"Explore {destination} city center", "family_friendly": True}
                        ]
                    }
                ]
            }
        }
    
    async def _fallback_cultural_insights(self, destination: str) -> Dict[str, Any]:
        """Fallback cultural insights."""
        return {
            "success": True,
            "ai_powered": False,
            "destination": destination,
            "insights": {
                "family_specific_tips": [
                    "Research local customs and traditions",
                    "Check for family-friendly accommodations",
                    "Learn basic local phrases"
                ]
            }
        }
    
    async def _fallback_travel_pattern_analysis(self) -> Dict[str, Any]:
        """Fallback travel pattern analysis."""
        return {
            "success": True,
            "ai_powered": False,
            "analysis": {
                "travel_frequency": "moderate",
                "insights": ["Add more travel memories for better analysis"]
            }
        }


# Global instance
family_ai_bridge = FamilyAIBridge()


# Test function
async def main():
    """Test the Family AI Bridge"""
    bridge = FamilyAIBridge()
    
    # Test health check
    health = await bridge.health_check()
    print(f"Health Check: {json.dumps(health, indent=2)}")
    
    # Test travel recommendations
    travel_request = {
        "budget": 5000,
        "family_size": 4,
        "interests": ["culture", "family_activities"]
    }
    
    recommendations = await bridge.get_travel_recommendations(travel_request)
    print(f"Travel Recommendations: {json.dumps(recommendations, indent=2)}")


if __name__ == "__main__":
    asyncio.run(main())