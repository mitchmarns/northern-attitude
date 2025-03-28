// database-init-prod.js
const dotenv = require('dotenv');
dotenv.config(); // Load environment variables
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, process.env.DATABASE_PATH || 'config/hockey_roleplay.db');

// Ensure the directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
const CURRENT_SCHEMA_VERSION = 8; // Increment when schema changes

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
          // Ignore errors about tables already existing
          if (err && !err.message.includes('already exists')) {
            log('error', `Error ${description}: ${err.message}`);
            success = false;
            db.run('ROLLBACK');
            reject(err);
          } else {
            // Log the error but continue if it's just about existing tables
            if (err) {
              log('log', `Ignoring existing table error: ${err.message}`);
            }
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

  teams_stats: `
  CREATE TABLE IF NOT EXISTS TeamsStats (
    team_id INTEGER PRIMARY KEY,
    games_played INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    ties INTEGER DEFAULT 0,
    goals_for INTEGER DEFAULT 0,
    goals_against INTEGER DEFAULT 0,
    FOREIGN KEY (team_id) REFERENCES Teams(id) ON DELETE CASCADE
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
      status TEXT DEFAULT 'pending',
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
      joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_read_at TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES CharacterConversations(id) ON DELETE CASCADE,
      FOREIGN KEY (character_id) REFERENCES Characters(id) ON DELETE CASCADE,
      UNIQUE(conversation_id, character_id)
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
  `,

  roleplayThreads: `
  CREATE TABLE IF NOT EXISTS RoleplayThreads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    location VARCHAR(100),
    status VARCHAR(20) DEFAULT 'open',
    created_by_character_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(created_by_character_id) REFERENCES Characters(id),
    CONSTRAINT check_status CHECK (status IN ('open', 'closed', 'completed'))
  )
`,

threadParticipants: `
  CREATE TABLE IF NOT EXISTS ThreadParticipants (
    thread_id INTEGER,
    character_id INTEGER,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_post_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active',
    PRIMARY KEY(thread_id, character_id),
    FOREIGN KEY(thread_id) REFERENCES RoleplayThreads(id),
    FOREIGN KEY(character_id) REFERENCES Characters(id),
    CONSTRAINT check_participant_status CHECK (status IN ('active', 'inactive'))
  )
`,

threadPosts: `
  CREATE TABLE IF NOT EXISTS ThreadPosts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    thread_id INTEGER NOT NULL,
    character_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(thread_id) REFERENCES RoleplayThreads(id),
    FOREIGN KEY(character_id) REFERENCES Characters(id)
  )
`,

socialPosts: `
CREATE TABLE IF NOT EXISTS SocialPosts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER NOT NULL,
    content TEXT,
    media_url TEXT,
    post_type VARCHAR(20), -- text, image, video, etc.
    visibility VARCHAR(20) DEFAULT 'public', -- public, followers, team
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (character_id) REFERENCES Characters(id) ON DELETE CASCADE
)
`,

socialPostImages: `
CREATE TABLE IF NOT EXISTS SocialPostImages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    image_url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES SocialPosts(id) ON DELETE CASCADE
)
`,

socialLikes: `
CREATE TABLE IF NOT EXISTS SocialLikes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    character_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES SocialPosts(id) ON DELETE CASCADE,
    FOREIGN KEY (character_id) REFERENCES Characters(id) ON DELETE CASCADE,
    UNIQUE(post_id, character_id)
)
`,

socialCharacterTags: `
CREATE TABLE IF NOT EXISTS SocialCharacterTags (
    post_id INTEGER NOT NULL,
    character_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES SocialPosts(id) ON DELETE CASCADE,
    FOREIGN KEY (character_id) REFERENCES Characters(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, character_id)
)
`,

socialComments: `
CREATE TABLE IF NOT EXISTS SocialComments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    character_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    parent_comment_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES SocialPosts(id) ON DELETE CASCADE,
    FOREIGN KEY (character_id) REFERENCES Characters(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_comment_id) REFERENCES SocialComments(id) ON DELETE CASCADE
)
`,

socialFollowers: `
CREATE TABLE IF NOT EXISTS SocialFollowers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    follower_character_id INTEGER NOT NULL,
    followed_character_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (follower_character_id) REFERENCES Characters(id) ON DELETE CASCADE,
    FOREIGN KEY (followed_character_id) REFERENCES Characters(id) ON DELETE CASCADE,
    UNIQUE(follower_character_id, followed_character_id)
)
`,

socialHashtags: `
CREATE TABLE IF NOT EXISTS SocialHashtags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
`,

socialPostHashtags: `
CREATE TABLE IF NOT EXISTS SocialPostHashtags (
    post_id INTEGER NOT NULL,
    hashtag_id INTEGER NOT NULL,
    FOREIGN KEY (post_id) REFERENCES SocialPosts(id) ON DELETE CASCADE,
    FOREIGN KEY (hashtag_id) REFERENCES SocialHashtags(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, hashtag_id)
)
`,

socialCharacterTags: `
CREATE TABLE IF NOT EXISTS SocialCharacterTags (
    post_id INTEGER NOT NULL,
    character_id INTEGER NOT NULL,
    FOREIGN KEY (post_id) REFERENCES SocialPosts(id) ON DELETE CASCADE,
    FOREIGN KEY (character_id) REFERENCES Characters(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, character_id)
)
`,

socialNotifications: `
CREATE TABLE IF NOT EXISTS SocialNotifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipient_character_id INTEGER NOT NULL,
    actor_character_id INTEGER NOT NULL,
    action_type VARCHAR(20) NOT NULL, -- follow, like, comment, mention, etc.
    target_id INTEGER NOT NULL, -- post_id or comment_id
    target_type VARCHAR(20) NOT NULL, -- post, comment
    is_read BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recipient_character_id) REFERENCES Characters(id) ON DELETE CASCADE,
    FOREIGN KEY (actor_character_id) REFERENCES Characters(id) ON DELETE CASCADE
)
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

function closeDatabase() {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) {
        log('error', `Error closing database: ${err.message}`);
        reject(err);
      } else {
        log('log', 'Database connection closed');
        resolve();
      }
    });
  });
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
      try {
        await executeSql(index.sql, [], index.description);
      } catch (indexErr) {
        // Log index creation error but continue
        log('log', `Ignoring index creation error: ${indexErr.message}`);
      }
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
    }
    
    log('log', 'Database initialization completed successfully!');
    closeDatabase();
  } catch (err) {
    log('error', `Database initialization failed: ${err.message}`);
    closeDatabase();
  }
}
