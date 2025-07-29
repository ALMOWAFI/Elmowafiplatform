// API Configuration and Services for Elmowafiplatform
// This module handles all communication between React frontend and Python AI backend

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';
const AI_SERVICE_URL = import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:5000';

// Types for API responses
export interface FamilyMember {
  id: string;
  name: string;
  nameArabic?: string;
  birthDate?: string;
  location?: string;
  avatar?: string;
  relationships: Relationship[];
}

export interface Relationship {
  memberId: string;
  type: 'parent' | 'child' | 'spouse' | 'sibling';
}

export interface Memory {
  id: string;
  title: string;
  description?: string;
  date: string;
  location?: string;
  imageUrl?: string;
  tags: string[];
  familyMembers: string[]; // IDs of family members in this memory
  aiAnalysis?: {
    facesDetected: number;
    emotions: string[];
    objects: string[];
    text?: string;
  };
}

export interface TravelPlan {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget?: number;
  participants: string[]; // Family member IDs
  activities: Activity[];
}

export interface Activity {
  id: string;
  name: string;
  location: string;
  date: string;
  cost?: number;
  description?: string;
}

export interface AIAnalysisRequest {
  imageFile: File;
  analysisType: 'memory' | 'document' | 'math' | 'general';
  familyContext?: FamilyMember[];
}

export interface AIAnalysisResponse {
  success: boolean;
  analysis: {
    text?: string;
    faces?: {
      count: number;
      emotions: string[];
      familyMemberMatches?: string[];
    };
    objects?: string[];
    location?: string;
    date?: string;
    recommendations?: string[];
  };
  error?: string;
}

// API Service Class
class APIService {
  private async fetchWithAuth(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  private async fetchAIService(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${AI_SERVICE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`AI Service Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Family Data Management
  async getFamilyMembers(): Promise<FamilyMember[]> {
    return this.fetchWithAuth('/api/family/members');
  }

  async getMembers(): Promise<FamilyMember[]> {
    return this.getFamilyMembers();
  }

  async createFamilyMember(member: Omit<FamilyMember, 'id'>): Promise<FamilyMember> {
    return this.fetchWithAuth('/api/family/members', {
      method: 'POST',
      body: JSON.stringify(member),
    });
  }

  async updateFamilyMember(id: string, updates: Partial<FamilyMember>): Promise<FamilyMember> {
    return this.fetchWithAuth(`/api/family/members/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // Memory Management
  async getMemories(filters?: {
    familyMemberId?: string;
    dateRange?: { start: string; end: string };
    tags?: string[];
  }): Promise<Memory[]> {
    const params = new URLSearchParams();
    if (filters?.familyMemberId) params.append('familyMemberId', filters.familyMemberId);
    if (filters?.dateRange) {
      params.append('startDate', filters.dateRange.start);
      params.append('endDate', filters.dateRange.end);
    }
    if (filters?.tags) {
      filters.tags.forEach(tag => params.append('tags', tag));
    }

    return this.fetchWithAuth(`/api/memories?${params.toString()}`);
  }

  async uploadMemory(formData: FormData): Promise<Memory> {
    const response = await fetch(`${API_BASE_URL}/api/memories/upload`, {
      method: 'POST',
      body: formData, // Don't set Content-Type for FormData
    });

    if (!response.ok) {
      throw new Error(`Upload Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async processMemoryWithAI(memoryId: string): Promise<AIAnalysisResponse> {
    return this.fetchWithAuth(`/api/memories/${memoryId}/analyze`, {
      method: 'POST',
    });
  }

  // AI Analysis Services
  async analyzeImage(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    const formData = new FormData();
    formData.append('image', request.imageFile);
    formData.append('analysisType', request.analysisType);
    
    if (request.familyContext) {
      formData.append('familyContext', JSON.stringify(request.familyContext));
    }

    const response = await fetch(`${AI_SERVICE_URL}/api/analyze`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`AI Analysis Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Travel Planning
  async getTravelPlans(familyMemberId?: string): Promise<TravelPlan[]> {
    const params = familyMemberId ? `?familyMemberId=${familyMemberId}` : '';
    return this.fetchWithAuth(`/api/travel/plans${params}`);
  }

  async createTravelPlan(plan: Omit<TravelPlan, 'id'>): Promise<TravelPlan> {
    return this.fetchWithAuth('/api/travel/plans', {
      method: 'POST',
      body: JSON.stringify(plan),
    });
  }

  async getAITravelRecommendations(destination: string, familyPreferences: {
    members: FamilyMember[];
    budget?: number;
    interests: string[];
  }): Promise<{
    recommendations: string[];
    estimatedBudget: number;
    suggestedActivities: Activity[];
  }> {
    return this.fetchWithAuth('/api/travel/recommendations', {
      method: 'POST',
      body: JSON.stringify({ destination, familyPreferences }),
    });
  }

  // Smart Memory Features
  async getMemorySuggestions(date?: string): Promise<{
    onThisDay: Memory[];
    similar: Memory[];
    recommendations: string[];
  }> {
    const params = date ? `?date=${date}` : '';
    return this.fetchWithAuth(`/api/memories/suggestions${params}`);
  }

  async searchMemories(query: string, filters?: {
    useAI?: boolean;
    familyMembers?: string[];
  }): Promise<Memory[]> {
    return this.fetchWithAuth('/api/memories/search', {
      method: 'POST',
      body: JSON.stringify({ query, filters }),
    });
  }

  // AI Travel Recommendations
  async getTravelRecommendations(params?: {
    budget?: string;
    duration?: string;
    interests?: string[];
  }): Promise<{
    recommendations: Array<{
      destination: string;
      reason: string;
      activities: string[];
      estimated_budget: string;
      family_friendly: boolean;
    }>;
    reasoning: string;
    confidence: number;
    ai_powered: boolean;
    family_context: {
      visited_locations: number;
      most_visited?: string;
      preferred_activities?: string[];
    };
  }> {
    const queryParams = new URLSearchParams();
    if (params?.budget) queryParams.append('budget', params.budget);
    if (params?.duration) queryParams.append('duration', params.duration);
    if (params?.interests) {
      params.interests.forEach(interest => queryParams.append('interests', interest));
    }
    
    return this.fetchWithAuth(`/api/travel/recommendations?${queryParams.toString()}`);
  }

  // Budget Integration Services
  async getBudgetSummary(): Promise<{
    totalBudget: number;
    totalSpent: number;
    remainingBudget: number;
    currency: string;
    integrated: boolean;
    envelopes: Array<{
      id: string;
      name: string;
      budgeted: number;
      spent: number;
      remaining: number;
      category: string;
      color?: string;
      icon?: string;
    }>;
    monthlyTrend: Array<{
      income: number;
      expenses: number;
      month: string;
    }>;
  }> {
    return this.fetchWithAuth('/api/budget/summary');
  }

  async getTravelBudgetRecommendations(destination?: string, estimatedBudget?: number): Promise<{
    recommendations: Array<{
      category: string;
      amount: number;
      available: boolean;
      description: string;
    }>;
    totalRecommended: number;
    currency: string;
  }> {
    const params = new URLSearchParams();
    if (destination) params.append('destination', destination);
    if (estimatedBudget) params.append('estimatedBudget', estimatedBudget.toString());
    
    return this.fetchWithAuth(`/api/budget/travel-recommendations?${params.toString()}`);
  }

  async createBudgetEnvelope(envelopeData: {
    name: string;
    amount: number;
    category: string;
    color?: string;
    icon?: string;
  }): Promise<any> {
    return this.fetchWithAuth('/api/budget/envelopes', {
      method: 'POST',
      body: JSON.stringify(envelopeData),
    });
  }

  async updateBudgetAllocation(category: string, amount: number): Promise<any> {
    return this.fetchWithAuth('/api/budget/allocate', {
      method: 'POST',
      body: JSON.stringify({ category, amount }),
    });
  }

  // Health check
  async healthCheck(): Promise<{ status: string; services: Record<string, boolean> }> {
    try {
      return this.fetchWithAuth('/api/health');
    } catch (error) {
      return {
        status: 'error',
        services: {
          api: false,
          ai: false,
        },
      };
    }
  }
}

// Export singleton instance
export const apiService = new APIService();

// React Query keys for caching
export const queryKeys = {
  familyMembers: ['family', 'members'] as const,
  memories: (filters?: any) => ['memories', filters] as const,
  travelPlans: (familyMemberId?: string) => ['travel', 'plans', familyMemberId] as const,
  memorySuggestions: (date?: string) => ['memories', 'suggestions', date] as const,
  travelRecommendations: (params?: any) => ['travel', 'recommendations', params] as const,
  budgetSummary: () => ['budget', 'summary'] as const,
  travelBudgetRecommendations: (destination?: string, budget?: number) => ['budget', 'travel', destination, budget] as const,
  budgetEnvelopes: () => ['budget', 'envelopes'] as const,
  health: ['health'] as const,
} as const; 