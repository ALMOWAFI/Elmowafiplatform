import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Compass, 
  MapPin, 
  DollarSign, 
  Clock, 
  Users, 
  Star,
  Plane,
  Heart,
  Brain,
  Sparkles,
  TrendingUp,
  Globe,
  Calendar,
  Camera,
  ArrowRight
} from 'lucide-react';
import { apiService, queryKeys } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';

interface AITravelCompanionProps {
  onSelectDestination?: (destination: string) => void;
  className?: string;
}

interface TravelPreferences {
  budget: 'low' | 'medium' | 'high';
  duration: '1-2 days' | '3-5 days' | '1 week' | '2+ weeks';
  interests: string[];
}

const INTEREST_OPTIONS = [
  { id: 'family', label: 'Family Activities', icon: Users },
  { id: 'sightseeing', label: 'Sightseeing', icon: Camera },
  { id: 'cultural', label: 'Cultural Sites', icon: Globe },
  { id: 'adventure', label: 'Adventure', icon: TrendingUp },
  { id: 'beach', label: 'Beach & Relaxation', icon: Heart },
  { id: 'food', label: 'Food & Dining', icon: Star },
];

export const AITravelCompanion: React.FC<AITravelCompanionProps> = ({ 
  onSelectDestination,
  className = ""
}) => {
  const { language } = useLanguage();
  const isArabic = language === 'ar';

  const [preferences, setPreferences] = useState<TravelPreferences>({
    budget: 'medium',
    duration: '3-5 days',
    interests: ['family', 'sightseeing']
  });

  const [showPreferences, setShowPreferences] = useState(false);

  // Fetch AI travel recommendations based on family history
  const { data: recommendations, isLoading, refetch } = useQuery({
    queryKey: queryKeys.travelRecommendations(preferences),
    queryFn: () => apiService.getTravelRecommendations(preferences),
    enabled: true,
  });

  // Fetch family memories for context
  const { data: memories = [] } = useQuery({
    queryKey: queryKeys.memories(),
    queryFn: () => apiService.getMemories(),
  });

  const handlePreferenceChange = (key: keyof TravelPreferences, value: any) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const toggleInterest = (interest: string) => {
    setPreferences(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const getBudgetColor = (budget: string) => {
    switch (budget) {
      case 'low': return 'text-green-600 bg-green-50';
      case 'medium': return 'text-blue-600 bg-blue-50';
      case 'high': return 'text-purple-600 bg-purple-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-orange-600';
  };

  if (isLoading) {
    return (
      <Card className={`${className} border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50`}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${isArabic ? 'font-noto' : ''}`}>
            <Compass className="w-5 h-5 text-blue-600 animate-spin" />
            {isArabic ? 'مرشد السفر الذكي' : 'AI Travel Companion'}
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

  return (
    <Card className={`${className} border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50`}>
      <CardHeader>
        <CardTitle className={`flex items-center justify-between ${isArabic ? 'font-noto' : ''}`}>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Compass className="w-5 h-5 text-blue-600" />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
            </div>
            {isArabic ? 'مرشد السفر الذكي' : 'AI Travel Companion'}
          </div>
          <div className="flex items-center gap-2">
            {recommendations?.ai_powered && (
              <Badge variant="secondary" className="text-xs">
                <Brain className="w-3 h-3 mr-1" />
                {isArabic ? 'ذكي' : 'AI'}
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreferences(!showPreferences)}
              className="text-xs"
            >
              {isArabic ? 'التفضيلات' : 'Preferences'}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        
        {/* Preferences Panel */}
        <AnimatePresence>
          {showPreferences && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4 p-4 bg-white/60 rounded-lg border border-blue-100"
            >
              <h4 className={`font-semibold text-blue-900 ${isArabic ? 'font-noto' : ''}`}>
                {isArabic ? 'تخصيص التوصيات' : 'Customize Recommendations'}
              </h4>
              
              {/* Budget */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  {isArabic ? 'الميزانية' : 'Budget'}
                </label>
                <div className="flex gap-2">
                  {(['low', 'medium', 'high'] as const).map((budget) => (
                    <Button
                      key={budget}
                      variant={preferences.budget === budget ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handlePreferenceChange('budget', budget)}
                      className="text-xs"
                    >
                      <DollarSign className="w-3 h-3 mr-1" />
                      {budget === 'low' && (isArabic ? 'منخفض' : 'Low')}
                      {budget === 'medium' && (isArabic ? 'متوسط' : 'Medium')}
                      {budget === 'high' && (isArabic ? 'عالي' : 'High')}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  {isArabic ? 'المدة' : 'Duration'}
                </label>
                <div className="flex gap-2 flex-wrap">
                  {(['1-2 days', '3-5 days', '1 week', '2+ weeks'] as const).map((duration) => (
                    <Button
                      key={duration}
                      variant={preferences.duration === duration ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handlePreferenceChange('duration', duration)}
                      className="text-xs"
                    >
                      <Clock className="w-3 h-3 mr-1" />
                      {duration}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Interests */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  {isArabic ? 'الاهتمامات' : 'Interests'}
                </label>
                <div className="flex gap-2 flex-wrap">
                  {INTEREST_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    const isSelected = preferences.interests.includes(option.id);
                    return (
                      <Button
                        key={option.id}
                        variant={isSelected ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => toggleInterest(option.id)}
                        className="text-xs"
                      >
                        <Icon className="w-3 h-3 mr-1" />
                        {option.label}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <Button onClick={() => refetch()} size="sm" className="w-full">
                <Sparkles className="w-4 h-4 mr-2" />
                {isArabic ? 'تحديث التوصيات' : 'Update Recommendations'}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Family Context */}
        {recommendations?.family_context && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-blue-50 rounded-lg border border-blue-100"
          >
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-blue-600" />
              <h4 className={`font-semibold text-blue-900 text-sm ${isArabic ? 'font-noto' : ''}`}>
                {isArabic ? 'سياق العائلة' : 'Family Travel Profile'}
              </h4>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs text-blue-700">
              <div>
                <span className="font-medium">
                  {isArabic ? 'المواقع المزارة:' : 'Visited Locations:'}
                </span>
                <span className="ml-1">{recommendations.family_context.visited_locations}</span>
              </div>
              {recommendations.family_context.most_visited && (
                <div>
                  <span className="font-medium">
                    {isArabic ? 'الأكثر زيارة:' : 'Most Visited:'}
                  </span>
                  <span className="ml-1">{recommendations.family_context.most_visited}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* AI Recommendations */}
        {recommendations?.recommendations && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className={`font-semibold text-purple-900 ${isArabic ? 'font-noto' : ''}`}>
                {isArabic ? 'توصيات مخصصة' : 'Personalized Recommendations'}
              </h3>
              <div className="flex items-center gap-2">
                <div className={`text-xs font-medium ${getConfidenceColor(recommendations.confidence)}`}>
                  {Math.round(recommendations.confidence * 100)}% {isArabic ? 'ثقة' : 'confidence'}
                </div>
              </div>
            </div>

            <ScrollArea className="h-80">
              <div className="space-y-3">
                {recommendations.recommendations.map((rec, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 bg-white/70 rounded-lg border border-purple-100 cursor-pointer hover:bg-white/90 transition-colors"
                    onClick={() => onSelectDestination?.(rec.destination)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-purple-600" />
                        <h4 className={`font-semibold text-purple-900 ${isArabic ? 'font-noto' : ''}`}>
                          {rec.destination}
                        </h4>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                    </div>

                    <p className={`text-sm text-gray-600 mb-3 ${isArabic ? 'font-noto text-right' : 'text-left'}`}>
                      {rec.reason}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs ${getBudgetColor(rec.estimated_budget.toLowerCase())}`}>
                          <DollarSign className="w-3 h-3 mr-1" />
                          {rec.estimated_budget}
                        </Badge>
                        {rec.family_friendly && (
                          <Badge variant="outline" className="text-xs">
                            <Heart className="w-3 h-3 mr-1" />
                            {isArabic ? 'مناسب للعائلة' : 'Family Friendly'}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {rec.activities && rec.activities.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-medium text-gray-700 mb-1">
                          {isArabic ? 'الأنشطة:' : 'Activities:'}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {rec.activities.slice(0, 3).map((activity, i) => (
                            <span key={i} className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">
                              {activity}
                            </span>
                          ))}
                          {rec.activities.length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{rec.activities.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Reasoning */}
        {recommendations?.reasoning && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-3 bg-green-50 rounded-lg border border-green-100"
          >
            <div className="flex items-start gap-2">
              <Brain className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <p className={`text-sm text-green-800 ${isArabic ? 'font-noto text-right' : 'text-left'}`}>
                <strong className="font-medium">AI Insight:</strong> {recommendations.reasoning}
              </p>
            </div>
          </motion.div>
        )}

      </CardContent>
    </Card>
  );
};