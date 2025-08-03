import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      log += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return log;
  })
);

// Create Winston logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: {
    service: 'elmowafy-platform',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // Error logs - separate file for errors only
    new DailyRotateFile({
      filename: path.join(logsDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '30d',
      zippedArchive: true
    }),
    
    // Combined logs - all log levels
    new DailyRotateFile({
      filename: path.join(logsDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      zippedArchive: true
    }),
    
    // Performance logs
    new DailyRotateFile({
      filename: path.join(logsDir, 'performance-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'info',
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true
    }),
    
    // Security audit logs
    new DailyRotateFile({
      filename: path.join(logsDir, 'security-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'warn',
      maxSize: '20m',
      maxFiles: '90d', // Keep security logs longer
      zippedArchive: true
    })
  ],
  
  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'exceptions.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 5
    })
  ],
  
  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'rejections.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 5
    })
  ]
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
    level: 'debug'
  }));
} else {
  // In production, only log warnings and errors to console
  logger.add(new winston.transports.Console({
    format: consoleFormat,
    level: 'warn'
  }));
}

// Structured logging helpers
export const structuredLogger = {
  // Authentication and authorization events
  auth: {
    loginAttempt: (userId, ip, userAgent, success = false) => {
      logger.info('Authentication attempt', {
        category: 'authentication',
        event: 'login_attempt',
        userId,
        ip,
        userAgent,
        success,
        timestamp: new Date().toISOString()
      });
    },
    
    logout: (userId, ip, sessionDuration) => {
      logger.info('User logout', {
        category: 'authentication',
        event: 'logout',
        userId,
        ip,
        sessionDuration,
        timestamp: new Date().toISOString()
      });
    },
    
    tokenRefresh: (userId, ip) => {
      logger.info('Token refresh', {
        category: 'authentication',
        event: 'token_refresh',
        userId,
        ip,
        timestamp: new Date().toISOString()
      });
    },
    
    passwordChange: (userId, ip) => {
      logger.warn('Password change', {
        category: 'authentication',
        event: 'password_change',
        userId,
        ip,
        timestamp: new Date().toISOString()
      });
    }
  },
  
  // Family data operations
  family: {
    memberAdded: (familyId, userId, newMemberId) => {
      logger.info('Family member added', {
        category: 'family',
        event: 'member_added',
        familyId,
        userId,
        newMemberId,
        timestamp: new Date().toISOString()
      });
    },
    
    memoryUploaded: (familyId, userId, memoryId, fileSize, fileType) => {
      logger.info('Memory uploaded', {
        category: 'family',
        event: 'memory_uploaded',
        familyId,
        userId,
        memoryId,
        fileSize,
        fileType,
        timestamp: new Date().toISOString()
      });
    },
    
    memoryShared: (memoryId, sharedBy, sharedWith) => {
      logger.info('Memory shared', {
        category: 'family',
        event: 'memory_shared',
        memoryId,
        sharedBy,
        sharedWith,
        timestamp: new Date().toISOString()
      });
    }
  },
  
  // Travel planning events
  travel: {
    tripCreated: (tripId, userId, destination, budget) => {
      logger.info('Trip created', {
        category: 'travel',
        event: 'trip_created',
        tripId,
        userId,
        destination,
        budget,
        timestamp: new Date().toISOString()
      });
    },
    
    itineraryGenerated: (tripId, userId, destinationCount, duration) => {
      logger.info('Itinerary generated', {
        category: 'travel',
        event: 'itinerary_generated',
        tripId,
        userId,
        destinationCount,
        duration,
        timestamp: new Date().toISOString()
      });
    },
    
    recommendationRequested: (userId, destination, preferences) => {
      logger.info('Travel recommendation requested', {
        category: 'travel',
        event: 'recommendation_requested',
        userId,
        destination,
        preferences,
        timestamp: new Date().toISOString()
      });
    }
  },
  
  // AI operations
  ai: {
    photoAnalyzed: (userId, photoId, analysisType, processingTime, confidence) => {
      logger.info('Photo analysis completed', {
        category: 'ai',
        event: 'photo_analyzed',
        userId,
        photoId,
        analysisType,
        processingTime,
        confidence,
        timestamp: new Date().toISOString()
      });
    },
    
    recommendationGenerated: (userId, recommendationType, itemCount, confidence) => {
      logger.info('AI recommendation generated', {
        category: 'ai',
        event: 'recommendation_generated',
        userId,
        recommendationType,
        itemCount,
        confidence,
        timestamp: new Date().toISOString()
      });
    },
    
    modelError: (modelName, errorType, userId, inputData) => {
      logger.error('AI model error', {
        category: 'ai',
        event: 'model_error',
        modelName,
        errorType,
        userId,
        inputData: JSON.stringify(inputData).substring(0, 500), // Truncate large inputs
        timestamp: new Date().toISOString()
      });
    }
  },
  
  // Performance monitoring
  performance: {
    slowQuery: (query, duration, collection, userId) => {
      logger.warn('Slow database query detected', {
        category: 'performance',
        event: 'slow_query',
        query: query.substring(0, 200), // Truncate long queries
        duration,
        collection,
        userId,
        timestamp: new Date().toISOString()
      });
    },
    
    highMemoryUsage: (usage, threshold, endpoint) => {
      logger.warn('High memory usage detected', {
        category: 'performance',
        event: 'high_memory_usage',
        usage,
        threshold,
        endpoint,
        timestamp: new Date().toISOString()
      });
    },
    
    apiResponseTime: (endpoint, method, duration, statusCode) => {
      const level = duration > 5000 ? 'warn' : 'info';
      logger[level]('API response time', {
        category: 'performance',
        event: 'api_response_time',
        endpoint,
        method,
        duration,
        statusCode,
        timestamp: new Date().toISOString()
      });
    }
  },
  
  // Security events
  security: {
    suspiciousActivity: (userId, ip, activityType, details) => {
      logger.error('Suspicious activity detected', {
        category: 'security',
        event: 'suspicious_activity',
        userId,
        ip,
        activityType,
        details,
        severity: 'high',
        timestamp: new Date().toISOString()
      });
    },
    
    rateLimitExceeded: (ip, endpoint, attemptCount) => {
      logger.warn('Rate limit exceeded', {
        category: 'security',
        event: 'rate_limit_exceeded',
        ip,
        endpoint,
        attemptCount,
        timestamp: new Date().toISOString()
      });
    },
    
    fileUploadBlocked: (userId, ip, fileName, reason) => {
      logger.warn('File upload blocked', {
        category: 'security',
        event: 'file_upload_blocked',
        userId,
        ip,
        fileName,
        reason,
        timestamp: new Date().toISOString()
      });
    },
    
    dataAccess: (userId, resource, action, success, ip) => {
      logger.info('Data access attempt', {
        category: 'security',
        event: 'data_access',
        userId,
        resource,
        action,
        success,
        ip,
        timestamp: new Date().toISOString()
      });
    }
  },
  
  // Business logic events
  business: {
    budgetExceeded: (tripId, userId, plannedBudget, actualBudget) => {
      logger.warn('Trip budget exceeded', {
        category: 'business',
        event: 'budget_exceeded',
        tripId,
        userId,
        plannedBudget,
        actualBudget,
        overageAmount: actualBudget - plannedBudget,
        timestamp: new Date().toISOString()
      });
    },
    
    familyMilestone: (familyId, milestoneType, details) => {
      logger.info('Family milestone reached', {
        category: 'business',
        event: 'family_milestone',
        familyId,
        milestoneType,
        details,
        timestamp: new Date().toISOString()
      });
    }
  }
};

// Request logging middleware
export const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Generate request ID
  req.requestId = req.requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Log request
  logger.info('Incoming request', {
    category: 'http',
    event: 'request_start',
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    timestamp: new Date().toISOString()
  });
  
  // Log response
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    logger.info('Request completed', {
      category: 'http',
      event: 'request_complete',
      requestId: req.requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration,
      contentLength: res.get('Content-Length'),
      userId: req.user?.id,
      timestamp: new Date().toISOString()
    });
    
    // Log slow requests as warnings
    if (duration > 5000) {
      structuredLogger.performance.apiResponseTime(req.originalUrl, req.method, duration, res.statusCode);
    }
  });
  
  next();
};

// Error logging middleware
export const errorLogger = (err, req, res, next) => {
  logger.error('Request error', {
    category: 'error',
    event: 'request_error',
    requestId: req.requestId,
    error: {
      message: err.message,
      stack: err.stack,
      code: err.code,
      statusCode: err.statusCode
    },
    request: {
      method: req.method,
      url: req.originalUrl,
      headers: req.headers,
      body: req.body,
      params: req.params,
      query: req.query
    },
    user: {
      id: req.user?.id,
      ip: req.ip
    },
    timestamp: new Date().toISOString()
  });
  
  next(err);
};

// Log analysis utilities
export const logAnalyzer = {
  // Query logs for patterns
  async findPatterns(category, timeRange = '24h') {
    // Implementation would query log files or log aggregation service
    console.log(`Analyzing logs for category: ${category}, time range: ${timeRange}`);
    
    return {
      totalEvents: 1500,
      errorRate: 0.02,
      topErrors: [
        { message: 'Database timeout', count: 15 },
        { message: 'File upload failed', count: 8 }
      ],
      trends: {
        hourly: Array.from({ length: 24 }, (_, i) => ({
          hour: i,
          count: Math.floor(Math.random() * 100)
        }))
      }
    };
  },
  
  // Generate performance report
  async generatePerformanceReport(startDate, endDate) {
    return {
      averageResponseTime: 245,
      slowestEndpoints: [
        { endpoint: '/api/v1/ai/analyze-photo', averageTime: 2500 },
        { endpoint: '/api/v1/travel/recommendations', averageTime: 1800 }
      ],
      errorDistribution: {
        '4xx': 12,
        '5xx': 5
      },
      peakHours: [9, 14, 20]
    };
  },
  
  // Security analysis
  async analyzeSecurityEvents(timeRange = '7d') {
    return {
      totalSecurityEvents: 45,
      riskLevel: 'low',
      topThreats: [
        { type: 'rate_limit_exceeded', count: 25 },
        { type: 'suspicious_activity', count: 10 }
      ],
      blockedIPs: ['192.168.1.100', '10.0.0.50'],
      recommendations: [
        'Consider implementing additional rate limiting',
        'Review authentication logs for patterns'
      ]
    };
  }
};

// Export logger and utilities
export { logger };
export default {
  logger,
  structuredLogger,
  requestLogger,
  errorLogger,
  logAnalyzer
};