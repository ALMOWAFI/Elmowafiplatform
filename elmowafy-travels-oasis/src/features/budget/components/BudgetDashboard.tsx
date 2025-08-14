import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, PiggyBank, Wallet, TrendingUp } from 'lucide-react';
import { SpendingPieChart } from './SpendingPieChart';
import { EnvelopeBudgetStatusChart } from './EnvelopeBudgetStatusChart';
import { useEnvelopes, useTransactions } from '../hooks/useBudget';
import { TransactionType, BudgetSummary, ChartData } from '../types';

// Helper to format currency
const formatCurrency = (value: number) => `$${value.toFixed(2)}`;

export function BudgetDashboard() {
  const { data: envelopes, isLoading: isLoadingEnvelopes, error: errorEnvelopes } = useEnvelopes();
  const { data: transactions, isLoading: isLoadingTransactions, error: errorTransactions } = useTransactions();

  // Calculate budget summary and chart data
  const { summary, envelopeBudgetData, monthlyIncome } = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const defaultSummary: BudgetSummary = { totalBudgeted: 0, totalSpent: 0, totalRemaining: 0, count: 0 };
    const defaultResult = { summary: defaultSummary, envelopeBudgetData: [], monthlyIncome: 0 };

    if (!envelopes || !transactions) {
      return defaultResult;
    }

    // Overall Summary
    const totalBudgeted = envelopes.reduce((sum, env) => sum + env.amount, 0);
    const totalSpent = envelopes.reduce((sum, env) => sum + env.spent, 0);
    const overallSummary: BudgetSummary = {
      totalBudgeted,
      totalSpent,
      totalRemaining: totalBudgeted - totalSpent,
      count: envelopes.length,
    };

    // Monthly calculations
    let incomeThisMonth = 0;
    const spentPerEnvelopeThisMonth: { [key: number]: number } = {};

    // Filter transactions for current month
    const monthlyTransactions = transactions.filter((tx) => {
      const txDate = new Date(tx.date);
      return txDate >= startOfMonth && txDate <= endOfMonth;
    });

    monthlyTransactions.forEach((tx) => {
      if (tx.type === TransactionType.INCOME) {
        incomeThisMonth += tx.amount;
      } else if (tx.type === TransactionType.EXPENSE && tx.envelopeId !== null) {
        spentPerEnvelopeThisMonth[tx.envelopeId] = (spentPerEnvelopeThisMonth[tx.envelopeId] || 0) + tx.amount;
      }
    });

    // Format data for EnvelopeBudgetStatusChart
    const budgetDataForChart: ChartData[] = envelopes.map((env) => {
      const spentThisMonth = spentPerEnvelopeThisMonth[env.id] || 0;
      const remainingThisMonth = env.amount - spentThisMonth;
      return {
        name: env.name,
        spent: spentThisMonth,
        remaining: Math.max(0, remainingThisMonth),
        budgeted: env.amount,
        value: spentThisMonth, // For compatibility
      };
    });

    return {
      summary: overallSummary,
      envelopeBudgetData: budgetDataForChart,
      monthlyIncome: incomeThisMonth,
    };
  }, [envelopes, transactions]);

  const isLoading = isLoadingEnvelopes || isLoadingTransactions;
  const error = errorEnvelopes || errorTransactions;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading budget data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-500">
              <p>Error loading budget data. Please try again.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Family Budget</h1>
          <p className="text-gray-600">Track your family's financial health and spending habits</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budgeted</CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalBudgeted)}</div>
            <p className="text-xs text-muted-foreground">Across {summary.count} envelopes</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalSpent)}</div>
            <p className="text-xs text-muted-foreground">This period</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalRemaining)}</div>
            <p className="text-xs text-muted-foreground">Available to spend</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(monthlyIncome)}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
            <CardDescription>This month's spending distribution across envelopes</CardDescription>
          </CardHeader>
          <CardContent>
            <SpendingPieChart />
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>Envelope Status</CardTitle>
            <CardDescription>Spent vs remaining budget for each envelope</CardDescription>
          </CardHeader>
          <CardContent>
            <EnvelopeBudgetStatusChart data={envelopeBudgetData} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}