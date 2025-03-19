// public/js/auth.js - Fixed implementation
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../../config/db');
const authDbOperations = require('../../config/db/auth-db');

// Store active sessions in memory (in production, use Redis or another session store)
const activeSessions = new Map();

// Number of salt rounds for bcrypt
const SALT_ROUNDS = 10;

// Session expiration time (24 hours in milliseconds)
const SESSION_EXPIRY = process.env.NODE_ENV === 'production' 
  ? 24 * 60 * 60 * 1000 // 24 hours in production 
  : 7 * 24 * 60 * 60 * 1000; // 7 days in development

// Authentication middleware
const authMiddleware = {
  // Middleware to check if user is authenticated
  isAuthenticated: (req, res, next) => {
    // Get session token from cookies
    const sessionToken = req.cookies?.sessionToken;
    
    if (!sessionToken) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Check if session exists and is valid
    const session = activeSessions.get(sessionToken);
    if (!session) {
      return res.status(401).json({ message: 'Invalid or expired session' });
    }
    
    // Check if session has expired
    if (Date.now() > session.expiresAt) {
      activeSessions.delete(sessionToken);
      return res.status(401).json({ message: 'Session expired' });
    }
    
    // Attach user data to request object
    req.user = session.user;
    
    // Extend session expiration if "remember me" was checked
    if (session.rememberMe) {
      session.expiresAt = Date.now() + SESSION_EXPIRY;
      activeSessions.set(sessionToken, session);
    }
    
    next();
  },
  
  // Middleware to check if user has admin role
  isAdmin: (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin privileges required' });
    }
    next();
  }
};

// Authentication service
const authService = {
  // Register a new user
  register: async (req, res) => {
    try {
      const { username, email, password, confirmPassword } = req.body;
      
      // Validate input
      if (!username || !email || !password || !confirmPassword) {
        return res.status(400).json({ message: 'All fields are required' });
      }
      
      if (password !== confirmPassword) {
        return res.status(400).json({ message: 'Passwords do not match' });
      }
      
      if (password.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters long' });
      }
      
      // Check if email already exists
      const emailExists = await new Promise((resolve, reject) => {
        db.get('SELECT id FROM Users WHERE email = ?', [email], (err, row) => {
          if (err) reject(err);
          resolve(row);
        });
      });
      
      if (emailExists) {
        return res.status(400).json({ message: 'Email already registered' });
      }
      
      // Check if username already exists
      const usernameExists = await new Promise((resolve, reject) => {
        db.get('SELECT id FROM Users WHERE username = ?', [username], (err, row) => {
          if (err) reject(err);
          resolve(row);
        });
      });
      
      if (usernameExists) {
        return res.status(400).json({ message: 'Username already taken' });
      }
      
      // Hash password
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      
      // Create user
      const userId = await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO Users (username, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)',
          [username, email, passwordHash, 'user'],
          function(err) {
            if (err) reject(err);
            resolve(this.lastID);
          }
        );
      });
      
      res.status(201).json({ 
        message: 'Registration successful',
        userId: userId
      });
      
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Server error during registration' });
    }
  },
  
  // Login user
  login: async (req, res) => {
    try {
      const { email, password, rememberMe } = req.body;
      
      // Validate input
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }
      
      // Get user by email
      const user = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM Users WHERE email = ?', [email], (err, row) => {
          if (err) reject(err);
          resolve(row);
        });
      });
      
      if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      
      // Verify password - handle both bcrypt hashed passwords and sample plaintext passwords
      let passwordValid = false;

      // First try direct comparison (for sample data)
      if (password === user.password_hash) {
        passwordValid = true;
      } else {
        // Then try bcrypt comparison (for real hashed passwords)
        try {
          passwordValid = await bcrypt.compare(password, user.password_hash);
        } catch (err) {
          console.error('Password comparison error:', err);
        }
      }

      if (!passwordValid) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      
      // Update last login timestamp
      await new Promise((resolve, reject) => {
        db.run('UPDATE Users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id], err => {
          if (err) reject(err);
          resolve();
        });
      });
      
      // Create session
      const sessionToken = uuidv4();
      const expiresAt = Date.now() + SESSION_EXPIRY;
      
      // Store session
      activeSessions.set(sessionToken, {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        },
        expiresAt,
        rememberMe: !!rememberMe
      });
      
      // Set cookie options
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Set to true in production
        sameSite: 'lax', // Changed from 'strict' to 'lax' for better compatibility
        maxAge: rememberMe ? SESSION_EXPIRY : undefined // Session cookie if not "remember me"
      };
      
      // Set session cookie
      res.cookie('sessionToken', sessionToken, cookieOptions);
      
      res.status(200).json({
        message: 'Login successful',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      });
      
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Server error during login' });
    }
  },
  
  // Logout user
  logout: (req, res) => {
    const sessionToken = req.cookies?.sessionToken;
    
    if (sessionToken) {
      // Remove session
      activeSessions.delete(sessionToken);
      
      // Clear cookie
      res.clearCookie('sessionToken');
    }
    
    res.status(200).json({ message: 'Logout successful' });
  },
  
  // Get current user info
  getCurrentUser: (req, res) => {
    // User is added to req by isAuthenticated middleware
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    res.status(200).json({ user: req.user });
  },
  
  // Request password reset
  requestPasswordReset: async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }
      
      // Check if user exists
      const user = await new Promise((resolve, reject) => {
        db.get('SELECT id, username FROM Users WHERE email = ?', [email], (err, row) => {
          if (err) reject(err);
          resolve(row);
        });
      });
      
      // Don't reveal whether the email exists or not for security
      const responseData = {
        message: 'If your email is registered, you will receive reset instructions'
      };
      
      if (user) {
        // Generate reset token
        const resetToken = uuidv4();
        const resetExpiry = new Date(Date.now() + (60 * 60 * 1000)); // 1 hour
        
        // Store reset token in database
        await new Promise((resolve, reject) => {
          db.run(
            'INSERT INTO PasswordResets (user_id, token, expires_at) VALUES (?, ?, ?)',
            [user.id, resetToken, resetExpiry.toISOString()],
            err => {
              if (err) reject(err);
              resolve();
            }
          );
        });
        
        // In a real app, you would send an email with the reset link
        // For this example, include token in response for dev environment
        console.log(`Password reset link for ${user.username}: /reset-password?token=${resetToken}`);
        responseData.dev_token = resetToken;
      }
      
      res.status(200).json(responseData);
      
    } catch (error) {
      console.error('Password reset request error:', error);
      res.status(500).json({ message: 'Server error during password reset request' });
    }
  },
  
  // Reset password with token
  resetPassword: async (req, res) => {
    try {
      const { token, newPassword, confirmPassword } = req.body;
      
      if (!token || !newPassword || !confirmPassword) {
        return res.status(400).json({ message: 'All fields are required' });
      }
      
      if (newPassword !== confirmPassword) {
        return res.status(400).json({ message: 'Passwords do not match' });
      }
      
      if (newPassword.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters long' });
      }
      
      // Get valid reset token
      const resetRequest = await new Promise((resolve, reject) => {
        db.get(
          'SELECT user_id FROM PasswordResets WHERE token = ? AND expires_at > CURRENT_TIMESTAMP AND used = 0',
          [token],
          (err, row) => {
            if (err) reject(err);
            resolve(row);
          }
        );
      });
      
      if (!resetRequest) {
        return res.status(400).json({ message: 'Invalid or expired reset token' });
      }
      
      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
      
      // Update user password
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE Users SET password_hash = ? WHERE id = ?',
          [passwordHash, resetRequest.user_id],
          err => {
            if (err) reject(err);
            resolve();
          }
        );
      });
      
      // Mark token as used
      await new Promise((resolve, reject) => {
        db.run('UPDATE PasswordResets SET used = 1 WHERE token = ?', [token], err => {
          if (err) reject(err);
          resolve();
        });
      });
      
      res.status(200).json({ message: 'Password reset successful' });
      
    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({ message: 'Server error during password reset' });
    }
  }
};

module.exports = {
  authMiddleware,
  authService
};