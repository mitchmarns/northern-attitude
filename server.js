// server.js - Express server for hockey roleplay application
const express = require('express');
const path = require('path');
const { db, userOperations, characterOperations, teamOperations, gameOperations, messageOperations } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes for API
app.get('/api/my-characters', async (req, res) => {
  try {
    // For demo purposes, hardcoded user ID 1 (in a real app, this would come from authentication)
    const userId = 1;
    const characters = await characterOperations.getUserCharacters(userId);
    res.json(characters);
  } catch (error) {
    console.error('Error fetching characters:', error);
    res.status(500).json({ error: 'Failed to fetch characters' });
  }
});

app.get('/api/teams', async (req, res) => {
  try {
    const teams = await teamOperations.getAllTeams();
    res.json(teams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

app.get('/api/upcoming-games', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 5;
    const games = await gameOperations.getUpcomingGames(limit);
    res.json(games);
  } catch (error) {
    console.error('Error fetching upcoming games:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming games' });
  }
});

app.get('/api/unread-messages', async (req, res) => {
  try {
    // For demo purposes, hardcoded user ID 1 (in a real app, this would come from authentication)
    const userId = 1;
    const count = await messageOperations.getUnreadMessageCount(userId);
    res.json({ count });
  } catch (error) {
    console.error('Error fetching unread message count:', error);
    res.status(500).json({ error: 'Failed to fetch unread message count' });
  }
});

// API to get user team
app.get('/api/my-team', async (req, res) => {
  try {
    // For demo purposes, using hardcoded user ID 1
    const userId = 1;
    const characters = await characterOperations.getUserCharacters(userId);
    
    // Get the team of the first character (if any)
    if (characters && characters.length > 0 && characters[0].team_id) {
      // In a real app, you would have a separate function to get team details
      // For simplicity, we're creating a mock response
      res.json({
        id: characters[0].team_id,
        name: characters[0].team_name,
        record: '8-4-2'
      });
    } else {
      res.json(null);
    }
  } catch (error) {
    console.error('Error fetching user team:', error);
    res.status(500).json({ error: 'Failed to fetch user team' });
  }
});

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'dash.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  try {
    await db.close();
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});