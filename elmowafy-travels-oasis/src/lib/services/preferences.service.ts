import { vectorDBService } from './vector-db.service';
import { COLLECTIONS } from '@/lib/vector-db/utils';
import { 
  UserPreferences, 
  DEFAULT_PREFERENCES, 
  PreferenceUpdate 
} from '@/types/preferences';

const PREFERENCES_COLLECTION = 'user_preferences';
const CURRENT_VERSION = 1;

class PreferencesService {
  private static instance: PreferencesService;
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): PreferencesService {
    if (!PreferencesService.instance) {
      PreferencesService.instance = new PreferencesService();
    }
    return PreferencesService.instance;
  }

  /**
   * Initialize the preferences service
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Ensure the preferences collection exists
      await vectorDBService.initialize();
      const client = vectorDBService.getClient();
      
      if (!(await client.collectionExists(PREFERENCES_COLLECTION))) {
        await client.createCollection(PREFERENCES_COLLECTION, {
          description: 'User preferences storage',
        });
      }
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize PreferencesService:', error);
      throw error;
    }
  }

  /**
   * Get user preferences
   */
  public async getPreferences(userId: string): Promise<UserPreferences> {
    await this.ensureInitialized();
    
    try {
      const result = await vectorDBService.getClient().get(
        PREFERENCES_COLLECTION, 
        `prefs_${userId}`
      );

      if (!result) {
        // Return default preferences if none exist
        return this.createDefaultPreferences(userId);
      }

      // Migrate preferences if needed
      return this.migratePreferences(result as UserPreferences);
    } catch (error) {
      console.error('Error getting preferences:', error);
      // Return default preferences on error
      return this.createDefaultPreferences(userId);
    }
  }

  /**
   * Update user preferences
   */
  public async updatePreferences(
    userId: string, 
    updates: PreferenceUpdate
  ): Promise<UserPreferences> {
    await this.ensureInitialized();
    
    try {
      // Get current preferences
      const current = await this.getPreferences(userId);
      
      // Deep merge updates with current preferences
      const updated: UserPreferences = {
        ...current,
        ...updates,
        travel: { ...current.travel, ...(updates.travel || {}) },
        family: { ...current.family, ...(updates.family || {}) },
        ai: { ...current.ai, ...(updates.ai || {}) },
        updatedAt: new Date(),
      };

      // Save to vector database
      await vectorDBService.getClient().upsert(
        PREFERENCES_COLLECTION,
        {
          id: `prefs_${userId}`,
          content: JSON.stringify(updated),
          metadata: {
            type: 'user_preferences',
            userId,
            version: CURRENT_VERSION,
            updatedAt: new Date().toISOString(),
          },
        }
      );

      return updated;
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw error;
    }
  }

  /**
   * Reset preferences to default
   */
  public async resetPreferences(userId: string): Promise<UserPreferences> {
    const defaultPrefs = this.createDefaultPreferences(userId);
    return this.updatePreferences(userId, defaultPrefs);
  }

  /**
   * Get travel-specific preferences
   */
  public async getTravelPreferences(userId: string) {
    const prefs = await this.getPreferences(userId);
    return prefs.travel;
  }

  /**
   * Update travel preferences
   */
  public async updateTravelPreferences(
    userId: string,
    travelUpdates: Partial<UserPreferences['travel']>
  ) {
    return this.updatePreferences(userId, {
      travel: travelUpdates,
    });
  }

  /**
   * Get AI assistant preferences
   */
  public async getAIPreferences(userId: string) {
    const prefs = await this.getPreferences(userId);
    return prefs.ai;
  }

  /**
   * Update AI assistant preferences
   */
  public async updateAIPreferences(
    userId: string,
    aiUpdates: Partial<UserPreferences['ai']>
  ) {
    return this.updatePreferences(userId, {
      ai: aiUpdates,
    });
  }

  /**
   * Get family preferences
   */
  public async getFamilyPreferences(userId: string) {
    const prefs = await this.getPreferences(userId);
    return prefs.family;
  }

  /**
   * Update family preferences
   */
  public async updateFamilyPreferences(
    userId: string,
    familyUpdates: Partial<UserPreferences['family']>
  ) {
    return this.updatePreferences(userId, {
      family: familyUpdates,
    });
  }

  /**
   * Create default preferences for a user
   */
  private createDefaultPreferences(userId: string): UserPreferences {
    return {
      ...DEFAULT_PREFERENCES,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Migrate preferences to the current version if needed
   */
  private migratePreferences(prefs: UserPreferences): UserPreferences {
    if (prefs.version === CURRENT_VERSION) {
      return prefs;
    }

    // Migration logic for different versions
    const migrated = { ...prefs };

    // Example migration (add more as needed)
    if (!migrated.version || migrated.version < 1) {
      // Migrate to version 1
      migrated.version = 1;
      // Add any migration logic here
    }

    return migrated;
  }

  /**
   * Ensure the service is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }
}

export const preferencesService = PreferencesService.getInstance();

// Initialize the service when imported
preferencesService.initialize().catch(console.error);
