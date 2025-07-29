import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Trophy, Star, Crown, Medal, Award, Target, Camera, Plane, 
  Users, Heart, Calendar, MapPin, BookOpen, Zap, Flame, Gift,
  CheckCircle, Clock, TrendingUp, Sparkles, Lock, Unlock
} from 'lucide-react';

interface Achievement {
  id: string;
  title: string;
  description: string;
  category: 'travel' | 'memories' | 'family' | 'social' | 'explorer' | 'creative';
  type: 'badge' | 'milestone' | 'streak' | 'collection';
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  points: number;
  progress: number;
  maxProgress: number;
  unlocked: boolean;
  unlockedDate?: string;
  requirements: string[];
  nextLevel?: Achievement;
}

interface UserStats {
  totalPoints: number;
  totalAchievements: number;
  unlockedAchievements: number;
  rank: string;
  level: number;
  experiencePoints: number;
  nextLevelXP: number;
  streaks: {
    current: number;
    longest: number;
    type: string;
  };
}

const AchievementsPage: React.FC = () => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showUnlockedOnly, setShowUnlockedOnly] = useState(false);

  // Demo achievements data
  useEffect(() => {
    const demoAchievements: Achievement[] = [
      {
        id: '1',
        title: 'First Memory',
        description: 'Upload your first family memory',
        category: 'memories',
        type: 'milestone',
        icon: '📸',
        rarity: 'common',
        points: 10,
        progress: 1,
        maxProgress: 1,
        unlocked: true,
        unlockedDate: '2024-01-15',
        requirements: ['Upload 1 memory']
      },
      {
        id: '2',
        title: 'Memory Keeper',
        description: 'Upload 25 family memories',
        category: 'memories',
        type: 'milestone',
        icon: '📚',
        rarity: 'rare',
        points: 50,
        progress: 18,
        maxProgress: 25,
        unlocked: false,
        requirements: ['Upload 25 memories']
      },
      {
        id: '3',
        title: 'World Explorer',
        description: 'Visit 5 different countries',
        category: 'travel',
        type: 'collection',
        icon: '🌍',
        rarity: 'epic',
        points: 100,
        progress: 3,
        maxProgress: 5,
        unlocked: false,
        requirements: ['Visit 5 countries', 'Document with photos']
      },
      {
        id: '4',
        title: 'Family Historian',
        description: 'Document 50+ family memories',
        category: 'memories',
        type: 'milestone',
        icon: '📖',
        rarity: 'epic',
        points: 150,
        progress: 52,
        maxProgress: 50,
        unlocked: true,
        unlockedDate: '2024-01-20',
        requirements: ['Upload 50 memories', 'Add descriptions']
      },
      {
        id: '5',
        title: 'Travel Streak',
        description: 'Plan a trip every month for 6 months',
        category: 'travel',
        type: 'streak',
        icon: '✈️',
        rarity: 'rare',
        points: 75,
        progress: 4,
        maxProgress: 6,
        unlocked: false,
        requirements: ['Plan 6 consecutive monthly trips']
      },
      {
        id: '6',
        title: 'Social Butterfly',
        description: 'Share 10 memories with family',
        category: 'social',
        type: 'milestone',
        icon: '🦋',
        rarity: 'common',
        points: 25,
        progress: 12,
        maxProgress: 10,
        unlocked: true,
        unlockedDate: '2024-01-18',
        requirements: ['Share 10 memories']
      },
      {
        id: '7',
        title: 'Event Organizer',
        description: 'Create and organize 5 family events',
        category: 'family',
        type: 'milestone',
        icon: '🎉',
        rarity: 'rare',
        points: 60,
        progress: 2,
        maxProgress: 5,
        unlocked: false,
        requirements: ['Create 5 events', 'Have family attendance']
      },
      {
        id: '8',
        title: 'Adventure Legend',
        description: 'Complete 100 family activities',
        category: 'explorer',
        type: 'milestone',
        icon: '👑',
        rarity: 'legendary',
        points: 500,
        progress: 67,
        maxProgress: 100,
        unlocked: false,
        requirements: ['Complete 100 activities', 'Document with photos', 'Share with family']
      },
      {
        id: '9',
        title: 'Creative Genius',
        description: 'Create 20 custom photo albums',
        category: 'creative',
        type: 'milestone',
        icon: '🎨',
        rarity: 'epic',
        points: 120,
        progress: 8,
        maxProgress: 20,
        unlocked: false,
        requirements: ['Create 20 albums', 'Add custom themes']
      },
      {
        id: '10',
        title: 'Family Champion',
        description: 'Be the most active family member for 30 days',
        category: 'family',
        type: 'streak',
        icon: '🏆',
        rarity: 'legendary',
        points: 300,
        progress: 12,
        maxProgress: 30,
        unlocked: false,
        requirements: ['Top activity for 30 consecutive days']
      }
    ];

    const demoStats: UserStats = {
      totalPoints: 520,
      totalAchievements: demoAchievements.length,
      unlockedAchievements: demoAchievements.filter(a => a.unlocked).length,
      rank: 'Family Explorer',
      level: 8,
      experiencePoints: 520,
      nextLevelXP: 750,
      streaks: {
        current: 12,
        longest: 45,
        type: 'Daily Activity'
      }
    };

    setAchievements(demoAchievements);
    setUserStats(demoStats);
  }, []);

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'from-gray-400 to-gray-600';
      case 'rare': return 'from-blue-400 to-blue-600';
      case 'epic': return 'from-purple-400 to-purple-600';
      case 'legendary': return 'from-yellow-400 to-yellow-600';
      default: return 'from-gray-400 to-gray-600';
    }
  };

  const getRarityBadgeColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'bg-gray-100 text-gray-800';
      case 'rare': return 'bg-blue-100 text-blue-800';
      case 'epic': return 'bg-purple-100 text-purple-800';
      case 'legendary': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'travel': return <Plane className="h-4 w-4" />;
      case 'memories': return <Camera className="h-4 w-4" />;
      case 'family': return <Users className="h-4 w-4" />;
      case 'social': return <Heart className="h-4 w-4" />;
      case 'explorer': return <MapPin className="h-4 w-4" />;
      case 'creative': return <Sparkles className="h-4 w-4" />;
      default: return <Star className="h-4 w-4" />;
    }
  };

  const filteredAchievements = achievements.filter(achievement => {
    const matchesCategory = selectedCategory === 'all' || achievement.category === selectedCategory;
    const matchesUnlocked = !showUnlockedOnly || achievement.unlocked;
    return matchesCategory && matchesUnlocked;
  });

  const recentlyUnlocked = achievements
    .filter(a => a.unlocked && a.unlockedDate)
    .sort((a, b) => new Date(b.unlockedDate!).getTime() - new Date(a.unlockedDate!).getTime())
    .slice(0, 3);

  const familyLeaderboard = [
    { name: 'Ahmad El-Mowafi', points: 520, level: 8, avatar: '/api/placeholder/40/40', rank: 1 },
    { name: 'Fatima El-Mowafi', points: 485, level: 7, avatar: '/api/placeholder/40/40', rank: 2 },
    { name: 'Omar El-Mowafi', points: 320, level: 5, avatar: '/api/placeholder/40/40', rank: 3 },
    { name: 'Layla El-Mowafi', points: 280, level: 4, avatar: '/api/placeholder/40/40', rank: 4 },
  ];

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Achievements & Rewards</h1>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-gray-500">Current Points</p>
            <p className="text-2xl font-bold text-primary">{userStats?.totalPoints}</p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center">
            <Crown className="h-6 w-6 text-white" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        {/* User Stats */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Your Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary/70 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-2xl font-bold text-white">{userStats?.level}</span>
              </div>
              <h3 className="font-semibold">{userStats?.rank}</h3>
              <p className="text-sm text-gray-500">Level {userStats?.level}</p>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Progress to next level</span>
                <span>{userStats?.experiencePoints}/{userStats?.nextLevelXP}</span>
              </div>
              <Progress 
                value={(userStats?.experiencePoints || 0) / (userStats?.nextLevelXP || 1) * 100} 
                className="h-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-primary">{userStats?.unlockedAchievements}</p>
                <p className="text-xs text-gray-500">Unlocked</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-orange-500">{userStats?.streaks.current}</p>
                <p className="text-xs text-gray-500">Current Streak</p>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">Recent Activity</h4>
              <div className="space-y-2">
                {recentlyUnlocked.map(achievement => (
                  <div key={achievement.id} className="flex items-center gap-2 text-sm">
                    <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center">
                      <Star className="h-3 w-3 text-yellow-600" />
                    </div>
                    <span className="truncate">{achievement.title}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Achievements Grid */}
        <div className="lg:col-span-3">
          <Tabs defaultValue="achievements" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="achievements">Achievements</TabsTrigger>
              <TabsTrigger value="leaderboard">Family Leaderboard</TabsTrigger>
              <TabsTrigger value="challenges">Active Challenges</TabsTrigger>
            </TabsList>

            <TabsContent value="achievements" className="space-y-6">
              {/* Filters */}
              <div className="flex flex-wrap gap-2 items-center">
                <Button
                  variant={selectedCategory === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory('all')}
                >
                  All Categories
                </Button>
                {['travel', 'memories', 'family', 'social', 'explorer', 'creative'].map(category => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                    className="flex items-center gap-1"
                  >
                    {getCategoryIcon(category)}
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </Button>
                ))}
                <div className="ml-auto">
                  <Button
                    variant={showUnlockedOnly ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setShowUnlockedOnly(!showUnlockedOnly)}
                  >
                    {showUnlockedOnly ? 'Show All' : 'Unlocked Only'}
                  </Button>
                </div>
              </div>

              {/* Achievements Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredAchievements.map(achievement => (
                  <Card 
                    key={achievement.id} 
                    className={`relative overflow-hidden transition-all hover:shadow-lg ${
                      achievement.unlocked ? 'border-2 border-yellow-300' : 'opacity-75'
                    }`}
                  >
                    {achievement.unlocked && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle className="h-6 w-6 text-green-500" />
                      </div>
                    )}
                    
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`w-12 h-12 bg-gradient-to-br ${getRarityColor(achievement.rarity)} rounded-lg flex items-center justify-center text-white text-xl`}>
                          {achievement.unlocked ? achievement.icon : <Lock className="h-6 w-6" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold truncate">{achievement.title}</h4>
                          <p className="text-sm text-gray-600 line-clamp-2">{achievement.description}</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge className={getRarityBadgeColor(achievement.rarity)}>
                            {achievement.rarity}
                          </Badge>
                          <div className="flex items-center gap-1 text-sm font-medium">
                            <Star className="h-4 w-4 text-yellow-500" />
                            {achievement.points}
                          </div>
                        </div>

                        {!achievement.unlocked && (
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Progress</span>
                              <span>{achievement.progress}/{achievement.maxProgress}</span>
                            </div>
                            <Progress 
                              value={(achievement.progress / achievement.maxProgress) * 100} 
                              className="h-2"
                            />
                          </div>
                        )}

                        {achievement.unlocked && achievement.unlockedDate && (
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Unlocked {new Date(achievement.unlockedDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="leaderboard" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Family Leaderboard</CardTitle>
                  <CardDescription>See how everyone is doing this month</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {familyLeaderboard.map((member, index) => (
                      <div key={member.name} className="flex items-center gap-4 p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                            member.rank === 1 ? 'bg-yellow-100 text-yellow-800' :
                            member.rank === 2 ? 'bg-gray-100 text-gray-800' :
                            member.rank === 3 ? 'bg-orange-100 text-orange-800' :
                            'bg-gray-50 text-gray-600'
                          }`}>
                            {member.rank === 1 ? '🥇' : member.rank === 2 ? '🥈' : member.rank === 3 ? '🥉' : member.rank}
                          </div>
                          <Avatar>
                            <AvatarImage src={member.avatar} />
                            <AvatarFallback>{member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-medium">{member.name}</h4>
                            <p className="text-sm text-gray-500">Level {member.level}</p>
                          </div>
                        </div>
                        
                        <div className="ml-auto text-right">
                          <p className="text-lg font-bold text-primary">{member.points}</p>
                          <p className="text-xs text-gray-500">points</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="challenges" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Flame className="h-5 w-5 text-orange-500" />
                      Weekly Challenge
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium">Share 5 New Memories</h4>
                        <p className="text-sm text-gray-600">Upload and share 5 family memories this week</p>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Progress</span>
                          <span>3/5</span>
                        </div>
                        <Progress value={60} className="h-2" />
                      </div>
                      <div className="flex items-center justify-between">
                        <Badge className="bg-orange-100 text-orange-800">2 days left</Badge>
                        <div className="flex items-center gap-1 text-sm">
                          <Star className="h-4 w-4 text-yellow-500" />
                          100 points
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-blue-500" />
                      Monthly Goal
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium">Plan a Family Trip</h4>
                        <p className="text-sm text-gray-600">Research and plan a family vacation</p>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Progress</span>
                          <span>2/4 steps</span>
                        </div>
                        <Progress value={50} className="h-2" />
                      </div>
                      <div className="flex items-center justify-between">
                        <Badge className="bg-blue-100 text-blue-800">15 days left</Badge>
                        <div className="flex items-center gap-1 text-sm">
                          <Star className="h-4 w-4 text-yellow-500" />
                          250 points
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
    </div>
  );
};

export default AchievementsPage; 