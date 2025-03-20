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
    // Existing code with one improvement - don't use Promise.all for every post
    // Instead, get post images in a single query
    
    // First get posts
    const posts = await dbQueryAll(/* existing query */);
    
    // If we have posts, get all post images in one query
    if (posts.length > 0) {
      const postIds = posts.map(post => post.id);
      // Get all images for these posts in one query
      const postImagesQuery = `
        SELECT post_id, image_url 
        FROM SocialPostImages 
        WHERE post_id IN (${postIds.join(',')})
        ORDER BY id ASC
      `;
      
      const allImages = await dbQueryAll(postImagesQuery);
      
      // Group images by post_id
      const imagesByPost = {};
      allImages.forEach(img => {
        if (!imagesByPost[img.post_id]) {
          imagesByPost[img.post_id] = [];
        }
        imagesByPost[img.post_id].push(img.image_url);
      });
      
      // Add images to posts
      posts.forEach(post => {
        post.images = imagesByPost[post.id] || [];
        // For backward compatibility
        if (post.images.length === 0 && post.media_url) {
          post.images.push(post.media_url);
        }
      });
      
      return posts;
    }
    
    return posts;
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
 * Tag a character in a post
 * @param {number} postId - Post ID
 * @param {number} characterId - Character ID to tag
 * @returns {Promise<Object>} - Result with inserted ID
 */
tagCharacterInPost: async (postId, characterId) => {
  return new Promise((resolve, reject) => {
    db.run(`
      INSERT OR IGNORE INTO SocialCharacterTags (post_id, character_id)
      VALUES (?, ?)
    `, [postId, characterId], function(err) {
      if (err) {
        console.error('Error tagging character in post:', err);
        reject(err);
        return;
      }
      resolve({
        id: this.lastID,
        changes: this.changes
      });
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

  // Create a post with multiple images
createPostWithImages: async (characterId, content, images, visibility = 'public') => {
  return new Promise((resolve, reject) => {
    // Create the post and get its ID
    db.run(`
      INSERT INTO SocialPosts (character_id, content, visibility)
      VALUES (?, ?, ?)
    `, [characterId, content, visibility], function(err) {
      if (err) {
        reject(err);
        return;
      }
      
      const postId = this.lastID;
      
      // If no images, we're done
      if (!images || images.length === 0) {
        resolve(postId);
        return;
      }
      
      // Create an array of placeholders for the SQL statement
      const placeholders = images.map(() => '(?, ?)').join(', ');
      
      // Create an array of values for the SQL statement
      const values = [];
      images.forEach(imageUrl => {
        values.push(postId, imageUrl);
      });
      
      // Insert all image URLs
      db.run(`
        INSERT INTO SocialPostImages (post_id, image_url)
        VALUES ${placeholders}
      `, values, err => {
        if (err) {
          reject(err);
          return;
        }
        
        resolve(postId);
      });
    });
  });
},

// Get images for posts (for feed fetch)
getPostImages: async (postId) => {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT image_url
      FROM SocialPostImages
      WHERE post_id = ?
      ORDER BY id ASC
    `, [postId], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      
      resolve(rows.map(row => row.image_url));
    });
  });
},

/**
 * Get posts by hashtag
 * @param {string} hashtag - The hashtag to search for (without # symbol)
 * @param {number} characterId - The viewing character's ID
 * @param {number} page - Page number for pagination
 * @param {number} limit - Number of posts per page
 */
getPostsByHashtag: async (hashtag, characterId, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const hashtagLower = hashtag.toLowerCase();
  
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
        COALESCE(pl.is_liked, 0) as is_liked,
        (SELECT COUNT(*) FROM SocialComments WHERE post_id = p.id) as comments_count
      FROM SocialPosts p
      JOIN Characters c ON p.character_id = c.id
      LEFT JOIN Teams t ON c.team_id = t.id
      LEFT JOIN post_likes pl ON p.id = pl.post_id
      JOIN SocialPostHashtags sph ON p.id = sph.post_id
      JOIN SocialHashtags sh ON sph.hashtag_id = sh.id
      WHERE 
        LOWER(sh.name) = ?
        AND (
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
        )
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `, [characterId, hashtagLower, characterId, characterId, characterId, limit, offset], async (err, posts) => {
      if (err) {
        console.error('Error fetching posts by hashtag:', err);
        return reject(err);
      }
      
      try {
        // For each post, get its images
        const postsWithImages = await Promise.all(posts.map(async (post) => {
          // Get images for this post from SocialPostImages table
          const images = await new Promise((resolve, reject) => {
            db.all(`
              SELECT image_url
              FROM SocialPostImages
              WHERE post_id = ?
              ORDER BY id ASC
            `, [post.id], (err, rows) => {
              if (err) {
                console.error(`Error fetching images for post ${post.id}:`, err);
                return resolve([]); // Continue even if image fetch fails
              }
              
              // Extract image URLs from rows
              const imageUrls = rows.map(row => row.image_url);
              
              // Add the media_url as an image if it exists and no other images found
              // (for backward compatibility)
              if (imageUrls.length === 0 && post.media_url) {
                imageUrls.push(post.media_url);
              }
              
              resolve(imageUrls);
            });
          });
          
          // Add images array to post
          return {
            ...post,
            images: images || []
          };
        }));
        
        resolve(postsWithImages || []);
      } catch (error) {
        console.error('Error processing post images:', error);
        // Fall back to returning posts without images
        resolve(posts || []);
      }
    });
  });
},

/**
 * Get trending hashtags with usage counts
 * @param {number} limit - Number of hashtags to retrieve
 * @param {number} days - Number of days to look back
 */
getTrendingHashtags: async (limit = 5, days = 7) => {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT 
        h.name, 
        COUNT(DISTINCT ph.post_id) as count
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
},

/**
 * Add hashtags to posts even if they already exist in the content
 * @param {number} postId - Post ID
 * @param {string[]} hashtags - Array of hashtags (without # symbol)
 */
addHashtagsToPost: async (postId, hashtags) => {
  if (!hashtags || hashtags.length === 0) return;
  
  // Make sure all hashtags are lowercase
  const lowerHashtags = hashtags.map(h => h.toLowerCase());
  
  // For each hashtag:
  // 1. Ensure it exists in the SocialHashtags table
  // 2. Create the association with the post if it doesn't exist yet
  for (const hashtag of lowerHashtags) {
    try {
      // First ensure the hashtag exists
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT OR IGNORE INTO SocialHashtags (name)
          VALUES (?)
        `, [hashtag], function(err) {
          if (err) reject(err);
          resolve();
        });
      });
      
      // Then create the association
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT OR IGNORE INTO SocialPostHashtags (post_id, hashtag_id)
          SELECT ?, id FROM SocialHashtags WHERE name = ?
        `, [postId, hashtag], function(err) {
          if (err) reject(err);
          resolve();
        });
      });
    } catch (error) {
      console.error(`Error adding hashtag ${hashtag} to post ${postId}:`, error);
      // Continue with next hashtag even if there's an error
    }
  }
},

createNotification: async ({ 
  recipientCharacterId, 
  actorCharacterId, 
  actionType, 
  targetId, 
  targetType 
}) => {
  return new Promise((resolve, reject) => {
    db.run(`
      INSERT INTO SocialNotifications (
        recipient_character_id, 
        actor_character_id, 
        action_type, 
        target_id, 
        target_type, 
        is_read, 
        created_at
      ) VALUES (?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)
    `, [
      recipientCharacterId, 
      actorCharacterId, 
      actionType, 
      targetId, 
      targetType
    ], function(err) {
      if (err) {
        console.error('Error creating notification:', err);
        reject(err);
      } else {
        resolve(this.lastID);
      }
    });
  });
},

// Update method to get notifications
getNotificationsForCharacter: async (characterId, limit = 20) => {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT n.*, 
             a.name as actor_name, 
             a.avatar_url as actor_avatar,
             p.content as post_content,
             p.media_url as post_media_url
      FROM SocialNotifications n
      JOIN Characters a ON n.actor_character_id = a.id
      LEFT JOIN SocialPosts p ON n.target_id = p.id AND n.target_type = 'post'
      WHERE n.recipient_character_id = ?
      ORDER BY n.created_at DESC
      LIMIT ?
    `, [characterId, limit], (err, rows) => {
      if (err) {
        console.error('Error fetching notifications:', err);
        reject(err);
      } else {
        resolve(rows || []);
      }
    });
  });
},
};

module.exports = { socialOperations };