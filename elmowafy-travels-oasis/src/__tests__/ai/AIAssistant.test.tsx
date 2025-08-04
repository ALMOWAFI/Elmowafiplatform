import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useAIAssistant } from '@/hooks/useAIAssistant';
import { PreferencesProvider, usePreferences } from '@/contexts/PreferencesContext';
import { AIMessage } from '@/types/ai';

// Mock the fetch API
global.fetch = jest.fn();

// Mock the toast
const mockToast = jest.fn();
jest.mock('@/components/ui/use-toast', () => ({
  toast: () => mockToast(),
}));

// Mock the chat storage
const mockSaveConversation = jest.fn();
const mockGetConversation = jest.fn();
const mockDeleteConversation = jest.fn();

jest.mock('@/lib/ai/chatStorage', () => ({
  ChatStorage: {
    saveConversation: (...args: any[]) => mockSaveConversation(...args),
    getConversation: (...args: any[]) => mockGetConversation(...args),
    deleteConversation: (...args: any[]) => mockDeleteConversation(...args),
  },
}));

// Mock the API responses
const mockSuccessResponse = {
  message: {
    id: 'msg-123',
    role: 'assistant' as const,
    content: 'Hello! How can I help you today?',
    timestamp: new Date().toISOString(),
  },
  conversationId: 'conv-123',
  timestamp: new Date().toISOString(),
};

const mockErrorResponse = {
  error: 'API Error',
  message: 'Something went wrong',
  statusCode: 500,
};

// Test component that uses the useAIAssistant hook
interface TestComponentProps {
  conversationId?: string;
}

const TestComponent: React.FC<TestComponentProps> = ({ conversationId = 'test-conversation' }) => {
  const { 
    sendMessage, 
    isLoading, 
    error, 
    messages 
  } = useAIAssistant({
    conversationId,
    persistConversation: true,
  });
  
  const { preferences, updatePreferences } = usePreferences();
  
  return (
    <div>
      <button 
        onClick={() => sendMessage('Hello, AI!')}
        disabled={isLoading}
        data-testid="send-button"
      >
        {isLoading ? 'Sending...' : 'Send Message'}
      </button>
      
      {error && (
        <div data-testid="error-message">{error.message}</div>
      )}
      
      <div data-testid="messages">
        {messages.map((msg: AIMessage, idx: number) => (
          <div key={msg.id || idx} data-testid={`message-${idx}`}>
            {msg.content}
          </div>
        ))}
      </div>
      
      <div data-testid="preferences">
        {JSON.stringify(preferences)}
      </div>
      
      <button 
        onClick={() => updatePreferences({ 
          ai: { 
            assistantPersonality: 'professional',
            language: 'en',
            privacy: { shareTravelHistory: true }
          } 
        })}
      >
        Update Preferences
      </button>
      
      {error && <div data-testid="error">{error.message}</div>}
      
      <div data-testid="messages">
        {messages.map((msg, i) => (
          <div key={i} data-testid={`message-${i}`} data-role={msg.role}>
            {msg.content}
          </div>
        ))}
      </div>
      
      <div data-testid="preferences">
        {JSON.stringify(preferences?.ai)}
      </div>
    </div>
  );
};

describe('AI Assistant Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset mock context
    mockContext.addMemory.mockResolvedValue({});
    mockContext.searchMemories.mockResolvedValue([]);
    mockContext.searchKnowledge.mockResolvedValue([]);
      ok: true,
      json: async () => mockSuccessResponse,
    });
  
  it('should send a message and receive a response', async () => {
    render(
      <PreferencesProvider>
        <AIProvider>
          <TestComponent />
        </AIProvider>
      </PreferencesProvider>
    );
    
    // Send a message
    fireEvent.click(screen.getByText('Send Message'));
    
    // Should show loading state
    expect(screen.getByText('Send Message')).toBeDisabled();
    
    // Wait for the response
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/ai/chat',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
    });
    
    // Should show the response
    await waitFor(() => {
      expect(screen.getByTestId('messages')).toHaveTextContent('Hello! How can I help you today?');
    });
  });
  
  it('should handle API errors gracefully', async () => {
    // Mock an error response
    mockFetch.mockReset();
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    
    render(
      <PreferencesProvider>
        <AIProvider>
          <TestComponent />
        </AIProvider>
      </PreferencesProvider>
    );
    
    // Send a message
    fireEvent.click(screen.getByText('Send Message'));
    
    // Should show error state
    await waitFor(() => {
      expect(screen.getByTestId('error')).toBeInTheDocument();
    });
  });
  
  it('should update AI behavior when preferences change', async () => {
    render(
      <PreferencesProvider>
        <AIProvider>
          <TestComponent />
        </AIProvider>
      </PreferencesProvider>
    );
    
    // Update preferences
    fireEvent.click(screen.getByText('Update Preferences'));
    
    // Check if preferences were updated
    await waitFor(() => {
      const prefs = JSON.parse(screen.getByTestId('preferences').textContent || '{}');
      expect(prefs.assistantPersonality).toBe('professional');
      expect(prefs.language).toBe('en');
      expect(prefs.privacy.shareTravelHistory).toBe(true);
    });
    
    // Send a message with updated preferences
    fireEvent.click(screen.getByText('Send Message'));
    
    // Check if the API was called with the correct parameters
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('gpt-4-turbo'),
        })
      );
    });
  });
  
  it('should handle different error codes properly', () => {
    // Test error handling for different error codes
    const testCases = [
      {
        error: new Error('Network error'),
        expectedCode: ERROR_CODES.API_CONNECTION,
        expectedMessage: 'Unable to connect to the AI service.',
      },
      {
        error: { response: { status: 401 } },
        expectedCode: ERROR_CODES.API_AUTH,
        expectedMessage: 'There was an issue authenticating with the AI service.',
      },
      {
        error: { response: { status: 429 } },
        expectedCode: ERROR_CODES.API_RATE_LIMIT,
        expectedMessage: 'You have made too many requests.',
      },
    ];
    
    testCases.forEach(({ error, expectedCode, expectedMessage }) => {
      const result = handleAIError(error, { showToast: false });
      expect(result.code).toBe(expectedCode);
      expect(result.message).toContain(expectedMessage);
    });
  });
  
  it('should handle context and memory search', async () => {
    // Mock context search results
    mockContext.searchMemories.mockResolvedValueOnce([
      { content: 'User likes beaches', score: 0.9, metadata: { type: 'preference' } },
    ]);
    
    render(
      <PreferencesProvider>
        <AIProvider>
          <TestComponent />
        </AIProvider>
      </PreferencesProvider>
    );
    
    // Send a message that should trigger context search
    fireEvent.click(screen.getByText('Send Message'));
    
    // Check if context search was performed
    await waitFor(() => {
      expect(mockContext.searchMemories).toHaveBeenCalledWith('Hello, AI!', { limit: 3 });
    });
  });
});
