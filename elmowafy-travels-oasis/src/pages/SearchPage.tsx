import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, Filter, MapPin, Calendar, Camera, Users, Plane, 
  Star, BookOpen, Clock, Tag, Heart, MessageCircle, Trophy,
  FileText, Image, Video, Music, Download, Share, Eye
} from 'lucide-react';

interface SearchResult {
  id: string;
  type: 'memory' | 'event' | 'person' | 'travel' | 'achievement' | 'note' | 'photo' | 'document';
  title: string;
  description: string;
  date?: string;
  location?: string;
  tags: string[];
  thumbnail?: string;
  relevanceScore: number;
  metadata?: any;
}

const SearchPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'type'>('relevance');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  useEffect(() => {
    // Load search history from localStorage
    const history = localStorage.getItem('searchHistory');
    if (history) {
      setSearchHistory(JSON.parse(history));
    }
  }, []);

  useEffect(() => {
    if (searchTerm.trim()) {
      performSearch(searchTerm);
    } else {
      setResults([]);
    }
  }, [searchTerm, activeTab, sortBy]);

  const performSearch = async (term: string) => {
    setLoading(true);
    try {
      // Build params for backend search
      const params: any = { query: term, limit: 50 };
      // Optionally filter by type if not 'all'
      if (activeTab !== 'all') params.category = activeTab;
      const response = await searchService.search(params);
      // API returns { status, results, data: { memories } }
      let items = [];
      if (response && response.data && Array.isArray(response.data.memories)) {
        items = response.data.memories;
      } else if (Array.isArray(response.data)) {
        items = response.data;
      }
      // Optionally sort client-side if needed
      items.sort((a, b) => {
        switch (sortBy) {
          case 'date':
            return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
          case 'type':
            return (a.type || '').localeCompare(b.type || '');
          default:
            return (b.relevanceScore || 0) - (a.relevanceScore || 0);
        }
      });
      setResults(items);
    } catch (error) {
      setResults([]);
      // Optionally show error to user
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToSearchHistory = (term: string) => {
    if (term.trim() && !searchHistory.includes(term)) {
      const newHistory = [term, ...searchHistory.slice(0, 9)]; // Keep only 10 items
      setSearchHistory(newHistory);
      localStorage.setItem('searchHistory', JSON.stringify(newHistory));
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    addToSearchHistory(term);
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'memory': return <Camera className="h-4 w-4" />;
      case 'event': return <Calendar className="h-4 w-4" />;
      case 'person': return <Users className="h-4 w-4" />;
      case 'travel': return <Plane className="h-4 w-4" />;
      case 'achievement': return <Trophy className="h-4 w-4" />;
      case 'photo': return <Image className="h-4 w-4" />;
      case 'note': return <FileText className="h-4 w-4" />;
      case 'document': return <BookOpen className="h-4 w-4" />;
      default: return <Search className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'memory': return 'bg-blue-100 text-blue-800';
      case 'event': return 'bg-green-100 text-green-800';
      case 'person': return 'bg-purple-100 text-purple-800';
      case 'travel': return 'bg-orange-100 text-orange-800';
      case 'achievement': return 'bg-yellow-100 text-yellow-800';
      case 'photo': return 'bg-pink-100 text-pink-800';
      case 'note': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const popularSearches = [
    'family trips', 'birthdays', 'photos', 'egypt', 'achievements', 
    'recipes', 'memories', 'travel plans', 'celebrations'
  ];

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Search Family Platform</h1>
        
        {/* Search Input */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <Input
            placeholder="Search memories, events, people, photos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch(searchTerm)}
            className="pl-12 pr-4 py-3 text-lg"
          />
          {searchTerm && (
            <Button
              onClick={() => handleSearch(searchTerm)}
              className="absolute right-2 top-1/2 transform -translate-y-1/2"
              size="sm"
            >
              Search
            </Button>
          )}
        </div>

        {/* Search Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
            <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="memory">Memories</TabsTrigger>
              <TabsTrigger value="event">Events</TabsTrigger>
              <TabsTrigger value="person">People</TabsTrigger>
              <TabsTrigger value="travel">Travel</TabsTrigger>
              <TabsTrigger value="photo">Photos</TabsTrigger>
              <TabsTrigger value="achievement">Awards</TabsTrigger>
              <TabsTrigger value="note">Notes</TabsTrigger>
            </TabsList>
          </Tabs>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="relevance">Sort by Relevance</option>
            <option value="date">Sort by Date</option>
            <option value="type">Sort by Type</option>
          </select>
        </div>
      </div>

      {/* Search Results or Welcome Content */}
      {searchTerm ? (
        <div>
          {/* Results Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              {loading ? 'Searching...' : `${results.length} results for "${searchTerm}"`}
            </h2>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="h-4 w-4" />
              {loading ? 'Searching...' : `${results.length > 0 ? '0.3' : '0.1'}s`}
            </div>
          </div>

          {/* Results */}
          <div className="space-y-4">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        <div className="w-24 h-16 bg-gray-200 rounded"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                          <div className="h-3 bg-gray-200 rounded w-full"></div>
                          <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : results.length > 0 ? (
              results.map(result => (
                <Card key={result.id} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {/* Thumbnail */}
                      {result.thumbnail ? (
                        <img 
                          src={result.thumbnail} 
                          alt={result.title}
                          className="w-24 h-16 object-cover rounded"
                        />
                      ) : (
                        <div className="w-24 h-16 bg-gray-100 rounded flex items-center justify-center">
                          {getResultIcon(result.type)}
                        </div>
                      )}

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-lg truncate">{result.title}</h3>
                            <Badge className={getTypeColor(result.type)}>
                              {result.type}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Star className="h-3 w-3 fill-current text-yellow-400" />
                            {result.relevanceScore}%
                          </div>
                        </div>

                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                          {result.description}
                        </p>

                        <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                          {result.date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(result.date).toLocaleDateString()}
                            </span>
                          )}
                          {result.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {result.location}
                            </span>
                          )}
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1">
                          {result.tags.map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              <Tag className="h-2 w-2 mr-1" />
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Share className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">No results found</h3>
                  <p className="text-gray-500 mb-4">
                    Try adjusting your search terms or using different keywords.
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {popularSearches.slice(0, 5).map(term => (
                      <Button
                        key={term}
                        variant="outline"
                        size="sm"
                        onClick={() => handleSearch(term)}
                      >
                        {term}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Search History */}
          {searchHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Recent Searches
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {searchHistory.slice(0, 5).map((term, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      className="w-full justify-start text-left"
                      onClick={() => handleSearch(term)}
                    >
                      <Search className="h-4 w-4 mr-2" />
                      {term}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Popular Searches */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Popular Searches
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {popularSearches.map(term => (
                  <Button
                    key={term}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSearch(term)}
                    className="mb-2"
                  >
                    {term}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Search Tips */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Search Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">Search by content type:</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>• <code>type:memory</code> - Find memories</li>
                    <li>• <code>type:event</code> - Find events</li>
                    <li>• <code>type:photo</code> - Find photos</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Search by date:</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>• <code>date:2024</code> - Find items from 2024</li>
                    <li>• <code>date:january</code> - Find items from January</li>
                    <li>• <code>recent</code> - Find recent items</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Search by location:</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>• <code>location:egypt</code> - Find items in Egypt</li>
                    <li>• <code>location:home</code> - Find items at home</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Use quotes for exact matches:</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>• <code>"family dinner"</code> - Exact phrase</li>
                    <li>• <code>"birthday party"</code> - Exact phrase</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SearchPage; 