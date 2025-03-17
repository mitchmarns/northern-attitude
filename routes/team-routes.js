// Save this file as 'thread-routes.js' in your routes directory

const express = require('express');
const router = express.Router();
const { db } = require('../config/db');
const { authMiddleware } = require('../public/js/auth');

// Create a new roleplay thread
router.post('/threads', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const { title, description, location } = req.body;
    
    // Validate input
    if (!title) {
      return res.status(400).json({ message: 'Thread title is required' });
    }
    
    // Get the user's active character
    const activeCharacter = await new Promise((resolve, reject) => {
      db.get(`
        SELECT id FROM Characters 
        WHERE user_id = ? AND is_active = 1
      `, [req.user.id], (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });
    
    if (!activeCharacter) {
      return res.status(400).json({ message: 'You must have an active character to create a thread' });
    }
    
    // Insert new thread
    const threadResult = await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO RoleplayThreads 
        (title, description, location, created_by_character_id) 
        VALUES (?, ?, ?, ?)
      `, [title, description || null, location || null, activeCharacter.id], function(err) {
        if (err) reject(err);
        resolve(this);
      });
    });
    
    // Automatically add creator as a participant
    await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO ThreadParticipants 
        (thread_id, character_id) 
        VALUES (?, ?)
      `, [threadResult.lastID, activeCharacter.id], (err) => {
        if (err) reject(err);
        resolve();
      });
    });
    
    res.status(201).json({ 
      message: 'Thread created successfully', 
      threadId: threadResult.lastID 
    });
  } catch (error) {
    console.error('Error creating thread:', error);
    res.status(500).json({ message: 'Failed to create thread' });
  }
});

// Get threads (with filtering options)
router.get('/threads', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const { location, status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    // Build query conditions
    const conditions = [];
    const params = [];
    
    if (location) {
      conditions.push('location = ?');
      params.push(location);
    }
    
    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Get threads with additional details
    const threads = await new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          rt.id, 
          rt.title, 
          rt.description, 
          rt.location, 
          rt.status, 
          rt.created_at,
          c.name AS creator_name,
          c.avatar_url AS creator_avatar,
          (SELECT COUNT(*) FROM ThreadPosts WHERE thread_id = rt.id) AS post_count,
          (SELECT COUNT(*) FROM ThreadParticipants WHERE thread_id = rt.id) AS participant_count
        FROM RoleplayThreads rt
        JOIN Characters c ON rt.created_by_character_id = c.id
        ${whereClause}
        ORDER BY rt.updated_at DESC
        LIMIT ? OFFSET ?
      `, [...params, limit, offset], (err, rows) => {
        if (err) reject(err);
        resolve(rows);
      });
    });
    
    // Get total count for pagination
    const totalCount = await new Promise((resolve, reject) => {
      db.get(`
        SELECT COUNT(*) as count 
        FROM RoleplayThreads 
        ${whereClause}
      `, params, (err, row) => {
        if (err) reject(err);
        resolve(row.count);
      });
    });
    
    res.status(200).json({
      threads,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        totalThreads: totalCount
      }
    });
  } catch (error) {
    console.error('Error fetching threads:', error);
    res.status(500).json({ message: 'Failed to fetch threads' });
  }
});

// Get a specific thread with its posts
router.get('/threads/:id', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const threadId = req.params.id;
    
    // Get thread details
    const thread = await new Promise((resolve, reject) => {
      db.get(`
        SELECT 
          rt.*, 
          c.name AS creator_name,
          c.avatar_url AS creator_avatar
        FROM RoleplayThreads rt
        JOIN Characters c ON rt.created_by_character_id = c.id
        WHERE rt.id = ?
      `, [threadId], (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });
    
    if (!thread) {
      return res.status(404).json({ message: 'Thread not found' });
    }
    
    // Get thread posts with character details
    const posts = await new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          tp.*, 
          c.name AS character_name, 
          c.avatar_url AS character_avatar,
          c.position AS character_position,
          t.name AS character_team
        FROM ThreadPosts tp
        JOIN Characters c ON tp.character_id = c.id
        LEFT JOIN Teams t ON c.team_id = t.id
        WHERE tp.thread_id = ?
        ORDER BY tp.created_at ASC
      `, [threadId], (err, rows) => {
        if (err) reject(err);
        resolve(rows);
      });
    });
    
    // Get participants
    const participants = await new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          c.id, 
          c.name, 
          c.avatar_url,
          tp.status,
          tp.joined_at
        FROM ThreadParticipants tp
        JOIN Characters c ON tp.character_id = c.id
        WHERE tp.thread_id = ?
      `, [threadId], (err, rows) => {
        if (err) reject(err);
        resolve(rows);
      });
    });
    
    res.status(200).json({
      thread,
      posts,
      participants
    });
  } catch (error) {
    console.error('Error fetching thread details:', error);
    res.status(500).json({ message: 'Failed to fetch thread details' });
  }
});

// Add a post to a thread
router.post('/threads/:id/posts', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const threadId = req.params.id;
    const { content } = req.body;
    
    // Validate input
    if (!content) {
      return res.status(400).json({ message: 'Post content is required' });
    }
    
    // Get the user's active character
    const activeCharacter = await new Promise((resolve, reject) => {
      db.get(`
        SELECT id FROM Characters 
        WHERE user_id = ? AND is_active = 1
      `, [req.user.id], (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });
    
    if (!activeCharacter) {
      return res.status(400).json({ message: 'You must have an active character to post' });
    }
    
    // Check if character is already a participant, if not, add them
    const isParticipant = await new Promise((resolve, reject) => {
      db.get(`
        SELECT * FROM ThreadParticipants 
        WHERE thread_id = ? AND character_id = ?
      `, [threadId, activeCharacter.id], (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });
    
    if (!isParticipant) {
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO ThreadParticipants 
          (thread_id, character_id) 
          VALUES (?, ?)
        `, [threadId, activeCharacter.id], (err) => {
          if (err) reject(err);
          resolve();
        });
      });
    }
    
    // Insert new post
    const postResult = await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO ThreadPosts 
        (thread_id, character_id, content) 
        VALUES (?, ?, ?)
      `, [threadId, activeCharacter.id, content], function(err) {
        if (err) reject(err);
        resolve(this);
      });
    });
    
    // Update thread's updated_at timestamp
    await new Promise((resolve, reject) => {
      db.run(`
        UPDATE RoleplayThreads 
        SET updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [threadId], (err) => {
        if (err) reject(err);
        resolve();
      });
    });
    
    // Update participant's last_post_at
    await new Promise((resolve, reject) => {
      db.run(`
        UPDATE ThreadParticipants 
        SET last_post_at = CURRENT_TIMESTAMP 
        WHERE thread_id = ? AND character_id = ?
      `, [threadId, activeCharacter.id], (err) => {
        if (err) reject(err);
        resolve();
      });
    });
    
    res.status(201).json({ 
      message: 'Post added successfully', 
      postId: postResult.lastID 
    });
  } catch (error) {
    console.error('Error adding post:', error);
    res.status(500).json({ message: 'Failed to add post' });
  }
});

// Close a thread (only creator or admin can do this)
router.post('/threads/:id/close', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const threadId = req.params.id;
    
    // Check if the user has permission to close the thread
    const thread = await new Promise((resolve, reject) => {
      db.get(`
        SELECT rt.*, c.user_id 
        FROM RoleplayThreads rt
        JOIN Characters c ON rt.created_by_character_id = c.id
        WHERE rt.id = ?
      `, [threadId], (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });
    
    if (!thread) {
      return res.status(404).json({ message: 'Thread not found' });
    }
    
    // Check if user is the creator or an admin
    const isCreator = thread.user_id === req.user.id;
    const isAdmin = req.user.role === 'admin';
    
    if (!isCreator && !isAdmin) {
      return res.status(403).json({ message: 'You do not have permission to close this thread' });
    }
    
    // Close the thread
    await new Promise((resolve, reject) => {
      db.run(`
        UPDATE RoleplayThreads 
        SET status = 'closed', updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [threadId], (err) => {
        if (err) reject(err);
        resolve();
      });
    });
    
    res.status(200).json({ message: 'Thread closed successfully' });
  } catch (error) {
    console.error('Error closing thread:', error);
    res.status(500).json({ message: 'Failed to close thread' });
  }
});

module.exports = router;