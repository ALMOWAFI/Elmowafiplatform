#!/usr/bin/env python3
"""
Test Flask endpoints directly to isolate issues
"""

import requests
import json

def test_memory_suggestions():
    """Test memory suggestions endpoint with detailed error reporting"""
    
    url = "http://localhost:8000/api/memories/suggestions"
    
    try:
        print("Testing memory suggestions endpoint...")
        response = requests.get(url, timeout=10)
        
        print(f"Status Code: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
        else:
            print(f"Error Response: {response.text}")
            
            # Try to get more detailed error information
            if response.headers.get('content-type', '').startswith('text/html'):
                print("HTML error page returned - checking for Flask debug info")
                if "Traceback" in response.text:
                    lines = response.text.split('\n')
                    for i, line in enumerate(lines):
                        if "Traceback" in line:
                            # Print the next 20 lines for traceback
                            traceback_lines = lines[i:i+20]
                            print("Flask Traceback:")
                            print('\n'.join(traceback_lines))
                            break
    
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")

def test_chat_endpoint():
    """Test AI chat endpoint"""
    
    url = "http://localhost:8000/api/chat/family-assistant"
    
    payload = {
        "message": "Hello test",
        "chatMode": "general",
        "language": "en",
        "familyContext": {"members": []},
        "conversationHistory": []
    }
    
    try:
        print("\nTesting AI chat endpoint...")
        response = requests.post(
            url, 
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
        else:
            print(f"Error Response: {response.text}")
    
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    test_memory_suggestions()
    test_chat_endpoint()