import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { ChartData } from '../types';

interface EnvelopeBudgetStatusChartProps {
  data: ChartData[];
}

// Helper to format currency for tooltip/axis
const formatCurrency = (value: number) => {
  return `$${value.toFixed(2)}`; 
};

export function EnvelopeBudgetStatusChart({ data }: EnvelopeBudgetStatusChartProps) {
  if (!data || data.length === 0) {
    return <div className="text-center text-gray-500 py-8">No envelope data to display.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart
        data={data}
        margin={{
          top: 20,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis 
          dataKey="name" 
          tickLine={false} 
          axisLine={false} 
          fontSize={12}
        />
        <YAxis 
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `$${value}`}
        />
        <Tooltip 
          formatter={(value: number, name: string) => [
            formatCurrency(value), 
            name === 'spent' ? 'Spent' : 'Remaining'
          ]}
          cursor={{ fill: 'transparent' }}
        />
        <Legend 
          iconType="circle"
          formatter={(value) => value === 'spent' ? 'Spent' : 'Remaining'}
        />
        {/* Stacked Bars: spent first, then remaining on top */}
        <Bar dataKey="spent" stackId="a" fill="#f87171" radius={[0, 0, 4, 4]} name="Spent" />
        <Bar dataKey="remaining" stackId="a" fill="#22c55e" radius={[4, 4, 0, 0]} name="Remaining" />
      </BarChart>
    </ResponsiveContainer>
  );
}