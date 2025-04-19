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
router.get('/', isAuthenticated, (req, res) => {
  db.query('SELECT * FROM characters', (err, results) => {
    if (err) throw err;
    res.render('characters/index', { title: 'Characters', characters: results });
  });
});

// Create character form
router.get('/create', isAuthenticated, (req, res) => {
  // Fetch teams for the dropdown
  db.query('SELECT id, name FROM teams ORDER BY name', (err, teams) => {
    if (err) throw err;
    res.render('characters/create', { 
      title: 'Create New Character',
      teams: teams 
    });
  });
});

// Handle character creation
router.post('/create', isAuthenticated, (req, res) => {
  // Extract fields from form
  const { 
    name, age, gender, nickname, role, teamId, position, jerseyNumber,
    avatarUrl, faceclaim, personality, likes, dislikes,
    fears, goals, appearance, background, skills, fullBio, isPrivate
  } = req.body;
  
  const createdBy = req.session.user.id;
  const isPrivateValue = isPrivate ? 1 : 0;

  // Get team name from team ID if provided
  if (teamId) {
    db.query('SELECT name FROM teams WHERE id = ?', [teamId], (err, results) => {
      if (err) throw err;
      
      const teamName = results.length > 0 ? results[0].name : null;
      
      // Insert character with team information
      insertCharacter(teamName);
    });
  } else {
    // Insert character without team
    insertCharacter(null);
  }

  function insertCharacter(teamName) {
    db.query(
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
      ],
      (err, result) => {
        if (err) {
          console.error('Error inserting character:', err);
          return res.status(500).send('An error occurred while creating the character.');
        }
        res.redirect('/characters');
      }
    );
  }
});

// View character profile
router.get('/:id', isAuthenticated, (req, res) => {
  const characterId = req.params.id;

  db.query('SELECT * FROM characters WHERE id = ?', [characterId], (err, results) => {
    if (err) throw err;
    if (results.length === 0) {
      return res.status(404).send('Character not found');
    }
    res.render('characters/profile', { title: 'Character Profile', character: results[0] });
  });
});

// Edit character form
router.get('/:id/edit', isAuthenticated, (req, res) => {
  const characterId = req.params.id;
  const userId = req.session.user.id;

  // Get character data
  db.query(
    'SELECT * FROM characters WHERE id = ?', 
    [characterId], 
    (err, characterResults) => {
      if (err) throw err;
      if (characterResults.length === 0) {
        return res.status(404).send('Character not found');
      }

      // Check if user is allowed to edit this character
      const character = characterResults[0];
      if (character.created_by !== userId && !req.session.user.isAdmin) {
        return res.status(403).send('You are not authorized to edit this character');
      }

      // Get teams for dropdown
      db.query('SELECT id, name FROM teams ORDER BY name', (err, teamResults) => {
        if (err) throw err;
        
        res.render('characters/edit', { 
          title: 'Edit Character', 
          character: character,
          teams: teamResults 
        });
      });
    }
  );
});

// Handle character update
router.post('/:id/edit', isAuthenticated, (req, res) => {
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
  db.query(
    'SELECT created_by FROM characters WHERE id = ?', 
    [characterId], 
    (err, results) => {
      if (err) throw err;
      if (results.length === 0) {
        return res.status(404).send('Character not found');
      }

      if (results[0].created_by !== userId && !req.session.user.isAdmin) {
        return res.status(403).send('You are not authorized to edit this character');
      }

      // Get team name from team ID if provided
      if (teamId) {
        db.query('SELECT name FROM teams WHERE id = ?', [teamId], (err, teamResults) => {
          if (err) throw err;
          
          const teamName = teamResults.length > 0 ? teamResults[0].name : null;
          
          // Update character with team information
          updateCharacter(teamName);
        });
      } else {
        // Update character without team
        updateCharacter(null);
      }
    }
  );

  function updateCharacter(teamName) {
    db.query(
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
      ],
      (err) => {
        if (err) {
          console.error('Error updating character:', err);
          return res.status(500).send('An error occurred while updating the character.');
        }
        res.redirect(`/characters/${characterId}`);
      }
    );
  }
}); 

// API endpoint to get character details for selection
router.get('/api/:id', isAuthenticated, (req, res) => {
  const characterId = req.params.id;
  const userId = req.session.user.id;

  // Get character data for the current user
  db.query(
    'SELECT id, name, avatar_url, url, role, team FROM characters WHERE id = ? AND created_by = ?', 
    [characterId, userId], 
    (err, results) => {
      if (err) {
        console.error('Error fetching character:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
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
    }
  );
});

// Set active character
router.post('/set-active/:id', isAuthenticated, (req, res) => {
  const characterId = req.params.id;
  const userId = req.session.user.id;
  
  // Verify the character belongs to the user
  db.query(
    'SELECT id, name, avatar_url, url FROM characters WHERE id = ? AND created_by = ?', 
    [characterId, userId], 
    (err, results) => {
      if (err) {
        console.error('Error setting active character:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
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
    }
  );
});

module.exports = router;