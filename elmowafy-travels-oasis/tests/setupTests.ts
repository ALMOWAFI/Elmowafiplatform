/**
 * Jest Testing Setup for Elmowafiplatform Frontend
 * Configures testing environment and global mocks
 */

import '@testing-library/jest-dom';
import { jest } from '@jest/globals';

// Mock window.matchMedia
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

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock console methods in tests to reduce noise
global.console = {
  ...console,
  // Uncomment to ignore specific log levels
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock File and FileReader for upload tests
global.File = class MockFile {
  constructor(fileParts: any, fileName: string, options: any) {
    return {
      name: fileName,
      size: fileParts[0]?.length || 0,
      type: options?.type || 'text/plain',
      lastModified: Date.now(),
    } as any;
  }
};

global.FileReader = class MockFileReader {
  result: any = null;
  readAsDataURL = jest.fn().mockImplementation(function(this: any) {
    this.result = 'data:image/jpeg;base64,test';
    if (this.onload) this.onload({ target: this });
  });
  readAsText = jest.fn();
  addEventListener = jest.fn();
  removeEventListener = jest.fn();
} as any;

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mocked-url');
global.URL.revokeObjectURL = jest.fn();

// Setup for React Query
import { QueryClient } from '@tanstack/react-query';

export const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: Infinity,
    },
    mutations: {
      retry: false,
    },
  },
  logger: {
    log: console.log,
    warn: console.warn,
    error: () => {}, // Suppress error logs in tests
  },
});

// Common test utilities
export const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

// Replace localStorage in tests
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock router
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
  useLocation: () => ({
    pathname: '/',
    search: '',
    hash: '',
    state: null,
  }),
}));

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  mockLocalStorage.clear.mockClear();
});

// Global test configuration
beforeAll(() => {
  // Set up any global test configuration
});

afterAll(() => {
  // Clean up global test configuration
}); 