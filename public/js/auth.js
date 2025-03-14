// Optimized auth-service.js file
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../../config/db');

// Store active sessions in memory (in production, use Redis or another session store)
const activeSessions = new Map();

// Number of salt rounds for bcrypt
const SALT_ROUNDS = 10;

// Session expiration time (24 hours in milliseconds)
const SESSION_EXPIRY = 24 * 60 * 60 * 1000; 

// Reusable SQL queries
const SQL = {
  getUserByEmail: 'SELECT id FROM Users WHERE email = ?',
  getUserByUsername: 'SELECT id FROM Users WHERE username = ?',
  getUserById: 'SELECT * FROM Users WHERE id = ?',
  insertUser: 'INSERT INTO Users (username, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)',
  updateLastLogin: 'UPDATE Users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
  selectUserByEmail: 'SELECT * FROM Users WHERE email = ?',
  resetTokenLookup: 'SELECT user_id FROM PasswordResets WHERE token = ? AND expires_at > CURRENT_TIMESTAMP AND used = 0',
  updateUserPassword: 'UPDATE Users SET password_hash = ? WHERE id = ?',
  markTokenUsed: 'UPDATE PasswordResets SET used = 1 WHERE token = ?',
  insertPasswordReset: 'INSERT INTO PasswordResets (user_id, token, expires_at) VALUES (?, ?, ?)'
};

// Helper function for database queries (Promise-based)
function dbQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      resolve(row);
    });
  });
}

// Helper function for database execute (Promise-based)
function dbExecute(query, params = []) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) reject(err);
      resolve({ lastId: this.lastID, changes: this.changes });
    });
  });
}

const authMiddleware = {
  // Middleware to check if user is authenticated
  isAuthenticated: (req, res, next) => {
    // Get session token from cookies
    const sessionToken = req.cookies.sessionToken;
    
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
      const emailExists = await dbQuery(SQL.getUserByEmail, [email]);
      if (emailExists) {
        return res.status(400).json({ message: 'Email already registered' });
      }
      
      // Check if username already exists
      const usernameExists = await dbQuery(SQL.getUserByUsername, [username]);
      if (usernameExists) {
        return res.status(400).json({ message: 'Username already taken' });
      }
      
      // Hash password
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      
      // Create user
      const result = await dbExecute(
        SQL.insertUser, 
        [username, email, passwordHash, 'user']
      );
      
      res.status(201).json({ 
        message: 'Registration successful',
        userId: result.lastId
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
      const user = await dbQuery(SQL.selectUserByEmail, [email]);
      
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
      await dbExecute(SQL.updateLastLogin, [user.id]);
      
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
        sameSite: 'strict',
        maxAge: rememberMe ? SESSION_EXPIRY : null // Session cookie if not "remember me"
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
    const sessionToken = req.cookies.sessionToken;
    
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
      const user = await dbQuery(
        'SELECT id, username FROM Users WHERE email = ?', 
        [email]
      );
      
      // Don't reveal whether the email exists or not for security
      // But still provide a token for dev purposes if user exists
      const responseData = {
        message: 'If your email is registered, you will receive reset instructions'
      };
      
      if (user) {
        // Generate reset token
        const resetToken = uuidv4();
        const resetExpiry = new Date(Date.now() + (60 * 60 * 1000)); // 1 hour
        
        // Store reset token in database
        await dbExecute(
          SQL.insertPasswordReset,
          [user.id, resetToken, resetExpiry.toISOString()]
        );
        
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
      const resetRequest = await dbQuery(SQL.resetTokenLookup, [token]);
      
      if (!resetRequest) {
        return res.status(400).json({ message: 'Invalid or expired reset token' });
      }
      
      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
      
      // Update user password
      await dbExecute(SQL.updateUserPassword, [passwordHash, resetRequest.user_id]);
      
      // Mark token as used
      await dbExecute(SQL.markTokenUsed, [token]);
      
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