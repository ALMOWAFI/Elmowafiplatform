#!/usr/bin/env python3
"""
Test the AI chat endpoint specifically
"""

import sys
import os
sys.path.append('.')

# Import the Flask app
from main_server import app
import json

def test_chat_endpoint_directly():
    """Test AI chat endpoint using Flask test client"""
    
    with app.test_client() as client:
        print("Testing AI chat endpoint...")
        
        # Test payload
        payload = {
            "message": "Hello, tell me about my family",
            "chatMode": "general",
            "language": "en",
            "familyContext": {"members": []},
            "conversationHistory": []
        }
        
        response = client.post(
            '/api/chat/family-assistant',
            data=json.dumps(payload),
            content_type='application/json'
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.get_json()
            print(f"Success! Response keys: {list(data.keys())}")
            print(f"Response: {data.get('response', 'No response')[:100]}...")
            return True
        else:
            print(f"Error Response: {response.get_data(as_text=True)}")
            return False

def list_routes():
    """List all available routes in the Flask app"""
    print("\nAvailable routes:")
    for rule in app.url_map.iter_rules():
        methods = ', '.join(rule.methods - {'OPTIONS', 'HEAD'})
        print(f"  {rule.rule} [{methods}]")

if __name__ == "__main__":
    list_routes()
    success = test_chat_endpoint_directly()
    if success:
        print("\n[OK] AI chat endpoint is working!")
    else:
        print("\n[FAIL] AI chat endpoint still has issues")