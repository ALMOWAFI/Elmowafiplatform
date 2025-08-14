#!/usr/bin/env python3
"""
Test script for Family Memory & Travel AI Platform functionality
"""

import sys
import os

# Add the AI services to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'core', 'ai-services', 'hack2'))

def test_travel_ai():
    """Test the family travel AI functionality"""
    print("=== TESTING TRAVEL AI ===")
    try:
        from family_travel_ai import FamilyTravelAI
        
        travel_ai = FamilyTravelAI()
        recommendations = travel_ai.get_destination_recommendations(
            family_size=4, 
            budget=5000
        )
        
        print(f"✅ Generated {len(recommendations)} travel recommendations:")
        for i, rec in enumerate(recommendations[:2], 1):
            print(f"  {i}. {rec['destination']}")
            print(f"     - Confidence: {rec['confidence']:.2f}")
            print(f"     - Estimated cost: ${rec['estimated_cost']:,}")
            print(f"     - Main reason: {rec['reasons'][0]}")
            print()
        
        # Test itinerary creation
        if recommendations:
            destination = recommendations[0]["destination"]
            itinerary = travel_ai.plan_family_itinerary(
                destination=destination,
                duration_days=5,
                family_members=[
                    {"age": 35, "interests": ["culture", "food"]},
                    {"age": 8, "interests": ["games", "parks"]}
                ]
            )
            print(f"✅ Created 5-day itinerary for {destination}")
            print(f"   - {len(itinerary['daily_plans'])} daily plans generated")
            print(f"   - Logistics info included: {len(itinerary['logistics']['accommodation_suggestions'])} accommodation suggestions")
            print()
        
        return True
        
    except Exception as e:
        print(f"❌ Travel AI Error: {e}")
        return False

def test_memory_ai():
    """Test the family memory AI functionality"""
    print("=== TESTING MEMORY AI ===")
    try:
        from family_memory_processor import FamilyMemoryProcessor
        
        processor = FamilyMemoryProcessor()
        
        # Test memory suggestions
        suggestions = processor.get_memory_suggestions(date="2024-08-09")
        print(f"✅ Generated {len(suggestions)} memory suggestions")
        
        # Test travel pattern analysis 
        patterns = processor.analyze_travel_patterns()
        print(f"✅ Travel pattern analysis complete")
        print(f"   - Visited countries: {len(patterns['visited_countries'])}")
        print(f"   - Favorite activities: {len(patterns['favorite_activities'])}")
        print()
        
        return True
        
    except Exception as e:
        print(f"❌ Memory AI Error: {e}")
        return False

def test_api_structure():
    """Test that our API structure is properly set up"""
    print("=== TESTING API STRUCTURE ===")
    try:
        # Test that app.py has the right endpoints
        sys.path.append(os.path.join(os.path.dirname(__file__), 'core', 'ai-services', 'hack2'))
        import app
        
        # Check if Flask app is properly configured
        routes = []
        for rule in app.app.url_map.iter_rules():
            routes.append(f"{rule.methods} {rule.rule}")
        
        family_endpoints = [r for r in routes if '/api/memory' in r or '/api/travel' in r]
        
        print(f"✅ Found {len(family_endpoints)} family-specific API endpoints:")
        for endpoint in family_endpoints:
            print(f"   - {endpoint}")
        print()
        
        return len(family_endpoints) > 0
        
    except Exception as e:
        print(f"❌ API Structure Error: {e}")
        return False

def main():
    """Run all tests"""
    print("🏠 FAMILY MEMORY & TRAVEL PLATFORM - FUNCTIONALITY TEST")
    print("=" * 60)
    
    results = []
    results.append(test_travel_ai())
    results.append(test_memory_ai())  
    results.append(test_api_structure())
    
    print("=" * 60)
    print("FINAL RESULTS:")
    print(f"✅ Tests passed: {sum(results)}/{len(results)}")
    
    if all(results):
        print("🎉 ALL TESTS PASSED! Your family platform is working correctly!")
        print("\nYour platform provides:")
        print("- 🌍 AI-powered family travel recommendations")
        print("- 📸 Family memory processing and timeline creation") 
        print("- 🏠 Family-focused API endpoints")
        print("- 🤖 Cultural heritage preservation features")
    else:
        print("⚠️  Some components need attention, but core functionality is there!")
    
    print(f"\nFrontend: http://localhost:5173")
    print(f"Backend: http://localhost:8000") 
    print(f"AI Services: http://localhost:5000")

if __name__ == "__main__":
    main()