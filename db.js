// db.js - Database connection and operations

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create a database connection
const dbPath = path.resolve(__dirname, 'hockey_roleplay.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    return;
  }
  console.log('Connected to the hockey roleplay database');
  
  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');
  
  // Initialize database tables if they don't exist
  initDatabase();
});

// Function to initialize the database with tables
function initDatabase() {
  db.serialize(() => {
    // Create Users table
    db.run(`
      CREATE TABLE IF NOT EXISTS Users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(50) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        role VARCHAR(20) NOT NULL DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP,
        CONSTRAINT check_role CHECK (role IN ('user', 'admin', 'moderator'))
      )
    `);

    // Create Teams table
    db.run(`
      CREATE TABLE IF NOT EXISTS Teams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(100) NOT NULL UNIQUE,
        record VARCHAR(20) DEFAULT '0-0-0',
        owner_id INTEGER,
        logo_url VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES Users(id) ON DELETE SET NULL
      )
    `);

    // Create Characters table
    db.run(`
      CREATE TABLE IF NOT EXISTS Characters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name VARCHAR(100) NOT NULL,
        position VARCHAR(20) NOT NULL,
        team_id INTEGER,
        stats_json TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
        FOREIGN KEY (team_id) REFERENCES Teams(id) ON DELETE SET NULL,
        CONSTRAINT check_position CHECK (position IN ('C', 'LW', 'RW', 'D', 'G'))
      )
    `);

    // Create Games table
    db.run(`
      CREATE TABLE IF NOT EXISTS Games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        home_team_id INTEGER NOT NULL,
        away_team_id INTEGER NOT NULL,
        date TIMESTAMP NOT NULL,
        status VARCHAR(20) DEFAULT 'scheduled',
        home_score INTEGER DEFAULT 0,
        away_score INTEGER DEFAULT 0,
        details_json TEXT,
        FOREIGN KEY (home_team_id) REFERENCES Teams(id) ON DELETE CASCADE,
        FOREIGN KEY (away_team_id) REFERENCES Teams(id) ON DELETE CASCADE,
        CONSTRAINT check_status CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
        CONSTRAINT different_teams CHECK (home_team_id != away_team_id)
      )
    `);

    // Create Messages table
    db.run(`
      CREATE TABLE IF NOT EXISTS Messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id INTEGER NOT NULL,
        receiver_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        read BOOLEAN DEFAULT 0,
        FOREIGN KEY (sender_id) REFERENCES Users(id) ON DELETE CASCADE,
        FOREIGN KEY (receiver_id) REFERENCES Users(id) ON DELETE CASCADE
      )
    `);

    // Create GameStatistics table
    db.run(`
      CREATE TABLE IF NOT EXISTS GameStatistics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id INTEGER NOT NULL,
        character_id INTEGER NOT NULL,
        goals INTEGER DEFAULT 0,
        assists INTEGER DEFAULT 0,
        shots INTEGER DEFAULT 0,
        penalties_minutes INTEGER DEFAULT 0,
        plus_minus INTEGER DEFAULT 0,
        ice_time INTEGER DEFAULT 0,
        FOREIGN KEY (game_id) REFERENCES Games(id) ON DELETE CASCADE,
        FOREIGN KEY (character_id) REFERENCES Characters(id) ON DELETE CASCADE
      )
    `);

    // Create TeamStaff table
    db.run(`
      CREATE TABLE IF NOT EXISTS TeamStaff (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        role VARCHAR(50) NOT NULL,
        FOREIGN KEY (team_id) REFERENCES Teams(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
      )
    `);

    // Create indexes
    db.run(`CREATE INDEX IF NOT EXISTS idx_characters_user_id ON Characters(user_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_characters_team_id ON Characters(team_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_games_teams ON Games(home_team_id, away_team_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_games_date ON Games(date)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_messages_users ON Messages(sender_id, receiver_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_messages_read ON Messages(receiver_id, read)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_game_stats_game ON GameStatistics(game_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_game_stats_character ON GameStatistics(character_id)`);
  });
}

// User-related database operations
const userOperations = {
  // Create a new user
  createUser: (username, passwordHash, email, role = 'user') => {
    return new Promise((resolve, reject) => {
      const query = `INSERT INTO Users (username, password_hash, email, role) 
                    VALUES (?, ?, ?, ?)`;
      
      db.run(query, [username, passwordHash, email, role], function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve(this.lastID);
      });
    });
  },
  
  // Get user by username (for login)
  getUserByUsername: (username) => {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM Users WHERE username = ?`;
      
      db.get(query, [username], (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(row);
      });
    });
  },
  
  // Update last login timestamp
  updateLastLogin: (userId) => {
    return new Promise((resolve, reject) => {
      const query = `UPDATE Users SET last_login = CURRENT_TIMESTAMP 
                    WHERE id = ?`;
      
      db.run(query, [userId], function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve(this.changes);
      });
    });
  }
};

// Character-related database operations
const characterOperations = {
  // Create a new character
  createCharacter: (userId, name, position, teamId, statsJson, bio = null, avatarUrl = null) => {
    return new Promise((resolve, reject) => {
      const query = `INSERT INTO Characters (
        user_id, name, position, team_id, stats_json, bio, avatar_url, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;
      
      db.run(query, [userId, name, position, teamId, statsJson, bio, avatarUrl], function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve(this.lastID);
      });
    });
  },
  
  // Get all characters for a user
  getUserCharacters: (userId) => {
    return new Promise((resolve, reject) => {
      const query = `SELECT c.*, t.name as team_name 
                    FROM Characters c
                    LEFT JOIN Teams t ON c.team_id = t.id
                    WHERE c.user_id = ?
                    ORDER BY c.created_at DESC`;
      
      db.all(query, [userId], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows);
      });
    });
  },
  
  // Update character stats
  updateCharacterStats: (characterId, statsJson) => {
    return new Promise((resolve, reject) => {
      const query = `UPDATE Characters SET stats_json = ?, updated_at = CURRENT_TIMESTAMP 
                    WHERE id = ?`;
      
      db.run(query, [statsJson, characterId], function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve(this.changes);
      });
    });
  },
  
  // Get a single character by ID
  getCharacterById: (characterId, includeTeam = true) => {
    return new Promise((resolve, reject) => {
      let query = `SELECT c.* `;
      
      if (includeTeam) {
        query += `, t.name as team_name `;
      }
      
      query += `FROM Characters c `;
      
      if (includeTeam) {
        query += `LEFT JOIN Teams t ON c.team_id = t.id `;
      }
      
      query += `WHERE c.id = ?`;
      
      db.get(query, [characterId], (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(row);
      });
    });
  },

  // Check if a character belongs to a user
  isCharacterOwner: (userId, characterId) => {
    return new Promise((resolve, reject) => {
      const query = `SELECT id FROM Characters WHERE id = ? AND user_id = ?`;
      
      db.get(query, [characterId, userId], (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(!!row); // Returns true if character belongs to user, false otherwise
      });
    });
  },

  // Update character details
  updateCharacter: (characterId, data) => {
    return new Promise((resolve, reject) => {
      // Build the SET part of the query dynamically based on provided data
      const setColumns = [];
      const values = [];
      
      if (data.name !== undefined) {
        setColumns.push('name = ?');
        values.push(data.name);
      }
      
      if (data.position !== undefined) {
        setColumns.push('position = ?');
        values.push(data.position);
      }
      
      if (data.team_id !== undefined) {
        setColumns.push('team_id = ?');
        values.push(data.team_id);
      }
      
      if (data.stats_json !== undefined) {
        setColumns.push('stats_json = ?');
        values.push(data.stats_json);
      }
      
      if (data.bio !== undefined) {
        setColumns.push('bio = ?');
        values.push(data.bio);
      }
      
      if (data.avatar_url !== undefined) {
        setColumns.push('avatar_url = ?');
        values.push(data.avatar_url);
      }
      
      // Always update the updated_at timestamp
      setColumns.push('updated_at = CURRENT_TIMESTAMP');
      
      // Add characterId to values array for WHERE clause
      values.push(characterId);
      
      const query = `UPDATE Characters SET ${setColumns.join(', ')} WHERE id = ?`;
      
      db.run(query, values, function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve(this.changes);
      });
    });
  },

  // Delete a character
  deleteCharacter: (characterId) => {
    return new Promise((resolve, reject) => {
      const query = `DELETE FROM Characters WHERE id = ?`;
      
      db.run(query, [characterId], function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve(this.changes);
      });
    });
  },

  // Set a character as active (mark all other user's characters as inactive)
  setActiveCharacter: (userId, characterId) => {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        // Begin transaction
        db.run('BEGIN TRANSACTION', (err) => {
          if (err) {
            reject(err);
            return;
          }
          
          // First, make sure all the user's characters are marked as inactive
          db.run(
            'UPDATE Characters SET is_active = 0 WHERE user_id = ?',
            [userId],
            (err) => {
              if (err) {
                db.run('ROLLBACK');
                reject(err);
                return;
              }
              
              // Then, set the specified character as active
              db.run(
                'UPDATE Characters SET is_active = 1 WHERE id = ? AND user_id = ?',
                [characterId, userId],
                function(err) {
                  if (err) {
                    db.run('ROLLBACK');
                    reject(err);
                    return;
                  }
                  
                  // Commit the transaction
                  db.run('COMMIT', (err) => {
                    if (err) {
                      db.run('ROLLBACK');
                      reject(err);
                      return;
                    }
                    
                    resolve(this.changes);
                  });
                }
              );
            }
          );
        });
      });
    });
  },

  // Get recent games for a character
  getCharacterGames: (characterId, limit = 5) => {
    return new Promise((resolve, reject) => {
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
      
      db.all(query, [characterId, limit], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows);
      });
    });
  },

  // Add new columns to the Characters table for is_active and bio
  // This should be called when initializing the database
  addCharacterColumns: () => {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        // Check if is_active column exists, add if it doesn't
        db.all("PRAGMA table_info(Characters)", (err, rows) => {
          if (err) {
            reject(err);
            return;
          }
          
          // Check if columns exist, and add them if they don't
          const columns = rows || [];
          const hasIsActive = columns.some(col => col.name === 'is_active');
          const hasBio = columns.some(col => col.name === 'bio');
          const hasAvatarUrl = columns.some(col => col.name === 'avatar_url');
          
          const addColumns = [];
          
          if (!hasIsActive) {
            addColumns.push("ALTER TABLE Characters ADD COLUMN is_active BOOLEAN DEFAULT 0");
          }
          
          if (!hasBio) {
            addColumns.push("ALTER TABLE Characters ADD COLUMN bio TEXT");
          }
          
          if (!hasAvatarUrl) {
            addColumns.push("ALTER TABLE Characters ADD COLUMN avatar_url VARCHAR(255)");
          }
          
          // Execute all column additions
          const executeQueries = (queries, index) => {
            if (index >= queries.length) {
              resolve();
              return;
            }
            
            db.run(queries[index], (err) => {
              if (err) {
                reject(err);
                return;
              }
              
              executeQueries(queries, index + 1);
            });
          };
          
          if (addColumns.length > 0) {
            executeQueries(addColumns, 0);
          } else {
            resolve();
          }
        });
      });
    });
  }
};

// Team-related database operations
const teamOperations = {
  // Get all teams
  getAllTeams: () => {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM Teams ORDER BY name`;
      
      db.all(query, [], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows);
      });
    });
  },
  
  // Update team record
  updateTeamRecord: (teamId, record) => {
    return new Promise((resolve, reject) => {
      const query = `UPDATE Teams SET record = ? WHERE id = ?`;
      
      db.run(query, [record, teamId], function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve(this.changes);
      });
    });
  }
};

// Game-related database operations
const gameOperations = {
  // Get upcoming games
  getUpcomingGames: (limit = 5) => {
    return new Promise((resolve, reject) => {
      const query = `SELECT g.*, 
                      h.name as home_team_name, 
                      a.name as away_team_name 
                    FROM Games g
                    JOIN Teams h ON g.home_team_id = h.id
                    JOIN Teams a ON g.away_team_id = a.id
                    WHERE g.date > CURRENT_TIMESTAMP AND g.status = 'scheduled'
                    ORDER BY g.date
                    LIMIT ?`;
      
      db.all(query, [limit], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows);
      });
    });
  },
  
  // Update game status and score
  updateGameResult: (gameId, homeScore, awayScore, status, detailsJson) => {
    return new Promise((resolve, reject) => {
      const query = `UPDATE Games 
                    SET home_score = ?, away_score = ?, status = ?, details_json = ?
                    WHERE id = ?`;
      
      db.run(query, [homeScore, awayScore, status, detailsJson, gameId], function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve(this.changes);
      });
    });
  }
};

// Message-related database operations
const messageOperations = {
  // Send a new message
  sendMessage: (senderId, receiverId, content) => {
    return new Promise((resolve, reject) => {
      const query = `INSERT INTO Messages (sender_id, receiver_id, content) 
                    VALUES (?, ?, ?)`;
      
      db.run(query, [senderId, receiverId, content], function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve(this.lastID);
      });
    });
  },
  
  // Get unread message count for a user
  getUnreadMessageCount: (userId) => {
    return new Promise((resolve, reject) => {
      const query = `SELECT COUNT(*) as count FROM Messages 
                    WHERE receiver_id = ? AND read = 0`;
      
      db.get(query, [userId], (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(row ? row.count : 0);
      });
    });
  },
  
  // Mark message as read
  markMessageAsRead: (messageId) => {
    return new Promise((resolve, reject) => {
      const query = `UPDATE Messages SET read = 1 WHERE id = ?`;
      
      db.run(query, [messageId], function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve(this.changes);
      });
    });
  }
};

// Export the database connection and operations
module.exports = {
  db,
  userOperations,
  characterOperations,
  teamOperations,
  gameOperations,
  messageOperations,
  close: () => {
    return new Promise((resolve, reject) => {
      db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
          reject(err);
          return;
        }
        console.log('Database connection closed');
        resolve();
      });
    });
  }
};