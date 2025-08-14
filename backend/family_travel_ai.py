#!/usr/bin/env python3
"""
Family Travel AI Assistant - Provides intelligent travel recommendations for families
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import json

logger = logging.getLogger(__name__)

class FamilyTravelAI:
    """AI-powered travel assistant specifically designed for family needs"""
    
    def __init__(self):
        self.travel_knowledge_base = self._initialize_knowledge_base()
        self.cultural_insights = self._load_cultural_insights()
    
    def _initialize_knowledge_base(self) -> Dict[str, Any]:
        """Initialize the travel knowledge base with family-friendly information"""
        return {
            "destinations": {
                "Dubai": {
                    "country": "UAE",
                    "family_friendly_score": 95,
                    "best_months": ["November", "December", "January", "February", "March"],
                    "avoid_months": ["June", "July", "August"],
                    "climate": "desert",
                    "currency": "AED",
                    "language": "Arabic (English widely spoken)",
                    "attractions": {
                        "family_friendly": [
                            {"name": "Dubai Mall", "age_range": "all_ages", "cost": "free_entry", "duration": "4-6 hours"},
                            {"name": "Burj Khalifa", "age_range": "6+", "cost": "moderate", "duration": "2 hours"},
                            {"name": "Dubai Fountain", "age_range": "all_ages", "cost": "free", "duration": "30 minutes"},
                            {"name": "Dubai Aquarium", "age_range": "all_ages", "cost": "moderate", "duration": "2-3 hours"},
                            {"name": "IMG Worlds of Adventure", "age_range": "8+", "cost": "expensive", "duration": "full_day"},
                            {"name": "Dubai Parks and Resorts", "age_range": "all_ages", "cost": "expensive", "duration": "full_day"},
                            {"name": "Global Village", "age_range": "all_ages", "cost": "low", "duration": "4-5 hours"},
                            {"name": "Dubai Marina Walk", "age_range": "all_ages", "cost": "free", "duration": "2-3 hours"}
                        ]
                    },
                    "cultural_tips": [
                        "Dress modestly when visiting mosques and traditional areas",
                        "Remove shoes when entering religious sites",
                        "Respect prayer times and Friday prayers",
                        "Arabic coffee and dates are traditional welcomes"
                    ],
                    "family_accommodations": [
                        "Atlantis The Palm (luxury with kids club)",
                        "Jumeirah Beach Hotel (family suites)",
                        "Hilton Dubai Jumeirah (family rooms with sea view)",
                        "Rove Hotels (modern family-friendly)"
                    ],
                    "transportation": {
                        "metro": "Excellent and air-conditioned",
                        "taxi": "Reliable and meter-based",
                        "car_rental": "Right-hand driving, good roads",
                        "public_transport": "Modern and family-friendly"
                    }
                },
                "Istanbul": {
                    "country": "Turkey",
                    "family_friendly_score": 90,
                    "best_months": ["April", "May", "September", "October"],
                    "avoid_months": ["July", "August"],
                    "climate": "Mediterranean",
                    "currency": "Turkish Lira",
                    "language": "Turkish (English in tourist areas)",
                    "attractions": {
                        "family_friendly": [
                            {"name": "Hagia Sophia", "age_range": "8+", "cost": "low", "duration": "2 hours"},
                            {"name": "Blue Mosque", "age_range": "all_ages", "cost": "free", "duration": "1 hour"},
                            {"name": "Topkapi Palace", "age_range": "10+", "cost": "moderate", "duration": "3 hours"},
                            {"name": "Grand Bazaar", "age_range": "12+", "cost": "free_entry", "duration": "2-3 hours"},
                            {"name": "Bosphorus Cruise", "age_range": "all_ages", "cost": "moderate", "duration": "2 hours"},
                            {"name": "Miniaturk Park", "age_range": "all_ages", "cost": "low", "duration": "3 hours"},
                            {"name": "Istanbul Aquarium", "age_range": "all_ages", "cost": "moderate", "duration": "3 hours"}
                        ]
                    },
                    "cultural_tips": [
                        "Learn basic Turkish greetings",
                        "Bargaining is expected in markets",
                        "Remove shoes in mosques",
                        "Try Turkish breakfast as a family experience"
                    ]
                },
                "London": {
                    "country": "UK",
                    "family_friendly_score": 85,
                    "best_months": ["May", "June", "July", "August", "September"],
                    "climate": "temperate",
                    "currency": "GBP",
                    "language": "English",
                    "attractions": {
                        "family_friendly": [
                            {"name": "British Museum", "age_range": "8+", "cost": "free", "duration": "3-4 hours"},
                            {"name": "Tower of London", "age_range": "10+", "cost": "expensive", "duration": "3 hours"},
                            {"name": "London Eye", "age_range": "all_ages", "cost": "expensive", "duration": "1 hour"},
                            {"name": "Natural History Museum", "age_range": "all_ages", "cost": "free", "duration": "3-4 hours"},
                            {"name": "Hyde Park", "age_range": "all_ages", "cost": "free", "duration": "2-3 hours"},
                            {"name": "Warner Bros Studio Tour", "age_range": "8+", "cost": "expensive", "duration": "4 hours"}
                        ]
                    }
                },
                "Paris": {
                    "country": "France",
                    "family_friendly_score": 80,
                    "best_months": ["April", "May", "June", "September", "October"],
                    "climate": "temperate",
                    "currency": "EUR",
                    "language": "French",
                    "attractions": {
                        "family_friendly": [
                            {"name": "Eiffel Tower", "age_range": "all_ages", "cost": "moderate", "duration": "2 hours"},
                            {"name": "Louvre Museum", "age_range": "10+", "cost": "moderate", "duration": "4 hours"},
                            {"name": "Disneyland Paris", "age_range": "all_ages", "cost": "expensive", "duration": "full_day"},
                            {"name": "Notre-Dame Cathedral", "age_range": "8+", "cost": "free", "duration": "1 hour"},
                            {"name": "Luxembourg Gardens", "age_range": "all_ages", "cost": "free", "duration": "2 hours"}
                        ]
                    }
                }
            },
            "travel_patterns": {
                "family_preferences": {
                    "duration": {
                        "short_trip": "3-5 days",
                        "week_trip": "7-10 days",
                        "extended_trip": "14+ days"
                    },
                    "accommodation_types": [
                        "family_hotel_rooms",
                        "serviced_apartments", 
                        "family_resorts",
                        "vacation_rentals"
                    ],
                    "activity_preferences": [
                        "educational_experiences",
                        "outdoor_activities",
                        "cultural_immersion",
                        "entertainment_parks",
                        "beach_activities",
                        "city_exploration"
                    ]
                }
            }
        }
    
    def _load_cultural_insights(self) -> Dict[str, Any]:
        """Load cultural insights for different destinations"""
        return {
            "middle_eastern": {
                "greeting_customs": "Handshakes are common, but ask before physical contact",
                "dress_codes": "Modest dress is appreciated, especially in religious areas",
                "dining_etiquette": "Meals are social events, often eaten with family",
                "gift_giving": "Small gifts are appreciated when visiting homes",
                "prayer_times": "Respect prayer times, especially Friday prayers"
            },
            "european": {
                "greeting_customs": "Handshakes and air kisses are common",
                "dining_etiquette": "Table manners are important, wait for host to start",
                "tipping": "10-15% is standard in restaurants",
                "punctuality": "Being on time is highly valued"
            },
            "general_family_tips": [
                "Research local customs before traveling",
                "Teach children basic phrases in local language",
                "Respect local traditions and dress codes",
                "Be patient with cultural differences",
                "Use travel as educational opportunity"
            ]
        }
    
    def get_destination_recommendations(
        self, 
        travel_dates: Optional[str] = None,
        budget: Optional[float] = None,
        family_size: int = 4,
        interests: List[str] = None
    ) -> Dict[str, Any]:
        """Get personalized destination recommendations for families"""
        try:
            interests = interests or ["cultural", "educational", "entertainment"]
            
            # Analyze travel dates for seasonal recommendations
            season_preferences = self._analyze_travel_dates(travel_dates)
            
            # Score destinations based on criteria
            scored_destinations = []
            
            for dest_name, dest_info in self.travel_knowledge_base["destinations"].items():
                score = self._score_destination(
                    dest_info, 
                    season_preferences, 
                    budget, 
                    family_size, 
                    interests
                )
                
                scored_destinations.append({
                    "destination": dest_name,
                    "score": score["total_score"],
                    "score_breakdown": score["breakdown"],
                    "recommendation_strength": score["strength"],
                    "highlights": self._get_destination_highlights(dest_name, dest_info),
                    "estimated_budget": self._estimate_destination_budget(dest_name, family_size, 7),
                    "best_activities": self._get_top_activities(dest_info, interests)
                })
            
            # Sort by score
            scored_destinations.sort(key=lambda x: x["score"], reverse=True)
            
            return {
                "recommendations": scored_destinations[:5],  # Top 5 recommendations
                "search_criteria": {
                    "travel_dates": travel_dates,
                    "budget": budget,
                    "family_size": family_size,
                    "interests": interests
                },
                "general_tips": self._get_general_family_travel_tips(),
                "generated_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting destination recommendations: {e}")
            return {
                "recommendations": [],
                "error": str(e),
                "generated_at": datetime.now().isoformat()
            }
    
    def _analyze_travel_dates(self, travel_dates: Optional[str]) -> Dict[str, Any]:
        """Analyze travel dates to determine seasonal preferences"""
        if not travel_dates:
            return {"season": "flexible", "month": None}
        
        try:
            # Parse travel date (assume it's a start date string)
            travel_date = datetime.fromisoformat(travel_dates.split("T")[0])
            month = travel_date.month
            
            # Determine season
            if month in [12, 1, 2]:
                season = "winter"
            elif month in [3, 4, 5]:
                season = "spring"
            elif month in [6, 7, 8]:
                season = "summer"
            else:
                season = "autumn"
            
            return {
                "season": season,
                "month": travel_date.strftime("%B"),
                "month_number": month,
                "is_peak_season": month in [6, 7, 8, 12]
            }
            
        except Exception as e:
            logger.warning(f"Could not parse travel dates: {e}")
            return {"season": "flexible", "month": None}
    
    def _score_destination(
        self, 
        dest_info: Dict, 
        season_prefs: Dict, 
        budget: Optional[float], 
        family_size: int, 
        interests: List[str]
    ) -> Dict[str, Any]:
        """Score a destination based on family criteria"""
        
        scores = {
            "family_friendliness": dest_info.get("family_friendly_score", 70) / 100,
            "seasonal_fit": 0,
            "budget_fit": 0.7,  # Default moderate score
            "interest_match": 0,
            "accessibility": 0.8  # Default good score
        }
        
        # Seasonal scoring
        if season_prefs.get("month"):
            best_months = dest_info.get("best_months", [])
            avoid_months = dest_info.get("avoid_months", [])
            
            if season_prefs["month"] in best_months:
                scores["seasonal_fit"] = 1.0
            elif season_prefs["month"] in avoid_months:
                scores["seasonal_fit"] = 0.3
            else:
                scores["seasonal_fit"] = 0.6
        else:
            scores["seasonal_fit"] = 0.8  # Flexible dates get good score
        
        # Interest matching
        dest_attractions = dest_info.get("attractions", {}).get("family_friendly", [])
        attraction_categories = set()
        for attraction in dest_attractions:
            if "cultural" in attraction.get("name", "").lower():
                attraction_categories.add("cultural")
            if "park" in attraction.get("name", "").lower() or "adventure" in attraction.get("name", "").lower():
                attraction_categories.add("entertainment")
            if "museum" in attraction.get("name", "").lower():
                attraction_categories.add("educational")
        
        interest_matches = len(set(interests).intersection(attraction_categories))
        scores["interest_match"] = min(1.0, interest_matches / len(interests)) if interests else 0.5
        
        # Calculate weighted total score
        weights = {
            "family_friendliness": 0.3,
            "seasonal_fit": 0.25,
            "budget_fit": 0.2,
            "interest_match": 0.2,
            "accessibility": 0.05
        }
        
        total_score = sum(scores[criteria] * weights[criteria] for criteria in scores.keys())
        
        # Determine recommendation strength
        if total_score >= 0.8:
            strength = "highly_recommended"
        elif total_score >= 0.6:
            strength = "recommended"
        elif total_score >= 0.4:
            strength = "consider"
        else:
            strength = "not_recommended"
        
        return {
            "total_score": total_score,
            "breakdown": scores,
            "strength": strength
        }
    
    def _get_destination_highlights(self, dest_name: str, dest_info: Dict) -> List[str]:
        """Get key highlights for a destination"""
        highlights = []
        
        # Add family-friendly score highlight
        family_score = dest_info.get("family_friendly_score", 0)
        if family_score >= 90:
            highlights.append(f"Excellent for families ({family_score}% family-friendly)")
        elif family_score >= 80:
            highlights.append(f"Very family-friendly ({family_score}% rating)")
        
        # Add climate info
        climate = dest_info.get("climate", "")
        if climate:
            highlights.append(f"{climate.title()} climate")
        
        # Add cultural significance
        attractions = dest_info.get("attractions", {}).get("family_friendly", [])
        if len(attractions) >= 5:
            highlights.append(f"Rich in family activities ({len(attractions)} major attractions)")
        
        # Add language advantage
        language = dest_info.get("language", "")
        if "English" in language:
            highlights.append("English widely spoken")
        
        return highlights[:3]  # Return top 3 highlights
    
    def _estimate_destination_budget(self, dest_name: str, family_size: int, duration_days: int) -> Dict[str, Any]:
        """Estimate budget for a destination"""
        
        # Base costs per person per day (in USD)
        base_costs = {
            "Dubai": {"accommodation": 80, "meals": 40, "activities": 30, "transport": 15},
            "Istanbul": {"accommodation": 50, "meals": 25, "activities": 20, "transport": 10},
            "London": {"accommodation": 100, "meals": 45, "activities": 35, "transport": 20},
            "Paris": {"accommodation": 90, "meals": 40, "activities": 30, "transport": 18}
        }
        
        costs = base_costs.get(dest_name, {"accommodation": 60, "meals": 30, "activities": 25, "transport": 12})
        
        # Calculate total costs
        total_costs = {}
        for category, daily_cost in costs.items():
            if category == "accommodation":
                # Assume family shares accommodation
                total_costs[category] = daily_cost * duration_days * (1 if family_size <= 2 else 1.5)
            else:
                total_costs[category] = daily_cost * duration_days * family_size
        
        # Add flights (estimated)
        total_costs["flights"] = family_size * 600  # Rough estimate
        
        total = sum(total_costs.values())
        
        return {
            "total_estimated": total,
            "breakdown": total_costs,
            "per_person": total / family_size,
            "currency": "USD",
            "duration_days": duration_days,
            "family_size": family_size
        }
    
    def _get_top_activities(self, dest_info: Dict, interests: List[str]) -> List[Dict]:
        """Get top recommended activities for destination"""
        attractions = dest_info.get("attractions", {}).get("family_friendly", [])
        
        # Score activities based on interests
        scored_activities = []
        for activity in attractions:
            score = 0
            activity_name = activity.get("name", "").lower()
            
            # Interest-based scoring
            for interest in interests:
                if interest.lower() in activity_name or interest in activity.get("category", ""):
                    score += 1
            
            # Age range scoring (prefer all-ages activities)
            if activity.get("age_range") == "all_ages":
                score += 2
            elif "+" in activity.get("age_range", ""):
                score += 1
            
            # Cost scoring (prefer free/low cost)
            cost = activity.get("cost", "moderate")
            if cost in ["free", "low"]:
                score += 1
            
            scored_activities.append({
                "activity": activity,
                "relevance_score": score
            })
        
        # Sort and return top activities
        scored_activities.sort(key=lambda x: x["relevance_score"], reverse=True)
        return [item["activity"] for item in scored_activities[:5]]
    
    def _get_general_family_travel_tips(self) -> List[str]:
        """Get general family travel tips"""
        return [
            "Book family-friendly accommodations with connecting rooms or suites",
            "Pack entertainment for long flights/drives (tablets, books, games)",
            "Research kid-friendly restaurants and local cuisine families will enjoy",
            "Plan for rest time between activities to avoid over-scheduling",
            "Bring a first-aid kit and any necessary medications",
            "Download offline maps and translation apps",
            "Consider travel insurance for family trips",
            "Pack light but bring comfort items for children",
            "Research local customs and prepare children for cultural differences",
            "Have backup plans for activities in case of weather or closures"
        ]
    
    def plan_family_itinerary(
        self, 
        destination: str, 
        duration_days: int = 5, 
        family_members: List[Dict] = None
    ) -> Dict[str, Any]:
        """Plan a detailed family itinerary for a destination"""
        try:
            family_members = family_members or []
            dest_info = self.travel_knowledge_base["destinations"].get(destination)
            
            if not dest_info:
                return {
                    "error": f"Destination {destination} not found in knowledge base",
                    "available_destinations": list(self.travel_knowledge_base["destinations"].keys())
                }
            
            # Create day-by-day itinerary
            itinerary_days = []
            attractions = dest_info.get("attractions", {}).get("family_friendly", [])
            
            # Distribute attractions across days
            attractions_per_day = max(1, len(attractions) // duration_days)
            
            for day in range(1, duration_days + 1):
                start_idx = (day - 1) * attractions_per_day
                end_idx = start_idx + attractions_per_day
                
                if day == duration_days:  # Last day gets remaining attractions
                    end_idx = len(attractions)
                
                day_attractions = attractions[start_idx:end_idx]
                
                # Create day plan
                day_plan = {
                    "day": day,
                    "date": (datetime.now() + timedelta(days=day-1)).strftime("%Y-%m-%d"),
                    "theme": self._get_day_theme(day, duration_days),
                    "activities": self._plan_day_activities(day_attractions, day),
                    "estimated_cost": sum(
                        self._estimate_activity_cost(activity) 
                        for activity in day_attractions
                    ) * len(family_members) if family_members else 100,
                    "transportation_tips": dest_info.get("transportation", {}),
                    "meal_suggestions": self._get_meal_suggestions(destination, day),
                    "family_tips": self._get_day_specific_tips(day_attractions)
                }
                
                itinerary_days.append(day_plan)
            
            return {
                "destination": destination,
                "duration_days": duration_days,
                "family_size": len(family_members),
                "itinerary": itinerary_days,
                "general_tips": dest_info.get("cultural_tips", []),
                "accommodation_suggestions": dest_info.get("family_accommodations", []),
                "total_estimated_cost": sum(day["estimated_cost"] for day in itinerary_days),
                "best_time_to_visit": dest_info.get("best_months", []),
                "generated_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error planning family itinerary: {e}")
            return {"error": str(e)}
    
    def _get_day_theme(self, day: int, total_days: int) -> str:
        """Get theme for each day of itinerary"""
        themes = {
            1: "Arrival & Orientation",
            2: "Cultural Exploration", 
            3: "Family Fun & Entertainment",
            4: "Nature & Outdoor Activities",
            5: "Local Experiences",
            6: "Relaxation & Reflection",
            7: "Final Adventures"
        }
        
        if day == total_days:
            return "Departure & Last Memories"
        
        return themes.get(day, f"Exploration Day {day}")
    
    def _plan_day_activities(self, attractions: List[Dict], day: int) -> List[Dict]:
        """Plan activities for a specific day"""
        planned_activities = []
        
        current_time = 9  # Start at 9 AM
        
        for attraction in attractions:
            duration_str = attraction.get("duration", "2 hours")
            duration_hours = self._parse_duration(duration_str)
            
            activity = {
                "time": f"{current_time:02d}:00",
                "name": attraction.get("name"),
                "duration": duration_str,
                "age_suitability": attraction.get("age_range", "all_ages"),
                "cost_level": attraction.get("cost", "moderate"),
                "description": f"Visit {attraction.get('name')} - perfect for {attraction.get('age_range', 'all ages')}",
                "tips": self._get_activity_tips(attraction)
            }
            
            planned_activities.append(activity)
            current_time += duration_hours + 0.5  # Add 30 min buffer
            
            # Add lunch break if needed
            if current_time >= 12 and current_time <= 14 and len(planned_activities) > 1:
                planned_activities.append({
                    "time": f"{int(current_time):02d}:00",
                    "name": "Lunch Break",
                    "duration": "1 hour",
                    "description": "Family meal at local restaurant",
                    "cost_level": "moderate",
                    "tips": ["Try local family-friendly cuisine", "Ask for children's portions"]
                })
                current_time += 1
        
        return planned_activities
    
    def _parse_duration(self, duration_str: str) -> float:
        """Parse duration string to hours"""
        try:
            if "full_day" in duration_str:
                return 8
            elif "half_day" in duration_str:
                return 4
            elif "hour" in duration_str:
                # Extract number before "hour"
                import re
                match = re.search(r'(\d+(?:\.\d+)?)', duration_str)
                if match:
                    return float(match.group(1))
            return 2  # Default 2 hours
        except:
            return 2
    
    def _estimate_activity_cost(self, activity: Dict) -> float:
        """Estimate cost for an activity per person"""
        cost_level = activity.get("cost", "moderate")
        cost_map = {
            "free": 0,
            "low": 15,
            "moderate": 35,
            "expensive": 75,
            "free_entry": 0
        }
        return cost_map.get(cost_level, 35)
    
    def _get_meal_suggestions(self, destination: str, day: int) -> List[str]:
        """Get meal suggestions for the destination"""
        meal_suggestions = {
            "Dubai": [
                "Try traditional Emirati breakfast with khanfaroosh",
                "Visit Dubai Mall food court for international options",
                "Experience Arabic mezze dinner",
                "Try camel burger (adventurous families)",
                "Visit Gold Souk area for traditional restaurants"
            ],
            "Istanbul": [
                "Turkish breakfast with family (kahvalti)",
                "Try Turkish delight and baklava",
                "Family-friendly kebab restaurant",
                "Turkish pizza (pide) for lunch",
                "Traditional Turkish tea experience"
            ],
            "London": [
                "Traditional English breakfast",
                "Fish and chips by the Thames",
                "Afternoon tea experience for families",
                "Borough Market food tasting",
                "Traditional pub lunch (family-friendly)"
            ],
            "Paris": [
                "French bakery breakfast with croissants",
                "Crepe lunch in Montmartre", 
                "Family-friendly bistro dinner",
                "Visit local markets for picnic supplies",
                "Hot chocolate at Angelina"
            ]
        }
        
        suggestions = meal_suggestions.get(destination, [
            "Research local family-friendly restaurants",
            "Try traditional breakfast",
            "Find restaurants with children's menus",
            "Experience local street food (safely)",
            "Visit local markets for authentic experience"
        ])
        
        # Rotate suggestions by day
        day_index = (day - 1) % len(suggestions)
        return [suggestions[day_index]]
    
    def _get_activity_tips(self, activity: Dict) -> List[str]:
        """Get specific tips for an activity"""
        tips = []
        
        cost = activity.get("cost", "moderate")
        if cost == "expensive":
            tips.append("Consider booking online for discounts")
        elif cost == "free":
            tips.append("Free activity - great for budget-conscious families")
        
        age_range = activity.get("age_range", "")
        if "+" in age_range:
            tips.append(f"Suitable for ages {age_range} - younger children may need extra supervision")
        elif age_range == "all_ages":
            tips.append("Perfect for the whole family")
        
        duration = activity.get("duration", "")
        if "full_day" in duration:
            tips.append("Plan for the whole day - bring snacks and water")
        
        return tips or ["Enjoy the experience with your family!"]
    
    def _get_day_specific_tips(self, attractions: List[Dict]) -> List[str]:
        """Get tips specific to the day's activities"""
        tips = []
        
        # Check if day has outdoor activities
        outdoor_activities = [a for a in attractions if "park" in a.get("name", "").lower() or "outdoor" in a.get("name", "").lower()]
        if outdoor_activities:
            tips.append("Check weather forecast and dress appropriately for outdoor activities")
        
        # Check for expensive activities
        expensive_activities = [a for a in attractions if a.get("cost") == "expensive"]
        if expensive_activities:
            tips.append("Budget planning: This day includes premium attractions")
        
        # Check for cultural sites
        cultural_activities = [a for a in attractions if any(word in a.get("name", "").lower() for word in ["mosque", "church", "museum", "palace"])]
        if cultural_activities:
            tips.append("Dress modestly for cultural and religious sites")
        
        return tips or ["Have a wonderful day exploring!"]
    
    def get_cultural_insights(self, destination: str) -> Dict[str, Any]:
        """Get cultural insights for family travel to a destination"""
        try:
            dest_info = self.travel_knowledge_base["destinations"].get(destination)
            
            if not dest_info:
                return {"error": f"Cultural insights not available for {destination}"}
            
            # Determine cultural region
            country = dest_info.get("country", "")
            if country in ["UAE", "Turkey", "Jordan", "Egypt"]:
                cultural_region = "middle_eastern"
            elif country in ["UK", "France", "Germany", "Italy"]:
                cultural_region = "european"
            else:
                cultural_region = "general"
            
            cultural_info = self.cultural_insights.get(cultural_region, {})
            
            insights = {
                "destination": destination,
                "cultural_region": cultural_region,
                "cultural_customs": cultural_info,
                "destination_specific_tips": dest_info.get("cultural_tips", []),
                "family_considerations": self._get_family_cultural_considerations(destination),
                "language_tips": self._get_language_tips(dest_info),
                "etiquette_guidelines": self._get_etiquette_guidelines(cultural_region),
                "general_family_tips": self.cultural_insights.get("general_family_tips", [])
            }
            
            return insights
            
        except Exception as e:
            logger.error(f"Error getting cultural insights: {e}")
            return {"error": str(e)}
    
    def _get_family_cultural_considerations(self, destination: str) -> List[str]:
        """Get family-specific cultural considerations"""
        considerations = {
            "Dubai": [
                "Children should also dress modestly in public areas",
                "Ramadan timing may affect restaurant hours",
                "Friday is the holy day - some attractions may have different hours",
                "Public displays of affection should be minimal"
            ],
            "Istanbul": [
                "Children can visit mosques but should be quiet and respectful",
                "Bargaining in markets can be a fun family activity",
                "Turkish people are generally very welcoming to families",
                "Learn to say 'teşekkür ederim' (thank you) as a family"
            ],
            "London": [
                "Queuing is an important cultural norm",
                "Pub culture exists but many pubs welcome families during day hours",
                "Tipping 10-15% is standard in restaurants",
                "Mind the gap on the Underground"
            ],
            "Paris": [
                "Greeting with 'Bonjour' is important in shops and restaurants",
                "Dining etiquette is more formal - teach children proper table manners",
                "Many museums offer family workshops and activities",
                "Sunday shopping is limited - plan accordingly"
            ]
        }
        
        return considerations.get(destination, [
            "Research local customs before traveling",
            "Be respectful of local traditions",
            "Teach children about cultural differences",
            "Use travel as a learning opportunity"
        ])
    
    def _get_language_tips(self, dest_info: Dict) -> Dict[str, Any]:
        """Get language tips for the destination"""
        language = dest_info.get("language", "Unknown")
        
        common_phrases = {
            "Arabic": {
                "hello": "مرحبا (Marhaba)",
                "thank_you": "شكرا (Shukran)",
                "please": "من فضلك (Min fadlik)",
                "excuse_me": "عذرا (Uzran)",
                "yes": "نعم (Na'am)",
                "no": "لا (La)"
            },
            "Turkish": {
                "hello": "Merhaba",
                "thank_you": "Teşekkür ederim",
                "please": "Lütfen",
                "excuse_me": "Pardon",
                "yes": "Evet",
                "no": "Hayır"
            },
            "French": {
                "hello": "Bonjour",
                "thank_you": "Merci",
                "please": "S'il vous plaît",
                "excuse_me": "Excusez-moi",
                "yes": "Oui",
                "no": "Non"
            }
        }
        
        # Extract main language
        main_language = language.split(" ")[0]
        phrases = common_phrases.get(main_language, {
            "hello": "Hello",
            "thank_you": "Thank you",
            "please": "Please"
        })
        
        return {
            "primary_language": language,
            "english_spoken": "English" in language,
            "common_phrases": phrases,
            "family_tip": "Teach children a few basic phrases - locals appreciate the effort!"
        }
    
    def _get_etiquette_guidelines(self, cultural_region: str) -> List[str]:
        """Get etiquette guidelines for cultural region"""
        guidelines = {
            "middle_eastern": [
                "Use right hand for greetings and eating",
                "Remove shoes when entering homes or certain establishments",
                "Avoid pointing with index finger - use whole hand",
                "Be patient with slower pace of life",
                "Accept hospitality graciously"
            ],
            "european": [
                "Maintain good eye contact during conversations",
                "Dress smartly when dining out",
                "Wait to be seated at restaurants",
                "Keep voices down in public transportation",
                "Respect personal space"
            ],
            "general": [
                "Be respectful of local customs",
                "Observe and follow what locals do",
                "Ask permission before taking photos of people",
                "Be patient with cultural differences",
                "Show appreciation for local culture"
            ]
        }
        
        return guidelines.get(cultural_region, guidelines["general"])
    
    def analyze_family_travel_patterns(self) -> Dict[str, Any]:
        """Analyze family travel patterns and preferences"""
        try:
            # This would integrate with actual family travel data
            # For now, return sample analysis
            
            analysis = {
                "travel_frequency": {
                    "trips_per_year": 2.5,
                    "average_duration": 7,
                    "preferred_seasons": ["Spring", "Summer", "Winter holidays"]
                },
                "destination_preferences": {
                    "cultural_sites": 0.8,
                    "beach_destinations": 0.6,
                    "urban_exploration": 0.7,
                    "nature_adventures": 0.5,
                    "theme_parks": 0.9
                },
                "budget_patterns": {
                    "average_per_trip": 3500,
                    "accommodation_percentage": 35,
                    "activities_percentage": 30,
                    "meals_percentage": 25,
                    "transportation_percentage": 10
                },
                "family_dynamics": {
                    "decision_makers": ["parents"],
                    "activity_preferences_by_age": {
                        "children_under_10": ["theme_parks", "interactive_museums", "beach"],
                        "teens": ["cultural_sites", "adventure_activities", "shopping"],
                        "adults": ["cultural_experiences", "relaxation", "local_cuisine"]
                    }
                },
                "recommendations": [
                    "Consider shoulder season travel for better prices and smaller crowds",
                    "Mix active and relaxing activities for balanced itineraries",
                    "Include educational components to enrich family travel experiences",
                    "Plan for flexibility in schedules to accommodate different energy levels"
                ],
                "generated_at": datetime.now().isoformat()
            }
            
            return analysis
            
        except Exception as e:
            logger.error(f"Error analyzing travel patterns: {e}")
            return {"error": str(e)}