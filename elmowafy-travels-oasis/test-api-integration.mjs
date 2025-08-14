/**
 * API Integration Test Script
 * 
 * This script tests the integration between the Node.js server and Python AI backend.
 * It verifies that both services are running and can communicate with each other.
 */

import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file directory (ESM equivalent of __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// API endpoints
const NODE_API_URL = process.env.NODE_API_URL || 'http://localhost:3000/api';
const PYTHON_AI_URL = process.env.PYTHON_AI_URL || 'http://localhost:8000';

// Test user credentials
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'test@example.com',
  password: process.env.TEST_USER_PASSWORD || 'password123',
};

// Log file
const LOG_FILE = path.join(__dirname, 'api-integration-test.log');

// Logger function
const log = (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(LOG_FILE, logMessage);
  console.log(message);
};

// Clear previous log
if (fs.existsSync(LOG_FILE)) {
  fs.unlinkSync(LOG_FILE);
}

// Log the Python API URL
log(`Using Python AI URL: ${PYTHON_AI_URL}`);

// Initialize axios instances
const nodeApi = axios.create({
  baseURL: NODE_API_URL,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const pythonApi = axios.create({
  baseURL: PYTHON_AI_URL,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Test functions
async function testNodeApiHealth() {
  try {
    const response = await nodeApi.get('/health');
    log(`✅ Node.js API Health Check: ${JSON.stringify(response.data)}`);
    return true;
  } catch (error) {
    log(`❌ Node.js API Health Check Failed: ${error.message}`);
    return false;
  }
}

async function testPythonApiHealth() {
  try {
    // Use the AI-specific health check endpoint
    const response = await pythonApi.get('/v1/ai/health');
    log(`✅ Python AI API Health Check: ${JSON.stringify(response.data)}`);
    return true;
  } catch (error) {
    log(`❌ Python AI API Health Check Failed: ${error.message}`);
    return false;
  }
}

async function testAuthentication() {
  try {
    const response = await nodeApi.post('/v1/auth/login', TEST_USER);
    const token = response.data.token;
    log(`✅ Authentication Successful: Token received`);
    
    // Set token for subsequent requests
    nodeApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    pythonApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    return token;
  } catch (error) {
    log(`❌ Authentication Failed: ${error.message}`);
    return null;
  }
}

async function testFamilyMembersEndpoint() {
  try {
    const response = await nodeApi.get('/familyMembers');
    log(`✅ Family Members Endpoint: Found ${response.data.data.length} members`);
    return response.data.data;
  } catch (error) {
    log(`❌ Family Members Endpoint Failed: ${error.message}`);
    return [];
  }
}

async function testFamilyAiContext(familyId = 'demo-family-001') {
  try {
    const response = await pythonApi.get(`/family-ai/context/${familyId}`);
    log(`✅ Family AI Context: ${JSON.stringify(response.data)}`);
    return true;
  } catch (error) {
    log(`❌ Family AI Context Failed: ${error.message}`);
    return false;
  }
}

async function testFamilyAiChat(familyId = 'demo-family-001') {
  try {
    const response = await pythonApi.post(`/family-ai/chat/${familyId}`, {
      message: 'Hello, can you tell me about our family?'
    });
    log(`✅ Family AI Chat: Response received`);
    log(`AI Response: ${response.data.response}`);
    return true;
  } catch (error) {
    log(`❌ Family AI Chat Failed: ${error.message}`);
    return false;
  }
}

async function testCrossDatabaseQuery() {
  try {
    // This test verifies that the Python backend can access data created in the Node.js backend
    // First, get family members from Node.js API
    const familyMembers = await testFamilyMembersEndpoint();
    if (familyMembers.length === 0) {
      log('⚠️ No family members found to test cross-database query');
      return false;
    }
    
    // Then, try to get AI insights for one of these members
    const memberId = familyMembers[0]._id;
    const response = await pythonApi.get(`/family-ai/member-insights/${memberId}`);
    
    log(`✅ Cross-Database Query: Successfully retrieved insights for member ${memberId}`);
    return true;
  } catch (error) {
    log(`❌ Cross-Database Query Failed: ${error.message}`);
    return false;
  }
}

// Main test function
async function runTests() {
  log('🚀 Starting API Integration Tests');
  log('==============================');
  
  // Test Node.js API health
  const nodeApiHealthy = await testNodeApiHealth();
  if (!nodeApiHealthy) {
    log('⛔ Node.js API is not healthy. Aborting tests.');
    return;
  }
  
  // Test Python AI API health
  const pythonApiHealthy = await testPythonApiHealth();
  if (!pythonApiHealthy) {
    log('⛔ Python AI API is not healthy. Aborting tests.');
    return;
  }
  
  // Test authentication
  const token = await testAuthentication();
  if (!token) {
    log('⛔ Authentication failed. Aborting tests.');
    return;
  }
  
  // Test family members endpoint
  await testFamilyMembersEndpoint();
  
  // Test Family AI context
  await testFamilyAiContext();
  
  // Test Family AI chat
  await testFamilyAiChat();
  
  // Test cross-database query
  await testCrossDatabaseQuery();
  
  log('==============================');
  log('🏁 API Integration Tests Completed');
}

// Run the tests
runTests().catch(error => {
  log(`❌ Unhandled Error: ${error.message}`);
  process.exit(1);
});