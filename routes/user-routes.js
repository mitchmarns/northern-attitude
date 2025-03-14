// Updated user-routes.js for image URLs
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { db } = require('../config/db');
const { authMiddleware } = require('../public/js/auth');

// Middleware to check if user has a profile
async function checkUserProfile(req, res, next) {
  try {
    const userId = req.user.id;
    
    // Check if user profile exists
    db.get('SELECT id FROM UserProfiles WHERE user_id = ?', [userId], (err, row) => {
      if (err) {
        console.error('Database error checking user profile:', err);
        return res.status(500).json({ message: 'Server error' });
      }
      
      if (!row) {
        // Create profile if it doesn't exist
        db.run(`
          INSERT INTO UserProfiles (user_id, bio, location, experience_level)
          VALUES (?, ?, ?, ?)
        `, [userId, '', '', 'beginner'], function(err) {
          if (err) {
            console.error('Error creating user profile:', err);
            return res.status(500).json({ message: 'Failed to create user profile' });
          }
          
          // Create privacy settings
          db.run(`
            INSERT INTO UserPrivacySettings (user_id, visibility, preferences_json)
            VALUES (?, ?, ?)
          `, [userId, 'members', '["messages", "online-status", "email-notifications"]'], function(err) {
            if (err) {
              console.error('Error creating privacy settings:', err);
              return res.status(500).json({ message: 'Failed to create privacy settings' });
            }
            
            next();
          });
        });
      } else {
        next();
      }
    });
  } catch (error) {
    console.error('Error in checkUserProfile middleware:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

// Route to get user profile
router.get('/profile', authMiddleware.isAuthenticated, checkUserProfile, (req, res) => {
  const userId = req.user.id;
  
  db.get(`
    SELECT u.id, u.username, u.email, u.display_name, u.avatar_url,
           p.bio, p.location, p.favorite_team_id, p.favorite_position, p.experience_level,
           s.visibility, s.preferences_json
    FROM Users u
    LEFT JOIN UserProfiles p ON u.id = p.user_id
    LEFT JOIN UserPrivacySettings s ON u.id = s.user_id
    WHERE u.id = ?
  `, [userId], (err, row) => {
    if (err) {
      console.error('Error fetching user profile:', err);
      return res.status(500).json({ message: 'Server error' });
    }
    
    if (!row) {
      return res.status(404).json({ message: 'User profile not found' });
    }
    
    // Parse preferences JSON
    let preferences = [];
    try {
      if (row.preferences_json) {
        preferences = JSON.parse(row.preferences_json);
      }
    } catch (e) {
      console.error('Error parsing preferences JSON:', e);
    }
    
    // Format response
    const profile = {
      id: row.id,
      username: row.username,
      email: row.email,
      display_name: row.display_name,
      avatar_url: row.avatar_url,
      bio: row.bio,
      location: row.location,
      favorite_team_id: row.favorite_team_id,
      favorite_position: row.favorite_position,
      experience_level: row.experience_level,
      privacy_settings: {
        visibility: row.visibility,
        preferences: preferences
      }
    };
    
    res.status(200).json({ profile });
  });
});

// Route to update user profile
router.put('/profile', authMiddleware.isAuthenticated, checkUserProfile, (req, res) => {
  const userId = req.user.id;
  const { display_name, bio, location, favorite_team_id, favorite_position, experience_level } = req.body;
  
  // Validate experience level
  if (experience_level && !['beginner', 'intermediate', 'advanced'].includes(experience_level)) {
    return res.status(400).json({ message: 'Invalid experience level' });
  }
  
  // Validate position
  if (favorite_position && !['C', 'LW', 'RW', 'D', 'G', ''].includes(favorite_position)) {
    return res.status(400).json({ message: 'Invalid position' });
  }
  
  // Update display_name in Users table
  db.run(`
    UPDATE Users
    SET display_name = ?
    WHERE id = ?
  `, [display_name, userId], function(err) {
    if (err) {
      console.error('Error updating display name:', err);
      return res.status(500).json({ message: 'Server error' });
    }
    
    // Update profile in UserProfiles table
    db.run(`
      UPDATE UserProfiles
      SET bio = ?, location = ?, favorite_team_id = ?, favorite_position = ?, experience_level = ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `, [bio, location, favorite_team_id || null, favorite_position, experience_level, userId], function(err) {
      if (err) {
        console.error('Error updating user profile:', err);
        return res.status(500).json({ message: 'Server error' });
      }
      
      res.status(200).json({ message: 'Profile updated successfully' });
    });
  });
});

// Route to update avatar with URL
router.put('/avatar', authMiddleware.isAuthenticated, (req, res) => {
  const userId = req.user.id;
  const { avatar_url } = req.body;
  
  if (!avatar_url) {
    return res.status(400).json({ message: 'Avatar URL is required' });
  }
  
  // Update user's avatar URL in database
  db.run(`
    UPDATE Users
    SET avatar_url = ?
    WHERE id = ?
  `, [avatar_url, userId], function(err) {
    if (err) {
      console.error('Error updating avatar URL:', err);
      return res.status(500).json({ message: 'Server error' });
    }
    
    res.status(200).json({ 
      message: 'Avatar updated successfully',
      avatar_url: avatar_url
    });
  });
});

// Route to update account settings
router.put('/account', authMiddleware.isAuthenticated, async (req, res) => {
  const userId = req.user.id;
  const { email, current_password, new_password } = req.body;
  
  // Check if trying to change password
  if (new_password && current_password) {
    // Validate password
    if (new_password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }
    
    try {
      // Get current password hash
      const user = await new Promise((resolve, reject) => {
        db.get('SELECT password_hash FROM Users WHERE id = ?', [userId], (err, row) => {
          if (err) reject(err);
          resolve(row);
        });
      });
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Verify current password
      const isPasswordValid = await bcrypt.compare(current_password, user.password_hash);
      
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }
      
      // Hash new password
      const passwordHash = await bcrypt.hash(new_password, 10);
      
      // Update email and password
      db.run(`
        UPDATE Users
        SET email = ?, password_hash = ?
        WHERE id = ?
      `, [email, passwordHash, userId], function(err) {
        if (err) {
          console.error('Error updating user account:', err);
          return res.status(500).json({ message: 'Server error' });
        }
        
        res.status(200).json({ message: 'Account updated successfully' });
      });
    } catch (error) {
      console.error('Error updating account:', error);
      res.status(500).json({ message: 'Server error' });
    }
  } else {
    // Only updating email
    db.run(`
      UPDATE Users
      SET email = ?
      WHERE id = ?
    `, [email, userId], function(err) {
      if (err) {
        console.error('Error updating user email:', err);
        return res.status(500).json({ message: 'Server error' });
      }
      
      res.status(200).json({ message: 'Account updated successfully' });
    });
  }
});

// Route to update privacy settings
router.put('/privacy', authMiddleware.isAuthenticated, checkUserProfile, (req, res) => {
  const userId = req.user.id;
  const { privacy_settings } = req.body;
  
  if (!privacy_settings) {
    return res.status(400).json({ message: 'Privacy settings are required' });
  }
  
  const { visibility, preferences } = privacy_settings;
  
  // Validate visibility
  if (visibility && !['public', 'members', 'team'].includes(visibility)) {
    return res.status(400).json({ message: 'Invalid visibility setting' });
  }
  
  // Convert preferences to JSON
  let preferencesJson = '[]';
  try {
    if (preferences && Array.isArray(preferences)) {
      preferencesJson = JSON.stringify(preferences);
    }
  } catch (e) {
    console.error('Error stringifying preferences:', e);
  }
  
  // Update privacy settings
  db.run(`
    UPDATE UserPrivacySettings
    SET visibility = ?, preferences_json = ?, updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ?
  `, [visibility, preferencesJson, userId], function(err) {
    if (err) {
      console.error('Error updating privacy settings:', err);
      return res.status(500).json({ message: 'Server error' });
    }
    
    res.status(200).json({ message: 'Privacy settings updated successfully' });
  });
});

// Route to get public profile of a user
router.get('/profile/:username', (req, res) => {
  const { username } = req.params;
  
  db.get(`
    SELECT u.id, u.username, u.display_name, u.avatar_url,
           p.bio, p.location, p.favorite_team_id, p.favorite_position, p.experience_level,
           s.visibility,
           t.name as team_name
    FROM Users u
    LEFT JOIN UserProfiles p ON u.id = p.user_id
    LEFT JOIN UserPrivacySettings s ON u.id = s.user_id
    LEFT JOIN Teams t ON p.favorite_team_id = t.id
    WHERE u.username = ?
  `, [username], (err, row) => {
    if (err) {
      console.error('Error fetching public profile:', err);
      return res.status(500).json({ message: 'Server error' });
    }
    
    if (!row) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check visibility settings
    if (row.visibility === 'team') {
      return res.status(403).json({ message: 'This profile is private' });
    }
    
    if (row.visibility === 'members' && (!req.user || !req.user.id)) {
      return res.status(403).json({ message: 'Login required to view this profile' });
    }
    
    // Format response
    const profile = {
      username: row.username,
      display_name: row.display_name,
      avatar_url: row.avatar_url,
      bio: row.bio,
      location: row.location,
      favorite_team: row.team_name,
      favorite_position: row.favorite_position,
      experience_level: row.experience_level
    };
    
    res.status(200).json({ profile });
  });
});

module.exports = router;