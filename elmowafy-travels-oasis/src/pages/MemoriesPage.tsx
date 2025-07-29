import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Camera, Search, Filter, Calendar, MapPin, Users, Tag,
  Heart, Share2, Download, Trash2, Edit, Plus, Grid,
  List, Clock, Upload, Image, Video, FileText,
  ArrowLeft, Star, Eye, MessageCircle
} from 'lucide-react';
import PhotoUpload from '@/components/PhotoUpload';
import { authService, memoryService } from '@/services/api';

interface Memory {
  id: string;
  title: string;
  description?: string;
  date: string;
  type: 'photo' | 'video' | 'note';
  thumbnail?: string;
  tags: string[];
  location?: string;
  participants: string[];
  likes: number;
  isLiked: boolean;
  createdBy: string;
  fileUrl?: string;
}

interface FilterOptions {
  type: 'all' | 'photo' | 'video' | 'note';
  dateRange: 'all' | 'today' | 'week' | 'month' | 'year';
  tags: string[];
  participants: string[];
}

export const MemoriesPage: React.FC = () => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [filteredMemories, setFilteredMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'grid' | 'list' | 'timeline'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<FilterOptions>({
    type: 'all',
    dateRange: 'all',
    tags: [],
    participants: []
  });
  const [showUpload, setShowUpload] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadMemories();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [memories, searchTerm, filters]);

  const loadMemories = async () => {
    setLoading(true);
    try {
      const data = await memoryService.getMemories();
      const memoriesWithDefaults = data.map((memory: any, index: number) => ({
        id: memory.id || `memory-${index}`,
        title: memory.title || `Memory ${index + 1}`,
        description: memory.description || '',
        date: memory.date || new Date().toISOString(),
        type: memory.type || 'photo',
        thumbnail: memory.thumbnail,
        tags: memory.tags || ['family'],
        location: memory.location || '',
        participants: memory.participants || [],
        likes: memory.likes || Math.floor(Math.random() * 20),
        isLiked: memory.isLiked || false,
        createdBy: memory.createdBy || 'Family Member',
        fileUrl: memory.fileUrl
      }));
      setMemories(memoriesWithDefaults);
    } catch (error) {
      console.error('Failed to load memories:', error);
      // Demo data for development
      setMemories([
        {
          id: '1',
          title: 'Family Vacation in Dubai',
          description: 'Amazing trip to Burj Khalifa',
          date: '2024-01-15T10:00:00Z',
          type: 'photo',
          tags: ['vacation', 'dubai', 'family'],
          location: 'Dubai, UAE',
          participants: ['Dad', 'Mom', 'Sarah'],
          likes: 15,
          isLiked: true,
          createdBy: 'Dad'
        },
        {
          id: '2',
          title: 'Birthday Celebration',
          description: 'Sarah\'s 18th birthday party',
          date: '2024-02-20T18:00:00Z',
          type: 'video',
          tags: ['birthday', 'celebration', 'family'],
          location: 'Home',
          participants: ['Everyone'],
          likes: 12,
          isLiked: false,
          createdBy: 'Mom'
        },
        {
          id: '3',
          title: 'Family Recipe Collection',
          description: 'Traditional recipes passed down through generations',
          date: '2024-03-10T14:00:00Z',
          type: 'note',
          tags: ['recipes', 'tradition', 'culture'],
          location: 'Kitchen',
          participants: ['Mom', 'Grandma'],
          likes: 8,
          isLiked: true,
          createdBy: 'Mom'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...memories];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(memory =>
        memory.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        memory.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        memory.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Type filter
    if (filters.type !== 'all') {
      filtered = filtered.filter(memory => memory.type === filters.type);
    }

    // Date filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (filters.dateRange) {
        case 'today':
          filterDate.setDate(now.getDate() - 1);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          filterDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      filtered = filtered.filter(memory => new Date(memory.date) >= filterDate);
    }

    // Tag filter
    if (filters.tags.length > 0) {
      filtered = filtered.filter(memory =>
        filters.tags.some(tag => memory.tags.includes(tag))
      );
    }

    setFilteredMemories(filtered);
  };

  const handleLike = async (memoryId: string) => {
    try {
      // Optimistically update UI
      setMemories(prev => prev.map(memory => 
        memory.id === memoryId 
          ? { 
              ...memory, 
              isLiked: !memory.isLiked,
              likes: memory.isLiked ? memory.likes - 1 : memory.likes + 1
            }
          : memory
      ));
      
      // TODO: Call API to update like status
      console.log('Liked memory:', memoryId);
    } catch (error) {
      console.error('Failed to like memory:', error);
    }
  };

  const handleUploadComplete = () => {
    setShowUpload(false);
    loadMemories();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'photo': return <Image className="h-4 w-4" />;
      case 'video': return <Video className="h-4 w-4" />;
      case 'note': return <FileText className="h-4 w-4" />;
      default: return <Camera className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'photo': return 'bg-blue-100 text-blue-800';
      case 'video': return 'bg-purple-100 text-purple-800';
      case 'note': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          <p className="text-lg font-medium text-gray-600">Loading your precious memories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Family Memories
              </h1>
              <Badge variant="secondary">
                {filteredMemories.length} memories
              </Badge>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* View Toggle */}
              <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                <Button
                  variant={view === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setView('grid')}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={view === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setView('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
            <Button 
                  variant={view === 'timeline' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setView('timeline')}
                >
                  <Clock className="h-4 w-4" />
                </Button>
              </div>
              
              <Button onClick={() => setShowUpload(true)}>
                <Plus className="h-4 w-4 mr-2" />
              Add Memory
            </Button>
          </div>
        </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search memories, tags, or descriptions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
      </div>

            {/* Quick Filters */}
            <div className="flex space-x-2">
              <Button
                variant={filters.type === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilters(prev => ({ ...prev, type: 'all' }))}
              >
                All
              </Button>
              <Button
                variant={filters.type === 'photo' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilters(prev => ({ ...prev, type: 'photo' }))}
              >
                <Image className="h-4 w-4 mr-1" />
                Photos
              </Button>
              <Button
                variant={filters.type === 'video' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilters(prev => ({ ...prev, type: 'video' }))}
              >
                <Video className="h-4 w-4 mr-1" />
                Videos
              </Button>
              <Button
                variant={filters.type === 'note' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilters(prev => ({ ...prev, type: 'note' }))}
              >
                <FileText className="h-4 w-4 mr-1" />
                Notes
              </Button>
            </div>
          </div>

          {/* Popular Tags */}
          <div className="flex flex-wrap gap-2">
            <span className="text-sm font-medium text-gray-600">Popular tags:</span>
            {['family', 'vacation', 'birthday', 'celebration', 'tradition'].map(tag => (
              <Button
                key={tag}
                variant={filters.tags.includes(tag) ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setFilters(prev => ({
                    ...prev,
                    tags: prev.tags.includes(tag)
                      ? prev.tags.filter(t => t !== tag)
                      : [...prev.tags, tag]
                  }));
                }}
              >
                <Tag className="h-3 w-3 mr-1" />
                {tag}
              </Button>
            ))}
          </div>
        </div>

        {/* Upload Modal */}
        {showUpload && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Add New Memory</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowUpload(false)}>
                  ×
                </Button>
              </div>
              <PhotoUpload onUploadComplete={handleUploadComplete} />
            </div>
          </div>
        )}

        {/* Memories Display */}
        {view === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredMemories.map((memory) => (
              <Card key={memory.id} className="group hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-0">
                  {/* Thumbnail */}
                  <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 rounded-t-lg flex items-center justify-center relative overflow-hidden">
                    {memory.thumbnail ? (
                      <img src={memory.thumbnail} alt={memory.title} className="w-full h-full object-cover" />
                    ) : (
                      getTypeIcon(memory.type)
                    )}
                    <div className="absolute top-2 left-2">
                      <Badge className={`${getTypeColor(memory.type)} text-xs`}>
                        {memory.type}
                      </Badge>
                    </div>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="secondary" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-2 line-clamp-1">{memory.title}</h3>
                    {memory.description && (
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">{memory.description}</p>
                    )}
                    
                    {/* Meta info */}
                    <div className="space-y-2">
                      <div className="flex items-center text-xs text-gray-500">
                        <Calendar className="h-3 w-3 mr-1" />
                        {new Date(memory.date).toLocaleDateString()}
                      </div>
                      
                      {memory.location && (
                        <div className="flex items-center text-xs text-gray-500">
                          <MapPin className="h-3 w-3 mr-1" />
                          {memory.location}
                        </div>
                      )}
                      
                      {memory.participants.length > 0 && (
                        <div className="flex items-center text-xs text-gray-500">
                          <Users className="h-3 w-3 mr-1" />
                          {memory.participants.slice(0, 2).join(', ')}
                          {memory.participants.length > 2 && ` +${memory.participants.length - 2}`}
                        </div>
                      )}
                    </div>
                    
                    {/* Tags */}
                    <div className="flex flex-wrap gap-1 mt-3">
                      {memory.tags.slice(0, 3).map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {memory.tags.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{memory.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleLike(memory.id)}
                          className={memory.isLiked ? 'text-red-500' : ''}
                        >
                          <Heart className={`h-4 w-4 mr-1 ${memory.isLiked ? 'fill-current' : ''}`} />
                          {memory.likes}
                        </Button>
                        <Button variant="ghost" size="sm">
                          <MessageCircle className="h-4 w-4 mr-1" />
                          0
                        </Button>
              </div>
                      
                      <div className="flex items-center space-x-1">
                        <Button variant="ghost" size="sm">
                          <Share2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                  </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
                ))}
              </div>
            )}

        {view === 'list' && (
                    <div className="space-y-4">
            {filteredMemories.map((memory) => (
              <Card key={memory.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    {/* Thumbnail */}
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      {memory.thumbnail ? (
                        <img src={memory.thumbnail} alt={memory.title} className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        getTypeIcon(memory.type)
                      )}
                    </div>
                    
                    {/* Content */}
                          <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg mb-1">{memory.title}</h3>
                          {memory.description && (
                            <p className="text-gray-600 mb-2">{memory.description}</p>
                          )}
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-500 mb-2">
                            <span className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              {new Date(memory.date).toLocaleDateString()}
                            </span>
                            {memory.location && (
                              <span className="flex items-center">
                                <MapPin className="h-4 w-4 mr-1" />
                                {memory.location}
                              </span>
                            )}
                            <Badge className={`${getTypeColor(memory.type)} text-xs`}>
                              {memory.type}
                            </Badge>
                          </div>
                          
                          <div className="flex flex-wrap gap-1">
                            {memory.tags.map(tag => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleLike(memory.id)}
                            className={memory.isLiked ? 'text-red-500' : ''}
                          >
                            <Heart className={`h-4 w-4 mr-1 ${memory.isLiked ? 'fill-current' : ''}`} />
                            {memory.likes}
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Share2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {view === 'timeline' && (
          <div className="space-y-8">
            {/* Group memories by month */}
            {Object.entries(
              filteredMemories.reduce((groups, memory) => {
                const monthYear = new Date(memory.date).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long' 
                });
                if (!groups[monthYear]) groups[monthYear] = [];
                groups[monthYear].push(memory);
                return groups;
              }, {} as Record<string, Memory[]>)
            ).map(([monthYear, monthMemories]) => (
              <div key={monthYear}>
                <h2 className="text-2xl font-bold text-gray-900 mb-6 sticky top-24 bg-gradient-to-r from-blue-50 to-purple-50 py-2 rounded-lg px-4">
                  {monthYear}
                </h2>
                <div className="space-y-6">
                  {monthMemories.map((memory, index) => (
                    <div key={memory.id} className="flex items-start space-x-4">
                      {/* Timeline dot */}
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                        {index < monthMemories.length - 1 && (
                          <div className="w-0.5 h-16 bg-purple-200 mt-2"></div>
                        )}
            </div>
                      
                      {/* Memory card */}
                      <Card className="flex-1 hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start space-x-4">
                            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              {getTypeIcon(memory.type)}
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold mb-1">{memory.title}</h3>
                              {memory.description && (
                                <p className="text-gray-600 text-sm mb-2">{memory.description}</p>
                              )}
                              <div className="flex items-center space-x-4 text-xs text-gray-500">
                                <span>{new Date(memory.date).toLocaleDateString()}</span>
                                {memory.location && <span>{memory.location}</span>}
                                <Badge className={`${getTypeColor(memory.type)} text-xs`}>
                                  {memory.type}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleLike(memory.id)}
                                className={memory.isLiked ? 'text-red-500' : ''}
                              >
                                <Heart className={`h-4 w-4 ${memory.isLiked ? 'fill-current' : ''}`} />
                              </Button>
              </div>
            </div>
                </CardContent>
              </Card>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {filteredMemories.length === 0 && (
          <div className="text-center py-12">
            <Camera className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No memories found</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || filters.type !== 'all' || filters.tags.length > 0
                ? 'Try adjusting your search or filters'
                : 'Start creating beautiful family memories!'}
            </p>
            <Button onClick={() => setShowUpload(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Memory
            </Button>
              </div>
            )}
      </div>
    </div>
  );
};

export default MemoriesPage;