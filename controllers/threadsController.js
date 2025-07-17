const db = require('../config/database');
let validationResult;

// Try to load express-validator
try {
  const expressValidator = require('express-validator');
  validationResult = expressValidator.validationResult;
  console.log('Express validator loaded in controller');
} catch (error) {
  console.error('Error loading express-validator in controller:', error.message);
  // Fallback validation if express-validator is not available
  validationResult = () => ({
    isEmpty: () => true,
    array: () => []
  });
}

// Add error handling in case express-validator is still not available
const validateRequest = (req) => {
  try {
    if (typeof validationResult === 'function') {
      return validationResult(req);
    } else {
      // Fallback validation if express-validator is not available
      console.warn('express-validator not available, using fallback validation');
      return {
        isEmpty: () => true,
        array: () => []
      };
    }
  } catch (error) {
    console.error('Error validating request:', error);
    return {
      isEmpty: () => true,
      array: () => []
    };
  }
};

// Log the controller object to ensure methods are defined
console.log('Initializing ThreadsController with methods');

const ThreadsController = {
  // Get all threads
  getAllThreads: async (req, res) => {
    console.log('getAllThreads method called');
    try {
      // Get user's characters for the character selector
      const [characters] = await db.query(
        'SELECT * FROM characters WHERE created_by = ?',
        [req.user.id]
      );

      // Query to get threads with count of participants and messages
      const [threads] = await db.query(`
        SELECT t.*,
               u.username as creator_name,
               c.name as character_name,
               COUNT(DISTINCT tp.user_id) as participant_count,
               COUNT(DISTINCT tm.id) as message_count
        FROM threads t
        LEFT JOIN users u ON t.creator_id = u.id
        LEFT JOIN characters c ON t.character_id = c.id
        LEFT JOIN thread_participants tp ON t.id = tp.thread_id
        LEFT JOIN thread_messages tm ON t.id = tm.thread_id
        WHERE t.privacy = 'public' OR t.creator_id = ? 
           OR t.id IN (SELECT thread_id FROM thread_participants WHERE user_id = ?)
        GROUP BY t.id
        ORDER BY t.updated_at DESC
      `, [req.user.id, req.user.id]);

      // Render the threads view with data
      res.render('writing/threads', {
        title: 'Writing Threads',
        threads,
        characters,
        user: req.user
      });
    } catch (error) {
      console.error('Error fetching threads:', error);
      req.flash('error_msg', 'Failed to load threads');
      res.redirect('/');
    }
  },

  // Get specific thread by ID
  getThreadById: async (req, res) => {
    console.log('getThreadById method called');
    try {
      const threadId = req.params.id;
      
      // Check if user has access to this thread
      const [threadAccess] = await db.query(`
        SELECT t.* FROM threads t
        LEFT JOIN thread_participants tp ON t.id = tp.thread_id AND tp.user_id = ?
        WHERE t.id = ? AND (t.privacy = 'public' OR t.creator_id = ? OR tp.user_id IS NOT NULL)
      `, [req.user.id, threadId, req.user.id]);
      
      if (threadAccess.length === 0) {
        req.flash('error_msg', 'You do not have access to this thread');
        return res.redirect('/writing/threads');
      }
      
      // Get thread details
      const [thread] = await db.query(`
        SELECT t.*, u.username as creator_name, c.name as character_name
        FROM threads t
        LEFT JOIN users u ON t.creator_id = u.id
        LEFT JOIN characters c ON t.character_id = c.id
        WHERE t.id = ?
      `, [threadId]);
      
      if (thread.length === 0) {
        req.flash('error_msg', 'Thread not found');
        return res.redirect('/writing/threads');
      }
      
      // Get thread participants
      const [participants] = await db.query(`
        SELECT tp.*, u.username, c.name as character_name, c.avatar_url
        FROM thread_participants tp
        JOIN users u ON tp.user_id = u.id
        LEFT JOIN characters c ON tp.character_id = c.id
        WHERE tp.thread_id = ?
      `, [threadId]);
      
      // Get thread messages
      const [messages] = await db.query(`
        SELECT tm.*, u.username, c.name as character_name, c.avatar_url,
               (SELECT COUNT(*) FROM thread_message_reactions 
                WHERE message_id = tm.id) as reaction_count
        FROM thread_messages tm
        JOIN users u ON tm.sender_id = u.id
        LEFT JOIN characters c ON tm.character_id = c.id
        WHERE tm.thread_id = ?
        ORDER BY tm.created_at ASC
      `, [threadId]);
      
      // Get user's characters for posting
      const [characters] = await db.query(
        'SELECT * FROM characters WHERE created_by = ?',
        [req.user.id]
      );
      
      // Update last read timestamp for this user
      await db.query(`
        UPDATE thread_participants 
        SET last_read_at = NOW() 
        WHERE thread_id = ? AND user_id = ?
      `, [threadId, req.user.id]);
      
      // Render thread view
      res.render('writing/thread-detail', {
        title: thread[0].title,
        thread: thread[0],
        participants,
        messages,
        characters,
        user: req.user
      });
    } catch (error) {
      console.error('Error fetching thread:', error);
      req.flash('error_msg', 'Failed to load thread');
      res.redirect('/writing/threads');
    }
  },

  // Create new thread
  createThread: async (req, res) => {
    try {
      console.log('Controller createThread called with:', req.body);
      
      if (!req.body.title) {
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
          return res.status(400).json({ success: false, message: 'Thread title is required' });
        }
        return res.status(400).render('error', { message: 'Thread title is required', error: {} });
      }
      
      console.log('Inserting thread with simplified approach');
      
      // Insert the thread
      const [threadResult] = await db.query(`
        INSERT INTO threads (title, description, creator_id, character_id, privacy, status)
        VALUES (?, ?, ?, ?, ?, 'active')
      `, [
        req.body.title, 
        req.body.description || '', 
        req.user.id, 
        req.body.character_id || null,
        req.body.privacy || 'public'
      ]);
      
      const threadId = threadResult.insertId;
      console.log(`Thread inserted with ID: ${threadId}`);
      
      // Insert the participant
      await db.query(`
        INSERT INTO thread_participants (thread_id, user_id, character_id, is_admin)
        VALUES (?, ?, ?, true)
      `, [threadId, req.user.id, req.body.character_id || null]);
      
      console.log('Participant added successfully');
      
      // Verify the thread exists
      const [checkThread] = await db.query('SELECT * FROM threads WHERE id = ?', [threadId]);
      console.log('Verification result:', checkThread.length ? 'Thread exists' : 'Thread not created');
      
      if (checkThread.length === 0) {
        throw new Error('Thread was not created in the database');
      }
      
      if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.json({ 
          success: true, 
          message: 'Thread created successfully',
          thread: checkThread[0],
          threadId,
          redirect: `/writing/threads/${threadId}`
        });
      }
      
      // For normal requests
      req.flash('success_msg', 'Thread created successfully');
      return res.redirect(`/writing/threads/${threadId}`);
    } catch (error) {
      console.error('Controller error creating thread:', error);
      console.error('SQL message:', error.sqlMessage || 'No SQL message');
      
      if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to create thread', 
          error: error.message,
          sqlMessage: error.sqlMessage || 'No SQL message'
        });
      }
      
      req.flash('error_msg', 'Failed to create thread');
      return res.redirect('/writing/threads');
    }
  },

  // Update thread
  updateThread: async (req, res) => {
    try {
      const threadId = req.params.id;
      // Accept both JSON and form fields
      const { title, description, privacy, status } = req.body;

      // Check if user is admin of the thread
      const [threadAdmin] = await db.query(`
        SELECT * FROM thread_participants
        WHERE thread_id = ? AND user_id = ? AND is_admin = true
      `, [threadId, req.user.id]);

      if (threadAdmin.length === 0) {
        // Support both API and web responses
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
          return res.status(403).json({ 
            message: 'You do not have permission to update this thread' 
          });
        }
        req.flash('error_msg', 'You do not have permission to update this thread');
        return res.redirect('/writing/threads');
      }

      // Only update provided fields
      const updates = [];
      const params = [];
      if (title !== undefined) { updates.push('title = ?'); params.push(title); }
      if (description !== undefined) { updates.push('description = ?'); params.push(description); }
      if (privacy !== undefined) { updates.push('privacy = ?'); params.push(privacy); }
      if (status !== undefined) { updates.push('status = ?'); params.push(status); }

      if (updates.length === 0) {
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
          return res.status(400).json({ message: 'No fields to update' });
        }
        req.flash('error_msg', 'No fields to update');
        return res.redirect('/writing/threads');
      }

      params.push(threadId);

      await db.query(`
        UPDATE threads
        SET ${updates.join(', ')}
        WHERE id = ?
      `, params);

      if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.json({ message: 'Thread updated successfully' });
      }
      req.flash('success_msg', 'Thread updated successfully');
      res.redirect(`/writing/threads/${threadId}`);
    } catch (error) {
      console.error('Error updating thread:', error);
      if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(500).json({ message: 'Failed to update thread' });
      }
      req.flash('error_msg', 'Failed to update thread');
      res.redirect('/writing/threads');
    }
  },

  // Delete thread
  deleteThread: async (req, res) => {
    try {
      const threadId = req.params.id;
      
      // Check if user is admin of the thread
      const [threadAdmin] = await db.query(`
        SELECT * FROM thread_participants
        WHERE thread_id = ? AND user_id = ? AND is_admin = true
      `, [threadId, req.user.id]);
      
      if (threadAdmin.length === 0) {
        return res.status(403).json({ 
          message: 'You do not have permission to delete this thread' 
        });
      }
      
      // Delete thread and all related data (cascade delete will handle the rest)
      await db.query('DELETE FROM threads WHERE id = ?', [threadId]);
      
      res.json({ message: 'Thread deleted successfully' });
    } catch (error) {
      console.error('Error deleting thread:', error);
      res.status(500).json({ message: 'Failed to delete thread' });
    }
  },

  // Join thread
  joinThread: async (req, res) => {
    try {
      const threadId = req.params.id;
      const { character_id } = req.body;
      
      // Check if thread exists and is public
      const [thread] = await db.query(`
        SELECT * FROM threads 
        WHERE id = ? AND (privacy = 'public' OR creator_id = ?)
      `, [threadId, req.user.id]);
      
      if (thread.length === 0) {
        return res.status(403).json({ 
          message: 'This thread cannot be joined' 
        });
      }
      
      // Check if user is already a participant
      const [existingParticipant] = await db.query(`
        SELECT * FROM thread_participants
        WHERE thread_id = ? AND user_id = ?
      `, [threadId, req.user.id]);
      
      if (existingParticipant.length > 0) {
        return res.status(400).json({ 
          message: 'You are already a participant in this thread' 
        });
      }
      
      // Add user as participant
      await db.query(`
        INSERT INTO thread_participants 
        (thread_id, user_id, character_id, is_admin, joined_at, last_read_at)
        VALUES (?, ?, ?, false, NOW(), NOW())
      `, [threadId, req.user.id, character_id || null]);
      
      res.json({ message: 'Successfully joined thread' });
    } catch (error) {
      console.error('Error joining thread:', error);
      res.status(500).json({ message: 'Failed to join thread' });
    }
  },

  // Leave thread
  leaveThread: async (req, res) => {
    try {
      const threadId = req.params.id;
      
      // Check if user is a participant
      const [participant] = await db.query(`
        SELECT * FROM thread_participants
        WHERE thread_id = ? AND user_id = ?
      `, [threadId, req.user.id]);
      
      if (participant.length === 0) {
        return res.status(400).json({ 
          message: 'You are not a participant in this thread' 
        });
      }
      
      // Check if user is the creator and last admin
      const [threadCreator] = await db.query(`
        SELECT * FROM threads WHERE id = ? AND creator_id = ?
      `, [threadId, req.user.id]);
      
      if (threadCreator.length > 0) {
        const [otherAdmins] = await db.query(`
          SELECT * FROM thread_participants
          WHERE thread_id = ? AND user_id != ? AND is_admin = true
        `, [threadId, req.user.id]);
        
        if (otherAdmins.length === 0) {
          return res.status(400).json({ 
            message: 'You cannot leave this thread as you are the only admin. Transfer admin rights or delete the thread instead.' 
          });
        }
      }
      
      // Remove user from participants
      await db.query(`
        DELETE FROM thread_participants
        WHERE thread_id = ? AND user_id = ?
      `, [threadId, req.user.id]);
      
      res.json({ message: 'Successfully left thread' });
    } catch (error) {
      console.error('Error leaving thread:', error);
      res.status(500).json({ message: 'Failed to leave thread' });
    }
  },

  // Get thread messages
  getThreadMessages: async (req, res) => {
    try {
      const threadId = req.params.id;
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;
      
      // Check if user has access to this thread
      const [threadAccess] = await db.query(`
        SELECT t.* FROM threads t
        LEFT JOIN thread_participants tp ON t.id = tp.thread_id AND tp.user_id = ?
        WHERE t.id = ? AND (t.privacy = 'public' OR t.creator_id = ? OR tp.user_id IS NOT NULL)
      `, [req.user.id, threadId, req.user.id]);
      
      if (threadAccess.length === 0) {
        return res.status(403).json({ 
          message: 'You do not have access to this thread' 
        });
      }
      
      // Get thread messages with pagination
      const [messages] = await db.query(`
        SELECT tm.*, u.username, c.name as character_name, c.avatar_url
        FROM thread_messages tm
        JOIN users u ON tm.sender_id = u.id
        LEFT JOIN characters c ON tm.character_id = c.id
        WHERE tm.thread_id = ?
        ORDER BY tm.created_at DESC
        LIMIT ? OFFSET ?
      `, [threadId, parseInt(limit), parseInt(offset)]);
      
      // Get total count for pagination
      const [countResult] = await db.query(`
        SELECT COUNT(*) as total FROM thread_messages WHERE thread_id = ?
      `, [threadId]);
      
      const totalMessages = countResult[0].total;
      const totalPages = Math.ceil(totalMessages / limit);
      
      res.json({
        messages,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          totalMessages,
          totalPages
        }
      });
    } catch (error) {
      console.error('Error fetching thread messages:', error);
      res.status(500).json({ message: 'Failed to load messages' });
    }
  },

  // Post thread message
  postThreadMessage: async (req, res) => {
    try {
      const threadId = req.params.id;
      const { content, character_id, has_media } = req.body;
      
      // Check if user is a participant
      const [participant] = await db.query(`
        SELECT * FROM thread_participants
        WHERE thread_id = ? AND user_id = ?
      `, [threadId, req.user.id]);
      
      if (participant.length === 0) {
        return res.status(403).json({ 
          message: 'You must be a participant to post in this thread' 
        });
      }
      
      // Insert message
      const [result] = await db.query(`
        INSERT INTO thread_messages 
        (thread_id, sender_id, character_id, content, has_media, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, NOW(), NOW())
      `, [threadId, req.user.id, character_id || null, content, has_media || false]);
      
      const messageId = result.insertId;
      
      // Update thread's updated_at timestamp
      await db.query(`
        UPDATE threads SET updated_at = NOW() WHERE id = ?
      `, [threadId]);
      
      // Update participant's last_read_at timestamp
      await db.query(`
        UPDATE thread_participants 
        SET last_read_at = NOW() 
        WHERE thread_id = ? AND user_id = ?
      `, [threadId, req.user.id]);
      
      // Get the created message with sender info
      const [message] = await db.query(`
        SELECT tm.*, u.username, c.name as character_name, c.avatar_url
        FROM thread_messages tm
        JOIN users u ON tm.sender_id = u.id
        LEFT JOIN characters c ON tm.character_id = c.id
        WHERE tm.id = ?
      `, [messageId]);
      
      res.json({
        message: 'Message posted successfully',
        data: message[0]
      });
    } catch (error) {
      console.error('Error posting message:', error);
      res.status(500).json({ message: 'Failed to post message' });
    }
  },

  // Update thread message
  updateThreadMessage: async (req, res) => {
    try {
      const { threadId, messageId } = req.params;
      const { content } = req.body;
      
      // Check if message exists and user is the sender
      const [message] = await db.query(`
        SELECT * FROM thread_messages
        WHERE id = ? AND thread_id = ? AND sender_id = ?
      `, [messageId, threadId, req.user.id]);
      
      if (message.length === 0) {
        return res.status(403).json({ 
          message: 'You can only edit your own messages' 
        });
      }
      
      // Update message
      await db.query(`
        UPDATE thread_messages
        SET content = ?, updated_at = NOW()
        WHERE id = ?
      `, [content, messageId]);
      
      res.json({ message: 'Message updated successfully' });
    } catch (error) {
      console.error('Error updating message:', error);
      res.status(500).json({ message: 'Failed to update message' });
    }
  },

  // Delete thread message
  deleteThreadMessage: async (req, res) => {
    try {
      const { threadId, messageId } = req.params;
      
      // Check if message exists and user is the sender or thread admin
      const [message] = await db.query(`
        SELECT tm.* FROM thread_messages tm
        WHERE tm.id = ? AND tm.thread_id = ? AND (
          tm.sender_id = ? OR EXISTS (
            SELECT 1 FROM thread_participants tp 
            WHERE tp.thread_id = ? AND tp.user_id = ? AND tp.is_admin = true
          )
        )
      `, [messageId, threadId, req.user.id, threadId, req.user.id]);
      
      if (message.length === 0) {
        return res.status(403).json({ 
          message: 'You do not have permission to delete this message' 
        });
      }
      
      // Delete message
      await db.query('DELETE FROM thread_messages WHERE id = ?', [messageId]);
      
      res.json({ message: 'Message deleted successfully' });
    } catch (error) {
      console.error('Error deleting message:', error);
      res.status(500).json({ message: 'Failed to delete message' });
    }
  },

  // Add reaction to message
  addReactionToMessage: async (req, res) => {
    try {
      const { threadId, messageId } = req.params;
      const { reaction_type, character_id } = req.body;
      
      // Check if user is a participant
      const [participant] = await db.query(`
        SELECT * FROM thread_participants
        WHERE thread_id = ? AND user_id = ?
      `, [threadId, req.user.id]);
      
      if (participant.length === 0) {
        return res.status(403).json({ 
          message: 'You must be a participant to react to messages' 
        });
      }
      
      // Check if reaction already exists
      const [existingReaction] = await db.query(`
        SELECT * FROM thread_message_reactions
        WHERE message_id = ? AND user_id = ? AND 
              character_id <=> ? AND reaction_type = ?
      `, [messageId, req.user.id, character_id || null, reaction_type]);
      
      if (existingReaction.length > 0) {
        return res.status(400).json({ 
          message: 'You have already added this reaction' 
        });
      }
      
      // Add reaction
      await db.query(`
        INSERT INTO thread_message_reactions
        (message_id, user_id, character_id, reaction_type, created_at)
        VALUES (?, ?, ?, ?, NOW())
      `, [messageId, req.user.id, character_id || null, reaction_type]);
      
      res.json({ message: 'Reaction added successfully' });
    } catch (error) {
      console.error('Error adding reaction:', error);
      res.status(500).json({ message: 'Failed to add reaction' });
    }
  },

  // Remove reaction from message
  removeReactionFromMessage: async (req, res) => {
    try {
      const { threadId, messageId, reactionType } = req.params;
      const { character_id } = req.body;
      
      // Remove reaction
      await db.query(`
        DELETE FROM thread_message_reactions
        WHERE message_id = ? AND user_id = ? AND 
              character_id <=> ? AND reaction_type = ?
      `, [messageId, req.user.id, character_id || null, reactionType]);
      
      res.json({ message: 'Reaction removed successfully' });
    } catch (error) {
      console.error('Error removing reaction:', error);
      res.status(500).json({ message: 'Failed to remove reaction' });
    }
  },

  // Invite user to thread
  inviteUserToThread: async (req, res) => {
    try {
      const threadId = req.params.id;
      const { invitee_id } = req.body;
      
      // Check if user is a participant and has permission to invite
      const [participant] = await db.query(`
        SELECT * FROM thread_participants
        WHERE thread_id = ? AND user_id = ? AND is_admin = true
      `, [threadId, req.user.id]);
      
      if (participant.length === 0) {
        return res.status(403).json({ 
          message: 'You must be a thread admin to invite users' 
        });
      }
      
      // Check if invitation already exists
      const [existingInvitation] = await db.query(`
        SELECT * FROM thread_invitations
        WHERE thread_id = ? AND invitee_id = ? AND status = 'pending'
      `, [threadId, invitee_id]);
      
      if (existingInvitation.length > 0) {
        return res.status(400).json({ 
          message: 'This user has already been invited' 
        });
      }
      
      // Check if user is already a participant
      const [existingParticipant] = await db.query(`
        SELECT * FROM thread_participants
        WHERE thread_id = ? AND user_id = ?
      `, [threadId, invitee_id]);
      
      if (existingParticipant.length > 0) {
        return res.status(400).json({ 
          message: 'This user is already a participant' 
        });
      }
      
      // Create invitation
      await db.query(`
        INSERT INTO thread_invitations
        (thread_id, inviter_id, invitee_id, status, invited_at)
        VALUES (?, ?, ?, 'pending', NOW())
      `, [threadId, req.user.id, invitee_id]);
      
      res.json({ message: 'Invitation sent successfully' });
    } catch (error) {
      console.error('Error sending invitation:', error);
      res.status(500).json({ message: 'Failed to send invitation' });
    }
  },

  // Respond to thread invitation
  respondToInvitation: async (req, res) => {
    try {
      const invitationId = req.params.invitationId;
      const { status, character_id } = req.body;
      
      // Check if invitation exists for this user
      const [invitation] = await db.query(`
        SELECT * FROM thread_invitations
        WHERE id = ? AND invitee_id = ? AND status = 'pending'
      `, [invitationId, req.user.id]);
      
      if (invitation.length === 0) {
        return res.status(404).json({ 
          message: 'Invitation not found or already processed' 
        });
      }
      
      // Update invitation status
      await db.query(`
        UPDATE thread_invitations
        SET status = ?, responded_at = NOW()
        WHERE id = ?
      `, [status, invitationId]);
      
      // If accepted, add user as participant
      if (status === 'accepted') {
        await db.query(`
          INSERT INTO thread_participants
          (thread_id, user_id, character_id, is_admin, joined_at, last_read_at)
          VALUES (?, ?, ?, false, NOW(), NOW())
        `, [invitation[0].thread_id, req.user.id, character_id || null]);
      }
      
      res.json({ message: `Invitation ${status} successfully` });
    } catch (error) {
      console.error('Error responding to invitation:', error);
      res.status(500).json({ message: 'Failed to process invitation response' });
    }
  },

  // Get user's thread invitations
  getUserInvitations: async (req, res) => {
    try {
      // Get pending invitations for the user
      const [invitations] = await db.query(`
        SELECT ti.*, t.title as thread_title, u.username as inviter_name
        FROM thread_invitations ti
        JOIN threads t ON ti.thread_id = t.id
        JOIN users u ON ti.inviter_id = u.id
        WHERE ti.invitee_id = ? AND ti.status = 'pending'
        ORDER BY ti.invited_at DESC
      `, [req.user.id]);
      
      res.json({ invitations });
    } catch (error) {
      console.error('Error fetching invitations:', error);
      res.status(500).json({ message: 'Failed to load invitations' });
    }
  }
};

// Log the methods to ensure they're defined
console.log('ThreadsController methods:', Object.keys(ThreadsController));

module.exports = ThreadsController;
