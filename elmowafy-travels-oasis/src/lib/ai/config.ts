/**
 * AI Assistant Configuration
 * 
 * This file contains configuration and utility functions for the AI assistant.
 * It handles default settings, environment variables, and provides a consistent
 * way to access AI-related configuration throughout the application.
 */

import { AIPreferences } from '@/types/preferences';

// Default configuration
const DEFAULT_CONFIG = {
  // Default model to use if none specified
  defaultModel: 'gpt-4-turbo',
  
  // Default temperature (creativity) setting
  defaultTemperature: 0.7,
  
  // Maximum number of tokens in a response
  maxResponseTokens: 2000,
  
  // Maximum number of messages to keep in context
  maxContextMessages: 10,
  
  // Maximum number of tokens to use for the prompt
  maxPromptTokens: 4000,
  
  // Default system prompt if none provided
  defaultSystemPrompt: `You are a helpful AI assistant for the Elmowafy Travel Platform. 
You help users with travel planning, family organization, and trip management.
Be friendly, informative, and respectful at all times.`,
};

// Get AI assistant configuration
// This can be extended to include environment-specific settings
// or to fetch configuration from an API in the future
export function getAIAssistantConfig() {
  return {
    ...DEFAULT_CONFIG,
    // Add any environment-specific overrides here
    apiKey: process.env.OPENAI_API_KEY,
    // Add any other configuration that might come from environment variables
  };
}

/**
 * Get the appropriate model configuration based on user preferences
 */
export function getModelConfig(prefs?: Partial<AIPreferences>) {
  const config = getAIAssistantConfig();
  
  // If no preferences provided, return defaults
  if (!prefs) {
    return {
      model: config.defaultModel,
      temperature: config.defaultTemperature,
      maxTokens: config.maxResponseTokens,
    };
  }
  
  // Map personality to model parameters
  const personalityConfig = {
    friendly: {
      temperature: 0.7,
      presencePenalty: 0.3,
      frequencyPenalty: 0.1,
    },
    professional: {
      temperature: 0.3,
      presencePenalty: 0.1,
      frequencyPenalty: 0.1,
    },
    humorous: {
      temperature: 0.9,
      presencePenalty: 0.5,
      frequencyPenalty: 0.3,
    },
    concise: {
      temperature: 0.2,
      presencePenalty: 0,
      frequencyPenalty: 0,
    },
    detailed: {
      temperature: 0.5,
      presencePenalty: 0.2,
      frequencyPenalty: 0.1,
    },
  };
  
  const personality = prefs.assistantPersonality || 'friendly';
  const personalityParams = personalityConfig[personality] || personalityConfig.friendly;
  
  return {
    model: prefs.model || config.defaultModel,
    temperature: prefs.temperature !== undefined ? prefs.temperature : personalityParams.temperature,
    maxTokens: config.maxResponseTokens,
    presencePenalty: personalityParams.presencePenalty,
    frequencyPenalty: personalityParams.frequencyPenalty,
  };
}

/**
 * Get the system prompt with user preferences incorporated
 */
export function getSystemPrompt(prefs?: Partial<AIPreferences>): string {
  if (!prefs) {
    return DEFAULT_CONFIG.defaultSystemPrompt;
  }
  
  const personalityPrompt = getPersonalityPrompt(prefs);
  const privacyNotice = prefs.privacy?.shareTravelHistory
    ? 'You have access to the user\'s travel history to provide personalized recommendations.'
    : 'Do not reference the user\'s travel history as they have chosen to keep this private.';
  
  return `${personalityPrompt}

${privacyNotice}

Always respond in the user's preferred language (${prefs.language || 'English'}). 
If the user switches languages, match their language.`;
}

// Re-export personality utilities
export { getPersonalityPrompt, getResponseStyle } from './personality';

// Helper function to validate API key format
export function isValidApiKey(key: string | undefined): boolean {
  if (!key) return false;
  // OpenAI API keys start with 'sk-' and are 51 characters long
  return key.startsWith('sk-') && key.length === 51;
}

// Helper to get the current model's context window size
export function getModelContextWindow(model: string = DEFAULT_CONFIG.defaultModel): number {
  // Default to 4K tokens for most models
  const modelWindows: Record<string, number> = {
    'gpt-4': 8000,
    'gpt-4-32k': 32000,
    'gpt-4-turbo': 128000,
    'gpt-3.5-turbo': 4000,
    'gpt-3.5-turbo-16k': 16000,
  };
  
  return modelWindows[model] || 4000;
}
