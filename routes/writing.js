const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');

// Main writing dashboard
router.get('/', ensureAuthenticated, (req, res) => {
  res.render('writing/index', {
    title: 'Writing Dashboard',
    user: req.user
  });
});

// Redirect /writing/threads to the threads router
router.get('/threads', ensureAuthenticated, (req, res) => {
  res.redirect('/writing/threads');
});

module.exports = router;
