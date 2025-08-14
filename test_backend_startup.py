#!/usr/bin/env python3
"""
Test Backend Startup
This script tests if the backend can start without critical errors
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_imports():
    """Test if all required modules can be imported"""
    print("Testing backend imports...")
    
    try:
        print("  Importing FastAPI...")
        from fastapi import FastAPI
        print("  FastAPI imported successfully")
    except ImportError as e:
        print(f"  FastAPI import failed: {e}")
        return False
    
    try:
        print("  Importing backend modules...")
        from backend.data_manager import DataManager
        print("  DataManager imported successfully")
    except ImportError as e:
        print(f"  DataManager import failed: {e}")
        return False
    
    try:
        from backend.ai_integration import ai_integration
        print("  AI integration imported successfully")
    except ImportError as e:
        print(f"  AI integration import failed: {e}")
        return False
    
    try:
        from backend.api_v1 import router
        print("  API v1 router imported successfully")
    except ImportError as e:
        print(f"  API v1 router import failed: {e}")
        return False
    
    return True

def test_data_manager():
    """Test DataManager initialization"""
    print("\nTesting DataManager initialization...")
    
    try:
        from backend.data_manager import DataManager
        dm = DataManager()
        print("  DataManager initialized successfully")
        return True
    except Exception as e:
        print(f"  DataManager initialization failed: {e}")
        return False

def test_app_creation():
    """Test FastAPI app creation"""
    print("\nTesting FastAPI app creation...")
    
    try:
        from fastapi import FastAPI
        from backend.api_v1 import router
        
        app = FastAPI(title="Test App")
        app.include_router(router, prefix="/api/v1")
        
        print("  FastAPI app created successfully")
        print(f"  App has {len(app.routes)} routes")
        return True
    except Exception as e:
        print(f"  FastAPI app creation failed: {e}")
        return False

def create_required_directories():
    """Create required directories"""
    print("\nCreating required directories...")
    
    directories = [
        "data",
        "data/uploads", 
        "data/memories",
        "data/analysis",
        "logs"
    ]
    
    for dir_path in directories:
        os.makedirs(dir_path, exist_ok=True)
        print(f"  Created/verified directory: {dir_path}")
    
    return True

def main():
    """Main test function"""
    print("Backend Startup Test")
    print("=" * 40)
    
    tests = [
        ("Import Test", test_imports),
        ("Directory Setup", create_required_directories),
        ("DataManager Test", test_data_manager),
        ("App Creation Test", test_app_creation),
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            if result:
                passed += 1
                print(f"[PASS] {test_name} passed")
            else:
                print(f"[FAIL] {test_name} failed")
        except Exception as e:
            print(f"[CRASH] {test_name} crashed: {e}")
        print("-" * 20)
    
    print("=" * 40)
    print(f"Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("Backend is ready to start!")
        print("\nTo start the backend server, run:")
        print("  python backend/main.py")
        return True
    else:
        print("Backend has issues. Fix them before starting.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)