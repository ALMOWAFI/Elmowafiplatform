#!/usr/bin/env python3
"""
Test API Enhancements for Elmowafiplatform

This script tests the API enhancements implemented for the Elmowafiplatform.
It includes tests for GraphQL, API versioning, and service mesh integration.
"""

import os
import json
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
    import pytest
    PYTEST_AVAILABLE = True
except ImportError:
    PYTEST_AVAILABLE = False
    logger.warning("pytest not available, testing will be limited")

# Import API integration
try:
    from api_integration import create_app
    API_INTEGRATION_AVAILABLE = True
except ImportError:
    API_INTEGRATION_AVAILABLE = False
    logger.warning("api_integration not available, testing will be limited")

# Test GraphQL API
async def test_graphql_api():
    """Test the GraphQL API"""
    if not HTTPX_AVAILABLE:
        logger.error("httpx is required for testing")
        return False
    
    # GraphQL query
    query = """
    query {
        user(id: "test-user-id") {
            id
            email
            username
        }
    }
    """
    
    # Make request
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                "http://localhost:8000/api/v1/graphql",
                json={"query": query}
            )
            
            # Check response
            if response.status_code == 200:
                data = response.json()
                logger.info(f"GraphQL response: {json.dumps(data, indent=2)}")
                return True
            else:
                logger.error(f"GraphQL request failed: {response.status_code} {response.text}")
                return False
        except Exception as e:
            logger.error(f"Error testing GraphQL API: {str(e)}")
            return False

# Test API versioning
async def test_api_versioning():
    """Test the API versioning"""
    if not HTTPX_AVAILABLE:
        logger.error("httpx is required for testing")
        return False
    
    # Make request to health endpoint
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get("http://localhost:8000/api/v1/health")
            
            # Check response
            if response.status_code == 200:
                data = response.json()
                logger.info(f"Health check response: {json.dumps(data, indent=2)}")
                return True
            else:
                logger.error(f"Health check failed: {response.status_code} {response.text}")
                return False
        except Exception as e:
            logger.error(f"Error testing API versioning: {str(e)}")
            return False

# Test service mesh
async def test_service_mesh():
    """Test the service mesh"""
    if not HTTPX_AVAILABLE:
        logger.error("httpx is required for testing")
        return False
    
    # Make request to list services
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get("http://localhost:8000/api/v1/mesh/services")
            
            # Check response
            if response.status_code == 200:
                data = response.json()
                logger.info(f"Service mesh response: {json.dumps(data, indent=2)}")
                return True
            else:
                logger.error(f"Service mesh request failed: {response.status_code} {response.text}")
                return False
        except Exception as e:
            logger.error(f"Error testing service mesh: {str(e)}")
            return False

# Test API documentation
async def test_api_docs():
    """Test the API documentation"""
    if not HTTPX_AVAILABLE:
        logger.error("httpx is required for testing")
        return False
    
    # Make request to docs endpoint
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get("http://localhost:8000/api/v1/docs")
            
            # Check response
            if response.status_code == 200:
                logger.info("API docs available")
                return True
            else:
                logger.error(f"API docs request failed: {response.status_code} {response.text}")
                return False
        except Exception as e:
            logger.error(f"Error testing API docs: {str(e)}")
            return False

# Run all tests
async def run_tests():
    """Run all tests"""
    logger.info("Starting API enhancement tests")
    
    # Run tests
    graphql_result = await test_graphql_api()
    versioning_result = await test_api_versioning()
    service_mesh_result = await test_service_mesh()
    docs_result = await test_api_docs()
    
    # Print results
    logger.info("Test results:")
    logger.info(f"GraphQL API: {'PASS' if graphql_result else 'FAIL'}")
    logger.info(f"API Versioning: {'PASS' if versioning_result else 'FAIL'}")
    logger.info(f"Service Mesh: {'PASS' if service_mesh_result else 'FAIL'}")
    logger.info(f"API Docs: {'PASS' if docs_result else 'FAIL'}")
    
    # Overall result
    overall_result = all([graphql_result, versioning_result, service_mesh_result, docs_result])
    logger.info(f"Overall result: {'PASS' if overall_result else 'FAIL'}")
    
    return overall_result

# Run tests with pytest if available
if PYTEST_AVAILABLE:
    @pytest.mark.asyncio
    async def test_api_enhancements():
        """Pytest test for API enhancements"""
        result = await run_tests()
        assert result, "API enhancement tests failed"

# Main function
async def main():
    """Main function"""
    # Run tests
    result = await run_tests()
    
    # Exit with appropriate code
    return 0 if result else 1

# Run main function
if __name__ == "__main__":
    if not HTTPX_AVAILABLE:
        logger.error("httpx is required for testing")
        exit(1)
    
    # Run main function
    exit_code = asyncio.run(main())
    exit(exit_code)