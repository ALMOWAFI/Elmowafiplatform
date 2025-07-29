import { Router } from 'express';
const router = Router();
import mongoose from 'mongoose';

/**
 * @route   GET /health
 * @desc    Health check endpoint
 * @access  Public
 */
router.get('/', async (req, res) => {
  const healthcheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now(),
    checks: {
      database: 'checking...',
    },
  };

  try {
    // Check database connection
    await mongoose.connection.db.admin().ping();
    healthcheck.checks.database = 'OK';
    
    // Add more checks here as needed
    
    res.status(200).json(healthcheck);
  } catch (error) {
    healthcheck.message = 'Service Unavailable';
    healthcheck.checks.database = 'Error: ' + error.message;
    res.status(200).json(healthcheck);
  }
});

export default router;
