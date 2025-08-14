// Advanced Service Worker Configuration for Performance Optimization
// This file configures caching strategies for optimal performance

const CACHE_VERSION = 'v1.0.0';
const STATIC_CACHE = `elmowafiplatform-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `elmowafiplatform-dynamic-${CACHE_VERSION}`;
const API_CACHE = `elmowafiplatform-api-${CACHE_VERSION}`;
const CDN_CACHE = `elmowafiplatform-cdn-${CACHE_VERSION}`;

// Define caching strategies for different asset types
const CACHE_STRATEGIES = {
  // Static assets - Cache First (long-term cache)
  static: {
    strategy: 'CacheFirst',
    cacheName: STATIC_CACHE,
    maxAge: 30 * 24 * 60 * 60, // 30 days
    maxEntries: 100,
    patterns: [
      /\.(?:js|css|html)$/,
      /\.(?:png|jpg|jpeg|svg|gif|webp|avif|ico)$/,
      /\.(?:woff|woff2|eot|ttf|otf)$/,
    ]
  },
  
  // API responses - Network First with cache fallback
  api: {
    strategy: 'NetworkFirst',
    cacheName: API_CACHE,
    maxAge: 5 * 60, // 5 minutes
    maxEntries: 50,
    patterns: [
      /^https:\/\/localhost:8000\/api\//,
      /^https:\/\/.*\.vercel\.app\/api\//,
      /^https:\/\/.*\.railway\.app\/api\//,
    ]
  },
  
  // CDN resources - Cache First with network fallback
  cdn: {
    strategy: 'CacheFirst',
    cacheName: CDN_CACHE,
    maxAge: 7 * 24 * 60 * 60, // 7 days
    maxEntries: 30,
    patterns: [
      /^https:\/\/unpkg\.com\//,
      /^https:\/\/cdn\.jsdelivr\.net\//,
      /^https:\/\/cdnjs\.cloudflare\.com\//,
      /^https:\/\/api\.mapbox\.com\//,
    ]
  },
  
  // Dynamic content - Stale While Revalidate
  dynamic: {
    strategy: 'StaleWhileRevalidate',
    cacheName: DYNAMIC_CACHE,
    maxAge: 60 * 60, // 1 hour
    maxEntries: 30,
    patterns: [
      /^https:\/\/.*\.(json|xml)$/,
    ]
  }
};

// Performance optimization rules
const PERFORMANCE_RULES = {
  // Preload critical resources
  criticalResources: [
    '/',
    '/manifest.json',
    '/assets/index.js',
    '/assets/index.css'
  ],
  
  // Lazy load non-critical chunks
  lazyChunks: [
    '/assets/three-libs-',
    '/assets/chart-libs-',
    '/assets/map-libs-'
  ],
  
  // Background sync for offline actions
  backgroundSync: {
    queues: ['budget-updates', 'memory-uploads', 'analytics-events'],
    retryDelay: 5000,
    maxRetries: 3
  }
};

// Advanced caching configuration for Workbox
const WORKBOX_CONFIG = {
  // Precaching strategy
  precacheManifest: {
    cleanupOutdatedCaches: true,
    skipWaiting: true,
    clientsClaim: true
  },
  
  // Runtime caching rules
  runtimeCaching: [
    // Static assets
    {
      urlPattern: ({ request, url }) => {
        return CACHE_STRATEGIES.static.patterns.some(pattern => 
          pattern.test(url.pathname) || pattern.test(request.destination)
        );
      },
      handler: 'CacheFirst',
      options: {
        cacheName: STATIC_CACHE,
        expiration: {
          maxEntries: CACHE_STRATEGIES.static.maxEntries,
          maxAgeSeconds: CACHE_STRATEGIES.static.maxAge,
          purgeOnQuotaError: true
        },
        cacheKeyWillBeUsed: async ({ request, mode }) => {
          // Add cache busting for development
          if (mode === 'install') {
            return `${request.url}?sw-cache=${CACHE_VERSION}`;
          }
          return request.url;
        }
      }
    },
    
    // API calls
    {
      urlPattern: ({ url }) => {
        return CACHE_STRATEGIES.api.patterns.some(pattern => 
          pattern.test(url.href)
        );
      },
      handler: 'NetworkFirst',
      options: {
        cacheName: API_CACHE,
        networkTimeoutSeconds: 3,
        expiration: {
          maxEntries: CACHE_STRATEGIES.api.maxEntries,
          maxAgeSeconds: CACHE_STRATEGIES.api.maxAge
        },
        cacheableResponse: {
          statuses: [0, 200]
        }
      }
    },
    
    // CDN resources
    {
      urlPattern: ({ url }) => {
        return CACHE_STRATEGIES.cdn.patterns.some(pattern => 
          pattern.test(url.href)
        );
      },
      handler: 'CacheFirst',
      options: {
        cacheName: CDN_CACHE,
        expiration: {
          maxEntries: CACHE_STRATEGIES.cdn.maxEntries,
          maxAgeSeconds: CACHE_STRATEGIES.cdn.maxAge
        },
        cacheableResponse: {
          statuses: [0, 200]
        }
      }
    },
    
    // Dynamic content
    {
      urlPattern: ({ url, request }) => {
        return request.method === 'GET' && 
               CACHE_STRATEGIES.dynamic.patterns.some(pattern => 
                 pattern.test(url.href)
               );
      },
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: DYNAMIC_CACHE,
        expiration: {
          maxEntries: CACHE_STRATEGIES.dynamic.maxEntries,
          maxAgeSeconds: CACHE_STRATEGIES.dynamic.maxAge
        }
      }
    }
  ],
  
  // Navigation requests (for SPA)
  navigationPreload: true,
  
  // Skip waiting and claim clients
  skipWaiting: true,
  clientsClaim: true,
  
  // Development settings
  mode: process.env.NODE_ENV === 'development' ? 'development' : 'production'
};

// Performance monitoring in Service Worker
const SW_PERFORMANCE_CONFIG = {
  // Track cache performance
  trackCacheHits: true,
  trackCacheMisses: true,
  trackNetworkFailures: true,
  
  // Report performance metrics
  performanceEndpoint: '/api/sw-performance',
  
  // Background sync for metrics
  metricsSync: {
    queue: 'performance-metrics',
    batchSize: 10,
    interval: 60000 // 1 minute
  }
};

// Export configuration
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CACHE_STRATEGIES,
    PERFORMANCE_RULES,
    WORKBOX_CONFIG,
    SW_PERFORMANCE_CONFIG,
    CACHE_VERSION
  };
}

// Browser global
if (typeof window !== 'undefined') {
  window.SW_CONFIG = {
    CACHE_STRATEGIES,
    PERFORMANCE_RULES,
    WORKBOX_CONFIG,
    SW_PERFORMANCE_CONFIG,
    CACHE_VERSION
  };
}