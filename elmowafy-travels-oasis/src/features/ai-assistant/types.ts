/**
 * Enhanced Types for the AI Assistant Feature
 */

// Media types for rich assistant responses
export interface MediaContent {
  id: string;
  type: 'image' | 'map' | 'chart' | 'video' | '3d-model' | 'audio';
  url: string;
  caption?: {
    en: string;
    ar: string;
  };
  thumbnailUrl?: string;
  interactionData?: any; // For interactive elements
}

// Rich format message content with support for markdown, media, and interactive elements
export interface RichMessageContent {
  text: string;
  textAr?: string; // Arabic version of the text
  markdown?: boolean; // Whether the text should be rendered as markdown
  media?: MediaContent[];
  locationReferences?: {
    id: string;
    name: string;
    nameAr?: string;
    coordinates: [number, number]; // [longitude, latitude]
  }[];
  familyReferences?: {
    id: string;
    name: string;
    nameAr?: string;
    relation?: string;
    relationAr?: string;
  }[];
  interactiveElements?: {
    type: 'button' | 'slider' | 'dropdown' | 'datepicker' | 'rating' | 'quiz';
    id: string;
    data: any; // Specific to the interactive element type
    actionType: 'suggest' | 'filter' | 'navigate' | 'book' | 'save' | 'share';
  }[];
}

// Enhanced chat message with rich content support
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'memory';
  content: string | RichMessageContent;
  timestamp: Date;
  isLoading?: boolean;
  isError?: boolean;
  sentiment?: 'positive' | 'negative' | 'neutral';
  language?: 'en' | 'ar' | 'mixed';
  voiceData?: {
    url?: string;
    duration?: number;
    transcription?: string;
  };
  reactions?: {
    helpful?: boolean;
    saved?: boolean;
    shared?: boolean;
    favorite?: boolean;
  };
}

// Cultural context for culturally-aware responses
export interface CulturalContext {
  region: string;
  religiousConsiderations?: string[];
  localCustoms?: string[];
  dietaryRestrictions?: string[];
  culturalSensitivities?: string[];
  localPhrases?: {
    phrase: string;
    meaning: string;
    pronunciation?: string;
  }[];
}

// Travel memory for contextual understanding
export interface TravelMemory {
  id: string;
  location: {
    id: string;
    name: string;
    nameAr?: string;
    coordinates: [number, number];
  };
  date: string;
  familyMembers: string[];
  experiences: string[];
  experiencesAr?: string[];
  photos?: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  highlights?: string[];
  highlightsAr?: string[];
  notes?: string;
  notesAr?: string;
}

// Enhanced conversation with metadata and context
export interface Conversation {
  id: string;
  title: string;
  titleAr?: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  summary?: string;
  summaryAr?: string;
  category: 'travel-planning' | 'general' | 'family-history' | 'recommendations' | 'cultural-exploration' | 'family-activities' | 'budgeting' | 'memory-collection';
  tags?: string[];
  relatedTravelMemories?: string[]; // IDs of related travel memories
  relatedFamilyMembers?: string[]; // IDs of related family members
  relatedLocations?: string[]; // IDs of related locations
  status?: 'active' | 'archived' | 'shared';
  visibility?: 'private' | 'family' | 'public';
  language?: 'en' | 'ar' | 'bilingual';
}

// Enhanced AI Assistant options for more personalized interactions
export interface AIAssistantOptions {
  personality: 'helpful' | 'enthusiastic' | 'humorous' | 'professional' | 'concise' | 'detailed' | 'storyteller' | 'culturalGuide';
  knowledgeLevel: 'basic' | 'intermediate' | 'expert';
  temperature: number; // 0-1, higher means more creative/random
  includeContextualInfo: boolean; // Whether to include family and travel history
  includePersonalNotes: boolean; // Whether to include personal preferences
  includeCulturalContext: boolean; // Whether to include cultural sensitivities and context
  language: 'en' | 'ar' | 'bilingual';
  responseStyle: 'concise' | 'detailed' | 'conversational' | 'educational' | 'entertaining';
  focusAreas?: ('cultural' | 'historical' | 'family-friendly' | 'adventure' | 'culinary' | 'budget' | 'luxury' | 'local-experience')[];
  voiceEnabled: boolean;
  voiceId?: string; // Voice identity for text-to-speech
}

// Enhanced context for the AI Assistant
export interface AIAssistantContext {
  familyMembers?: {
    id: string;
    name: string;
    nameAr?: string;
    age?: number;
    preferences?: {
      food?: string[];
      activities?: string[];
      accommodations?: string[];
    };
    travelHistory?: string[];
    healthConsiderations?: string[];
  }[];
  travelHistory?: {
    locationId: string;
    date: string;
    experience: 'positive' | 'neutral' | 'negative';
    highlights?: string[];
  }[];
  plannedTrips?: {
    locationId: string;
    dates?: {
      start: string;
      end: string;
    };
    budget?: number;
    accommodations?: string;
    activities?: string[];
    transportationType?: string;
  }[];
  personalPreferences?: {
    foodPreferences?: string[];
    accommodationType?: string[];
    travelStyle?: 'luxurious' | 'budget' | 'adventure' | 'relaxed' | 'cultural' | 'educational' | 'mix';
    interests?: string[];
    pacePreference?: 'slow' | 'moderate' | 'fast';
    specialRequirements?: string[];
    photoOpportunities?: boolean;
    shoppingInterest?: boolean;
    localExperiences?: boolean;
    guidedTours?: boolean;
  };
  culturalContext?: CulturalContext;
  savedMemories?: TravelMemory[];
  currentLocation?: {
    coordinates: [number, number];
    timezone: string;
    country: string;
  };
}

// Enhanced travel suggestion with rich details
export interface TravelSuggestion {
  id: string;
  locationName: string;
  locationNameAr: string;
  description: string;
  descriptionAr: string;
  images?: string[];
  mapPreview?: string;
  bestTimeToVisit?: {
    seasons: ('spring' | 'summer' | 'fall' | 'winter')[];
    months?: number[];
    description?: string;
    descriptionAr?: string;
  };
  weatherInfo?: {
    averageTemperature?: {
      celsius: number;
      fahrenheit: number;
    };
    rainfallProbability?: number;
    seasonalConsiderations?: string;
  };
  estimatedBudget?: {
    currency: string;
    range: {
      min: number;
      max: number;
    };
    accommodation?: {
      budget: number;
      standard: number;
      luxury: number;
    };
    meals?: {
      budget: number;
      standard: number;
      luxury: number;
    };
    activities?: {
      free: string[];
      paid: {
        activity: string;
        cost: number;
      }[];
    };
  };
  ratings: {
    familyFriendly: number; // 1-5
    cultural: number; // 1-5
    adventure: number; // 1-5
    relaxation: number; // 1-5
    value: number; // 1-5
    safety: number; // 1-5
    accessibility: number; // 1-5
    photography: number; // 1-5
  };
  recommendedDuration: {
    min: number; // days
    max: number; // days
    optimal: number; // days
  };
  suggestedActivities: {
    name: string;
    nameAr: string;
    description?: string;
    descriptionAr?: string;
    category: 'cultural' | 'adventure' | 'relaxation' | 'family' | 'culinary' | 'nature' | 'educational';
    duration?: number; // in hours
    cost?: {
      currency: string;
      amount: number;
    };
    bestTimeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night' | 'anytime';
    recommended?: boolean;
  }[];
  localCuisine?: {
    dishes: {
      name: string;
      nameAr: string;
      description?: string;
      descriptionAr?: string;
      image?: string;
      dietaryNotes?: string[];
      familyFriendly?: boolean;
    }[];
    restaurants?: {
      name: string;
      priceRange: 'budget' | 'moderate' | 'expensive';
      cuisine: string;
      familyFriendly?: boolean;
      address?: string;
    }[];
  };
  culturalNotes?: {
    customs?: string[];
    etiquette?: string[];
    phrases?: {
      original: string;
      pronunciation: string;
      meaning: string;
    }[];
    holidaysEvents?: {
      name: string;
      nameAr?: string;
      date?: string;
      description?: string;
    }[];
  };
  transportationOptions?: {
    publicTransport?: {
      available: boolean;
      quality: 'poor' | 'average' | 'good' | 'excellent';
      options?: string[];
    };
    rentalCar?: {
      recommended: boolean;
      considerations?: string[];
    };
    walking?: {
      friendliness: 'poor' | 'average' | 'good' | 'excellent';
      considerations?: string[];
    };
  };
  familySpecificNotes?: {
    childFriendly: boolean;
    teenagerFriendly: boolean;
    seniorFriendly: boolean;
    accessibilityNotes?: string[];
    familyActivities?: string[];
    safetyConsiderations?: string[];
  };
  uniqueExperiences?: string[];
  uniqueExperiencesAr?: string[];
}

// Enhanced AI response with rich, interactive content
export interface AIAssistantResponse {
  message: string | RichMessageContent;
  messageAr?: string | RichMessageContent;
  suggestions?: TravelSuggestion[];
  interactiveElements?: {
    type: string;
    data: any;
    action?: string;
  }[];
  relatedLocations?: {
    id: string;
    name: string;
    nameAr?: string;
    relationship: string; // e.g., "nearby", "similar", "historical connection"
    coordinates?: [number, number];
  }[];
  relatedFamilyMembers?: {
    id: string;
    name: string;
    nameAr?: string;
    relevance: string; // Why this family member is relevant to the response
  }[];
  relatedMemories?: {
    id: string;
    title: string;
    titleAr?: string;
    date: string;
    relevance: string;
  }[];
  voiceResponse?: {
    url: string;
    durationMs: number;
  };
  sources?: {
    title: string;
    url?: string;
    description?: string;
    type: 'article' | 'book' | 'website' | 'memory' | 'expert' | 'local knowledge';
  }[];
  visualData?: {
    type: 'map' | 'chart' | 'timeline' | 'gallery' | 'itinerary' | '3d-scene';
    data: any;
  }[];
}
