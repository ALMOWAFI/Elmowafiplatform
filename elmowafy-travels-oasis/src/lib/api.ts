// API Configuration and Services for Elmowafiplatform
// This module handles all communication between React frontend and Python AI backend

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';
const AI_SERVICE_URL = import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:5000';
const GRAPHQL_URL = `${API_BASE_URL}/api/v1/graphql`;

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

// Enhanced AI Types
export interface AIAnalysisRequest {
  imageFile: File;
  analysisType: 'general' | 'memory' | 'face' | 'emotion' | 'objects' | 'text';
  familyContext?: FamilyMember[];
}

export interface AIAnalysisResponse {
  success: boolean;
  data: {
    timestamp: string;
    image_properties?: {
      width: number;
      height: number;
      brightness: number;
      contrast: number;
      is_blurry: boolean;
      quality_score: number;
    };
    faces?: {
      count: number;
      faces: Array<{
        id: string;
        position: { x: number; y: number; width: number; height: number };
        confidence: number;
        family_member_id?: string;
        name?: string;
      }>;
      family_members_detected: string[];
      advanced_recognition_used: boolean;
    };
    emotions?: string[];
    objects?: Array<{
      name: string;
      confidence: number;
      category: string;
      position?: { x: number; y: number; width: number; height: number };
    }>;
    scene_analysis?: {
      scene_type: string;
      lighting: string;
      composition_score: number;
      estimated_time_of_day: string;
      photo_style: string;
    };
    text?: string;
    family_insights?: {
      memory_type: string;
      suggested_tags: string[];
      estimated_occasion: string;
      recommendations: string[];
    };
    analysis_type: string;
    user_id: string;
    file_name: string;
  };
  message: string;
}

export interface AIInsightsRequest {
  context: {
    type: 'memory' | 'photo' | 'family' | 'general';
    family_context?: FamilyMember[];
  };
  family_member_id?: string;
}

export interface AIInsightsResponse {
  success: boolean;
  data: {
    memory_type?: string;
    suggested_tags?: string[];
    estimated_occasion?: string;
    recommendations?: string[];
    sentiment?: string;
    family_members_involved?: number;
    analysis_confidence?: number;
    photo_quality?: string;
    composition_score?: number;
    lighting_analysis?: string;
    suggested_improvements?: string[];
    family_moment_quality?: string;
    family_dynamics?: string;
    interaction_quality?: string;
    suggested_activities?: string[];
    family_strength_score?: number;
    general_insights?: string;
    context_type: string;
    user_id: string;
    family_member_id?: string;
    generated_at: string;
    confidence: number;
  };
  message: string;
}

export interface FaceRecognitionResult {
  success: boolean;
  data: {
    count: number;
    faces: Array<{
      id: string;
      position: { x: number; y: number; width: number; height: number };
      confidence: number;
      family_member_id?: string;
      name?: string;
    }>;
    family_members_detected: string[];
    advanced_recognition_used: boolean;
    user_id: string;
    timestamp: string;
    file_name: string;
  };
  message: string;
}

export interface EmotionDetectionResult {
  success: boolean;
  data: {
    detected_emotions: string[];
    dominant_emotion: string;
    emotion_confidence: number;
    emotion_distribution: Record<string, number>;
    analysis_timestamp: string;
  };
  message: string;
}

export interface ObjectDetectionResult {
  success: boolean;
  data: {
    detected_objects: Array<{
      name: string;
      confidence: number;
      category: string;
      position?: { x: number; y: number; width: number; height: number };
    }>;
    object_count: number;
    scene_type: string;
    primary_objects: Array<{
      name: string;
      confidence: number;
      category: string;
    }>;
    analysis_confidence: number;
    analysis_timestamp: string;
  };
  message: string;
}

export interface TextExtractionResult {
  success: boolean;
  data: {
    extracted_text: string | null;
    text_confidence: number;
    text_length: number;
    language_detected: string;
    text_type: string;
    analysis_timestamp: string;
  };
  message: string;
}

export interface AISuggestion {
  suggestions: string[];
  confidence: number;
  generated_at: string;
}

export interface TravelRecommendation {
  destination: string;
  activities: string[];
  budget_range: string;
  family_friendly_score: number;
  description: string;
}

export interface GameRecommendation {
  game_name: string;
  difficulty: string;
  players: number;
  duration: string;
  family_friendly: boolean;
  description: string;
}

// GraphQL Types
export interface GraphQLRequest {
  query: string;
  variables?: Record<string, any>;
  operationName?: string;
}

export interface GraphQLResponse<T = any> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
  }>;
  extensions?: {
    api_version?: string;
    graphql?: boolean;
  };
}

// Service Mesh Types
export interface ServiceMeshMetrics {
  requests: number;
  errors: number;
  error_rate: number;
  average_response_time: number;
  active_services: number;
  circuit_breakers: Record<string, string>;
}

export interface ServiceInstance {
  id: string;
  name: string;
  service_type: string;
  host: string;
  port: number;
  health_endpoint: string;
  status: string;
  last_health_check: string;
  metadata: Record<string, any>;
  load_balancer_weight: number;
  version: string;
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

  // GraphQL Client
  async graphqlQuery<T = any>(request: GraphQLRequest): Promise<GraphQLResponse<T>> {
    const response = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add auth headers if needed
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`GraphQL Error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.errors) {
      throw new Error(`GraphQL Errors: ${result.errors.map((e: any) => e.message).join(', ')}`);
    }

    return result;
  }

  // Family Data Management - Updated to use v1 API
  async getFamilyMembers(): Promise<FamilyMember[]> {
    const response = await this.fetchWithAuth('/api/v1/family/members');
    return response.members || response;
  }

  async getMembers(): Promise<FamilyMember[]> {
    return this.getFamilyMembers();
  }

  async createFamilyMember(member: Omit<FamilyMember, 'id'>): Promise<FamilyMember> {
    const response = await this.fetchWithAuth('/api/v1/family/members', {
      method: 'POST',
      body: JSON.stringify(member),
    });
    return response;
  }

  async updateFamilyMember(id: string, updates: Partial<FamilyMember>): Promise<FamilyMember> {
    const response = await this.fetchWithAuth(`/api/v1/family/members/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return response;
  }

  // Memory Management - Updated to use v1 API
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

    const response = await this.fetchWithAuth(`/api/v1/memories?${params.toString()}`);
    return response.memories || response;
  }

  async uploadMemory(formData: FormData): Promise<Memory> {
    const response = await fetch(`${API_BASE_URL}/api/v1/memories/upload`, {
      method: 'POST',
      body: formData, // Don't set Content-Type for FormData
    });

    if (!response.ok) {
      throw new Error(`Upload Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async processMemoryWithAI(memoryId: string): Promise<AIAnalysisResponse> {
    return this.fetchWithAuth(`/api/v1/memories/${memoryId}/analyze`, {
      method: 'POST',
    });
  }

  // AI Analysis Services - Updated to use v1 API
  async analyzeImage(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    const formData = new FormData();
    formData.append('image', request.imageFile);
    formData.append('analysisType', request.analysisType);
    
    if (request.familyContext) {
      formData.append('familyContext', JSON.stringify(request.familyContext));
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/analyze`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`AI Analysis Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Travel Planning - Updated to use v1 API
  async getTravelPlans(familyMemberId?: string): Promise<TravelPlan[]> {
    const params = familyMemberId ? `?familyMemberId=${familyMemberId}` : '';
    const response = await this.fetchWithAuth(`/api/v1/travel/plans${params}`);
    return response.plans || response;
  }

  async createTravelPlan(plan: Omit<TravelPlan, 'id'>): Promise<TravelPlan> {
    return this.fetchWithAuth('/api/v1/travel/plans', {
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
    return this.fetchWithAuth('/api/v1/travel/recommendations', {
      method: 'POST',
      body: JSON.stringify({ destination, familyPreferences }),
    });
  }

  // Enhanced Memory Processing with AI Integration
  async getMemoryTimeline(filters?: {
    limit?: number;
    offset?: number;
    familyMember?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<{
    success: boolean;
    timeline: Memory[];
    total_memories: number;
    filters_applied: any;
    ai_powered: boolean;
  }> {
    const params = new URLSearchParams();
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());
    if (filters?.familyMember) params.append('family_member', filters.familyMember);
    if (filters?.dateFrom) params.append('date_from', filters.dateFrom);
    if (filters?.dateTo) params.append('date_to', filters.dateTo);

    return this.fetchWithAuth(`/api/v1/ai/memory/timeline?${params.toString()}`);
  }


  async analyzeImageWithAI(file: File, analysisRequest?: {
    analysisType?: string;
    familyContext?: any[];
    includeFaceDetection?: boolean;
    includeSceneAnalysis?: boolean;
  }): Promise<{
    success: boolean;
    analysis: any;
    suggestions: any;
    ai_service_used: string;
    processing_time: number;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    
    const metadata = {
      analysis_type: analysisRequest?.analysisType || 'family_memory',
      include_face_detection: analysisRequest?.includeFaceDetection !== false,
      include_scene_analysis: analysisRequest?.includeSceneAnalysis !== false
    };
    
    formData.append('metadata', JSON.stringify(metadata));
    formData.append('family_context', JSON.stringify(analysisRequest?.familyContext || []));

    const response = await fetch(`${API_BASE_URL}/api/v1/ai/analyze-photo`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`AI Analysis Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Enhanced Travel AI Methods
  async getDestinationRecommendations(request: {
    travelDates?: string;
    budget?: number;
    familySize?: number;
    interests?: string[];
    durationDays?: number;
  }): Promise<{
    success: boolean;
    recommendations: any[];
    cultural_insights: any;
    ai_powered: boolean;
  }> {
    return this.fetchWithAuth('/api/v1/ai/travel/recommendations', {
      method: 'POST',
      body: JSON.stringify({
        travel_dates: request.travelDates,
        budget: request.budget,
        family_size: request.familySize,
        interests: request.interests,
        duration_days: request.durationDays
      }),
    });
  }

  async planFamilyItinerary(
    destination: string, 
    durationDays: number = 7, 
    familyMembers?: any[]
  ): Promise<{
    success: boolean;
    itinerary: any;
    budget_estimate: number;
    ai_powered: boolean;
  }> {
    return this.fetchWithAuth('/api/v1/ai/travel/itinerary', {
      method: 'POST',
      body: JSON.stringify({
        destination,
        duration_days: durationDays,
        family_members: familyMembers || []
      }),
    });
  }

  async getCulturalInsights(destination: string): Promise<{
    success: boolean;
    insights: any;
  }> {
    return this.fetchWithAuth(`/api/v1/travel/cultural-insights/${encodeURIComponent(destination)}`);
  }

  async analyzeTravelPatterns(): Promise<{
    success: boolean;
    analysis: any;
  }> {
    return this.fetchWithAuth('/api/v1/travel/patterns');
  }

  // Family AI Endpoints
  async getFamilyContext(familyId: string): Promise<any> {
    return this.fetchWithAuth(`/api/v1/family-ai/context/${familyId}`);
  }

  async getFamilyAnalytics(familyId: string): Promise<any> {
    return this.fetchWithAuth(`/api/v1/family-ai/analytics/${familyId}`);
  }

  async sendFamilyAIChat(familyId: string, message: string): Promise<any> {
    return this.fetchWithAuth(`/api/v1/family-ai/chat`, {
      method: 'POST',
      body: JSON.stringify({
        family_id: familyId,
        message: message
      }),
    });
  }

  async learnFromMemory(memoryData: any): Promise<any> {
    return this.fetchWithAuth('/api/v1/family-ai/learn-from-memory', {
      method: 'POST',
      body: JSON.stringify(memoryData),
    });
  }

  async getFamilyPersonalities(familyId: string): Promise<any> {
    return this.fetchWithAuth(`/api/v1/family-ai/personalities/${familyId}`);
  }

  async updateFamilyPersonality(personalityData: any): Promise<any> {
    return this.fetchWithAuth('/api/v1/family-ai/personalities/update', {
      method: 'POST',
      body: JSON.stringify(personalityData),
    });
  }

  async getFamilyJokes(familyId: string): Promise<any> {
    return this.fetchWithAuth(`/api/v1/family-ai/jokes/${familyId}`);
  }

  async createFamilyJoke(jokeData: any): Promise<any> {
    return this.fetchWithAuth('/api/v1/family-ai/jokes/create', {
      method: 'POST',
      body: JSON.stringify(jokeData),
    });
  }

  async getFamilyPrivacySettings(familyId: string, memberId: string): Promise<any> {
    return this.fetchWithAuth(`/api/v1/family-ai/privacy/${familyId}/${memberId}`);
  }

  async updateFamilyPrivacySettings(privacyData: any): Promise<any> {
    return this.fetchWithAuth('/api/v1/family-ai/privacy/update', {
      method: 'POST',
      body: JSON.stringify(privacyData),
    });
  }

  async chatWithAI(message: {
    message: string;
    conversationId?: string;
    userContext?: any;
  }): Promise<{
    success: boolean;
    response: {
      message: string;
      timestamp: string;
      conversationId: string;
      context: any;
    };
  }> {
    return this.fetchWithAuth('/api/v1/chat/message', {
      method: 'POST',
      body: JSON.stringify(message),
    });
  }

  // System Health and Information
  async getSystemHealth(): Promise<{
    status: string;
    timestamp: string;
    services: any;
    version: string;
  }> {
    return this.fetchWithAuth('/api/v1/health');
  }

  async getSystemInfo(): Promise<{
    platform: string;
    version: string;
    capabilities: any;
    supportedFormats: any;
    limits: any;
  }> {
    return this.fetchWithAuth('/api/v1/system/info');
  }

  // ===== NEW COMPREHENSIVE AI SERVICES =====
  
  // Complete Photo Analysis with Family Recognition
  async analyzePhotoComprehensive(
    imageFile: File,
    metadata?: any,
    options?: {
      includeFamilyRecognition?: boolean;
      includeActivityDetection?: boolean;
      includeEmotionAnalysis?: boolean;
      includeCulturalElements?: boolean;
    }
  ): Promise<{
    success: boolean;
    analysis: any;
    family_members_identified: string[];
    memory_category: string;
    suggested_tags: string[];
    description: string;
    confidence: number;
    ai_service: string;
  }> {
    const formData = new FormData();
    formData.append('file', imageFile);
    formData.append('metadata', JSON.stringify(metadata || {}));
    if (options?.includeFamilyRecognition !== undefined) {
      formData.append('include_family_recognition', options.includeFamilyRecognition.toString());
    }
    if (options?.includeActivityDetection !== undefined) {
      formData.append('include_activity_detection', options.includeActivityDetection.toString());
    }
    if (options?.includeEmotionAnalysis !== undefined) {
      formData.append('include_emotion_analysis', options.includeEmotionAnalysis.toString());
    }
    if (options?.includeCulturalElements !== undefined) {
      formData.append('include_cultural_elements', options.includeCulturalElements.toString());
    }

    return this.fetchWithAuth('/api/v1/ai/photo/analyze-comprehensive', {
      method: 'POST',
      body: formData,
    });
  }

  // Add Family Member Face for Recognition Training
  async addFamilyMemberFace(
    memberId: string,
    name: string,
    nameArabic: string,
    relationship: string,
    imageFile: File
  ): Promise<{
    success: boolean;
    member_id: string;
    message: string;
    training_image: string;
  }> {
    const formData = new FormData();
    formData.append('member_id', memberId);
    formData.append('name', name);
    formData.append('name_arabic', nameArabic);
    formData.append('relationship', relationship);
    formData.append('file', imageFile);

    return this.fetchWithAuth('/api/v1/ai/photo/add-family-member', {
      method: 'POST',
      body: formData,
    });
  }

  // Advanced Travel Recommendations with Cultural Awareness
  async getAdvancedTravelRecommendations(request: {
    budget?: number;
    family_size: number;
    interests: string[];
    travel_month?: string;
    duration_days?: number;
    cultural_preferences?: string[];
    accommodation_type?: string;
  }): Promise<{
    success: boolean;
    recommendations: any[];
    total_recommendations: number;
    ai_powered: boolean;
    cultural_considerations: any;
  }> {
    return this.fetchWithAuth('/api/v1/ai/travel/recommendations-advanced', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Create Detailed Family Itinerary with AI
  async createDetailedFamilyItinerary(
    destination: string,
    durationDays: number,
    familyMembers: any[],
    budget?: number,
    interests?: string[]
  ): Promise<{
    success: boolean;
    itinerary: any;
    ai_optimized: boolean;
    family_focused: boolean;
    cultural_aware: boolean;
  }> {
    const formData = new FormData();
    formData.append('destination', destination);
    formData.append('duration_days', durationDays.toString());
    formData.append('family_members', JSON.stringify(familyMembers));
    if (budget) formData.append('budget', budget.toString());
    formData.append('interests', JSON.stringify(interests || []));

    return this.fetchWithAuth('/api/v1/ai/travel/itinerary-detailed', {
      method: 'POST',
      body: formData,
    });
  }

  // AI Game Master - Start Game Session
  async startAIGameSession(request: {
    game_type: 'mafia' | 'among_us' | 'family_trivia';
    players: any[];
    settings?: any;
  }): Promise<{
    success: boolean;
    game_session: any;
    instructions: string;
    assigned_roles: any[];
    ai_features: string[];
  }> {
    return this.fetchWithAuth('/api/v1/ai/game/start-session', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Get Available AI Games
  async getAvailableAIGames(): Promise<{
    available_games: any[];
    total_games: number;
    ai_powered: boolean;
  }> {
    return this.fetchWithAuth('/api/v1/ai/game/available-games');
  }

  // Family Chat AI
  async chatWithFamilyAI(request: {
    member_id: string;
    message: string;
    context_type?: string;
    learn_personality?: boolean;
  }): Promise<{
    response: string;
    context_used: string[];
    personality_learned: boolean;
    suggestions?: string[];
    timestamp: string;
  }> {
    return this.fetchWithAuth('/api/v1/ai/chat/message', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Get Family Member Personality Profile
  async getFamilyMemberPersonality(memberId: string): Promise<{
    success: boolean;
    personality_profile: any;
    last_updated: string;
  }> {
    return this.fetchWithAuth(`/api/v1/ai/chat/personality/${memberId}`);
  }

  // Smart Memory Suggestions
  async getSmartMemorySuggestions(request: {
    date?: string;
    member_id?: string;
    suggestion_types?: string[];
  }): Promise<any> {
    return this.fetchWithAuth('/api/v1/ai/memory/suggestions-smart', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // AI Memory Timeline
  async getAIMemoryTimeline(
    limit: number = 50,
    offset: number = 0,
    memberId?: string,
    category?: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<{
    memories: any[];
    ai_insights: any;
    total_memories: number;
    ai_organized: boolean;
    confidence: number;
  }> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });
    if (memberId) params.append('member_id', memberId);
    if (category) params.append('category', category);
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);

    return this.fetchWithAuth(`/api/v1/ai/memory/timeline-ai?${params}`);
  }

  // Comprehensive AI System Health
  async getComprehensiveAIHealth(): Promise<{
    service: string;
    status: string;
    timestamp: string;
    services: any;
    capabilities: any;
    ml_dependencies: any;
  }> {
    return this.fetchWithAuth('/api/v1/ai/system/health');
  }

  // AI System Capabilities
  async getAISystemCapabilities(): Promise<{
    service: string;
    version: string;
    timestamp: string;
    core_services: any;
    technical_specifications: any;
    family_focused_features: any;
  }> {
    return this.fetchWithAuth('/api/v1/ai/system/capabilities');
  }

  // Smart Memory Features - Updated to use v1 API
  async getMemorySuggestions(date?: string): Promise<{
    onThisDay: Memory[];
    similar: Memory[];
    recommendations: string[];
  }> {
    const params = date ? `?date=${date}` : '';
    return this.fetchWithAuth(`/api/v1/memories/suggestions${params}`);
  }

  async searchMemories(query: string, filters?: {
    useAI?: boolean;
    familyMembers?: string[];
  }): Promise<Memory[]> {
    return this.fetchWithAuth('/api/v1/memories/search', {
      method: 'POST',
      body: JSON.stringify({ query, filters }),
    });
  }

  // AI Travel Recommendations - Updated to use v1 API
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
    
    return this.fetchWithAuth(`/api/v1/travel/recommendations?${queryParams.toString()}`);
  }

  // Budget Integration Services - Updated to use v1 API
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
    return this.fetchWithAuth('/api/v1/budget/summary');
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
    
    return this.fetchWithAuth(`/api/v1/budget/travel-recommendations?${params.toString()}`);
  }

  async createBudgetEnvelope(envelopeData: {
    name: string;
    amount: number;
    category: string;
    color?: string;
    icon?: string;
  }): Promise<any> {
    return this.fetchWithAuth('/api/v1/budget/envelopes', {
      method: 'POST',
      body: JSON.stringify(envelopeData),
    });
  }

  async updateBudgetAllocation(category: string, amount: number): Promise<any> {
    return this.fetchWithAuth('/api/v1/budget/allocate', {
      method: 'POST',
      body: JSON.stringify({ category, amount }),
    });
  }

  // Service Mesh Management
  async getServiceMeshMetrics(): Promise<ServiceMeshMetrics> {
    return this.fetchWithAuth('/api/v1/service-mesh/metrics');
  }

  async getServiceMeshStatus(): Promise<{
    status: string;
    timestamp: string;
    service_counts: Record<string, number>;
    total_services: number;
    circuit_breaker_states: Record<string, number>;
    metrics: {
      requests: number;
      errors: number;
      error_rate: number;
      average_response_time: number;
    };
  }> {
    return this.fetchWithAuth('/api/v1/service-mesh/status');
  }

  async listServices(serviceType?: string): Promise<ServiceInstance[]> {
    const params = serviceType ? `?service_type=${serviceType}` : '';
    return this.fetchWithAuth(`/api/v1/service-mesh/services${params}`);
  }

  async registerService(serviceData: {
    name: string;
    service_type: string;
    host: string;
    port: number;
    health_endpoint?: string;
    metadata?: Record<string, any>;
    load_balancer_weight?: number;
    version?: string;
  }): Promise<ServiceInstance> {
    return this.fetchWithAuth('/api/v1/service-mesh/services', {
      method: 'POST',
      body: JSON.stringify(serviceData),
    });
  }

  async deregisterService(serviceId: string): Promise<{
    success: boolean;
    message: string;
    service_id: string;
  }> {
    return this.fetchWithAuth(`/api/v1/service-mesh/services/${serviceId}`, {
      method: 'DELETE',
    });
  }

  // AI Integration Methods
  async uploadMemoryWithAI(
    file: File,
    date: string,
    location?: string,
    familyMembers: string[] = [],
    tags: string[] = []
  ): Promise<{
    success: boolean;
    memory: Memory;
    ai_analysis: any;
    message: string;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('date', date);
    if (location) formData.append('location', location);
    formData.append('family_members', JSON.stringify(familyMembers));
    formData.append('tags', JSON.stringify(tags));

    const response = await fetch(`${API_BASE_URL}/api/v1/ai/memory/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Memory upload failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getAIHealth(): Promise<{
    service: string;
    status: string;
    timestamp: string;
    integration_status?: any;
  }> {
    try {
      return await this.fetchWithAuth('/api/v1/ai/health');
    } catch (error) {
      return {
        service: 'AI Integration',
        status: 'error',
        timestamp: new Date().toISOString()
      };
    }
  }

  async getAICapabilities(): Promise<{
    service: string;
    version: string;
    timestamp: string;
    integration_status: any;
    available_endpoints: any;
    supported_features: any;
  }> {
    return this.fetchWithAuth('/api/v1/ai/capabilities');
  }

  // Health check - Updated to use v1 API
  async healthCheck(): Promise<{ status: string; services: Record<string, boolean> }> {
    try {
      const response = await this.fetchWithAuth('/api/v1/health');
      return {
        status: response.status,
        services: response.services || {
          api: true,
          ai: true,
        },
      };
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

  // GraphQL Convenience Methods
  async getFamilyMembersGraphQL(): Promise<FamilyMember[]> {
    const query = `
      query GetFamilyMembers {
        familyMembers {
          id
          name
          nameArabic
          birthDate
          location
          avatar
          relationships
        }
      }
    `;
    
    const response = await this.graphqlQuery<{ familyMembers: FamilyMember[] }>({ query });
    return response.data?.familyMembers || [];
  }

  async getMemoriesGraphQL(filters?: {
    familyMemberId?: string;
    startDate?: string;
    endDate?: string;
    tags?: string[];
  }): Promise<Memory[]> {
    const variables: any = {};
    if (filters?.familyMemberId) variables.familyMemberId = filters.familyMemberId;
    if (filters?.startDate) variables.startDate = filters.startDate;
    if (filters?.endDate) variables.endDate = filters.endDate;
    if (filters?.tags) variables.tags = filters.tags;

    const query = `
      query GetMemories($familyMemberId: String, $startDate: String, $endDate: String, $tags: [String]) {
        memories(familyMemberId: $familyMemberId, startDate: $startDate, endDate: $endDate, tags: $tags) {
          id
          title
          description
          date
          location
          imageUrl
          tags
          familyMembers
          aiAnalysis
        }
      }
    `;
    
    const response = await this.graphqlQuery<{ memories: Memory[] }>({ 
      query, 
      variables 
    });
    return response.data?.memories || [];
  }

  async createFamilyMemberGraphQL(member: Omit<FamilyMember, 'id'>): Promise<{
    familyMember: FamilyMember;
    success: boolean;
    message: string;
  }> {
    const mutation = `
      mutation CreateFamilyMember($input: FamilyMemberInput!) {
        createFamilyMember(input: $input) {
          familyMember {
            id
            name
            nameArabic
            birthDate
            location
            avatar
            relationships
          }
          success
          message
        }
      }
    `;
    
    const response = await this.graphqlQuery<{
      createFamilyMember: {
        familyMember: FamilyMember;
        success: boolean;
        message: string;
      };
    }>({
      query: mutation,
      variables: { input: member },
    });
    
    return response.data?.createFamilyMember || {
      familyMember: {} as FamilyMember,
      success: false,
      message: 'Failed to create family member',
    };
  }

  // ===== AI INTEGRATION METHODS =====

  // Core AI Analysis Methods
  async analyzeImage(params: {
    imageFile: File;
    analysisType: 'general' | 'memory' | 'face' | 'emotion' | 'objects';
    familyContext?: FamilyMember[];
  }): Promise<AIAnalysisResponse> {
    const formData = new FormData();
    formData.append('file', params.imageFile);
    formData.append('analysis_type', params.analysisType);
    if (params.familyContext) {
      formData.append('family_context', JSON.stringify(params.familyContext));
    }
    
    const response = await fetch(`${API_BASE_URL}/api/v1/ai/analyze-photo`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`AI Analysis Error: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }

  async analyzeMemory(memoryData: Memory, familyContext?: FamilyMember[]): Promise<AIAnalysisResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/ai/analyze-memory`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        analysis_type: 'memory',
        family_context: familyContext 
      })
    });
    
    if (!response.ok) {
      throw new Error(`Memory Analysis Error: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }

  async getAISuggestions(context: string, familyMemberId?: string): Promise<AISuggestion> {
    const formData = new FormData();
    formData.append('context', context);
    if (familyMemberId) {
      formData.append('family_member_id', familyMemberId);
    }
    
    const response = await fetch(`${API_BASE_URL}/api/v1/ai/get-suggestions`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`AI Suggestions Error: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }

  async faceRecognition(imageFile: File, familyMembers?: string[]): Promise<FaceRecognitionResult> {
    const formData = new FormData();
    formData.append('file', imageFile);
    if (familyMembers) {
      formData.append('family_members', JSON.stringify(familyMembers));
    }
    
    const response = await fetch(`${API_BASE_URL}/api/v1/ai/face-recognition`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Face Recognition Error: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }

  async emotionDetection(imageFile: File): Promise<EmotionDetectionResult> {
    const formData = new FormData();
    formData.append('file', imageFile);
    
    const response = await fetch(`${API_BASE_URL}/api/v1/ai/emotion-detection`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Emotion Detection Error: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }

  async objectDetection(imageFile: File): Promise<ObjectDetectionResult> {
    const formData = new FormData();
    formData.append('file', imageFile);
    
    const response = await fetch(`${API_BASE_URL}/api/v1/ai/object-detection`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Object Detection Error: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }

  async textExtraction(imageFile: File): Promise<TextExtractionResult> {
    const formData = new FormData();
    formData.append('file', imageFile);
    
    const response = await fetch(`${API_BASE_URL}/api/v1/ai/text-extraction`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Text Extraction Error: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }

  async generateInsights(context: AIInsightsRequest): Promise<AIInsightsResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/ai/generate-insights`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(context)
    });
    
    if (!response.ok) {
      throw new Error(`AI Insights Error: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }

  // Travel AI Methods
  async getAITravelRecommendations(
    destination: string,
    familyContext: {
      members: FamilyMember[];
      budget?: number;
      interests?: string[];
    }
  ): Promise<TravelRecommendation[]> {
    const response = await fetch(`${API_BASE_URL}/api/v1/travel/ai-recommendations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ destination, family_context: familyContext })
    });
    
    if (!response.ok) {
      throw new Error(`Travel AI Error: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    return result.recommendations || [];
  }

  // Gaming AI Methods
  async getAIGameRecommendations(
    familyMembers: FamilyMember[],
    preferences: any
  ): Promise<GameRecommendation[]> {
    const response = await fetch(`${API_BASE_URL}/api/v1/games/ai-recommendations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ family_members: familyMembers, preferences })
    });
    
    if (!response.ok) {
      throw new Error(`Game AI Error: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    return result.recommendations || [];
  }

  // AI Health Check
  async getAIHealth(): Promise<{
    status: string;
    services: Record<string, boolean>;
    timestamp: string;
  }> {
    const response = await fetch(`${API_BASE_URL}/api/v1/ai/health`);
    
    if (!response.ok) {
      throw new Error(`AI Health Check Error: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    return result.data;
  }
}

// Export singleton instance and class for backward compatibility
export const apiService = new APIService();
export { APIService };
export { APIService as API };

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
  serviceMeshMetrics: () => ['service-mesh', 'metrics'] as const,
  serviceMeshStatus: () => ['service-mesh', 'status'] as const,
  services: (serviceType?: string) => ['services', serviceType] as const,
  // GraphQL query keys
  familyMembersGraphQL: () => ['graphql', 'family', 'members'] as const,
  memoriesGraphQL: (filters?: any) => ['graphql', 'memories', filters] as const,
  // AI Query keys
  aiAnalysis: (type: string) => ['ai', 'analysis', type] as const,
  aiSuggestions: (context: string) => ['ai', 'suggestions', context] as const,
  faceRecognition: (imageId: string) => ['ai', 'face', imageId] as const,
  emotionAnalysis: (imageId: string) => ['ai', 'emotion', imageId] as const,
  objectDetection: (imageId: string) => ['ai', 'objects', imageId] as const,
  aiInsights: (memoryId: string) => ['ai', 'insights', memoryId] as const,
  aiHealth: ['ai', 'health'] as const,
  aiTravelRecommendations: (destination: string) => ['ai', 'travel', destination] as const,
  aiGameRecommendations: (familyMembers: string[]) => ['ai', 'games', familyMembers] as const,
} as const;