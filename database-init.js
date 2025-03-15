// database-init.js - Script for proper database initialization
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve('config/hockey_roleplay.db');

// Check if database file exists
const dbExists = fs.existsSync(dbPath);
console.log('Database exists:', dbExists);

// Create a new database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    process.exit(1);
  }
  console.log('Connected to the hockey roleplay database');
  
  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');
  
  // Initialize database tables
  initDatabase();
});

// Function to initialize the database with all necessary tables
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
        display_name VARCHAR(100),
        avatar_url VARCHAR(255),
        CONSTRAINT check_role CHECK (role IN ('user', 'admin', 'moderator'))
      )
    `, handleError('Users'));

    // Create Teams table
    db.run(`
      CREATE TABLE IF NOT EXISTS Teams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(100) NOT NULL UNIQUE,
        record VARCHAR(20) DEFAULT '0-0-0',
        owner_id INTEGER,
        logo_url VARCHAR(255),
        description TEXT,
        primary_color VARCHAR(7),
        secondary_color VARCHAR(7),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES Users(id) ON DELETE SET NULL
      )
    `, handleError('Teams'));

    // Create Characters table with all fields
    db.run(`
      CREATE TABLE IF NOT EXISTS Characters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name VARCHAR(100) NOT NULL,
        position VARCHAR(20) NOT NULL,
        team_id INTEGER,
        character_type TEXT DEFAULT 'player',
        role TEXT,
        stats_json TEXT,
        bio TEXT,
        avatar_url TEXT,
        header_image_url TEXT, -- Add this line to include header image support
        is_active INTEGER DEFAULT 0,
        created_at DATETIME,
        updated_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
        FOREIGN KEY (team_id) REFERENCES Teams(id) ON DELETE SET NULL
      )
    `, function(err) {
  if (err) {
    console.error('Error creating Characters table:', err);
  } else {
    console.log('Characters table created or already exists');
  }
});

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
    `, handleError('Games'));

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
    `, handleError('Messages'));

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
    `, handleError('GameStatistics'));

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
    `, handleError('TeamStaff'));

    // Create PasswordResets table
    db.run(`
      CREATE TABLE IF NOT EXISTS PasswordResets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
      )
    `, handleError('PasswordResets'));

    // Create UserProfiles table
    db.run(`
      CREATE TABLE IF NOT EXISTS UserProfiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE,
        display_name VARCHAR(100),
        bio TEXT,
        location VARCHAR(100),
        favorite_team_id INTEGER,
        favorite_position VARCHAR(2),
        experience_level VARCHAR(20),
        avatar_url VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
        FOREIGN KEY (favorite_team_id) REFERENCES Teams(id) ON DELETE SET NULL
      )
    `, handleError('UserProfiles'));

    // Create UserPrivacySettings table
    db.run(`
      CREATE TABLE IF NOT EXISTS UserPrivacySettings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE,
        visibility VARCHAR(20) DEFAULT 'members',
        preferences_json TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
      )
    `, handleError('UserPrivacySettings'));

    // Create TeamJoinRequests table
    db.run(`
      CREATE TABLE IF NOT EXISTS TeamJoinRequests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        is_invitation BOOLEAN DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (team_id) REFERENCES Teams(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
        UNIQUE(team_id, user_id)
      )
    `, handleError('TeamJoinRequests'));

    // Create indexes for all tables
    createIndexes();

    // Insert sample data if it's a new database
    if (!dbExists) {
      console.log('New database detected! Inserting sample data...');
      insertSampleData();
    } else {
      console.log('All tables created or verified successfully!');
      closeDatabase();
    }
  });
}

// Create all needed indexes
function createIndexes() {
  const indexes = [
    "CREATE INDEX IF NOT EXISTS idx_characters_user_id ON Characters(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_characters_team_id ON Characters(team_id)",
    "CREATE INDEX IF NOT EXISTS idx_games_teams ON Games(home_team_id, away_team_id)",
    "CREATE INDEX IF NOT EXISTS idx_games_date ON Games(date)",
    "CREATE INDEX IF NOT EXISTS idx_messages_users ON Messages(sender_id, receiver_id)",
    "CREATE INDEX IF NOT EXISTS idx_messages_read ON Messages(receiver_id, read)",
    "CREATE INDEX IF NOT EXISTS idx_game_stats_game ON GameStatistics(game_id)",
    "CREATE INDEX IF NOT EXISTS idx_game_stats_character ON GameStatistics(character_id)",
    "CREATE INDEX IF NOT EXISTS idx_password_resets_token ON PasswordResets(token)",
    "CREATE INDEX IF NOT EXISTS idx_password_resets_user ON PasswordResets(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_userprofiles_user_id ON UserProfiles(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_team_staff_team ON TeamStaff(team_id)",
    "CREATE INDEX IF NOT EXISTS idx_team_staff_user ON TeamStaff(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_join_requests_team ON TeamJoinRequests(team_id)",
    "CREATE INDEX IF NOT EXISTS idx_join_requests_user ON TeamJoinRequests(user_id)"
  ];

  indexes.forEach((indexSQL, i) => {
    db.run(indexSQL, (err) => {
      if (err) {
        console.error(`Error creating index #${i}:`, err);
      }
    });
  });
}

// Error handler for table creation
function handleError(tableName) {
  return function(err) {
    if (err) {
      console.error(`Error creating ${tableName} table:`, err);
    } else {
      console.log(`${tableName} table created or already exists`);
    }
  };
}

// Insert sample data
function insertSampleData() {
  console.log('Inserting sample data...');
  
  // Sample passwords (in a real app, these would be hashed)
  const passwordHash1 = 'hashed_password_1'; 
  const passwordHash2 = 'hashed_password_2'; 
  const adminPasswordHash = 'admin_password_hash'; 
  
  // Insert sample users
  db.run(`
    INSERT OR IGNORE INTO Users (id, username, password_hash, email, role) 
    VALUES 
      (1, 'player1', ?, 'player1@example.com', 'user'),
      (2, 'player2', ?, 'player2@example.com', 'user'),
      (3, 'admin', ?, 'admin@hockeyroleplay.com', 'admin')
  `, [passwordHash1, passwordHash2, adminPasswordHash], function(err) {
    if (err) {
      console.error('Error inserting users:', err);
      closeDatabase();
      return;
    }
    
    console.log('Sample users inserted');
    
    // Insert sample teams
    db.run(`
      INSERT OR IGNORE INTO Teams (id, name, record, owner_id, logo_url) 
      VALUES 
        (1, 'Toronto Maple Leafs', '8-4-2', 3, '/api/placeholder/150/150'),
        (2, 'Montreal Canadiens', '6-6-1', 3, '/api/placeholder/150/150'),
        (3, 'Boston Bruins', '9-3-0', 3, '/api/placeholder/150/150'),
        (4, 'Vancouver Canucks', '7-5-3', 3, '/api/placeholder/150/150')
    `, function(err) {
      if (err) {
        console.error('Error inserting teams:', err);
        closeDatabase();
        return;
      }
      
      console.log('Sample teams inserted');
      
      // Insert sample characters
      const character1Stats = JSON.stringify({
        goals: 12,
        assists: 18,
        games: 14,
        shots: 45,
        plus_minus: 8,
        penalties: 12,
        faceoff_pct: 58.2
      });
      
      const character2Stats = JSON.stringify({
        goals: 5,
        assists: 15,
        games: 14,
        shots: 28,
        plus_minus: 12,
        penalties: 36,
        blocks: 38
      });
      
      const character3Stats = JSON.stringify({
        goals: 18,
        assists: 11,
        games: 13,
        shots: 62,
        plus_minus: 5,
        penalties: 8,
        shooting_pct: 29.0
      });
      
      db.run(`
        INSERT OR IGNORE INTO Characters (id, user_id, name, position, team_id, stats_json, is_active) 
        VALUES 
          (1, 1, 'Mark Stevens', 'C', 1, ?, 1),
          (2, 1, 'Alex Johnson', 'D', 1, ?, 0),
          (3, 2, 'Mike Williams', 'LW', 2, ?, 1)
      `, [character1Stats, character2Stats, character3Stats], function(err) {
        if (err) {
          console.error('Error inserting characters:', err);
          closeDatabase();
          return;
        }
        
        console.log('Sample characters inserted');
        insertRemainingData();
      });
    });
  });
}

// Insert remaining sample data
function insertRemainingData() {
  // Insert sample games
  db.run(`
    INSERT OR IGNORE INTO Games (id, home_team_id, away_team_id, date, status, home_score, away_score) 
    VALUES 
      (1, 1, 2, datetime('now', '+3 days'), 'scheduled', NULL, NULL),
      (2, 3, 1, datetime('now', '+6 days'), 'scheduled', NULL, NULL),
      (3, 4, 2, datetime('now', '+8 days'), 'scheduled', NULL, NULL),
      (4, 1, 4, datetime('now', '-2 days'), 'completed', 4, 2)
  `, function(err) {
    if (err) {
      console.error('Error inserting games:', err);
      closeDatabase();
      return;
    }
    
    console.log('Sample games inserted');
    
    // Insert sample messages
    db.run(`
      INSERT OR IGNORE INTO Messages (id, sender_id, receiver_id, content, timestamp, read) 
      VALUES 
        (1, 3, 1, 'Welcome to the Northern Attitude Hockey League! We''re excited to have you join us.', datetime('now', '-3 days'), 1),
        (2, 3, 1, 'Don''t forget, we have practice tomorrow at 7:00 AM. Please be on time.', datetime('now', '-1 day'), 0),
        (3, 2, 1, 'We''re having a team meeting after the game on Friday to discuss strategy.', datetime('now', '-12 hours'), 0),
        (4, 3, 1, 'Please review the updated league rules for the upcoming season.', datetime('now'), 0)
    `, function(err) {
      if (err) {
        console.error('Error inserting messages:', err);
        closeDatabase();
        return;
      }
      
      console.log('Sample messages inserted');
      
      // Insert sample game statistics
      db.run(`
        INSERT OR IGNORE INTO GameStatistics (game_id, character_id, goals, assists, shots, penalties_minutes, plus_minus, ice_time) 
        VALUES 
          (4, 1, 2, 1, 5, 2, 3, 1200),
          (4, 2, 0, 2, 3, 4, 2, 1400),
          (4, 3, 1, 0, 4, 0, -1, 950)
      `, function(err) {
        if (err) {
          console.error('Error inserting game statistics:', err);
          closeDatabase();
          return;
        }
        
        console.log('Sample game statistics inserted');
        
        // Insert sample team staff
        db.run(`
          INSERT OR IGNORE INTO TeamStaff (team_id, user_id, role) 
          VALUES 
            (1, 3, 'Head Coach'),
            (2, 3, 'General Manager')
        `, function(err) {
          if (err) {
            console.error('Error inserting team staff:', err);
            closeDatabase();
            return;
          }
          
          console.log('Sample team staff inserted');
          console.log('Database initialization completed successfully!');
          closeDatabase();
        });
      });
    });
  });
}

// Close database connection
function closeDatabase() {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
      return;
    }
    console.log('Database connection closed');
  });
}