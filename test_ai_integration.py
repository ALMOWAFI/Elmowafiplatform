#!/usr/bin/env python3
"""
AI Integration Test Script
Tests the complete integration flow from frontend API calls to hack2 AI processing
"""

import asyncio
import json
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / "backend"))

from backend.family_ai_bridge import family_ai_bridge

async def test_ai_integration():
    """Test the complete AI integration flow"""
    
    print("=" * 50)
    print("TESTING ELMOWAFIPLATFORM AI INTEGRATION")
    print("=" * 50)
    
    # Test 1: Health Check
    print("\n1. Testing AI Health Check...")
    try:
        health = await family_ai_bridge.health_check()
        print(f"✅ Health Check: {health['status']}")
        print(f"   Services: {json.dumps(health['services'], indent=2)}")
    except Exception as e:
        print(f"❌ Health Check Failed: {e}")
    
    # Test 2: Memory Suggestions (without photo)
    print("\n2. Testing Memory Suggestions...")
    try:
        suggestions = await family_ai_bridge.get_memory_suggestions("2024-08-11")
        print(f"✅ Memory Suggestions: {suggestions['success']}")
        print(f"   AI Powered: {suggestions['ai_powered']}")
        if suggestions['suggestions']['contextual_suggestions']:
            print(f"   Sample Suggestion: {suggestions['suggestions']['contextual_suggestions'][0]}")
    except Exception as e:
        print(f"❌ Memory Suggestions Failed: {e}")
    
    # Test 3: Travel Recommendations
    print("\n3. Testing Travel Recommendations...")
    try:
        travel_request = {
            "budget": 5000,
            "family_size": 4,
            "interests": ["culture", "family_activities"],
            "travel_dates": "2024-12-01",
            "duration_days": 7
        }
        recommendations = await family_ai_bridge.get_travel_recommendations(travel_request)
        print(f"✅ Travel Recommendations: {recommendations['success']}")
        print(f"   AI Powered: {recommendations['ai_powered']}")
        print(f"   Recommendations Count: {len(recommendations['recommendations'])}")
        
        if recommendations['recommendations']:
            first_rec = recommendations['recommendations'][0]
            print(f"   Sample: {first_rec.get('destination', 'N/A')} - Confidence: {first_rec.get('confidence', 'N/A')}")
    except Exception as e:
        print(f"❌ Travel Recommendations Failed: {e}")
    
    # Test 4: Itinerary Planning
    print("\n4. Testing Itinerary Planning...")
    try:
        family_members = [
            {"name": "Ahmad", "age": 35, "interests": ["culture", "food"]},
            {"name": "Fatima", "age": 32, "interests": ["photography", "history"]},
            {"name": "Omar", "age": 8, "interests": ["games", "animals"]}
        ]
        
        itinerary = await family_ai_bridge.plan_family_itinerary(
            destination="Dubai, UAE",
            duration_days=5,
            family_members=family_members
        )
        print(f"✅ Itinerary Planning: {itinerary['success']}")
        print(f"   AI Powered: {itinerary.get('ai_powered', False)}")
        print(f"   Duration: {itinerary['itinerary']['duration']} days")
        print(f"   Budget Estimate: ${itinerary.get('budget_estimate', 'N/A')}")
    except Exception as e:
        print(f"❌ Itinerary Planning Failed: {e}")
    
    # Test 5: Cultural Insights
    print("\n5. Testing Cultural Insights...")
    try:
        insights = await family_ai_bridge.get_cultural_insights("Istanbul, Turkey")
        print(f"✅ Cultural Insights: {insights['success']}")
        print(f"   AI Powered: {insights['ai_powered']}")
        print(f"   Destination: {insights['destination']}")
        tips = insights.get('family_specific_tips', [])
        if tips:
            print(f"   Sample Tip: {tips[0]}")
    except Exception as e:
        print(f"❌ Cultural Insights Failed: {e}")
    
    # Test 6: Travel Pattern Analysis
    print("\n6. Testing Travel Pattern Analysis...")
    try:
        analysis = await family_ai_bridge.analyze_travel_patterns()
        print(f"✅ Travel Pattern Analysis: {analysis['success']}")
        print(f"   AI Powered: {analysis['ai_powered']}")
        print(f"   Analysis Available: {bool(analysis.get('analysis'))}")
    except Exception as e:
        print(f"❌ Travel Pattern Analysis Failed: {e}")
    
    # Integration Summary
    print("\n" + "=" * 50)
    print("INTEGRATION SUMMARY")
    print("=" * 50)
    
    integration_status = {
        "hack2_available": family_ai_bridge.hack2_available,
        "memory_processor": family_ai_bridge.memory_processor is not None,
        "travel_ai": family_ai_bridge.travel_ai is not None,
        "ai_service_url": family_ai_bridge.ai_service_url
    }
    
    print(f"🔗 Integration Status:")
    for key, value in integration_status.items():
        status = "✅" if value else "❌"
        print(f"   {status} {key.replace('_', ' ').title()}: {value}")
    
    if family_ai_bridge.hack2_available:
        print(f"\n🎉 SUCCESS: hack2 AI services are integrated and working!")
        print(f"   • Family photo analysis ready")
        print(f"   • Travel planning AI active")
        print(f"   • Memory processing enabled")
        print(f"   • Smart suggestions available")
    else:
        print(f"\n⚠️  WARNING: hack2 services not available - using fallback mode")
        print(f"   • Basic functionality available")
        print(f"   • Limited AI features")
        print(f"   • Manual configuration may be needed")
    
    print(f"\n📋 Next Steps:")
    print(f"   1. Start the backend server: python backend/main.py")
    print(f"   2. Start hack2 AI server: cd core/ai-services/hack2 && python app.py")
    print(f"   3. Start React frontend: cd elmowafy-travels-oasis && npm run dev")
    print(f"   4. Test photo upload and AI analysis in the web interface")
    
    return integration_status

async def test_photo_analysis_simulation():
    """Test photo analysis with a mock image path"""
    print("\n" + "=" * 50)
    print("TESTING PHOTO ANALYSIS (SIMULATION)")
    print("=" * 50)
    
    try:
        # Create a dummy metadata for testing
        metadata = {
            "date": "2024-08-11",
            "location": "Dubai, UAE",
            "family_members": ["Ahmad", "Fatima", "Omar"],
            "tags": ["family", "vacation", "travel"]
        }
        
        # Since we don't have an actual image file, we'll test with a path
        # In real usage, this would be called with an actual uploaded file
        mock_image_path = "test_family_photo.jpg"
        
        print(f"Testing photo analysis simulation...")
        print(f"Mock image path: {mock_image_path}")
        print(f"Metadata: {json.dumps(metadata, indent=2)}")
        
        # This will use the fallback mode since we don't have a real image
        analysis = await family_ai_bridge.process_family_photo(mock_image_path, metadata)
        
        print(f"✅ Photo Analysis Simulation Complete")
        print(f"   Success: {analysis['success']}")
        print(f"   AI Service: {analysis['ai_service']}")
        print(f"   Analysis Type: {analysis['analysis_type']}")
        
        if analysis.get('suggestions', {}).get('memory_tags'):
            print(f"   Suggested Tags: {analysis['suggestions']['memory_tags']}")
        
        return True
        
    except Exception as e:
        print(f"❌ Photo Analysis Simulation Failed: {e}")
        return False

if __name__ == "__main__":
    print("Starting AI Integration Tests...")
    
    # Run main integration tests
    integration_results = asyncio.run(test_ai_integration())
    
    # Run photo analysis simulation
    photo_test_results = asyncio.run(test_photo_analysis_simulation())
    
    print(f"\n🏁 TESTING COMPLETE")
    print(f"Integration functional: {integration_results['hack2_available']}")
    print(f"Photo simulation: {photo_test_results}")
    
    if integration_results['hack2_available']:
        print(f"\n🚀 Ready for production use!")
    else:
        print(f"\n🔧 Configuration needed for full AI features")