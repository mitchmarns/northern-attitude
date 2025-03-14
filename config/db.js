// Optimized database operations module
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Check if database file exists
const dbPath = path.resolve(__dirname, 'hockey_roleplay.db');
const dbExists = fs.existsSync(dbPath);

// If database doesn't exist, show error and exit
if (!dbExists) {
  console.error('Database file not found! Please run the database-init.js script first.');
  console.error('Command: node database-init.js');
  process.exit(1);
}

// Create a database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    process.exit(1);
  }
  
  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');
});

// Reusable SQL queries - centralize for better maintenance
const SQL = {
  // Character queries
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
      user_id, name, position, team_id, stats_json, bio, avatar_url, is_active, 
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
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
  
  // Team queries
  getAllTeams: `
    SELECT * FROM Teams ORDER BY name
  `,
  getTeamById: `
    SELECT * FROM Teams WHERE id = ?
  `,
  getTeamOwner: `
    SELECT u.id, u.username FROM Teams t
    JOIN Users u ON t.owner_id = u.id
    WHERE t.id = ?
  `,
  isTeamOwner: `
    SELECT 1 FROM Teams WHERE id = ? AND owner_id = ?
  `,
  getTeamStaff: `
    SELECT ts.id, ts.user_id, ts.role, u.username, u.avatar_url 
    FROM TeamStaff ts
    JOIN Users u ON ts.user_id = u.id
    WHERE ts.team_id = ?
  `,
  isTeamStaff: `
    SELECT 1 FROM TeamStaff WHERE team_id = ? AND user_id = ?
  `,
  getTeamRoster: `
    SELECT c.id as character_id, c.name as character_name, c.position, 
           c.stats_json, c.avatar_url, u.id as user_id, u.username
    FROM Characters c
    JOIN Users u ON c.user_id = u.id
    WHERE c.team_id = ?
    ORDER BY c.position, c.name
  `,
  isUserOnTeam: `
    SELECT 1 FROM Characters WHERE user_id = ? AND team_id = ?
  `
};

// Helper function for database queries (Promise-based)
function dbQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      resolve(row);
    });
  });
}

// Helper function for database query returning multiple rows
function dbQueryAll(query, params = []) {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      resolve(rows || []);
    });
  });
}

// Helper function for database execute (Promise-based)
function dbExecute(query, params = []) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) reject(err);
      resolve({ lastId: this.lastID, changes: this.changes });
    });
  });
}

// Helper function for transactions
function dbTransaction(operations) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION', (err) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Execute all operations
        Promise.all(operations)
          .then((results) => {
            // Commit transaction if all operations succeed
            db.run('COMMIT', (err) => {
              if (err) {
                db.run('ROLLBACK');
                reject(err);
                return;
              }
              resolve(results);
            });
          })
          .catch((err) => {
            // Rollback transaction if any operation fails
            db.run('ROLLBACK', () => {
              reject(err);
            });
          });
      });
    });
  });
}

// Character-related database operations
const characterOperations = {
  // Get all characters for a user
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

  // Create a new character
  createCharacter: (userId, name, position, teamId, statsJson, bio, avatarUrl, isActive) => {
    return dbExecute(
      SQL.createCharacter,
      [userId, name, position, teamId, statsJson, bio, avatarUrl, isActive ? 1 : 0]
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
      SELECT gs.*, g.*, 
        ht.name as home_team_name, 
        at.name as away_team_name,
        c.team_id as character_team_id
      FROM GameStatistics gs
      JOIN Games g ON gs.game_id = g.id
      JOIN Teams ht ON g.home_team_id = ht.id
      JOIN Teams at ON g.away_team_id = at.id
      JOIN Characters c ON gs.character_id = c.id
      WHERE gs.character_id = ?
      ORDER BY g.date DESC
      LIMIT ?
    `;
    
    return dbQueryAll(query, [characterId, limit]);
  }
};

// Team-related database operations
const teamOperations = {
  // Get all teams
  getAllTeams: () => {
    return dbQueryAll(SQL.getAllTeams);
  },

  // Get team by ID
  getTeamById: (teamId) => {
    return dbQuery(SQL.getTeamById, [teamId]);
  },
  
  // Get team owner
  getTeamOwner: (teamId) => {
    return dbQuery(SQL.getTeamOwner, [teamId]);
  },
  
  // Check if user is team owner
  isTeamOwner: (userId, teamId) => {
    return dbQuery(SQL.isTeamOwner, [teamId, userId])
      .then(row => !!row);
  },
  
  // Get team staff members
  getTeamStaff: (teamId) => {
    return dbQueryAll(SQL.getTeamStaff, [teamId]);
  },
  
  // Check if user is team staff
  isTeamStaff: (userId, teamId) => {
    return dbQuery(SQL.isTeamStaff, [teamId, userId])
      .then(row => !!row);
  },
  
  // Get team roster
  getTeamRoster: (teamId) => {
    return dbQueryAll(SQL.getTeamRoster, [teamId]);
  },
  
  // Check if user has a character on team
  isUserOnTeam: (userId, teamId) => {
    return dbQuery(SQL.isUserOnTeam, [userId, teamId])
      .then(row => !!row);
  },
  
  // Other team operations can be optimized similarly...
};

module.exports = {
  db,
  characterOperations,
  teamOperations
};