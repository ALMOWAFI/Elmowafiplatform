import { body, query, param } from 'express-validator';

export const validateTravelRecommendations = [
  // Validate destination
  body('destination')
    .trim()
    .notEmpty()
    .withMessage('Destination is required')
    .isString()
    .withMessage('Destination must be a string')
    .isLength({ min: 2, max: 100 })
    .withMessage('Destination must be between 2 and 100 characters'),

  // Validate budget
  body('budget')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('Budget must be a positive number'),

  // Validate duration
  body('duration')
    .isInt({ min: 1, max: 90 })
    .withMessage('Duration must be between 1 and 90 days'),

  // Validate family members
  body('familyMembers')
    .optional()
    .isArray()
    .withMessage('Family members must be an array')
    .custom((value) => {
      if (!value.every(Number.isInteger)) {
        throw new Error('All family member IDs must be integers');
      }
      return true;
    }),

  // Validate preferences
  body('preferences')
    .optional()
    .isObject()
    .withMessage('Preferences must be an object'),

  // Validate preferences.interests if provided
  body('preferences.interests')
    .optional()
    .isArray()
    .withMessage('Interests must be an array')
    .custom((value) => {
      if (value && !value.every(item => typeof item === 'string')) {
        throw new Error('All interests must be strings');
      }
      return true;
    }),

  // Validate preferences.accessibilityNeeds if provided
  body('preferences.accessibilityNeeds')
    .optional()
    .isArray()
    .withMessage('Accessibility needs must be an array'),

  // Validate preferences.budgetRange if provided
  body('preferences.budgetRange')
    .optional()
    .isObject()
    .withMessage('Budget range must be an object')
    .custom((value) => {
      if (value && (value.min === undefined || value.max === undefined)) {
        throw new Error('Budget range must have min and max values');
      }
      if (value && (value.min < 0 || value.max < 0)) {
        throw new Error('Budget range values must be positive');
      }
      if (value && value.min > value.max) {
        throw new Error('Min budget cannot be greater than max budget');
      }
      return true;
    })
];

// Middleware to check if user has access to specified family members
export const checkFamilyMemberAccess = async (req, res, next) => {
  try {
    const { familyMembers } = req.body;
    
    if (!familyMembers || familyMembers.length === 0) {
      return next();
    }

    // Get the user's family group ID
    const user = await db.models.User.findByPk(req.user.id, {
      attributes: ['family_group_id']
    });

    if (!user.family_group_id) {
      return res.status(403).json({
        status: 'fail',
        message: 'You need to be part of a family group to access family member preferences'
      });
    }

    // Check if all family members belong to the user's family group
    const memberCount = await db.models.FamilyMember.count({
      where: {
        id: familyMembers,
        family_group_id: user.family_group_id
      }
    });

    if (memberCount !== familyMembers.length) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have access to one or more specified family members'
      });
    }

    next();
  } catch (error) {
    console.error('Error in checkFamilyMemberAccess:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while validating family member access'
    });
  }
};
