#!/usr/bin/env python3
"""
Debug script to test game endpoints and see detailed errors
"""
import requests
import json

BASE_URL = "http://127.0.0.1:8002"

def test_health():
    """Test health endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/api/health", timeout=5)
        print(f"Health endpoint: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print("Services status:")
            for service, status in data.get("services", {}).items():
                print(f"  {service}: {status}")
        else:
            print(f"Health error: {response.text}")
        return response.status_code == 200
    except Exception as e:
        print(f"Health endpoint failed: {e}")
        return False

def test_active_games_detailed():
    """Test active games with detailed error info"""
    try:
        response = requests.get(f"{BASE_URL}/api/games/active", timeout=10)
        print(f"Active games endpoint: {response.status_code}")
        print(f"Response headers: {dict(response.headers)}")
        print(f"Response text: {response.text[:500]}...")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response data: {json.dumps(data, indent=2)}")
        
        return response.status_code == 200
    except Exception as e:
        print(f"Active games endpoint failed: {e}")
        return False

def main():
    print("Debug Game Endpoints")
    print("=" * 40)
    
    print("\n1. Testing Health Endpoint...")
    health_ok = test_health()
    
    print("\n2. Testing Active Games Endpoint...")
    games_ok = test_active_games_detailed()
    
    print(f"\nResults:")
    print(f"  Health: {'OK' if health_ok else 'FAILED'}")
    print(f"  Games: {'OK' if games_ok else 'FAILED'}")

if __name__ == "__main__":
    main()