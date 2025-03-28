// Updated team-routes.js for image URLs
const express = require('express');
const router = express.Router();
const { db } = require('../config/db');
const { teamOperations, characterOperations } = require('../config/db');
const { authMiddleware } = require('../public/js/auth');

// Get all teams - This is the endpoint that's returning 404
router.get('/', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const teams = await teamOperations.getAllTeams();
    res.status(200).json(teams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all teams
router.get('/teams', async (req, res) => {
  try {
    const teams = await teamOperations.getAllTeams();
    res.status(200).json(teams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ message: 'Failed to fetch teams' });
  }
});

// Get a specific team by ID
router.get('/teams/:id', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const teamId = req.params.id;
    
    // Fetch team details directly from database
    const team = await new Promise((resolve, reject) => {
      db.get(`
        SELECT id, name, logo_url, description, record, 
               primary_color, secondary_color, tertiary_color
        FROM Teams 
        WHERE id = ?
      `, [teamId], (err, row) => {
        if (err) reject(err);
        else resolve(row); // Just resolve with the row, even if it's null
      });
    });
    
    // Check if team exists
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    
    // Initialize these with default values in case queries fail
    let owner = null;
    let staff = [];
    let stats = {};
    
    try {
      // Get team owner
      owner = await new Promise((resolve, reject) => {
        db.get(`
          SELECT u.id, u.username 
          FROM Users u
          JOIN Teams t ON u.id = t.owner_id
          WHERE t.id = ?
        `, [teamId], (err, row) => {
          if (err) reject(err);
          else resolve(row || null);
        });
      });
    } catch (ownerError) {
      console.error('Error fetching team owner:', ownerError);
      // Continue with owner as null
    }
    
    try {
      // Get team staff
      staff = await new Promise((resolve, reject) => {
        db.all(`
          SELECT u.id, u.username, ts.role
          FROM TeamStaff ts
          JOIN Users u ON ts.user_id = u.id
          WHERE ts.team_id = ?
        `, [teamId], (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      });
    } catch (staffError) {
      console.error('Error fetching team staff:', staffError);
      // Continue with staff as empty array
    }
    
    try {
      // Get team stats
      stats = await new Promise((resolve, reject) => {
        db.get(`
          SELECT 
            games_played, 
            wins, 
            losses, 
            ties, 
            goals_for, 
            goals_against
          FROM TeamsStats 
          WHERE team_id = ?
        `, [teamId], (err, row) => {
          if (err) reject(err);
          else resolve(row || {});
        });
      });
    } catch (statsError) {
      console.error('Error fetching team stats:', statsError);
      // Continue with stats as empty object
    }
    
    // Construct full team object
    const fullTeam = {
      ...team,
      owner: owner ? {
        id: owner.id,
        username: owner.username
      } : null,
      staff: staff,
      stats: stats || {}
    };
    
    res.status(200).json(fullTeam);
  } catch (error) {
    console.error('Error fetching team:', error);
    res.status(500).json({ 
      message: 'Failed to fetch team', 
      error: error.toString() 
    });
  }
});

// Get team roster
router.get('/teams/:id/roster', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const teamId = req.params.id;
    const roster = await teamOperations.getTeamRoster(teamId);
    
    res.status(200).json(roster);
  } catch (error) {
    console.error('Error fetching team roster:', error);
    res.status(500).json({ message: 'Failed to fetch team roster' });
  }
});

// Get team staff
router.get('/teams/:id/staff', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const teamId = req.params.id;
    const staff = await teamOperations.getTeamStaff(teamId);
    
    res.status(200).json(staff);
  } catch (error) {
    console.error('Error fetching team staff:', error);
    res.status(500).json({ message: 'Failed to fetch team staff' });
  }
});

// Check if user has permission to manage team
router.get('/teams/:id/permissions', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const teamId = req.params.id;
    const userId = req.user.id;
    
    // Check if user is owner or staff
    const isOwner = await teamOperations.isTeamOwner(userId, teamId);
    const isStaff = await teamOperations.isTeamStaff(userId, teamId);
    
    res.status(200).json({
      canEditTeam: isOwner || isStaff,
      canManageTeam: isOwner || isStaff,
      canDeleteTeam: isOwner,
      isOwner,
      isStaff
    });
  } catch (error) {
    console.error('Error checking team permissions:', error);
    res.status(500).json({ message: 'Failed to check team permissions' });
  }
});

// Check user's team status (if they're on the team)
router.get('/user/team-status/:id', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const teamId = req.params.id;
    const userId = req.user.id;
    
    // Check if user has a character on the team
    const isOnTeam = await teamOperations.isUserOnTeam(userId, teamId);
    
    // Check if user is owner or staff
    const isOwner = await teamOperations.isTeamOwner(userId, teamId);
    const isStaff = await teamOperations.isTeamStaff(userId, teamId);
    
    res.status(200).json({
      isOnTeam,
      isOwner,
      isStaff
    });
  } catch (error) {
    console.error('Error checking team status:', error);
    res.status(500).json({ message: 'Failed to check team status' });
  }
});

// Check if user can create teams
router.get('/user/permissions', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // For now, let's say all authenticated users can create teams
    // In a more complex app, you might check roles or other restrictions
    const canCreateTeam = true;
    
    res.status(200).json({
      canCreateTeam
    });
  } catch (error) {
    console.error('Error checking user permissions:', error);
    res.status(500).json({ message: 'Failed to check user permissions' });
  }
});

// Get team invitations for the current user
router.get('/user/team-invitations', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    // Get the user's characters
    const characters = await new Promise((resolve, reject) => {
      db.all(`
        SELECT id, name 
        FROM Characters 
        WHERE user_id = ?
      `, [req.user.id], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    
    // Find pending join requests for these characters
    const invitations = [];
    
    for (const character of characters) {
      const teamRequests = await new Promise((resolve, reject) => {
        db.all(`
          SELECT tr.id, tr.team_id, t.name as team_name
          FROM TeamJoinRequests tr
          JOIN Teams t ON tr.team_id = t.id
          WHERE tr.is_invitation = 1 
          AND tr.user_id = (
            SELECT user_id FROM Characters 
            WHERE id = ?
          )
        `, [character.id], (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      });
      
      // Add team details to each invitation
      invitations.push(...teamRequests.map(request => ({
        id: request.id,
        team_name: request.team_name,
        team_id: request.team_id,
        character_id: character.id,
        character_name: character.name
      })));
    }
    
    res.status(200).json({ invitations });
  } catch (error) {
    console.error('Error fetching team invitations:', error);
    res.status(500).json({ message: 'Failed to fetch team invitations', error: error.toString() });
  }
});

// Create a new team
router.post('/teams', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const { name, description, logo_url, primary_color, secondary_color } = req.body;
    
    // Validate required fields
    if (!name) {
      return res.status(400).json({ message: 'Team name is required' });
    }
    
    // Check if team name already exists
    const teamExists = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM Teams WHERE name = ?', [name], (err, row) => {
        if (err) reject(err);
        resolve(row ? true : false);
      });
    });
    
    if (teamExists) {
      return res.status(400).json({ message: 'Team name already taken' });
    }
    
    // Create team with user as owner
    const teamId = await teamOperations.createTeam(
      name,
      req.user.id,
      description,
      logo_url,
      primary_color,
      secondary_color
    );
    
    res.status(201).json({
      message: 'Team created successfully',
      id: teamId
    });
  } catch (error) {
    console.error('Error creating team:', error);
    res.status(500).json({ message: 'Failed to create team' });
  }
});

// Update a team
router.put('/teams/:id', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const teamId = req.params.id;
    const userId = req.user.id;
    
    // Check if user has permission to edit team
    const isOwner = await teamOperations.isTeamOwner(userId, teamId);
    const isStaff = await teamOperations.isTeamStaff(userId, teamId);
    
    if (!isOwner && !isStaff) {
      return res.status(403).json({ message: 'You do not have permission to update this team' });
    }
    
    const { name, description, logo_url, primary_color, secondary_color } = req.body;
    
    // Validate required fields
    if (!name) {
      return res.status(400).json({ message: 'Team name is required' });
    }
    
    // Check if new team name already exists (if changed)
    if (name) {
      const teamExists = await new Promise((resolve, reject) => {
        db.get('SELECT id FROM Teams WHERE name = ? AND id != ?', [name, teamId], (err, row) => {
          if (err) reject(err);
          resolve(row ? true : false);
        });
      });
      
      if (teamExists) {
        return res.status(400).json({ message: 'Team name already taken' });
      }
    }
    
    // Update team
    const updateData = {
      name,
      description,
      primary_color,
      secondary_color
    };
    
    // Only update logo if provided
    if (logo_url) {
      updateData.logo_url = logo_url;
    }
    
    await teamOperations.updateTeam(teamId, updateData);
    
    res.status(200).json({ message: 'Team updated successfully' });
  } catch (error) {
    console.error('Error updating team:', error);
    res.status(500).json({ message: 'Failed to update team' });
  }
});

// Delete a team
router.delete('/teams/:id', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const teamId = req.params.id;
    const userId = req.user.id;
    
    // Check if user is the team owner
    const isOwner = await teamOperations.isTeamOwner(userId, teamId);
    
    if (!isOwner) {
      return res.status(403).json({ message: 'Only the team owner can delete the team' });
    }
    
    // Delete team
    await teamOperations.deleteTeam(teamId);
    
    res.status(200).json({ message: 'Team deleted successfully' });
  } catch (error) {
    console.error('Error deleting team:', error);
    res.status(500).json({ message: 'Failed to delete team' });
  }
});

// Join a team
router.post('/teams/:id/join', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const teamId = req.params.id;
    const userId = req.user.id;
    
    // Check if user has an active character
    const userCharacters = await characterOperations.getUserCharacters(userId);
    const activeCharacter = userCharacters.find(char => char.is_active);
    
    if (!activeCharacter) {
      return res.status(400).json({ message: 'You need an active character to join a team' });
    }
    
    // Check if character is already on a team
    if (activeCharacter.team_id) {
      return res.status(400).json({ message: 'Your active character is already on a team' });
    }
    
    // Add character to team
    await characterOperations.updateCharacter(activeCharacter.id, { team_id: teamId });
    
    res.status(200).json({ message: 'Successfully joined team' });
  } catch (error) {
    console.error('Error joining team:', error);
    res.status(500).json({ message: 'Failed to join team' });
  }
});

// Leave a team
router.post('/teams/:id/leave', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const teamId = req.params.id;
    const userId = req.user.id;
    
    // Get user's characters on this team
    const userCharacters = await characterOperations.getUserCharacters(userId);
    const teamCharacters = userCharacters.filter(char => char.team_id == teamId);
    
    if (teamCharacters.length === 0) {
      return res.status(400).json({ message: 'You do not have any characters on this team' });
    }
    
    // Remove all user's characters from team
    for (const character of teamCharacters) {
      await characterOperations.updateCharacter(character.id, { team_id: null });
    }
    
    res.status(200).json({ message: 'Successfully left team' });
  } catch (error) {
    console.error('Error leaving team:', error);
    res.status(500).json({ message: 'Failed to leave team' });
  }
});

// Add staff member to team
router.post('/teams/:id/staff', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const teamId = req.params.id;
    const userId = req.user.id;
    const { username, role } = req.body;
    
    // Check if user has permission to add staff
    const isOwner = await teamOperations.isTeamOwner(userId, teamId);
    
    if (!isOwner) {
      return res.status(403).json({ message: 'Only the team owner can add staff members' });
    }
    
    // Find user ID by username
    const staffUser = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM Users WHERE username = ?', [username], (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });
    
    if (!staffUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if user is already staff
    const isAlreadyStaff = await teamOperations.isTeamStaff(staffUser.id, teamId);
    
    if (isAlreadyStaff) {
      return res.status(400).json({ message: 'User is already a staff member' });
    }
    
    // Add staff member
    await teamOperations.addTeamStaff(teamId, staffUser.id, role);
    
    res.status(200).json({ message: 'Staff member added successfully' });
  } catch (error) {
    console.error('Error adding staff member:', error);
    res.status(500).json({ message: 'Failed to add staff member' });
  }
});

// Remove staff member from team
router.delete('/teams/:teamId/staff/:staffId', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const teamId = req.params.teamId;
    const staffId = req.params.staffId;
    const userId = req.user.id;
    
    // Check if user has permission to remove staff
    const isOwner = await teamOperations.isTeamOwner(userId, teamId);
    
    if (!isOwner) {
      return res.status(403).json({ message: 'Only the team owner can remove staff members' });
    }
    
    // Remove staff member
    await teamOperations.removeTeamStaff(teamId, staffId);
    
    res.status(200).json({ message: 'Staff member removed successfully' });
  } catch (error) {
    console.error('Error removing staff member:', error);
    res.status(500).json({ message: 'Failed to remove staff member' });
  }
});

// Remove player from team
router.delete('/teams/:teamId/players/:characterId', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const teamId = req.params.teamId;
    const characterId = req.params.characterId;
    const userId = req.user.id;
    
    // Check if user has permission to remove players
    const isOwner = await teamOperations.isTeamOwner(userId, teamId);
    const isStaff = await teamOperations.isTeamStaff(userId, teamId);
    
    if (!isOwner && !isStaff) {
      return res.status(403).json({ message: 'You do not have permission to remove players' });
    }
    
    // Check if character is on the team
    const character = await characterOperations.getCharacterById(characterId);
    
    if (!character || character.team_id != teamId) {
      return res.status(400).json({ message: 'Character is not on this team' });
    }
    
    // Remove character from team
    await characterOperations.updateCharacter(characterId, { team_id: null });
    
    res.status(200).json({ message: 'Player removed successfully' });
  } catch (error) {
    console.error('Error removing player:', error);
    res.status(500).json({ message: 'Failed to remove player' });
  }
});

// Get join requests for a team
router.get('/teams/:id/join-requests', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const teamId = req.params.id;
    const userId = req.user.id;
    
    // Check if user has permission to view join requests
    const isOwner = await teamOperations.isTeamOwner(userId, teamId);
    const isStaff = await teamOperations.isTeamStaff(userId, teamId);
    
    if (!isOwner && !isStaff) {
      return res.status(403).json({ message: 'You do not have permission to view join requests' });
    }
    
    // Get join requests
    const joinRequests = await teamOperations.getTeamJoinRequests(teamId);
    
    res.status(200).json(joinRequests);
  } catch (error) {
    console.error('Error fetching join requests:', error);
    res.status(500).json({ message: 'Failed to fetch join requests' });
  }
});

// Send team invitation
router.post('/teams/:id/invite', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const teamId = req.params.id;
    const userId = req.user.id;
    const { username } = req.body;
    
    // Check if user has permission to send invites
    const isOwner = await teamOperations.isTeamOwner(userId, teamId);
    const isStaff = await teamOperations.isTeamStaff(userId, teamId);
    
    if (!isOwner && !isStaff) {
      return res.status(403).json({ message: 'You do not have permission to send invites' });
    }
    
    // Find user ID by username
    const invitedUser = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM Users WHERE username = ?', [username], (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });
    
    if (!invitedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Create join request (invitation)
    await teamOperations.createJoinRequest(teamId, invitedUser.id, true); // true = is invitation
    
    res.status(200).json({ message: 'Invitation sent successfully' });
  } catch (error) {
    console.error('Error sending invitation:', error);
    res.status(500).json({ message: 'Failed to send invitation' });
  }
});

// Approve join request
router.post('/teams/join-requests/:requestId/approve', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const requestId = req.params.requestId;
    const userId = req.user.id;
    
    // Get join request
    const joinRequest = await teamOperations.getJoinRequestById(requestId);
    
    if (!joinRequest) {
      return res.status(404).json({ message: 'Join request not found' });
    }
    
    // Check if user has permission to approve requests
    const isOwner = await teamOperations.isTeamOwner(userId, joinRequest.team_id);
    const isStaff = await teamOperations.isTeamStaff(userId, joinRequest.team_id);
    
    if (!isOwner && !isStaff && joinRequest.user_id !== userId) {
      return res.status(403).json({ message: 'You do not have permission to approve join requests' });
    }
    
    // Approve join request
    await teamOperations.approveJoinRequest(requestId);
    
    // Get user's active character
    const userCharacters = await characterOperations.getUserCharacters(joinRequest.user_id);
    const activeCharacter = userCharacters.find(char => char.is_active);
    
    if (activeCharacter) {
      // Add character to team
      await characterOperations.updateCharacter(activeCharacter.id, { team_id: joinRequest.team_id });
    }
    
    res.status(200).json({ message: 'Join request approved successfully' });
  } catch (error) {
    console.error('Error approving join request:', error);
    res.status(500).json({ message: 'Failed to approve join request' });
  }
});

// Reject join request
router.post('/teams/join-requests/:requestId/reject', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const requestId = req.params.requestId;
    const userId = req.user.id;
    
    // Get join request
    const joinRequest = await teamOperations.getJoinRequestById(requestId);
    
    if (!joinRequest) {
      return res.status(404).json({ message: 'Join request not found' });
    }
    
    // Check if user has permission to reject requests
    const isOwner = await teamOperations.isTeamOwner(userId, joinRequest.team_id);
    const isStaff = await teamOperations.isTeamStaff(userId, joinRequest.team_id);
    
    if (!isOwner && !isStaff && joinRequest.user_id !== userId) {
      return res.status(403).json({ message: 'You do not have permission to reject join requests' });
    }
    
    // Reject join request
    await teamOperations.deleteJoinRequest(requestId);
    
    res.status(200).json({ message: 'Join request rejected successfully' });
  } catch (error) {
    console.error('Error rejecting join request:', error);
    res.status(500).json({ message: 'Failed to reject join request' });
  }
});

module.exports = router;