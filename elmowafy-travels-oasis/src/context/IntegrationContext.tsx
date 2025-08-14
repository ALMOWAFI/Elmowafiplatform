import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useData } from './DataContext';
import { toast } from 'sonner';
import { useLanguage } from './LanguageContext';

// Types
interface WebSocketMessage {
  type: 'memory_update' | 'family_update' | 'travel_update' | 'game_update' | 'ai_analysis' | 'notification';
  data: any;
  timestamp: string;
  user_id?: string;
}

interface IntegrationState {
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastMessage: WebSocketMessage | null;
  messageCount: number;
  errorCount: number;
  reconnectAttempts: number;
  services: {
    api: boolean;
    ai: boolean;
    database: boolean;
    websocket: boolean;
  };
}

interface IntegrationContextType {
  state: IntegrationState;
  // WebSocket Management
  sendMessage: (message: WebSocketMessage) => void;
  reconnect: () => void;
  // Service Health
  checkServiceHealth: () => Promise<void>;
  // Real-time Updates
  subscribeToUpdates: (type: string, callback: (data: any) => void) => () => void;
  // Cross-component Communication
  broadcastEvent: (event: string, data: any) => void;
  subscribeToEvent: (event: string, callback: (data: any) => void) => () => void;
  // AI Integration Methods
  uploadMemoryWithAI: (formData: FormData) => Promise<any>;
  getAIMemorySuggestions: (date?: string, familyMember?: string) => Promise<any>;
  getAITravelRecommendations: (request: any) => Promise<any>;
  chatWithAI: (message: string, context?: any) => Promise<any>;
  getEnhancedTimeline: () => Promise<any>;
  // Utilities
  getConnectionStatus: () => string;
  getServiceStatus: () => { [key: string]: boolean };
}

const IntegrationContext = createContext<IntegrationContextType | undefined>(undefined);

// Provider Component
interface IntegrationProviderProps {
  children: ReactNode;
}

export const IntegrationProvider: React.FC<IntegrationProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const { refreshAllData } = useData();
  const { language } = useLanguage();
  const isArabic = language === 'ar';
  
  const [state, setState] = useState<IntegrationState>({
    isConnected: false,
    connectionStatus: 'disconnected',
    lastMessage: null,
    messageCount: 0,
    errorCount: 0,
    reconnectAttempts: 0,
    services: {
      api: false,
      ai: false,
      database: false,
      websocket: false,
    },
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const subscribersRef = useRef<Map<string, Set<(data: any) => void>>>(new Map());
  const eventSubscribersRef = useRef<Map<string, Set<(data: any) => void>>>(new Map());

  // WebSocket Connection Management
  const connectWebSocket = () => {
    if (!user) return;

    const wsUrl = `${import.meta.env.VITE_WS_URL || 'ws://localhost:8000'}/ws/${user.id}`;
    
    try {
      setState(prev => ({ ...prev, connectionStatus: 'connecting' }));
      
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        setState(prev => ({
          ...prev,
          isConnected: true,
          connectionStatus: 'connected',
          reconnectAttempts: 0,
          services: { ...prev.services, websocket: true },
        }));
        
        toast.success(isArabic ? 'تم الاتصال بنجاح' : 'Connected successfully');
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
      
      wsRef.current.onclose = () => {
        setState(prev => ({
          ...prev,
          isConnected: false,
          connectionStatus: 'disconnected',
          services: { ...prev.services, websocket: false },
        }));
        
        scheduleReconnect();
      };
      
      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setState(prev => ({
          ...prev,
          connectionStatus: 'error',
          errorCount: prev.errorCount + 1,
          services: { ...prev.services, websocket: false },
        }));
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setState(prev => ({ ...prev, connectionStatus: 'error' }));
    }
  };

  const scheduleReconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    const maxAttempts = 5;
    const baseDelay = 1000;
    const delay = Math.min(baseDelay * Math.pow(2, state.reconnectAttempts), 30000);
    
    if (state.reconnectAttempts < maxAttempts) {
      reconnectTimeoutRef.current = setTimeout(() => {
        setState(prev => ({ ...prev, reconnectAttempts: prev.reconnectAttempts + 1 }));
        connectWebSocket();
      }, delay);
    } else {
      toast.error(isArabic ? 'فشل في إعادة الاتصال' : 'Failed to reconnect');
    }
  };

  const handleWebSocketMessage = (message: WebSocketMessage) => {
    setState(prev => ({
      ...prev,
      lastMessage: message,
      messageCount: prev.messageCount + 1,
    }));

    // Handle different message types
    switch (message.type) {
      case 'memory_update':
        refreshAllData();
        notifySubscribers('memory_update', message.data);
        break;
      case 'family_update':
        refreshAllData();
        notifySubscribers('family_update', message.data);
        break;
      case 'travel_update':
        refreshAllData();
        notifySubscribers('travel_update', message.data);
        break;
      case 'game_update':
        notifySubscribers('game_update', message.data);
        break;
      case 'ai_analysis':
        notifySubscribers('ai_analysis', message.data);
        break;
      case 'notification':
        toast.info(message.data.message || 'New notification');
        notifySubscribers('notification', message.data);
        break;
      default:
        console.warn('Unknown message type:', message.type);
    }
  };

  const sendMessage = (message: WebSocketMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  };

  const reconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    setState(prev => ({ ...prev, reconnectAttempts: 0 }));
    connectWebSocket();
  };

  // Service Health Check
  const checkServiceHealth = async () => {
    const services = ['api', 'ai', 'database'];
    const healthStatus: { [key: string]: boolean } = {};
    
    try {
      // Check API health
      const apiResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/health`);
      healthStatus.api = apiResponse.ok;
      
      // Check AI service health
      const aiResponse = await fetch(`${import.meta.env.VITE_AI_URL || 'http://localhost:5000'}/health`);
      healthStatus.ai = aiResponse.ok;
      
      // Check database health (via API)
      const dbResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/health/database`);
      healthStatus.database = dbResponse.ok;
      
      setState(prev => ({
        ...prev,
        services: { ...prev.services, ...healthStatus },
      }));
    } catch (error) {
      console.error('Health check failed:', error);
      setState(prev => ({
        ...prev,
        services: { ...prev.services, api: false, ai: false, database: false },
      }));
    }
  };

  // Subscription Management
  const subscribeToUpdates = (type: string, callback: (data: any) => void) => {
    if (!subscribersRef.current.has(type)) {
      subscribersRef.current.set(type, new Set());
    }
    subscribersRef.current.get(type)!.add(callback);
    
    return () => {
      const subscribers = subscribersRef.current.get(type);
      if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          subscribersRef.current.delete(type);
        }
      }
    };
  };

  const notifySubscribers = (type: string, data: any) => {
    const subscribers = subscribersRef.current.get(type);
    if (subscribers) {
      subscribers.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in subscriber callback:', error);
        }
      });
    }
  };

  // Cross-component Event System
  const broadcastEvent = (event: string, data: any) => {
    const subscribers = eventSubscribersRef.current.get(event);
    if (subscribers) {
      subscribers.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in event subscriber callback:', error);
        }
      });
    }
  };

  const subscribeToEvent = (event: string, callback: (data: any) => void) => {
    if (!eventSubscribersRef.current.has(event)) {
      eventSubscribersRef.current.set(event, new Set());
    }
    eventSubscribersRef.current.get(event)!.add(callback);
    
    return () => {
      const subscribers = eventSubscribersRef.current.get(event);
      if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          eventSubscribersRef.current.delete(event);
        }
      }
    };
  };

  // Utility Functions
  const getConnectionStatus = () => {
    return state.connectionStatus;
  };

  const getServiceStatus = () => {
    return state.services;
  };

  // AI Integration Methods
  const uploadMemoryWithAI = async (formData: FormData) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/memory/upload-with-ai`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      const result = await response.json();
      
      // Broadcast success event
      broadcastEvent('memory_uploaded', result);
      
      // Refresh data
      refreshAllData();
      
      toast.success(isArabic ? 'تم رفع الذكرى ومعالجتها بالذكاء الاصطناعي' : 'Memory uploaded and processed with AI');
      
      return result;
    } catch (error) {
      console.error('Upload with AI failed:', error);
      toast.error(isArabic ? 'فشل في رفع الذكرى' : 'Failed to upload memory');
      throw error;
    }
  };

  const getAIMemorySuggestions = async (date?: string, familyMember?: string) => {
    try {
      const params = new URLSearchParams();
      if (date) params.append('date', date);
      if (familyMember) params.append('family_member', familyMember);

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/memory/suggestions-ai?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Suggestions failed: ${response.status}`);
      }

      const result = await response.json();
      
      // Broadcast suggestions event
      broadcastEvent('suggestions_received', result);
      
      return result;
    } catch (error) {
      console.error('AI memory suggestions failed:', error);
      toast.error(isArabic ? 'فشل في الحصول على اقتراحات الذكريات' : 'Failed to get memory suggestions');
      throw error;
    }
  };

  const getAITravelRecommendations = async (request: any) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/travel/recommendations-ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Travel recommendations failed: ${response.status}`);
      }

      const result = await response.json();
      
      // Broadcast recommendations event
      broadcastEvent('travel_recommendations', result);
      
      return result;
    } catch (error) {
      console.error('AI travel recommendations failed:', error);
      toast.error(isArabic ? 'فشل في الحصول على توصيات السفر' : 'Failed to get travel recommendations');
      throw error;
    }
  };

  const chatWithAI = async (message: string, context?: any) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/chat/ai-assistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          family_context: context,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI chat failed: ${response.status}`);
      }

      const result = await response.json();
      
      // Broadcast chat response event
      broadcastEvent('ai_chat_response', result);
      
      return result;
    } catch (error) {
      console.error('AI chat failed:', error);
      toast.error(isArabic ? 'فشل في التحدث مع المساعد الذكي' : 'Failed to chat with AI assistant');
      throw error;
    }
  };

  const getEnhancedTimeline = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/memory/timeline-enhanced`);
      
      if (!response.ok) {
        throw new Error(`Enhanced timeline failed: ${response.status}`);
      }

      const result = await response.json();
      
      // Broadcast timeline event
      broadcastEvent('timeline_loaded', result);
      
      return result;
    } catch (error) {
      console.error('Enhanced timeline failed:', error);
      toast.error(isArabic ? 'فشل في الحصول على الخط الزمني المحسن' : 'Failed to get enhanced timeline');
      throw error;
    }
  };

  // Effects
  useEffect(() => {
    if (user) {
      connectWebSocket();
      
      // Start health check interval
      healthCheckIntervalRef.current = setInterval(checkServiceHealth, 30000); // Every 30 seconds
      
      // Initial health check
      checkServiceHealth();
    }
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
      }
    };
  }, [user]);

  const contextValue: IntegrationContextType = {
    state,
    sendMessage,
    reconnect,
    checkServiceHealth,
    subscribeToUpdates,
    broadcastEvent,
    subscribeToEvent,
    uploadMemoryWithAI,
    getAIMemorySuggestions,
    getAITravelRecommendations,
    chatWithAI,
    getEnhancedTimeline,
    getConnectionStatus,
    getServiceStatus,
  };

  return (
    <IntegrationContext.Provider value={contextValue}>
      {children}
    </IntegrationContext.Provider>
  );
};

// Hook
export const useIntegration = () => {
  const context = useContext(IntegrationContext);
  if (context === undefined) {
    throw new Error('useIntegration must be used within an IntegrationProvider');
  }
  return context;
};
