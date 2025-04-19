/**
 * Middleware to validate Content-Type for API routes
 */

const validateContentType = (req, res, next) => {
  const contentType = req.headers['content-type'];
  
  // Only validate POST, PUT, PATCH methods with a body
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
    if (!contentType || !contentType.includes('application/json')) {
      return res.status(415).json({ 
        error: 'Unsupported Media Type. Content-Type must be application/json'
      });
    }
  }
  
  next();
};

module.exports = {
  validateContentType
};
