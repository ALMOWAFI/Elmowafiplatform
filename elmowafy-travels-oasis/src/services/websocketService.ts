import { authService } from './api';

// WebSocket Message Types
export enum MessageType {
  // System messages
  CONNECT = "connect",
  DISCONNECT = "disconnect",
  HEARTBEAT = "heartbeat",
  ERROR = "error",
  
  // Family updates
  FAMILY_MEMBER_UPDATE = "family_member_update",
  FAMILY_MEMBER_ONLINE = "family_member_online",
  FAMILY_MEMBER_OFFLINE = "family_member_offline",
  
  // Memory updates
  MEMORY_CREATED = "memory_created",
  MEMORY_UPDATED = "memory_updated",
  MEMORY_LIKED = "memory_liked",
  MEMORY_COMMENT = "memory_comment",
  
  // Budget updates
  BUDGET_UPDATED = "budget_updated",
  EXPENSE_ADDED = "expense_added",
  BUDGET_ALERT = "budget_alert",
  BUDGET_GOAL_REACHED = "budget_goal_reached",
  
  // Travel updates
  TRAVEL_PLAN_UPDATE = "travel_plan_update",
  LOCATION_UPDATE = "location_update",
  TRAVEL_INVITATION = "travel_invitation",
  
  // Gaming updates
  GAME_INVITATION = "game_invitation",
  GAME_UPDATE = "game_update",
  ACHIEVEMENT_UNLOCKED = "achievement_unlocked",
  CHALLENGE_COMPLETED = "challenge_completed",
  
  // Notifications
  NOTIFICATION = "notification",
  SYSTEM_ANNOUNCEMENT = "system_announcement",
  
  // Chat/Communication
  CHAT_MESSAGE = "chat_message",
  TYPING_INDICATOR = "typing_indicator",
  READ_RECEIPT = "read_receipt"
}

export interface WebSocketMessage {
  type: MessageType;
  data: Record<string, any>;
  timestamp?: string;
  sender_id?: string;
  target_users?: string[];
  channel?: string;
}

export interface ConnectionStatus {
  connected: boolean;
  connecting: boolean;
  lastConnected?: Date;
  connectionId?: string;
  reconnectAttempts: number;
  latency?: number;
}

type MessageHandler = (message: WebSocketMessage) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private messageHandlers = new Map<MessageType, Set<MessageHandler>>();
  private globalHandlers = new Set<MessageHandler>();
  private connectionStatus: ConnectionStatus = {
    connected: false,
    connecting: false,
    reconnectAttempts: 0
  };
  
  // Reconnection settings
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000; // Start with 1 second
  private maxReconnectDelay = 30000; // Max 30 seconds
  private heartbeatInterval = 30000; // 30 seconds
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  
  // Performance monitoring
  private lastHeartbeat: Date | null = null;
  private messagesSent = 0;
  private messagesReceived = 0;
  
  // Message queue for offline messages
  private messageQueue: WebSocketMessage[] = [];
  private maxQueueSize = 100;

  constructor(baseUrl: string = 'ws://localhost:8001') {
    this.url = `${baseUrl}/ws`;
  }

  async connect(userId: string, familyId: string): Promise<boolean> {
    if (this.connectionStatus.connecting || this.connectionStatus.connected) {
      return this.connectionStatus.connected;
    }

    this.connectionStatus.connecting = true;

    try {
      // Get auth token
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Build WebSocket URL with auth
      const wsUrl = `${this.url}/${userId}?token=${encodeURIComponent(token)}&family_id=${familyId}`;
      
      return new Promise((resolve, reject) => {
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('WebSocket connected successfully');
          this.connectionStatus = {
            connected: true,
            connecting: false,
            lastConnected: new Date(),
            reconnectAttempts: 0
          };
          
          this.startHeartbeat();
          this.flushMessageQueue();
          this.notifyStatusChange();
          resolve(true);
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket connection closed:', event.code, event.reason);
          this.handleDisconnection();
          
          if (event.code !== 1000) { // Not a normal closure
            this.attemptReconnection(userId, familyId);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.connectionStatus.connecting = false;
          reject(error);
        };

        // Connection timeout
        setTimeout(() => {
          if (this.connectionStatus.connecting) {
            this.connectionStatus.connecting = false;
            this.ws?.close();
            reject(new Error('Connection timeout'));
          }
        }, 10000); // 10 second timeout
      });

    } catch (error) {
      this.connectionStatus.connecting = false;
      console.error('Failed to connect WebSocket:', error);
      return false;
    }
  }

  disconnect(): void {
    this.stopHeartbeat();
    this.clearReconnectTimer();
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this.connectionStatus = {
      connected: false,
      connecting: false,
      reconnectAttempts: 0
    };
    
    this.notifyStatusChange();
  }

  private async attemptReconnection(userId: string, familyId: string): Promise<void> {
    if (this.connectionStatus.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.connectionStatus.reconnectAttempts++;
    
    // Exponential backoff with jitter
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.connectionStatus.reconnectAttempts - 1),
      this.maxReconnectDelay
    ) + Math.random() * 1000;

    console.log(`Attempting to reconnect in ${Math.round(delay)}ms (attempt ${this.connectionStatus.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect(userId, familyId);
      } catch (error) {
        console.error('Reconnection failed:', error);
        this.attemptReconnection(userId, familyId);
      }
    }, delay);
  }

  private handleDisconnection(): void {
    this.stopHeartbeat();
    this.connectionStatus.connected = false;
    this.connectionStatus.connecting = false;
    this.notifyStatusChange();
  }

  private handleMessage(data: string): void {
    try {
      const message: WebSocketMessage = JSON.parse(data);
      this.messagesReceived++;

      // Handle system messages
      if (message.type === MessageType.CONNECT) {
        this.connectionStatus.connectionId = message.data.connection_id;
        console.log('Connection established:', message.data);
      } else if (message.type === MessageType.HEARTBEAT) {
        this.updateLatency();
        return; // Don't propagate heartbeat messages
      }

      // Call specific handlers
      const typeHandlers = this.messageHandlers.get(message.type);
      if (typeHandlers) {
        typeHandlers.forEach(handler => {
          try {
            handler(message);
          } catch (error) {
            console.error('Message handler error:', error);
          }
        });
      }

      // Call global handlers
      this.globalHandlers.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          console.error('Global message handler error:', error);
        }
      });

    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  sendMessage(message: WebSocketMessage): boolean {
    if (!this.connectionStatus.connected || !this.ws) {
      // Queue message for later
      if (this.messageQueue.length < this.maxQueueSize) {
        this.messageQueue.push(message);
      }
      return false;
    }

    try {
      this.ws.send(JSON.stringify(message));
      this.messagesSent++;
      return true;
    } catch (error) {
      console.error('Failed to send WebSocket message:', error);
      return false;
    }
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.connectionStatus.connected) {
      const message = this.messageQueue.shift();
      if (message) {
        this.sendMessage(message);
      }
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.lastHeartbeat = new Date();
      this.sendMessage({
        type: MessageType.HEARTBEAT,
        data: { timestamp: this.lastHeartbeat.toISOString() }
      });
    }, this.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private updateLatency(): void {
    if (this.lastHeartbeat) {
      this.connectionStatus.latency = Date.now() - this.lastHeartbeat.getTime();
    }
  }

  private notifyStatusChange(): void {
    // Emit connection status change for UI updates
    window.dispatchEvent(new CustomEvent('websocket-status-change', {
      detail: this.connectionStatus
    }));
  }

  // Event listeners
  on(messageType: MessageType, handler: MessageHandler): void {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, new Set());
    }
    this.messageHandlers.get(messageType)!.add(handler);
  }

  off(messageType: MessageType, handler: MessageHandler): void {
    const handlers = this.messageHandlers.get(messageType);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  onAny(handler: MessageHandler): void {
    this.globalHandlers.add(handler);
  }

  offAny(handler: MessageHandler): void {
    this.globalHandlers.delete(handler);
  }

  // Convenience methods for common operations
  sendChatMessage(message: string, targetUsers?: string[]): boolean {
    return this.sendMessage({
      type: MessageType.CHAT_MESSAGE,
      data: { message, timestamp: new Date().toISOString() },
      target_users: targetUsers
    });
  }

  sendTypingIndicator(isTyping: boolean, targetUsers?: string[]): boolean {
    return this.sendMessage({
      type: MessageType.TYPING_INDICATOR,
      data: { is_typing: isTyping, timestamp: new Date().toISOString() },
      target_users: targetUsers
    });
  }

  markMessageAsRead(messageId: string, targetUsers?: string[]): boolean {
    return this.sendMessage({
      type: MessageType.READ_RECEIPT,
      data: { message_id: messageId, timestamp: new Date().toISOString() },
      target_users: targetUsers
    });
  }

  // Status getters
  get isConnected(): boolean {
    return this.connectionStatus.connected;
  }

  get isConnecting(): boolean {
    return this.connectionStatus.connecting;
  }

  get status(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  get stats() {
    return {
      messagesSent: this.messagesSent,
      messagesReceived: this.messagesReceived,
      queuedMessages: this.messageQueue.length,
      latency: this.connectionStatus.latency,
      reconnectAttempts: this.connectionStatus.reconnectAttempts
    };
  }
}

// Global WebSocket service instance
export const websocketService = new WebSocketService();

// React hook for WebSocket connection status
export const useWebSocketStatus = () => {
  const [status, setStatus] = React.useState<ConnectionStatus>(websocketService.status);

  React.useEffect(() => {
    const handleStatusChange = (event: CustomEvent) => {
      setStatus(event.detail);
    };

    window.addEventListener('websocket-status-change', handleStatusChange as EventListener);
    
    return () => {
      window.removeEventListener('websocket-status-change', handleStatusChange as EventListener);
    };
  }, []);

  return status;
};

// React hook for WebSocket messages
export const useWebSocketMessage = (messageType: MessageType, handler: MessageHandler) => {
  React.useEffect(() => {
    websocketService.on(messageType, handler);
    
    return () => {
      websocketService.off(messageType, handler);
    };
  }, [messageType, handler]);
};

// React hook for all WebSocket messages
export const useWebSocketMessages = (handler: MessageHandler) => {
  React.useEffect(() => {
    websocketService.onAny(handler);
    
    return () => {
      websocketService.offAny(handler);
    };
  }, [handler]);
};

export default websocketService; 