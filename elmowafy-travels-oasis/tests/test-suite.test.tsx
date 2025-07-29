/**
 * Comprehensive Frontend Testing Suite for Elmowafiplatform
 * Tests React components, API integration, authentication, and user workflows
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { jest } from '@jest/globals';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Import components to test
import App from '../src/App';
import FamilyDashboard from '../src/pages/FamilyDashboard';
import AuthPage from '../src/pages/AuthPage';
import MemoriesPage from '../src/pages/MemoriesPage';
import TravelPlanningPage from '../src/pages/TravelPlanningPage';
import FamilyTree from '../src/features/FamilyTree/FamilyTree';
import LoginForm from '../src/components/auth/LoginForm';
import RegisterForm from '../src/components/auth/RegisterForm';
import PhotoUpload from '../src/components/PhotoUpload';
import { apiService } from '../src/services/api';

// Mock API service
jest.mock('../src/services/api', () => ({
  apiService: {
    auth: {
      login: jest.fn(),
      register: jest.fn(),
      getCurrentUser: jest.fn(),
      logout: jest.fn(),
    },
    family: {
      getMembers: jest.fn(),
      addMember: jest.fn(),
      updateMember: jest.fn(),
      deleteMember: jest.fn(),
    },
    memory: {
      getMemories: jest.fn(),
      addMemory: jest.fn(),
      updateMemory: jest.fn(),
      deleteMemory: jest.fn(),
      uploadPhoto: jest.fn(),
    },
    travel: {
      getPlans: jest.fn(),
      createPlan: jest.fn(),
      getRecommendations: jest.fn(),
    },
    gaming: {
      createGame: jest.fn(),
      getLeaderboard: jest.fn(),
    },
    cultural: {
      getContent: jest.fn(),
      translateText: jest.fn(),
    },
    health: {
      checkHealth: jest.fn(),
      getSystemStatus: jest.fn(),
    },
  },
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Elmowafiplatform Frontend Test Suite', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    jest.clearAllMocks();
    mockLocalStorage.clear.mockClear();
  });

  // ========== AUTHENTICATION TESTS ==========

  describe('Authentication System', () => {
    test('should render login form correctly', () => {
      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      );

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    test('should handle login form submission', async () => {
      const mockLogin = apiService.auth.login as jest.MockedFunction<typeof apiService.auth.login>;
      mockLogin.mockResolvedValue({
        access_token: 'mock-token',
        token_type: 'bearer',
      });

      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      await act(async () => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
      });
    });

    test('should render register form correctly', () => {
      render(
        <TestWrapper>
          <RegisterForm />
        </TestWrapper>
      );

      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    });

    test('should validate password confirmation in register form', async () => {
      render(
        <TestWrapper>
          <RegisterForm />
        </TestWrapper>
      );

      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'different' } });

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      });
    });

    test('should handle authentication state changes', () => {
      mockLocalStorage.getItem.mockReturnValue('mock-token');

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Should render authenticated content when token exists
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('authToken');
    });
  });

  // ========== DASHBOARD TESTS ==========

  describe('Family Dashboard', () => {
    beforeEach(() => {
      // Mock API responses
      (apiService.family.getMembers as jest.Mock).mockResolvedValue([
        { id: '1', name: 'John Doe', relationship: 'Father' },
        { id: '2', name: 'Jane Doe', relationship: 'Mother' },
      ]);

      (apiService.memory.getMemories as jest.Mock).mockResolvedValue([
        {
          id: '1',
          title: 'Family Trip',
          date: '2024-01-15',
          location: 'Beach',
          familyMembers: ['1', '2'],
        },
      ]);

      (apiService.travel.getPlans as jest.Mock).mockResolvedValue([
        {
          id: '1',
          destination: 'Paris',
          startDate: '2024-12-01',
          endDate: '2024-12-07',
        },
      ]);
    });

    test('should render dashboard with family statistics', async () => {
      render(
        <TestWrapper>
          <FamilyDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/family dashboard/i)).toBeInTheDocument();
        expect(screen.getByText(/family members/i)).toBeInTheDocument();
        expect(screen.getByText(/memories/i)).toBeInTheDocument();
        expect(screen.getByText(/travel plans/i)).toBeInTheDocument();
      });
    });

    test('should display family members correctly', async () => {
      render(
        <TestWrapper>
          <FamilyDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Doe')).toBeInTheDocument();
      });
    });

    test('should handle tab navigation', async () => {
      render(
        <TestWrapper>
          <FamilyDashboard />
        </TestWrapper>
      );

      const memoriesTab = screen.getByRole('tab', { name: /memories/i });
      
      await act(async () => {
        fireEvent.click(memoriesTab);
      });

      expect(memoriesTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  // ========== MEMORY MANAGEMENT TESTS ==========

  describe('Memory Management', () => {
    beforeEach(() => {
      (apiService.memory.getMemories as jest.Mock).mockResolvedValue([
        {
          id: '1',
          title: 'Beach Day',
          description: 'Fun day at the beach',
          date: '2024-01-15',
          location: 'Miami Beach',
          imageUrl: '/images/beach.jpg',
          familyMembers: ['1', '2'],
          tags: ['beach', 'family', 'fun'],
        },
        {
          id: '2',
          title: 'Birthday Party',
          description: "John's birthday celebration",
          date: '2024-02-10',
          location: 'Home',
          familyMembers: ['1'],
          tags: ['birthday', 'celebration'],
        },
      ]);
    });

    test('should render memories page with memory grid', async () => {
      render(
        <TestWrapper>
          <MemoriesPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/memories/i)).toBeInTheDocument();
        expect(screen.getByText('Beach Day')).toBeInTheDocument();
        expect(screen.getByText('Birthday Party')).toBeInTheDocument();
      });
    });

    test('should filter memories by search term', async () => {
      render(
        <TestWrapper>
          <MemoriesPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Beach Day')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search memories/i);
      
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'beach' } });
      });

      await waitFor(() => {
        expect(screen.getByText('Beach Day')).toBeInTheDocument();
        expect(screen.queryByText('Birthday Party')).not.toBeInTheDocument();
      });
    });

    test('should switch between grid and list views', async () => {
      render(
        <TestWrapper>
          <MemoriesPage />
        </TestWrapper>
      );

      const listViewButton = screen.getByRole('button', { name: /list view/i });
      
      await act(async () => {
        fireEvent.click(listViewButton);
      });

      // Should switch to list view (specific implementation depends on component)
      expect(listViewButton).toHaveClass('bg-gray-100'); // or appropriate active class
    });
  });

  // ========== PHOTO UPLOAD TESTS ==========

  describe('Photo Upload Component', () => {
    test('should render upload area', () => {
      render(
        <TestWrapper>
          <PhotoUpload />
        </TestWrapper>
      );

      expect(screen.getByText(/drag & drop/i)).toBeInTheDocument();
      expect(screen.getByText(/click to upload/i)).toBeInTheDocument();
    });

    test('should handle file selection', async () => {
      const mockUpload = apiService.memory.uploadPhoto as jest.Mock;
      mockUpload.mockResolvedValue({ imageUrl: '/uploads/test.jpg' });

      render(
        <TestWrapper>
          <PhotoUpload />
        </TestWrapper>
      );

      const fileInput = screen.getByLabelText(/upload file/i);
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      expect(screen.getByText('test.jpg')).toBeInTheDocument();
    });

    test('should validate file types', async () => {
      render(
        <TestWrapper>
          <PhotoUpload />
        </TestWrapper>
      );

      const fileInput = screen.getByLabelText(/upload file/i);
      const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [invalidFile] } });
      });

      await waitFor(() => {
        expect(screen.getByText(/invalid file type/i)).toBeInTheDocument();
      });
    });
  });

  // ========== TRAVEL PLANNING TESTS ==========

  describe('Travel Planning', () => {
    beforeEach(() => {
      (apiService.travel.getPlans as jest.Mock).mockResolvedValue([
        {
          id: '1',
          destination: 'Tokyo',
          startDate: '2024-12-01',
          endDate: '2024-12-10',
          description: 'Cherry blossom season',
          participants: ['1', '2'],
        },
      ]);

      (apiService.travel.getRecommendations as jest.Mock).mockResolvedValue({
        destination_analysis: { family_friendly_score: 90 },
        family_activities: [
          { name: 'Temple Visit', duration: '2 hours' },
          { name: 'Food Tour', duration: '3 hours' },
        ],
      });
    });

    test('should render travel planning page', async () => {
      render(
        <TestWrapper>
          <TravelPlanningPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/travel planning/i)).toBeInTheDocument();
        expect(screen.getByText('Tokyo')).toBeInTheDocument();
      });
    });

    test('should create new travel plan', async () => {
      const mockCreatePlan = apiService.travel.createPlan as jest.Mock;
      mockCreatePlan.mockResolvedValue({
        id: '2',
        destination: 'London',
        startDate: '2024-11-01',
        endDate: '2024-11-07',
      });

      render(
        <TestWrapper>
          <TravelPlanningPage />
        </TestWrapper>
      );

      const addButton = screen.getByRole('button', { name: /add travel plan/i });
      
      await act(async () => {
        fireEvent.click(addButton);
      });

      // Fill form and submit (specific implementation depends on component)
      const destinationInput = screen.getByLabelText(/destination/i);
      
      await act(async () => {
        fireEvent.change(destinationInput, { target: { value: 'London' } });
      });

      const submitButton = screen.getByRole('button', { name: /create plan/i });
      
      await act(async () => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(mockCreatePlan).toHaveBeenCalled();
      });
    });
  });

  // ========== FAMILY TREE TESTS ==========

  describe('Family Tree Component', () => {
    const mockFamilyData = [
      {
        id: '1',
        name: 'John Doe',
        relationship: 'Father',
        generation: 1,
        parents: [],
        children: ['3'],
      },
      {
        id: '2',
        name: 'Jane Doe',
        relationship: 'Mother',
        generation: 1,
        parents: [],
        children: ['3'],
      },
      {
        id: '3',
        name: 'Jimmy Doe',
        relationship: 'Son',
        generation: 2,
        parents: ['1', '2'],
        children: [],
      },
    ];

    test('should render family tree with members', () => {
      render(
        <TestWrapper>
          <FamilyTree familyData={mockFamilyData} />
        </TestWrapper>
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
      expect(screen.getByText('Jimmy Doe')).toBeInTheDocument();
    });

    test('should handle member selection', async () => {
      render(
        <TestWrapper>
          <FamilyTree familyData={mockFamilyData} />
        </TestWrapper>
      );

      const memberNode = screen.getByText('John Doe');
      
      await act(async () => {
        fireEvent.click(memberNode);
      });

      // Should show member details panel
      expect(screen.getByText(/member details/i)).toBeInTheDocument();
    });

    test('should support tree navigation and zoom', () => {
      render(
        <TestWrapper>
          <FamilyTree familyData={mockFamilyData} />
        </TestWrapper>
      );

      const zoomInButton = screen.getByRole('button', { name: /zoom in/i });
      const zoomOutButton = screen.getByRole('button', { name: /zoom out/i });

      expect(zoomInButton).toBeInTheDocument();
      expect(zoomOutButton).toBeInTheDocument();
    });
  });

  // ========== ERROR HANDLING TESTS ==========

  describe('Error Handling', () => {
    test('should handle API errors gracefully', async () => {
      (apiService.family.getMembers as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      render(
        <TestWrapper>
          <FamilyDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/error loading/i)).toBeInTheDocument();
      });
    });

    test('should show loading states', () => {
      (apiService.family.getMembers as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(
        <TestWrapper>
          <FamilyDashboard />
        </TestWrapper>
      );

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    test('should handle authentication errors', async () => {
      (apiService.auth.login as jest.Mock).mockRejectedValue(
        new Error('Invalid credentials')
      );

      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      );

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      await act(async () => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });
    });
  });

  // ========== RESPONSIVE DESIGN TESTS ==========

  describe('Responsive Design', () => {
    test('should adapt to mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(
        <TestWrapper>
          <FamilyDashboard />
        </TestWrapper>
      );

      // Should render mobile navigation
      expect(screen.getByRole('button', { name: /menu/i })).toBeInTheDocument();
    });

    test('should adapt to tablet viewport', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      render(
        <TestWrapper>
          <FamilyDashboard />
        </TestWrapper>
      );

      // Should render appropriate layout for tablet
      expect(screen.getByText(/family dashboard/i)).toBeInTheDocument();
    });
  });

  // ========== ACCESSIBILITY TESTS ==========

  describe('Accessibility', () => {
    test('should have proper ARIA labels', () => {
      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      expect(emailInput).toHaveAttribute('aria-describedby');
      expect(passwordInput).toHaveAttribute('aria-describedby');
    });

    test('should support keyboard navigation', () => {
      render(
        <TestWrapper>
          <FamilyDashboard />
        </TestWrapper>
      );

      const firstFocusableElement = screen.getByRole('button', { name: /add memory/i });
      
      firstFocusableElement.focus();
      expect(firstFocusableElement).toHaveFocus();

      // Test tab navigation
      fireEvent.keyDown(firstFocusableElement, { key: 'Tab' });
      // Next focusable element should be focused
    });

    test('should have proper heading hierarchy', () => {
      render(
        <TestWrapper>
          <FamilyDashboard />
        </TestWrapper>
      );

      const mainHeading = screen.getByRole('heading', { level: 1 });
      expect(mainHeading).toBeInTheDocument();
    });
  });

  // ========== INTEGRATION TESTS ==========

  describe('End-to-End Workflows', () => {
    test('should complete memory creation workflow', async () => {
      const mockAddMemory = apiService.memory.addMemory as jest.Mock;
      const mockUploadPhoto = apiService.memory.uploadPhoto as jest.Mock;

      mockAddMemory.mockResolvedValue({
        id: '123',
        title: 'Test Memory',
        date: '2024-01-15',
      });

      mockUploadPhoto.mockResolvedValue({
        imageUrl: '/uploads/test.jpg',
      });

      render(
        <TestWrapper>
          <MemoriesPage />
        </TestWrapper>
      );

      // Click add memory button
      const addButton = screen.getByRole('button', { name: /add memory/i });
      
      await act(async () => {
        fireEvent.click(addButton);
      });

      // Fill memory form
      const titleInput = screen.getByLabelText(/title/i);
      
      await act(async () => {
        fireEvent.change(titleInput, { target: { value: 'Test Memory' } });
      });

      // Submit form
      const submitButton = screen.getByRole('button', { name: /save memory/i });
      
      await act(async () => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(mockAddMemory).toHaveBeenCalledWith(
          expect.objectContaining({ title: 'Test Memory' })
        );
      });
    });

    test('should handle complete authentication flow', async () => {
      const mockLogin = apiService.auth.login as jest.Mock;
      const mockGetCurrentUser = apiService.auth.getCurrentUser as jest.Mock;

      mockLogin.mockResolvedValue({
        access_token: 'mock-token',
        token_type: 'bearer',
      });

      mockGetCurrentUser.mockResolvedValue({
        email: 'test@example.com',
        username: 'testuser',
      });

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Should start at auth page when not logged in
      expect(screen.getByText(/sign in/i)).toBeInTheDocument();

      // Login
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const loginButton = screen.getByRole('button', { name: /sign in/i });

      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(loginButton);
      });

      // Should redirect to dashboard after successful login
      await waitFor(() => {
        expect(screen.getByText(/family dashboard/i)).toBeInTheDocument();
      });
    });
  });
});

// Test utilities
export const createMockApiResponse = <T,>(data: T, delay = 0): Promise<T> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(data), delay);
  });
};

export const createMockApiError = (message: string, delay = 0): Promise<never> => {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), delay);
  });
};

// Performance test helpers
export const measureComponentRenderTime = async (
  component: React.ReactElement
): Promise<number> => {
  const start = performance.now();
  
  render(
    <TestWrapper>
      {component}
    </TestWrapper>
  );
  
  await waitFor(() => {
    // Wait for component to be fully rendered
  });
  
  return performance.now() - start;
};

// Custom matchers for testing
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
}); 