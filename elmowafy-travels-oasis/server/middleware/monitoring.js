import promClient from 'prom-client';
import responseTime from 'response-time';
import compression from 'compression';
import cluster from 'cluster';
import os from 'os';

// Initialize Prometheus metrics
const register = new promClient.Registry();

// Default metrics (CPU, memory, etc.)
promClient.collectDefaultMetrics({ register });

// Custom application metrics
const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  registers: [register]
});

const activeConnections = new promClient.Gauge({
  name: 'websocket_active_connections',
  help: 'Number of active WebSocket connections',
  registers: [register]
});

const databaseQueries = new promClient.Counter({
  name: 'database_queries_total',
  help: 'Total number of database queries',
  labelNames: ['operation', 'collection', 'status'],
  registers: [register]
});

const aiProcessingTime = new promClient.Histogram({
  name: 'ai_processing_duration_seconds',
  help: 'Duration of AI processing tasks',
  labelNames: ['task_type', 'status'],
  buckets: [0.5, 1, 2, 5, 10, 30],
  registers: [register]
});

const memoryUsage = new promClient.Gauge({
  name: 'family_memories_total',
  help: 'Total number of family memories stored',
  registers: [register]
});

const userSessions = new promClient.Gauge({
  name: 'active_user_sessions',
  help: 'Number of active user sessions',
  registers: [register]
});

// Performance monitoring middleware
export const performanceMonitoring = () => {
  return (req, res, next) => {
    const startTime = Date.now();
    
    // Track request
    const route = req.route?.path || req.path || 'unknown';
    const method = req.method;
    
    res.on('finish', () => {
      const duration = (Date.now() - startTime) / 1000;
      const statusCode = res.statusCode.toString();
      
      // Update metrics
      httpRequestsTotal.labels(method, route, statusCode).inc();
      httpRequestDuration.labels(method, route, statusCode).observe(duration);
      
      // Log slow requests
      if (duration > 5) {
        console.warn(`Slow request detected: ${method} ${route} - ${duration}s`);
      }
    });
    
    next();
  };
};

// Response time middleware
export const responseTimeMiddleware = responseTime((req, res, time) => {
  const route = req.route?.path || req.path || 'unknown';
  httpRequestDuration
    .labels(req.method, route, res.statusCode.toString())
    .observe(time / 1000);
});

// Advanced compression with dynamic levels
export const dynamicCompression = compression({
  level: (req, res) => {
    // Use maximum compression for API responses
    if (req.path.startsWith('/api/')) {
      return 9;
    }
    // Use moderate compression for static files
    return 6;
  },
  threshold: 1024, // Only compress responses larger than 1KB
  filter: (req, res) => {
    // Don't compress images or videos
    if (res.getHeader('content-type')?.includes('image/') || 
        res.getHeader('content-type')?.includes('video/')) {
      return false;
    }
    return compression.filter(req, res);
  }
});

// Health check endpoint data
const healthMetrics = {
  startTime: Date.now(),
  requestCount: 0,
  errorCount: 0,
  lastError: null,
  dependencies: {
    database: { status: 'unknown', lastCheck: null, responseTime: 0 },
    aiService: { status: 'unknown', lastCheck: null, responseTime: 0 },
    redis: { status: 'unknown', lastCheck: null, responseTime: 0 }
  }
};

// Comprehensive health check
export const healthCheck = async () => {
  const checks = {
    timestamp: new Date().toISOString(),
    uptime: Date.now() - healthMetrics.startTime,
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    nodeVersion: process.version,
    environment: process.env.NODE_ENV,
    cluster: {
      worker: cluster.worker?.id || 'master',
      workers: cluster.workers ? Object.keys(cluster.workers).length : 0
    }
  };

  // Check database connectivity
  try {
    const dbStart = Date.now();
    // Replace with actual database ping
    // await mongoose.connection.db.admin().ping();
    healthMetrics.dependencies.database = {
      status: 'healthy',
      lastCheck: new Date().toISOString(),
      responseTime: Date.now() - dbStart
    };
  } catch (error) {
    healthMetrics.dependencies.database = {
      status: 'unhealthy',
      lastCheck: new Date().toISOString(),
      error: error.message
    };
  }

  // Check AI service
  try {
    const aiStart = Date.now();
    // Replace with actual AI service health check
    // await fetch('http://localhost:5000/health');
    healthMetrics.dependencies.aiService = {
      status: 'healthy',
      lastCheck: new Date().toISOString(),
      responseTime: Date.now() - aiStart
    };
  } catch (error) {
    healthMetrics.dependencies.aiService = {
      status: 'unhealthy',
      lastCheck: new Date().toISOString(),
      error: error.message
    };
  }

  return {
    status: 'healthy',
    checks,
    dependencies: healthMetrics.dependencies,
    metrics: {
      requests: healthMetrics.requestCount,
      errors: healthMetrics.errorCount,
      errorRate: healthMetrics.requestCount > 0 ? (healthMetrics.errorCount / healthMetrics.requestCount) * 100 : 0
    }
  };
};

// Error tracking and alerting
export const errorTracker = {
  track: (error, req, additionalInfo = {}) => {
    healthMetrics.errorCount++;
    healthMetrics.lastError = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      url: req?.originalUrl,
      method: req?.method,
      userAgent: req?.get('User-Agent'),
      ip: req?.ip,
      ...additionalInfo
    };

    // Log error
    console.error('Application Error:', {
      error: error.message,
      stack: error.stack,
      url: req?.originalUrl,
      method: req?.method,
      timestamp: new Date().toISOString(),
      ...additionalInfo
    });

    // In production, send to error tracking service
    // await ErrorTrackingService.capture(error, req, additionalInfo);
  },

  // Get error statistics
  getStats: () => ({
    totalErrors: healthMetrics.errorCount,
    lastError: healthMetrics.lastError,
    errorRate: healthMetrics.requestCount > 0 ? (healthMetrics.errorCount / healthMetrics.requestCount) * 100 : 0
  })
};

// Performance optimization utilities
export const performanceOptimizer = {
  // Database query optimization
  optimizeQuery: (query, collection) => {
    const start = Date.now();
    
    return {
      execute: async (operation) => {
        try {
          const result = await operation();
          const duration = Date.now() - start;
          
          databaseQueries.labels('success', collection, 'success').inc();
          
          // Log slow queries
          if (duration > 1000) {
            console.warn(`Slow database query detected: ${collection} - ${duration}ms`);
          }
          
          return result;
        } catch (error) {
          databaseQueries.labels('error', collection, 'error').inc();
          throw error;
        }
      }
    };
  },

  // Memory usage monitoring
  checkMemoryUsage: () => {
    const usage = process.memoryUsage();
    const threshold = 500 * 1024 * 1024; // 500MB threshold
    
    if (usage.heapUsed > threshold) {
      console.warn(`High memory usage detected: ${Math.round(usage.heapUsed / 1024 / 1024)}MB`);
      
      // Trigger garbage collection if available
      if (global.gc) {
        global.gc();
        console.log('Garbage collection triggered');
      }
    }
    
    return usage;
  },

  // CPU usage monitoring
  monitorCPU: () => {
    const usage = process.cpuUsage();
    return {
      user: usage.user / 1000000, // Convert to seconds
      system: usage.system / 1000000
    };
  }
};

// Advanced caching strategies
export const cacheManager = {
  // Cache configurations for different data types
  configs: {
    familyMembers: { ttl: 300, key: 'family:members' }, // 5 minutes
    memories: { ttl: 180, key: 'memories:timeline' }, // 3 minutes
    travelRecommendations: { ttl: 3600, key: 'travel:recommendations' }, // 1 hour
    analytics: { ttl: 900, key: 'analytics:dashboard' }, // 15 minutes
    aiResponses: { ttl: 1800, key: 'ai:responses' } // 30 minutes
  },

  // Generate cache key
  generateKey: (type, identifier) => {
    const config = cacheManager.configs[type];
    return `${config?.key}:${identifier}`;
  },

  // Cache middleware
  middleware: (type, keyGenerator) => {
    return async (req, res, next) => {
      const cacheKey = keyGenerator(req);
      
      try {
        // Check cache (implement with Redis or memory cache)
        // const cachedData = await redis.get(cacheKey);
        // if (cachedData) {
        //   return res.json(JSON.parse(cachedData));
        // }
        
        // Store original res.json function
        const originalJson = res.json;
        
        // Override res.json to cache response
        res.json = function(data) {
          // Cache the response
          // redis.setex(cacheKey, cacheManager.configs[type].ttl, JSON.stringify(data));
          
          // Call original json function
          return originalJson.call(this, data);
        };
        
        next();
      } catch (error) {
        // If cache fails, continue without caching
        next();
      }
    };
  }
};

// Real-time metrics for dashboard
export const metricsCollector = {
  collect: () => ({
    timestamp: Date.now(),
    requests: {
      total: healthMetrics.requestCount,
      errors: healthMetrics.errorCount,
      rate: calculateRequestRate()
    },
    performance: {
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      uptime: process.uptime()
    },
    connections: {
      active: getActiveConnections(),
      websocket: getWebSocketConnections()
    }
  }),

  // Stream metrics to connected clients
  streamToClients: (io) => {
    setInterval(() => {
      const metrics = metricsCollector.collect();
      io.emit('metrics:update', metrics);
    }, 5000); // Update every 5 seconds
  }
};

// Helper functions
const calculateRequestRate = () => {
  // Implement request rate calculation
  return 0;
};

const getActiveConnections = () => {
  // Implement active connection counting
  return 0;
};

const getWebSocketConnections = () => {
  // Implement WebSocket connection counting
  return 0;
};

// Request tracking middleware
export const requestTracker = (req, res, next) => {
  healthMetrics.requestCount++;
  
  // Add request ID for tracing
  req.requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  res.setHeader('X-Request-ID', req.requestId);
  
  next();
};

// Metrics endpoint
export const metricsEndpoint = (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(register.metrics());
};

// Export metrics registry for external monitoring
export { register as metricsRegistry };

export default {
  performanceMonitoring,
  responseTimeMiddleware,
  dynamicCompression,
  healthCheck,
  errorTracker,
  performanceOptimizer,
  cacheManager,
  metricsCollector,
  requestTracker,
  metricsEndpoint,
  httpRequestsTotal,
  httpRequestDuration,
  activeConnections,
  databaseQueries,
  aiProcessingTime,
  memoryUsage,
  userSessions
};