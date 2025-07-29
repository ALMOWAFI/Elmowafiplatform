import { api } from '../lib/api';

// Types for memory service
export interface Memory {
  _id: string;
  title: string;
  description?: string;
  photos: Array<{
    filename: string;
    url: string;
    originalName: string;
    size: number;
    mimeType: string;
  }>;
  date: string;
  familyMembers: Array<{
    member: {
      _id: string;
      name: string;
      arabicName?: string;
      profilePicture?: string;
    };
    role: 'primary' | 'secondary' | 'mentioned';
    confidence: number;
  }>;
  tags: string[];
  category: string;
  location?: {
    name: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    address?: string;
    city?: string;
    country?: string;
  };
  privacy: 'public' | 'family' | 'private';
  importance: number;
  qualityScore: number;
  likes: Array<{
    user: string;
    likedAt: string;
  }>;
  comments: Array<{
    user: {
      _id: string;
      name: string;
      profilePicture?: string;
    };
    text: string;
    createdAt: string;
  }>;
  likeCount: number;
  commentCount: number;
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  aiAnalysis?: {
    imageInfo: {
      width: number;
      height: number;
      channels: number;
    };
    detectedFaces: any[];
    sceneAnalysis: string;
    suggestedTags: string[];
    emotions: string[];
    activities: string[];
  };
  aiInsights?: {
    memorySuggestions: string[];
    relatedMemories: string[];
    anniversaryDates: string[];
    recommendedActions: string[];
  };
}

export interface MemoryTimelineResponse {
  memories: Memory[];
  timeline: { [dateKey: string]: Memory[] };
  pagination: {
    limit: number;
    skip: number;
    hasMore: boolean;
  };
}

export interface MemoryStats {
  overview: {
    totalMemories: number;
    totalPhotos: number;
    averageImportance: number;
    categoryCounts: string[];
  };
  timeline: Array<{
    _id: {
      year: number;
      month: number;
    };
    count: number;
  }>;
}

export interface CreateMemoryData {
  title?: string;
  description?: string;
  date: string;
  familyMembers: Array<{
    memberId: string;
    role?: 'primary' | 'secondary' | 'mentioned';
    confidence?: number;
  }>;
  tags?: string[];
  category?: string;
  location?: {
    name: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    address?: string;
    city?: string;
    country?: string;
  };
  privacy?: 'public' | 'family' | 'private';
  importance?: number;
}

class MemoryService {
  private baseURL = '/api/v1/memories';

  /**
   * Get memory timeline with optional filtering
   */
  async getTimeline(options: {
    familyMemberId?: string;
    limit?: number;
    skip?: number;
  } = {}): Promise<MemoryTimelineResponse> {
    const params = new URLSearchParams();
    
    if (options.familyMemberId) {
      params.append('familyMemberId', options.familyMemberId);
    }
    
    if (options.limit) {
      params.append('limit', options.limit.toString());
    }
    
    if (options.skip) {
      params.append('skip', options.skip.toString());
    }

    const response = await api.get(`${this.baseURL}/timeline?${params}`);
    return response.data.data;
  }

  /**
   * Get a single memory by ID
   */
  async getMemoryById(id: string): Promise<Memory> {
    const response = await api.get(`${this.baseURL}/${id}`);
    return response.data.data.memory;
  }

  /**
   * Create a new memory with photos
   */
  async createMemory(
    photos: File[],
    memoryData: CreateMemoryData
  ): Promise<Memory> {
    const formData = new FormData();
    
    // Add photos
    photos.forEach((photo) => {
      formData.append('photos', photo);
    });
    
    // Add memory data
    formData.append('title', memoryData.title || '');
    formData.append('description', memoryData.description || '');
    formData.append('date', memoryData.date);
    formData.append('familyMembers', JSON.stringify(memoryData.familyMembers));
    formData.append('tags', JSON.stringify(memoryData.tags || []));
    formData.append('category', memoryData.category || 'everyday');
    formData.append('privacy', memoryData.privacy || 'family');
    formData.append('importance', (memoryData.importance || 5).toString());
    
    if (memoryData.location) {
      formData.append('location', JSON.stringify(memoryData.location));
    }

    const response = await api.post(this.baseURL, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.data.memory;
  }

  /**
   * Search memories with various filters
   */
  async searchMemories(options: {
    query?: string;
    tags?: string[];
    category?: string;
    familyMember?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  } = {}): Promise<Memory[]> {
    const params = new URLSearchParams();
    
    if (options.query) {
      params.append('query', options.query);
    }
    
    if (options.tags && options.tags.length > 0) {
      params.append('tags', options.tags.join(','));
    }
    
    if (options.category) {
      params.append('category', options.category);
    }
    
    if (options.familyMember) {
      params.append('familyMember', options.familyMember);
    }
    
    if (options.startDate) {
      params.append('startDate', options.startDate);
    }
    
    if (options.endDate) {
      params.append('endDate', options.endDate);
    }
    
    if (options.limit) {
      params.append('limit', options.limit.toString());
    }

    const response = await api.get(`${this.baseURL}/search?${params}`);
    return response.data.data.memories;
  }

  /**
   * Like or unlike a memory
   */
  async toggleLike(memoryId: string): Promise<{ liked: boolean; likeCount: number }> {
    const response = await api.post(`${this.baseURL}/${memoryId}/like`);
    return response.data.data;
  }

  /**
   * Add a comment to a memory
   */
  async addComment(memoryId: string, text: string): Promise<{
    comments: Memory['comments'];
    commentCount: number;
  }> {
    const response = await api.post(`${this.baseURL}/${memoryId}/comment`, { text });
    return response.data.data;
  }

  /**
   * Get memory statistics
   */
  async getStats(): Promise<MemoryStats> {
    const response = await api.get(`${this.baseURL}/stats/overview`);
    return response.data.data;
  }

  /**
   * Get memories for a specific date range
   */
  async getMemoriesForDateRange(
    startDate: string,
    endDate: string,
    familyMemberId?: string
  ): Promise<Memory[]> {
    const params = new URLSearchParams();
    params.append('startDate', startDate);
    params.append('endDate', endDate);
    
    if (familyMemberId) {
      params.append('familyMember', familyMemberId);
    }

    const response = await api.get(`${this.baseURL}/search?${params}`);
    return response.data.data.memories;
  }

  /**
   * Get memories by category
   */
  async getMemoriesByCategory(category: string, limit = 20): Promise<Memory[]> {
    const response = await api.get(`${this.baseURL}/search?category=${category}&limit=${limit}`);
    return response.data.data.memories;
  }

  /**
   * Get memories for a specific family member
   */
  async getMemoriesForFamilyMember(memberId: string, limit = 50): Promise<Memory[]> {
    const response = await api.get(`${this.baseURL}/timeline?familyMemberId=${memberId}&limit=${limit}`);
    return response.data.data.memories;
  }

  /**
   * Get related memories (AI-powered suggestions)
   */
  async getRelatedMemories(memoryId: string): Promise<Memory[]> {
    // This would typically call an AI service to find related memories
    // For now, we'll use search with tags from the original memory
    const memory = await this.getMemoryById(memoryId);
    
    if (memory.tags.length > 0) {
      return this.searchMemories({
        tags: memory.tags.slice(0, 3), // Use first 3 tags
        limit: 5
      });
    }
    
    return [];
  }

  /**
   * Generate memory insights using AI
   */
  async generateInsights(memoryId: string): Promise<{
    suggestions: string[];
    relatedMemories: Memory[];
    recommendedActions: string[];
  }> {
    // This would call your AI service to generate insights
    // For now, return mock data
    const relatedMemories = await this.getRelatedMemories(memoryId);
    
    return {
      suggestions: [
        'This photo would look great in a family album',
        'Consider creating a travel scrapbook',
        'Share this memory with extended family'
      ],
      relatedMemories: relatedMemories.slice(0, 3),
      recommendedActions: [
        'Add more family members to this memory',
        'Tag the location for better organization',
        'Write a detailed description'
      ]
    };
  }

  /**
   * Export memories to various formats
   */
  async exportMemories(options: {
    format: 'json' | 'csv' | 'pdf';
    filters?: {
      startDate?: string;
      endDate?: string;
      familyMember?: string;
      category?: string;
    };
  }): Promise<Blob> {
    const params = new URLSearchParams();
    params.append('format', options.format);
    
    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        if (value) {
          params.append(key, value);
        }
      });
    }

    const response = await api.get(`${this.baseURL}/export?${params}`, {
      responseType: 'blob'
    });
    
    return response.data;
  }
}

export const memoryService = new MemoryService();