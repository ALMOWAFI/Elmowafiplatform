import express from 'express';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import hpp from 'hpp';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Production middleware imports
import { AppError, globalErrorHandler, notFound } from './middleware/errorHandler.js';
import { createRateLimiters, advancedHelmet } from './middleware/advancedSecurity.js';
import { performanceMonitoring, dynamicCompression, requestTracker, metricsEndpoint } from './middleware/monitoring.js';
import { createCacheMiddleware, staticAssetCache } from './middleware/caching.js';
import { requestLogger, errorLogger } from './utils/logger.js';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import routes
import familyRouter from './routes/api/family.js';
import healthRouter from './routes/health.js';
import authRouter from './routes/api/auth.js';
import aiRouter from './routes/api/ai.js';
import memoriesRouter from './routes/api/memories.js';
import travelRouter from './routes/api/travel.js';
// Add other routers here

// Start express app
const app = express();

// 1) PRODUCTION-READY MIDDLEWARES

// Trust proxy for accurate IP addresses (for load balancers)
app.set('trust proxy', 1);

// Advanced security headers
app.use(advancedHelmet);

// Implement CORS with proper configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Request tracking and logging
app.use(requestTracker);
app.use(requestLogger);

// Performance monitoring
app.use(performanceMonitoring());

// Advanced rate limiting
const rateLimiters = createRateLimiters();
app.use('/api', rateLimiters.general);
app.use('/api/v1/auth', rateLimiters.auth);
app.use('/api/v1/upload', rateLimiters.upload);

// Progressive enhancement logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Enhanced body parsing with security limits
app.use(express.json({ 
  limit: process.env.NODE_ENV === 'production' ? '1mb' : '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: process.env.NODE_ENV === 'production' ? '1mb' : '10mb'
}));
app.use(cookieParser());

// Advanced compression
app.use(dynamicCompression);

// Static asset caching
app.use(staticAssetCache({
  maxAge: 31536000, // 1 year
  etag: true,
  immutable: true
}));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      'category',
      'tags',
      'type',
      'sort',
      'limit',
      'page',
      'price'
    ]
  })
);

// Serving static files with CDN integration
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1y' : '1d',
  etag: true,
  lastModified: true
}));

// Add request timestamp for debugging
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// 3) PRODUCTION ENDPOINTS

// Metrics endpoint for monitoring (protected)
app.get('/metrics', (req, res, next) => {
  // In production, add authentication middleware here
  if (process.env.NODE_ENV === 'production' && req.get('Authorization') !== `Bearer ${process.env.METRICS_TOKEN}`) {
    return next(new AppError('Unauthorized access to metrics', 401));
  }
  metricsEndpoint(req, res);
});

// Health check endpoints
app.use('/health', healthRouter);

// 4) API ROUTES WITH CACHING

// Authentication routes (no caching)
app.use('/api/v1/auth', authRouter);

// Family routes with smart caching
app.use('/api/v1/family', 
  createCacheMiddleware({
    ttl: 300, // 5 minutes for family data
    keyGenerator: (req) => `family:${req.user?.id || 'anonymous'}:${req.originalUrl}`,
    condition: (req) => req.method === 'GET'
  }),
  familyRouter
);

// AI routes with longer caching for analysis results
app.use('/api/v1/ai', 
  createCacheMiddleware({
    ttl: 1800, // 30 minutes for AI analysis
    keyGenerator: (req) => `ai:${req.user?.id || 'anonymous'}:${JSON.stringify(req.body)}`,
    condition: (req) => req.method === 'POST' && req.url.includes('/analyze')
  }),
  aiRouter
);

// Memory routes with timeline caching
app.use('/api/v1/memories',
  createCacheMiddleware({
    ttl: 600, // 10 minutes for memories
    keyGenerator: (req) => `memories:${req.user?.id || 'anonymous'}:${req.originalUrl}`,
    condition: (req) => req.method === 'GET'
  }),
  memoriesRouter
);

// Travel routes with recommendation caching
app.use('/api/v1/travel',
  createCacheMiddleware({
    ttl: 3600, // 1 hour for travel recommendations
    keyGenerator: (req) => `travel:${req.user?.id || 'anonymous'}:${req.originalUrl}:${JSON.stringify(req.query)}`,
    condition: (req) => req.method === 'GET' && req.url.includes('recommendations')
  }),
  travelRouter
);

// 5) ERROR HANDLING

// Handle unhandled routes
app.all('*', notFound);

// Error logging middleware
app.use(errorLogger);

// Global error handling middleware
app.use(globalErrorHandler);

export default app;
