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
  },

    // Get recent games for a character
    getCharacterGames: (characterId, limit = 5) => {
      const query = `
        SELECT g.*, 
               ht.name as home_team_name, 
               at.name as away_team_name,
               gs.goals, 
               gs.assists
        FROM Games g
        JOIN Teams ht ON g.home_team_id = ht.id
        JOIN Teams at ON g.away_team_id = at.id
        LEFT JOIN GameStatistics gs ON g.id = gs.game_id AND gs.character_id = ?
        WHERE g.date < DATETIME('now')
        AND (g.home_team_id = (SELECT team_id FROM Characters WHERE id = ?) 
             OR g.away_team_id = (SELECT team_id FROM Characters WHERE id = ?))
        ORDER BY g.date DESC
        LIMIT ?
      `;
      
      return dbQueryAll(query, [characterId, characterId, characterId, limit]);
    }
};

module.exports = characterOperations;