const express = require('express');
const router = express.Router();
const TeamsController = require('../controllers/teamsController');

// Middleware to check if user is logged in
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return next();
  }
  res.redirect('/auth/login');
};

// List all teams
router.get('/', isAuthenticated, TeamsController.listAll);

// Create team form
router.get('/create', isAuthenticated, TeamsController.showCreateForm);

// Handle team creation
router.post('/create', isAuthenticated, TeamsController.create);

// View team profile
router.get('/:id', isAuthenticated, TeamsController.viewProfile);

// Edit team form
router.get('/:id/edit', isAuthenticated, TeamsController.showEditForm);

// Handle team update
router.post('/:id/edit', isAuthenticated, TeamsController.update);

module.exports = router;