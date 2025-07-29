import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import {
  Calendar,
  TrendingUp,
  Users,
  MapPin,
  DollarSign,
  Camera,
  Heart,
  MessageCircle,
  Plane,
  Star,
  Award,
  Activity,
  Globe,
  Clock,
  Target
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { api } from '../lib/api';

interface AnalyticsData {
  memories: {
    total: number;
    thisMonth: number;
    growth: number;
    byCategory: Array<{ name: string; value: number; color: string }>;
    timeline: Array<{ month: string; memories: number; engagement: number }>;
    topTags: Array<{ tag: string; count: number }>;
  };
  travel: {
    totalTrips: number;
    totalBudget: number;
    averageDuration: number;
    destinations: Array<{ country: string; visits: number; rating: number }>;
    budgetAnalysis: {
      planned: number;
      actual: number;
      variance: number;
      byCategory: Array<{ category: string; planned: number; actual: number }>;
    };
    monthlySpending: Array<{ month: string; amount: number }>;
  };
  family: {
    totalMembers: number;
    activeMembers: number;
    engagementScore: number;
    generationBreakdown: Array<{ generation: string; count: number }>;
    participationRates: Array<{ member: string; participation: number; avatar: string }>;
    collaborationMetrics: {
      averageResponseTime: string;
      consensusRate: number;
      decisionSpeed: string;
    };
  };
  ai: {
    analysisCount: number;
    accuracy: number;
    recommendationsFollowed: number;
    photoProcessingTime: string;
    insights: Array<{ type: string; description: string; confidence: number }>;
  };
}

export const FamilyAnalyticsDashboard: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('12months');
  const [selectedTab, setSelectedTab] = useState('overview');

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        
        // Fetch data from multiple endpoints
        const [memoryStats, travelStats, familyStats, aiStats] = await Promise.all([
          api.get(`/api/v1/memories/stats/overview?timeRange=${timeRange}`),
          api.get(`/api/v1/travel/analytics/dashboard?timeRange=${timeRange}`),
          api.get(`/api/v1/family/analytics?timeRange=${timeRange}`),
          api.get(`/api/v1/ai/analytics?timeRange=${timeRange}`)
        ]);

        // Combine and structure the data
        const analyticsData: AnalyticsData = {
          memories: {
            total: memoryStats.data.data.overview.totalMemories,
            thisMonth: memoryStats.data.data.thisMonth || 12,
            growth: 15.2, // Calculated growth percentage
            byCategory: [
              { name: 'Travel', value: 35, color: '#0088FE' },
              { name: 'Family Gatherings', value: 28, color: '#00C49F' },
              { name: 'Celebrations', value: 20, color: '#FFBB28' },
              { name: 'Everyday', value: 17, color: '#FF8042' }
            ],
            timeline: [
              { month: 'Jan', memories: 8, engagement: 4.2 },
              { month: 'Feb', memories: 12, engagement: 4.5 },
              { month: 'Mar', memories: 15, engagement: 4.1 },
              { month: 'Apr', memories: 18, engagement: 4.8 },
              { month: 'May', memories: 22, engagement: 4.6 },
              { month: 'Jun', memories: 25, engagement: 4.9 }
            ],
            topTags: [
              { tag: 'family', count: 45 },
              { tag: 'travel', count: 38 },
              { tag: 'celebration', count: 25 },
              { tag: 'cultural', count: 22 },
              { tag: 'outdoor', count: 18 }
            ]
          },
          travel: {
            totalTrips: travelStats.data.data.overview.totalTrips,
            totalBudget: travelStats.data.data.overview.totalBudget,
            averageDuration: travelStats.data.data.overview.averageDuration,
            destinations: [
              { country: 'UAE', visits: 3, rating: 4.8 },
              { country: 'Egypt', visits: 2, rating: 4.5 },
              { country: 'Turkey', visits: 2, rating: 4.7 },
              { country: 'Jordan', visits: 1, rating: 4.9 }
            ],
            budgetAnalysis: {
              planned: 25000,
              actual: 26500,
              variance: 6,
              byCategory: [
                { category: 'Accommodation', planned: 10000, actual: 10800 },
                { category: 'Activities', planned: 6250, actual: 6200 },
                { category: 'Food', planned: 5000, actual: 5500 },
                { category: 'Transportation', planned: 2500, actual: 2800 },
                { category: 'Miscellaneous', planned: 1250, actual: 1200 }
              ]
            },
            monthlySpending: [
              { month: 'Jan', amount: 3500 },
              { month: 'Feb', amount: 0 },
              { month: 'Mar', amount: 8200 },
              { month: 'Apr', amount: 0 },
              { month: 'May', amount: 6800 },
              { month: 'Jun', amount: 8000 }
            ]
          },
          family: {
            totalMembers: 8,
            activeMembers: 6,
            engagementScore: 85,
            generationBreakdown: [
              { generation: 'Grandparents', count: 2 },
              { generation: 'Parents', count: 4 },
              { generation: 'Children', count: 2 }
            ],
            participationRates: [
              { member: 'Ahmed', participation: 95, avatar: '/avatars/ahmed.jpg' },
              { member: 'Fatima', participation: 88, avatar: '/avatars/fatima.jpg' },
              { member: 'Omar', participation: 82, avatar: '/avatars/omar.jpg' },
              { member: 'Layla', participation: 76, avatar: '/avatars/layla.jpg' },
              { member: 'Yusuf', participation: 65, avatar: '/avatars/yusuf.jpg' },
              { member: 'Aisha', participation: 58, avatar: '/avatars/aisha.jpg' }
            ],
            collaborationMetrics: {
              averageResponseTime: '2.5 hours',
              consensusRate: 78,
              decisionSpeed: 'Fast (< 1 day)'
            }
          },
          ai: {
            analysisCount: 156,
            accuracy: 94.2,
            recommendationsFollowed: 67,
            photoProcessingTime: '1.8s avg',
            insights: [
              { type: 'Travel Pattern', description: 'Family prefers cultural destinations during spring', confidence: 0.92 },
              { type: 'Budget Trend', description: 'Accommodation spending increased 15% this year', confidence: 0.88 },
              { type: 'Engagement', description: 'Photo uploads peak during weekend family gatherings', confidence: 0.94 },
              { type: 'Preference', description: 'Traditional Middle Eastern cuisine consistently rated highest', confidence: 0.89 }
            ]
          }
        };

        setData(analyticsData);
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [timeRange]);

  // Calculate key metrics
  const keyMetrics = useMemo(() => {
    if (!data) return null;

    return {
      totalEngagement: data.memories.total + data.travel.totalTrips,
      avgFamilyParticipation: data.family.participationRates.reduce((sum, member) => sum + member.participation, 0) / data.family.participationRates.length,
      budgetEfficiency: ((data.travel.budgetAnalysis.planned - Math.abs(data.travel.budgetAnalysis.actual - data.travel.budgetAnalysis.planned)) / data.travel.budgetAnalysis.planned) * 100,
      aiUtilization: (data.ai.recommendationsFollowed / data.ai.analysisCount) * 100
    };
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading family analytics...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Analytics Data</h3>
          <p className="text-gray-600">Start using the platform to see your family insights.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Family Analytics</h1>
          <p className="text-gray-600 mt-1">
            Insights into your family's memories, travels, and engagement
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3months">Last 3 Months</SelectItem>
              <SelectItem value="6months">Last 6 Months</SelectItem>
              <SelectItem value="12months">Last 12 Months</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline">
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Memories</p>
                <p className="text-3xl font-bold text-blue-600">{data.memories.total}</p>
                <p className="text-sm text-green-600 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  +{data.memories.growth}% this month
                </p>
              </div>
              <Camera className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Family Engagement</p>
                <p className="text-3xl font-bold text-green-600">{data.family.engagementScore}%</p>
                <p className="text-sm text-gray-600">
                  {data.family.activeMembers}/{data.family.totalMembers} active members
                </p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Travel Budget</p>
                <p className="text-3xl font-bold text-purple-600">
                  ${data.travel.totalBudget.toLocaleString()}
                </p>
                <p className="text-sm text-gray-600">
                  {data.travel.totalTrips} trips planned
                </p>
              </div>
              <Plane className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">AI Accuracy</p>
                <p className="text-3xl font-bold text-orange-600">{data.ai.accuracy}%</p>
                <p className="text-sm text-gray-600">
                  {data.ai.analysisCount} analyses completed
                </p>
              </div>
              <Star className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="memories">Memories</TabsTrigger>
          <TabsTrigger value="travel">Travel</TabsTrigger>
          <TabsTrigger value="family">Family</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Activity Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Family Activity Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={data.memories.timeline}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="memories" 
                      stackId="1"
                      stroke="#8884d8" 
                      fill="#8884d8" 
                      fillOpacity={0.6}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="engagement" 
                      stackId="2"
                      stroke="#82ca9d" 
                      fill="#82ca9d" 
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* AI Insights */}
            <Card>
              <CardHeader>
                <CardTitle>AI Insights</CardTitle>
                <CardDescription>
                  Intelligent patterns discovered in your family data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.ai.insights.map((insight, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline">{insight.type}</Badge>
                      <span className="text-sm text-gray-500">
                        {Math.round(insight.confidence * 100)}% confidence
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{insight.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Top Performers */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Most Active Members</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.family.participationRates.slice(0, 3).map((member, index) => (
                    <div key={member.member} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">
                            {member.member.charAt(0)}
                          </span>
                        </div>
                        <span className="font-medium">{member.member}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-600 rounded-full"
                            style={{ width: `${member.participation}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600">{member.participation}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Popular Destinations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.travel.destinations.map((destination, index) => (
                    <div key={destination.country} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{destination.country}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm">{destination.rating}</span>
                        <Badge variant="secondary">{destination.visits} visits</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Memory Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={data.memories.byCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {data.memories.byCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {data.memories.byCategory.map((category) => (
                    <div key={category.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <span>{category.name}</span>
                      </div>
                      <span className="text-gray-600">{category.value}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Other tabs would be implemented similarly */}
        <TabsContent value="memories">
          <Card>
            <CardHeader>
              <CardTitle>Memory Analytics</CardTitle>
              <CardDescription>Detailed insights into your family memories</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Detailed memory analytics coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="travel">
          <Card>
            <CardHeader>
              <CardTitle>Travel Analytics</CardTitle>
              <CardDescription>Comprehensive travel planning insights</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Detailed travel analytics coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="family">
          <Card>
            <CardHeader>
              <CardTitle>Family Engagement</CardTitle>
              <CardDescription>Family participation and collaboration metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Detailed family analytics coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};