import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Sparkles, 
  Clock, 
  Heart, 
  Camera, 
  Calendar,
  MapPin,
  ArrowRight,
  Brain
} from 'lucide-react';
import { apiService, queryKeys, Memory } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';

interface MemorySuggestions {
  onThisDay: Memory[];
  similar: Memory[];
  recommendations: string[];
  ai_powered?: boolean;
}

interface AIMemorySuggestionsProps {
  onMemoryClick?: (memory: Memory) => void;
  className?: string;
}

export const AIMemorySuggestions: React.FC<AIMemorySuggestionsProps> = ({ 
  onMemoryClick,
  className = ""
}) => {
  const { language } = useLanguage();
  const isArabic = language === 'ar';

  const { data: suggestions, isLoading, error } = useQuery({
    queryKey: queryKeys.memorySuggestions(),
    queryFn: () => apiService.getMemorySuggestions(),
    refetchInterval: 1000 * 60 * 30, // Refresh every 30 minutes
    staleTime: 1000 * 60 * 15, // Consider stale after 15 minutes
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(isArabic ? 'ar-SA' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getYearDifference = (dateString: string) => {
    const memoryDate = new Date(dateString);
    const today = new Date();
    return today.getFullYear() - memoryDate.getFullYear();
  };

  if (isLoading) {
    return (
      <Card className={`${className}`}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${isArabic ? 'font-noto' : ''}`}>
            <Brain className="w-5 h-5 text-purple-600 animate-pulse" />
            {isArabic ? 'الذكريات الذكية' : 'AI Memory Insights'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg animate-pulse">
                <div className="w-10 h-10 bg-gray-200 rounded-lg" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`${className} border-orange-200 bg-orange-50`}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 text-orange-700 ${isArabic ? 'font-noto' : ''}`}>
            <Brain className="w-5 h-5" />
            {isArabic ? 'الذكريات الذكية' : 'AI Memory Insights'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className={`text-sm text-orange-600 ${isArabic ? 'font-noto text-right' : 'text-left'}`}>
            {isArabic 
              ? 'غير متاح حالياً. جاري العمل على تحسين التجربة...'
              : 'Currently unavailable. Working on improving your experience...'
            }
          </p>
        </CardContent>
      </Card>
    );
  }

  const hasOnThisDay = suggestions?.onThisDay && suggestions.onThisDay.length > 0;
  const hasSimilar = suggestions?.similar && suggestions.similar.length > 0;
  const hasRecommendations = suggestions?.recommendations && suggestions.recommendations.length > 0;

  return (
    <Card className={`${className} border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50`}>
      <CardHeader>
        <CardTitle className={`flex items-center justify-between ${isArabic ? 'font-noto' : ''}`}>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
            </div>
            {isArabic ? 'الذكريات الذكية' : 'AI Memory Insights'}
          </div>
          {suggestions?.ai_powered && (
            <Badge variant="secondary" className="text-xs">
              <Brain className="w-3 h-3 mr-1" />
              {isArabic ? 'مدعوم بالذكاء الاصطناعي' : 'AI-Powered'}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* On This Day Memories */}
        {hasOnThisDay && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-blue-600" />
              <h3 className={`font-semibold text-blue-900 ${isArabic ? 'font-noto' : ''}`}>
                {isArabic ? 'في مثل هذا اليوم' : 'On This Day'}
              </h3>
            </div>
            <div className="space-y-2">
              {suggestions.onThisDay.map((memory) => {
                const yearDiff = getYearDifference(memory.date);
                return (
                  <motion.div
                    key={memory.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-100 cursor-pointer hover:bg-blue-100 transition-colors"
                    onClick={() => onMemoryClick?.(memory)}
                  >
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                      <Camera className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium text-gray-900 ${isArabic ? 'font-noto text-right' : 'text-left'}`}>
                        {memory.title}
                      </p>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(memory.date)}</span>
                        {yearDiff > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {yearDiff} {isArabic ? 'سنوات مضت' : 'years ago'}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Similar Memories */}
        {hasSimilar && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Heart className="w-4 h-4 text-pink-600" />
              <h3 className={`font-semibold text-pink-900 ${isArabic ? 'font-noto' : ''}`}>
                {isArabic ? 'ذكريات مشابهة' : 'Similar Memories'}
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {suggestions.similar.slice(0, 2).map((memory) => (
                <motion.div
                  key={memory.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center space-x-3 p-3 bg-pink-50 rounded-lg border border-pink-100 cursor-pointer hover:bg-pink-100 transition-colors"
                  onClick={() => onMemoryClick?.(memory)}
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-red-500 rounded-lg flex items-center justify-center">
                    <Camera className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium text-gray-900 text-sm ${isArabic ? 'font-noto text-right' : 'text-left'}`}>
                      {memory.title}
                    </p>
                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                      {memory.location && (
                        <>
                          <MapPin className="w-3 h-3" />
                          <span>{memory.location}</span>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* AI Recommendations */}  
        {hasRecommendations && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-4 h-4 text-green-600" />
              <h3 className={`font-semibold text-green-900 ${isArabic ? 'font-noto' : ''}`}>
                {isArabic ? 'اقتراحات ذكية' : 'Smart Suggestions'}
              </h3>
            </div>
            <div className="space-y-2">
              {suggestions.recommendations.map((recommendation, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className="flex items-start space-x-2 p-3 bg-green-50 rounded-lg border border-green-100"
                >
                  <Sparkles className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <p className={`text-sm text-green-800 ${isArabic ? 'font-noto text-right' : 'text-left'}`}>
                    {recommendation}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {!hasOnThisDay && !hasSimilar && !hasRecommendations && (
          <div className="text-center py-8">
            <Brain className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className={`text-gray-500 ${isArabic ? 'font-noto' : ''}`}>
              {isArabic 
                ? 'سيتم عرض الذكريات الذكية هنا قريباً...'
                : 'Smart memory insights will appear here soon...'
              }
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};