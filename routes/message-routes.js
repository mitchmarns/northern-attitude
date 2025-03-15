const express = require('express');
const router = express.Router();
const { messageOperations, characterOperations } = require('../config/db');
const { authMiddleware } = require('../public/js/auth');

// Get character's conversations
router.get('/characters/:characterId/conversations', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const characterId = req.params.characterId;
    
    // Verify the character belongs to the user
    const isOwner = await characterOperations.isCharacterOwner(req.user.id, characterId);
    if (!isOwner) {
      return res.status(403).json({ message: 'You do not have permission to access this character' });
    }
    
    const conversations = await messageOperations.getCharacterConversations(characterId);
    res.status(200).json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ message: 'Failed to fetch conversations' });
  }
});

// Get messages for a conversation
router.get('/conversations/:id/messages', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const conversationId = req.params.id;
    const characterId = req.query.characterId;
    
    if (!characterId) {
      return res.status(400).json({ message: 'Character ID is required' });
    }
    
    // Verify the character belongs to the user
    const isOwner = await characterOperations.isCharacterOwner(req.user.id, characterId);
    if (!isOwner) {
      return res.status(403).json({ message: 'You do not have permission to access this character' });
    }
    
    const messages = await messageOperations.getConversationMessages(conversationId);
    
    // Mark conversation as read
    await messageOperations.markConversationAsRead(conversationId, characterId);
    
    res.status(200).json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Failed to fetch messages' });
  }
});

// Get participants in a conversation
router.get('/conversations/:id/participants', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const conversationId = req.params.id;
    const characterId = req.query.characterId;
    
    if (!characterId) {
      return res.status(400).json({ message: 'Character ID is required' });
    }
    
    // Verify the character belongs to the user
    const isOwner = await characterOperations.isCharacterOwner(req.user.id, characterId);
    if (!isOwner) {
      return res.status(403).json({ message: 'You do not have permission to access this character' });
    }
    
    const participants = await messageOperations.getConversationParticipants(conversationId);
    res.status(200).json(participants);
  } catch (error) {
    console.error('Error fetching participants:', error);
    res.status(500).json({ message: 'Failed to fetch participants' });
  }
});

// Create a new conversation
router.post('/conversations', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const { title, is_group, participant_character_ids, sender_character_id } = req.body;
    
    if (!participant_character_ids || !Array.isArray(participant_character_ids)) {
      return res.status(400).json({ message: 'Participant character IDs are required' });
    }
    
    if (!sender_character_id) {
      return res.status(400).json({ message: 'Sender character ID is required' });
    }
    
    // Verify the sender character belongs to the user
    const isOwner = await characterOperations.isCharacterOwner(req.user.id, sender_character_id);
    if (!isOwner) {
      return res.status(403).json({ message: 'You do not have permission to use this character' });
    }
    
    // Make sure the sender character is included in participants
    if (!participant_character_ids.includes(sender_character_id)) {
      participant_character_ids.push(sender_character_id);
    }
    
    const conversationId = await messageOperations.createConversation(
      title, is_group, participant_character_ids
    );
    
    res.status(201).json({ 
      message: 'Conversation created successfully',
      id: conversationId
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ message: 'Failed to create conversation' });
  }
});

// Send a message in a conversation
router.post('/conversations/:id/messages', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const conversationId = req.params.id;
    const { content, sender_character_id } = req.body;
    
    if (!content) {
      return res.status(400).json({ message: 'Message content is required' });
    }
    
    if (!sender_character_id) {
      return res.status(400).json({ message: 'Sender character ID is required' });
    }
    
    // Verify the character belongs to the user
    const isOwner = await characterOperations.isCharacterOwner(req.user.id, sender_character_id);
    if (!isOwner) {
      return res.status(403).json({ message: 'You do not have permission to use this character' });
    }
    
    const messageId = await messageOperations.sendMessage(
      conversationId, sender_character_id, content
    );
    
    res.status(201).json({
      message: 'Message sent successfully',
      id: messageId
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Failed to send message' });
  }
});

// Start or get a one-to-one conversation with another character
router.post('/conversations/one-to-one', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const { sender_character_id, recipient_character_id } = req.body;
    
    if (!sender_character_id || !recipient_character_id) {
      return res.status(400).json({ message: 'Both sender and recipient character IDs are required' });
    }
    
    // Verify the sender character belongs to the user
    const isOwner = await characterOperations.isCharacterOwner(req.user.id, sender_character_id);
    if (!isOwner) {
      return res.status(403).json({ message: 'You do not have permission to use this character' });
    }
    
    const conversationId = await messageOperations.findOrCreateOneToOneConversation(
      sender_character_id, recipient_character_id
    );
    
    res.status(200).json({
      conversation_id: conversationId
    });
  } catch (error) {
    console.error('Error creating one-to-one conversation:', error);
    res.status(500).json({ message: 'Failed to create conversation' });
  }
});

// Mark conversation as read
router.put('/conversations/:id/read', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const conversationId = req.params.id;
    const { character_id } = req.body;
    
    if (!character_id) {
      return res.status(400).json({ message: 'Character ID is required' });
    }
    
    // Verify the character belongs to the user
    const isOwner = await characterOperations.isCharacterOwner(req.user.id, character_id);
    if (!isOwner) {
      return res.status(403).json({ message: 'You do not have permission to access this character' });
    }
    
    await messageOperations.markConversationAsRead(conversationId, character_id);
    
    res.status(200).json({
      message: 'Conversation marked as read'
    });
  } catch (error) {
    console.error('Error marking conversation as read:', error);
    res.status(500).json({ message: 'Failed to mark conversation as read' });
  }
});

// Get unread message count for a character
router.get('/characters/:characterId/unread-count', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const characterId = req.params.characterId;
    
    // Verify the character belongs to the user
    const isOwner = await characterOperations.isCharacterOwner(req.user.id, characterId);
    if (!isOwner) {
      return res.status(403).json({ message: 'You do not have permission to access this character' });
    }
    
    const count = await messageOperations.getUnreadMessageCount(characterId);
    res.status(200).json({ count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ message: 'Failed to fetch unread count' });
  }
});

// Get user's characters for selection
router.get('/user-characters', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const characters = await messageOperations.getUserCharactersBasic(req.user.id);
    res.status(200).json(characters);
  } catch (error) {
    console.error('Error fetching user characters:', error);
    res.status(500).json({ message: 'Failed to fetch user characters' });
  }
});

module.exports = router;