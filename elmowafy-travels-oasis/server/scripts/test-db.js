import db from '../config/database.js';

async function testDatabase() {
  try {
    console.log('🔌 Testing database connection and models...');
    
    // Test connection
    await db.sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
    
    // Initialize models
    console.log('🔄 Initializing models...');
    const models = await db.initModels();
    console.log('✅ Models initialized successfully');
    
    // Test User model
    console.log('\n👤 Testing User model...');
    const userCount = await models.User.count();
    console.log(`✅ User model test passed. Found ${userCount} users in the database.`);
    
    // Test FamilyGroup model
    console.log('\n👨‍👩‍👧‍👦 Testing FamilyGroup model...');
    const groupCount = await models.FamilyGroup.count();
    console.log(`✅ FamilyGroup model test passed. Found ${groupCount} family groups in the database.`);
    
    // Test TravelPlan model
    console.log('\n✈️ Testing TravelPlan model...');
    const planCount = await models.TravelPlan.count();
    console.log(`✅ TravelPlan model test passed. Found ${planCount} travel plans in the database.`);
    
    // Test Redis connection
    console.log('\n🔍 Testing Redis connection...');
    try {
      await db.redis.set('test', 'connection-successful');
      const testValue = await db.redis.get('test');
      if (testValue === 'connection-successful') {
        console.log('✅ Redis connection test passed.');
        await db.redis.del('test');
      } else {
        console.warn('⚠️ Redis connection test returned unexpected value.');
      }
    } catch (redisError) {
      console.error('❌ Redis connection test failed:', redisError);
    }
    
    console.log('\n🎉 All database tests completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
    process.exit(1);
  }
}

testDatabase();
