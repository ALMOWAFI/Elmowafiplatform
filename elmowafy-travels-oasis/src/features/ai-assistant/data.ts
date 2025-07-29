import { Conversation, ChatMessage, AIAssistantOptions, TravelSuggestion } from './types';

/**
 * Sample conversations for the AI Assistant
 */
export const sampleConversations: Conversation[] = [
  {
    id: 'conv-1',
    title: 'Trip to Egypt',
    arabicTitle: 'رحلة إلى مصر',
    messages: [
      {
        id: 'msg-1',
        role: 'user',
        content: 'I want to plan a family trip to Egypt this summer. What are the best places to visit with children?',
        timestamp: new Date('2025-05-01T10:30:00')
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: 'Egypt is a wonderful destination for families! Here are some must-visit places that are great for children:\n\n1. **Cairo** - The Egyptian Museum has a special children\'s section, and the pyramids of Giza are awe-inspiring for all ages.\n\n2. **Luxor** - The temples and ancient sites here are like stepping into a history book. Consider a hot air balloon ride over the Valley of the Kings.\n\n3. **Sharm El-Sheikh** - Perfect for beach days and snorkeling in the Red Sea. Many resorts offer kids\' clubs and family activities.\n\n4. **Alexandria** - The Bibliotheca Alexandrina has excellent children\'s programs and workshops.\n\nThe best time to visit is between October and April when temperatures are milder. Would you like specific hotel recommendations that are family-friendly?',
        timestamp: new Date('2025-05-01T10:31:00')
      },
      {
        id: 'msg-3',
        role: 'user',
        content: 'Yes, please suggest some family-friendly hotels. Also, how many days should we plan for Cairo?',
        timestamp: new Date('2025-05-01T10:32:00')
      },
      {
        id: 'msg-4',
        role: 'assistant',
        content: 'For family-friendly hotels in Egypt, I recommend:\n\n**Cairo:**\n- Marriott Mena House - Located near the pyramids with beautiful gardens and pools\n- Steigenberger Hotel El Tahrir - Central location with family rooms\n\n**Luxor:**\n- Hilton Luxor Resort & Spa - Kids pool and activities\n- Sofitel Winter Palace - Historic hotel with gardens for kids to explore\n\n**Sharm El-Sheikh:**\n- Rixos Sharm El Sheikh - Great all-inclusive with water parks\n- Movenpick Resort - Kid-friendly beaches and activities\n\nFor Cairo, I recommend spending at least 3-4 days to cover the main attractions:\n- Day 1: Pyramids of Giza and the Sphinx\n- Day 2: Egyptian Museum and Khan el-Khalili bazaar\n- Day 3: Coptic Cairo and the Citadel\n- Day 4: Day trip to Saqqara and Memphis\n\nThis gives you enough time to see the highlights without rushing, especially important with children who may need breaks between sightseeing. Would you like me to suggest a full itinerary for your Egypt trip?',
        timestamp: new Date('2025-05-01T10:33:00')
      }
    ],
    createdAt: new Date('2025-05-01T10:30:00'),
    updatedAt: new Date('2025-05-01T10:33:00'),
    summary: 'Planning a family trip to Egypt with recommendations for child-friendly destinations and accommodations',
    arabicSummary: 'تخطيط رحلة عائلية إلى مصر مع توصيات للوجهات والإقامة المناسبة للأطفال',
    category: 'travel-planning'
  },
  {
    id: 'conv-2',
    title: 'Historical landmarks in Istanbul',
    arabicTitle: 'المعالم التاريخية في اسطنبول',
    messages: [
      {
        id: 'msg-1',
        role: 'user',
        content: 'What are the must-see historical sites in Istanbul?',
        timestamp: new Date('2025-04-15T14:20:00')
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: 'Istanbul is a treasure trove of historical sites spanning multiple empires! Here are the must-see historical landmarks:\n\n1. **Hagia Sophia (Ayasofya)** - Once a church, then a mosque, then a museum, and now a mosque again. Its massive dome and Byzantine mosaics are breathtaking.\n\n2. **Blue Mosque (Sultan Ahmed Mosque)** - Famous for its blue Iznik tiles and six minarets.\n\n3. **Topkapi Palace** - Home to Ottoman sultans for nearly 400 years. Don\'t miss the Harem, Imperial Treasury, and Holy Relics sections.\n\n4. **Basilica Cistern** - This underground marvel was featured in the James Bond film "From Russia With Love."\n\n5. **Grand Bazaar** - One of the world\'s oldest and largest covered markets with over 4,000 shops.\n\n6. **Suleymaniye Mosque** - Suleiman the Magnificent\'s architectural masterpiece with stunning views of the city.\n\n7. **Chora Church (Kariye Museum)** - Houses some of the finest Byzantine mosaics and frescoes.\n\n8. **Dolmabahçe Palace** - The more modern Ottoman palace on the Bosphorus with European-inspired design.\n\nWould you like tips on the best times to visit these sites to avoid crowds?',
        timestamp: new Date('2025-04-15T14:21:00')
      }
    ],
    createdAt: new Date('2025-04-15T14:20:00'),
    updatedAt: new Date('2025-04-15T14:21:00'),
    summary: 'Information about the most significant historical landmarks to visit in Istanbul',
    arabicSummary: 'معلومات حول أهم المعالم التاريخية للزيارة في اسطنبول',
    category: 'recommendations'
  }
];

/**
 * Sample travel suggestions for the AI Assistant
 */
export const sampleTravelSuggestions: TravelSuggestion[] = [
  {
    id: 'suggestion-1',
    locationName: 'Petra, Jordan',
    arabicLocationName: 'البتراء، الأردن',
    description: 'The ancient city of Petra, carved into rose-colored rock faces, offers a glimpse into the impressive civilization of the Nabataeans. Walk through the Siq to reveal the stunning Treasury facade.',
    arabicDescription: 'مدينة البتراء القديمة، المنحوتة في واجهات صخرية وردية اللون، تقدم لمحة عن حضارة الأنباط المثيرة للإعجاب. امشِ عبر السيق لتكشف عن واجهة الخزنة المذهلة.',
    imageUrl: '/travel/petra.jpg',
    bestTimeToVisit: 'March-May, September-November',
    estimatedBudget: '$120-180 per day',
    familyFriendlyRating: 4,
    culturalRating: 5,
    adventureRating: 4,
    relaxationRating: 3,
    recommendedDuration: '2-3 days',
    suggestedActivities: [
      'Hike to the Monastery',
      'Visit Petra by Night',
      'Explore Little Petra',
      'Take a cooking class in nearby Wadi Musa'
    ],
    arabicSuggestedActivities: [
      'التنزه إلى الدير',
      'زيارة البتراء ليلاً',
      'استكشاف البتراء الصغيرة',
      'أخذ دورة طبخ في وادي موسى القريب'
    ]
  },
  {
    id: 'suggestion-2',
    locationName: 'Cappadocia, Turkey',
    arabicLocationName: 'كابادوكيا، تركيا',
    description: 'Famous for its fairy chimneys, cave dwellings, and hot air balloon rides over otherworldly landscapes. The region offers unique accommodations in cave hotels and a rich history spanning millennia.',
    arabicDescription: 'مشهورة بمداخنها الخيالية، ومساكن الكهوف، ورحلات البالون الساخن فوق المناظر الطبيعية الخيالية. توفر المنطقة أماكن إقامة فريدة في فنادق الكهوف وتاريخًا غنيًا يمتد لآلاف السنين.',
    imageUrl: '/travel/cappadocia.jpg',
    bestTimeToVisit: 'April-June, September-October',
    estimatedBudget: '$100-150 per day',
    familyFriendlyRating: 5,
    culturalRating: 4,
    adventureRating: 5,
    relaxationRating: 4,
    recommendedDuration: '3-4 days',
    suggestedActivities: [
      'Hot air balloon ride at sunrise',
      'Explore Göreme Open Air Museum',
      'Visit underground cities',
      'Hike through Love Valley',
      'ATV adventure through valleys'
    ],
    arabicSuggestedActivities: [
      'ركوب البالون الهوائي عند شروق الشمس',
      'استكشف متحف جوريمي المفتوح',
      'زيارة المدن تحت الأرض',
      'التنزه عبر وادي الحب',
      'مغامرة ATV عبر الوديان'
    ]
  }
];

/**
 * AI Assistant personas inspired by the hackathon teaching styles
 */
export const assistantPersonas = {
  historian: {
    name: 'Professor Tarikh',
    arabicName: 'البروفيسور تاريخ',
    description: 'A wise historian who provides context for every location through the lens of history',
    arabicDescription: 'مؤرخ حكيم يقدم سياقًا لكل موقع من خلال عدسة التاريخ',
    tone: 'scholarly and enlightening',
    specialties: ['historical sites', 'cultural contexts', 'architectural history'],
    promptTemplate: 'As Professor Tarikh, a distinguished historian, provide advice on {query}. Include historical context, cultural significance, and lesser-known historical facts.'
  },
  adventurer: {
    name: 'Captain Rihla',
    arabicName: 'كابتن رحلة',
    description: 'An enthusiastic explorer who focuses on adventure and off-the-beaten-path experiences',
    arabicDescription: 'مستكشف متحمس يركز على المغامرة والتجارب في المسارات غير المطروقة',
    tone: 'energetic and inspiring',
    specialties: ['adventure travel', 'outdoor activities', 'unique experiences'],
    promptTemplate: 'As Captain Rihla, an intrepid adventurer, answer {query} with excitement. Suggest adventurous activities, hidden gems, and memorable experiences that will create amazing stories.'
  },
  culturalist: {
    name: 'Madame Thaqafa',
    arabicName: 'مدام ثقافة',
    description: 'A cultural connoisseur who knows all about local customs, traditions, arts, and cuisine',
    arabicDescription: 'خبيرة ثقافية تعرف كل شيء عن العادات المحلية والتقاليد والفنون والمطبخ',
    tone: 'sophisticated and articulate',
    specialties: ['cultural immersion', 'local cuisine', 'arts and handicrafts'],
    promptTemplate: 'As Madame Thaqafa, a cultural connoisseur, respond to {query} with elegance. Highlight authentic cultural experiences, culinary delights, and artistic expressions of the region.'
  },
  familyExpert: {
    name: 'Uncle Aila',
    arabicName: 'عمو عائلة',
    description: 'A warm, family-focused guide who specializes in travel that's fun and educational for all ages',
    arabicDescription: 'مرشد دافئ يركز على العائلة ويتخصص في السفر الممتع والتعليمي لجميع الأعمار',
    tone: 'friendly and reassuring',
    specialties: ['family activities', 'child-friendly accommodations', 'educational experiences'],
    promptTemplate: 'As Uncle Aila, a family travel expert, address {query} with warmth and practical advice. Focus on activities that both children and adults will enjoy, safety considerations, and creating precious family memories.'
  },
  luxuryConnoisseur: {
    name: 'Lady Rafahiya',
    arabicName: 'السيدة رفاهية',
    description: 'An elegant luxury travel specialist who knows the finest experiences each destination has to offer',
    arabicDescription: 'متخصصة أنيقة في السفر الفاخر تعرف أرقى التجارب التي تقدمها كل وجهة',
    tone: 'refined and discerning',
    specialties: ['luxury accommodations', 'fine dining', 'exclusive experiences'],
    promptTemplate: 'As Lady Rafahiya, a luxury travel connoisseur, respond to {query} with sophistication. Recommend the most exquisite accommodations, exceptional dining experiences, and exclusive activities that discerning travelers would appreciate.'
  },
  budgetNomad: {
    name: 'Seeker Tawfeer',
    arabicName: 'الباحث توفير',
    description: 'A resourceful budget traveler who knows how to experience destinations authentically without breaking the bank',
    arabicDescription: 'مسافر مقتصد ذو موارد يعرف كيفية تجربة الوجهات بشكل أصيل دون إنفاق الكثير',
    tone: 'practical and encouraging',
    specialties: ['budget travel', 'local experiences', 'money-saving tips'],
    promptTemplate: 'As Seeker Tawfeer, a savvy budget traveler, address {query} with practical wisdom. Share money-saving strategies, affordable yet authentic experiences, and tips for enjoying destinations without overspending.'
  }
};

/**
 * Helper functions for working with Supabase
 */
export const supabaseHelpers = {
  /**
   * Formats a conversation for storing in Supabase
   */
  formatConversationForStorage: (conversation: Conversation) => {
    return {
      id: conversation.id,
      title: conversation.title,
      arabic_title: conversation.arabicTitle,
      messages: JSON.stringify(conversation.messages),
      created_at: conversation.createdAt,
      updated_at: conversation.updatedAt,
      summary: conversation.summary,
      arabic_summary: conversation.arabicSummary,
      category: conversation.category
    };
  },

  /**
   * Formats a conversation from Supabase response
   */
  formatConversationFromResponse: (data: any): Conversation => {
    return {
      id: data.id,
      title: data.title,
      arabicTitle: data.arabic_title,
      messages: JSON.parse(data.messages),
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      summary: data.summary,
      arabicSummary: data.arabic_summary,
      category: data.category as any
    };
  }
};

/**
 * Default AI Assistant options
 */
export const defaultAssistantOptions: AIAssistantOptions = {
  personality: 'helpful',
  temperature: 0.7,
  includeContextualInfo: true,
  includePersonalNotes: true,
  language: 'en'
};
