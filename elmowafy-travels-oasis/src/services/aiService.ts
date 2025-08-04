// Import the API client from the correct location
import { apiClient as api } from './api';

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
  // Base URL for AI service endpoints
  private baseURL = import.meta.env.VITE_AI_SERVICE_URL || '/api/v1/ai';

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
    try {
      const response = await api.post(`${this.baseURL}/travel-recommendations`, {
        destination: data.destination,
        budget: data.budget,
        duration: data.duration,
        family_members: data.familyMembers || [],
        preferences: data.preferences || {}
      });
      
      if (response?.data?.data?.recommendations) {
        return response.data.data.recommendations;
      }
      
      throw new Error('Invalid response format from travel recommendations service');
    } catch (error) {
      console.error('Error getting travel recommendations:', error);
      throw new Error('Failed to get travel recommendations. Please try again later.');
    }
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
  async checkHealth(): Promise<{ aiService: string; aiServiceResponse?: any; status?: string }> {
    try {
      const response = await api.get(`${this.baseURL}/health`);
      return {
        aiService: 'connected',
        aiServiceResponse: response.data,
        status: 'ok'
      };
    } catch (error) {
      return {
        aiService: 'disconnected',
        status: 'error',
        aiServiceResponse: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Upload and process photo for memory creation
   */
  async uploadMemoryPhoto(file: File, familyMembers: string[] = [], description?: string): Promise<{
    photoUrl: string;
    analysis: FamilyPhotoAnalysis;
    memoryId: string;
  }> {
    try {
      // First analyze the photo
      const analysis = await this.analyzePhoto(file, undefined, description);
      
      // Create memory record in database
      // This would typically save to a memories collection
      const memoryId = `memory_${Date.now()}`;
      
      // In a real implementation, we would save to the database here
      // await api.post('/memories', {
      //   memoryId,
      //   photoUrl: analysis.uploaded_image,
      //   familyMembers,
      //   description,
      //   analysis
      // });
      
      return {
        photoUrl: analysis.uploaded_image,
        analysis,
        memoryId
      };
    } catch (error) {
      console.error('Error uploading memory photo:', error);
      throw new Error('Failed to process memory photo. Please try again.');
    }
  }

  /**
   * Get smart family activity suggestions based on current context
   * @param context Context for generating activity suggestions
   * @returns Array of activity suggestions with details
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
    try {
      // Call the backend AI service with proper error handling
      const response = await api.post('/ai/family-activity-suggestions', {
        location: context.location,
        weather: context.weather,
        family_members: context.familyMembers || [],
        time_of_day: context.time,
        budget: context.budget,
        // Add any additional metadata that might be useful for the AI
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'web-client',
          version: '1.0.0'
        }
      });

      // Handle the response structure
      if (response?.data?.success && Array.isArray(response.data.data?.suggestions)) {
        return response.data.data.suggestions.map((suggestion: any) => ({
          activity: suggestion.activity_name || 'Unnamed Activity',
          description: suggestion.description || 'No description available',
          suitability: suggestion.suitability_score || 0,
          estimated_cost: suggestion.estimated_cost || 0,
          duration: suggestion.duration || '1-2 hours'
        }));
      }

      // Log unexpected response structure for debugging
      console.warn('Unexpected response format from AI service:', response);
      return [];
    } catch (error) {
      console.error('Error fetching family activity suggestions:', error);
      // Return a friendly error message or default suggestions
      return [];
    }
  }
}

export const aiService = new AIService();