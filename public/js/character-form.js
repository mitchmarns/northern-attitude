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

// Setup character type selection functionality
function setupCharacterTypeSelection() {
  // Add click event to each character type option
  DOM.typeOptions.forEach(option => {
    option.addEventListener('click', function() {
      const type = this.getAttribute('data-type');
      selectCharacterType(type);
    });
  });
  
  // Add click event to each position option
  DOM.positionOptions.forEach(option => {
    option.addEventListener('click', function() {
      const position = this.getAttribute('data-position');
      selectPlayerPosition(position);
    });
  });
  
  // Set default character type to player
  selectCharacterType('player');
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

// Update form sections based on character type
function updateFormSections(type) {
  console.log('Updating form sections for type:', type);

  // If type is invalid, use 'player' as default
  if (!CHARACTER_TYPES[type]) {
    console.log('Invalid character type, defaulting to player');
    type = 'player';
  }

  const characterType = CHARACTER_TYPES[type];
  
  // Show/hide player position section
  if (DOM['player-position-section']) {
    console.log('Updating player position section visibility:', characterType.requiresPosition);
    DOM['player-position-section'].style.display = 
      characterType.requiresPosition ? 'block' : 'none';
  } else {
    console.log('Player position section element not found');
  }
  
  // Show/hide player stats section
  if (DOM['player-stats-section']) {
    console.log('Updating player stats section visibility:', characterType.requiresStats);
    DOM['player-stats-section'].style.display = 
      characterType.requiresStats ? 'block' : 'none';
  } else {
    console.log('Player stats section element not found');
  }
  
  // Handle role selection for non-player types
  if (DOM['role-selection']) {
    // Show/hide role selection
    const showRoles = (characterType.roles && type !== 'player');
    console.log('Updating role selection visibility:', showRoles);
    DOM['role-selection'].style.display = showRoles ? 'block' : 'none';
    
    // Generate role options if needed
    if (showRoles && DOM['role-options']) {
      generateRoleOptions(characterType.roles);
    }
  } else {
    console.log('Role selection element not found');
  }
}

// Generate role options for non-player types
function generateRoleOptions(roles) {
  if (!roles || !DOM['role-options']) return;
  
  // Clear existing options
  DOM['role-options'].innerHTML = '';
  
  // Create a role option for each role
  roles.forEach(role => {
    const roleOption = document.createElement('div');
    roleOption.className = 'role-option';
    
    roleOption.innerHTML = `
      <input type="radio" id="role-${role.replace(/\s+/g, '-').toLowerCase()}" 
             name="character-role" value="${role}">
      <label for="role-${role.replace(/\s+/g, '-').toLowerCase()}">${role}</label>
    `;
    
    DOM['role-options'].appendChild(roleOption);
  });
  
  // Select first role by default
  const firstRole = DOM['role-options'].querySelector('input[type="radio"]');
  if (firstRole) {
    firstRole.checked = true;
  }
}

// Update position-specific stats section
function updatePositionStats(position) {
  if (!DOM['dynamic-stats-container']) return;
  
  // Get template for the selected position
  const template = POSITION_STATS_TEMPLATES[position];
  
  if (!template) {
    DOM['dynamic-stats-container'].innerHTML = '';
    return;
  }
  
  // Update the stats container with the template
  DOM['dynamic-stats-container'].innerHTML = template;
}

// Load teams from the API
async function loadTeams() {
  try {
    const response = await fetch('/api/teams', {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch teams');
    }
    
    const teams = await response.json();
    
    // Update team dropdown
    if (DOM['team-id']) {
      // Save current selection if any
      const currentSelection = DOM['team-id'].value;
      
      // Clear existing options
      DOM['team-id'].innerHTML = '<option value="">Not on a team</option>';
      
      // Add option for each team
      teams.forEach(team => {
        const option = document.createElement('option');
        option.value = team.id;
        option.textContent = team.name;
        DOM['team-id'].appendChild(option);
      });
      
      // Restore selection if it exists
      if (currentSelection) {
        DOM['team-id'].value = currentSelection;
      }
    }
  } catch (error) {
    console.error('Error loading teams:', error);
  }
}

// Validate form inputs
function validateForm() {
  // Clear previous error messages
  window.authUtils.clearFormMessages('character-form');
  
  // Validate character name
  const characterName = DOM['character-name'].value.trim();
  if (!characterName) {
    window.authUtils.showFormError('character-form', 'Character name is required');
    return false;
  }
  
  // Get character type
  const characterType = DOM['character-type'].value;
  if (!characterType) {
    window.authUtils.showFormError('character-form', 'Character type is required');
    return false;
  }
  
  // For player type, validate position
  if (characterType === 'player') {
    const position = DOM['player-position'].value;
    if (!position) {
      window.authUtils.showFormError('character-form', 'Player position is required');
      return false;
    }
  } else {
    // For non-player types, validate role
    const role = document.querySelector('input[name="character-role"]:checked')?.value;
    if (!role) {
      window.authUtils.showFormError('character-form', 'Role selection is required');
      return false;
    }
  }
  
  return true;
}

// Get player stats from form inputs
function getPlayerStats(position) {
  // Get jersey number
  const jerseyNumber = DOM['jersey-number'] ? 
    parseInt(DOM['jersey-number'].value) || null : null;
  
  // Get common stats
  const games = document.getElementById('stat-games') ? 
    parseInt(document.getElementById('stat-games').value) || 0 : 0;
    
  const goals = document.getElementById('stat-goals') ? 
    parseInt(document.getElementById('stat-goals').value) || 0 : 0;
    
  const assists = document.getElementById('stat-goals') ? 
    parseInt(document.getElementById('stat-assists').value) || 0 : 0;
    
  const plusMinus = document.getElementById('stat-plus-minus') ? 
    parseInt(document.getElementById('stat-plus-minus').value) || 0 : 0;
    
  const penalties = document.getElementById('stat-penalties') ? 
    parseInt(document.getElementById('stat-penalties').value) || 0 : 0;
    
  const shots = document.getElementById('stat-shots') ? 
    parseInt(document.getElementById('stat-shots').value) || 0 : 0;
  
  // Create base stats object
  const stats = {
    jersey_number: jerseyNumber,
    games: games,
    goals: goals,
    assists: assists,
    plus_minus: plusMinus,
    penalties: penalties,
    shots: shots
  };
  
  // Add position-specific stats
  switch (position) {
    case 'C':
      stats.faceoff_pct = parseFloat(document.getElementById('stat-faceoff-pct')?.value) || 50.0;
      stats.shooting_pct = parseFloat(document.getElementById('stat-shooting-pct')?.value) || 10.0;
      break;
    case 'LW':
    case 'RW':
      stats.shooting_pct = parseFloat(document.getElementById('stat-shooting-pct')?.value) || 10.0;
      break;
    case 'D':
      stats.blocks = parseInt(document.getElementById('stat-blocks')?.value) || 0;
      stats.hits = parseInt(document.getElementById('stat-hits')?.value) || 0;
      stats.ice_time = parseFloat(document.getElementById('stat-ice-time')?.value) || 20.0;
      break;
    case 'G':
      stats.wins = parseInt(document.getElementById('stat-wins')?.value) || 0;
      stats.losses = parseInt(document.getElementById('stat-losses')?.value) || 0;
      stats.gaa = parseFloat(document.getElementById('stat-gaa')?.value) || 2.50;
      stats.save_pct = document.getElementById('stat-save-pct')?.value || '.900';
      stats.shutouts = parseInt(document.getElementById('stat-shutouts')?.value) || 0;
      break;
  }
  
  // Convert to JSON string
  return JSON.stringify(stats);
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

    console.log('Updating character with ID:', characterId);

    // Get the original character data first to avoid overwriting fields
    const originalResponse = await fetch(`/api/characters/${characterId}`, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!originalResponse.ok) {
      throw new Error('Failed to fetch original character data');
    }
    
    const originalCharacter = await originalResponse.json();
    console.log('Original character data:', originalCharacter);

    // Get character data - collect everything at once
    const formData = {
      characterType: DOM['character-type'].value || originalCharacter.character_type || 'player',
      name: DOM['character-name'].value.trim() || originalCharacter.name,
      teamId: DOM['team-id'].value || originalCharacter.team_id || null,
      bio: DOM['character-bio'].value.trim(),
      avatarUrl: DOM['avatar-url'].value.trim(),
      headerImageUrl: DOM['header-image-url'].value.trim(),
    };
    
    console.log('Form data collected:', formData);

    // Prepare character update data - preserve values if empty rather than setting to null
    const characterData = {
      name: formData.name,
      character_type: formData.characterType,
      team_id: formData.teamId
    };
    
    // Only update bio if it has a value or is explicitly emptied
    if (formData.bio !== undefined) {
      characterData.bio = formData.bio;
    }
    
    // Only update avatar URL if it has a value
    if (formData.avatarUrl) {
      characterData.avatar_url = formData.avatarUrl;
    }
    
    // Only update header image URL if it has a value
    if (formData.headerImageUrl) {
      characterData.header_image_url = formData.headerImageUrl;
      console.log('Setting header image URL in update:', formData.headerImageUrl);
    }

    // Add type-specific data
    if (formData.characterType === 'player') {
      // Add player-specific data
      const position = DOM['player-position'].value;
      if (position) {
        characterData.position = position;
      }
      
      const statsJson = getPlayerStats(position);
      if (statsJson) {
        characterData.stats_json = statsJson;
      }
    } else {
      // Add role for non-player types
      const role = document.querySelector('input[name="character-role"]:checked')?.value;
      
      if (role) {
        characterData.role = role;
        characterData.stats_json = JSON.stringify({}); // Empty stats for non-players
      }
    }
    
    console.log('Character data to update:', characterData);

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

// Function to load character data for editing
async function loadCharacterData(characterId) {
  try {
    console.log('Loading character data for ID:', characterId);
    
    const response = await fetch(`/api/characters/${characterId}`, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch character data');
    }
    
    const character = await response.json();
    console.log('Character data loaded:', character);
    
    // Populate form with character data
    if (DOM['character-name']) DOM['character-name'].value = character.name || '';
    if (DOM['character-bio']) DOM['character-bio'].value = character.bio || '';
    
    // Set avatar URL if available
    if (character.avatar_url && DOM['avatar-url']) {
      DOM['avatar-url'].value = character.avatar_url;
      if (DOM['avatar-image']) DOM['avatar-image'].src = character.avatar_url;
    }
    
    // Set header image if available
    if (character.header_image_url && DOM['header-image-url']) {
      DOM['header-image-url'].value = character.header_image_url;
      if (DOM['header-image-preview']) DOM['header-image-preview'].src = character.header_image_url;
      console.log('Setting header image URL:', character.header_image_url);
    }
    
    // Set team selection
    if (character.team_id && DOM['team-id']) {
      DOM['team-id'].value = character.team_id;
    }
    
    // Set character type - make sure this is valid
    const characterType = character.character_type || 'player';
    console.log('Character type from server:', characterType);
    
    // Set character type
    selectCharacterType(characterType);
    
    // For player type
    if (characterType === 'player') {
      // Set position
      if (character.position) {
        selectPlayerPosition(character.position);
      }
      
      // Set stats - parse from JSON
      let stats = {};
      try {
        if (character.stats_json) {
          stats = JSON.parse(character.stats_json);
          console.log('Parsed stats:', stats);
        }
      } catch (e) {
        console.error('Error parsing character stats:', e);
      }
      
      // Set jersey number if available
      if (stats.jersey_number !== undefined && DOM['jersey-number']) {
        DOM['jersey-number'].value = stats.jersey_number;
      }
      
      // Populate stat inputs
      populateStatsInputs(stats);
    } else if (character.role) {
      // For non-player types, set role selection
      selectCharacterRole(character.role);
    }
  } catch (error) {
    console.error('Error loading character data:', error);
    window.authUtils.showFormError('character-form', 'Failed to load character data. Please try again later.');
  }
}

// Helper functions to set form values based on character data
function selectCharacterType(type) {
  // If type is undefined or null, default to 'player'
  if (!type) {
    type = 'player';
    console.log('No character type specified, defaulting to player');
  }
  
  if (!DOM['character-type']) return;
  
  // Set the value
  DOM['character-type'].value = type;
  
  // Update UI to reflect the selected type
  DOM.typeOptions.forEach(option => {
    if (option.getAttribute('data-type') === type) {
      option.classList.add('selected');
    } else {
      option.classList.remove('selected');
    }
  });
  
  // Update type description
  if (DOM['character-type-description']) {
    DOM['character-type-description'].textContent = CHARACTER_TYPES[type]?.description || '';
  }
  
  // Show/hide appropriate sections
  updateFormSections(type);
  
  console.log('Character type set to:', type);
}

function selectPlayerPosition(position) {
  if (!DOM['player-position']) return;
  
  DOM['player-position'].value = position;
  
  // Update UI to reflect the selected position
  DOM.positionOptions.forEach(option => {
    if (option.getAttribute('data-position') === position) {
      option.classList.add('selected');
    } else {
      option.classList.remove('selected');
    }
  });
  
  // Update position-specific stats section
  updatePositionStats(position);
}

function selectCharacterRole(role) {
  // Find and select the role radio button
  const roleInput = document.querySelector(`input[name="character-role"][value="${role}"]`);
  if (roleInput) {
    roleInput.checked = true;
  }
}

function populateStatsInputs(stats) {
  // Populate common stats
  if (document.getElementById('stat-games')) document.getElementById('stat-games').value = stats.games || 0;
  if (document.getElementById('stat-goals')) document.getElementById('stat-goals').value = stats.goals || 0;
  if (document.getElementById('stat-assists')) document.getElementById('stat-assists').value = stats.assists || 0;
  if (document.getElementById('stat-plus-minus')) document.getElementById('stat-plus-minus').value = stats.plus_minus || 0;
  if (document.getElementById('stat-penalties')) document.getElementById('stat-penalties').value = stats.penalties || 0;
  if (document.getElementById('stat-shots')) document.getElementById('stat-shots').value = stats.shots || 0;
  
  // Position-specific stats
  if (document.getElementById('stat-faceoff-pct')) document.getElementById('stat-faceoff-pct').value = stats.faceoff_pct || 50.0;
  if (document.getElementById('stat-shooting-pct')) document.getElementById('stat-shooting-pct').value = stats.shooting_pct || 10.0;
  if (document.getElementById('stat-blocks')) document.getElementById('stat-blocks').value = stats.blocks || 0;
  if (document.getElementById('stat-hits')) document.getElementById('stat-hits').value = stats.hits || 0;
  if (document.getElementById('stat-ice-time')) document.getElementById('stat-ice-time').value = stats.ice_time || 20.0;
  if (document.getElementById('stat-wins')) document.getElementById('stat-wins').value = stats.wins || 0;
  if (document.getElementById('stat-losses')) document.getElementById('stat-losses').value = stats.losses || 0;
  if (document.getElementById('stat-gaa')) document.getElementById('stat-gaa').value = stats.gaa || 2.50;
  if (document.getElementById('stat-save-pct')) document.getElementById('stat-save-pct').value = stats.save_pct || '.900';
  if (document.getElementById('stat-shutouts')) document.getElementById('stat-shutouts').value = stats.shutouts || 0;
}

// On page load, check for character ID in URL
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded, initializing character form...');
  
  // Check if user is authenticated
  window.authUtils.checkAuth(true);
  
  // Set up logout functionality
  window.authUtils.setupLogoutButton();
  
  // Initialize form elements
  cacheDOMElements();
  
  // Log all DOM elements to check for issues
  console.log('DOM elements cached:', Object.keys(DOM).map(key => {
    return {
      id: key,
      found: !!DOM[key]
    };
  }));
  
  // Initialize UI
  setupCharacterTypeSelection();
  setupAvatarPreview();
  loadTeams();
  
  // Check if editing an existing character
  const urlParams = new URLSearchParams(window.location.search);
  const characterId = urlParams.get('id');
  
  console.log('Character ID from URL:', characterId);
  
  if (characterId) {
    // We're editing an existing character
    console.log('Editing existing character');
    
    // Update form title and submit button
    if (DOM['form-title']) DOM['form-title'].textContent = 'Edit Character';
    if (DOM['submit-btn']) DOM['submit-btn'].textContent = 'Update Character';
    
    // Update form submission handler
    if (DOM['character-form']) {
      DOM['character-form'].onsubmit = function(e) {
        e.preventDefault();
        updateCharacter(characterId);
      };
    }
    
    // Load character data AFTER setting up the UI
    setTimeout(() => {
      loadCharacterData(characterId);
    }, 100);
  } else {
    // We're creating a new character
    console.log('Creating new character');
    
    // Set player as default type for new characters
    selectCharacterType('player');
    
    if (DOM['character-form']) {
      DOM['character-form'].onsubmit = function(e) {
        e.preventDefault();
        createCharacter();
      };
    }
  }
  
  // Debug log all form elements
  setTimeout(() => {
    console.log('Form state after initialization:');
    console.log('Character type:', DOM['character-type']?.value);
    console.log('Player position section visible:', DOM['player-position-section']?.style.display);
    console.log('Player stats section visible:', DOM['player-stats-section']?.style.display);
    console.log('Role selection visible:', DOM['role-selection']?.style.display);
  }, 200);
});