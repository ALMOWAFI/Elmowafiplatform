import { VectorDBClient, VectorRecord, VectorSearchResult } from './types';

/**
 * Common collection names used in the application
 */
export const COLLECTIONS = {
  CONVERSATIONS: 'conversations',
  MEMORIES: 'memories',
  KNOWLEDGE: 'knowledge_base',
  TRAVEL_PLACES: 'travel_places',
  FAMILY_MEMBERS: 'family_members',
  GAMING_KNOWLEDGE: 'gaming_knowledge',
} as const;

/**
 * Default search options for different use cases
 */
export const SEARCH_OPTIONS = {
  DEFAULT: {
    limit: 5,
    minScore: 0.7,
    includeVectors: false,
  },
  CONVERSATION: {
    limit: 10,
    minScore: 0.65,
  },
  KNOWLEDGE: {
    limit: 3,
    minScore: 0.75,
  },
  MEMORY: {
    limit: 5,
    minScore: 0.6,
  },
} as const;

/**
 * Helper to create a memory record
 */
export function createMemoryRecord(
  content: string,
  metadata: Record<string, any> = {},
  id?: string
): Omit<VectorRecord, 'id'> {
  return {
    content,
    metadata: {
      ...metadata,
      type: 'memory',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Helper to create a knowledge record
 */
export function createKnowledgeRecord(
  content: string,
  source: string,
  metadata: Record<string, any> = {},
  id?: string
): Omit<VectorRecord, 'id'> {
  return {
    content,
    metadata: {
      ...metadata,
      type: 'knowledge',
      source,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Helper to chunk text for embedding
 */
export function chunkText(
  text: string,
  chunkSize: number = 1000,
  overlap: number = 200
): string[] {
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    let end = start + chunkSize;
    
    // Try to end at a sentence boundary if possible
    if (end < text.length) {
      const lastPunctuation = Math.max(
        text.lastIndexOf('.', end),
        text.lastIndexOf('!', end),
        text.lastIndexOf('?', end),
        text.lastIndexOf('\n', end)
      );
      
      if (lastPunctuation > start + chunkSize / 2) {
        end = lastPunctuation + 1;
      }
    }
    
    chunks.push(text.substring(start, end).trim());
    start = end - overlap;
    
    // Prevent infinite loops with very small chunks
    if (end >= text.length) break;
  }
  
  return chunks;
}

/**
 * Helper to format search results for display
 */
export function formatSearchResults<T = any>(
  results: VectorSearchResult<T>[],
  formatItem: (result: VectorSearchResult<T>) => string
): string {
  if (!results.length) {
    return 'No relevant information found.';
  }
  
  return results
    .map((result, index) => {
      const score = Math.round(result.score * 100);
      return `[${index + 1}] (${score}% relevant)\n${formatItem(result)}\n`;
    })
    .join('\n---\n');
}

/**
 * Helper to initialize collections if they don't exist
 */
export async function initializeCollections(
  client: VectorDBClient,
  collections: string[] = Object.values(COLLECTIONS)
): Promise<void> {
  for (const collection of collections) {
    if (!(await client.collectionExists(collection))) {
      await client.createCollection(collection);
      console.log(`Created collection: ${collection}`);
    }
  }
}

/**
 * Helper to perform semantic search with fallback
 */
export async function semanticSearchWithFallback<T = any>(
  client: VectorDBClient,
  collection: string,
  query: string,
  options: {
    limit?: number;
    minScore?: number;
    fallbackToKeyword?: boolean;
    keywordFields?: string[];
  } = {}
): Promise<VectorSearchResult<T>[]> {
  const {
    limit = SEARCH_OPTIONS.DEFAULT.limit,
    minScore = SEARCH_OPTIONS.DEFAULT.minScore,
    fallbackToKeyword = true,
    keywordFields = ['content'],
  } = options;

  try {
    // First try semantic search
    const results = await client.search<T>(collection, query, {
      limit,
      minScore,
    });

    // If we have good results, return them
    if (results.length > 0 && results[0].score >= minScore) {
      return results;
    }

    // If no good results and fallback is enabled, try keyword search
    if (fallbackToKeyword) {
      // This is a simplified keyword search - in a real app, you might use
      // a full-text search engine or a more sophisticated approach
      const allItems = await client.search<T>(collection, '', { limit: 100 });
      
      const queryTerms = query.toLowerCase().split(/\s+/);
      
      const keywordResults = allItems
        .map(item => {
          // Calculate a simple keyword match score
          let score = 0;
          const content = (item.metadata as any)?.content?.toLowerCase() || '';
          
          for (const term of queryTerms) {
            if (content.includes(term)) {
              score += 0.3; // Base score for matching term
              
              // Bonus for exact matches or at the start of words
              if (content.includes(` ${term} `) || content.startsWith(`${term} `)) {
                score += 0.2;
              }
            }
          }
          
          return { ...item, score };
        })
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
      
      return keywordResults;
    }

    return [];
  } catch (error) {
    console.error('Error in semanticSearchWithFallback:', error);
    return [];
  }
}
