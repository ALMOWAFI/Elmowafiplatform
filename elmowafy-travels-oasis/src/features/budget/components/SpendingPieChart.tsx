import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useTransactions, useEnvelopes } from '../hooks/useBudget';
import { TransactionType } from '../types';

// Define colors for the pie chart slices
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1919', '#197BFF', '#FDBA19'];

export function SpendingPieChart() {
  const { data: transactions, isLoading: isLoadingTransactions, error: errorTransactions } = useTransactions();
  const { data: envelopes, isLoading: isLoadingEnvelopes, error: errorEnvelopes } = useEnvelopes();

  const spendingData = useMemo(() => {
    if (!transactions || !envelopes) return [];

    // Get current month boundaries
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Filter transactions for current month expenses
    const monthlyExpenses = transactions.filter((tx) => {
      const txDate = new Date(tx.date);
      return txDate >= startOfMonth && 
             txDate <= endOfMonth && 
             tx.type === TransactionType.EXPENSE && 
             tx.envelopeId;
    });

    // Group spending by envelope
    const spendingByEnvelope: { [key: number]: number } = {};
    monthlyExpenses.forEach((tx) => {
      if (tx.envelopeId) {
        spendingByEnvelope[tx.envelopeId] = (spendingByEnvelope[tx.envelopeId] || 0) + tx.amount;
      }
    });

    // Convert to chart data format
    return Object.entries(spendingByEnvelope).map(([envelopeId, amount]) => {
      const envelope = envelopes.find(env => env.id === parseInt(envelopeId));
      return {
        name: envelope?.name || `Envelope ${envelopeId}`,
        value: amount,
      };
    }).filter(item => item.value > 0);
  }, [transactions, envelopes]);

  const isLoading = isLoadingTransactions || isLoadingEnvelopes;
  const error = errorTransactions || errorEnvelopes;

  if (isLoading) return <div className="text-center text-gray-500 py-8">Loading spending data...</div>;
  if (error) return <div className="text-center text-red-500 py-8">Error loading spending data</div>;
  if (!spendingData || spendingData.length === 0) {
    return <div className="text-center text-gray-500 py-8">No spending data available for the current month.</div>;
  }

  // Calculate total spending for percentage calculation in tooltip
  const totalSpending = spendingData.reduce((sum, entry) => sum + entry.value, 0);

  const formatCurrency = (value: number) => `$${value.toFixed(2)}`;

  return (
    <ResponsiveContainer width="100%" height={350}>
      <PieChart>
        <Pie
          data={spendingData}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={100}
          fill="#8884d8"
          dataKey="value"
          nameKey="name"
        >
          {spendingData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip 
          formatter={(value: number, name: string) => {
             const percentage = totalSpending > 0 ? ((value / totalSpending) * 100).toFixed(1) : 0;
             return [`${formatCurrency(value)} (${percentage}%)`, name];
          }}
          contentStyle={{ background: '#fff', border: '1px solid #ccc', borderRadius: '4px' }}
        />
        <Legend wrapperStyle={{ paddingTop: '20px' }}/>
      </PieChart>
    </ResponsiveContainer>
  );
}