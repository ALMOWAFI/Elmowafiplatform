import { apiClient } from './api';

// Simple in-memory cache (can be replaced with Redis in production)
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes TTL

// Cache helper functions
const getFromCache = <T>(key: string): T | null => {
  const cached = cache.get(key);
  if (!cached) return null;
  
  // Check if cache is expired
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  
  return cached.data as T;
};

const setToCache = (key: string, data: any): void => {
  cache.set(key, { data, timestamp: Date.now() });
};

// Cache keys
const getCacheKey = (prefix: string, params: Record<string, any> = {}): string => {
  return `${prefix}:${JSON.stringify(params)}`;
};

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
    total: number;
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
   * Update any cached lists that might include the given memory
   */
  private updateCachedLists(updatedMemory: Memory): void {
    // Update any cached timeline or search results that might include this memory
    for (const [key, cached] of cache.entries()) {
      if (key.startsWith('timeline:') || key.startsWith('search:')) {
        const data = cached.data as MemoryTimelineResponse;
        if (data?.memories?.some(m => m._id === updatedMemory._id)) {
          // Update the memory in the cached list
          data.memories = data.memories.map(mem => 
            mem._id === updatedMemory._id ? updatedMemory : mem
          );
          
          // Update the timeline entries if they exist
          if (data.timeline) {
            for (const memories of Object.values(data.timeline)) {
              const index = memories.findIndex(m => m._id === updatedMemory._id);
              if (index !== -1) {
                memories[index] = updatedMemory;
              }
            }
          }
          
          // Update the cache with the modified data
          cache.set(key, { ...cached, data });
        }
      }
    }
  }
  
  /**
   * Clear cache entries matching a specific prefix
   */
  // Clear cache entries matching a specific prefix
  private clearCache(prefix: string): void {
    for (const key of cache.keys()) {
      if (key.startsWith(prefix)) {
        cache.delete(key);
      }
    }
  }

  /**
   * Get memory timeline with optional filtering
   */
  /**
   * Get paginated memory timeline with caching
   */
  async getTimeline(options: {
    familyMemberId?: string;
    limit: number;
    skip: number;
    refresh?: boolean;
  }): Promise<MemoryTimelineResponse> {
    const cacheKey = getCacheKey('timeline', { 
      familyMemberId: options.familyMemberId, 
      limit: options.limit, 
      skip: options.skip 
    });
    
    // Return cached data if available and not forcing refresh
    if (!options.refresh) {
      const cached = getFromCache<MemoryTimelineResponse>(cacheKey);
      if (cached) {
        return cached;
      }
    }
    
    const params = new URLSearchParams({
      limit: options.limit.toString(),
      skip: options.skip.toString(),
      ...(options.familyMemberId && { familyMemberId: options.familyMemberId })
    });

    try {
      const response = await apiClient.get(`${this.baseURL}/timeline?${params}`);
      const result = response.data.data;
      
      // Cache the result
      setToCache(cacheKey, result);
      
      return result;
    } catch (error) {
      console.error('Error fetching timeline:', error);
      // Return empty result on error to prevent UI breakage
      return {
        memories: [],
        timeline: {},
        pagination: {
          limit: options.limit,
          skip: options.skip,
          hasMore: false,
          total: 0
        }
      };
    }
  }

  /**
   * Get a single memory by ID
   */
  /**
   * Get a single memory by ID with caching
   */
  async getMemoryById(id: string, refresh: boolean = false): Promise<Memory> {
    const cacheKey = getCacheKey(`memory:${id}`);
    
    // Return cached memory if available and not forcing refresh
    if (!refresh) {
      const cached = getFromCache<Memory>(cacheKey);
      if (cached) {
        return cached;
      }
    }
    
    try {
      const response = await apiClient.get(`${this.baseURL}/${id}`);
      const memory = response.data.data.memory;
      
      // Cache the memory
      setToCache(cacheKey, memory);
      
      // Update any cached lists that might include this memory
      this.updateCachedLists(memory);
      
      return memory;
    } catch (error) {
      console.error(`Error fetching memory ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a memory by ID
   */
  async deleteMemoryById(id: string): Promise<Memory> {
    const cacheKey = getCacheKey(`memory:${id}`);
    
    try {
      const response = await apiClient.delete(`${this.baseURL}/${id}`);
      const memory = response.data.data.memory;
      
      // Cache the memory
      setToCache(cacheKey, memory);
      
      return memory;
    } catch (error) {
      console.error(`Error deleting memory ${id}:`, error);
      throw error;
    }
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

    const response = await apiClient.post(this.baseURL, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.data.memory;
  }

  /**
   * Search memories with various filters
   */
  /**
   * Search memories with pagination and caching
   */
  async searchMemories(options: {
    query?: string;
    tags?: string[];
    category?: string;
    familyMember?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    skip?: number;
    refresh?: boolean;
  } = {}): Promise<{
    memories: Memory[];
    pagination: {
      total: number;
      limit: number;
      skip: number;
      hasMore: boolean;
    };
  }> {
    const cacheKey = getCacheKey('search', { 
      query: options.query,
      tags: options.tags,
      category: options.category,
      familyMember: options.familyMember,
      startDate: options.startDate,
      endDate: options.endDate,
      limit: options.limit,
      skip: options.skip
    });
    
    // Return cached results if available and not forcing refresh
    if (!options.refresh) {
      const cached = getFromCache<{
        memories: Memory[];
        pagination: {
          total: number;
          limit: number;
          skip: number;
          hasMore: boolean;
        };
      }>(cacheKey);
      
      if (cached) {
        return cached;
      }
    }
    
    const params = new URLSearchParams({
      ...(options.query && { q: options.query }),
      ...(options.tags && { tags: options.tags.join(',') }),
      ...(options.category && { category: options.category }),
      ...(options.familyMember && { familyMember: options.familyMember }),
      ...(options.startDate && { startDate: options.startDate }),
      ...(options.endDate && { endDate: options.endDate }),
      limit: (options.limit || 20).toString(),
      skip: (options.skip || 0).toString()
    });
    
    try {
      const response = await apiClient.get(`${this.baseURL}/search?${params}`);
      const result = {
        memories: response.data.data.memories || [],
        pagination: {
          total: response.data.data.total || 0,
          limit: options.limit || 20,
          skip: options.skip || 0,
          hasMore: (options.skip || 0) + (options.limit || 20) < (response.data.data.total || 0)
        }
      };
      
      // Cache the result
      setToCache(cacheKey, result);
      
      // Cache individual memories
      result.memories.forEach((memory: Memory) => {
        setToCache(`memory:${memory._id}`, memory);
      });
      
      return result;
    } catch (error) {
      console.error('Error searching memories:', error);
      // Return empty result on error to prevent UI breakage
      return {
        memories: [],
        pagination: {
          total: 0,
          limit: options.limit || 20,
          skip: options.skip || 0,
          hasMore: false
        }
      };
    }
  }

  /**
   * Like or unlike a memory
   */
  async toggleLike(memoryId: string): Promise<{ liked: boolean; likeCount: number }> {
    const response = await apiClient.post(`${this.baseURL}/${memoryId}/like`, {});
    return response.data.data;
  }

  /**
   * Add a comment to a memory
   */
  async addComment(memoryId: string, text: string): Promise<{
    comments: Memory['comments'];
    commentCount: number;
  }> {
    const response = await apiClient.post(`${this.baseURL}/${memoryId}/comments`, { text });
    return response.data.data;
  }

  /**
   * Get memory statistics
   */
  async getStats(): Promise<MemoryStats> {
    const response = await apiClient.get(`${this.baseURL}/stats`);
    return response.data.data;
  }

  /**
   * Get memories for a specific date range
   */
  async getMemoriesForDateRange(
    startDate: string,
    endDate: string,
    familyMemberId?: string
  ): Promise<{ memories: Memory[] }> {
    const params = new URLSearchParams({
      startDate,
      endDate,
      ...(familyMemberId && { familyMember: familyMemberId })
    });

    const response = await apiClient.get(`${this.baseURL}/date-range?${params}`);
    return { memories: response.data.data.memories };
  }

  /**
   * Get memories by category
   */
  async getMemoriesByCategory(category: string, limit = 20): Promise<{ memories: Memory[] }> {
    const response = await apiClient.get(`${this.baseURL}/category/${category}?limit=${limit}`);
    return { memories: response.data.data.memories };
  }

  /**
   * Get memories for a specific family member
   */
  async getMemoriesForFamilyMember(memberId: string, limit = 50): Promise<{ memories: Memory[] }> {
    const response = await apiClient.get(`${this.baseURL}/timeline?familyMemberId=${memberId}&limit=${limit}`);
    return { memories: response.data.data.memories };
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

    const response = await fetch(`${this.baseURL}/export?${params}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.blob();
  }
}

export const memoryService = new MemoryService();