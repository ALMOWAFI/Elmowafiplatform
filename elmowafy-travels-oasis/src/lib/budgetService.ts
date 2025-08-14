// Budget Service for Elmowafiplatform
// This module handles all communication between the frontend and the budget API endpoints

import { apiService } from './api';
import { mockBudgetData } from './mockBudgetData';

// Toggle this flag to use mock data instead of real API calls
const USE_MOCK_DATA = false;

// Types for Budget API responses
export interface BudgetSummary {
  totalBudget: number;
  totalSpent: number;
  remainingBudget: number;
  currency: string;
  integrated: boolean;
  envelopes: BudgetEnvelope[];
  monthlyTrend: MonthlyTrend[];
  insights?: string[];
}

export interface BudgetEnvelope {
  id: string;
  name: string;
  budgeted: number;
  spent: number;
  remaining: number;
  category: string;
  color?: string;
  icon?: string;
}

export interface MonthlyTrend {
  income: number;
  expenses: number;
  month: string;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  envelopeId?: string;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
}

export interface TravelBudgetRecommendation {
  category: string;
  amount: number;
  available: boolean;
  description: string;
}

export interface BudgetAnalytics {
  spendingTrends: {
    categories: string[];
    amounts: number[];
    period: string;
  };
  budgetHealth: {
    status: 'healthy' | 'warning' | 'critical';
    score: number;
    details: string;
  };
  insights: string[];
  recommendations: string[];
}

// Budget Service Class
class BudgetService {
  // Get budget summary with envelopes and trends
  async getBudgetSummary(): Promise<BudgetSummary> {
    if (USE_MOCK_DATA) {
      console.log('Using mock budget data');
      return Promise.resolve(mockBudgetData);
    }
    return apiService.getBudgetSummary();
  }

  // Get travel budget recommendations
  async getTravelBudgetRecommendations(destination?: string, estimatedBudget?: number): Promise<{
    recommendations: TravelBudgetRecommendation[];
    totalRecommended: number;
    currency: string;
  }> {
    if (USE_MOCK_DATA) {
      // Mock travel budget recommendations
      return Promise.resolve({
        recommendations: [
          { category: 'Accommodation', amount: 800, available: true, description: 'Hotels and lodging' },
          { category: 'Transportation', amount: 400, available: true, description: 'Local transit and car rentals' },
          { category: 'Food', amount: 600, available: true, description: 'Restaurants and groceries' },
          { category: 'Activities', amount: 500, available: true, description: 'Tours and entertainment' },
          { category: 'Shopping', amount: 300, available: false, description: 'Souvenirs and gifts' }
        ],
        totalRecommended: 2600,
        currency: '$'
      });
    }
    return apiService.getTravelBudgetRecommendations(destination, estimatedBudget);
  }

  // Create a new budget envelope
  async createBudgetEnvelope(envelopeData: {
    name: string;
    amount: number;
    category: string;
    color?: string;
    icon?: string;
  }): Promise<BudgetEnvelope> {
    if (USE_MOCK_DATA) {
      // Mock creating a new envelope
      const newEnvelope: BudgetEnvelope = {
        id: `mock-${Date.now()}`,
        name: envelopeData.name,
        budgeted: envelopeData.amount,
        spent: 0,
        remaining: envelopeData.amount,
        category: envelopeData.category,
        color: envelopeData.color,
        icon: envelopeData.icon
      };
      return Promise.resolve(newEnvelope);
    }
    return apiService.createBudgetEnvelope(envelopeData);
  }

  // Add a new transaction
  async addTransaction(transactionData: {
    description: string;
    amount: number;
    date: string;
    type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
    envelopeId?: string;
    category?: string;
  }): Promise<Transaction> {
    if (USE_MOCK_DATA) {
      // Mock adding a transaction
      const newTransaction: Transaction = {
        id: `mock-transaction-${Date.now()}`,
        description: transactionData.description,
        amount: transactionData.amount,
        date: transactionData.date,
        category: transactionData.category || 'Uncategorized',
        envelopeId: transactionData.envelopeId,
        type: transactionData.type
      };
      return Promise.resolve(newTransaction);
    }
    
    // Use the apiService to call the correct endpoint
    return apiService.fetchWithAuth('/api/v1/budget/transactions', {
      method: 'POST',
      body: JSON.stringify(transactionData),
    });

    if (!response.ok) {
      throw new Error(`Transaction Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Get budget analytics
  async getBudgetAnalytics(): Promise<BudgetAnalytics> {
    if (USE_MOCK_DATA) {
      // Mock budget analytics
      return Promise.resolve({
        spendingTrends: {
          categories: ['Groceries', 'Entertainment', 'Transportation', 'Dining Out', 'Utilities'],
          amounts: [650, 320, 380, 520, 330],
          period: 'June 2023'
        },
        budgetHealth: {
          status: 'healthy',
          score: 85,
          details: 'Your budget is on track. You have allocated funds appropriately across categories.'
        },
        insights: [
          'Your spending in the Entertainment category is consistent with your budget goals.',
          'Consider reallocating funds from your Savings to your Travel Fund for your upcoming trip.'
        ],
        recommendations: [
          'Reduce dining out expenses by 10% to increase your savings rate.',
          'Set up automatic transfers to your Travel Fund to reach your goal faster.'
        ]
      });
    }
    
    // Use the apiService to call the correct endpoint
    return apiService.fetchWithAuth('/api/v1/budget/analytics');
  }

  // Get budget performance metrics
  async getBudgetPerformance(): Promise<any> {
    if (USE_MOCK_DATA) {
      // Mock budget performance
      return Promise.resolve({
        savingsRate: 20,
        monthOverMonth: {
          spending: -5, // 5% decrease in spending
          income: 2,   // 2% increase in income
          savings: 15  // 15% increase in savings
        },
        budgetAdherence: 92, // 92% adherence to budget
        topCategories: {
          underBudget: ['Transportation', 'Utilities'],
          overBudget: ['Dining Out']
        }
      });
    }
    
    // Use the apiService to call the correct endpoint
    return apiService.fetchWithAuth('/api/v1/budget/performance');
  }
}

// Export singleton instance
export const budgetService = new BudgetService();

// React Query keys for caching
export const budgetQueryKeys = {
  budgetSummary: () => ['budget', 'summary'] as const,
  travelBudgetRecommendations: (destination?: string, budget?: number) => ['budget', 'travel', destination, budget] as const,
  budgetEnvelopes: () => ['budget', 'envelopes'] as const,
  transactions: () => ['budget', 'transactions'] as const,
  budgetAnalytics: () => ['budget', 'analytics'] as const,
  budgetPerformance: () => ['budget', 'performance'] as const,
} as const;