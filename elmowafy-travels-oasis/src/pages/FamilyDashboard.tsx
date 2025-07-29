import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Users, Camera, Plane, MapPin, Calendar, Heart, Star, TrendingUp,
  LogOut, Settings, Bell, Search, Plus, Activity, Clock, Award,
  Globe, MessageCircle, UserPlus, Image, Gamepad2, Trophy
} from 'lucide-react';
import PhotoUpload from '@/components/PhotoUpload';
import { AIMemorySuggestions } from '@/components/AIMemorySuggestions';
import { AITravelCompanion } from '@/components/AITravelCompanion';
import { BudgetIntegration } from '@/components/BudgetIntegration';
import apiService, { authService } from '@/services/api';

interface DashboardStats {
  familyMembers: number;
  memories: number;
  travelPlans: number;
  photosUploaded: number;
}

interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  avatar?: string;
  lastActive?: string;
  status: 'online' | 'offline' | 'away';
}

interface Memory {
  id: string;
  title: string;
  date: string;
  type: 'photo' | 'video' | 'note';
  thumbnail?: string;
  tags: string[];
}

interface TravelPlan {
  id: string;
  destination: string;
  dates: string;
  status: 'planning' | 'confirmed' | 'completed';
  participants: string[];
}

export const FamilyDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    familyMembers: 0,
    memories: 0,
    travelPlans: 0,
    photosUploaded: 0
  });
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [recentMemories, setRecentMemories] = useState<Memory[]>([]);
  const [upcomingTravel, setUpcomingTravel] = useState<TravelPlan[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboardData();
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      if (authService.isAuthenticated()) {
        const user = await authService.getCurrentUser();
        setCurrentUser(user);
      } else {
        navigate('/auth');
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
      navigate('/auth');
    }
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load family members
      const members = await apiService.family.getMembers();
      setFamilyMembers(members.map((member: any, index: number) => ({
        id: member.id || `member-${index}`,
        name: member.name || `Family Member ${index + 1}`,
        relationship: member.relationship || 'Family',
        avatar: member.avatar,
        lastActive: member.lastActive || new Date().toISOString(),
        status: ['online', 'offline', 'away'][Math.floor(Math.random() * 3)] as 'online' | 'offline' | 'away'
      })));

      // Load memories
      const memories = await apiService.memory.getMemories();
      setRecentMemories(memories.slice(0, 6).map((memory: any, index: number) => ({
        id: memory.id || `memory-${index}`,
        title: memory.title || `Memory ${index + 1}`,
        date: memory.date || new Date().toISOString(),
        type: memory.type || 'photo',
        thumbnail: memory.thumbnail,
        tags: memory.tags || ['family', 'memories']
      })));

      // Load travel plans
      const travel = await apiService.travel.getPlans();
      setUpcomingTravel(travel.slice(0, 3).map((plan: any, index: number) => ({
        id: plan.id || `travel-${index}`,
        destination: plan.destination || 'Upcoming Trip',
        dates: plan.dates || 'TBD',
        status: plan.status || 'planning',
        participants: plan.participants || []
      })));

      // Update stats
      setStats({
        familyMembers: members.length,
        memories: memories.length,
        travelPlans: travel.length,
        photosUploaded: memories.filter((m: any) => m.type === 'photo').length
      });

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      // Set demo data for offline experience
      setStats({ familyMembers: 4, memories: 12, travelPlans: 2, photosUploaded: 8 });
      setFamilyMembers([
        { id: '1', name: 'Dad', relationship: 'Father', status: 'online', lastActive: new Date().toISOString() },
        { id: '2', name: 'Mom', relationship: 'Mother', status: 'online', lastActive: new Date().toISOString() },
        { id: '3', name: 'Sarah', relationship: 'Sister', status: 'away', lastActive: new Date().toISOString() },
        { id: '4', name: 'Ahmed', relationship: 'Brother', status: 'offline', lastActive: new Date().toISOString() }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/auth');
  };

  const handlePhotoUpload = () => {
    loadDashboardData();
  };

  const getQuickTravelRecommendations = async () => {
    try {
      const recommendations = await apiService.travel.getRecommendations();
      console.log('Travel recommendations:', recommendations);
    } catch (error) {
      console.error('Failed to get travel recommendations:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          <p className="text-lg font-medium text-gray-600">Loading your family dashboard...</p>
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
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Elmowafiplatform
              </h1>
              <Badge variant="secondary" className="hidden sm:inline-flex">
                Family Edition
              </Badge>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" className="hidden sm:inline-flex">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
              <Button variant="outline" size="sm">
                <Bell className="h-4 w-4" />
              </Button>
              
              {currentUser && (
                <div className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={currentUser.avatar} />
                    <AvatarFallback>{currentUser.username?.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-sm font-medium">{currentUser.username}</span>
                </div>
              )}
              
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {currentUser?.username || 'Family Member'}! 👋
          </h2>
          <p className="text-gray-600">Here's what's happening with your family today.</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Family Members</p>
                  <p className="text-3xl font-bold">{stats.familyMembers}</p>
                </div>
                <Users className="h-8 w-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Memories</p>
                  <p className="text-3xl font-bold">{stats.memories}</p>
                </div>
                <Camera className="h-8 w-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-pink-500 to-pink-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-pink-100 text-sm font-medium">Travel Plans</p>
                  <p className="text-3xl font-bold">{stats.travelPlans}</p>
                </div>
                <Plane className="h-8 w-8 text-pink-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Photos</p>
                  <p className="text-3xl font-bold">{stats.photosUploaded}</p>
                </div>
                <Image className="h-8 w-8 text-green-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:grid-cols-5">
            <TabsTrigger value="overview" className="flex items-center space-x-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="family" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Family</span>
            </TabsTrigger>
            <TabsTrigger value="memories" className="flex items-center space-x-2">
              <Camera className="h-4 w-4" />
              <span className="hidden sm:inline">Memories</span>
            </TabsTrigger>
            <TabsTrigger value="travel" className="flex items-center space-x-2">
              <Plane className="h-4 w-4" />
              <span className="hidden sm:inline">Travel</span>
            </TabsTrigger>
            <TabsTrigger value="activities" className="flex items-center space-x-2">
              <Gamepad2 className="h-4 w-4" />
              <span className="hidden sm:inline">Games</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* AI Memory Insights */}
              <AIMemorySuggestions 
                className="lg:col-span-2"
                onMemoryClick={(memory) => {
                  console.log('Memory clicked:', memory);
                  // Navigate to memory details or open modal
                  navigate(`/memories/${memory.id}`);
                }}
              />

              {/* Family Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="h-5 w-5" />
                    <span>Family Online</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {familyMembers.map((member) => (
                      <div key={member.id} className="flex items-center space-x-3">
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={member.avatar} />
                            <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(member.status)}`}></div>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{member.name}</p>
                          <p className="text-sm text-gray-500">{member.relationship}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <Button variant="outline" className="h-20 flex flex-col space-y-2" onClick={() => setActiveTab('memories')}>
                    <Camera className="h-6 w-6" />
                    <span>Add Memory</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col space-y-2" onClick={() => setActiveTab('family')}>
                    <UserPlus className="h-6 w-6" />
                    <span>Add Member</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col space-y-2" onClick={() => setActiveTab('travel')}>
                    <MapPin className="h-6 w-6" />
                    <span>Plan Trip</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col space-y-2" onClick={() => setActiveTab('activities')}>
                    <Gamepad2 className="h-6 w-6" />
                    <span>Play Games</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Family Tab */}
          <TabsContent value="family" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Family Members</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {familyMembers.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Avatar>
                            <AvatarImage src={member.avatar} />
                            <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{member.name}</p>
                            <p className="text-sm text-gray-500">{member.relationship}</p>
                          </div>
                        </div>
                        <Badge variant={member.status === 'online' ? 'default' : 'secondary'}>
                          {member.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                  <Button className="w-full mt-4">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Family Member
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Family Tree</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg p-8">
                    <Users className="h-12 w-12 mx-auto text-blue-600 mb-4" />
                    <h3 className="font-semibold text-lg mb-2">Interactive Family Tree</h3>
                    <p className="text-gray-600 mb-4">Explore your family connections and history</p>
                    <Button onClick={() => navigate('/family-tree')}>
                      View Family Tree
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Memories Tab */}
          <TabsContent value="memories" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PhotoUpload onUploadComplete={handlePhotoUpload} />
              
              <Card>
                <CardHeader>
                  <CardTitle>Recent Memories</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {recentMemories.map((memory) => (
                      <div key={memory.id} className="bg-gray-100 rounded-lg p-4 text-center">
                        <Camera className="h-8 w-8 mx-auto text-gray-500 mb-2" />
                        <p className="font-medium text-sm">{memory.title}</p>
                        <p className="text-xs text-gray-500">{new Date(memory.date).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                  <Button className="w-full mt-4" onClick={() => navigate('/memories')}>
                    View All Memories
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Travel Tab */}
          <TabsContent value="travel" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Travel</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {upcomingTravel.map((trip) => (
                      <div key={trip.id} className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">{trip.destination}</h3>
                          <Badge variant={trip.status === 'confirmed' ? 'default' : 'secondary'}>
                            {trip.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{trip.dates}</p>
                        <div className="flex items-center mt-2">
                          <Users className="h-4 w-4 mr-2 text-gray-500" />
                          <span className="text-sm text-gray-600">{trip.participants.length} participants</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button className="w-full mt-4" onClick={getQuickTravelRecommendations}>
                    <MapPin className="h-4 w-4 mr-2" />
                    Get Travel Recommendations
                  </Button>
                </CardContent>
              </Card>

              {/* AI Travel Companion */}
              <AITravelCompanion 
                onSelectDestination={(destination) => {
                  console.log('Selected destination:', destination);
                  // Navigate to travel planning with selected destination
                  navigate(`/travel-planning?destination=${encodeURIComponent(destination)}`);
                }}
              />

              {/* Budget Integration */}
              <BudgetIntegration 
                onSelectBudgetCategory={(category) => {
                  console.log('Selected budget category:', category);
                  // Handle budget category selection
                }}
                travelDestination={upcomingTravel[0]?.destination}
                estimatedBudget={2000}
              />
            </div>
          </TabsContent>

          {/* Activities/Games Tab */}
          <TabsContent value="activities" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Family Games</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button variant="outline" className="w-full justify-start">
                      <Gamepad2 className="h-4 w-4 mr-2" />
                      Mafia Game
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Globe className="h-4 w-4 mr-2" />
                      Road Trip Bingo
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <MapPin className="h-4 w-4 mr-2" />
                      Location Challenge
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Award className="h-4 w-4 mr-2" />
                      Family Quiz
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Challenges</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <Trophy className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
                    <p className="text-sm text-gray-600">Create fun challenges for the family</p>
                    <Button className="w-full mt-4">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Challenge
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Achievements</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                        <Star className="h-4 w-4 text-yellow-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Memory Keeper</p>
                        <p className="text-xs text-gray-500">Uploaded 10 photos</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Plane className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Travel Planner</p>
                        <p className="text-xs text-gray-500">Planned 3 trips</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default FamilyDashboard;