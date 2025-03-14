// Update to character-form.js to handle image URLs instead of file uploads

// Function to set up avatar preview
function setupAvatarPreview() {
  const avatarUrlInput = document.getElementById('avatar-url');
  const previewButton = document.getElementById('preview-avatar-btn');
  const avatarPreview = document.getElementById('avatar-preview');
  
  previewButton.addEventListener('click', function() {
    const imageUrl = avatarUrlInput.value.trim();
    
    if (imageUrl) {
      // Update the preview image
      avatarPreview.src = imageUrl;
      
      // Handle load errors by reverting to placeholder
      avatarPreview.onerror = function() {
        avatarPreview.src = '/api/placeholder/120/120';
        window.authUtils.showFormError('character-form', 'Invalid image URL or image could not be loaded');
      };
    } else {
      // If no URL, show placeholder
      avatarPreview.src = '/api/placeholder/120/120';
    }
  });
}

// Update createCharacter function to use image URL
async function createCharacter() {
  try {
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    // Get character data
    const characterData = getCharacterFormData();
    
    // Show loading state
    const submitButton = document.getElementById('submit-btn');
    const originalButtonText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Creating...';
    
    // Clear previous messages
    window.authUtils.clearFormMessages('character-form');
    
    // Add avatar URL directly from input
    const avatarUrl = document.getElementById('avatar-url').value.trim();
    if (avatarUrl) {
      characterData.avatar_url = avatarUrl;
    }
    
    // Check if this is the first character
    const existingCharacters = await fetch('/api/my-characters', {
      method: 'GET',
      credentials: 'include'
    }).then(res => {
      if (!res.ok) throw new Error('Failed to check existing characters');
      return res.json();
    });
    
    // Set is_active if this is the first character
    characterData.is_active = existingCharacters.length === 0;
    
    // Create character
    const response = await fetch('/api/characters', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(characterData),
      credentials: 'include'
    });
    
    // Reset button state
    submitButton.disabled = false;
    submitButton.textContent = originalButtonText;
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create character');
    }
    
    const data = await response.json();
    
    // Show success message
    window.authUtils.showFormSuccess('character-form', 'Character created successfully!');
    
    // Redirect to character profile after delay
    setTimeout(() => {
      window.location.href = `character-profile.html?id=${data.id}`;
    }, 1500);
    
  } catch (error) {
    console.error('Error creating character:', error);
    
    // Reset button state
    const submitButton = document.getElementById('submit-btn');
    submitButton.disabled = false;
    submitButton.textContent = 'Create Character';
    
    // Show error message
    window.authUtils.showFormError('character-form', error.message || 'Failed to create character. Please try again later.');
  }
}

// Function to load character data for editing - modified for image URLs
async function loadCharacterData(characterId) {
  try {
    const response = await fetch(`/api/characters/${characterId}`, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch character data');
    }
    
    const character = await response.json();
    
    // Fill in the form with character data
    document.getElementById('character-name').value = character.name;
    
    // Set team
    if (character.team_id) {
      document.getElementById('team-id').value = character.team_id;
    }
    
    // Set position
    const position = character.position;
    const positionOption = document.querySelector(`.position-option[data-position="${position}"]`);
    if (positionOption) {
      positionOption.click(); // Triggers the position selection handler
    }
    
    // Set biography
    document.getElementById('character-bio').value = character.bio || '';
    
    // Set avatar URL if available
    if (character.avatar_url) {
      document.getElementById('avatar-url').value = character.avatar_url;
      document.getElementById('avatar-preview').src = character.avatar_url;
    }
    
    // Set stats
    const stats = JSON.parse(character.stats_json);
    
    // Set common stats
    document.getElementById('stat-games').value = stats.games || 0;
    document.getElementById('stat-goals').value = stats.goals || 0;
    document.getElementById('stat-assists').value = stats.assists || 0;
    document.getElementById('stat-plus-minus').value = stats.plus_minus || 0;
    document.getElementById('stat-penalties').value = stats.penalties || 0;
    document.getElementById('stat-shots').value = stats.shots || 0;
    
    // Set position-specific stats (these will be recreated by updateDynamicStats)
    setTimeout(() => {
      if (position === 'C' && document.getElementById('stat-faceoff-pct')) {
        document.getElementById('stat-faceoff-pct').value = stats.faceoff_pct || 50.0;
      } else if (position === 'D') {
        if (document.getElementById('stat-blocks')) document.getElementById('stat-blocks').value = stats.blocks || 0;
        if (document.getElementById('stat-hits')) document.getElementById('stat-hits').value = stats.hits || 0;
        if (document.getElementById('stat-ice-time')) document.getElementById('stat-ice-time').value = stats.ice_time ? (stats.ice_time / 60).toFixed(1) : 20;
      } else if (position === 'G') {
        if (document.getElementById('stat-wins')) document.getElementById('stat-wins').value = stats.wins || 0;
        if (document.getElementById('stat-losses')) document.getElementById('stat-losses').value = stats.losses || 0;
        if (document.getElementById('stat-gaa')) document.getElementById('stat-gaa').value = stats.gaa || 2.50;
        if (document.getElementById('stat-save-pct')) document.getElementById('stat-save-pct').value = stats.save_pct || '.900';
        if (document.getElementById('stat-shutouts')) document.getElementById('stat-shutouts').value = stats.shutouts || 0;
      }
      
      // Set shooting percentage for forwards
      if ((position === 'LW' || position === 'RW' || position === 'C') && document.getElementById('stat-shooting-pct')) {
        document.getElementById('stat-shooting-pct').value = stats.shooting_pct || 10.0;
      }
    }, 100); // Small delay to ensure dynamic stats are rendered
    
  } catch (error) {
    console.error('Error loading character data:', error);
    window.authUtils.showFormError('character-form', 'Failed to load character data. Please try again later.');
  }
}

// Update character function
async function updateCharacter(characterId) {
  try {
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    // Get character data
    const characterData = getCharacterFormData();
    
    // Show loading state
    const submitButton = document.getElementById('submit-btn');
    const originalButtonText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Updating...';
    
    // Clear previous messages
    window.authUtils.clearFormMessages('character-form');
    
    // Add avatar URL directly from input
    const avatarUrl = document.getElementById('avatar-url').value.trim();
    if (avatarUrl) {
      characterData.avatar_url = avatarUrl;
    }
    
    // Update character
    const response = await fetch(`/api/characters/${characterId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(characterData),
      credentials: 'include'
    });
    
    // Reset button state
    submitButton.disabled = false;
    submitButton.textContent = originalButtonText;
    
    if (!response.ok) {
      throw new Error('Failed to update character');
    }
    
    // Show success message
    window.authUtils.showFormSuccess('character-form', 'Character updated successfully!');
    
    // Redirect to character profile after delay
    setTimeout(() => {
      window.location.href = `character-profile.html?id=${characterId}`;
    }, 1500);
    
  } catch (error) {
    console.error('Error updating character:', error);
    
    // Reset button state
    const submitButton = document.getElementById('submit-btn');
    submitButton.disabled = false;
    submitButton.textContent = 'Update Character';
    
    // Show error message
    window.authUtils.showFormError('character-form', 'Failed to update character. Please try again later.');
  }
}