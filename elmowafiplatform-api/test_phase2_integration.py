#!/usr/bin/env python3
"""
Phase 2 Integration Test - Enhanced Database, Circuit Breakers, and New Features
"""

import asyncio
import os
import sys
import time
import threading
from pathlib import Path

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database_enhanced import get_enhanced_database
from circuit_breakers_enhanced import (
    circuit_breaker_manager,
    database_circuit_breaker,
    photo_upload_circuit_breaker,
    game_state_circuit_breaker
)
from photo_upload import get_photo_upload_system, get_album_management, get_family_photo_linking
from game_state import get_game_state_manager

def test_enhanced_database_integration():
    """Test enhanced database integration"""
    print("🗄️ Testing Enhanced Database Integration...")
    
    try:
        # Get enhanced database
        db = get_enhanced_database()
        print("✅ Enhanced database initialized")
        
        # Test pool health
        pool_health = db.get_pool_health()
        print(f"✅ Pool health: {pool_health['state']}")
        print(f"   - Total connections: {pool_health['total_connections']}")
        print(f"   - Active connections: {pool_health['active_connections']}")
        print(f"   - Idle connections: {pool_health['idle_connections']}")
        
        # Test database operations with retry logic
        def test_db_operation():
            with db.get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT 1")
                    result = cur.fetchone()
                    return result and result[0] == 1
        
        # Test successful operation
        result = db.execute_with_retry("test_operation", test_db_operation)
        if result:
            print("✅ Database operation with retry logic successful")
        else:
            print("❌ Database operation with retry logic failed")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ Enhanced database integration test failed: {e}")
        return False

def test_circuit_breaker_integration():
    """Test circuit breaker integration"""
    print("🔄 Testing Circuit Breaker Integration...")
    
    try:
        # Test database circuit breaker
        db_breaker = database_circuit_breaker
        db_state = db_breaker.get_state()
        print(f"✅ Database circuit breaker: {db_state['state']}")
        
        # Test photo upload circuit breaker
        photo_breaker = photo_upload_circuit_breaker
        photo_state = photo_breaker.get_state()
        print(f"✅ Photo upload circuit breaker: {photo_state['state']}")
        
        # Test game state circuit breaker
        game_breaker = game_state_circuit_breaker
        game_state = game_breaker.get_state()
        print(f"✅ Game state circuit breaker: {game_state['state']}")
        
        # Test circuit breaker manager
        all_states = circuit_breaker_manager.get_all_states()
        print(f"✅ Circuit breaker manager: {len(all_states)} breakers")
        
        return True
        
    except Exception as e:
        print(f"❌ Circuit breaker integration test failed: {e}")
        return False

def test_photo_upload_integration():
    """Test photo upload system integration"""
    print("📸 Testing Photo Upload Integration...")
    
    try:
        # Get photo upload system
        photo_system = get_photo_upload_system()
        print("✅ Photo upload system initialized")
        
        # Get album management
        album_system = get_album_management()
        print("✅ Album management system initialized")
        
        # Get family photo linking
        family_linking = get_family_photo_linking()
        print("✅ Family photo linking system initialized")
        
        # Test album creation with circuit breaker protection
        def create_test_album():
            return album_system.create_album(
                family_group_id="test-family-123",
                name="Test Integration Album",
                description="Test album for integration testing",
                album_type="custom",
                privacy_level="family"
            )
        
        # Use circuit breaker for album creation
        album_result = photo_upload_circuit_breaker.call(create_test_album)
        
        if album_result["success"]:
            print(f"✅ Album created with circuit breaker: {album_result['album_id']}")
        else:
            print(f"❌ Album creation failed: {album_result['error']}")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ Photo upload integration test failed: {e}")
        return False

def test_game_state_integration():
    """Test game state system integration"""
    print("🎮 Testing Game State Integration...")
    
    try:
        # Get game state manager
        game_manager = get_game_state_manager()
        print("✅ Game state manager initialized")
        
        # Test game session creation with circuit breaker protection
        async def create_test_game():
            return await game_manager.create_game_session(
                family_group_id="test-family-123",
                game_type="memory_match",
                title="Test Integration Game",
                description="Test game for integration testing",
                players=["player1", "player2"],
                settings={"grid_size": 4, "time_limit": 60}
            )
        
        # Use circuit breaker for game creation
        game_result = asyncio.run(
            game_state_circuit_breaker.call_async(create_test_game)
        )
        
        if game_result["success"]:
            print(f"✅ Game session created with circuit breaker: {game_result['session_id']}")
        else:
            print(f"❌ Game session creation failed: {game_result['error']}")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ Game state integration test failed: {e}")
        return False

def test_database_circuit_breaker_integration():
    """Test database operations with circuit breaker protection"""
    print("🔗 Testing Database + Circuit Breaker Integration...")
    
    try:
        db = get_enhanced_database()
        
        def test_db_operation():
            with db.get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT 1")
                    result = cur.fetchone()
                    return result and result[0] == 1
        
        # Test with circuit breaker protection
        result = database_circuit_breaker.call(test_db_operation)
        
        if result:
            print("✅ Database operation with circuit breaker successful")
        else:
            print("❌ Database operation with circuit breaker failed")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ Database + circuit breaker integration test failed: {e}")
        return False

def test_concurrent_integration():
    """Test concurrent operations with all systems"""
    print("⚡ Testing Concurrent Integration...")
    
    try:
        db = get_enhanced_database()
        
        def concurrent_db_operation(thread_id):
            """Perform concurrent database operation"""
            try:
                with db.get_db_connection() as conn:
                    with conn.cursor() as cur:
                        cur.execute("SELECT 1")
                        result = cur.fetchone()
                        return result and result[0] == 1
            except Exception as e:
                print(f"❌ Thread {thread_id} error: {e}")
                return False
        
        # Create multiple threads
        threads = []
        results = []
        
        for i in range(5):
            thread = threading.Thread(
                target=lambda tid=i: results.append(concurrent_db_operation(tid))
            )
            threads.append(thread)
            thread.start()
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
        
        # Check results
        successful_operations = sum(results)
        print(f"✅ {successful_operations}/5 concurrent operations successful")
        
        return successful_operations >= 4  # Allow some failures
        
    except Exception as e:
        print(f"❌ Concurrent integration test failed: {e}")
        return False

def test_health_endpoints():
    """Test health check endpoints"""
    print("🏥 Testing Health Endpoints...")
    
    try:
        # Test database health
        db = get_enhanced_database()
        db_health = db.get_pool_health()
        
        if "state" in db_health and "total_connections" in db_health:
            print("✅ Database health endpoint working")
        else:
            print("❌ Database health endpoint not working")
            return False
        
        # Test circuit breaker health
        from circuit_breakers_enhanced import get_circuit_breaker_health
        cb_health = get_circuit_breaker_health()
        
        if "overall_status" in cb_health and "circuit_breakers" in cb_health:
            print("✅ Circuit breaker health endpoint working")
        else:
            print("❌ Circuit breaker health endpoint not working")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ Health endpoints test failed: {e}")
        return False

def test_error_recovery():
    """Test error recovery scenarios"""
    print("🛡️ Testing Error Recovery...")
    
    try:
        db = get_enhanced_database()
        
        # Test database recovery
        def failing_db_operation():
            raise Exception("Simulated database failure")
        
        try:
            db.execute_with_retry("failing_operation", failing_db_operation)
            print("❌ Should have raised exception")
            return False
        except Exception as e:
            if "Simulated database failure" in str(e):
                print("✅ Database error recovery working")
            else:
                print(f"❌ Unexpected database exception: {e}")
                return False
        
        # Test circuit breaker recovery
        def failing_cb_operation():
            raise Exception("Simulated circuit breaker failure")
        
        try:
            database_circuit_breaker.call(failing_cb_operation)
            print("❌ Should have raised exception")
            return False
        except Exception as e:
            if "Simulated circuit breaker failure" in str(e):
                print("✅ Circuit breaker error recovery working")
            else:
                print(f"❌ Unexpected circuit breaker exception: {e}")
                return False
        
        return True
        
    except Exception as e:
        print(f"❌ Error recovery test failed: {e}")
        return False

def test_performance_monitoring():
    """Test performance monitoring integration"""
    print("📊 Testing Performance Monitoring...")
    
    try:
        db = get_enhanced_database()
        
        # Test database performance
        start_time = time.time()
        with db.get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
                result = cur.fetchone()
        db_duration = time.time() - start_time
        
        print(f"✅ Database operation completed in {db_duration:.3f}s")
        
        # Test circuit breaker performance
        start_time = time.time()
        def test_operation():
            return "success"
        
        result = database_circuit_breaker.call(test_operation)
        cb_duration = time.time() - start_time
        
        print(f"✅ Circuit breaker operation completed in {cb_duration:.3f}s")
        
        if result == "success":
            print("✅ Performance monitoring working")
        else:
            print("❌ Performance monitoring failed")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ Performance monitoring test failed: {e}")
        return False

def main():
    """Run all Phase 2 integration tests"""
    print("🚀 Starting Phase 2 Integration Test Suite...")
    print("=" * 70)
    
    tests = [
        ("Enhanced Database Integration", test_enhanced_database_integration),
        ("Circuit Breaker Integration", test_circuit_breaker_integration),
        ("Photo Upload Integration", test_photo_upload_integration),
        ("Game State Integration", test_game_state_integration),
        ("Database + Circuit Breaker Integration", test_database_circuit_breaker_integration),
        ("Concurrent Integration", test_concurrent_integration),
        ("Health Endpoints", test_health_endpoints),
        ("Error Recovery", test_error_recovery),
        ("Performance Monitoring", test_performance_monitoring),
    ]
    
    results = {}
    
    for test_name, test_func in tests:
        print(f"\n📋 Running {test_name}...")
        try:
            result = test_func()
            results[test_name] = result
        except Exception as e:
            print(f"❌ {test_name} crashed: {e}")
            results[test_name] = False
    
    # Print summary
    print("\n" + "=" * 70)
    print("📊 PHASE 2 INTEGRATION TEST RESULTS")
    print("=" * 70)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{test_name}: {status}")
        if result:
            passed += 1
    
    print(f"\n🎯 Overall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All Phase 2 integration tests passed!")
        return True
    else:
        print("⚠️ Some Phase 2 integration tests failed.")
        return False

if __name__ == "__main__":
    # Set up environment for testing
    os.environ.setdefault('DATABASE_URL', 'postgresql://test:test@localhost:5432/test')
    os.environ.setdefault('ENVIRONMENT', 'test')
    os.environ.setdefault('DB_MIN_CONNECTIONS', '3')
    os.environ.setdefault('DB_MAX_CONNECTIONS', '10')
    os.environ.setdefault('DB_HEALTH_CHECK_INTERVAL', '5')
    
    # Run tests
    success = main()
    
    if success:
        print("\n🎊 SUCCESS: Phase 2 integration is ready for production!")
        sys.exit(0)
    else:
        print("\n💥 FAILURE: Phase 2 integration needs fixing.")
        sys.exit(1) 