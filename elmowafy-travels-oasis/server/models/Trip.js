import mongoose from 'mongoose';

const tripSchema = new mongoose.Schema({
  // Basic trip information
  title: {
    type: String,
    required: [true, 'Trip title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  
  // Trip dates and duration
  startDate: {
    type: Date,
    required: [true, 'Start date is required'],
    index: true
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required'],
    validate: {
      validator: function(value) {
        return value > this.startDate;
      },
      message: 'End date must be after start date'
    }
  },
  duration: {
    type: Number, // Duration in days
    required: true
  },
  
  // Destination information
  destination: {
    primary: {
      name: {
        type: String,
        required: true
      },
      country: String,
      city: String,
      coordinates: {
        latitude: Number,
        longitude: Number
      },
      timezone: String
    },
    secondary: [{
      name: String,
      country: String,
      city: String,
      coordinates: {
        latitude: Number,
        longitude: Number
      },
      plannedDays: Number
    }]
  },
  
  // Family participants
  participants: [{
    familyMember: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FamilyMember',
      required: true
    },
    role: {
      type: String,
      enum: ['organizer', 'participant', 'optional'],
      default: 'participant'
    },
    preferences: {
      activities: [String],
      dietary: [String],
      accessibility: [String],
      budget: {
        min: Number,
        max: Number
      }
    },
    confirmed: {
      type: Boolean,
      default: false
    }
  }],
  
  // Budget information
  budget: {
    total: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'USD',
      enum: ['USD', 'EUR', 'GBP', 'AED', 'SAR', 'EGP']
    },
    breakdown: {
      accommodation: {
        budgeted: Number,
        actual: Number,
        percentage: Number
      },
      transportation: {
        budgeted: Number,
        actual: Number,
        percentage: Number
      },
      food: {
        budgeted: Number,
        actual: Number,
        percentage: Number
      },
      activities: {
        budgeted: Number,
        actual: Number,
        percentage: Number
      },
      shopping: {
        budgeted: Number,
        actual: Number,
        percentage: Number
      },
      miscellaneous: {
        budgeted: Number,
        actual: Number,
        percentage: Number
      }
    }
  },
  
  // AI-generated itinerary
  itinerary: [{
    day: {
      type: Number,
      required: true
    },
    date: Date,
    theme: String, // e.g., "Cultural Exploration", "Adventure Day", "Relaxation"
    activities: [{
      time: String, // e.g., "09:00"
      title: {
        type: String,
        required: true
      },
      description: String,
      location: {
        name: String,
        address: String,
        coordinates: {
          latitude: Number,
          longitude: Number
        }
      },
      duration: Number, // in minutes
      cost: {
        estimated: Number,
        actual: Number
      },
      category: {
        type: String,
        enum: ['sightseeing', 'dining', 'shopping', 'entertainment', 'transport', 'accommodation', 'cultural', 'adventure', 'relaxation']
      },
      suitability: {
        children: Boolean,
        elderly: Boolean,
        accessibility: Boolean
      },
      aiGenerated: {
        type: Boolean,
        default: false
      },
      customNotes: String
    }],
    meals: {
      breakfast: {
        restaurant: String,
        cost: Number,
        notes: String
      },
      lunch: {
        restaurant: String,
        cost: Number,
        notes: String
      },
      dinner: {
        restaurant: String,
        cost: Number,
        notes: String
      }
    },
    accommodation: {
      name: String,
      address: String,
      checkIn: String,
      checkOut: String,
      cost: Number
    }
  }],
  
  // AI recommendations and insights
  aiRecommendations: {
    destinations: [{
      name: String,
      reasoning: String,
      score: Number, // 0-1
      pros: [String],
      cons: [String]
    }],
    activities: [{
      title: String,
      description: String,
      location: String,
      cost: Number,
      duration: Number,
      suitabilityScore: Number,
      reasons: [String]
    }],
    restaurants: [{
      name: String,
      cuisine: String,
      priceRange: String,
      rating: Number,
      specialties: [String],
      familyFriendly: Boolean
    }],
    accommodations: [{
      name: String,
      type: String, // hotel, apartment, resort
      priceRange: String,
      amenities: [String],
      familyScore: Number
    }],
    transportation: [{
      type: String, // flight, car, train, bus
      pros: [String],
      cons: [String],
      estimatedCost: Number
    }],
    culturalTips: [String],
    weatherInsights: {
      general: String,
      packing: [String],
      activities: [String]
    },
    budgetOptimization: {
      suggestions: [String],
      potentialSavings: Number,
      splurgeWorthyItems: [String]
    }
  },
  
  // Trip status and metadata
  status: {
    type: String,
    enum: ['planning', 'confirmed', 'active', 'completed', 'cancelled'],
    default: 'planning'
  },
  visibility: {
    type: String,
    enum: ['public', 'family', 'private'],
    default: 'family'
  },
  tags: [String],
  
  // Collaboration features
  votes: [{
    item: String, // activity, restaurant, etc.
    votes: [{
      participant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FamilyMember'
      },
      vote: {
        type: String,
        enum: ['yes', 'no', 'maybe']
      },
      comment: String
    }],
    decision: {
      type: String,
      enum: ['approved', 'rejected', 'pending']
    }
  }],
  
  discussions: [{
    topic: String,
    messages: [{
      author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FamilyMember'
      },
      message: String,
      timestamp: {
        type: Date,
        default: Date.now
      },
      reactions: [{
        emoji: String,
        users: [{
          type: mongoose.Schema.Types.ObjectId,
          ref: 'FamilyMember'
        }]
      }]
    }]
  }],
  
  // Connected memories and experiences
  relatedMemories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Memory'
  }],
  inspiration: {
    pastTrips: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip'
    }],
    familyMemories: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Memory'
    }]
  },
  
  // System fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  aiLastUpdated: {
    type: Date,
    default: Date.now
  },
  
  // Analytics and insights
  analytics: {
    totalViews: {
      type: Number,
      default: 0
    },
    collaborationScore: Number, // How much family participated
    satisfactionRating: Number, // Post-trip rating
    actualVsBudget: {
      variance: Number,
      category: String // under/over/on-budget
    },
    recommendationAccuracy: {
      activities: Number,
      restaurants: Number,
      overall: Number
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
tripSchema.index({ startDate: 1, endDate: 1 });
tripSchema.index({ 'participants.familyMember': 1 });
tripSchema.index({ createdBy: 1, status: 1 });
tripSchema.index({ 'destination.primary.name': 'text', title: 'text' });
tripSchema.index({ status: 1, visibility: 1 });

// Virtual for trip duration calculation
tripSchema.virtual('calculatedDuration').get(function() {
  if (this.startDate && this.endDate) {
    const diffTime = Math.abs(this.endDate - this.startDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  return 0;
});

// Virtual for budget utilization
tripSchema.virtual('budgetUtilization').get(function() {
  if (!this.budget.breakdown) return 0;
  
  const totalBudgeted = Object.values(this.budget.breakdown)
    .reduce((sum, category) => sum + (category.budgeted || 0), 0);
  const totalActual = Object.values(this.budget.breakdown)
    .reduce((sum, category) => sum + (category.actual || 0), 0);
    
  return totalBudgeted > 0 ? (totalActual / totalBudgeted) * 100 : 0;
});

// Virtual for participation rate
tripSchema.virtual('participationRate').get(function() {
  const confirmed = this.participants.filter(p => p.confirmed).length;
  return this.participants.length > 0 ? (confirmed / this.participants.length) * 100 : 0;
});

// Pre-save middleware
tripSchema.pre('save', function(next) {
  // Calculate duration
  if (this.startDate && this.endDate) {
    const diffTime = Math.abs(this.endDate - this.startDate);
    this.duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  
  // Update budget percentages
  if (this.budget && this.budget.breakdown && this.budget.total) {
    Object.keys(this.budget.breakdown).forEach(category => {
      const categoryData = this.budget.breakdown[category];
      if (categoryData.budgeted) {
        categoryData.percentage = (categoryData.budgeted / this.budget.total) * 100;
      }
    });
  }
  
  next();
});

// Instance methods
tripSchema.methods.addParticipant = function(familyMemberId, role = 'participant') {
  const existingParticipant = this.participants.find(p => 
    p.familyMember.toString() === familyMemberId.toString()
  );
  
  if (!existingParticipant) {
    this.participants.push({
      familyMember: familyMemberId,
      role: role
    });
    return this.save();
  }
  
  return Promise.resolve(this);
};

tripSchema.methods.updateBudgetActual = function(category, amount) {
  if (this.budget.breakdown[category]) {
    this.budget.breakdown[category].actual = 
      (this.budget.breakdown[category].actual || 0) + amount;
    return this.save();
  }
  return Promise.resolve(this);
};

tripSchema.methods.generateAIItinerary = async function() {
  // This would integrate with AI service to generate itinerary
  console.log('Generating AI itinerary for trip:', this.title);
  return this;
};

// Static methods
tripSchema.statics.findUpcomingTrips = function(familyMemberId, limit = 10) {
  return this.find({
    'participants.familyMember': familyMemberId,
    startDate: { $gte: new Date() },
    status: { $in: ['planning', 'confirmed'] }
  })
  .populate('participants.familyMember', 'name arabicName profilePicture')
  .populate('createdBy', 'name email')
  .sort({ startDate: 1 })
  .limit(limit);
};

tripSchema.statics.findTripsByDestination = function(destination, limit = 10) {
  return this.find({
    $or: [
      { 'destination.primary.name': { $regex: destination, $options: 'i' } },
      { 'destination.primary.city': { $regex: destination, $options: 'i' } },
      { 'destination.primary.country': { $regex: destination, $options: 'i' } }
    ]
  })
  .populate('participants.familyMember', 'name arabicName')
  .sort({ createdAt: -1 })
  .limit(limit);
};

tripSchema.statics.getAnalytics = function(familyMemberId) {
  return this.aggregate([
    { $match: { 'participants.familyMember': familyMemberId } },
    {
      $group: {
        _id: null,
        totalTrips: { $sum: 1 },
        totalBudget: { $sum: '$budget.total' },
        averageDuration: { $avg: '$duration' },
        statusCounts: {
          $push: '$status'
        },
        destinationCounts: {
          $push: '$destination.primary.country'
        }
      }
    }
  ]);
};

const Trip = mongoose.model('Trip', tripSchema);

export default Trip;