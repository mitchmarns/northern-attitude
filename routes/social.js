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
    
    // Get the filter type from query string (all, following, team)
    const filter = req.query.filter || 'all';
    const activeCharacterId = req.query.characterId || req.session.activeCharacterId || null;
    
    console.log(`Feed filter: ${filter}, Active character: ${activeCharacterId}`);
    
    // Base query parts
    let querySelect = `
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
    `;
    
    let queryParams = [req.user.id];
    
    // Apply filter conditions
    if (filter === 'following' && activeCharacterId) {
      // Following filter: Show posts from users/characters followed by active character
      querySelect += `
        LEFT JOIN character_follows cf ON (cf.follower_character_id = ? AND (
          cf.followed_character_id = p.character_id OR 
          cf.followed_character_id IN (SELECT id FROM characters WHERE created_by = p.author_id)
        ))
        LEFT JOIN follows f ON (f.follower_id = ? AND (
          f.following_id = p.author_id OR 
          f.character_id = p.character_id
        ))
        WHERE (cf.id IS NOT NULL OR f.id IS NOT NULL)
      `;
      queryParams.push(activeCharacterId, req.user.id);
    } else if (filter === 'team') {
      // Team filter: Show posts only from user's team/organization
      querySelect += `
        WHERE p.author_id IN (
          SELECT user_id FROM team_members WHERE team_id IN (
            SELECT team_id FROM team_members WHERE user_id = ?
          )
        )
      `;
      queryParams.push(req.user.id);
    } else {
      // Default (all) filter: Show public posts or followed posts
      querySelect += `
        WHERE p.privacy = 'public' 
          OR p.author_id = ?
          OR (p.privacy = 'followers' AND EXISTS (
            SELECT 1 FROM follows WHERE follower_id = ? AND following_id = p.author_id
          ))
      `;
      queryParams.push(req.user.id, req.user.id);
    }
    
    // Add ordering and limit
    querySelect += `
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;
    queryParams.push(limit, offset);

    // Fixed: Properly handle the query result array
    const [posts] = await req.db.query(querySelect, queryParams);
    
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
    
    // Get suggested users - Replace with better suggested characters query
    // Now excludes currently selected character and already followed characters
    let suggestedUsers = []; // Change from const to let to allow reassignment
    try {
      // First check if follows table exists
      const [followsTableCheck] = await req.db.query(`
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = DATABASE() 
        AND table_name = 'follows'
      `);
      
      // Get the active character ID from session (if any)
      const activeCharacterId = req.session.activeCharacterId || null;
      console.log('Active character ID for suggestions exclusion:', activeCharacterId);
      
      if (followsTableCheck && followsTableCheck.length > 0) {
        // If follows table exists, use a query that properly excludes followed characters
        [suggestedUsers] = await req.db.query(`
          SELECT 
            c.id, 
            c.name, 
            c.avatar_url, 
            c.url, 
            c.created_by,
            u.username as creator_username, 
            0 as is_following
          FROM characters c
          JOIN users u ON c.created_by = u.id
          WHERE c.created_by != ? 
            AND c.id != IFNULL(?, -1)
            AND NOT EXISTS (
              SELECT 1 FROM follows 
              WHERE follower_id = ? 
              AND character_id = c.id
            )
          ORDER BY RAND()
          LIMIT 5
        `, [req.user.id, activeCharacterId, req.user.id]);
        
        console.log('Using optimized query with follows table');
      } else {
        // Fallback query for when follows table doesn't exist yet
        [suggestedUsers] = await req.db.query(`
          SELECT 
            c.id, 
            c.name, 
            c.avatar_url, 
            c.url, 
            c.created_by,
            u.username as creator_username,
            0 as is_following
          FROM characters c
          JOIN users u ON c.created_by = u.id
          WHERE c.created_by != ?
            AND c.id != IFNULL(?, -1)
          ORDER BY RAND()
          LIMIT 5
        `, [req.user.id, activeCharacterId]);
        
        console.log('Using fallback query without follows check');
      }
      
      console.log('Suggested characters query executed with params:', req.user.id, activeCharacterId);
      console.log('Found suggested users count:', suggestedUsers ? suggestedUsers.length : 0);

      // If still no results, try one more approach with minimal filtering
      if (!suggestedUsers || suggestedUsers.length === 0) {
        console.log('No characters found with main queries, trying minimal filtering query...');
        
        [suggestedUsers] = await req.db.query(`
          SELECT 
            c.id, c.name, c.avatar_url, c.url, c.created_by, 
            u.username as creator_username,
            0 as is_following
          FROM characters c
          JOIN users u ON c.created_by = u.id
          WHERE c.id != IFNULL(?, -1)
          LIMIT 5
        `, [activeCharacterId]);
        
        console.log('Final fallback query found:', suggestedUsers ? suggestedUsers.length : 0, 'characters');
      }

      // Now manually filter out the active character and any followed characters if needed
      if (suggestedUsers && suggestedUsers.length > 0) {
        try {
          // Get the list of followed character IDs
          const [followed] = await req.db.query(`
            SELECT character_id FROM follows 
            WHERE follower_id = ? AND character_id IS NOT NULL
          `, [req.user.id]);
          
          const followedIds = followed.map(f => f.character_id);
          console.log('Followed character IDs:', followedIds);
          
          // Filter out the active character and followed characters
          suggestedUsers = suggestedUsers.filter(char => {
            // Skip if this is the active character
            if (activeCharacterId && char.id === parseInt(activeCharacterId)) {
              console.log(`Filtering out active character ${char.id}`);
              return false;
            }
            
            // Skip if user is already following this character
            if (followedIds.includes(char.id)) {
              console.log(`Filtering out followed character ${char.id}`);
              return false;
            }
            
            return true;
          });
          
          console.log('After manual filtering, suggested users count:', suggestedUsers.length);
        } catch (filterError) {
          console.error('Error during manual filtering:', filterError);
          // Continue with unfiltered results
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
      filter: filter, // Pass the current filter to the template
      activeCharacterId: activeCharacterId, // Pass the active character ID
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

// New endpoint to fetch posts with filter
router.get('/posts/filtered', isAuthenticated, async (req, res) => {
  try {
    const filter = req.query.filter || 'all';
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;
    const characterId = req.query.characterId || req.session.activeCharacterId || null;
    
    console.log(`Fetching filtered posts: ${filter}, Page: ${page}, Character ID: ${characterId}`);
    
    // Base query parts
    let querySelect = `
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
    `;
    
    let queryParams = [req.user.id];
    
    // Apply filter conditions
    if (filter === 'following' && characterId) {
      // Following filter: Show posts from users/characters followed by active character
      querySelect += `
        LEFT JOIN character_follows cf ON (cf.follower_character_id = ? AND (
          cf.followed_character_id = p.character_id OR 
          cf.followed_character_id IN (SELECT id FROM characters WHERE created_by = p.author_id)
        ))
        LEFT JOIN follows f ON (f.follower_id = ? AND (
          f.following_id = p.author_id OR 
          f.character_id = p.character_id
        ))
        WHERE (cf.id IS NOT NULL OR f.id IS NOT NULL)
      `;
      queryParams.push(characterId, req.user.id);
    } else if (filter === 'team') {
      // Team filter: Show posts only from user's team/organization
      querySelect += `
        WHERE p.author_id IN (
          SELECT user_id FROM team_members WHERE team_id IN (
            SELECT team_id FROM team_members WHERE user_id = ?
          )
        )
      `;
      queryParams.push(req.user.id);
    } else {
      // Default (all) filter: Show public posts or followed posts
      querySelect += `
        WHERE p.privacy = 'public' 
          OR p.author_id = ?
          OR (p.privacy = 'followers' AND EXISTS (
            SELECT 1 FROM follows WHERE follower_id = ? AND following_id = p.author_id
          ))
      `;
      queryParams.push(req.user.id, req.user.id);
    }
    
    // Add ordering and limit
    querySelect += `
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;
    queryParams.push(limit, offset);
    
    // Execute query
    const [posts] = await req.db.query(querySelect, queryParams);
    
    // Process posts (media, tags, comments, etc.)
    if (posts && posts.length > 0) {
      const postIds = posts.map(post => post.id);
      
      // Get media for posts
      try {
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
        
        // Attach media to corresponding posts
        posts.forEach(post => {
          post.media = media.filter(m => m.post_id === post.id);
        });
      } catch (mediaError) {
        console.error('Error fetching media:', mediaError);
        posts.forEach(post => post.media = []);
      }
      
      // Get tags for posts
      try {
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
      } catch (tagsError) {
        console.error('Error fetching tags:', tagsError);
        posts.forEach(post => post.tags = []);
      }
      
      // Get comments for posts
      try {
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
      } catch (commentsError) {
        console.error('Error fetching comments:', commentsError);
        posts.forEach(post => post.comments = []);
      }
      
      // Process poll options if any post is a poll
      const pollPosts = posts.filter(post => post.post_type === 'poll');
      if (pollPosts.length > 0) {
        try {
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
        } catch (pollError) {
          console.error('Error processing polls:', pollError);
        }
      }
    }
    
    // Return JSON response with posts and pagination info
    res.json({
      success: true,
      posts: posts || [],
      pagination: {
        page,
        hasMore: posts && posts.length === limit
      },
      filter
    });
  } catch (error) {
    console.error('Error fetching filtered posts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load posts',
      message: error.message
    });
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

// Improved endpoint to get character stats to accurately reflect "You Follow" count
router.get('/character/:id/stats', isAuthenticated, async (req, res) => {
  try {
    const characterId = req.params.id;
    
    // Validate the character ID
    if (!characterId || isNaN(parseInt(characterId))) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid character ID' 
      });
    }
    
    // Check if the character exists first
    const [characterExists] = await req.db.query(
      'SELECT id FROM characters WHERE id = ?',
      [characterId]
    );
    
    if (characterExists.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Character not found' 
      });
    }
    
    // Verify the character belongs to the user (now optional)
    // This allows stats to be viewed for any character, not just user's own characters
    const [characterCheck] = await req.db.query(
      'SELECT id FROM characters WHERE id = ? AND created_by = ?',
      [characterId, req.user.id]
    );
    
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
    
    // Get count of characters that this specific character follows
    // First check if character_follows table exists
    try {
      const [tableCheck] = await req.db.query(`
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = DATABASE() 
        AND table_name = 'character_follows'
      `);
      
      let followingCount = [{count: 0}]; // Default value
      
      if (tableCheck && tableCheck.length > 0) {
        // Table exists, query it
        [followingCount] = await req.db.query(`
          SELECT COUNT(*) as count 
          FROM character_follows 
          WHERE follower_character_id = ?
        `, [characterId]);
      } else {
        // Create character_follows table if it doesn't exist
        await req.db.query(`
          CREATE TABLE IF NOT EXISTS character_follows (
            id INT AUTO_INCREMENT PRIMARY KEY,
            follower_character_id INT NOT NULL,
            followed_character_id INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_character_follow (follower_character_id, followed_character_id),
            FOREIGN KEY (follower_character_id) REFERENCES characters(id) ON DELETE CASCADE,
            FOREIGN KEY (followed_character_id) REFERENCES characters(id) ON DELETE CASCADE
          )
        `);
      }
      
      // Return success with stats
      res.json({
        success: true,
        isOwnedByUser: characterCheck.length > 0,
        stats: {
          posts: postCount[0]?.count || 0,
          followers: followerCount[0]?.count || 0,
          following: followingCount[0]?.count || 0
        }
      });
    } catch (tableError) {
      console.error('Error checking/creating character_follows table:', tableError);
      // Still return available stats
      res.json({
        success: true,
        isOwnedByUser: characterCheck.length > 0,
        stats: {
          posts: postCount[0]?.count || 0,
          followers: followerCount[0]?.count || 0,
          following: 0 // Default if table doesn't exist
        }
      });
    }
  } catch (error) {
    console.error('Error fetching character stats:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch character stats',
      message: error.message 
    });
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

// Follow/unfollow character - Updated to use active character
router.post('/follow/character/:characterId', isAuthenticated, async (req, res) => {
  const targetCharacterId = req.params.characterId;
  const { sourceCharacterId } = req.body;  // Get the character doing the following
  
  try {
    console.log(`Follow request: Character ${sourceCharacterId} following character ${targetCharacterId}`);
    
    // Verify the source character belongs to the user
    const [sourceCharCheck] = await req.db.query(
      'SELECT id FROM characters WHERE id = ? AND created_by = ?',
      [sourceCharacterId, req.user.id]
    );
    
    if (sourceCharCheck.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid source character. Please select a character to follow with.'
      });
    }
    
    // Verify target character exists and is not the same as source
    const [targetCharCheck] = await req.db.query(
      'SELECT id FROM characters WHERE id = ?',
      [targetCharacterId]
    );
    
    if (targetCharCheck.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Target character not found'
      });
    }
    
    if (parseInt(sourceCharacterId) === parseInt(targetCharacterId)) {
      return res.status(400).json({
        success: false,
        error: 'A character cannot follow itself'
      });
    }
    
    // Create character_follows table if it doesn't exist
    await req.db.query(`
      CREATE TABLE IF NOT EXISTS character_follows (
        id INT AUTO_INCREMENT PRIMARY KEY,
        follower_character_id INT NOT NULL,
        followed_character_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_character_follow (follower_character_id, followed_character_id),
        FOREIGN KEY (follower_character_id) REFERENCES characters(id) ON DELETE CASCADE,
        FOREIGN KEY (followed_character_id) REFERENCES characters(id) ON DELETE CASCADE
      )
    `);
    
    // Check if already following
    const [existingFollow] = await req.db.query(`
      SELECT id FROM character_follows 
      WHERE follower_character_id = ? AND followed_character_id = ?
    `, [sourceCharacterId, targetCharacterId]);
    
    console.log(`Existing character follow check result:`, existingFollow);
    
    if (existingFollow && existingFollow.length > 0) {
      // Unfollow
      console.log(`Character ${sourceCharacterId} unfollowing character ${targetCharacterId}`);
      await req.db.query(`
        DELETE FROM character_follows 
        WHERE follower_character_id = ? AND followed_character_id = ?
      `, [sourceCharacterId, targetCharacterId]);
      
      // Also update the follows table for compatibility
      await req.db.query(
        'DELETE FROM follows WHERE follower_id = ? AND character_id = ?',
        [req.user.id, targetCharacterId]
      );
      
      res.json({ 
        success: true,
        following: false,
        sourceCharacterId: sourceCharacterId,
        targetCharacterId: targetCharacterId
      });
    } else {
      // Follow
      console.log(`Character ${sourceCharacterId} following character ${targetCharacterId}`);
      const [result] = await req.db.query(`
        INSERT INTO character_follows (follower_character_id, followed_character_id) 
        VALUES (?, ?)
      `, [sourceCharacterId, targetCharacterId]);
      
      // Also update the follows table for compatibility
      await req.db.query(
        'INSERT INTO follows (follower_id, character_id) VALUES (?, ?)',
        [req.user.id, targetCharacterId]
      );
      
      console.log(`Insert result:`, result);
      res.json({
        success: true,
        following: true,
        sourceCharacterId: sourceCharacterId,
        targetCharacterId: targetCharacterId
      });
    }
  } catch (error) {
    console.error('Error following/unfollowing character:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to process follow request' 
    });
  }
});

// Check follow status for debugging
router.get('/follow/status/character/:characterId', isAuthenticated, async (req, res) => {
  const characterId = req.params.characterId;
  
  try {
    // Get the follow status
    const [followStatus] = await req.db.query(
      'SELECT id FROM follows WHERE follower_id = ? AND character_id = ?',
      [req.user.id, characterId]
    );
    
    const isFollowing = followStatus.length > 0;
    
    res.json({
      success: true,
      following: isFollowing,
      userId: req.user.id,
      characterId: characterId
    });
  } catch (error) {
    console.error('Error checking follow status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to check follow status' 
    });
  }
});

// NEW ENDPOINT: Check follow status for multiple characters at once
router.get('/check-follow-status', isAuthenticated, async (req, res) => {
  try {
    const { followerId, followingIds } = req.query;
    
    if (!followerId || !followingIds) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters (followerId and followingIds)' 
      });
    }
    
    // Convert followingIds to array if it's a string
    const followingIdArray = followingIds.includes(',') 
      ? followingIds.split(',') 
      : [followingIds];
    
    // Validate the follower ID belongs to the user making the request
    // This is a security check to prevent checking follow status for characters not owned by the user
    const [characterCheck] = await req.db.query(
      'SELECT id FROM characters WHERE id = ? AND created_by = ?',
      [followerId, req.user.id]
    );
    
    if (characterCheck.length === 0) {
      return res.status(403).json({ 
        success: false, 
        error: 'Not authorized to check follow status for this character' 
      });
    }
    
    // Create table if it doesn't exist (to avoid errors)
    await req.db.query(`
      CREATE TABLE IF NOT EXISTS character_follows (
        id INT AUTO_INCREMENT PRIMARY KEY,
        follower_character_id INT NOT NULL,
        followed_character_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_character_follow (follower_character_id, followed_character_id),
        FOREIGN KEY (follower_character_id) REFERENCES characters(id) ON DELETE CASCADE,
        FOREIGN KEY (followed_character_id) REFERENCES characters(id) ON DELETE CASCADE
      )
    `);
    
    // Get follow status for all the requested characters
    const [followStatuses] = await req.db.query(`
      SELECT 
        followed_character_id,
        1 as is_following
      FROM character_follows
      WHERE follower_character_id = ? 
      AND followed_character_id IN (?)
    `, [followerId, followingIdArray]);
    
    // Also check the traditional follows table
    const [userFollowStatuses] = await req.db.query(`
      SELECT 
        character_id,
        1 as is_following
      FROM follows
      WHERE follower_id = ? 
      AND character_id IN (?)
    `, [req.user.id, followingIdArray]);
    
    // Combine results from both tables
    const combinedStatuses = {};
    
    // Create a lookup object with default "not following" for all IDs
    followingIdArray.forEach(id => {
      combinedStatuses[id] = false;
    });
    
    // Update with character follows
    followStatuses.forEach(status => {
      combinedStatuses[status.followed_character_id] = true;
    });
    
    // Also update with user follows
    userFollowStatuses.forEach(status => {
      combinedStatuses[status.character_id] = true;
    });
    
    res.json({
      success: true,
      statuses: combinedStatuses
    });
  } catch (error) {
    console.error('Error checking follow status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to check follow status',
      message: error.message
    });
  }
});

// NEW ENDPOINT: Follow another character
router.post('/follow', isAuthenticated, async (req, res) => {
  try {
    const { followerId, followingId } = req.body;
    
    if (!followerId || !followingId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters'
      });
    }
    
    // Verify the source character belongs to the user
    const [sourceCharCheck] = await req.db.query(
      'SELECT id FROM characters WHERE id = ? AND created_by = ?',
      [followerId, req.user.id]
    );
    
    if (sourceCharCheck.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'You do not own this character'
      });
    }
    
    // Verify target character exists and is not the same as source
    const [targetCharCheck] = await req.db.query(
      'SELECT id FROM characters WHERE id = ?',
      [followingId]
    );
    
    if (targetCharCheck.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Target character not found'
      });
    }
    
    if (parseInt(followerId) === parseInt(followingId)) {
      return res.status(400).json({
        success: false,
        error: 'A character cannot follow itself'
      });
    }
    
    // Check if character_follows table exists, create if it doesn't
    await req.db.query(`
      CREATE TABLE IF NOT EXISTS character_follows (
        id INT AUTO_INCREMENT PRIMARY KEY,
        follower_character_id INT NOT NULL,
        followed_character_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_character_follow (follower_character_id, followed_character_id),
        FOREIGN KEY (follower_character_id) REFERENCES characters(id) ON DELETE CASCADE,
        FOREIGN KEY (followed_character_id) REFERENCES characters(id) ON DELETE CASCADE
      )
    `);
    
    // Check if already following - IMPORTANT: Do this before trying to insert
    const [existingFollow] = await req.db.query(`
      SELECT id FROM character_follows 
      WHERE follower_character_id = ? AND followed_character_id = ?
    `, [followerId, followingId]);
    
    if (existingFollow && existingFollow.length > 0) {
      // Instead of an error, return a success response indicating already following
      return res.json({
        success: true,
        alreadyFollowing: true,
        message: 'Already following this character'
      });
    }
    
    // Follow the character with transaction
    const connection = await req.db.getConnection();
    await connection.beginTransaction();
    
    try {
      // Add to character_follows table - Use INSERT IGNORE to prevent duplicate key errors
      await connection.query(`
        INSERT IGNORE INTO character_follows (follower_character_id, followed_character_id) 
        VALUES (?, ?)
      `, [followerId, followingId]);
      
      // Also update the follows table for compatibility - Use INSERT IGNORE here too
      await connection.query(`
        INSERT IGNORE INTO follows (follower_id, character_id) VALUES (?, ?)
      `, [req.user.id, followingId]);
      
      await connection.commit();
      
      res.json({
        success: true,
        message: 'Successfully followed character'
      });
    } catch (error) {
      await connection.rollback();
      
      // If the error is a duplicate entry, return a more meaningful response
      if (error.code === 'ER_DUP_ENTRY') {
        return res.json({
          success: true,
          alreadyFollowing: true,
          message: 'Already following this character'
        });
      }
      
      console.error('Transaction error:', error);
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error following character:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to follow character',
      message: error.message
    });
  }
});

// NEW ENDPOINT: Unfollow a character
router.post('/unfollow', isAuthenticated, async (req, res) => {
  try {
    const { followerId, followingId } = req.body;
    
    if (!followerId || !followingId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters'
      });
    }
    
    // Verify the source character belongs to the user
    const [sourceCharCheck] = await req.db.query(
      'SELECT id FROM characters WHERE id = ? AND created_by = ?',
      [followerId, req.user.id]
    );
    
    if (sourceCharCheck.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'You do not own this character'
      });
    }
    
    // Create connection for transaction
    const connection = await req.db.getConnection();
    await connection.beginTransaction();
    
    try {
      // Remove from character_follows table if it exists
      await connection.query(`
        DELETE FROM character_follows 
        WHERE follower_character_id = ? AND followed_character_id = ?
      `, [followerId, followingId]);
      
      // Also update the follows table for compatibility
      await connection.query(`
        DELETE FROM follows 
        WHERE follower_id = ? AND character_id = ?
      `, [req.user.id, followingId]);
      
      await connection.commit();
      
      res.json({
        success: true,
        message: 'Successfully unfollowed character'
      });
    } catch (error) {
      await connection.rollback();
      console.error('Transaction error:', error);
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error unfollowing character:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unfollow character',
      message: error.message
    });
  }
});

// NEW ENDPOINT: Get all characters with follow exclusion for wider search
router.get('/all-characters', isAuthenticated, async (req, res) => {
  try {
    const excludeCharacterId = req.query.exclude || null;
    const limit = parseInt(req.query.limit) || 8;
    
    // Get all characters except the excluded one, prioritize those not created by the user
    const [characters] = await req.db.query(`
      SELECT 
        c.id, c.name, c.avatar_url, c.url, c.created_by, 
        u.username as creator_username,
        CASE WHEN c.created_by = ? THEN 1 ELSE 0 END as is_own,
        0 as is_following
      FROM characters c
      JOIN users u ON c.created_by = u.id
      WHERE c.id != IFNULL(?, -1)
      ORDER BY is_own ASC, RAND()
      LIMIT ?
    `, [req.user.id, excludeCharacterId, limit]);
    
    // Get followed character IDs for exclusion (if needed in the future)
    const [followed] = await req.db.query(`
      SELECT character_id FROM follows 
      WHERE follower_id = ? AND character_id IS NOT NULL
    `, [req.user.id]);
    
    const followedIds = followed.map(f => f.character_id);
    
    res.json({
      success: true,
      characters: characters,
      followedIds: followedIds
    });
  } catch (error) {
    console.error('Error fetching all characters:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch characters'
    });
  }
});

// NEW ENDPOINT: Get suggested characters with exclusions
router.get('/suggested-characters', isAuthenticated, async (req, res) => {
  try {
    const excludeCharacterId = req.query.exclude || null;
    const retry = req.query.retry === 'true'; // Support broadening search criteria
    const limit = parseInt(req.query.limit) || 5;
    
    console.log(`Getting suggested characters. Excluding: ${excludeCharacterId}, Retry mode: ${retry}`);
    
    // Get currently active character (if any)
    const activeCharacterId = req.session.activeCharacterId || excludeCharacterId || null;
    
    // Start building the query with basic exclusions - REMOVED c.location field
    let query = `
      SELECT 
        c.id, 
        c.name, 
        c.avatar_url, 
        c.url,
        c.created_by,
        u.username as creator_username,
        0 as is_following
      FROM characters c
      JOIN users u ON c.created_by = u.id
      WHERE c.created_by != ? 
    `;
    
    const queryParams = [req.user.id];
    
    // Add exclusion for the active character
    if (excludeCharacterId) {
      query += ' AND c.id != ? ';
      queryParams.push(excludeCharacterId);
    }
    
    // Check if follows table exists and get followed characters
    const [followsTableCheck] = await req.db.query(`
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'follows'
    `);
    
    let followedCharacterIds = [];
    
    // Get characters already followed by the user's character
    if (followsTableCheck && followsTableCheck.length > 0) {
      // First from regular follows
      const [userFollows] = await req.db.query(`
        SELECT character_id FROM follows 
        WHERE follower_id = ? AND character_id IS NOT NULL
      `, [req.user.id]);
      
      if (userFollows && userFollows.length > 0) {
        followedCharacterIds = userFollows.map(follow => follow.character_id);
      }
      
      // Then also check character_follows table if it exists and if we have an active character
      if (activeCharacterId) {
        const [characterFollowsCheck] = await req.db.query(`
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = DATABASE() 
          AND table_name = 'character_follows'
        `);
        
        if (characterFollowsCheck && characterFollowsCheck.length > 0) {
          const [characterFollows] = await req.db.query(`
            SELECT followed_character_id 
            FROM character_follows 
            WHERE follower_character_id = ?
          `, [activeCharacterId]);
          
          if (characterFollows && characterFollows.length > 0) {
            // Add these IDs to our exclusion list
            characterFollows.forEach(follow => {
              if (!followedCharacterIds.includes(follow.followed_character_id)) {
                followedCharacterIds.push(follow.followed_character_id);
              }
            });
          }
        }
      }
      
      // Exclude already followed characters unless in retry mode
      if (followedCharacterIds.length > 0 && !retry) {
        query += ' AND c.id NOT IN (?) ';
        queryParams.push(followedCharacterIds);
      }
    }
    
    // Add ordering - in retry mode we use pure random
    if (retry) {
      query += ' ORDER BY RAND() ';
    } else {
      // In normal mode, we prioritize characters with similar tags/interests if possible
      // This is a placeholder for more sophisticated recommendation logic
      query += ' ORDER BY RAND() ';
    }
    
    // Add limit
    query += ' LIMIT ? ';
    queryParams.push(limit);
    
    console.log('Executing query:', query);
    console.log('With parameters:', queryParams);
    
    // Execute the query
    const [characters] = await req.db.query(query, queryParams);
    
    console.log(`Found ${characters.length} suggested characters`);
    
    // Add fallback approach if no results found
    if (!characters || characters.length === 0) {
      console.log('No characters found with main query, trying fallback approach...');
      
      // Try a simpler query without exclusions (except the current character)
      let fallbackQuery = `
        SELECT 
          c.id, 
          c.name, 
          c.avatar_url, 
          c.url,
          c.created_by,
          u.username as creator_username,
          0 as is_following
        FROM characters c
        JOIN users u ON c.created_by = u.id
        WHERE c.id != IFNULL(?, -1)
        ORDER BY RAND()
        LIMIT ?
      `;
      
      const [fallbackCharacters] = await req.db.query(fallbackQuery, [excludeCharacterId, limit]);
      
      console.log(`Fallback query found ${fallbackCharacters.length} characters`);
      
      // Return the fallback results
      return res.json({
        success: true,
        characters: fallbackCharacters || [],
        excludedId: excludeCharacterId,
        retry: retry,
        fallback: true
      });
    }
    
    // Return the found characters
    return res.json({
      success: true,
      characters: characters || [],
      excludedId: excludeCharacterId,
      retry: retry
    });
  } catch (error) {
    console.error('Error getting suggested characters:', error);
    
    // If the error is related to the field list, try a simplified query
    if (error.code === 'ER_BAD_FIELD_ERROR') {
      try {
        console.log('Error in field list, trying simplified query...');
        
        // Super simple query that should work with any schema
        const [safeCharacters] = await req.db.query(`
          SELECT 
            c.id, 
            c.name, 
            c.avatar_url, 
            c.url,
            c.created_by,
            u.username as creator_username
          FROM characters c
          JOIN users u ON c.created_by = u.id
          WHERE c.id != IFNULL(?, -1)
          ORDER BY RAND()
          LIMIT ?
        `, [req.query.exclude || null, parseInt(req.query.limit) || 5]);
        
        return res.json({
          success: true,
          characters: safeCharacters || [],
          excludedId: req.query.exclude || null,
          fallback: true
        });
      } catch (fallbackError) {
        console.error('Even simplified query failed:', fallbackError);
        // Return empty results rather than error
        return res.json({
          success: true,
          characters: [],
          error: 'Could not retrieve characters',
          message: fallbackError.message
        });
      }
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to get suggested characters',
      message: error.message
    });
  }
});

// Function to get unformatted SQL for debugging
function getSQL(query, params) {
  let sql = query;
  if (params) {
    params.forEach(param => {
      sql = sql.replace('?', typeof param === 'string' ? `'${param}'` : param);
    });
  }
  return sql;
}

module.exports = router;
