import { body, param, validationResult } from 'express-validator';
import { AppError } from './errorHandler.js';

// Common validation rules
export const validateFamilyMember = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2-50 characters')
    .matches(/^[a-zA-Z\s'-]+$/).withMessage('Name contains invalid characters'),
    
  body('arabicName')
    .trim()
    .notEmpty().withMessage('Arabic name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Arabic name must be between 2-50 characters')
    .matches(/^[\u0600-\u06FF\s]+$/).withMessage('Arabic name must contain only Arabic characters'),
    
  body('gender')
    .isIn(['Male', 'Female']).withMessage('Gender must be either Male or Female'),
    
  body('dob')
    .optional({ checkFalsy: true })
    .isISO8601().withMessage('Invalid date format. Use YYYY-MM-DD')
    .custom((value) => {
      const dob = new Date(value);
      const today = new Date();
      if (dob > today) {
        throw new Error('Date of birth cannot be in the future');
      }
      return true;
    }),
    
  body('profilePicture')
    .optional({ checkFalsy: true })
    .isURL().withMessage('Profile picture must be a valid URL')
    .matches(/\.(jpeg|jpg|gif|png)$/).withMessage('Profile picture must be a valid image URL'),
    
  body('bio')
    .optional()
    .isLength({ max: 1000 }).withMessage('Bio cannot exceed 1000 characters'),
    
  body('arabicBio')
    .optional()
    .isLength({ max: 1000 }).withMessage('Arabic bio cannot exceed 1000 characters'),
    
  body('parents')
    .optional()
    .isArray({ max: 2 }).withMessage('A family member can have at most 2 parents'),
    
  body('spouse')
    .optional()
    .isMongoId().withMessage('Invalid spouse ID format'),
    
  body('children')
    .optional()
    .isArray()
];

// ID validation
export const validateId = [
  param('id')
    .isMongoId().withMessage('Invalid ID format')
];

// Validation result handler
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const message = errors.array().map(err => err.msg).join('. ');
    return next(new AppError(message, 400));
  }
  next();
};
