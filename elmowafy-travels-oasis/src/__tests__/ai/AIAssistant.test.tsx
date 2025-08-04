import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useAIAssistant } from '@/hooks/useAIAssistant';
import { PreferencesProvider, usePreferences } from '@/contexts/PreferencesContext';
import { AIMessage, ERROR_CODES } from '@/types/ai';

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

// Mock the error handler
const mockHandleAIError = jest.fn();
jest.mock('@/lib/ai/errorHandling', () => ({
  handleAIError: (...args: any[]) => mockHandleAIError(...args),
  ERROR_CODES: {
    NETWORK_ERROR: 'NETWORK_ERROR',
    API_ERROR: 'API_ERROR',
    AUTH_ERROR: 'AUTH_ERROR',
    RATE_LIMIT: 'RATE_LIMIT',
    INVALID_INPUT: 'INVALID_INPUT',
    NOT_FOUND: 'NOT_FOUND',
    UNKNOWN: 'UNKNOWN',
  },
}));

// Test component that uses the useAIAssistant hook
interface TestComponentProps {
  conversationId?: string;
  onMessageSent?: (message: string) => void;
}

const TestComponent: React.FC<TestComponentProps> = ({ 
  conversationId = 'test-conversation',
  onMessageSent
}) => {
  const { 
    sendMessage, 
    isLoading, 
    error, 
    messages,
    clearError
  } = useAIAssistant({
    conversationId,
    persistConversation: true,
    onMessageSent,
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
      
      <button 
        onClick={clearError}
        data-testid="clear-error-button"
      >
        Clear Error
      </button>
      
      {error && (
        <div data-testid="error-message">{error.message}</div>
      )}
      
      <div data-testid="messages">
        {messages.map((msg: AIMessage, idx: number) => (
          <div key={msg.id || idx} data-testid={`message-${idx}`}>
            {msg.role}: {msg.content}
          </div>
        ))}
      </div>
      
      <div data-testid="preferences">
        {JSON.stringify(preferences)}
      </div>
      
      <button 
        onClick={() => updatePreferences({ 
          ai: { 
            shareTravelHistory: true,
            sharePreferences: true,
            dataCollection: 'standard' as const
          } 
        })}
        data-testid="update-prefs-button"
      >
        Update Preferences
      </button>
    </div>
  );
};

describe('useAIAssistant Hook', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset process.env
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_AI_API_URL: 'http://localhost:8001/api',
    };
    
    // Mock successful fetch response by default
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockSuccessResponse,
    });
    
    // Mock localStorage
    Storage.prototype.setItem = jest.fn();
    Storage.prototype.getItem = jest.fn(() => null);
    Storage.prototype.removeItem = jest.fn();
    
    // Reset mock implementations
    mockSaveConversation.mockResolvedValue(undefined);
    mockGetConversation.mockResolvedValue(null);
    mockDeleteConversation.mockResolvedValue(undefined);
    mockHandleAIError.mockImplementation((error) => error);
  });
  
  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });
  
  it('should initialize with default values', () => {
    render(
      <PreferencesProvider>
        <TestComponent />
      </PreferencesProvider>
    );
    
    expect(screen.getByTestId('send-button')).not.toBeDisabled();
    expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
  });
  
  it('should send a message and update UI state', async () => {
    const onMessageSent = jest.fn();
    
    render(
      <PreferencesProvider>
        <TestComponent onMessageSent={onMessageSent} />
      </PreferencesProvider>
    );
    
    const sendButton = screen.getByTestId('send-button');
    fireEvent.click(sendButton);
    
    // Should show loading state
    expect(sendButton).toHaveTextContent('Sending...');
    
    // Wait for the API call to complete
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8001/api/chat',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer null',
          },
        })
      );
    });
    
    // Should update messages with the response
    await waitFor(() => {
      expect(screen.getByText(/assistant: Hello! How can I help you today?/)).toBeInTheDocument();
    });
    
    // Should call onMessageSent callback
    expect(onMessageSent).toHaveBeenCalledWith(expect.objectContaining({
      content: 'Hello! How can I help you today?',
      role: 'assistant',
    }));
    
    // Should clear loading state
    expect(sendButton).toHaveTextContent('Send Message');
  });
  
  it('should handle API errors', async () => {
    // Mock a failed API response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => mockErrorResponse,
    });
    
    render(
      <PreferencesProvider>
        <TestComponent />
      </PreferencesProvider>
    );
    
    fireEvent.click(screen.getByTestId('send-button'));
    
    // Should show error message
    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toHaveTextContent('Something went wrong');
    });
    
    // Should call error handler
    expect(mockHandleAIError).toHaveBeenCalled();
  });
  
  it('should handle network errors', async () => {
    // Simulate a network error
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
    
    render(
      <PreferencesProvider>
        <TestComponent />
      </PreferencesProvider>
    );
    
    fireEvent.click(screen.getByTestId('send-button'));
    
    // Should show network error
    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toHaveTextContent('Network error');
    });
    
    // Should call error handler with network error code
    expect(mockHandleAIError).toHaveBeenCalledWith(
      expect.any(Error),
      { code: ERROR_CODES.NETWORK_ERROR }
    );
  });
  
  it('should clear errors when clearError is called', async () => {
    // First trigger an error
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Test error'));
    
    render(
      <PreferencesProvider>
        <TestComponent />
      </PreferencesProvider>
    );
    
    fireEvent.click(screen.getByTestId('send-button'));
    
    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toBeInTheDocument();
    });
    
    // Clear the error
    fireEvent.click(screen.getByTestId('clear-error-button'));
    
    // Error should be cleared
    await waitFor(() => {
      expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
    });
  });
  
  it('should load conversation from storage if persistConversation is true', async () => {
    const savedMessages = [
      {
        id: 'msg-1',
        role: 'user' as const,
        content: 'Hello',
        timestamp: new Date().toISOString(),
      },
      {
        id: 'msg-2',
        role: 'assistant' as const,
        content: 'Hi there!',
        timestamp: new Date().toISOString(),
      },
    ];
    
    mockGetConversation.mockResolvedValueOnce(savedMessages);
    
    render(
      <PreferencesProvider>
        <TestComponent conversationId="saved-conversation" />
      </PreferencesProvider>
    );
    
    // Should load messages from storage
    await waitFor(() => {
      expect(mockGetConversation).toHaveBeenCalledWith('saved-conversation');
      expect(screen.getByText(/user: Hello/)).toBeInTheDocument();
      expect(screen.getByText(/assistant: Hi there!/)).toBeInTheDocument();
    });
  });
  
  it('should update preferences and include them in API requests', async () => {
    render(
      <PreferencesProvider>
        <TestComponent />
      </PreferencesProvider>
    );
    
    // Update preferences
    fireEvent.click(screen.getByTestId('update-prefs-button'));
    
    // Send a message
    fireEvent.click(screen.getByTestId('send-button'));
    
    // Check that preferences were included in the request
    
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
