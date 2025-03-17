const { dbQuery, dbExecute, dbQueryAll } = require('./utils');
const bcrypt = require('bcrypt');

// SQL queries for authentication
const SQL = {
  // Session and token management
  createSession: `
    INSERT INTO UserSessions (
      user_id, 
      token, 
      expires_at, 
      created_at
    ) VALUES (?, ?, ?, CURRENT_TIMESTAMP)
  `,
  
  findValidSession: `
    SELECT * FROM UserSessions 
    WHERE token = ? 
    AND expires_at > CURRENT_TIMESTAMP 
    AND is_active = 1
  `,
  
  invalidateSession: `
    UPDATE UserSessions 
    SET is_active = 0, 
        invalidated_at = CURRENT_TIMESTAMP 
    WHERE token = ?
  `,
  
  // Password reset token management
  createPasswordResetToken: `
    INSERT INTO PasswordResets (
      user_id, 
      token, 
      expires_at, 
      created_at
    ) VALUES (?, ?, ?, CURRENT_TIMESTAMP)
  `,
  
  findValidPasswordResetToken: `
    SELECT * FROM PasswordResets 
    WHERE token = ? 
    AND expires_at > CURRENT_TIMESTAMP 
    AND used = 0
  `,
  
  markPasswordResetTokenUsed: `
    UPDATE PasswordResets 
    SET used = 1, 
        used_at = CURRENT_TIMESTAMP 
    WHERE token = ?
  `
};

// Authentication-related database operations
const authDbOperations = {
  // Create a new user session
  createSession: (userId, token, expiresAt) => {
    return dbExecute(SQL.createSession, [
      userId, 
      token, 
      expiresAt
    ]).then(result => result.lastId);
  },
  
  // Find a valid session by token
  findValidSession: (token) => {
    return dbQuery(SQL.findValidSession, [token]);
  },
  
  // Invalidate a session token
  invalidateSession: (token) => {
    return dbExecute(SQL.invalidateSession, [token])
      .then(result => result.changes);
  },
  
  // Create a password reset token
  createPasswordResetToken: (userId, token, expiresAt) => {
    return dbExecute(SQL.createPasswordResetToken, [
      userId, 
      token, 
      expiresAt
    ]).then(result => result.lastId);
  },
  
  // Find a valid password reset token
  findValidPasswordResetToken: (token) => {
    return dbQuery(SQL.findValidPasswordResetToken, [token]);
  },
  
  // Mark a password reset token as used
  markPasswordResetTokenUsed: (token) => {
    return dbExecute(SQL.markPasswordResetTokenUsed, [token])
      .then(result => result.changes);
  },
  
  // Verify user credentials (for login)
  verifyUserCredentials: async (email, plainTextPassword) => {
    const query = `
      SELECT id, username, email, role, password_hash 
      FROM Users 
      WHERE email = ?
    `;
    
    try {
      // Find user by email
      const user = await dbQuery(query, [email]);
      
      // No user found
      if (!user) return null;
      
      // Compare passwords
      const isMatch = await bcrypt.compare(plainTextPassword, user.password_hash);
      
      if (isMatch) {
        // Remove sensitive information
        const { password_hash, ...userWithoutPassword } = user;
        return userWithoutPassword;
      }
      
      return null;
    } catch (error) {
      console.error('Error verifying credentials:', error);
      return null;
    }
  },
  
  // Get user by email
  getUserByEmail: (email) => {
    const query = `
      SELECT id, username, email, role 
      FROM Users 
      WHERE email = ?
    `;
    return dbQuery(query, [email]);
  }
};

module.exports = authDbOperations;