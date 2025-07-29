import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/context/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { Loader2, AlertCircle } from 'lucide-react';
import { apiService, queryKeys, Memory } from '@/lib/api';

// Enhanced memory interface that matches API response
interface EnhancedMemory extends Memory {
  arabicTitle?: string;
  arabicLocation?: string;
  arabicDescription?: string;
}

const MemoriesGallery: React.FC = () => {
  const { language } = useLanguage();
  const isArabic = language === 'ar';
  
  // State for filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  
  // Fetch memories from API
  const { 
    data: memoriesData = [], 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: queryKeys.memories(),
    queryFn: () => apiService.getMemories(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Convert API memories to enhanced format with Arabic translations
  const enhancedMemories: EnhancedMemory[] = memoriesData.map(memory => ({
    ...memory,
    arabicTitle: memory.title, // For now, use title as Arabic (can be enhanced with translation API)
    arabicLocation: memory.location || '',
    arabicDescription: memory.description || ''
  }));
  
  // Get unique years from memories data
  const years = Array.from(new Set(enhancedMemories.map(memory => new Date(memory.date).getFullYear().toString())));
  
  // Get unique tags from memories data
  const tags = Array.from(new Set(enhancedMemories.flatMap(memory => memory.tags)));
  
  // Filter memories based on search term, year, and tag
  const filteredMemories = enhancedMemories.filter(memory => {
    const matchesSearch = isArabic
      ? (memory.arabicTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         memory.arabicLocation?.toLowerCase().includes(searchTerm.toLowerCase()))
      : (memory.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
         (memory.location && memory.location.toLowerCase().includes(searchTerm.toLowerCase())));
    
    const matchesYear = selectedYear === 'all' || new Date(memory.date).getFullYear().toString() === selectedYear;
    const matchesTag = selectedTag === 'all' || memory.tags.includes(selectedTag);
    
    return matchesSearch && matchesYear && matchesTag;
  });
  
  // Animation variants for gallery items
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.4
      }
    }
  };
  
  // Handle loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">
          {isArabic ? 'تحميل الذكريات...' : 'Loading memories...'}
        </span>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">
            {isArabic ? 'خطأ في تحميل الذكريات' : 'Error Loading Memories'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {isArabic 
              ? 'حدث خطأ أثناء تحميل الذكريات. يرجى المحاولة مرة أخرى.' 
              : 'There was an error loading your memories. Please try again.'}
          </p>
          <Button onClick={() => refetch()}>
            {isArabic ? 'إعادة المحاولة' : 'Try Again'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder={isArabic ? 'ابحث عن ذكريات...' : 'Search memories...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={isArabic ? 'text-right' : 'text-left'}
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder={isArabic ? 'السنة' : 'Year'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isArabic ? 'كل السنوات' : 'All Years'}</SelectItem>
              {years.map(year => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={selectedTag} onValueChange={setSelectedTag}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder={isArabic ? 'النوع' : 'Category'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isArabic ? 'كل الأنواع' : 'All Categories'}</SelectItem>
              {tags.map(tag => (
                <SelectItem key={tag} value={tag}>
                  {isArabic
                    ? tag === 'historical' ? 'تاريخي'
                      : tag === 'beach' ? 'شاطئ'
                      : tag === 'architecture' ? 'عمارة'
                      : tag === 'cultural' ? 'ثقافي'
                      : tag === 'adventure' ? 'مغامرة'
                      : tag === 'shopping' ? 'تسوق'
                      : tag === 'family-trip' ? 'رحلة عائلية'
                      : tag === 'summer' ? 'صيف'
                      : tag === 'city' ? 'مدينة'
                      : tag
                    : tag.charAt(0).toUpperCase() + tag.slice(1).replace('-', ' ')
                  }
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Gallery */}
      {filteredMemories.length > 0 ? (
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {filteredMemories.map(memory => (
            <motion.div key={memory.id} variants={itemVariants}>
              <Card className="overflow-hidden h-full hover:shadow-lg transition-shadow">
                <div className="aspect-video relative overflow-hidden">
                  {memory.imageUrl ? (
                    <img 
                      src={memory.imageUrl.startsWith('http') ? memory.imageUrl : `http://localhost:8001${memory.imageUrl}`}
                      alt={isArabic ? memory.arabicTitle : memory.title}
                      className="w-full h-full object-cover transition-transform hover:scale-105 duration-500"
                      onError={(e) => {
                        // Fallback to placeholder if image fails to load
                        e.currentTarget.src = '/placeholder.svg';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <span className="text-muted-foreground">
                        {isArabic ? 'لا توجد صورة' : 'No image'}
                      </span>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                    <h3 className={`text-white font-bold ${isArabic ? 'font-noto' : ''}`}>
                      {isArabic ? memory.arabicTitle : memory.title}
                    </h3>
                    <p className={`text-white/80 text-sm ${isArabic ? 'font-noto' : ''}`}>
                      {isArabic ? memory.arabicLocation : memory.location} • {new Date(memory.date).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US')}
                    </p>
                    {/* AI Analysis Indicator */}
                    {memory.aiAnalysis && (
                      <div className="absolute top-2 right-2">
                        <div className="bg-green-500 text-white px-2 py-1 text-xs rounded-full">
                          AI ✨
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <CardContent className="p-4">
                  <p className={`text-sm text-muted-foreground mb-3 ${isArabic ? 'font-noto' : ''}`}>
                    {isArabic ? memory.arabicDescription : memory.description}
                  </p>
                  
                  {/* Display AI analysis results if available */}
                  {memory.aiAnalysis && (
                    <div className="mb-3 p-2 bg-muted rounded-lg">
                      <p className="text-xs font-medium mb-1">
                        {isArabic ? 'تحليل الذكاء الاصطناعي:' : 'AI Analysis:'}
                      </p>
                      {memory.aiAnalysis.faces && typeof memory.aiAnalysis.faces === 'object' && (
                        <p className="text-xs text-muted-foreground">
                          {isArabic ? 'الوجوه المكتشفة:' : 'Faces detected:'} {memory.aiAnalysis.faces.count || 0}
                        </p>
                      )}
                      {memory.aiAnalysis.smart_tags && Array.isArray(memory.aiAnalysis.smart_tags) && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {memory.aiAnalysis.smart_tags.slice(0, 3).map((tag: string, index: number) => (
                            <span key={index} className="bg-primary/20 text-primary px-1 py-0.5 text-xs rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {memory.tags.map(tag => (
                      <Button 
                        key={tag} 
                        variant="outline" 
                        size="sm" 
                        className="rounded-full text-xs"
                        onClick={() => setSelectedTag(tag)}
                      >
                        {isArabic
                          ? tag === 'historical' ? 'تاريخي'
                            : tag === 'beach' ? 'شاطئ'
                            : tag === 'architecture' ? 'عمارة'
                            : tag === 'cultural' ? 'ثقافي'
                            : tag === 'adventure' ? 'مغامرة'
                            : tag === 'shopping' ? 'تسوق'
                            : tag === 'family-trip' ? 'رحلة عائلية'
                            : tag === 'summer' ? 'صيف'
                            : tag === 'city' ? 'مدينة'
                            : tag
                          : tag.charAt(0).toUpperCase() + tag.slice(1).replace('-', ' ')
                        }
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <div className="text-center py-12">
          <p className={`text-muted-foreground ${isArabic ? 'font-noto' : ''}`}>
            {isArabic ? 'لا توجد ذكريات تطابق معايير البحث' : 'No memories match your search criteria'}
          </p>
        </div>
      )}
    </div>
  );
};

export default MemoriesGallery;