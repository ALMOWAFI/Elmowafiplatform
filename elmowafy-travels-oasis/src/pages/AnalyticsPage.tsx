import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, TrendingUp, PieChart, Activity, Calendar, MapPin,
  Camera, Plane, Users, Heart, Star, Clock, Target, Award,
  Download, Share, Filter, DateRange, RefreshCw
} from 'lucide-react';

interface AnalyticsData {
  overview: {
    totalMemories: number;
    totalTrips: number;
    familyMembers: number;
    totalPhotos: number;
    thisMonthMemories: number;
    lastMonthMemories: number;
    averageMemoriesPerWeek: number;
    mostActiveMonth: string;
  };
  timeline: Array<{
    month: string;
    memories: number;
    trips: number;
    events: number;
  }>;
  categories: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  locations: Array<{
    country: string;
    visits: number;
    lastVisit: string;
  }>;
  familyActivity: Array<{
    member: string;
    memories: number;
    trips: number;
    events: number;
  }>;
  insights: Array<{
    id: string;
    type: 'trend' | 'milestone' | 'suggestion';
    title: string;
    description: string;
    value?: string;
  }>;
}

// Mock Chart Components (in a real app, you'd use recharts, chart.js, etc.)
const BarChart: React.FC<{ data: any[]; title: string }> = ({ data, title }) => (
  <div className="w-full h-64 bg-gray-50 rounded-lg flex items-center justify-center border">
    <div className="text-center">
      <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
      <p className="text-gray-600">{title}</p>
      <p className="text-sm text-gray-500">Chart showing {data.length} data points</p>
    </div>
  </div>
);

const LineChart: React.FC<{ data: any[]; title: string }> = ({ data, title }) => (
  <div className="w-full h-64 bg-gray-50 rounded-lg flex items-center justify-center border">
    <div className="text-center">
      <TrendingUp className="h-12 w-12 text-blue-500 mx-auto mb-2" />
      <p className="text-gray-600">{title}</p>
      <p className="text-sm text-gray-500">Trend line with {data.length} points</p>
    </div>
  </div>
);

const DoughnutChart: React.FC<{ data: any[]; title: string }> = ({ data, title }) => (
  <div className="w-full h-64 bg-gray-50 rounded-lg flex items-center justify-center border">
    <div className="text-center">
      <PieChart className="h-12 w-12 text-purple-500 mx-auto mb-2" />
      <p className="text-gray-600">{title}</p>
      <p className="text-sm text-gray-500">{data.length} categories</p>
    </div>
  </div>
);

const AnalyticsPage: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year' | 'all'>('month');
  const [loading, setLoading] = useState(true);

  // Demo analytics data
  useEffect(() => {
    const demoData: AnalyticsData = {
      overview: {
        totalMemories: 127,
        totalTrips: 12,
        familyMembers: 4,
        totalPhotos: 543,
        thisMonthMemories: 18,
        lastMonthMemories: 15,
        averageMemoriesPerWeek: 4.2,
        mostActiveMonth: 'December 2023'
      },
      timeline: [
        { month: 'Jan', memories: 12, trips: 1, events: 3 },
        { month: 'Feb', memories: 15, trips: 2, events: 4 },
        { month: 'Mar', memories: 20, trips: 1, events: 2 },
        { month: 'Apr', memories: 18, trips: 2, events: 5 },
        { month: 'May', memories: 22, trips: 1, events: 3 },
        { month: 'Jun', memories: 25, trips: 3, events: 6 },
        { month: 'Jul', memories: 30, trips: 2, events: 4 },
        { month: 'Aug', memories: 28, trips: 1, events: 3 },
        { month: 'Sep', memories: 24, trips: 2, events: 5 },
        { month: 'Oct', memories: 26, trips: 1, events: 4 },
        { month: 'Nov', memories: 20, trips: 0, events: 2 },
        { month: 'Dec', memories: 18, trips: 1, events: 3 }
      ],
      categories: [
        { name: 'Travel', value: 35, color: '#3b82f6' },
        { name: 'Family Time', value: 28, color: '#10b981' },
        { name: 'Celebrations', value: 20, color: '#f59e0b' },
        { name: 'Daily Life', value: 17, color: '#8b5cf6' }
      ],
      locations: [
        { country: 'Egypt', visits: 45, lastVisit: '2024-01-10' },
        { country: 'UAE', visits: 8, lastVisit: '2023-12-15' },
        { country: 'Jordan', visits: 5, lastVisit: '2023-11-20' },
        { country: 'Lebanon', visits: 3, lastVisit: '2023-10-05' },
        { country: 'Turkey', visits: 2, lastVisit: '2023-08-12' }
      ],
      familyActivity: [
        { member: 'Ahmad', memories: 45, trips: 8, events: 12 },
        { member: 'Fatima', memories: 38, trips: 6, events: 15 },
        { member: 'Omar', memories: 25, trips: 4, events: 8 },
        { member: 'Layla', memories: 19, trips: 3, events: 6 }
      ],
      insights: [
        {
          id: '1',
          type: 'trend',
          title: 'Memory Creation Increasing',
          description: 'You\'ve been creating 20% more memories this month compared to last month',
          value: '+20%'
        },
        {
          id: '2',
          type: 'milestone',
          title: 'Travel Goal Achieved',
          description: 'Congratulations! You\'ve reached your goal of visiting 10 countries',
          value: '10/10'
        },
        {
          id: '3',
          type: 'suggestion',
          title: 'Plan More Family Events',
          description: 'Consider organizing more family events. You had fewer events this month'
        },
        {
          id: '4',
          type: 'trend',
          title: 'Photo Engagement High',
          description: 'Family members are actively engaging with shared photos',
          value: '95%'
        }
      ]
    };

    setTimeout(() => {
      setAnalyticsData(demoData);
      setLoading(false);
    }, 1000);
  }, [timeRange]);

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'trend': return <TrendingUp className="h-5 w-5 text-blue-500" />;
      case 'milestone': return <Award className="h-5 w-5 text-yellow-500" />;
      case 'suggestion': return <Target className="h-5 w-5 text-purple-500" />;
      default: return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  const getGrowthPercentage = (current: number, previous: number) => {
    if (previous === 0) return 100;
    return Math.round(((current - previous) / previous) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Family Analytics</h1>
        <div className="flex gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
            <option value="all">All Time</option>
          </select>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Memories</p>
                <p className="text-3xl font-bold">{analyticsData?.overview.totalMemories}</p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +{getGrowthPercentage(
                    analyticsData?.overview.thisMonthMemories || 0,
                    analyticsData?.overview.lastMonthMemories || 1
                  )}% from last month
                </p>
              </div>
              <Camera className="h-12 w-12 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Family Trips</p>
                <p className="text-3xl font-bold">{analyticsData?.overview.totalTrips}</p>
                <p className="text-xs text-blue-600 flex items-center mt-1">
                  <MapPin className="h-3 w-3 mr-1" />
                  {analyticsData?.locations.length} countries visited
                </p>
              </div>
              <Plane className="h-12 w-12 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Family Members</p>
                <p className="text-3xl font-bold">{analyticsData?.overview.familyMembers}</p>
                <p className="text-xs text-purple-600 flex items-center mt-1">
                  <Heart className="h-3 w-3 mr-1" />
                  All active this month
                </p>
              </div>
              <Users className="h-12 w-12 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Photos</p>
                <p className="text-3xl font-bold">{analyticsData?.overview.totalPhotos}</p>
                <p className="text-xs text-orange-600 flex items-center mt-1">
                  <Activity className="h-3 w-3 mr-1" />
                  ~{analyticsData?.overview.averageMemoriesPerWeek} per week
                </p>
              </div>
              <Star className="h-12 w-12 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="trends" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
          <TabsTrigger value="family">Family Activity</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Memory Creation Over Time</CardTitle>
                <CardDescription>Monthly memory uploads and activities</CardDescription>
              </CardHeader>
              <CardContent>
                <LineChart data={analyticsData?.timeline || []} title="Memory Timeline" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Activity Comparison</CardTitle>
                <CardDescription>Memories, trips, and events by month</CardDescription>
              </CardHeader>
              <CardContent>
                <BarChart data={analyticsData?.timeline || []} title="Activity Breakdown" />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Location Visits</CardTitle>
              <CardDescription>Countries and frequency of visits</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData?.locations.map((location, index) => (
                  <div key={location.country} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <MapPin className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium">{location.country}</h4>
                        <p className="text-sm text-gray-500">Last visit: {new Date(location.lastVisit).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <Badge variant="secondary">{location.visits} visits</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Memory Categories</CardTitle>
                <CardDescription>Distribution of memory types</CardDescription>
              </CardHeader>
              <CardContent>
                <DoughnutChart data={analyticsData?.categories || []} title="Category Distribution" />
                <div className="mt-4 space-y-2">
                  {analyticsData?.categories.map(category => (
                    <div key={category.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: category.color }}
                        ></div>
                        <span className="text-sm">{category.name}</span>
                      </div>
                      <span className="text-sm font-medium">{category.value}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Peak Activity Times</CardTitle>
                <CardDescription>When your family is most active</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-800">Most Active Month</h4>
                    <p className="text-sm text-blue-600">{analyticsData?.overview.mostActiveMonth}</p>
                    <p className="text-xs text-blue-500 mt-1">30 memories created</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-medium text-green-800">Best Travel Month</h4>
                    <p className="text-sm text-green-600">June 2023</p>
                    <p className="text-xs text-green-500 mt-1">3 trips completed</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h4 className="font-medium text-purple-800">Event Season</h4>
                    <p className="text-sm text-purple-600">Spring (March-May)</p>
                    <p className="text-xs text-purple-500 mt-1">11 family events</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="family" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Family Member Activity</CardTitle>
              <CardDescription>Individual contributions and engagement</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData?.familyActivity.map((member, index) => (
                  <div key={member.member} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">{member.member}</h4>
                      <Badge variant={index === 0 ? 'default' : 'secondary'}>
                        {index === 0 ? 'Most Active' : `#${index + 1}`}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-blue-600">{member.memories}</p>
                        <p className="text-xs text-gray-500">Memories</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-600">{member.trips}</p>
                        <p className="text-xs text-gray-500">Trips</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-purple-600">{member.events}</p>
                        <p className="text-xs text-gray-500">Events</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {analyticsData?.insights.map(insight => (
              <Card key={insight.id}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    {getInsightIcon(insight.type)}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{insight.title}</h4>
                        {insight.value && (
                          <Badge variant={insight.type === 'trend' ? 'default' : 'secondary'}>
                            {insight.value}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{insight.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recommendations</CardTitle>
              <CardDescription>Personalized suggestions to improve family engagement</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <Target className="h-5 w-5 text-blue-600" />
                  <div>
                    <h5 className="font-medium text-blue-800">Plan a Weekend Trip</h5>
                    <p className="text-sm text-blue-600">You haven't planned a trip in 2 months. Consider a weekend getaway!</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <Camera className="h-5 w-5 text-green-600" />
                  <div>
                    <h5 className="font-medium text-green-800">Encourage Omar's Photography</h5>
                    <p className="text-sm text-green-600">Omar has been less active lately. Maybe plan a photo walk together?</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                  <Calendar className="h-5 w-5 text-yellow-600" />
                  <div>
                    <h5 className="font-medium text-yellow-800">Schedule More Family Time</h5>
                    <p className="text-sm text-yellow-600">Family event participation is down 15%. Plan more regular gatherings.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsPage; 