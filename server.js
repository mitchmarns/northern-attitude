// server.js - Main Express application
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { db } = require('./db');
const userRoutes = require('./routes/user-routes');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Import route modules
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? 'https://yourproductiondomain.com' : 'http://localhost:3000',
  credentials: true
}));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);
app.use('/api/users', userRoutes);

// Serve index.html for the root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'index.html'));
});

// Handle 404 errors
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', 'html', '404.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle app shutdown
process.on('SIGINT', () => {
  console.log('Server shutting down...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database connection closed');
    }
    process.exit(0);
  });
});

module.exports = app;