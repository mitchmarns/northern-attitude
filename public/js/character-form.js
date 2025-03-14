// Optimized character-form.js

// Cache DOM elements used repeatedly
const DOM = {};

// Character type configurations for reuse
const CHARACTER_TYPES = {
  player: {
    description: 'Players are the athletes who compete on the ice, representing their teams in hockey matches.',
    roles: null, // Roles handled by position selection
    requiresPosition: true,
    requiresStats: true
  },
  coach: {
    description: 'Coaches guide and train players, developing strategies and leading teams to success.',
    roles: [
      'Head Coach', 
      'Assistant Coach', 
      'Goalie Coach', 
      'Skill Development Coach', 
      'Strength and Conditioning Coach'
    ],
    requiresPosition: false,
    requiresStats: false
  },
  staff: {
    description: 'Team staff members provide crucial support behind the scenes, ensuring smooth team operations.',
    roles: [
      'Team Manager', 
      'Equipment Manager', 
      'Athletic Therapist', 
      'Team Doctor', 
      'Video Coordinator', 
      'Team Analyst'
    ],
    requiresPosition: false,
    requiresStats: false
  },
  executive: {
    description: 'League executives and administrators manage the broader aspects of hockey operations.',
    roles: [
      'League Commissioner', 
      'General Manager', 
      'Director of Hockey Operations', 
      'Scouting Director', 
      'Player Development Coordinator'
    ],
    requiresPosition: false,
    requiresStats: false
  },
  fan: {
    description: 'Passionate supporters who are deeply involved in the hockey community and team culture.',
    roles: [
      'Season Ticket Holder', 
      'Team Superfan', 
      'Hockey Blogger', 
      'Fan Club President', 
      'Community Organizer'
    ],
    requiresPosition: false,
    requiresStats: false
  },
  media: {
    description: 'Media professionals who cover, analyze, and report on hockey events and stories.',
    roles: [
      'Sports Journalist', 
      'Broadcaster', 
      'Hockey Analyst', 
      'Podcast Host', 
      'Commentator'
    ],
    requiresPosition: false,
    requiresStats: false
  }
};

// Position-specific stats templates for efficiency
const POSITION_STATS_TEMPLATES = {
  'C': `
    <div class="stat-input-group">
      <label for="stat-faceoff-pct">Faceoff %</label>
      <input type="number" id="stat-faceoff-pct" class="stat-input" value="50.0" min="0" max="100" step="0.1">
    </div>
    <div class="stat-input-group">
      <label for="stat-shooting-pct">Shooting %</label>
      <input type="number" id="stat-shooting-pct" class="stat-input" value="10.0" min="0" max="100" step="0.1">
    </div>
  `,
  'LW': `
    <div class="stat-input-group">
      <label for="stat-shooting-pct">Shooting %</label>
      <input type="number" id="stat-shooting-pct" class="stat-input" value="10.0" min="0" max="100" step="0.1">
    </div>
  `,
  'RW': `
    <div class="stat-input-group">
      <label for="stat-shooting-pct">Shooting %</label>
      <input type="number" id="stat-shooting-pct" class="stat-input" value="10.0" min="0" max="100" step="0.1">
    </div>
  `,
  'D': `
    <div class="stat-input-group">
      <label for="stat-blocks">Blocked Shots</label>
      <input type="number" id="stat-blocks" class="stat-input" value="0" min="0">
    </div>
    <div class="stat-input-group">
      <label for="stat-hits">Hits</label>
      <input type="number" id="stat-hits" class="stat-input" value="0" min="0">
    </div>
    <div class="stat-input-group">
      <label for="stat-ice-time">Avg. Ice Time (min)</label>
      <input type="number" id="stat-ice-time" class="stat-input" value="20.0" min="0" step="0.1">
    </div>
  `,
  'G': `
    <div class="stat-input-group">
      <label for="stat-wins">Wins</label>
      <input type="number" id="stat-wins" class="stat-input" value="0" min="0">
    </div>
    <div class="stat-input-group">
      <label for="stat-losses">Losses</label>
      <input type="number" id="stat-losses" class="stat-input" value="0" min="0">
    </div>
    <div class="stat-input-group">
      <label for="stat-gaa">Goals Against Average</label>
      <input type="number" id="stat-gaa" class="stat-input" value="2.50" min="0" step="0.01">
    </div>
    <div class="stat-input-group">
      <label for="stat-save-pct">Save Percentage</label>
      <input type="text" id="stat-save-pct" class="stat-input" value=".900">
    </div>
    <div class="stat-input-group">
      <label for="stat-shutouts">Shutouts</label>
      <input type="number" id="stat-shutouts" class="stat-input" value="0" min="0">
    </div>
  `
};

// Initialize cache of DOM elements
function cacheDOMElements() {
  const elements = [
    'character-form', 'character-type', 'character-type-description', 
    'role-selection', 'role-options', 'player-position-section', 
    'player-position', 'player-stats-section', 'dynamic-stats-container',
    'character-name', 'team-id', 'character-bio', 'avatar-url', 
    'avatar-image', 'header-image-url', 'header-image-preview',
    'jersey-number', 'form-title', 'submit-btn'
  ];
  
  elements.forEach(id => {
    DOM[id] = document.getElementById(id);
  });
  
  // Cache type and position option collections
  DOM.typeOptions = document.querySelectorAll('.character-type-option');
  DOM.positionOptions = document.querySelectorAll('.position-option');
}

// Setup avatar preview functionality - more efficiently
function setupAvatarPreview() {
  // Avatar preview
  const previewButton = document.getElementById('preview-avatar-btn');
  
  previewButton.addEventListener('click', function() {
    previewImage(DOM['avatar-url'].value.trim(), DOM['avatar-image'], '/api/placeholder/120/120');
  });

  // Header image preview
  const previewHeaderBtn = document.getElementById('preview-header-btn');
  
  previewHeaderBtn.addEventListener('click', function() {
    previewImage(DOM['header-image-url'].value.trim(), DOM['header-image-preview'], '/api/placeholder/800/300');
  });
}

// Reusable image preview function
function previewImage(imageUrl, imgElement, placeholderUrl) {
  if (!imageUrl) {
    window.authUtils.showFormError('character-form', 'Please enter an image URL');
    imgElement.src = placeholderUrl;
    return;
  }
  
  // Update the preview image
  imgElement.src = imageUrl;
  
  // Handle load errors
  imgElement.onerror = function() {
    imgElement.src = placeholderUrl;
    window.authUtils.showFormError('character-form', 'Invalid image URL or image could not be loaded');
  };
  
  // Clear error on successful load
  imgElement.onload = function() {
    window.authUtils.clearFormMessages('character-form');
  };
}

// Function to create a new character - more efficient API interaction
async function createCharacter() {
  try {
    // Validate form
    if (!validateForm()) {
      return;
    }

    // Get character type and data
    const characterType = DOM['character-type'].value;
    const characterName = DOM['character-name'].value.trim();
    const teamId = DOM['team-id'].value || null;
    const bio = DOM['character-bio'].value.trim();
    const avatarUrl = DOM['avatar-url'].value.trim();
    const headerImageUrl = DOM['header-image-url'].value.trim();

    // Prepare character data - use a single object construction
    const characterData = {
      name: characterName,
      character_type: characterType,
      team_id: teamId,
      bio: bio || null,
      avatar_url: avatarUrl || null,
      header_image_url: headerImageUrl || null
    };

    // Add type-specific data
    if (characterType === 'player') {
      // Add player-specific data
      const position = DOM['player-position'].value;
      const statsJson = getPlayerStats(position);
      
      characterData.position = position;
      characterData.stats_json = statsJson;
    } else {
      // Add role for non-player types
      const role = document.querySelector('input[name="character-role"]:checked')?.value;
      
      if (role) {
        characterData.role = role;
        characterData.stats_json = JSON.stringify({}); // Empty stats for non-players
      }
    }

    // Show loading state
    const submitButton = DOM['submit-btn'];
    const originalButtonText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Creating...';

    // Clear previous messages
    window.authUtils.clearFormMessages('character-form');

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
    DOM['submit-btn'].disabled = false;
    DOM['submit-btn'].textContent = 'Create Character';

    // Show error message
    window.authUtils.showFormError('character-form', error.message || 'Failed to create character. Please try again later.');
  }
}

// Update an existing character - more efficient API interaction
async function updateCharacter(characterId) {
  try {
    // Validate form
    if (!validateForm()) {
      return;
    }

    // Get character data - collect everything at once
    const formData = {
      characterType: DOM['character-type'].value,
      name: DOM['character-name'].value.trim(),
      teamId: DOM['team-id'].value || null,
      bio: DOM['character-bio'].value.trim(),
      avatarUrl: DOM['avatar-url'].value.trim(),
      headerImageUrl: DOM['header-image-url'].value.trim(),
    };

    // Prepare character update data
    const characterData = {
      name: formData.name,
      character_type: formData.characterType,
      team_id: formData.teamId,
      bio: formData.bio || null,
      avatar_url: formData.avatarUrl || null,
      header_image_url: formData.headerImageUrl || null
    };

    // Add type-specific data
    if (formData.characterType === 'player') {
      // Add player-specific data
      const position = DOM['player-position'].value;
      const statsJson = getPlayerStats(position);
      
      characterData.position = position;
      characterData.stats_json = statsJson;
    } else {
      // Add role for non-player types
      const role = document.querySelector('input[name="character-role"]:checked')?.value;
      
      if (role) {
        characterData.role = role;
        characterData.stats_json = JSON.stringify({}); // Empty stats for non-players
      }
    }

    // Show loading state - cache the button reference
    const submitButton = DOM['submit-btn'];
    const originalButtonText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Updating...';

    // Clear previous messages
    window.authUtils.clearFormMessages('character-form');

    // Update character with a single API call
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
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update character');
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
    DOM['submit-btn'].disabled = false;
    DOM['submit-btn'].textContent = 'Update Character';

    // Show error message
    window.authUtils.showFormError('character-form', error.message || 'Failed to update character. Please try again later.');
  }
}