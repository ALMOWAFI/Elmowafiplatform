import { vectorDBService } from '@/lib/services/vector-db.service';
import { COLLECTIONS } from '@/lib/vector-db/utils';

// Sample travel destinations
export const SAMPLE_TRAVEL_DESTINATIONS = [
  {
    name: 'Sharm El Sheikh',
    nameAr: 'شرم الشيخ',
    description: 'A beautiful resort town between the desert of the Sinai Peninsula and the Red Sea, known for its sandy beaches, clear waters, and coral reefs.',
    descriptionAr: 'مدينة منتجعية جميلة بين صحراء شبه جزيرة سيناء والبحر الأحمر، تشتهر بشواطئها الرملية ومياهها الصافية والشعاب المرجانية.',
    country: 'Egypt',
    countryAr: 'مصر',
    type: 'beach',
    familyFriendly: true,
    bestTimeToVisit: ['spring', 'autumn'],
  },
  {
    name: 'Petra',
    nameAr: 'البتراء',
    description: 'Famous archaeological site in Jordan featuring rock-cut architecture and water conduit system. Also known as the Rose City due to the color of the stone.',
    descriptionAr: 'موقع أثري شهير في الأردن يتميز بهندسته المعمارية المنحوتة في الصخور ونظام القنوات المائية. تُعرف أيضًا باسم المدينة الوردية بسبب لون الحجر.',
    country: 'Jordan',
    countryAr: 'الأردن',
    type: 'historical',
    familyFriendly: true,
    bestTimeToVisit: ['spring', 'autumn'],
  },
  {
    name: 'Istanbul',
    nameAr: 'إسطنبول',
    description: 'Major city in Turkey that bridges Europe and Asia across the Bosphorus Strait. Known for its historic sites, including the Hagia Sophia and Blue Mosque.',
    descriptionAr: 'مدينة كبرى في تركيا تربط بين أوروبا وآسيا عبر مضيق البوسفور. تشتهر بمواقعها التاريخية، بما في ذلك آيا صوفيا والمسجد الأزرق.',
    country: 'Turkey',
    countryAr: 'تركيا',
    type: 'city',
    familyFriendly: true,
    bestTimeToVisit: ['spring', 'autumn'],
  },
];

// Sample family memories
export const SAMPLE_FAMILY_MEMORIES = [
  {
    title: 'Summer Vacation 2023',
    titleAr: 'عطلة الصيف 2023',
    description: 'Our wonderful family trip to Sharm El Sheikh where we enjoyed snorkeling and beach activities.',
    descriptionAr: 'رحلتنا العائلية الرائعة إلى شرم الشيخ حيث استمتعنا بالغوص والأنشطة الشاطئية.',
    location: 'Sharm El Sheikh, Egypt',
    date: '2023-07-15',
    participants: ['Ahmad', 'Marwa', 'Amr', 'Ali'],
    tags: ['beach', 'summer', 'family'],
  },
  {
    title: 'Historical Trip to Petra',
    titleAr: 'رحلة تاريخية إلى البتراء',
    description: 'Exploring the ancient city of Petra with the whole family. The kids loved the horse ride through the Siq.',
    descriptionAr: 'استكشاف مدينة البتراء القديمة مع العائلة بأكملها. أحب الأطفال ركوب الخيل عبر السيق.',
    location: 'Petra, Jordan',
    date: '2022-10-05',
    participants: ['Ahmad', 'Marwa', 'Amr', 'Ali', 'Hala'],
    tags: ['history', 'adventure', 'family'],
  },
];

async function initializeVectorDB() {
  console.log('Initializing Vector Database with sample data...');
  
  try {
    // Ensure the service is initialized
    await vectorDBService.initialize();
    const client = vectorDBService.getClient();
    
    // 1. Insert sample travel destinations
    console.log('Adding sample travel destinations...');
    const travelRecords = SAMPLE_TRAVEL_DESTINATIONS.map(destination => ({
      content: `${destination.name} (${destination.country}): ${destination.description}`,
      metadata: {
        ...destination,
        type: 'travel_destination',
      },
    }));
    
    await client.batchUpsert(COLLECTIONS.TRAVEL_PLACES, travelRecords);
    console.log(`Added ${travelRecords.length} travel destinations`);
    
    // 2. Insert sample family memories
    console.log('Adding sample family memories...');
    const memoryRecords = SAMPLE_FAMILY_MEMORIES.map(memory => ({
      content: `${memory.title}: ${memory.description}`,
      metadata: {
        ...memory,
        type: 'family_memory',
      },
    }));
    
    await client.batchUpsert(COLLECTIONS.MEMORIES, memoryRecords);
    console.log(`Added ${memoryRecords.length} family memories`);
    
    console.log('Vector Database initialization complete!');
    console.log('You can now use the vector database service in your application.');
    
  } catch (error) {
    console.error('Error initializing Vector Database:', error);
    process.exit(1);
  }
}

// Run the initialization
if (require.main === module) {
  initializeVectorDB();
}

export { initializeVectorDB };
