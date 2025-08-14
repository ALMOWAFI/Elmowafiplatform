import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { IntegrationProvider, useIntegration } from '../IntegrationContext';
import { apiService } from '../../lib/api';

// Mock the API service
jest.mock('../../lib/api', () => ({
  apiService: {
    getSystemHealth: jest.fn(),
    getSystemInfo: jest.fn(),
    uploadMemoryWithAI: jest.fn(),
    getAIMemorySuggestions: jest.fn(),
    getAITravelRecommendations: jest.fn(),
    chatWithAI: jest.fn(),
    getEnhancedTimeline: jest.fn(),
  }
}));

const mockApiService = apiService as jest.Mocked<typeof apiService>;

// Mock WebSocket
const mockWebSocket = {
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: 1, // OPEN
};

global.WebSocket = jest.fn(() => mockWebSocket) as any;

// Test component to access context
const TestComponent: React.FC = () => {
  const {
    state,
    sendMessage,
    reconnect,
    checkServiceHealth,
    subscribeToUpdates,
    broadcastEvent,
    subscribeToEvent,
    uploadMemoryWithAI,
    getAIMemorySuggestions,
    getAITravelRecommendations,
    chatWithAI,
    getEnhancedTimeline,
    getConnectionStatus,
    getServiceStatus
  } = useIntegration();

  return (
    <div>
      <div data-testid="connection-status">{state.connectionStatus}</div>
      <div data-testid="is-connected">{state.isConnected.toString()}</div>
      <div data-testid="message-count">{state.messageCount}</div>
      <div data-testid="error-count">{state.errorCount}</div>
      <div data-testid="reconnect-attempts">{state.reconnectAttempts}</div>
      <div data-testid="api-health">{state.services.api.toString()}</div>
      <div data-testid="ai-health">{state.services.ai.toString()}</div>
      <div data-testid="database-health">{state.services.database.toString()}</div>
      <div data-testid="websocket-health">{state.services.websocket.toString()}</div>
      
      <button data-testid="send-message" onClick={() => sendMessage({
        type: 'memory_update',
        data: { id: '1', title: 'Test' },
        timestamp: new Date().toISOString()
      })}>
        Send Message
      </button>
      
      <button data-testid="reconnect" onClick={reconnect}>
        Reconnect
      </button>
      
      <button data-testid="check-health" onClick={() => checkServiceHealth()}>
        Check Health
      </button>
      
      <button data-testid="broadcast-event" onClick={() => broadcastEvent('test_event', { data: 'test' })}>
        Broadcast Event
      </button>
      
      <button data-testid="upload-memory" onClick={() => uploadMemoryWithAI(new FormData())}>
        Upload Memory
      </button>
      
      <button data-testid="get-suggestions" onClick={() => getAIMemorySuggestions()}>
        Get Suggestions
      </button>
      
      <button data-testid="chat-ai" onClick={() => chatWithAI('Hello AI')}>
        Chat AI
      </button>
    </div>
  );
};

describe('IntegrationContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.WebSocket as jest.Mock).mockClear();
  });

  test('should establish WebSocket connection', async () => {
    render(
      <IntegrationProvider>
        <TestComponent />
      </IntegrationProvider>
    );

    // Verify WebSocket was created
    expect(global.WebSocket).toHaveBeenCalledWith('ws://localhost:8000/ws');

    // Initially connecting
    expect(screen.getByTestId('connection-status')).toHaveTextContent('connecting');

    // Simulate WebSocket open event
    await act(async () => {
      const wsInstance = (global.WebSocket as jest.Mock).mock.results[0].value;
      const onOpenCallback = wsInstance.addEventListener.mock.calls.find(
        call => call[0] === 'open'
      )[1];
      onOpenCallback();
    });

    // Should be connected
    await waitFor(() => {
      expect(screen.getByTestId('connection-status')).toHaveTextContent('connected');
      expect(screen.getByTestId('is-connected')).toHaveTextContent('true');
    });
  });

  test('should handle connection failures', async () => {
    render(
      <IntegrationProvider>
        <TestComponent />
      </IntegrationProvider>
    );

    // Simulate WebSocket error
    await act(async () => {
      const wsInstance = (global.WebSocket as jest.Mock).mock.results[0].value;
      const onErrorCallback = wsInstance.addEventListener.mock.calls.find(
        call => call[0] === 'error'
      )[1];
      onErrorCallback(new Error('Connection failed'));
    });

    // Should show error status
    await waitFor(() => {
      expect(screen.getByTestId('connection-status')).toHaveTextContent('error');
      expect(screen.getByTestId('is-connected')).toHaveTextContent('false');
      expect(screen.getByTestId('error-count')).toHaveTextContent('1');
    });
  });

  test('should handle reconnection', async () => {
    render(
      <IntegrationProvider>
        <TestComponent />
      </IntegrationProvider>
    );

    // Simulate connection failure
    await act(async () => {
      const wsInstance = (global.WebSocket as jest.Mock).mock.results[0].value;
      const onErrorCallback = wsInstance.addEventListener.mock.calls.find(
        call => call[0] === 'error'
      )[1];
      onErrorCallback(new Error('Connection failed'));
    });

    // Click reconnect button
    await act(async () => {
      screen.getByTestId('reconnect').click();
    });

    // Should create new WebSocket connection
    expect(global.WebSocket).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('reconnect-attempts')).toHaveTextContent('1');
  });

  test('should send WebSocket messages', async () => {
    render(
      <IntegrationProvider>
        <TestComponent />
      </IntegrationProvider>
    );

    // Establish connection
    await act(async () => {
      const wsInstance = (global.WebSocket as jest.Mock).mock.results[0].value;
      const onOpenCallback = wsInstance.addEventListener.mock.calls.find(
        call => call[0] === 'open'
      )[1];
      onOpenCallback();
    });

    // Send message
    await act(async () => {
      screen.getByTestId('send-message').click();
    });

    // Verify message was sent
    expect(mockWebSocket.send).toHaveBeenCalledWith(
      expect.stringContaining('memory_update')
    );
  });

  test('should receive WebSocket messages', async () => {
    render(
      <IntegrationProvider>
        <TestComponent />
      </IntegrationProvider>
    );

    // Establish connection
    await act(async () => {
      const wsInstance = (global.WebSocket as jest.Mock).mock.results[0].value;
      const onOpenCallback = wsInstance.addEventListener.mock.calls.find(
        call => call[0] === 'open'
      )[1];
      onOpenCallback();
    });

    // Simulate incoming message
    await act(async () => {
      const wsInstance = (global.WebSocket as jest.Mock).mock.results[0].value;
      const onMessageCallback = wsInstance.addEventListener.mock.calls.find(
        call => call[0] === 'message'
      )[1];
      
      const mockEvent = {
        data: JSON.stringify({
          type: 'memory_update',
          data: { id: '1', title: 'New Memory' },
          timestamp: new Date().toISOString()
        })
      };
      
      onMessageCallback(mockEvent);
    });

    // Verify message count increased
    await waitFor(() => {
      expect(screen.getByTestId('message-count')).toHaveTextContent('1');
    });
  });

  test('should check service health', async () => {
    // Mock health check responses
    mockApiService.getSystemHealth.mockResolvedValue({
      status: 'healthy',
      services: {
        api: true,
        ai: true,
        database: true,
        websocket: true
      }
    });

    render(
      <IntegrationProvider>
        <TestComponent />
      </IntegrationProvider>
    );

    // Click health check button
    await act(async () => {
      screen.getByTestId('check-health').click();
    });

    // Verify API was called
    expect(mockApiService.getSystemHealth).toHaveBeenCalled();

    // Verify health status is updated
    await waitFor(() => {
      expect(screen.getByTestId('api-health')).toHaveTextContent('true');
      expect(screen.getByTestId('ai-health')).toHaveTextContent('true');
      expect(screen.getByTestId('database-health')).toHaveTextContent('true');
      expect(screen.getByTestId('websocket-health')).toHaveTextContent('true');
    });
  });

  test('should handle service health failures', async () => {
    // Mock health check failure
    mockApiService.getSystemHealth.mockRejectedValue(new Error('Health check failed'));

    render(
      <IntegrationProvider>
        <TestComponent />
      </IntegrationProvider>
    );

    // Click health check button
    await act(async () => {
      screen.getByTestId('check-health').click();
    });

    // Verify health status shows failures
    await waitFor(() => {
      expect(screen.getByTestId('api-health')).toHaveTextContent('false');
      expect(screen.getByTestId('ai-health')).toHaveTextContent('false');
      expect(screen.getByTestId('database-health')).toHaveTextContent('false');
      expect(screen.getByTestId('websocket-health')).toHaveTextContent('false');
    });
  });

  test('should broadcast events', async () => {
    const mockCallback = jest.fn();

    render(
      <IntegrationProvider>
        <TestComponent />
      </IntegrationProvider>
    );

    // Subscribe to event
    const { subscribeToEvent } = useIntegration();
    const unsubscribe = subscribeToEvent('test_event', mockCallback);

    // Broadcast event
    await act(async () => {
      screen.getByTestId('broadcast-event').click();
    });

    // Verify callback was called
    expect(mockCallback).toHaveBeenCalledWith({ data: 'test' });

    // Unsubscribe
    unsubscribe();
  });

  test('should handle AI integration methods', async () => {
    // Mock AI service responses
    mockApiService.uploadMemoryWithAI.mockResolvedValue({ id: '1', analysis: 'AI analysis' });
    mockApiService.getAIMemorySuggestions.mockResolvedValue(['Suggestion 1', 'Suggestion 2']);
    mockApiService.chatWithAI.mockResolvedValue({ response: 'AI response' });

    render(
      <IntegrationProvider>
        <TestComponent />
      </IntegrationProvider>
    );

    // Test upload memory with AI
    await act(async () => {
      screen.getByTestId('upload-memory').click();
    });
    expect(mockApiService.uploadMemoryWithAI).toHaveBeenCalled();

    // Test get AI suggestions
    await act(async () => {
      screen.getByTestId('get-suggestions').click();
    });
    expect(mockApiService.getAIMemorySuggestions).toHaveBeenCalled();

    // Test chat with AI
    await act(async () => {
      screen.getByTestId('chat-ai').click();
    });
    expect(mockApiService.chatWithAI).toHaveBeenCalledWith('Hello AI');
  });

  test('should subscribe to updates', async () => {
    const mockCallback = jest.fn();

    render(
      <IntegrationProvider>
        <TestComponent />
      </IntegrationProvider>
    );

    // Subscribe to updates
    const { subscribeToUpdates } = useIntegration();
    const unsubscribe = subscribeToUpdates('memory_update', mockCallback);

    // Simulate memory update message
    await act(async () => {
      const wsInstance = (global.WebSocket as jest.Mock).mock.results[0].value;
      const onMessageCallback = wsInstance.addEventListener.mock.calls.find(
        call => call[0] === 'message'
      )[1];
      
      const mockEvent = {
        data: JSON.stringify({
          type: 'memory_update',
          data: { id: '1', title: 'Updated Memory' },
          timestamp: new Date().toISOString()
        })
      };
      
      onMessageCallback(mockEvent);
    });

    // Verify callback was called
    expect(mockCallback).toHaveBeenCalledWith({ id: '1', title: 'Updated Memory' });

    // Unsubscribe
    unsubscribe();
  });

  test('should handle connection close', async () => {
    render(
      <IntegrationProvider>
        <TestComponent />
      </IntegrationProvider>
    );

    // Establish connection first
    await act(async () => {
      const wsInstance = (global.WebSocket as jest.Mock).mock.results[0].value;
      const onOpenCallback = wsInstance.addEventListener.mock.calls.find(
        call => call[0] === 'open'
      )[1];
      onOpenCallback();
    });

    // Simulate connection close
    await act(async () => {
      const wsInstance = (global.WebSocket as jest.Mock).mock.results[0].value;
      const onCloseCallback = wsInstance.addEventListener.mock.calls.find(
        call => call[0] === 'close'
      )[1];
      onCloseCallback();
    });

    // Should show disconnected status
    await waitFor(() => {
      expect(screen.getByTestId('connection-status')).toHaveTextContent('disconnected');
      expect(screen.getByTestId('is-connected')).toHaveTextContent('false');
    });
  });

  test('should get connection status and service status', async () => {
    render(
      <IntegrationProvider>
        <TestComponent />
      </IntegrationProvider>
    );

    // Test getConnectionStatus
    const { getConnectionStatus, getServiceStatus } = useIntegration();
    
    expect(getConnectionStatus()).toBe('connecting');
    
    const serviceStatus = getServiceStatus();
    expect(serviceStatus).toHaveProperty('api');
    expect(serviceStatus).toHaveProperty('ai');
    expect(serviceStatus).toHaveProperty('database');
    expect(serviceStatus).toHaveProperty('websocket');
  });

  test('should handle multiple concurrent operations', async () => {
    render(
      <IntegrationProvider>
        <TestComponent />
      </IntegrationProvider>
    );

    // Establish connection
    await act(async () => {
      const wsInstance = (global.WebSocket as jest.Mock).mock.results[0].value;
      const onOpenCallback = wsInstance.addEventListener.mock.calls.find(
        call => call[0] === 'open'
      )[1];
      onOpenCallback();
    });

    // Perform multiple operations concurrently
    await act(async () => {
      screen.getByTestId('send-message').click();
      screen.getByTestId('broadcast-event').click();
      screen.getByTestId('check-health').click();
    });

    // Verify all operations were handled
    expect(mockWebSocket.send).toHaveBeenCalled();
    expect(mockApiService.getSystemHealth).toHaveBeenCalled();
  });
});
