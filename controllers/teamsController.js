const db = require('../config/database');

const TeamsController = {
  // List all teams
  listAll: async (req, res) => {
    try {
      // Profile query with EXPLAIN
      await db.query('EXPLAIN SELECT * FROM teams ORDER BY name ASC');
      // Consider: CREATE INDEX idx_teams_name ON teams(name);
      const [teams] = await db.query('SELECT * FROM teams ORDER BY name ASC');
      res.render('teams/teams', { title: 'All Teams', teams });
    } catch (err) {
      console.error('Error listing teams:', err);
      res.status(500).send('Server Error');
    }
  },

  // Show create team form
  showCreateForm: async (req, res) => {
    res.render('teams/create', { title: 'Create New Team' });
  },

  // Handle team creation
  create: async (req, res) => {
    try {
      const { name, description, city, mascot, logo_url, primary_color, secondary_color, accent_color } = req.body;
      const createdBy = req.session.user.id;
      await db.query(
        'INSERT INTO teams (name, description, city, mascot, logo_url, primary_color, secondary_color, accent_color, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [name, description, city, mascot, logo_url, primary_color, secondary_color, accent_color, createdBy]
      );
      res.redirect('/teams');
    } catch (err) {
      console.error('Error creating team:', err);
      res.status(500).send('Server Error');
    }
  },

  // View team profile
  viewProfile: async (req, res) => {
    try {
      const teamId = req.params.id;
      const [results] = await db.query('SELECT * FROM teams WHERE id = ?', [teamId]);
      if (!results.length) return res.status(404).send('Team not found');
      res.render('teams/profile', { title: 'Team Profile', team: results[0] });
    } catch (err) {
      console.error('Error viewing team:', err);
      res.status(500).send('Server Error');
    }
  },

  // Show edit team form
  showEditForm: async (req, res) => {
    try {
      const teamId = req.params.id;
      const [results] = await db.query('SELECT * FROM teams WHERE id = ?', [teamId]);
      if (!results.length) return res.status(404).send('Team not found');
      res.render('teams/edit', { title: 'Edit Team', team: results[0] });
    } catch (err) {
      console.error('Error loading edit team form:', err);
      res.status(500).send('Server Error');
    }
  },

  // Handle team update
  update: async (req, res) => {
    try {
      const teamId = req.params.id;
      const { name, description, city, mascot, logo_url, primary_color, secondary_color, accent_color } = req.body;
      await db.query(
        'UPDATE teams SET name = ?, description = ?, city = ?, mascot = ?, logo_url = ?, primary_color = ?, secondary_color = ?, accent_color = ? WHERE id = ?',
        [name, description, city, mascot, logo_url, primary_color, secondary_color, accent_color, teamId]
      );
      res.redirect(`/teams/${teamId}`);
    } catch (err) {
      console.error('Error updating team:', err);
      res.status(500).send('Server Error');
    }
  }
};

module.exports = TeamsController;
