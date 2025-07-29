import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  DollarSign, 
  Wallet, 
  TrendingUp, 
  TrendingDown,
  PieChart,
  Calendar,
  Target,
  ArrowRight,
  Plus,
  Settings,
  ExternalLink,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { apiService, queryKeys } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';

interface BudgetIntegrationProps {
  onSelectBudgetCategory?: (category: string) => void;
  className?: string;
  travelDestination?: string;
  estimatedBudget?: number;
}

interface BudgetSummary {
  totalBudget: number;
  totalSpent: number;
  remainingBudget: number;
  currency: string;
  envelopes: EnvelopeBudget[];
  monthlyTrend: {
    income: number;
    expenses: number;
    month: string;
  }[];
}

interface EnvelopeBudget {
  id: string;
  name: string;
  budgeted: number;
  spent: number;
  remaining: number;
  category: string;
  color?: string;
  icon?: string;
}

export const BudgetIntegration: React.FC<BudgetIntegrationProps> = ({ 
  onSelectBudgetCategory,
  className = "",
  travelDestination,
  estimatedBudget
}) => {
  const { language } = useLanguage();
  const isArabic = language === 'ar';

  const [showDetails, setShowDetails] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Fetch budget data from our API bridge
  const { data: budgetData, isLoading, error } = useQuery({
    queryKey: queryKeys.budgetSummary(),
    queryFn: () => apiService.getBudgetSummary(),
    enabled: true,
  });

  // Fetch travel-specific budget recommendations
  const { data: travelBudgetRec } = useQuery({
    queryKey: queryKeys.travelBudgetRecommendations(travelDestination, estimatedBudget),
    queryFn: () => apiService.getTravelBudgetRecommendations(travelDestination, estimatedBudget),
    enabled: !!travelDestination,
  });

  const getEnvelopeColor = (category: string) => {
    const colors: Record<string, string> = {
      'travel': 'bg-blue-500',
      'food': 'bg-green-500',
      'entertainment': 'bg-purple-500',
      'transport': 'bg-yellow-500',
      'accommodation': 'bg-pink-500',
      'shopping': 'bg-orange-500',
      'emergency': 'bg-red-500',
      'default': 'bg-gray-500'
    };
    return colors[category.toLowerCase()] || colors.default;
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat(isArabic ? 'ar-AE' : 'en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const getBudgetStatusColor = (spent: number, budgeted: number) => {
    const percentage = (spent / budgeted) * 100;
    if (percentage >= 90) return 'text-red-600 bg-red-50';
    if (percentage >= 75) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  if (isLoading) {
    return (
      <Card className={`${className} border-green-200 bg-gradient-to-br from-green-50 to-blue-50`}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${isArabic ? 'font-noto' : ''}`}>
            <Wallet className="w-5 h-5 text-green-600 animate-pulse" />
            {isArabic ? 'مدير الميزانية الذكي' : 'AI Budget Manager'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`${className} border-red-200 bg-gradient-to-br from-red-50 to-orange-50`}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${isArabic ? 'font-noto' : ''}`}>
            <AlertCircle className="w-5 h-5 text-red-600" />
            {isArabic ? 'خطأ في تحميل الميزانية' : 'Budget Loading Error'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600 mb-4">
            {isArabic 
              ? 'لا يمكن الاتصال بنظام الميزانية. يرجى التحقق من الاتصال.' 
              : 'Unable to connect to budget system. Please check connection.'}
          </p>
          <Button variant="outline" size="sm" className="w-full">
            <ExternalLink className="w-4 h-4 mr-2" />
            {isArabic ? 'فتح نظام الميزانية' : 'Open Budget System'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${className} border-green-200 bg-gradient-to-br from-green-50 to-blue-50`}>
      <CardHeader>
        <CardTitle className={`flex items-center justify-between ${isArabic ? 'font-noto' : ''}`}>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Wallet className="w-5 h-5 text-green-600" />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            </div>
            {isArabic ? 'مدير الميزانية الذكي' : 'AI Budget Manager'}
          </div>
          <div className="flex items-center gap-2">
            {budgetData?.integrated && (
              <Badge variant="secondary" className="text-xs">
                <CheckCircle className="w-3 h-3 mr-1" />
                {isArabic ? 'متصل' : 'Connected'}
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs"
            >
              {isArabic ? 'التفاصيل' : 'Details'}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        
        {/* Budget Overview */}
        {budgetData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Total Budget Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">
                  {formatCurrency(budgetData.totalBudget, budgetData.currency)}
                </div>
                <div className="text-xs text-gray-600">
                  {isArabic ? 'الميزانية الإجمالية' : 'Total Budget'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">
                  {formatCurrency(budgetData.totalSpent, budgetData.currency)}
                </div>
                <div className="text-xs text-gray-600">
                  {isArabic ? 'المصروف' : 'Spent'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-purple-600">
                  {formatCurrency(budgetData.remainingBudget, budgetData.currency)}
                </div>
                <div className="text-xs text-gray-600">
                  {isArabic ? 'المتبقي' : 'Remaining'}
                </div>
              </div>
            </div>

            {/* Budget Progress */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">
                  {isArabic ? 'استخدام الميزانية' : 'Budget Usage'}
                </span>
                <span className="text-sm text-gray-600">
                  {Math.round((budgetData.totalSpent / budgetData.totalBudget) * 100)}%
                </span>
              </div>
              <Progress 
                value={(budgetData.totalSpent / budgetData.totalBudget) * 100} 
                className="h-2"
              />
            </div>
          </motion.div>
        )}

        {/* Travel Budget Integration */}
        {travelDestination && travelBudgetRec && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 bg-blue-50 rounded-lg border border-blue-100"
          >
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-blue-600" />
              <h4 className={`font-semibold text-blue-900 text-sm ${isArabic ? 'font-noto' : ''}`}>
                {isArabic 
                  ? `ميزانية السفر إلى ${travelDestination}` 
                  : `Travel Budget for ${travelDestination}`}
              </h4>
            </div>
            
            <div className="space-y-2">
              {travelBudgetRec.recommendations.map((rec, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <span className="text-blue-700">{rec.category}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {formatCurrency(rec.amount, budgetData?.currency)}
                    </span>
                    {rec.available && (
                      <Badge variant="outline" className="text-xs text-green-600">
                        {isArabic ? 'متاح' : 'Available'}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            <Button 
              size="sm" 
              className="w-full mt-3"
              onClick={() => onSelectBudgetCategory?.('travel')}
            >
              <Plus className="w-4 h-4 mr-2" />
              {isArabic ? 'إضافة إلى ميزانية السفر' : 'Add to Travel Budget'}
            </Button>
          </motion.div>
        )}

        {/* Envelope Budgets */}
        <AnimatePresence>
          {showDetails && budgetData?.envelopes && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className={`font-semibold text-gray-900 ${isArabic ? 'font-noto' : ''}`}>
                  {isArabic ? 'فئات الميزانية' : 'Budget Categories'}
                </h3>
                <Badge variant="secondary" className="text-xs">
                  {budgetData.envelopes.length} {isArabic ? 'فئة' : 'categories'}
                </Badge>
              </div>

              <ScrollArea className="h-60">
                <div className="space-y-3">
                  {budgetData.envelopes.map((envelope, index) => (
                    <motion.div
                      key={envelope.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-3 bg-white/70 rounded-lg border border-gray-100 cursor-pointer hover:bg-white/90 transition-colors"
                      onClick={() => {
                        setSelectedCategory(envelope.id);
                        onSelectBudgetCategory?.(envelope.category);
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${getEnvelopeColor(envelope.category)}`} />
                          <h4 className={`font-medium text-gray-900 ${isArabic ? 'font-noto' : ''}`}>
                            {envelope.name}
                          </h4>
                        </div>
                        <Badge className={`text-xs ${getBudgetStatusColor(envelope.spent, envelope.budgeted)}`}>
                          {Math.round((envelope.spent / envelope.budgeted) * 100)}%
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">
                            {isArabic ? 'المخصص:' : 'Budgeted:'}
                          </span>
                          <span className="font-medium">
                            {formatCurrency(envelope.budgeted, budgetData.currency)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">
                            {isArabic ? 'المصروف:' : 'Spent:'}
                          </span>
                          <span className="font-medium">
                            {formatCurrency(envelope.spent, budgetData.currency)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">
                            {isArabic ? 'المتبقي:' : 'Remaining:'}
                          </span>
                          <span className={`font-medium ${envelope.remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(envelope.remaining, budgetData.currency)}
                          </span>
                        </div>
                        
                        <Progress 
                          value={Math.min((envelope.spent / envelope.budgeted) * 100, 100)} 
                          className="h-1"
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Monthly Trend */}
        {budgetData?.monthlyTrend && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-3 bg-purple-50 rounded-lg border border-purple-100"
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              <h4 className={`font-semibold text-purple-900 text-sm ${isArabic ? 'font-noto' : ''}`}>
                {isArabic ? 'الاتجاه الشهري' : 'Monthly Trend'}
              </h4>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="text-center">
                <div className="text-green-600 font-medium">
                  {formatCurrency(budgetData.monthlyTrend[0]?.income || 0, budgetData.currency)}
                </div>
                <div className="text-xs text-gray-600">
                  {isArabic ? 'الدخل هذا الشهر' : 'This Month Income'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-red-600 font-medium">
                  {formatCurrency(budgetData.monthlyTrend[0]?.expenses || 0, budgetData.currency)}
                </div>
                <div className="text-xs text-gray-600">
                  {isArabic ? 'المصروفات هذا الشهر' : 'This Month Expenses'}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => window.open('http://localhost:3000', '_blank')}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            {isArabic ? 'فتح نظام الميزانية' : 'Open Budget System'}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>

      </CardContent>
    </Card>
  );
};