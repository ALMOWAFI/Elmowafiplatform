import { ChromaClient, Collection, IncludeEnum } from 'chromadb';
import { BaseVectorDB } from './base';
import { 
  VectorDBClient, 
  VectorDBConfig, 
  VectorRecord, 
  VectorSearchResult, 
  CollectionInfo, 
  SearchOptions 
} from './types';

/**
 * ChromaDB implementation of VectorDBClient
 */
export class ChromaVectorDB extends BaseVectorDB {
  private client: ChromaClient;
  private collections: Map<string, Collection> = new Map();

  constructor(config: VectorDBConfig) {
    super(config);
    this.client = new ChromaClient({
      path: config.url,
      fetchOptions: {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
      },
    });
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      await this.client.heartbeat();
      this.isInitialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize ChromaDB client: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async createCollection(name: string, options: { dimension?: number } = {}): Promise<void> {
    this.validateCollectionName(name);
    
    try {
      const collection = await this.client.createCollection({
        name,
        metadata: {
          dimension: options.dimension || this.config.dimensions,
          created_at: new Date().toISOString(),
        },
      });
      
      this.collections.set(name, collection);
    } catch (error) {
      if ((error as Error).message.includes('already exists')) {
        return; // Collection already exists, which is fine
      }
      throw error;
    }
  }

  async deleteCollection(name: string): Promise<boolean> {
    try {
      await this.client.deleteCollection({ name });
      this.collections.delete(name);
      return true;
    } catch (error) {
      if ((error as Error).message.includes('does not exist')) {
        return false;
      }
      throw error;
    }
  }

  async listCollections(): Promise<CollectionInfo[]> {
    const collections = await this.client.listCollections();
    return collections.map(collection => ({
      name: collection.name,
      count: collection.metadata?.count || 0,
      dimensions: collection.metadata?.dimension || 0,
      createdAt: new Date(collection.metadata?.created_at || Date.now()),
      updatedAt: new Date(collection.metadata?.updated_at || Date.now()),
    }));
  }

  async collectionExists(name: string): Promise<boolean> {
    try {
      const collections = await this.listCollections();
      return collections.some(c => c.name === name);
    } catch (error) {
      console.error('Error checking if collection exists:', error);
      return false;
    }
  }

  async getCollection(name: string): Promise<Collection> {
    if (this.collections.has(name)) {
      return this.collections.get(name)!;
    }

    const collection = await this.client.getCollection({
      name,
      embeddingFunction: this.embeddingFunction,
    });
    
    this.collections.set(name, collection);
    return collection;
  }

  async insert<T = any>(
    collectionName: string,
    records: Omit<VectorRecord<T>, 'id'>[]
  ): Promise<string[]> {
    const collection = await this.getCollection(collectionName);
    
    const ids = records.map(() => crypto.randomUUID());
    const embeddings = await Promise.all(
      records.map(record => record.vector || this.getEmbedding(record.content))
    );
    
    await collection.add({
      ids,
      embeddings: await Promise.all(embeddings),
      metadatas: records.map(record => ({
        ...record.metadata,
        content: record.content,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
    });
    
    return ids;
  }

  async search<T = any>(
    collectionName: string,
    query: string | number[],
    options: SearchOptions = {}
  ): Promise<VectorSearchResult<T>[]> {
    const collection = await this.getCollection(collectionName);
    const { 
      limit = 10, 
      minScore = 0.7, 
      includeVectors = false,
      filter
    } = options;

    let queryEmbedding: number[];
    if (typeof query === 'string') {
      const [embedding] = await this.getEmbedding(query);
      queryEmbedding = embedding;
    } else {
      queryEmbedding = query;
    }

    const results = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: limit,
      where: filter,
      include: [
        IncludeEnum.Metadatas,
        IncludeEnum.Distances,
        ...(includeVectors ? [IncludeEnum.Embeddings] : []),
      ],
    });

    if (!results.ids?.[0]?.length) {
      return [];
    }

    return results.ids[0].map((id, index) => ({
      id: id as string,
      score: 1 - (results.distances?.[0]?.[index] || 0), // Convert distance to similarity score
      metadata: (results.metadatas?.[0]?.[index] || {}) as T,
      vector: includeVectors ? results.embeddings?.[0]?.[index] : undefined,
      content: results.documents?.[0]?.[index] as string || '',
    }));
  }

  async get<T = any>(collectionName: string, id: string): Promise<VectorRecord<T> | null> {
    const collection = await this.getCollection(collectionName);
    const result = await collection.get({
      ids: [id],
      include: [IncludeEnum.Metadatas, IncludeEnum.Embeddings],
    });

    if (!result.ids.length) {
      return null;
    }

    return {
      id: result.ids[0] as string,
      vector: result.embeddings?.[0] as number[],
      content: result.documents?.[0] as string || '',
      metadata: (result.metadatas?.[0] || {}) as T,
      createdAt: result.metadatas?.[0]?.createdAt 
        ? new Date(result.metadatas[0].createdAt as string) 
        : new Date(),
      updatedAt: result.metadatas?.[0]?.updatedAt 
        ? new Date(result.metadatas[0].updatedAt as string) 
        : new Date(),
    };
  }

  async delete(collectionName: string, ids: string[]): Promise<number> {
    const collection = await this.getCollection(collectionName);
    await collection.delete({ ids });
    return ids.length;
  }

  async update<T = any>(
    collectionName: string,
    id: string,
    updates: Partial<VectorRecord<T>>
  ): Promise<boolean> {
    const collection = await this.getCollection(collectionName);
    
    // Get existing record
    const existing = await this.get<T>(collectionName, id);
    if (!existing) {
      return false;
    }

    // Merge updates
    const updatedRecord = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };

    // Update in Chroma
    await collection.update({
      ids: [id],
      embeddings: [updates.vector || existing.vector],
      metadatas: [{
        ...existing.metadata,
        ...updates.metadata,
        content: updates.content || existing.content,
        updatedAt: new Date().toISOString(),
      }],
    });

    return true;
  }

  async batchUpsert<T = any>(
    collectionName: string,
    records: Array<Partial<VectorRecord<T>> & { id?: string }>
  ): Promise<string[]> {
    const collection = await this.getCollection(collectionName);
    
    const ids = records.map(record => record.id || crypto.randomUUID());
    const embeddings = await Promise.all(
      records.map(record => 
        record.vector 
          ? Promise.resolve(record.vector) 
          : record.content 
            ? this.getEmbedding(record.content).then(([embedding]) => embedding)
            : Promise.reject(new Error('Either vector or content must be provided'))
      )
    );

    const metadatas = records.map((record, index) => ({
      ...(record.metadata || {}),
      content: record.content || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    await collection.upsert({
      ids,
      embeddings,
      metadatas,
      documents: records.map(record => record.content || ''),
    });

    return ids;
  }

  async createIndex(collectionName: string): Promise<void> {
    // In Chroma, indexing is automatic
    // This is a no-op for Chroma, but we keep it for interface compatibility
    return Promise.resolve();
  }

  async close(): Promise<void> {
    // Chroma client doesn't have a close method in the current version
    this.collections.clear();
    return Promise.resolve();
  }
}

/**
 * Factory function to create a ChromaVectorDB instance
 */
export const createChromaVectorDB = (config: VectorDBConfig): VectorDBClient => {
  return new ChromaVectorDB(config);
};
