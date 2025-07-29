const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Create a test user in the database
 * @returns {Promise<Object>} The created user
 */
const createTestUser = async () => {
  const user = await User.create({
    name: 'Test User',
    email: 'test@example.com',
    password: 'test1234',
    passwordConfirm: 'test1234',
    role: 'admin'
  });
  
  // Don't return the password
  user.password = undefined;
  return user;
};

/**
 * Get an authentication token for a test user
 * @param {Object} user - The user object
 * @returns {String} JWT token
 */
const getAuthToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '90d' }
  );
};

/**
 * Clear all test data from the database
 */
const clearTestData = async () => {
  const collections = Object.keys(mongoose.connection.collections);
  
  for (const collectionName of collections) {
    const collection = mongoose.connection.collections[collectionName];
    try {
      await collection.deleteMany({});
    } catch (error) {
      // Handle error if collection doesn't exist
      if (error.name === 'MongoError' && error.code === 26) {
        console.warn(`Collection ${collectionName} does not exist`);
      } else {
        throw error;
      }
    }
  }
};

module.exports = {
  createTestUser,
  getAuthToken,
  clearTestData
};
