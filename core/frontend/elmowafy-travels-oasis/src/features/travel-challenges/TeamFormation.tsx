import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Team } from './types';
import { familyMembers } from '../family-tree/data';

type TeamFormationProps = {
  existingTeams?: Team[];
  onSaveTeams: (teams: Team[]) => void;
  challengeId: string;
};

export const TeamFormation: React.FC<TeamFormationProps> = ({ 
  existingTeams = [], 
  onSaveTeams,
  challengeId 
}) => {
  const { language, t } = useLanguage();
  const [teams, setTeams] = useState<Team[]>(existingTeams);
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamArabicName, setNewTeamArabicName] = useState('');
  const [newTeamColor, setNewTeamColor] = useState('#3366FF');
  
  // List of available family members (not already assigned to teams)
  const [availableMembers, setAvailableMembers] = useState<typeof familyMembers>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  
  // Update available members whenever teams change
  useEffect(() => {
    const assignedMemberIds = teams.flatMap(team => team.members);
    const available = familyMembers.filter(member => !assignedMemberIds.includes(member.id));
    setAvailableMembers(available);
  }, [teams]);
  
  const handleAddTeam = () => {
    if (!newTeamName || !newTeamArabicName || selectedMembers.length === 0) {
      // Show validation error
      return;
    }
    
    const newTeam: Team = {
      id: `team-${Date.now()}`,
      name: newTeamName,
      arabicName: newTeamArabicName,
      members: selectedMembers,
      color: newTeamColor,
      score: 0,
      completedTasks: []
    };
    
    const updatedTeams = [...teams, newTeam];
    setTeams(updatedTeams);
    onSaveTeams(updatedTeams);
    
    // Reset form
    setNewTeamName('');
    setNewTeamArabicName('');
    setSelectedMembers([]);
    setShowAddTeam(false);
  };
  
  const handleRemoveMember = (teamId: string, memberId: string) => {
    const updatedTeams = teams.map(team => {
      if (team.id === teamId) {
        return {
          ...team,
          members: team.members.filter(id => id !== memberId)
        };
      }
      return team;
    });
    
    // If a team has no members, remove it entirely
    const filteredTeams = updatedTeams.filter(team => team.members.length > 0);
    
    setTeams(filteredTeams);
    onSaveTeams(filteredTeams);
  };
  
  const handleDeleteTeam = (teamId: string) => {
    const updatedTeams = teams.filter(team => team.id !== teamId);
    setTeams(updatedTeams);
    onSaveTeams(updatedTeams);
  };
  
  // Render team UI for adding teams
  const renderAddTeamForm = () => (
    <div className="mt-6 p-4 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
      <h3 className="text-lg font-medium mb-4">{t('teams.addNewTeam')}</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">{t('teams.englishName')}</label>
          <input
            type="text"
            value={newTeamName}
            onChange={e => setNewTeamName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md"
            placeholder={t('teams.teamNamePlaceholder')}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">{t('teams.arabicName')}</label>
          <input
            type="text"
            value={newTeamArabicName}
            onChange={e => setNewTeamArabicName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md"
            dir="rtl"
            placeholder={t('teams.teamArabicNamePlaceholder')}
          />
        </div>
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">{t('teams.teamColor')}</label>
        <div className="flex items-center">
          <input
            type="color"
            value={newTeamColor}
            onChange={e => setNewTeamColor(e.target.value)}
            className="h-10 w-10 border-0 p-0 mr-3 rtl:ml-3 rtl:mr-0"
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {t('teams.colorPreview')}
          </span>
        </div>
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">{t('teams.members')}</label>
        <div className="border border-gray-300 dark:border-gray-700 rounded-md p-3 max-h-48 overflow-y-auto">
          {availableMembers.length === 0 ? (
            <p className="text-sm italic text-gray-500 dark:text-gray-400">
              {t('teams.noAvailableMembers')}
            </p>
          ) : (
            availableMembers.map(member => (
              <div key={member.id} className="flex items-center mb-2 last:mb-0">
                <input
                  type="checkbox"
                  id={`member-${member.id}`}
                  checked={selectedMembers.includes(member.id)}
                  onChange={() => {
                    if (selectedMembers.includes(member.id)) {
                      setSelectedMembers(selectedMembers.filter(id => id !== member.id));
                    } else {
                      setSelectedMembers([...selectedMembers, member.id]);
                    }
                  }}
                  className="mr-2 rtl:ml-2 rtl:mr-0"
                />
                <label htmlFor={`member-${member.id}`} className="text-sm">
                  {language === 'en' ? member.name : member.arabicName}
                </label>
              </div>
            ))
          )}
        </div>
      </div>
      
      <div className="flex justify-end space-x-3 rtl:space-x-reverse">
        <button
          type="button"
          onClick={() => setShowAddTeam(false)}
          className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md"
        >
          {t('cancel')}
        </button>
        <button
          type="button"
          onClick={handleAddTeam}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
          disabled={!newTeamName || !newTeamArabicName || selectedMembers.length === 0}
        >
          {t('teams.createTeam')}
        </button>
      </div>
    </div>
  );
  
  // Render each team card
  const renderTeamCard = (team: Team) => {
    const teamMembers = familyMembers.filter(member => team.members.includes(member.id));
    
    return (
      <div 
        key={team.id} 
        className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <div 
              className="w-6 h-6 rounded-full mr-2 rtl:ml-2 rtl:mr-0"
              style={{ backgroundColor: team.color }}
            />
            <h3 className="font-medium">
              {language === 'en' ? team.name : team.arabicName}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => handleDeleteTeam(team.id)}
            className="text-red-500 hover:text-red-700"
            aria-label={t('teams.deleteTeam')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        
        <div className="space-y-2">
          {teamMembers.map(member => (
            <div key={member.id} className="flex items-center justify-between text-sm">
              <span>{language === 'en' ? member.name : member.arabicName}</span>
              <button
                type="button"
                onClick={() => handleRemoveMember(team.id, member.id)}
                className="text-gray-500 hover:text-red-500"
                aria-label={t('teams.removeMember')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  return (
    <div className="my-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">{t('teams.teamFormation')}</h2>
        {!showAddTeam && (
          <button
            type="button"
            onClick={() => setShowAddTeam(true)}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            disabled={availableMembers.length === 0}
          >
            {t('teams.addTeam')}
          </button>
        )}
      </div>
      
      {teams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {teams.map(renderTeamCard)}
        </div>
      ) : (
        <div className="p-8 text-center border border-dashed border-gray-300 dark:border-gray-700 rounded-lg mb-6">
          <p className="text-gray-500 dark:text-gray-400 mb-3">
            {t('teams.noTeamsYet')}
          </p>
          {!showAddTeam && (
            <button
              type="button"
              onClick={() => setShowAddTeam(true)}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {t('teams.createFirstTeam')}
            </button>
          )}
        </div>
      )}
      
      {showAddTeam && renderAddTeamForm()}
    </div>
  );
};
