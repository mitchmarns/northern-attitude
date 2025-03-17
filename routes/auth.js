// routes/auth.js - Fixed Authentication routes
const express = require('express');
const router = express.Router();
const { authService, authMiddleware } = require('../public/js/auth');

// Register a new user
router.post('/register', async (req, res) => {
  try {
    await authService.register(req, res);
  } catch (error) {
    console.error('Error in register route:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    await authService.login(req, res);
  } catch (error) {
    console.error('Error in login route:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Logout user
router.post('/logout', (req, res) => {
  try {
    authService.logout(req, res);
  } catch (error) {
    console.error('Error in logout route:', error);
    res.status(500).json({ message: 'Server error during logout' });
  }
});

// Get current user info
router.get('/current-user', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    authService.getCurrentUser(req, res);
  } catch (error) {
    console.error('Error in current-user route:', error);
    res.status(500).json({ message: 'Server error fetching current user' });
  }
});

// Request password reset
router.post('/password-reset-request', async (req, res) => {
  try {
    await authService.requestPasswordReset(req, res);
  } catch (error) {
    console.error('Error in password reset request route:', error);
    res.status(500).json({ message: 'Server error during password reset request' });
  }
});

// Reset password with token
router.post('/password-reset', async (req, res) => {
  try {
    await authService.resetPassword(req, res);
  } catch (error) {
    console.error('Error in password reset route:', error);
    res.status(500).json({ message: 'Server error during password reset' });
  }
});

module.exports = router;