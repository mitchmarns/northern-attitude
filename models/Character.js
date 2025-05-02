const db = require('../config/database');

class Character {
  // Get all characters by user ID
  static async getByUserId(userId) {
    try {
      console.log(`Fetching characters for user ID: ${userId}`);
      
      if (!userId) {
        console.warn('No user ID provided to getByUserId');
        return [];
      }
      
      const [rows] = await db.query(
        'SELECT * FROM characters WHERE created_by = ?',
        [userId]
      );
      
      console.log(`Found ${rows.length} characters for user ID ${userId}`);
      return rows;
    } catch (error) {
      console.error('Error in Character.getByUserId:', error);
      throw error;
    }
  }
  
  // Get a single character by ID
  static async getById(id) {
    try {
      console.log(`Fetching character with ID: ${id}`);
      
      if (!id) {
        console.warn('No character ID provided to getById');
        return null;
      }
      
      const [rows] = await db.query(
        'SELECT * FROM characters WHERE id = ?',
        [id]
      );
      
      console.log(`Character lookup result: ${rows.length ? 'Found' : 'Not found'}`);
      return rows.length ? rows[0] : null;
    } catch (error) {
      console.error('Error in Character.getById:', error);
      throw error;
    }
  }
  
  // Check if a character belongs to a user
  static async belongsToUser(characterId, userId) {
    try {
      console.log(`Checking if character ${characterId} belongs to user ${userId}`);
      
      if (!characterId || !userId) {
        console.warn('Missing characterId or userId in belongsToUser check');
        return false;
      }
      
      const [rows] = await db.query(
        'SELECT 1 FROM characters WHERE id = ? AND created_by = ?',
        [characterId, userId]
      );
      
      const belongs = rows.length > 0;
      console.log(`Character ${characterId} ${belongs ? 'belongs' : 'does not belong'} to user ${userId}`);
      return belongs;
    } catch (error) {
      console.error('Error checking character ownership:', error);
      return false;
    }
  }
}

module.exports = Character;
