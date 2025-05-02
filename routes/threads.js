const express = require('express');
const router = express.Router();
const ThreadsController = require('../controllers/threadsController');
const { ensureAuthenticated } = require('../middleware/auth');

// Try to load express-validator with a fallback
let { body } = { body: () => (req, res, next) => next() };
try {
  const validator = require('express-validator');
  body = validator.body;
  console.log('Express validator loaded successfully');
} catch (err) {
  console.error('Could not load express-validator, using fallback:', err.message);
}

// Get all threads
router.get('/', ensureAuthenticated, ThreadsController.getAllThreads);

// Get specific thread
router.get('/:id', ensureAuthenticated, ThreadsController.getThreadById);

// Create new thread with validation
router.post('/', ensureAuthenticated, [
  body('title').trim().isLength({ min: 1 }).withMessage('Title is required'),
  body('privacy').isIn(['public', 'private', 'invite-only']).withMessage('Invalid privacy setting')
], ThreadsController.createThread);

// Update thread
router.put('/:id', ensureAuthenticated, ThreadsController.updateThread);

// Delete thread
router.delete('/:id', ensureAuthenticated, ThreadsController.deleteThread);

// Join thread
router.post('/:id/join', ensureAuthenticated, ThreadsController.joinThread);

// Leave thread
router.post('/:id/leave', ensureAuthenticated, ThreadsController.leaveThread);

// Get thread messages
router.get('/:id/messages', ensureAuthenticated, ThreadsController.getThreadMessages);

// Post thread message
router.post('/:id/messages', ensureAuthenticated, ThreadsController.postThreadMessage);

// Update thread message
router.put('/:threadId/messages/:messageId', ensureAuthenticated, ThreadsController.updateThreadMessage);

// Delete thread message
router.delete('/:threadId/messages/:messageId', ensureAuthenticated, ThreadsController.deleteThreadMessage);

// Add reaction to message
router.post('/:threadId/messages/:messageId/reactions', ensureAuthenticated, ThreadsController.addReactionToMessage);

// Remove reaction from message
router.delete('/:threadId/messages/:messageId/reactions/:reactionType', ensureAuthenticated, ThreadsController.removeReactionFromMessage);

// Invite user to thread
router.post('/:id/invite', ensureAuthenticated, ThreadsController.inviteUserToThread);

// Respond to thread invitation
router.put('/invitations/:invitationId', ensureAuthenticated, ThreadsController.respondToInvitation);

// Get user's thread invitations
router.get('/invitations', ensureAuthenticated, ThreadsController.getUserInvitations);

module.exports = router;
