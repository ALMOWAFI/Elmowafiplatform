import express from 'express';
import { 
  register, 
  login, 
  refreshToken, 
  logout, 
  getMe, 
  updatePassword 
} from '../../../controllers/authController.js';
import { auth } from '../../../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/refresh-token', refreshToken);
router.post('/logout', logout);

// Protected routes (require authentication)
router.use(auth); // All routes below this will require authentication

router.get('/me', getMe);
router.patch('/update-password', updatePassword);

export default router;
