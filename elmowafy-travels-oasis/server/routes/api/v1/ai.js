import express from 'express';
import { body } from 'express-validator';
import { auth } from '../../../middleware/auth.js';
import { roles } from '../../../middleware/roles.js';
import { validateTravelRecommendations, checkFamilyMemberAccess } from '../../../middleware/validators/aiValidators.js';
import { getTravelRecommendations } from '../../../controllers/aiController.js';

const router = express.Router();

// All routes in this file require authentication
router.use(auth);

/**
 * @route   POST /api/v1/ai/travel-recommendations
 * @desc    Get AI-powered travel recommendations
 * @access  Private
 * @body    {string} destination - Destination name
 * @body    {number} [budget] - Optional budget amount
 * @body    {number} duration - Trip duration in days (1-90)
 * @body    {number[]} [familyMembers] - Optional array of family member IDs
 * @body    {Object} [preferences] - User preferences
 * @returns {Object} 200 - Travel recommendations
 * @returns {Error}  400 - Invalid input
 * @returns {Error}  401 - Unauthorized
 * @returns {Error}  500 - Server error
 */
router.post(
  '/travel-recommendations',
  [
    ...validateTravelRecommendations,
    checkFamilyMemberAccess
  ],
  getTravelRecommendations
);

// Add more AI-related routes here as needed
// Example:
// router.post('/itinerary/generate', validateItineraryInput, generateItinerary);
// router.post('/suggestions/activities', validateActivityInput, getActivitySuggestions);

export default router;
