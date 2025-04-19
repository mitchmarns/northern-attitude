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

// List all teams
router.get('/', isAuthenticated, (req, res) => {
  db.query('SELECT * FROM teams', (err, results) => {
    if (err) throw err;
    res.render('teams/teams', { title: 'All Teams', teams: results });
  });
});

// Create team form
router.get('/create', isAuthenticated, (req, res) => {
  res.render('teams/create', { title: 'Create New Team' });
});

// Handle team creation
router.post('/create', isAuthenticated, (req, res) => {
  const { name, description, city, mascot, logo_url, primary_color, secondary_color, accent_color } = req.body; // Include color fields
  const createdBy = req.session.user.id;

  db.query(
    'INSERT INTO teams (name, description, city, mascot, logo_url, primary_color, secondary_color, accent_color, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [name, description, city, mascot, logo_url, primary_color, secondary_color, accent_color, createdBy], // Add color fields
    (err) => {
      if (err) throw err;
      res.redirect('/teams');
    }
  );
});

// View team profile
router.get('/:id', isAuthenticated, (req, res) => {
  const teamId = req.params.id;

  db.query('SELECT * FROM teams WHERE id = ?', [teamId], (err, results) => {
    if (err) throw err;
    if (results.length === 0) {
      return res.status(404).send('Team not found');
    }
    
    // Sanitize color values to ensure they are valid CSS colors
    const team = results[0];
    
    // Check if colors are in valid format and clean them if needed
    if (team.primary_color) {
      // Ensure it's a valid CSS color format (hex, rgb, etc.)
      team.primary_color = team.primary_color.trim();
      if (!team.primary_color.startsWith('#') && 
          !team.primary_color.startsWith('rgb') && 
          !team.primary_color.startsWith('hsl')) {
        team.primary_color = '#' + team.primary_color.replace(/[^0-9a-f]/gi, '');
      }
    }
    
    if (team.secondary_color) {
      team.secondary_color = team.secondary_color.trim();
      if (!team.secondary_color.startsWith('#') && 
          !team.secondary_color.startsWith('rgb') && 
          !team.secondary_color.startsWith('hsl')) {
        team.secondary_color = '#' + team.secondary_color.replace(/[^0-9a-f]/gi, '');
      }
    }
    
    if (team.accent_color) {
      team.accent_color = team.accent_color.trim();
      if (!team.accent_color.startsWith('#') && 
          !team.accent_color.startsWith('rgb') && 
          !team.accent_color.startsWith('hsl')) {
        team.accent_color = '#' + team.accent_color.replace(/[^0-9a-f]/gi, '');
      }
    }
    
    res.render('teams/profile', { title: 'Team Profile', team: team });
  });
});

// Edit team form
router.get('/:id/edit', isAuthenticated, (req, res) => {
  const teamId = req.params.id;

  db.query('SELECT * FROM teams WHERE id = ?', [teamId], (err, results) => {
    if (err) throw err;
    if (results.length === 0) {
      return res.status(404).send('Team not found');
    }
    res.render('teams/edit', { title: 'Edit Team', team: results[0] });
  });
});

// Handle team update
router.post('/:id/edit', isAuthenticated, (req, res) => {
  const teamId = req.params.id;
  const { name, description, city, mascot, logo_url, primary_color, secondary_color, accent_color } = req.body; // Include color fields

  db.query(
    'UPDATE teams SET name = ?, description = ?, city = ?, mascot = ?, logo_url = ?, primary_color = ?, secondary_color = ?, accent_color = ? WHERE id = ?',
    [name, description, city, mascot, logo_url, primary_color, secondary_color, accent_color, teamId], // Add color fields
    (err) => {
      if (err) throw err;
      res.redirect(`/teams/${teamId}`);
    }
  );
});

module.exports = router;