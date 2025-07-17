const express = require('express');
const router = express.Router();
const db = require('../config/database');
const Character = require('../models/Character');

// We don't need the ensureAuthenticated middleware for testing purposes right now
// const { ensureAuthenticated } = require('../middleware/auth');

// Import the controller properly
const ThreadsController = require('../controllers/threadsController');

// Debug logging
console.log('Loading threads routes with controller methods:', Object.keys(ThreadsController));

// Add middleware for testing purposes
const tempAuth = (req, res, next) => {
  console.log('Auth middleware called in threads routes');
  
  // Use existing user in session if available
  if (req.session && req.session.user) {
    req.user = req.session.user;
    console.log('Using existing session user:', req.user.username);
  } else {
    // Otherwise use a dummy user for testing
    req.user = { id: 1, username: 'visitor' };
    console.log('No session user, using dummy visitor user');
  }
  next();
};

// Define routes with explicit functions to avoid undefined middleware errors
router.get('/', tempAuth, (req, res) => {
  console.log('GET / route handler called');
  try {
    // Fallback implementation
    db.query(`
      SELECT t.*, 
             u.username as creator_name,
             COUNT(DISTINCT tp.id) as participant_count,
             COUNT(DISTINCT tm.id) as message_count,
             MAX(tm.created_at) as last_message_at
      FROM threads t
      LEFT JOIN users u ON t.creator_id = u.id
      LEFT JOIN thread_participants tp ON t.id = tp.thread_id
      LEFT JOIN thread_messages tm ON t.id = tm.thread_id
      GROUP BY t.id
      ORDER BY last_message_at DESC, t.updated_at DESC
    `)
    // Profile query with EXPLAIN
    db.query(`
      EXPLAIN
      SELECT t.*, 
             u.username as creator_name,
             COUNT(DISTINCT tp.id) as participant_count,
             COUNT(DISTINCT tm.id) as message_count,
             MAX(tm.created_at) as last_message_at
      FROM threads t
      LEFT JOIN users u ON t.creator_id = u.id
      LEFT JOIN thread_participants tp ON t.id = tp.thread_id
      LEFT JOIN thread_messages tm ON t.id = tm.thread_id
      GROUP BY t.id
      ORDER BY last_message_at DESC, t.updated_at DESC
    `)
    // Consider indexes:
    // CREATE INDEX idx_threads_creator_id ON threads(creator_id);
    // CREATE INDEX idx_thread_participants_thread_id ON thread_participants(thread_id);
    // CREATE INDEX idx_thread_messages_thread_id ON thread_messages(thread_id);
    .then(([explain]) => {
      // ...existing code...
      return db.query(`
        SELECT t.*, 
               u.username as creator_name,
               COUNT(DISTINCT tp.id) as participant_count,
               COUNT(DISTINCT tm.id) as message_count,
               MAX(tm.created_at) as last_message_at
        FROM threads t
        LEFT JOIN users u ON t.creator_id = u.id
        LEFT JOIN thread_participants tp ON t.id = tp.thread_id
        LEFT JOIN thread_messages tm ON t.id = tm.thread_id
        GROUP BY t.id
        ORDER BY last_message_at DESC, t.updated_at DESC
      `);
    })
    .then(([threads]) => {
      res.json({ success: true, threads });
    })
    .catch(err => {
      console.error('Error executing query:', err);
      res.status(500).json({ success: false, message: 'Server error while fetching threads' });
    });
  } catch (err) {
    console.error('Error in route handler:', err);
    res.status(500).json({ success: false, message: 'Server error while fetching threads' });
  }
});

// Create thread
router.post('/', tempAuth, (req, res) => {
  console.log('Create thread API called with body:', JSON.stringify(req.body));
  
  // Validate required fields
  if (!req.body.title) {
    return res.status(400).json({ success: false, message: 'Thread title is required' });
  }
  
  // Start by ensuring we're using the correct database
  db.query('USE northern_attitude')
    .then(() => {
      console.log('Database connection established and using northern_attitude');
      
      // Use the exact same query pattern that worked in the test script
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
      
      return db.query(insertThreadQuery, threadValues);
    })
    .then(([threadResult]) => {
      const threadId = threadResult.insertId;
      console.log(`Thread inserted with ID: ${threadId}`);
      
      if (!threadId) {
        throw new Error('Failed to get thread ID after insert');
      }
      
      // Now insert the participant - same pattern as test script
      const insertParticipantQuery = `
        INSERT INTO thread_participants 
        (thread_id, user_id, is_admin) 
        VALUES (?, ?, ?)
      `;
      
      return db.query(insertParticipantQuery, [threadId, req.user.id, true])
        .then(() => {
          console.log('Participant added successfully');
          
          // Return thread data with ID for response
          return db.query('SELECT * FROM threads WHERE id = ?', [threadId])
            .then(([threads]) => {
              return { threadId, thread: threads[0] };
            });
        });
    })
    .then(({ threadId, thread }) => {
      console.log('Thread creation completed successfully:', thread);
      
      // Return success
      res.json({ 
        success: true, 
        message: 'Thread created successfully',
        thread,
        threadId,
        redirect: `/writing/threads/${threadId}`
      });
    })
    .catch(error => {
      console.error('Error creating thread:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Database error creating thread',
        error: error.message,
        sqlMessage: error.sqlMessage || 'No SQL message'
      });
    });
});

// Join thread
router.post('/:id/join', tempAuth, (req, res) => {
  const threadId = req.params.id;
  console.log(`Join thread ${threadId} API called`);
  
  // Check if thread exists
  db.query('SELECT * FROM threads WHERE id = ?', [threadId])
    .then(([threads]) => {
      if (threads.length === 0) {
        return res.status(404).json({ success: false, message: 'Thread not found' });
      }
      
      // Check if user is already a participant
      return db.query(
        'SELECT * FROM thread_participants WHERE thread_id = ? AND user_id = ?',
        [threadId, req.user.id]
      )
      .then(([participants]) => {
        if (participants.length > 0) {
          return res.json({ 
            success: true, 
            message: 'Already a participant in this thread',
            redirect: `/writing/threads/${threadId}`
          });
        }
        
        // Add user as participant
        return db.query(
          `INSERT INTO thread_participants 
           (thread_id, user_id, is_admin) 
           VALUES (?, ?, ?)`,
          [threadId, req.user.id, false]
        )
        .then(() => {
          res.json({ 
            success: true, 
            message: 'Joined thread successfully',
            redirect: `/writing/threads/${threadId}`
          });
        });
      });
    })
    .catch(err => {
      console.error('Error joining thread:', err);
      res.status(500).json({ success: false, message: 'Server error while joining thread' });
    });
});

// Get invitations
router.get('/invitations', tempAuth, (req, res) => {
  console.log('Get invitations API called');
  
  // Fetch invitations from database
  db.query(
    `SELECT i.*, t.title, u.username as inviter_name
     FROM thread_invitations i
     JOIN threads t ON i.thread_id = t.id
     JOIN users u ON i.inviter_id = u.id
     WHERE i.invitee_id = ? AND i.status = 'pending'`,
    [req.user.id]
  )
  .then(([invitations]) => {
    res.json({ success: true, invitations });
  })
  .catch(err => {
    console.error('Error fetching invitations:', err);
    res.status(500).json({ success: false, message: 'Server error while fetching invitations' });
  });
});

// Thread by ID
router.get('/:id', tempAuth, (req, res) => {
  const threadId = req.params.id;
  console.log(`Get thread ${threadId} API called`);
  
  // Get thread details
  db.query(
    `SELECT t.*, u.username as creator_name
     FROM threads t
     JOIN users u ON t.creator_id = u.id
     WHERE t.id = ?`,
    [threadId]
  )
  .then(([threads]) => {
    if (threads.length === 0) {
      return res.status(404).json({ success: false, message: 'Thread not found' });
    }
    
    const thread = threads[0];
    
    // Get participants
    return db.query(
      `SELECT tp.*, u.username
       FROM thread_participants tp
       JOIN users u ON tp.user_id = u.id
       WHERE tp.thread_id = ?`,
      [threadId]
    )
    .then(([participants]) => {
      // Get messages
      return db.query(
        `SELECT tm.*, u.username, c.name as character_name
         FROM thread_messages tm
         JOIN users u ON tm.sender_id = u.id
         LEFT JOIN characters c ON tm.character_id = c.id
         WHERE tm.thread_id = ?
         ORDER BY tm.created_at ASC`,
        [threadId]
      )
      .then(([messages]) => {
        // Format the thread data for response
        const threadData = {
          ...thread,
          participants: participants.map(p => ({
            id: p.user_id,
            username: p.username,
            role: p.is_admin ? 'admin' : 'participant',
            character_id: p.character_id
          })),
          messages: messages.map(m => ({
            id: m.id,
            content: m.content,
            created_at: m.created_at,
            user_id: m.sender_id,
            username: m.username,
            character_id: m.character_id,
            character_name: m.character_name
          }))
        };
        
        res.json({ success: true, thread: threadData });
      });
    });
  })
  .catch(err => {
    console.error('Error fetching thread:', err);
    res.status(500).json({ success: false, message: 'Server error while fetching thread' });
  });
});

// Post message to thread
router.post('/:id/messages', tempAuth, (req, res) => {
  const threadId = req.params.id;
  const { content, character_id } = req.body;
  
  console.log(`Posting message to thread ${threadId}:`, content);
  
  // Validate content
  if (!content || content.trim() === '') {
    return res.status(400).json({
      success: false,
      message: 'Message content is required'
    });
  }
  
  // Check if thread exists and user is a participant
  db.query(
    `SELECT * FROM thread_participants 
     WHERE thread_id = ? AND user_id = ?`,
    [threadId, req.user.id]
  )
  .then(([participants]) => {
    // If user is not a participant, check if thread is public and add them
    if (participants.length === 0) {
      return db.query(
        `SELECT * FROM threads WHERE id = ? AND privacy = 'public'`,
        [threadId]
      )
      .then(([threads]) => {
        if (threads.length === 0) {
          return Promise.reject({ status: 403, message: 'You must be a participant to post in this thread' });
        }
        
        // Auto-join public thread
        return db.query(
          `INSERT INTO thread_participants (thread_id, user_id, is_admin)
           VALUES (?, ?, false)`,
          [threadId, req.user.id]
        ).then(() => true);
      });
    }
    return true;
  })
  .then(() => {
    // Insert the message
    return db.query(
      `INSERT INTO thread_messages 
       (thread_id, sender_id, character_id, content, created_at, updated_at)
       VALUES (?, ?, ?, ?, NOW(), NOW())`,
      [threadId, req.user.id, character_id || null, content]
    );
  })
  .then(([result]) => {
    const messageId = result.insertId;
    
    // Update thread's updated_at timestamp
    return db.query(
      `UPDATE threads SET updated_at = NOW() WHERE id = ?`,
      [threadId]
    )
    .then(() => messageId);
  })
  .then((messageId) => {
    // Get the created message with sender info
    return db.query(
      `SELECT tm.*, u.username, c.name as character_name, c.avatar_url
       FROM thread_messages tm
       JOIN users u ON tm.sender_id = u.id
       LEFT JOIN characters c ON tm.character_id = c.id
       WHERE tm.id = ?`,
      [messageId]
    );
  })
  .then(([messages]) => {
    res.json({
      success: true,
      message: 'Message posted successfully',
      data: messages[0]
    });
  })
  .catch(error => {
    console.error('Error posting message:', error);
    const status = error.status || 500;
    const message = error.message || 'Failed to post message';
    res.status(status).json({ success: false, message });
  });
});

// Add PUT route for updating a thread
router.put('/:id', tempAuth, ThreadsController.updateThread);

module.exports = router;
