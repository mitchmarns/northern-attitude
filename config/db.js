// Updated db.js - Database connection and error handling middleware
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Check if database file exists
const dbPath = path.resolve(__dirname, 'hockey_roleplay.db');
const dbExists = fs.existsSync(dbPath);

// If database doesn't exist, we should run the initialization script
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
  console.log('Connected to the hockey roleplay database');
  
  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');
});

// Helper function to check if a table exists
function tableExists(tableName) {
  return new Promise((resolve, reject) => {
    const query = `SELECT name FROM sqlite_master WHERE type='table' AND name=?`;
    
    db.get(query, [tableName], (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(!!row);
    });
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
  createCharacter: (userId, name, position, teamId, statsJson, bio = null, avatarUrl = null, isActive = false) => {
    return new Promise(async (resolve, reject) => {
      try {
        // Check if Characters table exists
        const exists = await tableExists('Characters');
        if (!exists) {
          reject(new Error('Characters table does not exist. Please run database initialization.'));
          return;
        }
        
        const query = `INSERT INTO Characters (
          user_id, name, position, team_id, stats_json, bio, avatar_url, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;
        
        db.run(query, [userId, name, position, teamId, statsJson, bio, avatarUrl, isActive ? 1 : 0], function(err) {
          if (err) {
            reject(err);
            return;
          }
          resolve(this.lastID);
        });
      } catch (err) {
        reject(err);
      }
    });
  },
  
  // Get all characters for a user
  getUserCharacters: (userId) => {
    return new Promise(async (resolve, reject) => {
      try {
        // Check if Characters table exists
        const exists = await tableExists('Characters');
        if (!exists) {
          reject(new Error('Characters table does not exist. Please run database initialization.'));
          return;
        }
        
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
          resolve(rows || []);
        });
      } catch (err) {
        reject(err);
      }
    });
  },
  
  // Get a single character by ID
  getCharacterById: (characterId, includeTeam = true) => {
    return new Promise(async (resolve, reject) => {
      try {
        // Check if Characters table exists
        const exists = await tableExists('Characters');
        if (!exists) {
          reject(new Error('Characters table does not exist. Please run database initialization.'));
          return;
        }
        
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
      } catch (err) {
        reject(err);
      }
    });
  },

  // Check if a character belongs to a user
  isCharacterOwner: (userId, characterId) => {
    return new Promise(async (resolve, reject) => {
      try {
        // Check if Characters table exists
        const exists = await tableExists('Characters');
        if (!exists) {
          reject(new Error('Characters table does not exist. Please run database initialization.'));
          return;
        }
        
        const query = `SELECT id FROM Characters WHERE id = ? AND user_id = ?`;
        
        db.get(query, [characterId, userId], (err, row) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(!!row); // Returns true if character belongs to user, false otherwise
        });
      } catch (err) {
        reject(err);
      }
    });
  },

  // Update character details
  updateCharacter: (characterId, data) => {
    return new Promise(async (resolve, reject) => {
      try {
        // Check if Characters table exists
        const exists = await tableExists('Characters');
        if (!exists) {
          reject(new Error('Characters table does not exist. Please run database initialization.'));
          return;
        }
        
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
        
        if (data.is_active !== undefined) {
          setColumns.push('is_active = ?');
          values.push(data.is_active ? 1 : 0);
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
      } catch (err) {
        reject(err);
      }
    });
  },

  // Delete a character
  deleteCharacter: (characterId) => {
    return new Promise(async (resolve, reject) => {
      try {
        // Check if Characters table exists
        const exists = await tableExists('Characters');
        if (!exists) {
          reject(new Error('Characters table does not exist. Please run database initialization.'));
          return;
        }
        
        const query = `DELETE FROM Characters WHERE id = ?`;
        
        db.run(query, [characterId], function(err) {
          if (err) {
            reject(err);
            return;
          }
          resolve(this.changes);
        });
      } catch (err) {
        reject(err);
      }
    });
  },

  // Set a character as active (mark all other user's characters as inactive)
  setActiveCharacter: (userId, characterId) => {
    return new Promise(async (resolve, reject) => {
      try {
        // Check if Characters table exists
        const exists = await tableExists('Characters');
        if (!exists) {
          reject(new Error('Characters table does not exist. Please run database initialization.'));
          return;
        }
        
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
      } catch (err) {
        reject(err);
      }
    });
  },

  // Get recent games for a character
  getCharacterGames: (characterId, limit = 5) => {
    return new Promise(async (resolve, reject) => {
      try {
        // Check if required tables exist
        const charactersExist = await tableExists('Characters');
        const gamesExist = await tableExists('Games');
        const statsExist = await tableExists('GameStatistics');
        
        if (!charactersExist || !gamesExist || !statsExist) {
          reject(new Error('Required tables do not exist. Please run database initialization.'));
          return;
        }
        
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
          resolve(rows || []);
        });
      } catch (err) {
        reject(err);
      }
    });
  }
};

// Team-related database operations
const teamOperations = {
  // Get all teams
  getAllTeams: () => {
    return new Promise(async (resolve, reject) => {
      try {
        // Check if Teams table exists
        const exists = await tableExists('Teams');
        if (!exists) {
          reject(new Error('Teams table does not exist. Please run database initialization.'));
          return;
        }
        
        const query = `SELECT * FROM Teams ORDER BY name`;
        
        db.all(query, [], (err, rows) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(rows || []);
        });
      } catch (err) {
        reject(err);
      }
    });
  },

  // Get team by ID
  getTeamById: (teamId) => {
    return new Promise(async (resolve, reject) => {
      try {
        // Check if Teams table exists
        const exists = await tableExists('Teams');
        if (!exists) {
          reject(new Error('Teams table does not exist. Please run database initialization.'));
          return;
        }
        
        const query = `SELECT * FROM Teams WHERE id = ?`;
        
        db.get(query, [teamId], (err, row) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(row);
        });
      } catch (err) {
        reject(err);
      }
    });
  },
  
  // Get team owner
  getTeamOwner: (teamId) => {
    return new Promise(async (resolve, reject) => {
      try {
        // Check if required tables exist
        const teamsExist = await tableExists('Teams');
        const usersExist = await tableExists('Users');
        
        if (!teamsExist || !usersExist) {
          reject(new Error('Required tables do not exist. Please run database initialization.'));
          return;
        }
        
        const query = `SELECT u.id, u.username FROM Teams t
                      JOIN Users u ON t.owner_id = u.id
                      WHERE t.id = ?`;
        
        db.get(query, [teamId], (err, row) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(row);
        });
      } catch (err) {
        reject(err);
      }
    });
  },
  
  // Check if user is team owner
  isTeamOwner: (userId, teamId) => {
    return new Promise(async (resolve, reject) => {
      try {
        // Check if Teams table exists
        const exists = await tableExists('Teams');
        if (!exists) {
          reject(new Error('Teams table does not exist. Please run database initialization.'));
          return;
        }
        
        const query = `SELECT 1 FROM Teams WHERE id = ? AND owner_id = ?`;
        
        db.get(query, [teamId, userId], (err, row) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(!!row);
        });
      } catch (err) {
        reject(err);
      }
    });
  },
  
  // Get team staff members
  getTeamStaff: (teamId) => {
    return new Promise(async (resolve, reject) => {
      try {
        // Check if required tables exist
        const staffExist = await tableExists('TeamStaff');
        const usersExist = await tableExists('Users');
        
        if (!staffExist || !usersExist) {
          reject(new Error('Required tables do not exist. Please run database initialization.'));
          return;
        }
        
        const query = `SELECT ts.id, ts.user_id, ts.role, u.username, u.avatar_url 
                      FROM TeamStaff ts
                      JOIN Users u ON ts.user_id = u.id
                      WHERE ts.team_id = ?`;
        
        db.all(query, [teamId], (err, rows) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(rows || []);
        });
      } catch (err) {
        reject(err);
      }
    });
  },
  
  // Check if user is team staff
  isTeamStaff: (userId, teamId) => {
    return new Promise(async (resolve, reject) => {
      try {
        // Check if TeamStaff table exists
        const exists = await tableExists('TeamStaff');
        if (!exists) {
          reject(new Error('TeamStaff table does not exist. Please run database initialization.'));
          return;
        }
        
        const query = `SELECT 1 FROM TeamStaff WHERE team_id = ? AND user_id = ?`;
        
        db.get(query, [teamId, userId], (err, row) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(!!row);
        });
      } catch (err) {
        reject(err);
      }
    });
  },
  
  // Get team roster
  getTeamRoster: (teamId) => {
    return new Promise(async (resolve, reject) => {
      try {
        // Check if required tables exist
        const charactersExist = await tableExists('Characters');
        const usersExist = await tableExists('Users');
        
        if (!charactersExist || !usersExist) {
          reject(new Error('Required tables do not exist. Please run database initialization.'));
          return;
        }
        
        const query = `SELECT c.id as character_id, c.name as character_name, c.position, 
                     c.stats_json, c.avatar_url, u.id as user_id, u.username
                    FROM Characters c
                    JOIN Users u ON c.user_id = u.id
                    WHERE c.team_id = ?
                    ORDER BY c.position, c.name`;
        
        db.all(query, [teamId], (err, rows) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(rows || []);
        });
      } catch (err) {
        reject(err);
      }
    });
  },
  
  // Check if user has a character on team
  isUserOnTeam: (userId, teamId) => {
    return new Promise(async (resolve, reject) => {
      try {
        // Check if Characters table exists
        const exists = await tableExists('Characters');
        if (!exists) {
          reject(new Error('Characters table does not exist. Please run database initialization.'));
          return;
        }
        
        const query = `SELECT 1 FROM Characters WHERE user_id = ? AND team_id = ?`;
        
        db.get(query, [userId, teamId], (err, row) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(!!row);
        });
      } catch (err) {
        reject(err);
      }
    });
  },
  
  // Get team stats
  getTeamStats: (teamId) => {
    return new Promise(async (resolve, reject) => {
      try {
        // Check if Games table exists
        const exists = await tableExists('Games');
        if (!exists) {
          reject(new Error('Games table does not exist. Please run database initialization.'));
          return;
        }
        
        const query = `SELECT 
                      COUNT(*) as games_played,
                      SUM(CASE WHEN 
                        (home_team_id = ? AND home_score > away_score) OR
                        (away_team_id = ? AND away_score > home_score)
                        THEN 1 ELSE 0 END) as wins,
                      SUM(CASE WHEN 
                        (home_team_id = ? AND home_score < away_score) OR
                        (away_team_id = ? AND away_score < home_score)
                        THEN 1 ELSE 0 END) as losses,
                      SUM(CASE WHEN 
                        (home_score = away_score AND (home_team_id = ? OR away_team_id = ?))
                        THEN 1 ELSE 0 END) as ties,
                      SUM(CASE WHEN home_team_id = ? THEN home_score ELSE 0 END) +
                      SUM(CASE WHEN away_team_id = ? THEN away_score ELSE 0 END) as goals_for,
                      SUM(CASE WHEN home_team_id = ? THEN away_score ELSE 0 END) +
                      SUM(CASE WHEN away_team_id = ? THEN home_score ELSE 0 END) as goals_against
                    FROM Games
                    WHERE (home_team_id = ? OR away_team_id = ?) AND status = 'completed'`;
        
        db.get(
          query, 
          [teamId, teamId, teamId, teamId, teamId, teamId, teamId, teamId, teamId, teamId, teamId, teamId], 
          (err, row) => {
            if (err) {
              reject(err);
              return;
            }
            resolve(row || {
              games_played: 0,
              wins: 0,
              losses: 0,
              ties: 0,
              goals_for: 0,
              goals_against: 0
            });
          }
        );
      } catch (err) {
        reject(err);
      }
    });
  },
  
  // Create a new team
  createTeam: (name, ownerId, description = null, logoUrl = null, primaryColor = null, secondaryColor = null) => {
    return new Promise(async (resolve, reject) => {
      try {
        // Check if Teams table exists
        const exists = await tableExists('Teams');
        if (!exists) {
          reject(new Error('Teams table does not exist. Please run database initialization.'));
          return;
        }
        
        const query = `INSERT INTO Teams (
                        name, 
                        owner_id, 
                        description, 
                        logo_url, 
                        primary_color, 
                        secondary_color, 
                        created_at
                      ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`;
        
        db.run(
          query, 
          [name, ownerId, description, logoUrl, primaryColor, secondaryColor], 
          function(err) {
            if (err) {
              reject(err);
              return;
            }
            resolve(this.lastID);
          }
        );
      } catch (err) {
        reject(err);
      }
    });
  },
  
  // Update team
  updateTeam: (teamId, data) => {
    return new Promise(async (resolve, reject) => {
      try {
        // Check if Teams table exists
        const exists = await tableExists('Teams');
        if (!exists) {
          reject(new Error('Teams table does not exist. Please run database initialization.'));
          return;
        }
        
        // Build the SET part of the query dynamically based on provided data
        const setColumns = [];
        const values = [];
        
        if (data.name !== undefined) {
          setColumns.push('name = ?');
          values.push(data.name);
        }
        
        if (data.description !== undefined) {
          setColumns.push('description = ?');
          values.push(data.description);
        }
        
        if (data.logo_url !== undefined) {
          setColumns.push('logo_url = ?');
          values.push(data.logo_url);
        }
        
        if (data.primary_color !== undefined) {
          setColumns.push('primary_color = ?');
          values.push(data.primary_color);
        }
        
        if (data.secondary_color !== undefined) {
          setColumns.push('secondary_color = ?');
          values.push(data.secondary_color);
        }
        
        if (data.record !== undefined) {
          setColumns.push('record = ?');
          values.push(data.record);
        }
        
        // Add teamId to values array for WHERE clause
        values.push(teamId);
        
        const query = `UPDATE Teams SET ${setColumns.join(', ')} WHERE id = ?`;
        
        db.run(query, values, function(err) {
          if (err) {
            reject(err);
            return;
          }
          resolve(this.changes);
        });
      } catch (err) {
        reject(err);
      }
    });
  },
  
  // Delete team
  deleteTeam: (teamId) => {
    return new Promise(async (resolve, reject) => {
      try {
        // Check if Teams table exists
        const exists = await tableExists('Teams');
        if (!exists) {
          reject(new Error('Teams table does not exist. Please run database initialization.'));
          return;
        }
        
        // Begin transaction to ensure all related data is cleaned up
        db.serialize(() => {
          db.run('BEGIN TRANSACTION', (err) => {
            if (err) {
              reject(err);
              return;
            }
            
            // First, remove all characters from the team
            db.run('UPDATE Characters SET team_id = NULL WHERE team_id = ?', [teamId], (err) => {
              if (err) {
                db.run('ROLLBACK');
                reject(err);
                return;
              }
              
              // Delete all team staff
              db.run('DELETE FROM TeamStaff WHERE team_id = ?', [teamId], (err) => {
                if (err) {
                  db.run('ROLLBACK');
                  reject(err);
                  return;
                }
                
                // Delete all join requests
                db.run('DELETE FROM TeamJoinRequests WHERE team_id = ?', [teamId], (err) => {
                  if (err) {
                    db.run('ROLLBACK');
                    reject(err);
                    return;
                  }
                  
                  // Finally, delete the team
                  db.run('DELETE FROM Teams WHERE id = ?', [teamId], function(err) {
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
                  });
                });
              });
            });
          });
        });
      } catch (err) {
        reject(err);
      }
    });
  },
  
  // Add staff member to team
  addTeamStaff: (teamId, userId, role) => {
    return new Promise(async (resolve, reject) => {
      try {
        // Check if TeamStaff table exists
        const exists = await tableExists('TeamStaff');
        if (!exists) {
          reject(new Error('TeamStaff table does not exist. Please run database initialization.'));
          return;
        }
        
        const query = `INSERT INTO TeamStaff (team_id, user_id, role) VALUES (?, ?, ?)`;
        
        db.run(query, [teamId, userId, role], function(err) {
          if (err) {
            reject(err);
            return;
          }
          resolve(this.lastID);
        });
      } catch (err) {
        reject(err);
      }
    });
  },
  
  // Remove staff member from team
  removeTeamStaff: (teamId, staffId) => {
    return new Promise(async (resolve, reject) => {
      try {
        // Check if TeamStaff table exists
        const exists = await tableExists('TeamStaff');
        if (!exists) {
          reject(new Error('TeamStaff table does not exist. Please run database initialization.'));
          return;
        }
        
        const query = `DELETE FROM TeamStaff WHERE id = ? AND team_id = ?`;
        
        db.run(query, [staffId, teamId], function(err) {
          if (err) {
            reject(err);
            return;
          }
          resolve(this.changes);
        });
      } catch (err) {
        reject(err);
      }
    });
  },
  
  // Get join requests for a team
  getTeamJoinRequests: (teamId) => {
    return new Promise(async (resolve, reject) => {
      try {
        // Check if required tables exist
        const requestsExist = await tableExists('TeamJoinRequests');
        const usersExist = await tableExists('Users');
        
        if (!requestsExist || !usersExist) {
          reject(new Error('Required tables do not exist. Please run database initialization.'));
          return;
        }
        
        const query = `SELECT tjr.id, tjr.user_id, tjr.team_id, tjr.is_invitation, 
                              tjr.created_at, u.username, u.avatar_url
                        FROM TeamJoinRequests tjr
                        JOIN Users u ON tjr.user_id = u.id
                        WHERE tjr.team_id = ?
                        ORDER BY tjr.created_at DESC`;
        
        db.all(query, [teamId], (err, rows) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(rows || []);
        });
      } catch (err) {
        reject(err);
      }
    });
  },
  
  // Create join request (or invitation)
  createJoinRequest: (teamId, userId, isInvitation = false) => {
    return new Promise(async (resolve, reject) => {
      try {
        // Check if TeamJoinRequests table exists
        const exists = await tableExists('TeamJoinRequests');
        if (!exists) {
          reject(new Error('TeamJoinRequests table does not exist. Please run database initialization.'));
          return;
        }
        
        const query = `INSERT INTO TeamJoinRequests (team_id, user_id, is_invitation, created_at)
                        VALUES (?, ?, ?, CURRENT_TIMESTAMP)`;
        
        db.run(query, [teamId, userId, isInvitation ? 1 : 0], function(err) {
          if (err) {
            reject(err);
            return;
          }
          resolve(this.lastID);
        });
      } catch (err) {
        reject(err);
      }
    });
  },
  
  // Get join request by ID
  getJoinRequestById: (requestId) => {
    return new Promise(async (resolve, reject) => {
      try {
        // Check if TeamJoinRequests table exists
        const exists = await tableExists('TeamJoinRequests');
        if (!exists) {
          reject(new Error('TeamJoinRequests table does not exist. Please run database initialization.'));
          return;
        }
        
        const query = `SELECT * FROM TeamJoinRequests WHERE id = ?`;
        
        db.get(query, [requestId], (err, row) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(row);
        });
      } catch (err) {
        reject(err);
      }
    });
  },
  
  // Approve join request
  approveJoinRequest: (requestId) => {
    return new Promise(async (resolve, reject) => {
      try {
        // Check if TeamJoinRequests table exists
        const exists = await tableExists('TeamJoinRequests');
        if (!exists) {
          reject(new Error('TeamJoinRequests table does not exist. Please run database initialization.'));
          return;
        }
        
        const query = `DELETE FROM TeamJoinRequests WHERE id = ?`;
        
        db.run(query, [requestId], function(err) {
          if (err) {
            reject(err);
            return;
          }
          resolve(this.changes);
        });
      } catch (err) {
        reject(err);
      }
    });
  },
  
  // Delete join request
  deleteJoinRequest: (requestId) => {
    return new Promise(async (resolve, reject) => {
      try {
        // Check if TeamJoinRequests table exists
        const exists = await tableExists('TeamJoinRequests');
        if (!exists) {
          reject(new Error('TeamJoinRequests table does not exist. Please run database initialization.'));
          return;
        }
        
        const query = `DELETE FROM TeamJoinRequests WHERE id = ?`;
        
        db.run(query, [requestId], function(err) {
          if (err) {
            reject(err);
            return;
          }
          resolve(this.changes);
        });
      } catch (err) {
        reject(err);
      }
    });
  },
  
  // Update team record
  updateTeamRecord: (teamId, record) => {
    return new Promise(async (resolve, reject) => {
      try {
        // Check if Teams table exists
        const exists = await tableExists('Teams');
        if (!exists) {
          reject(new Error('Teams table does not exist. Please run database initialization.'));
          return;
        }
        
        const query = `UPDATE Teams SET record = ? WHERE id = ?`;
        
        db.run(query, [record, teamId], function(err) {
          if (err) {
            reject(err);
            return;
          }
          resolve(this.changes);
        });
      } catch (err) {
        reject(err);
      }
    });
  },
  
  // Calculate and update team record based on game results
  calculateTeamRecord: (teamId) => {
    return new Promise(async (resolve, reject) => {
      try {
        // First, get team stats
        const stats = await teamOperations.getTeamStats(teamId);
        
        // Format record as "W-L-T"
        const record = `${stats.wins || 0}-${stats.losses || 0}-${stats.ties || 0}`;
        
        // Update team record
        const changes = await teamOperations.updateTeamRecord(teamId, record);
        resolve(changes);
      } catch (err) {
        reject(err);
      }
    });
  }
};

module.exports = {
  db,
  characterOperations,
  userOperations,
  teamOperations,
  // ... other operations
};