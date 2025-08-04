#!/usr/bin/env python3
"""
Test script for enhanced circuit breakers with failure scenarios and recovery
"""

import asyncio
import os
import sys
import time
import threading
from pathlib import Path

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from circuit_breakers_enhanced import (
    EnhancedCircuitBreaker,
    EnhancedCircuitBreakerManager,
    circuit_breaker_manager,
    database_circuit_breaker,
    photo_upload_circuit_breaker,
    game_state_circuit_breaker,
    ai_service_circuit_breaker,
    CircuitState
)

def test_circuit_breaker_creation():
    """Test circuit breaker creation"""
    print("🏗️ Testing Circuit Breaker Creation...")
    
    try:
        # Test basic circuit breaker
        breaker = EnhancedCircuitBreaker(
            name="test_breaker",
            failure_threshold=3,
            recovery_timeout=10
        )
        
        print(f"✅ Circuit breaker created: {breaker.name}")
        print(f"   - State: {breaker.state.value}")
        print(f"   - Failure threshold: {breaker.failure_threshold}")
        print(f"   - Recovery timeout: {breaker.recovery_timeout}")
        
        return True
        
    except Exception as e:
        print(f"❌ Circuit breaker creation failed: {e}")
        return False

def test_circuit_breaker_manager():
    """Test circuit breaker manager"""
    print("👨‍💼 Testing Circuit Breaker Manager...")
    
    try:
        # Test manager creation
        manager = EnhancedCircuitBreakerManager()
        print("✅ Circuit breaker manager created")
        
        # Test creating circuit breakers
        breaker1 = manager.create_circuit_breaker("test1", failure_threshold=2)
        breaker2 = manager.create_circuit_breaker("test2", failure_threshold=3)
        
        print(f"✅ Created {len(manager.circuit_breakers)} circuit breakers")
        
        # Test getting circuit breakers
        retrieved = manager.get_circuit_breaker("test1")
        if retrieved and retrieved.name == "test1":
            print("✅ Circuit breaker retrieval works")
        else:
            print("❌ Circuit breaker retrieval failed")
            return False
        
        # Test getting all states
        states = manager.get_all_states()
        if len(states) == 2:
            print("✅ Getting all states works")
        else:
            print("❌ Getting all states failed")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ Circuit breaker manager test failed: {e}")
        return False

def test_circuit_breaker_success_scenario():
    """Test circuit breaker with successful operations"""
    print("✅ Testing Success Scenario...")
    
    try:
        breaker = EnhancedCircuitBreaker("success_test", failure_threshold=3)
        
        def successful_operation():
            return "success"
        
        # Test successful calls
        for i in range(5):
            result = breaker.call(successful_operation)
            if result == "success":
                print(f"✅ Success call {i+1} passed")
            else:
                print(f"❌ Success call {i+1} failed")
                return False
        
        # Check state
        if breaker.state == CircuitState.CLOSED:
            print("✅ Circuit breaker remained CLOSED")
        else:
            print(f"❌ Circuit breaker state incorrect: {breaker.state.value}")
            return False
        
        # Check metrics
        metrics = breaker.get_state()["metrics"]
        if metrics["successful_requests"] == 5 and metrics["failed_requests"] == 0:
            print("✅ Metrics correctly updated")
        else:
            print("❌ Metrics not correctly updated")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ Success scenario test failed: {e}")
        return False

def test_circuit_breaker_failure_scenario():
    """Test circuit breaker with failure scenarios"""
    print("❌ Testing Failure Scenario...")
    
    try:
        breaker = EnhancedCircuitBreaker("failure_test", failure_threshold=3, recovery_timeout=5)
        
        def failing_operation():
            raise Exception("Simulated failure")
        
        # Test failing calls until circuit opens
        failures = 0
        for i in range(5):
            try:
                breaker.call(failing_operation)
                print(f"❌ Failure call {i+1} should have failed")
                return False
            except Exception as e:
                failures += 1
                print(f"✅ Failure call {i+1} correctly failed")
                
                # Check if circuit opened
                if i >= 2:  # After 3 failures (threshold)
                    if breaker.state == CircuitState.OPEN:
                        print("✅ Circuit breaker correctly opened")
                        break
        
        # Check state
        if breaker.state == CircuitState.OPEN:
            print("✅ Circuit breaker is OPEN")
        else:
            print(f"❌ Circuit breaker state incorrect: {breaker.state.value}")
            return False
        
        # Check metrics
        metrics = breaker.get_state()["metrics"]
        if metrics["failed_requests"] >= 3:
            print("✅ Failure metrics correctly updated")
        else:
            print("❌ Failure metrics not correctly updated")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ Failure scenario test failed: {e}")
        return False

def test_circuit_breaker_recovery():
    """Test circuit breaker recovery"""
    print("🔄 Testing Recovery Scenario...")
    
    try:
        breaker = EnhancedCircuitBreaker("recovery_test", failure_threshold=2, recovery_timeout=2)
        
        def failing_operation():
            raise Exception("Simulated failure")
        
        def successful_operation():
            return "success"
        
        # First, open the circuit
        for i in range(3):
            try:
                breaker.call(failing_operation)
            except:
                pass
        
        if breaker.state != CircuitState.OPEN:
            print("❌ Circuit breaker should be OPEN")
            return False
        
        print("✅ Circuit breaker opened")
        
        # Wait for recovery timeout
        print("⏳ Waiting for recovery timeout...")
        time.sleep(3)
        
        # Test half-open state
        if breaker.state == CircuitState.HALF_OPEN:
            print("✅ Circuit breaker transitioned to HALF_OPEN")
        else:
            print(f"❌ Circuit breaker state incorrect: {breaker.state.value}")
            return False
        
        # Test successful recovery
        result = breaker.call(successful_operation)
        if result == "success":
            print("✅ Recovery call successful")
        else:
            print("❌ Recovery call failed")
            return False
        
        # Check if circuit closed
        if breaker.state == CircuitState.CLOSED:
            print("✅ Circuit breaker recovered to CLOSED")
        else:
            print(f"❌ Circuit breaker state incorrect: {breaker.state.value}")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ Recovery test failed: {e}")
        return False

def test_circuit_breaker_fallback():
    """Test circuit breaker fallback functionality"""
    print("🛡️ Testing Fallback Functionality...")
    
    try:
        def fallback_func(*args, **kwargs):
            return {"fallback": True, "message": "Service unavailable"}
        
        breaker = EnhancedCircuitBreaker(
            "fallback_test",
            failure_threshold=2,
            recovery_timeout=10,
            fallback_func=fallback_func
        )
        
        def failing_operation():
            raise Exception("Simulated failure")
        
        # Open the circuit
        for i in range(3):
            try:
                breaker.call(failing_operation)
            except:
                pass
        
        # Test fallback when circuit is open
        result = breaker.call(failing_operation)
        if isinstance(result, dict) and result.get("fallback"):
            print("✅ Fallback function called correctly")
        else:
            print("❌ Fallback function not called")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ Fallback test failed: {e}")
        return False

def test_async_circuit_breaker():
    """Test async circuit breaker"""
    print("⚡ Testing Async Circuit Breaker...")
    
    try:
        breaker = EnhancedCircuitBreaker("async_test", failure_threshold=2)
        
        async def async_successful_operation():
            await asyncio.sleep(0.1)
            return "async_success"
        
        async def async_failing_operation():
            await asyncio.sleep(0.1)
            raise Exception("Async failure")
        
        # Test successful async operation
        result = asyncio.run(breaker.call_async(async_successful_operation))
        if result == "async_success":
            print("✅ Async success operation passed")
        else:
            print("❌ Async success operation failed")
            return False
        
        # Test failing async operation
        try:
            asyncio.run(breaker.call_async(async_failing_operation))
            print("❌ Async failure should have raised exception")
            return False
        except Exception as e:
            if "Async failure" in str(e):
                print("✅ Async failure operation correctly failed")
            else:
                print(f"❌ Unexpected async exception: {e}")
                return False
        
        return True
        
    except Exception as e:
        print(f"❌ Async circuit breaker test failed: {e}")
        return False

def test_specialized_circuit_breakers():
    """Test specialized circuit breakers"""
    print("🎯 Testing Specialized Circuit Breakers...")
    
    try:
        # Test database circuit breaker
        db_state = database_circuit_breaker.get_state()
        if db_state["name"] == "database":
            print("✅ Database circuit breaker initialized")
        else:
            print("❌ Database circuit breaker not initialized")
            return False
        
        # Test photo upload circuit breaker
        photo_state = photo_upload_circuit_breaker.get_state()
        if photo_state["name"] == "photo_upload":
            print("✅ Photo upload circuit breaker initialized")
        else:
            print("❌ Photo upload circuit breaker not initialized")
            return False
        
        # Test game state circuit breaker
        game_state = game_state_circuit_breaker.get_state()
        if game_state["name"] == "game_state":
            print("✅ Game state circuit breaker initialized")
        else:
            print("❌ Game state circuit breaker not initialized")
            return False
        
        # Test AI service circuit breaker
        ai_state = ai_service_circuit_breaker.get_state()
        if ai_state["name"] == "ai_service":
            print("✅ AI service circuit breaker initialized")
        else:
            print("❌ AI service circuit breaker not initialized")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ Specialized circuit breakers test failed: {e}")
        return False

def test_concurrent_circuit_breakers():
    """Test concurrent circuit breaker operations"""
    print("⚡ Testing Concurrent Circuit Breakers...")
    
    try:
        breaker = EnhancedCircuitBreaker("concurrent_test", failure_threshold=5)
        
        def concurrent_operation(thread_id):
            """Perform concurrent operation"""
            try:
                result = breaker.call(lambda: f"success_{thread_id}")
                return result == f"success_{thread_id}"
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
        print(f"❌ Concurrent circuit breakers test failed: {e}")
        return False

def test_circuit_breaker_metrics():
    """Test circuit breaker metrics and monitoring"""
    print("📊 Testing Circuit Breaker Metrics...")
    
    try:
        breaker = EnhancedCircuitBreaker("metrics_test", failure_threshold=3)
        
        # Add metrics callback
        metrics_received = []
        def metrics_callback(name, metrics):
            metrics_received.append({
                "name": name,
                "total_requests": metrics.total_requests,
                "successful_requests": metrics.successful_requests,
                "failed_requests": metrics.failed_requests
            })
        
        breaker.add_metrics_callback(metrics_callback)
        
        # Perform operations
        def successful_operation():
            return "success"
        
        def failing_operation():
            raise Exception("Failure")
        
        # Mix of success and failure
        for i in range(5):
            if i % 2 == 0:
                breaker.call(successful_operation)
            else:
                try:
                    breaker.call(failing_operation)
                except:
                    pass
        
        # Check metrics
        state = breaker.get_state()
        metrics = state["metrics"]
        
        if metrics["total_requests"] == 5:
            print("✅ Total requests metric correct")
        else:
            print("❌ Total requests metric incorrect")
            return False
        
        if metrics["successful_requests"] == 3:  # 0, 2, 4
            print("✅ Successful requests metric correct")
        else:
            print("❌ Successful requests metric incorrect")
            return False
        
        if metrics["failed_requests"] == 2:  # 1, 3
            print("✅ Failed requests metric correct")
        else:
            print("❌ Failed requests metric incorrect")
            return False
        
        if len(metrics_received) > 0:
            print("✅ Metrics callbacks working")
        else:
            print("❌ Metrics callbacks not working")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ Circuit breaker metrics test failed: {e}")
        return False

def main():
    """Run all enhanced circuit breaker tests"""
    print("🚀 Starting Enhanced Circuit Breaker Test Suite...")
    print("=" * 70)
    
    tests = [
        ("Circuit Breaker Creation", test_circuit_breaker_creation),
        ("Circuit Breaker Manager", test_circuit_breaker_manager),
        ("Success Scenario", test_circuit_breaker_success_scenario),
        ("Failure Scenario", test_circuit_breaker_failure_scenario),
        ("Recovery Scenario", test_circuit_breaker_recovery),
        ("Fallback Functionality", test_circuit_breaker_fallback),
        ("Async Circuit Breaker", test_async_circuit_breaker),
        ("Specialized Circuit Breakers", test_specialized_circuit_breakers),
        ("Concurrent Operations", test_concurrent_circuit_breakers),
        ("Metrics and Monitoring", test_circuit_breaker_metrics),
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
    print("📊 ENHANCED CIRCUIT BREAKER TEST RESULTS")
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
        print("🎉 All enhanced circuit breaker tests passed!")
        return True
    else:
        print("⚠️ Some enhanced circuit breaker tests failed.")
        return False

if __name__ == "__main__":
    # Set up environment for testing
    os.environ.setdefault('ENVIRONMENT', 'test')
    
    # Run tests
    success = main()
    
    if success:
        print("\n🎊 SUCCESS: Enhanced circuit breakers are ready for production!")
        sys.exit(0)
    else:
        print("\n💥 FAILURE: Enhanced circuit breakers need fixing.")
        sys.exit(1) 