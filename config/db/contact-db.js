// config/db/contact-db.js
const { db } = require('./connection');
const { dbQuery, dbQueryAll, dbExecute } = require('./utils');

/**
 * Operations for character contacts
 */
const contactOperations = {
  /**
   * Get all contacts for a character
   * @param {number} characterId - The character ID
   * @returns {Promise<Array>} - The contacts
   */
  getCharacterContacts: async (characterId) => {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          cc.target_character_id,
          cc.custom_name,
          cc.custom_image,
          c.name as original_name,
          c.avatar_url as original_avatar
        FROM CharacterContacts cc
        JOIN Characters c ON cc.target_character_id = c.id
        WHERE cc.owner_character_id = ?
        ORDER BY cc.custom_name, c.name
      `, [characterId], (err, rows) => {
        if (err) {
          console.error('Error getting character contacts:', err);
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  },

  /**
   * Get a specific contact for a character
   * @param {number} characterId - The character ID
   * @param {number} targetId - The target character ID
   * @returns {Promise<Object>} - The contact details
   */
  getCharacterContact: async (characterId, targetId) => {
    return new Promise((resolve, reject) => {
      db.get(`
        SELECT 
          cc.target_character_id,
          cc.custom_name,
          cc.custom_image,
          c.name as original_name,
          c.avatar_url as original_avatar
        FROM CharacterContacts cc
        JOIN Characters c ON cc.target_character_id = c.id
        WHERE cc.owner_character_id = ? AND cc.target_character_id = ?
      `, [characterId, targetId], (err, row) => {
        if (err) {
          console.error('Error getting character contact:', err);
          reject(err);
        } else {
          resolve(row || null);
        }
      });
    });
  },

  /**
   * Set or update a contact for a character
   * @param {number} characterId - The character ID
   * @param {number} targetId - The target character ID
   * @param {string} customName - Custom name for the target
   * @param {string} customImage - Custom image URL for the target
   * @returns {Promise<Object>} - The updated contact
   */
  setCharacterContact: async (characterId, targetId, customName, customImage) => {
    return new Promise((resolve, reject) => {
      // Check if contact already exists
      db.get(
        'SELECT * FROM CharacterContacts WHERE owner_character_id = ? AND target_character_id = ?',
        [characterId, targetId],
        (err, existingContact) => {
          if (err) {
            console.error('Error checking existing contact:', err);
            return reject(err);
          }

          if (existingContact) {
            // Update existing contact
            db.run(
              'UPDATE CharacterContacts SET custom_name = ?, custom_image = ? WHERE owner_character_id = ? AND target_character_id = ?',
              [customName, customImage, characterId, targetId],
              function(err) {
                if (err) {
                  console.error('Error updating contact:', err);
                  return reject(err);
                }
                
                resolve({
                  target_character_id: targetId,
                  custom_name: customName,
                  custom_image: customImage
                });
              }
            );
          } else {
            // Create new contact
            db.run(
              'INSERT INTO CharacterContacts (owner_character_id, target_character_id, custom_name, custom_image) VALUES (?, ?, ?, ?)',
              [characterId, targetId, customName, customImage],
              function(err) {
                if (err) {
                  console.error('Error creating contact:', err);
                  return reject(err);
                }
                
                resolve({
                  target_character_id: targetId,
                  custom_name: customName,
                  custom_image: customImage
                });
              }
            );
          }
        }
      );
    });
  },

  /**
   * Delete a contact for a character
   * @param {number} characterId - The character ID
   * @param {number} targetId - The target character ID
   * @returns {Promise<boolean>} - Success status
   */
  deleteCharacterContact: async (characterId, targetId) => {
    return new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM CharacterContacts WHERE owner_character_id = ? AND target_character_id = ?',
        [characterId, targetId],
        function(err) {
          if (err) {
            console.error('Error deleting contact:', err);
            return reject(err);
          }
          
          resolve(true);
        }
      );
    });
  }
};

// Export contactOperations directly
module.exports = contactOperations;