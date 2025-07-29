import { Configuration, OpenAIApi, ChatCompletionRequestMessage } from 'openai';
import { AIMessageRole } from '@/types/ai';

export interface AIClientOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  apiKey?: string;
  organization?: string;
}

export interface AIChatResponse {
  content: string;
  conversationId?: string;
  metadata?: Record<string, any>;
}

export class AIClient {
  private openai: OpenAIApi;
  private options: Required<AIClientOptions>;

  constructor(options: AIClientOptions = {}) {
    this.options = {
      model: options.model || 'gpt-3.5-turbo',
      temperature: options.temperature ?? 0.7,
      maxTokens: options.maxTokens ?? 1000,
      apiKey: options.apiKey || process.env.OPENAI_API_KEY || '',
      organization: options.organization || process.env.OPENAI_ORGANIZATION || '',
    };

    const configuration = new Configuration({
      apiKey: this.options.apiKey,
      organization: this.options.organization,
    });

    this.openai = new OpenAIApi(configuration);
  }

  async chat(params: {
    messages: Array<{ role: AIMessageRole; content: string }>;
    conversationId?: string;
  }): Promise<AIChatResponse> {
    try {
      const { messages, conversationId } = params;
      
      const completion = await this.openai.createChatCompletion({
        model: this.options.model,
        messages: messages as ChatCompletionRequestMessage[],
        temperature: this.options.temperature,
        max_tokens: this.options.maxTokens,
        user: conversationId, // Use conversationId as user ID for tracking
      });

      const response = completion.data.choices[0]?.message?.content || '';
      
      return {
        content: response,
        conversationId,
        metadata: {
          model: completion.data.model,
          usage: completion.data.usage,
        },
      };
    } catch (error) {
      console.error('AI API Error:', error);
      throw new Error('Failed to get response from AI service');
    }
  }

  // Add other AI operations as needed
  // e.g., embeddings, completions, etc.
}

// Singleton instance
let aiClientInstance: AIClient | null = null;

/**
 * Get or create the AI client instance
 */
export function getAIClient(options: AIClientOptions = {}): AIClient {
  if (!aiClientInstance) {
    aiClientInstance = new AIClient({
      apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY || '',
      organization: process.env.NEXT_PUBLIC_OPENAI_ORGANIZATION,
      ...options,
    });
  }
  return aiClientInstance;
}
