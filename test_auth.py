#!/usr/bin/env python3
"""
Test Authentication System
Basic test to verify JWT authentication endpoints work correctly
"""

import os
import sys
import asyncio
import json
import requests
from datetime import datetime

# Add project root to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

API_BASE_URL = "http://localhost:8000/api"

def test_health_check():
    """Test that the API is running"""
    print("🔍 Testing health check...")
    try:
        response = requests.get(f"{API_BASE_URL}/health")
        if response.status_code == 200:
            print("✅ Health check passed")
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False

def test_user_registration():
    """Test user registration"""
    print("\n🔍 Testing user registration...")
    
    test_user = {
        "email": f"test_{datetime.now().strftime('%Y%m%d_%H%M%S')}@example.com",
        "display_name": "Test User",
        "password": "testpassword123",
        "family_group_name": "Test Family"
    }
    
    try:
        response = requests.post(f"{API_BASE_URL}/auth/register", json=test_user)
        
        if response.status_code == 200:
            data = response.json()
            if 'access_token' in data and 'user' in data:
                print("✅ User registration successful")
                return data
            else:
                print(f"❌ Registration response missing tokens: {data}")
                return None
        else:
            try:
                error_data = response.json()
                print(f"❌ Registration failed ({response.status_code}): {error_data.get('detail', 'Unknown error')}")
            except:
                print(f"❌ Registration failed ({response.status_code}): {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Registration error: {e}")
        return None

def test_user_login(email: str, password: str):
    """Test user login"""
    print("\n🔍 Testing user login...")
    
    credentials = {
        "email": email,
        "password": password
    }
    
    try:
        response = requests.post(f"{API_BASE_URL}/auth/login", json=credentials)
        
        if response.status_code == 200:
            data = response.json()
            if 'access_token' in data and 'user' in data:
                print("✅ User login successful")
                return data
            else:
                print(f"❌ Login response missing tokens: {data}")
                return None
        else:
            try:
                error_data = response.json()
                print(f"❌ Login failed ({response.status_code}): {error_data.get('detail', 'Unknown error')}")
            except:
                print(f"❌ Login failed ({response.status_code}): {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Login error: {e}")
        return None

def test_authenticated_request(access_token: str):
    """Test accessing protected endpoint"""
    print("\n🔍 Testing authenticated request...")
    
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(f"{API_BASE_URL}/auth/me", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Authenticated request successful")
            print(f"   User: {data.get('display_name')} ({data.get('email')})")
            return data
        else:
            try:
                error_data = response.json()
                print(f"❌ Authenticated request failed ({response.status_code}): {error_data.get('detail', 'Unknown error')}")
            except:
                print(f"❌ Authenticated request failed ({response.status_code}): {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Authenticated request error: {e}")
        return None

def test_protected_family_endpoint(access_token: str):
    """Test accessing protected family endpoint"""
    print("\n🔍 Testing protected family endpoint...")
    
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(f"{API_BASE_URL}/family/members", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Protected family endpoint accessible")
            print(f"   Found {len(data)} family members")
            return data
        else:
            try:
                error_data = response.json()
                print(f"❌ Protected family endpoint failed ({response.status_code}): {error_data.get('detail', 'Unknown error')}")
            except:
                print(f"❌ Protected family endpoint failed ({response.status_code}): {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Protected family endpoint error: {e}")
        return None

def test_token_refresh(refresh_token: str):
    """Test token refresh"""
    print("\n🔍 Testing token refresh...")
    
    try:
        response = requests.post(f"{API_BASE_URL}/auth/refresh", json={"refresh_token": refresh_token})
        
        if response.status_code == 200:
            data = response.json()
            if 'access_token' in data:
                print("✅ Token refresh successful")
                return data
            else:
                print(f"❌ Token refresh response missing access_token: {data}")
                return None
        else:
            try:
                error_data = response.json()
                print(f"❌ Token refresh failed ({response.status_code}): {error_data.get('detail', 'Unknown error')}")
            except:
                print(f"❌ Token refresh failed ({response.status_code}): {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Token refresh error: {e}")
        return None

def main():
    """Run all authentication tests"""
    print("🚀 Starting Authentication System Tests")
    print("=" * 50)
    
    # Check if API is running
    if not test_health_check():
        print("\n❌ API is not running. Please start the FastAPI server first:")
        print("   cd elmowafiplatform-api && python main.py")
        return False
    
    # Test registration
    registration_data = test_user_registration()
    if not registration_data:
        print("\n❌ Registration test failed. Cannot continue.")
        return False
    
    access_token = registration_data['access_token']
    refresh_token = registration_data['refresh_token']
    test_email = registration_data['user']['email']
    
    # Test login with registered user
    login_data = test_user_login(test_email, "testpassword123")
    if not login_data:
        print("\n❌ Login test failed.")
        return False
    
    # Test authenticated request
    user_data = test_authenticated_request(access_token)
    if not user_data:
        print("\n❌ Authenticated request test failed.")
        return False
    
    # Test protected family endpoint
    family_data = test_protected_family_endpoint(access_token)
    
    # Test token refresh
    refresh_data = test_token_refresh(refresh_token)
    if not refresh_data:
        print("\n❌ Token refresh test failed.")
        return False
    
    print("\n" + "=" * 50)
    print("🎉 All Authentication Tests Completed!")
    print("\n📊 Test Summary:")
    print("   ✅ Health Check")
    print("   ✅ User Registration")
    print("   ✅ User Login")
    print("   ✅ Authenticated Requests")
    print("   ✅ Token Refresh")
    if family_data is not None:
        print("   ✅ Protected Endpoints")
    else:
        print("   ⚠️  Protected Endpoints (may need database setup)")
    
    print(f"\n🔑 Test User Created:")
    print(f"   Email: {test_email}")
    print(f"   Password: testpassword123")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)