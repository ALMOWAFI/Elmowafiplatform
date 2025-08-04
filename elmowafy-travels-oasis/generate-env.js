import { writeFileSync } from 'fs';
import { randomBytes } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Generate a secure random string for JWT secret
const generateSecret = () => {
  return randomBytes(32).toString('hex');
};

const envContent = `# Production Environment Variables
# ===================================
# WARNING: This file contains sensitive information.
# DO NOT commit it to version control.

# Frontend Configuration
VITE_API_URL=https://api.yourdomain.com/api
VITE_APP_VERSION=1.0.0

# Backend Configuration
NODE_ENV=production
PORT=5000

# Database Configuration
MONGODB_URI=mongodb://${process.env.MONGO_INITDB_ROOT_USERNAME || 'admin'}:${process.env.MONGO_INITDB_ROOT_PASSWORD || 'your_secure_password'}@mongo:27017/elmowafy-travels?authSource=admin

# JWT Configuration
JWT_SECRET=${generateSecret()}
JWT_EXPIRES_IN=7d

# CORS Configuration
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=15 * 60 * 1000  # 15 minutes
RATE_LIMIT_MAX=100  # 100 requests per window

# Logging
LOG_LEVEL=info
ENABLE_REQUEST_LOGGING=true

# Security
HELMET_ENABLED=true
CONTENT_SECURITY_POLICY_ENABLED=true
XSS_PROTECTION_ENABLED=true

# Session
SESSION_SECRET=${generateSecret()}
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_HTTP_ONLY=true
SESSION_COOKIE_SAME_SITE=lax
`;

// Write to .env file
writeFileSync(join(__dirname, '.env'), envContent);
console.log('Generated .env file with secure defaults.');

// Instructions
console.log('\nNext steps:');
console.log('1. Review the generated .env file');
console.log('2. Update the values as needed for your production environment');
console.log('3. Make sure to keep this file secure and never commit it to version control');
