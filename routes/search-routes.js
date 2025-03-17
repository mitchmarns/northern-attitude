// routes/search-routes.js
const express = require('express');
const router = express.Router();
const { db } = require('../config/db');
const { authMiddleware } = require('../public/js/auth');

// Helper function for database queries
const dbQueryAll = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      resolve(rows || []);
    });
  });
};

// Search for characters
router.get('/characters/search', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const query = req.query.q || '';
    const excludeId = req.query.excludeId || null;
    
    if (query.length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }
    
    // Search for characters by name
    const characters = await dbQueryAll(`
      SELECT c.id, c.name, c.position, c.avatar_url, c.user_id, t.name as team_name
      FROM Characters c
      LEFT JOIN Teams t ON c.team_id = t.id
      WHERE c.name LIKE ? 
      ${excludeId ? 'AND c.id != ?' : ''}
      ORDER BY c.name
      LIMIT 20
    `, [`%${query}%`, ...(excludeId ? [excludeId] : [])]);
    
    res.status(200).json(characters);
  } catch (error) {
    console.error('Error searching characters:', error);
    res.status(500).json({ message: 'Server error during character search' });
  }
});

module.exports = router;