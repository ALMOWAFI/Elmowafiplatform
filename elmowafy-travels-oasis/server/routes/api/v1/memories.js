import express from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import axios from 'axios';
import { auth } from '../../../middleware/auth.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = 'uploads/memories';
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and GIF images are allowed.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

// In-memory storage for memories (replace with actual database later)
const memories = [];

// AI Service configuration
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// Helper function to call AI service
async function processMemoryWithAI(imagePath, metadata = {}) {
  try {
    // This would connect to the hack2 AI service
    // For now, return mock AI analysis
    return {
      detected_faces: [{ bbox: [100, 100, 200, 200], confidence: 0.95 }],
      family_members: [{ name: 'Family Member', confidence: 0.85, relationship: 'parent' }],
      activities: ['family_gathering'],
      location: { country: 'Unknown', city: 'Unknown' },
      cultural_elements: [],
      memory_category: 'family_gathering',
      text_content: [],
      suggestions: {
        similar_memories: [],
        family_connections: [],
        travel_recommendations: []
      }
    };
  } catch (error) {
    console.error('AI processing error:', error);
    return {
      detected_faces: [],
      family_members: [],
      activities: [],
      location: null,
      cultural_elements: [],
      memory_category: 'uncategorized',
      text_content: [],
      suggestions: { similar_memories: [], family_connections: [], travel_recommendations: [] }
    };
  }
}

// Apply authentication to all routes
router.use(auth);

// Upload and create a new memory
router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'fail',
        message: 'No image file provided'
      });
    }

    const { title, description, memory_date, location, tags } = req.body;

    // Validate required fields
    if (!title) {
      return res.status(400).json({
        status: 'fail',
        message: 'Title is required'
      });
    }

    // Process image with AI
    console.log('Processing image with AI...', req.file.path);
    const aiAnalysis = await processMemoryWithAI(req.file.path, {
      title,
      description,
      memory_date,
      location: location ? JSON.parse(location) : null
    });

    // Create memory object
    const memory = {
      id: uuidv4(),
      title,
      description: description || '',
      image_url: `/uploads/memories/${req.file.filename}`,
      image_filename: req.file.filename,
      memory_type: aiAnalysis.memory_category || 'other',
      memory_date: memory_date ? new Date(memory_date) : new Date(),
      location: location ? JSON.parse(location) : {},
      ai_analysis: aiAnalysis,
      family_members: aiAnalysis.family_members || [],
      tags: tags ? JSON.parse(tags) : [],
      is_favorite: false,
      privacy_level: 'family',
      user_id: req.user.id,
      created_at: new Date(),
      updated_at: new Date()
    };

    // Store memory (in production, this would be saved to database)
    memories.push(memory);

    console.log('Memory created successfully:', memory.id);

    res.status(201).json({
      status: 'success',
      message: 'Memory uploaded and processed successfully',
      data: {
        memory: {
          id: memory.id,
          title: memory.title,
          description: memory.description,
          image_url: memory.image_url,
          memory_type: memory.memory_type,
          memory_date: memory.memory_date,
          location: memory.location,
          family_members: memory.family_members,
          tags: memory.tags,
          ai_analysis: {
            activities: memory.ai_analysis.activities,
            memory_category: memory.ai_analysis.memory_category,
            suggestions: memory.ai_analysis.suggestions
          },
          created_at: memory.created_at
        }
      }
    });

  } catch (error) {
    console.error('Memory upload error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to process memory upload',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get all memories for authenticated user
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, memory_type, search } = req.query;
    
    // Filter memories for current user
    let userMemories = memories.filter(memory => memory.user_id === req.user.id);

    // Apply filters
    if (memory_type) {
      userMemories = userMemories.filter(memory => memory.memory_type === memory_type);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      userMemories = userMemories.filter(memory => 
        memory.title.toLowerCase().includes(searchLower) ||
        memory.description.toLowerCase().includes(searchLower) ||
        memory.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    // Sort by creation date (newest first)
    userMemories.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Paginate
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedMemories = userMemories.slice(startIndex, endIndex);

    res.status(200).json({
      status: 'success',
      data: {
        memories: paginatedMemories.map(memory => ({
          id: memory.id,
          title: memory.title,
          description: memory.description,
          image_url: memory.image_url,
          memory_type: memory.memory_type,
          memory_date: memory.memory_date,
          location: memory.location,
          family_members: memory.family_members,
          tags: memory.tags,
          is_favorite: memory.is_favorite,
          created_at: memory.created_at
        })),
        pagination: {
          total: userMemories.length,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(userMemories.length / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get memories error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch memories'
    });
  }
});

// Get single memory by ID
router.get('/:id', async (req, res) => {
  try {
    const memory = memories.find(m => m.id === req.params.id && m.user_id === req.user.id);
    
    if (!memory) {
      return res.status(404).json({
        status: 'fail',
        message: 'Memory not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: { memory }
    });

  } catch (error) {
    console.error('Get memory error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch memory'
    });
  }
});

// Update memory
router.patch('/:id', async (req, res) => {
  try {
    const memoryIndex = memories.findIndex(m => m.id === req.params.id && m.user_id === req.user.id);
    
    if (memoryIndex === -1) {
      return res.status(404).json({
        status: 'fail',
        message: 'Memory not found'
      });
    }

    const { title, description, tags, is_favorite, privacy_level } = req.body;
    
    // Update memory
    if (title) memories[memoryIndex].title = title;
    if (description !== undefined) memories[memoryIndex].description = description;
    if (tags) memories[memoryIndex].tags = tags;
    if (is_favorite !== undefined) memories[memoryIndex].is_favorite = is_favorite;
    if (privacy_level) memories[memoryIndex].privacy_level = privacy_level;
    memories[memoryIndex].updated_at = new Date();

    res.status(200).json({
      status: 'success',
      data: { memory: memories[memoryIndex] }
    });

  } catch (error) {
    console.error('Update memory error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update memory'
    });
  }
});

// Delete memory
router.delete('/:id', async (req, res) => {
  try {
    const memoryIndex = memories.findIndex(m => m.id === req.params.id && m.user_id === req.user.id);
    
    if (memoryIndex === -1) {
      return res.status(404).json({
        status: 'fail',
        message: 'Memory not found'
      });
    }

    // Delete the image file
    const memory = memories[memoryIndex];
    try {
      await fs.unlink(`uploads/memories/${memory.image_filename}`);
    } catch (fileError) {
      console.warn('Could not delete image file:', fileError);
    }

    // Remove from array
    memories.splice(memoryIndex, 1);

    res.status(204).json({
      status: 'success',
      message: 'Memory deleted successfully'
    });

  } catch (error) {
    console.error('Delete memory error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete memory'
    });
  }
});

// Get memory timeline (grouped by date)
router.get('/timeline/view', async (req, res) => {
  try {
    const userMemories = memories
      .filter(memory => memory.user_id === req.user.id)
      .sort((a, b) => new Date(b.memory_date) - new Date(a.memory_date));

    // Group memories by year and month
    const timeline = userMemories.reduce((acc, memory) => {
      const date = new Date(memory.memory_date);
      const year = date.getFullYear();
      const month = date.getMonth();
      
      if (!acc[year]) acc[year] = {};
      if (!acc[year][month]) acc[year][month] = [];
      
      acc[year][month].push({
        id: memory.id,
        title: memory.title,
        image_url: memory.image_url,
        memory_type: memory.memory_type,
        memory_date: memory.memory_date,
        family_members: memory.family_members
      });
      
      return acc;
    }, {});

    res.status(200).json({
      status: 'success',
      data: { timeline }
    });

  } catch (error) {
    console.error('Timeline error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch timeline'
    });
  }
});

// Get memory suggestions (On this day, similar memories, etc.)
router.get('/suggestions/daily', async (req, res) => {
  try {
    const today = new Date();
    const userMemories = memories.filter(memory => memory.user_id === req.user.id);

    const suggestions = {
      on_this_day: [],
      similar_memories: [],
      family_connections: []
    };

    // Find memories from same date in previous years
    userMemories.forEach(memory => {
      const memoryDate = new Date(memory.memory_date);
      if (memoryDate.getMonth() === today.getMonth() && 
          memoryDate.getDate() === today.getDate() && 
          memoryDate.getFullYear() !== today.getFullYear()) {
        suggestions.on_this_day.push(memory);
      }
    });

    res.status(200).json({
      status: 'success',
      data: { suggestions }
    });

  } catch (error) {
    console.error('Suggestions error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch suggestions'
    });
  }
});

export default router;