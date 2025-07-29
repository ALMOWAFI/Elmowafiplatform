import React, { useState, useEffect } from 'react';
import { AIFamilyChat } from '@/components/AIFamilyChat';
import { useQuery } from '@tanstack/react-query';
import { apiService, queryKeys } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MessageCircle, 
  Users, 
  Camera, 
  MapPin, 
  Brain,
  Sparkles,
  ArrowRight,
  Heart
} from 'lucide-react';
import { motion } from 'framer-motion';

export const AIChatPage: React.FC = () => {
  const { language } = useLanguage();
  const isArabic = language === 'ar';
  
  const [selectedDestination, setSelectedDestination] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Fetch family data for context
  const { data: familyMembers = [], isLoading: membersLoading } = useQuery({
    queryKey: queryKeys.familyMembers,
    queryFn: () => apiService.getFamilyMembers(),
  });

  const { data: recentMemories = [], isLoading: memoriesLoading } = useQuery({
    queryKey: queryKeys.memories(),
    queryFn: () => apiService.getMemories(),
  });

  const { data: travelPlans = [], isLoading: plansLoading } = useQuery({
    queryKey: queryKeys.travelPlans(),
    queryFn: () => apiService.getTravelPlans(),
  });

  const handleTravelPlanRequest = (destination: string, preferences: any) => {
    console.log('Travel plan requested:', destination, preferences);
    setSelectedDestination(destination);
    // Here you would typically navigate to travel planning page or open a modal
  };

  const handleMemorySearch = (query: string) => {
    console.log('Memory search requested:', query);
    setSearchQuery(query);
    // Here you would typically navigate to memory search page or update search results
  };

  const familyContext = {
    members: familyMembers,
    recentMemories: recentMemories.slice(0, 5), // Last 5 memories for context
    travelHistory: travelPlans
  };

  const isLoading = membersLoading || memoriesLoading || plansLoading;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <div className={`space-y-2 ${isArabic ? 'font-noto' : ''}`}>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              {isArabic ? 'المساعد الذكي للعائلة' : 'AI Family Assistant'}
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {isArabic 
                ? 'مساعدك الذكي لإدارة الذكريات العائلية، التخطيط للرحلات، واكتشاف اللحظات الثمينة'
                : 'Your intelligent companion for family memory management, travel planning, and discovering precious moments'
              }
            </p>
          </div>
          
          {/* Quick Stats */}
          {!isLoading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="flex flex-wrap justify-center gap-4"
            >
              <Badge variant="secondary" className="flex items-center gap-2 px-4 py-2">
                <Users className="w-4 h-4 text-blue-500" />
                <span>{familyMembers.length} {isArabic ? 'أفراد العائلة' : 'family members'}</span>
              </Badge>
              <Badge variant="secondary" className="flex items-center gap-2 px-4 py-2">
                <Camera className="w-4 h-4 text-green-500" />
                <span>{recentMemories.length} {isArabic ? 'ذكريات' : 'memories'}</span>
              </Badge>
              <Badge variant="secondary" className="flex items-center gap-2 px-4 py-2">
                <MapPin className="w-4 h-4 text-purple-500" />
                <span>{travelPlans.length} {isArabic ? 'خطط سفر' : 'travel plans'}</span>
              </Badge>
            </motion.div>
          )}
        </motion.div>

        {/* AI Features Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid md:grid-cols-3 gap-6 mb-8"
        >
          <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100">
            <CardHeader className="pb-3">
              <CardTitle className={`flex items-center gap-2 text-purple-700 ${isArabic ? 'font-noto' : ''}`}>
                <Brain className="w-5 h-5" />
                {isArabic ? 'ذكاء اصطناعي متقدم' : 'Advanced AI'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-sm text-purple-600 ${isArabic ? 'font-noto text-right' : 'text-left'}`}>
                {isArabic 
                  ? 'يفهم السياق العائلي ويقدم اقتراحات شخصية ذكية'
                  : 'Understands family context and provides intelligent personalized suggestions'
                }
              </p>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
            <CardHeader className="pb-3">
              <CardTitle className={`flex items-center gap-2 text-blue-700 ${isArabic ? 'font-noto' : ''}`}>
                <MessageCircle className="w-5 h-5" />
                {isArabic ? 'محادثة طبيعية' : 'Natural Conversation'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-sm text-blue-600 ${isArabic ? 'font-noto text-right' : 'text-left'}`}>
                {isArabic 
                  ? 'يتحدث بالعربية والإنجليزية مع فهم ثقافي عميق'
                  : 'Speaks Arabic and English with deep cultural understanding'
                }
              </p>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100">
            <CardHeader className="pb-3">
              <CardTitle className={`flex items-center gap-2 text-green-700 ${isArabic ? 'font-noto' : ''}`}>
                <Sparkles className="w-5 h-5" />
                {isArabic ? 'اقتراحات ذكية' : 'Smart Suggestions'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-sm text-green-600 ${isArabic ? 'font-noto text-right' : 'text-left'}`}>
                {isArabic 
                  ? 'يقترح أنشطة ووجهات ولحظات مناسبة للعائلة'
                  : 'Recommends family-friendly activities, destinations, and moments'
                }
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Chat Interface */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <AIFamilyChat
            familyContext={familyContext}
            onTravelPlanRequest={handleTravelPlanRequest}
            onMemorySearch={handleMemorySearch}
          />
        </motion.div>

        {/* Action Results */}
        {(selectedDestination || searchQuery) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {selectedDestination && (
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className={`flex items-center gap-2 text-blue-700 ${isArabic ? 'font-noto' : ''}`}>
                    <MapPin className="w-5 h-5" />
                    {isArabic ? 'طلب تخطيط رحلة' : 'Travel Planning Request'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <p className={`${isArabic ? 'font-noto' : ''}`}>
                      {isArabic 
                        ? `جاري التخطيط لرحلة إلى ${selectedDestination}...`
                        : `Planning a trip to ${selectedDestination}...`
                      }
                    </p>
                    <Button size="sm" className="flex items-center gap-1">
                      {isArabic ? 'عرض التفاصيل' : 'View Details'}
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {searchQuery && (
              <Card className="border-purple-200 bg-purple-50">
                <CardHeader>
                  <CardTitle className={`flex items-center gap-2 text-purple-700 ${isArabic ? 'font-noto' : ''}`}>
                    <Camera className="w-5 h-5" />
                    {isArabic ? 'بحث في الذكريات' : 'Memory Search'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <p className={`${isArabic ? 'font-noto' : ''}`}>
                      {isArabic 
                        ? `البحث عن: "${searchQuery}"`
                        : `Searching for: "${searchQuery}"`
                      }
                    </p>
                    <Button size="sm" variant="outline" className="flex items-center gap-1">
                      {isArabic ? 'عرض النتائج' : 'View Results'}
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}

        {/* Loading State */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8"
          >
            <div className="flex items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className={`text-muted-foreground ${isArabic ? 'font-noto' : ''}`}>
                {isArabic ? 'تحميل بيانات العائلة...' : 'Loading family data...'}
              </span>
            </div>
          </motion.div>
        )}

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center py-8 border-t border-muted"
        >
          <div className={`flex items-center justify-center gap-2 text-sm text-muted-foreground ${isArabic ? 'font-noto' : ''}`}>
            <Heart className="w-4 h-4 text-red-500" />
            <span>
              {isArabic 
                ? 'مصمم خصيصاً للعائلات مع الحب والعناية'
                : 'Designed with love and care for families'
              }
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};