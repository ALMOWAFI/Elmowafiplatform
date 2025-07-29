// Set up environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '90d';
process.env.MONGODB_URI = 'mongodb://localhost:27017/elmowafy-test';

// Increase timeout for tests that interact with the database
jest.setTimeout(30000);

// Global test setup
beforeAll(async () => {
  // Any global setup that needs to happen before all tests
});

afterAll(async () => {
  // Clean up any resources after all tests
  const { mongoose } = require('mongoose');
  await mongoose.connection.close();
});

// Global test teardown
afterEach(async () => {
  // Clean up the database after each test
  const { clearTestData } = require('./testUtils');
  await clearTestData();
});
