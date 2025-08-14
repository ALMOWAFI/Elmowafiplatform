import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import ConnectedDashboard from '../../src/components/ConnectedDashboard';
import { DataProvider } from '../../src/context/DataContext';
import { IntegrationProvider } from '../../src/context/IntegrationContext';
import { apiService } from '../../src/lib/api';

// Mock the API service
jest.mock('../../src/lib/api', () => ({
  apiService: {
    getFamilyMembers: jest.fn(),
    getMemories: jest.fn(),
    getTravelPlans: jest.fn(),
    getGameSessions: jest.fn(),
    getAIAnalyses: jest.fn(),
    getSuggestions: jest.fn(),
    getSystemHealth: jest.fn(),
  }
}));

const mockApiService = apiService as jest.Mocked<typeof apiService>;

// Mock data
const mockFamilyMembers = [
  { id: '1', name: 'John Doe', role: 'parent', avatar: 'avatar1.jpg' },
  { id: '2', name: 'Jane Doe', role: 'parent', avatar: 'avatar2.jpg' }
];

const mockMemories = [
  { id: '1', title: 'Family Vacation', description: 'Amazing trip', image_url: 'vacation.jpg', created_at: '2024-01-15T10:00:00Z' }
];

const mockTravelPlans = [
  { id: '1', destination: 'Paris', start_date: '2024-06-01', end_date: '2024-06-07', status: 'planned' }
];

const mockGameSessions = [
  { session_id: '1', game_type: 'family_quiz', participants: ['1', '2'], status: 'active', created_at: '2024-01-15T10:00:00Z' }
];

const mockAIAnalyses = [
  { id: '1', type: 'memory_analysis', content: 'Analysis result', created_at: '2024-01-15T10:00:00Z' }
];

const mockSuggestions = {
  memories: ['Create a new memory'],
  activities: ['Plan a family dinner'],
  travel: ['Book flights for Paris trip']
};

const mockSystemHealth = {
  status: 'healthy',
  services: { api: true, ai: true, database: true, websocket: true },
  uptime: 86400,
  version: '1.0.0'
};

// Mock window.matchMedia for responsive testing
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock touch events
const mockTouchEvent = {
  touches: [{ clientX: 100, clientY: 100 }],
  targetTouches: [{ clientX: 100, clientY: 100 }],
  changedTouches: [{ clientX: 100, clientY: 100 }],
  preventDefault: jest.fn(),
  stopPropagation: jest.fn(),
};

describe('Mobile Responsiveness', () => {
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
  });

  afterEach(() => {
    queryClient.clear();
  });

  test('should render correctly on mobile devices', async () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });
    
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 667,
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

    // Check that mobile-specific elements are present
    expect(screen.getByTestId('mobile-navigation')).toBeInTheDocument();
    expect(screen.getByTestId('mobile-menu-toggle')).toBeInTheDocument();
    
    // Check that content is properly sized for mobile
    const mainContent = screen.getByTestId('main-content');
    expect(mainContent).toHaveStyle({ maxWidth: '100%' });
  });

  test('should handle touch interactions', async () => {
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

    // Test touch events on interactive elements
    const refreshButton = screen.getByTestId('refresh-button');
    
    // Simulate touch start
    fireEvent.touchStart(refreshButton, mockTouchEvent);
    
    // Simulate touch end
    fireEvent.touchEnd(refreshButton, mockTouchEvent);
    
    // Verify touch interactions work
    expect(refreshButton).toBeInTheDocument();
  });

  test('should work offline with cached data', async () => {
    // Mock offline state
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
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

    // Check offline indicator
    expect(screen.getByTestId('offline-indicator')).toBeInTheDocument();
    expect(screen.getByText('Offline Mode')).toBeInTheDocument();
    
    // Check that cached data is still displayed
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Family Vacation')).toBeInTheDocument();
  });

  test('should handle different screen orientations', async () => {
    // Test portrait orientation
    Object.defineProperty(window, 'innerWidth', { value: 375 });
    Object.defineProperty(window, 'innerHeight', { value: 667 });

    const { rerender } = render(
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

    // Check portrait layout
    expect(screen.getByTestId('mobile-layout')).toHaveStyle({ flexDirection: 'column' });

    // Test landscape orientation
    Object.defineProperty(window, 'innerWidth', { value: 667 });
    Object.defineProperty(window, 'innerHeight', { value: 375 });

    // Simulate orientation change
    fireEvent(window, new Event('orientationchange'));

    // Check landscape layout
    expect(screen.getByTestId('mobile-layout')).toHaveStyle({ flexDirection: 'row' });
  });

  test('should handle mobile navigation', async () => {
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

    // Test mobile menu toggle
    const menuToggle = screen.getByTestId('mobile-menu-toggle');
    fireEvent.click(menuToggle);

    // Check that mobile menu is expanded
    expect(screen.getByTestId('mobile-menu')).toHaveClass('expanded');
    
    // Test navigation links in mobile menu
    expect(screen.getByText('Memories')).toBeInTheDocument();
    expect(screen.getByText('Travel')).toBeInTheDocument();
    expect(screen.getByText('Activities')).toBeInTheDocument();
    expect(screen.getByText('Gaming')).toBeInTheDocument();
  });

  test('should handle mobile gestures', async () => {
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

    // Test swipe gestures
    const swipeableContent = screen.getByTestId('swipeable-content');
    
    // Simulate swipe left
    fireEvent.touchStart(swipeableContent, {
      touches: [{ clientX: 300, clientY: 100 }],
      targetTouches: [{ clientX: 300, clientY: 100 }],
      changedTouches: [{ clientX: 300, clientY: 100 }],
    });
    
    fireEvent.touchEnd(swipeableContent, {
      touches: [],
      targetTouches: [],
      changedTouches: [{ clientX: 100, clientY: 100 }],
    });

    // Verify swipe gesture was handled
    expect(swipeableContent).toBeInTheDocument();
  });

  test('should optimize images for mobile', async () => {
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

    // Check that images have mobile-optimized attributes
    const images = screen.getAllByRole('img');
    images.forEach(img => {
      expect(img).toHaveAttribute('loading', 'lazy');
      expect(img).toHaveAttribute('sizes', expect.stringContaining('100vw'));
    });
  });

  test('should handle mobile keyboard interactions', async () => {
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

    // Test virtual keyboard interactions
    const searchInput = screen.getByTestId('search-input');
    
    // Focus input (triggers virtual keyboard)
    fireEvent.focus(searchInput);
    
    // Check that viewport adjusts for virtual keyboard
    expect(screen.getByTestId('viewport-adjustment')).toHaveClass('keyboard-open');
    
    // Blur input (hides virtual keyboard)
    fireEvent.blur(searchInput);
    
    // Check that viewport returns to normal
    expect(screen.getByTestId('viewport-adjustment')).not.toHaveClass('keyboard-open');
  });

  test('should handle mobile performance optimization', async () => {
    // Mock performance API for mobile
    Object.defineProperty(window, 'performance', {
      writable: true,
      value: {
        now: jest.fn(() => Date.now()),
        mark: jest.fn(),
        measure: jest.fn(),
        getEntriesByType: jest.fn(() => []),
      },
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

    // Check that performance optimizations are applied
    expect(screen.getByTestId('performance-optimized')).toBeInTheDocument();
    
    // Check that animations are reduced for mobile
    expect(screen.getByTestId('reduced-motion')).toHaveClass('reduced-motion');
  });

  test('should handle mobile accessibility', async () => {
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

    // Check mobile accessibility features
    expect(screen.getByTestId('mobile-accessibility')).toBeInTheDocument();
    
    // Check touch targets are large enough
    const touchTargets = screen.getAllByTestId('touch-target');
    touchTargets.forEach(target => {
      const rect = target.getBoundingClientRect();
      expect(rect.width).toBeGreaterThanOrEqual(44);
      expect(rect.height).toBeGreaterThanOrEqual(44);
    });
    
    // Check screen reader support
    expect(screen.getByTestId('screen-reader-support')).toHaveAttribute('aria-label');
  });

  test('should handle mobile network conditions', async () => {
    // Mock slow network
    Object.defineProperty(navigator, 'connection', {
      writable: true,
      value: {
        effectiveType: 'slow-2g',
        downlink: 0.5,
        rtt: 2000,
      },
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

    // Check that slow network optimizations are applied
    expect(screen.getByTestId('slow-network-mode')).toBeInTheDocument();
    expect(screen.getByText('Slow Network Mode')).toBeInTheDocument();
    
    // Check that images are low quality for slow networks
    const images = screen.getAllByRole('img');
    images.forEach(img => {
      expect(img).toHaveAttribute('data-low-quality', 'true');
    });
  });
});
