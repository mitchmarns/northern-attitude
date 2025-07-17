const express = require('express');
const router = express.Router();
const db = require('../config/database');
const Character = require('../models/Character');

// For testing, we'll use a temporary auth middleware
const tempAuth = (req, res, next) => {
  console.log('Auth middleware called in writing routes');
  
  // Use existing user in session if available
  if (req.session && req.session.user) {
    req.user = req.session.user;
    console.log('Using existing session user:', req.user.username);
  } else {
    // Otherwise use a dummy user for testing that doesn't override any real users
    const dummyUser = { id: 1, username: 'visitor' };
    req.user = dummyUser;
    
    // Set up session if it doesn't exist
    req.session = req.session || {};
    req.session.user = dummyUser;
    console.log('No session user, using dummy visitor user');
  }
  next();
};

// GET writing dashboard - use tempAuth for testing
router.get('/', tempAuth, (req, res) => {
  res.render('writing/index', { 
    title: 'Writing Dashboard',
    user: req.user
  });
});

// Also handle /index explicitly to address the 404 error
router.get('/index', tempAuth, (req, res) => {
  res.render('writing/index', { 
    title: 'Writing Dashboard',
    user: req.user
  });
});

// GET threads page - use tempAuth and handle directly
router.get('/threads', tempAuth, async (req, res) => {
  console.log('Rendering threads page');
  
  try {
    // Use the test user ID if needed
    const userId = req.user.id;
    
    // Fetch threads from database using the db instance
    const [threads] = await db.query(`
      SELECT t.*, 
             u.username as creator_name
      FROM threads t
      LEFT JOIN users u ON t.creator_id = u.id
      ORDER BY t.updated_at DESC
    `);
    
    // If no threads exist yet, still render the page with empty data
    const threadsWithCounts = threads.length > 0 ? 
      await Promise.all(threads.map(async (thread) => {
        const [participantRows] = await db.query(
          'SELECT COUNT(*) as count FROM thread_participants WHERE thread_id = ?', 
          [thread.id]
        );
        
        const [messageRows] = await db.query(
          'SELECT COUNT(*) as count FROM thread_messages WHERE thread_id = ?', 
          [thread.id]
        );
        
        return {
          ...thread,
          participant_count: participantRows[0].count,
          message_count: messageRows[0].count
        };
      })) : [];
    
    // Fetch characters for the current user using the Character model
    let characters = [];
    try {
      characters = await Character.getByUserId(userId);
    } catch (error) {
      console.error('Error fetching characters:', error);
      // If Character model fails, try direct query
      try {
        [characters] = await db.query('SELECT * FROM characters WHERE created_by = ?', [userId]);
      } catch (err) {
        console.error('Error fetching characters via direct query:', err);
      }
    }
    
    // Check which threads the user is a participant in
    let participations = [];
    try {
      [participations] = await db.query(
        'SELECT thread_id FROM thread_participants WHERE user_id = ?',
        [userId]
      );
    } catch (error) {
      console.error('Error fetching participations:', error);
      // Continue with empty participations array
    }
    
    // Create a Map for quick lookups
    const userParticipations = new Map();
    participations.forEach(p => userParticipations.set(p.thread_id, true));
    
    res.render('writing/threads', { 
      title: 'Writing Threads',
      threads: threadsWithCounts,
      characters: characters,
      user: req.user,
      formatDate: (date) => {
        try {
          const d = new Date(date);
          return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
        } catch (e) {
          return 'Invalid date';
        }
      },
      isParticipant: (threadId) => userParticipations.has(threadId),
      isEmpty: threadsWithCounts.length === 0
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).render('error', { 
      message: 'Error loading threads',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// POST - Create new thread - simplified to work with your schema
router.post('/threads', tempAuth, async (req, res) => {
  console.log('Creating new thread with body:', JSON.stringify(req.body));
  
  try {
    // Validate required fields
    if (!req.body.title) {
      if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(400).json({ success: false, message: 'Thread title is required' });
      }
      return res.status(400).render('error', { message: 'Thread title is required', error: {} });
    }
    
    console.log('Thread creation - creating in database northern_attitude');
    
    // Explicitly use the correct database schema
    await db.query('USE northern_attitude');
    
    // Super simplified query that exactly matches your schema
    const insertThreadQuery = `
      INSERT INTO threads 
      (title, description, creator_id, privacy, status) 
      VALUES (?, ?, ?, ?, ?)
    `;
    
    const threadValues = [
      req.body.title,
      req.body.description || '',
      req.user.id,
      req.body.privacy || 'public',
      'active'
    ];
    
    console.log('Executing thread insert with values:', threadValues);
    
    // Insert thread directly
    const [threadResult] = await db.query(insertThreadQuery, threadValues);
    const threadId = threadResult.insertId;
    
    console.log(`Thread inserted with ID: ${threadId}`);
    
    if (!threadId) {
      throw new Error('Failed to get thread ID after insert');
    }
    
    // Insert participant directly
    const insertParticipantQuery = `
      INSERT INTO thread_participants 
      (thread_id, user_id, is_admin) 
      VALUES (?, ?, ?)
    `;
    
    await db.query(insertParticipantQuery, [threadId, req.user.id, true]);
    
    console.log('Participant added successfully');
    
    // Verify the thread exists
    const [threads] = await db.query('SELECT * FROM threads WHERE id = ?', [threadId]);
    
    if (threads.length === 0) {
      throw new Error('Thread not found after creation');
    }
    
    console.log('Thread verified in database:', threads[0]);
    
    // Return response based on request type
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json({ 
        success: true, 
        message: 'Thread created',
        thread: threads[0],
        threadId,
        redirect: `/writing/threads/${threadId}`
      });
    }
    
    // Regular form submission - redirect to the new thread
    return res.redirect(`/writing/threads/${threadId}`);
  } catch (error) {
    console.error('Error creating thread:', error);
    console.error('SQL message:', error.sqlMessage || 'No SQL message');
    
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.status(500).json({ 
        success: false, 
        message: 'Server error while creating thread',
        error: error.message,
        sqlMessage: error.sqlMessage || 'No SQL message'
      });
    }
    
    res.status(500).render('error', { 
      message: 'Server error while creating thread',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
});

// GET single thread page
router.get('/threads/:id', tempAuth, async (req, res) => {
  const threadId = req.params.id;
  console.log(`Viewing thread ${threadId}`);
  
  try {
    // Fetch thread details using direct db query
    const [threadRows] = await db.query(
      `SELECT t.*, u.username as creator_name 
       FROM threads t 
       JOIN users u ON t.creator_id = u.id 
       WHERE t.id = ?`,
      [threadId]
    );
    
    if (threadRows.length === 0) {
      return res.status(404).render('error', { 
        message: 'Thread not found',
        user: req.user
      });
    }
    
    const thread = threadRows[0];
    
    // Fetch messages for this thread
    const [messages] = await db.query(
      `SELECT m.*, 
              u.username as sender_name,
              c.name as character_name,
              c.avatar_url as character_avatar
       FROM thread_messages m
       JOIN users u ON m.sender_id = u.id
       LEFT JOIN characters c ON m.character_id = c.id
       WHERE m.thread_id = ?
       ORDER BY m.created_at ASC`,
      [threadId]
    );
    
    // Fetch participants
    const [participants] = await db.query(
      `SELECT p.*, 
              u.username,
              c.name as character_name,
              c.avatar_url
       FROM thread_participants p
       JOIN users u ON p.user_id = u.id
       LEFT JOIN characters c ON p.character_id = c.id
       WHERE p.thread_id = ?`,
      [threadId]
    );
    
    // Get user's characters for posting
    const [characters] = await db.query(
      'SELECT * FROM characters WHERE created_by = ?',
      [req.user.id]
    );
    
    // Update last read timestamp for this user
    await db.query(`
      INSERT INTO thread_participants 
      (thread_id, user_id, is_admin, joined_at, last_read_at)
      VALUES (?, ?, false, NOW(), NOW())
      ON DUPLICATE KEY UPDATE last_read_at = NOW()
    `, [threadId, req.user.id]);
    
    res.render('writing/thread-detail', {
      title: thread.title,
      thread,
      messages: messages || [],
      participants: participants || [],
      characters,
      isEmpty: messages.length === 0,
      user: req.user
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).render('error', { 
      message: 'Error loading thread',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
});

// Add a diagnostic route to check the database schema
router.get('/diagnostic/schema', tempAuth, async (req, res) => {
  try {
    // Get schema information for threads table
    const [threadColumns] = await db.query('SHOW COLUMNS FROM threads');
    
    // Get schema information for thread_participants table
    const [participantColumns] = await db.query('SHOW COLUMNS FROM thread_participants');
    
    // Check if there are any threads in the database
    const [threads] = await db.query('SELECT * FROM threads LIMIT 10');
    
    // Check if there are any participants in the database
    const [participants] = await db.query('SELECT * FROM thread_participants LIMIT 10');
    
    // Check database engine and table status
    const [threadsStatus] = await db.query('SHOW TABLE STATUS LIKE "threads"');
    
    // Return the diagnostic information
    res.json({
      threadColumns,
      participantColumns,
      threadsCount: threads.length,
      threads,
      participantsCount: participants.length,
      participants,
      threadsStatus: threadsStatus[0]
    });
  } catch (error) {
    console.error('Error getting schema:', error);
    res.status(500).json({ 
      error: 'Error retrieving database schema',
      message: error.message
    });
  }
});

// Add direct database testing endpoint
router.get('/database-test', tempAuth, async (req, res) => {
  try {
    // Test database connection
    const [result1] = await db.query('SELECT 1 as test');
    
    // Explicitly select database
    await db.query('USE northern_attitude');
    
    // Show all tables
    const [tables] = await db.query('SHOW TABLES');
    
    // Check if threads table exists
    const [threadExists] = await db.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'northern_attitude' 
      AND table_name = 'threads'
    `);
    
    // Try to insert directly
    const insertResult = await db.query(`
      INSERT INTO threads (title, description, creator_id, privacy, status)
      VALUES ('Test Thread', 'Direct test', 1, 'public', 'active')
    `);
    
    const threadId = insertResult[0].insertId;
    
    // Get the inserted thread
    const [thread] = await db.query('SELECT * FROM threads WHERE id = ?', [threadId]);
    
    res.json({
      connectionTest: result1[0].test === 1 ? 'success' : 'failed',
      tables,
      threadTableExists: threadExists[0].count > 0,
      insertedThreadId: threadId,
      insertedThread: thread[0]
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({
      error: 'Database test failed',
      message: error.message,
      sqlMessage: error.sqlMessage || 'No SQL message',
      stack: error.stack
    });
  }
});

// Error handling middleware
router.use((err, req, res, next) => {
  console.error('Database error:', err);
  res.status(500).render('error', {
    title: 'Database Error',
    message: 'We encountered a problem connecting to the database. Please try again later.',
    error: process.env.NODE_ENV === 'development' ? err : {},
    user: req.user
  });
});

module.exports = router;
