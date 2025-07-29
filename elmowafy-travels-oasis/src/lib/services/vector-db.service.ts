import { createVectorDB, createOpenAIEmbeddingFunction, VectorDBClient } from '@/lib/vector-db';
import { initializeCollections, COLLECTIONS } from '@/lib/vector-db/utils';
import { env } from '@/env.mjs';

class VectorDBService {
  private static instance: VectorDBService;
  private client: VectorDBClient | null = null;
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): VectorDBService {
    if (!VectorDBService.instance) {
      VectorDBService.instance = new VectorDBService();
    }
    return VectorDBService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Create vector DB client
      this.client = await createVectorDB('chroma', {
        url: env.VECTOR_DB_URL || 'http://localhost:8000',
        apiKey: env.VECTOR_DB_API_KEY || 'default_api_key',
        defaultCollection: COLLECTIONS.CONVERSATIONS,
      });

      // Set up OpenAI embedding function if API key is available
      if (env.OPENAI_API_KEY) {
        const embeddingFunction = createOpenAIEmbeddingFunction(
          env.OPENAI_API_KEY,
          'text-embedding-3-small'
        );
        this.client.setEmbeddingFunction(embeddingFunction);
      } else {
        console.warn('OPENAI_API_KEY not found. Using default embedding function.');
      }

      // Initialize required collections
      await initializeCollections(this.client, [
        COLLECTIONS.CONVERSATIONS,
        COLLECTIONS.MEMORIES,
        COLLECTIONS.KNOWLEDGE,
        COLLECTIONS.TRAVEL_PLACES,
        COLLECTIONS.FAMILY_MEMBERS,
        COLLECTIONS.GAMING_KNOWLEDGE,
      ]);

      this.isInitialized = true;
      console.log('VectorDB service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize VectorDB service:', error);
      throw error;
    }
  }

  public getClient(): VectorDBClient {
    if (!this.client || !this.isInitialized) {
      throw new Error('VectorDB service not initialized. Call initialize() first.');
    }
    return this.client;
  }

  // Helper methods for common operations
  public async searchMemories(query: string, options = {}) {
    return this.searchCollection(COLLECTIONS.MEMORIES, query, options);
  }

  public async searchKnowledge(query: string, options = {}) {
    return this.searchCollection(COLLECTIONS.KNOWLEDGE, query, options);
  }

  public async searchTravelPlaces(query: string, options = {}) {
    return this.searchCollection(COLLECTIONS.TRAVEL_PLACES, query, options);
  }

  public async searchFamilyMembers(query: string, options = {}) {
    return this.searchCollection(COLLECTIONS.FAMILY_MEMBERS, query, options);
  }

  public async searchGamingKnowledge(query: string, options = {}) {
    return this.searchCollection(COLLECTIONS.GAMING_KNOWLEDGE, query, options);
  }

  private async searchCollection(collection: string, query: string, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return this.getClient().search(collection, query, options);
  }

  // Add more helper methods as needed...
}

export const vectorDBService = VectorDBService.getInstance();

// Initialize the service when this module is imported
vectorDBService.initialize().catch(console.error);
