const express = require('express');
const router = express.Router();
const CharactersController = require('../controllers/charactersController');

// Middleware to check if user is logged in
const isAuthenticated = (req, res, next) => {
  if (req.session.user) return next();
  res.redirect('/auth/login');
};

// List all characters
router.get('/', isAuthenticated, CharactersController.listAll);

// Create character form
router.get('/create', isAuthenticated, CharactersController.showCreateForm);

// Handle character creation
router.post('/create', isAuthenticated, CharactersController.create);

// View character profile
router.get('/:id', isAuthenticated, CharactersController.viewProfile);

// Edit character form
router.get('/:id/edit', isAuthenticated, CharactersController.showEditForm);

// Handle character update
router.post('/:id/edit', isAuthenticated, CharactersController.update);

// API endpoint to get character details for selection
router.get('/api/:id', isAuthenticated, CharactersController.apiGetCharacter);

// Set active character
router.post('/set-active/:id', isAuthenticated, CharactersController.setActive);

// Handle media updates (banner, sidebar, spotify)
router.post('/:id/update-media', isAuthenticated, CharactersController.updateMedia);

module.exports = router;