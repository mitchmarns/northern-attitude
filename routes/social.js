const express = require('express');
const router = express.Router();
const path = require('path');
const { isAuthenticated } = require('../middleware/auth');

// Main feed page
router.get('/feed', isAuthenticated, async (req, res) => {
  try {
    console.log('User ID:', req.user.id); // Debug log
    
    // Get user's characters - fix the query to return all columns
    const [characters] = await req.db.query(
      'SELECT * FROM characters WHERE created_by = ?',
      [req.user.id]
    );
    
    console.log('Characters found:', characters.length); // Debug log
    
    // Get user's stats for the profile summary
    const [postCount] = await req.db.query(
      'SELECT COUNT(*) as count FROM posts WHERE author_id = ?',
      [req.user.id]
    );
    
    const [followerCount] = await req.db.query(
      'SELECT COUNT(*) as count FROM follows WHERE following_id = ? AND character_id IS NULL',
      [req.user.id]
    );
    
    const [followingCount] = await req.db.query(
      'SELECT COUNT(*) as count FROM follows WHERE follower_id = ?',
      [req.user.id]
    );
    
    // Get posts for feed with pagination
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    // Fixed: Properly handle the query result array
    const [posts] = await req.db.query(`
      SELECT 
        p.*,
        u.username,
        c.name as character_name,
        c.avatar_url as character_avatar,
        c.url,
        (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as like_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
        (SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = ? LIMIT 1) as liked
      FROM posts p
      JOIN users u ON p.author_id = u.id
      LEFT JOIN characters c ON p.character_id = c.id
      WHERE p.privacy = 'public' 
        OR p.author_id = ?
        OR (p.privacy = 'followers' AND EXISTS (
          SELECT 1 FROM follows WHERE follower_id = ? AND following_id = p.author_id
        ))
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `, [req.user.id, req.user.id, req.user.id, limit, offset]);
    
    // Get media for posts with images or videos - complete rewrite
    if (posts && posts.length > 0) {
      const postIds = posts.map(post => post.id);
      
      console.log('Post IDs for media query:', postIds);
      
      try {
        // Check if the post_media table has records for these posts
        const [mediaLinkCheck] = await req.db.query(`
          SELECT post_id, COUNT(*) as media_count 
          FROM post_media 
          WHERE post_id IN (?)
          GROUP BY post_id
        `, [postIds]);
        
        if (mediaLinkCheck.length > 0) {
          console.log('Post media links found:', mediaLinkCheck.map(m => 
            `Post ${m.post_id}: ${m.media_count} items`).join(', '));
        } else {
          console.log('No post media links found in post_media table');
        }
        
        // Improved media query with explicit joins and error handling
        const [media] = await req.db.query(`
          SELECT 
            pm.post_id, 
            m.id as media_id, 
            m.url, 
            m.type, 
            pm.display_order
          FROM post_media pm 
          JOIN media m ON pm.media_id = m.id 
          WHERE pm.post_id IN (?)
          ORDER BY pm.post_id, pm.display_order
        `, [postIds]);
        
        console.log('Media results count:', media ? media.length : 0);
        
        // Debug first few media records if available
        if (media && media.length > 0) {
          console.log('First 3 media records:', media.slice(0, 3));
        }
        
        // Attach media to corresponding posts with better debugging
        posts.forEach(post => {
          const postMedia = media.filter(m => m.post_id === post.id);
          post.media = postMedia;
          console.log(`Post ${post.id} has ${postMedia.length} media items`);
          
          // Debug first media URL if available
          if (postMedia.length > 0) {
            console.log(`Post ${post.id} first media URL: ${postMedia[0].url}`);
          }
        });
      } catch (mediaError) {
        console.error('Error fetching media:', mediaError);
        // Initialize empty media arrays to prevent errors
        posts.forEach(post => post.media = []);
      }
      
      // Get tags for posts - Fixed: Properly handle tags query results
      const [tags] = await req.db.query(`
        SELECT pt.post_id, t.* 
        FROM post_tags pt 
        JOIN tags t ON pt.tag_id = t.id 
        WHERE pt.post_id IN (?)
      `, [postIds]);
      
      // Attach tags to corresponding posts
      posts.forEach(post => {
        post.tags = tags.filter(t => t.post_id === post.id);
      });
      
      // Get comments for posts - Fixed: Properly handle comments query results
      const [comments] = await req.db.query(`
        SELECT 
          c.*,
          u.username,
          ch.name as character_name,
          ch.avatar_url as character_avatar,
          ch.url
        FROM comments c
        JOIN users u ON c.user_id = u.id
        LEFT JOIN characters ch ON c.character_id = ch.id
        WHERE c.post_id IN (?) AND c.parent_id IS NULL
        ORDER BY c.created_at DESC
      `, [postIds]);
      
      // Attach comments to corresponding posts
      posts.forEach(post => {
        post.comments = comments.filter(c => c.post_id === post.id);
      });

      // Process poll options if any post is a poll
      const pollPosts = posts.filter(post => post.post_type === 'poll');
      if (pollPosts.length > 0) {
        const pollPostIds = pollPosts.map(post => post.id);
        const [pollOptions] = await req.db.query(`
          SELECT * FROM poll_options WHERE post_id IN (?)
        `, [pollPostIds]);

        // Calculate percentages for each poll option
        for (const post of pollPosts) {
          const options = pollOptions.filter(option => option.post_id === post.id);
          const totalVotes = options.reduce((sum, option) => sum + (option.votes || 0), 0);
          post.total_votes = totalVotes;
          
          post.poll_options = options.map(option => ({
            ...option,
            percentage: totalVotes > 0 ? Math.round((option.votes || 0) / totalVotes * 100) : 0
          }));
        }
      }
    }
    
    // Get suggested users - Replace with suggested characters
    let [suggestedUsers] = await req.db.query(`
      SELECT 
        c.id, c.name, c.avatar_url, c.url, c.created_by, 
        u.username as creator_username,
        (SELECT 1 FROM follows WHERE follower_id = ? AND character_id = c.id LIMIT 1) as is_following
      FROM characters c
      JOIN users u ON c.created_by = u.id
      WHERE 1=1
        AND c.created_by != ?
      ORDER BY RAND()
      LIMIT 5
    `, [req.user.id, req.user.id]);

    console.log('Suggested characters SQL query:', `
      SELECT 
        c.id, c.name, c.avatar_url, c.url, c.created_by, 
        u.username as creator_username,
        (SELECT 1 FROM follows WHERE follower_id = ? AND character_id = c.id LIMIT 1) as is_following
      FROM characters c
      JOIN users u ON c.created_by = u.id
      WHERE 1=1
        AND c.created_by != ?
      ORDER BY RAND()
      LIMIT 5`);
    console.log('Suggested characters query parameters:', [req.user.id, req.user.id]);
    console.log('Suggested characters query results:', suggestedUsers);

    // If no characters found with previous query, try a simpler fallback query
    try {
      if (!suggestedUsers || suggestedUsers.length === 0) {
        console.log('No characters found with main query, trying fallback query...');
        const [fallbackCharacters] = await req.db.query(`
          SELECT 
            c.id, c.name, c.avatar_url, c.url, c.created_by, 
            u.username as creator_username,
            0 as is_following
          FROM characters c
          JOIN users u ON c.created_by = u.id
          WHERE c.created_by != ?
          ORDER BY RAND()
          LIMIT 5
        `, [req.user.id]);
        
        // If fallback query finds characters, use them
        if (fallbackCharacters && fallbackCharacters.length > 0) {
          console.log('Fallback query found characters:', fallbackCharacters.length);
          // Use these characters instead
          suggestedUsers = fallbackCharacters;
        }
      }

      // Let's check if there are ANY characters in the database
      const [totalCharacters] = await req.db.query(`
        SELECT COUNT(*) as count FROM characters
      `);
      console.log(`Total characters in database: ${totalCharacters[0]?.count || 0}`);

      // If still no results, try one more approach
      if (!suggestedUsers || suggestedUsers.length === 0) {
        console.log('Checking database schema for characters table...');
        const [columns] = await req.db.query(`
          SHOW COLUMNS FROM characters
        `);
        console.log('Character table columns:', columns.map(col => col.Field).join(', '));
        
        // Check if is_private field exists
        const hasIsPrivate = columns.some(col => col.Field === 'is_private');
        console.log('Has is_private field:', hasIsPrivate);
        
        if (hasIsPrivate) {
          // Try one more query without the is_private check
          const [anyCharacters] = await req.db.query(`
            SELECT 
              c.id, c.name, c.avatar_url, c.url, c.created_by, 
              u.username as creator_username,
              0 as is_following
            FROM characters c
            JOIN users u ON c.created_by = u.id
            LIMIT 5
          `);
          
          if (anyCharacters && anyCharacters.length > 0) {
            console.log('Found characters without filtering:', anyCharacters.length);
            suggestedUsers = anyCharacters;
          }
        }
      }
    } catch (error) {
      console.error('Error during fallback character queries:', error);
      suggestedUsers = []; // Ensure we have a valid array even if queries fail
    }

    // Get suggested characters - Fixed: Properly handle query results
    const [suggestedCharacters] = await req.db.query(`
      SELECT c.*, u.username as creator_username
      FROM characters c
      JOIN users u ON c.created_by = u.id
      WHERE c.is_private = FALSE 
        AND c.created_by != ?
        AND NOT EXISTS (SELECT 1 FROM follows WHERE follower_id = ? AND character_id = c.id)
      ORDER BY RAND()
      LIMIT 5
    `, [req.user.id, req.user.id]);
    
    // Get upcoming events - Fixed: Properly handle query results
    let upcomingEvents = [];
    try {
      const [events] = await req.db.query(`
        SELECT 
          p.id, p.title, p.event_date as date, p.event_time as time, p.event_location as location
        FROM posts p
        WHERE p.post_type = 'event'
          AND p.event_date IS NOT NULL
          AND p.event_date >= CURDATE()
          AND (p.privacy = 'public' 
            OR p.author_id = ?
            OR (p.privacy = 'followers' AND EXISTS (
              SELECT 1 FROM follows WHERE follower_id = ? AND following_id = p.author_id
            ))
          )
        ORDER BY p.event_date
        LIMIT 3
      `, [req.user.id, req.user.id]);
      
      upcomingEvents = events || [];
    } catch (eventError) {
      console.error('Error fetching events, might need schema update:', eventError);
      upcomingEvents = [];
    }
    
    res.render('social/feed', {
      title: 'Social Feed',
      user: req.user,
      posts: posts || [],
      characters: characters || [],
      suggestedUsers: suggestedUsers || [], 
      suggestedCharacters: suggestedCharacters || [],
      upcomingEvents,
      page,
      hasMore: posts && posts.length === limit,
      stats: {
        posts: postCount && postCount[0] ? postCount[0].count || 0 : 0,
        followers: followerCount && followerCount[0] ? followerCount[0].count || 0 : 0,
        following: followingCount && followingCount[0] ? followingCount[0].count || 0 : 0
      }
    });
  } catch (error) {
    console.error('Error fetching feed:', error);
    req.flash('error', 'Failed to load the social feed');
    res.redirect('/');
  }
});

// Explore page
router.get('/explore', isAuthenticated, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;
    
    // Get trending posts (most liked/commented in past week)
    const trendingPosts = await req.db.query(`
      SELECT 
        p.*,
        u.username,
        c.name as character_name,
        c.avatar_url as character_avatar,
        (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as like_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
        (SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = ? LIMIT 1) as liked
      FROM posts p
      JOIN users u ON p.author_id = u.id
      LEFT JOIN characters c ON p.character_id = c.id
      WHERE p.privacy = 'public'
        AND p.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      ORDER BY (
        (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) +
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) * 2 +
        p.view_count * 0.1
      ) DESC
      LIMIT ? OFFSET ?
    `, [req.user.id, limit, offset]);
    
    // Get popular tags
    const popularTags = await req.db.query(`
      SELECT t.id, t.name, COUNT(pt.post_id) as count
      FROM tags t
      JOIN post_tags pt ON t.id = pt.tag_id
      JOIN posts p ON pt.post_id = p.id
      WHERE p.privacy = 'public'
        AND p.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY t.id
      ORDER BY count DESC
      LIMIT 10
    `);
    
    res.render('social/explore', {
      title: 'Explore',
      user: req.user,
      trendingPosts,
      popularTags,
      page,
      hasMore: trendingPosts.length === limit
    });
  } catch (error) {
    console.error('Error fetching explore page:', error);
    req.flash('error', 'Failed to load the explore page');
    res.redirect('/social/feed');
  }
});

// Create post
router.post('/post/create', isAuthenticated, async (req, res) => {
  const { 
    title, 
    content, 
    postType, 
    characterId, 
    eventDate, 
    eventTime, 
    eventLocation, 
    tags, 
    privacy,
    videoUrl 
  } = req.body;
  
  try {
    // Require character ID
    if (!characterId) {
      req.flash('error', 'You must select a character to post');
      return res.redirect('/social/feed');
    }
    
    const conn = await req.db.getConnection();
    await conn.beginTransaction();
    
    try {
      // Verify character belongs to user
      const [characterCheck] = await conn.query(
        'SELECT id FROM characters WHERE id = ? AND created_by = ?',
        [characterId, req.user.id]
      );
      
      if (characterCheck.length === 0) {
        throw new Error('Invalid character selection');
      }
      
      // Create the post
      const [postResult] = await conn.query(`
        INSERT INTO posts (
          title, content, post_type, author_id, character_id, 
          event_date, event_time, event_location, privacy
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        title, 
        content, 
        postType, 
        req.user.id, 
        characterId, 
        eventDate || null, 
        eventTime || null, 
        eventLocation || null, 
        privacy || 'public'
      ]);
      
      // Get the actual post ID (fixed to use insertId from the result correctly)
      const postId = postResult.insertId;
      
      console.log('Created post with ID:', postId); // Debug log
      
      // Handle poll options if post type is poll
      if (postType === 'poll' && req.body.pollOptions) {
        // Check if poll_options table exists
        try {
          // First check if the table exists
          const [tableCheck] = await conn.query(`
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = DATABASE() 
            AND table_name = 'poll_options'
          `);
          
          // If table doesn't exist, create it on the fly
          if (tableCheck.length === 0) {
            console.log('Creating poll_options table...');
            await conn.query(`
              CREATE TABLE IF NOT EXISTS poll_options (
                id INT AUTO_INCREMENT PRIMARY KEY,
                post_id INT NOT NULL,
                text VARCHAR(255) NOT NULL,
                votes INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
              );
            `);
            console.log('poll_options table created successfully.');
          }

          const pollOptions = Array.isArray(req.body.pollOptions) 
            ? req.body.pollOptions 
            : [req.body.pollOptions];
            
          for (const option of pollOptions) {
            if (option && option.trim()) {
              await conn.query(`
                INSERT INTO poll_options (post_id, text) VALUES (?, ?)
              `, [postId, option.trim()]);
            }
          }
        } catch (pollError) {
          console.error('Error processing poll options:', pollError);
          throw new Error('Failed to process poll options: ' + pollError.message);
        }
      }
      
      // Handle image URLs - complete rewrite of this section
      if (postType === 'image') {
        console.log('Processing image post type');
        
        // Extract image URLs from form data - check all possible sources
        let imageUrls = [];
        
        // Debug the entire request body for image-related fields
        console.log('Request body keys:', Object.keys(req.body));
        
        // Check for hidden inputs created by our JavaScript
        if (req.body['imageUrls[]']) {
          console.log('Found imageUrls[] in form data:', req.body['imageUrls[]']);
          imageUrls = Array.isArray(req.body['imageUrls[]']) 
            ? req.body['imageUrls[]'] 
            : [req.body['imageUrls[]']];
        }
        // Also check standard array format
        else if (req.body.imageUrls) {
          console.log('Found imageUrls in form data:', req.body.imageUrls);
          imageUrls = Array.isArray(req.body.imageUrls) 
            ? req.body.imageUrls 
            : [req.body.imageUrls];
        }
        // Single image URL field (fallback)
        else if (req.body['image-url']) {
          const imageUrl = req.body['image-url'].trim();
          console.log('Found image-url field:', imageUrl);
          if (imageUrl) imageUrls.push(imageUrl);
        }
        
        console.log('Final processed image URLs:', imageUrls);
        
        // Process each image URL
        if (imageUrls && imageUrls.length > 0) {
          let displayOrder = 0;
          
          for (const url of imageUrls) {
            if (!url || typeof url !== 'string' || !url.trim()) continue;
            
            const cleanUrl = url.trim();
            console.log('Processing image URL:', cleanUrl);
            
            try {
              // Insert into media table
              const [mediaResult] = await conn.query(`
                INSERT INTO media (url, type, uploaded_by) 
                VALUES (?, ?, ?)
              `, [cleanUrl, 'image', req.user.id]);
              
              const mediaId = mediaResult.insertId;
              console.log('Created media record with ID:', mediaId);
              
              // Link media to post with explicit column names
              await conn.query(`
                INSERT INTO post_media (post_id, media_id, display_order)
                VALUES (?, ?, ?)
              `, [postId, mediaId, displayOrder]);
              
              console.log(`Successfully linked media ID ${mediaId} to post ID ${postId}`);
              displayOrder++;
            } catch (mediaError) {
              console.error('Error processing media URL:', cleanUrl, mediaError);
            }
          }
        } else {
          console.log('No image URLs found in request data');
        }
      }
      
      // Handle video URL
      if (postType === 'video' && videoUrl) {
        const safeVideoUrl = typeof videoUrl === 'string' ? videoUrl.trim() : String(videoUrl);
        
        // Insert into media table
        const [mediaResult] = await conn.query(`
          INSERT INTO media (url, type, uploaded_by) 
          VALUES (?, ?, ?)
        `, [
          safeVideoUrl,
          'video',
          req.user.id
        ]);
        
        // Link media to post
        await conn.query(`
          INSERT INTO post_media (post_id, media_id, display_order)
          VALUES (?, ?, ?)
        `, [postId, mediaResult.insertId, 0]);
      }
      
      // Handle tags - FIXED to avoid NULL values
      if (tags && typeof tags === 'string' && tags.trim()) {
        const tagNames = tags.split(',')
          .map(tag => tag.trim().toLowerCase())
          .filter(tag => tag.length > 0);
        
        for (const tagName of tagNames) {
          if (!tagName) continue; // Skip empty tags
          
          // Find or create tag
          let tagId;
          const [existingTag] = await conn.query('SELECT id FROM tags WHERE name = ?', [tagName]);
          
          if (existingTag.length > 0) {
            tagId = existingTag[0].id;
          } else {
            const [newTag] = await conn.query('INSERT INTO tags (name) VALUES (?)', [tagName]);
            tagId = newTag.insertId;
          }
          
          if (tagId && postId) {
            // Link tag to post - ensure both IDs are provided
            await conn.query('INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?)', [postId, tagId]);
          }
        }
      }
      
      await conn.commit();
      req.flash('success', 'Post created successfully!');
      res.redirect('/social/feed');
    } catch (error) {
      await conn.rollback();
      console.error('Transaction error:', error); // Log the detailed error
      throw error;
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Error creating post:', error);
    req.flash('error', `Failed to create post: ${error.message}`);
    res.redirect('/social/feed');
  }
});

// API endpoint to get characters for the current user
router.get('/user/characters', isAuthenticated, async (req, res) => {
  try {
    const characters = await req.db.query(
      'SELECT id, name, avatar_url FROM characters WHERE created_by = ?',
      [req.user.id]
    );
    
    res.json({
      success: true,
      characters
    });
  } catch (error) {
    console.error('Error fetching user characters:', error);
    res.status(500).json({ error: 'Failed to fetch characters' });
  }
});

// Set active character for the user session
router.post('/set-active-character', isAuthenticated, async (req, res) => {
  try {
    // Handle missing request body
    if (!req.body) {
      req.session.activeCharacterId = null;
      return res.json({ success: true, active: false });
    }
    
    const { characterId } = req.body;
    
    // Check if we're already using this character - no need to update
    if (req.session.activeCharacterId === characterId) {
      return res.json({
        success: true,
        active: !!characterId,
        character: req.session.activeCharacter || null
      });
    }
    
    if (!characterId) {
      // If no characterId, clear the active character
      req.session.activeCharacterId = null;
      return res.json({ success: true, active: false });
    }
    
    // Verify the character belongs to the user
    const [character] = await req.db.query(
      'SELECT id, name, avatar_url, url FROM characters WHERE id = ? AND created_by = ?',
      [characterId, req.user.id]
    );
    
    if (character.length === 0) {
      return res.status(403).json({ error: 'Character not found or not owned by you' });
    }
    
    // Set active character in session
    req.session.activeCharacterId = characterId;
    req.session.activeCharacter = character[0];
    
    res.json({
      success: true,
      active: true,
      character: character[0]
    });
  } catch (error) {
    console.error('Error setting active character:', error);
    res.status(500).json({ error: 'Failed to set active character' });
  }
});

// Get active character - optimize to return cached data when possible
router.get('/active-character', isAuthenticated, async (req, res) => {
  try {
    if (!req.session.activeCharacterId) {
      return res.json({ active: false });
    }
    
    // If we already have the character data in session, return that directly
    if (req.session.activeCharacter) {
      return res.json({
        active: true,
        character: req.session.activeCharacter,
        fromCache: true
      });
    }
    
    // Otherwise, fetch from database
    const [character] = await req.db.query(
      'SELECT id, name, avatar_url, url FROM characters WHERE id = ? AND created_by = ?',
      [req.session.activeCharacterId, req.user.id]
    );
    
    if (character.length === 0) {
      req.session.activeCharacterId = null;
      return res.json({ active: false });
    }
    
    // Cache the character data in session
    req.session.activeCharacter = character[0];
    
    res.json({
      active: true,
      character: character[0]
    });
  } catch (error) {
    console.error('Error fetching active character:', error);
    res.status(500).json({ error: 'Failed to fetch active character' });
  }
});

// New endpoint to get character stats
router.get('/character/:id/stats', isAuthenticated, async (req, res) => {
  try {
    const characterId = req.params.id;
    
    // Verify the character belongs to the user
    const [characterCheck] = await req.db.query(
      'SELECT id FROM characters WHERE id = ? AND created_by = ?',
      [characterId, req.user.id]
    );
    
    if (characterCheck.length === 0) {
      return res.status(403).json({ 
        success: false, 
        error: 'Character not found or not owned by you' 
      });
    }
    
    // Get post count for this character
    const [postCount] = await req.db.query(
      'SELECT COUNT(*) as count FROM posts WHERE character_id = ?',
      [characterId]
    );
    
    // Get follower count for this character
    const [followerCount] = await req.db.query(
      'SELECT COUNT(*) as count FROM follows WHERE character_id = ?',
      [characterId]
    );
    
    // Get following count for this character
    const [followingCount] = await req.db.query(
      'SELECT COUNT(*) as count FROM follows WHERE follower_id = ? AND character_id IS NULL',
      [req.user.id]
    );
    
    res.json({
      success: true,
      stats: {
        posts: postCount[0].count || 0,
        followers: followerCount[0].count || 0,
        following: followingCount[0].count || 0
      }
    });
  } catch (error) {
    console.error('Error fetching character stats:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch character stats' 
    });
  }
});

// Like a post
router.post('/post/:id/like', isAuthenticated, async (req, res) => {
  const postId = req.params.id;
  const { characterId } = req.body;
  
  try {
    // Require character ID for likes
    if (!characterId) {
      return res.status(400).json({ error: 'Character selection required' });
    }
    
    // Verify the character belongs to the user
    const [characterCheck] = await req.db.query(
      'SELECT id FROM characters WHERE id = ? AND created_by = ?',
      [characterId, req.user.id]
    );
    
    if (characterCheck.length === 0) {
      return res.status(400).json({ error: 'Invalid character' });
    }
    
    // Check if user has already liked the post with this character
    const existingLike = await req.db.query(
      'SELECT id FROM post_likes WHERE post_id = ? AND user_id = ? AND character_id = ?',
      [postId, req.user.id, characterId]
    );
    
    if (existingLike.length > 0) {
      // Unlike if already liked
      await req.db.query(
        'DELETE FROM post_likes WHERE post_id = ? AND user_id = ? AND character_id = ?',
        [postId, req.user.id, characterId]
      );
      res.json({ liked: false });
    } else {
      // Like the post
      await req.db.query(
        'INSERT INTO post_likes (post_id, user_id, character_id) VALUES (?, ?, ?)',
        [postId, req.user.id, characterId]
      );
      res.json({ liked: true });
    }
  } catch (error) {
    console.error('Error liking post:', error);
    res.status(500).json({ error: 'Failed to process like' });
  }
});

// Add comment to post
router.post('/post/:id/comment', isAuthenticated, async (req, res) => {
  const postId = req.params.id;
  const { content, characterId, parentId } = req.body;
  
  try {
    // Require character ID for comments
    if (!characterId) {
      return res.status(400).json({ error: 'Character selection required' });
    }
    
    // Verify the character belongs to the user
    const [characterCheck] = await req.db.query(
      'SELECT id FROM characters WHERE id = ? AND created_by = ?',
      [characterId, req.user.id]
    );
    
    if (characterCheck.length === 0) {
      return res.status(400).json({ error: 'Invalid character' });
    }
    
    const result = await req.db.query(
      `INSERT INTO comments (post_id, user_id, character_id, content, parent_id) 
       VALUES (?, ?, ?, ?, ?)`,
      [postId, req.user.id, characterId, content, parentId || null]
    );
    
    // Get the created comment with user and character info
    const [comment] = await req.db.query(`
      SELECT 
        c.*,
        u.username,
        ch.name as character_name,
        ch.avatar_url as character_avatar
      FROM comments c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN characters ch ON c.character_id = ch.id
      WHERE c.id = ?
    `, [result.insertId]);
    
    res.json({ success: true, comment });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Get posts by tag
router.get('/tag/:tagName', isAuthenticated, async (req, res) => {
  const { tagName } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;
  
  try {
    const posts = await req.db.query(`
      SELECT 
        p.*,
        u.username,
        c.name as character_name,
        c.avatar_url as character_avatar,
        (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as like_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
        (SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = ? LIMIT 1) as liked
      FROM posts p
      JOIN users u ON p.author_id = u.id
      LEFT JOIN characters c ON p.character_id = c.id
      JOIN post_tags pt ON p.id = pt.post_id
      JOIN tags t ON pt.tag_id = t.id
      WHERE t.name = ? AND p.privacy = 'public'
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `, [req.user.id, tagName, limit, offset]);
    
    res.render('social/tag', {
      title: `#${tagName}`,
      tag: tagName,
      posts,
      user: req.user,
      page,
      hasMore: posts.length === limit
    });
  } catch (error) {
    console.error('Error fetching tag posts:', error);
    req.flash('error', 'Failed to load posts for this tag');
    res.redirect('/social/feed');
  }
});

// Get profile page
router.get('/profile/:username', async (req, res) => {
  const { username } = req.params;
  
  try {
    // Get user information
    const [profile] = await req.db.query('SELECT id, username, created_at FROM users WHERE username = ?', [username]);
    
    if (!profile) {
      req.flash('error', 'User not found');
      return res.redirect('/social/feed');
    }
    
    // Get user's posts
    const posts = await req.db.query(`
      SELECT 
        p.*,
        u.username,
        c.name as character_name,
        c.avatar_url as character_avatar,
        (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as like_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
      FROM posts p
      JOIN users u ON p.author_id = u.id
      LEFT JOIN characters c ON p.character_id = c.id
      WHERE p.author_id = ? AND (
        p.privacy = 'public'
        ${req.user && req.user.id === profile.id ? ' OR p.privacy IN ("followers", "private")' : ''}
        ${req.user && req.user.id !== profile.id ? ` OR (p.privacy = 'followers' AND EXISTS (
          SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?
        ))` : ''}
      )
      ORDER BY p.created_at DESC
    `, [profile.id, ...(req.user && req.user.id !== profile.id ? [req.user.id, profile.id] : [])]);
    
    // Get followers and following count
    const [followerCount] = await req.db.query(
      'SELECT COUNT(*) as count FROM follows WHERE following_id = ? AND character_id IS NULL',
      [profile.id]
    );
    
    const [followingUsersCount] = await req.db.query(
      'SELECT COUNT(*) as count FROM follows WHERE follower_id = ? AND following_id IS NOT NULL',
      [profile.id]
    );
    
    const [followingCharactersCount] = await req.db.query(
      'SELECT COUNT(*) as count FROM follows WHERE follower_id = ? AND character_id IS NOT NULL',
      [profile.id]
    );
    
    // Check if logged in user is following this profile
    let isFollowing = false;
    if (req.user) {
      const [followCheck] = await req.db.query(
        'SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?',
        [req.user.id, profile.id]
      );
      isFollowing = followCheck.length > 0;
    }
    
    // Get user's characters (if public)
    const characters = await req.db.query(`
      SELECT * FROM characters
      WHERE created_by = ? AND (
        is_private = FALSE
        ${req.user && req.user.id === profile.id ? ' OR is_private = TRUE' : ''}
      )
    `, [profile.id]);
    
    res.render('social/profile', {
      title: `${profile.username}'s Profile`,
      profile: {
        ...profile,
        followerCount: followerCount.count,
        followingCount: followingUsersCount.count + followingCharactersCount.count,
        isFollowing
      },
      posts,
      characters,
      user: req.user
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    req.flash('error', 'Failed to load profile');
    res.redirect('/social/feed');
  }
});

// Follow/unfollow user
router.post('/follow/:userId', isAuthenticated, async (req, res) => {
  const userId = req.params.userId;
  
  try {
    // Check if already following
    const existingFollow = await req.db.query(
      'SELECT id FROM follows WHERE follower_id = ? AND following_id = ?',
      [req.user.id, userId]
    );
    
    if (existingFollow.length > 0) {
      // Unfollow
      await req.db.query(
        'DELETE FROM follows WHERE follower_id = ? AND following_id = ?',
        [req.user.id, userId]
      );
      res.json({ following: false });
    } else {
      // Follow
      await req.db.query(
        'INSERT INTO follows (follower_id, following_id) VALUES (?, ?)',
        [req.user.id, userId]
      );
      res.json({ following: true });
    }
  } catch (error) {
    console.error('Error following/unfollowing user:', error);
    res.status(500).json({ error: 'Failed to process follow request' });
  }
});

// Follow/unfollow character
router.post('/follow/character/:characterId', isAuthenticated, async (req, res) => {
  const characterId = req.params.characterId;
  
  try {
    // Check if already following
    const existingFollow = await req.db.query(
      'SELECT id FROM follows WHERE follower_id = ? AND character_id = ?',
      [req.user.id, characterId]
    );
    
    if (existingFollow.length > 0) {
      // Unfollow
      await req.db.query(
        'DELETE FROM follows WHERE follower_id = ? AND character_id = ?',
        [req.user.id, characterId]
      );
      res.json({ following: false });
    } else {
      // Follow
      await req.db.query(
        'INSERT INTO follows (follower_id, character_id) VALUES (?, ?)',
        [req.user.id, characterId]
      );
      res.json({ following: true });
    }
  } catch (error) {
    console.error('Error following/unfollowing character:', error);
    res.status(500).json({ error: 'Failed to process follow request' });
  }
});

// Get events page
router.get('/events', isAuthenticated, async (req, res) => {
  try {
    // Add error handling for potentially missing columns
    let events = [];
    try {
      events = await req.db.query(`
        SELECT 
          p.id, p.title, p.content, 
          p.event_date, p.event_time, p.event_location,
          u.username,
          c.name as character_name, c.avatar_url as character_avatar,
          (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as like_count,
          (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
        FROM posts p
        JOIN users u ON p.author_id = u.id
        LEFT JOIN characters c ON p.character_id = c.id
        WHERE p.post_type = 'event'
          AND p.event_date IS NOT NULL
          AND p.event_date >= CURDATE()
          AND (p.privacy = 'public' 
            OR p.author_id = ?
            OR (p.privacy = 'followers' AND EXISTS (
              SELECT 1 FROM follows WHERE follower_id = ? AND following_id = p.author_id
            ))
          )
        ORDER BY p.event_date
      `, [req.user.id, req.user.id]);
    } catch (eventError) {
      console.error('Error fetching events, might need schema update:', eventError);
      // Return empty array if the columns don't exist yet
      events = [];
    }
    
    res.render('social/events', {
      title: 'Events',
      events,
      user: req.user
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    req.flash('error', 'Failed to load events');
    res.redirect('/social/feed');
  }
});

// Vote on a poll
router.post('/post/:id/vote', isAuthenticated, async (req, res) => {
  const postId = req.params.id;
  const { characterId, optionId } = req.body;
  
  try {
    // Validate input
    if (!characterId || !optionId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Character selection and poll option required' 
      });
    }
    
    // Verify the character belongs to the user
    const [characterCheck] = await req.db.query(
      'SELECT id FROM characters WHERE id = ? AND created_by = ?',
      [characterId, req.user.id]
    );
    
    if (characterCheck.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid character selection' 
      });
    }
    
    // Start a transaction for consistency
    const conn = await req.db.getConnection();
    await conn.beginTransaction();
    
    try {
      // First ensure poll_votes table exists
      await conn.query(`
        CREATE TABLE IF NOT EXISTS poll_votes (
          id INT AUTO_INCREMENT PRIMARY KEY,
          option_id INT NOT NULL,
          user_id INT NOT NULL,
          character_id INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY vote_once (option_id, user_id, character_id),
          FOREIGN KEY (option_id) REFERENCES poll_options(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
        )
      `);

      // Check if user has already voted on this poll with this character
      // Use a safer check that doesn't require joining with a table that might not exist
      const [existingVotes] = await conn.query(`
        SELECT COUNT(*) as vote_count
        FROM poll_votes pv
        INNER JOIN poll_options po ON pv.option_id = po.id
        WHERE po.post_id = ? AND pv.user_id = ? AND pv.character_id = ?
      `, [postId, req.user.id, characterId]);
      
      if (existingVotes[0].vote_count > 0) {
        await conn.rollback();
        return res.status(400).json({ 
          success: false, 
          message: 'You have already voted on this poll with this character' 
        });
      }
      
      // Verify the option belongs to this post
      const [optionCheck] = await conn.query(`
        SELECT id FROM poll_options WHERE id = ? AND post_id = ?
      `, [optionId, postId]);
      
      if (optionCheck.length === 0) {
        await conn.rollback();
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid poll option' 
        });
      }
      
      // Record the vote
      await conn.query(`
        INSERT INTO poll_votes (option_id, user_id, character_id)
        VALUES (?, ?, ?)
      `, [optionId, req.user.id, characterId]);
      
      // Increment the vote count for this option
      await conn.query(`
        UPDATE poll_options SET votes = votes + 1 WHERE id = ?
      `, [optionId]);
      
      // Get updated results to return to client
      const [options] = await conn.query(`
        SELECT id, text, votes FROM poll_options WHERE post_id = ?
      `, [postId]);
      
      const totalVotes = options.reduce((sum, option) => sum + option.votes, 0);
      
      // Calculate percentages for display
      const pollResults = {
        totalVotes,
        options: options.map(option => ({
          id: option.id,
          text: option.text,
          votes: option.votes,
          percentage: totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0,
          userVoted: parseInt(option.id) === parseInt(optionId) // Mark which option the user voted for
        }))
      };
      
      await conn.commit();
      
      res.json({
        success: true,
        message: 'Vote recorded successfully',
        pollResults
      });
    } catch (error) {
      await conn.rollback();
      console.error('Error processing poll vote:', error);
      throw error;
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Error voting on poll:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to process vote: ' + error.message
    });
  }
});

// Respond to an event (interested or going)
router.post('/post/:id/event-response', isAuthenticated, async (req, res) => {
  const postId = req.params.id;
  const { characterId, responseType } = req.body;
  
  try {
    // Validate input
    if (!characterId || !responseType || !['interested', 'going'].includes(responseType)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Character selection and valid response type required' 
      });
    }
    
    // Verify the character belongs to the user
    const [characterCheck] = await req.db.query(
      'SELECT id FROM characters WHERE id = ? AND created_by = ?',
      [characterId, req.user.id]
    );
    
    if (characterCheck.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid character selection' 
      });
    }
    
    // Verify the post is an event
    const [postCheck] = await req.db.query(
      'SELECT id FROM posts WHERE id = ? AND post_type = "event"',
      [postId]
    );
    
    if (postCheck.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid event post' 
      });
    }
    
    // Start a transaction for consistency
    const conn = await req.db.getConnection();
    await conn.beginTransaction();
    
    try {
      // First ensure event_responses table exists
      await conn.query(`
        CREATE TABLE IF NOT EXISTS event_responses (
          id INT AUTO_INCREMENT PRIMARY KEY,
          post_id INT NOT NULL,
          user_id INT NOT NULL,
          character_id INT NOT NULL,
          response_type ENUM('interested', 'going') NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY unique_response (post_id, user_id, character_id),
          FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
        )
      `);

      // Check if user has already responded to this event with this character
      const [existingResponse] = await conn.query(`
        SELECT id, response_type FROM event_responses 
        WHERE post_id = ? AND user_id = ? AND character_id = ?
      `, [postId, req.user.id, characterId]);
      
      if (existingResponse.length > 0) {
        // Update the existing response if different, otherwise remove it (toggle)
        if (existingResponse[0].response_type !== responseType) {
          await conn.query(`
            UPDATE event_responses 
            SET response_type = ? 
            WHERE id = ?
          `, [responseType, existingResponse[0].id]);
          
          await conn.commit();
          return res.json({
            success: true,
            message: `Response updated to ${responseType}`,
            status: responseType,
            changed: true
          });
        } else {
          // Same response type means toggle off
          await conn.query(`
            DELETE FROM event_responses 
            WHERE id = ?
          `, [existingResponse[0].id]);
          
          await conn.commit();
          return res.json({
            success: true,
            message: 'Response removed',
            status: 'none',
            changed: true
          });
        }
      } else {
        // Record new response
        await conn.query(`
          INSERT INTO event_responses (post_id, user_id, character_id, response_type)
          VALUES (?, ?, ?, ?)
        `, [postId, req.user.id, characterId, responseType]);
        
        await conn.commit();
        return res.json({
          success: true,
          message: `Marked as ${responseType}`,
          status: responseType,
          changed: true
        });
      }
    } catch (error) {
      await conn.rollback();
      console.error('Error processing event response:', error);
      throw error;
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Error responding to event:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to process event response: ' + error.message
    });
  }
});

// Get event responses for a post
router.get('/post/:id/event-responses', isAuthenticated, async (req, res) => {
  const postId = req.params.id;
  
  try {
    // Create table if it doesn't exist (to avoid errors)
    await req.db.query(`
      CREATE TABLE IF NOT EXISTS event_responses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        post_id INT NOT NULL,
        user_id INT NOT NULL,
        character_id INT NOT NULL,
        response_type ENUM('interested', 'going') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_response (post_id, user_id, character_id),
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
      )
    `);
    
    // Get counts by response type
    const [responses] = await req.db.query(`
      SELECT response_type, COUNT(*) as count
      FROM event_responses
      WHERE post_id = ?
      GROUP BY response_type
    `, [postId]);
    
    // Get user's current response if any
    const [userResponse] = await req.db.query(`
      SELECT character_id, response_type
      FROM event_responses
      WHERE post_id = ? AND user_id = ?
    `, [postId, req.user.id]);
    
    // Format the response data
    const interestedCount = responses.find(r => r.response_type === 'interested')?.count || 0;
    const goingCount = responses.find(r => r.response_type === 'going')?.count || 0;
    
    res.json({
      success: true,
      responses: {
        interested: interestedCount,
        going: goingCount,
        total: interestedCount + goingCount
      },
      userResponse: userResponse.length > 0 ? {
        characterId: userResponse[0].character_id,
        responseType: userResponse[0].response_type
      } : null
    });
  } catch (error) {
    console.error('Error fetching event responses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch event responses: ' + error.message
    });
  }
});

// Get single event page
router.get('/event/:id', isAuthenticated, async (req, res) => {
  const eventId = req.params.id;
  
  try {
    // Get the event post details
    const [eventPost] = await req.db.query(`
      SELECT 
        p.*,
        u.username,
        c.name as character_name, 
        c.avatar_url as character_avatar,
        c.url,
        (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as like_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
        (SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = ? LIMIT 1) as liked
      FROM posts p
      JOIN users u ON p.author_id = u.id
      LEFT JOIN characters c ON p.character_id = c.id
      WHERE p.id = ? AND p.post_type = 'event'
    `, [req.user.id, eventId]);
    
    if (!eventPost || eventPost.length === 0) {
      req.flash('error', 'Event not found');
      return res.redirect('/social/events');
    }
    
    const event = eventPost[0];
    
    // Get event response counts
    const [responses] = await req.db.query(`
      SELECT response_type, COUNT(*) as count
      FROM event_responses
      WHERE post_id = ?
      GROUP BY response_type
    `, [eventId]);
    
    // Format response data
    const interestedCount = responses.find(r => r.response_type === 'interested')?.count || 0;
    const goingCount = responses.find(r => r.response_type === 'going')?.count || 0;
    
    // Get user's current response if any
    const [userResponse] = await req.db.query(`
      SELECT character_id, response_type
      FROM event_responses
      WHERE post_id = ? AND user_id = ?
    `, [eventId, req.user.id]);
    
    // Get user's characters for responding
    const [characters] = await req.db.query(`
      SELECT id, name, avatar_url, url 
      FROM characters 
      WHERE created_by = ?
    `, [req.user.id]);
    
    // Get people who are going/interested
    const [attendees] = await req.db.query(`
      SELECT 
        er.response_type,
        u.id as user_id,
        u.username,
        c.id as character_id,
        c.name as character_name,
        c.avatar_url as character_avatar,
        c.url
      FROM event_responses er
      JOIN users u ON er.user_id = u.id
      JOIN characters c ON er.character_id = c.id
      WHERE er.post_id = ?
      ORDER BY er.created_at DESC
    `, [eventId]);
    
    const interestedAttendees = attendees.filter(a => a.response_type === 'interested');
    const goingAttendees = attendees.filter(a => a.response_type === 'going');
    
    // Get comments for the event
    const [comments] = await req.db.query(`
      SELECT 
        c.*,
        u.username,
        ch.name as character_name,
        ch.avatar_url as character_avatar,
        ch.url
      FROM comments c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN characters ch ON c.character_id = ch.id
      WHERE c.post_id = ? AND c.parent_id IS NULL
      ORDER BY c.created_at DESC
    `, [eventId]);
    
    res.render('social/event', {
      title: `Event: ${event.title}`,
      event,
      characters,
      user: req.user,
      stats: {
        interested: interestedCount,
        going: goingCount,
        total: interestedCount + goingCount
      },
      userResponse: userResponse.length > 0 ? {
        characterId: userResponse[0].character_id,
        responseType: userResponse[0].response_type
      } : null,
      interestedAttendees,
      goingAttendees,
      comments
    });
  } catch (error) {
    console.error('Error fetching event details:', error);
    req.flash('error', 'Failed to load event');
    res.redirect('/social/events');
  }
});

// Media URL validation and refresh endpoint
router.post('/media/refresh', isAuthenticated, async (req, res) => {
  try {
    const { mediaId, postId, mediaType } = req.body;
    
    if (!mediaId) {
      return res.status(400).json({
        success: false,
        error: 'Missing media ID'
      });
    }
    
    // Get the current media record
    const [media] = await req.db.query(
      'SELECT * FROM media WHERE id = ?',
      [mediaId]
    );
    
    if (media.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Media not found'
      });
    }
    
    const currentMedia = media[0];
    
    // For now, we'll implement a basic check to see if the URL is accessible
    // In a production environment, you might want to implement more sophisticated checks
    // or integrate with the specific video provider's API
    
    // For video URLs, we might need to generate a new signed URL if the service supports it
    if (currentMedia.type === 'video') {
      // Check if it's a YouTube URL that needs to be reformatted
      if (currentMedia.url.includes('youtube.com') || currentMedia.url.includes('youtu.be')) {
        // Extract the YouTube video ID
        let videoId = '';
        if (currentMedia.url.includes('youtube.com/watch?v=')) {
          videoId = currentMedia.url.split('v=')[1];
          if (videoId.includes('&')) {
            videoId = videoId.split('&')[0];
          }
        } else if (currentMedia.url.includes('youtu.be/')) {
          videoId = currentMedia.url.split('youtu.be/')[1];
          if (videoId.includes('?')) {
            videoId = videoId.split('?')[0];
          }
        }
        
        if (videoId) {
          // Create an embed URL which is more reliable than direct links
          const embedUrl = `https://www.youtube.com/embed/${videoId}`;
          
          // Update the media record
          await req.db.query(
            'UPDATE media SET url = ?, updated_at = NOW() WHERE id = ?',
            [embedUrl, mediaId]
          );
          
          return res.json({
            success: true,
            media: {
              id: currentMedia.id,
              url: embedUrl,
              type: currentMedia.type
            }
          });
        }
      }
      
      // For other video services, you would implement similar service-specific logic
      // For example, for Vimeo, you might need to regenerate access tokens
      
      // For now, just return the current URL with a timestamp to force reload
      return res.json({
        success: true,
        media: {
          id: currentMedia.id,
          url: `${currentMedia.url}${currentMedia.url.includes('?') ? '&' : '?'}_t=${Date.now()}`,
          type: currentMedia.type
        }
      });
    } 
    // For images, we can check if they're still valid and possibly update them
    else if (currentMedia.type === 'image') {
      return res.json({
        success: true,
        media: {
          id: currentMedia.id,
          url: currentMedia.url,
          type: currentMedia.type
        }
      });
    }
    
    // Default response
    return res.json({
      success: true,
      media: currentMedia
    });
  } catch (error) {
    console.error('Error refreshing media URL:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh media URL'
    });
  }
});

module.exports = router;
