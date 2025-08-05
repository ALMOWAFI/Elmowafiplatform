import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { aiService } from '../aiService';

// Mock the api module
vi.mock('../api', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

// Import the mocked apiClient after setting up the mock
import { apiClient } from '../api';

// Type assertion for the mocked apiClient
const mockApi = apiClient as jest.Mocked<typeof apiClient>;

describe('AIService', () => {
  // Mock response data
  const mockApiResponse = {
    data: {
      success: true,
      data: {
        suggestions: [
          {
            activity_name: 'Visit Central Park',
            description: 'Enjoy a relaxing day in Central Park with various activities for all ages.',
            suitability_score: 0.9,
            estimated_cost: 50,
            duration: '3-4 hours'
          }
        ]
      }
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('VITE_AI_SERVICE_URL', 'http://localhost:8001/api/v1/ai');
    mockApi.post.mockResolvedValue(mockApiResponse);
  });
  
  afterEach(() => {
    vi.resetAllMocks();
    delete process.env.VITE_AI_SERVICE_URL;
  });
  
  describe('getFamilyActivitySuggestions', () => {
    const mockContext = {
      location: 'New York',
      weather: 'sunny',
      familyMembers: ['child', 'adult'],
      time: 'afternoon',
      budget: 200
    };
    
    const mockApiResponse = {
      data: {
        success: true,
        data: {
          suggestions: [
            {
              activity_name: 'Visit Central Park',
              description: 'Enjoy a relaxing day in Central Park with various activities for all ages.',
              suitability_score: 0.9,
              estimated_cost: 50,
              duration: '3-4 hours'
            },
            {
              activity_name: 'Museum of Natural History',
              description: 'Explore fascinating exhibits suitable for both children and adults.',
              suitability_score: 0.85,
              estimated_cost: 40,
              duration: '2-3 hours'
            }
          ]
        }
      }
    };
    
    // Expected return value from the method
    const expectedSuggestions = [
      {
        activity: 'Visit Central Park',
        description: 'Enjoy a relaxing day in Central Park with various activities for all ages.',
        suitability: 0.9,
        estimated_cost: 50,
        duration: '3-4 hours'
      },
      {
        activity: 'Museum of Natural History',
        description: 'Explore fascinating exhibits suitable for both children and adults.',
        suitability: 0.85,
        estimated_cost: 40,
        duration: '2-3 hours'
      }
    ];
    
    // Reset mocks before each test
    beforeEach(() => {
      vi.clearAllMocks();
      // Set up default mock implementation
      mockApi.post.mockResolvedValue(mockApiResponse);
    });
    
    it('should call the correct API endpoint with context parameters', async () => {
      // Arrange
      mockApi.post.mockResolvedValueOnce(mockApiResponse);
      
      // Act
      const result = await aiService.getFamilyActivitySuggestions(mockContext);
      
      // Assert
      expect(mockApi.post).toHaveBeenCalledWith(
        '/ai/family-activity-suggestions',
        {
          location: 'New York',
          weather: 'sunny',
          family_members: ['child', 'adult'],
          time_of_day: 'afternoon',
          budget: 200,
          metadata: {
            timestamp: expect.any(String),
            source: 'web-client',
            version: '1.0.0'
          }
        }
      );
      
      expect(result).toEqual(expectedSuggestions);
    });
    
    it('should handle API errors gracefully', async () => {
      // Arrange
      const errorResponse = new Error('API Error');
      mockApi.post.mockRejectedValueOnce(errorResponse);
      
      // Act & Assert
      await expect(aiService.getFamilyActivitySuggestions(mockContext))
        .rejects
        .toThrow('Failed to get family activity suggestions');
    });
    
    it('should handle network errors', async () => {
      // Arrange
      const networkError = new Error('Network Error');
      mockApi.post.mockRejectedValueOnce(networkError);
      
      // Act & Assert
      await expect(aiService.getFamilyActivitySuggestions(mockContext))
        .rejects
        .toThrow('Failed to get family activity suggestions');
    });
    
    it('should handle missing or partial context', async () => {
      // Arrange
      const partialContext = { location: 'New York' };
      const partialResponse = {
        data: {
          success: true,
          data: {
            suggestions: [
              {
                activity_name: 'Central Park',
                description: 'Visit the famous Central Park',
                suitability_score: 0.8,
                estimated_cost: 0,
                duration: 'flexible'
              }
            ]
          }
        }
      };
      
      mockApi.post.mockResolvedValueOnce(partialResponse);
      
      // Act
      const result = await aiService.getFamilyActivitySuggestions(partialContext);
      
      // Assert
      expect(mockApi.post).toHaveBeenCalledWith(
        '/ai/family-activity-suggestions',
        {
          location: 'New York',
          family_members: [],
          metadata: {
            timestamp: expect.any(String),
            source: 'web-client',
            version: '1.0.0'
          }
        }
      );
      
      expect(result).toEqual([
        {
          activity: 'Central Park',
          description: 'Visit the famous Central Park',
          suitability: 0.8,
          estimated_cost: 0,
          duration: 'flexible'
        }
      ]);
    });
    
    it('should handle API rate limit errors', async () => {
      // Arrange
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).response = {
        status: 429,
        data: {
          error: 'RateLimitExceeded',
          message: 'API rate limit exceeded'
        }
      };
      
      mockApi.post.mockRejectedValueOnce(rateLimitError);
      
      // Act & Assert
      await expect(aiService.getFamilyActivitySuggestions(mockContext))
        .rejects
        .toThrow('Failed to get family activity suggestions');
    });
  });
  
  // Add more test suites for other methods as needed
});
