import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: string[];
  notifications: Notification[];
  clearNotifications: () => void;
  joinMemoryRoom: (memoryId: string) => void;
  leaveMemoryRoom: (memoryId: string) => void;
  emitTyping: (memoryId: string, isTyping: boolean) => void;
  emitUploadProgress: (data: UploadProgressData) => void;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: Date;
  data?: any;
}

interface UploadProgressData {
  progress: number;
  fileName: string;
  memoryId?: string;
}

interface MemoryUpdate {
  type: 'memory:created' | 'memory:liked' | 'memory:commented';
  memory?: any;
  memoryId?: string;
  likedBy?: { id: string; name: string };
  commenter?: { id: string; name: string };
  comment?: any;
  timestamp: Date;
}

export const useSocket = (token?: string): UseSocketReturn => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const createNotification = useCallback((title: string, message: string, type: string, data?: any): Notification => {
    return {
      id: `${Date.now()}-${Math.random()}`,
      type,
      title,
      message,
      timestamp: new Date(),
      data
    };
  }, []);

  const addNotification = useCallback((notification: Notification) => {
    setNotifications(prev => [notification, ...prev.slice(0, 19)]); // Keep last 20 notifications
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const joinMemoryRoom = useCallback((memoryId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('memory:join', memoryId);
    }
  }, []);

  const leaveMemoryRoom = useCallback((memoryId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('memory:leave', memoryId);
    }
  }, []);

  const emitTyping = useCallback((memoryId: string, isTyping: boolean) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('memory:typing', { memoryId, isTyping });
    }
  }, []);

  const emitUploadProgress = useCallback((data: UploadProgressData) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('memory:upload_progress', data);
    }
  }, []);

  useEffect(() => {
    if (!token) return;

    // Initialize socket connection
    const socket = io(process.env.REACT_APP_API_URL || 'http://localhost:3000', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    // Connection event handlers
    socket.on('connect', () => {
      console.log('✅ Connected to server');
      setIsConnected(true);
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from server:', reason);
      setIsConnected(false);
      setOnlineUsers([]);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error);
      setIsConnected(false);
    });

    // User presence handlers
    socket.on('user:online', (data: { userId: string; name: string }) => {
      setOnlineUsers(prev => [...new Set([...prev, data.userId])]);
      
      const notification = createNotification(
        'User Online',
        `${data.name} is now online`,
        'user:online',
        data
      );
      addNotification(notification);
    });

    socket.on('user:offline', (data: { userId: string; name: string }) => {
      setOnlineUsers(prev => prev.filter(id => id !== data.userId));
      
      const notification = createNotification(
        'User Offline',
        `${data.name} went offline`,
        'user:offline',
        data
      );
      addNotification(notification);
    });

    // Memory-related handlers
    socket.on('notification', (data: any) => {
      let notification: Notification;

      switch (data.type) {
        case 'memory:created':
          notification = createNotification(
            'New Memory Added',
            `${data.memory.createdBy.name} added a new memory: "${data.memory.title}"`,
            data.type,
            data.memory
          );
          break;

        case 'memory:liked':
          notification = createNotification(
            'Memory Liked',
            `${data.likedBy.name} liked a memory`,
            data.type,
            data
          );
          break;

        case 'memory:commented':
          notification = createNotification(
            'New Comment',
            `${data.commenter.name} commented on a memory`,
            data.type,
            data
          );
          break;

        default:
          notification = createNotification(
            'New Notification',
            'You have a new notification',
            data.type,
            data
          );
      }

      addNotification(notification);
    });

    // Real-time memory updates
    socket.on('memory:like_update', (data: any) => {
      // Trigger UI update for memory likes
      window.dispatchEvent(new CustomEvent('memory:like_update', { detail: data }));
    });

    socket.on('memory:new_comment', (data: any) => {
      // Trigger UI update for new comments
      window.dispatchEvent(new CustomEvent('memory:new_comment', { detail: data }));
      
      const notification = createNotification(
        'New Comment',
        `${data.commenter.name}: ${data.comment.text.substring(0, 50)}...`,
        'memory:commented',
        data
      );
      addNotification(notification);
    });

    // Typing indicators
    socket.on('memory:user_typing', (data: { userId: string; userName: string; memoryId: string; isTyping: boolean }) => {
      window.dispatchEvent(new CustomEvent('memory:typing', { detail: data }));
    });

    // Upload progress updates
    socket.on('memory:upload_update', (data: { userId: string; userName: string; progress: number; fileName: string }) => {
      const notification = createNotification(
        'Upload Progress',
        `${data.userName} is uploading ${data.fileName} (${data.progress}%)`,
        'upload:progress',
        data
      );
      addNotification(notification);
    });

    // AI analysis updates
    socket.on('ai:analysis_ready', (data: any) => {
      const notification = createNotification(
        'AI Analysis Complete',
        `AI analysis completed for your memory. ${data.analysis.detectedFaces} faces detected.`,
        'ai:analysis_complete',
        data
      );
      addNotification(notification);
      
      // Trigger UI update
      window.dispatchEvent(new CustomEvent('ai:analysis_ready', { detail: data }));
    });

    // Family activity updates
    socket.on('family:live_activity', (data: any) => {
      window.dispatchEvent(new CustomEvent('family:activity', { detail: data }));
    });

    // Travel planning updates
    socket.on('travel:update', (data: any) => {
      const notification = createNotification(
        'Travel Plan Updated',
        `${data.updatedBy.name} updated the travel plan`,
        'travel:updated',
        data
      );
      addNotification(notification);
      
      window.dispatchEvent(new CustomEvent('travel:update', { detail: data }));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      setOnlineUsers([]);
    };
  }, [token, createNotification, addNotification]);

  return {
    socket: socketRef.current,
    isConnected,
    onlineUsers,
    notifications,
    clearNotifications,
    joinMemoryRoom,
    leaveMemoryRoom,
    emitTyping,
    emitUploadProgress
  };
};