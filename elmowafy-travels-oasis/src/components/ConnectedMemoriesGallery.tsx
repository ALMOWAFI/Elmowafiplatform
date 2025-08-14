import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, MapPin, Tag, Search, Filter, Image as ImageIcon, Heart, Share2, Download, Users, Zap, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useData } from '@/context/DataContext';
import { useIntegration } from '@/context/IntegrationContext';
import { toast } from 'sonner';

interface EnhancedMemory {
  id: string;
  title: string;
  description: string;
  image_url: string;
  date: string;
  location: string;
  tags: string[];
  family_members: string[];
  aiAnalysis?: {
    facesDetected: number;
    emotions: string[];
    objects: string[];
    text?: string;
  };
  year: number;
  month: string;
  formattedDate: string;
}

const ConnectedMemoriesGallery: React.FC = () => {
  const { language, isRTL } = useLanguage();
  const { memories, familyMembers, suggestions, updateMemory, removeMemory, refreshAllData } = useData();
  const { subscribeToUpdates, broadcastEvent } = useIntegration();
  const isArabic = language === 'ar';
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedFamilyMember, setSelectedFamilyMember] = useState<string>('all');
  const [open, setOpen] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<EnhancedMemory | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Subscribe to real-time memory updates
  useEffect(() => {
    const unsubscribeMemory = subscribeToUpdates('memory_update', (data) => {
      console.log('Memory updated in gallery:', data);
      toast.info(isArabic ? 'تم تحديث الذكريات' : 'Memories updated');
    });

    const unsubscribeFamily = subscribeToUpdates('family_update', (data) => {
      console.log('Family updated in gallery:', data);
    });

    return () => {
      unsubscribeMemory();
      unsubscribeFamily();
    };
  }, [subscribeToUpdates, isArabic]);

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

  // Get unique years, tags, and family members for filters
  const years = useMemo(() => {
    const uniqueYears = [...new Set(enhancedMemories.map(m => m.year))].sort((a, b) => b - a);
    return uniqueYears;
  }, [enhancedMemories]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    enhancedMemories.forEach(memory => {
      memory.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [enhancedMemories]);

  const allFamilyMembers = useMemo(() => {
    return familyMembers.map(member => ({
      id: member.id,
      name: member.name,
      nameArabic: member.nameArabic
    }));
  }, [familyMembers]);

  // Filter memories based on search and filters
  const filteredMemories = useMemo(() => {
    return enhancedMemories.filter(memory => {
      // Search term filter
      const matchesSearch = !searchTerm || 
        memory.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        memory.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        memory.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        memory.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));

      // Year filter
      const matchesYear = selectedYear === 'all' || memory.year.toString() === selectedYear;

      // Tags filter
      const matchesTags = selectedTags.length === 0 || 
        selectedTags.some(tag => memory.tags.includes(tag));

      // Family member filter
      const matchesFamilyMember = selectedFamilyMember === 'all' || 
        memory.family_members.includes(selectedFamilyMember);

      return matchesSearch && matchesYear && matchesTags && matchesFamilyMember;
    });
  }, [enhancedMemories, searchTerm, selectedYear, selectedTags, selectedFamilyMember]);

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
    setSelectedFamilyMember('all');
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshAllData();
      broadcastEvent('memories_refresh', { timestamp: new Date() });
      toast.success(isArabic ? 'تم تحديث الذكريات' : 'Memories refreshed');
    } catch (error) {
      toast.error(isArabic ? 'فشل في تحديث الذكريات' : 'Failed to refresh memories');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleShareMemory = async (memory: EnhancedMemory) => {
    try {
      // In a real app, this would share the memory with family members
      broadcastEvent('memory_shared', { memoryId: memory.id, memory: memory });
      toast.success(isArabic ? 'تم مشاركة الذكرى' : 'Memory shared');
    } catch (error) {
      toast.error(isArabic ? 'فشل في مشاركة الذكرى' : 'Failed to share memory');
    }
  };

  const handleDownloadMemory = async (memory: EnhancedMemory) => {
    try {
      const link = document.createElement('a');
      link.href = memory.image_url;
      link.download = `${memory.title}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(isArabic ? 'تم تحميل الذكرى' : 'Memory downloaded');
    } catch (error) {
      toast.error(isArabic ? 'فشل في تحميل الذكرى' : 'Failed to download memory');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className={`text-3xl font-bold ${isArabic ? 'font-noto' : ''}`}>
            {isArabic ? 'معرض الذكريات' : 'Memories Gallery'}
          </h1>
          <p className={`text-muted-foreground ${isArabic ? 'font-noto' : ''}`}>
            {isArabic 
              ? `${memories.length} ذكرى عائلية`
              : `${memories.length} family memories`
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isArabic ? 'تحديث' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {isArabic ? 'تصفية الذكريات' : 'Filter Memories'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder={isArabic ? 'البحث في الذكريات...' : 'Search memories...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Year Filter */}
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger>
                <SelectValue placeholder={isArabic ? 'اختر السنة' : 'Select Year'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isArabic ? 'كل السنوات' : 'All Years'}</SelectItem>
                {years.map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Family Member Filter */}
            <Select value={selectedFamilyMember} onValueChange={setSelectedFamilyMember}>
              <SelectTrigger>
                <SelectValue placeholder={isArabic ? 'اختر العضو' : 'Select Member'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isArabic ? 'كل الأعضاء' : 'All Members'}</SelectItem>
                {allFamilyMembers.map(member => (
                  <SelectItem key={member.id} value={member.id}>
                    {isArabic ? member.nameArabic || member.name : member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            <Button variant="outline" onClick={clearFilters} className="md:col-span-2">
              {isArabic ? 'مسح الفلاتر' : 'Clear Filters'}
            </Button>
          </div>

          {/* Tags Filter */}
          {allTags.length > 0 && (
            <div>
              <p className={`text-sm font-medium mb-2 ${isArabic ? 'font-noto' : ''}`}>
                {isArabic ? 'العلامات:' : 'Tags:'}
              </p>
              <div className="flex flex-wrap gap-2">
                {allTags.map(tag => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Suggestions */}
      {suggestions && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              {isArabic ? 'اقتراحات الذكاء الاصطناعي' : 'AI Suggestions'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className={`font-medium mb-2 ${isArabic ? 'font-noto' : ''}`}>
                  {isArabic ? 'في مثل هذا اليوم:' : 'On This Day:'}
                </h4>
                <div className="space-y-2">
                  {suggestions.onThisDay?.slice(0, 2).map((memory: any, idx: number) => (
                    <div key={idx} className="p-2 bg-blue-50 rounded border">
                      <p className="text-sm font-medium">{memory.title}</p>
                      <p className="text-xs text-muted-foreground">{memory.date}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className={`font-medium mb-2 ${isArabic ? 'font-noto' : ''}`}>
                  {isArabic ? 'توصيات:' : 'Recommendations:'}
                </h4>
                <div className="space-y-1">
                  {suggestions.recommendations?.slice(0, 3).map((rec: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Heart className="h-3 w-3 text-red-500" />
                      <p className="text-sm">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Memories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMemories.map((memory) => (
          <Card key={memory.id} className="cursor-pointer hover:shadow-lg transition-shadow">
            <div onClick={() => handleMemoryClick(memory)}>
              <div className="relative aspect-square overflow-hidden rounded-t-lg">
                <img
                  src={memory.image_url}
                  alt={memory.title}
                  className="w-full h-full object-cover"
                />
                {memory.aiAnalysis && (
                  <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                    <Users className="h-3 w-3 inline mr-1" />
                    {memory.aiAnalysis.facesDetected}
                  </div>
                )}
              </div>
              <CardContent className="p-4">
                <h3 className={`font-semibold mb-2 ${isArabic ? 'font-noto' : ''}`}>
                  {memory.title}
                </h3>
                <p className={`text-sm text-muted-foreground mb-3 line-clamp-2 ${isArabic ? 'font-noto' : ''}`}>
                  {memory.description}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <Calendar className="h-3 w-3" />
                  {memory.formattedDate}
                  {memory.location && (
                    <>
                      <MapPin className="h-3 w-3" />
                      {memory.location}
                    </>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {memory.tags.slice(0, 3).map((tag, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {memory.tags.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{memory.tags.length - 3}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </div>
            <div className="p-4 pt-0 flex justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleShareMemory(memory);
                }}
              >
                <Share2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownloadMemory(memory);
                }}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredMemories.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className={`text-lg font-medium mb-2 ${isArabic ? 'font-noto' : ''}`}>
              {isArabic ? 'لا توجد ذكريات' : 'No memories found'}
            </h3>
            <p className={`text-muted-foreground ${isArabic ? 'font-noto' : ''}`}>
              {isArabic 
                ? 'جرب تغيير الفلاتر أو إضافة ذكريات جديدة'
                : 'Try adjusting your filters or add new memories'
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* Memory Detail Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedMemory?.title}</DialogTitle>
          </DialogHeader>
          {selectedMemory && (
            <div className="space-y-4">
              <img
                src={selectedMemory.image_url}
                alt={selectedMemory.title}
                className="w-full rounded-lg"
              />
              <div>
                <p className="text-muted-foreground mb-4">{selectedMemory.description}</p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {selectedMemory.formattedDate}
                  </div>
                  {selectedMemory.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {selectedMemory.location}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedMemory.tags.map((tag, idx) => (
                    <Badge key={idx} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
                {selectedMemory.aiAnalysis && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">AI Analysis</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <strong>Faces Detected:</strong> {selectedMemory.aiAnalysis.facesDetected}
                      </div>
                      <div>
                        <strong>Emotions:</strong> {selectedMemory.aiAnalysis.emotions.join(', ')}
                      </div>
                      <div className="col-span-2">
                        <strong>Objects:</strong> {selectedMemory.aiAnalysis.objects.join(', ')}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ConnectedMemoriesGallery;
