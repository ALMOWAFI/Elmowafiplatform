import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { preferencesService } from '@/lib/services/preferences.service';
import { 
  UserPreferences, 
  PreferenceUpdate, 
  DEFAULT_PREFERENCES 
} from '@/types/preferences';

interface PreferencesContextType {
  // Current preferences
  preferences: UserPreferences | null;
  
  // Loading state
  isLoading: boolean;
  
  // Error state
  error: Error | null;
  
  // Actions
  updatePreferences: (updates: PreferenceUpdate) => Promise<void>;
  resetPreferences: () => Promise<void>;
  
  // Convenience getters
  getTravelPreferences: () => UserPreferences['travel'] | null;
  getAIPreferences: () => UserPreferences['ai'] | null;
  getFamilyPreferences: () => UserPreferences['family'] | null;
  
  // Convenience updaters
  updateTravelPreferences: (updates: Partial<UserPreferences['travel']>) => Promise<void>;
  updateAIPreferences: (updates: Partial<UserPreferences['ai']>) => Promise<void>;
  updateFamilyPreferences: (updates: Partial<UserPreferences['family']>) => Promise<void>;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data: session } = useSession();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load preferences when user changes
  useEffect(() => {
    const loadPreferences = async () => {
      if (!session?.user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        // Initialize the preferences service if needed
        if (!isInitialized) {
          await preferencesService.initialize();
          setIsInitialized(true);
        }
        
        // Load user preferences
        const prefs = await preferencesService.getPreferences(session.user.id);
        setPreferences(prefs);
      } catch (err) {
        console.error('Failed to load preferences:', err);
        setError(err instanceof Error ? err : new Error('Failed to load preferences'));
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, [session?.user?.id, isInitialized]);

  // Update preferences
  const updatePreferences = useCallback(async (updates: PreferenceUpdate) => {
    if (!session?.user?.id) {
      throw new Error('User not authenticated');
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const updated = await preferencesService.updatePreferences(
        session.user.id, 
        updates
      );
      
      setPreferences(updated);
    } catch (err) {
      console.error('Failed to update preferences:', err);
      setError(err instanceof Error ? err : new Error('Failed to update preferences'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id]);

  // Reset preferences to default
  const resetPreferences = useCallback(async () => {
    if (!session?.user?.id) {
      throw new Error('User not authenticated');
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const defaultPrefs = await preferencesService.resetPreferences(session.user.id);
      setPreferences(defaultPrefs);
    } catch (err) {
      console.error('Failed to reset preferences:', err);
      setError(err instanceof Error ? err : new Error('Failed to reset preferences'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id]);

  // Convenience getters
  const getTravelPreferences = useCallback(() => {
    return preferences?.travel || null;
  }, [preferences]);

  const getAIPreferences = useCallback(() => {
    return preferences?.ai || null;
  }, [preferences]);

  const getFamilyPreferences = useCallback(() => {
    return preferences?.family || null;
  }, [preferences]);

  // Convenience updaters
  const updateTravelPreferences = useCallback(async (updates: Partial<UserPreferences['travel']>) => {
    return updatePreferences({ travel: updates });
  }, [updatePreferences]);

  const updateAIPreferences = useCallback(async (updates: Partial<UserPreferences['ai']>) => {
    return updatePreferences({ ai: updates });
  }, [updatePreferences]);

  const updateFamilyPreferences = useCallback(async (updates: Partial<UserPreferences['family']>) => {
    return updatePreferences({ family: updates });
  }, [updatePreferences]);

  // Context value
  const contextValue = {
    preferences,
    isLoading,
    error,
    updatePreferences,
    resetPreferences,
    getTravelPreferences,
    getAIPreferences,
    getFamilyPreferences,
    updateTravelPreferences,
    updateAIPreferences,
    updateFamilyPreferences,
  };

  return (
    <PreferencesContext.Provider value={contextValue}>
      {children}
    </PreferencesContext.Provider>
  );
};

// Custom hook to use the preferences context
export const usePreferences = (): PreferencesContextType => {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
};

// Helper hook for travel preferences
export const useTravelPreferences = () => {
  const { 
    preferences, 
    updateTravelPreferences, 
    getTravelPreferences 
  } = usePreferences();
  
  return {
    travelPreferences: preferences?.travel || null,
    updateTravelPreferences,
    getTravelPreferences,
  };
};

// Helper hook for AI preferences
export const useAIPreferences = () => {
  const { 
    preferences, 
    updateAIPreferences, 
    getAIPreferences 
  } = usePreferences();
  
  return {
    aiPreferences: preferences?.ai || null,
    updateAIPreferences,
    getAIPreferences,
  };
};

// Helper hook for family preferences
export const useFamilyPreferences = () => {
  const { 
    preferences, 
    updateFamilyPreferences, 
    getFamilyPreferences 
  } = usePreferences();
  
  return {
    familyPreferences: preferences?.family || null,
    updateFamilyPreferences,
    getFamilyPreferences,
  };
};

// Default export for backward compatibility
export default PreferencesContext;
