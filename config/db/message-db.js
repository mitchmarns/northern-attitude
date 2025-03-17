// config/db/message-db.js
const { dbQuery, dbQueryAll, dbExecute, dbTransaction } = require('./utils');

// SQL queries for character messages
const SQL = {
  getCharacterConversations: `
    SELECT c.id, c.title, c.is_group, c.created_at, c.updated_at,
           (SELECT COUNT(*) FROM CharacterMessages m 
            WHERE m.conversation_id = c.id 
            AND m.is_read = 0 
            AND m.sender_character_id != ?) as unread_count,
           (SELECT m.content FROM CharacterMessages m 
            WHERE m.conversation_id = c.id 
            ORDER BY m.created_at DESC LIMIT 1) as last_message,
           (SELECT m.created_at FROM CharacterMessages m 
            WHERE m.conversation_id = c.id 
            ORDER BY m.created_at DESC LIMIT 1) as last_message_at
    FROM CharacterConversations c
    JOIN CharacterConversationParticipants cp ON c.id = cp.conversation_id
    WHERE cp.character_id = ?
    ORDER BY last_message_at DESC NULLS LAST
  `,
  
  getConversationMessages: `
    SELECT m.id, m.conversation_id, m.sender_character_id, m.content, m.is_read, m.created_at,
           ch.name as sender_name, ch.avatar_url as sender_avatar, ch.position as sender_position,
           t.name as team_name,
           cc.custom_name, cc.custom_image
    FROM CharacterMessages m
    JOIN Characters ch ON m.sender_character_id = ch.id
    LEFT JOIN Teams t ON ch.team_id = t.id
    LEFT JOIN CharacterContacts cc ON cc.owner_character_id = ? AND cc.target_character_id = m.sender_character_id
    WHERE m.conversation_id = ?
    ORDER BY m.created_at ASC
  `,
  
  getConversationParticipants: `
    SELECT cp.character_id, ch.name, ch.avatar_url, ch.position, t.name as team_name,
           cc.custom_name, cc.custom_image
    FROM CharacterConversationParticipants cp
    JOIN Characters ch ON cp.character_id = ch.id
    LEFT JOIN Teams t ON ch.team_id = t.id
    LEFT JOIN CharacterContacts cc ON cc.owner_character_id = ? AND cc.target_character_id = cp.character_id
    WHERE cp.conversation_id = ?
  `,
  
  createConversation: `
    INSERT INTO CharacterConversations (title, is_group)
    VALUES (?, ?)
  `,
  
  addParticipant: `
    INSERT INTO CharacterConversationParticipants (conversation_id, character_id)
    VALUES (?, ?)
  `,
  
  createMessage: `
    INSERT INTO CharacterMessages (conversation_id, sender_character_id, content, created_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
  `,
  
  markMessagesAsRead: `
    UPDATE CharacterMessages
    SET is_read = 1
    WHERE conversation_id = ? AND sender_character_id != ? AND is_read = 0
  `,
  
  updateConversationParticipant: `
    UPDATE CharacterConversationParticipants
    SET last_read_at = CURRENT_TIMESTAMP
    WHERE conversation_id = ? AND character_id = ?
  `,
  
  getConversationBetweenCharacters: `
    SELECT cp1.conversation_id
    FROM CharacterConversationParticipants cp1
    JOIN CharacterConversationParticipants cp2 ON cp1.conversation_id = cp2.conversation_id
    JOIN CharacterConversations c ON cp1.conversation_id = c.id
    WHERE cp1.character_id = ? AND cp2.character_id = ? AND c.is_group = 0
    GROUP BY cp1.conversation_id
    HAVING COUNT(DISTINCT cp1.character_id) + COUNT(DISTINCT cp2.character_id) = 2
  `,
  
  getUnreadMessageCount: `
    SELECT COUNT(*) as count
    FROM CharacterMessages m
    JOIN CharacterConversationParticipants cp ON m.conversation_id = cp.conversation_id
    WHERE cp.character_id = ? AND m.sender_character_id != ? AND m.is_read = 0
  `,
  
  getUserCharactersBasic: `
    SELECT id, name, avatar_url, position, team_id, is_active
    FROM Characters
    WHERE user_id = ?
    ORDER BY is_active DESC, name ASC
  `
};

const messageOperations = {
  // Get character's conversations
  getCharacterConversations: (characterId) => {
    return dbQueryAll(SQL.getCharacterConversations, [characterId, characterId]);
  },
  
  // Get messages for a conversation
  getConversationMessages: (conversationId, viewerCharacterId) => {
    return dbQueryAll(SQL.getConversationMessages, [viewerCharacterId, conversationId]);
  },
  
  // Get participants in a conversation
  getConversationParticipants: (conversationId, viewerCharacterId) => {
    return dbQueryAll(SQL.getConversationParticipants, [viewerCharacterId, conversationId]);
  },
  
  // Create a new conversation
  createConversation: async (title, isGroup, participantCharacterIds) => {
    try {
      // Create conversation
      const result = await dbExecute(SQL.createConversation, [title, isGroup ? 1 : 0]);
      const conversationId = result.lastId;
      
      // Add participants
      for (const characterId of participantCharacterIds) {
        await dbExecute(SQL.addParticipant, [conversationId, characterId]);
      }
      
      return conversationId;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  },
  
  // Send a message
  sendMessage: async (conversationId, senderCharacterId, content) => {
    try {
      const result = await dbExecute(SQL.createMessage, [conversationId, senderCharacterId, content]);
      return result.lastId;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },
  
  // Mark messages as read
  markConversationAsRead: async (conversationId, characterId) => {
    try {
      await dbExecute(SQL.markMessagesAsRead, [conversationId, characterId]);
      await dbExecute(SQL.updateConversationParticipant, [conversationId, characterId]);
      return true;
    } catch (error) {
      console.error('Error marking conversation as read:', error);
      throw error;
    }
  },
  
  // Find or create conversation between two characters
  findOrCreateOneToOneConversation: async (characterId1, characterId2) => {
    try {
      // Check if conversation already exists
      const existingConversation = await dbQuery(SQL.getConversationBetweenCharacters, [characterId1, characterId2]);
      
      if (existingConversation) {
        return existingConversation.conversation_id;
      }
      
      // No existing conversation found, check the opposite direction
      const reverseConversation = await dbQuery(SQL.getConversationBetweenCharacters, [characterId2, characterId1]);
      
      if (reverseConversation) {
        return reverseConversation.conversation_id;
      }
      
      // Create new conversation
      return await messageOperations.createConversation(null, false, [characterId1, characterId2]);
    } catch (error) {
      console.error('Error finding or creating conversation:', error);
      throw error;
    }
  },
  
  // Get unread message count
  getUnreadMessageCount: async (characterId) => {
    try {
      const result = await dbQuery(SQL.getUnreadMessageCount, [characterId, characterId]);
      return result ? result.count : 0;
    } catch (error) {
      console.error('Error getting unread message count:', error);
      throw error;
    }
  },
  
  // Get basic info about a user's characters (for character selection)
  getUserCharactersBasic: (userId) => {
    return dbQueryAll(SQL.getUserCharactersBasic, [userId]);
  }
};

module.exports = messageOperations;