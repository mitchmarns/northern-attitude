const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');

// Database connection
const db = require('../config/database');

// Middleware to check if user is logged in
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return next();
  }
  res.redirect('/auth/login');
};

// Display profile page
router.get('/profile', isAuthenticated, async (req, res) => {
  try {
    // Fetch complete user data from the database
    const [users] = await db.promise().query(
      'SELECT id, username, email, created_at, first_name, last_name FROM users WHERE id = ?',
      [req.session.user.id]
    );
    
    if (users.length === 0) {
      req.flash('error', 'User not found');
      return res.redirect('/');
    }
    
    const userData = users[0];
    
    res.render('auth/profile', {
      title: 'Profile Settings | Northern Attitude',
      user: userData, // Use the complete user data from the database
      messages: req.flash()
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
    req.flash('error', 'An error occurred while loading your profile');
    res.redirect('/');
  }
});

// Update username
router.post('/profile/update-username', isAuthenticated, async (req, res) => {
  try {
    const { newUsername } = req.body;
    const userId = req.session.user.id;
    
    // Validate username
    if (!newUsername || newUsername.length < 3) {
      req.flash('error', 'Username must be at least 3 characters long');
      return res.redirect('/auth/profile');
    }
    
    // Check if username is already taken
    const [existingUsers] = await db.promise().query(
      'SELECT * FROM users WHERE username = ? AND id != ?',
      [newUsername, userId]
    );
    
    if (existingUsers.length > 0) {
      req.flash('error', 'This username is already taken');
      return res.redirect('/auth/profile');
    }
    
    // Update username in database
    await db.promise().query(
      'UPDATE users SET username = ? WHERE id = ?',
      [newUsername, userId]
    );
    
    // Update session
    req.session.user.username = newUsername;
    
    req.flash('success', 'Username updated successfully');
    res.redirect('/auth/profile');
  } catch (error) {
    console.error('Error updating username:', error);
    req.flash('error', 'An error occurred while updating your username');
    res.redirect('/auth/profile');
  }
});

// Update password
router.post('/profile/update-password', isAuthenticated, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const userId = req.session.user.id;
    
    // Validate password
    if (!newPassword || newPassword.length < 6) {
      req.flash('error', 'Password must be at least 6 characters long');
      return res.redirect('/auth/profile');
    }
    
    if (newPassword !== confirmPassword) {
      req.flash('error', 'New passwords do not match');
      return res.redirect('/auth/profile');
    }
    
    // Get current password from database
    const [users] = await db.promise().query(
      'SELECT password_hash FROM users WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      req.flash('error', 'User not found');
      return res.redirect('/auth/profile');
    }
    
    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, users[0].password_hash);
    
    if (!isPasswordValid) {
      req.flash('error', 'Current password is incorrect');
      return res.redirect('/auth/profile');
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password in database
    await db.promise().query(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [hashedPassword, userId]
    );
    
    req.flash('success', 'Password updated successfully');
    res.redirect('/auth/profile');
  } catch (error) {
    console.error('Error updating password:', error);
    req.flash('error', 'An error occurred while updating your password');
    res.redirect('/auth/profile');
  }
});

module.exports = router;