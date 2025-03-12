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
  createCharacter: (userId, name, position, teamId, statsJson) => {
    return new Promise((resolve, reject) => {
      const query = `INSERT INTO Characters (user_id, name, position, team_id, stats_json) 
                    VALUES (?, ?, ?, ?, ?)`;
      
      db.run(query, [userId, name, position, teamId, statsJson], function(err) {
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