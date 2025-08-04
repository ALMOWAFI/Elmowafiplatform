// API Service for Elmowafiplatform
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// AI Service URL for AI-specific endpoints
const AI_SERVICE_URL = import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:5000';

// Authentication token management
let authToken: string | null = localStorage.getItem('authToken');

// API client with authentication
export const apiClient = {
  get: async (endpoint: string) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { Authorization: `Bearer ${authToken}` }),
      },
    });
    
    if (!response.ok) {
      // Try to parse the standardized error response
      try {
        const errorData = await response.json();
        if (errorData.error_code && errorData.message) {
          throw new Error(`${errorData.error}: ${errorData.message} (${errorData.error_code})`);
        }
      } catch (parseError) {
        // Fall back to generic error if parsing fails
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  },

  post: async (endpoint: string, data: any, options: RequestInit = {}) => {
    // Use AI_SERVICE_URL for AI endpoints, otherwise use API_BASE_URL
    const baseUrl = endpoint.startsWith('/ai/') ? AI_SERVICE_URL : API_BASE_URL;
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { Authorization: `Bearer ${authToken}` }),
        ...(options.headers || {}),
      },
      body: JSON.stringify(data),
      ...options,
    });
    
    if (!response.ok) {
      // Try to parse the standardized error response
      try {
        const errorData = await response.json();
        if (errorData.error_code && errorData.message) {
          throw new Error(`${errorData.error}: ${errorData.message} (${errorData.error_code})`);
        }
      } catch (parseError) {
        // Fall back to generic error if parsing fails
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  },

  put: async (endpoint: string, data: any) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { Authorization: `Bearer ${authToken}` }),
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      // Try to parse the standardized error response
      try {
        const errorData = await response.json();
        if (errorData.error_code && errorData.message) {
          throw new Error(`${errorData.error}: ${errorData.message} (${errorData.error_code})`);
        }
      } catch (parseError) {
        // Fall back to generic error if parsing fails
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  },

  delete: async (endpoint: string) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { Authorization: `Bearer ${authToken}` }),
      },
    });
    
    if (!response.ok) {
      // Try to parse the standardized error response
      try {
        const errorData = await response.json();
        if (errorData.error_code && errorData.message) {
          throw new Error(`${errorData.error}: ${errorData.message} (${errorData.error_code})`);
        }
      } catch (parseError) {
        // Fall back to generic error if parsing fails
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  },
};

// Authentication services
export const authService = {
  // Get current authenticated user's profile
  getProfile: async () => {
    return apiClient.get('/auth/me');
  },
  register: async (userData: { username: string; email: string; password: string }) => {
    const response = await apiClient.post('/auth/register', userData);
    return response;
  },

  login: async (credentials: { email: string; password: string }) => {
    const response = await apiClient.post('/auth/login', credentials);
    if (response.access_token) {
      authToken = response.access_token;
      localStorage.setItem('authToken', authToken);
    }
    return response;
  },

  logout: async () => {
    try {
      await apiClient.post('/auth/logout', {});
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      authToken = null;
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  },

  refresh: async (refreshToken: string) => {
    const response = await apiClient.post('/auth/refresh', { refresh_token: refreshToken });
    if (response.access_token) {
      authToken = response.access_token;
      localStorage.setItem('authToken', authToken);
      localStorage.setItem('refreshToken', response.refresh_token);
    }
    return response;
  },

  getCurrentUser: async () => {
    return apiClient.get('/auth/me');
  },

  isAuthenticated: () => !!authToken,
};

// Family services
export const familyService = {
  getMembers: async () => {
    return apiClient.get('/family/members');
  },

  createMember: async (memberData: any) => {
    return apiClient.post('/family/members', memberData);
  },

  updateMember: async (id: string, memberData: any) => {
    return apiClient.put(`/family/members/${id}`, memberData);
  },

  deleteMember: async (id: string) => {
    return apiClient.delete(`/family/members/${id}`);
  },
};

// Search services
export const searchService = {
  /**
   * Global search for memories, events, people, etc. (initially memories)
   */
  search: async (params: { query?: string; tags?: string[]; category?: string; familyMember?: string; startDate?: string; endDate?: string; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params.query) searchParams.append('query', params.query);
    if (params.tags && params.tags.length) searchParams.append('tags', params.tags.join(','));
    if (params.category) searchParams.append('category', params.category);
    if (params.familyMember) searchParams.append('familyMember', params.familyMember);
    if (params.startDate) searchParams.append('startDate', params.startDate);
    if (params.endDate) searchParams.append('endDate', params.endDate);
    if (params.limit) searchParams.append('limit', params.limit.toString());
    return apiClient.get(`/memories/search?${searchParams.toString()}`);
  }
};

// Memory services
export const memoryService = {
  getMemories: async () => {
    return apiClient.get('/memories');
  },

  createMemory: async (memoryData: any) => {
    return apiClient.post('/memories', memoryData);
  },

  getSuggestions: async () => {
    return apiClient.get('/memories/suggestions');
  },

  uploadPhoto: async (file: File, memoryId?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (memoryId) {
      formData.append('memory_id', memoryId);
    }

    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      headers: {
        ...(authToken && { Authorization: `Bearer ${authToken}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      // Try to parse the standardized error response
      try {
        const errorData = await response.json();
        if (errorData.error_code && errorData.message) {
          throw new Error(`${errorData.error}: ${errorData.message} (${errorData.error_code})`);
        }
      } catch (parseError) {
        // Fall back to generic error if parsing fails
      }
      throw new Error(`Upload failed! status: ${response.status}`);
    }

    return response.json();
  },
};

// Travel services
export const travelService = {
  getRecommendations: async (destination: string, budget: number, familyMembers: string[]) => {
    return apiClient.post('/travel/recommendations', {
      destination,
      budget,
      familyMembers,
    });
  },

  createPlan: async (planData: any) => {
    return apiClient.post('/travel/plans', planData);
  },

  getPlans: async () => {
    return apiClient.get('/travel/plans');
  },
};

// Gaming services
export const gamingService = {
  getGameRules: async (gameName: string) => {
    return apiClient.get(`/games/rules/${gameName}`);
  },

  createLocationChallenge: async (challengeData: any) => {
    return apiClient.post('/games/location/challenges', challengeData);
  },

  getChallenges: async () => {
    return apiClient.get('/games/location/challenges');
  },
};

// Cultural services
export const culturalService = {
  getHeritage: async () => {
    return apiClient.get('/culture/heritage');
  },

  translate: async (text: string, targetLanguage: string) => {
    return apiClient.post('/culture/translate', {
      text,
      target_language: targetLanguage,
    });
  },
};

// AI services
export const aiService = {
  // Facial recognition services
  trainFaceRecognition: async (imageFile: File, familyMemberId: string) => {
    const formData = new FormData();
    formData.append('file', imageFile);
    formData.append('family_member_id', familyMemberId);

    const response = await fetch(`${API_BASE_URL}/ai/faces/train`, {
      method: 'POST',
      headers: {
        ...(authToken && { Authorization: `Bearer ${authToken}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      // Try to parse the standardized error response
      try {
        const errorData = await response.json();
        if (errorData.error_code && errorData.message) {
          throw new Error(`${errorData.error}: ${errorData.message} (${errorData.error_code})`);
        }
      } catch (parseError) {
        // Fall back to generic error if parsing fails
      }
      throw new Error(`Training failed! status: ${response.status}`);
    }

    return response.json();
  },

  identifyFace: async (imageFile: File) => {
    const formData = new FormData();
    formData.append('file', imageFile);

    const response = await fetch(`${API_BASE_URL}/ai/faces/identify`, {
      method: 'POST',
      headers: {
        ...(authToken && { Authorization: `Bearer ${authToken}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      // Try to parse the standardized error response
      try {
        const errorData = await response.json();
        if (errorData.error_code && errorData.message) {
          throw new Error(`${errorData.error}: ${errorData.message} (${errorData.error_code})`);
        }
      } catch (parseError) {
        // Fall back to generic error if parsing fails
      }
      throw new Error(`Identification failed! status: ${response.status}`);
    }

    return response.json();
  },

  getFaceSuggestions: async () => {
    return apiClient.get('/ai/faces/suggestions');
  },

  analyzeFaceQuality: async (imageFile: File) => {
    const formData = new FormData();
    formData.append('file', imageFile);

    const response = await fetch(`${API_BASE_URL}/ai/faces/analysis`, {
      method: 'POST',
      headers: {
        ...(authToken && { Authorization: `Bearer ${authToken}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      // Try to parse the standardized error response
      try {
        const errorData = await response.json();
        if (errorData.error_code && errorData.message) {
          throw new Error(`${errorData.error}: ${errorData.message} (${errorData.error_code})`);
        }
      } catch (parseError) {
        // Fall back to generic error if parsing fails
      }
      throw new Error(`Analysis failed! status: ${response.status}`);
    }

    return response.json();
  },

  retrainFaceModel: async () => {
    return apiClient.post('/ai/faces/retrain', {});
  },

  getFaceHistory: async (familyMemberId?: string) => {
    const endpoint = familyMemberId 
      ? `/ai/faces/history?family_member_id=${familyMemberId}` 
      : '/ai/faces/history';
    return apiClient.get(endpoint);
  },

  removeFaceData: async (familyMemberId: string) => {
    return apiClient.delete(`/ai/faces/${familyMemberId}`);
  },
};

// Budget services
export const budgetService = {
  // Budget Management
  getBudgets: async () => {
    return apiClient.get('/budgets');
  },

  getBudget: async (budgetId: string) => {
    return apiClient.get(`/budgets/${budgetId}`);
  },

  createBudget: async (budgetData: any) => {
    return apiClient.post('/budgets', budgetData);
  },

  updateBudget: async (budgetId: string, budgetData: any) => {
    return apiClient.put(`/budgets/${budgetId}`, budgetData);
  },

  deleteBudget: async (budgetId: string) => {
    return apiClient.delete(`/budgets/${budgetId}`);
  },

  // Categories
  getCategories: async (budgetId: string) => {
    return apiClient.get(`/budgets/${budgetId}/categories`);
  },

  createCategory: async (budgetId: string, categoryData: any) => {
    return apiClient.post(`/budgets/${budgetId}/categories`, categoryData);
  },

  updateCategory: async (budgetId: string, categoryId: string, categoryData: any) => {
    return apiClient.put(`/budgets/${budgetId}/categories/${categoryId}`, categoryData);
  },

  deleteCategory: async (budgetId: string, categoryId: string) => {
    return apiClient.delete(`/budgets/${budgetId}/categories/${categoryId}`);
  },

  // Transactions
  getTransactions: async (budgetId: string, params?: any) => {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    return apiClient.get(`/budgets/${budgetId}/transactions${queryString}`);
  },

  createTransaction: async (budgetId: string, transactionData: any) => {
    return apiClient.post(`/budgets/${budgetId}/transactions`, transactionData);
  },

  updateTransaction: async (budgetId: string, transactionId: string, transactionData: any) => {
    return apiClient.put(`/budgets/${budgetId}/transactions/${transactionId}`, transactionData);
  },

  deleteTransaction: async (budgetId: string, transactionId: string) => {
    return apiClient.delete(`/budgets/${budgetId}/transactions/${transactionId}`);
  },

  // Analytics
  getAnalytics: async (budgetId: string, period?: string) => {
    const queryString = period ? `?period=${period}` : '';
    return apiClient.get(`/budgets/${budgetId}/analytics${queryString}`);
  },

  getInsights: async (budgetId: string) => {
    return apiClient.get(`/budgets/${budgetId}/insights`);
  },

  // Templates
  getTemplates: async () => {
    return apiClient.get('/budget-templates');
  },

  createFromTemplate: async (templateId: string, budgetData: any) => {
    return apiClient.post(`/budget-templates/${templateId}/create-budget`, budgetData);
  },

  // AI Features
  aiCategorizeTransactions: async (budgetId: string) => {
    return apiClient.post(`/budgets/${budgetId}/ai/categorize`);
  },

  aiGetRecommendations: async (budgetId: string) => {
    return apiClient.post(`/budgets/${budgetId}/ai/recommendations`);
  },

  aiOptimizeBudget: async (budgetId: string) => {
    return apiClient.post(`/budgets/${budgetId}/ai/optimize`);
  },
};

// Health check
export const healthService = {
  check: async () => {
    return apiClient.get('/health');
  },
};

export default {
  auth: authService,
  family: familyService,
  memory: memoryService,
  travel: travelService,
  gaming: gamingService,
  cultural: culturalService,
  ai: aiService,
  budget: budgetService,
  health: healthService,
};