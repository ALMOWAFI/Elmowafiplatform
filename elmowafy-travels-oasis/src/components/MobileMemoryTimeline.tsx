import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Camera, 
  Heart, 
  MessageCircle, 
  Share2, 
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Users,
  Sparkles,
  Search,
  Plus,
  Bell,
  X
} from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Input } from './ui/input';
import { useSocket } from '../hooks/useSocket';
import { memoryService, Memory } from '../services/memoryService';

interface MobileMemoryTimelineProps {
  className?: string;
}

export const MobileMemoryTimeline: React.FC<MobileMemoryTimelineProps> = ({ className = '' }) => {
  // State management
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Touch and gesture state
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Socket for real-time updates
  const { socket, isConnected, notifications, clearNotifications } = useSocket();

  // Fetch memories
  const fetchMemories = useCallback(async () => {
    try {
      setLoading(true);
      const response = await memoryService.getTimeline({ limit: 50 });
      setMemories(response.memories);
    } catch (error) {
      console.error('Error fetching memories:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  // Real-time updates
  useEffect(() => {
    const handleMemoryUpdate = () => {
      fetchMemories();
    };

    window.addEventListener('memory:like_update', handleMemoryUpdate);
    window.addEventListener('memory:new_comment', handleMemoryUpdate);
    
    return () => {
      window.removeEventListener('memory:like_update', handleMemoryUpdate);
      window.removeEventListener('memory:new_comment', handleMemoryUpdate);
    };
  }, [fetchMemories]);

  // Touch gesture handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart.x - touchEnd.x;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (selectedMemory && selectedMemory.photos.length > 1) {
      if (isLeftSwipe) {
        setCurrentImageIndex(prev => 
          prev < selectedMemory.photos.length - 1 ? prev + 1 : 0
        );
      } else if (isRightSwipe) {
        setCurrentImageIndex(prev => 
          prev > 0 ? prev - 1 : selectedMemory.photos.length - 1
        );
      }
    }
  };

  // Handle memory like with haptic feedback
  const handleLike = async (memoryId: string) => {
    try {
      // Haptic feedback for mobile
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
      
      await memoryService.toggleLike(memoryId);
      fetchMemories();
    } catch (error) {
      console.error('Error liking memory:', error);
    }
  };

  // Format date for mobile display
  const formatMobileDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  // Filter memories based on search
  const filteredMemories = memories.filter(memory =>
    memory.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    memory.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    memory.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading memories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* Mobile Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Camera className="h-6 w-6 text-blue-600" />
            <h1 className="text-lg font-bold text-gray-900">Memories</h1>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <Bell className="h-5 w-5 text-gray-600" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {notifications.length > 9 ? '9+' : notifications.length}
                </span>
              )}
            </button>

            {/* Search Toggle */}
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <Search className="h-5 w-5 text-gray-600" />
            </button>

            {/* Add Memory */}
            <button className="p-2 rounded-full bg-blue-600 text-white">
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Connection Status */}
        <div className="flex items-center justify-center mt-2">
          <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
            isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            {isConnected ? 'Live Updates' : 'Reconnecting...'}
          </div>
        </div>

        {/* Search Bar */}
        {showSearch && (
          <div className="mt-3">
            <Input
              placeholder="Search memories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
              autoFocus
            />
          </div>
        )}
      </div>

      {/* Notifications Panel */}
      {showNotifications && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50" onClick={() => setShowNotifications(false)}>
          <div className="absolute top-0 right-0 w-80 max-w-[90vw] h-full bg-white overflow-y-auto">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Notifications</h2>
                <button onClick={() => setShowNotifications(false)}>
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>
            
            <div className="p-4 space-y-3">
              {notifications.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No new notifications</p>
              ) : (
                notifications.map((notification) => (
                  <div key={notification.id} className="p-3 bg-gray-50 rounded-lg">
                    <h3 className="font-medium text-sm">{notification.title}</h3>
                    <p className="text-gray-600 text-xs mt-1">{notification.message}</p>
                    <p className="text-gray-400 text-xs mt-2">
                      {formatMobileDate(notification.timestamp.toISOString())}
                    </p>
                  </div>
                ))
              )}
              
              {notifications.length > 0 && (
                <button
                  onClick={clearNotifications}
                  className="w-full py-2 text-blue-600 text-sm font-medium"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Memory Timeline */}
      <div 
        ref={scrollRef}
        className="p-4 space-y-4 pb-20"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {filteredMemories.map((memory) => (
          <Card 
            key={memory._id} 
            className="overflow-hidden shadow-sm border-0 bg-white"
            onClick={() => setSelectedMemory(memory)}
          >
            <CardContent className="p-0">
              {/* Memory Header */}
              <div className="p-4 pb-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={memory.createdBy.profilePicture} />
                      <AvatarFallback className="text-xs">
                        {memory.createdBy.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{memory.createdBy.name}</p>
                      <p className="text-xs text-gray-500">{formatMobileDate(memory.date)}</p>
                    </div>
                  </div>
                  
                  <Button variant="ghost" size="sm" className="p-1">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>

                <h3 className="font-semibold text-base mb-1">{memory.title}</h3>
                {memory.description && (
                  <p className="text-gray-600 text-sm line-clamp-2 mb-2">
                    {memory.description}
                  </p>
                )}
              </div>

              {/* Photo Carousel */}
              <div className="relative">
                <img
                  src={memory.photos[0]?.url}
                  alt={memory.title}
                  className="w-full h-64 object-cover"
                  style={{ aspectRatio: '16/9' }}
                />
                
                {memory.photos.length > 1 && (
                  <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded-full">
                    1/{memory.photos.length}
                  </div>
                )}

                {memory.importance > 7 && (
                  <div className="absolute top-2 left-2 bg-amber-500 text-white p-1 rounded-full">
                    <Sparkles className="h-3 w-3" />
                  </div>
                )}
              </div>

              {/* Memory Info */}
              <div className="p-4 pt-2">
                {/* AI Analysis */}
                {memory.aiAnalysis && (
                  <div className="mb-2 p-2 bg-purple-50 rounded-lg">
                    <p className="text-xs text-purple-700 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      {memory.aiAnalysis.sceneAnalysis}
                    </p>
                  </div>
                )}

                {/* Family Members */}
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-gray-500" />
                  <div className="flex -space-x-1">
                    {memory.familyMembers.slice(0, 3).map((fm) => (
                      <Avatar key={fm.member._id} className="h-5 w-5 border border-white">
                        <AvatarImage src={fm.member.profilePicture} />
                        <AvatarFallback className="text-xs">
                          {fm.member.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  <span className="text-xs text-gray-600">
                    {memory.familyMembers[0]?.member.name}
                    {memory.familyMembers.length > 1 && ` +${memory.familyMembers.length - 1}`}
                  </span>
                </div>

                {/* Location */}
                {memory.location && (
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                    <MapPin className="h-3 w-3" />
                    {memory.location.name}
                  </div>
                )}

                {/* Tags */}
                {memory.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {memory.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs px-2 py-0">
                        {tag}
                      </Badge>
                    ))}
                    {memory.tags.length > 3 && (
                      <Badge variant="secondary" className="text-xs px-2 py-0">
                        +{memory.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLike(memory._id);
                      }}
                      className="flex items-center gap-1 text-gray-600 active:text-red-600 transition-colors"
                    >
                      <Heart className="h-4 w-4" />
                      <span className="text-sm">{memory.likeCount}</span>
                    </button>
                    
                    <button className="flex items-center gap-1 text-gray-600">
                      <MessageCircle className="h-4 w-4" />
                      <span className="text-sm">{memory.commentCount}</span>
                    </button>
                  </div>
                  
                  <button className="text-gray-600">
                    <Share2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredMemories.length === 0 && !loading && (
          <div className="text-center py-12">
            <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No memories found</h3>
            <p className="text-gray-600 mb-4">
              {searchQuery ? 'Try adjusting your search' : 'Start creating beautiful family memories!'}
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Memory
            </Button>
          </div>
        )}
      </div>

      {/* Memory Detail Modal */}
      {selectedMemory && (
        <div className="fixed inset-0 z-50 bg-black" onClick={() => setSelectedMemory(null)}>
          <div className="relative h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-black bg-opacity-50 text-white">
              <button onClick={() => setSelectedMemory(null)}>
                <ChevronLeft className="h-6 w-6" />
              </button>
              <div className="text-center">
                <p className="font-medium">{selectedMemory.title}</p>
                <p className="text-xs opacity-75">{formatMobileDate(selectedMemory.date)}</p>
              </div>
              <Button variant="ghost" size="sm" className="text-white">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </div>

            {/* Image Carousel */}
            <div className="flex-1 relative flex items-center justify-center">
              <img
                src={selectedMemory.photos[currentImageIndex]?.url}
                alt={selectedMemory.title}
                className="max-w-full max-h-full object-contain"
              />
              
              {selectedMemory.photos.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentImageIndex(prev => 
                      prev > 0 ? prev - 1 : selectedMemory.photos.length - 1
                    )}
                    className="absolute left-4 p-2 rounded-full bg-black bg-opacity-50 text-white"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  
                  <button
                    onClick={() => setCurrentImageIndex(prev => 
                      prev < selectedMemory.photos.length - 1 ? prev + 1 : 0
                    )}
                    className="absolute right-4 p-2 rounded-full bg-black bg-opacity-50 text-white"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded-full">
                    {currentImageIndex + 1} / {selectedMemory.photos.length}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};