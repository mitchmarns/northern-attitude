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
      // Map all rows to camelCase
      return rows.map(Character.mapCharacterForForm);
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
      // Map to camelCase if found
      return rows.length ? Character.mapCharacterForForm(rows[0]) : null;
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
  
  // Add a static mapping function for camelCase
  static mapCharacterForForm(characterFromDb) {
    return {
      id: characterFromDb.id,
      name: characterFromDb.name,
      nickname: characterFromDb.nickname,
      age: characterFromDb.age,
      gender: characterFromDb.gender,
      role: characterFromDb.role,
      teamId: characterFromDb.team_id,
      position: characterFromDb.position,
      jerseyNumber: characterFromDb.jersey_number,
      avatarUrl: characterFromDb.url,
      faceclaim: characterFromDb.faceclaim,
      personality: characterFromDb.personality,
      likes: characterFromDb.likes,
      dislikes: characterFromDb.dislikes,
      fears: characterFromDb.fears,
      goals: characterFromDb.goals,
      appearance: characterFromDb.appearance,
      background: characterFromDb.background,
      skills: characterFromDb.skills,
      fullBio: characterFromDb.full_bio,
      isPrivate: Boolean(characterFromDb.is_private),
      quote: characterFromDb.quote || characterFromDb.QUOTE,
      bannerUrl: characterFromDb.banner_url,
      sidebarUrl: characterFromDb.sidebar_url,
      spotifyEmbed: characterFromDb.spotify_embed,
      birthday: characterFromDb.birthday,
      zodiac: characterFromDb.zodiac,
      hometown: characterFromDb.hometown,
      education: characterFromDb.education,
      occupation: characterFromDb.occupation,
      sexuality: characterFromDb.sexuality,
      pronouns: characterFromDb.pronouns,
      languages: characterFromDb.languages,
      religion: characterFromDb.religion,
      strengths: characterFromDb.strengths,
      weaknesses: characterFromDb.weaknesses,
      favFood: characterFromDb.fav_food,
      favMusic: characterFromDb.fav_music,
      favMovies: characterFromDb.fav_movies,
      favColor: characterFromDb.fav_color,
      favSports: characterFromDb.fav_sports,
      inspiration: characterFromDb.inspiration,
      gallery: characterFromDb.gallery,
      timeline: characterFromDb.timeline,
      connections: characterFromDb.connections
      // ...add other fields as needed...
    };
  }
}

module.exports = Character;
