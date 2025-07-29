import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  Heart, 
  MessageCircle, 
  Users, 
  MapPin, 
  Tag,
  Filter,
  Search,
  ChevronDown,
  Image,
  Sparkles,
  ArrowUp
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { api } from '../lib/api';

interface Memory {
  _id: string;
  title: string;
  description?: string;
  photos: Array<{
    filename: string;
    url: string;
    originalName: string;
  }>;
  date: string;
  familyMembers: Array<{
    member: {
      _id: string;
      name: string;
      arabicName?: string;
      profilePicture?: string;
    };
    role: 'primary' | 'secondary' | 'mentioned';
  }>;
  tags: string[];
  category: string;
  location?: {
    name: string;
    city?: string;
    country?: string;
  };
  likeCount: number;
  commentCount: number;
  importance: number;
  createdBy: {
    name: string;
  };
  aiAnalysis?: {
    sceneAnalysis: string;
    suggestedTags: string[];
    emotions: string[];
  };
}

interface TimelineGroupedMemories {
  [dateKey: string]: Memory[];
}

export const InteractiveMemoryTimeline: React.FC = () => {
  // State management
  const [memories, setMemories] = useState<Memory[]>([]);
  const [filteredMemories, setFilteredMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedFamilyMember, setSelectedFamilyMember] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Fetch memories from API
  const fetchMemories = async (page = 1, append = false) => {
    try {
      setLoading(true);
      const response = await api.get(`/api/v1/memories/timeline?limit=20&skip=${(page - 1) * 20}`);
      
      const newMemories = response.data.data.memories;
      
      if (append) {
        setMemories(prev => [...prev, ...newMemories]);
      } else {
        setMemories(newMemories);
      }
      
      setHasMore(response.data.data.pagination.hasMore);
      setError(null);
    } catch (err) {
      setError('Failed to load memories. Please try again.');
      console.error('Error fetching memories:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load more memories
  const loadMore = () => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    fetchMemories(nextPage, true);
  };

  // Initial load
  useEffect(() => {
    fetchMemories();
  }, []);

  // Filter memories based on search and filters
  const applyFilters = useMemo(() => {
    let filtered = memories;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(memory => 
        memory.title.toLowerCase().includes(query) ||
        memory.description?.toLowerCase().includes(query) ||
        memory.tags.some(tag => tag.toLowerCase().includes(query)) ||
        memory.familyMembers.some(fm => 
          fm.member.name.toLowerCase().includes(query) ||
          fm.member.arabicName?.toLowerCase().includes(query)
        )
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(memory => memory.category === selectedCategory);
    }

    // Family member filter
    if (selectedFamilyMember !== 'all') {
      filtered = filtered.filter(memory => 
        memory.familyMembers.some(fm => fm.member._id === selectedFamilyMember)
      );
    }

    return filtered;
  }, [memories, searchQuery, selectedCategory, selectedFamilyMember]);

  // Group memories by date for timeline visualization
  const groupedMemories: TimelineGroupedMemories = useMemo(() => {
    return applyFilters.reduce((acc, memory) => {
      const dateKey = new Date(memory.date).toISOString().split('T')[0];
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(memory);
      return acc;
    }, {} as TimelineGroupedMemories);
  }, [applyFilters]);

  // Get unique categories and family members for filters
  const filterOptions = useMemo(() => {
    const categories = new Set(memories.map(m => m.category));
    const familyMembers = new Set();
    
    memories.forEach(memory => {
      memory.familyMembers.forEach(fm => {
        familyMembers.add(JSON.stringify({
          id: fm.member._id,
          name: fm.member.name,
          arabicName: fm.member.arabicName
        }));
      });
    });

    return {
      categories: Array.from(categories),
      familyMembers: Array.from(familyMembers).map(fm => JSON.parse(fm as string))
    };
  }, [memories]);

  // Handle memory interaction (like, comment)
  const handleLike = async (memoryId: string) => {
    try {
      await api.post(`/api/v1/memories/${memoryId}/like`);
      // Refresh memories to get updated like count
      fetchMemories();
    } catch (err) {
      console.error('Error liking memory:', err);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      day: date.getDate(),
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      year: date.getFullYear(),
      weekday: date.toLocaleDateString('en-US', { weekday: 'long' })
    };
  };

  if (loading && memories.length === 0) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your family memories...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            Family Memory Timeline
          </CardTitle>
          <CardDescription>
            Explore your family's precious memories organized by time with AI insights
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search memories, people, or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Filter Toggle */}
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
              <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </Button>
          </div>

          {/* Filter Controls */}
          {showFilters && (
            <div className="flex flex-col sm:flex-row gap-4 p-4 bg-gray-50 rounded-lg">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {filterOptions.categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedFamilyMember} onValueChange={setSelectedFamilyMember}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Family Member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Family Members</SelectItem>
                  {filterOptions.familyMembers.map(member => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name} {member.arabicName && `(${member.arabicName})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timeline */}
      <div className="space-y-8">
        {Object.entries(groupedMemories)
          .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
          .map(([dateKey, dayMemories]) => {
            const dateInfo = formatDate(dateKey);
            
            return (
              <div key={dateKey} className="relative">
                {/* Date Header */}
                <div className="flex items-center mb-6">
                  <div className="bg-blue-600 text-white rounded-full px-4 py-2 text-sm font-medium">
                    {dateInfo.month} {dateInfo.day}, {dateInfo.year}
                  </div>
                  <div className="ml-4 text-gray-500 text-sm">
                    {dateInfo.weekday} • {dayMemories.length} {dayMemories.length === 1 ? 'memory' : 'memories'}
                  </div>
                  <div className="flex-1 h-px bg-gray-200 ml-4" />
                </div>

                {/* Memories for this date */}
                <div className="space-y-6 ml-8">
                  {dayMemories.map((memory) => (
                    <Card key={memory._id} className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex gap-4">
                          {/* Photo thumbnail */}
                          <div className="relative flex-shrink-0">
                            {memory.photos[0] && (
                              <img
                                src={memory.photos[0].url}
                                alt={memory.title}
                                className="w-24 h-24 object-cover rounded-lg"
                              />
                            )}
                            {memory.photos.length > 1 && (
                              <Badge className="absolute -top-2 -right-2 bg-blue-600">
                                +{memory.photos.length - 1}
                              </Badge>
                            )}
                          </div>

                          {/* Memory content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="font-semibold text-lg text-gray-900 truncate">
                                {memory.title}
                              </h3>
                              <div className="flex items-center gap-1 text-amber-500">
                                <Sparkles className="h-4 w-4" />
                                <span className="text-sm">{memory.importance}/10</span>
                              </div>
                            </div>

                            {memory.description && (
                              <p className="text-gray-600 mb-3 line-clamp-2">
                                {memory.description}
                              </p>
                            )}

                            {/* AI Analysis */}
                            {memory.aiAnalysis && (
                              <div className="mb-3 p-2 bg-purple-50 rounded-lg">
                                <p className="text-sm text-purple-700 flex items-center gap-1">
                                  <Sparkles className="h-3 w-3" />
                                  AI Insight: {memory.aiAnalysis.sceneAnalysis}
                                </p>
                              </div>
                            )}

                            {/* Family members */}
                            <div className="flex items-center gap-2 mb-3">
                              <Users className="h-4 w-4 text-gray-500" />
                              <div className="flex -space-x-2">
                                {memory.familyMembers.slice(0, 3).map((fm) => (
                                  <Avatar key={fm.member._id} className="h-6 w-6 border-2 border-white">
                                    <AvatarImage src={fm.member.profilePicture} />
                                    <AvatarFallback className="text-xs">
                                      {fm.member.name.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                ))}
                                {memory.familyMembers.length > 3 && (
                                  <div className="h-6 w-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs">
                                    +{memory.familyMembers.length - 3}
                                  </div>
                                )}
                              </div>
                              <span className="text-sm text-gray-600">
                                {memory.familyMembers[0]?.member.name}
                                {memory.familyMembers.length > 1 && ` and ${memory.familyMembers.length - 1} others`}
                              </span>
                            </div>

                            {/* Location */}
                            {memory.location && (
                              <div className="flex items-center gap-1 text-sm text-gray-500 mb-3">
                                <MapPin className="h-4 w-4" />
                                {memory.location.name}
                                {memory.location.city && `, ${memory.location.city}`}
                              </div>
                            )}

                            {/* Tags */}
                            {memory.tags.length > 0 && (
                              <div className="flex items-center gap-2 mb-4">
                                <Tag className="h-4 w-4 text-gray-500" />
                                <div className="flex flex-wrap gap-1">
                                  {memory.tags.slice(0, 4).map((tag) => (
                                    <Badge key={tag} variant="secondary" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                  {memory.tags.length > 4 && (
                                    <Badge variant="secondary" className="text-xs">
                                      +{memory.tags.length - 4}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Actions */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleLike(memory._id)}
                                  className="flex items-center gap-1 text-gray-600 hover:text-red-600"
                                >
                                  <Heart className="h-4 w-4" />
                                  {memory.likeCount}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="flex items-center gap-1 text-gray-600"
                                >
                                  <MessageCircle className="h-4 w-4" />
                                  {memory.commentCount}
                                </Button>
                              </div>
                              
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <Clock className="h-3 w-3" />
                                Added by {memory.createdBy.name}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
      </div>

      {/* Load More Button */}
      {hasMore && !loading && (
        <div className="text-center">
          <Button onClick={loadMore} variant="outline" size="lg">
            Load More Memories
            <ArrowUp className="h-4 w-4 ml-2 rotate-180" />
          </Button>
        </div>
      )}

      {/* Loading indicator */}
      {loading && memories.length > 0 && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
        </div>
      )}

      {/* Error message */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* No memories message */}
      {!loading && memories.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Image className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No memories yet</h3>
            <p className="text-gray-600 mb-4">
              Start creating beautiful family memories by uploading your first photo!
            </p>
            <Button>Upload First Memory</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};