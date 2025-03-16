const { dbQuery, dbQueryAll, dbExecute, dbTransaction } = require('./utils');

// SQL queries for game operations
const SQL = {
  getUpcomingGames: `
    SELECT g.*, 
           ht.name as home_team_name, 
           at.name as away_team_name
    FROM Games g
    JOIN Teams ht ON g.home_team_id = ht.id
    JOIN Teams at ON g.away_team_id = at.id
    WHERE g.date > DATETIME('now')
    ORDER BY g.date ASC
    LIMIT ?
  `,
  getGameById: `
    SELECT g.*, 
           ht.name as home_team_name, 
           at.name as away_team_name
    FROM Games g
    JOIN Teams ht ON g.home_team_id = ht.id
    JOIN Teams at ON g.away_team_id = at.id
    WHERE g.id = ?
  `,
  getCharacterGames: `
    SELECT g.*, 
           ht.name as home_team_name, 
           at.name as away_team_name,
           c.team_id as character_team_id,
           gs.goals, gs.assists, gs.plus_minus
    FROM Games g
    JOIN Teams ht ON g.home_team_id = ht.id
    JOIN Teams at ON g.away_team_id = at.id
    LEFT JOIN GameStats gs ON g.id = gs.game_id AND gs.character_id = ?
    JOIN Characters c ON c.id = ?
    WHERE (g.home_team_id = c.team_id OR g.away_team_id = c.team_id)
    ORDER BY g.date DESC
    LIMIT ?
  `,
  getRecentGames: `
    SELECT g.*, 
           ht.name as home_team_name, 
           at.name as away_team_name
    FROM Games g
    JOIN Teams ht ON g.home_team_id = ht.id
    JOIN Teams at ON g.away_team_id = at.id
    WHERE g.date < DATETIME('now')
    ORDER BY g.date DESC
    LIMIT ?
  `,
  createGame: `
    INSERT INTO Games (
      home_team_id, away_team_id, date, location, status,
      home_score, away_score, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `,
  updateGame: `
    UPDATE Games
    SET home_team_id = ?, away_team_id = ?, date = ?, location = ?, status = ?,
        home_score = ?, away_score = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `,
  deleteGame: `
    DELETE FROM Games WHERE id = ?
  `,
  getGameStats: `
    SELECT gs.*, c.name as character_name, c.position, t.name as team_name
    FROM GameStats gs
    JOIN Characters c ON gs.character_id = c.id
    LEFT JOIN Teams t ON c.team_id = t.id
    WHERE gs.game_id = ?
    ORDER BY gs.goals DESC, gs.assists DESC
  `,
  addGameStats: `
    INSERT INTO GameStats (
      game_id, character_id, goals, assists, plus_minus, shots,
      saves, penalty_minutes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `,
  updateGameStats: `
    UPDATE GameStats
    SET goals = ?, assists = ?, plus_minus = ?, shots = ?,
        saves = ?, penalty_minutes = ?, updated_at = CURRENT_TIMESTAMP
    WHERE game_id = ? AND character_id = ?
  `,
  getTeamSchedule: `
    SELECT g.*, 
           ht.name as home_team_name, 
           at.name as away_team_name
    FROM Games g
    JOIN Teams ht ON g.home_team_id = ht.id
    JOIN Teams at ON g.away_team_id = at.id
    WHERE g.home_team_id = ? OR g.away_team_id = ?
    ORDER BY g.date
  `
};

// Game-related database operations
const gameOperations = {
  // Get upcoming games
  getUpcomingGames: (limit = 5) => {
    return dbQueryAll(SQL.getUpcomingGames, [limit]);
  },
  
  // Get a specific game by ID
  getGameById: (gameId) => {
    return dbQuery(SQL.getGameById, [gameId]);
  },
  
  // Get games for a specific character
  getCharacterGames: (characterId, limit = 5) => {
    return dbQueryAll(SQL.getCharacterGames, [characterId, characterId, limit]);
  },
  
  // Get recently completed games
  getRecentGames: (limit = 5) => {
    return dbQueryAll(SQL.getRecentGames, [limit]);
  },
  
  // Create a new game
  createGame: (homeTeamId, awayTeamId, date, location, status = 'scheduled', homeScore = 0, awayScore = 0, notes = null) => {
    return dbExecute(
      SQL.createGame,
      [homeTeamId, awayTeamId, date, location, status, homeScore, awayScore, notes]
    ).then(result => result.lastId);
  },
  
  // Update an existing game
  updateGame: (gameId, homeTeamId, awayTeamId, date, location, status, homeScore, awayScore, notes) => {
    return dbExecute(
      SQL.updateGame,
      [homeTeamId, awayTeamId, date, location, status, homeScore, awayScore, notes, gameId]
    ).then(result => result.changes);
  },
  
  // Delete a game
  deleteGame: (gameId) => {
    return dbExecute(SQL.deleteGame, [gameId])
      .then(result => result.changes);
  },
  
  // Get stats for a specific game
  getGameStats: (gameId) => {
    return dbQueryAll(SQL.getGameStats, [gameId]);
  },
  
  // Add stats for a character in a game
  addGameStats: (gameId, characterId, goals = 0, assists = 0, plusMinus = 0, shots = 0, saves = 0, penaltyMinutes = 0) => {
    return dbExecute(
      SQL.addGameStats,
      [gameId, characterId, goals, assists, plusMinus, shots, saves, penaltyMinutes]
    ).then(result => result.lastId);
  },
  
  // Update stats for a character in a game
  updateGameStats: (gameId, characterId, goals, assists, plusMinus, shots, saves, penaltyMinutes) => {
    return dbExecute(
      SQL.updateGameStats,
      [goals, assists, plusMinus, shots, saves, penaltyMinutes, gameId, characterId]
    ).then(result => result.changes);
  },
  
  // Get a team's schedule
  getTeamSchedule: (teamId) => {
    return dbQueryAll(SQL.getTeamSchedule, [teamId, teamId]);
  }
};

module.exports = gameOperations;