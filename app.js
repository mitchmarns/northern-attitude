const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');
const mysql = require('mysql2/promise'); // Using promise-based version
const dotenv = require('dotenv');
const expressLayouts = require('express-ejs-layouts');
const { addDbToRequest } = require('./middleware/auth');
dotenv.config();
const port = 3000;

// Create express app
const app = express();

// Database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'northern_attitude',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  namedPlaceholders: true, // Added for better query handling
  rowsAsArray: false // Ensure rows are returned as objects
});

// Modify the database wrapper to ensure it returns results correctly
const originalQuery = pool.query.bind(pool);
pool.query = async function(...args) {
  const result = await originalQuery(...args);
  return Array.isArray(result) ? result : [result, null];
};

// Test database connection
async function testDbConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('Connected to the database.');
    connection.release();
    return true;
  } catch (err) {
    console.error('Database connection failed:', err);
    return false;
  }
}

testDbConnection();

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 1000 * 60 * 60 * 24 // 1 day
  }
}));

// Flash middleware
app.use(flash());

// Add database connection to all requests
app.use(addDbToRequest(pool));

// Middleware to make flash messages and user available to templates
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  next();
});

// Body parser middleware - update these configurations
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    // Store the raw body buffer for potential webhook verification
    req.rawBody = buf;
  }
}));

app.use(express.urlencoded({ 
  extended: true,
  limit: '10mb'
}));

// Add error handling for JSON parsing errors
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('JSON parsing error:', err.message);
    return res.status(400).send({ error: 'Invalid JSON in request body' });
  }
  next(err);
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(expressLayouts);

// Set EJS as the template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layout');

// Routes
const indexRoutes = require('./routes/index');
const characterRoutes = require('./routes/characters');
const teamRoutes = require('./routes/teams');
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const profileRoutes = require('./routes/profile');
const socialRoutes = require('./routes/social');

app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/characters', characterRoutes);
app.use('/teams', teamRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/profile', profileRoutes);
app.use('/social', socialRoutes);

// Error handling
app.use((req, res, next) => {
  res.status(404).render('error', { 
    title: '404 - Page Not Found',
    message: 'The page you requested could not be found.'
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { 
    title: '500 - Server Error',
    message: 'Something went wrong on our side.'
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

module.exports = pool;