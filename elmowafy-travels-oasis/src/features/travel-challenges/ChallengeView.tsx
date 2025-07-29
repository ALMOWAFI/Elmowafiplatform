import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { Challenge, Team, ChallengeLocation } from './types';
import { TeamFormation } from './TeamFormation';
import { familyMembers } from '../family-tree/data';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';

export interface ChallengeViewProps {
  challenge: Challenge;
}

export const ChallengeView: React.FC<ChallengeViewProps> = ({ challenge }) => {
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('details');
  const [teams, setTeams] = useState<Team[]>(challenge.teams || []);
  
  const handleBackClick = () => {
    navigate('/challenges');
  };
  
  const handleTeamsUpdate = (updatedTeams: Team[]) => {
    setTeams(updatedTeams);
    // In a real app, this would update the challenge in the database
  };
  
  const title = language === 'en' ? challenge.title : challenge.arabicTitle;
  const description = language === 'en' ? challenge.description : challenge.arabicDescription;
  const rules = language === 'en' ? challenge.rules : challenge.arabicRules;

  // Get judge information
  const judge = challenge.judgeId ? familyMembers.find(m => m.id === challenge.judgeId) : null;

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'en' ? 'en-US' : 'ar-EG', {
      year: 'numeric', 
      month: 'long', 
      day: 'numeric'
    });
  };
  
  // Generate appropriate status badge
  const getStatusBadge = () => {
    switch(challenge.status) {
      case 'upcoming':
        return (
          <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-900">
            {t('status.upcoming')}
          </div>
        );
      case 'active':
        return (
          <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-300 dark:hover:bg-green-900">
            {t('status.active')}
          </div>
        );
      case 'completed':
        return (
          <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-gray-100 text-gray-800 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-700">
            {t('status.completed')}
          </div>
        );
    }
  };
  
  // Get challenge type icon and name
  const getChallengeTypeInfo = () => {
    let icon = '🎯';
    let typeName = t('challenge.types.custom');
    
    switch(challenge.type) {
      case 'treasure-hunt':
        icon = '🗺️';
        typeName = t('challenge.types.treasureHunt');
        break;
      case 'mafia':
        icon = '🎭';
        typeName = t('challenge.types.mafia');
        break;
      case 'among-us':
        icon = '👾';
        typeName = t('challenge.types.amongUs');
        break;
      case 'quiz':
        icon = '❓';
        typeName = t('challenge.types.quiz');
        break;
      case 'photo-challenge':
        icon = '📸';
        typeName = t('challenge.types.photoChallenge');
        break;
    }
    
    return { icon, typeName };
  };
  
  const { icon, typeName } = getChallengeTypeInfo();
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4 md:flex-row md:justify-between md:items-center md:space-y-0">
        <Button 
          variant="outline" 
          onClick={handleBackClick} 
          className="w-fit"
        >
          ← {t('back')}
        </Button>
        
        <div className="flex items-center space-x-2">
          {getStatusBadge()}
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content - 2/3 width on large screens */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2 rtl:space-x-reverse mb-2">
                    <span className="text-2xl">{icon}</span>
                    <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 bg-secondary text-secondary-foreground">
                      {typeName}
                    </div>
                  </div>
                  <CardTitle className="text-3xl font-bold">{title}</CardTitle>
                  <CardDescription className="text-lg mt-2">
                    {description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="details" className="w-full" onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-3 mb-4">
                  <TabsTrigger value="details">{t('challenge.details')}</TabsTrigger>
                  <TabsTrigger value="teams">{t('challenge.teams')}</TabsTrigger>
                  {challenge.type === 'treasure-hunt' && (
                    <TabsTrigger value="map">{t('challenge.map')}</TabsTrigger>
                  )}
                </TabsList>
                
                <TabsContent value="details" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                        {t('challenge.dates')}
                      </h3>
                      <p className="font-medium">
                        {formatDate(challenge.startDate)}
                        {challenge.startDate !== challenge.endDate && (
                          <> - {formatDate(challenge.endDate)}</>
                        )}
                      </p>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                        {t('challenge.points')}
                      </h3>
                      <p className="font-medium text-amber-500">
                        {challenge.points} {t('points')}
                      </p>
                    </div>
                    
                    {judge && (
                      <div className="md:col-span-2">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                          {t('challenge.judge')}
                        </h3>
                        <div className="flex items-center space-x-2 rtl:space-x-reverse">
                          <Avatar>
                            <AvatarImage src={judge.profileImage} alt={language === 'en' ? judge.name : judge.arabicName} />
                            <AvatarFallback>{(language === 'en' ? judge.name : judge.arabicName).charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span>{language === 'en' ? judge.name : judge.arabicName}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {rules && (
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="rules">
                        <AccordionTrigger className="text-base font-medium">
                          {t('challenge.rules')}
                        </AccordionTrigger>
                        <AccordionContent className="text-sm">
                          <div className="prose dark:prose-invert max-w-none">
                            {rules.split('\n').map((line, index) => (
                              <p key={index}>{line}</p>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  )}
                  
                  {challenge.type === 'treasure-hunt' && challenge.clues && (
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="clues">
                        <AccordionTrigger className="text-base font-medium">
                          {t('challenge.clues')}
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4">
                            {challenge.clues
                              .filter(clue => clue.isRevealed)
                              .sort((a, b) => a.order - b.order)
                              .map((clue, index) => (
                                <div key={clue.id} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
                                  <h4 className="font-medium mb-2">
                                    {t('challenge.clue')} #{clue.order}
                                  </h4>
                                  <p className="text-gray-700 dark:text-gray-300">
                                    {language === 'en' ? clue.text : clue.arabicText}
                                  </p>
                                  {clue.imageUrl && (
                                    <img 
                                      src={clue.imageUrl} 
                                      alt={`Clue ${clue.order}`}
                                      className="mt-2 max-h-40 rounded-md"
                                    />
                                  )}
                                </div>
                              ))}
                            
                            {challenge.clues.some(clue => !clue.isRevealed) && (
                              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md border border-dashed border-gray-300 dark:border-gray-600">
                                <p className="text-center text-gray-500 dark:text-gray-400">
                                  {t('challenge.moreCluesLocked')}
                                </p>
                              </div>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  )}
                </TabsContent>
                
                <TabsContent value="teams">
                  <TeamFormation 
                    existingTeams={teams}
                    onSaveTeams={handleTeamsUpdate}
                    challengeId={challenge.id}
                  />
                </TabsContent>
                
                <TabsContent value="map">
                  {challenge.locations && challenge.locations.length > 0 ? (
                    <div className="h-96 bg-gray-100 dark:bg-gray-800 rounded-md p-4 flex items-center justify-center">
                      <div className="text-center">
                        <p className="mb-2">{t('challenge.mapIntegration')}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                          {challenge.locations.map((location: ChallengeLocation) => (
                            <Card key={location.id} className="overflow-hidden">
                              {location.imageUrl && (
                                <div className="h-24 overflow-hidden">
                                  <img
                                    src={location.imageUrl}
                                    alt={language === 'en' ? location.name : location.arabicName}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              )}
                              <CardHeader className="py-3">
                                <CardTitle className="text-base">
                                  {language === 'en' ? location.name : location.arabicName}
                                </CardTitle>
                              </CardHeader>
                              {location.hint && (
                                <CardContent className="py-2">
                                  <p className="text-sm italic">
                                    {language === 'en' ? location.hint : location.arabicHint}
                                  </p>
                                </CardContent>
                              )}
                            </Card>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-60 bg-gray-100 dark:bg-gray-800 rounded-md flex items-center justify-center">
                      <p className="text-gray-500 dark:text-gray-400">
                        {t('challenge.noLocations')}
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
        
        {/* Sidebar - 1/3 width on large screens */}
        <div className="space-y-6">
          {/* Progress Card */}
          <Card>
            <CardHeader>
              <CardTitle>{t('challenge.progress')}</CardTitle>
            </CardHeader>
            <CardContent>
              {challenge.status === 'active' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm font-medium">
                      <span>{t('challenge.overallProgress')}</span>
                      <span>60%</span>
                    </div>
                    <Progress value={60} className="h-2" />
                  </div>
                  
                  {challenge.type === 'treasure-hunt' && challenge.clues && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm font-medium">
                        <span>{t('challenge.cluesFound')}</span>
                        <span>
                          {challenge.clues.filter(c => c.isRevealed).length} / {challenge.clues.length}
                        </span>
                      </div>
                      <Progress 
                        value={(challenge.clues.filter(c => c.isRevealed).length / challenge.clues.length) * 100} 
                        className="h-2" 
                      />
                    </div>
                  )}
                  
                  {challenge.type === 'treasure-hunt' && challenge.locations && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm font-medium">
                        <span>{t('challenge.locationsVisited')}</span>
                        <span>
                          1 / {challenge.locations.length}
                        </span>
                      </div>
                      <Progress 
                        value={(1 / challenge.locations.length) * 100} 
                        className="h-2" 
                      />
                    </div>
                  )}
                </div>
              )}
              
              {challenge.status === 'upcoming' && (
                <div className="text-center py-6">
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    {t('challenge.notStartedYet')}
                  </p>
                  <Button variant="outline">
                    {t('challenge.getNotified')}
                  </Button>
                </div>
              )}
              
              {challenge.status === 'completed' && (
                <div className="text-center py-6">
                  <div className="text-5xl mb-2">🏆</div>
                  <p className="font-medium mb-1">
                    {t('challenge.completed')}
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                    {formatDate(challenge.endDate)}
                  </p>
                  <Button variant="outline">
                    {t('challenge.viewResults')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Teams Leaderboard */}
          {teams.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t('challenge.teamStandings')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {teams
                    .sort((a, b) => b.score - a.score)
                    .map((team, index) => (
                      <div 
                        key={team.id} 
                        className="flex items-center space-x-4 rtl:space-x-reverse p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
                      >
                        <div 
                          className="w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: team.color }}
                        >
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {language === 'en' ? team.name : team.arabicName}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {team.members.length} {t('challenge.members')}
                          </p>
                        </div>
                        <div className="text-amber-500 font-bold">
                          {team.score}
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Join Challenge Button */}
          {challenge.status === 'upcoming' && (
            <Button className="w-full" size="lg">
              {t('challenge.joinChallenge')}
            </Button>
          )}
          
          {challenge.status === 'active' && (
            <Button className="w-full" size="lg">
              {t('challenge.enterCode')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
