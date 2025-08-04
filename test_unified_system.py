#!/usr/bin/env python3
"""
Test script for the unified Elmowafiplatform system
Tests all major components and their integration
"""

import os
import sys
import requests
import json
import time
from datetime import datetime

# Set environment variables for testing
os.environ['ENVIRONMENT'] = 'development'
os.environ['DATABASE_URL'] = 'postgresql://localhost:5432/elmowafiplatform_test'
os.environ['LOG_LEVEL'] = 'INFO'

BASE_URL = "http://localhost:8000"

def test_health_endpoints():
    """Test all health check endpoints"""
    print("🏥 Testing Health Endpoints...")
    
    endpoints = [
        "/api/health",
        "/api/database/health", 
        "/api/circuit-breakers/health",
        "/api/performance/summary"
    ]
    
    results = {}
    for endpoint in endpoints:
        try:
            response = requests.get(f"{BASE_URL}{endpoint}", timeout=5)
            results[endpoint] = {
                "status": response.status_code,
                "success": response.status_code == 200
            }
            if response.status_code == 200:
                data = response.json()
                results[endpoint]["data"] = {
                    "status": data.get("status", "unknown"),
                    "timestamp": data.get("timestamp", ""),
                    "version": data.get("version", "")
                }
            print(f"   ✅ {endpoint}: {response.status_code}")
        except Exception as e:
            results[endpoint] = {"status": "error", "error": str(e), "success": False}
            print(f"   ❌ {endpoint}: {e}")
    
    return results

def test_family_management():
    """Test family management endpoints"""
    print("👨‍👩‍👧‍👦 Testing Family Management...")
    
    # Test creating a family member
    try:
        member_data = {
            "name": "Test Family Member",
            "name_arabic": "عضو عائلة تجريبي", 
            "birth_date": "1990-01-01",
            "location": "Test City",
            "role": "member"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/family/members",
            json=member_data,
            timeout=10
        )
        
        print(f"   Create Member: {response.status_code}")
        if response.status_code in [200, 201]:
            member_id = response.json().get("id")
            print(f"   ✅ Created member: {member_id}")
            
            # Test getting family members
            get_response = requests.get(f"{BASE_URL}/api/family/members", timeout=5)
            print(f"   Get Members: {get_response.status_code}")
            if get_response.status_code == 200:
                members = get_response.json()
                print(f"   ✅ Found {len(members)} family members")
            
            return {"success": True, "member_id": member_id}
        else:
            return {"success": False, "error": response.text}
            
    except Exception as e:
        print(f"   ❌ Family management error: {e}")
        return {"success": False, "error": str(e)}

def test_memory_management():
    """Test memory management endpoints"""
    print("📸 Testing Memory Management...")
    
    try:
        memory_data = {
            "family_group_id": "00000000-0000-0000-0000-000000000001",
            "title": "Test Memory",
            "description": "A test family memory",
            "date": datetime.now().isoformat(),
            "location": "Test Location",
            "memory_type": "photo",
            "tags": ["test", "family"],
            "privacy_level": "family"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/memories",
            json=memory_data,
            timeout=10
        )
        
        print(f"   Create Memory: {response.status_code}")
        if response.status_code in [200, 201]:
            memory_id = response.json().get("id")
            print(f"   ✅ Created memory: {memory_id}")
            
            # Test getting memories
            get_response = requests.get(f"{BASE_URL}/api/memories", timeout=5)
            print(f"   Get Memories: {get_response.status_code}")
            if get_response.status_code == 200:
                memories = get_response.json()
                print(f"   ✅ Found {len(memories)} memories")
            
            return {"success": True, "memory_id": memory_id}
        else:
            return {"success": False, "error": response.text}
            
    except Exception as e:
        print(f"   ❌ Memory management error: {e}")
        return {"success": False, "error": str(e)}

def test_budget_management():
    """Test budget management endpoints"""
    print("💰 Testing Budget Management...")
    
    try:
        # Create budget profile
        profile_data = {
            "family_group_id": "00000000-0000-0000-0000-000000000001",
            "name": "Test Family Budget",
            "description": "Test budget profile",
            "currency": "USD"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/budget/profiles",
            json=profile_data,
            timeout=10
        )
        
        print(f"   Create Budget Profile: {response.status_code}")
        if response.status_code in [200, 201]:
            profile_id = response.json().get("id")
            print(f"   ✅ Created budget profile: {profile_id}")
            
            # Create budget envelope
            envelope_data = {
                "budget_profile_id": profile_id,
                "name": "Travel",
                "amount": 1000.0,
                "category": "Travel",
                "color": "#3B82F6",
                "icon": "✈️"
            }
            
            envelope_response = requests.post(
                f"{BASE_URL}/api/budget/envelopes",
                json=envelope_data,
                timeout=10
            )
            
            print(f"   Create Budget Envelope: {envelope_response.status_code}")
            if envelope_response.status_code in [200, 201]:
                envelope_id = envelope_response.json().get("id")
                print(f"   ✅ Created budget envelope: {envelope_id}")
            
            return {"success": True, "profile_id": profile_id}
        else:
            return {"success": False, "error": response.text}
            
    except Exception as e:
        print(f"   ❌ Budget management error: {e}")
        return {"success": False, "error": str(e)}

def test_game_management():
    """Test game management endpoints"""
    print("🎮 Testing Game Management...")
    
    try:
        session_data = {
            "family_group_id": "00000000-0000-0000-0000-000000000001",
            "game_type": "mafia",
            "title": "Test Mafia Game",
            "description": "A test game session",
            "players": []
        }
        
        response = requests.post(
            f"{BASE_URL}/api/games/sessions",
            json=session_data,
            timeout=10
        )
        
        print(f"   Create Game Session: {response.status_code}")
        if response.status_code in [200, 201]:
            session_id = response.json().get("id")
            print(f"   ✅ Created game session: {session_id}")
            
            # Test getting active games
            get_response = requests.get(f"{BASE_URL}/api/games/sessions/active", timeout=5)
            print(f"   Get Active Games: {get_response.status_code}")
            if get_response.status_code == 200:
                sessions = get_response.json()
                print(f"   ✅ Found {len(sessions)} active game sessions")
            
            return {"success": True, "session_id": session_id}
        else:
            return {"success": False, "error": response.text}
            
    except Exception as e:
        print(f"   ❌ Game management error: {e}")
        return {"success": False, "error": str(e)}

def test_dashboard_analytics():
    """Test dashboard and analytics endpoints"""
    print("📊 Testing Dashboard & Analytics...")
    
    try:
        family_group_id = "00000000-0000-0000-0000-000000000001"
        
        # Test family dashboard
        response = requests.get(f"{BASE_URL}/api/dashboard/{family_group_id}", timeout=10)
        print(f"   Family Dashboard: {response.status_code}")
        
        if response.status_code == 200:
            dashboard = response.json()
            print(f"   ✅ Dashboard data retrieved")
            
            # Test memory analytics
            analytics_response = requests.get(
                f"{BASE_URL}/api/analytics/memories/{family_group_id}",
                timeout=10
            )
            print(f"   Memory Analytics: {analytics_response.status_code}")
            
            if analytics_response.status_code == 200:
                analytics = analytics_response.json()
                print(f"   ✅ Analytics data retrieved")
            
            return {"success": True}
        else:
            return {"success": False, "error": response.text}
            
    except Exception as e:
        print(f"   ❌ Dashboard analytics error: {e}")
        return {"success": False, "error": str(e)}

def main():
    """Run comprehensive system test"""
    print("🚀 Elmowafiplatform Unified System Test")
    print("=" * 60)
    
    # Test if server is running
    try:
        response = requests.get(f"{BASE_URL}/api/health", timeout=3)
        if response.status_code != 200:
            print("❌ Server is not responding properly")
            print(f"   Status: {response.status_code}")
            print(f"   Response: {response.text}")
            return
    except Exception as e:
        print("❌ Server is not running or not accessible")
        print(f"   Error: {e}")
        print(f"   Make sure to start the server with: uvicorn main:app --port 8000")
        return
    
    print("✅ Server is running!\n")
    
    # Run tests
    test_results = {}
    
    test_results["health"] = test_health_endpoints()
    print()
    
    test_results["family"] = test_family_management()
    print()
    
    test_results["memory"] = test_memory_management() 
    print()
    
    test_results["budget"] = test_budget_management()
    print()
    
    test_results["games"] = test_game_management()
    print()
    
    test_results["dashboard"] = test_dashboard_analytics()
    print()
    
    # Summary
    print("📋 Test Summary")
    print("=" * 60)
    
    total_tests = len(test_results)
    successful_tests = sum(1 for result in test_results.values() if result.get("success", False))
    
    for test_name, result in test_results.items():
        status = "✅ PASS" if result.get("success", False) else "❌ FAIL"
        print(f"   {test_name.title()}: {status}")
        if not result.get("success", False) and "error" in result:
            print(f"      Error: {result['error']}")
    
    print(f"\n🎯 Results: {successful_tests}/{total_tests} tests passed")
    
    if successful_tests == total_tests:
        print("\n🎉 All systems are working! Ready for deployment!")
    else:
        print(f"\n⚠️  {total_tests - successful_tests} tests failed. Check the errors above.")
    
    return successful_tests == total_tests

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)