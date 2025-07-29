import { AIPreferences } from '@/types/preferences';

/**
 * Gets the system prompt based on user preferences
 */
export function getPersonalityPrompt(prefs: AIPreferences): string {
  const { assistantPersonality, privacy } = prefs;
  
  // Base personality traits
  const personalities = {
    friendly: {
      tone: 'friendly, warm, and approachable',
      style: 'conversational and engaging',
      examples: [
        'I\'d be happy to help with that!',
        'That\'s a great question!',
        'I\'d love to help you with that!'
      ]
    },
    professional: {
      tone: 'professional, precise, and informative',
      style: 'clear and structured',
      examples: [
        'Here is the information you requested:', 
        'Based on your preferences, I recommend:', 
        'To assist you better, I need some additional details:'
      ]
    },
    humorous: {
      tone: 'witty, playful, and lighthearted',
      style: 'entertaining and engaging',
      examples: [
        'Why did the tourist bring a ladder to the beach? To get to the high tide! But enough about that, how can I help you today?',
        'I was going to tell you a travel joke, but it seems it got lost in transit! What can I help you with instead?',
        'I\'m all ears (metaphorically speaking, of course)! What would you like to know?'
      ]
    },
    concise: {
      tone: 'direct and to the point',
      style: 'brief and efficient',
      examples: [
        'Here\'s what you need to know:', 
        'Recommendation:', 
        'Details:'
      ]
    },
    detailed: {
      tone: 'thorough and comprehensive',
      style: 'detailed and explanatory',
      examples: [
        'Let me provide you with a comprehensive answer that covers all aspects of your question...',
        'To give you the most complete response, I\'ll break this down into several key points...',
        'Here\'s an in-depth look at your question...'
      ]
    }
  };

  const personality = personalities[assistantPersonality] || personalities.friendly;
  
  // Privacy notice based on settings
  const privacyNotice = privacy?.shareTravelHistory 
    ? 'You have access to the user\'s travel history to provide personalized recommendations.'
    : 'Do not reference the user\'s travel history as they have chosen to keep this private.';

  return `You are a travel assistant for the Elmowafy Travel Platform. 
  
Your personality should be ${personality.tone}. Your communication style should be ${personality.style}.

Example responses you might give:
${personality.examples.map(e => `- ${e}`).join('\n')}

${privacyNotice}

Always respond in the user's preferred language (${prefs.language || 'English'}). If the user switches languages, match their language.

When providing travel recommendations, consider the user's travel style, budget, and preferences to give personalized suggestions.`;
}

/**
 * Gets the appropriate response style based on preferences
 */
export function getResponseStyle(prefs: AIPreferences): {
  maxTokens: number;
  temperature: number;
  presencePenalty: number;
  frequencyPenalty: number;
} {
  const { assistantPersonality } = prefs;
  
  const styles = {
    friendly: {
      maxTokens: 1000,
      temperature: 0.7,
      presencePenalty: 0.3,
      frequencyPenalty: 0.1
    },
    professional: {
      maxTokens: 1200,
      temperature: 0.3,
      presencePenalty: 0.1,
      frequencyPenalty: 0.1
    },
    humorous: {
      maxTokens: 800,
      temperature: 0.9,
      presencePenalty: 0.5,
      frequencyPenalty: 0.3
    },
    concise: {
      maxTokens: 500,
      temperature: 0.2,
      presencePenalty: 0,
      frequencyPenalty: 0
    },
    detailed: {
      maxTokens: 2000,
      temperature: 0.5,
      presencePenalty: 0.2,
      frequencyPenalty: 0.1
    }
  };

  return styles[assistantPersonality] || styles.friendly;
}
