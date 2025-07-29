#!/usr/bin/env python3
"""
Test the fixed memory suggestions endpoint directly
"""

import sys
import os
sys.path.append('.')

# Import the Flask app
from main_server import app

def test_memory_suggestions_directly():
    """Test memory suggestions function directly"""
    
    with app.test_client() as client:
        print("Testing fixed memory suggestions endpoint...")
        
        # Test with default date
        response = client.get('/api/memories/suggestions')
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.get_json()
            print(f"Success! Response keys: {list(data.keys())}")
            print(f"On This Day: {len(data.get('onThisDay', []))} memories")
            print(f"Similar: {len(data.get('similar', []))} memories")
            print(f"Recommendations: {len(data.get('recommendations', []))} suggestions")
            print(f"AI Powered: {data.get('ai_powered', False)}")
            return True
        else:
            print(f"Error: {response.get_json()}")
            return False

if __name__ == "__main__":
    success = test_memory_suggestions_directly()
    if success:
        print("\n[OK] Memory suggestions endpoint is working!")
    else:
        print("\n[FAIL] Memory suggestions endpoint still has issues")