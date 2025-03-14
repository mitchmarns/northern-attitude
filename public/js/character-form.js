// character-form.js - Enhanced for proper data loading

// Character type configurations
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

// Setup avatar preview functionality
function setupAvatarPreview() {
  const avatarUrlInput = document.getElementById('avatar-url');
  const previewButton = document.getElementById('preview-avatar-btn');
  const avatarImage = document.getElementById('avatar-image');
  
  previewButton.addEventListener('click', function() {
    const imageUrl = avatarUrlInput.value.trim();
    
    if (imageUrl) {
      // Update the preview image
      avatarImage.src = imageUrl;
      
      // Handle load errors by reverting to placeholder
      avatarImage.onerror = function() {
        avatarImage.src = '/api/placeholder/120/120';
        window.authUtils.showFormError('character-form', 'Invalid image URL or image could not be loaded');
      };
    } else {
      // If no URL, show placeholder
      avatarImage.src = '/api/placeholder/120/120';
      window.authUtils.showFormError('character-form', 'Please enter an image URL');
    }
  });

  // Header image preview
  const headerUrlInput = document.getElementById('header-image-url');
  const previewHeaderBtn = document.getElementById('preview-header-btn');
  const headerImagePreview = document.getElementById('header-image-preview');
  
  previewHeaderBtn.addEventListener('click', function() {
    const imageUrl = headerUrlInput.value.trim();
    
    if (imageUrl) {
      // Update the preview image
      headerImagePreview.src = imageUrl;
      
      // Handle load errors by reverting to placeholder
      headerImagePreview.onerror = function() {
        headerImagePreview.src = '/api/placeholder/800/300';
        window.authUtils.showFormError('character-form', 'Invalid header image URL or image could not be loaded');
      };
    } else {
      // If no URL, show placeholder
      headerImagePreview.src = '/api/placeholder/800/300';
      window.authUtils.showFormError('character-form', 'Please enter a header image URL');
    }
  });
}

// Create a function to trigger all the necessary setup for a character type
function setupCharacterType(type, existingCharacter = null) {
  // Find the corresponding type option
  const typeOption = document.querySelector(`.character-type-option[data-type="${type}"]`);
  
  if (!typeOption) {
    console.error(`No type option found for ${type}`);
    return;
  }
  
  // Simulate click to trigger all setup
  typeOption.click();
  
  // If it's a player type and we have an existing character, set up position
  if (type === 'player' && existingCharacter) {
    // Find and click the position option
    const positionOption = document.querySelector(`.position-option[data-position="${existingCharacter.position}"]`);
    if (positionOption) {
      positionOption.click();
    }
  }
  
  // If it's a non-player type and we have a role
  if (type !== 'player' && existingCharacter && existingCharacter.role) {
    const roleInput = document.querySelector(`input[name="character-role"][value="${existingCharacter.role}"]`);
    if (roleInput) {
      roleInput.checked = true;
    }
  }
}

// Function to create a new character
async function createCharacter() {
  try {
    // Validate form
    if (!validateForm()) {
      return;
    }

    // Get character type and data
    const characterType = document.getElementById('character-type').value;
    const characterName = document.getElementById('character-name').value.trim();
    const teamId = document.getElementById('team-id').value || null;
    const bio = document.getElementById('character-bio').value.trim();
    const avatarUrl = document.getElementById('avatar-url').value.trim();
    const headerImageUrl = document.getElementById('header-image-url').value.trim();

    // Prepare character data
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
      const position = document.getElementById('player-position').value;
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
    const submitButton = document.getElementById('submit-btn');
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
    const submitButton = document.getElementById('submit-btn');
    submitButton.disabled = false;
    submitButton.textContent = 'Create Character';

    // Show error message
    window.authUtils.showFormError('character-form', error.message || 'Failed to create character. Please try again later.');
  }
}

// Function to update an existing character
async function updateCharacter(characterId) {
  try {
    // Validate form
    if (!validateForm()) {
      return;
    }

    // Get character type and data
    const characterType = document.getElementById('character-type').value;
    const characterName = document.getElementById('character-name').value.trim();
    const teamId = document.getElementById('team-id').value || null;
    const bio = document.getElementById('character-bio').value.trim();
    const avatarUrl = document.getElementById('avatar-url').value.trim();
    const headerImageUrl = document.getElementById('header-image-url').value.trim();

    // Prepare character update data
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
      const position = document.getElementById('player-position').value;
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
    const submitButton = document.getElementById('submit-btn');
    const originalButtonText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Updating...';

    // Clear previous messages
    window.authUtils.clearFormMessages('character-form');

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
    const submitButton = document.getElementById('submit-btn');
    submitButton.disabled = false;
    submitButton.textContent = 'Update Character';

    // Show error message
    window.authUtils.showFormError('character-form', error.message || 'Failed to update character. Please try again later.');
  }
}

// Function to validate the form
function validateForm() {
  // Reset error messages
  window.authUtils.clearFormMessages('character-form');

  // Validate character type
  const characterType = document.getElementById('character-type').value;
  if (!characterType) {
    window.authUtils.showFormError('character-form', 'Please select a character type');
    return false;
  }

  // Validate character name
  const characterName = document.getElementById('character-name').value.trim();
  if (!characterName) {
    window.authUtils.showFormError('character-form', 'Character name is required');
    return false;
  }

  // Validate player-specific fields for player type
  if (characterType === 'player') {
    const position = document.getElementById('player-position').value;
    if (!position) {
      window.authUtils.showFormError('character-form', 'Please select a player position');
      return false;
    }
  }

  // Validate role for non-player types
  if (characterType !== 'player') {
    const role = document.querySelector('input[name="character-role"]:checked');
    if (!role) {
      window.authUtils.showFormError('character-form', 'Please select a role');
      return false;
    }
  }

  return true;
}

// Function to get player stats based on position
function getPlayerStats(position) {
  // Gather common stats
  const stats = {
    jersey_number: parseInt(document.getElementById('jersey-number').value) || null,
    games: parseInt(document.getElementById('stat-games').value) || 0,
    goals: parseInt(document.getElementById('stat-goals').value) || 0,
    assists: parseInt(document.getElementById('stat-assists').value) || 0,
    plus_minus: parseInt(document.getElementById('stat-plus-minus').value) || 0,
    penalties: parseInt(document.getElementById('stat-penalties').value) || 0,
    shots: parseInt(document.getElementById('stat-shots').value) || 0
  };

  // Add position-specific stats
  switch(position) {
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
      // Convert minutes to seconds for storage
      const iceTimeMinutes = parseFloat(document.getElementById('stat-ice-time')?.value) || 20.0;
      stats.ice_time = Math.round(iceTimeMinutes * 60);
      break;
    case 'G':
      stats.wins = parseInt(document.getElementById('stat-wins')?.value) || 0;
      stats.losses = parseInt(document.getElementById('stat-losses')?.value) || 0;
      stats.gaa = parseFloat(document.getElementById('stat-gaa')?.value) || 2.50;
      stats.save_pct = document.getElementById('stat-save-pct')?.value || '.900';
      stats.shutouts = parseInt(document.getElementById('stat-shutouts')?.value) || 0;
      break;
  }

  return JSON.stringify(stats);
}

// Load teams for the dropdown
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
    const teamSelect = document.getElementById('team-id');

    // Clear existing options except the first one
    while (teamSelect.options.length > 1) {
      teamSelect.remove(1);
    }

    // Add team options
    teams.forEach(team => {
      const option = document.createElement('option');
      option.value = team.id;
      option.textContent = team.name;
      teamSelect.appendChild(option);
    });

    // If editing an existing character, load character data
    const urlParams = new URLSearchParams(window.location.search);
    const characterId = urlParams.get('id');
    if (characterId) {
      loadCharacterData(characterId);
    }
  } catch (error) {
    console.error('Error loading teams:', error);
  }
}

// Function to load character data for editing
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

    // Set form title and submit button text
    document.getElementById('form-title').textContent = 'Edit Character';
    document.getElementById('submit-btn').textContent = 'Update Character';

    // Set basic character type setup
    const characterType = character.character_type || 'player';
    setupCharacterType(characterType, character);

    // Fill basic info
    document.getElementById('character-name').value = character.name;
    document.getElementById('team-id').value = character.team_id || '';
    document.getElementById('character-bio').value = character.bio || '';

    // Set avatar URL if available
    if (character.avatar_url) {
      document.getElementById('avatar-url').value = character.avatar_url;
      document.getElementById('avatar-image').src = character.avatar_url || '/api/placeholder/120/120';
    }

    // Set header image URL if available
    if (character.header_image_url) {
      document.getElementById('header-image-url').value = character.header_image_url;
      document.getElementById('header-image-preview').src = character.header_image_url || '/api/placeholder/800/300';
    }

    // For player types, set stats
    if (characterType === 'player') {
      // Use a timeout to ensure dynamic elements are created
      setTimeout(() => {
        const stats = JSON.parse(character.stats_json);
        
        // Jersey number (check if it exists in stats)
        if (stats.jersey_number) {
          document.getElementById('jersey-number').value = stats.jersey_number;
        }
        
        // Common stats for all players
        document.getElementById('stat-games').value = stats.games || 0;
        document.getElementById('stat-goals').value = stats.goals || 0;
        document.getElementById('stat-assists').value = stats.assists || 0;
        document.getElementById('stat-plus-minus').value = stats.plus_minus || 0;
        document.getElementById('stat-penalties').value = stats.penalties || 0;
        document.getElementById('stat-shots').value = stats.shots || 0;

        // Position-specific stats
        switch(character.position) {
          case 'C':
            document.getElementById('stat-faceoff-pct').value = stats.faceoff_pct || 50.0;
            document.getElementById('stat-shooting-pct').value = stats.shooting_pct || 10.0;
            break;
          case 'LW':
          case 'RW':
            document.getElementById('stat-shooting-pct').value = stats.shooting_pct || 10.0;
            break;
          case 'D':
            document.getElementById('stat-blocks').value = stats.blocks || 0;
            document.getElementById('stat-hits').value = stats.hits || 0;
            document.getElementById('stat-ice-time').value = stats.ice_time ? (stats.ice_time / 60).toFixed(1) : 20.0;
            break;
          case 'G':
            document.getElementById('stat-wins').value = stats.wins || 0;
            document.getElementById('stat-losses').value = stats.losses || 0;
            document.getElementById('stat-gaa').value = stats.gaa || 2.50;
            document.getElementById('stat-save-pct').value = stats.save_pct || '.900';
            document.getElementById('stat-shutouts').value = stats.shutouts || 0;
            break;
        }
      }, 200);  // Small delay to ensure dynamic elements are ready
    }

  } catch (error) {
    console.error('Error loading character data:', error);
    window.authUtils.showFormError('character-form', 'Failed to load character data. Please try again later.');
  }
}async function loadCharacterData(characterId) {
  try {
    const response = await fetch(`/api/characters/${characterId}`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to fetch character data');
    }

    const character = await response.json();

    // Set form title and submit button text
    document.getElementById('form-title').textContent = 'Edit Character';
    document.getElementById('submit-btn').textContent = 'Update Character';

    // Set basic character type setup
    const characterType = character.character_type || 'player';
    setupCharacterType(characterType, character);

    // Fill basic info
    document.getElementById('character-name').value = character.name;
    document.getElementById('team-id').value = character.team_id || '';
    document.getElementById('character-bio').value = character.bio || '';

    // Set avatar URL if available
    if (character.avatar_url) {
      document.getElementById('avatar-url').value = character.avatar_url;
      document.getElementById('avatar-image').src = character.avatar_url || '/api/placeholder/120/120';
    }

    // Set header image URL if available
    if (character.header_image_url) {
      document.getElementById('header-image-url').value = character.header_image_url;
      document.getElementById('header-image-preview').src = character.header_image_url || '/api/placeholder/800/300';
    }

    // For player types, set stats
    if (characterType === 'player') {
      // Use a timeout to ensure dynamic elements are created
      setTimeout(() => {
        const stats = JSON.parse(character.stats_json);
        
        // Jersey number (check if it exists in stats)
        if (stats.jersey_number) {
          document.getElementById('jersey-number').value = stats.jersey_number;
        }
        
        // Common stats for all players
        document.getElementById('stat-games').value = stats.games || 0;
        document.getElementById('stat-goals').value = stats.goals || 0;
        document.getElementById('stat-assists').value = stats.assists || 0;
        document.getElementById('stat-plus-minus').value = stats.plus_minus || 0;
        document.getElementById('stat-penalties').value = stats.penalties || 0;
        document.getElementById('stat-shots').value = stats.shots || 0;

        // Position-specific stats
        switch(character.position) {
          case 'C':
            document.getElementById('stat-faceoff-pct').value = stats.faceoff_pct || 50.0;
            document.getElementById('stat-shooting-pct').value = stats.shooting_pct || 10.0;
            break;
          case 'LW':
          case 'RW':
            document.getElementById('stat-shooting-pct').value = stats.shooting_pct || 10.0;
            break;
          case 'D':
            document.getElementById('stat-blocks').value = stats.blocks || 0;
            document.getElementById('stat-hits').value = stats.hits || 0;
            document.getElementById('stat-ice-time').value = stats.ice_time ? (stats.ice_time / 60).toFixed(1) : 20.0;
            break;
          case 'G':
            document.getElementById('stat-wins').value = stats.wins || 0;
            document.getElementById('stat-losses').value = stats.losses || 0;
            document.getElementById('stat-gaa').value = stats.gaa || 2.50;
            document.getElementById('stat-save-pct').value = stats.save_pct || '.900';
            document.getElementById('stat-shutouts').value = stats.shutouts || 0;
            break;
        }
      }, 200);  // Small delay to ensure dynamic elements are ready
    }

  } catch (error) {
    console.error('Error loading character data:', error);
    window.authUtils.showFormError('character-form', 'Failed to load character data. Please try again later.');
  }
}

// Setup form submission and initialization
document.addEventListener('DOMContentLoaded', function() {
  // Check if user is authenticated
  window.authUtils.checkAuth(true);

  // Set up character type selection
  setupCharacterTypeSelection();

  // Set up avatar preview
  setupAvatarPreview();

  // Load teams
  loadTeams();

  // Position selection for players
  setupPlayerPositionSelection();

  // Set up form submission
  const characterForm = document.getElementById('character-form');
  if (characterForm) {
    characterForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      // Check if we're editing an existing character
      const urlParams = new URLSearchParams(window.location.search);
      const characterId = urlParams.get('id');
      
      if (characterId) {
        // Update existing character
        updateCharacter(characterId);
      } else {
        // Create new character
        createCharacter();
      }
    });
  }
});

// Setup character type selection functionality
function setupCharacterTypeSelection() {
  const typeOptions = document.querySelectorAll('.character-type-option');
  const typeInput = document.getElementById('character-type');
  const typeDescription = document.getElementById('character-type-description');
  const roleSelection = document.getElementById('role-selection');
  const roleOptions = document.getElementById('role-options');
  const playerPositionSection = document.getElementById('player-position-section');
  const playerStatsSection = document.getElementById('player-stats-section');

  typeOptions.forEach(option => {
    option.addEventListener('click', function() {
      // Remove selected class from all options
      typeOptions.forEach(opt => opt.classList.remove('selected'));
      
      // Add selected class to clicked option
      this.classList.add('selected');
      
      // Set character type value
      const type = this.getAttribute('data-type');
      typeInput.value = type;
      
      // Update description
      typeDescription.textContent = CHARACTER_TYPES[type].description;
      
      // Handle role and position sections
      if (type === 'player') {
        // Show player-specific sections
        roleSelection.style.display = 'none';
        playerPositionSection.style.display = 'block';
        playerStatsSection.style.display = 'block';
      } else {
        // Show role selection for non-player types
        roleSelection.style.display = 'block';
        playerPositionSection.style.display = 'none';
        playerStatsSection.style.display = 'none';
        
        // Populate role options
        const roles = CHARACTER_TYPES[type].roles;
        roleOptions.innerHTML = roles.map((role, index) => `
          <div class="role-option">
            <input type="radio" 
                   id="role-${type}-${index}" 
                   name="character-role" 
                   value="${role}"
                   ${index === 0 ? 'checked' : ''}>
            <label for="role-${type}-${index}">${role}</label>
          </div>
        `).join('');
      }
    });
  });
}

// Setup player position selection
function setupPlayerPositionSelection() {
  const positionOptions = document.querySelectorAll('.position-option');
  
  positionOptions.forEach(option => {
    option.addEventListener('click', function() {
      // Remove selected class from all options
      positionOptions.forEach(opt => opt.classList.remove('selected'));
      
      // Add selected class to clicked option
      this.classList.add('selected');
      
      // Set position value in hidden input
      const position = this.getAttribute('data-position');
      document.getElementById('player-position').value = position;
      
      // Update dynamic stats section
      updateDynamicStats(position);
    });
  });
}

// Update dynamic stats section based on position
function updateDynamicStats(position) {
  const dynamicStatsContainer = document.getElementById('dynamic-stats-container');
  dynamicStatsContainer.innerHTML = ''; // Clear previous stats
  
  let statsHTML = '<div class="stats-grid">';
  
  switch(position) {
    case 'C':
      statsHTML += `
        <div class="stat-input-group">
          <label for="stat-faceoff-pct">Faceoff %</label>
          <input type="number" id="stat-faceoff-pct" class="stat-input" value="50.0" min="0" max="100" step="0.1">
        </div>
        <div class="stat-input-group">
          <label for="stat-shooting-pct">Shooting %</label>
          <input type="number" id="stat-shooting-pct" class="stat-input" value="10.0" min="0" max="100" step="0.1">
        </div>
      `;
      break;
      
    case 'LW':
    case 'RW':
      statsHTML += `
        <div class="stat-input-group">
          <label for="stat-shooting-pct">Shooting %</label>
          <input type="number" id="stat-shooting-pct" class="stat-input" value="10.0" min="0" max="100" step="0.1">
        </div>
      `;
      break;
      
    case 'D':
      statsHTML += `
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
      `;
      break;
      
    case 'G':
      statsHTML += `
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
      `;
      break;
  }
  
  statsHTML += '</div>';
  dynamicStatsContainer.innerHTML = statsHTML;
}

// Add this script for initial setup of interactive elements
document.addEventListener('DOMContentLoaded', function() {
  // Character type selection
  const typeOptions = document.querySelectorAll('.character-type-option');
  typeOptions.forEach(option => {
      option.addEventListener('click', function() {
          // Remove selected class from all options
          typeOptions.forEach(opt => opt.classList.remove('selected'));
          
          // Add selected class to clicked option
          this.classList.add('selected');
          
          // Show demo feedback in description
          const type = this.getAttribute('data-type');
          const typeDescriptions = {
              'player': 'Players are the athletes who compete on the ice, representing their teams in hockey matches.',
              'coach': 'Coaches guide and train players, developing strategies and leading teams to success.',
              'staff': 'Team staff members provide crucial support behind the scenes, ensuring smooth team operations.',
              'executive': 'League executives and administrators manage the broader aspects of hockey operations.',
              'fan': 'Passionate supporters who are deeply involved in the hockey community and team culture.',
              'media': 'Media professionals who cover, analyze, and report on hockey events and stories.'
          };
          
          document.getElementById('character-type-description').textContent = 
              typeDescriptions[type] || 'Select a character type to see more details.';
          
          // Show/hide sections based on type
          if (type === 'player') {
              document.getElementById('player-position-section').style.display = 'block';
              document.getElementById('player-stats-section').style.display = 'block';
              document.getElementById('role-selection').style.display = 'none';
          } else {
              document.getElementById('player-position-section').style.display = 'none';
              document.getElementById('player-stats-section').style.display = 'none';
              document.getElementById('role-selection').style.display = 'block';
              
              // Show demo roles
              const roles = {
                  'coach': ['Head Coach', 'Assistant Coach', 'Goalie Coach', 'Skill Development Coach'],
                  'staff': ['Team Manager', 'Equipment Manager', 'Athletic Therapist', 'Team Doctor'],
                  'executive': ['League Commissioner', 'General Manager', 'Director of Hockey Operations'],
                  'fan': ['Season Ticket Holder', 'Team Superfan', 'Hockey Blogger', 'Fan Club President'],
                  'media': ['Sports Journalist', 'Broadcaster', 'Hockey Analyst', 'Commentator']
              };
              
              const rolesHTML = (roles[type] || []).map((role, idx) => `
                  <div class="role-option">
                      <input type="radio" id="role-${idx}" name="character-role" value="${role}" ${idx === 0 ? 'checked' : ''}>
                      <label for="role-${idx}">${role}</label>
                  </div>
              `).join('');
              
              document.getElementById('role-options').innerHTML = rolesHTML;
          }
      });
  });
  
  // Position selection
  const positionOptions = document.querySelectorAll('.position-option');
  positionOptions.forEach(option => {
      option.addEventListener('click', function() {
          // Remove selected class from all options
          positionOptions.forEach(opt => opt.classList.remove('selected'));
          
          // Add selected class to clicked option
          this.classList.add('selected');
          
          // Show demo stats based on position
          const position = this.getAttribute('data-position');
          let dynamicStatsHTML = '<div class="stats-grid">';
          
          switch(position) {
              case 'C':
                  dynamicStatsHTML += `
                      <div class="stat-input-group">
                          <label for="stat-faceoff-pct">Faceoff %</label>
                          <input type="number" id="stat-faceoff-pct" class="stat-input" value="50.0" min="0" max="100" step="0.1">
                      </div>
                      <div class="stat-input-group">
                          <label for="stat-shooting-pct">Shooting %</label>
                          <input type="number" id="stat-shooting-pct" class="stat-input" value="10.0" min="0" max="100" step="0.1">
                      </div>
                  `;
                  break;
              case 'LW':
              case 'RW':
                  dynamicStatsHTML += `
                      <div class="stat-input-group">
                          <label for="stat-shooting-pct">Shooting %</label>
                          <input type="number" id="stat-shooting-pct" class="stat-input" value="10.0" min="0" max="100" step="0.1">
                      </div>
                  `;
                  break;
              case 'D':
                  dynamicStatsHTML += `
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
                  `;
                  break;
              case 'G':
                  dynamicStatsHTML += `
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
                  `;
                  break;
          }
          
          dynamicStatsHTML += '</div>';
          document.getElementById('dynamic-stats-container').innerHTML = dynamicStatsHTML;
      });
  });
  
  // Avatar preview
  const previewButton = document.getElementById('preview-avatar-btn');
  previewButton.addEventListener('click', function() {
      const imageUrl = document.getElementById('avatar-url').value.trim();
      const avatarImage = document.getElementById('avatar-image');
      
      if (imageUrl) {
          avatarImage.src = imageUrl;
          
          // Handle error
          avatarImage.onerror = function() {
              avatarImage.src = '/api/placeholder/120/120';
              // Show error message in demo
              const errorDiv = document.getElementById('character-form-error');
              errorDiv.textContent = 'Invalid image URL or image could not be loaded.';
              errorDiv.style.display = 'block';
          };
          
          // Handle success
          avatarImage.onload = function() {
              // Hide error if showing
              document.getElementById('character-form-error').style.display = 'none';
          };
      } else {
          // Show error for empty URL
          const errorDiv = document.getElementById('character-form-error');
          errorDiv.textContent = 'Please enter an image URL.';
          errorDiv.style.display = 'block';
      }
  });
});