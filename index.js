// index.js - Express setup with correct path to database module
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { db, userOperations, characterOperations } = require('./db/db.js'); // Updated path to db.js

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Test database connection endpoint
app.get('/test-db', async (req, res) => {
  try {
    // Try to create a test user
    const testUser = {
      username: 'testuser',
      passwordHash: 'dummyhash',
      email: 'test@example.com'
    };
    
    // First check if the user already exists
    const existingUser = await userOperations.getUserByUsername(testUser.username);
    
    if (existingUser) {
      return res.json({
        success: true,
        message: 'Database connection successful! Test user already exists.',
        user: {
          id: existingUser.id,
          username: existingUser.username,
          email: existingUser.email
        }
      });
    }
    
    // If not, create the test user
    const userId = await userOperations.createUser(
      testUser.username,
      testUser.passwordHash,
      testUser.email
    );
    
    res.json({
      success: true,
      message: 'Database connection successful! Created test user.',
      userId: userId
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// Login route
app.post('/login', async (req, res) => {
  try {
    const user = await userOperations.getUserByUsername(req.body.username);
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid username or password' 
      });
    }
    
    // In a real app, you would verify the password hash here
    // For this example, we're just checking if the user exists
    
    // Update last login time
    await userOperations.updateLastLogin(user.id);
    
    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Database error', 
      error: error.message 
    });
  }
});

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'dash.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Database connection test: http://localhost:${PORT}/test-db`);
});

// Handle process termination to close database properly
process.on('SIGINT', () => {
  console.log('Closing database connection...');
  db.close(() => {
    console.log('Database connection closed');
    process.exit(0);
  });
});