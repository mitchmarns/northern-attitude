const db = require('../config/database');

// Helper to get all teams for a user
async function getUserTeams(userId) {
  const [teams] = await db.query('SELECT id, name FROM teams WHERE created_by = ?', [userId]);
  return teams;
}

const CharactersController = {
  // List all characters for the current user
  listAll: async (req, res) => {
    try {
      // Join with teams to get team name and id
      const [characters] = await db.query(
        `SELECT c.*, 
                t.name as team, 
                t.id as teamId
         FROM characters c
         LEFT JOIN teams t ON c.team_id = t.id
         WHERE c.created_by = ?
         ORDER BY c.name ASC`,
        [req.session.user.id]
      );
      res.render('characters/index', {
        title: 'My Characters',
        characters
      });
    } catch (err) {
      console.error('Error listing characters:', err);
      res.status(500).send('Server Error');
    }
  },

  // Show create character form
  showCreateForm: async (req, res) => {
    try {
      const teams = await getUserTeams(req.session.user.id);
      res.render('characters/create', {
        title: 'Create Character',
        teams
      });
    } catch (err) {
      console.error('Error loading create character form:', err);
      res.status(500).send('Server Error');
    }
  },

  // Handle character creation
  create: async (req, res) => {
    try {
      const {
        name, nickname, age, gender, role, teamId, position, jerseyNumber,
        avatarUrl, faceclaim, personality, likes, dislikes, fears, goals,
        appearance, background, skills, fullBio, isPrivate,
        quote 
      } = req.body;
      const createdBy = req.session.user.id;

      // Ensure team_id is stored as int or null
      const teamIdValue = teamId && teamId !== '' ? parseInt(teamId) : null;
      
      // Use default avatar if none provided
      const finalAvatarUrl = avatarUrl && avatarUrl.trim() !== '' ? 
        avatarUrl : '/img/default-character.png';

      // Insert character
      await db.query(
        `INSERT INTO characters
          (name, nickname, age, gender, role, team_id, position, jersey_number, url, faceclaim, personality, likes, dislikes, fears, goals, appearance, background, skills, full_bio, is_private, created_by, quote)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          name, nickname, age, gender, role, teamIdValue, position, jerseyNumber, finalAvatarUrl, faceclaim,
          personality, likes, dislikes, fears, goals, appearance, background, skills, fullBio,
          isPrivate ? 1 : 0, createdBy, quote 
        ]
      );
      res.redirect('/characters');
    } catch (err) {
      console.error('Error creating character:', err);
      res.status(500).send('Server Error');
    }
  },

  // View character profile
  viewProfile: async (req, res) => {
    try {
      const characterId = req.params.id;
      // Join on team_id, select all relevant fields
      const [rows] = await db.query(
        `SELECT c.*, 
                t.name as team, 
                t.id as teamId, 
                c.jersey_number as jerseyNumber,
                c.banner_url as bannerUrl,
                c.sidebar_url as sidebarUrl,
                c.spotify_embed as spotifyEmbed,
                c.quote as quote
         FROM characters c
         LEFT JOIN teams t ON c.team_id = t.id
         WHERE c.id = ?`,
        [characterId]
      );
      if (!rows.length) return res.status(404).send('Character not found');
      
      // Check if the current user is the owner of this character
      const isOwner = req.session.user && req.session.user.id === rows[0].created_by;

      // Parse JSON fields if they exist
      const character = rows[0];
      // Parse timeline, connections, gallery if they exist and are not null
      if (character.timeline && typeof character.timeline === 'string') {
        try { character.timeline = JSON.parse(character.timeline); } catch { character.timeline = []; }
      }
      if (character.connections && typeof character.connections === 'string') {
        try { character.connections = JSON.parse(character.connections); } catch { character.connections = []; }
      }
      if (character.gallery && typeof character.gallery === 'string') {
        try { character.gallery = JSON.parse(character.gallery); } catch { character.gallery = []; }
      }

      res.render('characters/profile', {
        title: character.name,
        character,
        isOwner
      });
    } catch (err) {
      console.error('Error viewing character:', err);
      res.status(500).send('Server Error');
    }
  },

  // Show edit character form
  showEditForm: async (req, res) => {
    try {
      const characterId = req.params.id;
      // Select team_id and jersey_number as jerseyNumber
      const [rows] = await db.query(
        `SELECT *, 
                team_id as teamId, 
                jersey_number as jerseyNumber 
         FROM characters 
         WHERE id = ?`, 
        [characterId]
      );
      if (!rows.length) return res.status(404).send('Character not found');
      const character = rows[0];

      // Map snake_case DB fields to camelCase for the form
      character.avatarUrl = character.url;
      character.bannerUrl = character.banner_url;
      character.sidebarUrl = character.sidebar_url;
      character.spotifyEmbed = character.spotify_embed;
      character.fullBio = character.full_bio;
      character.isPrivate = Boolean(character.is_private);
      character.quote = character.quote || character.QUOTE;
      character.birthday = character.birthday;
      character.zodiac = character.zodiac;
      character.hometown = character.hometown;
      character.education = character.education;
      character.occupation = character.occupation;
      character.sexuality = character.sexuality;
      character.pronouns = character.pronouns;
      character.languages = character.languages;
      character.religion = character.religion;
      character.strengths = character.strengths;
      character.weaknesses = character.weaknesses;

      const teams = await getUserTeams(req.session.user.id);
      res.render('characters/edit', {
        title: 'Edit Character',
        character,
        teams
      });
    } catch (err) {
      console.error('Error loading edit character form:', err);
      res.status(500).send('Server Error');
    }
  },

  // Handle character update
  update: async (req, res) => {
    try {
      const characterId = req.params.id;
      // Add this line to debug
      console.log('Update character req.body:', req.body);
      let {
        name, nickname, age, gender, role, teamId, position, jerseyNumber,
        avatarUrl, faceclaim, personality, likes, dislikes, fears, goals,
        appearance, background, skills, fullBio, isPrivate,
        bannerUrl, sidebarUrl, spotifyEmbed,
        quote,
        // Add additional fields
        birthday, zodiac, hometown, education, occupation, sexuality, pronouns, languages, religion,
        strengths, weaknesses
      } = req.body;

      // Convert empty string birthday to null for MySQL DATE columns
      if (birthday === '') birthday = null;

      // If any media fields are arrays, use the first non-empty value
      if (Array.isArray(bannerUrl)) {
        bannerUrl = bannerUrl.find(v => v && v.trim() !== '') || '';
      }
      if (Array.isArray(sidebarUrl)) {
        sidebarUrl = sidebarUrl.find(v => v && v.trim() !== '') || '';
      }
      if (Array.isArray(spotifyEmbed)) {
        spotifyEmbed = spotifyEmbed.find(v => v && v.trim() !== '') || '';
      }
      if (Array.isArray(avatarUrl)) {
        avatarUrl = avatarUrl.find(v => v && v.trim() !== '') || '';
      }

      // Ensure team_id is stored as int or null
      const teamIdValue = teamId && teamId !== '' ? parseInt(teamId) : null;

      // Build update fields and values dynamically to avoid SQL mismatch
      const fields = [
        'name=?', 'nickname=?', 'age=?', 'gender=?', 'role=?', 'team_id=?', 'position=?', 'jersey_number=?', 'url=?', 'faceclaim=?',
        'personality=?', 'likes=?', 'dislikes=?', 'fears=?', 'goals=?', 'appearance=?', 'background=?', 'skills=?', 'full_bio=?', 'is_private=?', 'quote=?',
        'banner_url=?', 'sidebar_url=?', 'spotify_embed=?', 'birthday=?', 'zodiac=?', 'hometown=?', 'education=?', 'occupation=?', 'sexuality=?', 'pronouns=?', 'languages=?', 'religion=?',
        'strengths=?', 'weaknesses=?'
      ];
      const values = [
        name, nickname, age, gender, role, teamIdValue, position, jerseyNumber, avatarUrl, faceclaim,
        personality, likes, dislikes, fears, goals, appearance, background, skills, fullBio,
        isPrivate ? 1 : 0, quote,
        bannerUrl, sidebarUrl, spotifyEmbed, birthday, zodiac, hometown, education, occupation, sexuality, pronouns, languages, religion,
        strengths, weaknesses
      ];

      values.push(characterId);

      const sql = `UPDATE characters SET ${fields.join(', ')} WHERE id=?`;

      await db.query(sql, values);
      res.redirect(`/characters/${characterId}`);
    } catch (err) {
      console.error('Error updating character:', err);
      res.status(500).send('Server Error');
    }
  },

  // API endpoint to get character details
  apiGetCharacter: async (req, res) => {
    try {
      const characterId = req.params.id;
      const [rows] = await db.query('SELECT * FROM characters WHERE id = ?', [characterId]);
      if (!rows.length) return res.status(404).json({ error: 'Character not found' });
      res.json(rows[0]);
    } catch (err) {
      console.error('Error in apiGetCharacter:', err);
      res.status(500).json({ error: 'Server Error' });
    }
  },

  // Set active character in session
  setActive: async (req, res) => {
    try {
      const characterId = req.params.id;
      req.session.activeCharacterId = characterId;
      res.redirect('/characters');
    } catch (err) {
      console.error('Error setting active character:', err);
      res.status(500).send('Server Error');
    }
  },
  
  // Update media URLs (banner, sidebar, spotify)
  updateMedia: async (req, res) => {
    try {
      const characterId = req.params.id;
      const { mediaType, url } = req.body;
      
      console.log('Update media request:', { characterId, mediaType, url }); // Add logging
      
      // Validate that this is the user's character
      const [rows] = await db.query(
        'SELECT * FROM characters WHERE id = ? AND created_by = ?',
        [characterId, req.session.user.id]
      );
      
      if (!rows.length) {
        return res.status(403).send('Not authorized to edit this character');
      }
      
      // Validate media type to prevent SQL injection
      const validMediaTypes = ['bannerUrl', 'sidebarUrl', 'spotifyEmbed', 'avatarUrl', 'gallery'];
      if (!validMediaTypes.includes(mediaType)) {
        return res.status(400).send('Invalid media type');
      }
      
      // Convert mediaType to database column name (camelCase to snake_case)
      const columnMapping = {
        'bannerUrl': 'banner_url',
        'sidebarUrl': 'sidebar_url',
        'spotifyEmbed': 'spotify_embed',
        'avatarUrl': 'url'
        // 'gallery' is handled separately below
      };
      
      // Special handling for gallery (JSON array)
      if (mediaType === 'gallery') {
        // Fetch current gallery
        let galleryArr = [];
        let currentGallery = rows[0].gallery;
        if (typeof currentGallery === 'string' && currentGallery.trim() !== '') {
          try {
            galleryArr = JSON.parse(currentGallery);
            if (!Array.isArray(galleryArr)) galleryArr = [];
          } catch {
            galleryArr = [];
          }
        }
        // Add new image URL if not already present
        if (url && !galleryArr.some(img => img.url === url)) {
          galleryArr.push({ url });
        }
        // Save updated gallery
        await db.query(
          `UPDATE characters SET gallery = ? WHERE id = ?`,
          [JSON.stringify(galleryArr), characterId]
        );
        return res.redirect(`/characters/${characterId}`);
      }
      
      const columnName = columnMapping[mediaType];
      
      if (!columnName) {
        return res.status(400).send('Invalid media type mapping');
      }
      
      // Set a default value if URL is empty
      let finalUrl = url;
      if (!url || url.trim() === '') {
        if (mediaType === 'avatarUrl' || mediaType === 'sidebarUrl') {
          finalUrl = '/img/default-character.png';
        } else if (mediaType === 'bannerUrl') {
          finalUrl = 'https://i.imgur.com/FOKBuZw.png';
        } else if (mediaType === 'spotifyEmbed') {
          finalUrl = ''; // No default for Spotify embed
        }
      }
      
      // For Spotify, we need to sanitize the input to prevent XSS
      if (mediaType === 'spotifyEmbed' && finalUrl) {
        // Basic validation that this is a Spotify embed to prevent XSS
        if (!finalUrl.includes('spotify.com/embed') || !finalUrl.includes('<iframe')) {
          return res.status(400).send('Invalid Spotify embed code');
        }
        
        // Make sure it only contains the expected Spotify iframe
        finalUrl = finalUrl.replace(/[<>]/g, match => {
          return match === '<' ? '&lt;' : '&gt;';
        });
        
        // Then restore the actual iframe tags we expect
        finalUrl = finalUrl
          .replace(/&lt;iframe/g, '<iframe')
          .replace(/&lt;\/iframe&gt;/g, '</iframe>')
          .replace(/&gt;/g, '>');
      }
      
      console.log('Updating database:', { columnName, finalUrl, characterId }); // Add logging
      
      // Update the specific media field
      const [updateResult] = await db.query(
        `UPDATE characters SET ${columnName} = ? WHERE id = ?`,
        [finalUrl, characterId]
      );
      
      console.log('Update result:', updateResult); // Add logging
      
      // Redirect back to the character profile
      res.redirect(`/characters/${characterId}`);
    } catch (err) {
      console.error('Error updating media:', err);
      res.status(500).send(`Server Error: ${err.message}`); // Include error message in response
    }
  }
};

module.exports = CharactersController;



