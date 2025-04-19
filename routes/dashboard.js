const express = require('express');
const router = express.Router();

// Middleware to check if user is logged in
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return next();
  }
  res.redirect('/auth/login');
};

// Dashboard route
router.get('/', isAuthenticated, (req, res) => {
  res.render('dashboard', {
    title: 'Dashboard | Northern Attitude',
    user: req.session.user
  });
});

module.exports = router;