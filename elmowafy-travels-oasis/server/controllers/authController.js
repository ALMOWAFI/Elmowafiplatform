import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { promisify } from 'util';
import db from '../config/database.js';
import { Op } from 'sequelize';

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m', // Shorter expiry for access token
  });
};

const createRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d', // Longer expiry for refresh token
  });
};

// Store refresh tokens in Redis with expiry
const storeRefreshToken = async (userId, token) => {
  try {
    await db.redis.set(`refresh_token:${userId}`, token, 'EX', 60 * 60 * 24 * 7); // 7 days expiry
    return true;
  } catch (error) {
    console.error('Error storing refresh token:', error);
    return false;
  }
};

// Verify refresh token and check if it exists in Redis
const verifyRefreshToken = async (userId, token) => {
  try {
    const storedToken = await db.redis.get(`refresh_token:${userId}`);
    return storedToken === token;
  } catch (error) {
    console.error('Error verifying refresh token:', error);
    return false;
  }
};

export const register = async (req, res) => {
  try {
    const { name, email, password, passwordConfirm } = req.body;
    
    // Input validation
    if (!name || !email || !password || !passwordConfirm) {
      return res.status(400).json({ 
        status: 'fail', 
        message: 'All fields are required.' 
      });
    }
    
    if (password !== passwordConfirm) {
      return res.status(400).json({ 
        status: 'fail', 
        message: 'Passwords do not match.' 
      });
    }

    // Check if user exists
    const existingUser = await db.models.User.findOne({ 
      where: { email } 
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        status: 'fail', 
        message: 'Email already in use.' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Create user
    const newUser = await db.models.User.create({
      name,
      email,
      password: hashedPassword,
      role: 'user', // Default role
    });

    // Generate tokens
    const accessToken = signToken(newUser.id);
    const refreshToken = createRefreshToken(newUser.id);
    
    // Store refresh token in Redis
    await storeRefreshToken(newUser.id, refreshToken);

    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Don't send password in response
    newUser.password = undefined;

    res.status(201).json({
      status: 'success',
      accessToken,
      data: { 
        user: { 
          id: newUser.id, 
          name: newUser.name, 
          email: newUser.email,
          role: newUser.role
        } 
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'An error occurred during registration.' 
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Input validation
    if (!email || !password) {
      return res.status(400).json({ 
        status: 'fail', 
        message: 'Email and password are required.' 
      });
    }

    // Find user with password
    const user = await db.models.User.findOne({ 
      where: { email },
      attributes: { include: ['password'] } // Include password for verification
    });

    // Check if user exists and password is correct
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ 
        status: 'fail', 
        message: 'Incorrect email or password.' 
      });
    }

    // Generate tokens
    const accessToken = signToken(user.id);
    const refreshToken = createRefreshToken(user.id);
    
    // Store refresh token in Redis
    await storeRefreshToken(user.id, refreshToken);

    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Don't send password in response
    user.password = undefined;

    res.status(200).json({
      status: 'success',
      accessToken,
      data: { 
        user: { 
          id: user.id, 
          name: user.name, 
          email: user.email,
          role: user.role
        } 
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'An error occurred during login.' 
    });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
    
    if (!refreshToken) {
      return res.status(401).json({ 
        status: 'fail', 
        message: 'No refresh token provided.' 
      });
    }

    // Verify refresh token
    const decoded = await promisify(jwt.verify)(
      refreshToken, 
      process.env.JWT_REFRESH_SECRET
    );

    // Check if refresh token exists in Redis
    const isValid = await verifyRefreshToken(decoded.id, refreshToken);
    if (!isValid) {
      return res.status(403).json({ 
        status: 'fail', 
        message: 'Invalid refresh token.' 
      });
    }

    // Generate new access token
    const accessToken = signToken(decoded.id);
    
    // Generate new refresh token (optional: implement token rotation)
    const newRefreshToken = createRefreshToken(decoded.id);
    await storeRefreshToken(decoded.id, newRefreshToken);

    // Set new refresh token as HTTP-only cookie
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json({
      status: 'success',
      accessToken,
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(403).json({ 
      status: 'error', 
      message: 'Invalid or expired refresh token.' 
    });
  }
};

export const logout = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
    
    if (refreshToken) {
      // Verify token to get user ID
      try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        // Remove refresh token from Redis
        await db.redis.del(`refresh_token:${decoded.id}`);
      } catch (error) {
        console.error('Error during logout token verification:', error);
      }
      
      // Clear refresh token cookie
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      });
    }

    res.status(200).json({ 
      status: 'success', 
      message: 'Successfully logged out.' 
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'An error occurred during logout.' 
    });
  }
};

export const getMe = async (req, res) => {
  try {
    // req.user is set by the auth middleware
    const user = await db.models.User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] } // Don't return password
    });
    
    if (!user) {
      return res.status(404).json({ 
        status: 'fail', 
        message: 'User not found.' 
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: { user }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'An error occurred while fetching your profile.' 
    });
  }
};

export const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, passwordConfirm } = req.body;
    
    // Input validation
    if (!currentPassword || !newPassword || !passwordConfirm) {
      return res.status(400).json({ 
        status: 'fail', 
        message: 'All fields are required.' 
      });
    }
    
    if (newPassword !== passwordConfirm) {
      return res.status(400).json({ 
        status: 'fail', 
        message: 'New passwords do not match.' 
      });
    }
    
    // Get user with password
    const user = await db.models.User.findByPk(req.user.id, {
      attributes: { include: ['password'] }
    });
    
    // Check if current password is correct
    if (!(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(401).json({ 
        status: 'fail', 
        message: 'Current password is incorrect.' 
      });
    }
    
    // Update password
    user.password = await bcrypt.hash(newPassword, 12);
    user.password_changed_at = new Date();
    await user.save();
    
    // Invalidate all refresh tokens (optional: implement token invalidation)
    // await db.redis.del(`refresh_token:${user.id}`);
    
    // Generate new tokens
    const accessToken = signToken(user.id);
    const refreshToken = createRefreshToken(user.id);
    await storeRefreshToken(user.id, refreshToken);
    
    // Set new refresh token as HTTP-only cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    
    res.status(200).json({
      status: 'success',
      accessToken,
      message: 'Password updated successfully.'
    });
    
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'An error occurred while updating your password.' 
    });
  }
};
