import { api } from '../lib/api';

// Types for AI service responses
export interface FamilyPhotoAnalysis {
  success: boolean;
  analysis: {
    image_info: {
      width: number;
      height: number;
      channels: number;
      filename: string;
    };
    detected_faces: any[];
    scene_analysis: string;
    suggested_tags: string[];
    context: string;
    timestamp: string;
  };
  uploaded_image: string;
}

export interface MathErrorDetection {
  success: boolean;
  original_image: string;
  marked_image: string;
  errors: Array<{
    line_number: number;
    error_text: string;
    error_type: string;
    correction: string;
    explanation: string;
    position: {
      top_left_x: number;
      top_left_y: number;
      bottom_right_x: number;
      bottom_right_y: number;
    };
  }>;
  error_count: number;
  expert_feedback: string;
  practice_sheet: string;
  teaching_style: string;
}

export interface MemorySuggestion {
  type: string;
  title: string;
  description: string;
  relevance_score: number;
  suggested_actions: string[];
}

export interface TravelRecommendation {
  destination_analysis: {
    suitability_score: number;
    family_friendly_rating: number;
    cultural_significance: string;
  };
  itinerary_suggestions: Array<{
    day: number;
    activities: string[];
    budget_estimate: number;
  }>;
  family_considerations: {
    child_friendly_venues: boolean;
    elderly_accessible: boolean;
    cultural_dietary_options: boolean;
    language_support: string;
  };
  budget_breakdown: {
    accommodation: number;
    activities: number;
    meals: number;
    transportation: number;
  };
  cultural_tips: string[];
}

export interface TeachingStyle {
  name: string;
  description: string;
}

class AIService {
  private baseURL = '/api/v1/ai';

  /**
   * Analyze uploaded family photo with AI
   */
  async analyzePhoto(file: File, familyMemberId?: string, context?: string): Promise<FamilyPhotoAnalysis> {
    const formData = new FormData();
    formData.append('photo', file);
    
    if (familyMemberId) {
      formData.append('familyMemberId', familyMemberId);
    }
    
    if (context) {
      formData.append('context', context);
    }

    const response = await api.post(`${this.baseURL}/analyze-photo`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.data.analysis;
  }

  /**
   * Detect math errors in homework using AI
   */
  async detectMathErrors(
    file: File,
    studentWork?: string,
    correctSolution?: string,
    teachingStyle: string = 'detailed'
  ): Promise<MathErrorDetection> {
    const formData = new FormData();
    formData.append('homework', file);
    
    if (studentWork) {
      formData.append('studentWork', studentWork);
    }
    
    if (correctSolution) {
      formData.append('correctSolution', correctSolution);
    }
    
    formData.append('teachingStyle', teachingStyle);

    const response = await api.post(`${this.baseURL}/detect-math-errors`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.data;
  }

  /**
   * Get AI-powered memory suggestions for family
   */
  async getMemorySuggestions(
    familyMemberId?: string,
    date?: string,
    type: string = 'general'
  ): Promise<MemorySuggestion[]> {
    const params = new URLSearchParams();
    
    if (familyMemberId) {
      params.append('familyMemberId', familyMemberId);
    }
    
    if (date) {
      params.append('date', date);
    }
    
    params.append('type', type);

    const response = await api.get(`${this.baseURL}/memory-suggestions?${params}`);
    return response.data.data.suggestions;
  }

  /**
   * Get AI-powered travel recommendations based on family preferences
   */
  async getTravelRecommendations(data: {
    destination?: string;
    budget?: number;
    duration?: number;
    familyMembers?: string[];
    preferences?: Record<string, any>;
  }): Promise<TravelRecommendation> {
    const response = await api.post(`${this.baseURL}/travel-recommendations`, data);
    return response.data.data.recommendations;
  }

  /**
   * Get available AI teaching styles
   */
  async getTeachingStyles(): Promise<TeachingStyle[]> {
    const response = await api.get(`${this.baseURL}/teaching-styles`);
    return response.data.data.styles || [];
  }

  /**
   * Check AI service health status
   */
  async checkHealth(): Promise<{ aiService: string; aiServiceResponse?: any }> {
    try {
      const response = await api.get(`${this.baseURL}/health`);
      return response.data.data;
    } catch (error) {
      return {
        aiService: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Upload and process photo for memory creation
   */
  async uploadMemoryPhoto(file: File, familyMembers: string[], description?: string): Promise<{
    photoUrl: string;
    analysis: FamilyPhotoAnalysis;
    memoryId: string;
  }> {
    // First analyze the photo
    const analysis = await this.analyzePhoto(file, undefined, description);
    
    // TODO: Create memory record in database
    // This would typically save to a memories collection
    const memoryId = `memory_${Date.now()}`;
    
    return {
      photoUrl: analysis.uploaded_image,
      analysis,
      memoryId
    };
  }

  /**
   * Get smart family activity suggestions based on current context
   */
  async getFamilyActivitySuggestions(context: {
    location?: string;
    weather?: string;
    familyMembers?: string[];
    time?: string;
    budget?: number;
  }): Promise<Array<{
    activity: string;
    description: string;
    suitability: number;
    estimated_cost: number;
    duration: string;
  }>> {
    // Mock implementation - would connect to AI service
    return [
      {
        activity: 'Family Photo Walk',
        description: 'Explore local landmarks and capture family memories',
        suitability: 0.9,
        estimated_cost: 0,
        duration: '2-3 hours'
      },
      {
        activity: 'Cultural Museum Visit',
        description: 'Educational family outing to learn about heritage',
        suitability: 0.8,
        estimated_cost: context.budget ? context.budget * 0.1 : 50,
        duration: '3-4 hours'
      },
      {
        activity: 'Traditional Cooking Session',
        description: 'Cook traditional family recipes together',
        suitability: 0.9,
        estimated_cost: context.budget ? context.budget * 0.15 : 75,
        duration: '2-3 hours'
      }
    ];
  }
}

export const aiService = new AIService();