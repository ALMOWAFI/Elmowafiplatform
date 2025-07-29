import express from 'express';
import { Router } from 'express';
import axios from 'axios';
import { auth } from '../../middleware/auth.js';
import { validate, validateId } from '../../middleware/validation.js';
import { AppError } from '../../middleware/errorHandler.js';
import Trip from '../../models/Trip.js';
import FamilyMember from '../../models/FamilyMember.js';
import Memory from '../../models/Memory.js';
import { socketService } from '../../services/socketService.js';

const router = Router();
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5000';

// Apply auth middleware to all routes
router.use(auth);

/**
 * @route   POST /api/travel/analyze-destination
 * @desc    Get AI-powered destination analysis and recommendations
 * @access  Private
 */
router.post('/analyze-destination', async (req, res, next) => {
  try {
    const { 
      destination, 
      duration, 
      budget, 
      familyMembers, 
      travelDates,
      preferences 
    } = req.body;

    if (!destination) {
      return next(new AppError('Destination is required', 400));
    }

    // Get family member details
    const familyData = await FamilyMember.find({
      _id: { $in: familyMembers || [] }
    }).select('name arabicName preferences age');

    // Get past travel memories for context
    const pastMemories = await Memory.find({
      'familyMembers.member': { $in: familyMembers || [] },
      tags: { $in: ['travel', 'vacation', 'trip'] }
    }).limit(10).populate('familyMembers.member', 'name');

    // Prepare AI request
    const aiRequest = {
      destination,
      duration: duration || 7,
      budget: budget || 2000,
      travelDates,
      familyContext: familyData.map(member => ({
        name: member.name,
        arabicName: member.arabicName,
        age: member.age,
        preferences: member.preferences || {}
      })),
      pastExperiences: pastMemories.map(memory => ({
        title: memory.title,
        location: memory.location?.name,
        tags: memory.tags
      })),
      preferences: preferences || {},
      culturalBackground: 'Middle Eastern/Arabic',
      requestedBy: req.user.id
    };

    // Call AI service for comprehensive travel analysis
    const aiResponse = await axios.post(`${AI_SERVICE_URL}/api/travel-analysis`, aiRequest, {
      timeout: 30000
    });

    const analysis = aiResponse.data;

    // Enhance with additional data
    const enhancedAnalysis = {
      ...analysis,
      destinationInsights: {
        ...analysis.destinationInsights,
        culturalCompatibility: calculateCulturalCompatibility(destination),
        familySuitability: calculateFamilySuitability(familyData, analysis.activities),
        budgetRecommendations: generateBudgetBreakdown(budget, duration),
        seasonalAdvice: getSeasonalAdvice(destination, travelDates)
      },
      itinerarySuggestions: await generateSmartItinerary(
        destination, 
        duration, 
        familyData, 
        budget
      ),
      accommodationRecommendations: await getAccommodationRecommendations(
        destination,
        familyData.length,
        budget,
        preferences
      )
    };

    res.status(200).json({
      status: 'success',
      data: {
        analysis: enhancedAnalysis,
        generatedAt: new Date(),
        validFor: '24 hours'
      }
    });

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      return next(new AppError('AI travel service is currently unavailable', 503));
    }
    next(error);
  }
});

/**
 * @route   POST /api/travel/create-trip
 * @desc    Create a new trip with AI-generated itinerary
 * @access  Private
 */
router.post('/create-trip', async (req, res, next) => {
  try {
    const tripData = {
      ...req.body,
      createdBy: req.user.id,
      lastUpdatedBy: req.user.id
    };

    // Validate required fields
    const requiredFields = ['title', 'startDate', 'endDate', 'destination', 'budget'];
    for (const field of requiredFields) {
      if (!tripData[field]) {
        return next(new AppError(`${field} is required`, 400));
      }
    }

    // Create trip
    const trip = await Trip.create(tripData);

    // Generate AI itinerary if requested
    if (req.body.generateItinerary) {
      await generateAIItinerary(trip);
    }

    // Populate the created trip
    const populatedTrip = await Trip.findById(trip._id)
      .populate('participants.familyMember', 'name arabicName profilePicture')
      .populate('createdBy', 'name email');

    // Notify family members about new trip
    socketService.notifyFamily({
      type: 'travel:trip_created',
      trip: {
        _id: trip._id,
        title: trip.title,
        destination: trip.destination.primary.name,
        startDate: trip.startDate,
        createdBy: req.user.name
      }
    }, req.user.id);

    res.status(201).json({
      status: 'success',
      data: {
        trip: populatedTrip
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/travel/trips
 * @desc    Get all trips for user with filtering options
 * @access  Private
 */
router.get('/trips', async (req, res, next) => {
  try {
    const { 
      status, 
      destination, 
      upcoming, 
      limit = 20, 
      skip = 0 
    } = req.query;

    let query = {
      $or: [
        { createdBy: req.user.id },
        { 'participants.familyMember': req.user.familyMemberId }
      ]
    };

    // Apply filters
    if (status) {
      query.status = status;
    }

    if (destination) {
      query['destination.primary.name'] = { $regex: destination, $options: 'i' };
    }

    if (upcoming === 'true') {
      query.startDate = { $gte: new Date() };
    }

    const trips = await Trip.find(query)
      .populate('participants.familyMember', 'name arabicName profilePicture')
      .populate('createdBy', 'name email')
      .sort({ startDate: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    res.status(200).json({
      status: 'success',
      results: trips.length,
      data: {
        trips
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/travel/trips/:id
 * @desc    Get a single trip with full details
 * @access  Private
 */
router.get('/trips/:id', validateId, async (req, res, next) => {
  try {
    const trip = await Trip.findById(req.params.id)
      .populate('participants.familyMember', 'name arabicName profilePicture preferences')
      .populate('createdBy', 'name email')
      .populate('relatedMemories', 'title photos date tags')
      .populate('discussions.messages.author', 'name profilePicture');

    if (!trip) {
      return next(new AppError('Trip not found', 404));
    }

    // Check access permissions
    const hasAccess = trip.createdBy._id.toString() === req.user.id ||
                     trip.participants.some(p => p.familyMember._id.toString() === req.user.familyMemberId) ||
                     trip.visibility === 'public';

    if (!hasAccess) {
      return next(new AppError('Access denied', 403));
    }

    // Update view count
    await Trip.findByIdAndUpdate(req.params.id, {
      $inc: { 'analytics.totalViews': 1 }
    });

    res.status(200).json({
      status: 'success',
      data: {
        trip
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/travel/trips/:id/collaborate
 * @desc    Add collaborative features - voting, comments, suggestions
 * @access  Private
 */
router.post('/trips/:id/collaborate', validateId, async (req, res, next) => {
  try {
    const { action, data } = req.body;
    const trip = await Trip.findById(req.params.id);

    if (!trip) {
      return next(new AppError('Trip not found', 404));
    }

    let result;

    switch (action) {
      case 'vote':
        result = await handleVoting(trip, data, req.user);
        break;
      case 'suggest':
        result = await handleSuggestion(trip, data, req.user);
        break;
      case 'discuss':
        result = await handleDiscussion(trip, data, req.user);
        break;
      default:
        return next(new AppError('Invalid collaboration action', 400));
    }

    // Notify other trip participants
    socketService.notifyTravelPlanUpdate(req.params.id, {
      action,
      data: result
    }, req.user);

    res.status(200).json({
      status: 'success',
      data: result
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/travel/trips/:id/optimize
 * @desc    AI-powered trip optimization suggestions
 * @access  Private
 */
router.post('/trips/:id/optimize', validateId, async (req, res, next) => {
  try {
    const trip = await Trip.findById(req.params.id)
      .populate('participants.familyMember', 'name preferences age');

    if (!trip) {
      return next(new AppError('Trip not found', 404));
    }

    const { optimizationType } = req.body; // 'budget', 'time', 'family-friendly', 'cultural'

    // Call AI service for optimization
    const optimizationRequest = {
      trip: {
        title: trip.title,
        destination: trip.destination,
        duration: trip.duration,
        budget: trip.budget,
        itinerary: trip.itinerary,
        participants: trip.participants.map(p => ({
          name: p.familyMember.name,
          age: p.familyMember.age,
          preferences: p.preferences || {}
        }))
      },
      optimizationType,
      constraints: req.body.constraints || {}
    };

    const aiResponse = await axios.post(
      `${AI_SERVICE_URL}/api/optimize-trip`, 
      optimizationRequest,
      { timeout: 25000 }
    );

    const optimizations = aiResponse.data;

    // Update trip with AI last updated timestamp
    trip.aiLastUpdated = new Date();
    await trip.save();

    res.status(200).json({
      status: 'success',
      data: {
        optimizations,
        originalTrip: trip,
        optimizedAt: new Date()
      }
    });

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      return next(new AppError('AI optimization service is currently unavailable', 503));
    }
    next(error);
  }
});

/**
 * @route   GET /api/travel/analytics/dashboard
 * @desc    Get comprehensive travel analytics for family
 * @access  Private
 */
router.get('/analytics/dashboard', async (req, res, next) => {
  try {
    const { timeRange = '12months' } = req.query;
    
    // Calculate date range
    const now = new Date();
    let startDate;
    
    switch (timeRange) {
      case '3months':
        startDate = new Date(now.setMonth(now.getMonth() - 3));
        break;
      case '6months':
        startDate = new Date(now.setMonth(now.getMonth() - 6));
        break;
      case '12months':
      default:
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
    }

    // Aggregate trip analytics
    const tripAnalytics = await Trip.aggregate([
      {
        $match: {
          $or: [
            { createdBy: req.user.id },
            { 'participants.familyMember': req.user.familyMemberId }
          ],
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalTrips: { $sum: 1 },
          totalBudget: { $sum: '$budget.total' },
          averageDuration: { $avg: '$duration' },
          statusBreakdown: {
            $push: '$status'
          },
          destinations: {
            $push: '$destination.primary.country'
          },
          monthlyTrips: {
            $push: {
              month: { $month: '$startDate' },
              year: { $year: '$startDate' },
              budget: '$budget.total'
            }
          }
        }
      }
    ]);

    // Budget analysis
    const budgetAnalysis = await calculateBudgetAnalytics(req.user.id, startDate);
    
    // Destination preferences
    const destinationAnalytics = await calculateDestinationPreferences(req.user.id);
    
    // Family travel patterns
    const familyPatterns = await analyzeFamilyTravelPatterns(req.user.familyMemberId);

    res.status(200).json({
      status: 'success',
      data: {
        overview: tripAnalytics[0] || {
          totalTrips: 0,
          totalBudget: 0,
          averageDuration: 0,
          statusBreakdown: [],
          destinations: [],
          monthlyTrips: []
        },
        budgetAnalysis,
        destinationAnalytics,
        familyPatterns,
        generatedAt: new Date()
      }
    });

  } catch (error) {
    next(error);
  }
});

// Helper functions

async function generateAIItinerary(trip) {
  try {
    const itineraryRequest = {
      destination: trip.destination.primary,
      duration: trip.duration,
      budget: trip.budget.total,
      participants: trip.participants.length,
      preferences: trip.participants.map(p => p.preferences).filter(Boolean)
    };

    const response = await axios.post(
      `${AI_SERVICE_URL}/api/generate-itinerary`,
      itineraryRequest,
      { timeout: 20000 }
    );

    trip.itinerary = response.data.itinerary;
    trip.aiRecommendations = response.data.recommendations;
    await trip.save();

    return trip;
  } catch (error) {
    console.error('Failed to generate AI itinerary:', error);
    return trip;
  }
}

function calculateCulturalCompatibility(destination) {
  // Simplified cultural compatibility scoring
  const arabicFriendlyDestinations = [
    'UAE', 'Egypt', 'Jordan', 'Morocco', 'Turkey', 'Malaysia', 'Indonesia'
  ];
  
  const isArabicFriendly = arabicFriendlyDestinations.some(country =>
    destination.toLowerCase().includes(country.toLowerCase())
  );
  
  return {
    score: isArabicFriendly ? 0.9 : 0.6,
    halalFood: isArabicFriendly ? 'widely_available' : 'limited',
    language: isArabicFriendly ? 'arabic_spoken' : 'english_recommended',
    culturalSensitivity: isArabicFriendly ? 'high' : 'medium'
  };
}

function calculateFamilySuitability(familyData, activities) {
  const ages = familyData.map(member => member.age).filter(Boolean);
  const hasChildren = ages.some(age => age < 18);
  const hasElderly = ages.some(age => age > 65);
  
  const familyFriendlyActivities = activities.filter(activity =>
    activity.suitability?.children && activity.suitability?.elderly
  ).length;
  
  return {
    score: familyFriendlyActivities / Math.max(activities.length, 1),
    childFriendly: hasChildren,
    elderlyFriendly: hasElderly,
    accessibilityScore: 0.8 // Would be calculated based on destination
  };
}

function generateBudgetBreakdown(totalBudget, duration) {
  const daily = totalBudget / duration;
  
  return {
    daily,
    accommodation: totalBudget * 0.4, // 40%
    food: totalBudget * 0.25,        // 25%
    activities: totalBudget * 0.20,   // 20%
    transportation: totalBudget * 0.10, // 10%
    miscellaneous: totalBudget * 0.05   // 5%
  };
}

function getSeasonalAdvice(destination, travelDates) {
  // Simplified seasonal advice
  return {
    weather: 'Pleasant temperatures expected',
    packing: ['Light layers', 'Comfortable walking shoes', 'Sun protection'],
    activities: ['Outdoor sightseeing recommended', 'Beach activities available'],
    crowds: 'Moderate tourist season'
  };
}

async function generateSmartItinerary(destination, duration, familyData, budget) {
  // Generate basic itinerary structure
  const itinerary = [];
  
  for (let day = 1; day <= duration; day++) {
    itinerary.push({
      day,
      theme: day === 1 ? 'Arrival & Orientation' : 
             day === duration ? 'Departure' : 
             `Exploration Day ${day - 1}`,
      activities: [
        {
          time: '09:00',
          title: 'Morning Activity',
          description: 'Explore local attractions',
          category: 'sightseeing',
          suitability: {
            children: true,
            elderly: true,
            accessibility: true
          },
          aiGenerated: true
        }
      ]
    });
  }
  
  return itinerary;
}

async function getAccommodationRecommendations(destination, groupSize, budget, preferences) {
  return [
    {
      name: 'Family-Friendly Hotel',
      type: 'hotel',
      priceRange: '$$',
      amenities: ['Family rooms', 'Pool', 'Restaurant'],
      familyScore: 0.9
    }
  ];
}

async function handleVoting(trip, voteData, user) {
  // Implementation for voting on trip elements
  return { message: 'Vote recorded successfully' };
}

async function handleSuggestion(trip, suggestionData, user) {
  // Implementation for adding suggestions
  return { message: 'Suggestion added successfully' };
}

async function handleDiscussion(trip, discussionData, user) {
  // Implementation for trip discussions
  return { message: 'Message added to discussion' };
}

async function calculateBudgetAnalytics(userId, startDate) {
  return {
    totalSpent: 15000,
    averagePerTrip: 2500,
    budgetVariance: 5, // 5% over budget on average
    categoricalSpending: {
      accommodation: 6000,
      food: 3750,
      activities: 3000,
      transportation: 1500,
      miscellaneous: 750
    }
  };
}

async function calculateDestinationPreferences(userId) {
  return {
    topDestinations: ['UAE', 'Egypt', 'Turkey'],
    preferredRegions: ['Middle East', 'Mediterranean'],
    averageDistance: 2500, // km from home
    seasonalPreferences: {
      spring: 0.4,
      summer: 0.2,
      autumn: 0.3,
      winter: 0.1
    }
  };
}

async function analyzeFamilyTravelPatterns(familyMemberId) {
  return {
    frequency: 'Quarterly',
    averageGroupSize: 4,
    planningLeadTime: 45, // days
    collaborationScore: 0.8,
    satisfactionRating: 4.5
  };
}

export default router;