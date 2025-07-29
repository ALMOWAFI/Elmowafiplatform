#!/usr/bin/env python3
"""
Test script to verify the new directory structure works correctly
"""
import os
import sys
import subprocess
import json
from pathlib import Path

def test_backend_basic_import():
    """Test that backend can import core modules without Redis"""
    print("[TESTING] Backend basic imports...")
    
    # Change to backend directory
    backend_dir = Path(__file__).parent / "backend"
    os.chdir(backend_dir)
    
    try:
        # Test basic imports without Redis
        import database
        from data_manager import DataManager
        print("[PASS] Core backend modules import successfully")
        
        # Test database initialization
        db = DataManager()
        print("[PASS] DataManager initializes successfully")
        
        return True
    except Exception as e:
        print(f"[FAIL] Backend import failed: {e}")
        return False

def test_frontend_structure():
    """Test that frontend has correct structure"""
    print("[TESTING] Frontend structure...")
    
    frontend_dir = Path(__file__).parent / "frontend"
    
    # Check if we have the nested structure
    if (frontend_dir / "elmowafy-travels-oasis").exists():
        print("[INFO] Frontend has nested structure, needs fixing")
        return False
    
    # Check for key files
    key_files = [
        "package.json",
        "vite.config.ts", 
        "src/main.tsx",
        "src/hooks/useAIAssistant.ts"
    ]
    
    for file_path in key_files:
        full_path = frontend_dir / file_path
        if not full_path.exists():
            # Check in nested location
            nested_path = frontend_dir / "elmowafy-travels-oasis" / file_path
            if nested_path.exists():
                print(f"[INFO] Found {file_path} in nested location")
                return False
            else:
                print(f"[FAIL] Missing {file_path}")
                return False
        else:
            print(f"[PASS] Found {file_path}")
    
    return True

def test_ai_services():
    """Test AI services directory"""
    print("[TESTING] AI services...")
    
    ai_dir = Path(__file__).parent / "ai-services"
    
    if not ai_dir.exists():
        print("[FAIL] AI services directory missing")
        return False
    
    # Check for essential files
    key_files = ["enhanced_app.py", "requirements.txt"]
    
    for file_path in key_files:
        full_path = ai_dir / file_path
        if not full_path.exists():
            print(f"[FAIL] Missing {file_path}")
            return False
        else:
            print(f"[PASS] Found {file_path}")
    
    return True

def test_family_tree():
    """Test family tree directory"""
    print("[TESTING] Family tree...")
    
    tree_dir = Path(__file__).parent / "family-tree"
    
    if not tree_dir.exists():
        print("[FAIL] Family tree directory missing")
        return False
    
    key_files = ["index.js", "package.json"]
    
    for file_path in key_files:
        full_path = tree_dir / file_path
        if not full_path.exists():
            print(f"[FAIL] Missing {file_path}")
            return False
        else:
            print(f"[PASS] Found {file_path}")
    
    return True

def test_budget_system():
    """Test budget system directory"""
    print("[TESTING] Budget system...")
    
    budget_dir = Path(__file__).parent / "budget-system"
    
    if not budget_dir.exists():
        print("[FAIL] Budget system directory missing")
        return False
    
    key_files = ["main.wasp"]
    
    for file_path in key_files:
        full_path = budget_dir / file_path
        if not full_path.exists():
            print(f"[FAIL] Missing {file_path}")
            return False
        else:
            print(f"[PASS] Found {file_path}")
    
    return True

def main():
    """Run all tests"""
    print("TESTING NEW DIRECTORY STRUCTURE")
    print("=" * 50)
    
    original_dir = Path.cwd()
    
    tests = [
        ("Backend Basic Import", test_backend_basic_import),
        ("Frontend Structure", test_frontend_structure),
        ("AI Services", test_ai_services),
        ("Family Tree", test_family_tree),
        ("Budget System", test_budget_system),
    ]
    
    results = {}
    
    for test_name, test_func in tests:
        print(f"\n[TEST] {test_name}")
        print("-" * 30)
        
        try:
            # Return to original directory before each test
            os.chdir(original_dir)
            result = test_func()
            results[test_name] = result
            
            if result:
                print(f"[RESULT] {test_name} PASSED")
            else:
                print(f"[RESULT] {test_name} FAILED")
                
        except Exception as e:
            print(f"[ERROR] {test_name} ERROR: {e}")
            results[test_name] = False
    
    # Summary
    print("\n" + "=" * 50)
    print("TEST SUMMARY")
    print("=" * 50)
    
    passed = sum(1 for r in results.values() if r)
    total = len(results)
    
    for test_name, result in results.items():
        status = "PASS" if result else "FAIL"
        print(f"{test_name:<20} {status}")
    
    print(f"\nResults: {passed}/{total} tests passed")
    
    if passed == total:
        print("ALL TESTS PASSED! New structure is working correctly.")
        return True
    else:
        print("Some tests failed. Directory structure needs fixes.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)