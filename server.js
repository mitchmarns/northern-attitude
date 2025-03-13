// server.js - Main server file
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { authMiddleware, authService } = require('./public/js/auth');
const { userOperations, characterOperations, teamOperations, gameOperations, messageOperations } = require('./db');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({
  origin: 'http://localhost:3000', // Update with your frontend URL in production
  credentials: true
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Authentication routes
app.post('/api/auth/register', authService.register);
app.post('/api/auth/login', authService.login);
app.post('/api/auth/logout', authService.logout);
app.get('/api/auth/current-user', authMiddleware.isAuthenticated, authService.getCurrentUser);
app.post('/api/auth/password-reset-request', authService.requestPasswordReset);
app.post('/api/auth/password-reset', authService.resetPassword);

// Protected API routes
app.get('/api/my-characters', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const characters = await characterOperations.getUserCharacters(req.user.id);
    res.json(characters);
  } catch (error) {
    console.error('Error getting characters:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/upcoming-games', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 5;
    const games = await gameOperations.getUpcomingGames(limit);
    res.json(games);
  } catch (error) {
    console.error('Error getting upcoming games:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/my-team', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    // Get the user's primary character
    const characters = await characterOperations.getUserCharacters(req.user.id);
    
    // If the user has no characters or the first character has no team, return null
    if (!characters.length || !characters[0].team_id) {
      return res.json(null);
    }
    
    // Get the team details
    const teamId = characters[0].team_id;
    const team = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM Teams WHERE id = ?', [teamId], (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });
    
    res.json(team);
  } catch (error) {
    console.error('Error getting team data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/unread-messages', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const count = await messageOperations.getUnreadMessageCount(req.user.id);
    res.json({ count });
  } catch (error) {
    console.error('Error getting unread messages:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Catch-all route to serve the SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});