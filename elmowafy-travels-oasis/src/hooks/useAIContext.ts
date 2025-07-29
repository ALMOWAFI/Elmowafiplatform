import { useCallback, useEffect, useRef } from 'react';
import { useAIAssistant } from '@/contexts/AIAssistantContext';
import { COLLECTIONS } from '@/lib/vector-db/utils';

/**
 * Hook to manage AI context and memory for chat interactions
 */
export const useAIContext = (conversationId?: string) => {
  const {
    addMemory,
    searchMemories,
    searchKnowledge,
    searchTravelPlaces,
    searchFamilyMembers,
    currentContext,
    updateContext,
    isLoading,
    error,
  } = useAIAssistant();

  // Keep track of the current conversation
  useEffect(() => {
    if (conversationId) {
      updateContext({ conversationId });
    }
  }, [conversationId, updateContext]);

  // Add a user message to memory
  const addUserMessageToMemory = useCallback(async (content: string, metadata: Record<string, any> = {}) => {
    if (!content.trim()) return null;
    
    return addMemory(content, {
      ...metadata,
      type: 'user_message',
      role: 'user',
      conversationId: currentContext.conversationId,
    });
  }, [addMemory, currentContext.conversationId]);

  // Add an AI response to memory
  const addAIResponseToMemory = useCallback(async (content: string, metadata: Record<string, any> = {}) => {
    if (!content.trim()) return null;
    
    return addMemory(content, {
      ...metadata,
      type: 'ai_response',
      role: 'assistant',
      conversationId: currentContext.conversationId,
    });
  }, [addMemory, currentContext.conversationId]);

  // Get relevant context for a user message
  const getRelevantContext = useCallback(async (message: string) => {
    try {
      // Search across different knowledge bases in parallel
      const [memories, knowledge, places, family] = await Promise.all([
        searchMemories(message, { limit: 3 }),
        searchKnowledge(message, { limit: 2 }),
        searchTravelPlaces(message, { limit: 2 }),
        searchFamilyMembers(message, { limit: 1 }),
      ]);

      // Format the context for the AI prompt
      const context: Record<string, any> = {};
      
      if (memories.length > 0) {
        context.memories = memories.map((m: any) => ({
          id: m.id,
          content: m.content,
          metadata: m.metadata,
          relevance: m.score,
        }));
      }

      if (knowledge.length > 0) {
        context.knowledge = knowledge.map((k: any) => ({
          id: k.id,
          content: k.content,
          source: k.metadata.source,
          relevance: k.score,
        }));
      }

      if (places.length > 0) {
        context.places = places.map((p: any) => ({
          id: p.id,
          name: p.metadata.name,
          country: p.metadata.country,
          description: p.metadata.description,
          relevance: p.score,
        }));
      }

      if (family.length > 0) {
        context.family = family.map((f: any) => ({
          id: f.id,
          name: f.metadata.name,
          relation: f.metadata.relation,
          relevance: f.score,
        }));
      }

      return context;
    } catch (err) {
      console.error('Error getting relevant context:', err);
      return {};
    }
  }, [searchMemories, searchKnowledge, searchTravelPlaces, searchFamilyMembers]);

  // Format context for the AI prompt
  const formatContextForPrompt = useCallback((context: Record<string, any>) => {
    const parts: string[] = [];

    if (context.memories?.length) {
      parts.push('## Relevant Memories:');
      parts.push(...context.memories.map((m: any, i: number) => 
        `- Memory ${i + 1}: ${m.content} (Relevance: ${Math.round(m.relevance * 100)}%)`
      ));
    }

    if (context.knowledge?.length) {
      parts.push('\n## Relevant Knowledge:');
      parts.push(...context.knowledge.map((k: any, i: number) => 
        `- ${k.content} [Source: ${k.source}] (Relevance: ${Math.round(k.relevance * 100)}%)`
      ));
    }

    if (context.places?.length) {
      parts.push('\n## Relevant Travel Destinations:');
      parts.push(...context.places.map((p: any, i: number) => 
        `- ${p.name}, ${p.country}: ${p.description} (Relevance: ${Math.round(p.relevance * 100)}%)`
      ));
    }

    if (context.family?.length) {
      parts.push('\n## Relevant Family Members:');
      parts.push(...context.family.map((f: any, i: number) => 
        `- ${f.name} (${f.relation}): Relevant to the conversation (Relevance: ${Math.round(f.relevance * 100)}%)`
      ));
    }

    return parts.join('\n');
  }, []);

  return {
    // State
    currentContext,
    isLoading,
    error,
    
    // Actions
    addUserMessageToMemory,
    addAIResponseToMemory,
    getRelevantContext,
    formatContextForPrompt,
    updateContext,
  };
};

export default useAIContext;
