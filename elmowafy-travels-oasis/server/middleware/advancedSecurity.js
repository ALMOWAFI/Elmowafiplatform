import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import helmet from 'helmet';
import { AppError } from './errorHandler.js';

// Advanced rate limiting configurations
export const createRateLimiters = () => {
  // General API rate limiter
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        status: 'error',
        message: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
      });
    }
  });

  // Authentication rate limiter (stricter)
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 auth requests per windowMs
    message: {
      error: 'Too many authentication attempts, please try again later.',
      retryAfter: '15 minutes'
    },
    skipSuccessfulRequests: true,
    handler: (req, res) => {
      res.status(429).json({
        status: 'error',
        message: 'Too many authentication attempts, please try again later.',
        retryAfter: '15 minutes'
      });
    }
  });

  // File upload rate limiter
  const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // limit each IP to 50 uploads per hour
    message: {
      error: 'Upload limit exceeded, please try again later.',
      retryAfter: '1 hour'
    }
  });

  // Speed limiter for suspicious activity
  const speedLimiter = slowDown({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 10, // allow 10 requests per windowMs without delay
    delayMs: 500, // add 500ms of delay per request after delayAfter
    maxDelayMs: 20000, // maximum delay of 20 seconds
  });

  return {
    general: generalLimiter,
    auth: authLimiter,
    upload: uploadLimiter,
    speed: speedLimiter
  };
};

// Advanced security headers
export const advancedHelmet = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.gpteng.co"],
      connectSrc: ["'self'", "wss:", "https:"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "blob:"],
      workerSrc: ["'self'", "blob:"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  permittedCrossDomainPolicies: false,
  crossOriginEmbedderPolicy: false // Allow for development
});

// Data encryption utilities
export const encryption = {
  // Encrypt sensitive data
  encrypt: (text, key = process.env.ENCRYPTION_KEY) => {
    if (!key) throw new Error('Encryption key not provided');
    
    const algorithm = 'aes-256-gcm';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, key);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  },

  // Decrypt sensitive data
  decrypt: (encryptedData, key = process.env.ENCRYPTION_KEY) => {
    if (!key) throw new Error('Encryption key not provided');
    
    const algorithm = 'aes-256-gcm';
    const decipher = crypto.createDecipher(algorithm, key);
    
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  },

  // Hash passwords with salt
  hashPassword: async (password) => {
    const saltRounds = 14; // Very secure
    return await bcrypt.hash(password, saltRounds);
  },

  // Verify password
  verifyPassword: async (password, hash) => {
    return await bcrypt.compare(password, hash);
  }
};

// Advanced JWT utilities
export const jwtUtils = {
  // Generate access token
  generateAccessToken: (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
      issuer: 'elmowafy-platform',
      audience: 'elmowafy-users',
      algorithm: 'HS256'
    });
  },

  // Generate refresh token
  generateRefreshToken: (payload) => {
    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      issuer: 'elmowafy-platform',
      audience: 'elmowafy-users',
      algorithm: 'HS256'
    });
  },

  // Verify token with enhanced security
  verifyToken: (token, secret = process.env.JWT_SECRET) => {
    try {
      return jwt.verify(token, secret, {
        issuer: 'elmowafy-platform',
        audience: 'elmowafy-users',
        algorithms: ['HS256']
      });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new AppError('Token has expired', 401);
      } else if (error.name === 'JsonWebTokenError') {
        throw new AppError('Invalid token', 401);
      } else {
        throw new AppError('Token verification failed', 401);
      }
    }
  },

  // Rotate tokens for enhanced security
  rotateTokens: (userId, deviceId) => {
    const payload = { 
      userId, 
      deviceId,
      iat: Math.floor(Date.now() / 1000),
      jti: crypto.randomUUID() // Unique token ID
    };

    return {
      accessToken: jwtUtils.generateAccessToken(payload),
      refreshToken: jwtUtils.generateRefreshToken(payload)
    };
  }
};

// Input validation and sanitization
export const inputSecurity = {
  // Sanitize user input
  sanitizeInput: (input) => {
    if (typeof input !== 'string') return input;
    
    return input
      .trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .replace(/[<>]/g, ''); // Remove < and > characters
  },

  // Validate email format
  validateEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Validate password strength
  validatePassword: (password) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const score = [
      password.length >= minLength,
      hasUpperCase,
      hasLowerCase,
      hasNumbers,
      hasSpecialChar
    ].filter(Boolean).length;

    return {
      isValid: score >= 4,
      score,
      requirements: {
        minLength: password.length >= minLength,
        hasUpperCase,
        hasLowerCase,
        hasNumbers,
        hasSpecialChar
      }
    };
  },

  // Validate file uploads
  validateFileUpload: (file, allowedTypes, maxSize = 10 * 1024 * 1024) => {
    const errors = [];

    if (!allowedTypes.includes(file.mimetype)) {
      errors.push(`File type ${file.mimetype} is not allowed`);
    }

    if (file.size > maxSize) {
      errors.push(`File size exceeds maximum limit of ${maxSize / (1024 * 1024)}MB`);
    }

    // Check for malicious file names
    if (/[<>:"/\\|?*]/.test(file.originalname)) {
      errors.push('File name contains invalid characters');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
};

// Session management
export const sessionManager = {
  // Create secure session
  createSession: async (userId, deviceInfo, ipAddress) => {
    const sessionId = crypto.randomUUID();
    const sessionData = {
      userId,
      sessionId,
      deviceInfo: {
        userAgent: deviceInfo.userAgent,
        ip: ipAddress,
        browser: deviceInfo.browser,
        os: deviceInfo.os
      },
      createdAt: new Date(),
      lastActivity: new Date(),
      isActive: true
    };

    // Store session in database (implement based on your session storage)
    // await SessionModel.create(sessionData);

    return sessionId;
  },

  // Validate session
  validateSession: async (sessionId, userId) => {
    // Check if session exists and is valid
    // const session = await SessionModel.findOne({ sessionId, userId, isActive: true });
    
    // For now, return true (implement based on your session storage)
    return true;
  },

  // Invalidate session
  invalidateSession: async (sessionId) => {
    // Mark session as inactive
    // await SessionModel.updateOne({ sessionId }, { isActive: false, endedAt: new Date() });
    return true;
  }
};

// API key management for third-party integrations
export const apiKeyManager = {
  // Generate API key
  generateApiKey: () => {
    return crypto.randomBytes(32).toString('hex');
  },

  // Hash API key for storage
  hashApiKey: (apiKey) => {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  },

  // Validate API key
  validateApiKey: async (providedKey, storedHash) => {
    const hashedProvided = apiKeyManager.hashApiKey(providedKey);
    return hashedProvided === storedHash;
  }
};

// Audit logging
export const auditLogger = {
  // Log security events
  logSecurityEvent: (eventType, userId, details, ipAddress) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'SECURITY',
      event: eventType,
      userId,
      details,
      ipAddress,
      severity: getSeverityLevel(eventType)
    };

    // Log to file or database
    console.log('SECURITY_AUDIT:', JSON.stringify(logEntry));
    
    // In production, send to logging service
    // await LoggingService.send(logEntry);
  },

  // Log data access
  logDataAccess: (resource, action, userId, success, ipAddress) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'DATA_ACCESS',
      resource,
      action,
      userId,
      success,
      ipAddress
    };

    console.log('DATA_ACCESS_AUDIT:', JSON.stringify(logEntry));
  }
};

// Helper function to get severity level
const getSeverityLevel = (eventType) => {
  const severityMap = {
    'LOGIN_ATTEMPT': 'INFO',
    'LOGIN_SUCCESS': 'INFO',
    'LOGIN_FAILURE': 'WARNING',
    'MULTIPLE_LOGIN_FAILURES': 'HIGH',
    'PASSWORD_CHANGE': 'INFO',
    'ACCOUNT_LOCKED': 'HIGH',
    'DATA_BREACH_ATTEMPT': 'CRITICAL',
    'UNAUTHORIZED_ACCESS': 'HIGH',
    'SUSPICIOUS_ACTIVITY': 'WARNING'
  };

  return severityMap[eventType] || 'INFO';
};

// Security monitoring
export const securityMonitor = {
  // Detect suspicious activities
  detectSuspiciousActivity: (req) => {
    const suspiciousPatterns = [
      /union.*select/i, // SQL injection
      /<script/i, // XSS
      /\.\.\//g, // Path traversal
      /exec\s*\(/i, // Command injection
    ];

    const userInput = JSON.stringify(req.body) + req.originalUrl;
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(userInput)) {
        auditLogger.logSecurityEvent(
          'SUSPICIOUS_ACTIVITY',
          req.user?.id,
          { pattern: pattern.toString(), input: userInput },
          req.ip
        );
        return true;
      }
    }

    return false;
  },

  // Check for brute force attempts
  isBruteForceAttempt: (req) => {
    // This would typically check against a cache/database
    // For now, return false
    return false;
  }
};

export default {
  createRateLimiters,
  advancedHelmet,
  encryption,
  jwtUtils,
  inputSecurity,
  sessionManager,
  apiKeyManager,
  auditLogger,
  securityMonitor
};