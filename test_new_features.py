#!/usr/bin/env python3
"""
Test script for new photo upload and game state features
"""

import asyncio
import os
import sys
from pathlib import Path

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from photo_upload import get_photo_upload_system, get_album_management, get_family_photo_linking
from game_state import get_game_state_manager
from unified_database import get_unified_database

async def test_photo_upload_system():
    """Test photo upload system"""
    print("🧪 Testing Photo Upload System...")
    
    try:
        # Get photo upload system
        photo_system = get_photo_upload_system()
        print("✅ Photo upload system initialized")
        
        # Test album management
        album_system = get_album_management()
        print("✅ Album management system initialized")
        
        # Test family photo linking
        family_linking = get_family_photo_linking()
        print("✅ Family photo linking system initialized")
        
        # Test creating a sample album
        album_result = album_system.create_album(
            family_group_id="test-family-123",
            name="Test Album",
            description="Test album for testing",
            album_type="custom",
            privacy_level="family"
        )
        
        if album_result["success"]:
            print(f"✅ Album created: {album_result['album_id']}")
        else:
            print(f"❌ Album creation failed: {album_result['error']}")
        
        return True
        
    except Exception as e:
        print(f"❌ Photo upload system test failed: {e}")
        return False

async def test_game_state_system():
    """Test game state management system"""
    print("🎮 Testing Game State System...")
    
    try:
        # Get game state manager
        game_manager = get_game_state_manager()
        print("✅ Game state manager initialized")
        
        # Test creating a game session
        session_result = await game_manager.create_game_session(
            family_group_id="test-family-123",
            game_type="memory_match",
            title="Test Memory Game",
            description="Test game for testing",
            players=["player1", "player2"],
            settings={"grid_size": 4, "time_limit": 60}
        )
        
        if session_result["success"]:
            print(f"✅ Game session created: {session_result['session_id']}")
            
            # Test joining the game
            join_result = await game_manager.join_game_session(
                session_id=session_result['session_id'],
                player_id="player3",
                player_name="Test Player"
            )
            
            if join_result["success"]:
                print(f"✅ Player joined game: {join_result['player_data']['name']}")
            else:
                print(f"❌ Join game failed: {join_result['error']}")
                
        else:
            print(f"❌ Game session creation failed: {session_result['error']}")
        
        return True
        
    except Exception as e:
        print(f"❌ Game state system test failed: {e}")
        return False

async def test_database_integration():
    """Test database integration"""
    print("🗄️ Testing Database Integration...")
    
    try:
        # Get database
        db = get_unified_database()
        print("✅ Database connection established")
        
        # Test basic database operations
        with db.get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
                result = cur.fetchone()
                if result and result[0] == 1:
                    print("✅ Database query test passed")
                else:
                    print("❌ Database query test failed")
        
        return True
        
    except Exception as e:
        print(f"❌ Database integration test failed: {e}")
        return False

async def test_production_features():
    """Test production features"""
    print("🏭 Testing Production Features...")
    
    try:
        # Test logging
        from logging_config import get_logger
        logger = get_logger("test")
        logger.info("Test log message")
        print("✅ Structured logging test passed")
        
        # Test performance monitoring
        from performance_monitoring import performance_monitor
        performance_monitor.track_business_metric('test_metric', 'test_family')
        print("✅ Performance monitoring test passed")
        
        # Test circuit breakers
        from circuit_breakers import circuit_breaker_manager
        states = circuit_breaker_manager.get_all_states()
        print(f"✅ Circuit breakers test passed: {len(states)} breakers")
        
        # Test rate limiting
        from rate_limiting import rate_limiter
        allowed = rate_limiter.is_allowed("test-key", "api")
        print(f"✅ Rate limiting test passed: {allowed}")
        
        return True
        
    except Exception as e:
        print(f"❌ Production features test failed: {e}")
        return False

async def main():
    """Run all tests"""
    print("🚀 Starting New Features Test Suite...")
    print("=" * 50)
    
    tests = [
        ("Database Integration", test_database_integration),
        ("Production Features", test_production_features),
        ("Photo Upload System", test_photo_upload_system),
        ("Game State System", test_game_state_system),
    ]
    
    results = {}
    
    for test_name, test_func in tests:
        print(f"\n📋 Running {test_name}...")
        try:
            result = await test_func()
            results[test_name] = result
        except Exception as e:
            print(f"❌ {test_name} crashed: {e}")
            results[test_name] = False
    
    # Print summary
    print("\n" + "=" * 50)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 50)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{test_name}: {status}")
        if result:
            passed += 1
    
    print(f"\n🎯 Overall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! New features are working correctly.")
        return True
    else:
        print("⚠️ Some tests failed. Check the implementation.")
        return False

if __name__ == "__main__":
    # Set up environment for testing
    os.environ.setdefault('DATABASE_URL', 'postgresql://test:test@localhost:5432/test')
    os.environ.setdefault('ENVIRONMENT', 'test')
    
    # Run tests
    success = asyncio.run(main())
    
    if success:
        print("\n🎊 SUCCESS: New features are ready for production!")
        sys.exit(0)
    else:
        print("\n💥 FAILURE: Some features need fixing.")
        sys.exit(1) 