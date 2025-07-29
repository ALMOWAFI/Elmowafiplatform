import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useAIAssistant } from '@/hooks/useAIAssistant';
import { AIProvider } from '@/contexts/AIAssistantContext';
import { PreferencesProvider, usePreferences } from '@/contexts/PreferencesContext';
import { ERROR_CODES, handleAIError } from '@/lib/ai/errorHandling';

// Mock the API call
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock the toast
jest.mock('@/components/ui/use-toast', () => ({
  toast: jest.fn(),
}));

// Mock the AI Assistant context
const mockContext = {
  addMemory: jest.fn(),
  searchMemories: jest.fn(),
  searchKnowledge: jest.fn(),
  searchTravelPlaces: jest.fn(),
  searchFamilyMembers: jest.fn(),
  getAIConfig: jest.fn(),
};

// Mock the AI Assistant provider
jest.mock('@/contexts/AIAssistantContext', () => ({
  ...jest.requireActual('@/contexts/AIAssistantContext'),
  useAIAssistant: () => mockContext,
  AIProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Test component that uses the useAIAssistant hook
const TestComponent = ({ initialMessage }: { initialMessage?: string }) => {
  const { sendMessage, isLoading, error, messages } = useAIAssistant('test-conversation');
  const { preferences, updatePreferences } = usePreferences();
  
  return (
    <div>
      <button 
        onClick={() => sendMessage('Hello, AI!')}
        disabled={isLoading}
      >
        Send Message
      </button>
      
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
    mockContext.searchTravelPlaces.mockResolvedValue([]);
    mockContext.searchFamilyMembers.mockResolvedValue([]);
    mockContext.getAIConfig.mockReturnValue({
      model: 'gpt-4-turbo',
      temperature: 0.7,
      maxTokens: 2000,
      presencePenalty: 0.3,
      frequencyPenalty: 0.1,
    });
    
    // Mock successful API response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: 'Hello! How can I help you today?',
          },
        }],
        model: 'gpt-4-turbo',
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
      }),
    });
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
