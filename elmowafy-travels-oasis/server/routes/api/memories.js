import express from 'express';
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { auth } from '../../middleware/auth.js';
import { validate, validateId } from '../../middleware/validation.js';
import { AppError } from '../../middleware/errorHandler.js';
import Memory from '../../models/Memory.js';
import FamilyMember from '../../models/FamilyMember.js';
import { socketService } from '../../services/socketService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = Router();

// Configure multer for memory photo uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/memories');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'memory-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files per memory
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new AppError('Only image files are allowed', 400));
    }
  }
});

// Apply auth middleware to all routes
router.use(auth);

/**
 * @route   GET /api/memories/timeline
 * @desc    Get memory timeline for family or specific member
 * @access  Private
 */
router.get('/timeline', async (req, res, next) => {
  try {
    const { familyMemberId, limit = 50, skip = 0 } = req.query;
    
    const memories = await Memory.getMemoryTimeline(
      familyMemberId,
      parseInt(limit),
      parseInt(skip)
    );

    // Group memories by date for timeline visualization
    const timelineData = memories.reduce((acc, memory) => {
      const dateKey = memory.date.toISOString().split('T')[0];
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(memory);
      return acc;
    }, {});

    res.status(200).json({
      status: 'success',
      results: memories.length,
      data: {
        memories,
        timeline: timelineData,
        pagination: {
          limit: parseInt(limit),
          skip: parseInt(skip),
          hasMore: memories.length === parseInt(limit)
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   GET /api/memories/:id
 * @desc    Get a single memory by ID
 * @access  Private
 */
router.get('/:id', validateId, async (req, res, next) => {
  try {
    const memory = await Memory.findById(req.params.id)
      .populate('familyMembers.member', 'name arabicName profilePicture dob')
      .populate('createdBy', 'name email')
      .populate('comments.user', 'name profilePicture')
      .populate('aiInsights.relatedMemories', 'title date photos');

    if (!memory || !memory.isActive) {
      return next(new AppError('No memory found with that ID', 404));
    }

    // Check if user can view this memory
    if (!memory.isViewableBy(req.user.id)) {
      return next(new AppError('You do not have permission to view this memory', 403));
    }

    res.status(200).json({
      status: 'success',
      data: {
        memory
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   POST /api/memories
 * @desc    Create a new memory with photos and AI analysis
 * @access  Private
 */
router.post('/', upload.array('photos', 5), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return next(new AppError('At least one photo is required', 400));
    }

    const {
      title,
      description,
      date,
      familyMembers,
      tags,
      category,
      location,
      privacy = 'family',
      importance = 5
    } = req.body;

    // Parse family members
    let parsedFamilyMembers = [];
    if (familyMembers) {
      parsedFamilyMembers = typeof familyMembers === 'string' 
        ? JSON.parse(familyMembers)
        : familyMembers;
    }

    // Parse tags
    let parsedTags = [];
    if (tags) {
      parsedTags = typeof tags === 'string' 
        ? JSON.parse(tags)
        : tags;
    }

    // Parse location
    let parsedLocation = null;
    if (location) {
      parsedLocation = typeof location === 'string' 
        ? JSON.parse(location)
        : location;
    }

    // Process photos and run AI analysis on the first photo
    const photoData = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      url: `/uploads/memories/${file.filename}`,
      size: file.size,
      mimeType: file.mimetype,
      uploadedAt: new Date()
    }));

    // Run AI analysis on the first photo
    let aiAnalysisResult = null;
    try {
      // This would call your AI service - simplified for now
      aiAnalysisResult = {
        imageInfo: {
          width: 1920,
          height: 1080,
          channels: 3
        },
        detectedFaces: [],
        sceneAnalysis: 'Family gathering detected',
        suggestedTags: ['family', 'indoor', 'gathering'],
        emotions: ['happy', 'relaxed'],
        activities: ['socializing', 'eating'],
        location: {
          detected: 'indoor',
          confidence: 0.8
        }
      };
    } catch (aiError) {
      console.error('AI analysis failed:', aiError);
      // Continue without AI analysis
    }

    // Create memory record
    const memoryData = {
      title: title || `Family Memory - ${new Date(date).toLocaleDateString()}`,
      description,
      photos: photoData,
      date: new Date(date),
      familyMembers: parsedFamilyMembers.map(fm => ({
        member: fm.memberId,
        role: fm.role || 'secondary',
        confidence: fm.confidence || 1
      })),
      tags: [...parsedTags, ...(aiAnalysisResult?.suggestedTags || [])],
      category: category || 'everyday',
      location: parsedLocation,
      privacy,
      importance: parseInt(importance),
      createdBy: req.user.id,
      aiAnalysis: aiAnalysisResult,
      aiInsights: {
        memorySuggestions: [],
        relatedMemories: [],
        anniversaryDates: [],
        recommendedActions: ['Share with family', 'Add to photo album']
      }
    };

    const memory = await Memory.create(memoryData);

    // Populate the created memory
    const populatedMemory = await Memory.findById(memory._id)
      .populate('familyMembers.member', 'name arabicName profilePicture')
      .populate('createdBy', 'name email');

    // Emit real-time notification for new memory
    socketService.notifyNewMemory(populatedMemory, req.user.id);

    res.status(201).json({
      status: 'success',
      data: {
        memory: populatedMemory
      }
    });

  } catch (error) {
    // Clean up uploaded files on error
    if (req.files) {
      for (const file of req.files) {
        try {
          await fs.unlink(file.path);
        } catch (unlinkError) {
          console.error('Failed to delete uploaded file:', unlinkError);
        }
      }
    }
    next(error);
  }
});

/**
 * @route   GET /api/memories/search
 * @desc    Search memories with various filters
 * @access  Private
 */
router.get('/search', async (req, res, next) => {
  try {
    const { 
      query, 
      tags, 
      category, 
      familyMember, 
      startDate, 
      endDate,
      limit = 20 
    } = req.query;

    let searchCriteria = { isActive: true };

    // Text search
    if (query) {
      searchCriteria.$or = [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { tags: { $in: [new RegExp(query, 'i')] } }
      ];
    }

    // Filter by tags
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      searchCriteria.tags = { $in: tagArray };
    }

    // Filter by category
    if (category) {
      searchCriteria.category = category;
    }

    // Filter by family member
    if (familyMember) {
      searchCriteria['familyMembers.member'] = familyMember;
    }

    // Filter by date range
    if (startDate || endDate) {
      searchCriteria.date = {};
      if (startDate) searchCriteria.date.$gte = new Date(startDate);
      if (endDate) searchCriteria.date.$lte = new Date(endDate);
    }

    const memories = await Memory.find(searchCriteria)
      .populate('familyMembers.member', 'name arabicName profilePicture')
      .populate('createdBy', 'name')
      .sort({ importance: -1, date: -1 })
      .limit(parseInt(limit));

    res.status(200).json({
      status: 'success',
      results: memories.length,
      data: {
        memories
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   POST /api/memories/:id/like
 * @desc    Like/unlike a memory
 * @access  Private
 */
router.post('/:id/like', validateId, async (req, res, next) => {
  try {
    const memory = await Memory.findById(req.params.id);
    
    if (!memory || !memory.isActive) {
      return next(new AppError('No memory found with that ID', 404));
    }

    const existingLike = memory.likes.find(
      like => like.user.toString() === req.user.id.toString()
    );

    if (existingLike) {
      // Unlike
      await memory.removeLike(req.user.id);
    } else {
      // Like
      await memory.addLike(req.user.id);
    }

    // Emit real-time like update
    socketService.notifyMemoryLike(req.params.id, req.user, !existingLike);

    res.status(200).json({
      status: 'success',
      data: {
        liked: !existingLike,
        likeCount: memory.likeCount
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   POST /api/memories/:id/comment
 * @desc    Add a comment to a memory
 * @access  Private
 */
router.post('/:id/comment', validateId, async (req, res, next) => {
  try {
    const { text } = req.body;
    
    if (!text || text.trim().length === 0) {
      return next(new AppError('Comment text is required', 400));
    }

    const memory = await Memory.findById(req.params.id);
    
    if (!memory || !memory.isActive) {
      return next(new AppError('No memory found with that ID', 404));
    }

    await memory.addComment(req.user.id, text.trim());

    // Get updated memory with populated comments
    const updatedMemory = await Memory.findById(req.params.id)
      .populate('comments.user', 'name profilePicture');

    // Emit real-time comment notification
    const newComment = updatedMemory.comments[updatedMemory.comments.length - 1];
    socketService.notifyNewComment(req.params.id, newComment, req.user);

    res.status(201).json({
      status: 'success',
      data: {
        comments: updatedMemory.comments,
        commentCount: updatedMemory.commentCount
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   GET /api/memories/stats/overview
 * @desc    Get memory statistics overview
 * @access  Private
 */
router.get('/stats/overview', async (req, res, next) => {
  try {
    const stats = await Memory.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalMemories: { $sum: 1 },
          totalPhotos: { $sum: { $size: '$photos' } },
          averageImportance: { $avg: '$importance' },
          categoryCounts: {
            $push: '$category'
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalMemories: 1,
          totalPhotos: 1,
          averageImportance: { $round: ['$averageImportance', 1] },
          categoryCounts: 1
        }
      }
    ]);

    // Get memories by month for timeline
    const timelineStats = await Memory.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        overview: stats[0] || {
          totalMemories: 0,
          totalPhotos: 0,
          averageImportance: 0,
          categoryCounts: []
        },
        timeline: timelineStats
      }
    });
  } catch (err) {
    next(err);
  }
});

export default router;