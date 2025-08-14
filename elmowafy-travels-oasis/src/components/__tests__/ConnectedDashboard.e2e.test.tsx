import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import ConnectedDashboard from '../ConnectedDashboard';
import { DataProvider } from '../../context/DataContext';
import { IntegrationProvider } from '../../context/IntegrationContext';
import { apiService } from '../../lib/api';

// Mock the API service
jest.mock('../../lib/api', () => ({
  apiService: {
    getFamilyMembers: jest.fn(),
    getMemories: jest.fn(),
    getTravelPlans: jest.fn(),
    getGameSessions: jest.fn(),
    getAIAnalyses: jest.fn(),
    getSuggestions: jest.fn(),
    getSystemHealth: jest.fn(),
    getSystemInfo: jest.fn(),
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

// Mock data
const mockFamilyMembers = [
  { id: '1', name: 'John Doe', role: 'parent', avatar: 'avatar1.jpg' },
  { id: '2', name: 'Jane Doe', role: 'parent', avatar: 'avatar2.jpg' },
  { id: '3', name: 'Child Doe', role: 'child', avatar: 'avatar3.jpg' }
];

const mockMemories = [
  { id: '1', title: 'Family Vacation', description: 'Amazing trip to the beach', image_url: 'vacation.jpg', created_at: '2024-01-15T10:00:00Z' },
  { id: '2', title: 'Birthday Party', description: 'Great celebration', image_url: 'birthday.jpg', created_at: '2024-01-16T10:00:00Z' },
  { id: '3', title: 'Holiday Dinner', description: 'Wonderful family dinner', image_url: 'dinner.jpg', created_at: '2024-01-17T10:00:00Z' }
];

const mockTravelPlans = [
  { id: '1', destination: 'Paris', start_date: '2024-06-01', end_date: '2024-06-07', status: 'planned' },
  { id: '2', destination: 'Tokyo', start_date: '2024-07-01', end_date: '2024-07-10', status: 'planned' }
];

const mockGameSessions = [
  { session_id: '1', game_type: 'family_quiz', participants: ['1', '2'], status: 'active', created_at: '2024-01-15T10:00:00Z' },
  { session_id: '2', game_type: 'memory_game', participants: ['1', '2', '3'], status: 'completed', created_at: '2024-01-16T10:00:00Z' }
];

const mockAIAnalyses = [
  { id: '1', type: 'memory_analysis', content: 'Analysis result', created_at: '2024-01-15T10:00:00Z' },
  { id: '2', type: 'travel_recommendation', content: 'Travel suggestion', created_at: '2024-01-16T10:00:00Z' }
];

const mockSuggestions = {
  memories: ['Create a new memory', 'Share recent photos', 'Organize family album'],
  activities: ['Plan a family dinner', 'Organize a game night', 'Plan weekend trip'],
  travel: ['Book flights for Paris trip', 'Research Tokyo attractions', 'Plan family vacation']
};

const mockSystemHealth = {
  status: 'healthy',
  services: {
    api: true,
    ai: true,
    database: true,
    websocket: true
  },
  uptime: 86400,
  version: '1.0.0'
};

describe('ConnectedDashboard E2E', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    
    jest.clearAllMocks();
    
    // Mock API responses
    mockApiService.getFamilyMembers.mockResolvedValue(mockFamilyMembers);
    mockApiService.getMemories.mockResolvedValue(mockMemories);
    mockApiService.getTravelPlans.mockResolvedValue(mockTravelPlans);
    mockApiService.getGameSessions.mockResolvedValue(mockGameSessions);
    mockApiService.getAIAnalyses.mockResolvedValue(mockAIAnalyses);
    mockApiService.getSuggestions.mockResolvedValue(mockSuggestions);
    mockApiService.getSystemHealth.mockResolvedValue(mockSystemHealth);
    mockApiService.getSystemInfo.mockResolvedValue({
      version: '1.0.0',
      environment: 'test',
      features: ['ai', 'websockets', 'real-time']
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  test('should display real-time data from all contexts', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <DataProvider>
            <IntegrationProvider>
              <ConnectedDashboard />
            </IntegrationProvider>
          </DataProvider>
        </BrowserRouter>
      </QueryClientProvider>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText(/Family Members/)).toBeInTheDocument();
    });

    // Check family members data
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Child Doe')).toBeInTheDocument();

    // Check memories data
    expect(screen.getByText('Family Vacation')).toBeInTheDocument();
    expect(screen.getByText('Birthday Party')).toBeInTheDocument();
    expect(screen.getByText('Holiday Dinner')).toBeInTheDocument();

    // Check travel plans data
    expect(screen.getByText('Paris')).toBeInTheDocument();
    expect(screen.getByText('Tokyo')).toBeInTheDocument();

    // Check game sessions data
    expect(screen.getByText('family_quiz')).toBeInTheDocument();
    expect(screen.getByText('memory_game')).toBeInTheDocument();

    // Check AI analyses data
    expect(screen.getByText('memory_analysis')).toBeInTheDocument();
    expect(screen.getByText('travel_recommendation')).toBeInTheDocument();
  });

  test('should show real-time connection status', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <DataProvider>
            <IntegrationProvider>
              <ConnectedDashboard />
            </IntegrationProvider>
          </DataProvider>
        </BrowserRouter>
      </QueryClientProvider>
    );

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText(/Family Members/)).toBeInTheDocument();
    });

    // Check connection status indicators
    expect(screen.getByTestId('connection-status')).toBeInTheDocument();
    
    // Initially should show connecting
    expect(screen.getByTestId('connection-status')).toHaveTextContent('Connected');

    // Check service health indicators
    expect(screen.getByTestId('api-health')).toBeInTheDocument();
    expect(screen.getByTestId('ai-health')).toBeInTheDocument();
    expect(screen.getByTestId('database-health')).toBeInTheDocument();
    expect(screen.getByTestId('websocket-health')).toBeInTheDocument();
  });

  test('should display statistics and metrics', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <DataProvider>
            <IntegrationProvider>
              <ConnectedDashboard />
            </IntegrationProvider>
          </DataProvider>
        </BrowserRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Family Members/)).toBeInTheDocument();
    });

    // Check statistics are displayed
    expect(screen.getByText('3')).toBeInTheDocument(); // Family members count
    expect(screen.getByText('3')).toBeInTheDocument(); // Memories count
    expect(screen.getByText('2')).toBeInTheDocument(); // Travel plans count
    expect(screen.getByText('2')).toBeInTheDocument(); // Game sessions count
    expect(screen.getByText('2')).toBeInTheDocument(); // AI analyses count
  });

  test('should show AI suggestions', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <DataProvider>
            <IntegrationProvider>
              <ConnectedDashboard />
            </IntegrationProvider>
          </DataProvider>
        </BrowserRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Family Members/)).toBeInTheDocument();
    });

    // Check AI suggestions are displayed
    expect(screen.getByText('Create a new memory')).toBeInTheDocument();
    expect(screen.getByText('Plan a family dinner')).toBeInTheDocument();
    expect(screen.getByText('Book flights for Paris trip')).toBeInTheDocument();
  });

  test('should handle refresh functionality', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <DataProvider>
            <IntegrationProvider>
              <ConnectedDashboard />
            </IntegrationProvider>
          </DataProvider>
        </BrowserRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Family Members/)).toBeInTheDocument();
    });

    // Find and click refresh button
    const refreshButton = screen.getByTestId('refresh-button');
    expect(refreshButton).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(refreshButton);
    });

    // Verify all API calls were made again
    expect(mockApiService.getFamilyMembers).toHaveBeenCalledTimes(2); // Initial + refresh
    expect(mockApiService.getMemories).toHaveBeenCalledTimes(2);
    expect(mockApiService.getTravelPlans).toHaveBeenCalledTimes(2);
    expect(mockApiService.getGameSessions).toHaveBeenCalledTimes(2);
    expect(mockApiService.getAIAnalyses).toHaveBeenCalledTimes(2);
    expect(mockApiService.getSuggestions).toHaveBeenCalledTimes(2);
  });

  test('should handle real-time updates', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <DataProvider>
            <IntegrationProvider>
              <ConnectedDashboard />
            </IntegrationProvider>
          </DataProvider>
        </BrowserRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Family Members/)).toBeInTheDocument();
    });

    // Simulate WebSocket connection
    await act(async () => {
      const wsInstance = (global.WebSocket as jest.Mock).mock.results[0].value;
      const onOpenCallback = wsInstance.addEventListener.mock.calls.find(
        call => call[0] === 'open'
      )[1];
      onOpenCallback();
    });

    // Simulate real-time memory update
    await act(async () => {
      const wsInstance = (global.WebSocket as jest.Mock).mock.results[0].value;
      const onMessageCallback = wsInstance.addEventListener.mock.calls.find(
        call => call[0] === 'message'
      )[1];
      
      const mockEvent = {
        data: JSON.stringify({
          type: 'memory_update',
          data: { id: '4', title: 'New Real-time Memory', description: 'Just added', image_url: 'new.jpg', created_at: '2024-01-18T10:00:00Z' },
          timestamp: new Date().toISOString()
        })
      };
      
      onMessageCallback(mockEvent);
    });

    // Verify real-time update was received
    await waitFor(() => {
      expect(screen.getByText('New Real-time Memory')).toBeInTheDocument();
    });
  });

  test('should handle service health changes', async () => {
    // Mock service health failure
    mockApiService.getSystemHealth.mockResolvedValue({
      status: 'degraded',
      services: {
        api: true,
        ai: false,
        database: true,
        websocket: false
      },
      uptime: 86400,
      version: '1.0.0'
    });

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <DataProvider>
            <IntegrationProvider>
              <ConnectedDashboard />
            </IntegrationProvider>
          </DataProvider>
        </BrowserRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Family Members/)).toBeInTheDocument();
    });

    // Check health status indicators show degraded state
    expect(screen.getByTestId('ai-health')).toHaveTextContent('false');
    expect(screen.getByTestId('websocket-health')).toHaveTextContent('false');
    expect(screen.getByTestId('api-health')).toHaveTextContent('true');
    expect(screen.getByTestId('database-health')).toHaveTextContent('true');
  });

  test('should display recent activity timeline', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <DataProvider>
            <IntegrationProvider>
              <ConnectedDashboard />
            </IntegrationProvider>
          </DataProvider>
        </BrowserRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Family Members/)).toBeInTheDocument();
    });

    // Check recent activity is displayed
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    
    // Check recent memories are shown
    expect(screen.getByText('Holiday Dinner')).toBeInTheDocument();
    expect(screen.getByText('Birthday Party')).toBeInTheDocument();
    expect(screen.getByText('Family Vacation')).toBeInTheDocument();
  });

  test('should handle navigation to other sections', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <DataProvider>
            <IntegrationProvider>
              <ConnectedDashboard />
            </IntegrationProvider>
          </DataProvider>
        </BrowserRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Family Members/)).toBeInTheDocument();
    });

    // Check navigation links are present
    expect(screen.getByText('Memories')).toBeInTheDocument();
    expect(screen.getByText('Travel')).toBeInTheDocument();
    expect(screen.getByText('Activities')).toBeInTheDocument();
    expect(screen.getByText('Gaming')).toBeInTheDocument();
  });

  test('should handle loading states', async () => {
    // Mock slow API responses
    mockApiService.getFamilyMembers.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve(mockFamilyMembers), 1000))
    );

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <DataProvider>
            <IntegrationProvider>
              <ConnectedDashboard />
            </IntegrationProvider>
          </DataProvider>
        </BrowserRouter>
      </QueryClientProvider>
    );

    // Should show loading state initially
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    }, { timeout: 2000 });

    // Loading indicator should be gone
    expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
  });

  test('should handle error states gracefully', async () => {
    // Mock API error
    mockApiService.getFamilyMembers.mockRejectedValue(new Error('Failed to fetch family members'));

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <DataProvider>
            <IntegrationProvider>
              <ConnectedDashboard />
            </IntegrationProvider>
          </DataProvider>
        </BrowserRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Family Members/)).toBeInTheDocument();
    });

    // Should show error message
    expect(screen.getByText('Failed to fetch family members')).toBeInTheDocument();
    
    // Should show retry option
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  test('should maintain data consistency across updates', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <DataProvider>
            <IntegrationProvider>
              <ConnectedDashboard />
            </IntegrationProvider>
          </DataProvider>
        </BrowserRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Family Members/)).toBeInTheDocument();
    });

    // Verify initial data
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Family Vacation')).toBeInTheDocument();

    // Simulate multiple real-time updates
    await act(async () => {
      const wsInstance = (global.WebSocket as jest.Mock).mock.results[0].value;
      const onMessageCallback = wsInstance.addEventListener.mock.calls.find(
        call => call[0] === 'message'
      )[1];
      
      // Send multiple updates
      const updates = [
        { type: 'memory_update', data: { id: '4', title: 'Update 1' } },
        { type: 'family_update', data: { id: '4', name: 'New Member' } },
        { type: 'travel_update', data: { id: '3', destination: 'London' } }
      ];
      
      updates.forEach(update => {
        const mockEvent = {
          data: JSON.stringify({
            ...update,
            timestamp: new Date().toISOString()
          })
        };
        onMessageCallback(mockEvent);
      });
    });

    // Verify all updates are reflected
    await waitFor(() => {
      expect(screen.getByText('Update 1')).toBeInTheDocument();
      expect(screen.getByText('New Member')).toBeInTheDocument();
      expect(screen.getByText('London')).toBeInTheDocument();
    });
  });
});
