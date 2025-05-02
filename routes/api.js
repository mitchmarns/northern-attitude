const express = require('express');
const router = express.Router();
const ThreadsController = require('../controllers/threadsController');
const { ensureAuthenticated } = require('../middleware/auth');

// Thread API routes
router.post('/threads', ensureAuthenticated, ThreadsController.createThread);
router.put('/threads/:id', ensureAuthenticated, ThreadsController.updateThread);
router.delete('/threads/:id', ensureAuthenticated, ThreadsController.deleteThread);
router.post('/threads/:id/join', ensureAuthenticated, ThreadsController.joinThread);
router.post('/threads/:id/leave', ensureAuthenticated, ThreadsController.leaveThread);
router.post('/threads/:id/messages', ensureAuthenticated, ThreadsController.postThreadMessage);
router.put('/threads/:threadId/messages/:messageId', ensureAuthenticated, ThreadsController.updateThreadMessage);
router.delete('/threads/:threadId/messages/:messageId', ensureAuthenticated, ThreadsController.deleteThreadMessage);
router.post('/threads/:threadId/messages/:messageId/reactions', ensureAuthenticated, ThreadsController.addReactionToMessage);
router.delete('/threads/:threadId/messages/:messageId/reactions/:reactionType', ensureAuthenticated, ThreadsController.removeReactionFromMessage);
router.post('/threads/:id/invite', ensureAuthenticated, ThreadsController.inviteUserToThread);
router.put('/threads/invitations/:invitationId', ensureAuthenticated, ThreadsController.respondToInvitation);
router.get('/threads/invitations', ensureAuthenticated, ThreadsController.getUserInvitations);

module.exports = router;
