import axios from 'axios';
import { FamilyMember } from '../../types/family';

const API_URL = '/api/family'; // Use relative path for production

// Fetch all family members
export const getFamilyMembers = async (): Promise<FamilyMember[]> => {
    const response = await axios.get(API_URL);
    return response.data;
};

// Add other API functions as needed (create, update, delete)
