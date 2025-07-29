import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { vectorDBService } from '@/lib/services/vector-db.service';
import { COLLECTIONS } from '@/lib/vector-db/utils';
import { useLanguage } from './LanguageContext';
import { usePreferences } from './PreferencesContext';
import { getPersonalityPrompt, getResponseStyle } from '@/lib/ai/personality';

interface AIAssistantContextType {
  // Memory operations
  addMemory: (content: string, metadata?: Record<string, any>) => Promise<string>;
  searchMemories: (query: string, options?: any) => Promise<any[]>;
  
  // Knowledge operations
  searchKnowledge: (query: string, options?: any) => Promise<any[]>;
  
  // Travel places operations
  searchTravelPlaces: (query: string, options?: any) => Promise<any[]>;
  
  // Family members operations
  searchFamilyMembers: (query: string, options?: any) => Promise<any[]>;
  
  // Current context
  currentContext: any;
  updateContext: (updates: any) => void;
  
  // AI Configuration
  getAIConfig: () => {
    systemPrompt: string;
    model: string;
    maxTokens: number;
    temperature: number;
    presencePenalty: number;
    frequencyPenalty: number;
  };
  
  // Loading states
  isLoading: boolean;
  error: Error | null;
}

const AIAssistantContext = createContext<AIAssistantContextType | undefined>(undefined);

export const AIAssistantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data: session } = useSession();
  const { currentLanguage } = useLanguage();
  const { preferences } = usePreferences();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentContext, setCurrentContext] = useState<Record<string, any>>({
    userId: null,
    conversationId: null,
    recentMemories: [],
    relevantKnowledge: [],
    userPreferences: {},
  });
  
  // Update context when preferences change
  useEffect(() => {
    if (preferences) {
      setCurrentContext(prev => ({
        ...prev,
        userPreferences: {
          ...prev.userPreferences,
          ...preferences,
          language: currentLanguage, // Ensure language is always up to date
        },
      }));
    }
  }, [preferences, currentLanguage]);

  // Initialize the vector DB service
  useEffect(() => {
    const init = async () => {
      try {
        setIsLoading(true);
        await vectorDBService.initialize();
        console.log('AI Assistant context initialized');
      } catch (err) {
        console.error('Failed to initialize AI Assistant context:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  // Update user ID when session changes
  useEffect(() => {
    if (session?.user?.id) {
      setCurrentContext(prev => ({
        ...prev,
        userId: session.user.id,
      }));
    }
  }, [session]);

  // Add a new memory
  const addMemory = useCallback(async (content: string, metadata: Record<string, any> = {}) => {
    try {
      setIsLoading(true);
      
      // Add language information to metadata
      const enhancedMetadata = {
        ...metadata,
        language: currentLanguage,
        timestamp: new Date().toISOString(),
        userId: currentContext.userId,
      };
      
      // Add to vector database
      const id = await vectorDBService.addMemory(content, enhancedMetadata);
      
      // Update context with the new memory
      setCurrentContext(prev => ({
        ...prev,
        recentMemories: [
          { id, content, metadata: enhancedMetadata },
          ...prev.recentMemories.slice(0, 4), // Keep only the 5 most recent memories
        ],
      }));
      
      return id;
    } catch (err) {
      console.error('Error adding memory:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentContext.userId, currentLanguage]);

  // Search memories
  const searchMemories = useCallback(async (query: string, options: any = {}) => {
    try {
      setIsLoading(true);
      const results = await vectorDBService.searchMemories(query, {
        ...options,
        filter: {
          ...(options.filter || {}),
          userId: currentContext.userId, // Only search user's memories
        },
      });
      return results;
    } catch (err) {
      console.error('Error searching memories:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentContext.userId]);

  // Search knowledge base
  const searchKnowledge = useCallback(async (query: string, options: any = {}) => {
    try {
      setIsLoading(true);
      return await vectorDBService.searchKnowledge(query, {
        ...options,
        // Add any additional filtering based on user preferences or context
      });
    } catch (err) {
      console.error('Error searching knowledge:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Search travel places
  const searchTravelPlaces = useCallback(async (query: string, options: any = {}) => {
    try {
      setIsLoading(true);
      return await vectorDBService.searchTravelPlaces(query, {
        ...options,
        // Add any additional filtering based on user preferences or context
      });
    } catch (err) {
      console.error('Error searching travel places:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Search family members
  const searchFamilyMembers = useCallback(async (query: string, options: any = {}) => {
    try {
      setIsLoading(true);
      return await vectorDBService.searchFamilyMembers(query, {
        ...options,
        // Add any additional filtering based on user context
      });
    } catch (err) {
      console.error('Error searching family members:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update context
  const updateContext = useCallback((updates: any) => {
    setCurrentContext(prev => ({
      ...prev,
      ...updates,
    }));
  }, []);

  // Get AI configuration based on preferences
  const getAIConfig = useCallback(() => {
    const aiPrefs = preferences?.ai || {};
    const travelPrefs = preferences?.travel || {};
    
    // Get personality-based configuration
    const responseStyle = getResponseStyle(aiPrefs);
    
    // Get system prompt with personality
    const systemPrompt = getPersonalityPrompt({
      ...aiPrefs,
      language: currentLanguage,
    });
    
    // Add travel preferences to context if user has allowed it
    if (aiPrefs.privacy?.shareTravelHistory) {
      systemPrompt += `\n\nUser's travel preferences: ${JSON.stringify(travelPrefs, null, 2)}`;
    }
    
    return {
      systemPrompt,
      model: 'gpt-4-turbo', // Default model, can be made configurable
      ...responseStyle,
    };
  }, [preferences, currentLanguage]);

  // Context value
  const contextValue = useMemo(() => ({
    addMemory,
    searchMemories,
    searchKnowledge,
    searchTravelPlaces,
    searchFamilyMembers,
    currentContext,
    updateContext,
    getAIConfig,
    isLoading,
    error,
  }), [
    addMemory, 
    searchMemories, 
    searchKnowledge, 
    searchTravelPlaces, 
    searchFamilyMembers, 
    currentContext, 
    updateContext, 
    getAIConfig, 
    isLoading, 
    error
  ]);

  return (
    <AIAssistantContext.Provider value={contextValue}>
      {children}
    </AIAssistantContext.Provider>
  );
};

// Custom hook to use the AI Assistant context
export const useAIAssistant = (): AIAssistantContextType => {
  const context = useContext(AIAssistantContext);
  if (context === undefined) {
    throw new Error('useAIAssistant must be used within an AIAssistantProvider');
  }
  return context;
};
