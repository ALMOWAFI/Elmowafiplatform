// Define AIMessage type locally since we can't import from @/types/ai
export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  isError?: boolean;
}

export interface StoredConversation {
  id: string;
  title: string;
  lastUpdated: string;
  preview: string;
  messageCount: number;
}

const CHAT_STORAGE_PREFIX = 'elmowafy_chat_';
const DEFAULT_CONVERSATION_TITLE = 'New Chat';

export interface StoredConversation {
  id: string;
  title: string;
  lastUpdated: string;
  preview: string;
  messageCount: number;
}

export class ChatStorage {
  private readonly storageKey: string;
  
  constructor(storageKey: string = 'chat') {
    this.storageKey = `${CHAT_STORAGE_PREFIX}${storageKey}`;
  }
  
  // Public method to get storage key for a conversation
  public getStorageKey(conversationId: string): string {
    return `${this.storageKey}_${conversationId}`;
  }
  
  private getConversationsListKey(): string {
    return `${this.storageKey}_conversations`;
  }
  
  // Private method to save conversations list
  private saveConversationsList(conversations: StoredConversation[]): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(
        this.getConversationsListKey(),
        JSON.stringify(conversations)
      );
    } catch (error) {
      console.error('Failed to save conversations list:', error);
    }
  }

  private getConversationsList(): StoredConversation[] {
    if (typeof window === 'undefined') return [];
    
    try {
      const data = localStorage.getItem(this.getConversationsListKey());
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to load conversations list:', error);
      return [];
    }
  }
  
  // Add method to load messages for a conversation
  public async loadMessages(conversationId: string): Promise<AIMessage[]> {
    if (typeof window === 'undefined') return [];
    
    try {
      const data = localStorage.getItem(this.getStorageKey(conversationId));
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to load messages:', error);
      return [];
    }
  }

  private saveConversationsList(conversations: StoredConversation[]): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(
        this.getConversationsListKey(),
        JSON.stringify(conversations)
      );
    } catch (error) {
      console.error('Failed to save conversations list:', error);
    }
  }
  
  /**
   * Get all conversations
   */
  async getConversations(): Promise<StoredConversation[]> {
    return this.getConversationsList();
  }
  
  // Add method to check if a conversation exists
  async hasConversation(conversationId: string): Promise<boolean> {
    const conversations = this.getConversationsList();
    return conversations.some(conv => conv.id === conversationId);
  }
  
  /**
   * Save a conversation with its messages
   */
  async saveConversation(conversation: StoredConversation, messages: AIMessage[]): Promise<void> {
    if (typeof window === 'undefined') return;
    
    try {
      // Save messages
      localStorage.setItem(
        this.getStorageKey(conversation.id),
        JSON.stringify(messages)
      );
      
      // Update conversations list
      const conversations = this.getConversationsList();
      const existingIndex = conversations.findIndex(c => c.id === conversation.id);
      
      if (existingIndex >= 0) {
        // Update existing conversation
        conversations[existingIndex] = {
          ...conversation,
          lastUpdated: new Date().toISOString(),
          messageCount: messages.length,
          preview: messages.length > 0 
            ? messages[messages.length - 1].content.substring(0, 100)
            : ''
        };
      } else {
        // Add new conversation
        conversations.push({
          ...conversation,
          lastUpdated: new Date().toISOString(),
          messageCount: messages.length,
          preview: messages.length > 0 
            ? messages[messages.length - 1].content.substring(0, 100)
            : ''
        });
      }
      
      // Sort by last updated (newest first)
      conversations.sort((a, b) => 
        new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
      );
      
      this.saveConversationsList(conversations);
    } catch (error) {
      console.error('Failed to save conversation:', error);
      throw error;
    }
  }
  
  /**
   * Get a single conversation by ID
   */
  async getConversation(id: string): Promise<StoredConversation | null> {
    const conversations = this.getConversationsList();
    return conversations.find(conv => conv.id === id) || null;
  }
  
  /**
   * Create a new conversation with initial messages
   */
  async createConversation(
    messages: AIMessage[], 
    title: string = DEFAULT_CONVERSATION_TITLE
  ): Promise<StoredConversation> {
    const id = `conv_${Date.now()}`;
    const conversation: StoredConversation = {
      id,
      title,
      lastUpdated: new Date().toISOString(),
      preview: messages[0]?.content?.substring(0, 100) || '',
      messageCount: messages.length
    };
    
    await this.saveConversation(id, messages, title);
    return conversation;
  }

  /**
   * Save a conversation with the given ID and messages
   */
  async saveConversation(
    conversationId: string, 
    messages: AIMessage[], 
    title?: string
  ): Promise<void> {
    if (typeof window === 'undefined') return;
    
    try {
      const storageKey = this.getStorageKey(conversationId);
      const conversations = this.getConversationsList();
      const existingIndex = conversations.findIndex(c => c.id === conversationId);
      
      // Save messages
      localStorage.setItem(storageKey, JSON.stringify(messages));
      
      // Update or add conversation metadata
      const conversation: StoredConversation = {
        id: conversationId,
        title: title || `Conversation ${conversationId.slice(-4)}`,
        lastUpdated: new Date().toISOString(),
        preview: messages.length > 0 ? messages[messages.length - 1]?.content?.substring(0, 100) || '' : '',
        messageCount: messages.length
      };
      
      if (existingIndex >= 0) {
        conversations[existingIndex] = conversation;
      } else {
        conversations.unshift(conversation);
      }
      
      this.saveConversationsList(conversations);
    } catch (error) {
      console.error('Failed to save conversation:', error);
      throw new Error('Failed to save conversation');
    }
  }

  static async loadConversation(conversationId: string): Promise<AIMessage[] | null> {
    if (typeof window === 'undefined') return null;
    
    try {
      const storageKey = this.getStorageKey(conversationId);
      const data = localStorage.getItem(storageKey);
      
      if (!data) return null;
      
      const messages = JSON.parse(data) as AIMessage[];
      return Array.isArray(messages) ? messages : null;
    } catch (error) {
      console.error('Failed to load conversation:', error);
      return null;
    }
  }

  static async listConversations(): Promise<StoredConversation[]> {
    return this.getConversationsList();
  }

  static async deleteConversation(conversationId: string): Promise<void> {
    if (typeof window === 'undefined') return;
    
    try {
      // Remove messages
      const storageKey = this.getStorageKey(conversationId);
      localStorage.removeItem(storageKey);
      
      // Remove from conversations list
      const conversations = this.getConversationsList();
      const updated = conversations.filter(c => c.id !== conversationId);
      this.saveConversationsList(updated);
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      throw new Error('Failed to delete conversation');
    }
  }

  static async clearAllConversations(): Promise<void> {
    if (typeof window === 'undefined') return;
    
    try {
      // Clear all conversation data
      const conversations = this.getConversationsList();
      conversations.forEach(conv => {
        localStorage.removeItem(this.getStorageKey(conv.id));
      });
      
      // Clear conversations list
      localStorage.removeItem(CONVERSATIONS_LIST_KEY);
    } catch (error) {
      console.error('Failed to clear conversations:', error);
      throw new Error('Failed to clear conversations');
    }
  }

  private static generateTitleFromMessages(messages: AIMessage[]): string {
    // Try to find a user message that could be used as a title
    const userMessage = messages.find(m => m.role === 'user');
    if (userMessage) {
      // Take first few words of the first user message
      const words = userMessage.content.split(/\s+/);
      return words.slice(0, 8).join(' ') + (words.length > 8 ? '...' : '');
    }
    
    // Fallback to a generic title
    return `Chat ${new Date().toLocaleString()}`;
  }
}
