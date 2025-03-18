// config/db/social-db.js
const { db } = require('./connection');
const { dbQuery, dbQueryAll, dbExecute, dbTransaction } = require('./utils');

/**
 * Social database operations
 */
const socialOperations = {
  /**
   * Get all feed posts
   * @param {number} characterId - The viewing character's ID
   * @param {number} page - Page number for pagination
   * @param {number} limit - Number of posts per page
   */
  getAllPosts: async (characterId, page = 1, limit = 10) => {
    const offset = (page - 1) * limit;
    
    return new Promise((resolve, reject) => {
      // Comprehensive query to fetch posts visible to the character
      db.all(`
        WITH post_likes AS (
          SELECT post_id, COUNT(*) as likes_count,
                 MAX(CASE WHEN character_id = ? THEN 1 ELSE 0 END) as is_liked
          FROM SocialLikes
          GROUP BY post_id
        )
        SELECT 
          p.id, 
          p.character_id,
          p.content, 
          p.media_url, 
          p.created_at, 
          c.name as author_name, 
          c.position as author_position, 
          c.avatar_url as author_avatar, 
          t.name as author_team,
          COALESCE(pl.likes_count, 0) as likes_count,
          COALESCE(pl.is_liked, 0) as is_liked
        FROM SocialPosts p
        JOIN Characters c ON p.character_id = c.id
        LEFT JOIN Teams t ON c.team_id = t.id
        LEFT JOIN post_likes pl ON p.id = pl.post_id
        WHERE 
          -- Public posts
          p.visibility = 'public'
          -- Posts from characters the viewing character follows
          OR p.character_id IN (
            SELECT followed_character_id 
            FROM SocialFollowers 
            WHERE follower_character_id = ?
          )
          -- Character's own posts
          OR p.character_id = ?
          -- Team posts if character is on the same team
          OR (
            p.visibility = 'team' AND 
            c.team_id = (SELECT team_id FROM Characters WHERE id = ?)
          )
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
      `, [characterId, characterId, characterId, characterId, limit, offset], (err, rows) => {
        if (err) {
          console.error('Error fetching all posts:', err);
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  },

  // Get upcoming games
getUpcomingGames: (limit = 2) => {
  return dbQueryAll(`
    SELECT 
      g.id, 
      g.date, 
      ht.name as home_team_name, 
      at.name as away_team_name,
      g.location
    FROM Games g
    JOIN Teams ht ON g.home_team_id = ht.id
    JOIN Teams at ON g.away_team_id = at.id
    WHERE g.date > DATETIME('now')
    ORDER BY g.date ASC
    LIMIT ?
  `, [limit]);
},

  /**
   * Get team posts for a character's feed
   * @param {number} characterId - The viewing character's ID
   * @param {number} page - Page number for pagination
   * @param {number} limit - Number of posts per page
   */
  getTeamPosts: async (characterId, page = 1, limit = 10) => {
    const offset = (page - 1) * limit;
    
    return new Promise((resolve, reject) => {
      db.all(`
        WITH post_likes AS (
          SELECT post_id, COUNT(*) as likes_count,
                 MAX(CASE WHEN character_id = ? THEN 1 ELSE 0 END) as is_liked
          FROM SocialLikes
          GROUP BY post_id
        )
        SELECT 
          p.id, 
          p.character_id,
          p.content, 
          p.media_url, 
          p.created_at, 
          c.name as author_name, 
          c.position as author_position, 
          c.avatar_url as author_avatar, 
          t.name as author_team,
          COALESCE(pl.likes_count, 0) as likes_count,
          COALESCE(pl.is_liked, 0) as is_liked
        FROM SocialPosts p
        JOIN Characters c ON p.character_id = c.id
        LEFT JOIN Teams t ON c.team_id = t.id
        LEFT JOIN post_likes pl ON p.id = pl.post_id
        WHERE 
          -- Character's team posts
          c.team_id = (SELECT team_id FROM Characters WHERE id = ?)
          AND p.visibility IN ('public', 'team')
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
      `, [characterId, characterId, limit, offset], (err, rows) => {
        if (err) {
          console.error('Error fetching team posts:', err);
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  },

  /**
   * Get following posts for a character's feed
   * @param {number} characterId - The viewing character's ID
   * @param {number} page - Page number for pagination
   * @param {number} limit - Number of posts per page
   */
  getFollowingPosts: async (characterId, page = 1, limit = 10) => {
    const offset = (page - 1) * limit;
    
    return new Promise((resolve, reject) => {
      db.all(`
        WITH post_likes AS (
          SELECT post_id, COUNT(*) as likes_count,
                 MAX(CASE WHEN character_id = ? THEN 1 ELSE 0 END) as is_liked
          FROM SocialLikes
          GROUP BY post_id
        )
        SELECT 
          p.id, 
          p.character_id,
          p.content, 
          p.media_url, 
          p.created_at, 
          c.name as author_name, 
          c.position as author_position, 
          c.avatar_url as author_avatar, 
          t.name as author_team,
          COALESCE(pl.likes_count, 0) as likes_count,
          COALESCE(pl.is_liked, 0) as is_liked
        FROM SocialPosts p
        JOIN Characters c ON p.character_id = c.id
        LEFT JOIN Teams t ON c.team_id = t.id
        LEFT JOIN post_likes pl ON p.id = pl.post_id
        WHERE 
          -- Followed characters' posts
          p.character_id IN (
            SELECT followed_character_id 
            FROM SocialFollowers 
            WHERE follower_character_id = ?
          )
          AND (
            p.visibility = 'public' OR 
            p.visibility = 'followers' OR
            (p.visibility = 'team' AND 
             c.team_id = (SELECT team_id FROM Characters WHERE id = ?))
          )
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
      `, [characterId, characterId, characterId, limit, offset], (err, rows) => {
        if (err) {
          console.error('Error fetching following posts:', err);
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  },

  /**
   * Create a new social post
   * @param {number} characterId - The character's ID
   * @param {string} content - Post content
   * @param {string} mediaUrl - URL to media (image)
   * @param {string} visibility - Post visibility (public, followers, team)
   */
  createPost: async (characterId, content, mediaUrl, visibility = 'public') => {
    return new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO SocialPosts (character_id, content, media_url, visibility)
        VALUES (?, ?, ?, ?)
      `, [characterId, content, mediaUrl, visibility], function(err) {
        if (err) reject(err);
        resolve(this.lastID);
      });
    });
  },

  /**
   * Get post by ID with full details
   * @param {number} postId - Post ID
   * @param {number} viewingCharacterId - Character ID of the viewer
   */
  getPostById: async (postId, viewingCharacterId) => {
    return new Promise((resolve, reject) => {
      db.get(`
        SELECT p.*, c.name as author_name, c.position as author_position, 
               c.avatar_url as author_avatar, t.name as author_team,
               (SELECT COUNT(*) FROM SocialLikes WHERE post_id = p.id) as likes_count,
               (SELECT COUNT(*) FROM SocialComments WHERE post_id = p.id) as comments_count,
               EXISTS(SELECT 1 FROM SocialLikes WHERE post_id = p.id AND character_id = ?) as is_liked
        FROM SocialPosts p
        JOIN Characters c ON p.character_id = c.id
        LEFT JOIN Teams t ON c.team_id = t.id
        WHERE p.id = ?
      `, [viewingCharacterId, postId], (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });
  },

  /**
   * Like or unlike a post
   * @param {number} postId - Post ID
   * @param {number} characterId - Character ID
   */
  toggleLike: async (postId, characterId) => {
    // First check if like exists
    const existingLike = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM SocialLikes WHERE post_id = ? AND character_id = ?', 
        [postId, characterId], (err, row) => {
          if (err) reject(err);
          resolve(row);
        });
    });

    if (existingLike) {
      // Unlike - delete the like
      return new Promise((resolve, reject) => {
        db.run('DELETE FROM SocialLikes WHERE post_id = ? AND character_id = ?',
          [postId, characterId], function(err) {
            if (err) reject(err);
            resolve({ action: 'unliked', changes: this.changes });
          });
      });
    } else {
      // Like - insert new like
      return new Promise((resolve, reject) => {
        db.run('INSERT INTO SocialLikes (post_id, character_id) VALUES (?, ?)',
          [postId, characterId], function(err) {
            if (err) reject(err);
            resolve({ action: 'liked', id: this.lastID });
          });
      });
    }
  },

  /**
   * Get comments for a post
   * @param {number} postId - Post ID
   * @param {number} limit - Number of comments to retrieve
   * @param {number} offset - Offset for pagination
   */
  getComments: async (postId, limit = 10, offset = 0) => {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT c.*, ch.name as author_name, ch.avatar_url as author_avatar,
               ch.position as author_position, t.name as author_team
        FROM SocialComments c
        JOIN Characters ch ON c.character_id = ch.id
        LEFT JOIN Teams t ON ch.team_id = t.id
        WHERE c.post_id = ?
        ORDER BY c.created_at ASC
        LIMIT ? OFFSET ?
      `, [postId, limit, offset], (err, rows) => {
        if (err) reject(err);
        resolve(rows || []);
      });
    });
  },

  /**
   * Add a comment to a post
   * @param {number} postId - Post ID
   * @param {number} characterId - Character ID
   * @param {string} content - Comment content
   * @param {number} parentCommentId - Parent comment ID (for replies)
   */
  addComment: async (postId, characterId, content, parentCommentId = null) => {
    return new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO SocialComments (post_id, character_id, content, parent_comment_id)
        VALUES (?, ?, ?, ?)
      `, [postId, characterId, content, parentCommentId], function(err) {
        if (err) reject(err);
        resolve(this.lastID);
      });
    });
  },

  /**
   * Extract hashtags from post content
   * @param {string} content - Post content
   * @returns {string[]} - Array of hashtags
   */
  extractHashtags: (content) => {
    if (!content) return [];
    
    const hashtagRegex = /#(\w+)/g;
    const matches = content.match(hashtagRegex);
    
    if (!matches) return [];
    
    return matches.map(tag => tag.substring(1).toLowerCase());
  },

  /**
   * Save hashtags for a post
   * @param {number} postId - Post ID
   * @param {string[]} hashtags - Array of hashtags
   */
  saveHashtags: async (postId, hashtags) => {
    // For each hashtag, first ensure it exists in the SocialHashtags table,
    // then create the association with the post
    for (const hashtag of hashtags) {
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT OR IGNORE INTO SocialHashtags (name)
          VALUES (?)
        `, [hashtag], function(err) {
          if (err) reject(err);
          resolve();
        });
      });
      
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO SocialPostHashtags (post_id, hashtag_id)
          SELECT ?, id FROM SocialHashtags WHERE name = ?
        `, [postId, hashtag], function(err) {
          if (err) reject(err);
          resolve();
        });
      });
    }
  },

  /**
   * Extract mentions from post content
   * @param {string} content - Post content
   * @returns {string[]} - Array of mentions
   */
  extractMentions: (content) => {
    if (!content) return [];
    
    const mentionRegex = /@(\w+)/g;
    const matches = content.match(mentionRegex);
    
    if (!matches) return [];
    
    return matches.map(mention => mention.substring(1).toLowerCase());
  },

  /**
   * Save mentions for a post
   * @param {number} postId - Post ID
   * @param {string[]} mentions - Array of mentions
   */
  saveMentions: async (postId, mentions) => {
    // For each mention, find the character by name and create the association
    for (const mention of mentions) {
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO SocialCharacterTags (post_id, character_id)
          SELECT ?, id FROM Characters WHERE LOWER(name) = ?
        `, [postId, mention], function(err) {
          if (err) reject(err);
          resolve();
        });
      });
    }
  },

  /**
   * Get trending hashtags
   * @param {number} limit - Number of trending hashtags to retrieve
   * @param {number} days - Number of days to look back
   */
  getTrendingHashtags: async (limit = 5, days = 7) => {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT h.name, COUNT(ph.post_id) as count
        FROM SocialHashtags h
        JOIN SocialPostHashtags ph ON h.id = ph.hashtag_id
        JOIN SocialPosts p ON ph.post_id = p.id
        WHERE p.created_at >= datetime('now', '-${days} days')
        GROUP BY h.name
        ORDER BY count DESC
        LIMIT ?
      `, [limit], (err, rows) => {
        if (err) reject(err);
        resolve(rows || []);
      });
    });
  },

  /**
   * Follow or unfollow a character
   * @param {number} followerCharacterId - Follower character ID
   * @param {number} followedCharacterId - Character ID to follow
   */
  toggleFollow: async (followerCharacterId, followedCharacterId) => {
    // First check if follow relationship exists
    const existingFollow = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM SocialFollowers WHERE follower_character_id = ? AND followed_character_id = ?', 
        [followerCharacterId, followedCharacterId], (err, row) => {
          if (err) reject(err);
          resolve(row);
        });
    });

    if (existingFollow) {
      // Unfollow - delete the relationship
      return new Promise((resolve, reject) => {
        db.run('DELETE FROM SocialFollowers WHERE follower_character_id = ? AND followed_character_id = ?',
          [followerCharacterId, followedCharacterId], function(err) {
            if (err) reject(err);
            resolve({ action: 'unfollowed', changes: this.changes });
          });
      });
    } else {
      // Follow - insert new relationship
      return new Promise((resolve, reject) => {
        db.run('INSERT INTO SocialFollowers (follower_character_id, followed_character_id) VALUES (?, ?)',
          [followerCharacterId, followedCharacterId], function(err) {
            if (err) reject(err);
            resolve({ action: 'followed', id: this.lastID });
          });
      });
    }
  },

/**
 * Get suggested follows for a character
 * @param {number} characterId - The character ID
 * @param {number} limit - Number of suggestions to retrieve
 */
getSuggestedFollows: async (characterId, limit = 3) => {
  return new Promise((resolve, reject) => {
    db.all(`
      WITH already_following AS (
        SELECT followed_character_id 
        FROM SocialFollowers 
        WHERE follower_character_id = ?
      )
      SELECT 
        c.id, 
        c.name, 
        c.position, 
        c.avatar_url, 
        t.name as team_name
      FROM Characters c
      LEFT JOIN Teams t ON c.team_id = t.id
      WHERE c.id != ?
        AND c.id NOT IN (SELECT followed_character_id FROM already_following)
        AND (
          -- Prioritize team members
          c.team_id = (SELECT team_id FROM Characters WHERE id = ? AND team_id IS NOT NULL)
          OR c.id IN (
            -- Get popular characters
            SELECT followed_character_id 
            FROM SocialFollowers 
            GROUP BY followed_character_id 
            ORDER BY COUNT(*) DESC
            LIMIT 10
          )
        )
      ORDER BY 
        CASE WHEN c.team_id = (SELECT team_id FROM Characters WHERE id = ? AND team_id IS NOT NULL) 
             THEN 1 ELSE 2 END,
        RANDOM()
      LIMIT ?
    `, [characterId, characterId, characterId, characterId, limit], (err, rows) => {
      if (err) reject(err);
      resolve(rows || []);
    });
  });
},

  // Additional methods
  /**
   * Get notification count for a character
   * @param {number} characterId - The character's ID
   */
  getNotificationsCount: async (characterId) => {
    return new Promise((resolve, reject) => {
      db.get(`
        SELECT COUNT(*) as count
        FROM SocialNotifications
        WHERE recipient_character_id = ?
        AND is_read = 0
      `, [characterId], (err, row) => {
        if (err) {
          console.error('Error fetching notifications count:', err);
          reject(err);
        } else {
          resolve(row ? row.count : 0);
        }
      });
    });
  },

  /**
   * Get trending hashtags
   * @param {number} limit - Number of trending hashtags to retrieve
   * @param {number} days - Number of days to look back
   */
  getTrendingHashtags: async (limit = 5, days = 7) => {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          h.name as tag, 
          COUNT(ph.post_id) as count
        FROM SocialHashtags h
        JOIN SocialPostHashtags ph ON h.id = ph.hashtag_id
        JOIN SocialPosts p ON ph.post_id = p.id
        WHERE p.created_at >= datetime('now', '-${days} days')
        GROUP BY h.name
        ORDER BY count DESC
        LIMIT ?
      `, [limit], (err, rows) => {
        if (err) {
          console.error('Error fetching trending hashtags:', err);
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }
};

module.exports = { socialOperations };