import { errorTracker } from './monitoring.js';

// Custom error class
export class AppError extends Error {
  constructor(message, statusCode, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Development error handler
const sendErrorDev = (err, req, res) => {
  console.error('ERROR 💥', err);
  
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    requestId: req.requestId
  });
};

// Production error handler
const sendErrorProd = (err, req, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    });
  } 
  // Programming or other unknown error: don't leak error details
  else {
    // Log error
    console.error('ERROR 💥', err);
    
    // Track error for monitoring
    errorTracker.track(err, req, {
      severity: 'high',
      component: 'error-handler'
    });

    // Send generic message
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!',
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    });
  }
};

// Handle specific error types
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400, 'CAST_ERROR');
};

const handleDuplicateFieldsDB = (err) => {
  const value = err.errmsg?.match(/(["'])(\\?.)*?\1/)?.[0];
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400, 'DUPLICATE_FIELD');
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400, 'VALIDATION_ERROR');
};

const handleJWTError = () =>
  new AppError('Invalid token. Please log in again!', 401, 'JWT_ERROR');

const handleJWTExpiredError = () =>
  new AppError('Your token has expired! Please log in again.', 401, 'JWT_EXPIRED');

const handleMulterError = (err) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return new AppError('File size too large', 400, 'FILE_SIZE_ERROR');
  }
  if (err.code === 'LIMIT_FILE_COUNT') {
    return new AppError('Too many files uploaded', 400, 'FILE_COUNT_ERROR');
  }
  return new AppError('File upload error', 400, 'FILE_UPLOAD_ERROR');
};

// Rate limiting error handler
const handleRateLimitError = () => {
  return new AppError('Too many requests from this IP, please try again later.', 429, 'RATE_LIMIT');
};

// MongoDB connection error handler
const handleMongoNetworkError = () => {
  return new AppError('Database connection failed. Please try again later.', 503, 'DB_CONNECTION_ERROR');
};

// Main error handler middleware
export const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Track all errors for monitoring
  errorTracker.track(err, req, {
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    body: req.body,
    params: req.params,
    query: req.query
  });

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else {
    let error = { ...err };
    error.message = err.message;

    // Handle specific error types
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();
    if (error.name === 'MulterError') error = handleMulterError(error);
    if (error.statusCode === 429) error = handleRateLimitError();
    if (error.name === 'MongoNetworkError') error = handleMongoNetworkError();

    sendErrorProd(error, req, res);
  }
};

// Async error wrapper
export const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

// 404 handler
export const notFound = (req, res, next) => {
  const err = new AppError(`Can't find ${req.originalUrl} on this server!`, 404, 'NOT_FOUND');
  next(err);
};

// Graceful shutdown handler
export const gracefulShutdown = (server) => {
  return () => {
    console.log('Received shutdown signal, shutting down gracefully...');
    
    server.close(() => {
      console.log('HTTP server closed.');
      
      // Close database connections
      // mongoose.connection.close();
      
      // Exit process
      process.exit(0);
    });

    // If server hasn't finished in 10 seconds, shut down process
    setTimeout(() => {
      console.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };
};

// Unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err);
  
  errorTracker.track(err, null, {
    type: 'unhandledRejection',
    severity: 'critical'
  });
  
  process.exit(1);
});

// Uncaught exceptions
process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err);
  
  errorTracker.track(err, null, {
    type: 'uncaughtException',
    severity: 'critical'
  });
  
  process.exit(1);
});

export default {
  AppError,
  globalErrorHandler,
  catchAsync,
  notFound,
  gracefulShutdown
};