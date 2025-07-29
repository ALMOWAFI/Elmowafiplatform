import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  PiggyBank, Plus, Edit, Trash2, TrendingUp, TrendingDown, 
  AlertTriangle, CheckCircle, DollarSign, Calendar, Target,
  Wallet, CreditCard, Building, Home, Car, Utensils, ShoppingBag,
  Gamepad2, Plane, Heart, GraduationCap, Shield, Zap, Coffee
} from 'lucide-react';

// Types
interface Budget {
  id: string;
  name: string;
  description: string;
  totalAmount: number;
  currency: string;
  period: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate: string;
  endDate: string;
  categories: BudgetCategory[];
  status: 'active' | 'completed' | 'paused';
  createdAt: string;
  updatedAt: string;
}

interface BudgetCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  allocatedAmount: number;
  spentAmount: number;
  isFlexible: boolean;
  alertThreshold: number;
}

interface Expense {
  id: string;
  categoryId: string;
  amount: number;
  description: string;
  date: string;
  location?: string;
  tags: string[];
  receipt?: string;
}

interface BudgetTemplate {
  id: string;
  name: string;
  description: string;
  categories: Omit<BudgetCategory, 'id' | 'spentAmount'>[];
  isPublic: boolean;
}

// Predefined category templates
const CATEGORY_TEMPLATES: Omit<BudgetCategory, 'id' | 'spentAmount'>[] = [
  { name: 'Housing', icon: 'Home', color: '#3B82F6', allocatedAmount: 1200, isFlexible: false, alertThreshold: 0.9 },
  { name: 'Transportation', icon: 'Car', color: '#10B981', allocatedAmount: 400, isFlexible: true, alertThreshold: 0.8 },
  { name: 'Food & Dining', icon: 'Utensils', color: '#F59E0B', allocatedAmount: 600, isFlexible: true, alertThreshold: 0.8 },
  { name: 'Shopping', icon: 'ShoppingBag', color: '#EF4444', allocatedAmount: 200, isFlexible: true, alertThreshold: 0.7 },
  { name: 'Entertainment', icon: 'Gamepad2', color: '#8B5CF6', allocatedAmount: 150, isFlexible: true, alertThreshold: 0.8 },
  { name: 'Travel', icon: 'Plane', color: '#06B6D4', allocatedAmount: 300, isFlexible: true, alertThreshold: 0.9 },
  { name: 'Healthcare', icon: 'Heart', color: '#EC4899', allocatedAmount: 100, isFlexible: false, alertThreshold: 1.0 },
  { name: 'Education', icon: 'GraduationCap', color: '#84CC16', allocatedAmount: 200, isFlexible: false, alertThreshold: 0.9 },
  { name: 'Insurance', icon: 'Shield', color: '#64748B', allocatedAmount: 150, isFlexible: false, alertThreshold: 1.0 },
  { name: 'Utilities', icon: 'Zap', color: '#F97316', allocatedAmount: 200, isFlexible: false, alertThreshold: 0.9 },
];

const BUDGET_TEMPLATES: BudgetTemplate[] = [
  {
    id: 'family-basic',
    name: 'Family Basic Budget',
    description: 'Essential budget for a family of 4',
    categories: CATEGORY_TEMPLATES.slice(0, 6),
    isPublic: true
  },
  {
    id: 'young-professional',
    name: 'Young Professional',
    description: 'Budget for early career professionals',
    categories: CATEGORY_TEMPLATES.filter(c => !['Education', 'Healthcare'].includes(c.name)),
    isPublic: true
  },
  {
    id: 'retirement',
    name: 'Retirement Planning',
    description: 'Conservative budget for retirees',
    categories: CATEGORY_TEMPLATES.filter(c => ['Housing', 'Food & Dining', 'Healthcare', 'Transportation', 'Utilities'].includes(c.name)),
    isPublic: true
  }
];

const BudgetManagementPage: React.FC = () => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [activeBudget, setActiveBudget] = useState<Budget | null>(null);
  const [showCreateBudget, setShowCreateBudget] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<BudgetCategory | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  
  // Form states
  const [budgetForm, setBudgetForm] = useState({
    name: '',
    description: '',
    totalAmount: 0,
    currency: 'USD',
    period: 'monthly' as const,
    startDate: new Date().toISOString().split('T')[0],
    categories: [] as BudgetCategory[]
  });

  const [expenseForm, setExpenseForm] = useState({
    categoryId: '',
    amount: 0,
    description: '',
    date: new Date().toISOString().split('T')[0],
    location: '',
    tags: [] as string[]
  });

  useEffect(() => {
    loadBudgets();
    loadExpenses();
  }, []);

  const loadBudgets = () => {
    // Demo data - in real app, fetch from API
    const demoBudgets: Budget[] = [
      {
        id: '1',
        name: 'Family Monthly Budget',
        description: 'Main family budget for monthly expenses',
        totalAmount: 4000,
        currency: 'USD',
        period: 'monthly',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        status: 'active',
        categories: [
          { id: '1', name: 'Housing', icon: 'Home', color: '#3B82F6', allocatedAmount: 1200, spentAmount: 1150, isFlexible: false, alertThreshold: 0.9 },
          { id: '2', name: 'Food & Dining', icon: 'Utensils', color: '#F59E0B', allocatedAmount: 600, spentAmount: 480, isFlexible: true, alertThreshold: 0.8 },
          { id: '3', name: 'Transportation', icon: 'Car', color: '#10B981', allocatedAmount: 400, spentAmount: 320, isFlexible: true, alertThreshold: 0.8 },
          { id: '4', name: 'Entertainment', icon: 'Gamepad2', color: '#8B5CF6', allocatedAmount: 200, spentAmount: 150, isFlexible: true, alertThreshold: 0.8 },
          { id: '5', name: 'Shopping', icon: 'ShoppingBag', color: '#EF4444', allocatedAmount: 300, spentAmount: 280, isFlexible: true, alertThreshold: 0.7 },
          { id: '6', name: 'Healthcare', icon: 'Heart', color: '#EC4899', allocatedAmount: 200, spentAmount: 120, isFlexible: false, alertThreshold: 1.0 }
        ],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-15'
      }
    ];
    
    setBudgets(demoBudgets);
    setActiveBudget(demoBudgets[0]);
  };

  const loadExpenses = () => {
    // Demo expenses
    const demoExpenses: Expense[] = [
      { id: '1', categoryId: '1', amount: 1150, description: 'Monthly rent', date: '2024-01-01', tags: ['rent'] },
      { id: '2', categoryId: '2', amount: 85, description: 'Grocery shopping', date: '2024-01-02', location: 'Supermarket', tags: ['groceries'] },
      { id: '3', categoryId: '3', amount: 60, description: 'Gas station', date: '2024-01-03', location: 'Shell Station', tags: ['fuel'] },
      { id: '4', categoryId: '4', amount: 25, description: 'Movie tickets', date: '2024-01-04', location: 'Cinema', tags: ['movies'] },
      { id: '5', categoryId: '2', amount: 45, description: 'Restaurant dinner', date: '2024-01-05', location: 'Italian Restaurant', tags: ['dining'] }
    ];
    
    setExpenses(demoExpenses);
  };

  const calculateBudgetProgress = (category: BudgetCategory) => {
    const percentage = (category.spentAmount / category.allocatedAmount) * 100;
    return Math.min(percentage, 100);
  };

  const getBudgetStatus = (category: BudgetCategory) => {
    const percentage = category.spentAmount / category.allocatedAmount;
    if (percentage >= 1) return 'over';
    if (percentage >= category.alertThreshold) return 'warning';
    return 'good';
  };

  const getTotalSpent = () => {
    return activeBudget?.categories.reduce((total, cat) => total + cat.spentAmount, 0) || 0;
  };

  const getTotalAllocated = () => {
    return activeBudget?.categories.reduce((total, cat) => total + cat.allocatedAmount, 0) || 0;
  };

  const createBudgetFromTemplate = (template: BudgetTemplate) => {
    setBudgetForm({
      ...budgetForm,
      name: template.name,
      description: template.description,
      categories: template.categories.map((cat, index) => ({
        ...cat,
        id: String(index + 1),
        spentAmount: 0
      }))
    });
  };

  const addCategory = () => {
    const newCategory: BudgetCategory = {
      id: String(budgetForm.categories.length + 1),
      name: 'New Category',
      icon: 'Wallet',
      color: '#6B7280',
      allocatedAmount: 100,
      spentAmount: 0,
      isFlexible: true,
      alertThreshold: 0.8
    };
    
    setBudgetForm({
      ...budgetForm,
      categories: [...budgetForm.categories, newCategory]
    });
  };

  const removeCategory = (categoryId: string) => {
    setBudgetForm({
      ...budgetForm,
      categories: budgetForm.categories.filter(cat => cat.id !== categoryId)
    });
  };

  const updateCategory = (categoryId: string, updates: Partial<BudgetCategory>) => {
    setBudgetForm({
      ...budgetForm,
      categories: budgetForm.categories.map(cat => 
        cat.id === categoryId ? { ...cat, ...updates } : cat
      )
    });
  };

  const createBudget = () => {
    const newBudget: Budget = {
      id: String(budgets.length + 1),
      ...budgetForm,
      totalAmount: budgetForm.categories.reduce((total, cat) => total + cat.allocatedAmount, 0),
      endDate: getEndDate(budgetForm.startDate, budgetForm.period),
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    setBudgets([...budgets, newBudget]);
    setActiveBudget(newBudget);
    setShowCreateBudget(false);
    
    // Reset form
    setBudgetForm({
      name: '',
      description: '',
      totalAmount: 0,
      currency: 'USD',
      period: 'monthly',
      startDate: new Date().toISOString().split('T')[0],
      categories: []
    });
  };

  const getEndDate = (startDate: string, period: Budget['period']) => {
    const start = new Date(startDate);
    switch (period) {
      case 'weekly':
        start.setDate(start.getDate() + 7);
        break;
      case 'monthly':
        start.setMonth(start.getMonth() + 1);
        break;
      case 'quarterly':
        start.setMonth(start.getMonth() + 3);
        break;
      case 'yearly':
        start.setFullYear(start.getFullYear() + 1);
        break;
    }
    return start.toISOString().split('T')[0];
  };

  const addExpense = () => {
    const newExpense: Expense = {
      id: String(expenses.length + 1),
      ...expenseForm,
      tags: expenseForm.tags.filter(tag => tag.trim() !== '')
    };
    
    setExpenses([...expenses, newExpense]);
    
    // Update budget category spent amount
    if (activeBudget) {
      const updatedBudget = {
        ...activeBudget,
        categories: activeBudget.categories.map(cat =>
          cat.id === expenseForm.categoryId
            ? { ...cat, spentAmount: cat.spentAmount + expenseForm.amount }
            : cat
        )
      };
      
      setActiveBudget(updatedBudget);
      setBudgets(budgets.map(budget => 
        budget.id === activeBudget.id ? updatedBudget : budget
      ));
    }
    
    setShowAddExpense(false);
    setExpenseForm({
      categoryId: '',
      amount: 0,
      description: '',
      date: new Date().toISOString().split('T')[0],
      location: '',
      tags: []
    });
  };

  const getCategoryExpenses = (categoryId: string) => {
    return expenses.filter(expense => expense.categoryId === categoryId);
  };

  const getIconComponent = (iconName: string) => {
    const icons: Record<string, React.ComponentType<any>> = {
      Home, Car, Utensils, ShoppingBag, Gamepad2, Plane, Heart, 
      GraduationCap, Shield, Zap, Wallet, CreditCard, Building, Coffee
    };
    
    const IconComponent = icons[iconName] || Wallet;
    return <IconComponent className="h-5 w-5" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <PiggyBank className="h-8 w-8 mr-3 text-blue-600" />
              Budget Management
            </h1>
            <p className="text-gray-600 mt-2">
              Manage your family finances with intelligent budgeting tools
            </p>
          </div>
          
          <div className="flex space-x-3">
            <Dialog open={showCreateBudget} onOpenChange={setShowCreateBudget}>
              <DialogTrigger asChild>
                <Button className="flex items-center space-x-2">
                  <Plus className="h-4 w-4" />
                  <span>Create Budget</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Budget</DialogTitle>
                  <DialogDescription>
                    Set up a comprehensive budget to track your family expenses
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6">
                  {/* Basic Information */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="budget-name">Budget Name</Label>
                      <Input
                        id="budget-name"
                        value={budgetForm.name}
                        onChange={(e) => setBudgetForm({...budgetForm, name: e.target.value})}
                        placeholder="e.g., Family Monthly Budget"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="budget-period">Period</Label>
                      <Select value={budgetForm.period} onValueChange={(value: Budget['period']) => setBudgetForm({...budgetForm, period: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="budget-description">Description</Label>
                    <Textarea
                      id="budget-description"
                      value={budgetForm.description}
                      onChange={(e) => setBudgetForm({...budgetForm, description: e.target.value})}
                      placeholder="Brief description of this budget..."
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="start-date">Start Date</Label>
                      <Input
                        id="start-date"
                        type="date"
                        value={budgetForm.startDate}
                        onChange={(e) => setBudgetForm({...budgetForm, startDate: e.target.value})}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="currency">Currency</Label>
                      <Select value={budgetForm.currency} onValueChange={(value) => setBudgetForm({...budgetForm, currency: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD ($)</SelectItem>
                          <SelectItem value="EUR">EUR (€)</SelectItem>
                          <SelectItem value="GBP">GBP (£)</SelectItem>
                          <SelectItem value="AED">AED (د.إ)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {/* Budget Templates */}
                  <div>
                    <Label>Quick Start Templates</Label>
                    <div className="grid grid-cols-1 gap-3 mt-2">
                      {BUDGET_TEMPLATES.map(template => (
                        <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => createBudgetFromTemplate(template)}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium">{template.name}</h4>
                                <p className="text-sm text-gray-600">{template.description}</p>
                              </div>
                              <Badge variant="outline">{template.categories.length} categories</Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                  
                  {/* Categories */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label>Budget Categories</Label>
                      <Button variant="outline" size="sm" onClick={addCategory}>
                        <Plus className="h-4 w-4 mr-1" />
                        Add Category
                      </Button>
                    </div>
                    
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {budgetForm.categories.map(category => (
                        <Card key={category.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center space-x-3">
                              <div className="p-2 rounded-lg" style={{ backgroundColor: category.color + '20' }}>
                                {getIconComponent(category.icon)}
                              </div>
                              
                              <div className="flex-1 grid grid-cols-3 gap-3">
                                <Input
                                  value={category.name}
                                  onChange={(e) => updateCategory(category.id, { name: e.target.value })}
                                  placeholder="Category name"
                                />
                                <Input
                                  type="number"
                                  value={category.allocatedAmount}
                                  onChange={(e) => updateCategory(category.id, { allocatedAmount: Number(e.target.value) })}
                                  placeholder="Amount"
                                />
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm text-gray-600">Alert at</span>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={category.alertThreshold}
                                    onChange={(e) => updateCategory(category.id, { alertThreshold: Number(e.target.value) })}
                                    className="w-20"
                                  />
                                </div>
                              </div>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeCategory(category.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-3">
                    <Button variant="outline" onClick={() => setShowCreateBudget(false)}>
                      Cancel
                    </Button>
                    <Button onClick={createBudget} disabled={!budgetForm.name || budgetForm.categories.length === 0}>
                      Create Budget
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Budget Overview */}
        {activeBudget && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Budget</p>
                    <p className="text-2xl font-bold">${getTotalAllocated().toLocaleString()}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Spent</p>
                    <p className="text-2xl font-bold">${getTotalSpent().toLocaleString()}</p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Remaining</p>
                    <p className="text-2xl font-bold">${(getTotalAllocated() - getTotalSpent()).toLocaleString()}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Budget Period</p>
                    <p className="text-lg font-bold capitalize">{activeBudget.period}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="categories" className="space-y-6">
          <TabsList>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="expenses">Recent Expenses</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="space-y-6">
            {activeBudget && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeBudget.categories.map(category => {
                  const progress = calculateBudgetProgress(category);
                  const status = getBudgetStatus(category);
                  const categoryExpenses = getCategoryExpenses(category.id);
                  
                  return (
                    <Card key={category.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 rounded-lg" style={{ backgroundColor: category.color + '20' }}>
                              {getIconComponent(category.icon)}
                            </div>
                            <div>
                              <CardTitle className="text-lg">{category.name}</CardTitle>
                              <CardDescription>
                                ${category.spentAmount} of ${category.allocatedAmount}
                              </CardDescription>
                            </div>
                          </div>
                          
                          <Badge variant={status === 'good' ? 'default' : status === 'warning' ? 'secondary' : 'destructive'}>
                            {Math.round(progress)}%
                          </Badge>
                        </div>
                      </CardHeader>
                      
                      <CardContent>
                        <div className="space-y-4">
                          <Progress 
                            value={progress} 
                            className="h-2"
                          />
                          
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Remaining</span>
                            <span className="font-medium">
                              ${(category.allocatedAmount - category.spentAmount).toLocaleString()}
                            </span>
                          </div>
                          
                          {status === 'warning' && (
                            <Alert>
                              <AlertTriangle className="h-4 w-4" />
                              <AlertDescription>
                                Approaching budget limit ({Math.round(category.alertThreshold * 100)}%)
                              </AlertDescription>
                            </Alert>
                          )}
                          
                          {status === 'over' && (
                            <Alert variant="destructive">
                              <AlertTriangle className="h-4 w-4" />
                              <AlertDescription>
                                Budget exceeded by ${(category.spentAmount - category.allocatedAmount).toLocaleString()}
                              </AlertDescription>
                            </Alert>
                          )}
                          
                          <div className="pt-2">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">Recent Expenses</span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setExpenseForm({...expenseForm, categoryId: category.id});
                                  setShowAddExpense(true);
                                }}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Add
                              </Button>
                            </div>
                            
                            <div className="space-y-2 max-h-32 overflow-y-auto">
                              {categoryExpenses.slice(0, 3).map(expense => (
                                <div key={expense.id} className="flex items-center justify-between text-sm">
                                  <span className="truncate">{expense.description}</span>
                                  <span className="font-medium">${expense.amount}</span>
                                </div>
                              ))}
                              
                              {categoryExpenses.length === 0 && (
                                <p className="text-sm text-gray-500 italic">No expenses yet</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="expenses">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Expenses</CardTitle>
                  <Dialog open={showAddExpense} onOpenChange={setShowAddExpense}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Expense
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Expense</DialogTitle>
                        <DialogDescription>
                          Record a new expense and assign it to a budget category
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="expense-amount">Amount</Label>
                            <Input
                              id="expense-amount"
                              type="number"
                              value={expenseForm.amount}
                              onChange={(e) => setExpenseForm({...expenseForm, amount: Number(e.target.value)})}
                              placeholder="0.00"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="expense-category">Category</Label>
                            <Select value={expenseForm.categoryId} onValueChange={(value) => setExpenseForm({...expenseForm, categoryId: value})}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                {activeBudget?.categories.map(category => (
                                  <SelectItem key={category.id} value={category.id}>
                                    {category.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <div>
                          <Label htmlFor="expense-description">Description</Label>
                          <Input
                            id="expense-description"
                            value={expenseForm.description}
                            onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})}
                            placeholder="What was this expense for?"
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="expense-date">Date</Label>
                            <Input
                              id="expense-date"
                              type="date"
                              value={expenseForm.date}
                              onChange={(e) => setExpenseForm({...expenseForm, date: e.target.value})}
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="expense-location">Location (Optional)</Label>
                            <Input
                              id="expense-location"
                              value={expenseForm.location}
                              onChange={(e) => setExpenseForm({...expenseForm, location: e.target.value})}
                              placeholder="Where was this purchased?"
                            />
                          </div>
                        </div>
                        
                        <div className="flex justify-end space-x-3">
                          <Button variant="outline" onClick={() => setShowAddExpense(false)}>
                            Cancel
                          </Button>
                          <Button onClick={addExpense} disabled={!expenseForm.categoryId || !expenseForm.amount || !expenseForm.description}>
                            Add Expense
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  {expenses.slice(-10).reverse().map(expense => {
                    const category = activeBudget?.categories.find(cat => cat.id === expense.categoryId);
                    
                    return (
                      <div key={expense.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          {category && (
                            <div className="p-2 rounded-lg" style={{ backgroundColor: category.color + '20' }}>
                              {getIconComponent(category.icon)}
                            </div>
                          )}
                          
                          <div>
                            <p className="font-medium">{expense.description}</p>
                            <p className="text-sm text-gray-600">
                              {category?.name} • {new Date(expense.date).toLocaleDateString()}
                              {expense.location && ` • ${expense.location}`}
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="font-bold">${expense.amount}</p>
                          {expense.tags.length > 0 && (
                            <div className="flex space-x-1 mt-1">
                              {expense.tags.slice(0, 2).map(tag => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                  {expenses.length === 0 && (
                    <div className="text-center py-8">
                      <Coffee className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600">No expenses recorded yet</p>
                      <p className="text-sm text-gray-500">Start tracking your spending by adding your first expense</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Spending Trends</CardTitle>
                  <CardDescription>Your spending patterns over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <TrendingUp className="h-12 w-12 mx-auto mb-3" />
                      <p>Analytics charts coming soon</p>
                      <p className="text-sm">Advanced spending analytics and insights</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Budget Performance</CardTitle>
                  <CardDescription>How well you're sticking to your budget</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {activeBudget?.categories.map(category => {
                      const performance = (category.allocatedAmount - category.spentAmount) / category.allocatedAmount;
                      
                      return (
                        <div key={category.id} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="p-1 rounded" style={{ backgroundColor: category.color + '20' }}>
                              {getIconComponent(category.icon)}
                            </div>
                            <span className="font-medium">{category.name}</span>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {performance > 0.2 ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : performance > 0 ? (
                              <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                            )}
                            <span className={`font-medium ${
                              performance > 0.2 ? 'text-green-600' : 
                              performance > 0 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {performance > 0 ? 'Under' : 'Over'} by ${Math.abs(category.allocatedAmount - category.spentAmount).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default BudgetManagementPage; 