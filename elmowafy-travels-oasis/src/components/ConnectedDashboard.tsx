import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { 
  Heart, 
  Camera, 
  MapPin, 
  Gamepad2, 
  Users, 
  TrendingUp, 
  Calendar, 
  Star, 
  Clock, 
  Wallet,
  Wifi,
  WifiOff,
  RefreshCw,
  Activity,
  Zap,
  Globe,
  Database,
  Brain
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useIntegration } from '../context/IntegrationContext';
import { Link } from 'react-router-dom';
import { AIHealthCheck } from './AIHealthCheck';

const ConnectedDashboard: React.FC = () => {
  const { t, isRTL } = useLanguage();
  const { user } = useAuth();
  const { 
    familyMembers, 
    memories, 
    travelPlans, 
    gameSessions, 
    suggestions, 
    isLoading, 
    refreshAllData 
  } = useData();
  const { 
    state: integrationState, 
    checkServiceHealth, 
    subscribeToUpdates,
    broadcastEvent 
  } = useIntegration();
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribeMemory = subscribeToUpdates('memory_update', (data) => {
      console.log('Memory updated:', data);
    });

    const unsubscribeFamily = subscribeToUpdates('family_update', (data) => {
      console.log('Family updated:', data);
    });

    const unsubscribeTravel = subscribeToUpdates('travel_update', (data) => {
      console.log('Travel updated:', data);
    });

    return () => {
      unsubscribeMemory();
      unsubscribeFamily();
      unsubscribeTravel();
    };
  }, [subscribeToUpdates]);

  // Calculate dynamic stats based on real data
  const stats = [
    {
      icon: Users,
      title: 'Family Members',
      value: familyMembers.length.toString(),
      description: 'Connected souls',
      gradient: 'bg-gradient-to-br from-blue-500 to-purple-600',
      trend: '+2 this month'
    },
    {
      icon: Camera,
      title: 'Memories',
      value: memories.length.toString(),
      description: 'Precious moments',
      gradient: 'bg-gradient-to-br from-pink-500 to-red-500',
      trend: '+15 this week'
    },
    {
      icon: MapPin,
      title: 'Travel Plans',
      value: travelPlans.length.toString(),
      description: 'Adventures planned',
      gradient: 'bg-gradient-to-br from-green-500 to-teal-500',
      trend: '3 upcoming trips'
    },
    {
      icon: Gamepad2,
      title: 'Active Games',
      value: gameSessions.filter(s => s.status === 'active').length.toString(),
      description: 'Fun sessions',
      gradient: 'bg-gradient-to-br from-yellow-500 to-orange-500',
      trend: '2 ongoing games'
    }
  ];

  const handleRefreshData = async () => {
    await refreshAllData();
    broadcastEvent('dashboard_refresh', { timestamp: new Date() });
  };

  const getConnectionStatusIcon = () => {
    switch (integrationState.connectionStatus) {
      case 'connected':
        return <Wifi className="h-4 w-4 text-green-500" />;
      case 'connecting':
        return <RefreshCw className="h-4 w-4 text-yellow-500 animate-spin" />;
      case 'disconnected':
      case 'error':
        return <WifiOff className="h-4 w-4 text-red-500" />;
      default:
        return <WifiOff className="h-4 w-4 text-gray-500" />;
    }
  };

  const getServiceStatusIcon = (serviceName: string) => {
    const isHealthy = integrationState.services[serviceName as keyof typeof integrationState.services];
    return isHealthy ? (
      <div className="w-2 h-2 bg-green-500 rounded-full" />
    ) : (
      <div className="w-2 h-2 bg-red-500 rounded-full" />
    );
  };

  return (
    <div className="space-y-8">
      {/* Connection Status Bar */}
      <div className="bg-white/80 backdrop-blur-md border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {getConnectionStatusIcon()}
              <span className="text-sm font-medium">
                {integrationState.connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Database className="h-3 w-3" />
                {getServiceStatusIcon('api')}
                <span className="text-xs">API</span>
              </div>
              <div className="flex items-center gap-1">
                <Brain className="h-3 w-3" />
                {getServiceStatusIcon('ai')}
                <span className="text-xs">AI</span>
              </div>
              <div className="flex items-center gap-1">
                <Globe className="h-3 w-3" />
                {getServiceStatusIcon('websocket')}
                <span className="text-xs">WS</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">
              Messages: {integrationState.messageCount}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefreshData}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Hero Section - Personalized Welcome */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-12 px-8 rounded-3xl">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-shrink-0">
              <Avatar className="w-24 h-24 border-4 border-white/20">
                <AvatarImage src={user?.avatar} alt={user?.name} />
                <AvatarFallback className="bg-white/20 text-white text-2xl font-bold">
                  {user?.name ? getInitials(user.name) : 'U'}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="flex-grow text-center md:text-left">
              <p className="text-lg text-white/80 mb-2">{getGreeting()},</p>
              <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
                {user?.name || 'Family Member'}!
              </h1>
              <p className="text-xl mb-6 text-white/90 max-w-2xl leading-relaxed">
                Welcome back to your family's digital sanctuary. Your memories, travels, and connections await.
              </p>
              <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                <Link to="/memories">
                  <Button size="lg" variant="secondary" className="text-lg px-8">
                    <Camera className="w-5 h-5 mr-2" />
                    Explore Memories
                  </Button>
                </Link>
                <Link to="/travel">
                  <Button size="lg" variant="outline" className="text-lg px-8 border-white/30 text-white hover:bg-white/10">
                    <MapPin className="w-5 h-5 mr-2" />
                    Plan Journey
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-20 h-20 ${stat.gradient} opacity-10 rounded-bl-full`} />
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${stat.gradient} bg-opacity-10`}>
                  <stat.icon className="h-6 w-6 text-gray-700" />
                </div>
                <Badge variant="secondary" className="text-xs">
                  {stat.trend}
                </Badge>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</h3>
                <p className="text-sm font-medium text-gray-700 mb-1">{stat.title}</p>
                <p className="text-xs text-gray-500">{stat.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity Section */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Memories */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              Recent Memories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {memories.slice(0, 3).map((memory) => (
                <div key={memory.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <Camera className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{memory.title}</h4>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Calendar className="h-3 w-3" />
                      {new Date(memory.date).toLocaleDateString()}
                      {memory.location && (
                        <>
                          <MapPin className="h-3 w-3" />
                          {memory.location}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {memories.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No memories yet. Start by uploading some photos!
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* AI Suggestions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              AI Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {suggestions?.recommendations?.slice(0, 3).map((suggestion: string, index: number) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Star className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{suggestion}</p>
                    <p className="text-xs text-gray-500">AI Recommendation</p>
                  </div>
                </div>
              ))}
              {(!suggestions || !suggestions.recommendations) && (
                <p className="text-sm text-gray-500 text-center py-4">
                  AI suggestions will appear here based on your family's activities.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Service Status & Quick Actions */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* AI Service Status */}
        <div className="md:col-span-1">
          <AIHealthCheck />
        </div>
        
        {/* Quick Actions */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Link to="/memories">
                  <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                    <Camera className="h-6 w-6" />
                    <span className="text-sm">Upload Memory</span>
                  </Button>
                </Link>
                <Link to="/travel">
                  <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                    <MapPin className="h-6 w-6" />
                    <span className="text-sm">Plan Trip</span>
                  </Button>
                </Link>
                <Link to="/gaming">
                  <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                    <Gamepad2 className="h-6 w-6" />
                    <span className="text-sm">Start Game</span>
                  </Button>
                </Link>
                <Link to="/activities">
                  <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                    <Activity className="h-6 w-6" />
                    <span className="text-sm">Activities</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ConnectedDashboard;
