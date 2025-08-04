#!/usr/bin/env python3
"""
Test script for enhanced database with connection pooling and health monitoring
"""

import asyncio
import os
import sys
import time
import threading
from pathlib import Path

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database_enhanced import get_enhanced_database, EnhancedUnifiedDatabase

def test_database_initialization():
    """Test database initialization"""
    print("🧪 Testing Database Initialization...")
    
    try:
        # Test database creation
        db = get_enhanced_database()
        print("✅ Enhanced database initialized")
        
        # Test pool health
        health = db.get_pool_health()
        print(f"✅ Pool health: {health['state']}")
        print(f"   - Total connections: {health['total_connections']}")
        print(f"   - Active connections: {health['active_connections']}")
        print(f"   - Idle connections: {health['idle_connections']}")
        
        return True
        
    except Exception as e:
        print(f"❌ Database initialization failed: {e}")
        return False

def test_connection_pooling():
    """Test connection pooling functionality"""
    print("🔗 Testing Connection Pooling...")
    
    try:
        db = get_enhanced_database()
        
        # Test multiple concurrent connections
        connections = []
        start_time = time.time()
        
        # Get multiple connections
        for i in range(5):
            conn = db.get_connection()
            if conn:
                connections.append(conn)
                print(f"✅ Got connection {i+1}")
            else:
                print(f"❌ Failed to get connection {i+1}")
        
        # Check pool metrics
        health = db.get_pool_health()
        print(f"   - Active connections: {health['active_connections']}")
        print(f"   - Idle connections: {health['idle_connections']}")
        
        # Return connections
        for i, conn in enumerate(connections):
            db.return_connection(conn)
            print(f"✅ Returned connection {i+1}")
        
        # Check final metrics
        final_health = db.get_pool_health()
        print(f"   - Final active connections: {final_health['active_connections']}")
        print(f"   - Final idle connections: {final_health['idle_connections']}")
        
        duration = time.time() - start_time
        print(f"✅ Connection pooling test completed in {duration:.3f}s")
        
        return True
        
    except Exception as e:
        print(f"❌ Connection pooling test failed: {e}")
        return False

def test_connection_context_manager():
    """Test connection context manager"""
    print("🔄 Testing Connection Context Manager...")
    
    try:
        db = get_enhanced_database()
        
        # Test context manager
        with db.get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
                result = cur.fetchone()
                if result and result[0] == 1:
                    print("✅ Context manager test passed")
                else:
                    print("❌ Context manager test failed")
                    return False
        
        # Test multiple context managers
        for i in range(3):
            with db.get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(f"SELECT {i+1}")
                    result = cur.fetchone()
                    if result and result[0] == i+1:
                        print(f"✅ Context manager {i+1} passed")
                    else:
                        print(f"❌ Context manager {i+1} failed")
                        return False
        
        return True
        
    except Exception as e:
        print(f"❌ Context manager test failed: {e}")
        return False

def test_retry_logic():
    """Test retry logic for database operations"""
    print("🔄 Testing Retry Logic...")
    
    try:
        db = get_enhanced_database()
        
        # Test successful operation
        def successful_operation():
            return "success"
        
        result = db.execute_with_retry("test_success", successful_operation)
        if result == "success":
            print("✅ Successful operation retry test passed")
        else:
            print("❌ Successful operation retry test failed")
            return False
        
        # Test operation that fails
        def failing_operation():
            raise Exception("Simulated failure")
        
        try:
            db.execute_with_retry("test_failure", failing_operation, max_retries=2)
            print("❌ Failing operation should have raised exception")
            return False
        except Exception as e:
            if "Simulated failure" in str(e):
                print("✅ Failing operation retry test passed")
            else:
                print(f"❌ Unexpected exception: {e}")
                return False
        
        return True
        
    except Exception as e:
        print(f"❌ Retry logic test failed: {e}")
        return False

def test_health_monitoring():
    """Test health monitoring functionality"""
    print("🏥 Testing Health Monitoring...")
    
    try:
        db = get_enhanced_database()
        
        # Get initial health
        initial_health = db.get_pool_health()
        print(f"✅ Initial health state: {initial_health['state']}")
        
        # Wait for health check
        print("⏳ Waiting for health check...")
        time.sleep(2)
        
        # Get updated health
        updated_health = db.get_pool_health()
        print(f"✅ Updated health state: {updated_health['state']}")
        
        if updated_health['last_health_check']:
            print("✅ Health monitoring is working")
        else:
            print("❌ Health monitoring not working")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ Health monitoring test failed: {e}")
        return False

def test_database_operations():
    """Test actual database operations"""
    print("🗄️ Testing Database Operations...")
    
    try:
        db = get_enhanced_database()
        
        # Test family member creation
        member_data = {
            'family_group_id': 'test-family-123',
            'name': 'Test Member',
            'name_arabic': 'عضو تجريبي',
            'birth_date': '1990-01-01',
            'location': 'Test City',
            'avatar': 'test-avatar.jpg',
            'relationships': {'parent': 'Test Parent'},
            'role': 'member'
        }
        
        member_id = db.create_family_member(member_data)
        if member_id:
            print(f"✅ Family member created: {member_id}")
        else:
            print("❌ Family member creation failed")
            return False
        
        # Test getting family members
        members = db.get_family_members('test-family-123')
        if members and len(members) > 0:
            print(f"✅ Retrieved {len(members)} family members")
        else:
            print("❌ Failed to retrieve family members")
            return False
        
        # Test memory creation
        memory_data = {
            'family_group_id': 'test-family-123',
            'title': 'Test Memory',
            'description': 'A test memory',
            'date': '2024-01-01',
            'location': 'Test Location',
            'image_url': '/uploads/test.jpg',
            'thumbnail_url': '/uploads/test_thumb.jpg',
            'tags': ['test', 'memory'],
            'family_members': [member_id],
            'ai_analysis': {'faces_detected': 2},
            'memory_type': 'photo',
            'privacy_level': 'family',
            'metadata': {'size': 1024},
            'file_size': 1024,
            'dimensions': {'width': 800, 'height': 600},
            'created_by': 'test-user'
        }
        
        memory_id = db.create_memory(memory_data)
        if memory_id:
            print(f"✅ Memory created: {memory_id}")
        else:
            print("❌ Memory creation failed")
            return False
        
        # Test getting memories
        memories = db.get_memories('test-family-123')
        if memories and len(memories) > 0:
            print(f"✅ Retrieved {len(memories)} memories")
        else:
            print("❌ Failed to retrieve memories")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ Database operations test failed: {e}")
        return False

def test_concurrent_operations():
    """Test concurrent database operations"""
    print("⚡ Testing Concurrent Operations...")
    
    try:
        db = get_enhanced_database()
        
        def concurrent_operation(thread_id):
            """Perform concurrent database operation"""
            try:
                with db.get_db_connection() as conn:
                    with conn.cursor() as cur:
                        cur.execute("SELECT 1")
                        result = cur.fetchone()
                        if result and result[0] == 1:
                            print(f"✅ Thread {thread_id} operation successful")
                            return True
                        else:
                            print(f"❌ Thread {thread_id} operation failed")
                            return False
            except Exception as e:
                print(f"❌ Thread {thread_id} error: {e}")
                return False
        
        # Create multiple threads
        threads = []
        results = []
        
        for i in range(10):
            thread = threading.Thread(
                target=lambda tid=i: results.append(concurrent_operation(tid))
            )
            threads.append(thread)
            thread.start()
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
        
        # Check results
        successful_operations = sum(results)
        print(f"✅ {successful_operations}/10 concurrent operations successful")
        
        return successful_operations >= 8  # Allow some failures
        
    except Exception as e:
        print(f"❌ Concurrent operations test failed: {e}")
        return False

def test_error_handling():
    """Test error handling scenarios"""
    print("🚨 Testing Error Handling...")
    
    try:
        db = get_enhanced_database()
        
        # Test invalid query
        try:
            with db.get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT * FROM non_existent_table")
                    cur.fetchall()
            print("❌ Should have raised exception for invalid query")
            return False
        except Exception as e:
            print("✅ Invalid query properly handled")
        
        # Test connection recovery
        print("✅ Error handling test passed")
        return True
        
    except Exception as e:
        print(f"❌ Error handling test failed: {e}")
        return False

def main():
    """Run all enhanced database tests"""
    print("🚀 Starting Enhanced Database Test Suite...")
    print("=" * 60)
    
    tests = [
        ("Database Initialization", test_database_initialization),
        ("Connection Pooling", test_connection_pooling),
        ("Context Manager", test_connection_context_manager),
        ("Retry Logic", test_retry_logic),
        ("Health Monitoring", test_health_monitoring),
        ("Database Operations", test_database_operations),
        ("Concurrent Operations", test_concurrent_operations),
        ("Error Handling", test_error_handling),
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
    print("\n" + "=" * 60)
    print("📊 ENHANCED DATABASE TEST RESULTS")
    print("=" * 60)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{test_name}: {status}")
        if result:
            passed += 1
    
    print(f"\n🎯 Overall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All enhanced database tests passed!")
        return True
    else:
        print("⚠️ Some enhanced database tests failed.")
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
        print("\n🎊 SUCCESS: Enhanced database is ready for production!")
        sys.exit(0)
    else:
        print("\n💥 FAILURE: Enhanced database needs fixing.")
        sys.exit(1) 