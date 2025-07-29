import { VectorDBClient, VectorDBConfig } from './types';
import { createChromaVectorDB } from './chroma';

export type VectorDBProvider = 'chroma' | 'pinecone' | 'weaviate' | 'qdrant';

/**
 * Create a vector database client with the specified provider
 */
export async function createVectorDB(
  provider: VectorDBProvider,
  config: VectorDBConfig
): Promise<VectorDBClient> {
  switch (provider) {
    case 'chroma':
      const chroma = createChromaVectorDB(config);
      await chroma.initialize();
      return chroma;
    
    // Add support for other providers in the future
    case 'pinecone':
    case 'weaviate':
    case 'qdrant':
      throw new Error(`Provider '${provider}' is not yet implemented`);
    
    default:
      throw new Error(`Unsupported vector database provider: ${provider}`);
  }
}

/**
 * Helper function to create an embedding function using OpenAI's API
 */
export function createOpenAIEmbeddingFunction(apiKey: string, model: string = 'text-embedding-3-small') {
  return async (text: string | string[]): Promise<number[][]> => {
    const input = Array.isArray(text) ? text : [text];
    
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          input,
          model,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      return data.data.map((item: any) => item.embedding);
    } catch (error) {
      console.error('Error generating embeddings:', error);
      throw error;
    }
  };
}

// Re-export types for convenience
export * from './types';

// Re-export specific implementations
export * from './chroma';
