// Family AI Dashboard Component - Comprehensive dashboard for Family AI insights
// Provides analytics, insights, and management interface for Family AI features

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { 
  Brain, Users, Heart, Sparkles, TrendingUp, Calendar,
  MessageCircle, Settings, RefreshCw, BarChart3, PieChart
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { apiService } from '../lib/api';

interface FamilyAIDashboardProps {
  familyId: string;
  memberId: string;
  className?: string;
}

interface FamilyAnalytics {
  interaction_stats: {
    total_conversations: number;
    messages_today: number;
    avg_response_time: number;
    satisfaction_score: number;
  };
  learning_progress: {
    personalities_learned: number;
    memories_captured: number;
    jokes_discovered: number;
    preferences_identified: number;
  };
  family_insights: {
    closeness_trend: number[];
    communication_patterns: Array<{
      member: string;
      frequency: number;
      preferred_topics: string[];
    }>;
    shared_activities: Array<{
      activity: string;
      frequency: number;
      last_mentioned: string;
    }>;
  };
}

const FamilyAIDashboard: React.FC<FamilyAIDashboardProps> = ({
  familyId,
  memberId,
  className = ''
}) => {
  const { isRTL } = useLanguage();
  const [analytics, setAnalytics] = useState<FamilyAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, [familyId]);

  // Use apiService singleton

  const loadAnalytics = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Use API class instead of direct fetch
    const data = await apiService.getFamilyAnalytics(familyId);
      setAnalytics(data);
    } catch (err) {
      console.error('Error loading analytics:', err);
      setError('Failed to load family analytics');
      
      // Fallback to mock data
      setAnalytics({
        interaction_stats: {
          total_conversations: 0,
          total_memories_analyzed: 0,
          total_recommendations: 0
        },
        personality_insights: [],
        memory_categories: [],
        travel_preferences: []
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
            <CardContent className="p-4">
              <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي المحادثات</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {analytics?.interaction_stats.total_conversations || 0}
                  </p>
                </div>
                <MessageCircle className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
            <CardContent className="p-4">
              <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div>
                  <p className="text-sm text-muted-foreground">رسائل اليوم</p>
                  <p className="text-2xl font-bold text-green-600">
                    {analytics?.interaction_stats.messages_today || 0}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
            <CardContent className="p-4">
              <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div>
                  <p className="text-sm text-muted-foreground">الذكريات المحفوظة</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {analytics?.learning_progress.memories_captured || 0}
                  </p>
                </div>
                <Sparkles className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-0 shadow-lg bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-950 dark:to-pink-900">
            <CardContent className="p-4">
              <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div>
                  <p className="text-sm text-muted-foreground">درجة الرضا</p>
                  <p className="text-2xl font-bold text-pink-600">
                    {analytics?.interaction_stats.satisfaction_score || 0}/5
                  </p>
                </div>
                <Heart className="w-8 h-8 text-pink-500" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Learning Progress */}
      <Card className="border-0 shadow-xl bg-gradient-to-br from-card via-card to-muted/10">
        <CardHeader>
          <CardTitle className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Brain className="w-5 h-5 text-blue-500" />
            تقدم التعلم
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <div className={`flex items-center justify-between mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="text-sm font-medium">الشخصيات المتعلمة</span>
                <span className="text-sm text-muted-foreground">
                  {analytics?.learning_progress.personalities_learned || 0}%
                </span>
              </div>
              <Progress value={analytics?.learning_progress.personalities_learned || 0} className="h-2" />
            </div>
            
            <div>
              <div className={`flex items-center justify-between mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="text-sm font-medium">التفضيلات المحددة</span>
                <span className="text-sm text-muted-foreground">
                  {analytics?.learning_progress.preferences_identified || 0}
                </span>
              </div>
              <Progress value={(analytics?.learning_progress.preferences_identified || 0) * 2} className="h-2" />
            </div>
            
            <div>
              <div className={`flex items-center justify-between mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="text-sm font-medium">النكات المكتشفة</span>
                <span className="text-sm text-muted-foreground">
                  {analytics?.learning_progress.jokes_discovered || 0}
                </span>
              </div>
              <Progress value={(analytics?.learning_progress.jokes_discovered || 0) * 10} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderInsightsTab = () => (
    <div className="space-y-6">
      {/* Communication Patterns */}
      <Card className="border-0 shadow-xl bg-gradient-to-br from-card via-card to-muted/10">
        <CardHeader>
          <CardTitle className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Users className="w-5 h-5 text-green-500" />
            أنماط التواصل
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics?.family_insights.communication_patterns.map((pattern, index) => (
              <motion.div
                key={pattern.member}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-muted/50 rounded-xl p-4"
              >
                <div className={`flex items-center justify-between mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <h4 className="font-semibold">{pattern.member}</h4>
                  <Badge variant="secondary">
                    {pattern.frequency} رسالة/أسبوع
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {pattern.preferred_topics.map((topic) => (
                    <Badge key={topic} variant="outline" className="text-xs">
                      {topic.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Shared Activities */}
      <Card className="border-0 shadow-xl bg-gradient-to-br from-card via-card to-muted/10">
        <CardHeader>
          <CardTitle className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Calendar className="w-5 h-5 text-orange-500" />
            الأنشطة المشتركة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics?.family_insights.shared_activities.map((activity, index) => (
              <motion.div
                key={activity.activity}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex items-center justify-between p-3 bg-muted/50 rounded-lg ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                <div>
                  <div className="font-medium capitalize">
                    {activity.activity.replace('_', ' ')}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    آخر ذكر: {activity.last_mentioned}
                  </div>
                </div>
                <Badge variant="secondary">
                  {activity.frequency} مرة
                </Badge>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderAnalyticsTab = () => (
    <div className="space-y-6">
      {/* Closeness Trend */}
      <Card className="border-0 shadow-xl bg-gradient-to-br from-card via-card to-muted/10">
        <CardHeader>
          <CardTitle className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <BarChart3 className="w-5 h-5 text-blue-500" />
            اتجاه التقارب العائلي
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {analytics?.family_insights.closeness_trend.slice(-1)[0] || 0}%
              </div>
              <div className="text-sm text-muted-foreground">
                مستوى التقارب الحالي
              </div>
            </div>
            
            {/* Simple trend visualization */}
            <div className="flex items-end justify-center gap-2 h-32">
              {analytics?.family_insights.closeness_trend.map((value, index) => (
                <motion.div
                  key={index}
                  initial={{ height: 0 }}
                  animate={{ height: `${value}%` }}
                  transition={{ delay: index * 0.1 }}
                  className="w-8 bg-gradient-to-t from-blue-500 to-blue-300 rounded-t-lg flex-shrink-0"
                  style={{ maxHeight: '100%' }}
                />
              ))}
            </div>
            
            <div className="text-center text-sm text-muted-foreground">
              آخر 7 أيام
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card className="border-0 shadow-xl bg-gradient-to-br from-card via-card to-muted/10">
        <CardHeader>
          <CardTitle className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <PieChart className="w-5 h-5 text-purple-500" />
            مقاييس الأداء
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-xl">
              <div className="text-2xl font-bold text-green-600">
                {analytics?.interaction_stats.avg_response_time || 0}s
              </div>
              <div className="text-sm text-muted-foreground">
                متوسط وقت الاستجابة
              </div>
            </div>
            
            <div className="text-center p-4 bg-muted/50 rounded-xl">
              <div className="text-2xl font-bold text-blue-600">
                {analytics?.interaction_stats.satisfaction_score || 0}/5
              </div>
              <div className="text-sm text-muted-foreground">
                تقييم الرضا
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (isLoading) {
    return (
      <div className={`family-ai-dashboard ${className}`}>
        <Card className="border-0 shadow-xl">
          <CardContent className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`family-ai-dashboard ${className}`}>
        <Card className="border-0 shadow-xl">
          <CardContent className="text-center py-12">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={loadAnalytics} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              إعادة المحاولة
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`family-ai-dashboard ${className}`} style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-purple-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">لوحة تحكم العائلة الذكية</h1>
              <p className="text-muted-foreground">رؤى وتحليلات شاملة لتفاعلات العائلة</p>
            </div>
          </div>
          <Button onClick={loadAnalytics} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            تحديث
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6 bg-muted/50 p-1 rounded-2xl">
            <TabsTrigger value="overview" className="flex items-center gap-2 rounded-xl">
              <BarChart3 className="w-4 h-4" />
              نظرة عامة
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex items-center gap-2 rounded-xl">
              <Users className="w-4 h-4" />
              الرؤى
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2 rounded-xl">
              <TrendingUp className="w-4 h-4" />
              التحليلات
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-0">
            {renderOverviewTab()}
          </TabsContent>

          <TabsContent value="insights" className="mt-0">
            {renderInsightsTab()}
          </TabsContent>

          <TabsContent value="analytics" className="mt-0">
            {renderAnalyticsTab()}
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
};

export default FamilyAIDashboard;
