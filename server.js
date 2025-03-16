// Updated server.js with proper database initialization checks

const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

// First check if database exists
const dbPath = path.resolve('config/hockey_roleplay.db');
if (!fs.existsSync(dbPath)) {
  // Try parent directory
  dbPath = path.resolve(__dirname, '..', 'hockey_roleplay.db');
  console.log('Trying parent directory:', dbPath, fs.existsSync(dbPath));
}

// Import database operations after confirming database exists
const { characterOperations, db } = require('./config/db');

function tableExists(tableName) {
  return new Promise((resolve, reject) => {
    const query = `SELECT name FROM sqlite_master WHERE type='table' AND name=?`;
    
    db.get(query, [tableName], (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(!!row);
    });
  });
}

// Create Express app
const app = express();

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Middleware to check if the database is properly initialized
app.use(async (req, res, next) => {
  if (req.path.startsWith('/api')) {
    try {
      // Check for essential tables
      const usersExist = await tableExists('Users');
      const charactersExist = await tableExists('Characters');
      const teamsExist = await tableExists('Teams');
      const messagesExist = await tableExists('Messages');
      
      if (!usersExist || !charactersExist || !teamsExist || !messagesExist) {
        console.error('Database tables missing. Please run database-init.js first');
        return res.status(500).json({ 
          message: 'Database not properly initialized. Server admin needs to run initialization.' 
        });
      }
      
      next();
    } catch (err) {
      console.error('Database check error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
  } else {
    next();
  }
});

// Import route handlers
const authRoutes = require('./routes/auth');  
const apiRoutes = require('./routes/api');  
const characterRoutes = require('./routes/character-routes');  
const userRoutes = require('./routes/user-routes');  
const teamRoutes = require('./routes/team-routes'); 
const messageRoutes = require('./routes/message-routes'); 

// Set up routes
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);  
app.use('/api', characterRoutes);  
app.use('/api/users', userRoutes);  
app.use('/api', teamRoutes);  
app.use('/api/messages', messageRoutes);

// Generate placeholder images
app.get('/api/placeholder/:width/:height', (req, res) => {
  const width = parseInt(req.params.width) || 100;
  const height = parseInt(req.params.height) || 100;
  
  // Generate SVG placeholder
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="100%" height="100%" fill="#5a8095" />
      <text x="50%" y="50%" font-family="Arial" font-size="16" text-anchor="middle" fill="#ffffff" dominant-baseline="middle">
        ${width}x${height}
      </text>
    </svg>
  `;
  
  res.set('Content-Type', 'image/svg+xml');
  res.send(svg);
});

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