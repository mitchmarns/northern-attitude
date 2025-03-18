// social.js - Client-side functionality for social feed

document.addEventListener('DOMContentLoaded', function() {
  // Check if user is authenticated, redirect to login if not
  window.authUtils.checkAuth(true);
  
  // Set up logout functionality
  window.authUtils.setupLogoutButton();
  
  // Initialize state
  let currentState = {
    selectedCharacterId: null,
    currentFeed: 'all',
    postImageUrl: null,
    postContent: '',
    lastPage: 1,
    isLoadingMore: false,
    currentPostId: null
  };
  
  // DOM elements
  const elements = {
    // Character selection
    characterSelector: document.getElementById('character-selector'),
    activeCharacterAvatar: document.getElementById('active-character-avatar'),
    activeCharacterName: document.getElementById('active-character-name'),
    activeCharacterPosition: document.getElementById('active-character-position'),
    activeCharacterTeam: document.getElementById('active-character-team'),
    
    // Post composer
    composerAvatar: document.getElementById('composer-avatar'),
    composerCharacterName: document.getElementById('composer-character-name'),
    composerCharacterTeam: document.getElementById('composer-character-team'),
    postContent: document.getElementById('post-content'),
    postPreview: document.getElementById('post-preview'),
    postForm: document.getElementById('post-form'),
    postSubmitBtn: document.getElementById('post-submit-btn'),
    postVisibility: document.getElementById('post-visibility'),
    
    // Feed
    feedTabs: document.querySelectorAll('.tab-btn'),
    socialFeed: document.getElementById('social-feed'),
    feedLoading: document.getElementById('feed-loading'),
    
    // Tool buttons
    addImageBtn: document.getElementById('add-image-btn'),
    addHashtagBtn: document.getElementById('add-hashtag-btn'),
    addMentionBtn: document.getElementById('add-mention-btn'),
    templatesBtn: document.getElementById('templates-btn'),
    templateButtons: document.querySelectorAll('[data-template]'),
    
    // Modals
    commentModal: document.getElementById('comment-modal'),
    closeCommentModal: document.getElementById('close-comment-modal'),
    fullCommentsList: document.querySelector('.full-comments-list'),
    modalCommentForm: document.getElementById('modal-comment-form'),
    modalCommentInput: document.getElementById('modal-comment-input'),
    modalCommentAvatar: document.getElementById('modal-comment-avatar'),
    
    imageModal: document.getElementById('image-preview-modal'),
    closeImageModal: document.getElementById('close-image-modal'),
    imageUrlInput: document.getElementById('image-url-input'),
    previewImageBtn: document.getElementById('preview-image-btn'),
    previewImage: document.getElementById('preview-image'),
    cancelImageBtn: document.getElementById('cancel-image-btn'),
    addImageToPostBtn: document.getElementById('add-image-to-post-btn'),
    
    // Other elements
    notificationsBadge: document.getElementById('notifications-badge'),
    trendingHashtags: document.getElementById('trending-hashtags'),
    suggestedFollows: document.getElementById('suggested-follows-container'),
    upcomingGames: document.getElementById('upcoming-games-container')
  };
  
  // Initialize
  init();
  
  // Initialize function 
  function init() {
    // Load user characters
    loadUserCharacters();
    
    // Set up event listeners
    setupEventListeners();
    
    // Load supporting content
    loadTrendingHashtags();
  }
  
  // Set up event listeners
  function setupEventListeners() {
    // Character selector change
    if (elements.characterSelector) {
      elements.characterSelector.addEventListener('change', () => {
        const characterId = parseInt(elements.characterSelector.value);
        
        if (characterId) {
          currentState.selectedCharacterId = characterId;
          
          // Find selected character from the dropdown options
          const selectedOption = elements.characterSelector.options[elements.characterSelector.selectedIndex];
          
          // Get the character data from the data attributes
          const character = {
            id: characterId,
            name: selectedOption.textContent,
            position: selectedOption.dataset.position || '',
            team_name: selectedOption.dataset.team || '',
            avatar_url: selectedOption.dataset.avatar || '/api/placeholder/80/80'
          };
          
          updateActiveCharacter(character);
          
          // Load feed for selected character
          loadFeed('all', 1);
          
          // Load suggested follows for selected character
          loadSuggestedFollows(characterId);
        }
      });
    }
    
    // Post content input
    if (elements.postContent) {
      elements.postContent.addEventListener('input', () => {
        currentState.postContent = elements.postContent.value;
        
        // Enable submit button if there's content
        if (elements.postSubmitBtn) {
          elements.postSubmitBtn.disabled = !currentState.postContent.trim() && !currentState.postImageUrl;
        }
        
        // Update preview if needed
        updatePostPreview();
      });
    }
    
    // Post form submission
    if (elements.postForm) {
      elements.postForm.addEventListener('submit', (e) => {
        e.preventDefault();
        submitPost();
      });
    }
    
    // Feed tab buttons
    elements.feedTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        // Update active state on tabs
        elements.feedTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        const feedType = tab.dataset.feed;
        currentState.currentFeed = feedType;
        loadFeed(feedType, 1);
      });
    });
    
    // Add image button
    if (elements.addImageBtn) {
      elements.addImageBtn.addEventListener('click', () => {
        showImageModal();
      });
    }
    
    // Add hashtag button
    if (elements.addHashtagBtn) {
      elements.addHashtagBtn.addEventListener('click', () => {
        insertTextAtCursor(elements.postContent, ' #');
        elements.postContent.focus();
      });
    }
    
    // Add mention button
    if (elements.addMentionBtn) {
      elements.addMentionBtn.addEventListener('click', () => {
        insertTextAtCursor(elements.postContent, ' @');
        elements.postContent.focus();
      });
    }
    
    // Template buttons
    elements.templateButtons.forEach(button => {
      button.addEventListener('click', () => {
        const templateType = button.dataset.template;
        applyTemplate(templateType);
        
        // Hide dropdown
        const dropdown = document.getElementById('templates-dropdown');
        if (dropdown) {
          dropdown.style.display = 'none';
        }
      });
    });
    
    // Templates dropdown toggle
    if (elements.templatesBtn) {
      elements.templatesBtn.addEventListener('click', () => {
        const dropdown = document.getElementById('templates-dropdown');
        if (dropdown) {
          dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
        }
      });
    }
    
    // Image modal events
    if (elements.closeImageModal) {
      elements.closeImageModal.addEventListener('click', () => {
        hideImageModal();
      });
    }
    
    if (elements.previewImageBtn) {
      elements.previewImageBtn.addEventListener('click', () => {
        const imageUrl = elements.imageUrlInput.value.trim();
        if (imageUrl) {
          previewImage(imageUrl);
        }
      });
    }
    
    if (elements.cancelImageBtn) {
      elements.cancelImageBtn.addEventListener('click', () => {
        hideImageModal();
      });
    }
    
    if (elements.addImageToPostBtn) {
      elements.addImageToPostBtn.addEventListener('click', () => {
        const imageUrl = elements.imageUrlInput.value.trim();
        if (imageUrl) {
          currentState.postImageUrl = imageUrl;
          updatePostPreview();
          hideImageModal();
          
          // Enable submit button
          if (elements.postSubmitBtn) {
            elements.postSubmitBtn.disabled = false;
          }
        }
      });
    }
    
    // Comment modal events
    if (elements.closeCommentModal) {
      elements.closeCommentModal.addEventListener('click', () => {
        hideCommentModal();
      });
    }
    
    // Modal comment form
    if (elements.modalCommentForm) {
      elements.modalCommentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        submitComment(currentState.currentPostId);
      });
    }
    
    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
      if (e.target === elements.commentModal) {
        hideCommentModal();
      }
      
      if (e.target === elements.imageModal) {
        hideImageModal();
      }
      
      // Close templates dropdown if clicking outside
      const templatesDropdown = document.getElementById('templates-dropdown');
      if (templatesDropdown && e.target !== elements.templatesBtn && !elements.templatesBtn.contains(e.target)) {
        templatesDropdown.style.display = 'none';
      }
    });
    
    // Set up infinite scroll
    window.addEventListener('scroll', () => {
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      
      if (scrollTop + clientHeight >= scrollHeight - 200 && !currentState.isLoadingMore) {
        loadMorePosts();
      }
    });
    
    // Set up global event delegation for post interactions
    document.addEventListener('click', handlePostInteractions);
  }
  
  // Handle post interactions via event delegation
  function handlePostInteractions(e) {
    // Comment button clicks
    if (e.target.classList.contains('comment-btn') || e.target.parentElement.classList.contains('comment-btn')) {
      const postElement = getClosestElement(e.target, '.social-post');
      if (postElement) {
        const postId = postElement.dataset.postId;
        toggleComments(postElement, postId);
      }
    }
    
    // View more comments button
    if (e.target.classList.contains('view-more-comments') || e.target.closest('.view-more-comments')) {
      const postElement = getClosestElement(e.target, '.social-post');
      if (postElement) {
        const postId = postElement.dataset.postId;
        showCommentsModal(postId);
      }
    }
    
    // Like button clicks
    if (e.target.classList.contains('like-btn') || e.target.parentElement.classList.contains('like-btn')) {
      const button = e.target.classList.contains('like-btn') ? e.target : e.target.parentElement;
      const postElement = getClosestElement(button, '.social-post');
      if (postElement) {
        const postId = postElement.dataset.postId;
        toggleLike(button, postId);
      }
    }
    
    // Follow button clicks
    if (e.target.classList.contains('follow-btn')) {
      const targetId = e.target.dataset.characterId;
      if (targetId && currentState.selectedCharacterId) {
        toggleFollow(e.target, targetId);
      }
    }
  }
  
  // Function to load user's characters
  async function loadUserCharacters() {
    try {
      // Show loading state
      if (elements.characterSelector) {
        elements.characterSelector.innerHTML = '<option value="">Loading characters...</option>';
      }
      
      // Make API call to get the user's characters
      const response = await fetch('/api/social/characters', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch characters: ' + response.status);
      }
      
      const characters = await response.json();
      
      // Check if we got any characters back
      if (characters && characters.length > 0) {
        console.log('Characters loaded:', characters);
        populateCharacterSelector(characters);
      } else {
        console.log('No characters returned from API');
        // Show a message prompting user to create characters
        if (elements.characterSelector) {
          elements.characterSelector.innerHTML = '<option value="">No characters available</option>';
        }
        
        if (elements.activeCharacterName) {
          elements.activeCharacterName.textContent = 'No characters found';
        }
        
        if (elements.postSubmitBtn) {
          elements.postSubmitBtn.disabled = true;
        }
      }
    } catch (error) {
      console.error('Error loading characters:', error);
      // Show error message
      if (elements.characterSelector) {
        elements.characterSelector.innerHTML = '<option value="">Failed to load characters</option>';
      }
      
      if (elements.activeCharacterName) {
        elements.activeCharacterName.textContent = 'Error loading characters';
      }
    }
  }
  
  // Populate character selector dropdown
  function populateCharacterSelector(characters) {
    if (!elements.characterSelector) return;
    
    // Clear existing options
    elements.characterSelector.innerHTML = '<option value="">Select a character</option>';
    
    if (characters.length === 0) {
      elements.characterSelector.innerHTML = '<option value="">No characters found</option>';
      if (elements.activeCharacterName) {
        elements.activeCharacterName.textContent = 'No characters available';
      }
      return;
    }
    
    // Add character options with data attributes
    characters.forEach(character => {
      const option = document.createElement('option');
      option.value = character.id;
      option.textContent = character.name;
      option.dataset.position = character.position;
      option.dataset.team = character.team_name || '';
      option.dataset.avatar = character.avatar_url || '/api/placeholder/80/80';
      
      // Set active character as selected
      if (character.is_active) {
        option.selected = true;
        currentState.selectedCharacterId = character.id;
        updateActiveCharacter(character);
      }
      
      elements.characterSelector.appendChild(option);
    });
    
    // If no character was active, select the first one
    if (!currentState.selectedCharacterId && characters.length > 0) {
      elements.characterSelector.value = characters[0].id;
      currentState.selectedCharacterId = characters[0].id;
      updateActiveCharacter(characters[0]);
    }
    
    // Enable post button if character is selected
    if (currentState.selectedCharacterId && elements.postSubmitBtn) {
      elements.postSubmitBtn.disabled = !currentState.postContent.trim() && !currentState.postImageUrl;
    }
    
    // Load feed for selected character
    if (currentState.selectedCharacterId) {
      loadFeed('all', 1);
      loadSuggestedFollows(currentState.selectedCharacterId);
    }
  }
  
  // Update active character display
  function updateActiveCharacter(character) {
    if (!character) return;
    
    // Update active character card
    if (elements.activeCharacterAvatar) {
      elements.activeCharacterAvatar.src = character.avatar_url || '/api/placeholder/80/80';
      elements.activeCharacterAvatar.alt = character.name;
    }
    
    if (elements.activeCharacterName) {
      elements.activeCharacterName.textContent = character.name;
    }
    
    if (elements.activeCharacterPosition) {
      elements.activeCharacterPosition.textContent = character.position;
    }
    
    if (elements.activeCharacterTeam) {
      elements.activeCharacterTeam.textContent = character.team_name || 'No Team';
    }
    
    // Update composer
    if (elements.composerAvatar) {
      elements.composerAvatar.src = character.avatar_url || '/api/placeholder/40/40';
      elements.composerAvatar.alt = character.name;
    }
    
    if (elements.composerCharacterName) {
      elements.composerCharacterName.textContent = character.name;
    }
    
    if (elements.composerCharacterTeam) {
      elements.composerCharacterTeam.textContent = character.team_name || 'No Team';
    }
    
    // Update modal comment avatar
    if (elements.modalCommentAvatar) {
      elements.modalCommentAvatar.src = character.avatar_url || '/api/placeholder/40/40';
      elements.modalCommentAvatar.alt = character.name;
    }
    
    // Enable post button if there's content
    if (elements.postSubmitBtn) {
      elements.postSubmitBtn.disabled = !currentState.postContent.trim() && !currentState.postImageUrl;
    }
  }
  
  // Load feed data
  async function loadFeed(feedType = 'all', page = 1) {
    if (!currentState.selectedCharacterId) return;
    
    // Show loading indicator
    if (elements.feedLoading) {
      elements.feedLoading.style.display = 'block';
    }
    
    // Clear feed if it's the first page
    if (page === 1 && elements.socialFeed) {
      elements.socialFeed.innerHTML = '';
    }
    
    // Set current feed type
    currentState.currentFeed = feedType;
    currentState.isLoadingMore = true;
    
    try {
      // Make API call to get posts
      const response = await fetch(`/api/social/feed/${feedType}?characterId=${currentState.selectedCharacterId}&page=${page}&limit=10`, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to load posts: ' + response.status);
      }
      
      const data = await response.json();
      
      // Hide loading indicator
      if (elements.feedLoading) {
        elements.feedLoading.style.display = 'none';
      }
      
      if (data.posts && data.posts.length > 0) {
        // Create and append post elements
        data.posts.forEach(post => {
          const postElement = createPostElement(post);
          if (elements.socialFeed && postElement) {
            elements.socialFeed.appendChild(postElement);
          }
        });
        
        // Update current page
        currentState.lastPage = page;
      } else if (page === 1) {
        // No posts found for the first page
        if (elements.socialFeed) {
          elements.socialFeed.innerHTML = '<div class="empty-feed">No posts found in this feed. Follow more characters or create a post!</div>';
        }
      }
    } catch (error) {
      console.error('Error loading feed:', error);
      
      // Hide loading indicator
      if (elements.feedLoading) {
        elements.feedLoading.style.display = 'none';
      }
      
      // Show error message
      if (elements.socialFeed && page === 1) {
        elements.socialFeed.innerHTML = '<div class="feed-error">Failed to load posts. Please try again later.</div>';
      }
    } finally {
      currentState.isLoadingMore = false;
    }
  }
  
  // Load more posts (for infinite scroll)
  function loadMorePosts() {
    if (currentState.isLoadingMore) return;
    
    loadFeed(currentState.currentFeed, currentState.lastPage + 1);
  }
  
  // Create a post element from post data
  function createPostElement(post) {
    const postElement = document.createElement('article');
    postElement.className = 'social-post';
    postElement.dataset.postId = post.id;
    
    // Format timestamp
    const timestamp = post.created_at ? new Date(post.created_at) : new Date();
    const formattedTime = formatTimestamp(timestamp);
    
    // Build the post's HTML content
    postElement.innerHTML = `
      <div class="post-header">
        <div class="post-avatar">
          <img src="${post.author_avatar || '/api/placeholder/60/60'}" alt="${post.author_name || 'Author'}">
        </div>
        <div class="post-info">
          <div class="post-author">${post.author_name || 'Unknown Author'}</div>
          <div class="post-meta">${post.author_position || ''} ${post.author_team ? '• ' + post.author_team : ''} • ${formattedTime}</div>
        </div>
        <div class="post-menu">
          <button class="post-menu-btn">•••</button>
        </div>
      </div>
      <div class="post-content">
        <p>${formatPostContent(post.content || '')}</p>
        ${post.media_url ? `<div class="post-image"><img src="${post.media_url}" alt="Post image"></div>` : ''}
      </div>
      <div class="post-footer">
        <div class="post-stats">
          <span>${post.likes_count || 0} likes</span>
          <span>${post.comments_count || 0} comments</span>
        </div>
        <div class="post-actions">
          <button class="action-btn like-btn ${post.is_liked ? 'liked' : ''}" title="Like this post">
            <span class="icon">❤️</span> Like
          </button>
          <button class="action-btn comment-btn" title="Comment on this post">
            <span class="icon">💬</span> Comment
          </button>
          <button class="action-btn share-btn" title="Share this post">
            <span class="icon">🔄</span> Share
          </button>
        </div>
      </div>
      <div class="post-comments" style="display: none;">
        <div class="comments-list">
          <!-- Comments will be loaded here -->
        </div>
        <div class="comment-composer">
          <div class="comment-avatar">
            <img src="${elements.composerAvatar?.src || '/api/placeholder/40/40'}" alt="Your character">
          </div>
          <form class="comment-form">
            <input type="text" class="comment-input" placeholder="Write a comment...">
            <button type="submit">Post</button>
          </form>
        </div>
      </div>
    `;
    
    // Set up comment form submission
    const commentForm = postElement.querySelector('.comment-form');
    if (commentForm) {
      commentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const commentInput = commentForm.querySelector('.comment-input');
        if (commentInput && commentInput.value.trim()) {
          addComment(post.id, commentInput.value.trim(), postElement);
          commentInput.value = '';
        }
      });
    }
    
    return postElement;
  }
  
  // Format post content with hashtags, mentions, and links
  function formatPostContent(content) {
    if (!content) return '';
    
    // Escape HTML to prevent XSS
    let safeContent = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
    
    // Format hashtags
    safeContent = safeContent.replace(/#(\w+)/g, '<a href="#" class="hashtag">#$1</a>');
    
    // Format mentions
    safeContent = safeContent.replace(/@(\w+)/g, '<a href="#" class="mention">@$1</a>');
    
    // Format URLs
    safeContent = safeContent.replace(
      /(https?:\/\/[^\s]+)/g, 
      '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
    );
    
    return safeContent;
  }
  
  // Load comments for a post
  async function loadComments(postId, container) {
    if (!container || !postId || !currentState.selectedCharacterId) return;
    
    try {
      // Show loading indicator
      container.innerHTML = '<div class="loading-comments">Loading comments...</div>';
      
      // Fetch comments from API
      const response = await fetch(`/api/social/posts/${postId}/comments?limit=5`, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to load comments');
      }
      
      const comments = await response.json();
      
      // Clear loading indicator
      container.innerHTML = '';
      
      if (comments.length === 0) {
        container.innerHTML = '<div class="no-comments">No comments yet. Be the first to comment!</div>';
        return;
      }
      
      // Create comment elements
      comments.forEach(comment => {
        const commentElement = document.createElement('div');
        commentElement.className = 'comment';
        
        // Format timestamp
        const timestamp = comment.created_at ? new Date(comment.created_at) : new Date();
        const formattedTime = formatTimestamp(timestamp);
        
        commentElement.innerHTML = `
          <div class="comment-avatar">
            <img src="${comment.author_avatar || '/api/placeholder/40/40'}" alt="${comment.author_name || 'Commenter'}">
          </div>
          <div class="comment-content">
            <div class="comment-author">${comment.author_name || 'Unknown'}</div>
            <div class="comment-text">${comment.content || ''}</div>
            <div class="comment-time">${formattedTime}</div>
          </div>
        `;
        
        container.appendChild(commentElement);
      });
      
      // Add "view more comments" button if there are more than 5 comments
      if (comments.length === 5) {
        const viewMoreButton = document.createElement('button');
        viewMoreButton.className = 'view-more-comments';
        viewMoreButton.textContent = 'View more comments';
        container.appendChild(viewMoreButton);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
      container.innerHTML = '<div class="loading-error">Failed to load comments. Please try again.</div>';
    }
  }
  
  // Add a comment to a post
  async function addComment(postId, content, postElement) {
    if (!postId || !content || !postElement || !currentState.selectedCharacterId) return;
    
    try {
      // Make API call to add comment
      const response = await fetch(`/api/social/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          characterId: currentState.selectedCharacterId,
          content: content
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to add comment');
      }
      
      const data = await response.json();
      
      // Update UI
      // 1. Update comment count
      const commentCountElement = postElement.querySelector('.post-stats span:nth-child(2)');
      if (commentCountElement) {
        const currentText = commentCountElement.textContent;
        const currentCount = parseInt(currentText) || 0;
        commentCountElement.textContent = `${currentCount + 1} comments`;
      }
      
      // 2. Reload comments to show the new one
      const commentsContainer = postElement.querySelector('.comments-list');
      if (commentsContainer) {
        loadComments(postId, commentsContainer);
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Failed to add comment. Please try again.');
    }
  }
  
  // Toggle comments section visibility
  function toggleComments(postElement, postId) {
    if (!postElement || !postId) return;
    
    const commentsSection = postElement.querySelector('.post-comments');
    if (commentsSection) {
      // Toggle visibility
      const isVisible = commentsSection.style.display !== 'none';
      
      if (isVisible) {
        commentsSection.style.display = 'none';
      } else {
        commentsSection.style.display = 'block';
        
        // Load comments if not already loaded
        const commentsList = commentsSection.querySelector('.comments-list');
        if (commentsList && commentsList.children.length === 0) {
          loadComments(postId, commentsList);
        }
        
        // Focus on comment input
        const commentInput = commentsSection.querySelector('.comment-input');
        if (commentInput) {
          commentInput.focus();
        }
      }
    }
  }
  
  // Toggle like on a post
  async function toggleLike(likeButton, postId) {
    if (!likeButton || !postId || !currentState.selectedCharacterId) return;
    
    try {
      // Toggle UI state immediately for better user experience
      const wasLiked = likeButton.classList.contains('liked');
      likeButton.classList.toggle('liked');
      
      // Update like count
      const postElement = getClosestElement(likeButton, '.social-post');
      const likeCountElement = postElement?.querySelector('.post-stats span:first-child');
      if (likeCountElement) {
        const currentText = likeCountElement.textContent;
        const currentCount = parseInt(currentText) || 0;
        const newCount = wasLiked ? currentCount - 1 : currentCount + 1;
        likeCountElement.textContent = `${newCount} likes`;
      }
      
      // Send API request
      const response = await fetch(`/api/social/posts/${postId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          characterId: currentState.selectedCharacterId
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        // Revert UI changes if the request fails
        likeButton.classList.toggle('liked');
        
        if (likeCountElement) {
          const currentText = likeCountElement.textContent;
          const currentCount = parseInt(currentText) || 0;
          const originalCount = wasLiked ? currentCount + 1 : currentCount - 1;
          likeCountElement.textContent = `${originalCount} likes`;
        }
        
        throw new Error('Failed to update like status');
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  }
});