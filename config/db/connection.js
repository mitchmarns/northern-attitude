// connection.js - Fixed with absolute path handling
const mysql = require('mysql2');
const path = require('path');
const fs = require('fs');

// Use a consistent database path with __dirname for absolute path
const dbPath = path.resolve(__dirname, '../hockey_roleplay.db');
console.log('Database connection looking for DB at:', dbPath);

// Check if database file exists
const dbExists = fs.existsSync(dbPath);

// If database doesn't exist, show error and exit
if (!dbExists) {
  console.error('Database file not found at:', dbPath);
  console.error('Please run the database-init.js script first.');
  console.error('Command: node database-init.js');
  process.exit(1);
}

// Create a database connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'username_hockey_app_user',  // Your created username
  password: 'your_strong_password',  // Your created password
  database: 'username_hockey_roleplay'  // Your created database name
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err);
    return;
  }
  console.log('Connected to MySQL database');
});

module.exports = { db };