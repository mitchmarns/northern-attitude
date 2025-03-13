// server.js - Main application file

const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const { characterOperations } = require('./db');

// Create Express app
const app = express();

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Import route handlers
const authRoutes = require('./routes/auth-routes');
// If you have other routes, import them here
// const apiRoutes = require('./routes/api-routes');
// const characterRoutes = require('./routes/character-routes');

// Set up routes
app.use('/api/auth', authRoutes);
// If you have other routes, set them up here
// app.use('/api', apiRoutes);
// app.use('/api', characterRoutes);

// Add new columns to Characters table if needed
characterOperations.addCharacterColumns()
  .then(() => console.log('Character table updated with new columns if needed'))
  .catch(err => console.error('Error updating Character table:', err));

// Handle 404 errors
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    // For API routes, return JSON error
    return res.status(404).json({ message: 'API endpoint not found' });
  }
  
  // For non-API routes, serve the 404 page
  res.status(404).sendFile(path.join(__dirname, 'public/html/404.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  
  if (req.path.startsWith('/api')) {
    // For API routes, return JSON error
    return res.status(500).json({ message: 'Internal server error' });
  }
  
  // For non-API routes, send generic error message
  res.status(500).send('Server error occurred. Please try again later.');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;