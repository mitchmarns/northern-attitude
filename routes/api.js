const express = require('express');
const router = express.Router();

// Temporary middleware to replace ensureAuthenticated
const tempAuth = (req, res, next) => {
  console.log('Auth middleware called in API routes');
  // Add a dummy user for testing
  req.user = { id: 1, username: 'testuser' };
  next();
};

// Define API routes with direct function handlers

// Root API endpoint
router.get('/', (req, res) => {
  console.log('API root route called');
  res.json({ message: 'Welcome to the API' });
});

// Authentication endpoints
router.post('/auth/login', (req, res) => {
  console.log('Login API route called');
  res.json({ message: 'Login endpoint' });
});

router.post('/auth/register', (req, res) => {
  console.log('Register API route called');
  res.json({ message: 'Register endpoint' });
});

router.post('/auth/logout', (req, res) => {
  console.log('Logout API route called');
  res.json({ message: 'Logout endpoint' });
});

// User endpoints
router.get('/users/me', tempAuth, (req, res) => {
  console.log('Current user API route called');
  res.json({ user: req.user });
});

router.get('/users/:id', tempAuth, (req, res) => {
  console.log(`Get user ${req.params.id} API route called`);
  res.json({ message: `User ${req.params.id} details` });
});

// Thread API endpoints
router.get('/threads', tempAuth, (req, res) => {
  console.log('Get threads API route called');
  res.json({ threads: [] });
});

router.post('/threads', tempAuth, (req, res) => {
  console.log('Create thread API route called');
  res.json({ message: 'Thread created' });
});

router.get('/threads/:id', tempAuth, (req, res) => {
  console.log(`Get thread ${req.params.id} API route called`);
  res.json({ message: `Thread ${req.params.id} details` });
});

// Fallback for any other API routes
router.all('*', (req, res) => {
  console.log(`Unknown API route called: ${req.method} ${req.path}`);
  res.status(404).json({ error: 'API endpoint not found' });
});

module.exports = router;
