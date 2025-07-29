import { vectorDBService } from '@/lib/services/vector-db.service';
import { COLLECTIONS } from '@/lib/vector-db/utils';

async function testVectorDB() {
  console.log('Testing Vector Database Integration...');
  
  try {
    // Ensure the service is initialized
    await vectorDBService.initialize();
    console.log('✅ VectorDB service initialized successfully');
    
    const client = vectorDBService.getClient();
    
    // 1. Test listing collections
    console.log('\n📚 Listing collections...');
    const collections = await client.listCollections();
    console.log('Available collections:');
    console.table(collections.map(c => ({
      name: c.name,
      count: c.count,
      dimensions: c.dimensions,
      created: c.createdAt.toISOString().split('T')[0],
    })));
    
    // 2. Test semantic search
    console.log('\n🔍 Testing semantic search...');
    const testQueries = [
      'beach vacation',
      'historical sites',
      'family trip to Egypt',
    ];
    
    for (const query of testQueries) {
      console.log(`\nSearching for: "${query}"`);
      
      // Search across different collections
      const [travelResults, memoryResults] = await Promise.all([
        client.search(COLLECTIONS.TRAVEL_PLACES, query, { limit: 2 }),
        client.search(COLLECTIONS.MEMORIES, query, { limit: 1 }),
      ]);
      
      if (travelResults.length > 0) {
        console.log('\n🌍 Travel Destinations:');
        travelResults.forEach((result, i) => {
          const { name, country, type } = result.metadata as any;
          console.log(`  ${i + 1}. ${name}, ${country} (${type}) - Score: ${result.score.toFixed(3)}`);
          console.log(`     ${result.metadata.description?.substring(0, 100)}...`);
        });
      }
      
      if (memoryResults.length > 0) {
        console.log('\n📝 Family Memories:');
        memoryResults.forEach((result, i) => {
          const { title, location, date } = result.metadata as any;
          console.log(`  ${i + 1}. ${title} (${location}, ${date}) - Score: ${result.score.toFixed(3)}`);
          console.log(`     ${result.metadata.description?.substring(0, 100)}...`);
        });
      }
    }
    
    console.log('\n✅ Vector Database tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing Vector Database:', error);
    process.exit(1);
  }
}

// Run the tests
if (require.main === module) {
  testVectorDB();
}

export { testVectorDB };
