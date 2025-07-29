import express from 'express';
import { Router } from 'express';
const router = Router();
import { auth, restrictTo } from '../../middleware/auth.js';
import { validate, validateId, validateFamilyMember } from '../../middleware/validation.js';
import { AppError } from '../../middleware/errorHandler.js';
import FamilyMember from '../../models/FamilyMember.js';

// Apply auth middleware to all routes
router.use(auth);

/**
 * @route   GET /api/family
 * @desc    Get all family members with populated relationships
 * @access  Private
 */
router.get('/', async (req, res, next) => {
  try {
    const members = await FamilyMember.find({ isActive: true })
      .populate('parents', 'name arabicName profilePicture')
      .populate('spouse', 'name arabicName profilePicture')
      .populate('children', 'name arabicName profilePicture')
      .sort({ dob: 1 });

    res.status(200).json({
      status: 'success',
      results: members.length,
      data: {
        members
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   GET /api/family/:id
 * @desc    Get a single family member by ID
 * @access  Private
 */
router.get('/:id', validateId, async (req, res, next) => {
  try {
    const member = await FamilyMember.findById(req.params.id)
      .populate('parents', 'name arabicName profilePicture')
      .populate('spouse', 'name arabicName profilePicture')
      .populate('children', 'name arabicName profilePicture');

    if (!member || !member.isActive) {
      return next(new AppError('No family member found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        member
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   POST /api/family
 * @desc    Create a new family member
 * @access  Private/Admin
 */
router.post(
  '/',
  restrictTo('admin'),
  validateFamilyMember,
  validate,
  async (req, res, next) => {
    try {
      // Prevent setting isActive to false on creation
      if (req.body.isActive === false) {
        delete req.body.isActive;
      }

      // Check for duplicate names
      const existingMember = await FamilyMember.findOne({
        $or: [
          { name: req.body.name },
          { arabicName: req.body.arabicName }
        ]
      });

      if (existingMember) {
        return next(new AppError('A family member with this name already exists', 400));
      }

      const newMember = await FamilyMember.create(req.body);

      // Update relationships if needed
      await updateRelationships(newMember);

      res.status(201).json({
        status: 'success',
        data: {
          member: newMember
        }
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @route   PATCH /api/family/:id
 * @desc    Update a family member
 * @access  Private/Admin
 */
router.patch(
  '/:id',
  validateId,
  restrictTo('admin'),
  validateFamilyMember,
  validate,
  async (req, res, next) => {
    try {
      // Prevent changing isActive status through this endpoint
      if ('isActive' in req.body) {
        delete req.body.isActive;
      }

      const member = await FamilyMember.findByIdAndUpdate(
        req.params.id,
        req.body,
        {
          new: true,
          runValidators: true,
          context: 'query'
        }
      );

      if (!member) {
        return next(new AppError('No family member found with that ID', 404));
      }

      // Update relationships if needed
      await updateRelationships(member);

      res.status(200).json({
        status: 'success',
        data: {
          member
        }
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @route   DELETE /api/family/:id
 * @desc    Soft delete a family member (set isActive to false)
 * @access  Private/Admin
 */
router.delete(
  '/:id',
  validateId,
  restrictTo('admin'),
  async (req, res, next) => {
    try {
      const member = await FamilyMember.findByIdAndUpdate(
        req.params.id,
        { isActive: false },
        { new: true }
      );

      if (!member) {
        return next(new AppError('No family member found with that ID', 404));
      }

      res.status(204).json({
        status: 'success',
        data: null
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Helper function to update relationships when a family member is created or updated
 */
const updateRelationships = async (member) => {
  // Update parents' children references
  if (member.parents && member.parents.length > 0) {
    await FamilyMember.updateMany(
      { _id: { $in: member.parents } },
      { $addToSet: { children: member._id } }
    );
  }

  // Update spouse's spouse reference
  if (member.spouse) {
    await FamilyMember.findByIdAndUpdate(
      member.spouse,
      { $set: { spouse: member._id } },
      { new: true, runValidators: true }
    );
  }

  // Update children's parents references
  if (member.children && member.children.length > 0) {
    await FamilyMember.updateMany(
      { _id: { $in: member.children } },
      { 
        $addToSet: { parents: member._id },
        $set: { lastUpdated: Date.now() }
      }
    );
  }
};

export default router;
