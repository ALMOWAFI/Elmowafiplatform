import db from '../config/database.js';

async function testDatabase() {
  console.log('🚀 Starting database connection tests...');
  
  try {
    // Test PostgreSQL connection and sync models
    console.log('🔄 Testing PostgreSQL connection and syncing models...');
    await db.sync({ alter: true }); // Use { force: true } to drop and recreate tables
    
    // Test Redis connection
    console.log('🔍 Testing Redis connection...');
    await db.testRedis();
    
    console.log('✅ All database tests completed successfully!');
    
    // Close connections
    await db.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Database test failed:', error);
    process.exit(1);
  }
}

// Run the tests
testDatabase();
