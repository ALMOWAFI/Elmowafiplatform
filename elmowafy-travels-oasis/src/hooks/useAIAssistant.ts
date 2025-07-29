import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ChatStorage, type StoredConversation } from '@/lib/ai/chatStorage';
import type { AIMessage } from '@/types/ai';
import { useToast } from '@/components/ui/use-toast';

// Constants
const CHAT_API_ENDPOINT = 'http://localhost:8001/api/chat';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Re-export AIMessage type for backward compatibility
export type { AIMessage };

export interface UseAIAssistantOptions {
  initialMessage?: string;
  conversationId?: string | undefined;
  onResponse?: (message: AIMessage) => void;
  onError?: (error: Error) => void;
  onStart?: () => void;
  onComplete?: (response: any) => void;
  persistConversation?: boolean; // Whether to save conversation to local storage
}

interface ChatRequest {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  conversationId?: string;
  preferences?: Record<string, any>;
}

interface ChatResponse {
  message: AIMessage;
  conversationId: string;
  timestamp: string;
}

export const useAIAssistant = ({
  initialMessage = '',
  conversationId: initialConversationId,
  onResponse,
  onError,
  persistConversation = true,
}: UseAIAssistantOptions = {}) => {
  // Search functions - implemented as no-ops for now but properly typed
  const _searchMemories = useCallback(async (_query: string, _options: any = {}) => {
    console.log('Searching memories is not yet implemented');
    return [];
  }, []);

  const _searchKnowledge = useCallback(async (_query: string, _options: any = {}) => {
    console.log('Searching knowledge base is not yet implemented');
    return [];
  }, []);

  const _searchTravelPlaces = useCallback(async (_query: string, _options: any = {}) => {
    console.log('Searching travel places is not yet implemented');
    return [];
  }, []);

  const _searchFamilyMembers = useCallback(async (_query: string, _options: any = {}) => {
    console.log('Searching family members is not yet implemented');
    return [];
  }, []);

  // State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [conversations, setConversations] = useState<StoredConversation[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const isMounted = useRef<boolean>(true);
  const abortController = useRef<AbortController | null>(null);
  const { toast } = useToast();

  // Initialize chat storage
  const chatStorage = useMemo(() => new ChatStorage('ai-chat'), []);

  // Get messages from the current conversation
  const loadMessages = useCallback(async (convId: string) => {
    try {
      return await chatStorage.loadMessages(convId);
    } catch (error) {
      console.error('Failed to load messages:', error);
      setError(error instanceof Error ? error : new Error('Failed to load messages'));
      return [];
    }
  }, [chatStorage]);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Load conversations
        const convs = await chatStorage.getConversations();
        if (isMounted.current) {
          setConversations(convs);
        }

        // Load existing conversation or create new one
        if (conversationId) {
          const messages = await loadMessages(conversationId);
          if (isMounted.current) {
            setMessages(messages);
          }
        } else if (initialMessage) {
          // Create new conversation with initial message if provided
          const newConv = await chatStorage.createConversation([
            {
              id: uuidv4(),
              role: 'assistant',
              content: initialMessage,
              timestamp: new Date().toISOString(),
            },
          ]);

          if (isMounted.current) {
            setConversationId(newConv.id);
            setMessages(await loadMessages(newConv.id));
            setConversations(prev => [newConv, ...prev]);
          }
        }
      } catch (err) {
        console.error('Failed to load initial data:', err);
        if (isMounted.current) {
          setError(err instanceof Error ? err : new Error('Failed to load chat data'));
        }
      }
    };

    loadInitialData();

    return () => {
      isMounted.current = false;
    };
  }, [conversationId, initialMessage, chatStorage, loadMessages]);

  /**
   * Load a conversation by ID
   */
  const loadConversation = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const messages = await chatStorage.loadMessages(id);
      if (messages) {
        setMessages(messages);
        setConversationId(id);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to load conversation:', err);
      setError(err instanceof Error ? err : new Error('Failed to load conversation'));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [chatStorage]);

  /**
   * Create a new conversation
   */
  const createNewConversation = useCallback(async (): Promise<string> => {
    const newId = `conv_${Date.now()}`;
    const newConversation: StoredConversation = {
      id: newId,
      title: 'New Chat',
      lastUpdated: new Date().toISOString(),
      preview: '',
      messageCount: 0,
    };

    setConversationId(newId);
    setMessages([]);
    setConversations(prev => [newConversation, ...prev]);

    if (persistConversation) {
      await chatStorage.saveConversation(newId, [], 'New Chat');
    }

    return newId;
  }, [chatStorage, persistConversation]);

  /**
   * Delete a conversation
   */
  const deleteConversation = useCallback(async (id: string) => {
    try {
      await ChatStorage.deleteConversation(id);
      const updatedConversations = await chatStorage.getConversations();
      setConversations(updatedConversations);
      
      // If the current conversation was deleted, create a new one
      if (id === conversationId) {
        await createNewConversation();
      }
      
      return true;
    } catch (err) {
      console.error('Failed to delete conversation:', err);
      setError(err instanceof Error ? err : new Error('Failed to delete conversation'));
      return false;
    }
  }, [conversationId, createNewConversation, chatStorage]);

  /**
   * Send a message to the AI assistant
   */
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;
    
    // Create a new conversation if one doesn't exist
    const currentConvId = conversationId || await createNewConversation();
    
    const userMessage: AIMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };
    
    // Add user message to the conversation
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    
    // Save user message immediately
    if (persistConversation) {
      try {
        await chatStorage.saveConversation(currentConvId, updatedMessages);
      } catch (error) {
        console.error('Failed to save user message:', error);
        setError(error instanceof Error ? error : new Error('Failed to save user message'));
      }
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Create a new AbortController for this request
      const controller = new AbortController();
      abortController.current = controller;
      
      // Call the API
      const response = await fetch(CHAT_API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: updatedMessages,
          conversationId: currentConvId,
        }),
        signal: controller.signal,
      });
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      if (!response.body) {
        throw new Error('No response body');
      }
      
      // Handle streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';
      const assistantMessageId = `msg_${Date.now()}`;
      
      // Add initial assistant message
      const initialAssistantMessage: AIMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
      };
      
      setMessages(prev => [...prev, initialAssistantMessage]);
      
      // Process the stream
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        assistantMessage += chunk;
        
        // Update the assistant's message in real-time
        setMessages(prev => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage?.id === assistantMessageId) {
            return [
              ...prev.slice(0, -1),
              { ...lastMessage, content: assistantMessage }
            ];
          }
          return prev;
        });
      }
      
      // Final save with complete message
      const finalAssistantMessage: AIMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: assistantMessage,
        timestamp: new Date().toISOString(),
      };
      
      const finalMessages = [...updatedMessages, finalAssistantMessage];
      setMessages(finalMessages);
      
      // Save the conversation
      if (persistConversation) {
        await chatStorage.saveConversation(currentConvId, finalMessages);
      }
      
      return finalAssistantMessage;
      
    } catch (err) {
      console.error('Error sending message:', err);
      
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(new Error(errorMessage));
      
      // Show error toast
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive',
      });
      
      // Add error message to chat
      const errorMessageObj: AIMessage = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, there was an error processing your message. Please try again.',
        timestamp: new Date().toISOString(),
        isError: true,
      };
      
      const errorMessages = [...updatedMessages, errorMessageObj];
      setMessages(errorMessages);
      
      if (persistConversation) {
        await chatStorage.saveConversation(currentConvId, errorMessages);
      }
      
      return errorMessageObj;
      
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
      
      // Clear the abort controller
      if (abortController.current) {
        abortController.current = null;
      }
    }
  }, [conversationId, createNewConversation, messages]);

  /**
   * Get relevant context for a message
   * This will be implemented when context integration is added
   */
  const _getContext = useCallback(async (): Promise<Record<string, unknown>> => {
    console.log('Context retrieval is not yet implemented');
    return {};
  }, []);
  
  const _formatContext = useCallback((): string => {
    console.log('Context formatting is not yet implemented');
    return '';
  }, []);

  return {
    // State
    messages,
    isLoading,
    error,
    conversations,
    currentConversationId: conversationId,
    
    // Actions
    sendMessage,
    loadConversation,
    createNewConversation,
    deleteConversation,
    
    // Helpers
    clearError: () => setError(null),
    
    // Refresh conversations list
    refreshConversations: async () => {
      try {
        const convs = await ChatStorage.listConversations();
        setConversations(convs);
        return convs;
      } catch (err) {
        console.error('Failed to refresh conversations:', err);
        setError(err instanceof Error ? err : new Error('Failed to refresh conversations'));
        throw err;
      }
    },
    
    // Update conversation title
    updateConversationTitle: async (id: string, title: string) => {
      try {
        const messages = await ChatStorage.loadConversation(id);
        if (messages) {
          await ChatStorage.saveConversation(id, messages, title);
          const updatedConversations = await ChatStorage.listConversations();
          setConversations(updatedConversations);
          return true;
        }
        return false;
      } catch (err) {
        console.error('Failed to update conversation title:', err);
        setError(err instanceof Error ? err : new Error('Failed to update conversation title'));
        return false;
      }
    },
  };
};

export default useAIAssistant;
