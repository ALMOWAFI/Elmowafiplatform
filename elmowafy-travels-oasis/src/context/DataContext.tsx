import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService, queryKeys } from '@/lib/api';
import { toast } from 'sonner';
import { useLanguage } from './LanguageContext';
import { useAuth } from './AuthContext';

// Types
interface FamilyMember {
  id: string;
  name: string;
  nameArabic?: string;
  role: string;
  avatar?: string;
  preferences?: {
    interests: string[];
    travelStyle: string;
    budget: number;
  };
}

interface Memory {
  id: string;
  title: string;
  description: string;
  image_url: string;
  date: string;
  location: string;
  tags: string[];
  family_members: string[];
  aiAnalysis?: {
    facesDetected: number;
    emotions: string[];
    objects: string[];
    text?: string;
  };
}

interface TravelPlan {
  id: string;
  destination: string;
  start_date: string;
  end_date: string;
  family_members: string[];
  activities: string[];
  budget: number;
  status: 'planning' | 'booked' | 'completed';
}

interface GameSession {
  session_id: string;
  join_code: string;
  game_type: string;
  status: 'waiting' | 'active' | 'finished';
  players: string[];
  created_at: string;
}

interface AIAnalysis {
  id: string;
  type: 'memory' | 'travel' | 'photo';
  result: any;
  created_at: string;
}

interface DataState {
  familyMembers: FamilyMember[];
  memories: Memory[];
  travelPlans: TravelPlan[];
  gameSessions: GameSession[];
  aiAnalyses: AIAnalysis[];
  suggestions: any;
  isLoading: boolean;
  error: string | null;
  lastSync: Date | null;
}

// Action Types
type DataAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_FAMILY_MEMBERS'; payload: FamilyMember[] }
  | { type: 'ADD_FAMILY_MEMBER'; payload: FamilyMember }
  | { type: 'UPDATE_FAMILY_MEMBER'; payload: { id: string; updates: Partial<FamilyMember> } }
  | { type: 'REMOVE_FAMILY_MEMBER'; payload: string }
  | { type: 'SET_MEMORIES'; payload: Memory[] }
  | { type: 'ADD_MEMORY'; payload: Memory }
  | { type: 'UPDATE_MEMORY'; payload: { id: string; updates: Partial<Memory> } }
  | { type: 'REMOVE_MEMORY'; payload: string }
  | { type: 'SET_TRAVEL_PLANS'; payload: TravelPlan[] }
  | { type: 'ADD_TRAVEL_PLAN'; payload: TravelPlan }
  | { type: 'UPDATE_TRAVEL_PLAN'; payload: { id: string; updates: Partial<TravelPlan> } }
  | { type: 'SET_GAME_SESSIONS'; payload: GameSession[] }
  | { type: 'ADD_GAME_SESSION'; payload: GameSession }
  | { type: 'UPDATE_GAME_SESSION'; payload: { id: string; updates: Partial<GameSession> } }
  | { type: 'SET_AI_ANALYSES'; payload: AIAnalysis[] }
  | { type: 'ADD_AI_ANALYSIS'; payload: AIAnalysis }
  | { type: 'SET_SUGGESTIONS'; payload: any }
  | { type: 'SET_LAST_SYNC'; payload: Date }
  | { type: 'RESET_STATE' };

// Initial State
const initialState: DataState = {
  familyMembers: [],
  memories: [],
  travelPlans: [],
  gameSessions: [],
  aiAnalyses: [],
  suggestions: null,
  isLoading: false,
  error: null,
  lastSync: null,
};

// Reducer
function dataReducer(state: DataState, action: DataAction): DataState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_FAMILY_MEMBERS':
      return { ...state, familyMembers: action.payload };
    case 'ADD_FAMILY_MEMBER':
      return { ...state, familyMembers: [...state.familyMembers, action.payload] };
    case 'UPDATE_FAMILY_MEMBER':
      return {
        ...state,
        familyMembers: state.familyMembers.map(member =>
          member.id === action.payload.id ? { ...member, ...action.payload.updates } : member
        ),
      };
    case 'REMOVE_FAMILY_MEMBER':
      return {
        ...state,
        familyMembers: state.familyMembers.filter(member => member.id !== action.payload),
      };
    case 'SET_MEMORIES':
      return { ...state, memories: action.payload };
    case 'ADD_MEMORY':
      return { ...state, memories: [...state.memories, action.payload] };
    case 'UPDATE_MEMORY':
      return {
        ...state,
        memories: state.memories.map(memory =>
          memory.id === action.payload.id ? { ...memory, ...action.payload.updates } : memory
        ),
      };
    case 'REMOVE_MEMORY':
      return {
        ...state,
        memories: state.memories.filter(memory => memory.id !== action.payload),
      };
    case 'SET_TRAVEL_PLANS':
      return { ...state, travelPlans: action.payload };
    case 'ADD_TRAVEL_PLAN':
      return { ...state, travelPlans: [...state.travelPlans, action.payload] };
    case 'UPDATE_TRAVEL_PLAN':
      return {
        ...state,
        travelPlans: state.travelPlans.map(plan =>
          plan.id === action.payload.id ? { ...plan, ...action.payload.updates } : plan
        ),
      };
    case 'SET_GAME_SESSIONS':
      return { ...state, gameSessions: action.payload };
    case 'ADD_GAME_SESSION':
      return { ...state, gameSessions: [...state.gameSessions, action.payload] };
    case 'UPDATE_GAME_SESSION':
      return {
        ...state,
        gameSessions: state.gameSessions.map(session =>
          session.session_id === action.payload.id ? { ...session, ...action.payload.updates } : session
        ),
      };
    case 'SET_AI_ANALYSES':
      return { ...state, aiAnalyses: action.payload };
    case 'ADD_AI_ANALYSIS':
      return { ...state, aiAnalyses: [...state.aiAnalyses, action.payload] };
    case 'SET_SUGGESTIONS':
      return { ...state, suggestions: action.payload };
    case 'SET_LAST_SYNC':
      return { ...state, lastSync: action.payload };
    case 'RESET_STATE':
      return initialState;
    default:
      return state;
  }
}

// Context
interface DataContextType {
  state: DataState;
  dispatch: React.Dispatch<DataAction>;
  // Family Members
  familyMembers: FamilyMember[];
  addFamilyMember: (member: Omit<FamilyMember, 'id'>) => Promise<void>;
  updateFamilyMember: (id: string, updates: Partial<FamilyMember>) => Promise<void>;
  removeFamilyMember: (id: string) => Promise<void>;
  // Memories
  memories: Memory[];
  addMemory: (memory: Omit<Memory, 'id'>) => Promise<void>;
  updateMemory: (id: string, updates: Partial<Memory>) => Promise<void>;
  removeMemory: (id: string) => Promise<void>;
  // Travel Plans
  travelPlans: TravelPlan[];
  addTravelPlan: (plan: Omit<TravelPlan, 'id'>) => Promise<void>;
  updateTravelPlan: (id: string, updates: Partial<TravelPlan>) => Promise<void>;
  // Game Sessions
  gameSessions: GameSession[];
  addGameSession: (session: Omit<GameSession, 'session_id' | 'created_at'>) => Promise<void>;
  updateGameSession: (id: string, updates: Partial<GameSession>) => Promise<void>;
  // AI Analysis
  aiAnalyses: AIAnalysis[];
  addAIAnalysis: (analysis: Omit<AIAnalysis, 'id' | 'created_at'>) => Promise<void>;
  // Suggestions
  suggestions: any;
  refreshSuggestions: () => Promise<void>;
  // Utilities
  isLoading: boolean;
  error: string | null;
  lastSync: Date | null;
  refreshAllData: () => Promise<void>;
  clearError: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Provider Component
interface DataProviderProps {
  children: ReactNode;
}

export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(dataReducer, initialState);
  const { language } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isArabic = language === 'ar';

  // React Query hooks for data fetching
  const { data: familyMembersData = [] } = useQuery({
    queryKey: queryKeys.familyMembers,
    queryFn: () => apiService.getFamilyMembers(),
    enabled: !!user,
  });

  const { data: memoriesData = [] } = useQuery({
    queryKey: queryKeys.memories(),
    queryFn: () => apiService.getMemories(),
    enabled: !!user,
  });

  const { data: suggestionsData } = useQuery({
    queryKey: queryKeys.memorySuggestions(),
    queryFn: () => apiService.getMemorySuggestions(),
    enabled: !!user && memoriesData.length > 0,
  });

  // Mutations
  const addFamilyMemberMutation = useMutation({
    mutationFn: (member: Omit<FamilyMember, 'id'>) => apiService.createFamilyMember(member),
    onSuccess: (newMember) => {
      dispatch({ type: 'ADD_FAMILY_MEMBER', payload: newMember });
      queryClient.invalidateQueries({ queryKey: queryKeys.familyMembers });
      toast.success(isArabic ? 'تم إضافة العضو بنجاح' : 'Family member added successfully');
    },
    onError: (error) => {
      toast.error(isArabic ? 'فشل في إضافة العضو' : 'Failed to add family member');
    },
  });

  const addMemoryMutation = useMutation({
    mutationFn: (memory: Omit<Memory, 'id'>) => apiService.createMemory(memory),
    onSuccess: (newMemory) => {
      dispatch({ type: 'ADD_MEMORY', payload: newMemory });
      queryClient.invalidateQueries({ queryKey: queryKeys.memories() });
      toast.success(isArabic ? 'تم إضافة الذكرى بنجاح' : 'Memory added successfully');
    },
    onError: (error) => {
      toast.error(isArabic ? 'فشل في إضافة الذكرى' : 'Failed to add memory');
    },
  });

  // Update state when data changes
  useEffect(() => {
    if (familyMembersData) {
      dispatch({ type: 'SET_FAMILY_MEMBERS', payload: familyMembersData });
    }
  }, [familyMembersData]);

  useEffect(() => {
    if (memoriesData) {
      dispatch({ type: 'SET_MEMORIES', payload: memoriesData });
    }
  }, [memoriesData]);

  useEffect(() => {
    if (suggestionsData) {
      dispatch({ type: 'SET_SUGGESTIONS', payload: suggestionsData });
    }
  }, [suggestionsData]);

  // Action creators
  const addFamilyMember = async (member: Omit<FamilyMember, 'id'>) => {
    await addFamilyMemberMutation.mutateAsync(member);
  };

  const updateFamilyMember = async (id: string, updates: Partial<FamilyMember>) => {
    try {
      const updatedMember = await apiService.updateFamilyMember(id, updates);
      dispatch({ type: 'UPDATE_FAMILY_MEMBER', payload: { id, updates: updatedMember } });
      queryClient.invalidateQueries({ queryKey: queryKeys.familyMembers });
      toast.success(isArabic ? 'تم تحديث العضو بنجاح' : 'Family member updated successfully');
    } catch (error) {
      toast.error(isArabic ? 'فشل في تحديث العضو' : 'Failed to update family member');
    }
  };

  const removeFamilyMember = async (id: string) => {
    try {
      await apiService.deleteFamilyMember(id);
      dispatch({ type: 'REMOVE_FAMILY_MEMBER', payload: id });
      queryClient.invalidateQueries({ queryKey: queryKeys.familyMembers });
      toast.success(isArabic ? 'تم حذف العضو بنجاح' : 'Family member removed successfully');
    } catch (error) {
      toast.error(isArabic ? 'فشل في حذف العضو' : 'Failed to remove family member');
    }
  };

  const addMemory = async (memory: Omit<Memory, 'id'>) => {
    await addMemoryMutation.mutateAsync(memory);
  };

  const updateMemory = async (id: string, updates: Partial<Memory>) => {
    try {
      const updatedMemory = await apiService.updateMemory(id, updates);
      dispatch({ type: 'UPDATE_MEMORY', payload: { id, updates: updatedMemory } });
      queryClient.invalidateQueries({ queryKey: queryKeys.memories() });
      toast.success(isArabic ? 'تم تحديث الذكرى بنجاح' : 'Memory updated successfully');
    } catch (error) {
      toast.error(isArabic ? 'فشل في تحديث الذكرى' : 'Failed to update memory');
    }
  };

  const removeMemory = async (id: string) => {
    try {
      await apiService.deleteMemory(id);
      dispatch({ type: 'REMOVE_MEMORY', payload: id });
      queryClient.invalidateQueries({ queryKey: queryKeys.memories() });
      toast.success(isArabic ? 'تم حذف الذكرى بنجاح' : 'Memory removed successfully');
    } catch (error) {
      toast.error(isArabic ? 'فشل في حذف الذكرى' : 'Failed to remove memory');
    }
  };

  const addTravelPlan = async (plan: Omit<TravelPlan, 'id'>) => {
    try {
      const newPlan = await apiService.createTravelPlan(plan);
      dispatch({ type: 'ADD_TRAVEL_PLAN', payload: newPlan });
      toast.success(isArabic ? 'تم إنشاء خطة السفر بنجاح' : 'Travel plan created successfully');
    } catch (error) {
      toast.error(isArabic ? 'فشل في إنشاء خطة السفر' : 'Failed to create travel plan');
    }
  };

  const updateTravelPlan = async (id: string, updates: Partial<TravelPlan>) => {
    try {
      const updatedPlan = await apiService.updateTravelPlan(id, updates);
      dispatch({ type: 'UPDATE_TRAVEL_PLAN', payload: { id, updates: updatedPlan } });
      toast.success(isArabic ? 'تم تحديث خطة السفر بنجاح' : 'Travel plan updated successfully');
    } catch (error) {
      toast.error(isArabic ? 'فشل في تحديث خطة السفر' : 'Failed to update travel plan');
    }
  };

  const addGameSession = async (session: Omit<GameSession, 'session_id' | 'created_at'>) => {
    try {
      const newSession = await apiService.createGameSession(session);
      dispatch({ type: 'ADD_GAME_SESSION', payload: newSession });
      toast.success(isArabic ? 'تم إنشاء جلسة اللعب بنجاح' : 'Game session created successfully');
    } catch (error) {
      toast.error(isArabic ? 'فشل في إنشاء جلسة اللعب' : 'Failed to create game session');
    }
  };

  const updateGameSession = async (id: string, updates: Partial<GameSession>) => {
    try {
      const updatedSession = await apiService.updateGameSession(id, updates);
      dispatch({ type: 'UPDATE_GAME_SESSION', payload: { id, updates: updatedSession } });
      toast.success(isArabic ? 'تم تحديث جلسة اللعب بنجاح' : 'Game session updated successfully');
    } catch (error) {
      toast.error(isArabic ? 'فشل في تحديث جلسة اللعب' : 'Failed to update game session');
    }
  };

  const addAIAnalysis = async (analysis: Omit<AIAnalysis, 'id' | 'created_at'>) => {
    const newAnalysis: AIAnalysis = {
      ...analysis,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_AI_ANALYSIS', payload: newAnalysis });
  };

  const refreshSuggestions = async () => {
    try {
      const suggestions = await apiService.getMemorySuggestions();
      dispatch({ type: 'SET_SUGGESTIONS', payload: suggestions });
    } catch (error) {
      console.error('Failed to refresh suggestions:', error);
    }
  };

  const refreshAllData = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.familyMembers }),
        queryClient.invalidateQueries({ queryKey: queryKeys.memories() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.memorySuggestions() }),
      ]);
      dispatch({ type: 'SET_LAST_SYNC', payload: new Date() });
      toast.success(isArabic ? 'تم تحديث البيانات بنجاح' : 'Data refreshed successfully');
    } catch (error) {
      toast.error(isArabic ? 'فشل في تحديث البيانات' : 'Failed to refresh data');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const clearError = () => {
    dispatch({ type: 'SET_ERROR', payload: null });
  };

  const contextValue: DataContextType = {
    state,
    dispatch,
    // Family Members
    familyMembers: state.familyMembers,
    addFamilyMember,
    updateFamilyMember,
    removeFamilyMember,
    // Memories
    memories: state.memories,
    addMemory,
    updateMemory,
    removeMemory,
    // Travel Plans
    travelPlans: state.travelPlans,
    addTravelPlan,
    updateTravelPlan,
    // Game Sessions
    gameSessions: state.gameSessions,
    addGameSession,
    updateGameSession,
    // AI Analysis
    aiAnalyses: state.aiAnalyses,
    addAIAnalysis,
    // Suggestions
    suggestions: state.suggestions,
    refreshSuggestions,
    // Utilities
    isLoading: state.isLoading,
    error: state.error,
    lastSync: state.lastSync,
    refreshAllData,
    clearError,
  };

  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  );
};

// Hook
export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
