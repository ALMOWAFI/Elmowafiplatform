import React from 'react';
import { Link } from 'react-router-dom';
import { Challenge } from './types';
import { useLanguage } from '../../context/LanguageContext';

type ChallengeCardProps = {
  challenge: Challenge;
  compact?: boolean;
};

export const ChallengeCard: React.FC<ChallengeCardProps> = ({ challenge, compact = false }) => {
  const { language, t } = useLanguage();
  const title = language === 'en' ? challenge.title : challenge.arabicTitle;
  const description = language === 'en' ? challenge.description : challenge.arabicDescription;
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'en' ? 'en-US' : 'ar-EG', {
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    });
  };
  
  // Generate appropriate status badge
  const getStatusBadge = () => {
    switch(challenge.status) {
      case 'upcoming':
        return (
          <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
            {t('status.upcoming')}
          </span>
        );
      case 'active':
        return (
          <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
            {t('status.active')}
          </span>
        );
      case 'completed':
        return (
          <span className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
            {t('status.completed')}
          </span>
        );
      default:
        return null;
    }
  };
  
  // Get challenge type icon
  const getChallengeTypeIcon = () => {
    switch(challenge.type) {
      case 'treasure-hunt':
        return <span className="text-yellow-500">🗺️</span>;
      case 'mafia':
        return <span className="text-red-500">🎭</span>;
      case 'among-us':
        return <span className="text-purple-500">👾</span>;
      case 'quiz':
        return <span className="text-blue-500">❓</span>;
      case 'photo-challenge':
        return <span className="text-green-500">📸</span>;
      case 'custom':
      default:
        return <span className="text-gray-500">🎯</span>;
    }
  };
  
  if (compact) {
    return (
      <Link 
        to={`/challenges/${challenge.id}`}
        className="block p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            {getChallengeTypeIcon()}
            <h3 className="text-sm font-medium">{title}</h3>
          </div>
          {getStatusBadge()}
        </div>
      </Link>
    );
  }
  
  return (
    <Link 
      to={`/challenges/${challenge.id}`}
      className="block p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="mr-3 rtl:ml-3 rtl:mr-0 text-2xl">
            {getChallengeTypeIcon()}
          </div>
          <div>
            <h3 className="text-xl font-semibold">{title}</h3>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {formatDate(challenge.startDate)} 
              {challenge.startDate !== challenge.endDate && ` - ${formatDate(challenge.endDate)}`}
            </div>
          </div>
        </div>
        {getStatusBadge()}
      </div>
      
      <p className="mb-4 text-gray-700 dark:text-gray-300 line-clamp-2">
        {description}
      </p>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <span className="text-sm font-medium mr-1 rtl:ml-1 rtl:mr-0">
            {t('challenge.points')}:
          </span>
          <span className="text-yellow-500 font-bold">{challenge.points}</span>
        </div>
        
        <div className="flex -space-x-2 rtl:space-x-reverse">
          {challenge.teams.slice(0, 3).map((team, index) => (
            <div 
              key={team.id} 
              className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs font-bold text-white"
              style={{ backgroundColor: team.color }}
              title={language === 'en' ? team.name : team.arabicName}
            >
              {(language === 'en' ? team.name : team.arabicName).charAt(0)}
            </div>
          ))}
          {challenge.teams.length > 3 && (
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs font-bold">
              +{challenge.teams.length - 3}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};
