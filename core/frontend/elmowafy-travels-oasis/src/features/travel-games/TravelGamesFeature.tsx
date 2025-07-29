import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, Trophy, MapPin, Puzzle, Timer, Star, Plus, Edit, Trash2 } from 'lucide-react';

// Types for the feature
interface TeamMember {
  id: string;
  name: string;
  avatar?: string;
  points: number;
}

interface Team {
  id: string;
  name: string;
  members: TeamMember[];
  color: string;
  totalPoints: number;
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  location?: string;
  points: number;
  type: 'puzzle' | 'hunt' | 'game' | 'activity';
  status: 'active' | 'completed' | 'upcoming';
  createdBy: string;
  assignedTeams?: string[];
}

/**
 * TravelGamesFeature component for creating teams, challenges, and tracking points
 * during family trips
 */
export const TravelGamesFeature: React.FC = () => {
  const { language } = useLanguage();
  const isArabic = language === 'ar';
  
  // State for teams, challenges, and active tab
  const [activeTab, setActiveTab] = useState('teams');
  const [teams, setTeams] = useState<Team[]>([
    {
      id: '1',
      name: 'Team Explorers',
      members: [
        { id: '1', name: 'Ahmed', points: 120, avatar: '/avatars/ahmed.jpg' },
        { id: '2', name: 'Sara', points: 85, avatar: '/avatars/sara.jpg' },
      ],
      color: 'bg-blue-500',
      totalPoints: 205
    },
    {
      id: '2',
      name: 'Adventure Squad',
      members: [
        { id: '3', name: 'Mohamed', points: 150, avatar: '/avatars/mohamed.jpg' },
        { id: '4', name: 'Layla', points: 95, avatar: '/avatars/layla.jpg' },
      ],
      color: 'bg-green-500',
      totalPoints: 245
    }
  ]);
  
  const [challenges, setChallenges] = useState<Challenge[]>([
    {
      id: '1',
      title: 'City Landmark Hunt',
      description: 'Find and take photos of 5 famous landmarks in the city.',
      location: 'Downtown',
      points: 100,
      type: 'hunt',
      status: 'active',
      createdBy: 'Uncle Khaled',
      assignedTeams: ['1', '2']
    },
    {
      id: '2',
      title: 'Mystery Puzzle',
      description: 'Solve the riddle to find the hidden treasure in the hotel.',
      location: 'Hotel',
      points: 75,
      type: 'puzzle',
      status: 'upcoming',
      createdBy: 'Aunt Fatima',
      assignedTeams: ['1']
    },
    {
      id: '3',
      title: 'Family Mafia Game',
      description: 'Evening entertainment with a classic Mafia game with family twists.',
      location: 'Beach',
      points: 50,
      type: 'game',
      status: 'upcoming',
      createdBy: 'Cousin Omar',
      assignedTeams: ['1', '2']
    }
  ]);
  
  // State for new team and challenge forms
  const [newTeam, setNewTeam] = useState({ name: '', color: 'bg-blue-500' });
  const [newChallenge, setNewChallenge] = useState({
    title: '',
    description: '',
    location: '',
    points: 50,
    type: 'hunt' as const,
  });
  
  // Handle creating a new team
  const handleCreateTeam = () => {
    if (!newTeam.name) return;
    
    const team: Team = {
      id: Date.now().toString(),
      name: newTeam.name,
      members: [],
      color: newTeam.color,
      totalPoints: 0
    };
    
    setTeams([...teams, team]);
    setNewTeam({ name: '', color: 'bg-blue-500' });
  };
  
  // Handle creating a new challenge
  const handleCreateChallenge = () => {
    if (!newChallenge.title || !newChallenge.description) return;
    
    const challenge: Challenge = {
      id: Date.now().toString(),
      title: newChallenge.title,
      description: newChallenge.description,
      location: newChallenge.location,
      points: newChallenge.points,
      type: newChallenge.type,
      status: 'upcoming',
      createdBy: 'You', // In a real app, this would be the current user
      assignedTeams: []
    };
    
    setChallenges([...challenges, challenge]);
    setNewChallenge({
      title: '',
      description: '',
      location: '',
      points: 50,
      type: 'hunt' as const,
    });
  };
  
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.4
      }
    }
  };
  
  // Get challenge type icon
  const getChallengeTypeIcon = (type: Challenge['type']) => {
    switch (type) {
      case 'puzzle':
        return <Puzzle className="h-5 w-5" />;
      case 'hunt':
        return <MapPin className="h-5 w-5" />;
      case 'game':
        return <Users className="h-5 w-5" />;
      case 'activity':
        return <Star className="h-5 w-5" />;
      default:
        return <Star className="h-5 w-5" />;
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className={isArabic ? 'font-noto' : ''}>
          {isArabic ? 'ألعاب وتحديات الرحلات العائلية' : 'Family Travel Games & Challenges'}
        </CardTitle>
        <CardDescription className={isArabic ? 'font-noto' : ''}>
          {isArabic 
            ? 'أنشئ فرقًا، وضع تحديات، وتتبع النقاط خلال رحلاتك العائلية'
            : 'Create teams, set challenges, and track points during your family trips'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="teams" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 mb-6">
            <TabsTrigger value="teams" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>{isArabic ? 'الفرق' : 'Teams'}</span>
            </TabsTrigger>
            <TabsTrigger value="challenges" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              <span>{isArabic ? 'التحديات' : 'Challenges'}</span>
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              <span>{isArabic ? 'لوحة المتصدرين' : 'Leaderboard'}</span>
            </TabsTrigger>
          </TabsList>
          
          {/* Teams Tab */}
          <TabsContent value="teams">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-6"
            >
              {/* Create New Team */}
              <motion.div variants={itemVariants} className="bg-muted p-4 rounded-lg">
                <h3 className="text-lg font-medium mb-3">
                  {isArabic ? 'إنشاء فريق جديد' : 'Create New Team'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label htmlFor="team-name">
                      {isArabic ? 'اسم الفريق' : 'Team Name'}
                    </Label>
                    <Input
                      id="team-name"
                      value={newTeam.name}
                      onChange={(e) => setNewTeam({...newTeam, name: e.target.value})}
                      placeholder={isArabic ? 'أدخل اسم الفريق' : 'Enter team name'}
                    />
                  </div>
                  <div>
                    <Label htmlFor="team-color">
                      {isArabic ? 'لون الفريق' : 'Team Color'}
                    </Label>
                    <div className="flex space-x-2">
                      {['bg-blue-500', 'bg-green-500', 'bg-red-500', 'bg-purple-500', 'bg-yellow-500'].map(color => (
                        <button
                          key={color}
                          className={`w-8 h-8 rounded-full ${color} ${newTeam.color === color ? 'ring-2 ring-offset-2 ring-primary' : ''}`}
                          onClick={() => setNewTeam({...newTeam, color})}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <Button onClick={handleCreateTeam}>
                  <Plus className="h-4 w-4 mr-2" />
                  {isArabic ? 'إنشاء فريق' : 'Create Team'}
                </Button>
              </motion.div>
              
              {/* Team List */}
              <motion.div variants={itemVariants}>
                <h3 className="text-lg font-medium mb-3">
                  {isArabic ? 'الفرق الحالية' : 'Current Teams'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {teams.map(team => (
                    <Card key={team.id} className="overflow-hidden">
                      <div className={`h-2 ${team.color} w-full`} />
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-lg">{team.name}</CardTitle>
                          <Badge variant="outline">
                            {team.totalPoints} {isArabic ? 'نقطة' : 'pts'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {team.members.map(member => (
                            <div key={member.id} className="flex items-center space-x-2">
                              <Avatar className="h-8 w-8">
                                {member.avatar && <AvatarImage src={member.avatar} alt={member.name} />}
                                <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium">{member.name}</p>
                                <p className="text-xs text-muted-foreground">{member.points} pts</p>
                              </div>
                            </div>
                          ))}
                          <Button variant="ghost" size="sm" className="h-8 rounded-full">
                            <Plus className="h-3 w-3 mr-1" />
                            {isArabic ? 'إضافة عضو' : 'Add Member'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          </TabsContent>
          
          {/* Challenges Tab */}
          <TabsContent value="challenges">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-6"
            >
              {/* Create New Challenge */}
              <motion.div variants={itemVariants} className="bg-muted p-4 rounded-lg">
                <h3 className="text-lg font-medium mb-3">
                  {isArabic ? 'إنشاء تحدي جديد' : 'Create New Challenge'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="challenge-title">
                      {isArabic ? 'عنوان التحدي' : 'Challenge Title'}
                    </Label>
                    <Input
                      id="challenge-title"
                      value={newChallenge.title}
                      onChange={(e) => setNewChallenge({...newChallenge, title: e.target.value})}
                      placeholder={isArabic ? 'أدخل عنوان التحدي' : 'Enter challenge title'}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="challenge-description">
                      {isArabic ? 'وصف التحدي' : 'Challenge Description'}
                    </Label>
                    <Textarea
                      id="challenge-description"
                      value={newChallenge.description}
                      onChange={(e) => setNewChallenge({...newChallenge, description: e.target.value})}
                      placeholder={isArabic ? 'اشرح التحدي بالتفصيل...' : 'Explain the challenge in detail...'}
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="challenge-location">
                      {isArabic ? 'الموقع' : 'Location'}
                    </Label>
                    <Input
                      id="challenge-location"
                      value={newChallenge.location}
                      onChange={(e) => setNewChallenge({...newChallenge, location: e.target.value})}
                      placeholder={isArabic ? 'أين سيتم التحدي؟' : 'Where will the challenge take place?'}
                    />
                  </div>
                  <div>
                    <Label htmlFor="challenge-points">
                      {isArabic ? 'النقاط' : 'Points'}
                    </Label>
                    <Input
                      id="challenge-points"
                      type="number"
                      value={newChallenge.points}
                      onChange={(e) => setNewChallenge({...newChallenge, points: parseInt(e.target.value) || 0})}
                      min={10}
                      max={500}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="challenge-type">
                      {isArabic ? 'نوع التحدي' : 'Challenge Type'}
                    </Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {[
                        { value: 'puzzle', label: isArabic ? 'لغز' : 'Puzzle', icon: <Puzzle className="h-4 w-4" /> },
                        { value: 'hunt', label: isArabic ? 'بحث' : 'Hunt', icon: <MapPin className="h-4 w-4" /> },
                        { value: 'game', label: isArabic ? 'لعبة' : 'Game', icon: <Users className="h-4 w-4" /> },
                        { value: 'activity', label: isArabic ? 'نشاط' : 'Activity', icon: <Star className="h-4 w-4" /> }
                      ].map(type => (
                        <Button
                          key={type.value}
                          variant={newChallenge.type === type.value ? 'default' : 'outline'}
                          className="flex items-center gap-2"
                          onClick={() => setNewChallenge({...newChallenge, type: type.value as any})}
                        >
                          {type.icon}
                          {type.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
                <Button onClick={handleCreateChallenge}>
                  <Plus className="h-4 w-4 mr-2" />
                  {isArabic ? 'إنشاء تحدي' : 'Create Challenge'}
                </Button>
              </motion.div>
              
              {/* Challenge List */}
              <motion.div variants={itemVariants}>
                <h3 className="text-lg font-medium mb-3">
                  {isArabic ? 'التحديات الحالية' : 'Current Challenges'}
                </h3>
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-4">
                    {challenges.map(challenge => (
                      <Card key={challenge.id}>
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                              {getChallengeTypeIcon(challenge.type)}
                              <CardTitle className="text-lg">{challenge.title}</CardTitle>
                            </div>
                            <Badge 
                              variant={challenge.status === 'active' ? 'default' : 
                                challenge.status === 'completed' ? 'success' : 'outline'}
                            >
                              {challenge.status === 'active' ? (isArabic ? 'نشط' : 'Active') :
                                challenge.status === 'completed' ? (isArabic ? 'مكتمل' : 'Completed') :
                                (isArabic ? 'قادم' : 'Upcoming')}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm mb-2">{challenge.description}</p>
                          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                            {challenge.location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {challenge.location}
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Trophy className="h-3 w-3" />
                              {challenge.points} {isArabic ? 'نقطة' : 'points'}
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {isArabic ? 'بواسطة' : 'By'} {challenge.createdBy}
                            </div>
                          </div>
                          
                          {challenge.assignedTeams && challenge.assignedTeams.length > 0 && (
                            <div className="mt-3">
                              <p className="text-xs font-medium mb-1">
                                {isArabic ? 'الفرق المشاركة:' : 'Participating Teams:'}
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {challenge.assignedTeams.map(teamId => {
                                  const team = teams.find(t => t.id === teamId);
                                  return team ? (
                                    <Badge key={teamId} variant="outline" className="flex items-center gap-1">
                                      <div className={`w-2 h-2 rounded-full ${team.color}`} />
                                      {team.name}
                                    </Badge>
                                  ) : null;
                                })}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </motion.div>
            </motion.div>
          </TabsContent>
          
          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.div variants={itemVariants}>
                <h3 className="text-lg font-medium mb-4">
                  {isArabic ? 'ترتيب الفرق' : 'Team Rankings'}
                </h3>
                <div className="space-y-4">
                  {[...teams].sort((a, b) => b.totalPoints - a.totalPoints).map((team, index) => (
                    <div 
                      key={team.id} 
                      className={`flex items-center p-4 rounded-lg ${index === 0 ? 'bg-yellow-100 dark:bg-yellow-900/20' : 'bg-muted'}`}
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-background mr-4">
                        <span className="font-bold">{index + 1}</span>
                      </div>
                      <div className={`w-3 h-12 ${team.color} rounded-full mr-4`} />
                      <div className="flex-1">
                        <h4 className="font-medium">{team.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {team.members.length} {isArabic ? 'أعضاء' : 'members'}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">{team.totalPoints}</div>
                        <div className="text-xs text-muted-foreground">
                          {isArabic ? 'نقطة' : 'points'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
              
              <motion.div variants={itemVariants} className="mt-8">
                <h3 className="text-lg font-medium mb-4">
                  {isArabic ? 'أفضل المساهمين' : 'Top Contributors'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {teams.flatMap(team => team.members)
                    .sort((a, b) => b.points - a.points)
                    .slice(0, 6)
                    .map((member, index) => (
                      <div key={member.id} className="flex items-center p-3 bg-muted rounded-lg">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-background mr-3 text-sm">
                          {index + 1}
                        </div>
                        <Avatar className="h-10 w-10 mr-3">
                          {member.avatar && <AvatarImage src={member.avatar} alt={member.name} />}
                          <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h4 className="font-medium">{member.name}</h4>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">{member.points}</div>
                          <div className="text-xs text-muted-foreground">
                            {isArabic ? 'نقطة' : 'points'}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </motion.div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};