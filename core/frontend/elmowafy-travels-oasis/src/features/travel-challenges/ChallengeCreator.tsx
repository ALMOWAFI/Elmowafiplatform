import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Challenge, ChallengeType, ChallengeLocation, Clue, Team } from './types';
import { TeamFormation } from './TeamFormation';
import { familyMembers } from '../family-tree/data';

type ChallengeCreatorProps = {
  onSave: (challenge: Challenge) => void;
  tripId: string;
  initialChallenge?: Partial<Challenge>;
};

export const ChallengeCreator: React.FC<ChallengeCreatorProps> = ({
  onSave,
  tripId,
  initialChallenge
}) => {
  const { language, t } = useLanguage();
  const [step, setStep] = useState(1);
  const [teams, setTeams] = useState<Team[]>(initialChallenge?.teams || []);
  
  // Basic challenge info
  const [title, setTitle] = useState(initialChallenge?.title || '');
  const [arabicTitle, setArabicTitle] = useState(initialChallenge?.arabicTitle || '');
  const [description, setDescription] = useState(initialChallenge?.description || '');
  const [arabicDescription, setArabicDescription] = useState(initialChallenge?.arabicDescription || '');
  const [type, setType] = useState<ChallengeType>(initialChallenge?.type || 'treasure-hunt');
  const [startDate, setStartDate] = useState(initialChallenge?.startDate || '');
  const [endDate, setEndDate] = useState(initialChallenge?.endDate || '');
  const [points, setPoints] = useState(initialChallenge?.points?.toString() || '500');
  const [judgeId, setJudgeId] = useState(initialChallenge?.judgeId || '');
  
  // Treasure hunt specific data
  const [locations, setLocations] = useState<ChallengeLocation[]>(initialChallenge?.locations || []);
  const [clues, setClues] = useState<Clue[]>(initialChallenge?.clues || []);
  
  // Rules
  const [rules, setRules] = useState(initialChallenge?.rules || '');
  const [arabicRules, setArabicRules] = useState(initialChallenge?.arabicRules || '');
  
  const handleSaveChallenge = () => {
    const newChallenge: Challenge = {
      id: initialChallenge?.id || `challenge-${Date.now()}`,
      title,
      arabicTitle,
      description,
      arabicDescription,
      type,
      createdBy: 'current-user-id', // This would be dynamically set based on the logged-in user
      tripId,
      status: 'upcoming',
      startDate,
      endDate,
      points: parseInt(points, 10),
      teams,
      judgeId,
      rules,
      arabicRules
    };
    
    // Add type-specific data
    if (type === 'treasure-hunt' && locations.length > 0) {
      newChallenge.locations = locations;
      newChallenge.clues = clues;
    }
    
    onSave(newChallenge);
  };
  
  const handleTeamsUpdate = (updatedTeams: Team[]) => {
    setTeams(updatedTeams);
  };
  
  // Basic info form
  const renderBasicInfoForm = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-1">{t('challenge.title')}</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md"
            placeholder={t('challenge.titlePlaceholder')}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t('challenge.arabicTitle')}</label>
          <input
            type="text"
            value={arabicTitle}
            onChange={e => setArabicTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md"
            dir="rtl"
            placeholder={t('challenge.arabicTitlePlaceholder')}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-1">{t('challenge.description')}</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md"
            rows={3}
            placeholder={t('challenge.descriptionPlaceholder')}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t('challenge.arabicDescription')}</label>
          <textarea
            value={arabicDescription}
            onChange={e => setArabicDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md"
            rows={3}
            dir="rtl"
            placeholder={t('challenge.arabicDescriptionPlaceholder')}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium mb-1">{t('challenge.type')}</label>
          <select
            value={type}
            onChange={e => setType(e.target.value as ChallengeType)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md"
          >
            <option value="treasure-hunt">{t('challenge.types.treasureHunt')}</option>
            <option value="mafia">{t('challenge.types.mafia')}</option>
            <option value="among-us">{t('challenge.types.amongUs')}</option>
            <option value="quiz">{t('challenge.types.quiz')}</option>
            <option value="photo-challenge">{t('challenge.types.photoChallenge')}</option>
            <option value="custom">{t('challenge.types.custom')}</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t('challenge.judge')}</label>
          <select
            value={judgeId}
            onChange={e => setJudgeId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md"
          >
            <option value="">{t('challenge.selectJudge')}</option>
            {familyMembers.map(member => (
              <option key={member.id} value={member.id}>
                {language === 'en' ? member.name : member.arabicName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t('challenge.points')}</label>
          <input
            type="number"
            value={points}
            onChange={e => setPoints(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md"
            min="100"
            step="50"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-1">{t('challenge.startDate')}</label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t('challenge.endDate')}</label>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md"
          />
        </div>
      </div>
      
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setStep(2)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          disabled={!title || !arabicTitle || !startDate}
        >
          {t('next')}
        </button>
      </div>
    </div>
  );
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6">
        {initialChallenge?.id ? t('challenge.editChallenge') : t('challenge.createChallenge')}
      </h2>
      
      <div className="mb-8">
        <div className="flex items-center">
          <div className={`flex items-center justify-center h-8 w-8 rounded-full ${step >= 1 ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'} text-white text-sm font-medium`}>
            1
          </div>
          <div className={`h-1 flex-1 mx-2 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
          <div className={`flex items-center justify-center h-8 w-8 rounded-full ${step >= 2 ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'} text-white text-sm font-medium`}>
            2
          </div>
          <div className={`h-1 flex-1 mx-2 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
          <div className={`flex items-center justify-center h-8 w-8 rounded-full ${step >= 3 ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'} text-white text-sm font-medium`}>
            3
          </div>
        </div>
        <div className="flex justify-between text-xs mt-2">
          <span>{t('challenge.basicInfo')}</span>
          <span>{t('challenge.teams')}</span>
          <span>{t('challenge.rules')}</span>
        </div>
      </div>
      
      {step === 1 && renderBasicInfoForm()}
      
      {step === 2 && (
        <>
          <TeamFormation
            existingTeams={teams}
            onSaveTeams={handleTeamsUpdate}
            challengeId={initialChallenge?.id || `challenge-${Date.now()}`}
          />
          
          <div className="flex justify-between mt-6">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md"
            >
              {t('previous')}
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {t('next')}
            </button>
          </div>
        </>
      )}
      
      {step === 3 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1">{t('challenge.rules')}</label>
              <textarea
                value={rules}
                onChange={e => setRules(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md"
                rows={5}
                placeholder={t('challenge.rulesPlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('challenge.arabicRules')}</label>
              <textarea
                value={arabicRules}
                onChange={e => setArabicRules(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md"
                rows={5}
                dir="rtl"
                placeholder={t('challenge.arabicRulesPlaceholder')}
              />
            </div>
          </div>
          
          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md"
            >
              {t('previous')}
            </button>
            <button
              type="button"
              onClick={handleSaveChallenge}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              {initialChallenge?.id ? t('challenge.updateChallenge') : t('challenge.createChallenge')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
