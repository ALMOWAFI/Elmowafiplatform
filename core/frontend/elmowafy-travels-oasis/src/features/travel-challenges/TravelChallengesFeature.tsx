import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Challenge, PlayerProfile } from './types';
import { ChallengeCard } from './ChallengeCard';
import { PlayerProfileCard } from './PlayerProfile';
import { ChallengeCreator } from './ChallengeCreator';
import { sampleChallenges, samplePlayerProfiles } from './data';

export const TravelChallengesFeature: React.FC = () => {
  const { t } = useLanguage();
  const [challenges, setChallenges] = useState<Challenge[]>(sampleChallenges);
  const [selectedProfile, setSelectedProfile] = useState<PlayerProfile | null>(null);
  const [showChallengeCreator, setShowChallengeCreator] = useState(false);
  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  
  // Filter challenges based on status
  const upcomingChallenges = challenges.filter(c => c.status === 'upcoming');
  const activeChallenges = challenges.filter(c => c.status === 'active');
  const completedChallenges = challenges.filter(c => c.status === 'completed');
  
  const handleSaveChallenge = (challenge: Challenge) => {
    const existingIndex = challenges.findIndex(c => c.id === challenge.id);
    if (existingIndex >= 0) {
      // Update existing challenge
      const updatedChallenges = [...challenges];
      updatedChallenges[existingIndex] = challenge;
      setChallenges(updatedChallenges);
    } else {
      // Add new challenge
      setChallenges([...challenges, challenge]);
    }
    setShowChallengeCreator(false);
  };
  
  // View player profile by ID
  const handleViewProfile = (familyMemberId: string) => {
    const profile = samplePlayerProfiles.find(p => p.familyMemberId === familyMemberId);
    if (profile) {
      setSelectedProfile(profile);
    }
  };
  
  // Close profile view
  const handleCloseProfile = () => {
    setSelectedProfile(null);
  };
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">{t('travelChallenges.title')}</h1>
        <button
          onClick={() => setShowChallengeCreator(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          {t('travelChallenges.createChallenge')}
        </button>
      </div>
      
      {/* Modal for creating a challenge */}
      {showChallengeCreator && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-semibold">{t('travelChallenges.createNewChallenge')}</h2>
              <button
                onClick={() => setShowChallengeCreator(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <ChallengeCreator 
                onSave={handleSaveChallenge}
                tripId={activeTripId || 'default-trip'} 
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Player Profile Modal */}
      {selectedProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-semibold">{t('profile.playerProfile')}</h2>
              <button
                onClick={handleCloseProfile}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-0">
              <PlayerProfileCard profile={selectedProfile} />
            </div>
          </div>
        </div>
      )}
      
      {/* Active Challenges Section */}
      {activeChallenges.length > 0 && (
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">{t('travelChallenges.activeChallenges')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeChallenges.map(challenge => (
              <ChallengeCard key={challenge.id} challenge={challenge} />
            ))}
          </div>
        </section>
      )}
      
      {/* Upcoming Challenges Section */}
      {upcomingChallenges.length > 0 && (
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">{t('travelChallenges.upcomingChallenges')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingChallenges.map(challenge => (
              <ChallengeCard key={challenge.id} challenge={challenge} />
            ))}
          </div>
        </section>
      )}
      
      {/* Completed Challenges Section */}
      {completedChallenges.length > 0 && (
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">{t('travelChallenges.completedChallenges')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {completedChallenges.map(challenge => (
              <ChallengeCard key={challenge.id} challenge={challenge} />
            ))}
          </div>
        </section>
      )}
      
      {/* Top Players Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">{t('travelChallenges.topPlayers')}</h2>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('travelChallenges.rank')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('travelChallenges.player')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('travelChallenges.level')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('travelChallenges.points')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('travelChallenges.action')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {samplePlayerProfiles
                .sort((a, b) => b.totalPoints - a.totalPoints)
                .map((profile, index) => {
                  const familyMember = profile.familyMemberId;
                  return (
                    <tr key={profile.familyMemberId}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-300">
                              {familyMember.charAt(0).toUpperCase()}
                            </div>
                          </div>
                          <div className="ml-4 rtl:mr-4 rtl:ml-0">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {familyMember}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {profile.rank}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="inline-flex items-center justify-center px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                          {profile.level}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-500 font-semibold">
                        {profile.totalPoints}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleViewProfile(profile.familyMemberId)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          {t('travelChallenges.viewProfile')}
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
