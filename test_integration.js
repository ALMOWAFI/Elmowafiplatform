// Test script to verify API integration
const axios = require('axios');

async function testAPIIntegration() {
  console.log('🧪 Testing API Integration...\n');

  // Test 1: Check if main server is responding
  try {
    console.log('1️⃣ Testing main server health...');
    const healthResponse = await axios.get('http://localhost:3000/health');
    console.log('✅ Main server is healthy:', healthResponse.data);
  } catch (error) {
    console.log('❌ Main server not responding:', error.message);
    return;
  }

  // Test 2: Check AI service health through API gateway
  try {
    console.log('\n2️⃣ Testing AI service integration...');
    const aiHealthResponse = await axios.get('http://localhost:3000/api/v1/ai/health', {
      headers: {
        'Authorization': 'Bearer test-token' // You'd need a real token
      }
    });
    console.log('✅ AI service integration working:', aiHealthResponse.data);
  } catch (error) {
    console.log('❌ AI service integration issue:', error.response?.data || error.message);
  }

  // Test 3: Check teaching styles endpoint
  try {
    console.log('\n3️⃣ Testing teaching styles endpoint...');
    const stylesResponse = await axios.get('http://localhost:3000/api/v1/ai/teaching-styles', {
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });
    console.log('✅ Teaching styles loaded:', stylesResponse.data);
  } catch (error) {
    console.log('❌ Teaching styles endpoint issue:', error.response?.data || error.message);
  }

  console.log('\n✨ Integration test complete!');
}

// Only run if this file is executed directly
if (require.main === module) {
  testAPIIntegration().catch(console.error);
}

module.exports = { testAPIIntegration };