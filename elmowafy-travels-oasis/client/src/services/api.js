// API Service for Elmowafiplatform Client
import axios from 'axios';

// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const AI_SERVICE_URL = process.env.REACT_APP_AI_SERVICE_URL || 'http://localhost:5000';
const GRAPHQL_URL = `${API_BASE_URL}/api/v1/graphql`;

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized errors
    if (error.response && error.response.status === 401) {
      // Clear local storage and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
const authAPI = {
  login: (credentials) => api.post('/api/auth/login', credentials),
  register: (userData) => api.post('/api/auth/register', userData),
  logout: () => api.post('/api/auth/logout'),
  getCurrentUser: () => api.get('/api/auth/me'),
};

// Family API
const familyAPI = {
  getMembers: () => api.get('/api/family/members'),
  getMember: (id) => api.get(`/api/family/members/${id}`),
  createMember: (memberData) => api.post('/api/family/members', memberData),
  updateMember: (id, memberData) => api.put(`/api/family/members/${id}`, memberData),
  deleteMember: (id) => api.delete(`/api/family/members/${id}`),
  getRelationships: (memberId) => api.get(`/api/family/members/${memberId}/relationships`),
};

// Memories API
const memoriesAPI = {
  getAll: () => api.get('/api/memories'),
  getById: (id) => api.get(`/api/memories/${id}`),
  create: (memoryData) => api.post('/api/memories', memoryData),
  update: (id, memoryData) => api.put(`/api/memories/${id}`, memoryData),
  delete: (id) => api.delete(`/api/memories/${id}`),
  uploadImage: (formData) => api.post('/api/memories/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
};

// Travel Plans API
const travelAPI = {
  getPlans: () => api.get('/api/travel/plans'),
  getPlan: (id) => api.get(`/api/travel/plans/${id}`),
  createPlan: (planData) => api.post('/api/travel/plans', planData),
  updatePlan: (id, planData) => api.put(`/api/travel/plans/${id}`, planData),
  deletePlan: (id) => api.delete(`/api/travel/plans/${id}`),
  getActivities: (planId) => api.get(`/api/travel/plans/${planId}/activities`),
};

// AI Services API
const aiAPI = {
  analyzePhoto: (formData) => api.post('/api/ai/analyze-photo', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  generateTravelPlan: (preferences) => api.post('/api/ai/generate-travel-plan', preferences),
  chatWithFamilyAI: (message) => api.post('/api/ai/chat', { message }),
};

// Export all API services
export {
  api,
  authAPI,
  familyAPI,
  memoriesAPI,
  travelAPI,
  aiAPI,
  API_BASE_URL,
  AI_SERVICE_URL,
  GRAPHQL_URL,
};