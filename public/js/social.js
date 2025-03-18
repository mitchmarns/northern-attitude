// social-feed.js - Client-side functionality for social feed

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
    currentPost: null,
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
    // Load user characters - immediately using mock data, will be replaced by API calls
    loadUserCharacters();
    
    // Set up event listeners
    setupEventListeners();
    
    // Show sample feed initially
    // In a real app, this would be replaced with loadFeed() once character is selected
    showSampleFeed();
    
    // Load supporting content
    loadNotificationsCount();
    loadTrendingHashtags();
    loadSuggestedFollows();
    loadUpcomingGames();
  }
  
  // Set up event listeners
  function setupEventListeners() {
    // Character selector change
    if (elements.characterSelector) {
      elements.characterSelector.addEventListener('change', () => {
        const characterId = parseInt(elements.characterSelector.value);
        
        if (characterId) {
          currentState.selectedCharacterId = characterId;
          
          // Find character data
          const mockCharacters = [
            {
              id: 1,
              name: 'Mark Stevens',
              position: 'Center',
              team_name: 'Toronto Maple Leafs',
              avatar_url: '/api/placeholder/80/80',
              is_active: true
            },
            {
              id: 2,
              name: 'Alex Johnson',
              position: 'Defense',
              team_name: 'Toronto Maple Leafs',
              avatar_url: '/api/placeholder/80/80',
              is_active: false
            },
            {
              id: 3,
              name: 'Samantha Clarke',
              position: 'Goalie',
              team_name: 'Boston Bruins',
              avatar_url: '/api/placeholder/80/80',
              is_active: false
            }
          ];
          
          const character = mockCharacters.find(c => c.id === characterId);
          
          if (character) {
            updateActiveCharacter(character);
          }
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
        const feedType = tab.dataset.feed;
        loadFeed(feedType);
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
      });
    });
    
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
    });
    
    // Set up infinite scroll
    window.addEventListener('scroll', () => {
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      
      if (scrollTop + clientHeight >= scrollHeight - 200 && !currentState.isLoadingMore) {
        loadMorePosts();
      }
    });
    
    // Set up comment button clicks
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('comment-btn') || e.target.parentElement.classList.contains('comment-btn')) {
        const postElement = getClosestElement(e.target, '.social-post');
        if (postElement) {
          const postId = postElement.dataset.postId || '1'; // Fallback for demo
          toggleComments(postElement, postId);
        }
      }
      
      if (e.target.classList.contains('view-more-comments') || e.target.parentElement.classList.contains('view-more-comments')) {
        const postElement = getClosestElement(e.target, '.social-post');
        if (postElement) {
          const postId = postElement.dataset.postId || '1'; // Fallback for demo
          showCommentsModal(postId);
        }
      }
    });
    
    // Set up like button clicks
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('like-btn') || e.target.parentElement.classList.contains('like-btn')) {
        const button = e.target.classList.contains('like-btn') ? e.target : e.target.parentElement;
        toggleLike(button);
      }
    });
  }
  
  // Function to load user's characters
  async function loadUserCharacters() {
    try {
      // In a real app with API integration:
      // const response = await fetch('/api/my-characters', {
      //   method: 'GET',
      //   credentials: 'include'
      // });
      // 
      // if (!response.ok) {
      //   throw new Error('Failed to fetch characters');
      // }
      // 
      // const characters = await response.json();
      
      // For now, we'll use mock data
      const mockCharacters = [
        {
          id: 1,
          name: 'Mark Stevens',
          position: 'Center',
          team_name: 'Toronto Maple Leafs',
          avatar_url: '/api/placeholder/80/80',
          is_active: true
        },
        {
          id: 2,
          name: 'Alex Johnson',
          position: 'Defense',
          team_name: 'Toronto Maple Leafs',
          avatar_url: '/api/placeholder/80/80',
          is_active: false
        },
        {
          id: 3,
          name: 'Samantha Clarke',
          position: 'Goalie',
          team_name: 'Boston Bruins',
          avatar_url: '/api/placeholder/80/80',
          is_active: false
        }
      ];
      
      populateCharacterSelector(mockCharacters);
    } catch (error) {
      console.error('Error loading characters:', error);
      // Show error message if needed
    }
  }
  
  // Populate character selector dropdown
  function populateCharacterSelector(characters) {
    if (!elements.characterSelector) return;
    
    // Clear existing options except the first one
    while (elements.characterSelector.options.length > 1) {
      elements.characterSelector.remove(1);
    }
    
    // Add character options
    characters.forEach(character => {
      const option = document.createElement('option');
      option.value = character.id;
      option.textContent = character.name;
      
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
    if (currentState.selectedCharacterId) {
      elements.postSubmitBtn.disabled = false;
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
    
    // Enable post button
    if (elements.postSubmitBtn) {
      elements.postSubmitBtn.disabled = false;
    }
    
    // Load feed data for this character
    loadFeed(currentState.currentFeed);
  }
  
  // Load feed data
  function loadFeed(feedType = 'all', page = 1) {
    // Show loading indicator
    if (elements.feedLoading) {
      elements.feedLoading.style.display = 'block';
    }
    
    // Set current feed type
    currentState.currentFeed = feedType;
    
    // Update active tab
    elements.feedTabs.forEach(tab => {
      if (tab.dataset.feed === feedType) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
    
    // In a real app, this would fetch posts from the API
    // For now, we'll just simulate a network request with setTimeout
    setTimeout(() => {
      // Hide loading indicator
      if (elements.feedLoading) {
        elements.feedLoading.style.display = 'none';
      }
      
      if (page === 1) {
        // Replace existing content
        showSampleFeed(feedType);
      } else {
        // Append more posts (for pagination)
        appendMorePosts(feedType, page);
      }
      
      // Update current page
      currentState.lastPage = page;
      currentState.isLoadingMore = false;
    }, 1000);
  }
  
  // Load more posts (for infinite scroll)
  function loadMorePosts() {
    if (currentState.isLoadingMore) return;
    
    currentState.isLoadingMore = true;
    loadFeed(currentState.currentFeed, currentState.lastPage + 1);
  }
  
  // Show sample feed with mock data
  function showSampleFeed(feedType = 'all') {
    if (!elements.socialFeed) return;
    
    // Clear existing content
    elements.socialFeed.innerHTML = '';
    
    // Get posts based on feed type
    let posts = [];
    
    switch (feedType) {
      case 'team':
        posts = getMockTeamPosts();
        break;
      case 'following':
        posts = getMockFollowingPosts();
        break;
      case 'mentions':
        posts = getMockMentionPosts();
        break;
      case 'all':
      default:
        posts = getMockAllPosts();
        break;
    }
    
    // Create post elements
    posts.forEach(post => {
      const postElement = createPostElement(post);
      elements.socialFeed.appendChild(postElement);
    });
  }
  
  // Append more posts for infinite scroll
  function appendMorePosts(feedType, page) {
    if (!elements.socialFeed) return;
    
    // Get more posts
    let posts = [];
    
    // In a real app, you'd fetch different posts based on page number
    // For this demo, we'll just use the same posts with modified timestamps
    switch (feedType) {
      case 'team':
        posts = getMockTeamPosts().map(post => ({
          ...post,
          timestamp: new Date(new Date(post.timestamp).getTime() - (page * 24 * 60 * 60 * 1000)),
          id: `${post.id}-p${page}`
        }));
        break;
      case 'following':
        posts = getMockFollowingPosts().map(post => ({
          ...post,
          timestamp: new Date(new Date(post.timestamp).getTime() - (page * 24 * 60 * 60 * 1000)),
          id: `${post.id}-p${page}`
        }));
        break;
      case 'mentions':
        posts = getMockMentionPosts().map(post => ({
          ...post,
          timestamp: new Date(new Date(post.timestamp).getTime() - (page * 24 * 60 * 60 * 1000)),
          id: `${post.id}-p${page}`
        }));
        break;
      case 'all':
      default:
        posts = getMockAllPosts().map(post => ({
          ...post,
          timestamp: new Date(new Date(post.timestamp).getTime() - (page * 24 * 60 * 60 * 1000)),
          id: `${post.id}-p${page}`
        }));
        break;
    }
    
    // Create post elements
    posts.forEach(post => {
      const postElement = createPostElement(post);
      elements.socialFeed.appendChild(postElement);
    });
  }
  
  // Create a post element from post data
  function createPostElement(post) {
    const postElement = document.createElement('div');
    postElement.className = 'social-post';
    postElement.dataset.postId = post.id;
    
    // Format timestamp
    const formattedTime = formatTimestamp(post.timestamp);
    
    // Create the post HTML
    postElement.innerHTML = `
      <div class="post-header">
        <div class="post-avatar">
          <img src="${post.author.avatar_url || '/api/placeholder/60/60'}" alt="${post.author.name}">
        </div>
        <div class="post-meta">
          <div class="post-author">
            <span class="author-name">${post.author.name}</span>
            <span class="author-position">${post.author.position || ''}</span>
            <span class="author-team">${post.author.team_name || ''}</span>
          </div>
          <div class="post-time">${formattedTime}</div>
        </div>
      </div>
      <div class="post-content">
        ${post.content}
        ${post.imageUrl ? `<div class="post-image"><img src="${post.imageUrl}" alt="Post image"></div>` : ''}
      </div>
      <div class="post-actions">
        <button class="action-btn like-btn ${post.liked ? 'liked' : ''}" aria-label="Like post">
          <i class="icon-heart"></i>
          <span class="action-count">${post.likes}</span>
        </button>
        <button class="action-btn comment-btn" aria-label="Comment on post">
          <i class="icon-comment"></i>
          <span class="action-count">${post.comments.length}</span>
        </button>
        <button class="action-btn share-btn" aria-label="Share post">
          <i class="icon-share"></i>
        </button>
      </div>
      <div class="post-comments" style="display: none;">
        <div class="comments-list">
          ${post.comments.slice(0, 2).map(comment => `
            <div class="comment">
              <div class="comment-avatar">
                <img src="${comment.author.avatar_url || '/api/placeholder/40/40'}" alt="${comment.author.name}">
              </div>
              <div class="comment-content">
                <div class="comment-author">${comment.author.name}</div>
                <div class="comment-text">${comment.content}</div>
                <div class="comment-time">${formatTimestamp(comment.timestamp)}</div>
              </div>
            </div>
          `).join('')}
        </div>
        ${post.comments.length > 2 ? `
          <button class="view-more-comments">View all ${post.comments.length} comments</button>
        ` : ''}
        <div class="comment-form">
          <div class="comment-avatar">
            <img src="${elements.composerAvatar?.src || '/api/placeholder/40/40'}" alt="Your avatar">
          </div>
          <form class="comment-input-form">
            <input type="text" class="comment-input" placeholder="Write a comment...">
            <button type="submit" class="comment-submit">Post</button>
          </form>
        </div>
      </div>
    `;
    
    // Set up comment form submission
    const commentForm = postElement.querySelector('.comment-input-form');
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
  
  // Add a comment to a post
  function addComment(postId, content, postElement) {
    if (!content || !postElement) return;
    
    // Create the comment element
    const comment = {
      id: Date.now().toString(),
      author: {
        name: elements.composerCharacterName?.textContent || 'Your Character',
        avatar_url: elements.composerAvatar?.src || '/api/placeholder/40/40',
        team_name: elements.composerCharacterTeam?.textContent || 'Your Team'
      },
      content: content,
      timestamp: new Date()
    };
    
    // Get the comments list
    const commentsList = postElement.querySelector('.comments-list');
    if (!commentsList) return;
    
    // Create comment element
    const commentElement = document.createElement('div');
    commentElement.className = 'comment';
    commentElement.innerHTML = `
      <div class="comment-avatar">
        <img src="${comment.author.avatar_url}" alt="${comment.author.name}">
      </div>
      <div class="comment-content">
        <div class="comment-author">${comment.author.name}</div>
        <div class="comment-text">${comment.content}</div>
        <div class="comment-time">Just now</div>
      </div>
    `;
    
    // Add to comments list
    commentsList.appendChild(commentElement);
    
    // Update comment count
    const commentCountElement = postElement.querySelector('.comment-btn .action-count');
    if (commentCountElement) {
      const currentCount = parseInt(commentCountElement.textContent);
      commentCountElement.textContent = (currentCount + 1).toString();
    }
    
    // In a real app, we would send the comment to the server here
    // For this demo, we'll just update the UI
  }
  
  // Toggle comments section visibility
  function toggleComments(postElement, postId) {
    if (!postElement) return;
    
    const commentsSection = postElement.querySelector('.post-comments');
    if (commentsSection) {
      // Toggle visibility
      const isVisible = commentsSection.style.display !== 'none';
      commentsSection.style.display = isVisible ? 'none' : 'block';
      
      // Focus on comment input if showing comments
      if (!isVisible) {
        const commentInput = commentsSection.querySelector('.comment-input');
        if (commentInput) {
          commentInput.focus();
        }
      }
    }
  }
  
  // Toggle like on a post
  function toggleLike(likeButton) {
    if (!likeButton) return;
    
    // Toggle liked class
    likeButton.classList.toggle('liked');
    
    // Update like count
    const countElement = likeButton.querySelector('.action-count');
    if (countElement) {
      const currentCount = parseInt(countElement.textContent);
      const isLiked = likeButton.classList.contains('liked');
      
      // If liked, increment; if unliked, decrement
      countElement.textContent = (currentCount + (isLiked ? 1 : -1)).toString();
    }
    
    // In a real app, we would send the like/unlike action to the server
    // For this demo, we'll just update the UI
  }
  
  // Show comments modal for a post
  function showCommentsModal(postId) {
    if (!elements.commentModal || !elements.fullCommentsList) return;
    
    // Set current post ID
    currentState.currentPostId = postId;
    
    // Get post mock data
    const post = findMockPost(postId);
    if (!post) return;
    
    // Set modal title
    const modalTitle = elements.commentModal.querySelector('.modal-title');
    if (modalTitle) {
      modalTitle.textContent = `Comments on ${post.author.name}'s Post`;
    }
    
    // Clear comments list
    elements.fullCommentsList.innerHTML = '';
    
    // Add comments
    post.comments.forEach(comment => {
      const commentElement = document.createElement('div');
      commentElement.className = 'comment';
      commentElement.innerHTML = `
        <div class="comment-avatar">
          <img src="${comment.author.avatar_url || '/api/placeholder/40/40'}" alt="${comment.author.name}">
        </div>
        <div class="comment-content">
          <div class="comment-author">${comment.author.name}</div>
          <div class="comment-meta">
            <span class="comment-position">${comment.author.position || ''}</span>
            <span class="comment-team">${comment.author.team_name || ''}</span>
          </div>
          <div class="comment-text">${comment.content}</div>
          <div class="comment-time">${formatTimestamp(comment.timestamp)}</div>
        </div>
      `;
      
      elements.fullCommentsList.appendChild(commentElement);
    });
    
    // Show modal
    elements.commentModal.style.display = 'flex';
  }
  
  // Hide comments modal
  function hideCommentModal() {
    if (elements.commentModal) {
      elements.commentModal.style.display = 'none';
    }
    
    // Reset current post ID
    currentState.currentPostId = null;
  }
  
  // Submit a comment from the modal
  function submitComment(postId) {
    if (!postId || !elements.modalCommentInput) return;
    
    const content = elements.modalCommentInput.value.trim();
    if (!content) return;
    
    // Create the comment
    const comment = {
      id: Date.now().toString(),
      author: {
        name: elements.composerCharacterName?.textContent || 'Your Character',
        avatar_url: elements.composerAvatar?.src || '/api/placeholder/40/40',
        team_name: elements.composerCharacterTeam?.textContent || 'Your Team',
        position: elements.activeCharacterPosition?.textContent || ''
      },
      content: content,
      timestamp: new Date()
    };
    
    // Add comment to the list
    const commentElement = document.createElement('div');
    commentElement.className = 'comment';
    commentElement.innerHTML = `
      <div class="comment-avatar">
        <img src="${comment.author.avatar_url}" alt="${comment.author.name}">
      </div>
      <div class="comment-content">
        <div class="comment-author">${comment.author.name}</div>
        <div class="comment-meta">
          <span class="comment-position">${comment.author.position}</span>
          <span class="comment-team">${comment.author.team_name}</span>
        </div>
        <div class="comment-text">${comment.content}</div>
        <div class="comment-time">Just now</div>
      </div>
    `;
    
    elements.fullCommentsList.appendChild(commentElement);
    
    // Clear input
    elements.modalCommentInput.value = '';
    
    // Also update the post in the feed if it's visible
    const postElement = document.querySelector(`.social-post[data-post-id="${postId}"]`);
    if (postElement) {
      // Update comment count
      const commentCountElement = postElement.querySelector('.comment-btn .action-count');
      if (commentCountElement) {
        const currentCount = parseInt(commentCountElement.textContent);
        commentCountElement.textContent = (currentCount + 1).toString();
      }
      
      // If comments are visible, add the comment there too
      const commentsSection = postElement.querySelector('.post-comments');
      if (commentsSection && commentsSection.style.display !== 'none') {
        const commentsList = commentsSection.querySelector('.comments-list');
        if (commentsList) {
          // Create a simplified comment element
          const inlineCommentElement = document.createElement('div');
          inlineCommentElement.className = 'comment';
          inlineCommentElement.innerHTML = `
            <div class="comment-avatar">
              <img src="${comment.author.avatar_url}" alt="${comment.author.name}">
            </div>
            <div class="comment-content">
              <div class="comment-author">${comment.author.name}</div>
              <div class="comment-text">${comment.content}</div>
              <div class="comment-time">Just now</div>
            </div>
          `;
          
          commentsList.appendChild(inlineCommentElement);
        }
      }
    }
    
    // In a real app, we would send the comment to the server here
  }
  
  // Show image modal for adding an image to a post
  function showImageModal() {
    if (!elements.imageModal) return;
    
    // Reset image input
    if (elements.imageUrlInput) {
      elements.imageUrlInput.value = '';
    }
    
    // Reset preview
    if (elements.previewImage) {
      elements.previewImage.src = '/api/placeholder/300/200';
      elements.previewImage.alt = 'Image preview';
    }
    
    // Show modal
    elements.imageModal.style.display = 'flex';
    
    // Focus on input
    if (elements.imageUrlInput) {
      elements.imageUrlInput.focus();
    }
  }
  
  // Hide image modal
  function hideImageModal() {
    if (elements.imageModal) {
      elements.imageModal.style.display = 'none';
    }
  }
  
  // Preview an image in the modal
  function previewImage(imageUrl) {
    if (!elements.previewImage || !imageUrl) return;
    
    elements.previewImage.src = imageUrl;
    elements.previewImage.alt = 'Image preview';
    
    // Handle load errors
    elements.previewImage.onerror = function() {
      elements.previewImage.src = '/api/placeholder/300/200';
      alert('Failed to load image. Please check the URL and try again.');
    };
  }
  
  // Update post preview
  function updatePostPreview() {
    if (!elements.postPreview) return;
    
    const hasContent = currentState.postContent.trim() || currentState.postImageUrl;
    
    if (hasContent) {
      // Show preview
      elements.postPreview.style.display = 'block';
      
      // Format content with links, hashtags, and mentions
      let formattedContent = currentState.postContent;
      
      // Process hashtags
      formattedContent = formattedContent.replace(/#(\w+)/g, '<a href="#" class="hashtag">#$1</a>');
      
      // Process mentions
      formattedContent = formattedContent.replace(/@(\w+)/g, '<a href="#" class="mention">@$1</a>');
      
      // Process URLs
      formattedContent = formattedContent.replace(
        /(https?:\/\/[^\s]+)/g, 
        '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
      );
      
      // Update preview content
      elements.postPreview.innerHTML = `
        <div class="preview-content">${formattedContent}</div>
        ${currentState.postImageUrl ? `
          <div class="preview-image">
            <img src="${currentState.postImageUrl}" alt="Post image">
            <button type="button" class="remove-image-btn" aria-label="Remove image">×</button>
          </div>
        ` : ''}
      `;
      
      // Add event listener for remove image button
      const removeImageBtn = elements.postPreview.querySelector('.remove-image-btn');
      if (removeImageBtn) {
        removeImageBtn.addEventListener('click', () => {
          currentState.postImageUrl = null;
          updatePostPreview();
        });
      }
    } else {
      // Hide preview if no content
      elements.postPreview.style.display = 'none';
      elements.postPreview.innerHTML = '';
    }
  }
  
  // Submit a new post
  function submitPost() {
    if (!currentState.selectedCharacterId) {
      alert('Please select a character first');
      return;
    }
    
    const content = currentState.postContent.trim();
    const imageUrl = currentState.postImageUrl;
    const visibility = elements.postVisibility ? elements.postVisibility.value : 'public';
    
    if (!content && !imageUrl) {
      alert('Please add some content to your post');
      return;
    }
    
    // In a real app, we would send the post to the server
    // For this demo, we'll just show a success message and reset the form
    
    // Create a new post element and add it to the feed
    const character = {
      id: currentState.selectedCharacterId,
      name: elements.composerCharacterName?.textContent || 'Your Character',
      avatar_url: elements.composerAvatar?.src || '/api/placeholder/60/60',
      team_name: elements.composerCharacterTeam?.textContent || 'Your Team',
      position: elements.activeCharacterPosition?.textContent || ''
    };
    
    const newPost = {
      id: Date.now().toString(),
      author: character,
      content: content,
      imageUrl: imageUrl,
      timestamp: new Date(),
      likes: 0,
      liked: false,
      comments: []
    };
    
    // Create and add the post element at the top of the feed
    const postElement = createPostElement(newPost);
    if (elements.socialFeed && postElement) {
      elements.socialFeed.insertBefore(postElement, elements.socialFeed.firstChild);
    }
    
    // Reset form
    resetPostForm();
    
    // Show success message
    alert('Post created successfully!');
  }
  
  // Reset post form
  function resetPostForm() {
    // Reset state
    currentState.postContent = '';
    currentState.postImageUrl = null;
    
    // Reset form elements
    if (elements.postContent) {
      elements.postContent.value = '';
    }
    
    if (elements.postPreview) {
      elements.postPreview.style.display = 'none';
      elements.postPreview.innerHTML = '';
    }
    
    // Disable submit button
    if (elements.postSubmitBtn) {
      elements.postSubmitBtn.disabled = true;
    }
  }
  
  // Apply a template to the post content
  function applyTemplate(templateType) {
    if (!elements.postContent) return;
    
    let template = '';
    
    switch (templateType) {
      case 'goal':
        template = "Just scored a goal against [team]! #goal #hockey";
        break;
      case 'assist':
        template = "Great assist on @[teammate]'s goal against [team]. #assist #teamwork";
        break;
      case 'victory':
        template = "Great win against [team] today! Final score: [score]. #victory #hockey";
        break;
      case 'injury':
        template = "Unfortunately injured during today's game. Will be out for [time]. #injury #recovery";
        break;
      case 'practice':
        template = "Good practice session today. Working on [skills]. #practice #improvement";
        break;
      default:
        return;
    }
    
    // Insert template at cursor position or append to end
    insertTextAtCursor(elements.postContent, template);
    
    // Update state and UI
    currentState.postContent = elements.postContent.value;
    updatePostPreview();
    
    // Focus on content
    elements.postContent.focus();
  }
  
  // Insert text at cursor position in an input or textarea
  function insertTextAtCursor(input, text) {
    if (!input) return;
    
    const startPos = input.selectionStart;
    const endPos = input.selectionEnd;
    const before = input.value.substring(0, startPos);
    const after = input.value.substring(endPos, input.value.length);
    
    input.value = before + text + after;
    
    // Move cursor after inserted text
    const newCursorPos = startPos + text.length;
    input.selectionStart = newCursorPos;
    input.selectionEnd = newCursorPos;
    
    // Trigger input event for any listeners
    const event = new Event('input', { bubbles: true });
    input.dispatchEvent(event);
  }
  
  // Helper function to get the closest parent element matching a selector
  function getClosestElement(element, selector) {
    while (element && element !== document) {
      if (element.matches(selector)) {
        return element;
      }
      element = element.parentNode;
    }
    return null;
  }
  
  // Format timestamp to relative time
  function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffSec < 60) {
      return 'Just now';
    } else if (diffMin < 60) {
      return `${diffMin}m ago`;
    } else if (diffHour < 24) {
      return `${diffHour}h ago`;
    } else if (diffDay < 7) {
      return `${diffDay}d ago`;
    } else {
      // Format date for older posts
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  }
  
  // Find a mock post by ID
  function findMockPost(postId) {
    const allPosts = [
      ...getMockAllPosts(),
      ...getMockTeamPosts(),
      ...getMockFollowingPosts(),
      ...getMockMentionPosts()
    ];
    
    // Remove any duplicates by ID
    const uniquePosts = allPosts.filter((post, index, self) => 
      index === self.findIndex(p => p.id === post.id)
    );
    
    return uniquePosts.find(post => post.id === postId);
  }
  
  // Load notifications count
  function loadNotificationsCount() {
    if (!elements.notificationsBadge) return;
    
    // Mock notification count
    elements.notificationsBadge.textContent = '3';
    elements.notificationsBadge.style.display = 'inline-block';
  }
  
  // Load trending hashtags
  function loadTrendingHashtags() {
    if (!elements.trendingHashtags) return;
    
    // Mock trending hashtags
    const mockHashtags = [
      { tag: 'playoffs', count: 128 },
      { tag: 'goal', count: 89 },
      { tag: 'hockey', count: 76 },
      { tag: 'training', count: 54 },
      { tag: 'win', count: 43 }
    ];
    
    // Clear existing content
    elements.trendingHashtags.innerHTML = '';
    
    // Create hashtag elements
    mockHashtags.forEach(hashtag => {
      const hashtagElement = document.createElement('div');
      hashtagElement.className = 'trending-item';
      hashtagElement.innerHTML = `
        <a href="#" class="hashtag">#${hashtag.tag}</a>
        <span class="trending-count">${hashtag.count} posts</span>
      `;
      
      elements.trendingHashtags.appendChild(hashtagElement);
    });
  }
  
  // Load suggested follows
  function loadSuggestedFollows() {
    if (!elements.suggestedFollows) return;
    
    // Mock suggested follows
    const mockSuggestions = [
      {
        id: 4,
        name: 'David Wilson',
        position: 'Left Wing',
        team_name: 'Montreal Canadiens',
        avatar_url: '/api/placeholder/50/50'
      },
      {
        id: 5,
        name: 'Emma Thompson',
        position: 'Defense',
        team_name: 'Vancouver Canucks',
        avatar_url: '/api/placeholder/50/50'
      },
      {
        id: 6,
        name: 'James Rodriguez',
        position: 'Goalie',
        team_name: 'Calgary Flames',
        avatar_url: '/api/placeholder/50/50'
      }
    ];
    
    // Clear existing content
    elements.suggestedFollows.innerHTML = '';
    
    // Create suggestion elements
    mockSuggestions.forEach(suggestion => {
      const suggestionElement = document.createElement('div');
      suggestionElement.className = 'suggestion-item';
      suggestionElement.innerHTML = `
        <div class="suggestion-avatar">
          <img src="${suggestion.avatar_url}" alt="${suggestion.name}">
        </div>
        <div class="suggestion-info">
          <div class="suggestion-name">${suggestion.name}</div>
          <div class="suggestion-position">${suggestion.position}</div>
          <div class="suggestion-team">${suggestion.team_name}</div>
        </div>
        <button class="follow-btn" data-character-id="${suggestion.id}">Follow</button>
      `;
      
      elements.suggestedFollows.appendChild(suggestionElement);
    });
    
    // Add event listeners for follow buttons
    document.querySelectorAll('.follow-btn').forEach(button => {
      button.addEventListener('click', function() {
        const characterId = this.dataset.characterId;
        this.textContent = 'Following';
        this.classList.add('following');
        this.disabled = true;
        
        // In a real app, we would send the follow request to the server
      });
    });
  }
  
  // Load upcoming games
  function loadUpcomingGames() {
    if (!elements.upcomingGames) return;
    
    // Mock upcoming games
    const mockGames = [
      {
        id: 1,
        home_team: 'Toronto Maple Leafs',
        away_team: 'Montreal Canadiens',
        date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        location: 'Scotiabank Arena'
      },
      {
        id: 2,
        home_team: 'Vancouver Canucks',
        away_team: 'Calgary Flames',
        date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // 4 days from now
        location: 'Rogers Arena'
      }
    ];
    
    // Clear existing content
    elements.upcomingGames.innerHTML = '';
    
    // Create game elements
    mockGames.forEach(game => {
      const gameElement = document.createElement('div');
      gameElement.className = 'game-item';
      
      // Format date
      const formattedDate = game.date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
      
      gameElement.innerHTML = `
        <div class="game-teams">
          <span class="game-team home-team">${game.home_team}</span>
          <span class="game-vs">vs</span>
          <span class="game-team away-team">${game.away_team}</span>
        </div>
        <div class="game-details">
          <div class="game-date">${formattedDate}</div>
          <div class="game-location">${game.location}</div>
        </div>
      `;
      
      elements.upcomingGames.appendChild(gameElement);
    });
  }
  
  // Mock data functions
  function getMockAllPosts() {
    return [
      {
        id: '1',
        author: {
          id: 4,
          name: 'David Wilson',
          position: 'Left Wing',
          team_name: 'Montreal Canadiens',
          avatar_url: '/api/placeholder/60/60'
        },
        content: 'Great practice today! Working on my shot accuracy. #practice #improvement',
        imageUrl: null,
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        likes: 15,
        liked: false,
        comments: [
          {
            id: '1-1',
            author: {
              id: 5,
              name: 'Emma Thompson',
              position: 'Defense',
              team_name: 'Vancouver Canucks',
              avatar_url: '/api/placeholder/40/40'
            },
            content: 'Looking good! Your shot is already deadly.',
            timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000) // 1 hour ago
          },
          {
            id: '1-2',
            author: {
              id: 6,
              name: 'James Rodriguez',
              position: 'Goalie',
              team_name: 'Calgary Flames',
              avatar_url: '/api/placeholder/40/40'
            },
            content: 'I\'ll be ready to stop those shots next game! 😉',
            timestamp: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
          }
        ]
      },
      {
        id: '2',
        author: {
          id: 5,
          name: 'Emma Thompson',
          position: 'Defense',
          team_name: 'Vancouver Canucks',
          avatar_url: '/api/placeholder/60/60'
        },
        content: 'Just signed a new 3-year contract with the Canucks! So excited to be staying in Vancouver. #canucks #nhl #contract',
        imageUrl: '/api/placeholder/600/400',
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
        likes: 42,
        liked: true,
        comments: [
          {
            id: '2-1',
            author: {
              id: 4,
              name: 'David Wilson',
              position: 'Left Wing',
              team_name: 'Montreal Canadiens',
              avatar_url: '/api/placeholder/40/40'
            },
            content: 'Congratulations! Well deserved!',
            timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000) // 4 hours ago
          },
          {
            id: '2-2',
            author: {
              id: 6,
              name: 'James Rodriguez',
              position: 'Goalie',
              team_name: 'Calgary Flames',
              avatar_url: '/api/placeholder/40/40'
            },
            content: 'Great news! Looking forward to facing you on the ice!',
            timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000) // 3 hours ago
          },
          {
            id: '2-3',
            author: {
              id: 1,
              name: 'Mark Stevens',
              position: 'Center',
              team_name: 'Toronto Maple Leafs',
              avatar_url: '/api/placeholder/40/40'
            },
            content: 'Amazing! The team is lucky to have you.',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
          }
        ]
      },
      {
        id: '3',
        author: {
          id: 6,
          name: 'James Rodriguez',
          position: 'Goalie',
          team_name: 'Calgary Flames',
          avatar_url: '/api/placeholder/60/60'
        },
        content: 'New mask for the season! What do you think? #goalie #mask #flames',
        imageUrl: '/api/placeholder/600/400',
        timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
        likes: 27,
        liked: false,
        comments: [
          {
            id: '3-1',
            author: {
              id: 2,
              name: 'Alex Johnson',
              position: 'Defense',
              team_name: 'Toronto Maple Leafs',
              avatar_url: '/api/placeholder/40/40'
            },
            content: 'That\'s awesome! Love the design.',
            timestamp: new Date(Date.now() - 7 * 60 * 60 * 1000) // 7 hours ago
          },
          {
            id: '3-2',
            author: {
              id: 5,
              name: 'Emma Thompson',
              position: 'Defense',
              team_name: 'Vancouver Canucks',
              avatar_url: '/api/placeholder/40/40'
            },
            content: 'Looks intimidating! 🔥',
            timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000) // 6 hours ago
          }
        ]
      }
    ];
  }
  
  function getMockTeamPosts() {
    return [
      {
        id: '4',
        author: {
          id: 1,
          name: 'Mark Stevens',
          position: 'Center',
          team_name: 'Toronto Maple Leafs',
          avatar_url: '/api/placeholder/60/60'
        },
        content: 'Team dinner tonight! Great to bond with the guys. #leafsnation #teammates',
        imageUrl: '/api/placeholder/600/400',
        timestamp: new Date(Date.now() - 10 * 60 * 60 * 1000), // 10 hours ago
        likes: 31,
        liked: true,
        comments: [
          {
            id: '4-1',
            author: {
              id: 2,
              name: 'Alex Johnson',
              position: 'Defense',
              team_name: 'Toronto Maple Leafs',
              avatar_url: '/api/placeholder/40/40'
            },
            content: 'Great night! Let\'s do it again soon.',
            timestamp: new Date(Date.now() - 9 * 60 * 60 * 1000) // 9 hours ago
          }
        ]
      },
      {
        id: '5',
        author: {
          id: 2,
          name: 'Alex Johnson',
          position: 'Defense',
          team_name: 'Toronto Maple Leafs',
          avatar_url: '/api/placeholder/60/60'
        },
        content: 'Early morning practice. Let\'s get better today! #leafsnation #defense',
        imageUrl: null,
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        likes: 18,
        liked: false,
        comments: []
      }
    ];
  }
  
  function getMockFollowingPosts() {
    return [
      {
        id: '6',
        author: {
          id: 5,
          name: 'Emma Thompson',
          position: 'Defense',
          team_name: 'Vancouver Canucks',
          avatar_url: '/api/placeholder/60/60'
        },
        content: 'Off-season training begins! #hockey #training #summer',
        imageUrl: '/api/placeholder/600/400',
        timestamp: new Date(Date.now() - 36 * 60 * 60 * 1000), // 36 hours ago
        likes: 24,
        liked: true,
        comments: [
          {
            id: '6-1',
            author: {
              id: 1,
              name: 'Mark Stevens',
              position: 'Center',
              team_name: 'Toronto Maple Leafs',
              avatar_url: '/api/placeholder/40/40'
            },
            content: 'Looking strong! 💪',
            timestamp: new Date(Date.now() - 35 * 60 * 60 * 1000) // 35 hours ago
          }
        ]
      },
      {
        id: '7',
        author: {
          id: 6,
          name: 'James Rodriguez',
          position: 'Goalie',
          team_name: 'Calgary Flames',
          avatar_url: '/api/placeholder/60/60'
        },
        content: 'Excited to announce I\'ll be hosting a goalie camp for kids this summer! #givingback #goalies',
        imageUrl: null,
        timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000), // 2 days ago
        likes: 33,
        liked: false,
        comments: [
          {
            id: '7-1',
            author: {
              id: 3,
              name: 'Samantha Clarke',
              position: 'Goalie',
              team_name: 'Boston Bruins',
              avatar_url: '/api/placeholder/40/40'
            },
            content: 'That\'s awesome! Let me know if you need any help.',
            timestamp: new Date(Date.now() - 47 * 60 * 60 * 1000) // 47 hours ago
          }
        ]
      }
    ];
  }
  
  function getMockMentionPosts() {
    return [
      {
        id: '8',
        author: {
          id: 4,
          name: 'David Wilson',
          position: 'Left Wing',
          team_name: 'Montreal Canadiens',
          avatar_url: '/api/placeholder/60/60'
        },
        content: 'Great game against the Leafs last night. @Mark Stevens, that was a nice goal in the third period! #hockey #rivalry',
        imageUrl: null,
        timestamp: new Date(Date.now() - 60 * 60 * 60 * 1000), // 60 hours ago
        likes: 19,
        liked: false,
        comments: [
          {
            id: '8-1',
            author: {
              id: 1,
              name: 'Mark Stevens',
              position: 'Center',
              team_name: 'Toronto Maple Leafs',
              avatar_url: '/api/placeholder/40/40'
            },
            content: 'Thanks, David! You guys played well too. See you next game!',
            timestamp: new Date(Date.now() - 59 * 60 * 60 * 1000) // 59 hours ago
          }
        ]
      }
    ];
  }
});