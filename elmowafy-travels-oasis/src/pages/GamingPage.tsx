import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Gamepad2, Trophy, Users, MapPin, Clock, Star, Zap,
  ArrowLeft, Plus, Play, Pause, RotateCcw, Award,
  Target, Compass, Brain, Heart, Shield, Sword,
  Eye, EyeOff, Vote, Timer, CheckCircle, XCircle,
  Crown, Medal, Gift, Sparkles, Flame, ThumbsUp
} from 'lucide-react';
import { gamingService } from '@/services/api';

interface Game {
  id: string;
  title: string;
  description: string;
  type: 'mafia' | 'location' | 'trivia' | 'challenge';
  minPlayers: number;
  maxPlayers: number;
  estimatedDuration: string;
  difficulty: 'easy' | 'medium' | 'hard';
  isActive: boolean;
  thumbnail?: string;
}

interface GameSession {
  id: string;
  gameId: string;
  players: Player[];
  status: 'waiting' | 'active' | 'paused' | 'completed';
  startTime: string;
  currentRound: number;
  totalRounds: number;
  winner?: string;
  scores: Record<string, number>;
}

interface Player {
  id: string;
  name: string;
  avatar?: string;
  role?: string;
  isAlive?: boolean;
  score: number;
  achievements: string[];
}

interface MafiaGame {
  phase: 'setup' | 'day' | 'night' | 'voting' | 'ended';
  players: MafiaPlayer[];
  round: number;
  narrator: string;
  lastAction?: string;
  votes: Record<string, string>;
  eliminations: string[];
}

interface MafiaPlayer extends Player {
  role: 'mafia' | 'citizen' | 'detective' | 'doctor';
  isAlive: boolean;
  votes: string[];
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockedBy: string[];
  points: number;
}

interface LocationChallenge {
  id: string;
  title: string;
  description: string;
  location: {
    lat: number;
    lng: number;
    name: string;
    radius: number;
  };
  task: string;
  hint?: string;
  timeLimit: number;
  points: number;
  completedBy: string[];
}

export const GamingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [games, setGames] = useState<Game[]>([]);
  const [activeSessions, setActiveSessions] = useState<GameSession[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [playerStats, setPlayerStats] = useState({
    totalGamesPlayed: 0,
    gamesWon: 0,
    totalScore: 0,
    rank: 'Beginner',
    streakCount: 0
  });
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [currentSession, setCurrentSession] = useState<GameSession | null>(null);
  const [mafiaGame, setMafiaGame] = useState<MafiaGame | null>(null);
  const [locationChallenges, setLocationChallenges] = useState<LocationChallenge[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadGames();
    loadPlayerStats();
    loadAchievements();
    loadLocationChallenges();
  }, []);

  const loadGames = () => {
    // Demo games data
    const demoGames: Game[] = [
      {
        id: '1',
        title: 'Family Mafia',
        description: 'Classic Mafia game with AI-generated storylines and family-friendly themes',
        type: 'mafia',
        minPlayers: 4,
        maxPlayers: 12,
        estimatedDuration: '30-45 min',
        difficulty: 'medium',
        isActive: true,
        thumbnail: '/game-mafia.jpg'
      },
      {
        id: '2',
        title: 'Dubai Explorer',
        description: 'Location-based challenges around Dubai landmarks',
        type: 'location',
        minPlayers: 2,
        maxPlayers: 8,
        estimatedDuration: '1-2 hours',
        difficulty: 'easy',
        isActive: true,
        thumbnail: '/game-location.jpg'
      },
      {
        id: '3',
        title: 'Family Trivia Night',
        description: 'Test your knowledge about your family history and each other',
        type: 'trivia',
        minPlayers: 2,
        maxPlayers: 10,
        estimatedDuration: '20-30 min',
        difficulty: 'easy',
        isActive: true,
        thumbnail: '/game-trivia.jpg'
      },
      {
        id: '4',
        title: 'Photo Scavenger Hunt',
        description: 'Find and photograph items or complete tasks around your location',
        type: 'challenge',
        minPlayers: 2,
        maxPlayers: 6,
        estimatedDuration: '45-60 min',
        difficulty: 'hard',
        isActive: true,
        thumbnail: '/game-scavenger.jpg'
      }
    ];
    setGames(demoGames);
  };

  const loadPlayerStats = () => {
    // Demo player stats
    setPlayerStats({
      totalGamesPlayed: 15,
      gamesWon: 8,
      totalScore: 2450,
      rank: 'Champion',
      streakCount: 3
    });
  };

  const loadAchievements = () => {
    // Demo achievements
    const demoAchievements: Achievement[] = [
      {
        id: '1',
        title: 'First Victory',
        description: 'Win your first game',
        icon: '🏆',
        rarity: 'common',
        unlockedBy: ['player1'],
        points: 100
      },
      {
        id: '2',
        title: 'Mafia Master',
        description: 'Win 5 Mafia games',
        icon: '🕵️',
        rarity: 'rare',
        unlockedBy: ['player1'],
        points: 500
      },
      {
        id: '3',
        title: 'Explorer',
        description: 'Complete 10 location challenges',
        icon: '🗺️',
        rarity: 'epic',
        unlockedBy: [],
        points: 1000
      },
      {
        id: '4',
        title: 'Family Legend',
        description: 'Reach a 10-game winning streak',
        icon: '👑',
        rarity: 'legendary',
        unlockedBy: [],
        points: 2500
      }
    ];
    setAchievements(demoAchievements);
  };

  const loadLocationChallenges = () => {
    // Demo location challenges
    const demoChallenges: LocationChallenge[] = [
      {
        id: '1',
        title: 'Burj Khalifa Photo',
        description: 'Take a family photo with Burj Khalifa in the background',
        location: {
          lat: 25.1972,
          lng: 55.2744,
          name: 'Burj Khalifa',
          radius: 500
        },
        task: 'Take a creative family photo',
        hint: 'Try the observation deck for the best views!',
        timeLimit: 3600,
        points: 200,
        completedBy: ['Dad', 'Sarah']
      },
      {
        id: '2',
        title: 'Dubai Mall Adventure',
        description: 'Find 5 different cultural artifacts in Dubai Mall',
        location: {
          lat: 25.1975,
          lng: 55.2796,
          name: 'Dubai Mall',
          radius: 300
        },
        task: 'Photograph cultural items from different countries',
        timeLimit: 7200,
        points: 300,
        completedBy: []
      }
    ];
    setLocationChallenges(demoChallenges);
  };

  const startMafiaGame = () => {
    const players: MafiaPlayer[] = [
      { id: '1', name: 'Dad', role: 'citizen', isAlive: true, score: 0, achievements: [], votes: [] },
      { id: '2', name: 'Mom', role: 'detective', isAlive: true, score: 0, achievements: [], votes: [] },
      { id: '3', name: 'Sarah', role: 'mafia', isAlive: true, score: 0, achievements: [], votes: [] },
      { id: '4', name: 'Ahmed', role: 'doctor', isAlive: true, score: 0, achievements: [], votes: [] }
    ];

    const newMafiaGame: MafiaGame = {
      phase: 'setup',
      players,
      round: 1,
      narrator: 'AI Game Master',
      votes: {},
      eliminations: []
    };

    setMafiaGame(newMafiaGame);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getGameIcon = (type: string) => {
    switch (type) {
      case 'mafia': return <Eye className="h-5 w-5" />;
      case 'location': return <MapPin className="h-5 w-5" />;
      case 'trivia': return <Brain className="h-5 w-5" />;
      case 'challenge': return <Target className="h-5 w-5" />;
      default: return <Gamepad2 className="h-5 w-5" />;
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'from-gray-400 to-gray-600';
      case 'rare': return 'from-blue-400 to-blue-600';
      case 'epic': return 'from-purple-400 to-purple-600';
      case 'legendary': return 'from-yellow-400 to-yellow-600';
      default: return 'from-gray-400 to-gray-600';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'mafia': return <Sword className="h-4 w-4 text-red-600" />;
      case 'detective': return <Eye className="h-4 w-4 text-blue-600" />;
      case 'doctor': return <Heart className="h-4 w-4 text-green-600" />;
      case 'citizen': return <Shield className="h-4 w-4 text-gray-600" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  const calculateWinRate = () => {
    return playerStats.totalGamesPlayed > 0 
      ? ((playerStats.gamesWon / playerStats.totalGamesPlayed) * 100).toFixed(1)
      : '0';
  };

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
                Family Gaming Hub
              </h1>
              <Badge variant="secondary" className="flex items-center space-x-1">
                <Flame className="h-3 w-3" />
                <span>Streak: {playerStats.streakCount}</span>
              </Badge>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm font-medium">{playerStats.rank}</p>
                <p className="text-xs text-gray-500">{playerStats.totalScore} points</p>
              </div>
              <Button variant="outline" size="sm">
                <Trophy className="h-4 w-4 mr-2" />
                Leaderboard
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {!selectedGame && !currentSession && !mafiaGame ? (
          <>
            {/* Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm font-medium">Games Played</p>
                      <p className="text-3xl font-bold">{playerStats.totalGamesPlayed}</p>
                    </div>
                    <Gamepad2 className="h-8 w-8 text-blue-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm font-medium">Win Rate</p>
                      <p className="text-3xl font-bold">{calculateWinRate()}%</p>
                    </div>
                    <Trophy className="h-8 w-8 text-green-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm font-medium">Total Score</p>
                      <p className="text-3xl font-bold">{playerStats.totalScore.toLocaleString()}</p>
                    </div>
                    <Star className="h-8 w-8 text-purple-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-pink-500 to-pink-600 text-white border-0">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-pink-100 text-sm font-medium">Achievements</p>
                      <p className="text-3xl font-bold">{achievements.filter(a => a.unlockedBy.length > 0).length}</p>
                    </div>
                    <Award className="h-8 w-8 text-pink-200" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Games</TabsTrigger>
                <TabsTrigger value="achievements">Achievements</TabsTrigger>
                <TabsTrigger value="challenges">Challenges</TabsTrigger>
                <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {games.map((game) => (
                    <Card key={game.id} className="group hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedGame(game)}>
                      <CardContent className="p-0">
                        {/* Game Thumbnail */}
                        <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 rounded-t-lg flex items-center justify-center relative overflow-hidden">
                          {game.thumbnail ? (
                            <img src={game.thumbnail} alt={game.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-center">
                              {getGameIcon(game.type)}
                              <p className="text-sm font-medium text-gray-600 mt-2">{game.type}</p>
                            </div>
                          )}
                          <div className="absolute top-2 left-2">
                            <Badge className={`${getDifficultyColor(game.difficulty)} text-xs`}>
                              {game.difficulty}
                            </Badge>
                          </div>
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="secondary" size="sm">
                              <Play className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        {/* Game Info */}
                        <div className="p-4">
                          <h3 className="font-semibold text-lg mb-2">{game.title}</h3>
                          <p className="text-gray-600 text-sm mb-3 line-clamp-2">{game.description}</p>
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span className="flex items-center">
                                <Users className="h-3 w-3 mr-1" />
                                {game.minPlayers}-{game.maxPlayers} players
                              </span>
                              <span className="flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                {game.estimatedDuration}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="achievements" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {achievements.map((achievement) => (
                    <Card key={achievement.id} className={`relative overflow-hidden ${
                      achievement.unlockedBy.length > 0 ? 'bg-gradient-to-r from-yellow-50 to-yellow-100' : 'bg-gray-50'
                    }`}>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-4">
                          <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${getRarityColor(achievement.rarity)} flex items-center justify-center text-2xl relative`}>
                            {achievement.icon}
                            {achievement.unlockedBy.length > 0 && (
                              <CheckCircle className="absolute -top-1 -right-1 h-6 w-6 text-green-500 bg-white rounded-full" />
                            )}
                          </div>
                          
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{achievement.title}</h3>
                            <p className="text-gray-600 text-sm mb-2">{achievement.description}</p>
                            
                            <div className="flex items-center justify-between">
                              <Badge className={`bg-gradient-to-r ${getRarityColor(achievement.rarity)} text-white text-xs`}>
                                {achievement.rarity}
                              </Badge>
                              <span className="text-sm font-medium text-gray-700">
                                {achievement.points} points
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {achievement.unlockedBy.length === 0 && (
                          <div className="absolute inset-0 bg-gray-500/20 flex items-center justify-center">
                            <div className="text-center">
                              <span className="text-4xl">🔒</span>
                              <p className="text-sm text-gray-600 mt-1">Locked</p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="challenges" className="space-y-6">
                <div className="space-y-4">
                  {locationChallenges.map((challenge) => (
                    <Card key={challenge.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-4">
                            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg flex items-center justify-center">
                              <MapPin className="h-6 w-6 text-white" />
                            </div>
                            
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg mb-1">{challenge.title}</h3>
                              <p className="text-gray-600 mb-2">{challenge.description}</p>
                              
                              <div className="flex items-center space-x-4 text-sm text-gray-500 mb-2">
                                <span className="flex items-center">
                                  <MapPin className="h-4 w-4 mr-1" />
                                  {challenge.location.name}
                                </span>
                                <span className="flex items-center">
                                  <Timer className="h-4 w-4 mr-1" />
                                  {Math.floor(challenge.timeLimit / 60)} min
                                </span>
                                <span className="flex items-center">
                                  <Star className="h-4 w-4 mr-1" />
                                  {challenge.points} points
                                </span>
                              </div>
                              
                              <div className="bg-blue-50 p-3 rounded-lg mb-3">
                                <p className="text-sm"><strong>Task:</strong> {challenge.task}</p>
                                {challenge.hint && (
                                  <p className="text-sm text-blue-600 mt-1"><strong>Hint:</strong> {challenge.hint}</p>
                                )}
                              </div>
                              
                              {challenge.completedBy.length > 0 && (
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm text-gray-600">Completed by:</span>
                                  {challenge.completedBy.map((name, index) => (
                                    <Badge key={index} variant="secondary" className="text-xs">
                                      {name}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-right">
                            {challenge.completedBy.length > 0 ? (
                              <Badge variant="default" className="bg-green-500">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Completed
                              </Badge>
                            ) : (
                              <Button size="sm">
                                <Target className="h-4 w-4 mr-2" />
                                Start Challenge
                              </Button>
                            )}
                          </div>
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
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        { rank: 1, name: 'Dad', score: 2450, games: 15, wins: 8, badge: '👑' },
                        { rank: 2, name: 'Sarah', score: 2100, games: 12, wins: 7, badge: '🥈' },
                        { rank: 3, name: 'Mom', score: 1890, games: 14, wins: 6, badge: '🥉' },
                        { rank: 4, name: 'Ahmed', score: 1650, games: 10, wins: 4, badge: '' }
                      ].map((player) => (
                        <div key={player.rank} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl font-bold text-gray-400">#{player.rank}</span>
                            {player.badge && <span className="text-2xl">{player.badge}</span>}
                          </div>
                          
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={`/avatar-${player.name.toLowerCase()}.jpg`} />
                            <AvatarFallback>{player.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{player.name}</h3>
                            <p className="text-sm text-gray-600">
                              {player.games} games • {player.wins} wins • {((player.wins / player.games) * 100).toFixed(1)}% win rate
                            </p>
                          </div>
                          
                          <div className="text-right">
                            <p className="text-2xl font-bold">{player.score.toLocaleString()}</p>
                            <p className="text-sm text-gray-600">points</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        ) : selectedGame ? (
          /* Game Setup Screen */
          <div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedGame(null)} className="mb-6">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Games
            </Button>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-3">
                      {getGameIcon(selectedGame.type)}
                      <span>{selectedGame.title}</span>
                      <Badge className={getDifficultyColor(selectedGame.difficulty)}>
                        {selectedGame.difficulty}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-6">{selectedGame.description}</p>
                    
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-blue-50 p-4 rounded-lg text-center">
                        <Users className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                        <p className="font-semibold">{selectedGame.minPlayers}-{selectedGame.maxPlayers} Players</p>
                        <p className="text-sm text-gray-600">Recommended</p>
                      </div>
                      <div className="bg-purple-50 p-4 rounded-lg text-center">
                        <Clock className="h-8 w-8 mx-auto text-purple-600 mb-2" />
                        <p className="font-semibold">{selectedGame.estimatedDuration}</p>
                        <p className="text-sm text-gray-600">Duration</p>
                      </div>
                    </div>
                    
                    {selectedGame.type === 'mafia' && (
                      <div className="space-y-4">
                        <h3 className="font-semibold text-lg">How to Play Mafia</h3>
                        <div className="space-y-2 text-sm text-gray-600">
                          <p>• Players are secretly assigned roles: Mafia, Citizens, Detective, and Doctor</p>
                          <p>• The goal for Citizens is to eliminate all Mafia members</p>
                          <p>• The goal for Mafia is to eliminate all Citizens</p>
                          <p>• Game alternates between Day (discussion) and Night (secret actions)</p>
                          <p>• AI Game Master will guide the story and provide clues</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mt-4">
                          {[
                            { role: 'Mafia', icon: <Sword className="h-4 w-4" />, desc: 'Eliminate citizens at night' },
                            { role: 'Detective', icon: <Eye className="h-4 w-4" />, desc: 'Investigate players each night' },
                            { role: 'Doctor', icon: <Heart className="h-4 w-4" />, desc: 'Save one player each night' },
                            { role: 'Citizen', icon: <Shield className="h-4 w-4" />, desc: 'Vote to eliminate suspects' }
                          ].map((role) => (
                            <div key={role.role} className="bg-gray-50 p-3 rounded-lg">
                              <div className="flex items-center space-x-2 mb-1">
                                {role.icon}
                                <span className="font-medium text-sm">{role.role}</span>
                              </div>
                              <p className="text-xs text-gray-600">{role.desc}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
              
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>Start Game</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Select Players</label>
                      <div className="space-y-2">
                        {['Dad', 'Mom', 'Sarah', 'Ahmed'].map((player) => (
                          <div key={player} className="flex items-center space-x-2">
                            <input type="checkbox" id={player} defaultChecked className="rounded" />
                            <label htmlFor={player} className="flex items-center space-x-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">{player.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{player}</span>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <Button 
                      className="w-full" 
                      onClick={() => {
                        if (selectedGame.type === 'mafia') {
                          startMafiaGame();
                        }
                      }}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Start {selectedGame.title}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        ) : mafiaGame ? (
          /* Mafia Game Interface */
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <Button variant="ghost" size="sm" onClick={() => setMafiaGame(null)}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Exit Game
                </Button>
                <h2 className="text-2xl font-bold">Mafia Game - Round {mafiaGame.round}</h2>
                <Badge className="bg-blue-500 text-white">
                  {mafiaGame.phase.charAt(0).toUpperCase() + mafiaGame.phase.slice(1)} Phase
                </Badge>
              </div>
              
              <div className="flex space-x-2">
                <Button variant="outline" size="sm">
                  <Pause className="h-4 w-4 mr-1" />
                  Pause
                </Button>
                <Button variant="outline" size="sm">
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Restart
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Game Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <p className="font-medium">🤖 AI Game Master says:</p>
                        <p className="text-sm mt-1">
                          {mafiaGame.phase === 'setup' && "Welcome to Mafia! I'm assigning roles now. Check your role card!"}
                          {mafiaGame.phase === 'day' && "The town awakens! Discuss who you think might be the mafia."}
                          {mafiaGame.phase === 'night' && "Night falls... Mafia, choose your target. Detective, choose who to investigate. Doctor, choose who to save."}
                          {mafiaGame.phase === 'voting' && "Time to vote! Choose who you want to eliminate."}
                        </p>
                      </div>
                      
                      {mafiaGame.lastAction && (
                        <div className="bg-red-50 p-4 rounded-lg">
                          <p className="font-medium">📰 News Flash:</p>
                          <p className="text-sm mt-1">{mafiaGame.lastAction}</p>
                        </div>
                      )}
                      
                      <div className="flex space-x-4">
                        <Button 
                          className="flex-1" 
                          onClick={() => {
                            // Advance game phase logic
                            const nextPhase = mafiaGame.phase === 'day' ? 'night' : 
                                            mafiaGame.phase === 'night' ? 'voting' : 'day';
                            setMafiaGame({
                              ...mafiaGame,
                              phase: nextPhase as any,
                              lastAction: 'The phase has changed!'
                            });
                          }}
                        >
                          Next Phase
                        </Button>
                        
                        {mafiaGame.phase === 'voting' && (
                          <Button variant="outline" className="flex-1">
                            <Vote className="h-4 w-4 mr-2" />
                            Cast Vote
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>Players</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {mafiaGame.players.map((player) => (
                        <div key={player.id} className={`p-3 rounded-lg border ${
                          player.isAlive ? 'bg-white' : 'bg-gray-100 opacity-60'
                        }`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback>{player.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-sm">{player.name}</p>
                                <div className="flex items-center space-x-1">
                                  {getRoleIcon(player.role)}
                                  <span className="text-xs text-gray-500">{player.role}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              {player.isAlive ? (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                              ) : (
                                <XCircle className="h-5 w-5 text-red-500" />
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        ) : null}

        {/* Empty State */}
        {games.length === 0 && (
          <div className="text-center py-12">
            <Gamepad2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No games available</h3>
            <p className="text-gray-600 mb-6">Check back later for exciting family games!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GamingPage; 