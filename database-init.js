// database-init.js - Script for proper database initialization
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, 'config/hockey_roleplay.db');
console.log('Database will be created at:', dbPath);

// Ensure the directory exists before creating the database
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  console.log(`Creating directory: ${dbDir}`);
  fs.mkdirSync(dbDir, { recursive: true });
}

const CURRENT_SCHEMA_VERSION = 2; // Increment when schema changes

// Logger function for consistent output
function log(type, message) {
  const timestamp = new Date().toISOString();
  console[type](`[${timestamp}] ${message}`);
}

// Check if database file exists
const dbExists = fs.existsSync(dbPath);
log('log', `Database exists: ${dbExists}`);

// Create a new database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    log('error', `Error connecting to database: ${err.message}`);
    process.exit(1);
  }
  log('log', 'Connected to the hockey roleplay database');
  
  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');
  
  // Initialize database
  initDatabase();
});

// Function to execute SQL with proper error handling
function executeSql(sql, params = [], description) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        log('error', `Error ${description}: ${err.message}`);
        reject(err);
      } else {
        log('log', `Successfully ${description}`);
        resolve({ lastId: this.lastID, changes: this.changes });
      }
    });
  });
}

// Function to run queries in a transaction
function runTransaction(queries) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      let success = true;
      const results = [];
      
      queries.forEach((query, index) => {
        if (!success) return;
        
        const { sql, params, description } = query;
        db.run(sql, params, function(err) {
          if (err) {
            log('error', `Error ${description}: ${err.message}`);
            success = false;
            db.run('ROLLBACK');
            reject(err);
          } else {
            results.push({ lastId: this.lastID, changes: this.changes });
            if (index === queries.length - 1) {
              db.run('COMMIT', (err) => {
                if (err) {
                  log('error', `Error committing transaction: ${err.message}`);
                  db.run('ROLLBACK');
                  reject(err);
                } else {
                  resolve(results);
                }
              });
            }
          }
        });
      });
    });
  });
}

// Define all table schemas
const tableSchemas = {
  // Schema versioning
  schema_versions: `
    CREATE TABLE IF NOT EXISTS schema_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version INTEGER NOT NULL,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      description TEXT
    )
  `,

  // User-related tables
  users: `
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
  `,
  
  user_profiles: `
    CREATE TABLE IF NOT EXISTS UserProfiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      display_name VARCHAR(100),
      bio TEXT,
      location VARCHAR(100),
      avatar_url VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
    )
  `,
  
  user_privacy_settings: `
    CREATE TABLE IF NOT EXISTS UserPrivacySettings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      visibility VARCHAR(20) DEFAULT 'members',
      preferences_json TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
    )
  `,
  
  password_resets: `
    CREATE TABLE IF NOT EXISTS PasswordResets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token VARCHAR(255) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP NOT NULL,
      used BOOLEAN DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
    )
  `,

  // Team-related tables
  teams: `
    CREATE TABLE IF NOT EXISTS Teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(100) NOT NULL UNIQUE,
      record VARCHAR(20) DEFAULT '0-0-0',
      owner_id INTEGER,
      logo_url VARCHAR(255),
      description TEXT,
      primary_color VARCHAR(7),
      secondary_color VARCHAR(7),
      tertiary_color VARCHAR(7),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES Users(id) ON DELETE SET NULL
    )
  `,
  
  team_staff: `
    CREATE TABLE IF NOT EXISTS TeamStaff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role VARCHAR(50) NOT NULL,
      FOREIGN KEY (team_id) REFERENCES Teams(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
    )
  `,
  
  team_join_requests: `
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
  `,

  // Character-related tables
  characters: `
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
      header_image_url TEXT,
      is_active INTEGER DEFAULT 0,
      full_name VARCHAR(100),
      age INTEGER,
      nationality VARCHAR(50),
      hometown VARCHAR(100),
      height VARCHAR(20),
      weight INTEGER,
      handedness VARCHAR(10),
      years_pro INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
      FOREIGN KEY (team_id) REFERENCES Teams(id) ON DELETE SET NULL
    )
  `,

  // Game-related tables
  games: `
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
  `,
  
  game_statistics: `
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
  `,

    // Conversations
  characterConversations: `
    CREATE TABLE CharacterConversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      is_group BOOLEAN DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `,

  // Messaging system
  characterMessages: `
  CREATE TABLE IF NOT EXISTS CharacterMessages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL,
  sender_character_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES CharacterConversations(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_character_id) REFERENCES Characters(id) ON DELETE CASCADE
  )
`,

    // ConversationParticipants table
    characterConversationParticipants: `
    CREATE TABLE IF NOT EXISTS CharacterConversationParticipants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      character_id INTEGER NOT NULL,
      last_read_at TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES CharacterConversations(id) ON DELETE CASCADE,
      FOREIGN KEY (character_id) REFERENCES Characters(id) ON DELETE CASCADE
    )
  `,

      // Contacts table
    characterContacts: `
    CREATE TABLE CharacterContacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_character_id INTEGER NOT NULL,  -- Character who set this contact info
      target_character_id INTEGER NOT NULL, -- Character being renamed
      custom_name TEXT,                     -- Custom name for this contact
      custom_image TEXT,                    -- Custom image for this contact
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_character_id) REFERENCES Characters(id) ON DELETE CASCADE,
      FOREIGN KEY (target_character_id) REFERENCES Characters(id) ON DELETE CASCADE,
      UNIQUE(owner_character_id, target_character_id)
    )
  `,

        // timestamp trigger
    timestampTrigger: `
    CREATE TRIGGER update_character_contacts_timestamp 
    AFTER UPDATE ON CharacterContacts
    BEGIN
      UPDATE CharacterContacts SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
  `
};

// Define all indexes
const indexes = [
  { sql: "CREATE INDEX IF NOT EXISTS idx_characters_user_id ON Characters(user_id)", description: "creating characters user index" },
  { sql: "CREATE INDEX IF NOT EXISTS idx_characters_team_id ON Characters(team_id)", description: "creating characters team index" },
  { sql: "CREATE INDEX IF NOT EXISTS idx_games_teams ON Games(home_team_id, away_team_id)", description: "creating games teams index" },
  { sql: "CREATE INDEX IF NOT EXISTS idx_games_date ON Games(date)", description: "creating games date index" },
  { sql: "CREATE INDEX IF NOT EXISTS idx_characterMessages_characters ON CharacterMessages(sender_character_id)" },
  { sql: "CREATE INDEX IF NOT EXISTS idx_game_stats_game ON GameStatistics(game_id)", description: "creating game stats game index" },
  { sql: "CREATE INDEX IF NOT EXISTS idx_game_stats_character ON GameStatistics(character_id)", description: "creating game stats character index" },
  { sql: "CREATE INDEX IF NOT EXISTS idx_password_resets_token ON PasswordResets(token)", description: "creating password resets token index" },
  { sql: "CREATE INDEX IF NOT EXISTS idx_password_resets_user ON PasswordResets(user_id)", description: "creating password resets user index" },
  { sql: "CREATE INDEX IF NOT EXISTS idx_userprofiles_user_id ON UserProfiles(user_id)", description: "creating user profiles user index" },
  { sql: "CREATE INDEX IF NOT EXISTS idx_team_staff_team ON TeamStaff(team_id)", description: "creating team staff team index" },
  { sql: "CREATE INDEX IF NOT EXISTS idx_team_staff_user ON TeamStaff(user_id)", description: "creating team staff user index" },
  { sql: "CREATE INDEX IF NOT EXISTS idx_join_requests_team ON TeamJoinRequests(team_id)", description: "creating join requests team index" },
  { sql: "CREATE INDEX IF NOT EXISTS idx_join_requests_user ON TeamJoinRequests(user_id)", description: "creating join requests user index" }
];

// Check and update schema version
async function checkSchemaVersion() {
  try {
    // Create version table if it doesn't exist
    await executeSql(tableSchemas.schema_versions, [], "creating schema version table");
    
    // Get current schema version
    return new Promise((resolve, reject) => {
      db.get("SELECT MAX(version) as version FROM schema_versions", [], (err, row) => {
        if (err) {
          log('error', `Error checking schema version: ${err.message}`);
          reject(err);
        } else {
          const currentVersion = row && row.version ? row.version : 0;
          log('log', `Current schema version: ${currentVersion}`);
          resolve(currentVersion);
        }
      });
    });
  } catch (err) {
    log('error', `Failed to check schema version: ${err.message}`);
    return 0;
  }
}

// Main initialization function
async function initDatabase() {
  try {
    // Check schema version
    const currentVersion = await checkSchemaVersion();
    
    // If we're already at the current version, no need to update tables
    if (currentVersion === CURRENT_SCHEMA_VERSION) {
      log('log', `Database schema is up to date (version ${CURRENT_SCHEMA_VERSION})`);
      
      // Don't add sample data for existing DBs
      if (dbExists) {
        log('log', 'Database exists, skipping sample data.');
        closeDatabase();
        return;
      }
    }
    
    // Create tables in the correct order
    log('log', 'Creating or updating database tables...');
    
    // Convert tables to query format
    const tableQueries = Object.entries(tableSchemas).map(([name, sql]) => ({
      sql,
      params: [],
      description: `creating ${name} table`
    }));
    
    // Create all tables
    await runTransaction(tableQueries);
    
    // Create indexes
    log('log', 'Creating indexes...');
    for (const index of indexes) {
      await executeSql(index.sql, [], index.description);
    }
    
    // Update schema version if needed
    if (currentVersion < CURRENT_SCHEMA_VERSION) {
      await executeSql(
        "INSERT INTO schema_versions (version, description) VALUES (?, ?)",
        [CURRENT_SCHEMA_VERSION, "Full schema update with character header images"],
        "updating schema version"
      );
      log('log', `Schema updated to version ${CURRENT_SCHEMA_VERSION}`);
    }
    
    // Insert sample data for new databases
    if (!dbExists) {
      log('log', 'New database detected! Inserting sample data...');
      await insertSampleData();
    }
    
    log('log', 'Database initialization completed successfully!');
    closeDatabase();
  } catch (err) {
    log('error', `Database initialization failed: ${err.message}`);
    closeDatabase();
  }
}

// Insert sample data
async function insertSampleData() {
  try {
    // Sample user data
    const passwordHash1 = 'hashed_password_1'; 
    const passwordHash2 = 'hashed_password_2'; 
    const adminPasswordHash = 'admin_password_hash';
    
    // Insert users
    await executeSql(
      `INSERT OR IGNORE INTO Users (id, username, password_hash, email, role) 
       VALUES 
         (1, 'player1', ?, 'player1@example.com', 'user'),
         (2, 'player2', ?, 'player2@example.com', 'user'),
         (3, 'admin', ?, 'admin@hockeyroleplay.com', 'admin')`,
      [passwordHash1, passwordHash2, adminPasswordHash],
      "inserting sample users"
    );
    
    // Insert teams
    await executeSql(
      `INSERT OR IGNORE INTO Teams (id, name, record, owner_id, logo_url, description, primary_color, secondary_color) 
       VALUES 
         (1, 'Toronto Maple Leafs', '8-4-2', 3, '/api/placeholder/150/150', 'A founding member of the NHL, the Maple Leafs are a storied franchise with a rich history.', '#00205B', '#FFFFFF'),
         (2, 'Montreal Canadiens', '6-6-1', 3, '/api/placeholder/150/150', 'The oldest professional hockey franchise in the world, with 24 Stanley Cup championships.', '#AF1E2D', '#192168'),
         (3, 'Boston Bruins', '9-3-0', 3, '/api/placeholder/150/150', 'An Original Six team known for their physical, defensive style of play.', '#FFB81C', '#000000'),
         (4, 'Vancouver Canucks', '7-5-3', 3, '/api/placeholder/150/150', 'Founded in 1970, the Canucks have been to the Stanley Cup Finals three times.', '#00843D', '#00205B')`,
      [],
      "inserting sample teams"
    );
    
    // Insert sample characters with improved stats
    const character1Stats = JSON.stringify({
      jersey_number: 91,
      goals: 12,
      assists: 18,
      games: 14,
      shots: 45,
      plus_minus: 8,
      penalties: 12,
      faceoff_pct: 58.2
    });
    
    const character2Stats = JSON.stringify({
      jersey_number: 44,
      goals: 5,
      assists: 15,
      games: 14,
      shots: 28,
      plus_minus: 12,
      penalties: 36,
      blocks: 38,
      hits: 42,
      ice_time: 22.5
    });
    
    const character3Stats = JSON.stringify({
      jersey_number: 13,
      goals: 18,
      assists: 11,
      games: 13,
      shots: 62,
      plus_minus: 5,
      penalties: 8,
      shooting_pct: 29.0
    });
    
    await executeSql(
      `INSERT OR IGNORE INTO Characters (id, user_id, name, position, team_id, stats_json, bio, is_active, avatar_url, header_image_url) 
       VALUES 
         (1, 1, 'Mark Stevens', 'C', 1, ?, 'Mark is a playmaking center known for his vision and passing ability. Originally from Winnipeg, he played junior hockey in the WHL before getting drafted.', 1, '/api/placeholder/150/150', '/api/placeholder/800/300'),
         (2, 1, 'Alex Johnson', 'D', 1, ?, 'Alex is a stay-at-home defenseman with a knack for shot-blocking and physical play. He leads by example and is respected in the locker room.', 0, '/api/placeholder/150/150', '/api/placeholder/800/300'),
         (3, 2, 'Mike Williams', 'LW', 2, ?, 'Mike is a natural goal-scorer with a wicked wrist shot. He prefers to let his play on the ice do the talking.', 1, '/api/placeholder/150/150', '/api/placeholder/800/300')`,
      [character1Stats, character2Stats, character3Stats],
      "inserting sample characters"
    );
    
    // Insert sample games
    await executeSql(
      `INSERT OR IGNORE INTO Games (id, home_team_id, away_team_id, date, status, home_score, away_score) 
       VALUES 
         (1, 1, 2, datetime('now', '+3 days'), 'scheduled', NULL, NULL),
         (2, 3, 1, datetime('now', '+6 days'), 'scheduled', NULL, NULL),
         (3, 4, 2, datetime('now', '+8 days'), 'scheduled', NULL, NULL),
         (4, 1, 4, datetime('now', '-2 days'), 'completed', 4, 2)`,
      [],
      "inserting sample games"
    );
  
    
    // Insert sample game statistics
    await executeSql(
      `INSERT OR IGNORE INTO GameStatistics (game_id, character_id, goals, assists, shots, penalties_minutes, plus_minus, ice_time) 
       VALUES 
         (4, 1, 2, 1, 5, 2, 3, 1200),
         (4, 2, 0, 2, 3, 4, 2, 1400),
         (4, 3, 1, 0, 4, 0, -1, 950)`,
      [],
      "inserting sample game statistics"
    );
    
    // Insert sample team staff
    await executeSql(
      `INSERT OR IGNORE INTO TeamStaff (team_id, user_id, role) 
       VALUES 
         (1, 3, 'Head Coach'),
         (2, 3, 'General Manager')`,
      [],
      "inserting sample team staff"
    );
    
    // Insert sample conversations
    await executeSql(
      `INSERT OR IGNORE INTO CharacterConversations (id, title, is_group) 
       VALUES 
         (1, 'Team Communication', 0)`,
      [],
      "inserting sample conversations"
    );
    
    // Then, insert conversation participants (this might be optional depending on your exact schema)
    await executeSql(
      `INSERT OR IGNORE INTO CharacterConversationParticipants (conversation_id, character_id) 
       VALUES 
         (1, 1),
         (1, 2),
         (1, 3)`,
      [],
      "inserting sample conversation participants"
    );
    
    // Ensure the sample messages use the exact character IDs from your previous character insertion
    await executeSql(
      `INSERT OR IGNORE INTO CharacterMessages (conversation_id, sender_character_id, content, is_read) 
       VALUES 
         (1, 1, 'Welcome to the Northern Attitude Hockey League! We''re excited to have you join us.', 1),
         (1, 1, 'Don''t forget, we have practice tomorrow at 7:00 AM. Please be on time.', 0),
         (1, 2, 'We''re having a team meeting after the game on Friday to discuss strategy.', 0),
         (1, 3, 'Please review the updated league rules for the upcoming season.', 0)`,
      [],
      "inserting sample messages"
    );
    
    log('log', 'All sample data inserted successfully');
  } catch (err) {
    log('error', `Error inserting sample data: ${err.message}`);
    throw err;
  }
}

// Close database connection
function closeDatabase() {
  db.close((err) => {
    if (err) {
      log('error', `Error closing database: ${err.message}`);
      return;
    }
    log('log', 'Database connection closed');
  });
}