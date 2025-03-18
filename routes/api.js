// routes/api.js - API routes for the hockey roleplay application
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../public/js/auth');
const { 
  characterOperations, 
  teamOperations, 
  gameOperations,
  messageOperations,
  contactOperations
} = require('../config/db');

// Character routes
router.get('/my-characters', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const characters = await characterOperations.getUserCharacters(req.user.id);
    res.json(characters);
  } catch (error) {
    console.error('Error getting characters:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Team routes
router.get('/my-team', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    // For demo purposes, just return the first team where the user has a character
    const characters = await characterOperations.getUserCharacters(req.user.id);
    
    if (characters.length > 0 && characters[0].team_id) {
      // Get team details from the DB
      const teams = await teamOperations.getAllTeams();
      const team = teams.find(t => t.id === characters[0].team_id);
      
      if (team) {
        res.json(team);
      } else {
        res.json(null);
      }
    } else {
      res.json(null);
    }
  } catch (error) {
    console.error('Error getting team:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Game routes
router.get('/upcoming-games', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 5;
    const games = await gameOperations.getUpcomingGames(limit);
    res.json(games);
  } catch (error) {
    console.error('Error getting upcoming games:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Message routes
router.get('/unread-messages', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const count = await messageOperations.getUnreadMessageCount(req.user.id);
    res.json({ count });
  } catch (error) {
    console.error('Error getting unread message count:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/games/upcoming', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '2');
    const games = await gameOperations.getUpcomingGames(limit);
    res.json(games);
  } catch (error) {
    console.error('Error getting upcoming games:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;