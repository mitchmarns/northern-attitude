const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  // If you add DB queries here, use EXPLAIN and consider indexes for profiling
  res.render('index', { title: 'Welcome to Northern Attitude' });
});

module.exports = router;