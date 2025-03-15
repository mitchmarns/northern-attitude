const { dbQuery, dbQueryAll, dbExecute, dbTransaction } = require('./utils');

// SQL queries specific to teams
const SQL = {
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
  // Other team-specific queries...
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
  }
};

module.exports = teamOperations;