// Modified connection.js with lazy loading
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Use a variable to hold the database connection
let db = null;

// Function to get the database connection - will initialize if needed
function getDb() {
  if (!db) {
    // Determine database path
    const dbPath = path.resolve(__dirname, '../hockey_roleplay.db');
    console.log('Looking for DB at:', dbPath);
    
    // Check if database file exists
    const dbExists = fs.existsSync(dbPath);
    if (!dbExists) {
      console.error('Database file not found at:', dbPath);
      console.error('Please run the database-init.js script first.');
      console.error('Command: node database-init.js');
      throw new Error('Database file not found');
    }

    // Create a database connection
    try {
      db = new sqlite3.Database(dbPath);
      console.log('Successfully connected to database at:', dbPath);
      
      // Enable foreign keys
      db.run('PRAGMA foreign_keys = ON');
    } catch (err) {
      console.error('Error connecting to database:', err);
      throw err;
    }
  }
  
  return db;
}

// Export both the getDb function and a proxy for backward compatibility
module.exports = { 
  getDb,
  // This creates a proxy that calls getDb() whenever db is accessed
  get db() { return getDb(); }
};