import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

class SocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socketId mapping
    this.userRooms = new Map(); // userId -> Set of room names
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('name email');
        
        if (!user) {
          return next(new Error('User not found'));
        }

        socket.userId = user._id.toString();
        socket.user = user;
        next();
      } catch (error) {
        next(new Error('Invalid authentication token'));
      }
    });

    // Connection handling
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });

    console.log('✅ WebSocket service initialized');
  }

  handleConnection(socket) {
    const userId = socket.userId;
    
    // Store user connection
    this.connectedUsers.set(userId, socket.id);
    this.userRooms.set(userId, new Set());

    console.log(`👤 User ${socket.user.name} connected (${socket.id})`);

    // Join user to their personal room and family room
    socket.join(`user:${userId}`);
    socket.join('family'); // All family members in same room for now
    
    this.userRooms.get(userId).add(`user:${userId}`);
    this.userRooms.get(userId).add('family');

    // Emit user online status
    socket.to('family').emit('user:online', {
      userId,
      name: socket.user.name,
      timestamp: new Date()
    });

    // Handle memory-related events
    this.setupMemoryEvents(socket);
    
    // Handle family-related events
    this.setupFamilyEvents(socket);
    
    // Handle travel-related events
    this.setupTravelEvents(socket);

    // Handle disconnection
    socket.on('disconnect', () => {
      this.handleDisconnection(socket);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`Socket error for user ${userId}:`, error);
    });
  }

  setupMemoryEvents(socket) {
    const userId = socket.userId;

    // Join memory-specific rooms
    socket.on('memory:join', (memoryId) => {
      socket.join(`memory:${memoryId}`);
      this.userRooms.get(userId).add(`memory:${memoryId}`);
    });

    socket.on('memory:leave', (memoryId) => {
      socket.leave(`memory:${memoryId}`);
      this.userRooms.get(userId).delete(`memory:${memoryId}`);
    });

    // Real-time memory updates
    socket.on('memory:typing', (data) => {
      socket.to(`memory:${data.memoryId}`).emit('memory:user_typing', {
        userId,
        userName: socket.user.name,
        memoryId: data.memoryId,
        isTyping: data.isTyping
      });
    });

    // Live photo upload progress
    socket.on('memory:upload_progress', (data) => {
      socket.to('family').emit('memory:upload_update', {
        userId,
        userName: socket.user.name,
        progress: data.progress,
        fileName: data.fileName,
        memoryId: data.memoryId
      });
    });
  }

  setupFamilyEvents(socket) {
    const userId = socket.userId;

    // Family activity notifications
    socket.on('family:activity', (data) => {
      socket.to('family').emit('family:new_activity', {
        userId,
        userName: socket.user.name,
        activity: data.activity,
        timestamp: new Date()
      });
    });

    // Family member status updates
    socket.on('family:status_update', (data) => {
      socket.to('family').emit('family:member_status', {
        userId,
        userName: socket.user.name,
        status: data.status,
        location: data.location,
        timestamp: new Date()
      });
    });
  }

  setupTravelEvents(socket) {
    const userId = socket.userId;

    // Travel planning collaboration
    socket.on('travel:join_planning', (tripId) => {
      socket.join(`trip:${tripId}`);
      this.userRooms.get(userId).add(`trip:${tripId}`);
      
      socket.to(`trip:${tripId}`).emit('travel:user_joined', {
        userId,
        userName: socket.user.name,
        tripId
      });
    });

    socket.on('travel:leave_planning', (tripId) => {
      socket.leave(`trip:${tripId}`);
      this.userRooms.get(userId).delete(`trip:${tripId}`);
      
      socket.to(`trip:${tripId}`).emit('travel:user_left', {
        userId,
        userName: socket.user.name,
        tripId
      });
    });

    // Live travel planning updates
    socket.on('travel:plan_update', (data) => {
      socket.to(`trip:${data.tripId}`).emit('travel:plan_changed', {
        userId,
        userName: socket.user.name,
        update: data.update,
        tripId: data.tripId,
        timestamp: new Date()
      });
    });
  }

  handleDisconnection(socket) {
    const userId = socket.userId;
    
    console.log(`👋 User ${socket.user.name} disconnected (${socket.id})`);

    // Clean up user tracking
    this.connectedUsers.delete(userId);
    
    // Leave all rooms
    const userRooms = this.userRooms.get(userId) || new Set();
    userRooms.forEach(room => {
      socket.leave(room);
    });
    this.userRooms.delete(userId);

    // Emit user offline status
    socket.to('family').emit('user:offline', {
      userId,
      name: socket.user.name,
      timestamp: new Date()
    });
  }

  // Public methods for emitting events from other parts of the application

  /**
   * Notify about new memory creation
   */
  notifyNewMemory(memory, excludeUserId = null) {
    const notification = {
      type: 'memory:created',
      memory: {
        _id: memory._id,
        title: memory.title,
        photos: memory.photos,
        familyMembers: memory.familyMembers,
        createdBy: memory.createdBy
      },
      timestamp: new Date()
    };

    if (excludeUserId) {
      this.io.to('family').except(`user:${excludeUserId}`).emit('notification', notification);
    } else {
      this.io.to('family').emit('notification', notification);
    }
  }

  /**
   * Notify about memory likes
   */
  notifyMemoryLike(memoryId, likedBy, isLiked) {
    const notification = {
      type: 'memory:liked',
      memoryId,
      likedBy: {
        id: likedBy._id,
        name: likedBy.name
      },
      isLiked,
      timestamp: new Date()
    };

    this.io.to(`memory:${memoryId}`).emit('memory:like_update', notification);
  }

  /**
   * Notify about new comments
   */
  notifyNewComment(memoryId, comment, commenter) {
    const notification = {
      type: 'memory:commented',
      memoryId,
      comment: {
        _id: comment._id,
        text: comment.text,
        createdAt: comment.createdAt
      },
      commenter: {
        id: commenter._id,
        name: commenter.name
      },
      timestamp: new Date()
    };

    this.io.to(`memory:${memoryId}`).emit('memory:new_comment', notification);
    this.io.to('family').emit('notification', notification);
  }

  /**
   * Notify about AI analysis completion
   */
  notifyAIAnalysisComplete(memoryId, analysis, userId) {
    const notification = {
      type: 'ai:analysis_complete',
      memoryId,
      analysis: {
        sceneAnalysis: analysis.sceneAnalysis,
        suggestedTags: analysis.suggestedTags,
        detectedFaces: analysis.detectedFaces?.length || 0
      },
      timestamp: new Date()
    };

    this.io.to(`user:${userId}`).emit('ai:analysis_ready', notification);
  }

  /**
   * Notify about travel plan updates
   */
  notifyTravelPlanUpdate(tripId, update, updatedBy) {
    const notification = {
      type: 'travel:plan_updated',
      tripId,
      update,
      updatedBy: {
        id: updatedBy._id,
        name: updatedBy.name
      },
      timestamp: new Date()
    };

    this.io.to(`trip:${tripId}`).emit('travel:update', notification);
  }

  /**
   * Send notification to specific user
   */
  notifyUser(userId, notification) {
    const socketId = this.connectedUsers.get(userId.toString());
    if (socketId) {
      this.io.to(socketId).emit('notification', {
        ...notification,
        timestamp: new Date()
      });
    }
  }

  /**
   * Send notification to all family members
   */
  notifyFamily(notification, excludeUserId = null) {
    if (excludeUserId) {
      this.io.to('family').except(`user:${excludeUserId}`).emit('notification', {
        ...notification,
        timestamp: new Date()
      });
    } else {
      this.io.to('family').emit('notification', {
        ...notification,
        timestamp: new Date()
      });
    }
  }

  /**
   * Get online users
   */
  getOnlineUsers() {
    return Array.from(this.connectedUsers.keys());
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId) {
    return this.connectedUsers.has(userId.toString());
  }

  /**
   * Send typing indicator
   */
  sendTypingIndicator(memoryId, userId, isTyping) {
    this.io.to(`memory:${memoryId}`).except(`user:${userId}`).emit('memory:typing_indicator', {
      memoryId,
      userId,
      isTyping,
      timestamp: new Date()
    });
  }

  /**
   * Broadcast live activity
   */
  broadcastActivity(activity) {
    this.io.to('family').emit('family:live_activity', {
      ...activity,
      timestamp: new Date()
    });
  }
}

// Export singleton instance
export const socketService = new SocketService();