import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DataProvider, useData } from '../DataContext';
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
    createFamilyMember: jest.fn(),
    updateFamilyMember: jest.fn(),
    deleteFamilyMember: jest.fn(),
    createMemory: jest.fn(),
    updateMemory: jest.fn(),
    deleteMemory: jest.fn(),
    createTravelPlan: jest.fn(),
    updateTravelPlan: jest.fn(),
    createGameSession: jest.fn(),
    updateGameSession: jest.fn(),
    createAIAnalysis: jest.fn(),
  }
}));

const mockApiService = apiService as jest.Mocked<typeof apiService>;

// Test component to access context
const TestComponent: React.FC = () => {
  const {
    familyMembers,
    memories,
    travelPlans,
    gameSessions,
    aiAnalyses,
    suggestions,
    isLoading,
    error,
    addFamilyMember,
    updateFamilyMember,
    removeFamilyMember,
    addMemory,
    updateMemory,
    removeMemory,
    refreshAllData,
    clearError
  } = useData();

  return (
    <div>
      <div data-testid="loading">{isLoading.toString()}</div>
      <div data-testid="error">{error || 'no-error'}</div>
      <div data-testid="family-count">{familyMembers.length}</div>
      <div data-testid="memories-count">{memories.length}</div>
      <div data-testid="travel-count">{travelPlans.length}</div>
      <div data-testid="games-count">{gameSessions.length}</div>
      <div data-testid="ai-count">{aiAnalyses.length}</div>
      <button 
        data-testid="add-family" 
        onClick={() => addFamilyMember({ name: 'Test User', role: 'parent', avatar: 'test.jpg' })}
      >
        Add Family
      </button>
      <button 
        data-testid="add-memory" 
        onClick={() => addMemory({ title: 'Test Memory', description: 'Test', image_url: 'test.jpg' })}
      >
        Add Memory
      </button>
      <button data-testid="refresh" onClick={refreshAllData}>Refresh</button>
      <button data-testid="clear-error" onClick={clearError}>Clear Error</button>
    </div>
  );
};

// Mock data
const mockFamilyMembers = [
  { id: '1', name: 'John Doe', role: 'parent', avatar: 'avatar1.jpg' },
  { id: '2', name: 'Jane Doe', role: 'parent', avatar: 'avatar2.jpg' }
];

const mockMemories = [
  { id: '1', title: 'Family Vacation', description: 'Amazing trip', image_url: 'vacation.jpg', created_at: '2024-01-15T10:00:00Z' },
  { id: '2', title: 'Birthday Party', description: 'Great celebration', image_url: 'birthday.jpg', created_at: '2024-01-16T10:00:00Z' }
];

const mockTravelPlans = [
  { id: '1', destination: 'Paris', start_date: '2024-06-01', end_date: '2024-06-07', status: 'planned' },
  { id: '2', destination: 'Tokyo', start_date: '2024-07-01', end_date: '2024-07-10', status: 'planned' }
];

const mockGameSessions = [
  { session_id: '1', game_type: 'family_quiz', participants: ['1', '2'], status: 'active', created_at: '2024-01-15T10:00:00Z' }
];

const mockAIAnalyses = [
  { id: '1', type: 'memory_analysis', content: 'Analysis result', created_at: '2024-01-15T10:00:00Z' }
];

const mockSuggestions = {
  memories: ['Create a new memory', 'Share recent photos'],
  activities: ['Plan a family dinner', 'Organize a game night']
};

describe('DataContext', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  test('should initialize with empty state', async () => {
    // Mock API responses
    mockApiService.getFamilyMembers.mockResolvedValue([]);
    mockApiService.getMemories.mockResolvedValue([]);
    mockApiService.getTravelPlans.mockResolvedValue([]);
    mockApiService.getGameSessions.mockResolvedValue([]);
    mockApiService.getAIAnalyses.mockResolvedValue([]);
    mockApiService.getSuggestions.mockResolvedValue({});

    render(
      <QueryClientProvider client={queryClient}>
        <DataProvider>
          <TestComponent />
        </DataProvider>
      </QueryClientProvider>
    );

    // Initially loading
    expect(screen.getByTestId('loading')).toHaveTextContent('true');
    expect(screen.getByTestId('error')).toHaveTextContent('no-error');

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    // Check initial counts
    expect(screen.getByTestId('family-count')).toHaveTextContent('0');
    expect(screen.getByTestId('memories-count')).toHaveTextContent('0');
    expect(screen.getByTestId('travel-count')).toHaveTextContent('0');
    expect(screen.getByTestId('games-count')).toHaveTextContent('0');
    expect(screen.getByTestId('ai-count')).toHaveTextContent('0');
  });

  test('should load and display data correctly', async () => {
    // Mock API responses with data
    mockApiService.getFamilyMembers.mockResolvedValue(mockFamilyMembers);
    mockApiService.getMemories.mockResolvedValue(mockMemories);
    mockApiService.getTravelPlans.mockResolvedValue(mockTravelPlans);
    mockApiService.getGameSessions.mockResolvedValue(mockGameSessions);
    mockApiService.getAIAnalyses.mockResolvedValue(mockAIAnalyses);
    mockApiService.getSuggestions.mockResolvedValue(mockSuggestions);

    render(
      <QueryClientProvider client={queryClient}>
        <DataProvider>
          <TestComponent />
        </DataProvider>
      </QueryClientProvider>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    // Check data counts
    expect(screen.getByTestId('family-count')).toHaveTextContent('2');
    expect(screen.getByTestId('memories-count')).toHaveTextContent('2');
    expect(screen.getByTestId('travel-count')).toHaveTextContent('2');
    expect(screen.getByTestId('games-count')).toHaveTextContent('1');
    expect(screen.getByTestId('ai-count')).toHaveTextContent('1');
  });

  test('should add family member', async () => {
    const newMember = { id: '3', name: 'New Member', role: 'child', avatar: 'new.jpg' };
    
    mockApiService.getFamilyMembers.mockResolvedValue(mockFamilyMembers);
    mockApiService.createFamilyMember.mockResolvedValue(newMember);
    mockApiService.getMemories.mockResolvedValue([]);
    mockApiService.getTravelPlans.mockResolvedValue([]);
    mockApiService.getGameSessions.mockResolvedValue([]);
    mockApiService.getAIAnalyses.mockResolvedValue([]);
    mockApiService.getSuggestions.mockResolvedValue({});

    render(
      <QueryClientProvider client={queryClient}>
        <DataProvider>
          <TestComponent />
        </DataProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    // Click add family button
    await act(async () => {
      screen.getByTestId('add-family').click();
    });

    // Verify API was called
    expect(mockApiService.createFamilyMember).toHaveBeenCalledWith({
      name: 'Test User',
      role: 'parent',
      avatar: 'test.jpg'
    });
  });

  test('should add memory', async () => {
    const newMemory = { id: '3', title: 'New Memory', description: 'New description', image_url: 'new.jpg', created_at: '2024-01-17T10:00:00Z' };
    
    mockApiService.getFamilyMembers.mockResolvedValue([]);
    mockApiService.getMemories.mockResolvedValue(mockMemories);
    mockApiService.createMemory.mockResolvedValue(newMemory);
    mockApiService.getTravelPlans.mockResolvedValue([]);
    mockApiService.getGameSessions.mockResolvedValue([]);
    mockApiService.getAIAnalyses.mockResolvedValue([]);
    mockApiService.getSuggestions.mockResolvedValue({});

    render(
      <QueryClientProvider client={queryClient}>
        <DataProvider>
          <TestComponent />
        </DataProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    // Click add memory button
    await act(async () => {
      screen.getByTestId('add-memory').click();
    });

    // Verify API was called
    expect(mockApiService.createMemory).toHaveBeenCalledWith({
      title: 'Test Memory',
      description: 'Test',
      image_url: 'test.jpg'
    });
  });

  test('should handle API errors gracefully', async () => {
    // Mock API error
    mockApiService.getFamilyMembers.mockRejectedValue(new Error('API Error'));
    mockApiService.getMemories.mockResolvedValue([]);
    mockApiService.getTravelPlans.mockResolvedValue([]);
    mockApiService.getGameSessions.mockResolvedValue([]);
    mockApiService.getAIAnalyses.mockResolvedValue([]);
    mockApiService.getSuggestions.mockResolvedValue({});

    render(
      <QueryClientProvider client={queryClient}>
        <DataProvider>
          <TestComponent />
        </DataProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    // Check error is displayed
    expect(screen.getByTestId('error')).toHaveTextContent('API Error');
  });

  test('should refresh all data', async () => {
    mockApiService.getFamilyMembers.mockResolvedValue(mockFamilyMembers);
    mockApiService.getMemories.mockResolvedValue(mockMemories);
    mockApiService.getTravelPlans.mockResolvedValue(mockTravelPlans);
    mockApiService.getGameSessions.mockResolvedValue(mockGameSessions);
    mockApiService.getAIAnalyses.mockResolvedValue(mockAIAnalyses);
    mockApiService.getSuggestions.mockResolvedValue(mockSuggestions);

    render(
      <QueryClientProvider client={queryClient}>
        <DataProvider>
          <TestComponent />
        </DataProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    // Click refresh button
    await act(async () => {
      screen.getByTestId('refresh').click();
    });

    // Verify all API calls were made again
    expect(mockApiService.getFamilyMembers).toHaveBeenCalledTimes(2); // Initial + refresh
    expect(mockApiService.getMemories).toHaveBeenCalledTimes(2);
    expect(mockApiService.getTravelPlans).toHaveBeenCalledTimes(2);
    expect(mockApiService.getGameSessions).toHaveBeenCalledTimes(2);
    expect(mockApiService.getAIAnalyses).toHaveBeenCalledTimes(2);
    expect(mockApiService.getSuggestions).toHaveBeenCalledTimes(2);
  });

  test('should clear error', async () => {
    // Mock API error
    mockApiService.getFamilyMembers.mockRejectedValue(new Error('API Error'));
    mockApiService.getMemories.mockResolvedValue([]);
    mockApiService.getTravelPlans.mockResolvedValue([]);
    mockApiService.getGameSessions.mockResolvedValue([]);
    mockApiService.getAIAnalyses.mockResolvedValue([]);
    mockApiService.getSuggestions.mockResolvedValue({});

    render(
      <QueryClientProvider client={queryClient}>
        <DataProvider>
          <TestComponent />
        </DataProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    // Verify error is present
    expect(screen.getByTestId('error')).toHaveTextContent('API Error');

    // Click clear error button
    await act(async () => {
      screen.getByTestId('clear-error').click();
    });

    // Verify error is cleared
    expect(screen.getByTestId('error')).toHaveTextContent('no-error');
  });

  test('should handle concurrent operations', async () => {
    mockApiService.getFamilyMembers.mockResolvedValue(mockFamilyMembers);
    mockApiService.getMemories.mockResolvedValue(mockMemories);
    mockApiService.getTravelPlans.mockResolvedValue(mockTravelPlans);
    mockApiService.getGameSessions.mockResolvedValue(mockGameSessions);
    mockApiService.getAIAnalyses.mockResolvedValue(mockAIAnalyses);
    mockApiService.getSuggestions.mockResolvedValue(mockSuggestions);

    render(
      <QueryClientProvider client={queryClient}>
        <DataProvider>
          <TestComponent />
        </DataProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    // Perform multiple operations concurrently
    await act(async () => {
      screen.getByTestId('add-family').click();
      screen.getByTestId('add-memory').click();
      screen.getByTestId('refresh').click();
    });

    // Verify all operations were handled
    expect(mockApiService.createFamilyMember).toHaveBeenCalled();
    expect(mockApiService.createMemory).toHaveBeenCalled();
    expect(mockApiService.getFamilyMembers).toHaveBeenCalledTimes(2);
  });
});
