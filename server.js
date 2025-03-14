// server.js - Main application file

const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const { characterOperations } = require('./config/db');

// Create Express app
const app = express();

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));
// Also serve uploads directory for character avatars
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Import route handlers
const authRoutes = require('./routes/auth');  
const apiRoutes = require('./routes/api');  
const characterRoutes = require('./routes/character-routes');  
const userRoutes = require('./routes/user-routes');  
const teamRoutes = require('./routes/team-routes');  

// Set up routes
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);  
app.use('/api', characterRoutes);  
app.use('/api/users', userRoutes);  
app.use('/api', teamRoutes);  

const uploadsDir = path.join(__dirname, 'public/uploads');
const avatarsDir = path.join(uploadsDir, 'avatars');
const logosDir = path.join(uploadsDir, 'logos');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}
if (!fs.existsSync(logosDir)) {
  fs.mkdirSync(logosDir, { recursive: true });
}

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

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;