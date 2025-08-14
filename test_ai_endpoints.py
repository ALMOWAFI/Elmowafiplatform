#!/usr/bin/env python3
"""
Test script for AI endpoints
Verifies that all AI endpoints are working correctly
"""

import requests
import json
import os
from pathlib import Path

# Configuration
BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api/v1/ai"

def test_ai_health():
    """Test AI health endpoint"""
    print("🔍 Testing AI Health Endpoint...")
    
    try:
        response = requests.get(f"{API_BASE}/health")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ AI Health: {data['data']['status']}")
            print(f"   Services: {data['data']['services']}")
            return True
        else:
            print(f"❌ AI Health failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ AI Health error: {e}")
        return False

def test_ai_suggestions():
    """Test AI suggestions endpoint"""
    print("\n🔍 Testing AI Suggestions Endpoint...")
    
    try:
        # Test memory suggestions
        response = requests.post(
            f"{API_BASE}/get-suggestions",
            data={"context": "memory", "family_member_id": "test_user"}
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ AI Suggestions: {len(data['data']['suggestions'])} suggestions")
            for suggestion in data['data']['suggestions'][:2]:
                print(f"   - {suggestion}")
            return True
        else:
            print(f"❌ AI Suggestions failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ AI Suggestions error: {e}")
        return False

def test_generate_insights():
    """Test AI insights generation"""
    print("\n🔍 Testing AI Insights Generation...")
    
    try:
        insights_request = {
            "context": {
                "type": "memory",
                "family_context": [
                    {"id": "1", "name": "John", "relationship": "father"},
                    {"id": "2", "name": "Jane", "relationship": "mother"}
                ]
            },
            "family_member_id": "1"
        }
        
        response = requests.post(
            f"{API_BASE}/generate-insights",
            json=insights_request
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ AI Insights: {data['data']['context_type']}")
            print(f"   Confidence: {data['data']['confidence']}")
            return True
        else:
            print(f"❌ AI Insights failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ AI Insights error: {e}")
        return False

def test_analyze_memory():
    """Test memory analysis endpoint"""
    print("\n🔍 Testing Memory Analysis Endpoint...")
    
    try:
        memory_request = {
            "analysis_type": "memory",
            "family_context": [
                {"id": "1", "name": "John", "relationship": "father"},
                {"id": "2", "name": "Jane", "relationship": "mother"}
            ]
        }
        
        response = requests.post(
            f"{API_BASE}/analyze-memory",
            json=memory_request
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Memory Analysis: {data['data']['memory_type']}")
            print(f"   Tags: {data['data']['suggested_tags']}")
            return True
        else:
            print(f"❌ Memory Analysis failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Memory Analysis error: {e}")
        return False

def create_test_image():
    """Create a simple test image for testing"""
    try:
        from PIL import Image, ImageDraw, ImageFont
        import numpy as np
        
        # Create a simple test image
        width, height = 400, 300
        image = Image.new('RGB', (width, height), color='lightblue')
        draw = ImageDraw.Draw(image)
        
        # Draw some simple shapes
        draw.rectangle([50, 50, 150, 150], fill='red')
        draw.ellipse([200, 100, 300, 200], fill='green')
        draw.text((100, 250), "Test Image", fill='black')
        
        # Save test image
        test_image_path = "test_image.jpg"
        image.save(test_image_path)
        
        return test_image_path
        
    except ImportError:
        print("PIL not available, skipping image tests")
        return None

def test_photo_analysis(test_image_path):
    """Test photo analysis endpoint"""
    if not test_image_path or not os.path.exists(test_image_path):
        print("\n⚠️  Skipping Photo Analysis (no test image)")
        return False
    
    print("\n🔍 Testing Photo Analysis Endpoint...")
    
    try:
        with open(test_image_path, 'rb') as f:
            files = {'file': f}
            data = {
                'analysis_type': 'general',
                'family_context': json.dumps([
                    {"id": "1", "name": "John", "relationship": "father"}
                ])
            }
            
            response = requests.post(
                f"{API_BASE}/analyze-photo",
                files=files,
                data=data
            )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Photo Analysis: {data['data']['image_properties']['width']}x{data['data']['image_properties']['height']}")
            print(f"   Faces detected: {data['data']['faces']['count']}")
            print(f"   Objects detected: {len(data['data']['objects'])}")
            return True
        else:
            print(f"❌ Photo Analysis failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Photo Analysis error: {e}")
        return False

def test_face_recognition(test_image_path):
    """Test face recognition endpoint"""
    if not test_image_path or not os.path.exists(test_image_path):
        print("\n⚠️  Skipping Face Recognition (no test image)")
        return False
    
    print("\n🔍 Testing Face Recognition Endpoint...")
    
    try:
        with open(test_image_path, 'rb') as f:
            files = {'file': f}
            data = {
                'family_members': json.dumps([
                    {"id": "1", "name": "John", "relationship": "father"}
                ])
            }
            
            response = requests.post(
                f"{API_BASE}/face-recognition",
                files=files,
                data=data
            )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Face Recognition: {data['data']['count']} faces detected")
            print(f"   Advanced recognition: {data['data']['advanced_recognition_used']}")
            return True
        else:
            print(f"❌ Face Recognition failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Face Recognition error: {e}")
        return False

def test_emotion_detection(test_image_path):
    """Test emotion detection endpoint"""
    if not test_image_path or not os.path.exists(test_image_path):
        print("\n⚠️  Skipping Emotion Detection (no test image)")
        return False
    
    print("\n🔍 Testing Emotion Detection Endpoint...")
    
    try:
        with open(test_image_path, 'rb') as f:
            files = {'file': f}
            
            response = requests.post(
                f"{API_BASE}/emotion-detection",
                files=files
            )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Emotion Detection: {data['data']['dominant_emotion']}")
            print(f"   Emotions: {data['data']['detected_emotions']}")
            return True
        else:
            print(f"❌ Emotion Detection failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Emotion Detection error: {e}")
        return False

def test_object_detection(test_image_path):
    """Test object detection endpoint"""
    if not test_image_path or not os.path.exists(test_image_path):
        print("\n⚠️  Skipping Object Detection (no test image)")
        return False
    
    print("\n🔍 Testing Object Detection Endpoint...")
    
    try:
        with open(test_image_path, 'rb') as f:
            files = {'file': f}
            
            response = requests.post(
                f"{API_BASE}/object-detection",
                files=files
            )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Object Detection: {data['data']['object_count']} objects")
            for obj in data['data']['primary_objects']:
                print(f"   - {obj['name']} ({obj['category']})")
            return True
        else:
            print(f"❌ Object Detection failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Object Detection error: {e}")
        return False

def test_text_extraction(test_image_path):
    """Test text extraction endpoint"""
    if not test_image_path or not os.path.exists(test_image_path):
        print("\n⚠️  Skipping Text Extraction (no test image)")
        return False
    
    print("\n🔍 Testing Text Extraction Endpoint...")
    
    try:
        with open(test_image_path, 'rb') as f:
            files = {'file': f}
            
            response = requests.post(
                f"{API_BASE}/text-extraction",
                files=files
            )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Text Extraction: {data['data']['text_length']} characters")
            if data['data']['extracted_text']:
                print(f"   Text: {data['data']['extracted_text']}")
            return True
        else:
            print(f"❌ Text Extraction failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Text Extraction error: {e}")
        return False

def cleanup_test_image(test_image_path):
    """Clean up test image"""
    if test_image_path and os.path.exists(test_image_path):
        try:
            os.remove(test_image_path)
            print(f"\n🧹 Cleaned up test image: {test_image_path}")
        except Exception as e:
            print(f"\n⚠️  Failed to cleanup test image: {e}")

def main():
    """Run all AI endpoint tests"""
    print("🚀 Starting AI Endpoints Testing...")
    print("=" * 50)
    
    # Test results
    results = []
    
    # Test basic endpoints
    results.append(("AI Health", test_ai_health()))
    results.append(("AI Suggestions", test_ai_suggestions()))
    results.append(("AI Insights", test_generate_insights()))
    results.append(("Memory Analysis", test_analyze_memory()))
    
    # Create test image for image-based tests
    test_image_path = create_test_image()
    
    # Test image-based endpoints
    results.append(("Photo Analysis", test_photo_analysis(test_image_path)))
    results.append(("Face Recognition", test_face_recognition(test_image_path)))
    results.append(("Emotion Detection", test_emotion_detection(test_image_path)))
    results.append(("Object Detection", test_object_detection(test_image_path)))
    results.append(("Text Extraction", test_text_extraction(test_image_path)))
    
    # Cleanup
    cleanup_test_image(test_image_path)
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 AI Endpoints Test Summary:")
    print("=" * 50)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name}")
        if result:
            passed += 1
    
    print(f"\n🎯 Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All AI endpoints are working correctly!")
    else:
        print("⚠️  Some AI endpoints need attention.")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
