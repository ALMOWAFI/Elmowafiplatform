import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Plane, MapPin, Calendar, Clock, DollarSign, Users, Star,
  ArrowLeft, Plus, Search, Filter, Map, Camera, Hotel,
  Car, Utensils, Activity, Compass, Globe, Award,
  TrendingUp, Heart, Share2, Download, Edit, Trash2,
  CheckCircle, Circle, AlertTriangle, Sparkles, Navigation
} from 'lucide-react';
import { authService, travelService } from '@/services/api';

interface TravelPlan {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  spentAmount: number;
  status: 'planning' | 'confirmed' | 'in-progress' | 'completed';
  participants: string[];
  description?: string;
  thumbnail?: string;
  activities: Activity[];
  accommodations: Accommodation[];
  transportation: Transportation[];
  notes: string[];
}

interface Activity {
  id: string;
  name: string;
  type: 'sightseeing' | 'dining' | 'entertainment' | 'shopping' | 'cultural' | 'adventure';
  date: string;
  time: string;
  location: string;
  cost: number;
  duration: string;
  rating?: number;
  isBooked: boolean;
  notes?: string;
}

interface Accommodation {
  id: string;
  name: string;
  type: 'hotel' | 'airbnb' | 'resort' | 'hostel' | 'other';
  checkIn: string;
  checkOut: string;
  cost: number;
  location: string;
  rating?: number;
  isBooked: boolean;
  amenities: string[];
}

interface Transportation {
  id: string;
  type: 'flight' | 'train' | 'bus' | 'car' | 'taxi' | 'other';
  from: string;
  to: string;
  date: string;
  time: string;
  cost: number;
  duration: string;
  isBooked: boolean;
  confirmationNumber?: string;
}

interface Recommendation {
  id: string;
  title: string;
  description: string;
  type: 'activity' | 'restaurant' | 'accommodation' | 'transport';
  location: string;
  estimatedCost: number;
  rating: number;
  aiReason: string;
  familyFriendly: boolean;
}

export const TravelPlanningPage: React.FC = () => {
  const [travelPlans, setTravelPlans] = useState<TravelPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<TravelPlan | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showNewPlanForm, setShowNewPlanForm] = useState(false);
  const [newPlan, setNewPlan] = useState({
    title: '',
    destination: '',
    startDate: '',
    endDate: '',
    budget: '',
    participants: [],
    description: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    loadTravelPlans();
    loadRecommendations();
  }, []);

  const loadTravelPlans = async () => {
    setLoading(true);
    try {
      const plans = await travelService.getPlans();
      setTravelPlans(plans.map((plan: any, index: number) => ({
        id: plan.id || `plan-${index}`,
        title: plan.title || `Trip ${index + 1}`,
        destination: plan.destination || 'Dubai',
        startDate: plan.startDate || '2024-07-01',
        endDate: plan.endDate || '2024-07-07',
        budget: plan.budget || 5000,
        spentAmount: plan.spentAmount || Math.floor(Math.random() * 3000),
        status: plan.status || 'planning',
        participants: plan.participants || ['Family'],
        description: plan.description || '',
        thumbnail: plan.thumbnail,
        activities: plan.activities || [],
        accommodations: plan.accommodations || [],
        transportation: plan.transportation || [],
        notes: plan.notes || []
      })));
    } catch (error) {
      console.error('Failed to load travel plans:', error);
      // Demo data
      setTravelPlans([
        {
          id: '1',
          title: 'Dubai Family Adventure',
          destination: 'Dubai, UAE',
          startDate: '2024-08-01',
          endDate: '2024-08-07',
          budget: 8000,
          spentAmount: 2400,
          status: 'planning',
          participants: ['Dad', 'Mom', 'Sarah', 'Ahmed'],
          description: 'Exploring the wonders of Dubai with the whole family',
          activities: [
            {
              id: 'a1',
              name: 'Burj Khalifa Visit',
              type: 'sightseeing',
              date: '2024-08-02',
              time: '14:00',
              location: 'Downtown Dubai',
              cost: 150,
              duration: '2 hours',
              rating: 5,
              isBooked: true,
              notes: 'Book tickets in advance'
            },
            {
              id: 'a2',
              name: 'Desert Safari',
              type: 'adventure',
              date: '2024-08-03',
              time: '15:00',
              location: 'Arabian Desert',
              cost: 300,
              duration: '6 hours',
              rating: 5,
              isBooked: false
            }
          ],
          accommodations: [
            {
              id: 'h1',
              name: 'Atlantis The Palm',
              type: 'resort',
              checkIn: '2024-08-01',
              checkOut: '2024-08-07',
              cost: 2000,
              location: 'Palm Jumeirah',
              rating: 5,
              isBooked: true,
              amenities: ['Pool', 'Beach', 'Spa', 'Kids Club']
            }
          ],
          transportation: [
            {
              id: 't1',
              type: 'flight',
              from: 'Home',
              to: 'Dubai',
              date: '2024-08-01',
              time: '08:00',
              cost: 2400,
              duration: '4 hours',
              isBooked: true,
              confirmationNumber: 'ABC123'
            }
          ],
          notes: ['Passport expires in 2025', 'Need travel insurance']
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadRecommendations = async () => {
    try {
      const recs = await travelService.getRecommendations();
      setRecommendations(recs);
    } catch (error) {
      // Demo recommendations
      setRecommendations([
        {
          id: 'r1',
          title: 'Dubai Mall Aquarium',
          description: 'One of the largest suspended aquariums in the world',
          type: 'activity',
          location: 'Dubai Mall',
          estimatedCost: 100,
          rating: 4.8,
          aiReason: 'Perfect for families with children who love marine life',
          familyFriendly: true
        },
        {
          id: 'r2',
          title: 'Al Hadheerah Desert Restaurant',
          description: 'Traditional Emirati dining experience in the desert',
          type: 'restaurant',
          location: 'Al Sahra Desert Resort',
          estimatedCost: 200,
          rating: 4.6,
          aiReason: 'Authentic cultural experience with entertainment',
          familyFriendly: true
        },
        {
          id: 'r3',
          title: 'Dubai Marina Walk',
          description: 'Scenic waterfront promenade with dining and shopping',
          type: 'activity',
          location: 'Dubai Marina',
          estimatedCost: 0,
          rating: 4.5,
          aiReason: 'Free family activity with beautiful views',
          familyFriendly: true
        }
      ]);
    }
  };

  const handleCreatePlan = async () => {
    try {
      const planData = {
        ...newPlan,
        budget: parseInt(newPlan.budget),
        spentAmount: 0,
        status: 'planning',
        activities: [],
        accommodations: [],
        transportation: [],
        notes: []
      };
      
      // Call API to create plan
      const createdPlan = await travelService.createPlan(planData);
      setTravelPlans(prev => [...prev, createdPlan]);
      setShowNewPlanForm(false);
      setNewPlan({
        title: '',
        destination: '',
        startDate: '',
        endDate: '',
        budget: '',
        participants: [],
        description: ''
      });
    } catch (error) {
      console.error('Failed to create travel plan:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'in-progress': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'sightseeing': return <Camera className="h-4 w-4" />;
      case 'dining': return <Utensils className="h-4 w-4" />;
      case 'entertainment': return <Star className="h-4 w-4" />;
      case 'shopping': return <Compass className="h-4 w-4" />;
      case 'cultural': return <Globe className="h-4 w-4" />;
      case 'adventure': return <Activity className="h-4 w-4" />;
      default: return <MapPin className="h-4 w-4" />;
    }
  };

  const getBudgetPercentage = (plan: TravelPlan) => {
    return Math.min((plan.spentAmount / plan.budget) * 100, 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          <p className="text-lg font-medium text-gray-600">Planning your perfect family getaway...</p>
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
                Travel Planning
              </h1>
              <Badge variant="secondary">
                {travelPlans.length} trips
              </Badge>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button variant="outline" size="sm">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
              <Button onClick={() => setShowNewPlanForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Trip
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* New Plan Form Modal */}
        {showNewPlanForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Create New Travel Plan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Trip Title</Label>
                  <Input
                    id="title"
                    value={newPlan.title}
                    onChange={(e) => setNewPlan(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Family Vacation to..."
                  />
                </div>
                
                <div>
                  <Label htmlFor="destination">Destination</Label>
                  <Input
                    id="destination"
                    value={newPlan.destination}
                    onChange={(e) => setNewPlan(prev => ({ ...prev, destination: e.target.value }))}
                    placeholder="Dubai, UAE"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={newPlan.startDate}
                      onChange={(e) => setNewPlan(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={newPlan.endDate}
                      onChange={(e) => setNewPlan(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="budget">Budget ($)</Label>
                  <Input
                    id="budget"
                    type="number"
                    value={newPlan.budget}
                    onChange={(e) => setNewPlan(prev => ({ ...prev, budget: e.target.value }))}
                    placeholder="5000"
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newPlan.description}
                    onChange={(e) => setNewPlan(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="What makes this trip special?"
                  />
                </div>
                
                <div className="flex space-x-2">
                  <Button onClick={handleCreatePlan} className="flex-1">
                    Create Plan
                  </Button>
                  <Button variant="outline" onClick={() => setShowNewPlanForm(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {!selectedPlan ? (
          <>
            {/* Plans Overview */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Your Family Adventures</h2>
              <p className="text-gray-600">Plan, organize, and enjoy unforgettable trips together.</p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm font-medium">Total Trips</p>
                      <p className="text-3xl font-bold">{travelPlans.length}</p>
                    </div>
                    <Plane className="h-8 w-8 text-blue-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm font-medium">Completed</p>
                      <p className="text-3xl font-bold">
                        {travelPlans.filter(p => p.status === 'completed').length}
                      </p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm font-medium">Total Budget</p>
                      <p className="text-3xl font-bold">
                        ${travelPlans.reduce((sum, plan) => sum + plan.budget, 0).toLocaleString()}
                      </p>
                    </div>
                    <DollarSign className="h-8 w-8 text-purple-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-pink-500 to-pink-600 text-white border-0">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-pink-100 text-sm font-medium">Family Members</p>
                      <p className="text-3xl font-bold">4</p>
                    </div>
                    <Users className="h-8 w-8 text-pink-200" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Travel Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {travelPlans.map((plan) => (
                <Card key={plan.id} className="group hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedPlan(plan)}>
                  <CardContent className="p-0">
                    {/* Thumbnail */}
                    <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 rounded-t-lg flex items-center justify-center relative overflow-hidden">
                      {plan.thumbnail ? (
                        <img src={plan.thumbnail} alt={plan.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center">
                          <Plane className="h-12 w-12 text-blue-500 mx-auto mb-2" />
                          <p className="text-sm font-medium text-gray-600">{plan.destination}</p>
                        </div>
                      )}
                      <div className="absolute top-2 left-2">
                        <Badge className={`${getStatusColor(plan.status)} text-xs`}>
                          {plan.status}
                        </Badge>
                      </div>
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="secondary" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="p-4">
                      <h3 className="font-semibold text-lg mb-2 line-clamp-1">{plan.title}</h3>
                      {plan.description && (
                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{plan.description}</p>
                      )}
                      
                      {/* Dates */}
                      <div className="flex items-center text-xs text-gray-500 mb-3">
                        <Calendar className="h-3 w-3 mr-1" />
                        {new Date(plan.startDate).toLocaleDateString()} - {new Date(plan.endDate).toLocaleDateString()}
                      </div>
                      
                      {/* Budget Progress */}
                      <div className="mb-3">
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>Budget</span>
                          <span>${plan.spentAmount.toLocaleString()} / ${plan.budget.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full transition-all" 
                            style={{ width: `${getBudgetPercentage(plan)}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      {/* Participants */}
                      <div className="flex items-center text-xs text-gray-500 mb-3">
                        <Users className="h-3 w-3 mr-1" />
                        {plan.participants.join(', ')}
                      </div>
                      
                      {/* Activities count */}
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{plan.activities.length} activities planned</span>
                        <span>{plan.accommodations.length} accommodations</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* AI Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Sparkles className="h-5 w-5" />
                  <span>AI Travel Recommendations</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recommendations.map((rec) => (
                    <Card key={rec.id} className="border border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-sm">{rec.title}</h3>
                          <Badge variant="outline" className="text-xs">
                            {rec.type}
                          </Badge>
                        </div>
                        
                        <p className="text-gray-600 text-xs mb-2">{rec.description}</p>
                        
                        <div className="flex items-center text-xs text-gray-500 mb-2">
                          <MapPin className="h-3 w-3 mr-1" />
                          {rec.location}
                        </div>
                        
                        <div className="flex items-center justify-between text-xs mb-2">
                          <span className="flex items-center">
                            <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
                            {rec.rating}
                          </span>
                          <span className="font-medium">${rec.estimatedCost}</span>
                        </div>
                        
                        <div className="bg-purple-100 p-2 rounded text-xs mb-2">
                          <span className="font-medium">AI says:</span> {rec.aiReason}
                        </div>
                        
                        {rec.familyFriendly && (
                          <Badge variant="secondary" className="text-xs">
                            👨‍👩‍👧‍👦 Family Friendly
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          /* Selected Plan Detail View */
          <div>
            {/* Plan Header */}
            <div className="mb-8">
              <Button variant="ghost" size="sm" onClick={() => setSelectedPlan(null)} className="mb-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Plans
              </Button>
              
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">{selectedPlan.title}</h2>
                  <div className="flex items-center space-x-4 text-gray-600">
                    <span className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      {selectedPlan.destination}
                    </span>
                    <span className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {new Date(selectedPlan.startDate).toLocaleDateString()} - {new Date(selectedPlan.endDate).toLocaleDateString()}
                    </span>
                    <Badge className={getStatusColor(selectedPlan.status)}>
                      {selectedPlan.status}
                    </Badge>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                  <Button size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </div>
              </div>
            </div>

            {/* Plan Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="itinerary">Itinerary</TabsTrigger>
                <TabsTrigger value="budget">Budget</TabsTrigger>
                <TabsTrigger value="accommodation">Hotels</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Quick Stats */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-gray-600">Total Budget</p>
                              <p className="text-2xl font-bold">${selectedPlan.budget.toLocaleString()}</p>
                            </div>
                            <DollarSign className="h-8 w-8 text-green-500" />
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-gray-600">Spent So Far</p>
                              <p className="text-2xl font-bold">${selectedPlan.spentAmount.toLocaleString()}</p>
                            </div>
                            <TrendingUp className="h-8 w-8 text-blue-500" />
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    
                    {/* Budget Progress */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Budget Progress</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Spent: ${selectedPlan.spentAmount.toLocaleString()}</span>
                            <span>Remaining: ${(selectedPlan.budget - selectedPlan.spentAmount).toLocaleString()}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div 
                              className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all" 
                              style={{ width: `${getBudgetPercentage(selectedPlan)}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-gray-500">{getBudgetPercentage(selectedPlan).toFixed(1)}% of budget used</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* Trip Participants */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Trip Participants</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {selectedPlan.participants.map((participant, index) => (
                          <div key={index} className="flex items-center space-x-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={`/avatar-${index + 1}.jpg`} />
                              <AvatarFallback>{participant.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{participant}</p>
                              <p className="text-sm text-gray-500">Family Member</p>
                            </div>
                          </div>
                        ))}
                        <Button variant="outline" size="sm" className="w-full mt-3">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Participant
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Recent Activities */}
                <Card>
                  <CardHeader>
                    <CardTitle>Planned Activities</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedPlan.activities.slice(0, 5).map((activity) => (
                        <div key={activity.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white">
                            {getActivityIcon(activity.type)}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{activity.name}</p>
                            <p className="text-sm text-gray-500">
                              {new Date(activity.date).toLocaleDateString()} at {activity.time}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">${activity.cost}</p>
                            {activity.isBooked && (
                              <Badge variant="outline" className="text-xs">Booked</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                      {selectedPlan.activities.length === 0 && (
                        <p className="text-gray-500 text-center py-4">No activities planned yet</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="itinerary" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Daily Itinerary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-96">
                      {selectedPlan.activities.length > 0 ? (
                        <div className="space-y-6">
                          {/* Group activities by date */}
                          {Object.entries(
                            selectedPlan.activities.reduce((groups, activity) => {
                              const date = activity.date;
                              if (!groups[date]) groups[date] = [];
                              groups[date].push(activity);
                              return groups;
                            }, {} as Record<string, typeof selectedPlan.activities>)
                          ).map(([date, dayActivities]) => (
                            <div key={date}>
                              <h3 className="text-lg font-semibold text-gray-900 mb-4 sticky top-0 bg-white py-2">
                                {new Date(date).toLocaleDateString('en-US', { 
                                  weekday: 'long', 
                                  year: 'numeric', 
                                  month: 'long', 
                                  day: 'numeric' 
                                })}
                              </h3>
                              <div className="space-y-3">
                                {dayActivities.map((activity, index) => (
                                  <div key={activity.id} className="flex items-start space-x-4">
                                    <div className="flex flex-col items-center">
                                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                                      {index < dayActivities.length - 1 && (
                                        <div className="w-0.5 h-16 bg-purple-200 mt-2"></div>
                                      )}
                                    </div>
                                    
                                    <Card className="flex-1">
                                      <CardContent className="p-4">
                                        <div className="flex items-start justify-between">
                                          <div className="flex items-start space-x-3">
                                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white">
                                              {getActivityIcon(activity.type)}
                                            </div>
                                            <div>
                                              <h4 className="font-semibold">{activity.name}</h4>
                                              <p className="text-sm text-gray-600 mb-1">{activity.location}</p>
                                              <div className="flex items-center space-x-4 text-xs text-gray-500">
                                                <span className="flex items-center">
                                                  <Clock className="h-3 w-3 mr-1" />
                                                  {activity.time}
                                                </span>
                                                <span>{activity.duration}</span>
                                                <span>${activity.cost}</span>
                                              </div>
                                              {activity.notes && (
                                                <p className="text-xs text-gray-500 mt-1">{activity.notes}</p>
                                              )}
                                            </div>
                                          </div>
                                          
                                          <div className="flex items-center space-x-2">
                                            {activity.isBooked ? (
                                              <CheckCircle className="h-5 w-5 text-green-500" />
                                            ) : (
                                              <Circle className="h-5 w-5 text-gray-400" />
                                            )}
                                            <Button variant="ghost" size="sm">
                                              <Edit className="h-4 w-4" />
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
                      ) : (
                        <div className="text-center py-8">
                          <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-500 mb-4">No activities scheduled yet</p>
                          <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Activity
                          </Button>
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="budget" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Budget Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Plane className="h-5 w-5 text-blue-600" />
                            <span className="font-medium">Transportation</span>
                          </div>
                          <span className="font-bold">
                            ${selectedPlan.transportation.reduce((sum, t) => sum + t.cost, 0).toLocaleString()}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Hotel className="h-5 w-5 text-purple-600" />
                            <span className="font-medium">Accommodation</span>
                          </div>
                          <span className="font-bold">
                            ${selectedPlan.accommodations.reduce((sum, a) => sum + a.cost, 0).toLocaleString()}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Activity className="h-5 w-5 text-green-600" />
                            <span className="font-medium">Activities</span>
                          </div>
                          <span className="font-bold">
                            ${selectedPlan.activities.reduce((sum, a) => sum + a.cost, 0).toLocaleString()}
                          </span>
                        </div>
                        
                        <div className="border-t pt-3">
                          <div className="flex items-center justify-between font-bold text-lg">
                            <span>Total Spent</span>
                            <span>${selectedPlan.spentAmount.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Budget Alerts</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {getBudgetPercentage(selectedPlan) > 80 && (
                          <div className="flex items-start space-x-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                            <div>
                              <p className="font-medium text-red-800">Budget Warning</p>
                              <p className="text-sm text-red-600">You've used {getBudgetPercentage(selectedPlan).toFixed(1)}% of your budget</p>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-start space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <Sparkles className="h-5 w-5 text-blue-600 mt-0.5" />
                          <div>
                            <p className="font-medium text-blue-800">Money-Saving Tip</p>
                            <p className="text-sm text-blue-600">Book activities in advance for better prices</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="accommodation" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Accommodations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {selectedPlan.accommodations.map((accommodation) => (
                        <div key={accommodation.id} className="p-4 border border-gray-200 rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3">
                              <Hotel className="h-8 w-8 text-blue-600 mt-1" />
                              <div>
                                <h3 className="font-semibold text-lg">{accommodation.name}</h3>
                                <p className="text-gray-600 mb-2">{accommodation.location}</p>
                                
                                <div className="flex items-center space-x-4 text-sm text-gray-500 mb-2">
                                  <span>Check-in: {new Date(accommodation.checkIn).toLocaleDateString()}</span>
                                  <span>Check-out: {new Date(accommodation.checkOut).toLocaleDateString()}</span>
                                </div>
                                
                                <div className="flex items-center space-x-2 mb-2">
                                  <Badge variant="outline">{accommodation.type}</Badge>
                                  {accommodation.rating && (
                                    <div className="flex items-center">
                                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
                                      <span className="text-sm">{accommodation.rating}</span>
                                    </div>
                                  )}
                                  {accommodation.isBooked && (
                                    <Badge variant="default">Booked</Badge>
                                  )}
                                </div>
                                
                                <div className="flex flex-wrap gap-1">
                                  {accommodation.amenities.map((amenity) => (
                                    <Badge key={amenity} variant="secondary" className="text-xs">
                                      {amenity}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <p className="font-bold text-lg">${accommodation.cost.toLocaleString()}</p>
                              <p className="text-sm text-gray-500">total</p>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {selectedPlan.accommodations.length === 0 && (
                        <div className="text-center py-8">
                          <Hotel className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-500 mb-4">No accommodations booked yet</p>
                          <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Accommodation
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notes" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Trip Notes & Reminders</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {selectedPlan.notes.map((note, index) => (
                        <div key={index} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-gray-800">{note}</p>
                        </div>
                      ))}
                      
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <p className="text-gray-500 mb-3">Add important notes and reminders for your trip</p>
                        <Button variant="outline">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Note
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Empty State */}
        {travelPlans.length === 0 && !selectedPlan && (
          <div className="text-center py-12">
            <Plane className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No travel plans yet</h3>
            <p className="text-gray-600 mb-6">Start planning your next family adventure!</p>
            <Button onClick={() => setShowNewPlanForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Trip
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TravelPlanningPage; 