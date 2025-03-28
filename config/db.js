// config/db.js
const { getDb } = require('./db/connection');
const characterOperations = require('./db/character-db');
const contactOperations = require('./db/contact-db');
const teamOperations = require('./db/team-db');
const gameOperations = require('./db/game-db');
const messageOperations = require('./db/message-db');
const authDbOperations = require('./db/auth-db');
const { socialOperations } = require('./db/social-db.js')

// Export everything with the same structure
module.exports = {
  getDb,
  get db() { return getDb(); },
  characterOperations,
  contactOperations,
  teamOperations,
  gameOperations,
  messageOperations,
  authDbOperations,
  socialOperations
};