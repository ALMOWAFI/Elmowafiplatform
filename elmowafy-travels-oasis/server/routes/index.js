import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import hpp from 'hpp';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { auth } from '../middleware/auth.js';

// Import route files
import authRoutes from './api/v1/auth.js';
import adminRoutes from './api/v1/admin.js';
import aiRoutes from './api/v1/ai.js';
import activitiesRoutes from './api/activities.js';
// Import other route files as needed
// import userRoutes from './api/v1/users.js';
// import travelRoutes from './api/v1/travels.js';

const router = express.Router();

// Global middleware
// Set security HTTP headers
router.use(helmet());

// Enable CORS
router.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

// Development logging
if (process.env.NODE_ENV === 'development') {
  const morgan = await import('morgan');
  router.use(morgan.default('dev'));
}

// Limit requests from same API
const limiter = rateLimit({
  max: 100, // 100 requests per windowMs
  windowMs: 15 * 60 * 1000, // 15 minutes
  message: 'Too many requests from this IP, please try again in 15 minutes!'
});
router.use('/api', limiter);

// Body parser, reading data from body into req.body
router.use(express.json({ limit: '10kb' }));
router.use(express.urlencoded({ extended: true, limit: '10kb' }));
router.use(cookieParser());

// Data sanitization against NoSQL query injection
router.use(mongoSanitize());

// Data sanitization against XSS
router.use(xss());

// Prevent parameter pollution
router.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price'
    ]
  })
);

// Compression middleware
router.use(compression());

// Test middleware
router.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log('Request cookies:', req.cookies);
  next();
});

// API Routes
const apiRouter = express.Router();

// Health check endpoint
apiRouter.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Mount routes
apiRouter.use('/v1/auth', authRoutes);
apiRouter.use('/v1/admin', adminRoutes);
apiRouter.use('/v1/ai', aiRoutes);
// apiRouter.use('/v1/users', userRoutes);
// apiRouter.use('/v1/travels', travelRoutes);

// Mount API routes
router.use('/api', apiRouter);

// Mount additional non-versioned routes
router.use('/api', activitiesRoutes);

// Handle 404 - Route not found
router.all('*', (req, res, next) => {
  res.status(404).json({
    status: 'fail',
    message: `Can't find ${req.originalUrl} on this server!`
  });
});

// Global error handling middleware
router.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Default error status and message
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  
  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    err.message = 'Invalid token. Please log in again!';
    err.statusCode = 401;
  }
  
  if (err.name === 'TokenExpiredError') {
    err.message = 'Your token has expired! Please log in again.';
    err.statusCode = 401;
  }
  
  // Handle Sequelize validation errors
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    const errors = err.errors.map(e => e.message);
    err.message = `Invalid input data: ${errors.join('. ')}`;
    err.statusCode = 400;
  }
  
  // Send error response
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

export default router;
