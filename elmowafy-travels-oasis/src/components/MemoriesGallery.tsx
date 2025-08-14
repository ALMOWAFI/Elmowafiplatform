import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, MapPin, Tag, Search, Filter, Image as ImageIcon, Heart, Share2, Download } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

interface Memory {
  id: string;
  title: string;
  description: string;
  image_url: string;
  date: string;
  location: string;
  tags: string[];
  aiAnalysis?: {
    facesDetected: number;
    emotions: string[];
    objects: string[];
    text?: string;
  };
}

interface EnhancedMemory extends Memory {
  year: number;
  month: string;
  formattedDate: string;
}

const MemoriesGallery: React.FC = () => {
  const { language, isRTL } = useLanguage();
  const isArabic = language === 'ar';
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<EnhancedMemory | null>(null);

  // Mock data - replace with actual API call
  const memories: Memory[] = [
    {
      id: '1',
      title: 'Family Beach Day',
      description: 'Amazing day at the beach with the whole family. Kids built sandcastles while we enjoyed the sunset.',
      image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400',
      date: '2024-07-15',
      location: 'Jeddah Corniche',
      tags: ['beach', 'family', 'summer', 'kids'],
      aiAnalysis: {
        facesDetected: 5,
        emotions: ['happy', 'excited'],
        objects: ['beach', 'sand', 'ocean', 'umbrella']
      }
    },
    {
      id: '2',
      title: 'Ramadan Iftar',
      description: 'Beautiful iftar gathering with traditional Middle Eastern dishes. The whole family came together.',
      image_url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400',
      date: '2024-03-20',
      location: 'Home',
      tags: ['ramadan', 'family', 'food', 'tradition'],
      aiAnalysis: {
        facesDetected: 8,
        emotions: ['joyful', 'peaceful'],
        objects: ['food', 'table', 'candles', 'decorations']
      }
    },
    {
      id: '3',
      title: 'Desert Adventure',
      description: 'Exploring the beautiful Saudi desert with family. The kids loved riding camels and watching the stars.',
      image_url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400',
      date: '2024-01-10',
      location: 'Empty Quarter',
      tags: ['desert', 'adventure', 'camels', 'stars'],
      aiAnalysis: {
        facesDetected: 4,
        emotions: ['wonder', 'excitement'],
        objects: ['desert', 'sand', 'sky', 'camels']
      }
    }
  ];

  // Process memories with additional data
  const enhancedMemories: EnhancedMemory[] = useMemo(() => {
    return memories.map(memory => {
      const date = new Date(memory.date);
      return {
        ...memory,
        year: date.getFullYear(),
        month: date.toLocaleDateString('en-US', { month: 'long' }),
        formattedDate: date.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
      };
    });
  }, [memories]);

  // Get unique years and tags for filters
  const years = useMemo(() => {
    const uniqueYears = [...new Set(enhancedMemories.map(m => m.year))].sort((a, b) => b - a);
    return uniqueYears;
  }, [enhancedMemories]);

  const allTags = useMemo(() => {
    const tags = enhancedMemories.flatMap(m => m.tags);
    return [...new Set(tags)].sort();
  }, [enhancedMemories]);

  // Filter memories
  const filteredMemories = useMemo(() => {
    return enhancedMemories.filter(memory => {
      const matchesSearch = memory.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           memory.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           memory.location.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesYear = selectedYear === 'all' || memory.year === parseInt(selectedYear);
      
      const matchesTags = selectedTags.length === 0 || 
                         selectedTags.some(tag => memory.tags.includes(tag));
      
      return matchesSearch && matchesYear && matchesTags;
    });
  }, [enhancedMemories, searchTerm, selectedYear, selectedTags]);

  const handleMemoryClick = (memory: EnhancedMemory) => {
    setSelectedMemory(memory);
    setOpen(true);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag) 
        : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedYear('all');
    setSelectedTags([]);
  };

  const hasActiveFilters = searchTerm || selectedYear !== 'all' || selectedTags.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold font-playfair">
            {isArabic ? 'معرض الذكريات العائلية' : 'Family Memories Gallery'}
          </h1>
          <p className="text-muted-foreground text-lg">
            {isArabic ? 'اكتشف وتذكر اللحظات الثمينة مع العائلة' : 'Discover and relive precious moments with family'}
          </p>
        </div>

        {/* Filters */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              {isArabic ? 'تصفية الذكريات' : 'Filter Memories'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={isArabic ? 'ابحث في الذكريات...' : 'Search memories...'}
                className="pl-10"
              />
            </div>

            {/* Year and Tags */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {isArabic ? 'السنة:' : 'Year:'}
                </label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger>
                    <SelectValue placeholder={isArabic ? 'اختر السنة' : 'Select year'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {isArabic ? 'كل السنوات' : 'All Years'}
                    </SelectItem>
                    {years.map(year => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {isArabic ? 'العلامات:' : 'Tags:'}
                </label>
                <div className="flex flex-wrap gap-2">
                  {allTags.map(tag => (
                    <Badge
                      key={tag}
                      variant={selectedTags.includes(tag) ? "default" : "outline"}
                      className={`cursor-pointer hover:scale-105 transition-transform ${
                        selectedTags.includes(tag) ? 'bg-primary text-primary-foreground' : ''
                      }`}
                      onClick={() => toggleTag(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <div className="flex justify-center">
                <Button variant="outline" onClick={clearFilters} size="sm">
                  {isArabic ? 'مسح الفلاتر' : 'Clear Filters'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Count */}
        <div className="text-center">
          <p className="text-muted-foreground">
            {isArabic 
              ? `تم العثور على ${filteredMemories.length} ذكرى` 
              : `Found ${filteredMemories.length} memories`
            }
          </p>
        </div>

        {/* Memories Grid */}
        {filteredMemories.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMemories.map((memory) => (
              <Card 
                key={memory.id} 
                className="overflow-hidden h-full hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer group"
                onClick={() => handleMemoryClick(memory)}
              >
                <div className="relative">
                  <img
                    src={memory.image_url}
                    alt={memory.title}
                    className="w-full h-48 object-cover group-hover:brightness-110 transition-all duration-300"
                  />
                  {memory.aiAnalysis && (
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-green-500 text-white px-2 py-1 text-xs">
                        AI ✨
                      </Badge>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                    <div className="text-white">
                      <div className="flex items-center gap-2 text-sm mb-1">
                        <Calendar className="w-3 h-3" />
                        <span>{memory.formattedDate}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-3 h-3" />
                        <span>{memory.location}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                    {memory.title}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-3 line-clamp-3">
                    {memory.description}
                  </p>
                  
                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {memory.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {memory.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{memory.tags.length - 3}
                      </Badge>
                    )}
                  </div>

                  {/* AI Analysis Preview */}
                  {memory.aiAnalysis && (
                    <div className="p-2 bg-muted/50 rounded-lg">
                      <p className="text-xs font-medium mb-1 flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        {isArabic ? 'تحليل الذكاء الاصطناعي:' : 'AI Analysis:'}
                      </p>
                      {memory.aiAnalysis.facesDetected > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {isArabic ? 'الوجوه المكتشفة:' : 'Faces detected:'} {memory.aiAnalysis.facesDetected}
                        </p>
                      )}
                      {memory.aiAnalysis.objects && memory.aiAnalysis.objects.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {memory.aiAnalysis.objects.slice(0, 3).map((obj, index) => (
                            <span key={index} className="bg-primary/20 text-primary px-1 py-0.5 text-xs rounded">
                              {obj}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="text-center py-12">
            <ImageIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {isArabic ? 'لا توجد ذكريات' : 'No memories found'}
            </h3>
            <p className="text-muted-foreground">
              {isArabic 
                ? 'جرب تغيير الفلاتر أو إضافة ذكريات جديدة' 
                : 'Try adjusting your filters or add new memories'
              }
            </p>
          </Card>
        )}

        {/* Memory Detail Dialog */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            {selectedMemory && (
              <div className="space-y-6">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-playfair">
                    {selectedMemory.title}
                  </DialogTitle>
                </DialogHeader>
                
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Image Section */}
                  <div className="space-y-4">
                    <div className="relative">
                      <img
                        src={selectedMemory.image_url}
                        alt={selectedMemory.title}
                        className="w-full h-80 object-cover rounded-lg"
                      />
                      {selectedMemory.aiAnalysis && (
                        <div className="absolute top-3 right-3">
                          <Badge className="bg-green-500 text-white px-3 py-1">
                            AI Enhanced ✨
                          </Badge>
                        </div>
                      )}
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Heart className="w-4 h-4 mr-2" />
                        {isArabic ? 'إعجاب' : 'Like'}
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        <Share2 className="w-4 h-4 mr-2" />
                        {isArabic ? 'مشاركة' : 'Share'}
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        <Download className="w-4 h-4 mr-2" />
                        {isArabic ? 'تحميل' : 'Download'}
                      </Button>
                    </div>
                  </div>

                  {/* Details Section */}
                  <div className="space-y-4">
                    {/* Date and Location */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>{selectedMemory.formattedDate}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span>{selectedMemory.location}</span>
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <h4 className="font-semibold mb-2">
                        {isArabic ? 'الوصف:' : 'Description:'}
                      </h4>
                      <p className="text-muted-foreground leading-relaxed">
                        {selectedMemory.description}
                      </p>
                    </div>

                    {/* Tags */}
                    <div>
                      <h4 className="font-semibold mb-2">
                        {isArabic ? 'العلامات:' : 'Tags:'}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedMemory.tags.map((tag) => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* AI Analysis */}
                    {selectedMemory.aiAnalysis && (
                      <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                        <h4 className="font-semibold flex items-center gap-2">
                          <Tag className="w-4 h-4" />
                          {isArabic ? 'تحليل الذكاء الاصطناعي' : 'AI Analysis'}
                        </h4>
                        
                        {selectedMemory.aiAnalysis.facesDetected > 0 && (
                          <div>
                            <span className="text-sm font-medium">
                              {isArabic ? 'الوجوه المكتشفة:' : 'Faces detected:'}
                            </span>
                            <span className="ml-2 text-sm text-muted-foreground">
                              {selectedMemory.aiAnalysis.facesDetected}
                            </span>
                          </div>
                        )}

                        {selectedMemory.aiAnalysis.emotions && selectedMemory.aiAnalysis.emotions.length > 0 && (
                          <div>
                            <span className="text-sm font-medium">
                              {isArabic ? 'المشاعر:' : 'Emotions:'}
                            </span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {selectedMemory.aiAnalysis.emotions.map((emotion, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {emotion}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {selectedMemory.aiAnalysis.objects && selectedMemory.aiAnalysis.objects.length > 0 && (
                          <div>
                            <span className="text-sm font-medium">
                              {isArabic ? 'الأشياء المكتشفة:' : 'Objects detected:'}
                            </span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {selectedMemory.aiAnalysis.objects.map((obj, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {obj}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {selectedMemory.aiAnalysis.text && (
                          <div>
                            <span className="text-sm font-medium">
                              {isArabic ? 'النص المكتشف:' : 'Text detected:'}
                            </span>
                            <p className="text-sm text-muted-foreground mt-1">
                              {selectedMemory.aiAnalysis.text}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default MemoriesGallery;