#!/usr/bin/env python3
"""
Cache Configuration for Elmowafiplatform
Comprehensive caching policies and strategies
"""

import logging
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from enum import Enum

from backend.enhanced_redis_manager import CachePolicy, CacheStrategy, SerializationFormat

logger = logging.getLogger(__name__)

class CacheLevel(Enum):
    """Cache levels for different data types"""
    L1_MEMORY = "l1_memory"       # Local in-memory cache
    L2_REDIS = "l2_redis"         # Redis cache
    L3_PERSISTENT = "l3_persistent"  # Persistent storage cache

@dataclass
class EndpointCacheConfig:
    """Cache configuration for specific endpoints"""
    endpoint_pattern: str
    policy: CachePolicy
    enabled: bool = True
    bypass_conditions: List[str] = field(default_factory=list)
    warm_on_startup: bool = False

class CacheConfigManager:
    """Manages cache configurations for different endpoints and data types"""
    
    def __init__(self):
        self.endpoint_configs: Dict[str, EndpointCacheConfig] = {}
        self.default_policies: Dict[str, CachePolicy] = {}
        self._initialize_default_configs()
    
    def _initialize_default_configs(self):
        """Initialize default cache configurations"""
        
        # Default policies for different data types
        self.default_policies = {
            'family_data': CachePolicy(
                ttl=1800,  # 30 minutes
                strategy=CacheStrategy.CACHE_ASIDE,
                namespace='family',
                tags=['family_members'],
                serialization=SerializationFormat.JSON
            ),
            'memory_data': CachePolicy(
                ttl=900,  # 15 minutes
                strategy=CacheStrategy.WRITE_THROUGH,
                namespace='memories',
                tags=['memories', 'photos'],
                serialization=SerializationFormat.JSON
            ),
            'travel_data': CachePolicy(
                ttl=1200,  # 20 minutes
                strategy=CacheStrategy.CACHE_ASIDE,
                namespace='travel',
                tags=['travel_plans', 'recommendations'],
                serialization=SerializationFormat.JSON
            ),
            'ai_results': CachePolicy(
                ttl=3600,  # 1 hour
                strategy=CacheStrategy.CACHE_ASIDE,
                namespace='ai_cache',
                tags=['ai_analysis'],
                serialization=SerializationFormat.PICKLE  # For complex AI objects
            ),
            'game_state': CachePolicy(
                ttl=300,  # 5 minutes
                strategy=CacheStrategy.WRITE_THROUGH,
                namespace='gaming',
                tags=['game_sessions'],
                serialization=SerializationFormat.JSON
            ),
            'budget_data': CachePolicy(
                ttl=600,  # 10 minutes
                strategy=CacheStrategy.WRITE_THROUGH,
                namespace='budget',
                tags=['budgets', 'transactions'],
                serialization=SerializationFormat.JSON
            ),
            'user_sessions': CachePolicy(
                ttl=7200,  # 2 hours
                strategy=CacheStrategy.CACHE_ASIDE,
                namespace='sessions',
                tags=['user_auth'],
                serialization=SerializationFormat.JSON
            ),
            'static_content': CachePolicy(
                ttl=86400,  # 24 hours
                strategy=CacheStrategy.CACHE_ASIDE,
                namespace='static',
                tags=['static_data'],
                serialization=SerializationFormat.JSON
            )
        }
        
        # Endpoint-specific cache configurations
        self.endpoint_configs = {
            # Family endpoints
            '/api/v1/family/members': EndpointCacheConfig(
                endpoint_pattern='/api/v1/family/members',
                policy=self.default_policies['family_data'],
                warm_on_startup=True
            ),
            '/api/v1/family/members/*': EndpointCacheConfig(
                endpoint_pattern='/api/v1/family/members/*',
                policy=CachePolicy(
                    ttl=1200,  # 20 minutes
                    strategy=CacheStrategy.CACHE_ASIDE,
                    namespace='family',
                    tags=['family_member_details']
                )
            ),
            
            # Memory endpoints
            '/api/v1/memories': EndpointCacheConfig(
                endpoint_pattern='/api/v1/memories',
                policy=self.default_policies['memory_data'],
                bypass_conditions=['query_params_present']
            ),
            '/api/v1/memories/suggestions': EndpointCacheConfig(
                endpoint_pattern='/api/v1/memories/suggestions',
                policy=CachePolicy(
                    ttl=600,  # 10 minutes
                    strategy=CacheStrategy.CACHE_ASIDE,
                    namespace='memories',
                    tags=['memory_suggestions']
                )
            ),
            
            # Travel endpoints
            '/api/v1/travel/plans': EndpointCacheConfig(
                endpoint_pattern='/api/v1/travel/plans',
                policy=self.default_policies['travel_data']
            ),
            '/api/v1/travel/recommendations': EndpointCacheConfig(
                endpoint_pattern='/api/v1/travel/recommendations',
                policy=CachePolicy(
                    ttl=1800,  # 30 minutes
                    strategy=CacheStrategy.CACHE_ASIDE,
                    namespace='travel',
                    tags=['travel_recommendations']
                )
            ),
            
            # AI endpoints
            '/api/v1/ai/analyze': EndpointCacheConfig(
                endpoint_pattern='/api/v1/ai/analyze',
                policy=CachePolicy(
                    ttl=7200,  # 2 hours - AI analysis is expensive
                    strategy=CacheStrategy.CACHE_ASIDE,
                    namespace='ai_cache',
                    tags=['ai_analysis', 'photo_analysis']
                )
            ),
            '/api/v1/ai/faces/identify': EndpointCacheConfig(
                endpoint_pattern='/api/v1/ai/faces/identify',
                policy=CachePolicy(
                    ttl=3600,  # 1 hour
                    strategy=CacheStrategy.CACHE_ASIDE,
                    namespace='ai_cache',
                    tags=['face_recognition']
                )
            ),
            
            # Game endpoints
            '/api/v1/games/*/': EndpointCacheConfig(
                endpoint_pattern='/api/v1/games/*',
                policy=self.default_policies['game_state']
            ),
            
            # Budget endpoints
            '/api/v1/budget/*': EndpointCacheConfig(
                endpoint_pattern='/api/v1/budget/*',
                policy=self.default_policies['budget_data']
            ),
            
            # Auth endpoints - usually not cached, but sessions are
            '/api/v1/auth/profile': EndpointCacheConfig(
                endpoint_pattern='/api/v1/auth/profile',
                policy=CachePolicy(
                    ttl=1800,  # 30 minutes
                    strategy=CacheStrategy.CACHE_ASIDE,
                    namespace='auth',
                    tags=['user_profiles']
                )
            ),
            
            # Health and status endpoints - short cache
            '/api/v1/health': EndpointCacheConfig(
                endpoint_pattern='/api/v1/health',
                policy=CachePolicy(
                    ttl=60,  # 1 minute
                    strategy=CacheStrategy.CACHE_ASIDE,
                    namespace='system',
                    tags=['health_checks']
                )
            ),
            
            # Gateway endpoints
            '/api/v1/gateway/metrics': EndpointCacheConfig(
                endpoint_pattern='/api/v1/gateway/metrics',
                policy=CachePolicy(
                    ttl=120,  # 2 minutes
                    strategy=CacheStrategy.CACHE_ASIDE,
                    namespace='gateway',
                    tags=['gateway_metrics']
                )
            ),
        }
    
    def get_cache_config(self, endpoint: str) -> Optional[EndpointCacheConfig]:
        """Get cache configuration for specific endpoint"""
        # Exact match first
        if endpoint in self.endpoint_configs:
            return self.endpoint_configs[endpoint]
        
        # Pattern matching
        for pattern, config in self.endpoint_configs.items():
            if self._matches_pattern(endpoint, pattern):
                return config
        
        return None
    
    def _matches_pattern(self, endpoint: str, pattern: str) -> bool:
        """Check if endpoint matches pattern (simple wildcard matching)"""
        if '*' not in pattern:
            return endpoint == pattern
        
        # Simple wildcard matching
        pattern_parts = pattern.split('*')
        if len(pattern_parts) == 2:
            prefix, suffix = pattern_parts
            return endpoint.startswith(prefix) and endpoint.endswith(suffix)
        
        # More complex patterns could be implemented here
        return False
    
    def register_endpoint_config(self, config: EndpointCacheConfig):
        """Register new endpoint cache configuration"""
        self.endpoint_configs[config.endpoint_pattern] = config
        logger.info(f"Registered cache config for {config.endpoint_pattern}")
    
    def update_policy(self, policy_name: str, policy: CachePolicy):
        """Update default policy"""
        self.default_policies[policy_name] = policy
        logger.info(f"Updated cache policy: {policy_name}")
    
    def get_policy(self, policy_name: str) -> Optional[CachePolicy]:
        """Get default policy by name"""
        return self.default_policies.get(policy_name)
    
    def get_cache_warming_endpoints(self) -> List[str]:
        """Get list of endpoints that should be warmed on startup"""
        return [
            config.endpoint_pattern 
            for config in self.endpoint_configs.values()
            if config.warm_on_startup
        ]

# Cache invalidation rules
CACHE_INVALIDATION_RULES = {
    # When family member is updated, invalidate related caches
    'family_member_updated': {
        'tags': ['family_members', 'family_member_details'],
        'patterns': [
            'family:member:*',
            'memories:family_member:*'
        ]
    },
    
    # When memory is created/updated, invalidate related caches
    'memory_updated': {
        'tags': ['memories', 'memory_suggestions'],
        'patterns': [
            'memories:*',
            'ai_cache:memory:*'
        ]
    },
    
    # When travel plan is updated, invalidate related caches
    'travel_plan_updated': {
        'tags': ['travel_plans', 'travel_recommendations'],
        'patterns': ['travel:*']
    },
    
    # When game state changes, invalidate game caches
    'game_state_updated': {
        'tags': ['game_sessions'],
        'patterns': ['gaming:*']
    },
    
    # When budget is updated, invalidate budget caches
    'budget_updated': {
        'tags': ['budgets', 'transactions'],
        'patterns': ['budget:*']
    },
    
    # When user profile is updated, invalidate auth caches
    'user_profile_updated': {
        'tags': ['user_profiles', 'user_auth'],
        'patterns': [
            'auth:user:*',
            'sessions:*'
        ]
    }
}

# Cache warming strategies
CACHE_WARMING_STRATEGIES = {
    'startup': [
        # Warm essential data on startup
        {
            'endpoint': '/api/v1/family/members',
            'priority': 1,
            'delay': 0
        },
        {
            'endpoint': '/api/v1/memories',
            'priority': 2,
            'delay': 5  # 5 seconds after startup
        },
        {
            'endpoint': '/api/v1/travel/plans',
            'priority': 3,
            'delay': 10
        }
    ],
    
    'periodic': [
        # Periodically refresh commonly accessed data
        {
            'endpoint': '/api/v1/memories/suggestions',
            'interval': 3600,  # Every hour
            'priority': 2
        },
        {
            'endpoint': '/api/v1/travel/recommendations',
            'interval': 7200,  # Every 2 hours
            'priority': 3
        }
    ]
}

# Performance thresholds
CACHE_PERFORMANCE_THRESHOLDS = {
    'hit_rate_warning': 70,  # Warn if hit rate below 70%
    'hit_rate_critical': 50,  # Critical if hit rate below 50%
    'memory_usage_warning': 80,  # Warn if memory usage above 80%
    'memory_usage_critical': 95,  # Critical if memory usage above 95%
    'response_time_warning': 500,  # Warn if avg response time > 500ms
    'response_time_critical': 1000,  # Critical if avg response time > 1s
}

# Global cache configuration manager
cache_config_manager = CacheConfigManager()

def get_cache_policy_for_endpoint(endpoint: str) -> Optional[CachePolicy]:
    """Get cache policy for specific endpoint"""
    config = cache_config_manager.get_cache_config(endpoint)
    return config.policy if config and config.enabled else None

def should_bypass_cache(endpoint: str, request_context: Dict[str, Any]) -> bool:
    """Check if cache should be bypassed for this request"""
    config = cache_config_manager.get_cache_config(endpoint)
    if not config or not config.enabled:
        return True
    
    # Check bypass conditions
    for condition in config.bypass_conditions:
        if condition == 'query_params_present' and request_context.get('query_params'):
            return True
        elif condition == 'post_request' and request_context.get('method') == 'POST':
            return True
        elif condition == 'user_specific' and request_context.get('user_id'):
            return True
    
    return False

async def invalidate_related_caches(event: str, context: Dict[str, Any] = None):
    """Invalidate caches based on event and context"""
    from backend.enhanced_redis_manager import enhanced_redis
    
    if event not in CACHE_INVALIDATION_RULES:
        return
    
    rules = CACHE_INVALIDATION_RULES[event]
    
    # Invalidate by tags
    for tag in rules.get('tags', []):
        try:
            count = await enhanced_redis.invalidate_by_tag(tag)
            logger.info(f"Invalidated {count} cache entries for tag: {tag}")
        except Exception as e:
            logger.error(f"Error invalidating cache by tag {tag}: {e}")
    
    # Invalidate by patterns
    for pattern in rules.get('patterns', []):
        try:
            # Extract namespace and pattern
            if ':' in pattern:
                namespace, key_pattern = pattern.split(':', 1)
            else:
                namespace, key_pattern = 'default', pattern
            
            count = await enhanced_redis.invalidate_by_pattern(key_pattern, namespace)
            logger.info(f"Invalidated {count} cache entries for pattern: {pattern}")
        except Exception as e:
            logger.error(f"Error invalidating cache by pattern {pattern}: {e}")

def get_cache_warming_tasks() -> List[Dict[str, Any]]:
    """Get cache warming tasks for startup"""
    return CACHE_WARMING_STRATEGIES['startup']

def get_periodic_warming_tasks() -> List[Dict[str, Any]]:
    """Get periodic cache warming tasks"""
    return CACHE_WARMING_STRATEGIES['periodic']