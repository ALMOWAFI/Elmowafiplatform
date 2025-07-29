import Redis from 'ioredis';
import LRU from 'lru-cache';
import crypto from 'crypto';
import { promisify } from 'util';

// Redis client setup
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  connectTimeout: 60000,
  lazyConnect: true,
  maxRetriesPerRequest: 3
});

// In-memory LRU cache as Redis fallback
const memoryCache = new LRU({
  max: 1000, // Maximum number of items
  ttl: 1000 * 60 * 5 // 5 minutes TTL
});

// Cache strategies
export const cacheStrategies = {
  // Cache-aside (lazy loading)
  CACHE_ASIDE: 'cache-aside',
  
  // Write-through (write to cache and DB)
  WRITE_THROUGH: 'write-through',
  
  // Write-behind (write to cache, async write to DB)
  WRITE_BEHIND: 'write-behind',
  
  // Time-based expiration
  TIME_BASED: 'time-based',
  
  // LRU eviction
  LRU_EVICTION: 'lru-eviction'
};

// Cache configurations for different data types
export const cacheConfigs = {
  // User sessions and authentication
  sessions: {
    ttl: 86400, // 24 hours
    strategy: cacheStrategies.WRITE_THROUGH,
    keyPrefix: 'session:',
    namespace: 'auth'
  },
  
  // Family member data
  familyMembers: {
    ttl: 3600, // 1 hour
    strategy: cacheStrategies.CACHE_ASIDE,
    keyPrefix: 'family:members:',
    namespace: 'family'
  },
  
  // Memory timeline data
  memories: {
    ttl: 1800, // 30 minutes
    strategy: cacheStrategies.TIME_BASED,
    keyPrefix: 'memories:',
    namespace: 'content'
  },
  
  // Travel recommendations
  travelRecommendations: {
    ttl: 7200, // 2 hours
    strategy: cacheStrategies.CACHE_ASIDE,
    keyPrefix: 'travel:rec:',
    namespace: 'travel'
  },
  
  // AI analysis results
  aiAnalysis: {
    ttl: 3600, // 1 hour
    strategy: cacheStrategies.WRITE_THROUGH,
    keyPrefix: 'ai:analysis:',
    namespace: 'ai'
  },
  
  // Static content and assets
  staticContent: {
    ttl: 2592000, // 30 days
    strategy: cacheStrategies.TIME_BASED,
    keyPrefix: 'static:',
    namespace: 'assets'
  },
  
  // API responses
  apiResponses: {
    ttl: 900, // 15 minutes
    strategy: cacheStrategies.CACHE_ASIDE,
    keyPrefix: 'api:response:',
    namespace: 'api'
  }
};

// Advanced cache manager
export class AdvancedCacheManager {
  constructor() {
    this.redis = redis;
    this.memoryCache = memoryCache;
    this.compressionEnabled = true;
    this.metricsEnabled = true;
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    };
  }

  // Generate cache key with namespace and hashing
  generateKey(namespace, identifier, version = '1') {
    const keyString = `${namespace}:${identifier}:v${version}`;
    
    // Hash long keys to avoid Redis key length limits
    if (keyString.length > 250) {
      return `${namespace}:${crypto.createHash('sha256').update(keyString).digest('hex')}`;
    }
    
    return keyString;
  }

  // Compress data before caching (for large objects)
  compress(data) {
    if (!this.compressionEnabled) return data;
    
    const stringData = JSON.stringify(data);
    if (stringData.length < 1024) return stringData; // Don't compress small data
    
    try {
      const zlib = require('zlib');
      return zlib.gzipSync(stringData).toString('base64');
    } catch (error) {
      console.warn('Compression failed:', error);
      return stringData;
    }
  }

  // Decompress cached data
  decompress(data) {
    if (!this.compressionEnabled || typeof data !== 'string') return data;
    
    try {
      // Check if data is base64 encoded (compressed)
      if (data.match(/^[A-Za-z0-9+/]*={0,2}$/)) {
        const zlib = require('zlib');
        const decompressed = zlib.gunzipSync(Buffer.from(data, 'base64')).toString();
        return JSON.parse(decompressed);
      }
      
      return JSON.parse(data);
    } catch (error) {
      console.warn('Decompression failed:', error);
      return data;
    }
  }

  // Get from cache with fallback to memory cache
  async get(key, config = {}) {
    try {
      // Try Redis first
      const redisData = await this.redis.get(key);
      
      if (redisData !== null) {
        this.updateMetrics('hits');
        return this.decompress(redisData);
      }
      
      // Fallback to memory cache
      const memoryData = this.memoryCache.get(key);
      if (memoryData !== undefined) {
        this.updateMetrics('hits');
        return memoryData;
      }
      
      this.updateMetrics('misses');
      return null;
      
    } catch (error) {
      this.updateMetrics('errors');
      console.error('Cache get error:', error);
      
      // Try memory cache as fallback
      const memoryData = this.memoryCache.get(key);
      if (memoryData !== undefined) {
        this.updateMetrics('hits');
        return memoryData;
      }
      
      return null;
    }
  }

  // Set cache with multiple storage tiers
  async set(key, value, ttl = 3600, config = {}) {
    try {
      const compressedValue = this.compress(value);
      
      // Set in Redis with TTL
      if (ttl > 0) {
        await this.redis.setex(key, ttl, compressedValue);
      } else {
        await this.redis.set(key, compressedValue);
      }
      
      // Also set in memory cache for faster access
      this.memoryCache.set(key, value, { ttl: Math.min(ttl * 1000, 300000) }); // Max 5 min in memory
      
      this.updateMetrics('sets');
      return true;
      
    } catch (error) {
      this.updateMetrics('errors');
      console.error('Cache set error:', error);
      
      // Fallback to memory cache only
      this.memoryCache.set(key, value, { ttl: Math.min(ttl * 1000, 300000) });
      return false;
    }
  }

  // Delete from cache
  async delete(key) {
    try {
      await this.redis.del(key);
      this.memoryCache.delete(key);
      this.updateMetrics('deletes');
      return true;
    } catch (error) {
      this.updateMetrics('errors');
      console.error('Cache delete error:', error);
      this.memoryCache.delete(key);
      return false;
    }
  }

  // Batch operations
  async mget(keys) {
    try {
      const results = await this.redis.mget(keys);
      return results.map((result, index) => ({
        key: keys[index],
        value: result ? this.decompress(result) : null
      }));
    } catch (error) {
      console.error('Cache mget error:', error);
      return keys.map(key => ({ key, value: this.memoryCache.get(key) || null }));
    }
  }

  async mset(keyValuePairs, ttl = 3600) {
    try {
      const pipeline = this.redis.pipeline();
      
      keyValuePairs.forEach(({ key, value }) => {
        const compressedValue = this.compress(value);
        if (ttl > 0) {
          pipeline.setex(key, ttl, compressedValue);
        } else {
          pipeline.set(key, compressedValue);
        }
        
        // Also set in memory
        this.memoryCache.set(key, value, { ttl: Math.min(ttl * 1000, 300000) });
      });
      
      await pipeline.exec();
      this.updateMetrics('sets', keyValuePairs.length);
      return true;
      
    } catch (error) {
      this.updateMetrics('errors');
      console.error('Cache mset error:', error);
      
      // Fallback to memory cache
      keyValuePairs.forEach(({ key, value }) => {
        this.memoryCache.set(key, value, { ttl: Math.min(ttl * 1000, 300000) });
      });
      
      return false;
    }
  }

  // Cache invalidation patterns
  async invalidatePattern(pattern) {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        
        // Also clear from memory cache
        keys.forEach(key => this.memoryCache.delete(key));
        
        this.updateMetrics('deletes', keys.length);
      }
      return keys.length;
    } catch (error) {
      this.updateMetrics('errors');
      console.error('Cache invalidation error:', error);
      return 0;
    }
  }

  // Tag-based invalidation
  async invalidateByTags(tags) {
    const patterns = tags.map(tag => `*:tag:${tag}:*`);
    let totalInvalidated = 0;
    
    for (const pattern of patterns) {
      totalInvalidated += await this.invalidatePattern(pattern);
    }
    
    return totalInvalidated;
  }

  // Update cache metrics
  updateMetrics(operation, count = 1) {
    if (!this.metricsEnabled) return;
    
    if (this.metrics[operation] !== undefined) {
      this.metrics[operation] += count;
    }
  }

  // Get cache statistics
  getStats() {
    const hitRate = this.metrics.hits + this.metrics.misses > 0 
      ? (this.metrics.hits / (this.metrics.hits + this.metrics.misses) * 100).toFixed(2)
      : 0;
    
    return {
      ...this.metrics,
      hitRate: `${hitRate}%`,
      memoryItems: this.memoryCache.size,
      redisConnected: this.redis.status === 'ready'
    };
  }

  // Health check
  async healthCheck() {
    try {
      await this.redis.ping();
      return {
        redis: 'healthy',
        memory: 'healthy',
        stats: this.getStats()
      };
    } catch (error) {
      return {
        redis: 'unhealthy',
        memory: 'healthy',
        error: error.message,
        stats: this.getStats()
      };
    }
  }
}

// Create global cache manager instance
export const cacheManager = new AdvancedCacheManager();

// CDN and static asset optimization
export class CDNManager {
  constructor() {
    this.cdnBaseUrl = process.env.CDN_BASE_URL || '';
    this.staticAssetVersions = new Map();
    this.optimizationEnabled = true;
  }

  // Generate CDN URL for static assets
  getCDNUrl(assetPath, version = '1') {
    if (!this.cdnBaseUrl) return assetPath;
    
    const versionedPath = this.addVersionToAsset(assetPath, version);
    return `${this.cdnBaseUrl}${versionedPath}`;
  }

  // Add version hash to asset for cache busting
  addVersionToAsset(assetPath, version) {
    const [path, query] = assetPath.split('?');
    const separator = query ? '&' : '?';
    return `${path}${separator}v=${version}`;
  }

  // Image optimization headers
  getImageOptimizationHeaders(format = 'webp', quality = 80) {
    return {
      'Accept': `image/${format},image/*,*/*;q=0.8`,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Vary': 'Accept',
      'X-Content-Type-Options': 'nosniff'
    };
  }

  // Generate responsive image URLs
  generateResponsiveImages(imagePath, sizes = [400, 800, 1200, 1600]) {
    return sizes.map(size => ({
      size,
      url: this.getCDNUrl(`${imagePath}?w=${size}&q=80&f=webp`),
      webp: this.getCDNUrl(`${imagePath}?w=${size}&q=80&f=webp`),
      fallback: this.getCDNUrl(`${imagePath}?w=${size}&q=80`)
    }));
  }
}

// Create global CDN manager
export const cdnManager = new CDNManager();

// Caching middleware factory
export const createCacheMiddleware = (config) => {
  const { ttl = 3600, keyGenerator, condition, skipIf } = config;
  
  return async (req, res, next) => {
    // Skip caching if condition not met
    if (condition && !condition(req)) {
      return next();
    }
    
    if (skipIf && skipIf(req)) {
      return next();
    }
    
    // Generate cache key
    const cacheKey = keyGenerator ? keyGenerator(req) : `api:${req.originalUrl}`;
    
    try {
      // Try to get from cache
      const cachedResponse = await cacheManager.get(cacheKey);
      
      if (cachedResponse) {
        // Add cache headers
        res.set({
          'X-Cache': 'HIT',
          'X-Cache-Key': cacheKey,
          'Cache-Control': `public, max-age=${ttl}`
        });
        
        return res.json(cachedResponse);
      }
      
      // Cache miss - continue to route handler
      res.set('X-Cache', 'MISS');
      
      // Override res.json to cache the response
      const originalJson = res.json;
      res.json = function(data) {
        // Cache the response
        cacheManager.set(cacheKey, data, ttl).catch(console.error);
        
        // Add cache headers
        res.set({
          'X-Cache-Key': cacheKey,
          'Cache-Control': `public, max-age=${ttl}`
        });
        
        // Call original json method
        return originalJson.call(this, data);
      };
      
      next();
      
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};

// Static asset caching middleware
export const staticAssetCache = (options = {}) => {
  const { 
    maxAge = 31536000, // 1 year
    etag = true,
    immutable = true 
  } = options;
  
  return (req, res, next) => {
    // Set cache headers for static assets
    if (req.url.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
      const cacheControl = immutable 
        ? `public, max-age=${maxAge}, immutable`
        : `public, max-age=${maxAge}`;
      
      res.set({
        'Cache-Control': cacheControl,
        'Expires': new Date(Date.now() + maxAge * 1000).toUTCString()
      });
      
      if (etag) {
        res.set('ETag', `"${Date.now()}"`);
      }
    }
    
    next();
  };
};

// Cache warming utilities
export const cacheWarmer = {
  // Warm specific cache keys
  async warmKeys(keyValuePairs) {
    return await cacheManager.mset(keyValuePairs);
  },
  
  // Warm family data cache
  async warmFamilyCache(familyId) {
    // Implementation would fetch and cache family data
    console.log(`Warming cache for family: ${familyId}`);
  },
  
  // Warm travel recommendations
  async warmTravelCache(preferences) {
    // Implementation would pre-generate and cache travel recommendations
    console.log('Warming travel recommendation cache');
  }
};

export default {
  cacheManager,
  cdnManager,
  createCacheMiddleware,
  staticAssetCache,
  cacheWarmer,
  cacheConfigs,
  cacheStrategies
};