// db.js - Main export file that maintains the existing API
const { db } = require('./db/connection');
const characterOperations = require('./db/character-db');
const contactOperations = require('./db/character-db');
const teamOperations = require('./db/team-db');
const gameOperations = require('./db/game-db');
const messageOperations = require('./db/message-db');

// Export everything with the same structure as before
module.exports = {
  db,
  characterOperations,
  teamOperations,
  gameOperations,
  messageOperations,
  contactOperations
};