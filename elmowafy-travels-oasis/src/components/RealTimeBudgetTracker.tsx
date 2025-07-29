import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { 
  DollarSign, TrendingUp, TrendingDown, AlertTriangle, 
  CheckCircle, Wifi, WifiOff, Zap, RefreshCw
} from 'lucide-react';
import { websocketService, MessageType, useWebSocketStatus, useWebSocketMessage } from '@/services/websocketService';
import { budgetService } from '@/services/api';

interface BudgetCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  allocated_amount: number;
  spent_amount: number;
  is_flexible: boolean;
  alert_threshold: number;
}

interface Budget {
  id: string;
  name: string;
  description: string;
  total_amount: number;
  currency: string;
  period: string;
  categories: BudgetCategory[];
  status: string;
}

interface RealTimeUpdate {
  type: string;
  data: any;
  timestamp: string;
}

export const RealTimeBudgetTracker: React.FC<{ budgetId: string }> = ({ budgetId }) => {
  const [budget, setBudget] = useState<Budget | null>(null);
  const [updates, setUpdates] = useState<RealTimeUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [cacheHit, setCacheHit] = useState<boolean | null>(null);
  
  const wsStatus = useWebSocketStatus();

  // Load initial budget data
  const loadBudget = useCallback(async () => {
    setLoading(true);
    try {
      const startTime = Date.now();
      const budgetData = await budgetService.getBudget(budgetId);
      const loadTime = Date.now() - startTime;
      
      setBudget(budgetData);
      setCacheHit(loadTime < 100); // Assume cache hit if response < 100ms
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to load budget:', error);
    } finally {
      setLoading(false);
    }
  }, [budgetId]);

  useEffect(() => {
    loadBudget();
  }, [loadBudget]);

  // Handle budget update messages
  const handleBudgetUpdate = useCallback((message: any) => {
    if (message.data.budget_id === budgetId) {
      const update: RealTimeUpdate = {
        type: message.data.update_type,
        data: message.data.data,
        timestamp: message.timestamp
      };
      
      setUpdates(prev => [update, ...prev.slice(0, 9)]); // Keep last 10 updates
      setLastUpdate(new Date());

      // Update budget data based on update type
      if (message.data.update_type === 'updated' && message.data.data.changes) {
        setBudget(prev => prev ? { ...prev, ...message.data.data.changes } : null);
      }
    }
  }, [budgetId]);

  // Handle expense added messages
  const handleExpenseAdded = useCallback((message: any) => {
    if (message.data.budget_id === budgetId) {
      const transaction = message.data.transaction;
      const update: RealTimeUpdate = {
        type: 'expense_added',
        data: transaction,
        timestamp: message.timestamp
      };
      
      setUpdates(prev => [update, ...prev.slice(0, 9)]);
      setLastUpdate(new Date());

      // Update budget category spent amount
      setBudget(prev => {
        if (!prev) return null;
        
        const updatedCategories = prev.categories.map(cat => {
          if (cat.id === transaction.category_id) {
            return {
              ...cat,
              spent_amount: transaction.type === 'expense' 
                ? cat.spent_amount + transaction.amount
                : Math.max(0, cat.spent_amount - transaction.amount)
            };
          }
          return cat;
        });
        
        return { ...prev, categories: updatedCategories };
      });
    }
  }, [budgetId]);

  // Handle budget alerts
  const handleBudgetAlert = useCallback((message: any) => {
    if (message.data.budget_id === budgetId) {
      const update: RealTimeUpdate = {
        type: 'alert',
        data: message.data,
        timestamp: message.timestamp
      };
      
      setUpdates(prev => [update, ...prev.slice(0, 9)]);
      
      // Show browser notification if permission granted
      if (Notification.permission === 'granted') {
        new Notification('Budget Alert', {
          body: message.data.message,
          icon: '/budget-icon.png'
        });
      }
    }
  }, [budgetId]);

  // Register WebSocket message handlers
  useWebSocketMessage(MessageType.BUDGET_UPDATED, handleBudgetUpdate);
  useWebSocketMessage(MessageType.EXPENSE_ADDED, handleExpenseAdded);
  useWebSocketMessage(MessageType.BUDGET_ALERT, handleBudgetAlert);

  // Calculate budget progress and status
  const calculateCategoryProgress = (category: BudgetCategory) => {
    const percentage = (category.spent_amount / category.allocated_amount) * 100;
    return Math.min(percentage, 100);
  };

  const getCategoryStatus = (category: BudgetCategory) => {
    const percentage = category.spent_amount / category.allocated_amount;
    if (percentage >= 1) return 'over';
    if (percentage >= category.alert_threshold) return 'warning';
    return 'good';
  };

  const getTotalSpent = () => {
    return budget?.categories.reduce((total, cat) => total + cat.spent_amount, 0) || 0;
  };

  const getTotalAllocated = () => {
    return budget?.categories.reduce((total, cat) => total + cat.allocated_amount, 0) || 0;
  };

  const getUpdateIcon = (updateType: string) => {
    switch (updateType) {
      case 'expense_added': return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'updated': return <RefreshCw className="h-4 w-4 text-blue-500" />;
      case 'alert': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <Zap className="h-4 w-4 text-purple-500" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Loading budget data...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!budget) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            Budget not found
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with connection status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <DollarSign className="h-6 w-6" />
                <span>{budget.name}</span>
                {cacheHit && (
                  <Badge variant="outline" className="text-green-600">
                    <Zap className="h-3 w-3 mr-1" />
                    Cached
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>{budget.description}</CardDescription>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                {wsStatus.connected ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm text-gray-600">
                  {wsStatus.connected ? 'Live' : 'Offline'}
                </span>
                {wsStatus.latency && (
                  <Badge variant="outline" className="text-xs">
                    {wsStatus.latency}ms
                  </Badge>
                )}
              </div>
              
              <Button variant="outline" size="sm" onClick={loadBudget}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold">${getTotalAllocated().toLocaleString()}</p>
              <p className="text-sm text-gray-600">Total Budget</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">${getTotalSpent().toLocaleString()}</p>
              <p className="text-sm text-gray-600">Total Spent</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">${(getTotalAllocated() - getTotalSpent()).toLocaleString()}</p>
              <p className="text-sm text-gray-600">Remaining</p>
            </div>
          </div>
          
          {lastUpdate && (
            <p className="text-xs text-gray-500 mt-4">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Budget Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {budget.categories.map(category => {
          const progress = calculateCategoryProgress(category);
          const status = getCategoryStatus(category);
          
          return (
            <Card key={category.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: category.color + '20' }}
                    >
                      <DollarSign className="h-4 w-4" style={{ color: category.color }} />
                    </div>
                    <div>
                      <CardTitle className="text-base">{category.name}</CardTitle>
                      <CardDescription className="text-sm">
                        ${category.spent_amount} of ${category.allocated_amount}
                      </CardDescription>
                    </div>
                  </div>
                  
                  <Badge variant={status === 'good' ? 'default' : status === 'warning' ? 'secondary' : 'destructive'}>
                    {Math.round(progress)}%
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent>
                <Progress value={progress} className="h-2 mb-3" />
                
                {status === 'warning' && (
                  <Alert className="mb-3">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      Approaching budget limit
                    </AlertDescription>
                  </Alert>
                )}
                
                {status === 'over' && (
                  <Alert variant="destructive" className="mb-3">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      Budget exceeded by ${(category.spent_amount - category.allocated_amount).toLocaleString()}
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Remaining</span>
                  <span>${(category.allocated_amount - category.spent_amount).toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Real-time Updates */}
      {updates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-5 w-5" />
              <span>Real-time Updates</span>
              <Badge variant="outline">{updates.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {updates.map((update, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  {getUpdateIcon(update.type)}
                  
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {update.type === 'expense_added' && `New expense: $${update.data.amount}`}
                      {update.type === 'updated' && 'Budget updated'}
                      {update.type === 'alert' && update.data.message}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(update.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                  
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RealTimeBudgetTracker; 