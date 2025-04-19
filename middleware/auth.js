/**
 * Authentication middleware for Northern Attitude
 * Handles user authentication checks and redirects
 */

/**
 * Middleware to check if user is authenticated
 * If not authenticated, redirects to login page
 */
exports.isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    // Add user to request object for convenience
    req.user = req.session.user;
    return next();
  }
  
  // Store the requested URL to redirect after login
  req.session.returnTo = req.originalUrl;
  req.flash('error', 'Please log in to access this page');
  res.redirect('/auth/login');
};

/**
 * Middleware to check if user is NOT authenticated
 * Used for login/register pages to redirect logged-in users
 */
exports.isNotAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    return res.redirect('/dashboard');
  }
  next();
};

/**
 * Middleware to check if user is an administrator
 */
exports.isAdmin = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  req.flash('error', 'You do not have permission to access this page');
  res.redirect('/');
};

/**
 * Add database connection to request
 */
exports.addDbToRequest = (db) => {
  return (req, res, next) => {
    req.db = db;
    next();
  };
};
