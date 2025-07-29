import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { PlayerProfile, Badge, Achievement } from './types';
import { familyMembers } from '../family-tree/data';

type PlayerProfileCardProps = {
  profile: PlayerProfile;
};

export const PlayerProfileCard: React.FC<PlayerProfileCardProps> = ({ profile }) => {
  const { language, t } = useLanguage();
  
  // Find the family member data
  const familyMember = familyMembers.find(member => member.id === profile.familyMemberId);
  
  if (!familyMember) {
    return <div className="text-red-500">{t('profile.memberNotFound')}</div>;
  }
  
  // Calculate the level progress
  const nextLevelPoints = profile.level * 500; // Just an example calculation
  const currentLevelPoints = (profile.level - 1) * 500;
  const progressPercent = ((profile.totalPoints - currentLevelPoints) / (nextLevelPoints - currentLevelPoints)) * 100;
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      {/* Header with cover image */}
      <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-600 relative">
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2">
          <div className="rounded-full border-4 border-white dark:border-gray-800 overflow-hidden h-24 w-24">
            <img 
              src={familyMember.profileImage || '/placeholder-avatar.jpg'} 
              alt={language === 'en' ? familyMember.name : familyMember.arabicName}
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </div>
      
      {/* Profile Info */}
      <div className="pt-16 pb-6 px-6 text-center">
        <h2 className="text-xl font-bold">
          {language === 'en' ? familyMember.name : familyMember.arabicName}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {profile.rank}
        </p>
        
        {/* Points and Level */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium">
              {t('profile.level')} {profile.level} 
              <span className="text-gray-500 dark:text-gray-400"> • </span>
              <span className="text-yellow-500">{profile.totalPoints} {t('profile.points')}</span>
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">{nextLevelPoints - profile.totalPoints} {t('profile.pointsToNextLevel')}</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full" 
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>
      </div>
      
      {/* Badges Section */}
      <div className="px-6 pb-6">
        <h3 className="text-lg font-semibold mb-3">{t('profile.badges')}</h3>
        {profile.badges.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {profile.badges.map(badge => (
              <BadgeItem key={badge.id} badge={badge} />
            ))}
          </div>
        ) : (
          <p className="text-sm italic text-gray-500 dark:text-gray-400">
            {t('profile.noBadgesYet')}
          </p>
        )}
      </div>
      
      {/* Achievements Section */}
      <div className="px-6 pb-6">
        <h3 className="text-lg font-semibold mb-3">{t('profile.achievements')}</h3>
        {profile.achievements.length > 0 ? (
          <div className="space-y-3">
            {profile.achievements.map(achievement => (
              <AchievementItem key={achievement.id} achievement={achievement} />
            ))}
          </div>
        ) : (
          <p className="text-sm italic text-gray-500 dark:text-gray-400">
            {t('profile.noAchievementsYet')}
          </p>
        )}
      </div>
      
      {/* Completed Challenges Count */}
      <div className="px-6 pb-6">
        <h3 className="text-lg font-semibold mb-1">{t('profile.completedChallenges')}</h3>
        <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
          {profile.completedChallenges.length}
        </div>
      </div>
    </div>
  );
};

// Badge Item Component
const BadgeItem: React.FC<{ badge: Badge }> = ({ badge }) => {
  const { language } = useLanguage();
  
  return (
    <div 
      className="group relative h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:scale-110 transition-transform cursor-pointer"
      title={language === 'en' ? badge.name : badge.arabicName}
    >
      <img 
        src={badge.imageUrl || '/badges/placeholder.png'} 
        alt={language === 'en' ? badge.name : badge.arabicName}
        className="h-8 w-8 object-contain"
      />
      
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 -translate-y-2 w-40 p-2 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity z-10">
        <div className="font-medium mb-1">{language === 'en' ? badge.name : badge.arabicName}</div>
        <div className="text-gray-300">{language === 'en' ? badge.description : badge.arabicDescription}</div>
        <div className="text-gray-400 mt-1 text-2xs">{badge.dateEarned}</div>
      </div>
    </div>
  );
};

// Achievement Item Component
const AchievementItem: React.FC<{ achievement: Achievement }> = ({ achievement }) => {
  const { language } = useLanguage();
  
  return (
    <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
      <div className="flex-shrink-0 h-10 w-10 mr-3 rtl:ml-3 rtl:mr-0">
        <img 
          src={achievement.imageUrl || '/achievements/placeholder.png'} 
          alt={language === 'en' ? achievement.name : achievement.arabicName}
          className="h-full w-full object-contain"
        />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium truncate">
          {language === 'en' ? achievement.name : achievement.arabicName}
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {language === 'en' ? achievement.description : achievement.arabicDescription}
        </p>
      </div>
      <div className="flex-shrink-0 text-yellow-500 font-bold text-sm">
        +{achievement.points}
      </div>
    </div>
  );
};
