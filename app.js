const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');
const mysql = require('mysql2/promise'); // Using promise-based version
const dotenv = require('dotenv');
dotenv.config();
const expressLayouts = require('express-ejs-layouts');
const { addDbToRequest } = require('./middleware/auth');
// Remove the MySQLStore import until the package is installed
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

// Setup session middleware with in-memory store instead of MySQL
app.use(session({
  secret: process.env.SESSION_SECRET || 'default_secret_change_this',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 86400000, // 24 hours
    httpOnly: true
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

// Authentication middleware
const ensureAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return next();
  }
  res.redirect('/users/login');
};

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
const threadsRouter = require('./routes/threads');
const apiRouter = require('./routes/api'); // This might be undefined - check this
const writingRouter = require('./routes/writing');

// Route registration - fix the order and conflicts
app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/characters', characterRoutes);
app.use('/teams', teamRoutes);
app.use('/dashboard', ensureAuthenticated, dashboardRoutes);
app.use('/profile', profileRoutes);
app.use('/social', socialRoutes);
app.use('/writing', require('./routes/writing'));
// Mount the API routes
if (apiRouter) {
  app.use('/api', apiRouter); // Only use if it exists
}

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.locals.title = err.status === 404 ? 'Page Not Found' : 'Error';

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

module.exports = pool;