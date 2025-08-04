// Error codes for the AI service
export const ERROR_CODES = {
  // General errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  API_ERROR: 'API_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  RATE_LIMIT: 'RATE_LIMIT',
  INVALID_INPUT: 'INVALID_INPUT',
  NOT_FOUND: 'NOT_FOUND',
  UNKNOWN: 'UNKNOWN',
} as const;

type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

interface AIErrorOptions {
  code: ErrorCode;
  message: string;
  details?: any;
  originalError?: Error;
}

/**
 * Custom error class for AI service errors
 */
export class AIError extends Error {
  public code: ErrorCode;
  public details?: any;
  public originalError?: Error;

  constructor({ code, message, details, originalError }: AIErrorOptions) {
    super(message);
    this.name = 'AIError';
    this.code = code;
    this.details = details;
    this.originalError = originalError;

    // Maintain proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AIError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      stack: this.stack,
      originalError: this.originalError?.message,
    };
  }
}

/**
 * Handle AI errors and convert them to AIError instances
 */
export function handleAIError(error: unknown, options: { code?: ErrorCode } = {}): AIError {
  // If it's already an AIError, return it as is
  if (error instanceof AIError) {
    return error;
  }

  // Handle standard Error instances
  if (error instanceof Error) {
    // Check for network errors
    if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
      return new AIError({
        code: ERROR_CODES.NETWORK_ERROR,
        message: 'Network error occurred. Please check your internet connection.',
        originalError: error,
      });
    }

    // Handle timeout errors
    if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
      return new AIError({
        code: ERROR_CODES.API_ERROR,
        message: 'Request timed out. Please try again.',
        originalError: error,
      });
    }

    // Handle authentication errors (401/403)
    if (
      error.message.includes('401') ||
      error.message.includes('403') ||
      error.message.toLowerCase().includes('unauthorized') ||
      error.message.toLowerCase().includes('forbidden')
    ) {
      return new AIError({
        code: ERROR_CODES.AUTH_ERROR,
        message: 'Authentication failed. Please log in again.',
        originalError: error,
      });
    }

    // Handle rate limiting (429)
    if (error.message.includes('429') || error.message.toLowerCase().includes('rate limit')) {
      return new AIError({
        code: ERROR_CODES.RATE_LIMIT,
        message: 'Rate limit exceeded. Please wait before trying again.',
        originalError: error,
      });
    }

    // Handle 404 errors
    if (error.message.includes('404') || error.message.toLowerCase().includes('not found')) {
      return new AIError({
        code: ERROR_CODES.NOT_FOUND,
        message: 'The requested resource was not found.',
        originalError: error,
      });
    }

    // Handle invalid input (400)
    if (error.message.includes('400') || error.message.toLowerCase().includes('invalid')) {
      return new AIError({
        code: ERROR_CODES.INVALID_INPUT,
        message: 'Invalid input. Please check your request and try again.',
        originalError: error,
      });
    }

    // Default error handling with provided code or fallback to UNKNOWN
    return new AIError({
      code: options.code || ERROR_CODES.UNKNOWN,
      message: error.message || 'An unknown error occurred',
      originalError: error,
    });
  }

  // Handle non-Error objects
  return new AIError({
    code: options.code || ERROR_CODES.UNKNOWN,
    message: typeof error === 'string' ? error : 'An unknown error occurred',
    details: error,
  });
}
  API_RATE_LIMIT: 'API_1002',
  API_AUTH: 'API_1003',
  API_INVALID_RESPONSE: 'API_1004',
  
  // Validation Errors (2000-2999)
  INVALID_INPUT: 'VAL_2000',
  MISSING_REQUIRED_FIELD: 'VAL_2001',
  INVALID_JSON: 'VAL_2002',
  
  // AI Service Errors (3000-3999)
  MODEL_OVERLOADED: 'AI_3000',
  CONTEXT_TOO_LARGE: 'AI_3001',
  INVALID_MODEL: 'AI_3002',
  
  // User/Account Errors (4000-4999)
  UNAUTHORIZED: 'AUTH_4000',
  PERMISSION_DENIED: 'AUTH_4001',
  QUOTA_EXCEEDED: 'AUTH_4002',
  
  // System/Server Errors (5000-5999)
  INTERNAL_SERVER_ERROR: 'SYS_5000',
  SERVICE_UNAVAILABLE: 'SYS_5001',
  MAINTENANCE_MODE: 'SYS_5002',
  
  // Network Errors (6000-6999)
  NETWORK_ERROR: 'NET_6000',
  OFFLINE: 'NET_6001',
  
  // Feature-specific Errors (7000-7999)
  MEMORY_LIMIT_EXCEEDED: 'FEAT_7000',
  CONTENT_FILTERED: 'FEAT_7001',
} as const;

type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

interface ErrorMessage {
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  retryable?: boolean;
  showToUser?: boolean;
  logLevel?: 'error' | 'warn' | 'info';
}

const ERROR_MESSAGES: Record<ErrorCode, Omit<ErrorMessage, 'action'>> = {
  // API Errors
  [ERROR_CODES.API_CONNECTION]: {
    title: 'Connection Error',
    description: 'Unable to connect to the AI service. Please check your internet connection and try again.',
    retryable: true,
    logLevel: 'error',
  },
  [ERROR_CODES.API_TIMEOUT]: {
    title: 'Request Timeout',
    description: 'The AI service is taking too long to respond. Please try again in a moment.',
    retryable: true,
    logLevel: 'warn',
  },
  [ERROR_CODES.API_RATE_LIMIT]: {
    title: 'Rate Limit Exceeded',
    description: 'You have made too many requests. Please wait a moment before trying again.',
    retryable: true,
    logLevel: 'warn',
  },
  [ERROR_CODES.API_AUTH]: {
    title: 'Authentication Error',
    description: 'There was an issue authenticating with the AI service. Please sign in again.',
    retryable: false,
    logLevel: 'error',
  },
  [ERROR_CODES.API_INVALID_RESPONSE]: {
    title: 'Invalid Response',
    description: 'The AI service returned an unexpected response. Please try again.',
    retryable: true,
    logLevel: 'error',
  },
  
  // Validation Errors
  [ERROR_CODES.INVALID_INPUT]: {
    title: 'Invalid Input',
    description: 'The provided input is not valid. Please check and try again.',
    retryable: false,
    logLevel: 'warn',
  },
  [ERROR_CODES.MISSING_REQUIRED_FIELD]: {
    title: 'Missing Information',
    description: 'Please fill in all required fields and try again.',
    retryable: false,
    logLevel: 'warn',
  },
  [ERROR_CODES.INVALID_JSON]: {
    title: 'Invalid Data',
    description: 'The data format is invalid. Please try again or contact support.',
    retryable: false,
    logLevel: 'error',
  },
  
  // AI Service Errors
  [ERROR_CODES.MODEL_OVERLOADED]: {
    title: 'Service Busy',
    description: 'The AI service is currently experiencing high demand. Please try again in a moment.',
    retryable: true,
    logLevel: 'warn',
  },
  [ERROR_CODES.CONTEXT_TOO_LARGE]: {
    title: 'Message Too Long',
    description: 'Your message is too long. Please try a shorter message or break it into smaller parts.',
    retryable: false,
    logLevel: 'warn',
  },
  [ERROR_CODES.INVALID_MODEL]: {
    title: 'Configuration Error',
    description: 'The selected AI model is not available. Please try again later or contact support.',
    retryable: false,
    logLevel: 'error',
  },
  
  // User/Account Errors
  [ERROR_CODES.UNAUTHORIZED]: {
    title: 'Not Signed In',
    description: 'You need to be signed in to use this feature.',
    retryable: false,
    logLevel: 'warn',
  },
  [ERROR_CODES.PERMISSION_DENIED]: {
    title: 'Permission Denied',
    description: 'You do not have permission to perform this action.',
    retryable: false,
    logLevel: 'warn',
  },
  [ERROR_CODES.QUOTA_EXCEEDED]: {
    title: 'Quota Exceeded',
    description: 'You have reached your usage limit. Please upgrade your plan to continue.',
    retryable: false,
    logLevel: 'warn',
  },
  
  // System/Server Errors
  [ERROR_CODES.INTERNAL_SERVER_ERROR]: {
    title: 'Something Went Wrong',
    description: 'An unexpected error occurred. Our team has been notified. Please try again later.',
    retryable: true,
    logLevel: 'error',
  },
  [ERROR_CODES.SERVICE_UNAVAILABLE]: {
    title: 'Service Unavailable',
    description: 'The AI service is currently unavailable. Please try again later.',
    retryable: true,
    logLevel: 'error',
  },
  [ERROR_CODES.MAINTENANCE_MODE]: {
    title: 'Maintenance in Progress',
    description: 'The AI service is currently undergoing maintenance. Please check back soon.',
    retryable: true,
    logLevel: 'info',
  },
  
  // Network Errors
  [ERROR_CODES.NETWORK_ERROR]: {
    title: 'Network Error',
    description: 'Unable to connect to the server. Please check your internet connection and try again.',
    retryable: true,
    logLevel: 'error',
  },
  [ERROR_CODES.OFFLINE]: {
    title: 'You\'re Offline',
    description: 'Please check your internet connection and try again.',
    retryable: true,
    logLevel: 'warn',
  },
  
  // Feature-specific Errors
  [ERROR_CODES.MEMORY_LIMIT_EXCEEDED]: {
    title: 'Memory Limit Reached',
    description: 'The conversation is too long. Starting a new conversation will provide better performance.',
    retryable: false,
    logLevel: 'info',
  },
  [ERROR_CODES.CONTENT_FILTERED]: {
    title: 'Content Filtered',
    description: 'Your message was flagged by our content filters. Please revise and try again.',
    retryable: false,
    logLevel: 'warn',
  },
};

/**
 * Handle AI errors and show user-friendly messages
 */
interface HandleAIErrorOptions {
  showToast?: boolean;
  defaultMessage?: string;
  onRetry?: () => void;
  isDev?: boolean;
}

export function handleAIError(
  error: unknown,
  options: HandleAIErrorOptions = {}
): AIError {
  const { showToast = true, onRetry, isDev: isDevEnv = isDev } = options;
  
  // Convert to AIError if it's not already one
  const aiError = error instanceof AIError 
    ? error 
    : convertToAIError(error);
  
  // Show toast if enabled and in browser environment
  if (showToast && typeof window !== 'undefined') {
    toast({
      title: 'Error',
      description: aiError.toUserFriendlyMessage(),
      variant: 'destructive',
      action: aiError.retryable && onRetry ? {
        label: 'Retry',
        onClick: onRetry,
      } : undefined,
    });
  }

  // Log error in development
  if (isDevEnv) {
    console.error('AI Error:', {
      code: aiError.code,
      message: aiError.message,
      details: aiError.details,
      stack: aiError.stack,
      originalError: aiError.originalError,
    });
  }

  return aiError;
}

/**
 * Convert any error to AIError
 */
function convertToAIError(error: any): AIError {
  // Already an AIError
  if (error instanceof AIError) {
    return error;
  }
  
  // Handle Axios errors (used by openai package)
  if (error.isAxiosError) {
    const status = error.response?.status;
    const data = error.response?.data?.error || {};
    
    switch (status) {
      case 400:
        return new AIError(
          ErrorCode.INVALID_REQUEST,
          data.message || 'Invalid request',
          { ...data, status },
          true,
          false,
          error
        );
        
      case 401:
        return new AIError(
          ErrorCode.UNAUTHORIZED,
          'Authentication required',
          { ...data, status },
          true,
          false,
          error
        );
        
      case 429:
        return new AIError(
          ErrorCode.RATE_LIMIT_EXCEEDED,
          'Rate limit exceeded',
          { ...data, status },
          true,
          true,
          error
        );
        
      case 500:
      case 502:
      case 503:
      case 504:
        return new AIError(
          ErrorCode.SERVICE_UNAVAILABLE,
          'Service unavailable',
          { ...data, status },
          true,
          true,
          error
        );
    }
  }
  
  // Handle network errors
  if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
    return new AIError(
      ErrorCode.NETWORK_ERROR,
      'Could not connect to the AI service',
      { code: error.code },
      true,
      true,
      error
    );
  }
  
  // Handle timeouts
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return new AIError(
      ErrorCode.TIMEOUT,
      'Request timed out',
      { code: error.code },
      true,
      true,
      error
    );
  }
  
  // Default to unknown error
  return new AIError(
    ErrorCode.UNKNOWN_ERROR,
    error.message || 'An unknown error occurred',
    { ...error },
    false,
    false,
    error instanceof Error ? error : new Error(String(error))
  );
}

/**
 * Create consistent error responses for API routes
 */
interface ErrorResponse {
  success: boolean;
  error: {
    code: string;
    message: string;
    details?: unknown;
    stack?: string;
    originalError?: unknown;
  };
  status: number;
}

export function createErrorResponse(error: unknown, status: number = 500): ErrorResponse {
  const aiError = error instanceof AIError ? error : convertToAIError(error);
  const statusCode = getHttpStatusCode(aiError.code) || status;
  
  const response: ErrorResponse = {
    success: false,
    error: {
      code: aiError.code,
      message: aiError.toUserFriendlyMessage(),
    },
    status: statusCode,
  };

  // Add debug info in development
  if (isDev) {
    response.error.details = aiError.details;
    response.error.stack = aiError.stack;
    
    if (aiError.originalError) {
      response.error.originalError = aiError.originalError instanceof Error
        ? {
            name: aiError.originalError.name,
            message: aiError.originalError.message,
            stack: aiError.originalError.stack,
          }
        : aiError.originalError;
    }
  }
  
  return response;
}

/**
 * Map error codes to HTTP status codes
 */
function getHttpStatusCode(code: string): number {
  // Map legacy codes
  const legacyCodeMap: Record<string, number> = {
    [ERROR_CODES.UNAUTHORIZED]: 401,
    [ERROR_CODES.PERMISSION_DENIED]: 403,
    [ERROR_CODES.API_RATE_LIMIT]: 429,
    [ERROR_CODES.QUOTA_EXCEEDED]: 429,
    [ERROR_CODES.SERVICE_UNAVAILABLE]: 503,
    [ERROR_CODES.INVALID_INPUT]: 400,
    [ERROR_CODES.INVALID_JSON]: 400,
    [ERROR_CODES.MISSING_REQUIRED_FIELD]: 400,
    [ERROR_CODES.API_AUTH]: 401,
    [ERROR_CODES.API_TIMEOUT]: 504,
    [ERROR_CODES.API_CONNECTION]: 502,
    [ERROR_CODES.NETWORK_ERROR]: 502,
    [ERROR_CODES.OFFLINE]: 0, // Client-side only
  };
  
  // Map standard error codes
  const standardCodeMap: Record<ErrorCode, number> = {
    [ErrorCode.UNKNOWN_ERROR]: 500,
    [ErrorCode.INVALID_REQUEST]: 400,
    [ErrorCode.UNAUTHORIZED]: 401,
    [ErrorCode.RATE_LIMIT_EXCEEDED]: 429,
    [ErrorCode.SERVICE_UNAVAILABLE]: 503,
    [ErrorCode.TIMEOUT]: 504,
    [ErrorCode.NETWORK_ERROR]: 502,
    [ErrorCode.INVALID_API_KEY]: 401,
    [ErrorCode.QUOTA_EXCEEDED]: 429,
    [ErrorCode.MODEL_NOT_FOUND]: 400,
    [ErrorCode.CONTENT_FILTERED]: 400,
    [ErrorCode.INVALID_MESSAGE]: 400,
    [ErrorCode.CONTEXT_TOO_LARGE]: 400,
    [ErrorCode.OPERATION_NOT_SUPPORTED]: 400,
  };
  
  return standardCodeMap[code as ErrorCode] || legacyCodeMap[code] || 500;
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (!error) return false;
  
  // Check if it's an AIError with retryable flag
  if (error instanceof AIError) {
    return error.retryable;
  }
  
  // Network errors are usually retryable
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }
  
  // Check error codes that are typically retryable
  const retryableCodes = [
    // Legacy codes
    ERROR_CODES.API_RATE_LIMIT,
    ERROR_CODES.API_TIMEOUT,
    ERROR_CODES.API_CONNECTION,
    ERROR_CODES.SERVICE_UNAVAILABLE,
    ERROR_CODES.NETWORK_ERROR,
    ERROR_CODES.OFFLINE,
    
    // Standard codes
    ErrorCode.RATE_LIMIT_EXCEEDED,
    ErrorCode.SERVICE_UNAVAILABLE,
    ErrorCode.TIMEOUT,
    ErrorCode.NETWORK_ERROR,
  ] as string[];
  
  // Type guard to check if error has a code property
  const hasCode = (err: unknown): err is { code: string } => {
    return typeof err === 'object' && err !== null && 'code' in err;
  };
  
  return hasCode(error) && retryableCodes.includes(error.code);
}

/**
 * Get a user-friendly error message
 */
export function getUserFriendlyError(error: unknown): string {
  if (!error) return 'An unknown error occurred';
  
  if (error instanceof AIError) {
    return error.toUserFriendlyMessage();
  }
  
  // Handle HTTP errors
  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, any>;
    
    if (err.response?.data?.message) {
      return String(err.response.data.message);
    }
    
    // Handle network errors
    if (err.message?.includes?.('Network Error')) {
      return 'Unable to connect to the server. Please check your internet connection.';
    }
    
    // Handle timeouts
    if (err.code === 'ECONNABORTED' || err.message?.includes?.('timeout')) {
      return 'The request timed out. Please try again.';
    }
    
    // Fallback to error message if available
    if (err.message) {
      return String(err.message);
    }
  }
  
  // Fallback for string errors
  if (typeof error === 'string') {
    return error;
  }
  
  // Default fallback
  return 'An unexpected error occurred';
}
