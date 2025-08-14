import { validationResult } from 'express-validator';
import OpenAI from 'openai';
import db from '../config/database.js';
import { auth } from '../middleware/auth.js';

// Initialize OpenAI client with configuration from environment
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  maxRetries: 3, // Add retry logic for transient errors
  timeout: 30000, // 30 second timeout
});

// AI Configuration from environment
const AI_CONFIG = {
  model: process.env.OPENAI_MODEL || 'gpt-4',
  maxTokens: parseInt(process.env.AI_MAX_TOKENS) || 2000,
  temperature: parseFloat(process.env.AI_TEMPERATURE) || 0.7,
  maxRetries: 3,
  timeout: 30000 // 30 seconds
};

// Cache duration in seconds (1 hour)
const CACHE_DURATION = 60 * 60;

/**
 * @route   POST /api/v1/ai/travel-recommendations
 * @desc    Get AI-powered travel recommendations
 * @access  Private
 */
export const getTravelRecommendations = async (req, res) => {
  try {
    // Input validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'fail',
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const { destination, budget, duration, familyMembers, preferences } = req.body;
    const userId = req.user.id;

    // Create a cache key based on the request parameters
    const cacheKey = `rec:${userId}:${JSON.stringify({
      destination,
      budget,
      duration,
      familyMembers: familyMembers?.length || 0,
      preferences: Object.keys(preferences || {}).sort()
    })}`;

    // Try to get cached results
    try {
      const cachedResult = await db.redis.get(cacheKey);
      if (cachedResult) {
        return res.status(200).json({
          status: 'success',
          fromCache: true,
          data: JSON.parse(cachedResult)
        });
      }
    } catch (cacheError) {
      console.error('Cache read error:', cacheError);
      // Continue with generating new recommendations if cache read fails
    }

    // Get user preferences from database if not provided
    let userPreferences = preferences;
    if (!userPreferences) {
      const prefRecord = await db.models.TravelPreference.findOne({
        where: { user_id: userId }
      });
      
      if (prefRecord) {
        userPreferences = {
          ...(prefRecord.preferred_destinations && { preferredDestinations: prefRecord.preferred_destinations }),
          ...(prefRecord.budget_range && { budgetRange: prefRecord.budget_range }),
          ...(prefRecord.preferred_accommodation && { accommodation: prefRecord.preferred_accommodation }),
          ...(prefRecord.travel_pace && { pace: prefRecord.travel_pace }),
          ...(prefRecord.interests && { interests: prefRecord.interests }),
          ...(prefRecord.accessibility_needs && { accessibility: prefRecord.accessibility_needs })
        };
      }
    }

    // Get family members' preferences if familyMembers is provided
    let familyPreferences = [];
    if (familyMembers && familyMembers.length > 0) {
      familyPreferences = await db.models.FamilyMember.findAll({
        where: {
          id: familyMembers,
          family_group_id: req.user.familyGroupId // Ensure user has access to these family members
        },
        include: [
          {
            model: db.models.TravelPreference,
            as: 'preferences'
          }
        ]
      });
    }

    // TODO: Integrate with actual AI service
    // This is a placeholder for the AI recommendation logic
    const recommendations = await generateAIRecommendations({
      destination,
      budget,
      duration,
      userPreferences,
      familyPreferences
    });

    // Cache the results
    try {
      await db.redis.setex(
        cacheKey,
        CACHE_DURATION,
        JSON.stringify(recommendations)
      );
    } catch (cacheError) {
      console.error('Cache write error:', cacheError);
      // Continue even if cache write fails
    }

    res.status(200).json({
      status: 'success',
      fromCache: false,
      data: recommendations
    });

  } catch (error) {
    console.error('Error in getTravelRecommendations:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while generating travel recommendations.'
    });
  }
};

/**
 * Generate AI-powered travel recommendations using OpenAI
 */
async function generateAIRecommendations({ destination, budget, duration, userPreferences, familyPreferences }) {
  try {
    // Prepare the prompt for the AI
    const prompt = buildAIPrompt({
      destination,
      budget,
      duration,
      userPreferences,
      familyPreferences
    });

    // Call OpenAI API with retry logic
    let completion;
    let lastError;
    
    for (let attempt = 1; attempt <= AI_CONFIG.maxRetries; attempt++) {
      try {
        completion = await Promise.race([
          openai.chat.completions.create({
            model: AI_CONFIG.model,
            messages: [
              {
                role: 'system',
                content: 'You are a helpful travel assistant that provides detailed, personalized travel recommendations.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: AI_CONFIG.temperature,
            max_tokens: AI_CONFIG.maxTokens
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), AI_CONFIG.timeout)
          )
        ]);
        lastError = null;
        break; // Exit retry loop on success
      } catch (error) {
        lastError = error;
        console.warn(`AI API attempt ${attempt} failed:`, error.message);
        if (attempt < AI_CONFIG.maxRetries) {
          // Exponential backoff: 1s, 2s, 4s, etc.
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
        }
      }
    }
    
    if (lastError) {
      throw new Error(`Failed to get AI response after ${AI_CONFIG.maxRetries} attempts: ${lastError.message}`);
    }

    // Parse the AI response
    const aiResponse = completion.choices[0]?.message?.content;
    if (!aiResponse) {
      throw new Error('No response from AI service');
    }

    // Parse the JSON response
    const recommendations = JSON.parse(aiResponse);
    
    // Validate and format the response
    return formatRecommendations(recommendations, {
      destination,
      budget,
      duration
    });
  } catch (error) {
    console.error('Error in generateAIRecommendations:', error);
    throw new Error('Failed to generate travel recommendations. Please try again later.');
  }
}

/**
 * Build a detailed prompt for the AI
 */
function buildAIPrompt({ destination, budget, duration, userPreferences, familyPreferences }) {
  let prompt = `Generate a detailed travel itinerary for a trip to ${destination} `;
  prompt += `for ${duration} days with a budget of ${budget}. `;
  
  if (userPreferences) {
    prompt += 'User preferences: ' + JSON.stringify(userPreferences) + '. ';
  }
  
  if (familyPreferences && familyPreferences.length > 0) {
    prompt += 'Family preferences: ' + JSON.stringify(familyPreferences) + '. ';
  }
  
  prompt += `
  Please provide a response in the following JSON format:
  {
    "destination": {
      "name": "string",
      "description": "string",
      "bestTimeToVisit": "string",
      "timeZone": "string"
    },
    "itinerary": [
      {
        "day": "number",
        "date": "string (YYYY-MM-DD)",
        "activities": [
          {
            "time": "string (HH:MM)",
            "name": "string",
            "description": "string",
            "duration": "number (in hours)",
            "cost": "number (in local currency)",
            "category": "string (sightseeing, food, adventure, etc.)",
            "familyFriendly": "boolean",
            "location": {
              "name": "string",
              "address": "string",
              "coordinates": {
                "lat": "number",
                "lng": "number"
              }
            },
            "bookingRequired": "boolean",
            "bookingLink": "string (URL)",
            "tips": "string"
          }
        ]
      }
    ],
    "accommodations": [
      {
        "name": "string",
        "type": "string (hotel, apartment, hostel, etc.)",
        "description": "string",
        "pricePerNight": "number",
        "rating": "number (1-5)",
        "familyFriendly": "boolean",
        "amenities": ["string"],
        "location": {
          "address": "string",
          "coordinates": {
            "lat": "number",
            "lng": "number"
          },
          "distanceFromCenter": "string"
        },
        "bookingLink": "string (URL)",
        "photos": ["string (URLs)"]
      }
    ],
    "transportation": [
      {
        "type": "string (flight, train, bus, etc.)",
        "from": "string",
        "to": "string",
        "departureTime": "string (ISO date)",
        "arrivalTime": "string (ISO date)",
        "duration": "string (e.g., '2h 30m')",
        "cost": "number",
        "bookingLink": "string (URL)",
        "tips": "string"
      }
    ],
    "diningRecommendations": [
      {
        "name": "string",
        "cuisine": "string",
        "priceRange": "string (e.g., '$$$')",
        "rating": "number (1-5)",
        "address": "string",
        "recommendedDishes": ["string"],
        "reservationRequired": "boolean",
        "reservationLink": "string (URL)",
        "familyFriendly": "boolean"
      }
    ],
    "totalEstimatedCost": {
      "amount": "number",
      "currency": "string (e.g., 'USD')",
      "breakdown": {
        "accommodation": "number",
        "activities": "number",
        "food": "number",
        "transportation": "number",
        "miscellaneous": "number"
      }
    },
    "packingList": {
      "essentials": ["string"],
      "clothing": ["string"],
      "documents": ["string"],
      "electronics": ["string"],
      "toiletries": ["string"],
      "seasonalItems": ["string"]
    },
    "safetyTips": ["string"],
    "localCustoms": ["string"],
    "emergencyContacts": [
      {
        "name": "string",
        "phone": "string",
        "type": "string (police, ambulance, embassy, etc.)"
      }
    ],
    "additionalTips": "string"
  }
  `;

  return prompt;
}

/**
 * Format and validate the AI response
 */
function formatRecommendations(recommendations, { destination, budget, duration }) {
  // Ensure all required fields are present
  const requiredFields = ['itinerary', 'accommodations', 'totalEstimatedCost'];
  const missingFields = requiredFields.filter(field => !recommendations[field]);
  
  if (missingFields.length > 0) {
    throw new Error(`Missing required fields in AI response: ${missingFields.join(', ')}`);
  }

  // Set default values if not provided
  if (!recommendations.destination) {
    recommendations.destination = {
      name: destination,
      description: `Your destination for a ${duration}-day trip`
    };
  }

  if (!recommendations.totalEstimatedCost.currency) {
    recommendations.totalEstimatedCost.currency = 'USD';
  }

  // Format dates in the itinerary
  if (recommendations.itinerary && Array.isArray(recommendations.itinerary)) {
    const startDate = new Date();
    recommendations.itinerary.forEach((day, index) => {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + index);
      day.date = currentDate.toISOString().split('T')[0];
      day.day = index + 1;
    });
  }

  return recommendations;
}

// Save travel preferences
// ... (additional AI-related controller functions can be added here)
