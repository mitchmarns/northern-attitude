const express = require('express');
const router = express.Router();

// Temporary middleware to replace ensureAuthenticated
const tempAuth = (req, res, next) => {
  console.log('Auth middleware called in API routes');
  
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

// Define API routes with direct function handlers

// Root API endpoint
router.get('/', (req, res) => {
  console.log('API root route called');
  res.json({ message: 'Welcome to the API' });
});

// Authentication endpoints
router.post('/auth/login', (req, res) => {
  console.log('Login API route called');
  res.json({ message: 'Login endpoint' });
});

router.post('/auth/register', (req, res) => {
  console.log('Register API route called');
  res.json({ message: 'Register endpoint' });
});

router.post('/auth/logout', (req, res) => {
  console.log('Logout API route called');
  res.json({ message: 'Logout endpoint' });
});

// User endpoints
router.get('/users/me', tempAuth, (req, res) => {
  console.log('Current user API route called');
  res.json({ user: req.user });
});

router.get('/users/:id', tempAuth, (req, res) => {
  console.log(`Get user ${req.params.id} API route called`);
  res.json({ message: `User ${req.params.id} details` });
});

// Thread API endpoints
router.get('/threads', tempAuth, (req, res) => {
  console.log('Get threads API route called');
  res.json({ threads: [] });
});

router.post('/threads', tempAuth, (req, res) => {
  console.log('Create thread API route called');
  res.json({ message: 'Thread created' });
});

router.get('/threads/:id', tempAuth, (req, res) => {
  console.log(`Get thread ${req.params.id} API route called`);
  res.json({ message: `Thread ${req.params.id} details` });
});

// Add endpoint for posting messages to threads
router.post('/threads/:id/messages', tempAuth, (req, res) => {
  const threadId = req.params.id;
  const { content, character_id } = req.body;
  
  console.log(`Post message to thread ${threadId} API called with content:`, content);
  
  // Validate content
  if (!content || content.trim() === '') {
    return res.status(400).json({
      success: false,
      message: 'Message content is required'
    });
  }
  
  // Get the database instance
  const db = require('../config/database');
  
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

// Add endpoint for deleting messages from threads
router.delete('/threads/:id/messages/:messageId', tempAuth, (req, res) => {
  const threadId = req.params.id;
  const messageId = req.params.messageId;
  const db = require('../config/database');

  // Check if the user is the sender or a thread admin
  db.query(
    `SELECT tm.*, tp.is_admin
     FROM thread_messages tm
     LEFT JOIN thread_participants tp ON tm.thread_id = tp.thread_id AND tp.user_id = ?
     WHERE tm.id = ? AND tm.thread_id = ?`,
    [req.user.id, messageId, threadId]
  )
  .then(([rows]) => {
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }
    const msg = rows[0];
    if (msg.sender_id !== req.user.id && !msg.is_admin) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this message' });
    }
    // Delete the message
    return db.query(
      `DELETE FROM thread_messages WHERE id = ? AND thread_id = ?`,
      [messageId, threadId]
    ).then(() => {
      res.json({ success: true, message: 'Message deleted' });
    });
  })
  .catch(error => {
    console.error('Error deleting message:', error);
    res.status(500).json({ success: false, message: 'Failed to delete message' });
  });
});

// Add endpoint for updating a thread (PUT /threads/:id)
router.put('/threads/:id', tempAuth, async (req, res) => {
  const threadId = req.params.id;
  const { title, description, privacy, status } = req.body;
  const db = require('../config/database');

  try {
    // Check if user is admin of the thread
    const [threadAdmin] = await db.query(
      `SELECT * FROM thread_participants WHERE thread_id = ? AND user_id = ? AND is_admin = true`,
      [threadId, req.user.id]
    );
    if (threadAdmin.length === 0) {
      return res.status(403).json({ message: 'You do not have permission to update this thread' });
    }

    // Only update provided fields
    const updates = [];
    const params = [];
    if (title !== undefined) { updates.push('title = ?'); params.push(title); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (privacy !== undefined) { updates.push('privacy = ?'); params.push(privacy); }
    if (status !== undefined) { updates.push('status = ?'); params.push(status); }
    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }
    params.push(threadId);

    await db.query(
      `UPDATE threads SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
    res.json({ message: 'Thread updated successfully' });
  } catch (error) {
    console.error('Error updating thread:', error);
    res.status(500).json({ message: 'Failed to update thread' });
  }
});

// Fallback for any other API routes
router.all('*', (req, res) => {
  console.log(`Unknown API route called: ${req.method} ${req.path}`);
  res.status(404).json({ error: 'API endpoint not found' });
});

module.exports = router;
