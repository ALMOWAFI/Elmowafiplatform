import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { api } from '../api';
import { aiService } from '../aiService';
import { AIError } from '@/lib/ai/errorHandling';

// Mock the api module
vi.mock('../api', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

describe('AIService', () => {
  const mockApi = api as jest.Mocked<typeof api>;
  
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    
    // Set up default mock responses
    process.env.VITE_AI_SERVICE_URL = 'http://localhost:8001/api/v1/ai';
  });
  
  afterEach(() => {
    // Clean up environment variables after each test
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
    
    const mockResponse = {
      data: {
        data: {
          suggestions: [
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
          ]
        }
      }
    };
    
    it('should call the correct API endpoint with context parameters', async () => {
      // Arrange
      mockApi.post.mockResolvedValueOnce(mockResponse);
      
      // Act
      const result = await aiService.getFamilyActivitySuggestions(mockContext);
      
      // Assert
      expect(mockApi.post).toHaveBeenCalledWith(
        'http://localhost:8001/api/v1/ai/family-activities',
        {
          location: 'New York',
          weather: 'sunny',
          family_members: ['child', 'adult'],
          time: 'afternoon',
          budget: 200
        }
      );
      
      expect(result).toEqual(mockResponse.data.data.suggestions);
    });
    
    it('should handle API errors gracefully', async () => {
      // Arrange
      const errorResponse = {
        response: {
          status: 500,
          data: {
            error: 'Internal Server Error',
            message: 'Something went wrong'
          }
        }
      };
      
      mockApi.post.mockRejectedValueOnce(errorResponse);
      
      // Act & Assert
      await expect(aiService.getFamilyActivitySuggestions(mockContext))
        .rejects
        .toThrow('Failed to get family activity suggestions');
      
      expect(mockApi.post).toHaveBeenCalledTimes(1);
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
      mockApi.post.mockResolvedValueOnce({
        data: {
          data: {
            suggestions: [
              {
                activity: 'Central Park',
                description: 'Visit the famous Central Park',
                suitability: 0.8,
                estimated_cost: 0,
                duration: 'flexible'
              }
            ]
          }
        }
      });
      
      // Act
      const result = await aiService.getFamilyActivitySuggestions(partialContext);
      
      // Assert
      expect(mockApi.post).toHaveBeenCalledWith(
        'http://localhost:8001/api/v1/ai/family-activities',
        {
          location: 'New York'
        }
      );
      
      expect(result).toBeInstanceOf(Array);
      expect(result[0]).toHaveProperty('activity');
      expect(result[0]).toHaveProperty('description');
    });
    
    it('should throw AIError with proper error code for API errors', async () => {
      // Arrange
      const errorResponse = {
        response: {
          status: 429,
          data: {
            error: 'RateLimitExceeded',
            message: 'API rate limit exceeded'
          }
        }
      };
      
      mockApi.post.mockRejectedValueOnce(errorResponse);
      
      // Act & Assert
      try {
        await aiService.getFamilyActivitySuggestions(mockContext);
        fail('Expected an error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AIError);
        if (error instanceof AIError) {
          expect(error.code).toBe('RATE_LIMIT');
          expect(error.message).toContain('API rate limit exceeded');
        }
      }
    });
  });
  
  // Add more test suites for other methods as needed
});
