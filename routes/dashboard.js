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
router.get('/', isAuthenticated, async (req, res) => {
  const db = req.db || require('../config/database');
  const userId = req.session.user.id;

  try {
    // Fetch counts
    const [[{ characterCount }]] = await db.query('SELECT COUNT(*) AS characterCount FROM characters WHERE created_by = ?', [userId]);
    const [[{ teamCount }]] = await db.query('SELECT COUNT(*) AS teamCount FROM teams WHERE created_by = ?', [userId]);
    const [[{ threadCount }]] = await db.query('SELECT COUNT(*) AS threadCount FROM threads WHERE creator_id = ?', [userId]);
    const [[{ postCount }]] = await db.query('SELECT COUNT(*) AS postCount FROM posts WHERE author_id = ?', [userId]);

    // Fetch recent items
    const [recentCharacters] = await db.query('SELECT id, name, url FROM characters WHERE created_by = ? ORDER BY updated_at DESC LIMIT 5', [userId]);
    const [recentTeams] = await db.query('SELECT id, name FROM teams WHERE created_by = ? ORDER BY updated_at DESC LIMIT 5', [userId]);
    const [recentThreads] = await db.query('SELECT id, title FROM threads WHERE creator_id = ? ORDER BY updated_at DESC LIMIT 5', [userId]);
    const [recentPosts] = await db.query('SELECT id, title FROM posts WHERE author_id = ? ORDER BY created_at DESC LIMIT 5', [userId]);

    res.render('dashboard', {
      title: 'Dashboard | Northern Attitude',
      user: req.session.user,
      stats: {
        characterCount,
        teamCount,
        threadCount,
        postCount
      },
      recent: {
        characters: recentCharacters,
        teams: recentTeams,
        threads: recentThreads,
        posts: recentPosts
      }
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).render('error', {
      title: 'Dashboard Error',
      message: 'Failed to load dashboard data.',
      error: req.app.get('env') === 'development' ? err : {},
      user: req.session.user
    });
  }
});

module.exports = router;