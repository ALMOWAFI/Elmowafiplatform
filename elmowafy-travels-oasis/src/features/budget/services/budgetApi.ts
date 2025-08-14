import axios from 'axios';
import { Envelope, Transaction, BudgetProfile, TransactionType } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://elmowafiplatform-production.up.railway.app';

// Mock budget data for demo (until backend budget endpoints are fixed)
const MOCK_ENVELOPES = [
  {"id": 1, "name": "Groceries", "amount": 800, "spent": 650, "category": "Essentials", "userId": "demo-user-1"},
  {"id": 2, "name": "Entertainment", "amount": 400, "spent": 320, "category": "Lifestyle", "userId": "demo-user-1"},
  {"id": 3, "name": "Transportation", "amount": 500, "spent": 380, "category": "Essentials", "userId": "demo-user-1"},
  {"id": 4, "name": "Dining Out", "amount": 600, "spent": 520, "category": "Lifestyle", "userId": "demo-user-1"},
  {"id": 5, "name": "Utilities", "amount": 350, "spent": 330, "category": "Housing", "userId": "demo-user-1"},
  {"id": 6, "name": "Savings", "amount": 1000, "spent": 0, "category": "Financial", "userId": "demo-user-1"},
];

const MOCK_TRANSACTIONS = [
  {"id": 1, "amount": 150, "description": "Weekly groceries at Al-Danube", "date": "2025-08-10", "type": "EXPENSE", "envelopeId": 1, "userId": "demo-user-1"},
  {"id": 2, "amount": 80, "description": "Family movie tickets", "date": "2025-08-11", "type": "EXPENSE", "envelopeId": 2, "userId": "demo-user-1"},
  {"id": 3, "amount": 5000, "description": "Monthly salary", "date": "2025-08-01", "type": "INCOME", "envelopeId": null, "userId": "demo-user-1"},
  {"id": 4, "amount": 45, "description": "Gas station", "date": "2025-08-12", "type": "EXPENSE", "envelopeId": 3, "userId": "demo-user-1"},
  {"id": 5, "amount": 120, "description": "Family dinner at restaurant", "date": "2025-08-13", "type": "EXPENSE", "envelopeId": 4, "userId": "demo-user-1"},
];

// Create axios instance with auth
const api = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  withCredentials: true,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Envelope API  
export const envelopeApi = {
  getAll: async (): Promise<Envelope[]> => {
    try {
      const response = await api.get('/budget/envelopes');
      return response.data.data || [];
    } catch (error) {
      // Fallback to mock data if backend endpoints not available
      console.warn('Budget API not available, using mock data');
      return MOCK_ENVELOPES;
    }
  },

  create: async (envelope: Partial<Envelope>): Promise<Envelope> => {
    const response = await api.post('/budget/envelopes', envelope);
    return response.data.data;
  },

  update: async (id: number, envelope: Partial<Envelope>): Promise<Envelope> => {
    const response = await api.patch(`/budget/envelopes/${id}`, envelope);
    return response.data.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/budget/envelopes/${id}`);
  },
};

// Transaction API
export const transactionApi = {
  getAll: async (): Promise<Transaction[]> => {
    try {
      const response = await api.get('/budget/transactions');
      return response.data.data || [];
    } catch (error) {
      // Fallback to mock data if backend endpoints not available
      console.warn('Budget API not available, using mock data');
      return MOCK_TRANSACTIONS;
    }
  },

  create: async (transaction: Partial<Transaction>): Promise<Transaction> => {
    const response = await api.post('/budget/transactions', transaction);
    return response.data.data;
  },

  update: async (id: number, transaction: Partial<Transaction>): Promise<Transaction> => {
    const response = await api.patch(`/budget/transactions/${id}`, transaction);
    return response.data.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/budget/transactions/${id}`);
  },
};

// Budget Profile API
export const budgetProfileApi = {
  getAll: async (): Promise<BudgetProfile[]> => {
    try {
      const response = await api.get('/budget/profiles');
      return response.data.data || [];
    } catch (error) {
      // Fallback to mock data if backend endpoints not available
      console.warn('Budget API not available, using mock data');
      return [{"id": 1, "name": "Family Budget", "userId": "demo-user-1"}];
    }
  },

  create: async (profile: Partial<BudgetProfile>): Promise<BudgetProfile> => {
    const response = await api.post('/budget/profiles', profile);
    return response.data.data;
  },
};