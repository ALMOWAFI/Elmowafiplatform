import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Eye, 
  Sparkles, 
  Filter,
  Search,
  ArrowUp,
  ArrowDown,
  Loader2,
  AlertCircle,
  Heart,
  Share2,
  Download,
  Brain,
  History,
  Gift,
  Star,
  Camera
} from 'lucide-react';
import { apiService, queryKeys, Memory } from '@/lib/api';
import { toast } from 'sonner';
import { format, parseISO, isToday, isSameDay, subYears } from 'date-fns';

interface TimelineGroup {
  year: number;
  month: number;
  monthName: string;
  memories: Memory[];
}

interface MemorySuggestion {
  type: 'on_this_day' | 'similar_content' | 'family_connection' | 'anniversary';
  memory: Memory;
  reason: string;
  confidence: number;
  year_difference?: number;
}

interface SmartSuggestions {
  onThisDay: MemorySuggestion[];
  similar: MemorySuggestion[];
  recommendations: string[];
  ai_powered: boolean;
}

interface MemoryTimelineProps {
  familyMemberId?: string;
  showAIInsights?: boolean;
  showSmartSuggestions?: boolean;
}

export const MemoryTimeline: React.FC<MemoryTimelineProps> = ({ 
  familyMemberId,
  showAIInsights = true,
  showSmartSuggestions = true
}) => {
  const { language } = useLanguage();
  const isArabic = language === 'ar';
  
  // State for filtering and sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMember, setSelectedMember] = useState<string>(familyMemberId || 'all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [selectedTag, setSelectedTag] = useState<string>('all');

  // Fetch data
  const { 
    data: memories = [], 
    isLoading: memoriesLoading, 
    error: memoriesError,
    refetch: refetchMemories 
  } = useQuery({
    queryKey: queryKeys.memories({ familyMemberId: selectedMember !== 'all' ? selectedMember : undefined }),
    queryFn: () => apiService.getMemories({ 
      familyMemberId: selectedMember !== 'all' ? selectedMember : undefined 
    }),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const { data: familyMembers = [] } = useQuery({
    queryKey: queryKeys.familyMembers,
    queryFn: () => apiService.getFamilyMembers(),
  });

  const { 
    data: suggestions,
    isLoading: suggestionsLoading 
  } = useQuery({
    queryKey: queryKeys.memorySuggestions(),
    queryFn: () => apiService.getMemorySuggestions(),
    enabled: showSmartSuggestions,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  // Process and group memories by date
  const timelineGroups = useMemo(() => {
    let filteredMemories = memories;

    // Apply filters
    if (searchTerm) {
      filteredMemories = filteredMemories.filter(memory =>
        memory.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (memory.description && memory.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (memory.location && memory.location.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (selectedYear !== 'all') {
      filteredMemories = filteredMemories.filter(memory =>
        new Date(memory.date).getFullYear().toString() === selectedYear
      );
    }

    if (selectedTag !== 'all') {
      filteredMemories = filteredMemories.filter(memory =>
        memory.tags.includes(selectedTag)
      );
    }

    // Sort memories
    filteredMemories = [...filteredMemories].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    // Group by year and month
    const groups: TimelineGroup[] = [];
    const groupMap: { [key: string]: TimelineGroup } = {};

    filteredMemories.forEach(memory => {
      const date = new Date(memory.date);
      const year = date.getFullYear();
      const month = date.getMonth();
      const key = `${year}-${month}`;

      if (!groupMap[key]) {
        const monthNames = isArabic 
          ? ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
          : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        
        groupMap[key] = {
          year,
          month,
          monthName: monthNames[month],
          memories: []
        };
        groups.push(groupMap[key]);
      }

      groupMap[key].memories.push(memory);
    });

    return groups.sort((a, b) => {
      const dateA = new Date(a.year, a.month).getTime();
      const dateB = new Date(b.year, b.month).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
  }, [memories, searchTerm, selectedYear, selectedTag, sortOrder, isArabic]);

  // Get available years and tags
  const availableYears = useMemo(() => {
    const years = Array.from(new Set(memories.map(memory => 
      new Date(memory.date).getFullYear().toString()
    )));
    return years.sort((a, b) => parseInt(b) - parseInt(a));
  }, [memories]);

  const availableTags = useMemo(() => {
    return Array.from(new Set(memories.flatMap(memory => memory.tags)));
  }, [memories]);

  // Handle memory interactions
  const handleLikeMemory = async (memoryId: string) => {
    // This would be implemented with a like/favorite API endpoint
    toast.success(isArabic ? 'تم إضافة الذكرى للمفضلة' : 'Memory added to favorites');
  };

  const handleShareMemory = async (memory: Memory) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: memory.title,
          text: memory.description || '',
          url: window.location.href
        });
      } catch (error) {
        // Fallback to clipboard
        navigator.clipboard.writeText(`${memory.title} - ${window.location.href}`);
        toast.success(isArabic ? 'تم نسخ الرابط' : 'Link copied to clipboard');
      }
    } else {
      navigator.clipboard.writeText(`${memory.title} - ${window.location.href}`);
      toast.success(isArabic ? 'تم نسخ الرابط' : 'Link copied to clipboard');
    }
  };

  // Loading state
  if (memoriesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">
          {isArabic ? 'تحميل الخط الزمني...' : 'Loading timeline...'}
        </span>
      </div>
    );
  }

  // Error state
  if (memoriesError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">
            {isArabic ? 'خطأ في تحميل الخط الزمني' : 'Error Loading Timeline'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {isArabic 
              ? 'حدث خطأ أثناء تحميل الخط الزمني. يرجى المحاولة مرة أخرى.' 
              : 'There was an error loading the timeline. Please try again.'}
          </p>
          <Button onClick={() => refetchMemories()}>
            {isArabic ? 'إعادة المحاولة' : 'Try Again'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and AI Suggestions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className={`text-3xl font-bold ${isArabic ? 'font-noto' : ''}`}>
              {isArabic ? 'الخط الزمني للذكريات' : 'Memory Timeline'}
            </h2>
            <p className={`text-muted-foreground ${isArabic ? 'font-noto' : ''}`}>
              {isArabic 
                ? 'استكشف رحلة ذكرياتك العائلية عبر الزمن'
                : 'Explore your family memory journey through time'
              }
            </p>
          </div>
          {showAIInsights && suggestions && (
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-500" />
              <span className="text-sm text-muted-foreground">
                {isArabic ? 'مدعوم بالذكاء الاصطناعي' : 'AI-Powered'}
              </span>
            </div>
          )}
        </div>

        {/* AI Insights Panel */}
        {showSmartSuggestions && suggestions && !suggestionsLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-purple-500" />
              <h3 className={`font-medium text-purple-700 ${isArabic ? 'font-noto' : ''}`}>
                {isArabic ? 'اقتراحات ذكية' : 'AI Insights'}
              </h3>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              {/* On This Day */}
              {suggestions.onThisDay && suggestions.onThisDay.length > 0 && (
                <div>
                  <h4 className={`text-sm font-medium mb-2 ${isArabic ? 'font-noto' : ''}`}>
                    {isArabic ? 'في مثل هذا اليوم' : 'On This Day'}
                  </h4>
                  <div className="space-y-2">
                    {suggestions.onThisDay.slice(0, 2).map((memory: Memory, index: number) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-white rounded border">
                        <Calendar className="h-3 w-3 text-purple-500" />
                        <span className="text-xs">{memory.title}</span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {new Date(memory.date).getFullYear()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Recommendations */}
              {suggestions.recommendations && suggestions.recommendations.length > 0 && (
                <div>
                  <h4 className={`text-sm font-medium mb-2 ${isArabic ? 'font-noto' : ''}`}>
                    {isArabic ? 'توصيات' : 'Recommendations'}
                  </h4>
                  <div className="space-y-1">
                    {suggestions.recommendations.slice(0, 3).map((rec: string, index: number) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="w-1 h-1 bg-purple-400 rounded-full" />
                        <span className="text-xs text-purple-700">{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder={isArabic ? 'البحث في الذكريات...' : 'Search memories...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`pl-10 ${isArabic ? 'text-right' : 'text-left'}`}
              />
            </div>

            {/* Year Filter */}
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger>
                <SelectValue placeholder={isArabic ? 'السنة' : 'Year'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isArabic ? 'كل السنوات' : 'All Years'}</SelectItem>
                {availableYears.map(year => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Family Member Filter */}
            <Select value={selectedMember} onValueChange={setSelectedMember}>
              <SelectTrigger>
                <SelectValue placeholder={isArabic ? 'فرد العائلة' : 'Family Member'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isArabic ? 'كل أفراد العائلة' : 'All Members'}</SelectItem>
                {familyMembers.map(member => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Tag Filter */}
            <Select value={selectedTag} onValueChange={setSelectedTag}>
              <SelectTrigger>
                <SelectValue placeholder={isArabic ? 'الوسم' : 'Tag'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isArabic ? 'كل الوسوم' : 'All Tags'}</SelectItem>
                {availableTags.map(tag => (
                  <SelectItem key={tag} value={tag}>#{tag}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort Order */}
            <Button
              variant="outline"
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="flex items-center gap-2"
            >
              {sortOrder === 'desc' ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
              {isArabic ? (sortOrder === 'desc' ? 'الأحدث أولاً' : 'الأقدم أولاً') : (sortOrder === 'desc' ? 'Newest First' : 'Oldest First')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <div className="relative">
        {/* Timeline Line */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/50 via-primary/30 to-transparent" />
        
        <div className="space-y-8">
          <AnimatePresence>
            {timelineGroups.map((group, groupIndex) => (
              <motion.div
                key={`${group.year}-${group.month}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: groupIndex * 0.1 }}
                className="relative"
              >
                {/* Month Header */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative z-10 flex items-center justify-center w-16 h-16 bg-primary text-primary-foreground rounded-full shadow-lg">
                    <div className="text-center">
                      <div className={`text-xs font-medium ${isArabic ? 'font-noto' : ''}`}>
                        {group.monthName}
                      </div>
                      <div className="text-lg font-bold">{group.year}</div>
                    </div>
                  </div>
                  <div>
                    <h3 className={`text-xl font-semibold ${isArabic ? 'font-noto' : ''}`}>
                      {group.monthName} {group.year}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {group.memories.length} {isArabic ? 'ذكرى' : group.memories.length === 1 ? 'memory' : 'memories'}
                    </p>
                  </div>
                </div>

                {/* Memories in this month */}
                <div className="ml-20 space-y-4">
                  {group.memories.map((memory, memoryIndex) => (
                    <motion.div
                      key={memory.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: (groupIndex * 0.1) + (memoryIndex * 0.05) }}
                    >
                      <Card className="hover:shadow-lg transition-shadow duration-300">
                        <CardContent className="p-6">
                          <div className="flex gap-4">
                            {/* Memory Image */}
                            {memory.imageUrl && (
                              <div className="flex-shrink-0">
                                <img
                                  src={memory.imageUrl.startsWith('http') ? memory.imageUrl : `http://localhost:8001${memory.imageUrl}`}
                                  alt={memory.title}
                                  className="w-24 h-24 object-cover rounded-lg border"
                                  onError={(e) => {
                                    e.currentTarget.src = '/placeholder.svg';
                                  }}
                                />
                                {memory.aiAnalysis && (
                                  <div className="mt-1 flex justify-center">
                                    <Badge variant="secondary" className="text-xs">
                                      <Brain className="h-3 w-3 mr-1" />
                                      AI
                                    </Badge>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Memory Content */}
                            <div className="flex-1 space-y-3">
                              <div>
                                <div className="flex items-start justify-between">
                                  <h4 className={`text-lg font-semibold ${isArabic ? 'font-noto' : ''}`}>
                                    {memory.title}
                                  </h4>
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    {new Date(memory.date).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US')}
                                  </div>
                                </div>
                                
                                {memory.description && (
                                  <p className={`text-muted-foreground mt-1 ${isArabic ? 'font-noto' : ''}`}>
                                    {memory.description}
                                  </p>
                                )}
                                
                                {memory.location && (
                                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-2">
                                    <MapPin className="h-4 w-4" />
                                    {memory.location}
                                  </div>
                                )}
                              </div>

                              {/* AI Analysis Display */}
                              {memory.aiAnalysis && showAIInsights && (
                                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Brain className="h-4 w-4 text-purple-600" />
                                    <span className="text-sm font-medium text-purple-700">
                                      {isArabic ? 'تحليل الذكاء الاصطناعي' : 'AI Analysis'}
                                    </span>
                                  </div>
                                  <div className="text-xs text-purple-600 space-y-1">
                                    {memory.aiAnalysis.faces && typeof memory.aiAnalysis.faces === 'object' && (
                                      <div>
                                        <strong>{isArabic ? 'الوجوه:' : 'Faces:'}</strong> {memory.aiAnalysis.faces.count || 0}
                                      </div>
                                    )}
                                    {memory.aiAnalysis.smart_tags && Array.isArray(memory.aiAnalysis.smart_tags) && (
                                      <div className="flex flex-wrap gap-1 mt-2">
                                        {memory.aiAnalysis.smart_tags.slice(0, 3).map((tag: string, idx: number) => (
                                          <Badge key={idx} variant="outline" className="text-xs text-purple-600 border-purple-300">
                                            #{tag}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Tags and Family Members */}
                              <div className="space-y-2">
                                {memory.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {memory.tags.map((tag, idx) => (
                                      <Badge key={idx} variant="secondary" className="text-xs">
                                        #{tag}
                                      </Badge>
                                    ))}
                                  </div>
                                )}

                                {memory.familyMembers.length > 0 && (
                                  <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                    <div className="flex -space-x-2">
                                      {memory.familyMembers.slice(0, 3).map((memberId, idx) => {
                                        const member = familyMembers.find(m => m.id === memberId);
                                        return (
                                          <Avatar key={idx} className="h-6 w-6 border-2 border-white">
                                            <AvatarImage src={member?.avatar} />
                                            <AvatarFallback className="text-xs">
                                              {member?.name?.charAt(0) || 'U'}
                                            </AvatarFallback>
                                          </Avatar>
                                        );
                                      })}
                                      {memory.familyMembers.length > 3 && (
                                        <div className="h-6 w-6 bg-muted border-2 border-white rounded-full flex items-center justify-center">
                                          <span className="text-xs">+{memory.familyMembers.length - 3}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-2 pt-2 border-t">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleLikeMemory(memory.id!)}
                                  className="flex items-center gap-1"
                                >
                                  <Heart className="h-4 w-4" />
                                  <span className="text-xs">{isArabic ? 'إعجاب' : 'Like'}</span>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleShareMemory(memory)}
                                  className="flex items-center gap-1"
                                >
                                  <Share2 className="h-4 w-4" />
                                  <span className="text-xs">{isArabic ? 'مشاركة' : 'Share'}</span>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="flex items-center gap-1 ml-auto"
                                >
                                  <Eye className="h-4 w-4" />
                                  <span className="text-xs">{isArabic ? 'عرض' : 'View'}</span>
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Empty State */}
        {timelineGroups.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className={`text-lg font-medium mb-2 ${isArabic ? 'font-noto' : ''}`}>
              {isArabic ? 'لا توجد ذكريات' : 'No Memories Found'}
            </h3>
            <p className={`text-muted-foreground ${isArabic ? 'font-noto' : ''}`}>
              {isArabic 
                ? 'لم يتم العثور على ذكريات تطابق معايير البحث الحالية'
                : 'No memories match your current search criteria'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};