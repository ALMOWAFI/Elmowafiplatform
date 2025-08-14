import { BudgetSummary } from './budgetService';

/**
 * Mock budget data for development and testing
 */
export const mockBudgetData: BudgetSummary = {
  totalBudget: 5000,
  totalSpent: 2750,
  remainingBudget: 2250,
  currency: '$',
  envelopes: [
    {
      id: '1',
      name: 'Groceries',
      category: 'Essentials',
      budgeted: 800,
      spent: 650,
      remaining: 150
    },
    {
      id: '2',
      name: 'Entertainment',
      category: 'Lifestyle',
      budgeted: 400,
      spent: 320,
      remaining: 80
    },
    {
      id: '3',
      name: 'Transportation',
      category: 'Essentials',
      budgeted: 500,
      spent: 380,
      remaining: 120
    },
    {
      id: '4',
      name: 'Dining Out',
      category: 'Lifestyle',
      budgeted: 600,
      spent: 520,
      remaining: 80
    },
    {
      id: '5',
      name: 'Utilities',
      category: 'Housing',
      budgeted: 350,
      spent: 330,
      remaining: 20
    },
    {
      id: '6',
      name: 'Savings',
      category: 'Financial',
      budgeted: 1000,
      spent: 0,
      remaining: 1000
    },
    {
      id: '7',
      name: 'Education',
      category: 'Personal',
      budgeted: 300,
      spent: 250,
      remaining: 50
    },
    {
      id: '8',
      name: 'Healthcare',
      category: 'Essentials',
      budgeted: 400,
      spent: 300,
      remaining: 100
    },
    {
      id: '9',
      name: 'Travel Fund',
      category: 'Lifestyle',
      budgeted: 650,
      spent: 0,
      remaining: 650
    }
  ],
  monthlyTrend: [
    {
      month: 'Jan',
      income: 4500,
      expenses: 3800
    },
    {
      month: 'Feb',
      income: 4500,
      expenses: 3600
    },
    {
      month: 'Mar',
      income: 4800,
      expenses: 3900
    },
    {
      month: 'Apr',
      income: 4800,
      expenses: 3700
    },
    {
      month: 'May',
      income: 5000,
      expenses: 3850
    },
    {
      month: 'Jun',
      income: 5000,
      expenses: 2750
    }
  ],
  insights: [
    'Your "Utilities" envelope is 94% spent. Consider adding more funds if needed.',
    'You haven\'t used your "Travel Fund" yet. Planning a trip soon?',
    'Your spending in "Groceries" is 19% higher than last month.',
    'Great job staying under budget in "Transportation" this month!',
    'Based on your spending patterns, you could save an additional $120 by reducing "Dining Out" expenses.'
  ]
};