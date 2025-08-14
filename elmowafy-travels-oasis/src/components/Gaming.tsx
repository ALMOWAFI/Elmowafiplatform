import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Copy, Users, Play, LogOut, Gamepad2, Crown, Clock, AlertCircle, Target, MapPin, Trophy, Navigation } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

interface GameSession {
  session_id: string;
  join_code: string;
  game_type: string;
  status: 'waiting' | 'active' | 'finished';
  created_at: string;
}

interface GameState {
  players: Array<{
    id: string;
    name: string;
    role?: string;
    is_alive: boolean;
  }>;
  current_phase: string;
  winner?: string;
  round: number;
  max_rounds: number;
}

interface LocationChallenge {
  id: string;
  challenge_name: string;
  target_location: string;
  target_latitude: number;
  target_longitude: number;
  challenge_type: string;
  points_reward: number;
  time_limit_minutes: number;
  verification_radius: number;
  status: 'active' | 'completed' | 'expired';
  created_at: string;
}

const Gaming: React.FC = () => {
  const { language, isRTL } = useLanguage();
  const isArabic = language === 'ar';
  const [gameSession, setGameSession] = useState<GameSession | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [joinSessionId, setJoinSessionId] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationChallenges, setLocationChallenges] = useState<LocationChallenge[]>([]);
  const [loadingChallenges, setLoadingChallenges] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);

  // Get user location for challenge verification
  useEffect(() => {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => toast.error(isArabic ? 'تم رفض إذن الموقع' : 'Location permission denied'),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [isArabic]);

  // Fetch location challenges
  useEffect(() => {
    const fetchChallenges = async () => {
      setLoadingChallenges(true);
      try {
        // For demo purposes, we'll use a mock session ID
        // In real app, this would be the actual game session ID
        const mockSessionId = 'demo_session_123';
        const response = await fetch(`http://localhost:8000/api/games/${mockSessionId}/location/challenges`);
        
        if (response.ok) {
          const data = await response.json();
          setLocationChallenges(data.challenges || []);
        } else if (response.status === 404) {
          // No challenges found, that's okay
          setLocationChallenges([]);
        }
      } catch (error) {
        console.error('Failed to fetch location challenges:', error);
        // For demo, show some mock challenges
        setLocationChallenges([
          {
            id: '1',
            challenge_name: isArabic ? 'مطاردة الكنز في الحديقة' : 'Park Treasure Hunt',
            target_location: isArabic ? 'الحديقة المركزية' : 'Central Park',
            target_latitude: 40.7829,
            target_longitude: -73.9654,
            challenge_type: 'reach_point',
            points_reward: 150,
            time_limit_minutes: 60,
            verification_radius: 50,
            status: 'active',
            created_at: new Date().toISOString()
          }
        ]);
      } finally {
        setLoadingChallenges(false);
      }
    };

    fetchChallenges();
  }, [isArabic]);

  // Poll game state when a session exists
  useEffect(() => {
    if (!gameSession?.session_id) return;
    
    let active = true;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/v1/games/${gameSession.session_id}/state`);
        if (!res.ok) {
          if (res.status === 404) {
            // Game session expired or deleted
            toast.error(isArabic ? 'انتهت صلاحية جلسة اللعبة' : 'Game session expired');
            setGameSession(null);
            setGameState(null);
            return;
          }
          return;
        }
        const data = await res.json();
        if (active) {
          setGameState(data);
          setError(null);
        }
      } catch (err) {
        if (active) {
          console.error('Failed to fetch game state:', err);
          setError(isArabic ? 'فشل في تحديث حالة اللعبة' : 'Failed to update game state');
        }
      }
    }, 2000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [gameSession?.session_id, isArabic]);

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const createMafiaGame = async () => {
    if (!playerName.trim()) {
      toast.error(isArabic ? 'يرجى إدخال اسم اللاعب' : 'Please enter player name');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:8000/api/v1/games/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_type: 'mafia',
          host_name: playerName,
          max_players: 8
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create game');
      }

      const data = await response.json();
      setGameSession({
        session_id: data.session_id,
        join_code: data.join_code,
        game_type: 'mafia',
        status: 'waiting',
        created_at: new Date().toISOString()
      });
      
      toast.success(isArabic ? 'تم إنشاء لعبة المافيا!' : 'Mafia game created!');
    } catch (err: any) {
      console.error('Failed to create game:', err);
      setError(err.message || (isArabic ? 'فشل في إنشاء اللعبة' : 'Failed to create game'));
    } finally {
      setIsLoading(false);
    }
  };

  const joinGame = async () => {
    if (!playerName.trim() || !joinSessionId.trim()) {
      toast.error(isArabic ? 'يرجى إدخال اسم اللاعب ورمز الانضمام' : 'Please enter player name and join code');
      return;
    }

    setIsJoining(true);
    setError(null);
    
    try {
      const response = await fetch(`http://localhost:8000/api/v1/games/${joinSessionId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_name: playerName
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 404) {
          throw new Error(isArabic ? 'رمز الانضمام غير صحيح' : 'Invalid join code');
        } else if (response.status === 400) {
          throw new Error(isArabic ? 'اللعبة ممتلئة أو بدأت بالفعل' : 'Game is full or already started');
        }
        throw new Error(errorData.detail || 'Failed to join game');
      }

      const data = await response.json();
      setGameSession({
        session_id: data.session_id,
        join_code: data.join_code,
        game_type: data.game_type,
        status: data.status,
        created_at: data.created_at
      });
      
      toast.success(isArabic ? 'تم الانضمام للعبة!' : 'Joined the game!');
    } catch (err: any) {
      console.error('Failed to join game:', err);
      setError(err.message || (isArabic ? 'فشل في الانضمام للعبة' : 'Failed to join game'));
    } finally {
      setIsJoining(false);
    }
  };

  const startGame = async () => {
    if (!gameSession?.session_id) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/api/v1/games/${gameSession.session_id}/start`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to start game');
      }

      toast.success(isArabic ? 'اللعبة بدأت!' : 'Game started!');
    } catch (err) {
      console.error('Failed to start game:', err);
      toast.error(isArabic ? 'فشل في بدء اللعبة' : 'Failed to start game');
    } finally {
      setIsLoading(false);
    }
  };

  const copyJoinCode = async () => {
    try {
      await navigator.clipboard.writeText(gameSession?.join_code || '');
      setCopySuccess(true);
      toast.success(isArabic ? 'تم نسخ رمز الانضمام' : 'Join code copied');
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      toast.error(isArabic ? 'فشل في نسخ الرمز' : 'Failed to copy code');
    }
  };

  const leaveGame = () => {
    setGameSession(null);
    setGameState(null);
    setError(null);
    toast.success(isArabic ? 'تم مغادرة اللعبة' : 'Left game');
  };

  const getPlayerCount = () => {
    return gameState?.players?.length || 0;
  };

  const canStartGame = () => {
    const playerCount = getPlayerCount();
    return playerCount >= 4 && playerCount <= 8 && gameSession?.status === 'waiting';
  };

  const getGameStatusText = () => {
    if (!gameState) return isArabic ? 'في انتظار اللاعبين...' : 'Waiting for players...';
    
    switch (gameState.current_phase) {
      case 'night':
        return isArabic ? 'الليل - دور المافيا' : 'Night - Mafia\'s turn';
      case 'day':
        return isArabic ? 'النهار - مناقشة' : 'Day - Discussion';
      case 'voting':
        return isArabic ? 'التصويت' : 'Voting';
      default:
        return gameState.current_phase;
    }
  };

  const startLocationChallenge = (challenge: LocationChallenge) => {
    if (!userLocation) {
      toast.error(isArabic ? 'مطلوب إذن الموقع لبدء التحدي' : 'Location permission required to start challenge');
      return;
    }
    
    // Navigate to activities page to start the challenge
    window.location.href = `/activities?challenge=${challenge.id}`;
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Location Challenges Section */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              {isArabic ? 'التحديات القائمة على الموقع' : 'Location-Based Challenges'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingChallenges ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-muted-foreground mt-2">
                  {isArabic ? 'جاري تحميل التحديات...' : 'Loading challenges...'}
                </p>
              </div>
            ) : locationChallenges.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {locationChallenges.map((challenge) => {
                  const distance = userLocation ? 
                    calculateDistance(userLocation.lat, userLocation.lon, challenge.target_latitude, challenge.target_longitude) : 
                    null;
                  
                  return (
                    <div key={challenge.id} className="p-4 border rounded-lg bg-card hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-600">
                            {challenge.challenge_type.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Trophy className="w-3 h-3" />
                          <span>{challenge.points_reward}</span>
                        </div>
                      </div>
                      
                      <h3 className="font-semibold mb-2">{challenge.challenge_name}</h3>
                      <p className="text-sm text-muted-foreground mb-3">{challenge.target_location}</p>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>{challenge.time_limit_minutes} {isArabic ? 'دقيقة' : 'min'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          <span>{challenge.verification_radius}m {isArabic ? 'نصف قطر' : 'radius'}</span>
                        </div>
                        {distance !== null && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Navigation className="w-3 h-3" />
                            <span>{distance.toFixed(1)}km {isArabic ? 'بعيد' : 'away'}</span>
                          </div>
                        )}
                      </div>
                      
                      <Button 
                        onClick={() => startLocationChallenge(challenge)}
                        size="sm"
                        className="w-full"
                        disabled={challenge.status !== 'active'}
                      >
                        {challenge.status === 'active' 
                          ? (isArabic ? 'ابدأ التحدي' : 'Start Challenge')
                          : (isArabic ? 'مكتمل' : 'Completed')
                        }
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Target className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  {isArabic ? 'لا توجد تحديات نشطة حالياً' : 'No active challenges at the moment'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {isArabic ? 'انتقل إلى صفحة الأنشطة لإنشاء تحديات جديدة' : 'Go to Activities page to create new challenges'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Traditional Gaming Section */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gamepad2 className="w-6 h-6" />
              {isArabic ? 'مركز الألعاب التفاعلي' : 'Interactive Gaming Hub'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!gameSession ? (
              // Create/Join Game Form
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {isArabic ? 'اسم اللاعب:' : 'Player Name:'}
                    </label>
                    <Input
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      placeholder={isArabic ? 'أدخل اسمك' : 'Enter your name'}
                      maxLength={20}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {isArabic ? 'رمز الانضمام (اختياري):' : 'Join Code (optional):'}
                    </label>
                    <Input
                      value={joinSessionId}
                      onChange={(e) => setJoinSessionId(e.target.value)}
                      placeholder={isArabic ? 'رمز الانضمام' : 'Join code'}
                      maxLength={8}
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={createMafiaGame}
                    disabled={isLoading || !playerName.trim()}
                    className="flex-1"
                  >
                    {isLoading ? (isArabic ? 'جاري الإنشاء...' : 'Creating...') : (isArabic ? 'إنشاء لعبة مافيا' : 'Create Mafia Game')}
                  </Button>
                  
                  <Button
                    onClick={joinGame}
                    disabled={isJoining || !playerName.trim() || !joinSessionId.trim()}
                    variant="outline"
                    className="flex-1"
                  >
                    {isJoining ? (isArabic ? 'جاري الانضمام...' : 'Joining...') : (isArabic ? 'انضم للعبة' : 'Join Game')}
                  </Button>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-destructive" />
                    <span className="text-sm text-destructive">{error}</span>
                  </div>
                )}
              </div>
            ) : (
              // Active Game Session
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {isArabic ? 'رمز الانضمام:' : 'Join Code:'}
                      </span>
                      <code className="px-2 py-1 bg-background rounded text-sm font-mono">
                        {gameSession.join_code}
                      </code>
                      <Button
                        onClick={copyJoinCode}
                        variant="ghost"
                        size="sm"
                        className={copySuccess ? 'text-green-600' : ''}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {isArabic ? 'شارك هذا الرمز مع العائلة للانضمام' : 'Share this code with family to join'}
                    </div>
                  </div>
                  
                  <Button onClick={leaveGame} variant="outline" size="sm">
                    <LogOut className="w-4 h-4 mr-2" />
                    {isArabic ? 'مغادرة' : 'Leave'}
                  </Button>
                </div>

                {/* Game Status */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2 p-3 bg-card border rounded-lg">
                    <Users className="w-4 h-4 text-blue-600" />
                    <div>
                      <div className="text-sm text-muted-foreground">
                        {isArabic ? 'اللاعبون' : 'Players'}
                      </div>
                      <div className="font-semibold">{getPlayerCount()}/8</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 p-3 bg-card border rounded-lg">
                    <Clock className="w-4 h-4 text-orange-600" />
                    <div>
                      <div className="text-sm text-muted-foreground">
                        {isArabic ? 'الحالة' : 'Status'}
                      </div>
                      <div className="font-semibold">{getGameStatusText()}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 p-3 bg-card border rounded-lg">
                    <Gamepad2 className="w-4 h-4 text-green-600" />
                    <div>
                      <div className="text-sm text-muted-foreground">
                        {isArabic ? 'النوع' : 'Type'}
                      </div>
                      <div className="font-semibold capitalize">{gameSession.game_type}</div>
                    </div>
                  </div>
                </div>

                {/* Start Game Button */}
                {canStartGame() && (
                  <Button
                    onClick={startGame}
                    disabled={isLoading}
                    className="w-full"
                    size="lg"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    {isLoading ? (isArabic ? 'جاري البدء...' : 'Starting...') : (isArabic ? `ابدأ اللعبة (${getPlayerCount()} لاعبين)` : `Start Game (${getPlayerCount()} players)`)}
                  </Button>
                )}

                {/* Player List */}
                {gameState?.players && gameState.players.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-medium">
                      {isArabic ? 'قائمة اللاعبين:' : 'Players:'}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {gameState.players.map((player) => (
                        <div
                          key={player.id}
                          className={`flex items-center gap-2 p-2 rounded-lg border ${
                            player.is_alive ? 'bg-card' : 'bg-muted/50 opacity-60'
                          }`}
                        >
                          <div className={`w-2 h-2 rounded-full ${
                            player.is_alive ? 'bg-green-500' : 'bg-red-500'
                          }`} />
                          <span className="font-medium">{player.name}</span>
                          {player.role && (
                            <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                              {player.role}
                            </span>
                          )}
                          {player.id === gameSession.session_id && (
                            <Crown className="w-4 h-4 text-yellow-600" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Game Phase Info */}
                {gameState && (
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">
                        {isArabic ? 'معلومات اللعبة:' : 'Game Info:'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {isArabic ? `الجولة ${gameState.round}/${gameState.max_rounds}` : `Round ${gameState.round}/${gameState.max_rounds}`}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {isArabic ? 'ستبدأ اللعبة عندما يضغط المضيف على "ابدأ اللعبة"' : 'Game will start when host presses "Start Game"'}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Gaming;
