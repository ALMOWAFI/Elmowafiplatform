import express from 'express';
import { roles } from '../../../middleware/roles.js';
import { auth } from '../../../middleware/auth.js';

export const router = express.Router();

// All routes in this file require authentication
router.use(auth);

/**
 * @route   GET /api/v1/admin/dashboard
 * @desc    Admin dashboard - accessible only by admins
 * @access  Private/Admin
 */
router.get('/dashboard', roles(['admin']), (req, res) => {
  res.status(200).json({
    status: 'success',
    data: {
      message: 'Welcome to the admin dashboard!',
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role
      }
    }
  });
});

/**
 * @route   GET /api/v1/admin/users
 * @desc    Get all users - accessible by admins and managers
 * @access  Private/Admin,Manager
 */
router.get('/users', roles(['admin', 'manager']), async (req, res) => {
  try {
    const users = await db.models.User.findAll({
      attributes: { exclude: ['password'] }, // Don't return passwords
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      status: 'success',
      results: users.length,
      data: { users }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching users.'
    });
  }
});

/**
 * @route   DELETE /api/v1/admin/users/:id
 * @desc    Delete a user - accessible only by admins
 * @access  Private/Admin
 */
router.delete('/users/:id', roles(['admin']), async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Prevent users from deleting themselves
    if (userId === req.user.id) {
      return res.status(400).json({
        status: 'fail',
        message: 'You cannot delete your own account.'
      });
    }

    const result = await db.models.User.destroy({
      where: { id: userId }
    });

    if (result === 0) {
      return res.status(404).json({
        status: 'fail',
        message: 'No user found with that ID.'
      });
    }

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while deleting the user.'
    });
  }
});

export default router;
