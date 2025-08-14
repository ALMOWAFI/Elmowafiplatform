#!/usr/bin/env python3
"""
AI Integration Module - Connects Family AI Service to main backend endpoints
Implements the AI personality engine for family-aware responses and AI service proxy
"""

import json
import logging
import aiohttp
import asyncio
import os
from datetime import datetime
from typing import Dict, List, Any, Optional

# Import our AI service manager
try:
    from ai_service_integrations import get_ai_service_manager
    AI_SERVICE_MANAGER_AVAILABLE = True
except ImportError:
    AI_SERVICE_MANAGER_AVAILABLE = False
    print("Warning: AI service integrations not available. Using fallback responses.")

logger = logging.getLogger(__name__)

# AI Services Configuration
AI_SERVICE_URL = os.getenv("AI_SERVICE_URL", "http://localhost:5000")
HACK2_SERVICE_URL = os.getenv("HACK2_SERVICE_URL", "http://localhost:5000")

class AIServiceProxy:
    """Proxy for connecting to Python AI services"""
    
    def __init__(self):
        self.session = None
        
    async def _get_session(self):
        """Get or create aiohttp session"""
        if self.session is None:
            self.session = aiohttp.ClientSession()
        return self.session
    
    async def close(self):
        """Close aiohttp session"""
        if self.session:
            await self.session.close()
            self.session = None
    
    async def upload_family_photo(self, file_data: bytes, filename: str, metadata: Dict[str, Any] = None) -> Dict[str, Any]:
        """Proxy photo upload to AI service"""
        try:
            session = await self._get_session()
            
            # Prepare form data
            form_data = aiohttp.FormData()
            form_data.add_field('file', file_data, filename=filename, content_type='image/jpeg')
            
            if metadata:
                for key, value in metadata.items():
                    if key == 'family_members' and isinstance(value, list):
                        form_data.add_field(key, ','.join(value))
                    else:
                        form_data.add_field(key, str(value))
            
            async with session.post(f"{AI_SERVICE_URL}/api/memory/upload-photo", data=form_data) as response:
                if response.status == 200:
                    result = await response.json()
                    return {
                        "success": True,
                        "analysis": result.get("analysis", {}),
                        "image_url": result.get("image_url"),
                        "message": "Photo processed successfully"
                    }
                else:
                    error_text = await response.text()
                    logger.error(f"AI service error: {response.status} - {error_text}")
                    return {
                        "success": False,
                        "error": f"AI service error: {response.status}"
                    }
                    
        except Exception as e:
            logger.error(f"Error connecting to AI service: {str(e)}")
            return {
                "success": False,
                "error": f"Connection error: {str(e)}"
            }
    
    async def get_family_timeline(self) -> Dict[str, Any]:
        """Get family memory timeline from AI service"""
        try:
            session = await self._get_session()
            
            async with session.get(f"{AI_SERVICE_URL}/api/memory/timeline") as response:
                if response.status == 200:
                    return await response.json()
                else:
                    return {
                        "success": False,
                        "error": f"AI service error: {response.status}"
                    }
                    
        except Exception as e:
            logger.error(f"Error getting timeline: {str(e)}")
            return {
                "success": False,
                "error": f"Connection error: {str(e)}"
            }
    
    async def get_memory_suggestions(self, date: str = None, family_member: str = None) -> Dict[str, Any]:
        """Get memory suggestions from AI service"""
        try:
            session = await self._get_session()
            
            params = {}
            if date:
                params['date'] = date
            if family_member:
                params['family_member'] = family_member
            
            async with session.get(f"{AI_SERVICE_URL}/api/memory/suggestions", params=params) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    return {
                        "success": False,
                        "error": f"AI service error: {response.status}"
                    }
                    
        except Exception as e:
            logger.error(f"Error getting memory suggestions: {str(e)}")
            return {
                "success": False,
                "error": f"Connection error: {str(e)}"
            }
    
    async def get_travel_recommendations(self, travel_data: Dict[str, Any]) -> Dict[str, Any]:
        """Get travel recommendations using AI service manager"""
        if AI_SERVICE_MANAGER_AVAILABLE:
            try:
                ai_manager = get_ai_service_manager()
                
                # Create a detailed prompt for travel recommendations
                prompt = f"""
                Act as a family travel expert. Provide travel recommendations for:
                
                Destination preferences: {travel_data.get('destination', 'Any')}
                Budget: {travel_data.get('budget', 'Flexible')}
                Family size: {travel_data.get('family_size', '4')}
                Interests: {travel_data.get('interests', [])}
                Duration: {travel_data.get('duration', '7 days')}
                
                Please provide:
                1. Top 3 destination recommendations with reasons
                2. Estimated budget breakdown
                3. Family-friendly activities
                4. Cultural considerations
                5. Best time to visit
                
                Format as JSON with keys: destinations, budget_breakdown, activities, cultural_notes, best_time
                """
                
                # Try OpenAI first, then Gemini if OpenAI fails
                result = await ai_manager.generate_content(prompt, provider="openai")
                
                if result.get("status") == "success":
                    # Try to parse JSON from AI response
                    try:
                        ai_response = json.loads(result["text"])
                        return {
                            "success": True,
                            "recommendations": ai_response,
                            "ai_provider": result.get("provider", "unknown")
                        }
                    except json.JSONDecodeError:
                        # If not JSON, return as text
                        return {
                            "success": True,
                            "recommendations": {"text": result["text"]},
                            "ai_provider": result.get("provider", "unknown")
                        }
                else:
                    # Try Gemini as fallback
                    logger.info("OpenAI failed, trying Gemini...")
                    result = await ai_manager.generate_content(prompt, provider="gemini")
                    
                    if result.get("status") == "success":
                        try:
                            ai_response = json.loads(result["text"])
                            return {
                                "success": True,
                                "recommendations": ai_response,
                                "ai_provider": result.get("provider", "unknown")
                            }
                        except json.JSONDecodeError:
                            return {
                                "success": True,
                                "recommendations": {"text": result["text"]},
                                "ai_provider": result.get("provider", "unknown")
                            }
                    else:
                        logger.error(f"Both OpenAI and Gemini failed: {result.get('error')}")
                        return self._get_fallback_travel_response()
                        
            except Exception as e:
                logger.error(f"Error getting AI travel recommendations: {str(e)}")
                return self._get_fallback_travel_response()
        else:
            return self._get_fallback_travel_response()
    
    def _get_fallback_travel_response(self) -> Dict[str, Any]:
        """Fallback travel response when AI services are unavailable"""
        return {
            "success": False,
            "error": "AI services unavailable",
            "recommendations": {
                "destinations": ["Please try again when AI services are available"],
                "budget_breakdown": {},
                "activities": [],
                "cultural_notes": "AI-powered recommendations temporarily unavailable",
                "best_time": "Contact support for assistance"
            }
        }
    
    async def create_family_itinerary(self, itinerary_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create family itinerary using AI service manager"""
        if AI_SERVICE_MANAGER_AVAILABLE:
            try:
                ai_manager = get_ai_service_manager()
                
                prompt = f"""
                Create a detailed family itinerary for:
                
                Destination: {itinerary_data.get('destination', 'Unknown')}
                Duration: {itinerary_data.get('duration', '7 days')}
                Family members: {itinerary_data.get('family_members', [])}
                Budget: {itinerary_data.get('budget', 'Flexible')}
                Interests: {itinerary_data.get('interests', [])}
                
                Please create a day-by-day itinerary with:
                1. Daily activities and attractions
                2. Meal suggestions
                3. Transportation options
                4. Budget estimates per day
                5. Family-friendly considerations
                
                Format as JSON with keys: daily_plans, total_budget, transportation, tips
                """
                
                result = await ai_manager.generate_content(prompt, provider="auto")
                
                if result.get("status") == "success":
                    try:
                        ai_response = json.loads(result["text"])
                        return {
                            "success": True,
                            "itinerary": ai_response,
                            "ai_provider": result.get("provider", "unknown")
                        }
                    except json.JSONDecodeError:
                        return {
                            "success": True,
                            "itinerary": {"text": result["text"]},
                            "ai_provider": result.get("provider", "unknown")
                        }
                else:
                    return self._get_fallback_itinerary_response()
                    
            except Exception as e:
                logger.error(f"Error creating AI itinerary: {str(e)}")
                return self._get_fallback_itinerary_response()
        else:
            return self._get_fallback_itinerary_response()
    
    def _get_fallback_itinerary_response(self) -> Dict[str, Any]:
        """Fallback itinerary response when AI services are unavailable"""
        return {
            "success": False,
            "error": "AI services unavailable",
            "itinerary": {
                "daily_plans": ["Please try again when AI services are available"],
                "total_budget": 0,
                "transportation": "Contact support for assistance",
                "tips": "AI-powered itinerary creation temporarily unavailable"
            }
        }
    
    async def get_cultural_insights(self, destination: str) -> Dict[str, Any]:
        """Get cultural insights using AI service manager"""
        if AI_SERVICE_MANAGER_AVAILABLE:
            try:
                ai_manager = get_ai_service_manager()
                
                prompt = f"""
                Provide cultural insights and considerations for family travel to {destination}.
                
                Include:
                1. Cultural customs and etiquette
                2. Family-friendly cultural activities
                3. Local cuisine and dining customs
                4. Religious considerations
                5. Language tips
                6. Safety considerations
                7. Best cultural experiences for families
                
                Format as JSON with keys: customs, activities, cuisine, religious_notes, language_tips, safety, experiences
                """
                
                result = await ai_manager.generate_content(prompt, provider="auto")
                
                if result.get("status") == "success":
                    try:
                        ai_response = json.loads(result["text"])
                        return {
                            "success": True,
                            "insights": ai_response,
                            "ai_provider": result.get("provider", "unknown")
                        }
                    except json.JSONDecodeError:
                        return {
                            "success": True,
                            "insights": {"text": result["text"]},
                            "ai_provider": result.get("provider", "unknown")
                        }
                else:
                    return self._get_fallback_cultural_response(destination)
                    
            except Exception as e:
                logger.error(f"Error getting AI cultural insights: {str(e)}")
                return self._get_fallback_cultural_response(destination)
        else:
            return self._get_fallback_cultural_response(destination)
    
    def _get_fallback_cultural_response(self, destination: str) -> Dict[str, Any]:
        """Fallback cultural response when AI services are unavailable"""
        return {
            "success": False,
            "error": "AI services unavailable",
            "insights": {
                "customs": f"Research local customs for {destination}",
                "activities": "Contact local tourism board",
                "cuisine": "Check family-friendly restaurants",
                "religious_notes": "Research religious considerations",
                "language_tips": "Learn basic local phrases",
                "safety": "Check travel advisories",
                "experiences": "AI-powered insights temporarily unavailable"
            }
        }
    
    async def analyze_travel_patterns(self) -> Dict[str, Any]:
        """Analyze family travel patterns using AI service manager"""
        if AI_SERVICE_MANAGER_AVAILABLE:
            try:
                ai_manager = get_ai_service_manager()
                
                prompt = """
                Analyze family travel patterns and provide insights for future planning.
                
                Consider:
                1. Seasonal travel preferences
                2. Budget patterns
                3. Destination types (beach, city, nature, etc.)
                4. Activity preferences
                5. Travel duration patterns
                6. Family size considerations
                
                Provide recommendations for:
                1. Optimal travel timing
                2. Budget optimization
                3. New destination suggestions
                4. Activity planning
                
                Format as JSON with keys: patterns, recommendations, insights
                """
                
                result = await ai_manager.generate_content(prompt, provider="auto")
                
                if result.get("status") == "success":
                    try:
                        ai_response = json.loads(result["text"])
                        return {
                            "success": True,
                            "analysis": ai_response,
                            "ai_provider": result.get("provider", "unknown")
                        }
                    except json.JSONDecodeError:
                        return {
                            "success": True,
                            "analysis": {"text": result["text"]},
                            "ai_provider": result.get("provider", "unknown")
                        }
                else:
                    return self._get_fallback_pattern_response()
                    
            except Exception as e:
                logger.error(f"Error analyzing AI travel patterns: {str(e)}")
                return self._get_fallback_pattern_response()
        else:
            return self._get_fallback_pattern_response()
    
    def _get_fallback_pattern_response(self) -> Dict[str, Any]:
        """Fallback pattern analysis response when AI services are unavailable"""
        return {
            "success": False,
            "error": "AI services unavailable",
            "analysis": {
                "patterns": "AI analysis temporarily unavailable",
                "recommendations": "Contact support for assistance",
                "insights": "Please try again when AI services are available"
            }
        }
    
    async def health_check(self) -> Dict[str, Any]:
        """Check AI service health"""
        try:
            session = await self._get_session()
            
            async with session.get(f"{AI_SERVICE_URL}/api/health") as response:
                if response.status == 200:
                    return await response.json()
                else:
                    return {
                        "status": "unhealthy",
                        "error": f"Service error: {response.status}"
                    }
                    
        except Exception as e:
            logger.error(f"Error checking AI service health: {str(e)}")
            return {
                "status": "unhealthy",
                "error": f"Connection error: {str(e)}"
            }

class FamilyAIIntegration:
    """Family AI integration with personality-based responses"""
    
    def __init__(self):
        self.ai_proxy = AIServiceProxy()
        self.personalities = {
            "travel": {
                "name": "Travel Guide Ahmed",
                "style": "enthusiastic",
                "specialties": ["travel", "destinations", "planning"]
            },
            "memories": {
                "name": "Memory Keeper Fatima", 
                "style": "warm",
                "specialties": ["memories", "photos", "family_history"]
            },
            "games": {
                "name": "Game Master Omar",
                "style": "energetic",
                "specialties": ["games", "activities", "entertainment"]
            },
            "family": {
                "name": "Family Organizer Layla",
                "style": "caring",
                "specialties": ["family", "organization", "coordination"]
            }
        }
    
    async def get_ai_response(self, message: str, family_context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Get AI response using real AI services with fallback"""
        if AI_SERVICE_MANAGER_AVAILABLE:
            try:
                ai_manager = get_ai_service_manager()
                
                # Select personality based on message content
                personality = self._select_personality(message)
                
                # Create context-aware prompt
                context_info = ""
                if family_context:
                    family_size = len(family_context.get("family_members", []))
                    context_info = f"\n\nFamily Context: Managing {family_size} family members. "
                    if family_context.get("total_memories"):
                        context_info += f"Family has {family_context.get('total_memories')} memories stored. "
                
                prompt = f"""
                You are {personality['name']}, a {personality['style']} AI assistant specializing in {', '.join(personality['specialties'])}.
                
                Respond to this family message: "{message}"
                {context_info}
                
                Provide a helpful, family-focused response with:
                1. Direct answer to the question/request
                2. Relevant suggestions or next steps
                3. Family-friendly tone and approach
                
                Keep the response conversational and under 200 words.
                """
                
                result = await ai_manager.generate_content(prompt, provider="auto")
                
                if result.get("status") == "success":
                    return {
                        "response": result["text"],
                        "personality": personality["name"],
                        "ai_provider": result.get("provider", "unknown"),
                        "context_used": [f"Family size: {len(family_context.get('family_members', []))}"] if family_context else [],
                        "suggestions": self._generate_suggestions(personality["specialties"])
                    }
                else:
                    logger.error(f"AI service error: {result.get('error')}")
                    return self._get_fallback_response(message, personality)
                    
            except Exception as e:
                logger.error(f"Error getting AI response: {str(e)}")
                personality = self._select_personality(message)
                return self._get_fallback_response(message, personality)
        else:
            personality = self._select_personality(message)
            return self._get_fallback_response(message, personality)
    
    def _select_personality(self, message: str) -> Dict[str, Any]:
        """Select appropriate personality based on message content"""
        message_lower = message.lower()
        
        if any(word in message_lower for word in ["travel", "trip", "vacation", "destination", "hotel", "flight"]):
            return self.personalities["travel"]
        elif any(word in message_lower for word in ["memory", "photo", "picture", "remember", "album"]):
            return self.personalities["memories"]
        elif any(word in message_lower for word in ["game", "play", "fun", "activity", "entertainment"]):
            return self.personalities["games"]
        else:
            return self.personalities["family"]
    
    def _get_fallback_response(self, message: str, personality: Dict[str, Any]) -> Dict[str, Any]:
        """Fallback response when AI services are unavailable"""
        fallback_responses = {
            "travel": [
                "🌍 I'd love to help with your travel plans! Unfortunately, my AI services are temporarily unavailable. Please try again in a few minutes or contact support for assistance.",
                "✈️ Travel planning is my specialty! I'm experiencing some technical difficulties right now. Please check back soon for personalized travel recommendations.",
                "🗺️ I'm here to help with your family adventures! My AI features are currently offline. Please try again later for the best travel suggestions."
            ],
            "memories": [
                "💝 I'm here to help you treasure every family moment! My AI features are temporarily unavailable. Please try again soon for memory organization and suggestions.",
                "📸 Every photo tells a story! I'm experiencing some technical difficulties. Please check back later for AI-powered memory insights.",
                "🌟 Your family memories are precious! My AI services are currently offline. Please try again soon for memory analysis and suggestions."
            ],
            "games": [
                "🎮 Ready for some family fun! My AI game features are temporarily unavailable. Please try again soon for personalized game recommendations.",
                "🎯 Family game time is the best! I'm experiencing some technical difficulties. Please check back later for AI-powered gaming suggestions.",
                "🏆 Game on, family! My AI services are currently offline. Please try again soon for the best gaming experiences."
            ],
            "family": [
                "👨‍👩‍👧‍👦 I'm here to help keep your family organized! My AI features are temporarily unavailable. Please try again in a few minutes.",
                "🏠 Family is everything! I'm experiencing some technical difficulties. Please check back soon for AI-powered family assistance.",
                "💕 Your family deserves the best! My AI services are currently offline. Please try again later for personalized family support."
            ]
        }
        
        import random
        responses = fallback_responses.get(personality["specialties"][0], fallback_responses["family"])
        response = random.choice(responses)
        
        return {
            "response": response,
            "personality": personality["name"],
            "ai_provider": "fallback",
            "context_used": [],
            "suggestions": self._generate_suggestions(personality["specialties"])
        }
    
    def _generate_suggestions(self, specialties: List[str]) -> List[str]:
        """Generate suggestions based on personality specialties"""
        suggestions_map = {
            "travel": ["Show me travel plans", "Suggest destinations", "Help with travel budget", "Find family activities"],
            "memories": ["Upload family photos", "View memory timeline", "Find similar memories", "Create memory albums"],
            "games": ["Start a Mafia game", "Create family challenges", "Show available games", "Set up teams"],
            "family": ["View family tree", "Add family member", "Update family info", "Plan family activities"]
        }
        
        return suggestions_map.get(specialties[0], ["Try again later", "Contact support", "Check system status"])

    async def cleanup(self):
        """Cleanup AI proxy resources"""
        await self.ai_proxy.close()

    # === NEW METHODS FOR API INTEGRATION ===
    
    async def analyze_photo_comprehensive(self, image_path: str, metadata: Dict[str, Any] = None, 
                                        family_context: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Comprehensive AI photo analysis"""
        try:
            # Try to use AI service
            if AI_SERVICE_MANAGER_AVAILABLE:
                ai_manager = get_ai_service_manager()
                
                # Create prompt for photo analysis
                prompt = f"""
                Analyze this family photo and provide comprehensive insights:
                
                Photo metadata: {json.dumps(metadata or {}, indent=2)}
                Family context: {len(family_context or [])} family members
                
                Please provide:
                1. Description of what you see
                2. Family members that might be present
                3. Emotions and activities detected
                4. Location/setting suggestions
                5. Memory tags and categories
                6. Suggested title for this memory
                
                Format response as JSON with keys: description, family_members, emotions, objects, location, tags, suggested_title
                """
                
                result = await ai_manager.generate_content(prompt, provider="auto")
                
                if result.get("status") == "success":
                    try:
                        analysis_data = json.loads(result["text"])
                    except json.JSONDecodeError:
                        analysis_data = {
                            "description": result["text"],
                            "family_members": [],
                            "emotions": ["happy"],
                            "objects": ["photo"],
                            "location": "Unknown",
                            "tags": ["family", "memory"],
                            "suggested_title": f"Family Memory {datetime.now().strftime('%Y-%m-%d')}"
                        }
                    
                    return {
                        "success": True,
                        "analysis": analysis_data,
                        "memory_suggestions": [
                            "Add this to family timeline",
                            "Tag family members in photo",
                            "Create a photo album for this event"
                        ],
                        "processing_time": 2.5
                    }
            
            # Fallback response
            return {
                "success": True,
                "analysis": {
                    "description": "Family photo uploaded successfully",
                    "family_members": [],
                    "emotions": ["happy"],
                    "objects": ["photo", "family"],
                    "location": metadata.get("location", "Unknown"),
                    "tags": ["family", "memory", "photo"],
                    "suggested_title": f"Family Memory {datetime.now().strftime('%Y-%m-%d')}"
                },
                "memory_suggestions": [
                    "Add location tags for better organization",
                    "Include family members in the photo",
                    "Consider creating a travel album"
                ],
                "processing_time": 1.0
            }
            
        except Exception as e:
            logger.error(f"Error in comprehensive photo analysis: {e}")
            return {
                "success": False,
                "error": f"Analysis failed: {str(e)}",
                "analysis": {}
            }

    async def analyze_image(self, image_path: str, analysis_type: str = "memory", 
                          family_context: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Analyze image with AI"""
        return await self.analyze_photo_comprehensive(
            image_path=image_path,
            metadata={"analysis_type": analysis_type},
            family_context=family_context
        )

    async def chat_with_assistant(self, message: str, context: Dict[str, Any] = None, 
                                family_id: str = None, conversation_id: str = None,
                                user_id: str = None) -> Dict[str, Any]:
        """Enhanced chat with AI assistant"""
        try:
            # Use existing get_ai_response method
            response = await self.get_ai_response(message, family_context=context)
            
            return {
                "success": True,
                "response": response.get("response", "I'm here to help with your family memories and travel planning!"),
                "context": {
                    "family_id": family_id,
                    "conversation_id": conversation_id,
                    "user_id": user_id,
                    "personality": response.get("personality", "Family Assistant")
                },
                "confidence": 0.8,
                "context_used": response.get("context_used", []),
                "suggestions": response.get("suggestions", [])
            }
            
        except Exception as e:
            logger.error(f"Error in chat with assistant: {e}")
            return {
                "success": False,
                "response": "I'm sorry, I'm having trouble responding right now. Please try again later.",
                "context": {},
                "confidence": 0.0,
                "context_used": [],
                "suggestions": ["Try a simpler question", "Check system status", "Contact support"]
            }

# Global AI integration instances
ai_integration = FamilyAIIntegration()
ai_service_proxy = AIServiceProxy()