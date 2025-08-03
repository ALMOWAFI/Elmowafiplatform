import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables first
dotenv.config({ path: join(__dirname, 'config.env') });

// Import production utilities
import { logger, structuredLogger } from './utils/logger.js';
import { cacheManager } from './middleware/caching.js';
import { gracefulShutdown } from './middleware/errorHandler.js';
import { metricsCollector } from './middleware/monitoring.js';

// Handle uncaught exceptions (synchronous errors)
process.on('uncaughtException', err => {
  logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...', {
    error: err.message,
    stack: err.stack,
    type: 'uncaughtException'
  });
  process.exit(1);
});

import app from './app.js';
import { socketService } from './services/socketService.js';

// Production-ready database connection with monitoring
const connectDB = async () => {
  try {
    const DB = process.env.DATABASE.replace(
      '<PASSWORD>',
      process.env.DATABASE_PASSWORD
    );
    
    // MongoDB connection options for production
    const connectionOptions = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      bufferMaxEntries: 0, // Disable mongoose buffering
      bufferCommands: false, // Disable mongoose buffering
    };
    
    await mongoose.connect(DB, connectionOptions);
    
    logger.info('Database connection established', {
      category: 'database',
      event: 'connection_success',
      host: new URL(DB).hostname,
      database: new URL(DB).pathname.slice(1),
      timestamp: new Date().toISOString()
    });
    
    // MongoDB event listeners
    mongoose.connection.on('error', (err) => {
      logger.error('Database connection error', {
        category: 'database',
        event: 'connection_error',
        error: err.message,
        timestamp: new Date().toISOString()
      });
    });
    
    mongoose.connection.on('disconnected', () => {
      logger.warn('Database disconnected', {
        category: 'database',
        event: 'disconnection',
        timestamp: new Date().toISOString()
      });
    });
    
    mongoose.connection.on('reconnected', () => {
      logger.info('Database reconnected', {
        category: 'database',
        event: 'reconnection',
        timestamp: new Date().toISOString()
      });
    });
    
  } catch (error) {
    logger.error('Database connection failed', {
      category: 'database',
      event: 'connection_failure',
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    process.exit(1);
  }
};

// Production startup sequence
const startServer = async () => {
  try {
    // 1. Connect to database
    await connectDB();
    
    // 2. Initialize cache manager
    const cacheHealth = await cacheManager.healthCheck();
    logger.info('Cache system initialized', {
      category: 'system',
      event: 'cache_initialization',
      health: cacheHealth,
      timestamp: new Date().toISOString()
    });
    
    // 3. Start HTTP server
    const port = process.env.PORT || 3000;
    const server = app.listen(port, () => {
      logger.info('Server started successfully', {
        category: 'system',
        event: 'server_start',
        port,
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      });
    });
    
    // 4. Initialize WebSocket service
    socketService.initialize(server);
    logger.info('WebSocket service initialized', {
      category: 'system',
      event: 'websocket_initialization',
      timestamp: new Date().toISOString()
    });
    
    // 5. Setup metrics collection
    if (process.env.NODE_ENV === 'production') {
      metricsCollector.streamToClients(socketService.io);
      logger.info('Metrics collection started', {
        category: 'system',
        event: 'metrics_start',
        timestamp: new Date().toISOString()
      });
    }
    
    // 6. Setup graceful shutdown
    const shutdownHandler = gracefulShutdown(server);
    process.on('SIGTERM', shutdownHandler);
    process.on('SIGINT', shutdownHandler);
    
    // 7. Performance monitoring
    setInterval(() => {
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      // Log performance metrics
      logger.info('Performance metrics', {
        category: 'performance',
        event: 'system_metrics',
        memory: {
          rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
        },
        cpu: {
          user: cpuUsage.user / 1000000, // seconds
          system: cpuUsage.system / 1000000 // seconds
        },
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      });
      
      // Check for memory leaks
      if (memoryUsage.heapUsed > 512 * 1024 * 1024) { // 512MB threshold
        logger.warn('High memory usage detected', {
          category: 'performance',
          event: 'high_memory_usage',
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          timestamp: new Date().toISOString()
        });
      }
    }, 60000); // Every minute
    
    return server;
    
  } catch (error) {
    logger.error('Server startup failed', {
      category: 'system',
      event: 'startup_failure',
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    process.exit(1);
  }
};

// Start the server
startServer();

// Enhanced error handling
process.on('unhandledRejection', (reason, promise) => {
  logger.error('UNHANDLED REJECTION! 💥 Shutting down...', {
    category: 'error',
    event: 'unhandled_rejection',
    reason: reason.toString(),
    promise: promise.toString(),
    stack: reason.stack,
    timestamp: new Date().toISOString()
  });
  
  process.exit(1);
});

// Handle SIGTERM signal (for cloud deployments)
process.on('SIGTERM', () => {
  logger.info('👋 SIGTERM RECEIVED. Shutting down gracefully', {
    category: 'system',
    event: 'shutdown_signal',
    signal: 'SIGTERM',
    timestamp: new Date().toISOString()
  });
});

// Handle SIGINT signal (Ctrl+C)
process.on('SIGINT', () => {
  logger.info('👋 SIGINT RECEIVED. Shutting down gracefully', {
    category: 'system',
    event: 'shutdown_signal',
    signal: 'SIGINT',
    timestamp: new Date().toISOString()
  });
});
