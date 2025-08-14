#!/usr/bin/env python3
"""
Integration Test for API Enhancements

This script tests the integration of API enhancements with the main application.
It verifies that the GraphQL, API versioning, and service mesh can be properly
integrated with the existing FastAPI application.
"""

import os
import sys
import logging
import asyncio
from typing import Dict, List, Any, Optional

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Try to import required libraries
try:
    import httpx
    HTTPX_AVAILABLE = True
except ImportError:
    HTTPX_AVAILABLE = False
    logger.warning("httpx not available, HTTP client will be limited")

try:
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    FASTAPI_AVAILABLE = True
except ImportError:
    FASTAPI_AVAILABLE = False
    logger.warning("fastapi not available, testing will be limited")

# Import API integration
try:
    from api_integration import integrate_with_main
    API_INTEGRATION_AVAILABLE = True
except ImportError:
    API_INTEGRATION_AVAILABLE = False
    logger.warning("api_integration not available, testing will be limited")

# Import main application
try:
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    import main as main_app
    MAIN_APP_AVAILABLE = True
except ImportError:
    MAIN_APP_AVAILABLE = False
    logger.warning("main application not available, testing will be limited")

# Test integration with main application
def test_integration_with_main():
    """Test integration with main application"""
    if not all([FASTAPI_AVAILABLE, API_INTEGRATION_AVAILABLE, MAIN_APP_AVAILABLE]):
        logger.error("Required libraries not available, cannot test integration")
        return False
    
    try:
        # Get the main FastAPI app
        app = main_app.app
        
        # Integrate API enhancements
        enhanced_app = integrate_with_main(app)
        
        # Create test client
        client = TestClient(enhanced_app)
        
        # Test health endpoint
        response = client.get("/api/v1/health")
        if response.status_code != 200:
            logger.error(f"Health check failed: {response.status_code} {response.text}")
            return False
        
        # Test GraphQL endpoint
        response = client.post(
            "/api/v1/graphql",
            json={"query": "{ __schema { types { name } } }"}
        )
        if response.status_code != 200:
            logger.error(f"GraphQL request failed: {response.status_code} {response.text}")
            return False
        
        # Test service mesh endpoint
        response = client.get("/api/v1/mesh/services")
        if response.status_code != 200:
            logger.error(f"Service mesh request failed: {response.status_code} {response.text}")
            return False
        
        logger.info("Integration test passed")
        return True
    except Exception as e:
        logger.error(f"Error testing integration: {str(e)}")
        return False

# Test API documentation
def test_api_docs_integration():
    """Test API documentation integration"""
    if not all([FASTAPI_AVAILABLE, API_INTEGRATION_AVAILABLE, MAIN_APP_AVAILABLE]):
        logger.error("Required libraries not available, cannot test API docs integration")
        return False
    
    try:
        # Get the main FastAPI app
        app = main_app.app
        
        # Integrate API enhancements
        enhanced_app = integrate_with_main(app)
        
        # Create test client
        client = TestClient(enhanced_app)
        
        # Test docs endpoint
        response = client.get("/api/v1/docs")
        if response.status_code != 200:
            logger.error(f"API docs request failed: {response.status_code} {response.text}")
            return False
        
        # Test OpenAPI endpoint
        response = client.get("/api/v1/openapi.json")
        if response.status_code != 200:
            logger.error(f"OpenAPI request failed: {response.status_code} {response.text}")
            return False
        
        logger.info("API docs integration test passed")
        return True
    except Exception as e:
        logger.error(f"Error testing API docs integration: {str(e)}")
        return False

# Run all tests
def run_integration_tests():
    """Run all integration tests"""
    logger.info("Starting integration tests")
    
    # Run tests
    integration_result = test_integration_with_main()
    docs_result = test_api_docs_integration()
    
    # Print results
    logger.info("Integration test results:")
    logger.info(f"Main Integration: {'PASS' if integration_result else 'FAIL'}")
    logger.info(f"API Docs Integration: {'PASS' if docs_result else 'FAIL'}")
    
    # Overall result
    overall_result = all([integration_result, docs_result])
    logger.info(f"Overall integration result: {'PASS' if overall_result else 'FAIL'}")
    
    return overall_result

# Main function
def main():
    """Main function"""
    # Run tests
    result = run_integration_tests()
    
    # Exit with appropriate code
    return 0 if result else 1

# Run main function
if __name__ == "__main__":
    exit_code = main()
    exit(exit_code)