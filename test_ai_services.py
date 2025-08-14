#!/usr/bin/env python3
"""
Test AI Services for Elmowafiplatform
Demonstrates how the AI services work with OpenAI and Gemini
"""

import asyncio
import json
import os
from ai_service_integrations import get_ai_service_manager
from backend.ai_integration import FamilyAIIntegration

async def test_ai_services():
    """Test all AI services"""
    print("🧪 Testing AI Services for Elmowafiplatform")
    print("=" * 50)
    
    # Initialize AI service manager
    try:
        ai_manager = get_ai_service_manager()
        print("✅ AI Service Manager initialized")
        
        # Check service status
        status = ai_manager.get_service_status()
        print(f"📊 Service Status: {status}")
        
    except Exception as e:
        print(f"❌ Failed to initialize AI Service Manager: {e}")
        print("💡 Make sure to set your API keys:")
        print("   export OPENAI_API_KEY=your-openai-key")
        print("   export GOOGLE_AI_API_KEY=your-gemini-key")
        return
    
    # Test 1: Travel Recommendations
    print("\n🌍 Testing Travel Recommendations...")
    travel_data = {
        "destination": "Europe",
        "budget": 5000,
        "family_size": 4,
        "interests": ["culture", "history", "food"],
        "duration": "10 days"
    }
    
    try:
        from backend.ai_integration import ai_service_proxy
        result = await ai_service_proxy.get_travel_recommendations(travel_data)
        print(f"✅ Travel Recommendations: {result.get('success', False)}")
        if result.get('success'):
            print(f"   AI Provider: {result.get('ai_provider', 'unknown')}")
            print(f"   Recommendations: {json.dumps(result.get('recommendations', {}), indent=2)}")
        else:
            print(f"   Error: {result.get('error', 'Unknown error')}")
    except Exception as e:
        print(f"❌ Travel recommendations failed: {e}")
    
    # Test 2: Cultural Insights
    print("\n🏛️ Testing Cultural Insights...")
    try:
        result = await ai_service_proxy.get_cultural_insights("Japan")
        print(f"✅ Cultural Insights: {result.get('success', False)}")
        if result.get('success'):
            print(f"   AI Provider: {result.get('ai_provider', 'unknown')}")
            print(f"   Insights: {json.dumps(result.get('insights', {}), indent=2)}")
        else:
            print(f"   Error: {result.get('error', 'Unknown error')}")
    except Exception as e:
        print(f"❌ Cultural insights failed: {e}")
    
    # Test 3: Family AI Chat
    print("\n💬 Testing Family AI Chat...")
    try:
        ai_integration = FamilyAIIntegration()
        result = await ai_integration.get_ai_response(
            "Can you help me plan a family vacation to Italy?",
            {"family_members": ["Mom", "Dad", "Child1", "Child2"], "total_memories": 25}
        )
        print(f"✅ AI Chat Response: {result.get('response', 'No response')[:100]}...")
        print(f"   Personality: {result.get('personality', 'Unknown')}")
        print(f"   AI Provider: {result.get('ai_provider', 'unknown')}")
    except Exception as e:
        print(f"❌ AI chat failed: {e}")
    
    # Test 4: Direct AI Content Generation with Gemini
    print("\n🤖 Testing Direct AI Content Generation (Gemini)...")
    try:
        prompt = "Create a family-friendly itinerary for a 3-day trip to Paris with 2 children aged 8 and 12."
        result = await ai_manager.generate_content(prompt, provider="gemini")
        print(f"✅ Direct AI Generation: {result.get('status', 'failed')}")
        if result.get('status') == 'success':
            print(f"   Provider: {result.get('provider', 'unknown')}")
            print(f"   Response: {result.get('text', '')[:200]}...")
        else:
            print(f"   Error: {result.get('error', 'Unknown error')}")
    except Exception as e:
        print(f"❌ Direct AI generation failed: {e}")
    
    # Test 5: Photo Analysis (Text-based) with Gemini
    print("\n📸 Testing Photo Analysis (Text-based) with Gemini...")
    try:
        prompt = """
        Analyze this family photo and provide detailed insights.
        
        Analysis type: memory
        Family context: [{"name": "Mom", "age": 35}, {"name": "Dad", "age": 38}, {"name": "Child", "age": 8}]
        
        Please provide:
        1. Description of what you see in the image
        2. Family members identified (if any)
        3. Emotions and expressions detected
        4. Objects and activities in the scene
        5. Location or setting suggestions
        6. Memory suggestions and tags
        7. Family-friendly insights
        
        Format as JSON with keys: description, family_members, emotions, objects, location, suggestions, insights
        """
        
        result = await ai_manager.generate_content(prompt, provider="gemini")
        print(f"✅ Photo Analysis: {result.get('status', 'failed')}")
        if result.get('status') == 'success':
            print(f"   Provider: {result.get('provider', 'unknown')}")
            try:
                analysis = json.loads(result.get('text', '{}'))
                print(f"   Description: {analysis.get('description', 'N/A')[:100]}...")
                print(f"   Family Members: {analysis.get('family_members', [])}")
                print(f"   Emotions: {analysis.get('emotions', [])}")
            except json.JSONDecodeError:
                print(f"   Raw Response: {result.get('text', '')[:200]}...")
        else:
            print(f"   Error: {result.get('error', 'Unknown error')}")
    except Exception as e:
        print(f"❌ Photo analysis failed: {e}")
    
    print("\n" + "=" * 50)
    print("🎉 AI Services Test Complete!")
    print("\n💡 To use these services:")
    print("1. Set your API keys in environment variables")
    print("2. Deploy the system with Docker")
    print("3. Access the API endpoints at /api/v1/")
    print("4. Use the frontend to interact with AI features")

if __name__ == "__main__":
    asyncio.run(test_ai_services())
