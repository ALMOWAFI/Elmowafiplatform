import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Heart, Camera, MapPin, Gamepad2, Users, TrendingUp, Calendar, Star, Clock, Wallet } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import BudgetDashboard from './BudgetDashboard';

const Dashboard: React.FC = () => {
  const { t, isRTL } = useLanguage();
  const { user } = useAuth();
  
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

  const stats = [
    {
      icon: Users,
      title: 'Family Members',
      value: '12',
      description: 'Connected souls',
      gradient: 'bg-gradient-to-br from-blue-500 to-purple-600'
    },
    {
      icon: Camera,
      title: 'Memories',
      value: '247',
      description: 'Precious moments',
      gradient: 'bg-gradient-to-br from-pink-500 to-red-500'
    },
    {
      icon: MapPin,
      title: 'Destinations',
      value: '34',
      description: 'Places explored',
      gradient: 'bg-gradient-to-br from-green-500 to-teal-500'
    },
    {
      icon: TrendingUp,
      title: 'Growth',
      value: '127%',
      description: 'Connection strength',
      gradient: 'bg-gradient-to-br from-yellow-500 to-orange-500'
    }
  ];

  return (
    <div className="space-y-8">
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

      {/* Stats Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index} className="text-center">
            <CardContent className="pt-6">
              <div className={`w-12 h-12 mx-auto mb-4 rounded-2xl ${stat.gradient} flex items-center justify-center`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-1">{stat.value}</h3>
              <p className="text-sm font-medium text-muted-foreground mb-1">{stat.title}</p>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <h2 className="text-2xl font-bold mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link to="/memories">
              <Card className="hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer border-0 bg-gradient-to-br from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 mb-4 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Upload Memories</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Share your latest family moments with AI-powered organization.
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link to="/travel">
              <Card className="hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer border-0 bg-gradient-to-br from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Plan Trip</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Get AI-powered recommendations for your next family adventure.
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link to="/gaming">
              <Card className="hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer border-0 bg-gradient-to-br from-red-50 to-orange-50 hover:from-red-100 hover:to-orange-100">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 mb-4 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                    <Gamepad2 className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Start Game</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Launch a family game session with AI game master.
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link to="/activities">
              <Card className="hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer border-0 bg-gradient-to-br from-green-50 to-teal-50 hover:from-green-100 hover:to-teal-100">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 mb-4 rounded-2xl bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Plan Activity</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Organize family activities with smart suggestions.
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

        {/* Recent Activity Panel */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Recent Activity</h2>
          <Card className="bg-gradient-to-br from-gray-50 to-gray-100">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-3 bg-white rounded-lg shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-grow">
                    <p className="text-sm font-medium">New memory uploaded</p>
                    <p className="text-xs text-muted-foreground flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      2 hours ago
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-3 bg-white rounded-lg shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-teal-500 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-grow">
                    <p className="text-sm font-medium">Trip to Dubai planned</p>
                    <p className="text-xs text-muted-foreground flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      1 day ago
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-3 bg-white rounded-lg shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center">
                    <Gamepad2 className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-grow">
                    <p className="text-sm font-medium">Mafia game completed</p>
                    <p className="text-xs text-muted-foreground flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      3 days ago
                    </p>
                  </div>
                </div>
              </div>
              
              <Button variant="ghost" className="w-full mt-4 text-sm">
                View all activity
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Budget Dashboard Section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">{t('family_budget')}</h2>
          <Button variant="outline" size="sm">
            <Wallet className="w-4 h-4 mr-2" />
            {t('manage_budget')}
          </Button>
        </div>
        <BudgetDashboard />
      </div>
    </div>
  );
};

export default Dashboard;
