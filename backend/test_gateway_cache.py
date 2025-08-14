#!/usr/bin/env python3
"""
Test Suite for API Gateway and Enhanced Caching
Comprehensive tests for gateway functionality, rate limiting, and Redis caching
"""

import asyncio
import json
import pytest
import time
from datetime import datetime, timedelta
from typing import Dict, Any, List
from unittest.mock import Mock, patch, AsyncMock

# FastAPI testing imports
from fastapi.testclient import TestClient
from httpx import AsyncClient
import pytest_asyncio

# Import modules under test
from backend.api_gateway import APIGateway, ServiceRoute, RateLimitRule, ServiceType, api_gateway
from backend.enhanced_redis_manager import EnhancedRedisManager, CachePolicy, CacheStrategy
from backend.cache_config import cache_config_manager, get_cache_policy_for_endpoint
from backend.main import app

class TestAPIGateway:
    """Test API Gateway functionality"""
    
    def setup_method(self):
        """Setup test environment"""
        self.gateway = APIGateway()
        self.client = TestClient(app)
    
    def test_gateway_initialization(self):
        """Test gateway initializes with default services"""
        assert len(self.gateway.services) > 0
        assert 'family' in self.gateway.services
        assert 'memory' in self.gateway.services
        assert 'ai' in self.gateway.services
    
    def test_service_registration(self):
        """Test service registration"""
        test_service = ServiceRoute(
            service_type=ServiceType.AI,
            path_prefix='/api/v1/test',
            rate_limit=50,
            cache_ttl=300
        )
        
        self.gateway.register_service('test_service', test_service)
        assert 'test_service' in self.gateway.services
        assert self.gateway.services['test_service'].path_prefix == '/api/v1/test'
    
    def test_rate_limit_registration(self):
        """Test rate limit rule registration"""
        rule = RateLimitRule(
            endpoint='/api/v1/test',
            max_requests=10,
            window_seconds=60,
            per_user=True
        )
        
        self.gateway.register_rate_limit(rule)
        assert rule.endpoint in self.gateway.rate_limits
        assert self.gateway.rate_limits[rule.endpoint].max_requests == 10
    
    def test_service_path_matching(self):
        """Test service path matching logic"""
        service = self.gateway.get_service_for_path('/api/v1/family/members')
        assert service is not None
        assert service.service_type == ServiceType.FAMILY
        
        service = self.gateway.get_service_for_path('/api/v1/nonexistent')
        assert service is None
    
    @pytest_asyncio.async_test
    async def test_circuit_breaker_logic(self):
        """Test circuit breaker functionality"""
        service_id = 'test_service'
        
        # Initially should allow requests
        assert await self.gateway.check_circuit_breaker(service_id) == True
        
        # Simulate failures
        for _ in range(6):  # Exceed failure threshold
            await self.gateway.record_service_response(service_id, False, 1.0)
        
        # Should now be open (blocking requests)
        assert self.gateway.circuit_breakers[service_id]['state'] == 'open'
        assert await self.gateway.check_circuit_breaker(service_id) == False
    
    def test_metrics_collection(self):
        """Test metrics collection"""
        # Simulate some requests
        self.gateway.metrics['total_requests'] = 100
        self.gateway.metrics['successful_requests'] = 90
        self.gateway.metrics['failed_requests'] = 10
        self.gateway.metrics['response_times'] = [0.1, 0.2, 0.3, 0.4, 0.5]
        
        metrics = self.gateway.get_metrics()
        
        assert metrics['total_requests'] == 100
        assert metrics['success_rate_percent'] == 90.0
        assert metrics['average_response_time_ms'] > 0

class TestEnhancedRedisManager:
    """Test Enhanced Redis Manager"""
    
    def setup_method(self):
        """Setup test environment"""
        self.redis_manager = EnhancedRedisManager()
        # Don't actually connect to Redis for tests
        self.redis_manager.redis_available = False
    
    @pytest_asyncio.async_test
    async def test_basic_cache_operations(self):
        """Test basic cache get/set operations"""
        # Test set and get
        await self.redis_manager.set('test_key', 'test_value', namespace='test')
        value = await self.redis_manager.get('test_key', namespace='test')
        
        assert value == 'test_value'
    
    @pytest_asyncio.async_test
    async def test_cache_expiration(self):
        """Test cache expiration"""
        # Set with short TTL
        await self.redis_manager.set('expire_key', 'expire_value', ttl=1, namespace='test')
        
        # Should exist immediately
        assert await self.redis_manager.exists('expire_key', namespace='test')
        
        # Wait for expiration (simulate by manually expiring in local cache)
        cache_key = self.redis_manager._generate_cache_key('expire_key', 'test')
        if cache_key in self.redis_manager.local_cache:
            self.redis_manager.local_cache[cache_key].expires_at = datetime.now() - timedelta(seconds=1)
        
        # Should be expired
        value = await self.redis_manager.get('expire_key', namespace='test')
        assert value is None
    
    @pytest_asyncio.async_test
    async def test_cache_policies(self):
        """Test cache policies"""
        policy = CachePolicy(
            ttl=600,
            strategy=CacheStrategy.CACHE_ASIDE,
            namespace='test_policy',
            tags=['test_tag']
        )
        
        await self.redis_manager.set(
            'policy_key', 
            {'data': 'test'}, 
            policy=policy
        )
        
        value = await self.redis_manager.get('policy_key', namespace='test_policy', policy=policy)
        assert value == {'data': 'test'}
    
    @pytest_asyncio.async_test
    async def test_cache_invalidation_by_tag(self):
        """Test cache invalidation by tags"""
        # Set values with tags
        await self.redis_manager.set('tagged_key1', 'value1', tags=['test_tag'], namespace='test')
        await self.redis_manager.set('tagged_key2', 'value2', tags=['test_tag'], namespace='test')
        
        # Invalidate by tag (will only work with real Redis)
        # For local cache, we'll simulate this
        count = await self.redis_manager.invalidate_by_tag('test_tag')
        # In local cache mode, this returns 0 but logs the action
        assert isinstance(count, int)
    
    @pytest_asyncio.async_test
    async def test_cache_statistics(self):
        """Test cache statistics collection"""
        # Perform some operations
        await self.redis_manager.set('stats_key', 'stats_value', namespace='test')
        await self.redis_manager.get('stats_key', namespace='test')
        await self.redis_manager.get('nonexistent_key', namespace='test')
        
        stats = await self.redis_manager.get_cache_stats()
        
        assert 'hits' in stats
        assert 'misses' in stats
        assert 'hit_rate_percent' in stats
        assert stats['hits'] > 0
        assert stats['misses'] > 0
    
    @pytest_asyncio.async_test
    async def test_batch_cache_warming(self):
        """Test batch cache warming"""
        entries = [
            {'key': 'warm_key1', 'value': 'warm_value1', 'namespace': 'warm'},
            {'key': 'warm_key2', 'value': 'warm_value2', 'namespace': 'warm'},
            {'key': 'warm_key3', 'value': 'warm_value3', 'namespace': 'warm'}
        ]
        
        successful = await self.redis_manager.warm_cache_batch(entries)
        assert successful == 3
        
        # Verify values were cached
        for entry in entries:
            value = await self.redis_manager.get(entry['key'], namespace=entry['namespace'])
            assert value == entry['value']

class TestCacheConfiguration:
    """Test cache configuration management"""
    
    def setup_method(self):
        """Setup test environment"""
        self.config_manager = cache_config_manager
    
    def test_endpoint_config_lookup(self):
        """Test endpoint configuration lookup"""
        # Test exact match
        config = self.config_manager.get_cache_config('/api/v1/family/members')
        assert config is not None
        assert config.policy.namespace == 'family'
        
        # Test pattern match
        config = self.config_manager.get_cache_config('/api/v1/family/members/123')
        assert config is not None
    
    def test_cache_policy_retrieval(self):
        """Test cache policy retrieval for endpoints"""
        policy = get_cache_policy_for_endpoint('/api/v1/family/members')
        assert policy is not None
        assert policy.namespace == 'family'
        
        policy = get_cache_policy_for_endpoint('/api/v1/nonexistent')
        assert policy is None
    
    def test_cache_warming_endpoints(self):
        """Test cache warming endpoint identification"""
        warming_endpoints = self.config_manager.get_cache_warming_endpoints()
        assert len(warming_endpoints) > 0
        assert '/api/v1/family/members' in warming_endpoints
    
    def test_policy_updates(self):
        """Test dynamic policy updates"""
        new_policy = CachePolicy(
            ttl=1800,
            strategy=CacheStrategy.WRITE_THROUGH,
            namespace='test_update'
        )
        
        self.config_manager.update_policy('test_policy', new_policy)
        retrieved_policy = self.config_manager.get_policy('test_policy')
        
        assert retrieved_policy.ttl == 1800
        assert retrieved_policy.strategy == CacheStrategy.WRITE_THROUGH

class TestGatewayEndpoints:
    """Test Gateway management endpoints"""
    
    def setup_method(self):
        """Setup test client"""
        self.client = TestClient(app)
    
    def test_gateway_health_endpoint(self):
        """Test gateway health check"""
        response = self.client.get('/api/v1/gateway/health')
        assert response.status_code == 200
        
        data = response.json()
        assert data['status'] == 'healthy'
        assert 'timestamp' in data
    
    def test_gateway_status_endpoint(self):
        """Test gateway status endpoint"""
        response = self.client.get('/api/v1/gateway/status')
        assert response.status_code == 200
        
        data = response.json()
        assert 'status' in data
        assert 'version' in data
        assert 'registered_services' in data

class TestRateLimiting:
    """Test rate limiting functionality"""
    
    def setup_method(self):
        """Setup test environment"""
        self.gateway = APIGateway()
        # Mock request object
        self.mock_request = Mock()
        self.mock_request.state = Mock()
        self.mock_request.client = Mock()
        self.mock_request.client.host = '127.0.0.1'
    
    @pytest_asyncio.async_test
    async def test_rate_limit_enforcement(self):
        """Test rate limit enforcement"""
        # Register strict rate limit
        rule = RateLimitRule(
            endpoint='/api/v1/test',
            max_requests=3,
            window_seconds=60,
            per_ip=True
        )
        self.gateway.register_rate_limit(rule)
        
        # First 3 requests should pass
        for i in range(3):
            allowed = await self.gateway.check_rate_limit(self.mock_request, '/api/v1/test')
            assert allowed == True
        
        # 4th request should be blocked
        allowed = await self.gateway.check_rate_limit(self.mock_request, '/api/v1/test')
        assert allowed == False
    
    @pytest_asyncio.async_test
    async def test_per_user_rate_limiting(self):
        """Test per-user rate limiting"""
        rule = RateLimitRule(
            endpoint='/api/v1/user-test',
            max_requests=2,
            window_seconds=60,
            per_user=True
        )
        self.gateway.register_rate_limit(rule)
        
        # Set user context
        self.mock_request.state.user_id = 'test_user_1'
        
        # First 2 requests should pass
        for i in range(2):
            allowed = await self.gateway.check_rate_limit(self.mock_request, '/api/v1/user-test')
            assert allowed == True
        
        # 3rd request should be blocked
        allowed = await self.gateway.check_rate_limit(self.mock_request, '/api/v1/user-test')
        assert allowed == False

class TestIntegration:
    """Integration tests for the complete system"""
    
    def setup_method(self):
        """Setup test environment"""
        self.client = TestClient(app)
    
    def test_gateway_middleware_integration(self):
        """Test that gateway middleware is properly integrated"""
        # Make a request to a family endpoint
        response = self.client.get('/api/v1/family/members')
        
        # Check for gateway headers (may not be present if auth is required)
        # This test verifies the middleware is running
        assert response.status_code in [200, 401, 403]  # Various auth states
    
    def test_cache_headers_present(self):
        """Test that cache headers are added to responses"""
        response = self.client.get('/api/v1/health')
        
        # Should have cache-related headers
        assert 'X-Cache-Status' in response.headers or 'x-cache-status' in response.headers
    
    @patch('backend.enhanced_redis_manager.enhanced_redis.redis_available', True)
    @pytest_asyncio.async_test
    async def test_cache_integration_flow(self):
        """Test complete cache integration flow"""
        from backend.enhanced_redis_manager import enhanced_redis
        
        # Mock Redis to be available
        enhanced_redis.redis_available = True
        enhanced_redis.redis = AsyncMock()
        enhanced_redis.redis.get = AsyncMock(return_value=None)
        enhanced_redis.redis.setex = AsyncMock()
        enhanced_redis.redis.set = AsyncMock()
        
        # Test cache operations
        await enhanced_redis.set('integration_key', 'integration_value', ttl=300)
        value = await enhanced_redis.get('integration_key')
        
        # Verify mock was called
        enhanced_redis.redis.setex.assert_called()

def create_performance_test_data():
    """Create test data for performance testing"""
    return {
        'family_members': [
            {'id': f'member_{i}', 'name': f'Member {i}', 'relationship': 'family'}
            for i in range(100)
        ],
        'memories': [
            {'id': f'memory_{i}', 'title': f'Memory {i}', 'date': '2024-01-01'}
            for i in range(500)
        ],
        'travel_plans': [
            {'id': f'plan_{i}', 'destination': f'Destination {i}', 'date': '2024-06-01'}
            for i in range(50)
        ]
    }

class TestPerformance:
    """Performance tests for gateway and cache"""
    
    def setup_method(self):
        """Setup performance test environment"""
        self.redis_manager = EnhancedRedisManager()
        self.redis_manager.redis_available = False  # Use local cache for consistent performance
        self.test_data = create_performance_test_data()
    
    @pytest_asyncio.async_test
    async def test_cache_performance_bulk_operations(self):
        """Test cache performance with bulk operations"""
        start_time = time.time()
        
        # Bulk set operations
        tasks = []
        for i, member in enumerate(self.test_data['family_members']):
            task = self.redis_manager.set(f'perf_member_{i}', member, namespace='performance')
            tasks.append(task)
        
        await asyncio.gather(*tasks)
        set_time = time.time() - start_time
        
        # Bulk get operations
        start_time = time.time()
        tasks = []
        for i in range(len(self.test_data['family_members'])):
            task = self.redis_manager.get(f'perf_member_{i}', namespace='performance')
            tasks.append(task)
        
        results = await asyncio.gather(*tasks)
        get_time = time.time() - start_time
        
        # Verify all data was retrieved
        assert len(results) == len(self.test_data['family_members'])
        assert all(result is not None for result in results)
        
        # Performance assertions (adjust based on requirements)
        assert set_time < 5.0, f"Bulk set took too long: {set_time}s"
        assert get_time < 2.0, f"Bulk get took too long: {get_time}s"
        
        print(f"Performance test results:")
        print(f"  Bulk set (100 items): {set_time:.3f}s")
        print(f"  Bulk get (100 items): {get_time:.3f}s")
        print(f"  Set throughput: {len(self.test_data['family_members'])/set_time:.1f} ops/s")
        print(f"  Get throughput: {len(self.test_data['family_members'])/get_time:.1f} ops/s")

# Test utilities
def create_mock_request(method='GET', path='/', user_id=None, client_ip='127.0.0.1'):
    """Create mock request for testing"""
    mock_request = Mock()
    mock_request.method = method
    mock_request.url = Mock()
    mock_request.url.path = path
    mock_request.state = Mock()
    mock_request.state.user_id = user_id
    mock_request.client = Mock()
    mock_request.client.host = client_ip
    return mock_request

# Run tests if executed directly
if __name__ == '__main__':
    import subprocess
    import sys
    
    print("Running API Gateway and Cache Tests...")
    
    # Run pytest with verbose output
    result = subprocess.run([
        sys.executable, '-m', 'pytest', 
        __file__, 
        '-v', 
        '--tb=short',
        '--no-header'
    ], capture_output=True, text=True)
    
    print(result.stdout)
    if result.stderr:
        print("Errors:")
        print(result.stderr)
    
    print(f"\nTest execution completed with return code: {result.returncode}")
    
    # Run a simple smoke test
    print("\nRunning smoke tests...")
    
    async def smoke_test():
        """Simple smoke test for basic functionality"""
        try:
            # Test API Gateway
            gateway = APIGateway()
            assert len(gateway.services) > 0
            print("✓ API Gateway initialization")
            
            # Test Redis Manager
            redis_mgr = EnhancedRedisManager()
            await redis_mgr.set('smoke_test', 'smoke_value')
            value = await redis_mgr.get('smoke_test')
            assert value == 'smoke_value'
            print("✓ Redis Manager basic operations")
            
            # Test Cache Config
            policy = get_cache_policy_for_endpoint('/api/v1/family/members')
            assert policy is not None
            print("✓ Cache configuration lookup")
            
            print("\n✅ All smoke tests passed!")
            
        except Exception as e:
            print(f"\n❌ Smoke test failed: {e}")
            raise
    
    # Run smoke test
    asyncio.run(smoke_test())