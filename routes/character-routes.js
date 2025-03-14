// character-routes.js - API routes for character management

const express = require('express');
const router = express.Router();
const { characterOperations } = require('../config/db');
const { authMiddleware } = require('../public/js/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Set up file storage for avatars
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = path.join(__dirname, '../../public/uploads/avatars');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    // Create unique filename using timestamp and original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'avatar-' + uniqueSuffix + ext);
  }
});

// File filter to only allow images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB limit
  },
  fileFilter: fileFilter
});

// Get all characters for the logged-in user
router.get('/my-characters', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const characters = await characterOperations.getUserCharacters(req.user.id);
    res.status(200).json(characters);
  } catch (error) {
    console.error('Error fetching user characters:', error);
    res.status(500).json({ message: 'Failed to fetch characters' });
  }
});

// Get a specific character by ID
router.get('/characters/:id', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const characterId = req.params.id;
    const character = await characterOperations.getCharacterById(characterId);
    
    if (!character) {
      return res.status(404).json({ message: 'Character not found' });
    }
    
    // Check if the character belongs to the requesting user
    const isOwner = await characterOperations.isCharacterOwner(req.user.id, characterId);
    
    if (!isOwner) {
      // In a more complex system, you might check if the character is public/visible
      // For now, only allow owners to view their characters
      return res.status(403).json({ message: 'You do not have permission to view this character' });
    }
    
    res.status(200).json(character);
  } catch (error) {
    console.error('Error fetching character:', error);
    res.status(500).json({ message: 'Failed to fetch character' });
  }
});

// Create a new character
router.post('/characters', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const { name, position, team_id, stats_json, bio, avatar_url, is_active } = req.body;
    
    // Validate required fields
    if (!name || !position || !stats_json) {
      return res.status(400).json({ message: 'Name, position, and stats are required' });
    }
    
    // Validate position
    const validPositions = ['C', 'LW', 'RW', 'D', 'G'];
    if (!validPositions.includes(position)) {
      return res.status(400).json({ message: 'Invalid position. Must be one of: C, LW, RW, D, G' });
    }
    
    // If this is the user's first character, set it as active
    const existingCharacters = await characterOperations.getUserCharacters(req.user.id);
    const isActive = existingCharacters.length === 0 || is_active === true;
    
    // Create character
    const characterId = await characterOperations.createCharacter(
      req.user.id,
      name,
      position,
      team_id || null,
      stats_json,
      bio || null,
      avatar_url || null,
      isActive
    );
    
    // If this is the first character, set it as active
    if (isActive) {
      await characterOperations.setActiveCharacter(req.user.id, characterId);
    }
    
    res.status(201).json({
      message: 'Character created successfully',
      id: characterId
    });
  } catch (error) {
    console.error('Error creating character:', error);
    res.status(500).json({ message: 'Failed to create character' });
  }
});

// Update a character
router.put('/characters/:id', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const characterId = req.params.id;
    
    // Check if the character belongs to the requesting user
    const isOwner = await characterOperations.isCharacterOwner(req.user.id, characterId);
    
    if (!isOwner) {
      return res.status(403).json({ message: 'You do not have permission to update this character' });
    }
    
    const { name, position, team_id, stats_json, bio, avatar_url } = req.body;
    
    // Validate that at least one field is being updated
    if (!name && !position && !team_id && !stats_json && !bio && avatar_url === undefined) {
      return res.status(400).json({ message: 'No update data provided' });
    }
    
    // Validate position if provided
    if (position) {
      const validPositions = ['C', 'LW', 'RW', 'D', 'G'];
      if (!validPositions.includes(position)) {
        return res.status(400).json({ message: 'Invalid position. Must be one of: C, LW, RW, D, G' });
      }
    }
    
    // Update character
    const updateData = {};
    if (name) updateData.name = name;
    if (position) updateData.position = position;
    if (team_id !== undefined) updateData.team_id = team_id;
    if (stats_json) updateData.stats_json = stats_json;
    if (bio !== undefined) updateData.bio = bio;
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url;
    
    await characterOperations.updateCharacter(characterId, updateData);
    
    res.status(200).json({ message: 'Character updated successfully' });
  } catch (error) {
    console.error('Error updating character:', error);
    res.status(500).json({ message: 'Failed to update character' });
  }
});

// Delete a character
router.delete('/characters/:id', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const characterId = req.params.id;
    
    // Check if the character belongs to the requesting user
    const isOwner = await characterOperations.isCharacterOwner(req.user.id, characterId);
    
    if (!isOwner) {
      return res.status(403).json({ message: 'You do not have permission to delete this character' });
    }
    
    // Get character to check if it's active
    const character = await characterOperations.getCharacterById(characterId);
    
    // Delete character
    await characterOperations.deleteCharacter(characterId);
    
    // If this was the user's active character, set another one as active if available
    if (character.is_active) {
      const remainingCharacters = await characterOperations.getUserCharacters(req.user.id);
      
      if (remainingCharacters.length > 0) {
        await characterOperations.setActiveCharacter(req.user.id, remainingCharacters[0].id);
      }
    }
    
    res.status(200).json({ message: 'Character deleted successfully' });
  } catch (error) {
    console.error('Error deleting character:', error);
    res.status(500).json({ message: 'Failed to delete character' });
  }
});

// Set a character as active
router.put('/characters/:id/set-active', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const characterId = req.params.id;
    
    // Check if the character belongs to the requesting user
    const isOwner = await characterOperations.isCharacterOwner(req.user.id, characterId);
    
    if (!isOwner) {
      return res.status(403).json({ message: 'You do not have permission to set this character as active' });
    }
    
    // Set character as active
    await characterOperations.setActiveCharacter(req.user.id, characterId);
    
    res.status(200).json({ message: 'Character set as active successfully' });
  } catch (error) {
    console.error('Error setting active character:', error);
    res.status(500).json({ message: 'Failed to set character as active' });
  }
});

// Get recent games for a character
router.get('/characters/:id/games', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const characterId = req.params.id;
    const limit = parseInt(req.query.limit) || 5;
    
    // Check if the character belongs to the requesting user
    const isOwner = await characterOperations.isCharacterOwner(req.user.id, characterId);
    
    if (!isOwner) {
      return res.status(403).json({ message: "You do not have permission to view this character's games" });
    }
    
    const games = await characterOperations.getCharacterGames(characterId, limit);
    
    res.status(200).json(games);
  } catch (error) {
    console.error('Error fetching character games:', error);
    res.status(500).json({ message: 'Failed to fetch character games' });
  }
});

// Upload avatar image
router.post('/upload/avatar', authMiddleware.isAuthenticated, upload.single('avatar'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    // Create URL for the uploaded avatar
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    
    res.status(200).json({
      message: 'Avatar uploaded successfully',
      url: avatarUrl
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({ message: 'Failed to upload avatar' });
  }
});

module.exports = router;