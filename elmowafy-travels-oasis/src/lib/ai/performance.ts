import { debounce, throttle } from 'lodash';
import { AIMessage } from '@/hooks/useAIAssistant';

/**
 * Configuration for performance optimizations
 */
interface PerformanceConfig {
  /**
   * Enable/disable message batching
   * @default true
   */
  enableBatching: boolean;
  
  /**
   * Maximum number of messages to batch together
   * @default 5
   */
  maxBatchSize: number;
  
  /**
   * Maximum time (in ms) to wait before sending a batch
   * @default 300
   */
  maxBatchDelay: number;
  
  /**
   * Enable/disable request throttling
   * @default true
   */
  enableThrottling: boolean;
  
  /**
   * Minimum time (in ms) between requests when throttling is enabled
   * @default 1000
   */
  minRequestInterval: number;
  
  /**
   * Maximum number of concurrent requests
   * @default 3
   */
  maxConcurrentRequests: number;
  
  /**
   * Enable/disable message compression
   * @default true
   */
  enableCompression: boolean;
  
  /**
   * Maximum token limit for compressed messages
   * @default 2000
   */
  maxTokenLimit: number;
}

const DEFAULT_CONFIG: PerformanceConfig = {
  enableBatching: true,
  maxBatchSize: 5,
  maxBatchDelay: 300,
  enableThrottling: true,
  minRequestInterval: 1000,
  maxConcurrentRequests: 3,
  enableCompression: true,
  maxTokenLimit: 2000,
};

/**
 * Queue for managing message batching
 */
class MessageQueue {
  private queue: AIMessage[] = [];
  private pendingBatch: AIMessage[] = [];
  private isProcessing = false;
  private concurrentRequests = 0;
  private config: PerformanceConfig;
  private processBatch: (messages: AIMessage[]) => Promise<void>;
  private onBatchComplete?: (messages: AIMessage[]) => void;
  private onError?: (error: Error) => void;

  constructor(
    processBatch: (messages: AIMessage[]) => Promise<void>,
    config: Partial<PerformanceConfig> = {},
    onBatchComplete?: (messages: AIMessage[]) => void,
    onError?: (error: Error) => void
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.processBatch = processBatch;
    this.onBatchComplete = onBatchComplete;
    this.onError = onError;
  }

  /**
   * Add a message to the queue
   */
  public async addMessage(message: AIMessage): Promise<void> {
    this.queue.push(message);
    this.scheduleProcess();
  }

  /**
   * Process messages in the queue
   */
  private scheduleProcess = debounce(async () => {
    if (this.isProcessing || this.queue.length === 0) return;
    
    // Check if we've reached max concurrent requests
    if (this.concurrentRequests >= this.config.maxConcurrentRequests) {
      this.scheduleProcess();
      return;
    }
    
    this.isProcessing = true;
    
    try {
      // Get messages to process
      const batchSize = Math.min(this.config.maxBatchSize, this.queue.length);
      this.pendingBatch = this.queue.splice(0, batchSize);
      
      if (this.pendingBatch.length === 0) {
        this.isProcessing = false;
        return;
      }
      
      this.concurrentRequests++;
      
      // Process the batch
      await this.processBatch(this.pendingBatch);
      
      // Notify completion
      this.onBatchComplete?.(this.pendingBatch);
      
    } catch (error) {
      console.error('Error processing message batch:', error);
      this.onError?.(error instanceof Error ? error : new Error(String(error)));
    } finally {
      this.concurrentRequests--;
      this.isProcessing = false;
      
      // Process next batch if there are more messages
      if (this.queue.length > 0) {
        this.scheduleProcess();
      }
    }
  }, this.config.maxBatchDelay);

  /**
   * Clear the queue
   */
  public clear(): void {
    this.queue = [];
    this.pendingBatch = [];
    this.isProcessing = false;
  }

  /**
   * Get the current queue size
   */
  public getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Check if the queue is processing
   */
  public isQueueProcessing(): boolean {
    return this.isProcessing;
  }
}

/**
 * Compress messages to reduce token usage
 */
function compressMessages(
  messages: AIMessage[],
  maxTokens: number = 2000
): AIMessage[] {
  if (messages.length <= 1) return messages;
  
  // Sort by timestamp to maintain order
  const sorted = [...messages].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  
  // Simple compression: keep system messages and latest user/assistant messages
  const compressed: AIMessage[] = [];
  let tokenCount = 0;
  
  // Add system messages first
  const systemMessages = sorted.filter(m => m.role === 'system');
  compressed.push(...systemMessages);
  
  // Estimate tokens (very rough estimation)
  tokenCount += systemMessages.reduce((sum, m) => sum + (m.content.length / 4), 0);
  
  // Add most recent user/assistant messages until we hit the token limit
  const userMessages = sorted
    .filter(m => m.role !== 'system')
    .reverse();
    
  for (const message of userMessages) {
    const messageTokens = message.content.length / 4; // Rough estimate
    
    if (tokenCount + messageTokens > maxTokens) {
      // Truncate the message if it's too long
      const remainingTokens = maxTokens - tokenCount;
      if (remainingTokens > 50) { // Only add if we have a reasonable amount of tokens left
        compressed.push({
          ...message,
          content: message.content.substring(0, remainingTokens * 4) + '... [truncated]',
          metadata: {
            ...message.metadata,
            truncated: true,
            originalLength: message.content.length,
          },
        });
      }
      break;
    }
    
    compressed.push(message);
    tokenCount += messageTokens;
  }
  
  // Sort back by original order
  return compressed.sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

/**
 * Throttle function to limit the rate of function calls
 */
function createThrottledFunction<T extends (...args: any[]) => any>(
  func: T,
  delay: number,
  options?: { leading?: boolean; trailing?: boolean }
): T & { cancel: () => void; flush: () => void } {
  return throttle(func, delay, {
    leading: options?.leading ?? true,
    trailing: options?.trailing ?? true,
  }) as any;
}

/**
 * Create a debounced function that delays invoking `func` until after `wait`
 * milliseconds have elapsed since the last time the debounced function was invoked.
 */
function createDebouncedFunction<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  options?: { leading?: boolean; trailing?: boolean; maxWait?: number }
): T & { cancel: () => void; flush: () => void } {
  return debounce(func, wait, {
    leading: options?.leading,
    trailing: options?.trailing,
    maxWait: options?.maxWait,
  }) as any;
}

export {
  MessageQueue,
  compressMessages,
  createThrottledFunction,
  createDebouncedFunction,
  type PerformanceConfig,
  DEFAULT_CONFIG as defaultPerformanceConfig,
};
