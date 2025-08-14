/**
 * Role-based access control middleware
 * 
 * Usage:
 * import { roles } from './middleware/roles';
 * 
 * // Allow both admin and manager roles
 * router.get('/admin', auth, roles(['admin', 'manager']), adminController);
 * 
 * // Allow only admin role
 * router.delete('/admin/users/:id', auth, roles(['admin']), adminController.deleteUser);
 */

/**
 * Middleware to check if user has required role(s)
 * @param {string[]} allowedRoles - Array of role names that are allowed to access the route
 * @returns {Function} Express middleware function
 */
export const roles = (allowedRoles = []) => {
  return (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({
          status: 'fail',
          message: 'Authentication required.'
        });
      }

      // Check if user has required role
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          status: 'fail',
          message: 'You do not have permission to perform this action.'
        });
      }

      // User has required role, proceed to next middleware
      next();
    } catch (error) {
      console.error('Role check error:', error);
      res.status(500).json({
        status: 'error',
        message: 'An error occurred while checking permissions.'
      });
    }
  };
};

/**
 * Middleware to check if user has any of the specified permissions
 * @param {string[]} requiredPermissions - Array of permission names required to access the route
 * @returns {Function} Express middleware function
 */
export const permissions = (requiredPermissions = []) => {
  return async (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({
          status: 'fail',
          message: 'Authentication required.'
        });
      }

      // In a real application, you would fetch the user's permissions from the database
      // For this example, we'll use a simplified approach
      const userPermissions = await getUserPermissions(req.user.id);
      
      // Check if user has all required permissions
      const hasPermission = requiredPermissions.every(permission => 
        userPermissions.includes(permission)
      );

      if (!hasPermission) {
        return res.status(403).json({
          status: 'fail',
          message: 'Insufficient permissions to perform this action.'
        });
      }

      // User has required permissions, proceed to next middleware
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({
        status: 'error',
        message: 'An error occurred while checking permissions.'
      });
    }
  };
};

// Helper function to get user permissions (example implementation)
async function getUserPermissions(userId) {
  // In a real application, you would fetch this from the database
  // This is a simplified example
  const user = await db.models.User.findByPk(userId, {
    include: [
      {
        model: db.models.Role,
        include: [db.models.Permission]
      }
    ]
  });

  if (!user) return [];
  
  // Flatten permissions from all user roles
  const permissions = [];
  if (user.Roles) {
    user.Roles.forEach(role => {
      if (role.Permissions) {
        role.Permissions.forEach(permission => {
          if (!permissions.includes(permission.name)) {
            permissions.push(permission.name);
          }
        });
      }
    });
  }
  
  return permissions;
}

// Export all middleware functions
export default {
  roles,
  permissions
};
