// Optimized character-routes.js
const express = require('express');
const router = express.Router();
const { characterOperations } = require('../config/db');
const { authMiddleware } = require('../public/js/auth');

// Cache common middleware for performance
const authRequired = authMiddleware.isAuthenticated;

// Reusable error handler for consistent error responses
const handleApiError = (res, error, message) => {
  console.error(message, error);
  res.status(500).json({ message: message });
};

// Validations as reusable functions
const validateCharacterData = (req, res) => {
  const { name, position, stats_json } = req.body;
  
  if (!name || !position || !stats_json) {
    res.status(400).json({ message: 'Name, position, and stats are required' });
    return false;
  }
  
  // Validate position
  const validPositions = ['C', 'LW', 'RW', 'D', 'G'];
  if (!validPositions.includes(position)) {
    res.status(400).json({ message: 'Invalid position. Must be one of: C, LW, RW, D, G' });
    return false;
  }
  
  return true;
};

// Check if user owns the character - reusable middleware
const checkCharacterOwnership = async (req, res, next) => {
  try {
    const characterId = req.params.id;
    const userId = req.user.id;
    
    const isOwner = await characterOperations.isCharacterOwner(userId, characterId);
    
    if (!isOwner) {
      return res.status(403).json({ message: 'You do not have permission to access this character' });
    }
    
    next();
  } catch (error) {
    handleApiError(res, error, 'Error checking character ownership');
  }
};

// Get all characters for the logged-in user
router.get('/my-characters', authRequired, async (req, res) => {
  try {
    const characters = await characterOperations.getUserCharacters(req.user.id);
    res.status(200).json(characters);
  } catch (error) {
    handleApiError(res, error, 'Failed to fetch characters');
  }
});

// Get a specific character by ID
router.get('/characters/:id', authRequired, checkCharacterOwnership, async (req, res) => {
  try {
    const character = await characterOperations.getCharacterById(req.params.id);
    
    if (!character) {
      return res.status(404).json({ message: 'Character not found' });
    }
    
    res.status(200).json(character);
  } catch (error) {
    handleApiError(res, error, 'Failed to fetch character');
  }
});

// Search for characters
router.get('/search', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const query = req.query.q || '';
    const excludeUserId = req.query.excludeUserId || null;
    
    if (query.length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }
    
    // Search for characters by name
    const characters = await dbQueryAll(`
      SELECT c.id, c.name, c.position, c.avatar_url, c.user_id, t.name as team_name
      FROM Characters c
      LEFT JOIN Teams t ON c.team_id = t.id
      WHERE c.name LIKE ? 
      ${excludeUserId ? 'AND c.id != ?' : ''}
      ORDER BY c.name
      LIMIT 20
    `, [`%${query}%`, ...(excludeUserId ? [excludeUserId] : [])]);
    
    res.status(200).json(characters);
  } catch (error) {
    console.error('Error searching characters:', error);
    res.status(500).json({ message: 'Server error during character search' });
  }
});

// Create a new character
router.post('/characters', authRequired, async (req, res) => {
  try {
    // Validate input
    if (!validateCharacterData(req, res)) return;
    
    const { 
      name, 
      position, 
      team_id, 
      stats_json, 
      bio, 
      avatar_url, 
      header_image_url, // Add this line
      is_active,
      full_name,
      age,
      nationality,
      hometown,
      height,
      weight,
      handedness,
      years_pro
    } = req.body;
    
    // Check existing characters to determine active state
    const existingCharacters = await characterOperations.getUserCharacters(req.user.id);
    const isActive = existingCharacters.length === 0 || is_active === true;
    
    // Create character with a single database call
    const characterId = await characterOperations.createCharacter(
      req.user.id,
      name,
      position,
      team_id || null,
      stats_json,
      bio || null,
      avatar_url || null,
      header_image_url || null, // Add this line
      isActive,
      full_name || name, // Default to character name if full name not provided
      age || null,
      nationality || null,
      hometown || null,
      height || null,
      weight || null,
      handedness || null,
      years_pro || null
    );
    
    // If this is set as active, update all other characters in a single operation
    if (isActive) {
      await characterOperations.setActiveCharacter(req.user.id, characterId);
    }
    
    res.status(201).json({
      message: 'Character created successfully',
      id: characterId
    });
  } catch (error) {
    handleApiError(res, error, 'Failed to create character');
  }
});

// Update a character
router.put('/characters/:id', authRequired, checkCharacterOwnership, async (req, res) => {
  try {
    const characterId = req.params.id;
    const { 
      name, 
      position, 
      team_id, 
      stats_json, 
      bio, 
      avatar_url,
      header_image_url,
      full_name,
      age,
      nationality,
      hometown,
      height,
      weight,
      handedness,
      years_pro
    } = req.body;
    
    // Validate that at least one field is being updated
    if (!name && !position && !team_id && !stats_json && !bio && 
      avatar_url === undefined && header_image_url === undefined &&
      !full_name && !age && !nationality && !hometown && !height && 
      !weight && !handedness && !years_pro) {
    return res.status(400).json({ message: 'No update data provided' });
  }
    
    // If position provided, validate it
    if (position) {
      const validPositions = ['C', 'LW', 'RW', 'D', 'G'];
      if (!validPositions.includes(position)) {
        return res.status(400).json({ message: 'Invalid position. Must be one of: C, LW, RW, D, G' });
      }
    }
    
    // Create update object with only the fields that are present
    const updateData = {};
    if (name) updateData.name = name;
    if (position) updateData.position = position;
    if (team_id !== undefined) updateData.team_id = team_id;
    if (stats_json) updateData.stats_json = stats_json;
    if (bio !== undefined) updateData.bio = bio;
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url;
    if (header_image_url !== undefined) updateData.header_image_url = header_image_url;
    if (full_name) updateData.full_name = full_name;
    if (age !== undefined) updateData.age = age;
    if (nationality) updateData.nationality = nationality;
    if (hometown) updateData.hometown = hometown;
    if (height) updateData.height = height;
    if (weight !== undefined) updateData.weight = weight;
    if (handedness) updateData.handedness = handedness;
    if (years_pro !== undefined) updateData.years_pro = years_pro;
    
    // Update character with a single database call
    await characterOperations.updateCharacter(characterId, updateData);
    
    res.status(200).json({ message: 'Character updated successfully' });
  } catch (error) {
    handleApiError(res, error, 'Failed to update character');
  }
});

// Set or update a contact
router.put('/characters/:id/contacts/:targetId', authRequired, checkCharacterOwnership, async (req, res) => {
  try {
    const characterId = req.params.id;
    const targetId = req.params.targetId;
    const { custom_name, custom_image } = req.body;
    
    const contact = await characterOperations.setCharacterContact(
      characterId, 
      targetId, 
      custom_name, 
      custom_image
    );
    
    res.status(200).json({ 
      message: 'Contact updated successfully',
      contact
    });
  } catch (error) {
    handleApiError(res, error, 'Failed to update character contact');
  }
});

// Set a character as active
router.put('/characters/:id/set-active', authRequired, checkCharacterOwnership, async (req, res) => {
  try {
    await characterOperations.setActiveCharacter(req.user.id, req.params.id);
    res.status(200).json({ message: 'Character set as active successfully' });
  } catch (error) {
    handleApiError(res, error, 'Failed to set character as active');
  }
});

// Get contacts for a character
router.get('/characters/:id/contacts', authRequired, checkCharacterOwnership, async (req, res) => {
  try {
    const characterId = req.params.id;
    const contacts = await characterOperations.getCharacterContacts(characterId);
    res.status(200).json(contacts);
  } catch (error) {
    handleApiError(res, error, 'Failed to fetch character contacts');
  }
});

// Get a specific contact
router.get('/characters/:id/contacts/:targetId', authRequired, checkCharacterOwnership, async (req, res) => {
  try {
    const characterId = req.params.id;
    const targetId = req.params.targetId;
    const contact = await characterOperations.getCharacterContact(characterId, targetId);
    res.status(200).json(contact || { target_character_id: targetId });
  } catch (error) {
    handleApiError(res, error, 'Failed to fetch character contact');
  }
});

// Get recent games for a character
router.get('/characters/:id/games', authRequired, checkCharacterOwnership, async (req, res) => {
  try {
    const characterId = req.params.id;
    const limit = parseInt(req.query.limit) || 5;
    
    const games = await characterOperations.getCharacterGames(characterId, limit);
    res.status(200).json(games);
  } catch (error) {
    handleApiError(res, error, 'Failed to fetch character games');
  }
});

// Delete a character
router.delete('/characters/:id', authRequired, checkCharacterOwnership, async (req, res) => {
  try {
    const characterId = req.params.id;
    
    // Get character to check if it's active before deletion
    const character = await characterOperations.getCharacterById(characterId);
    
    // Delete character
    await characterOperations.deleteCharacter(characterId);
    
    // If this was the active character, set another one as active if available
    if (character && character.is_active) {
      const remainingCharacters = await characterOperations.getUserCharacters(req.user.id);
      
      if (remainingCharacters.length > 0) {
        await characterOperations.setActiveCharacter(req.user.id, remainingCharacters[0].id);
      }
    }
    
    res.status(200).json({ message: 'Character deleted successfully' });
  } catch (error) {
    handleApiError(res, error, 'Failed to delete character');
  }
});

// Delete a contact
router.delete('/characters/:id/contacts/:targetId', authRequired, checkCharacterOwnership, async (req, res) => {
  try {
    const characterId = req.params.id;
    const targetId = req.params.targetId;
    
    await characterOperations.deleteCharacterContact(characterId, targetId);
    
    res.status(200).json({ 
      message: 'Contact deleted successfully'
    });
  } catch (error) {
    handleApiError(res, error, 'Failed to delete character contact');
  }
});

module.exports = router;