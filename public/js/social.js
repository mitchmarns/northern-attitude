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
    
    // Update input fields WITHOUT triggering change events - with safety checks
    if (characterIdInput) {
      characterIdInput.value = storedCharacterId;
    } else {
      console.warn('Character ID input element not found during initialization');
      // Create hidden input element if it doesn't exist but we need it
      if (postForm) {
        const hiddenInput = document.createElement('input');
        hiddenInput.type = 'hidden';
        hiddenInput.id = 'character-id';
        hiddenInput.name = 'characterId';
        hiddenInput.value = storedCharacterId;
        postForm.appendChild(hiddenInput);
        characterIdInput = hiddenInput;
        console.log('Created missing character ID input element');
      }
    }
    
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
  
  // Function to fetch character stats
  function fetchCharacterStats(characterId) {
    if (!characterId) {
      console.log('No character ID provided for stats');
      return;
    }
    
    console.log('Fetching stats for character:', characterId);
    
    fetch(`/social/character/${characterId}/stats`)
      .then(response => {
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Character not found');
          } else if (response.status === 403) {
            throw new Error('Not authorized to view this character');
          } else {
            throw new Error('Failed to fetch character stats');
          }
        }
        return response.json();
      })
      .then(data => {
        if (data.success) {
          updateStatsDisplay(data.stats, true);
          
          // If this is not the user's character, show a visual indicator
          if (data.isOwnedByUser === false) {
            // Just display stats but add a subtle indicator that these are another character's stats
            if (statFollowingLabel) {
              statFollowingLabel.textContent = 'Following';
              statFollowingLabel.classList.add('other-character-stat');
            }
          }
        } else {
          console.error('Error in character stats response:', data.error);
          // Revert to user stats on error
          updateStatsDisplay(originalUserStats, false);
        }
      })
      .catch(error => {
        console.error('Error fetching character stats:', error);
        // On error, show original user stats
        updateStatsDisplay(originalUserStats, false);
        // Show error toast for specific errors
        if (error.message === 'Character not found') {
          showToast('This character no longer exists', 'error');
          // Clear character selection since it's invalid
          clearCharacterSelection();
        }
      });
  }
  
  // Function to update character display
  function updateCharacterDisplay(character) {
    if (!character) {
      console.log('No character data provided');
      return;
    }
    
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
    
    // Only fetch stats if character has a valid ID
    if (character.id) {
      fetchCharacterStats(character.id);
    } else {
      console.warn('Character missing ID, cannot fetch stats');
      updateStatsDisplay(originalUserStats, false);
    }
  }
  
  // Function to update stats display
  function updateStatsDisplay(stats, isCharacter = false) {
    if (!stats) return;
    
    console.log('Updating stats display:', stats, isCharacter ? '(character stats)' : '(user stats)');
    
    // Update stat values - with fallback for missing elements
    if (statPostsValue) statPostsValue.textContent = stats.posts;
    if (statFollowersValue) statFollowersValue.textContent = stats.followers;
    
    // For the "following" stat, we need to ensure it's particularly visible when showing character stats
    if (statFollowingValue) {
      statFollowingValue.textContent = stats.following;
      
      // Add a highlight effect when updating character following stats
      if (isCharacter) {
        statFollowingValue.classList.add('highlight-stat');
        setTimeout(() => {
          statFollowingValue.classList.remove('highlight-stat');
        }, 2000);
      }
    }
    
    // Update labels to indicate these are character stats
    if (isCharacter) {
      if (statPostsLabel) statPostsLabel.textContent = 'Character Posts';
      if (statFollowersLabel) statFollowersLabel.textContent = 'Character Followers';
      if (statFollowingLabel) {
        statFollowingLabel.textContent = 'You Follow';
        statFollowingLabel.classList.add('highlight-label');
      }
    } else {
      // Reset to original labels
      if (statPostsLabel) statPostsLabel.textContent = originalLabels.posts;
      if (statFollowersLabel) statFollowersLabel.textContent = originalLabels.followers;
      if (statFollowingLabel) {
        statFollowingLabel.textContent = originalLabels.following;
        statFollowingLabel.classList.remove('highlight-label');
      }
    }
  }
  
  // Function to set up character selection
  function setupCharacterSelection() {
    if (!characterSelect) {
      console.log('Character select element not found');
      return;
    }
    
    console.log('Setting up character selection handler');
    
    // Direct event handler assignment without cloning
    characterSelect.addEventListener('change', function(e) {
      const characterId = this.value;
      console.log('Character select changed to:', characterId);
      
      if (!characterId) {
        clearCharacterSelection();
        return;
      }
      
      // Validate character ID before proceeding
      if (isNaN(parseInt(characterId))) {
        console.error('Invalid character ID:', characterId);
        showToast('Invalid character selection', 'error');
        return;
      }
      
      // Update our tracking variable and form fields
      currentlySelectedCharacterId = characterId;
      
      // Add safety check before attempting to set value
      if (characterIdInput) {
        characterIdInput.value = characterId;
      } else {
        console.warn('Character ID input element not found, but continuing with selection');
        
        // Try to create the input if it doesn't exist
        if (postForm) {
          console.log('Creating missing character ID input');
          const newInput = document.createElement('input');
          newInput.type = 'hidden';
          newInput.id = 'character-id';
          newInput.name = 'characterId';
          newInput.value = characterId;
          postForm.appendChild(newInput);
        }
      }
      
      // Store in session storage
      sessionStorage.setItem('selectedCharacterId', characterId);
      
      // Show loading indicator for character
      if (activeCharacterName) {
        activeCharacterName.innerHTML = '<span class="loading-spinner"></span> Loading...';
      }
      
      // Fetch character details
      fetch(`/characters/api/${characterId}`)
        .then(response => {
          if (!response.ok) {
            throw new Error('Character not found');
          }
          return response.json();
        })
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
              
              // Refresh suggested characters after changing character
              refreshSuggestedCharacters(characterId);
            })
            .catch(error => {
              console.error('Error setting active character:', error);
              showToast('Error saving character selection', 'error');
            });
          }
        })
        .catch(error => {
          console.error('Error fetching character details:', error);
          showToast('Could not load character details', 'error');
          clearCharacterSelection();
        });
    });
  }

  // Function to refresh suggested characters when changing character
  function refreshSuggestedCharacters(selectedCharacterId) {
    console.log('Refreshing suggested characters for character ID:', selectedCharacterId);
    
    // First, show a loading state
    const suggestedList = document.querySelector('.suggested-list');
    if (!suggestedList) return;
    
    const originalContent = suggestedList.innerHTML;
    suggestedList.innerHTML = `
      <li class="loading-suggestions">
        <div class="loading-spinner-container">
          <div class="loading-spinner-large"></div>
        </div>
        <p class="text-center">Refreshing suggestions...</p>
      </li>
    `;
    
    // Fetch fresh suggestions that exclude the selected character
    fetch(`/social/suggested-characters?exclude=${selectedCharacterId}`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch suggestions');
        }
        return response.json();
      })
      .then(data => {
        if (data.success && data.characters && data.characters.length > 0) {
          // Update the list with new suggestions
          updateSuggestedCharactersList(data.characters);
          
          // Reinitialize follow buttons
          initializeSuggestedUsers();
        } else {
          // If no suggestions or error, show no suggestions message
          suggestedList.innerHTML = `
            <li class="no-suggestions">
              <p>No more character suggestions available.</p>
              <a href="/characters/explore" class="btn btn-sm btn-primary mt-2">Find Characters</a>
              <button class="btn btn-sm btn-outline refresh-suggestions-btn mt-2">Refresh Suggestions</button>
            </li>
          `;
          
          // Add click handler to the refresh button
          const refreshBtn = suggestedList.querySelector('.refresh-suggestions-btn');
          if (refreshBtn) {
            refreshBtn.addEventListener('click', function() {
              refreshSuggestedCharacters(selectedCharacterId);
            });
          }
        }
      })
      .catch(error => {
        console.error('Error refreshing suggestions:', error);
        // Restore original content on error with a refresh button
        suggestedList.innerHTML = originalContent + `
          <li class="error-message">
            <p>Error loading suggestions.</p>
            <button class="btn btn-sm btn-outline refresh-suggestions-btn">Try Again</button>
          </li>
        `;
        
        // Add click handler to the refresh button
        const refreshBtn = suggestedList.querySelector('.refresh-suggestions-btn');
        if (refreshBtn) {
          refreshBtn.addEventListener('click', function() {
            refreshSuggestedCharacters(selectedCharacterId);
          });
        }
      });
  }

  // Function to update the suggested characters list
  function updateSuggestedCharactersList(characters) {
    const suggestedList = document.querySelector('.suggested-list');
    if (!suggestedList) return;
    
    // Clear the list except for the hidden input
    const hiddenInput = suggestedList.querySelector('#client-selected-character');
    suggestedList.innerHTML = '';
    
    // Add the hidden input back
    if (hiddenInput) {
      suggestedList.appendChild(hiddenInput);
    }
    
    if (characters.length === 0) {
      // No characters found
      const emptyItem = document.createElement('li');
      emptyItem.className = 'no-suggestions';
      emptyItem.innerHTML = `
        <p>No character suggestions available.</p>
        <a href="/characters/explore" class="btn btn-sm btn-primary mt-2">Find Characters</a>
        <button class="btn btn-sm btn-outline refresh-suggestions-btn mt-2">Refresh Suggestions</button>
      `;
      suggestedList.appendChild(emptyItem);
      
      // Add click handler to the refresh button
      const refreshBtn = emptyItem.querySelector('.refresh-suggestions-btn');
      if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
          refreshSuggestedCharacters(currentlySelectedCharacterId);
        });
      }
      
      return;
    }
    
    // Add character items
    characters.forEach(character => {
      const listItem = document.createElement('li');
      listItem.className = 'suggested-item';
      listItem.setAttribute('data-character-id', character.id);
      
      // Add default image fallback
      const avatarUrl = character.avatar_url || character.url || '/img/default-character.svg';
      
      listItem.innerHTML = `
        <div class="suggested-avatar">
          <img src="${avatarUrl}" 
               alt="${character.name}"
               data-fallback="/img/default-character.svg"
               onerror="handleImageError(this)" />
        </div>
        <div class="suggested-info">
          <div class="suggested-name">${character.name}</div>
          <div class="suggested-meta">by @${character.creator_username || 'unknown'}</div>
        </div>
        <button class="btn btn-sm btn-outline follow-character-btn" data-character-id="${character.id}">
          Follow
        </button>
      `;
      suggestedList.appendChild(listItem);
    });
    
    // Hide the currently selected character if any
    const currentCharId = parseInt(currentlySelectedCharacterId);
    if (currentCharId) {
      const selectedItem = suggestedList.querySelector(`.suggested-item[data-character-id="${currentCharId}"]`);
      if (selectedItem) {
        selectedItem.style.display = 'none';
      }
    }
  }

  // Function to clear character selection - update to also refresh suggestions
  function clearCharacterSelection() {
    // Clear stored character ID
    sessionStorage.removeItem('selectedCharacterId');
    currentlySelectedCharacterId = null;
    
    // Clear form fields with added safety checks
    if (characterSelect) {
      characterSelect.value = '';
    }
    
    if (characterIdInput) {
      characterIdInput.value = '';
    } else {
      console.warn('Character ID input element not found during clear operation');
    }
    
    // Update UI with safety checks
    if (postAsCharacterDisplay) {
      postAsCharacterDisplay.style.display = 'none';
    }
    
    if (noCharacterSelected) {
      noCharacterSelected.style.display = 'block';
    }
    
    // Disable submission buttons
    if (postSubmitBtn) {
      postSubmitBtn.disabled = true;
    }
    
    // Safely disable comment buttons
    try {
      document.querySelectorAll('.submit-comment-btn').forEach(btn => {
        if (btn) btn.disabled = true;
      });
    } catch (err) {
      console.warn('Error updating comment buttons:', err);
    }
    
    // Show warning
    if (characterRequiredWarning) {
      characterRequiredWarning.style.display = 'block';
    }
    
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
    
    // Refresh suggestions after clearing character
    refreshSuggestedCharacters(null);
  }

  // Separate handler function for follow buttons - updated to send source character ID
  async function followCharacterHandler(event) {
    event.preventDefault();
    event.stopPropagation();
    
    // Get the character ID from the button's data attribute
    const btn = this;
    const targetCharacterId = btn.getAttribute('data-character-id');
    
    if (!targetCharacterId) {
      console.error('No target character ID found on follow button');
      return;
    }
    
    // Get the source character ID (character doing the following) with improved safety
    let sourceCharacterId = '';
    
    // Try multiple ways to get the current character ID
    if (characterIdInput && characterIdInput.value) {
      sourceCharacterId = characterIdInput.value;
    } else if (currentlySelectedCharacterId) {
      sourceCharacterId = currentlySelectedCharacterId;
    } else if (characterSelect && characterSelect.value) {
      sourceCharacterId = characterSelect.value;
    }
    
    if (!sourceCharacterId) {
      showToast('Please select a character first before following', 'warning');
      if (characterSelect) {
        characterSelect.focus();
        const selector = document.querySelector('.character-selector');
        if (selector) {
          selector.classList.add('highlight-selector');
          setTimeout(() => {
            selector.classList.remove('highlight-selector');
          }, 2000);
        }
      }
      return;
    }
    
    // Determine current state from the button appearance
    const isCurrentlyFollowing = btn.classList.contains('btn-primary');
    console.log(`Follow button clicked: Character ${sourceCharacterId} following character ${targetCharacterId}`, 'Currently following:', isCurrentlyFollowing);
    
    // Show loading state
    const originalText = btn.textContent;
    btn.innerHTML = '<span class="loading-spinner"></span>';
    btn.disabled = true;
    
    try {
      // Make API request to follow/unfollow character with source character ID
      console.log('Sending follow request to:', `/social/follow/character/${targetCharacterId}`);
      
      const response = await fetch(`/social/follow/character/${targetCharacterId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ sourceCharacterId })
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Follow response:', data);
      
      // Update button state based on follow status from server response
      if (data.success) {
        if (data.following) {
          btn.textContent = 'Following';
          btn.classList.remove('btn-outline');
          btn.classList.add('btn-primary');
          showToast('Character followed successfully', 'success');
        } else {
          btn.textContent = 'Follow';
          btn.classList.add('btn-outline');
          btn.classList.remove('btn-primary');
          showToast('Character unfollowed', 'info');
        }
      }
      
      // Re-enable the button
      btn.disabled = false;
      
      // If we just followed, remove from suggested list after a delay 
      if (data.success && data.following) {
        setTimeout(() => {
          const listItem = btn.closest('.suggested-item');
          if (listItem) {
            listItem.style.opacity = '0';
            setTimeout(() => {
              listItem.remove();
              
              // Check if there are no more items
              const suggestionsList = btn.closest('.suggested-list');
              if (suggestionsList && suggestionsList.querySelectorAll('.suggested-item').length === 0) {
                suggestionsList.innerHTML = '<li class="no-suggestions">No character suggestions available</li>';
              }
            }, 300);
          }
        }, 1000);
      }
      
      // Update character stats after follow/unfollow action
      if (currentlySelectedCharacterId) {
        // Allow a small delay for the server to process the follow/unfollow action
        setTimeout(() => {
          fetchCharacterStats(currentlySelectedCharacterId);
        }, 500);
      }
      
    } catch (error) {
      console.error('Error following/unfollowing character:', error);
      // Reset button state
      btn.textContent = originalText;
      btn.disabled = false;
      showToast('Failed to process follow request', 'error');
    }
  }

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

  // Function to handle follow buttons for suggested users
  function initializeSuggestedUsers() {
    console.log('Looking for suggested character elements in:', document.querySelector('.suggested-users'));
    
    // Get all follow buttons with a more specific selector
    const followButtons = document.querySelectorAll('.suggested-users .follow-character-btn');
    console.log('Found follow buttons:', followButtons.length);
    
    // Add click event listeners to each button
    followButtons.forEach(btn => {
      const characterId = btn.getAttribute('data-character-id');
      console.log('Setting up follow button for character ID:', characterId);
      
      // Remove any existing event handlers first
      btn.removeEventListener('click', followCharacterHandler);
      
      // Add new event handler
      btn.addEventListener('click', followCharacterHandler);
    });

    // Make character cards in the suggested users widget clickable
    const characterItems = document.querySelectorAll('.suggested-users .suggested-item');
    
    characterItems.forEach(item => {
      const characterId = item.getAttribute('data-character-id');
      if (!characterId) return;
      
      // Make the entire item clickable except for the follow button
      item.style.cursor = 'pointer';
      
      item.addEventListener('click', function(e) {
        // Don't trigger if clicking on the follow button
        if (e.target.closest('.follow-character-btn')) return;
        
        // Navigate to character page
        window.location.href = `/characters/view/${characterId}`;
      });
    });
  }

  // Function to set up character view buttons
  function initializeSuggestedCharacters() {
    console.log('Initializing suggested characters section...');
    
    // Make entire character card clickable, not just the View button
    const characterItems = document.querySelectorAll('.suggested-characters .suggested-item');
    console.log('Found suggested character items:', characterItems.length);
    
    characterItems.forEach(item => {
      // Get the view button and its href
      const viewBtn = item.querySelector('a.btn');
      if (!viewBtn) return;
      
      const characterUrl = viewBtn.getAttribute('href');
      if (!characterUrl) return;
      
      // Make the entire item clickable but exclude the follow button if present
      item.style.cursor = 'pointer';
      
      item.addEventListener('click', function(e) {
        // Don't trigger if clicking on buttons
        if (e.target.closest('.btn')) return;
        
        // Navigate to character page
        window.location.href = characterUrl;
      });
      
      // Add follow functionality for characters if there's a follow button
      const followBtn = item.querySelector('.follow-character-btn');
      if (followBtn) {
        const characterId = followBtn.getAttribute('data-character-id');
        console.log('Setting up follow button for character:', characterId);
        
        // Remove any existing event listeners to prevent duplicates
        followBtn.removeEventListener('click', followCharacterHandler);
        
        // Add event handler
        followBtn.addEventListener('click', followCharacterHandler);
      }
    });
    
    // Also handle the follow buttons in the "Characters You Might Like" section 
    // that might use a different structure
    const additionalFollowButtons = document.querySelectorAll('.suggested-characters .follow-character-btn');
    console.log('Found additional follow buttons:', additionalFollowButtons.length);
    
    additionalFollowButtons.forEach(btn => {
      if (!btn._hasFollowHandler) {
        const characterId = btn.getAttribute('data-character-id');
        console.log('Setting up additional follow button for character:', characterId);
        
        // Remove any existing event listeners
        btn.removeEventListener('click', followCharacterHandler);
        
        // Add event handler with capture of event to prevent bubbling
        btn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          
          followCharacterHandler.call(this, e);
        });
        
        // Mark this button as having a handler attached
        btn._hasFollowHandler = true;
      }
    });
  }

  // Function to make upcoming events clickable
  function initializeUpcomingEvents() {
    const eventItems = document.querySelectorAll('.upcoming-events .event-item');
    
    eventItems.forEach(item => {
      // Find event ID or create a link to the event
      const eventId = item.getAttribute('data-event-id') || item.getAttribute('data-post-id');
      
      if (eventId) {
        item.style.cursor = 'pointer';
        
        item.addEventListener('click', function() {
          // Navigate to the event detail page
          window.location.href = `/social/event/${eventId}`;
        });
      }
    });
    
    // Make "See All Events" button work if it exists
    const seeAllEventsBtn = document.querySelector('.upcoming-events a[href="/social/events"]');
    if (seeAllEventsBtn) {
      seeAllEventsBtn.addEventListener('click', function(e) {
        e.preventDefault();
        window.location.href = '/social/events';
      });
    }
  }

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
  window.refreshSuggestedCharacters = refreshSuggestedCharacters;
  
  // Now we'll initialize everything in the correct order
  // First our component initializations
  initializePollProgress();
  initializePollVoting();
  addDynamicStyles();
  
  // Then our top-level features (after their functions are defined)
  initializeEventResponses();
  initializeVideoErrorHandling();
  initializeRightSidebar();
  
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
