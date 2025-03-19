// connection.js - Fixed with absolute path handling
const sqlite3 = require('mysql2').verbose();
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
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    process.exit(1);
  }
  
  console.log('Successfully connected to database at:', dbPath);
  
  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');
});

module.exports = { db };