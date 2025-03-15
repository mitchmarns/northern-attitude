const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Check if database file exists
const dbPath = path.resolve(__dirname, '../hockey_roleplay.db');
const dbExists = fs.existsSync(dbPath);

// If database doesn't exist, show error and exit
if (!dbExists) {
  console.error('Database file not found! Please run the database-init.js script first.');
  console.error('Command: node database-init.js');
  process.exit(1);
}

// Create a database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    process.exit(1);
  }
  
  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');
});

module.exports = { db };