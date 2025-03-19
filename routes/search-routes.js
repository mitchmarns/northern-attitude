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
router.get('/characters', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const query = req.query.q || '';
    const excludeUserId = req.query.excludeUserId || null;
    
    if (query.length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }
    
    console.log(`Search request received for: "${query}"`);
    
    // Split the query into words for more flexible matching
    const queryWords = query.toLowerCase().split(/\s+/);
    
    // Create SQL for each word to match against either full name or parts of name
    let sqlConditions = [];
    let sqlParams = [];
    
    // First try exact match with the full query
    sqlConditions.push('LOWER(c.name) LIKE ?');
    sqlParams.push(`%${query.toLowerCase()}%`);
    
    // Then try matching each word individually
    queryWords.forEach(word => {
      if (word.length >= 2) { // Only use words of at least 2 characters
        sqlConditions.push('LOWER(c.name) LIKE ?');
        sqlParams.push(`%${word}%`);
      }
    });
    
    // If we have exclude user ID, add it to params
    if (excludeUserId) {
      sqlParams.push(excludeUserId);
    }
    
    // Build the final SQL query
    const sql = `
      SELECT 
        c.id, 
        c.name, 
        c.position, 
        c.avatar_url, 
        t.name as team_name
      FROM Characters c
      LEFT JOIN Teams t ON c.team_id = t.id
      WHERE (${sqlConditions.join(' OR ')})
      ${excludeUserId ? 'AND c.id != ?' : ''}
      ORDER BY 
        CASE 
          WHEN LOWER(c.name) LIKE ? THEN 1 -- Exact match first
          WHEN LOWER(c.name) LIKE ? THEN 2 -- Starts with the query
          ELSE 3                           -- Contains the query
        END,
        c.name
      LIMIT 10
    `;
    
    // Add parameters for the ORDER BY clause
    sqlParams.push(`${query.toLowerCase()}`);     // Exact match
    sqlParams.push(`${query.toLowerCase()}%`);    // Starts with
    
    const characters = await new Promise((resolve, reject) => {
      db.all(sql, sqlParams, (err, rows) => {
        if (err) {
          console.error('Error in SQL query:', err);
          reject(err);
        }
        console.log(`Found ${rows ? rows.length : 0} characters matching "${query}"`);
        resolve(rows || []);
      });
    });
    
    res.status(200).json(characters);
  } catch (error) {
    console.error('Error searching characters:', error);
    res.status(500).json({ message: 'Server error during character search' });
  }
});

module.exports = router;