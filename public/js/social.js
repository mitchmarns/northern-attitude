document.addEventListener('DOMContentLoaded', function() {
  // Post type selection
  const typeButtons = document.querySelectorAll('.type-btn');
  const postTypeInput = document.getElementById('post-type');
  const imageUrlArea = document.getElementById('image-url-area');
  const videoUrlArea = document.getElementById('video-url-area');
  const pollArea = document.getElementById('poll-area');
  const eventArea = document.getElementById('event-area');
  
  // Improved stat element selectors - use class names instead of nth-child
  const statPostsValue = document.querySelector('.stat-item[data-stat="posts"] .stat-value');
  const statFollowersValue = document.querySelector('.stat-item[data-stat="followers"] .stat-value');
  const statFollowingValue = document.querySelector('.stat-item[data-stat="following"] .stat-value');
  
  // Improved stat label selectors too
  const statPostsLabel = document.querySelector('.stat-item[data-stat="posts"] .stat-label');
  const statFollowersLabel = document.querySelector('.stat-item[data-stat="followers"] .stat-label');
  const statFollowingLabel = document.querySelector('.stat-item[data-stat="following"] .stat-label');
  
  // Character stats object to store original user stats
  const originalUserStats = {
    posts: statPostsValue ? statPostsValue.textContent.trim() : '0',
    followers: statFollowersValue ? statFollowersValue.textContent.trim() : '0',
    following: statFollowingValue ? statFollowingValue.textContent.trim() : '0'
  };
  
  // Save the original labels too
  const originalLabels = {
    posts: statPostsLabel ? statPostsLabel.textContent.trim() : 'Posts',
    followers: statFollowersLabel ? statFollowersLabel.textContent.trim() : 'Followers',
    following: statFollowingLabel ? statFollowingLabel.textContent.trim() : 'Following'
  };
  
  // Global character selection state
  const globalCharacterState = {
    selectedCharacterId: null,
    isCharacterSelected: false,
    
    // Initialize from session storage or DOM
    init() {
      // Try to get from sessionStorage first
      const storedId = sessionStorage.getItem('selectedCharacterId');
      if (storedId && storedId !== '0') {
        this.selectedCharacterId = storedId;
        this.isCharacterSelected = true;
        console.log('Global character state initialized from session storage:', storedId);
        return;
      }
      
      // Try to get from character-select dropdown
      const characterSelect = document.getElementById('character-select');
      if (characterSelect && characterSelect.value) {
        this.selectedCharacterId = characterSelect.value;
        this.isCharacterSelected = true;
        console.log('Global character state initialized from select element:', characterSelect.value);
        return;
      }
      
      // Try to get from hidden field
      const hiddenField = document.getElementById('client-selected-character');
      if (hiddenField && hiddenField.value && hiddenField.value !== '0') {
        this.selectedCharacterId = hiddenField.value;
        this.isCharacterSelected = true;
        console.log('Global character state initialized from hidden field:', hiddenField.value);
        return;
      }
      
      console.log('No character selection found during initialization');
    },
    
    // Update the state when character changes
    setSelectedCharacter(characterId) {
      if (!characterId || characterId === '0') {
        this.selectedCharacterId = null;
        this.isCharacterSelected = false;
        sessionStorage.removeItem('selectedCharacterId');
      } else {
        this.selectedCharacterId = characterId;
        this.isCharacterSelected = true;
        sessionStorage.setItem('selectedCharacterId', characterId);
      }
      
      // Update the hidden field if it exists
      const hiddenField = document.getElementById('client-selected-character');
      if (hiddenField) {
        hiddenField.value = characterId || '0';
      }
      
      // Update the character-id input if it exists
      const characterIdInput = document.getElementById('character-id');
      if (characterIdInput) {
        characterIdInput.value = characterId || '';
      }
      
      console.log('Global character state updated:', this.selectedCharacterId);
      
      // Dispatch a custom event that other components can listen for
      document.dispatchEvent(new CustomEvent('characterSelectionChanged', {
        detail: {
          characterId: this.selectedCharacterId,
          isSelected: this.isCharacterSelected
        }
      }));
    },
    
    // Get the current character ID, trying multiple sources to ensure we have the latest
    getCurrentCharacterId() {
      // If we already have a value, return it
      if (this.selectedCharacterId) {
        return this.selectedCharacterId;
      }
      
      // Try to get the value from various sources
      const characterSelect = document.getElementById('character-select');
      if (characterSelect && characterSelect.value) {
        this.selectedCharacterId = characterSelect.value;
        this.isCharacterSelected = true;
        return this.selectedCharacterId;
      }
      
      const hiddenField = document.getElementById('client-selected-character');
      if (hiddenField && hiddenField.value && hiddenField.value !== '0') {
        this.selectedCharacterId = hiddenField.value;
        this.isCharacterSelected = true;
        return this.selectedCharacterId;
      }
      
      const characterIdInput = document.getElementById('character-id');
      if (characterIdInput && characterIdInput.value) {
        this.selectedCharacterId = characterIdInput.value;
        this.isCharacterSelected = true;
        return this.selectedCharacterId;
      }
      
      const storedId = sessionStorage.getItem('selectedCharacterId');
      if (storedId && storedId !== '0') {
        this.selectedCharacterId = storedId;
        this.isCharacterSelected = true;
        return this.selectedCharacterId;
      }
      
      return null;
    },
    
    // Helper to check if a character is selected
    hasSelectedCharacter() {
      return !!this.getCurrentCharacterId();
    }
  };

  // Initialize the global state early
  globalCharacterState.init();

  // Character selection handling
  const characterSelect = document.getElementById('character-select');
  if (characterSelect) {
    characterSelect.addEventListener('change', function() {
      const characterId = this.value;
      
      // Update global state first
      globalCharacterState.setSelectedCharacter(characterId);
      
      // Update the active posting identity display
      const noCharacterSelected = document.querySelector('.no-character-selected');
      const postAsCharacterDisplay = document.querySelector('.post-as-character-display');
      
      if (characterId) {
        // Show character display and hide "no character selected" message
        if (noCharacterSelected) noCharacterSelected.style.display = 'none';
        if (postAsCharacterDisplay) postAsCharacterDisplay.style.display = 'flex';
        
        // Update character avatar and name
        const option = this.options[this.selectedIndex];
        const avatar = option.getAttribute('data-avatar');
        const name = option.text;
        
        const activeCharacterAvatar = document.querySelector('.active-character-avatar');
        const activeCharacterName = document.querySelector('.active-character-name');
        
        if (activeCharacterAvatar) activeCharacterAvatar.src = avatar;
        if (activeCharacterName) activeCharacterName.textContent = name;
        
        // Update character stats
        fetchCharacterStats(characterId);
        
        // Enable post button
        const postSubmitBtn = document.getElementById('post-submit-btn');
        if (postSubmitBtn) postSubmitBtn.disabled = false;
        
        // Hide warning
        const characterRequiredWarning = document.getElementById('character-required-warning');
        if (characterRequiredWarning) characterRequiredWarning.style.display = 'none';
        
        // Refresh suggested characters based on new character selection
        if (typeof refreshSuggestedCharacters === 'function') {
          refreshSuggestedCharacters(characterId);
        }
      } else {
        // Show "no character selected" message and hide character display
        if (noCharacterSelected) noCharacterSelected.style.display = 'block';
        if (postAsCharacterDisplay) postAsCharacterDisplay.style.display = 'none';
        
        // Reset to original user stats
        updateStatsDisplay(originalUserStats, originalLabels);
        
        // Disable post button
        const postSubmitBtn = document.getElementById('post-submit-btn');
        if (postSubmitBtn) postSubmitBtn.disabled = true;
        
        // Show warning
        const characterRequiredWarning = document.getElementById('character-required-warning');
        if (characterRequiredWarning) characterRequiredWarning.style.display = 'block';
        
        // Refresh suggested characters to show all
        if (typeof refreshSuggestedCharacters === 'function') {
          refreshSuggestedCharacters(0);
        }
      }
    });
    
    // Initialize with saved character on page load if available
    const savedCharacterId = sessionStorage.getItem('selectedCharacterId');
    if (savedCharacterId) {
      // Find the option with this value
      const option = characterSelect.querySelector(`option[value="${savedCharacterId}"]`);
      if (option) {
        characterSelect.value = savedCharacterId;
        // Trigger the change event to update UI
        const event = new Event('change');
        characterSelect.dispatchEvent(event);
        
        // Ensure the global state is updated
        globalCharacterState.setSelectedCharacter(savedCharacterId);
      }
    }
  }
  
  // Feed filter tab handling
  initializeFeedFilters();
  
  // Function to initialize feed filters
  function initializeFeedFilters() {
    const filterButtons = document.querySelectorAll('.feed-filter-bar .filter-btn');
    if (!filterButtons.length) return;
    
    // Get posts container
    const postsContainer = document.querySelector('.posts-container');
    if (!postsContainer) return;
    
    // Add click handlers to filter buttons
    filterButtons.forEach(btn => {
      btn.addEventListener('click', function() {
        // Skip if already active
        if (this.classList.contains('active')) return;
        
        // Remove active class from all buttons
        filterButtons.forEach(b => b.classList.remove('active'));
        
        // Add active class to clicked button
        this.classList.add('active');
        
        // Get filter type
        const filter = this.getAttribute('data-filter');
        console.log('Switching to filter:', filter);
        
        // Add loading state to posts container
        postsContainer.innerHTML = `
          <div class="posts-loading">
            <div class="loading-spinner-large"></div>
            <p>Loading posts...</p>
          </div>
        `;
        
        // Get the currently selected character ID (if any)
        const characterId = globalCharacterState.getCurrentCharacterId();
        
        // Check if we need a character for following tab
        if (filter === 'following' && !characterId) {
          postsContainer.innerHTML = `
            <div class="empty-feed card">
              <div class="empty-feed-message">
                <i class="ph-duotone ph-user-circle"></i>
                <h3>Select a Character First</h3>
                <p>Please select a character to see posts from accounts they follow.</p>
              </div>
            </div>
          `;
          return;
        }
        
        // Load posts with selected filter
        loadFilteredPosts(filter, 1, characterId);
      });
    });
    
    // Initialize Load More button if it exists
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', function() {
        // Get current page and increment
        let currentPage = parseInt(this.getAttribute('data-page') || '1');
        currentPage++;
        
        // Get active filter
        const activeFilter = document.querySelector('.feed-filter-bar .filter-btn.active');
        const filter = activeFilter ? activeFilter.getAttribute('data-filter') : 'all';
        
        // Get character ID
        const characterId = globalCharacterState.getCurrentCharacterId();
        
        // Show loading state on button
        const originalText = this.textContent;
        this.innerHTML = '<span class="loading-spinner-small"></span> Loading...';
        this.disabled = true;
        
        // Load more posts
        loadFilteredPosts(filter, currentPage, characterId, true);
        
        // Update data-page attribute
        this.setAttribute('data-page', currentPage.toString());
      });
    }
  }
  
  // Function to load posts with filter
  function loadFilteredPosts(filter, page = 1, characterId = null, append = false) {
    // Build URL with query parameters
    const url = `/social/posts/filtered?filter=${filter}&page=${page}&characterId=${characterId || ''}`;
    
    // Fetch posts
    fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        // Check for success
        if (!data.success) {
          throw new Error(data.error || 'Failed to load posts');
        }
        
        const postsContainer = document.querySelector('.posts-container');
        const loadMoreBtn = document.getElementById('load-more-btn');
        
        // If no posts found
        if (!data.posts || data.posts.length === 0) {
          if (!append) {
            // Only replace content if not appending
            postsContainer.innerHTML = renderEmptyFeedMessage(filter);
          }
          
          // Hide load more button
          if (loadMoreBtn) {
            loadMoreBtn.style.display = 'none';
          }
          return;
        }
        
        // Generate HTML for posts
        const postsHTML = data.posts.map(post => renderPostHTML(post)).join('');
        
        // Update posts container
        if (append) {
          // Append new posts for "load more"
          postsContainer.insertAdjacentHTML('beforeend', postsHTML);
        } else {
          // Replace all posts for tab switch
          postsContainer.innerHTML = postsHTML;
        }
        
        // Show/hide load more button based on pagination
        if (loadMoreBtn) {
          if (data.pagination.hasMore) {
            loadMoreBtn.style.display = 'block';
            loadMoreBtn.innerHTML = 'Load More';
            loadMoreBtn.disabled = false;
          } else {
            loadMoreBtn.style.display = 'none';
          }
        }
        
        // Re-initialize components for new content
        initializePollProgress();
        initializePollVoting();
        initializeVideoErrorHandling();
        
        // Fix image error handling for new posts
        postsContainer.querySelectorAll('img[data-fallback]').forEach(img => {
          img.onerror = function() {
            handleImageError(this);
          };
        });
      })
      .catch(error => {
        console.error('Error loading filtered posts:', error);
        
        // Show error message in posts container if not appending
        if (!append) {
          const postsContainer = document.querySelector('.posts-container');
          postsContainer.innerHTML = `
            <div class="error-message card">
              <i class="ph-duotone ph-warning"></i>
              <h3>Error Loading Posts</h3>
              <p>${error.message || 'Failed to load posts. Please try again.'}</p>
              <button class="btn btn-primary retry-load-btn">Retry</button>
            </div>
          `;
          
          // Add retry button handler
          const retryBtn = postsContainer.querySelector('.retry-load-btn');
          if (retryBtn) {
            retryBtn.addEventListener('click', function() {
              loadFilteredPosts(filter, page, characterId);
            });
          }
        }
        
        // Reset load more button if it exists
        const loadMoreBtn = document.getElementById('load-more-btn');
        if (loadMoreBtn) {
          loadMoreBtn.innerHTML = 'Load More';
          loadMoreBtn.disabled = false;
        }
      });
  }
  
  // Function to render empty feed message based on filter
  function renderEmptyFeedMessage(filter) {
    let message = '';
    
    switch (filter) {
      case 'following':
        message = `
          <div class="empty-feed card">
            <div class="empty-feed-message">
              <i class="ph-duotone ph-users"></i>
              <h3>No Posts from Followed Accounts</h3>
              <p>Your character isn't following anyone yet, or the accounts they follow haven't posted anything.</p>
              <a href="/social/explore" class="btn btn-primary mt-3">Explore Users</a>
            </div>
          </div>
        `;
        break;
      case 'team':
        message = `
          <div class="empty-feed card">
            <div class="empty-feed-message">
              <i class="ph-duotone ph-users-three"></i>
              <h3>No Team Posts Yet</h3>
              <p>There are no posts from your team members yet.</p>
            </div>
          </div>
        `;
        break;
      default:
        message = `
          <div class="empty-feed card">
            <div class="empty-feed-message">
              <i class="ph-duotone ph-chat-circle"></i>
              <h3>No Posts Yet</h3>
              <p>Be the first to create a post or follow people to see their posts here!</p>
            </div>
          </div>
        `;
    }
    
    return message;
  }
  
  // Function to render a post HTML (simplified version)
  function renderPostHTML(post) {
    // Format date
    const postDate = new Date(post.created_at).toLocaleString();
    
    // Start building the post HTML
    let html = `
      <div class="post-card card">
        <div class="post-header">
          <div class="post-author">
    `;
    
    // Author/character info
    if (post.character_id) {
      html += `
        <img src="${post.character_avatar || post.url || '/img/default-character.svg'}" 
             alt="${post.character_name}" 
             class="post-avatar"
             data-fallback="/img/default-character.svg"
             onerror="handleImageError(this)">
        <div class="author-info">
          <h4>${post.character_name}</h4>
          <p class="author-meta">@${post.username} • ${postDate}</p>
        </div>
      `;
    } else {
      html += `
        <div class="post-avatar-placeholder">
          <i class="icon-user"></i>
        </div>
        <div class="author-info">
          <h4>@${post.username}</h4>
          <p class="author-meta">${postDate}</p>
        </div>
      `;
    }
    
    // Close author div and add post options
    html += `
          </div>
          <div class="post-options">
            <button class="options-btn"><i class="icon-options"></i></button>
          </div>
        </div>
    `;
    
    // Title (if any)
    if (post.title) {
      html += `<h3 class="post-title">${post.title}</h3>`;
    }
    
    // Content
    html += `<div class="post-content formatted-text">${post.content}</div>`;
    
    // Media (if any)
    if (post.media && post.media.length) {
      if (post.post_type === 'image') {
        html += `<div class="post-media"><div class="image-gallery">`;
        post.media.forEach(media => {
          html += `
            <img src="${media.url}" 
                 alt="Post image" 
                 class="post-image" 
                 data-fallback="/img/broken-image.png"
                 onerror="this.src='/img/broken-image.png';">
          `;
        });
        html += `</div></div>`;
      } else if (post.post_type === 'video') {
        html += `
          <div class="post-media">
            <video controls class="post-video">
              <source src="${post.media[0].url}" type="video/mp4">
              Your browser does not support the video tag.
            </video>
          </div>
        `;
      }
    } else if (post.post_type === 'image') {
      html += `
        <div class="post-media-missing">
          <p class="text-muted"><em>Image(s) unavailable</em></p>
        </div>
      `;
    }
    
    // Poll (if applicable)
    if (post.post_type === 'poll' && post.poll_options && Array.isArray(post.poll_options)) {
      html += `<div class="post-poll" data-post-id="${post.id}">`;
      
      post.poll_options.forEach(option => {
        html += `
          <div class="poll-option-result" data-option-id="${option.id}" data-post-id="${post.id}">
            <div class="poll-option-text">${option && option.text ? option.text : 'No option text'}</div>
            <div class="poll-progress-bar">
              <div class="poll-progress" data-percentage="${option && typeof option.percentage === 'number' ? option.percentage : 0}"></div>
            </div>
            <div class="poll-percentage">${option && typeof option.percentage === 'number' ? option.percentage : 0}%</div>
          </div>
        `;
      });
      
      html += `
        <div class="poll-votes-count">${post.total_votes || 0} votes</div>
        <div class="poll-vote-actions">
          <button class="btn btn-sm btn-outline poll-vote-btn" data-post-id="${post.id}">Vote</button>
        </div>
      </div>`;
    }
    
    // Event (if applicable)
    if (post.post_type === 'event') {
      const eventDate = post.event_date ? new Date(post.event_date).toLocaleDateString() : '';
      
      html += `
        <div class="post-event" data-post-id="${post.id}">
          <div class="event-details">
            <div class="event-date">
              <i class="ph-duotone ph-calendar-blank"></i> ${eventDate}
            </div>
            <div class="event-time">
              <i class="ph-duotone ph-timer"></i> ${post.event_time || ''}
            </div>
            <div class="event-location">
              <i class="ph-duotone ph-map-pin"></i> ${post.event_location || ''}
            </div>
          </div>
          <div class="event-actions">
            <button class="btn btn-outline btn-sm event-interested-btn">
              <i class="ph-duotone ph-star"></i> Interested <span class="interested-count">0</span>
            </button>
            <button class="btn btn-primary btn-sm event-going-btn">
              <i class="ph-duotone ph-check"></i> Going <span class="going-count">0</span>
            </button>
          </div>
        </div>
      `;
    }
    
    // Tags
    html += `<div class="post-tags">`;
    if (post.tags && post.tags.length) {
      post.tags.forEach(tag => {
        html += `<a href="/social/tag/${tag.name}" class="post-tag">#${tag.name}</a>`;
      });
    }
    html += `</div>`;
    
    // Post actions
    html += `
      <div class="post-actions">
        <button class="action-btn like-btn ${post.liked ? 'active' : ''}" data-post-id="${post.id}">
          <i class="ph-duotone ph-thumbs-up"></i> <span class="like-count">${post.like_count || 0}</span>
        </button>
        <button class="action-btn comment-btn" data-post-id="${post.id}">
          <i class="ph-duotone ph-chat"></i> <span class="comment-count">${post.comment_count || 0}</span>
        </button>
        <button class="action-btn share-btn" data-post-id="${post.id}">
          <i class="ph-duotone ph-share"></i>
        </button>
        <button class="action-btn bookmark-btn ${post.bookmarked ? 'active' : ''}" data-post-id="${post.id}">
          <i class="ph-duotone ph-bookmark"></i>
        </button>
      </div>
    `;
    
    // Comments
    html += `<div class="post-comments">`;
    
    if (post.comments && post.comments.length) {
      html += `
        <div class="comments-header">
          <h4>Comments (${post.comments.length})</h4>
          <button class="toggle-comments-btn">Show Comments</button>
        </div>
        <div class="comments-list" style="display: none;">
      `;
      
      post.comments.forEach(comment => {
        html += `
          <div class="comment">
            <div class="comment-avatar">
        `;
        
        if (comment.character_id) {
          html += `
            <img src="${comment.character_avatar || comment.url || '/img/default-character.svg'}" 
                 alt="${comment.character_name}"
                 data-fallback="/img/default-character.svg"
                 onerror="handleImageError(this)">
          `;
        } else {
          html += `
            <div class="comment-avatar-placeholder">
              <i class="icon-user"></i>
            </div>
          `;
        }
        
        html += `
            </div>
            <div class="comment-content">
              <div class="comment-header">
        `;
        
        if (comment.character_id) {
          html += `<h5>${comment.character_name} <span class="comment-username">@${comment.username}</span></h5>`;
        } else {
          html += `<h5>@${comment.username}</h5>`;
        }
        
        html += `
                <span class="comment-date">${new Date(comment.created_at).toLocaleString()}</span>
              </div>
              <p>${comment.content}</p>
              <div class="comment-actions">
                <button class="comment-action-btn reply-btn" data-comment-id="${comment.id}">Reply</button>
                <button class="comment-action-btn like-btn" data-comment-id="${comment.id}">Like</button>
              </div>
            </div>
          </div>
        `;
      });
      
      html += `</div>`; // Close comments-list
    }
    
    // Add comment form
    html += `
      <div class="add-comment-form">
        <div class="comment-form-header">
          <div class="comment-form-avatar comment-avatar-container">
            <div class="comment-avatar-placeholder">
              <i class="ph-duotone ph-user"></i>
            </div>
          </div>
          <textarea class="form-control comment-input" placeholder="Write a comment as your character..." data-post-id="${post.id}"></textarea>
        </div>
        <div class="comment-form-footer">
          <button class="btn btn-primary btn-sm submit-comment-btn" data-post-id="${post.id}">Comment</button>
        </div>
      </div>
    `;
    
    html += `</div>`; // Close post-comments
    html += `</div>`; // Close post-card
    
    return html;
  }
  
  // Listen for character changes to refresh following feed if needed
  document.addEventListener('characterSelectionChanged', function(e) {
    // Check if we're currently on the following tab
    const followingTab = document.querySelector('.feed-filter-bar .filter-btn[data-filter="following"].active');
    if (followingTab && e.detail.characterId) {
      // Reload the following tab with the new character
      loadFilteredPosts('following', 1, e.detail.characterId);
    }
  });

  // Make these functions available globally
  window.loadFilteredPosts = loadFilteredPosts;
  window.initializeFeedFilters = initializeFeedFilters;
  
  // Function to fetch and update character stats
  function fetchCharacterStats(characterId) {
    if (!characterId) return;
    
    console.log('Fetching stats for character:', characterId);
    
    // Show loading state
    updateStatsDisplay({
      posts: '...',
      followers: '...',
      following: '...'
    });
    
    fetch(`/social/character/${characterId}/stats`)
      .then(response => response.json())
      .then(data => {
        console.log('Character stats:', data);
        
        if (data.success) {
          // Update the stats in the UI
          updateStatsDisplay(data.stats);
        } else {
          console.error('Failed to fetch character stats:', data.error);
          // Revert to original stats on error
          updateStatsDisplay(originalUserStats, originalLabels);
        }
      })
      .catch(error => {
        console.error('Error fetching character stats:', error);
        // Revert to original stats on error
        updateStatsDisplay(originalUserStats, originalLabels);
      });
  }
  
  // Function to update the stats display in the UI
  function updateStatsDisplay(stats, labels = null) {
    // Update stat values
    if (statPostsValue) statPostsValue.textContent = stats.posts;
    if (statFollowersValue) statFollowersValue.textContent = stats.followers;
    if (statFollowingValue) statFollowingValue.textContent = stats.following;
    
    // Update labels if provided
    if (labels) {
      if (statPostsLabel) statPostsLabel.textContent = labels.posts;
      if (statFollowersLabel) statFollowersLabel.textContent = labels.followers;
      if (statFollowingLabel) statFollowingLabel.textContent = labels.following;
    }
  }
  
  // Fixed post type selection
  typeButtons.forEach(button => {
    button.addEventListener('click', function() {
      // Remove active class from all buttons
      typeButtons.forEach(btn => btn.classList.remove('active'));
      
      // Add active class to this button
      this.classList.add('active');
      
      // Get the post type from data attribute
      const postType = this.getAttribute('data-type');
      
      // Update hidden input
      if (postTypeInput) postTypeInput.value = postType;
      
      // Show/hide appropriate form sections
      if (imageUrlArea) imageUrlArea.style.display = postType === 'image' ? 'block' : 'none';
      if (videoUrlArea) videoUrlArea.style.display = postType === 'video' ? 'block' : 'none';
      if (pollArea) pollArea.style.display = postType === 'poll' ? 'block' : 'none';
      if (eventArea) eventArea.style.display = postType === 'event' ? 'block' : 'none';
    });
  });
  
  // Function to initialize poll progress bars
  function initializePollProgress() {
    document.querySelectorAll('.poll-progress').forEach(progressBar => {
      const percentage = progressBar.getAttribute('data-percentage');
      if (percentage) {
        progressBar.style.width = `${percentage}%`;
        
        // Add color variations based on percentage
        if (parseFloat(percentage) > 50) {
          progressBar.style.backgroundColor = 'var(--accent3)';
        } else if (parseFloat(percentage) < 20) {
          progressBar.style.backgroundColor = 'var(--muted)';
        }
      }
    });
  }
  
  // Map to store which poll option is selected for each post
  const selectedPollOptions = new Map();
  
  // Function to initialize poll voting interactions
  function initializePollVoting() {
    // Add click handlers to poll options
    document.querySelectorAll('.poll-option-result').forEach(option => {
      option.addEventListener('click', function() {
        // Get poll container
        const pollContainer = this.closest('.post-poll');
        if (!pollContainer) return;
        
        // Check if a character is selected first
        if (!globalCharacterState.hasSelectedCharacter()) {
          showToast('Please select a character first to vote', 'warning');
          scrollToCharacterSelector();
          return;
        }
        
        // Get post ID and option ID
        const postId = this.getAttribute('data-post-id');
        const optionId = this.getAttribute('data-option-id');
        
        // Check if already voted
        if (pollContainer.classList.contains('poll-results')) {
          console.log('Already voted on this poll');
          return;
        }
        
        // Remove selected class from other options
        pollContainer.querySelectorAll('.poll-option-result').forEach(opt => {
          opt.classList.remove('selected-option');
        });
        
        // Add selected class to this option
        this.classList.add('selected-option');
        console.log('Added selected-option class to option element');
        
        // Store the selected option
        selectedPollOptions.set(parseInt(postId), parseInt(optionId));
        
        console.log('Selected poll option:', optionId, 'for post:', postId);
        
        // Enable the vote button
        const voteBtn = pollContainer.querySelector('.poll-vote-btn');
        if (voteBtn) {
          voteBtn.disabled = false;
          voteBtn.classList.add('btn-primary');
          voteBtn.classList.remove('btn-outline');
          console.log('Enabled vote button');
        } else {
          console.warn('Vote button not found');
        }
      });
    });
    
    // Add click handlers to vote buttons
    document.querySelectorAll('.poll-vote-btn').forEach(btn => {
      // Initially disable vote buttons until an option is selected
      btn.disabled = true;
      
      btn.addEventListener('click', async function() {
        const postId = this.getAttribute('data-post-id');
        
        // Use global character state for consistent character ID
        const characterId = globalCharacterState.getCurrentCharacterId();
        
        console.log(`Vote button clicked - Post ID: ${postId}, Character ID: ${characterId}`);
        
        if (!characterId) {
          showToast('Please select a character first to vote', 'warning');
          scrollToCharacterSelector();
          return;
        }
        
        const selectedOptionId = selectedPollOptions.get(parseInt(postId));
        if (!selectedOptionId) {
          showToast('Please select an option before voting', 'warning');
          return;
        }
        
        // Show loading state
        this.innerHTML = '<span class="loading-spinner"></span> Voting...';
        this.disabled = true;
        
        try {
          console.log('Sending vote request with:', { characterId, optionId: selectedOptionId });
          
          // Send vote to server
          const response = await fetch(`/social/post/${postId}/vote`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({
              characterId: characterId,
              optionId: selectedOptionId
            })
          });
          
          const data = await response.json();
          console.log('Vote response:', data);
          
          if (data.success) {
            // Update UI to show results
            updatePollResults(postId, data.pollResults);
            showToast('Vote recorded successfully', 'success');
          } else {
            // Reset button state
            this.innerHTML = 'Vote';
            this.disabled = false;
            showToast(data.message || 'Failed to record vote', 'error');
          }
        } catch (error) {
          console.error('Error voting on poll:', error);
          // Reset button state
          this.innerHTML = 'Vote';
          this.disabled = false;
          showToast('Failed to record vote', 'error');
        }
      });
    });
  }
  
  // Function to update poll results in UI after voting
  function updatePollResults(postId, pollResults) {
    // Find the poll container - handle both selector types for browser compatibility
    let pollContainer = document.querySelector(`.post-poll[data-post-id="${postId}"]`);
    if (!pollContainer) {
      // Alternative approach for browsers that don't support the :has() selector
      document.querySelectorAll('.post-poll').forEach(container => {
        if (container.querySelector(`[data-post-id="${postId}"]`)) {
          pollContainer = container;
        }
      });
    }
    
    if (!pollContainer) return;
    
    // Update vote count
    const votesCountEl = pollContainer.querySelector('.poll-votes-count');
    if (votesCountEl && pollResults.totalVotes !== undefined) {
      votesCountEl.textContent = `${pollResults.totalVotes} votes`;
    }
    
    // Update each option's percentage
    if (pollResults.options && Array.isArray(pollResults.options)) {
      pollResults.options.forEach(option => {
        const optionEl = pollContainer.querySelector(`.poll-option-result[data-option-id="${option.id}"]`);
        if (optionEl) {
          const progressBar = optionEl.querySelector('.poll-progress');
          const percentageEl = optionEl.querySelector('.poll-percentage');
          
          if (progressBar) {
            progressBar.style.width = `${option.percentage}%`;
            progressBar.setAttribute('data-percentage', option.percentage);
            
            // Add color variations based on percentage
            if (parseFloat(option.percentage) > 50) {
              progressBar.style.backgroundColor = 'var(--accent3)';
            } else if (parseFloat(option.percentage) < 20) {
              progressBar.style.backgroundColor = 'var(--muted)';
            }
          }
          
          if (percentageEl) {
            percentageEl.textContent = `${option.percentage}%`;
          }
          
          // Mark as voted if this was the user's choice
          if (option.userVoted) {
            optionEl.classList.add('user-voted');
          }
        }
      });
    }
    
    // Change UI to show results state - disable further voting
    const voteButton = pollContainer.querySelector('.poll-vote-btn');
    if (voteButton) {
      voteButton.textContent = 'Voted';
      voteButton.disabled = true;
      voteButton.classList.add('voted');
    }
    
    // Add a "results" class to the poll container to allow styling voted polls
    pollContainer.classList.add('poll-results');
  }

  // Add CSS for highlighted character selector
  function addDynamicStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .highlight-selector {
        animation: highlight-selector-animation 1s ease-in-out infinite;
      }
      @keyframes highlight-selector-animation {
        0%, 100% {
          border-color: var(--accent1);
          box-shadow: 0 0 10px var(--accent1);
        }
        50% {
          border-color: var(--accent2);
          box-shadow: 0 0 20px var(--accent2);
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  // Toast notification system
  function showToast(message, type = 'error') {
    if (!message) return;
    
    console.log(`Showing toast: ${message} (${type})`);
    
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.className = 'toast-container';
      document.body.appendChild(toastContainer);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast-content">${message}</div>
      <button class="toast-close">&times;</button>
    `;
    
    toastContainer.appendChild(toast);
    toast.classList.add('show');
    
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.remove();
        }
      }, 300);
    });
    
    setTimeout(() => {
      if (toast.parentNode) {
        toast.classList.remove('show');
        setTimeout(() => {
          if (toast.parentNode) {
            toast.remove();
          }
        }, 300);
      }
    }, 5000);
  }

  // Function to refresh suggested characters when changing character
  function refreshSuggestedCharacters(selectedCharacterId) {
    // If no ID is provided, try to get from global state
    if (!selectedCharacterId) {
      selectedCharacterId = globalCharacterState.getCurrentCharacterId();
    }
    
    console.log('Refreshing suggested characters for character ID:', selectedCharacterId);
    
    // First, show a loading state
    const suggestedList = document.querySelector('.suggested-list');
    if (!suggestedList) {
      console.warn('Could not find .suggested-list element');
      return;
    }
    
    // Save child element reference for hidden input
    const hiddenInput = suggestedList.querySelector('#client-selected-character');
    
    // Set loading state
    suggestedList.innerHTML = `
      <li class="loading-suggestions">
        <div class="loading-spinner-container">
          <div class="loading-spinner-large"></div>
        </div>
        <p class="text-center">Refreshing suggestions...</p>
      </li>
    `;
    
    // Add the hidden input back if it exists
    if (hiddenInput) {
      suggestedList.appendChild(hiddenInput);
    }
    
    // Add timestamp to force fresh response and prevent caching
    const timestamp = Date.now();
    const apiUrl = `/social/suggested-characters?exclude=${selectedCharacterId}&_t=${timestamp}`;
    console.log('Fetching suggestions from:', apiUrl);
    
    // Fetch fresh suggestions that exclude the selected character
    fetch(apiUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to fetch suggestions: ${response.status} ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('Suggested characters API response:', data);
        
        // Check if response has valid data
        if (!data || !data.success) {
          console.warn('Invalid API response format:', data);
          showNoSuggestionsMessage(suggestedList, selectedCharacterId);
          return;
        }
        
        if (!data.characters || !Array.isArray(data.characters)) {
          console.warn('API response missing characters array:', data);
          showNoSuggestionsMessage(suggestedList, selectedCharacterId);
          return;
        }
        
        // Check if we received any characters
        if (data.characters.length === 0) {
          console.log('API returned zero characters');
          // Try the most permissive approach possible
          fetchAllCharacters(suggestedList, selectedCharacterId);
          return;
        }
        
        // Success case - we have characters to display
        updateSuggestedCharactersList(data.characters);
        
        // Reinitialize follow buttons with a slight delay to ensure DOM is updated
        setTimeout(() => {
          initializeSuggestedUsers();
        }, 100);
      })
      .catch(error => {
        console.error('Error refreshing suggestions:', error);
        
        // Show error state
        suggestedList.innerHTML = `
          <li class="error-message">
            <p>Error loading suggestions: ${error.message}</p>
            <button class="btn btn-sm btn-outline refresh-suggestions-btn">Try Again</button>
          </li>
        `;
        
        // Add the hidden input back if it exists
        if (hiddenInput) {
          suggestedList.appendChild(hiddenInput);
        }
        
        // Add click handler to the refresh button
        const refreshBtn = suggestedList.querySelector('.refresh-suggestions-btn');
        if (refreshBtn) {
          refreshBtn.addEventListener('click', function() {
            refreshSuggestedCharacters(selectedCharacterId);
          });
        }
      });
  }

  // Helper function to handle image loading errors
  function handleImageError(img) {
    const fallbackUrl = img.getAttribute('data-fallback');
    if (fallbackUrl) {
      img.src = fallbackUrl;
      // Remove the onerror handler to prevent infinite loops if fallback also fails
      img.onerror = null;
    }
  }

  // Video error handling initialization
  function initializeVideoErrorHandling() {
    document.querySelectorAll('video').forEach(video => {
      video.addEventListener('error', function() {
        console.error('Video failed to load:', this.src);
        const container = this.closest('.post-video-container') || this.parentElement;
        if (container) {
          container.innerHTML = `
            <div class="video-error-message">
              <i class="ph-duotone ph-warning-circle"></i>
              <p>Video could not be loaded</p>
            </div>
          `;
        }
      });
    });
  }

  // Right sidebar initialization
  function initializeRightSidebar() {
    // If on a small screen, collapse the sidebar by default
    if (window.innerWidth < 992) {
      const sidebarContent = document.querySelector('.right-sidebar-content');
      if (sidebarContent) {
        sidebarContent.classList.add('collapsed');
      }
    }

    // Toggle right sidebar
    const toggleButtons = document.querySelectorAll('.toggle-sidebar-btn');
    toggleButtons.forEach(btn => {
      btn.addEventListener('click', function() {
        const sidebarContent = document.querySelector('.right-sidebar-content');
        if (sidebarContent) {
          sidebarContent.classList.toggle('collapsed');
          // Update button icon
          const icon = this.querySelector('i');
          if (icon) {
            if (sidebarContent.classList.contains('collapsed')) {
              icon.className = 'ph-duotone ph-arrow-left';
            } else {
              icon.className = 'ph-duotone ph-arrow-right';
            }
          }
        }
      });
    });
  }

  // Event responses initialization
  function initializeEventResponses() {
    document.querySelectorAll('.event-response-btn').forEach(btn => {
      btn.addEventListener('click', async function() {
        const eventId = this.getAttribute('data-event-id');
        const response = this.getAttribute('data-response');
        const characterId = globalCharacterState.getCurrentCharacterId();
        
        if (!characterId) {
          showToast('Please select a character first to respond', 'warning');
          scrollToCharacterSelector();
          return;
        }
        
        try {
          const result = await fetch(`/social/event/${eventId}/respond`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({
              characterId,
              response
            })
          });
          
          const data = await result.json();
          
          if (data.success) {
            // Update UI
            const responseCounters = document.querySelectorAll(`.event-response-count[data-event-id="${eventId}"]`);
            responseCounters.forEach(counter => {
              const counterType = counter.getAttribute('data-response-type');
              if (data.counts && data.counts[counterType] !== undefined) {
                counter.textContent = data.counts[counterType];
              }
            });
            
            // Update active state
            document.querySelectorAll(`.event-response-btn[data-event-id="${eventId}"]`).forEach(b => {
              b.classList.remove('active');
            });
            this.classList.add('active');
            
            showToast('Response recorded', 'success');
          } else {
            showToast(data.message || 'Failed to record response', 'error');
          }
        } catch (err) {
          console.error('Error responding to event:', err);
          showToast('Error recording response', 'error');
        }
      });
    });
  }

  // Helper function to show "no suggestions" message
  function showNoSuggestionsMessage(container, selectedCharacterId) {
    container.innerHTML = `
      <li class="no-suggestions">
        <p>No character suggestions available</p>
      </li>
    `;
  }

  // Fallback function to fetch all characters
  function fetchAllCharacters(container, selectedCharacterId) {
    fetch(`/social/all-characters?exclude=${selectedCharacterId}`)
      .then(response => response.json())
      .then(data => {
        if (data.success && data.characters && data.characters.length > 0) {
          updateSuggestedCharactersList(data.characters);
          setTimeout(() => {
            initializeSuggestedUsers();
          }, 100);
        } else {
          showNoSuggestionsMessage(container, selectedCharacterId);
        }
      })
      .catch(error => {
        console.error('Error fetching all characters:', error);
        showNoSuggestionsMessage(container, selectedCharacterId);
      });
  }

  // Update suggested characters list
  function updateSuggestedCharactersList(characters) {
    const suggestedList = document.querySelector('.suggested-list');
    if (!suggestedList) return;
    
    // Save hidden input if exists
    const hiddenInput = suggestedList.querySelector('#client-selected-character');
    
    // Get the current character ID
    const currentCharacterId = globalCharacterState.getCurrentCharacterId();
    
    // Clear the list
    suggestedList.innerHTML = '';
    
    // Add characters
    characters.forEach(character => {
      // Check if this character is already being followed
      const isFollowing = character.is_following || false;
      
      const listItem = document.createElement('li');
      listItem.className = 'suggested-item';
      listItem.setAttribute('data-character-id', character.id);
      
      // Create button class and content based on follow status
      const buttonClass = isFollowing ? 'btn-primary' : 'btn-outline';
      const buttonContent = isFollowing ? 
        '<i class="ph-duotone ph-check"></i> Following' : 
        '<i class="ph-duotone ph-plus"></i> Follow';
      
      listItem.innerHTML = `
        <div class="suggested-avatar">
          <img src="${character.avatar_url || character.url || '/img/default-character.svg'}" 
               data-fallback="/img/default-character.svg" 
               alt="${character.name}" 
               onerror="handleImageError(this)">
        </div>
        <div class="suggested-info">
          <a href="/social/profile/${character.url || character.id}" class="suggested-name">${character.name}</a>
          <span class="suggested-meta">by @${character.creator_username}</span>
        </div>
        <button class="btn btn-sm ${buttonClass} follow-btn" data-character-id="${character.id}" data-is-following="${isFollowing}">
          ${buttonContent}
        </button>
      `;
      suggestedList.appendChild(listItem);
    });
    
    // Add the hidden input back if it exists
    if (hiddenInput) {
      suggestedList.appendChild(hiddenInput);
    }
    
    // If we have a current character ID, fetch follow status for all suggestions
    if (currentCharacterId) {
      fetchFollowStatuses(currentCharacterId, characters.map(c => c.id));
    }
  }
  
  // Function to fetch follow statuses for multiple characters at once
  function fetchFollowStatuses(followerId, followingIds) {
    if (!followerId || !followingIds || followingIds.length === 0) return;
    
    // Convert to comma-separated string if it's an array
    const followingIdsParam = Array.isArray(followingIds) ? followingIds.join(',') : followingIds;
    
    // Simpler approach that doesn't use HEAD request which can cause errors
    fetch(`/social/check-follow-status?followerId=${followerId}&followingIds=${followingIdsParam}`)
      .then(response => {
        // Parse JSON regardless of status code to handle any API response format
        return response.json().catch(e => {
          console.warn('Error parsing response:', e);
          return { success: false, error: 'Invalid response format' };
        });
      })
      .then(data => {
        if (data.success && data.statuses) {
          // Update UI for each character based on follow status
          Object.entries(data.statuses).forEach(([characterId, isFollowing]) => {
            updateFollowButtonStatus(characterId, isFollowing);
          });
        } else {
          console.warn('API returned unsuccessful response:', data);
          // Fall back to checking individually
          checkFollowStatusesIndividually(followerId, followingIds);
        }
      })
      .catch(error => {
        console.warn('Could not fetch follow statuses:', error.message);
        console.log('Using fallback method to check follows individually');
        
        // Fallback approach: Check each follow status separately
        checkFollowStatusesIndividually(followerId, followingIds);
      });
  }
  
  // Fallback function to check follow statuses individually
  function checkFollowStatusesIndividually(followerId, followingIds) {
    if (!Array.isArray(followingIds)) {
      followingIds = followingIds.split(',');
    }
    
    // First try the new simple endpoint
    const checkEndpoint = `/social/check-follow/${followerId}`;
    
    // Process each character separately
    followingIds.forEach(characterId => {
      fetch(`${checkEndpoint}/${characterId}`)
        .then(response => {
          // Return parsed JSON or a default object if parsing fails
          return response.json().catch(() => ({ success: false }));
        })
        .then(data => {
          if (data && data.success) {
            updateFollowButtonStatus(characterId, data.isFollowing);
          } else {
            // If that fails, use initial attribute value as fallback
            useInitialFollowStatus(characterId);
          }
        })
        .catch(error => {
          console.warn(`Could not check follow status for character ${characterId}:`, error.message);
          useInitialFollowStatus(characterId);
        });
    });
  }
  
  // Helper function to use initial follow status
  function useInitialFollowStatus(characterId) {
    const button = document.querySelector(`.follow-btn[data-character-id="${characterId}"]`);
    if (button) {
      // Use the initial data-is-following attribute as source of truth
      const initialValue = button.getAttribute('data-is-following') === 'true';
      console.log(`Using initial follow status for ${characterId}:`, initialValue);
    }
  }

  // Helper function to update follow button status
  function updateFollowButtonStatus(characterId, isFollowing) {
    const followBtn = document.querySelector(`.follow-btn[data-character-id="${characterId}"]`);
    if (followBtn) {
      if (isFollowing) {
        followBtn.innerHTML = '<i class="ph-duotone ph-check"></i> Following';
        followBtn.classList.remove('btn-outline');
        followBtn.classList.add('btn-primary');
        followBtn.setAttribute('data-is-following', 'true');
      } else {
        followBtn.innerHTML = '<i class="ph-duotone ph-plus"></i> Follow';
        followBtn.classList.remove('btn-primary');
        followBtn.classList.add('btn-outline');
        followBtn.setAttribute('data-is-following', 'false');
      }
    }
  }

  // Initialize suggested users interaction
  function initializeSuggestedUsers() {
    document.querySelectorAll('.follow-btn').forEach(btn => {
      btn.addEventListener('click', async function() {
        const characterToFollowId = this.getAttribute('data-character-id');
        
        // Use the global character state manager
        const currentCharacterId = globalCharacterState.getCurrentCharacterId();
        const isFollowing = this.getAttribute('data-is-following') === 'true';
        
        if (!currentCharacterId) {
          showToast('Please select a character first', 'warning');
          scrollToCharacterSelector();
          return;
        }
        
        // Show loading state
        const originalContent = this.innerHTML;
        this.innerHTML = '<div class="loading-spinner-small"></div>';
        this.disabled = true;
        
        try {
          // Determine if we're following or unfollowing
          const endpoint = isFollowing ? '/social/unfollow' : '/social/follow';
          let success = false;
          let data = null;
          
          try {
            // Try the main endpoint first
            const response = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
              },
              body: JSON.stringify({
                followerId: currentCharacterId, 
                followingId: characterToFollowId
              })
            });
            
            data = await response.json();
            
            // Handle the case where already following is a success case
            success = response.ok && (data.success !== false);
            
            // If we get alreadyFollowing flag, we should treat this as success and update UI accordingly
            if (data.alreadyFollowing) {
              success = true;
            }
          } catch (mainEndpointError) {
            console.warn(`Main endpoint ${endpoint} failed:`, mainEndpointError);
            
            // Try alternative endpoint if main one fails
            try {
              const fallbackEndpoint = '/social/follow/character/' + characterToFollowId;
              const fallbackResponse = await fetch(fallbackEndpoint, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                },
                body: JSON.stringify({
                  sourceCharacterId: currentCharacterId,
                  action: isFollowing ? 'unfollow' : 'follow'
                })
              });
              
              data = await fallbackResponse.json();
              success = fallbackResponse.ok && data.success !== false;
            } catch (fallbackError) {
              console.error('Fallback endpoint also failed:', fallbackError);
              success = false;
            }
          }
          
          // If either endpoint succeeded
          if (success) {
            if (isFollowing) {
              // Update to "Follow" state
              this.innerHTML = '<i class="ph-duotone ph-plus"></i> Follow';
              this.classList.remove('btn-primary');
              this.classList.add('btn-outline');
              this.setAttribute('data-is-following', 'false');
              
              // Update follower count if it exists (decrease)
              const followerCountEl = document.querySelector('.stat-item[data-stat="followers"] .stat-value');
              if (followerCountEl) {
                const currentCount = parseInt(followerCountEl.textContent.trim(), 10);
                if (!isNaN(currentCount) && currentCount > 0) {
                  followerCountEl.textContent = (currentCount - 1).toString();
                }
              }
              
              showToast('Successfully unfollowed character', 'success');
            } else {
              // Update to "Following" state
              this.innerHTML = '<i class="ph-duotone ph-check"></i> Following';
              this.classList.remove('btn-outline');
              this.classList.add('btn-primary');
              this.setAttribute('data-is-following', 'true');
              
              // Update follower count if it exists (increase)
              const followerCountEl = document.querySelector('.stat-item[data-stat="followers"] .stat-value');
              if (followerCountEl) {
                const currentCount = parseInt(followerCountEl.textContent.trim(), 10);
                if (!isNaN(currentCount)) {
                  followerCountEl.textContent = (currentCount + 1).toString();
                }
              }
              
              // Special message if already following
              if (data.alreadyFollowing) {
                showToast('You are already following this character', 'info');
              } else {
                showToast('Successfully followed character', 'success');
              }
            }
          } else {
            // Reset button
            this.innerHTML = originalContent;
            this.disabled = false;
            
            const errorMsg = data && data.error ? data.error : `Failed to ${isFollowing ? 'unfollow' : 'follow'} character`;
            showToast(errorMsg, 'error');
          }
        } catch (error) {
          console.error(`Error ${isFollowing ? 'unfollowing' : 'following'} character:`, error);
          
          // Reset the button to its original state
          this.innerHTML = originalContent;
          this.disabled = false;
          
          showToast(`Failed to ${isFollowing ? 'unfollow' : 'follow'} character`, 'error');
        }
      });
    });
  }

  // Add guard against undefined values before constructing URLs
  function safeUrl(base, params) {
    // Check if any parameter is undefined and replace with empty string
    for (const key in params) {
      if (params[key] === undefined) {
        console.warn(`URL parameter '${key}' is undefined, using empty string instead`);
        params[key] = '';
      }
    }
    
    const url = new URL(base, window.location.origin);
    
    // Add query parameters
    Object.keys(params).forEach(key => {
      url.searchParams.append(key, params[key]);
    });
    
    return url.toString();
  }

  // Fix the 404 error by ensuring URLs don't contain 'undefined'
  function fixExistingLinks() {
    // Check all elements with href attributes
    document.querySelectorAll('[href]').forEach(el => {
      const href = el.getAttribute('href');
      if (href && href.includes('undefined')) {
        console.warn('Found link with undefined value:', href);
        // Fix the href by replacing undefined with empty string
        el.setAttribute('href', href.replace(/undefined/g, ''));
      }
    });
    
    // Check all forms with action attributes
    document.querySelectorAll('form[action]').forEach(form => {
      const action = form.getAttribute('action');
      if (action && action.includes('undefined')) {
        console.warn('Found form with undefined action:', action);
        form.setAttribute('action', action.replace(/undefined/g, ''));
      }
    });
  }

  // Helper function to scroll to character selector
  function scrollToCharacterSelector() {
    const selector = document.querySelector('.character-selector');
    if (selector) {
      selector.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Add a highlight effect
      selector.classList.add('highlight-selector');
      
      // Remove the highlight after a delay
      setTimeout(() => {
        selector.classList.remove('highlight-selector');
      }, 3000);
    }
  }

  // Make helper functions available globally
  window.initializeVideoErrorHandling = initializeVideoErrorHandling;
  window.initializeRightSidebar = initializeRightSidebar;
  window.handleImageError = handleImageError;
  window.refreshSuggestedCharacters = refreshSuggestedCharacters;
  window.safeUrl = safeUrl; // Export the safeUrl function
  window.globalCharacterState = globalCharacterState; // Export the global character state manager

  // First our component initializations
  initializePollProgress();
  initializePollVoting();
  addDynamicStyles();
  
  // Then our top-level features (after their functions are defined)
  initializeEventResponses();
  initializeVideoErrorHandling();
  initializeRightSidebar(); // Now the function is defined before it's called
  fixExistingLinks(); // Fix any existing links with undefined values
  
  // Initialize all functionality when document is ready
  document.addEventListener('DOMContentLoaded', function() {
    // Initialize image error handling
    document.querySelectorAll('img[data-fallback]').forEach(img => {
      img.onerror = function() {
        handleImageError(this);
      };
    });
    
    // Run the link fixer again after DOM is fully loaded
    fixExistingLinks();
    
    // Add an event listener for all link clicks to prevent navigating to undefined URLs
    document.addEventListener('click', function(e) {
      if (e.target.tagName === 'A' || e.target.closest('a')) {
        const link = e.target.tagName === 'A' ? e.target : e.target.closest('a');
        const href = link.getAttribute('href');
        
        if (href && href.includes('undefined')) {
          e.preventDefault();
          console.warn('Prevented navigation to URL with undefined:', href);
          showToast('Invalid link destination', 'warning');
        }
      }
    });
    
    // Use setTimeout to ensure everything gets initialized
    setTimeout(() => {
      console.log('Running delayed initialization');
      if (typeof initializeSuggestedUsers === 'function') initializeSuggestedUsers();
      if (typeof initializeSuggestedCharacters === 'function') initializeSuggestedCharacters();
      if (typeof initializeUpcomingEvents === 'function') initializeUpcomingEvents();
    }, 500);
    
    // Initialize feed filters if they exist
    if (typeof initializeFeedFilters === 'function') {
      initializeFeedFilters();
    }
  });
});
