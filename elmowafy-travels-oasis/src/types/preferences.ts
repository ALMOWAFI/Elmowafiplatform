/**
 * User preferences for the Elmowafy platform
 */

export interface TravelPreferences {
  // Travel style
  travelStyle: 'adventure' | 'relaxation' | 'cultural' | 'family' | 'luxury' | 'budget' | 'mixed';
  
  // Accommodation preferences
  accommodation: {
    type: ('hotel' | 'apartment' | 'resort' | 'villa' | 'hostel')[];
    amenities: string[]; // e.g., 'pool', 'gym', 'spa', 'beachfront'
    rating: 1 | 2 | 3 | 4 | 5; // Minimum star rating
  };
  
  // Activity preferences
  activities: {
    interests: string[]; // e.g., 'hiking', 'museums', 'beach', 'shopping'
    pace: 'relaxed' | 'moderate' | 'fast';
    adventureLevel: 1 | 2 | 3 | 4 | 5;
    culturalInterest: 1 | 2 | 3 | 4 | 5;
  };
  
  // Budget preferences
  budget: {
    range: 'budget' | 'mid-range' | 'luxury';
    currency: string; // ISO currency code
    dailySpending: {
      min: number;
      max: number;
    };
  };
  
  // Food preferences
  food: {
    dietaryRestrictions: string[]; // e.g., 'vegetarian', 'vegan', 'halal', 'gluten-free'
    cuisinePreferences: string[]; // e.g., 'italian', 'asian', 'mediterranean'
    mealTimes: {
      breakfast: string;
      lunch: string;
      dinner: string;
    };
  };
  
  // Transportation preferences
  transportation: {
    preferredModes: ('flight' | 'train' | 'car' | 'bus')[];
    comfortLevel: 'economy' | 'business' | 'first';
    accessibilityNeeds: boolean;
  };
}

export interface FamilyPreferences {
  // Family composition
  familyMembers: {
    adults: number;
    children: number;
    childrenAges: number[];
    seniors: number;
  };
  
  // Family interests
  interests: string[];
  
  // Special requirements
  specialNeeds: {
    mobility: boolean;
    medicalConditions: string[];
    otherRequirements: string;
  };
}

export interface AIPreferences {
  // AI interaction
  assistantPersonality: 'friendly' | 'professional' | 'humorous' | 'concise' | 'detailed';
  
  // Notification preferences
  notifications: {
    email: boolean;
    push: boolean;
    inApp: boolean;
    frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  };
  
  // Privacy settings
  privacy: {
    shareTravelHistory: boolean;
    sharePreferences: boolean;
    dataCollection: 'minimal' | 'standard' | 'enhanced';
  };
}

export interface UserPreferences {
  // Core preferences
  userId: string;
  language: 'en' | 'ar';
  theme: 'light' | 'dark' | 'system';
  
  // Preference categories
  travel: TravelPreferences;
  family: FamilyPreferences;
  ai: AIPreferences;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Versioning for migrations
  version: number;
}

// Default preferences for new users
export const DEFAULT_PREFERENCES: Omit<UserPreferences, 'userId'> = {
  language: 'en',
  theme: 'system',
  travel: {
    travelStyle: 'mixed',
    accommodation: {
      type: ['hotel', 'apartment'],
      amenities: ['wifi', 'air-conditioning'],
      rating: 3,
    },
    activities: {
      interests: ['sightseeing', 'local-cuisine'],
      pace: 'moderate',
      adventureLevel: 3,
      culturalInterest: 3,
    },
    budget: {
      range: 'mid-range',
      currency: 'USD',
      dailySpending: {
        min: 50,
        max: 200,
      },
    },
    food: {
      dietaryRestrictions: [],
      cuisinePreferences: ['local', 'international'],
      mealTimes: {
        breakfast: '08:00',
        lunch: '13:00',
        dinner: '20:00',
      },
    },
    transportation: {
      preferredModes: ['flight', 'train'],
      comfortLevel: 'economy',
      accessibilityNeeds: false,
    },
  },
  family: {
    familyMembers: {
      adults: 2,
      children: 0,
      childrenAges: [],
      seniors: 0,
    },
    interests: [],
    specialNeeds: {
      mobility: false,
      medicalConditions: [],
      otherRequirements: '',
    },
  },
  ai: {
    assistantPersonality: 'friendly',
    notifications: {
      email: true,
      push: true,
      inApp: true,
      frequency: 'daily',
    },
    privacy: {
      shareTravelHistory: true,
      sharePreferences: false,
      dataCollection: 'standard',
    },
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  version: 1,
};

// Type for preference updates
export type PreferenceUpdate = Partial<{
  [K in keyof Omit<UserPreferences, 'userId' | 'createdAt' | 'updatedAt' | 'version'>]: 
    UserPreferences[K] extends object 
      ? Partial<UserPreferences[K]> 
      : UserPreferences[K]
}>;
