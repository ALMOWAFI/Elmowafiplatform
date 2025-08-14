import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

// In-memory user storage for testing (replace with actual database later)
const users = [];

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '90d',
  });
};

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, passwordConfirm } = req.body;
    if (!name || !email || !password || !passwordConfirm) {
      return res.status(400).json({ status: 'fail', message: 'All fields are required.' });
    }
    if (password !== passwordConfirm) {
      return res.status(400).json({ status: 'fail', message: 'Passwords do not match.' });
    }
    
    // Check if user already exists
    const existingUser = users.find(user => user.email === email);
    if (existingUser) {
      return res.status(400).json({ status: 'fail', message: 'Email already in use.' });
    }
    
    // Create new user
    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = {
      id: uuidv4(),
      name,
      email,
      password: hashedPassword,
      role: 'user',
      createdAt: new Date()
    };
    
    users.push(newUser);
    
    const token = signToken(newUser.id);
    res.status(201).json({
      status: 'success',
      accessToken: token,
      data: { user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role } }
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ status: 'fail', message: 'Email and password are required.' });
    }
    
    // Find user
    const user = users.find(user => user.email === email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ status: 'fail', message: 'Incorrect email or password.' });
    }
    
    const token = signToken(user.id);
    res.status(200).json({
      status: 'success',
      accessToken: token,
      data: { user: { id: user.id, name: user.name, email: user.email, role: user.role } }
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Get current authenticated user's profile
import { auth } from '../../middleware/auth.js';

router.get('/me', auth, async (req, res) => {
  try {
    // req.user is set by the auth middleware
    const user = req.user;
    if (!user) {
      return res.status(404).json({ status: 'fail', message: 'User not found.' });
    }
    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          dateOfBirth: user.dateOfBirth,
          phone: user.phone,
          location: user.location,
          bio: user.bio,
          avatar: user.avatar,
          familyRole: user.familyRole,
          joinedDate: user.joinedDate,
          preferences: user.preferences
        }
      }
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

export default router;
