// social-routes.js
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../public/js/auth');
const { socialOperations } = require('../config/db');
const { characterOperations } = require('../config/db');

// Get characters for social feed
router.get('/characters', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's characters with team information
    const characters = await characterOperations.getUserCharacters(userId);
    
    res.status(200).json(characters);
  } catch (error) {
    console.error('Error fetching characters for social feed:', error);
    res.status(500).json({ message: 'Failed to load characters' });
  }
});

// Get social feed posts
router.get('/feed/:type', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const feedType = req.params.type || 'all';
    const characterId = req.query.characterId;
    const page = parseInt(req.query.page || '1');
    const limit = parseInt(req.query.limit || '10');
    
    if (!characterId) {
      return res.status(400).json({ message: 'Character ID is required' });
    }
    
    // Check if character belongs to user
    const isOwner = await characterOperations.isCharacterOwner(req.user.id, characterId);
    if (!isOwner) {
      return res.status(403).json({ message: 'You do not have permission to view this feed' });
    }
    
    // Get posts based on feed type
    let posts;
    switch (feedType) {
      case 'team':
        posts = await socialOperations.getTeamPosts(characterId, page, limit);
        break;
      case 'following':
        posts = await socialOperations.getFollowingPosts(characterId, page, limit);
        break;
      case 'all':
      default:
        posts = await socialOperations.getAllPosts(characterId, page, limit);
        break;
    }
    
    res.status(200).json({
      posts,
      pagination: {
        page,
        limit,
        hasMore: posts.length === limit
      }
    });
  } catch (error) {
    console.error('Error fetching social feed:', error);
    res.status(500).json({ message: 'Failed to load social feed', error: error.message });
  }
});

// Create a new post
router.post('/posts', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const { characterId, content, images, visibility } = req.body;
    
    if (!characterId || (!content && (!images || images.length === 0))) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Check if character belongs to user
    const isOwner = await characterOperations.isCharacterOwner(req.user.id, characterId);
    if (!isOwner) {
      return res.status(403).json({ message: 'You do not have permission to post as this character' });
    }
    
    // Create post in database - Modified to handle multiple images
    // This assumes your database schema has been updated to store an array of image URLs
    // or a JSON string representing the array
    const postId = await socialOperations.createPostWithImages(
      characterId, 
      content,
      images, // Now an array
      visibility
    );
    
    // Extract and save hashtags if any
    if (content) {
      const hashtags = socialOperations.extractHashtags(content);
      if (hashtags.length > 0) {
        await socialOperations.saveHashtags(postId, hashtags);
      }
      
      // Extract and save mentions if any
      const mentions = socialOperations.extractMentions(content);
      if (mentions.length > 0) {
        await socialOperations.saveMentions(postId, mentions);
      }
    }
    
    res.status(201).json({
      message: 'Post created successfully',
      postId
    });
  } catch (error) {
    console.error('Error creating social post:', error);
    res.status(500).json({ message: 'Failed to create post' });
  }
});

// Get trending hashtags
router.get('/trending-hashtags', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '5');
    const days = parseInt(req.query.days || '7');
    
    const hashtags = await socialOperations.getTrendingHashtags(limit, days);
    
    res.status(200).json(hashtags);
  } catch (error) {
    console.error('Error fetching trending hashtags:', error);
    res.status(500).json({ message: 'Failed to load trending hashtags' });
  }
});

// Get suggested follows for a character
router.get('/suggested-follows', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const characterId = req.query.characterId;
    const limit = parseInt(req.query.limit || '3');
    
    if (!characterId) {
      return res.status(400).json({ message: 'Character ID is required' });
    }
    
    // Check if character belongs to user
    const isOwner = await characterOperations.isCharacterOwner(req.user.id, characterId);
    if (!isOwner) {
      return res.status(403).json({ message: 'You do not have permission to access this data' });
    }
    
    const suggestions = await socialOperations.getSuggestedFollows(characterId, limit);
    
    res.status(200).json(suggestions);
  } catch (error) {
    console.error('Error fetching suggested follows:', error);
    res.status(500).json({ message: 'Failed to load suggested follows' });
  }
});

// Notifications route
router.get('/notifications-count', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const characterId = req.query.characterId;
    
    if (!characterId) {
      return res.status(400).json({ message: 'Character ID is required' });
    }
    
    // Check if character belongs to user
    const isOwner = await characterOperations.isCharacterOwner(req.user.id, characterId);
    if (!isOwner) {
      return res.status(403).json({ message: 'You do not have permission to view this' });
    }
    
    // Get notification count
    const notificationCount = await socialOperations.getNotificationsCount(characterId);
    
    res.status(200).json({ count: notificationCount });
  } catch (error) {
    console.error('Error fetching notifications count:', error);
    res.status(500).json({ message: 'Failed to load notifications' });
  }
});

// Toggle like on a post
router.post('/posts/:postId/like', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const postId = req.params.postId;
    const { characterId } = req.body;
    
    if (!characterId) {
      return res.status(400).json({ message: 'Character ID is required' });
    }
    
    // Check if character belongs to user
    const isOwner = await characterOperations.isCharacterOwner(req.user.id, characterId);
    if (!isOwner) {
      return res.status(403).json({ message: 'You do not have permission to perform this action' });
    }
    
    const result = await socialOperations.toggleLike(postId, characterId);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({ message: 'Failed to update like status' });
  }
});

// Get comments for a post
router.get('/posts/:postId/comments', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const postId = req.params.postId;
    const limit = parseInt(req.query.limit || '10');
    const offset = parseInt(req.query.offset || '0');
    
    const comments = await socialOperations.getComments(postId, limit, offset);
    
    res.status(200).json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ message: 'Failed to load comments' });
  }
});

router.get('/upcoming', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '2');
    const games = await gameOperations.getUpcomingGames(limit);
    res.json(games);
  } catch (error) {
    console.error('Error getting upcoming games:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add a comment to a post
router.post('/posts/:postId/comments', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const postId = req.params.postId;
    const { characterId, content, parentCommentId } = req.body;
    
    if (!characterId || !content) {
      return res.status(400).json({ message: 'Character ID and content are required' });
    }
    
    // Check if character belongs to user
    const isOwner = await characterOperations.isCharacterOwner(req.user.id, characterId);
    if (!isOwner) {
      return res.status(403).json({ message: 'You do not have permission to perform this action' });
    }
    
    const commentId = await socialOperations.addComment(postId, characterId, content, parentCommentId);
    
    res.status(201).json({
      message: 'Comment added successfully',
      commentId
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ message: 'Failed to add comment' });
  }
});

// Toggle follow relationship
router.post('/characters/:targetId/follow', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const targetCharacterId = req.params.targetId;
    const { characterId } = req.body;
    
    if (!characterId) {
      return res.status(400).json({ message: 'Character ID is required' });
    }
    
    // Check if character belongs to user
    const isOwner = await characterOperations.isCharacterOwner(req.user.id, characterId);
    if (!isOwner) {
      return res.status(403).json({ message: 'You do not have permission to perform this action' });
    }
    
    const result = await socialOperations.toggleFollow(characterId, targetCharacterId);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Error toggling follow status:', error);
    res.status(500).json({ message: 'Failed to update follow status' });
  }
});

// Get posts by hashtag
router.get('/hashtag/:tag', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const hashtag = req.params.tag;
    const characterId = req.query.characterId;
    const page = parseInt(req.query.page || '1');
    const limit = parseInt(req.query.limit || '10');
    
    if (!hashtag) {
      return res.status(400).json({ message: 'Hashtag is required' });
    }
    
    if (!characterId) {
      return res.status(400).json({ message: 'Character ID is required' });
    }
    
    // Check if character belongs to user
    const isOwner = await characterOperations.isCharacterOwner(req.user.id, characterId);
    if (!isOwner) {
      return res.status(403).json({ message: 'You do not have permission to view this feed' });
    }
    
    // Get posts with the hashtag
    const posts = await socialOperations.getPostsByHashtag(hashtag, characterId, page, limit);
    
    res.status(200).json({
      posts,
      pagination: {
        page,
        limit,
        hasMore: posts.length === limit
      }
    });
  } catch (error) {
    console.error('Error fetching posts by hashtag:', error);
    res.status(500).json({ message: 'Failed to load posts with this hashtag' });
  }
});

// Get trending hashtags (already exists, updating to include count)
router.get('/trending-hashtags', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '5');
    const days = parseInt(req.query.days || '7');
    
    const hashtags = await socialOperations.getTrendingHashtags(limit, days);
    
    res.status(200).json(hashtags);
  } catch (error) {
    console.error('Error fetching trending hashtags:', error);
    res.status(500).json({ message: 'Failed to load trending hashtags' });
  }
});

// Add hashtags to a post
router.post('/posts/:postId/hashtags', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const postId = req.params.postId;
    const { hashtags } = req.body;
    
    if (!hashtags || !Array.isArray(hashtags)) {
      return res.status(400).json({ message: 'Hashtags array is required' });
    }
    
    // Verify post ownership
    const post = await socialOperations.getPostById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    const character = await characterOperations.getCharacterById(post.character_id);
    if (character.user_id !== req.user.id) {
      return res.status(403).json({ message: 'You do not have permission to modify this post' });
    }
    
    // Save hashtags
    await socialOperations.saveHashtags(postId, hashtags);
    
    res.status(200).json({ message: 'Hashtags added successfully' });
  } catch (error) {
    console.error('Error adding hashtags to post:', error);
    res.status(500).json({ message: 'Failed to add hashtags to post' });
  }
});

module.exports = router;