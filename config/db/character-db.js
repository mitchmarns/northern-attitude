const { dbQuery, dbQueryAll, dbExecute, dbTransaction } = require('./utils');

// SQL queries specific to this domain
const SQL = {
  getUserCharacters: `
    SELECT c.*, t.name as team_name 
    FROM Characters c
    LEFT JOIN Teams t ON c.team_id = t.id
    WHERE c.user_id = ?
    ORDER BY c.created_at DESC
  `,
  getCharacterById: `
    SELECT c.*, t.name as team_name 
    FROM Characters c
    LEFT JOIN Teams t ON c.team_id = t.id
    WHERE c.id = ?
  `,
  isCharacterOwner: `
    SELECT id FROM Characters WHERE id = ? AND user_id = ?
  `,
  createCharacter: `
    INSERT INTO Characters (
      user_id, name, position, team_id, stats_json, bio, avatar_url, header_image_url, is_active, 
      full_name, age, nationality, hometown, height, weight, handedness, years_pro,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `,
  updateCharacter: `
    UPDATE Characters SET {placeholders}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `,
  deactivateAllCharacters: `
    UPDATE Characters SET is_active = 0 WHERE user_id = ?
  `,
  activateCharacter: `
    UPDATE Characters SET is_active = 1 WHERE id = ? AND user_id = ?
  `,
  deleteCharacter: `
    DELETE FROM Characters WHERE id = ?
  `,
  // Other domain-specific queries...
};

// Domain-specific database operations
const characterOperations = {
  getUserCharacters: (userId) => {
    return dbQueryAll(SQL.getUserCharacters, [userId]);
  },
  
  // Get a single character by ID
  getCharacterById: (characterId) => {
    return dbQuery(SQL.getCharacterById, [characterId]);
  },

  // Check if a character belongs to a user
  isCharacterOwner: (userId, characterId) => {
    return dbQuery(SQL.isCharacterOwner, [characterId, userId])
      .then(row => !!row);
  },

  // Create a new character - update to include header_image_url
  createCharacter: (
    userId, name, position, teamId, statsJson, bio, avatarUrl, headerImageUrl, isActive,
    fullName, age, nationality, hometown, height, weight, handedness, yearsPro
  ) => {
    return dbExecute(
      SQL.createCharacter,
      [
        userId, name, position, teamId, statsJson, bio, avatarUrl, headerImageUrl, isActive ? 1 : 0,
        fullName, age, nationality, hometown, height, weight, handedness, yearsPro
      ]
    ).then(result => result.lastId);
  },

  // Update character details - build query dynamically
  updateCharacter: (characterId, data) => {
    if (Object.keys(data).length === 0) {
      return Promise.resolve(0); // No changes
    }
    
    const setColumns = [];
    const values = [];
    
    // Build SET clause based on provided data
    Object.entries(data).forEach(([key, value]) => {
      setColumns.push(`${key} = ?`);
      values.push(value);
    });
    
    // Add characterId to values array for WHERE clause
    values.push(characterId);
    
    const query = SQL.updateCharacter.replace('{placeholders}', setColumns.join(', '));
    
    return dbExecute(query, values).then(result => result.changes);
  },

  // Set a character as active (mark all other user's characters as inactive)
  setActiveCharacter: (userId, characterId) => {
    // Use transaction to ensure atomicity
    return dbTransaction([
      dbExecute(SQL.deactivateAllCharacters, [userId]),
      dbExecute(SQL.activateCharacter, [characterId, userId])
    ]);
  },

  // Delete a character
  deleteCharacter: (characterId) => {
    return dbExecute(SQL.deleteCharacter, [characterId])
      .then(result => result.changes);
  }
};

const contactOperations = {
  // Get all contacts for a character
  getCharacterContacts: async (characterId) => {
    return dbQueryAll(`
      SELECT cc.*, c.name as original_name, c.avatar_url as original_avatar
      FROM CharacterContacts cc
      JOIN Characters c ON cc.target_character_id = c.id
      WHERE cc.owner_character_id = ?
    `, [characterId]);
  },
  
  // Get a specific contact
  getCharacterContact: async (characterId, targetId) => {
    try {
      return await dbQueryAll(`
        SELECT cc.*, c.name as original_name, c.avatar_url as original_avatar
        FROM CharacterContacts cc
        JOIN Characters c ON cc.target_character_id = c.id
        WHERE cc.owner_character_id = ?
      `, [characterId]);
    } catch (error) {
      console.error('Error getting character contacts:', error);
      return []; // Return empty array instead of throwing
    }
  },
  
  // Set or update a contact
  setCharacterContact: async (characterId, targetId, customName, customImage) => {
    // Check if contact already exists
    const existing = await dbQuery(`
      SELECT id FROM CharacterContacts 
      WHERE owner_character_id = ? AND target_character_id = ?
    `, [characterId, targetId]);
    
    if (existing) {
      // Update existing contact
      await dbExecute(`
        UPDATE CharacterContacts 
        SET custom_name = ?, custom_image = ?, updated_at = CURRENT_TIMESTAMP
        WHERE owner_character_id = ? AND target_character_id = ?
      `, [customName, customImage, characterId, targetId]);
      
      return dbQuery(`
        SELECT * FROM CharacterContacts
        WHERE owner_character_id = ? AND target_character_id = ?
      `, [characterId, targetId]);
    } else {
      // Create new contact
      await dbExecute(`
        INSERT INTO CharacterContacts 
        (owner_character_id, target_character_id, custom_name, custom_image)
        VALUES (?, ?, ?, ?)
      `, [characterId, targetId, customName, customImage]);
      
      return dbQuery(`
        SELECT * FROM CharacterContacts
        WHERE owner_character_id = ? AND target_character_id = ?
      `, [characterId, targetId]);
    }
  },
  
  // Delete a contact
  deleteCharacterContact: async (characterId, targetId) => {
    return dbExecute(`
      DELETE FROM CharacterContacts
      WHERE owner_character_id = ? AND target_character_id = ?
    `, [characterId, targetId]);
  }
};

module.exports = { 
  characterOperations, 
  contactOperations 
};