const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/database');

// Login form page
router.get('/login', (req, res) => {
  res.render('users/login', {
    title: 'Login',
    errors: []
  });
});

// Handle login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    // Check if user exists
    const [users] = await db.query(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    
    if (users.length === 0) {
      return res.render('users/login', {
        title: 'Login',
        errors: ['Invalid username or password'],
        username
      });
    }
    
    const user = users[0];
    
    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.render('users/login', {
        title: 'Login',
        errors: ['Invalid username or password'],
        username
      });
    }
    
    // Set session variables
    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      isAdmin: user.is_admin === 1
    };
    
    // Redirect to dashboard
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Login error:', error);
    res.render('users/login', {
      title: 'Login',
      errors: ['Server error during login'],
      username
    });
  }
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/users/login');
  });
});

// Register form page
router.get('/register', (req, res) => {
  res.render('users/register', {
    title: 'Register',
    errors: []
  });
});

// Handle registration
router.post('/register', async (req, res) => {
  const { username, email, password, password2 } = req.body;
  const errors = [];
  
  // Form validation
  if (!username || !email || !password || !password2) {
    errors.push('All fields are required');
  }
  
  if (password !== password2) {
    errors.push('Passwords do not match');
  }
  
  if (password.length < 6) {
    errors.push('Password must be at least 6 characters');
  }
  
  if (errors.length > 0) {
    return res.render('users/register', {
      title: 'Register',
      errors,
      username,
      email
    });
  }
  
  try {
    // Check if user already exists
    const [existingUsers] = await db.query(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [username, email]
    );
    
    if (existingUsers.length > 0) {
      return res.render('users/register', {
        title: 'Register',
        errors: ['Username or email already in use'],
        username,
        email
      });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Insert new user
    const [result] = await db.query(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword]
    );
    
    // Set session variables
    req.session.user = {
      id: result.insertId,
      username,
      email,
      isAdmin: false
    };
    
    // Redirect to dashboard
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Registration error:', error);
    res.render('users/register', {
      title: 'Register',
      errors: ['Server error during registration'],
      username,
      email
    });
  }
});

module.exports = router;
