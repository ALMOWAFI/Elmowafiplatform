import type { NextApiRequest, NextApiResponse } from 'next';
import { getAIClient } from '@/lib/ai/client';
import { withApiAuth } from '@/lib/auth/middleware';
import { handleAPIError } from '@/lib/errorHandling';
import { AIMessage, AIMessageRole } from '@/types/ai';

export interface ChatRequest {
  messages: Array<{
    role: AIMessageRole;
    content: string;
  }>;
  conversationId?: string;
  preferences?: Record<string, any>;
}

export interface ChatResponse {
  message: AIMessage;
  conversationId: string;
  timestamp: string;
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ChatResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages, conversationId, preferences } = req.body as ChatRequest;
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages are required' });
    }

    // Get AI client with user preferences
    const aiClient = getAIClient(preferences);
    
    // Process the chat request
    const response = await aiClient.chat({
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      conversationId,
    });

    // Create the response message
    const responseMessage: AIMessage = {
      id: `msg_${Date.now()}`,
      role: 'assistant',
      content: response.content,
      timestamp: new Date(),
      conversationId: conversationId || 'new',
    };

    // Return the response
    return res.status(200).json({
      message: responseMessage,
      conversationId: conversationId || response.conversationId || 'new',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return handleAPIError(res, error, 'Failed to process chat request');
  }
}

export default withApiAuth(handler);
