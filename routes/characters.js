const express = require('express');
const router = express.Router();
const db = require('../config/database'); // Import the database connection

// Middleware to check if user is logged in
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return next();
  }
  res.redirect('/auth/login');
};

// List all characters
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const [results] = await db.query('SELECT * FROM characters');
    res.render('characters/index', { title: 'Characters', characters: results });
  } catch (err) {
    console.error('Error fetching characters:', err);
    res.status(500).send('An error occurred while fetching characters.');
  }
});

// Create character form
router.get('/create', isAuthenticated, async (req, res) => {
  try {
    // Fetch teams for the dropdown
    const [teams] = await db.query('SELECT id, name FROM teams ORDER BY name');
    res.render('characters/create', { 
      title: 'Create New Character',
      teams: teams 
    });
  } catch (err) {
    console.error('Error fetching teams:', err);
    res.status(500).send('An error occurred while loading the form.');
  }
});

// Handle character creation
router.post('/create', isAuthenticated, async (req, res) => {
  try {
    // Extract fields from form
    const { 
      name, age, gender, nickname, role, teamId, position, jerseyNumber,
      avatarUrl, faceclaim, personality, likes, dislikes,
      fears, goals, appearance, background, skills, fullBio, isPrivate
    } = req.body;
    
    const createdBy = req.session.user.id;
    const isPrivateValue = isPrivate ? 1 : 0;
    let teamName = null;

    // Get team name from team ID if provided
    if (teamId) {
      const [teamResults] = await db.query('SELECT name FROM teams WHERE id = ?', [teamId]);
      teamName = teamResults.length > 0 ? teamResults[0].name : null;
    }

    // Insert character
    await db.query(
      `INSERT INTO characters (
        name, age, gender, nickname, role, team, position, 
        jersey_number, url, faceclaim, personality, likes, dislikes,
        fears, goals, appearance, background, skills, full_bio, 
        is_private, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name, age, gender, nickname, role, teamName, position,
        jerseyNumber, avatarUrl, faceclaim, personality, likes, dislikes,
        fears, goals, appearance, background, skills, fullBio, 
        isPrivateValue, createdBy
      ]
    );
    
    res.redirect('/characters');
  } catch (err) {
    console.error('Error inserting character:', err);
    res.status(500).send('An error occurred while creating the character.');
  }
});

// View character profile
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const characterId = req.params.id;
    const [results] = await db.query('SELECT * FROM characters WHERE id = ?', [characterId]);
    
    if (results.length === 0) {
      return res.status(404).send('Character not found');
    }
    
    res.render('characters/profile', { title: 'Character Profile', character: results[0] });
  } catch (err) {
    console.error('Error fetching character profile:', err);
    res.status(500).send('An error occurred while fetching the character profile.');
  }
});

// Edit character form
router.get('/:id/edit', isAuthenticated, async (req, res) => {
  try {
    const characterId = req.params.id;
    const userId = req.session.user.id;

    // Get character data
    const [characterResults] = await db.query(
      'SELECT * FROM characters WHERE id = ?',
      [characterId]
    );
    
    if (characterResults.length === 0) {
      return res.status(404).send('Character not found');
    }

    // Check if user is allowed to edit this character
    const character = characterResults[0];
    if (character.created_by !== userId && !req.session.user.isAdmin) {
      return res.status(403).send('You are not authorized to edit this character');
    }

    // Get teams for dropdown
    const [teamResults] = await db.query('SELECT id, name FROM teams ORDER BY name');
    
    res.render('characters/edit', { 
      title: 'Edit Character', 
      character: character,
      teams: teamResults 
    });
  } catch (err) {
    console.error('Error loading edit form:', err);
    res.status(500).send('An error occurred while loading the edit form.');
  }
});

// Handle character update
router.post('/:id/edit', isAuthenticated, async (req, res) => {
  try {
    const characterId = req.params.id;
    const userId = req.session.user.id;
    
    // Extract fields from form
    const { 
      name, age, gender, nickname, role, teamId, position, jerseyNumber,
      avatarUrl, faceclaim, personality, likes, dislikes,
      fears, goals, appearance, background, skills, fullBio, isPrivate
    } = req.body;
    
    const isPrivateValue = isPrivate ? 1 : 0;

    // First check if user is authorized to edit this character
    const [authResults] = await db.query(
      'SELECT created_by FROM characters WHERE id = ?', 
      [characterId]
    );
    
    if (authResults.length === 0) {
      return res.status(404).send('Character not found');
    }

    if (authResults[0].created_by !== userId && !req.session.user.isAdmin) {
      return res.status(403).send('You are not authorized to edit this character');
    }

    let teamName = null;
    // Get team name from team ID if provided
    if (teamId) {
      const [teamResults] = await db.query('SELECT name FROM teams WHERE id = ?', [teamId]);
      teamName = teamResults.length > 0 ? teamResults[0].name : null;
    }

    // Update character
    await db.query(
      `UPDATE characters SET
        name = ?, age = ?, gender = ?, nickname = ?, role = ?, 
        team = ?, position = ?, jersey_number = ?, url = ?, 
        faceclaim = ?, personality = ?, likes = ?, dislikes = ?,
        fears = ?, goals = ?, appearance = ?, background = ?, 
        skills = ?, full_bio = ?, is_private = ?
      WHERE id = ?`,
      [
        name, age, gender, nickname, role, teamName, position,
        jerseyNumber, avatarUrl, faceclaim, personality, likes, dislikes,
        fears, goals, appearance, background, skills, fullBio, 
        isPrivateValue, characterId
      ]
    );
    
    res.redirect(`/characters/${characterId}`);
  } catch (err) {
    console.error('Error updating character:', err);
    res.status(500).send('An error occurred while updating the character.');
  }
}); 

// API endpoint to get character details for selection
router.get('/api/:id', isAuthenticated, async (req, res) => {
  try {
    const characterId = req.params.id;
    const userId = req.session.user.id;

    // Get character data for the current user
    const [results] = await db.query(
      'SELECT id, name, avatar_url, url, role, team FROM characters WHERE id = ? AND created_by = ?', 
      [characterId, userId]
    );
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'Character not found or not owned by you' });
    }

    // Set as active character in session
    req.session.activeCharacterId = characterId;
    req.session.activeCharacter = results[0];
    
    res.json({
      success: true,
      character: results[0]
    });
  } catch (err) {
    console.error('Error fetching character:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Set active character
router.post('/set-active/:id', isAuthenticated, async (req, res) => {
  try {
    const characterId = req.params.id;
    const userId = req.session.user.id;
    
    // Verify the character belongs to the user
    const [results] = await db.query(
      'SELECT id, name, avatar_url, url FROM characters WHERE id = ? AND created_by = ?', 
      [characterId, userId]
    );
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'Character not found or not owned by you' });
    }
    
    // Set as active character in session
    req.session.activeCharacterId = characterId;
    req.session.activeCharacter = results[0];
    
    res.json({
      success: true,
      character: results[0]
    });
  } catch (err) {
    console.error('Error setting active character:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;