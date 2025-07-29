import mongoose from 'mongoose';

const memorySchema = new mongoose.Schema({
  // Basic memory information
  title: {
    type: String,
    required: [true, 'Memory title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  
  // Photo and file information
  photos: [{
    filename: {
      type: String,
      required: true
    },
    originalName: String,
    url: String,
    size: Number,
    mimeType: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // AI Analysis results
  aiAnalysis: {
    imageInfo: {
      width: Number,
      height: Number,
      channels: Number
    },
    detectedFaces: [{
      confidence: Number,
      boundingBox: {
        x: Number,
        y: Number,
        width: Number,
        height: Number
      },
      recognizedPerson: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FamilyMember'
      }
    }],
    sceneAnalysis: String,
    suggestedTags: [String],
    emotions: [String],
    activities: [String],
    location: {
      detected: String,
      confidence: Number
    }
  },
  
  // Family connections
  familyMembers: [{
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FamilyMember',
      required: true
    },
    role: {
      type: String,
      enum: ['primary', 'secondary', 'mentioned'],
      default: 'secondary'
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 1
    }
  }],
  
  // Memory metadata
  date: {
    type: Date,
    required: [true, 'Memory date is required'],
    index: true
  },
  location: {
    name: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    },
    address: String,
    city: String,
    country: String
  },
  
  // Tags and categorization
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  category: {
    type: String,
    enum: [
      'birthday',
      'wedding',
      'graduation',
      'travel',
      'holiday',
      'everyday',
      'celebration',
      'achievement',
      'family_gathering',
      'education',
      'sports',
      'cultural',
      'religious',
      'other'
    ],
    default: 'everyday'
  },
  
  // Privacy and sharing
  privacy: {
    type: String,
    enum: ['public', 'family', 'private'],
    default: 'family'
  },
  sharedWith: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Memory quality and importance
  importance: {
    type: Number,
    min: 1,
    max: 10,
    default: 5
  },
  qualityScore: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.5
  },
  
  // User interactions
  likes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    likedAt: {
      type: Date,
      default: Date.now
    }
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: [500, 'Comment cannot exceed 500 characters']
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // System fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  // AI suggestions and insights
  aiInsights: {
    memorySuggestions: [String],
    relatedMemories: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Memory'
    }],
    anniversaryDates: [Date],
    recommendedActions: [String]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
memorySchema.index({ date: -1, createdAt: -1 });
memorySchema.index({ 'familyMembers.member': 1 });
memorySchema.index({ tags: 1 });
memorySchema.index({ category: 1 });
memorySchema.index({ 'location.coordinates': '2dsphere' });
memorySchema.index({ createdBy: 1, isActive: 1 });

// Virtual for like count
memorySchema.virtual('likeCount').get(function() {
  return this.likes ? this.likes.length : 0;
});

// Virtual for comment count
memorySchema.virtual('commentCount').get(function() {
  return this.comments ? this.comments.length : 0;
});

// Virtual for primary family member
memorySchema.virtual('primaryFamilyMember').get(function() {
  const primary = this.familyMembers.find(fm => fm.role === 'primary');
  return primary ? primary.member : null;
});

// Pre-save middleware
memorySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Auto-generate title if not provided
  if (!this.title && this.familyMembers.length > 0) {
    const dateStr = this.date.toLocaleDateString();
    this.title = `Family Memory - ${dateStr}`;
  }
  
  // Ensure at least one photo exists
  if (!this.photos || this.photos.length === 0) {
    return next(new Error('Memory must have at least one photo'));
  }
  
  next();
});

// Instance methods
memorySchema.methods.addLike = function(userId) {
  const existingLike = this.likes.find(like => like.user.toString() === userId.toString());
  if (!existingLike) {
    this.likes.push({ user: userId });
    return this.save();
  }
  return Promise.resolve(this);
};

memorySchema.methods.removeLike = function(userId) {
  this.likes = this.likes.filter(like => like.user.toString() !== userId.toString());
  return this.save();
};

memorySchema.methods.addComment = function(userId, text) {
  this.comments.push({ user: userId, text });
  return this.save();
};

memorySchema.methods.isViewableBy = function(userId) {
  if (this.privacy === 'public') return true;
  if (this.privacy === 'private' && this.createdBy.toString() === userId.toString()) return true;
  if (this.privacy === 'family') {
    // Check if user is in the same family (simplified check)
    return this.sharedWith.some(sharedUserId => sharedUserId.toString() === userId.toString()) ||
           this.createdBy.toString() === userId.toString();
  }
  return false;
};

// Static methods
memorySchema.statics.getMemoryTimeline = function(familyMemberId, limit = 50, skip = 0) {
  const query = familyMemberId 
    ? { 'familyMembers.member': familyMemberId, isActive: true }
    : { isActive: true };
    
  return this.find(query)
    .populate('familyMembers.member', 'name arabicName profilePicture')
    .populate('createdBy', 'name email')
    .populate('comments.user', 'name')
    .sort({ date: -1, createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

memorySchema.statics.getMemoriesForDateRange = function(startDate, endDate, familyMemberId = null) {
  const query = {
    date: { $gte: startDate, $lte: endDate },
    isActive: true
  };
  
  if (familyMemberId) {
    query['familyMembers.member'] = familyMemberId;
  }
  
  return this.find(query)
    .populate('familyMembers.member', 'name arabicName')
    .sort({ date: 1 });
};

memorySchema.statics.searchMemories = function({ query, tags, category, familyMember, limit = 20 }) {
  const searchCriteria = { isActive: true };
  
  if (query) {
    searchCriteria.$or = [
      { title: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } },
      { tags: { $in: [new RegExp(query, 'i')] } }
    ];
  }
  
  if (tags && tags.length > 0) {
    searchCriteria.tags = { $in: tags };
  }
  
  if (category) {
    searchCriteria.category = category;
  }
  
  if (familyMember) {
    searchCriteria['familyMembers.member'] = familyMember;
  }
  
  return this.find(searchCriteria)
    .populate('familyMembers.member', 'name arabicName profilePicture')
    .populate('createdBy', 'name')
    .sort({ importance: -1, date: -1 })
    .limit(limit);
};

const Memory = mongoose.model('Memory', memorySchema);

export default Memory;