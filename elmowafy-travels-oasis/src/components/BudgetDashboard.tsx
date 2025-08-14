import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Wallet, TrendingUp, DollarSign, PiggyBank, AlertTriangle } from 'lucide-react';
import { budgetService, BudgetSummary, BudgetEnvelope } from '../lib/budgetService';
import { useLanguage } from '../context/LanguageContext';

const BudgetDashboard: React.FC = () => {
  const { t, isRTL } = useLanguage();
  const [budgetData, setBudgetData] = useState<BudgetSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBudgetData = async () => {
      try {
        setLoading(true);
        const data = await budgetService.getBudgetSummary();
        setBudgetData(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching budget data:', err);
        setError('Failed to load budget data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchBudgetData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-red-50 border-red-200">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-red-500 h-6 w-6" />
            <p className="text-red-700">{error}</p>
          </div>
          <Button 
            variant="outline" 
            className="mt-4" 
            onClick={() => window.location.reload()}
          >
            {t('retry')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!budgetData) {
    return null;
  }

  const { totalBudget, totalSpent, remainingBudget, currency, envelopes, monthlyTrend } = budgetData;
  
  // Calculate budget health percentage
  const budgetHealthPercentage = totalBudget > 0 ? (remainingBudget / totalBudget) * 100 : 0;
  const budgetHealthColor = 
    budgetHealthPercentage > 50 ? 'bg-green-500' :
    budgetHealthPercentage > 20 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="space-y-8">
      {/* Budget Summary Section */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-8 px-6 rounded-xl">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Wallet className="h-8 w-8" />
            <h2 className="text-2xl font-bold">{t('budget_dashboard')}</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <Card className="bg-white/10 border-none text-white">
              <CardContent className="pt-6">
                <p className="text-sm font-medium mb-1 opacity-80">{t('total_budget')}</p>
                <h3 className="text-2xl font-bold">{currency} {totalBudget.toLocaleString()}</h3>
              </CardContent>
            </Card>
            
            <Card className="bg-white/10 border-none text-white">
              <CardContent className="pt-6">
                <p className="text-sm font-medium mb-1 opacity-80">{t('total_spent')}</p>
                <h3 className="text-2xl font-bold">{currency} {totalSpent.toLocaleString()}</h3>
              </CardContent>
            </Card>
            
            <Card className="bg-white/10 border-none text-white">
              <CardContent className="pt-6">
                <p className="text-sm font-medium mb-1 opacity-80">{t('remaining')}</p>
                <h3 className="text-2xl font-bold">{currency} {remainingBudget.toLocaleString()}</h3>
              </CardContent>
            </Card>
          </div>
          
          {/* Budget Health Bar */}
          <div className="mt-6">
            <div className="flex justify-between text-sm mb-1">
              <span>{t('budget_health')}</span>
              <span>{budgetHealthPercentage.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2.5">
              <div 
                className={`${budgetHealthColor} h-2.5 rounded-full`} 
                style={{ width: `${Math.min(100, budgetHealthPercentage)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Envelopes Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">{t('budget_envelopes')}</h2>
          <Button variant="outline" size="sm">
            <PiggyBank className="h-4 w-4 mr-2" />
            {t('add_envelope')}
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {envelopes.map((envelope: BudgetEnvelope) => {
            const usagePercentage = envelope.budgeted > 0 ? (envelope.spent / envelope.budgeted) * 100 : 0;
            const usageColor = 
              usagePercentage > 90 ? 'bg-red-500' :
              usagePercentage > 70 ? 'bg-yellow-500' : 'bg-green-500';
              
            return (
              <Card key={envelope.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex justify-between">
                    <span>{envelope.name}</span>
                    <span className="text-muted-foreground text-sm">{envelope.category}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{t('spent')}: {currency} {envelope.spent.toLocaleString()}</span>
                    <span>{t('budget')}: {currency} {envelope.budgeted.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2 mb-3">
                    <div 
                      className={`${usageColor} h-2 rounded-full`} 
                      style={{ width: `${Math.min(100, usagePercentage)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      {usagePercentage.toFixed(0)}% {t('used')}
                    </span>
                    <span className="font-medium">
                      {currency} {envelope.remaining.toLocaleString()} {t('left')}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Monthly Trend Section */}
      {monthlyTrend && monthlyTrend.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4">{t('monthly_trends')}</h2>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center gap-8">
                <div className="flex flex-col items-center">
                  <TrendingUp className="h-8 w-8 text-green-500 mb-2" />
                  <p className="text-sm text-muted-foreground">{t('income')}</p>
                  <p className="text-xl font-bold">
                    {currency} {monthlyTrend[monthlyTrend.length - 1].income.toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-col items-center">
                  <DollarSign className="h-8 w-8 text-red-500 mb-2" />
                  <p className="text-sm text-muted-foreground">{t('expenses')}</p>
                  <p className="text-xl font-bold">
                    {currency} {monthlyTrend[monthlyTrend.length - 1].expenses.toLocaleString()}
                  </p>
                </div>
              </div>
              
              {/* Simple bar chart visualization could be added here */}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Budget Insights */}
      {budgetData.insights && budgetData.insights.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4">{t('ai_budget_insights')}</h2>
          <Card>
            <CardContent className="pt-6">
              <ul className="space-y-2">
                {budgetData.insights.map((insight, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <div className="min-w-4 mt-1">
                      <div className="h-2 w-2 rounded-full bg-primary"></div>
                    </div>
                    <p>{insight}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default BudgetDashboard;