// routes/auth.js - Authentication routes
const express = require('express');
const router = express.Router();
const { authService, authMiddleware } = require('../public/js/auth');

// Register a new user
router.post('/register', authService.register);

// Login user
router.post('/login', authService.login);

// Logout user
router.post('/logout', authService.logout);

// Get current user info
router.get('/current-user', authMiddleware.isAuthenticated, authService.getCurrentUser);

// Request password reset
router.post('/password-reset-request', authService.requestPasswordReset);

// Reset password with token
router.post('/password-reset', authService.resetPassword);

module.exports = router;