#!/usr/bin/env python3
"""
Test API Integration between Frontend and Backend
This script tests the basic API endpoints we've created
"""

import asyncio
import aiohttp
import json
import os
from pathlib import Path

# API Configuration
API_BASE_URL = "http://localhost:8001/api/v1"

class APIIntegrationTester:
    def __init__(self):
        self.session = None
    
    async def setup(self):
        """Setup test session"""
        self.session = aiohttp.ClientSession()
    
    async def cleanup(self):
        """Cleanup test session"""
        if self.session:
            await self.session.close()
    
    async def test_health_check(self):
        """Test API health check"""
        print("Testing health check...")
        try:
            async with self.session.get(f"{API_BASE_URL}/health") as response:
                if response.status == 200:
                    data = await response.json()
                    print(f"[PASS] Health check passed: {data.get('status')}")
                    return True
                else:
                    print(f"[FAIL] Health check failed: {response.status}")
                    return False
        except Exception as e:
            print(f"[ERROR] Health check error: {e}")
            return False
    
    async def test_system_info(self):
        """Test system info endpoint"""
        print("Testing system info...")
        try:
            async with self.session.get(f"{API_BASE_URL}/system/info") as response:
                if response.status == 200:
                    data = await response.json()
                    print(f"[PASS] System info: {data.get('platform')} v{data.get('version')}")
                    return True
                else:
                    print(f"[FAIL] System info failed: {response.status}")
                    return False
        except Exception as e:
            print(f"[ERROR] System info error: {e}")
            return False
    
    async def test_family_members(self):
        """Test family members endpoint"""
        print("Testing family members...")
        try:
            async with self.session.get(f"{API_BASE_URL}/family/members") as response:
                if response.status == 200:
                    data = await response.json()
                    members = data.get('members', [])
                    print(f"[PASS] Family members retrieved: {len(members)} members found")
                    return True
                else:
                    print(f"[FAIL] Family members failed: {response.status}")
                    return False
        except Exception as e:
            print(f"[ERROR] Family members error: {e}")
            return False
    
    async def test_memory_suggestions(self):
        """Test memory suggestions endpoint"""
        print("Testing memory suggestions...")
        try:
            async with self.session.get(f"{API_BASE_URL}/memories/suggestions") as response:
                if response.status == 200:
                    data = await response.json()
                    suggestions = data.get('suggestions', {})
                    print(f"[PASS] Memory suggestions retrieved: AI-powered={data.get('ai_powered', False)}")
                    return True
                else:
                    print(f"[FAIL] Memory suggestions failed: {response.status}")
                    return False
        except Exception as e:
            print(f"[ERROR] Memory suggestions error: {e}")
            return False
    
    async def test_travel_recommendations(self):
        """Test travel recommendations endpoint"""
        print("Testing travel recommendations...")
        try:
            params = {
                "budget": "medium",
                "duration": "1 week",
                "interests": ["culture", "food"]
            }
            
            url = f"{API_BASE_URL}/travel/recommendations"
            async with self.session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    recommendations = data.get('recommendations', [])
                    print(f"[PASS] Travel recommendations: {len(recommendations)} suggestions found")
                    return True
                else:
                    print(f"[FAIL] Travel recommendations failed: {response.status}")
                    return False
        except Exception as e:
            print(f"[ERROR] Travel recommendations error: {e}")
            return False
    
    async def test_ai_chat(self):
        """Test AI chat endpoint"""
        print("Testing AI chat...")
        try:
            chat_data = {
                "message": "Hello! Can you help me plan a family trip?",
                "conversationId": "test-conversation-123"
            }
            
            async with self.session.post(
                f"{API_BASE_URL}/chat/message",
                json=chat_data,
                headers={"Content-Type": "application/json"}
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    if data.get('success'):
                        print(f"[PASS] AI chat working: Got response from assistant")
                        return True
                    else:
                        print(f"[FAIL] AI chat failed: {data.get('error', 'Unknown error')}")
                        return False
                else:
                    print(f"[FAIL] AI chat failed: {response.status}")
                    return False
        except Exception as e:
            print(f"[ERROR] AI chat error: {e}")
            return False
    
    async def run_all_tests(self):
        """Run all integration tests"""
        print("Starting API Integration Tests...")
        print("=" * 50)
        
        await self.setup()
        
        tests = [
            ("Health Check", self.test_health_check),
            ("System Info", self.test_system_info),
            ("Family Members", self.test_family_members),
            ("Memory Suggestions", self.test_memory_suggestions),
            ("Travel Recommendations", self.test_travel_recommendations),
            ("AI Chat", self.test_ai_chat),
        ]
        
        passed = 0
        total = len(tests)
        
        for test_name, test_func in tests:
            try:
                result = await test_func()
                if result:
                    passed += 1
            except Exception as e:
                print(f"[CRASH] {test_name} crashed: {e}")
            print("-" * 30)
        
        await self.cleanup()
        
        print("=" * 50)
        print(f"Test Results: {passed}/{total} tests passed")
        
        if passed == total:
            print("All tests passed! API integration is working!")
            return True
        elif passed >= total // 2:
            print("Most tests passed. Some issues to investigate.")
            return False
        else:
            print("Many tests failed. Check your backend server.")
            return False

async def main():
    """Main test runner"""
    tester = APIIntegrationTester()
    
    print("Testing API Integration for Elmowafiplatform")
    print("Make sure your backend server is running on localhost:8000")
    print("")
    
    success = await tester.run_all_tests()
    
    if success:
        print("\nReady to proceed with frontend integration!")
    else:
        print("\nFix backend issues before proceeding.")
    
    return success

if __name__ == "__main__":
    asyncio.run(main())