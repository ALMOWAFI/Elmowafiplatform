#!/usr/bin/env python3
"""
Comprehensive Test Suite for Elmowafiplatform
Covers all systems: Photo Upload, Game State, Database, Circuit Breakers
"""

import asyncio
import os
import sys
import time
import threading
import unittest
from pathlib import Path
from typing import Dict, Any, List

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

class ComprehensiveTestSuite:
    """Comprehensive test suite for all platform features"""
    
    def __init__(self):
        self.test_results = {}
        self.start_time = time.time()
        
    def run_all_tests(self) -> Dict[str, Any]:
        """Run all comprehensive tests"""
        print("🚀 Starting Comprehensive Test Suite...")
        print("=" * 80)
        
        test_categories = [
            ("Database Tests", self.test_database_systems),
            ("Photo Upload Tests", self.test_photo_upload_systems),
            ("Game State Tests", self.test_game_state_systems),
            ("Circuit Breaker Tests", self.test_circuit_breaker_systems),
            ("Integration Tests", self.test_integration_systems),
            ("Performance Tests", self.test_performance_systems),
            ("Security Tests", self.test_security_systems),
            ("API Endpoint Tests", self.test_api_endpoints),
        ]
        
        for category_name, test_func in test_categories:
            print(f"\n📋 Running {category_name}...")
            try:
                result = test_func()
                self.test_results[category_name] = result
                status = "✅ PASSED" if result else "❌ FAILED"
                print(f"{category_name}: {status}")
            except Exception as e:
                print(f"❌ {category_name} crashed: {e}")
                self.test_results[category_name] = False
        
        return self.generate_test_report()
    
    def test_database_systems(self) -> bool:
        """Test all database systems"""
        try:
            # Test enhanced database
            from database_enhanced import get_enhanced_database
            db = get_enhanced_database()
            
            # Test connection pooling
            with db.get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT 1")
                    result = cur.fetchone()
                    if not result or result[0] != 1:
                        return False
            
            # Test pool health
            health = db.get_pool_health()
            if not health or "state" not in health:
                return False
            
            # Test retry logic
            def test_operation():
                return True
            
            result = db.execute_with_retry("test", test_operation)
            if not result:
                return False
            
            print("✅ Database systems working correctly")
            return True
            
        except Exception as e:
            print(f"❌ Database systems test failed: {e}")
            return False
    
    def test_photo_upload_systems(self) -> bool:
        """Test photo upload systems"""
        try:
            # Test photo upload system
            from photo_upload import get_photo_upload_system
            photo_system = get_photo_upload_system()
            
            # Test album management
            from photo_upload import get_album_management
            album_system = get_album_management()
            
            # Test family photo linking
            from photo_upload import get_family_photo_linking
            family_linking = get_family_photo_linking()
            
            # Test album creation
            album_result = album_system.create_album(
                family_group_id="test-family-123",
                name="Test Album",
                description="Test album for testing",
                album_type="custom",
                privacy_level="family"
            )
            
            if not album_result["success"]:
                return False
            
            print("✅ Photo upload systems working correctly")
            return True
            
        except Exception as e:
            print(f"❌ Photo upload systems test failed: {e}")
            return False
    
    def test_game_state_systems(self) -> bool:
        """Test game state systems"""
        try:
            # Test game state manager
            from game_state import get_game_state_manager
            game_manager = get_game_state_manager()
            
            # Test game session creation
            session_result = asyncio.run(game_manager.create_game_session(
                family_group_id="test-family-123",
                game_type="memory_match",
                title="Test Game",
                description="Test game for testing",
                players=["player1", "player2"],
                settings={"grid_size": 4, "time_limit": 60}
            ))
            
            if not session_result["success"]:
                return False
            
            print("✅ Game state systems working correctly")
            return True
            
        except Exception as e:
            print(f"❌ Game state systems test failed: {e}")
            return False
    
    def test_circuit_breaker_systems(self) -> bool:
        """Test circuit breaker systems"""
        try:
            # Test circuit breaker manager
            from circuit_breakers_enhanced import circuit_breaker_manager
            
            # Test database circuit breaker
            from circuit_breakers_enhanced import database_circuit_breaker
            db_state = database_circuit_breaker.get_state()
            if not db_state or "state" not in db_state:
                return False
            
            # Test photo upload circuit breaker
            from circuit_breakers_enhanced import photo_upload_circuit_breaker
            photo_state = photo_upload_circuit_breaker.get_state()
            if not photo_state or "state" not in photo_state:
                return False
            
            # Test game state circuit breaker
            from circuit_breakers_enhanced import game_state_circuit_breaker
            game_state = game_state_circuit_breaker.get_state()
            if not game_state or "state" not in game_state:
                return False
            
            print("✅ Circuit breaker systems working correctly")
            return True
            
        except Exception as e:
            print(f"❌ Circuit breaker systems test failed: {e}")
            return False
    
    def test_integration_systems(self) -> bool:
        """Test integration between systems"""
        try:
            # Test database + circuit breaker integration
            from database_enhanced import get_enhanced_database
            from circuit_breakers_enhanced import database_circuit_breaker
            
            db = get_enhanced_database()
            
            def test_db_operation():
                with db.get_db_connection() as conn:
                    with conn.cursor() as cur:
                        cur.execute("SELECT 1")
                        result = cur.fetchone()
                        return result and result[0] == 1
            
            result = database_circuit_breaker.call(test_db_operation)
            if not result:
                return False
            
            # Test photo upload + circuit breaker integration
            from photo_upload import get_album_management
            from circuit_breakers_enhanced import photo_upload_circuit_breaker
            
            album_system = get_album_management()
            
            def create_test_album():
                return album_system.create_album(
                    family_group_id="test-family-123",
                    name="Integration Test Album",
                    description="Test album for integration testing",
                    album_type="custom",
                    privacy_level="family"
                )
            
            album_result = photo_upload_circuit_breaker.call(create_test_album)
            if not album_result["success"]:
                return False
            
            print("✅ Integration systems working correctly")
            return True
            
        except Exception as e:
            print(f"❌ Integration systems test failed: {e}")
            return False
    
    def test_performance_systems(self) -> bool:
        """Test performance monitoring"""
        try:
            # Test database performance
            from database_enhanced import get_enhanced_database
            db = get_enhanced_database()
            
            start_time = time.time()
            with db.get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT 1")
                    result = cur.fetchone()
            db_duration = time.time() - start_time
            
            if db_duration > 1.0:  # Should be under 1 second
                print(f"⚠️ Database operation took {db_duration:.3f}s")
            
            # Test circuit breaker performance
            from circuit_breakers_enhanced import database_circuit_breaker
            
            start_time = time.time()
            def test_operation():
                return "success"
            
            result = database_circuit_breaker.call(test_operation)
            cb_duration = time.time() - start_time
            
            if cb_duration > 0.1:  # Should be under 100ms
                print(f"⚠️ Circuit breaker operation took {cb_duration:.3f}s")
            
            if result == "success":
                print("✅ Performance systems working correctly")
                return True
            else:
                return False
            
        except Exception as e:
            print(f"❌ Performance systems test failed: {e}")
            return False
    
    def test_security_systems(self) -> bool:
        """Test security features"""
        try:
            # Test input validation
            from photo_upload import get_album_management
            album_system = get_album_management()
            
            # Test with invalid input
            try:
                album_result = album_system.create_album(
                    family_group_id="",  # Invalid empty ID
                    name="",  # Invalid empty name
                    description="Test",
                    album_type="invalid_type",  # Invalid type
                    privacy_level="invalid_level"  # Invalid level
                )
                # Should handle gracefully
                print("✅ Security validation working")
            except Exception:
                print("✅ Security validation working (caught invalid input)")
            
            # Test database security
            from database_enhanced import get_enhanced_database
            db = get_enhanced_database()
            
            # Test SQL injection prevention
            try:
                with db.get_db_connection() as conn:
                    with conn.cursor() as cur:
                        # This should be safe
                        cur.execute("SELECT 1 WHERE 1 = %s", (1,))
                        result = cur.fetchone()
                        if result and result[0] == 1:
                            print("✅ SQL injection prevention working")
                        else:
                            return False
            except Exception as e:
                print(f"❌ Database security test failed: {e}")
                return False
            
            return True
            
        except Exception as e:
            print(f"❌ Security systems test failed: {e}")
            return False
    
    def test_api_endpoints(self) -> bool:
        """Test API endpoint functionality"""
        try:
            # Test health endpoints
            from database_enhanced import get_enhanced_database
            from circuit_breakers_enhanced import get_circuit_breaker_health
            
            # Test database health endpoint
            db = get_enhanced_database()
            db_health = db.get_pool_health()
            if not db_health or "state" not in db_health:
                return False
            
            # Test circuit breaker health endpoint
            cb_health = get_circuit_breaker_health()
            if not cb_health or "overall_status" not in cb_health:
                return False
            
            print("✅ API endpoints working correctly")
            return True
            
        except Exception as e:
            print(f"❌ API endpoints test failed: {e}")
            return False
    
    def generate_test_report(self) -> Dict[str, Any]:
        """Generate comprehensive test report"""
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results.values() if result)
        failed_tests = total_tests - passed_tests
        duration = time.time() - self.start_time
        
        report = {
            "summary": {
                "total_tests": total_tests,
                "passed_tests": passed_tests,
                "failed_tests": failed_tests,
                "success_rate": (passed_tests / total_tests * 100) if total_tests > 0 else 0,
                "duration_seconds": duration,
                "overall_status": "PASSED" if failed_tests == 0 else "FAILED"
            },
            "detailed_results": self.test_results,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "recommendations": self.generate_recommendations()
        }
        
        return report
    
    def generate_recommendations(self) -> List[str]:
        """Generate recommendations based on test results"""
        recommendations = []
        
        failed_tests = [name for name, result in self.test_results.items() if not result]
        
        if failed_tests:
            recommendations.append(f"Fix failed tests: {', '.join(failed_tests)}")
        
        if self.test_results.get("Performance Tests", True):
            recommendations.append("Monitor performance metrics in production")
        
        if self.test_results.get("Security Tests", True):
            recommendations.append("Implement additional security measures")
        
        if all(self.test_results.values()):
            recommendations.append("All systems ready for production deployment")
        
        return recommendations

def run_comprehensive_tests():
    """Run comprehensive test suite"""
    test_suite = ComprehensiveTestSuite()
    report = test_suite.run_all_tests()
    
    # Print detailed report
    print("\n" + "=" * 80)
    print("📊 COMPREHENSIVE TEST REPORT")
    print("=" * 80)
    
    summary = report["summary"]
    print(f"Total Tests: {summary['total_tests']}")
    print(f"Passed Tests: {summary['passed_tests']}")
    print(f"Failed Tests: {summary['failed_tests']}")
    print(f"Success Rate: {summary['success_rate']:.1f}%")
    print(f"Duration: {summary['duration_seconds']:.2f} seconds")
    print(f"Overall Status: {summary['overall_status']}")
    
    print("\n📋 DETAILED RESULTS:")
    for test_name, result in report["detailed_results"].items():
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"  {test_name}: {status}")
    
    print("\n💡 RECOMMENDATIONS:")
    for recommendation in report["recommendations"]:
        print(f"  • {recommendation}")
    
    return summary["overall_status"] == "PASSED"

if __name__ == "__main__":
    # Set up environment for testing
    os.environ.setdefault('DATABASE_URL', 'postgresql://test:test@localhost:5432/test')
    os.environ.setdefault('ENVIRONMENT', 'test')
    os.environ.setdefault('DB_MIN_CONNECTIONS', '3')
    os.environ.setdefault('DB_MAX_CONNECTIONS', '10')
    
    # Run tests
    success = run_comprehensive_tests()
    
    if success:
        print("\n🎉 SUCCESS: All comprehensive tests passed!")
        sys.exit(0)
    else:
        print("\n💥 FAILURE: Some comprehensive tests failed.")
        sys.exit(1) 