import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiService, queryKeys, Memory } from '@/lib/api';
import { MemoryUpload } from '@/components/MemoryUpload';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Search, 
  Calendar, 
  MapPin, 
  Users, 
  Sparkles, 
  Brain,
  Heart,
  Clock,
  Loader2 
} from 'lucide-react';
import { toast } from 'sonner';

export default function MemoriesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showUpload, setShowUpload] = useState(false);

  // Fetch memories
  const { data: memories = [], isLoading, error } = useQuery({
    queryKey: queryKeys.memories(),
    queryFn: () => apiService.getMemories(),
  });

  // Fetch memory suggestions
  const { data: suggestions } = useQuery({
    queryKey: queryKeys.memorySuggestions(),
    queryFn: () => apiService.getMemorySuggestions(),
  });

  // Filter memories based on search
  const filteredMemories = memories.filter(memory =>
    memory.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    memory.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    memory.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleUploadComplete = (memoryId: string) => {
    setShowUpload(false);
    toast.success('Memory saved! Check the timeline to see AI analysis results.');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
        <div className="container mx-auto">
          <Card className="max-w-md mx-auto">
            <CardContent className="p-6 text-center">
              <h2 className="text-lg font-semibold text-red-600 mb-2">Connection Error</h2>
              <p className="text-muted-foreground">
                Unable to connect to the memory service. Please make sure the API server is running.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-40">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Family Memories
              </h1>
              <p className="text-muted-foreground mt-1">
                AI-powered family memory management and timeline
              </p>
            </div>
            
            <Button 
              onClick={() => setShowUpload(!showUpload)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Memory
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {showUpload && (
          <div className="mb-8">
            <MemoryUpload onUploadComplete={handleUploadComplete} />
          </div>
        )}

        <Tabs defaultValue="timeline" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="timeline" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Timeline
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              AI Suggestions
            </TabsTrigger>
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Search
            </TabsTrigger>
          </TabsList>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="mt-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading memories...</span>
              </div>
            ) : memories.length === 0 ? (
              <Card className="py-12">
                <CardContent className="text-center">
                  <Heart className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No memories yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start building your family's digital memory collection
                  </p>
                  <Button onClick={() => setShowUpload(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Memory
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {memories.map((memory) => (
                  <MemoryCard key={memory.id} memory={memory} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* AI Suggestions Tab */}
          <TabsContent value="suggestions" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* On This Day */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    On This Day
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {suggestions?.onThisDay?.length ? (
                    <div className="space-y-4">
                      {suggestions.onThisDay.map((memory) => (
                        <div key={memory.id} className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium">{memory.title}</p>
                            <p className="text-sm text-muted-foreground">{formatDate(memory.date)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No memories from this day in previous years</p>
                  )}
                </CardContent>
              </Card>

              {/* AI Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    AI Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {suggestions?.recommendations?.length ? (
                    <div className="space-y-3">
                      {suggestions.recommendations.map((recommendation, index) => (
                        <div key={index} className="p-3 bg-purple-50 rounded-lg">
                          <p className="text-sm">{recommendation}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Upload more memories to get AI recommendations</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Search Tab */}
          <TabsContent value="search" className="mt-6">
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search memories, locations, people, or tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {filteredMemories.length === 0 && searchQuery ? (
              <Card className="py-8">
                <CardContent className="text-center">
                  <p className="text-muted-foreground">No memories found matching "{searchQuery}"</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {(searchQuery ? filteredMemories : memories).map((memory) => (
                  <MemoryCard key={memory.id} memory={memory} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Memory Card Component
const MemoryCard: React.FC<{ memory: Memory }> = ({ memory }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="md:flex">
        {memory.imageUrl && (
          <div className="md:w-48 h-48 md:h-auto bg-gray-100">
            <img
              src={memory.imageUrl}
              alt={memory.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}
        
        <div className="flex-1 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xl font-semibold mb-2">{memory.title}</h3>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDate(memory.date)}
                </div>
                {memory.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {memory.location}
                  </div>
                )}
              </div>
            </div>
            
            {memory.aiAnalysis && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Brain className="h-3 w-3" />
                AI Analyzed
              </Badge>
            )}
          </div>

          {memory.description && (
            <p className="text-muted-foreground mb-4">{memory.description}</p>
          )}

          {/* AI Analysis Results */}
          {memory.aiAnalysis && (
            <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
              <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                AI Analysis
              </h4>
              <div className="text-sm space-y-1">
                {memory.aiAnalysis.facesDetected > 0 && (
                  <p>👥 {memory.aiAnalysis.facesDetected} people detected</p>
                )}
                {memory.aiAnalysis.emotions?.length > 0 && (
                  <p>😊 Emotions: {memory.aiAnalysis.emotions.join(', ')}</p>
                )}
                {memory.aiAnalysis.objects?.length > 0 && (
                  <p>🔍 Objects: {memory.aiAnalysis.objects.slice(0, 3).join(', ')}</p>
                )}
                {memory.aiAnalysis.text && (
                  <p>📝 Text found: "{memory.aiAnalysis.text.slice(0, 100)}..."</p>
                )}
              </div>
            </div>
          )}

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {memory.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {memory.familyMembers.length > 0 && (
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                <Users className="h-3 w-3" />
                {memory.familyMembers.length} family member{memory.familyMembers.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}; 