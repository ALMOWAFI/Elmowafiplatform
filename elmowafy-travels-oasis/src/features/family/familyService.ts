import axios from 'axios';
import { FamilyMember } from './types';

const API_BASE_URL = '/api/v1';

interface FamilyData {
  members: FamilyMember[];
  relationships: Array<{
    from: string;
    to: string;
    type: 'child' | 'spouse' | 'sibling';
  }>;
}

export const fetchFamilyData = async (): Promise<FamilyData> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/family/members`);
    return response.data;
  } catch (error) {
    console.error('Error fetching family data:', error);
    throw error;
  }
};

export const addFamilyMember = async (memberData: Partial<FamilyMember>) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/family/members`, memberData);
    return response.data;
  } catch (error) {
    console.error('Error adding family member:', error);
    throw error;
  }
};

export const updateFamilyMember = async (id: string, updates: Partial<FamilyMember>) => {
  try {
    const response = await axios.patch(`${API_BASE_URL}/family/members/${id}`, updates);
    return response.data;
  } catch (error) {
    console.error('Error updating family member:', error);
    throw error;
  }
};

export const deleteFamilyMember = async (id: string) => {
  try {
    await axios.delete(`${API_BASE_URL}/family/members/${id}`);
  } catch (error) {
    console.error('Error deleting family member:', error);
    throw error;
  }
};

export const updateRelationship = async (
  fromId: string, 
  toId: string, 
  relationshipType: 'child' | 'spouse' | 'sibling'
) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/family/relationships`, {
      from: fromId,
      to: toId,
      type: relationshipType
    });
    return response.data;
  } catch (error) {
    console.error('Error updating relationship:', error);
    throw error;
  }
};
