import { useState, useEffect, useCallback } from 'react';
import { FamilyData, FamilyMember } from './types';
import { 
  fetchFamilyData, 
  addFamilyMember, 
  updateFamilyMember, 
  deleteFamilyMember,
  updateRelationship
} from './familyService';

export const useFamilyData = () => {
  const [familyData, setFamilyData] = useState<FamilyData>({ members: [], relationships: [] });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const loadFamilyData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchFamilyData();
      setFamilyData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load family data'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFamilyData();
  }, [loadFamilyData]);

  const addMember = async (memberData: Omit<FamilyMember, 'id'>) => {
    try {
      const newMember = await addFamilyMember(memberData);
      setFamilyData(prev => ({
        members: [...prev.members, newMember],
        relationships: prev.relationships
      }));
      return newMember;
    } catch (err) {
      console.error('Failed to add family member:', err);
      throw err;
    }
  };

  const updateMember = async (id: string, updates: Partial<FamilyMember>) => {
    try {
      const updatedMember = await updateFamilyMember(id, updates);
      setFamilyData(prev => ({
        members: prev.members.map(member => 
          member.id === id ? { ...member, ...updatedMember } : member
        ),
        relationships: prev.relationships
      }));
      return updatedMember;
    } catch (err) {
      console.error('Failed to update family member:', err);
      throw err;
    }
  };

  const removeMember = async (id: string) => {
    try {
      await deleteFamilyMember(id);
      setFamilyData(prev => ({
        members: prev.members.filter(member => member.id !== id),
        relationships: prev.relationships.filter(
          rel => rel.from !== id && rel.to !== id
        )
      }));
    } catch (err) {
      console.error('Failed to delete family member:', err);
      throw err;
    }
  };

  const addRelationship = async (
    fromId: string, 
    toId: string, 
    type: 'child' | 'spouse' | 'sibling'
  ) => {
    try {
      const relationship = await updateRelationship(fromId, toId, type);
      setFamilyData(prev => ({
        members: prev.members,
        relationships: [...prev.relationships, {
          from: fromId,
          to: toId,
          type
        }]
      }));
      return relationship;
    } catch (err) {
      console.error('Failed to add relationship:', err);
      throw err;
    }
  };

  return {
    familyData,
    loading,
    error,
    addMember,
    updateMember,
    removeMember,
    addRelationship,
    refresh: loadFamilyData
  };
};
