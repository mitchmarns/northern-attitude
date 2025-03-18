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