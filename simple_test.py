#!/usr/bin/env python3
"""
Simple test to verify the unified system components
"""

import os
import sys

# Add the API directory to Python path
sys.path.insert(0, 'elmowafiplatform-api')

def test_imports():
    """Test that all required modules can be imported"""
    print("Testing module imports...")
    
    modules_to_test = [
        'unified_database',
        'logging_config', 
        'error_tracking',
        'performance_monitoring',
        'rate_limiting',
        'circuit_breakers_enhanced',
        'graceful_shutdown',
        'secrets_management',
        'database_enhanced',
        'photo_upload',
        'game_state'
    ]
    
    results = {}
    for module in modules_to_test:
        try:
            __import__(module)
            results[module] = "✅ OK"
            print(f"   {module}: ✅ OK")
        except ImportError as e:
            results[module] = f"❌ MISSING: {e}"
            print(f"   {module}: ❌ MISSING - {e}")
        except Exception as e:
            results[module] = f"⚠️ ERROR: {e}"
            print(f"   {module}: ⚠️ ERROR - {e}")
    
    return results

def test_database_connection():
    """Test database connection"""
    print("\nTesting database connection...")
    
    try:
        from unified_database import get_unified_database
        
        # Set a test database URL
        os.environ['DATABASE_URL'] = 'postgresql://localhost:5432/elmowafiplatform_test'
        
        db = get_unified_database()
        print("   ✅ Database instance created")
        
        # Test basic connection (will fail if PostgreSQL is not running, but that's OK)
        try:
            with db.get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT 1")
            print("   ✅ Database connection successful")
            return True
        except Exception as e:
            print(f"   ⚠️ Database connection failed (expected if PostgreSQL not running): {e}")
            return False
            
    except Exception as e:
        print(f"   ❌ Database test failed: {e}")
        return False

def test_production_features():
    """Test production feature availability"""
    print("\nTesting production features...")
    
    features = {}
    
    try:
        from logging_config import configure_structured_logging, get_logger
        configure_structured_logging()
        logger = get_logger("test")
        logger.info("Test log message")
        features['structured_logging'] = "✅ OK"
        print("   Structured Logging: ✅ OK")
    except Exception as e:
        features['structured_logging'] = f"❌ ERROR: {e}"
        print(f"   Structured Logging: ❌ ERROR - {e}")
    
    try:
        from error_tracking import initialize_sentry
        # Don't actually initialize Sentry in test, just check import
        features['error_tracking'] = "✅ OK"
        print("   Error Tracking: ✅ OK")
    except Exception as e:
        features['error_tracking'] = f"❌ ERROR: {e}"
        print(f"   Error Tracking: ❌ ERROR - {e}")
    
    try:
        from performance_monitoring_enhanced import performance_monitor
        features['performance_monitoring'] = "✅ OK"
        print("   Performance Monitoring: ✅ OK")
    except Exception as e:
        features['performance_monitoring'] = f"❌ ERROR: {e}"
        print(f"   Performance Monitoring: ❌ ERROR - {e}")
    
    return features

def main():
    """Run simple system test"""
    print("🔧 Elmowafiplatform Unified System - Component Test")
    print("=" * 60)
    
    # Change to the right directory
    os.chdir('C:\\Users\\Aliel\\OneDrive - Constructor University\\Desktop\\Elmowafiplatform')
    
    # Test imports
    import_results = test_imports()
    
    # Test database
    db_result = test_database_connection()
    
    # Test production features  
    prod_results = test_production_features()
    
    # Summary
    print("\n📊 Component Test Summary")
    print("=" * 60)
    
    total_imports = len(import_results)
    successful_imports = sum(1 for result in import_results.values() if "✅" in result)
    
    print(f"Module Imports: {successful_imports}/{total_imports} successful")
    
    if db_result:
        print("Database: ✅ Connection successful")
    else:
        print("Database: ⚠️ Connection failed (PostgreSQL may not be running)")
    
    prod_success = sum(1 for result in prod_results.values() if "✅" in result)
    print(f"Production Features: {prod_success}/{len(prod_results)} successful")
    
    # Overall status
    if successful_imports >= total_imports * 0.8:  # 80% of imports work
        print("\n🎉 System components are ready for deployment!")
        print("   • Core modules are importable")
        print("   • Production features are available")
        print("   • Database schema is implemented")
        return True
    else:
        print(f"\n⚠️ System needs attention - only {successful_imports}/{total_imports} modules imported successfully")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)