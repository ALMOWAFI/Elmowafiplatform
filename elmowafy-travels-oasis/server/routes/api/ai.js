import express from 'express';
import { Router } from 'express';
import multer from 'multer';
import axios from 'axios';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { auth } from '../../middleware/auth.js';
import { AppError } from '../../middleware/errorHandler.js';
import FamilyMember from '../../models/FamilyMember.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = Router();

// AI Service Configuration
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5000';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new AppError('Only image and PDF files are allowed', 400));
    }
  }
});

// Apply auth middleware to all routes
router.use(auth);

/**
 * @route   POST /api/ai/analyze-photo
 * @desc    Analyze uploaded photo with AI and connect to family members
 * @access  Private
 */
router.post('/analyze-photo', upload.single('photo'), async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new AppError('No photo file uploaded', 400));
    }

    const { familyMemberId, context } = req.body;

    // Prepare AI analysis request
    const formData = new FormData();
    const fileBuffer = await fs.readFile(req.file.path);
    const blob = new Blob([fileBuffer], { type: req.file.mimetype });
    
    formData.append('file', blob, req.file.filename);
    formData.append('context', context || '');
    
    // Call AI service for photo analysis
    const aiResponse = await axios.post(`${AI_SERVICE_URL}/analyze-family-photo`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 30000, // 30 second timeout
    });

    // Get family member info if provided
    let familyMember = null;
    if (familyMemberId) {
      familyMember = await FamilyMember.findById(familyMemberId);
    }

    // Store photo analysis results
    const analysisResult = {
      originalPhoto: req.file.filename,
      aiAnalysis: aiResponse.data,
      familyMember: familyMember ? {
        id: familyMember._id,
        name: familyMember.name,
        arabicName: familyMember.arabicName
      } : null,
      uploadedAt: new Date(),
      analyzedBy: req.user.id
    };

    // TODO: Save to memories collection (implement later)
    
    res.status(200).json({
      status: 'success',
      data: {
        analysis: analysisResult
      }
    });

  } catch (error) {
    // Clean up uploaded file on error
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Failed to delete uploaded file:', unlinkError);
      }
    }

    if (error.code === 'ECONNREFUSED') {
      return next(new AppError('AI service is currently unavailable', 503));
    }

    next(error);
  }
});

/**
 * @route   POST /api/ai/detect-math-errors
 * @desc    Detect math errors in uploaded homework using AI
 * @access  Private
 */
router.post('/detect-math-errors', upload.single('homework'), async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new AppError('No homework file uploaded', 400));
    }

    const { studentWork, correctSolution, teachingStyle = 'detailed' } = req.body;

    // Prepare request for AI math analysis service
    const formData = new FormData();
    const fileBuffer = await fs.readFile(req.file.path);
    const blob = new Blob([fileBuffer], { type: req.file.mimetype });
    
    formData.append('file', blob, req.file.filename);
    formData.append('student_work', studentWork || '');
    formData.append('correct_solution', correctSolution || '');
    formData.append('teaching_style', teachingStyle);

    // Call AI service for math error detection
    const aiResponse = await axios.post(`${AI_SERVICE_URL}/detect`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 30000,
    });

    // Clean up uploaded file
    await fs.unlink(req.file.path);

    res.status(200).json({
      status: 'success',
      data: aiResponse.data
    });

  } catch (error) {
    // Clean up uploaded file on error
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Failed to delete uploaded file:', unlinkError);
      }
    }

    if (error.code === 'ECONNREFUSED') {
      return next(new AppError('AI service is currently unavailable', 503));
    }

    next(error);
  }
});

/**
 * @route   GET /api/ai/memory-suggestions
 * @desc    Get AI-powered memory suggestions for family
 * @access  Private
 */
router.get('/memory-suggestions', async (req, res, next) => {
  try {
    const { familyMemberId, date, type } = req.query;

    // Get family context
    let familyContext = {};
    if (familyMemberId) {
      const member = await FamilyMember.findById(familyMemberId)
        .populate('parents', 'name arabicName')
        .populate('spouse', 'name arabicName')
        .populate('children', 'name arabicName');
      
      if (member) {
        familyContext = {
          member: {
            name: member.name,
            arabicName: member.arabicName,
            dob: member.dob,
            preferences: member.preferences || {}
          },
          relationships: {
            parents: member.parents,
            spouse: member.spouse,
            children: member.children
          }
        };
      }
    }

    // Call AI service for memory suggestions
    const aiResponse = await axios.post(`${AI_SERVICE_URL}/api/memory-suggestions`, {
      familyContext,
      date: date || new Date().toISOString(),
      type: type || 'general',
      userId: req.user.id
    }, {
      timeout: 15000,
    });

    res.status(200).json({
      status: 'success',
      data: aiResponse.data
    });

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      return next(new AppError('AI service is currently unavailable', 503));
    }

    next(error);
  }
});

/**
 * @route   POST /api/ai/travel-recommendations
 * @desc    Get AI-powered travel recommendations based on family preferences
 * @access  Private
 */
router.post('/travel-recommendations', async (req, res, next) => {
  try {
    const { destination, budget, duration, familyMembers, preferences } = req.body;

    // Get family members details
    let familyContext = [];
    if (familyMembers && familyMembers.length > 0) {
      const members = await FamilyMember.find({
        _id: { $in: familyMembers }
      }).select('name arabicName dob preferences travelHistory');
      
      familyContext = members.map(member => ({
        name: member.name,
        arabicName: member.arabicName,
        age: member.dob ? new Date().getFullYear() - new Date(member.dob).getFullYear() : null,
        preferences: member.preferences || {},
        travelHistory: member.travelHistory || []
      }));
    }

    // Call AI service for travel recommendations
    const aiResponse = await axios.post(`${AI_SERVICE_URL}/api/travel-recommendations`, {
      destination,
      budget,
      duration,
      familyContext,
      preferences: preferences || {},
      requestedBy: req.user.id
    }, {
      timeout: 20000,
    });

    res.status(200).json({
      status: 'success',
      data: aiResponse.data
    });

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      return next(new AppError('AI service is currently unavailable', 503));
    }

    next(error);
  }
});

/**
 * @route   GET /api/ai/teaching-styles
 * @desc    Get available AI teaching styles
 * @access  Private
 */
router.get('/teaching-styles', async (req, res, next) => {
  try {
    const aiResponse = await axios.get(`${AI_SERVICE_URL}/api/teaching-styles`, {
      timeout: 5000,
    });

    res.status(200).json({
      status: 'success',
      data: aiResponse.data
    });

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      return next(new AppError('AI service is currently unavailable', 503));
    }

    next(error);
  }
});

/**
 * @route   GET /api/ai/health
 * @desc    Check AI service health status
 * @access  Private
 */
router.get('/health', async (req, res, next) => {
  try {
    const aiResponse = await axios.get(`${AI_SERVICE_URL}/health`, {
      timeout: 3000,
    });

    res.status(200).json({
      status: 'success',
      data: {
        aiService: 'connected',
        aiServiceResponse: aiResponse.data
      }
    });

  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: 'AI service is currently unavailable',
      data: {
        aiService: 'disconnected',
        error: error.message
      }
    });
  }
});

export default router;