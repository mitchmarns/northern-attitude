const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'northern_attitude',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  namedPlaceholders: true,
  rowsAsArray: false
});

// Modify the database wrapper to ensure it returns results correctly
const originalQuery = pool.query.bind(pool);
pool.query = async function(...args) {
  try {
    const result = await originalQuery(...args);
    return Array.isArray(result) ? result : [result, null];
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

// Test database connection and log
pool.getConnection()
  .then(connection => {
    console.log('Database connection successful');
    connection.release();
  })
  .catch(err => {
    console.error('Database connection failed:', err);
  });

module.exports = pool;