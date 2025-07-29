/**
 * Types for Vector Database Integration
 */

export interface VectorDBConfig {
  url: string;
  apiKey: string;
  defaultCollection?: string;
  embeddingModel?: string;
  dimensions?: number;
}

export interface VectorSearchResult<T = any> {
  id: string;
  score: number;
  metadata: T;
  vector?: number[];
  content?: string;
}

export interface VectorRecord<T = any> {
  id: string;
  vector: number[];
  content: string;
  metadata: T;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SearchOptions {
  limit?: number;
  minScore?: number;
  includeVectors?: boolean;
  filter?: Record<string, any>;
}

export interface CollectionInfo {
  name: string;
  count: number;
  dimensions: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmbeddingFunction {
  (text: string | string[]): Promise<number[][]>;
}

export interface VectorDBClient {
  // Collection operations
  createCollection(name: string, options?: { dimension?: number }): Promise<void>;
  deleteCollection(name: string): Promise<boolean>;
  listCollections(): Promise<CollectionInfo[]>;
  collectionExists(name: string): Promise<boolean>;

  // Data operations
  insert<T = any>(
    collection: string,
    records: Omit<VectorRecord<T>, 'id'>[]
  ): Promise<string[]>;
  
  search<T = any>(
    collection: string,
    query: string | number[],
    options?: SearchOptions
  ): Promise<VectorSearchResult<T>[]>;
  
  get<T = any>(collection: string, id: string): Promise<VectorRecord<T> | null>;
  
  delete(collection: string, ids: string[]): Promise<number>;
  
  update<T = any>(
    collection: string,
    id: string,
    updates: Partial<VectorRecord<T>>
  ): Promise<boolean>;
  
  // Batch operations
  batchUpsert<T = any>(
    collection: string,
    records: Array<Partial<VectorRecord<T>> & { id?: string }>
  ): Promise<string[]>;
  
  // Utility methods
  getEmbeddingFunction(): EmbeddingFunction;
  setEmbeddingFunction(fn: EmbeddingFunction): void;
  
  // Index management
  createIndex(collection: string): Promise<void>;
  
  // Cleanup
  close(): Promise<void>;
}
