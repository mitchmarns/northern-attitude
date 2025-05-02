const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../config/database');

// Display registration form
router.get('/register', (req, res) => {
  res.render('auth/register', { 
    title: 'Register - Northern Attitude',
    user: req.session.user || null,
    messages: req.flash() || {}
  });
});

// Handle registration form submission
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;
    
    // Validation
    if (!username || !email || !password) {
      req.flash('error', 'All fields are required');
      return res.redirect('/auth/register');
    }
    
    if (password !== confirmPassword) {
      req.flash('error', 'Passwords do not match');
      return res.redirect('/auth/register');
    }
    
    // Check if user already exists - use db.query directly
    const [existingUsers] = await db.query(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [username, email]
    );
    
    if (existingUsers.length > 0) {
      req.flash('error', 'Username or email already in use');
      return res.redirect('/auth/register');
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insert user into database - use db.query directly
    const [result] = await db.query(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, hashedPassword]
    );
    
    // Set user session
    const userId = result.insertId;
    req.session.user = {
      id: userId,
      username,
      email
    };
    
    // Redirect to dashboard
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Registration error:', error);
    req.flash('error', 'An error occurred during registration');
    res.redirect('/auth/register');
  }
});

// Display login form
router.get('/login', (req, res) => {
  res.render('auth/login', { 
    title: 'Login - Northern Attitude',
    user: req.session.user || null,
    messages: req.flash() || {}
  });
});

// Handle login form submission
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Fetch user from database - use db.query directly
    const [users] = await db.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      req.flash('error', 'Invalid email or password');
      return res.redirect('/auth/login');
    }

    const user = users[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      req.flash('error', 'Invalid email or password');
      return res.redirect('/auth/login');
    }

    // Set user session
    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin || false // Include isAdmin if applicable
    };

    res.redirect('/dashboard');
  } catch (error) {
    console.error('Login error:', error);
    req.flash('error', 'An error occurred during login');
    res.redirect('/auth/login');
  }
});

// Handle logout
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

module.exports = router;