import { VectorDBClient, VectorDBConfig, VectorRecord, VectorSearchResult, CollectionInfo, SearchOptions } from './types';

/**
 * Base implementation of VectorDBClient that can be extended by specific providers
 */
export abstract class BaseVectorDB implements VectorDBClient {
  protected config: VectorDBConfig;
  protected embeddingFunction: (text: string | string[]) => Promise<number[][]>;
  protected defaultCollection: string;
  protected isInitialized: boolean = false;

  constructor(config: VectorDBConfig) {
    this.config = {
      defaultCollection: 'default',
      embeddingModel: 'text-embedding-3-small',
      dimensions: 1536, // Default for text-embedding-3-small
      ...config
    };
    this.defaultCollection = this.config.defaultCollection || 'default';
    
    // Default embedding function that throws if not set
    this.embeddingFunction = async () => {
      throw new Error('No embedding function provided. Use setEmbeddingFunction() to set one.');
    };
  }

  // Abstract methods that must be implemented by subclasses
  abstract createCollection(name: string, options?: { dimension?: number }): Promise<void>;
  abstract deleteCollection(name: string): Promise<boolean>;
  abstract listCollections(): Promise<CollectionInfo[]>;
  abstract collectionExists(name: string): Promise<boolean>;
  
  abstract insert<T = any>(
    collection: string,
    records: Omit<VectorRecord<T>, 'id'>[]
  ): Promise<string[]>;
  
  abstract search<T = any>(
    collection: string,
    query: string | number[],
    options?: SearchOptions
  ): Promise<VectorSearchResult<T>[]>;
  
  abstract get<T = any>(collection: string, id: string): Promise<VectorRecord<T> | null>;
  abstract delete(collection: string, ids: string[]): Promise<number>;
  abstract update<T = any>(
    collection: string,
    id: string,
    updates: Partial<VectorRecord<T>>
  ): Promise<boolean>;
  
  abstract batchUpsert<T = any>(
    collection: string,
    records: Array<Partial<VectorRecord<T>> & { id?: string }>
  ): Promise<string[]>;
  
  abstract createIndex(collection: string): Promise<void>;
  abstract close(): Promise<void>;

  // Common implementation for getting or creating a collection
  protected async ensureCollection(
    name: string, 
    options: { dimension?: number } = {}
  ): Promise<void> {
    const exists = await this.collectionExists(name);
    if (!exists) {
      await this.createCollection(name, options);
    }
  }

  // Common implementation for getting embeddings
  protected async getEmbedding(input: string | string[]): Promise<number[][]> {
    try {
      return await this.embeddingFunction(input);
    } catch (error) {
      console.error('Error getting embeddings:', error);
      throw new Error(`Failed to get embeddings: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Set the embedding function to use
  setEmbeddingFunction(fn: (text: string | string[]) => Promise<number[][]>): void {
    this.embeddingFunction = fn;
  }

  // Get the current embedding function
  getEmbeddingFunction(): (text: string | string[]) => Promise<number[][]> {
    return this.embeddingFunction;
  }

  // Helper to validate collection name
  protected validateCollectionName(name: string): void {
    if (!name || typeof name !== 'string' || name.trim() === '') {
      throw new Error('Collection name must be a non-empty string');
    }
    // Add more validation if needed (e.g., length, allowed characters)
  }

  // Helper to validate record
  protected validateRecord<T>(record: Partial<VectorRecord<T>>): void {
    if (!record) {
      throw new Error('Record cannot be null or undefined');
    }
    
    if (record.vector && !Array.isArray(record.vector)) {
      throw new Error('Vector must be an array of numbers');
    }
    
    if (record.content && typeof record.content !== 'string') {
      throw new Error('Content must be a string');
    }
  }
}
