// Budget feature types
export interface Envelope {
  id: number;
  name: string;
  amount: number;
  spent: number;
  category?: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: number;
  amount: number;
  description: string;
  date: Date;
  type: TransactionType;
  envelopeId: number | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE'
}

export interface BudgetProfile {
  id: number;
  name: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BudgetSummary {
  totalBudgeted: number;
  totalSpent: number;
  totalRemaining: number;
  count: number;
}

export interface ChartData {
  name: string;
  value: number;
  spent?: number;
  remaining?: number;
  budgeted?: number;
}