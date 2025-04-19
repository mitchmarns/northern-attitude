document.addEventListener('DOMContentLoaded', function() {
  // Post type selection
  const typeButtons = document.querySelectorAll('.type-btn');
  const postTypeInput = document.getElementById('post-type');
  const imageUrlArea = document.getElementById('image-url-area');
  const videoUrlArea = document.getElementById('video-url-area');
  const pollArea = document.getElementById('poll-area');
  const eventArea = document.getElementById('event-area');
  
  // Fix stat element selectors - they were incorrectly using nth-child
  const statPostsValue = document.querySelector('.stat-item:nth-child(1) .stat-value');
  const statFollowersValue = document.querySelector('.stat-item:nth-child(2) .stat-value');
  const statFollowingValue = document.querySelector('.stat-item:nth-child(3) .stat-value');
  
  // Fix stat label selectors too
  const statPostsLabel = document.querySelector('.stat-item:nth-child(1) .stat-label');
  const statFollowersLabel = document.querySelector('.stat-item:nth-child(2) .stat-label');
  const statFollowingLabel = document.querySelector('.stat-item:nth-child(3) .stat-label');
  
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
  
  typeButtons.forEach(button => {
    button.addEventListener('click', function() {
      // Remove active class from all buttons
      typeButtons.forEach(btn => btn.classList.remove('active'));
      
      // Add active class to clicked button
      this.classList.add('active');
      
      // Set post type value
      const type = this.getAttribute('data-type');
      postTypeInput.value = type;
      
      // Show/hide appropriate input areas
      imageUrlArea.style.display = type === 'image' ? 'block' : 'none';
      videoUrlArea.style.display = type === 'video' ? 'block' : 'none';
      pollArea.style.display = type === 'poll' ? 'block' : 'none';
      eventArea.style.display = type === 'event' ? 'block' : 'none';
    });
  });
  
  // Poll option functionality
  const addPollOptionBtn = document.getElementById('add-poll-option');
  const pollOptionsContainer = document.getElementById('poll-options');
  
  if (addPollOptionBtn && pollOptionsContainer) {
    addPollOptionBtn.addEventListener('click', function() {
      const pollOptionsCount = pollOptionsContainer.querySelectorAll('.poll-option').length;
      
      if (pollOptionsCount < 10) { // Limit to 10 options max
        const newOption = document.createElement('div');
        newOption.className = 'poll-option';
        newOption.innerHTML = `
          <div class="d-flex gap-2">
            <input type="text" name="pollOptions[]" class="form-control" placeholder="Option ${pollOptionsCount + 1}">
            <button type="button" class="btn btn-outline-danger remove-poll-option">
              <i class="ph-duotone ph-x"></i>
            </button>
          </div>
        `;
        
        pollOptionsContainer.appendChild(newOption);
        
        // Add event listener to the remove button
        const removeBtn = newOption.querySelector('.remove-poll-option');
        if (removeBtn) {
          removeBtn.addEventListener('click', function() {
            if (pollOptionsContainer.querySelectorAll('.poll-option').length > 2) {
              // Don't allow removing if only 2 options remain
              newOption.remove();
            }
          });
        }
        
        // Focus on the new input
        const newInput = newOption.querySelector('input');
        if (newInput) {
          newInput.focus();
        }
      } else {
        // Show a message that max options reached
        showToast('Maximum of 10 poll options allowed', 'warning');
      }
    });
  }
  
  // Initialize remove buttons for existing poll options
  document.querySelectorAll('.remove-poll-option').forEach(btn => {
    btn.addEventListener('click', function() {
      const pollOptionsCount = pollOptionsContainer.querySelectorAll('.poll-option').length;
      if (pollOptionsCount > 2) { // Always keep at least 2 options
        this.closest('.poll-option').remove();
      }
    });
  });

  // Enhanced Poll progress handling - Ensure this runs and properly updates the DOM
  function initializePollProgress() {
    console.log('Initializing poll progress elements...');
    document.querySelectorAll('.poll-progress').forEach(progress => {
      const percentage = progress.getAttribute('data-percentage');
      console.log('Setting poll progress:', percentage + '%');
      progress.style.width = `${percentage}%`;
      
      // Add color variations based on percentage
      if (parseFloat(percentage) > 50) {
        progress.style.backgroundColor = 'var(--accent3)';
      } else if (parseFloat(percentage) < 20) {
        progress.style.backgroundColor = 'var(--muted)';
      }
    });
  }
  
  // Call immediately and also after a small delay to ensure DOM is ready
  initializePollProgress();
  setTimeout(initializePollProgress, 300);

  // Make Character Selection Available Globally
  let characterSelect = document.getElementById('character-select');
  const characterIdInput = document.getElementById('character-id');
  const postAsDropdown = document.querySelector('select[name="postAs"]');
  const postSubmitBtn = document.getElementById('post-submit-btn');
  const postAsCharacterDisplay = document.querySelector('.post-as-character-display');
  const noCharacterSelected = document.querySelector('.no-character-selected');
  const activeCharacterAvatar = document.querySelector('.active-character-avatar');
  const activeCharacterName = document.querySelector('.active-character-name');
  const characterRequiredWarning = document.getElementById('character-required-warning');
  const postForm = document.getElementById('post-form');

  // Global variable to track the currently selected character
  let currentlySelectedCharacterId = null;
  
  // Add debug function to expose current character info
  window.debugCharacterInfo = function() {
    console.log('Current character ID:', currentlySelectedCharacterId);
    console.log('Character input value:', characterIdInput ? characterIdInput.value : 'No input element');
    console.log('Character select value:', characterSelect ? characterSelect.value : 'No select element');
    console.log('Stats elements found:', !!statPostsValue, !!statFollowersValue, !!statFollowingValue);
  };
  
  // Initialize character selection first, then set up event handler
  initializeCharacterSelection();
  setupCharacterSelection();
  
  // Function to initialize character selection from session storage or URL params
  function initializeCharacterSelection() {
    console.log('Initializing character selection...');
    // Check for character ID in session storage first
    const storedCharacterId = sessionStorage.getItem('selectedCharacterId');
    
    if (!storedCharacterId) {
      console.log('No stored character found in session');
      if (characterRequiredWarning) characterRequiredWarning.style.display = 'block';
      return;
    }
    
    console.log('Found stored character ID:', storedCharacterId);
    
    // Set our tracking variable
    currentlySelectedCharacterId = storedCharacterId;
    
    // Update input fields WITHOUT triggering change events
    if (characterIdInput) characterIdInput.value = storedCharacterId;
    if (characterSelect) {
      // Set value without triggering change event
      characterSelect.value = storedCharacterId;
    }
    
    // Only fetch character details if needed
    fetch(`/characters/api/${storedCharacterId}`)
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          updateCharacterDisplay(data.character);
          
          // Update server-side session if needed
          if (!window.characterSessionUpdated) {
            fetch('/social/set-active-character', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: JSON.stringify({ characterId: storedCharacterId }),
            })
            .then(() => {
              window.characterSessionUpdated = true;
            })
            .catch(error => console.error('Error setting active character:', error));
          }
        }
      })
      .catch(error => console.error('Error fetching character details:', error));
  }
  
  // Function to update character display
  function updateCharacterDisplay(character) {
    if (!character) return;
    
    console.log('Updating character display with:', character);
    
    if (postAsCharacterDisplay) {
      postAsCharacterDisplay.style.display = 'flex';
      if (noCharacterSelected) noCharacterSelected.style.display = 'none';
    }
    
    if (activeCharacterAvatar) {
      const imageUrl = character.avatar_url || character.url || '/img/default-character.png';
      activeCharacterAvatar.src = imageUrl;
      activeCharacterAvatar.setAttribute('data-fallback', '/img/default-character.png');
      activeCharacterAvatar.onerror = function() {
        this.src = this.getAttribute('data-fallback');
      };
    }
    
    if (activeCharacterName) {
      activeCharacterName.textContent = character.name;
    }
    
    // Enable post submit buttons and comment buttons
    if (postSubmitBtn) postSubmitBtn.disabled = false;
    document.querySelectorAll('.submit-comment-btn').forEach(btn => btn.disabled = false);
    
    // Hide character required warnings
    if (characterRequiredWarning) characterRequiredWarning.style.display = 'none';
    
    // Fetch and update character stats
    fetchCharacterStats(character.id);
  }
  
  // Function to fetch character stats
  function fetchCharacterStats(characterId) {
    if (!characterId) return;
    
    console.log('Fetching stats for character:', characterId);
    
    fetch(`/social/character/${characterId}/stats`)
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          updateStatsDisplay(data.stats, true);
        } else {
          console.error('Error fetching character stats:', data.error);
        }
      })
      .catch(error => {
        console.error('Failed to fetch character stats:', error);
      });
  }
  
  // Function to update stats display
  function updateStatsDisplay(stats, isCharacter = false) {
    if (!stats) return;
    
    console.log('Updating stats display:', stats, isCharacter ? '(character stats)' : '(user stats)');
    
    // Update stat values - with fallback for missing elements
    if (statPostsValue) statPostsValue.textContent = stats.posts;
    if (statFollowersValue) statFollowersValue.textContent = stats.followers;
    if (statFollowingValue) statFollowingValue.textContent = stats.following;
    
    // Update labels to indicate these are character stats
    if (isCharacter) {
      if (statPostsLabel) statPostsLabel.textContent = 'Character Posts';
      if (statFollowersLabel) statFollowersLabel.textContent = 'Character Followers';
      if (statFollowingLabel) statFollowingLabel.textContent = 'You Follow';
    } else {
      // Reset to original labels
      if (statPostsLabel) statPostsLabel.textContent = originalLabels.posts;
      if (statFollowersLabel) statFollowersLabel.textContent = originalLabels.followers;
      if (statFollowingLabel) statFollowingLabel.textContent = originalLabels.following;
    }
  }
  
  // Fix the character selection event handler
  function setupCharacterSelection() {
    if (!characterSelect) return;
    
    console.log('Setting up character selection handler');
    
    // Direct event handler assignment without cloning
    characterSelect.addEventListener('change', function(e) {
      const characterId = this.value; // Use this.value instead of e.target.value for reliability
      console.log('Character select changed to:', characterId);
      
      if (!characterId) {
        clearCharacterSelection();
        return;
      }
      
      // Update our tracking variable and form fields
      currentlySelectedCharacterId = characterId;
      if (characterIdInput) characterIdInput.value = characterId;
      
      // Store in session storage
      sessionStorage.setItem('selectedCharacterId', characterId);
      
      // Fetch character details
      fetch(`/characters/api/${characterId}`)
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            updateCharacterDisplay(data.character);
            
            // Update server session
            fetch('/social/set-active-character', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: JSON.stringify({ characterId }),
            })
            .then(response => response.json())
            .then(data => {
              console.log('Server character session updated:', data);
              window.characterSessionUpdated = true;
            })
            .catch(error => console.error('Error setting active character:', error));
          }
        })
        .catch(error => console.error('Error fetching character details:', error));
    });
  }
  
  // Function to clear character selection
  function clearCharacterSelection() {
    // Clear stored character ID
    sessionStorage.removeItem('selectedCharacterId');
    currentlySelectedCharacterId = null;
    
    // Clear form fields
    if (characterSelect) characterSelect.value = '';
    if (characterIdInput) characterIdInput.value = '';
    
    // Update UI
    if (postAsCharacterDisplay) postAsCharacterDisplay.style.display = 'none';
    if (noCharacterSelected) noCharacterSelected.style.display = 'block';
    
    // Disable submission buttons
    if (postSubmitBtn) postSubmitBtn.disabled = true;
    document.querySelectorAll('.submit-comment-btn').forEach(btn => btn.disabled = true);
    
    // Show warning
    if (characterRequiredWarning) characterRequiredWarning.style.display = 'block';
    
    // Reset stats to user stats
    updateStatsDisplay(originalUserStats, false);
    
    // Also clear on server
    fetch('/social/set-active-character', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ characterId: null }),
    })
    .catch(error => console.error('Error clearing active character:', error));
  }

  // Poll voting functionality
  function initializePollVoting() {
    console.log('Initializing poll voting functionality...');
    
    // Track selected poll options
    const selectedPollOptions = new Map();
    
    // Add click handlers to poll options with better debugging
    document.querySelectorAll('.poll-option-result').forEach(option => {
      option.addEventListener('click', function() {
        const postId = this.getAttribute('data-post-id');
        const optionId = this.getAttribute('data-option-id');
        
        console.log(`Poll option clicked - Post ID: ${postId}, Option ID: ${optionId}`);
        console.log('Current character ID:', characterIdInput ? characterIdInput.value : 'None');
        
        if (!optionId || !postId) {
          console.warn('Missing post ID or option ID attributes');
          return;
        }
        
        // Check if a character is selected before allowing option selection
        const characterId = characterIdInput ? characterIdInput.value : '';
        
        if (!characterId) {
          console.warn('No character selected, showing warning');
          showToast('Please select a character first to vote', 'warning');
          if (characterSelect) characterSelect.focus();
          
          // Highlight the character selector to make it more obvious
          if (document.querySelector('.character-selector')) {
            document.querySelector('.character-selector').classList.add('highlight-selector');
            setTimeout(() => {
              document.querySelector('.character-selector').classList.remove('highlight-selector');
            }, 2000);
          }
          return;
        }
        
        console.log('Character selected, proceeding with poll option selection');
        
        // Toggle selection state
        const pollContainer = this.closest('.post-poll');
        if (!pollContainer) {
          console.error('Could not find poll container');
          return;
        }
        
        const allOptions = pollContainer.querySelectorAll('.poll-option-result');
        
        // Remove selected class from all options in this poll
        allOptions.forEach(opt => opt.classList.remove('selected-option'));
        
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
        const characterId = characterIdInput ? characterIdInput.value : '';
        
        console.log(`Vote button clicked - Post ID: ${postId}, Character ID: ${characterId}`);
        
        if (!characterId) {
          showToast('Please select a character first to vote', 'warning');
          if (characterSelect) characterSelect.focus();
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
  
  // Initialize poll voting functionality
  initializePollVoting();

  // Add CSS for highlighted character selector
  function addDynamicStyles() {
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      @keyframes pulse-border {
        0% { box-shadow: 0 0 0 0 rgba(var(--accent3-rgb), 0.7); }
        70% { box-shadow: 0 0 0 10px rgba(var(--accent3-rgb), 0); }
        100% { box-shadow: 0 0 0 0 rgba(var(--accent3-rgb), 0); }
      }
      
      .highlight-selector {
        animation: pulse-border 2s ease-out;
        border-radius: var(--radius-md);
      }
      
      .loading-spinner {
        display: inline-block;
        width: 12px;
        height: 12px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        border-top-color: #fff;
        animation: spin 1s ease-in-out infinite;
        margin-right: 6px;
      }
      
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(styleElement);
  }
  
  // Initialize our dynamic styles
  addDynamicStyles();

  // Toast notification system with helper function for checking if element exists
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

  // Event response functionality (Interested/Going buttons)
  function initializeEventResponses() {
    console.log('Initializing event response handlers...');
    
    // Find all event posts and load their response counts
    document.querySelectorAll('.post-event').forEach(eventPost => {
      const postId = eventPost.getAttribute('data-post-id');
      if (!postId) return;
      
      loadEventResponses(postId);
      
      // Add click handlers to response buttons
      const interestedBtn = eventPost.querySelector('.event-interested-btn');
      const goingBtn = eventPost.querySelector('.event-going-btn');
      
      if (interestedBtn) {
        interestedBtn.addEventListener('click', function() {
          respondToEvent(postId, 'interested');
        });
      }
      
      if (goingBtn) {
        goingBtn.addEventListener('click', function() {
          respondToEvent(postId, 'going');
        });
      }
    });
  }

  // Function to load event responses
  async function loadEventResponses(postId) {
    try {
      const response = await fetch(`/social/post/${postId}/event-responses`);
      const data = await response.json();
      
      if (data.success) {
        updateEventResponseUI(postId, data.responses, data.userResponse);
      }
    } catch (error) {
      console.error('Error loading event responses:', error);
    }
  }

  // Function to update event response UI
  function updateEventResponseUI(postId, responses, userResponse) {
    const eventPost = document.querySelector(`.post-event[data-post-id="${postId}"]`);
    if (!eventPost) return;
    
    const interestedBtn = eventPost.querySelector('.event-interested-btn');
    const goingBtn = eventPost.querySelector('.event-going-btn');
    const interestedCount = eventPost.querySelector('.interested-count');
    const goingCount = eventPost.querySelector('.going-count');
    
    // Update counts
    if (interestedCount) {
      interestedCount.textContent = responses.interested;
    }
    
    if (goingCount) {
      goingCount.textContent = responses.going;
    }
    
    // Update active state of buttons based on user's response
    if (userResponse) {
      if (interestedBtn) {
        interestedBtn.classList.toggle('active', userResponse.responseType === 'interested');
      }
      
      if (goingBtn) {
        goingBtn.classList.toggle('active', userResponse.responseType === 'going');
      }
    } else {
      // No user response, ensure buttons are not active
      if (interestedBtn) interestedBtn.classList.remove('active');
      if (goingBtn) goingBtn.classList.remove('active');
    }
  }

  // Function to send an event response
  async function respondToEvent(postId, responseType) {
    const characterId = characterIdInput ? characterIdInput.value : '';
    
    if (!characterId) {
      showToast('Please select a character first to respond to this event', 'warning');
      if (characterSelect) characterSelect.focus();
      
      // Highlight the character selector
      if (document.querySelector('.character-selector')) {
        document.querySelector('.character-selector').classList.add('highlight-selector');
        setTimeout(() => {
          document.querySelector('.character-selector').classList.remove('highlight-selector');
        }, 2000);
      }
      return;
    }
    
    try {
      console.log(`Responding to event ${postId} as ${responseType} with character ${characterId}`);
      
      const response = await fetch(`/social/post/${postId}/event-response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          characterId,
          responseType
        })
      });
      
      const data = await response.json();
      console.log('Event response result:', data);
      
      if (data.success) {
        // Reload response data to update UI
        loadEventResponses(postId);
        showToast(data.message, 'success');
      } else {
        showToast(data.message || 'Failed to respond to event', 'error');
      }
    } catch (error) {
      console.error('Error responding to event:', error);
      showToast('Failed to respond to event', 'error');
    }
  }

  // Initialize event responses
  initializeEventResponses();
  
  // Initialize video error handling
  initializeVideoErrorHandling();
  
  // Initialize right sidebar functionality
  initializeRightSidebar();
  
  // Function to initialize right sidebar widgets
  function initializeRightSidebar() {
    console.log('Initializing right sidebar functionality');
    
    // Set up follow buttons for suggested users
    initializeSuggestedUsers();
    
    // Set up character view buttons
    initializeSuggestedCharacters();
    
    // Make upcoming events clickable
    initializeUpcomingEvents();
  }
  
  // Handle image errors to provide a consistent fallback
  function handleImageError(img) {
    console.log('Image failed to load:', img.src);
    const fallbackSrc = img.getAttribute('data-fallback') || '/img/default-character.png';
    if (img.src !== fallbackSrc) {
      img.src = fallbackSrc;
    }
  }
  
  // Add global image error handler to window
  window.handleImageError = handleImageError;
  
  // Initialize video error handling
  function initializeVideoErrorHandling() {
    console.log('Initializing video error handling');
    
    // Find all videos in posts
    const videos = document.querySelectorAll('.post-video');
    
    videos.forEach(video => {
      // Add error event listener
      video.addEventListener('error', function(e) {
        console.error('Video playback error:', e);
        
        // Create error message to display
        const errorContainer = document.createElement('div');
        errorContainer.className = 'video-error-container';
        errorContainer.innerHTML = `
          <div class="video-error-message">
            <i class="ph-duotone ph-warning-circle"></i>
            <p>Video failed to load</p>
            <button class="btn btn-sm btn-outline refresh-video-btn">Refresh</button>
          </div>
        `;
        
        // Replace video with error message
        video.parentNode.replaceChild(errorContainer, video);
        
        // Add refresh button functionality
        const refreshBtn = errorContainer.querySelector('.refresh-video-btn');
        if (refreshBtn) {
          refreshBtn.addEventListener('click', function() {
            // Try to reload the video
            const source = video.querySelector('source');
            if (source) {
              const originalSrc = source.src;
              // Add a timestamp to force reload
              source.src = originalSrc + (originalSrc.includes('?') ? '&' : '?') + '_t=' + Date.now();
              video.load();
            }
            
            // Replace error message with video again
            errorContainer.parentNode.replaceChild(video, errorContainer);
          });
        }
      });
    });
  }
  
  // Make helper functions available globally
  window.initializeVideoErrorHandling = initializeVideoErrorHandling;
  window.initializeRightSidebar = initializeRightSidebar;
  window.handleImageError = handleImageError;
  
  // Initialize all functionality when document is ready
  document.addEventListener('DOMContentLoaded', function() {
    // Initialize image error handling
    document.querySelectorAll('img[data-fallback]').forEach(img => {
      img.onerror = function() {
        handleImageError(this);
      };
    });
    
    // Initialize video error handling
    if (typeof initializeVideoErrorHandling === 'function') {
      initializeVideoErrorHandling();
    } else {
      console.error('initializeVideoErrorHandling function is not defined');
    }
    
    // Initialize right sidebar
    if (typeof initializeRightSidebar === 'function') {
      initializeRightSidebar();
    } else {
      console.error('initializeRightSidebar function is not defined');
    }
    
    // Use setTimeout to ensure everything gets initialized
    setTimeout(() => {
      console.log('Running delayed initialization');
      if (typeof initializeSuggestedUsers === 'function') initializeSuggestedUsers();
      if (typeof initializeSuggestedCharacters === 'function') initializeSuggestedCharacters();
      if (typeof initializeUpcomingEvents === 'function') initializeUpcomingEvents();
    }, 500);
  });
});
