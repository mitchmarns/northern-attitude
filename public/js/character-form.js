// character-form.js - Client-side functionality for character creation and editing

document.addEventListener('DOMContentLoaded', function() {
  // Check if user is authenticated
  window.authUtils.checkAuth(true);
  
  // Set up logout functionality
  window.authUtils.setupLogoutButton();
  
  // Get character ID from URL query parameters (if editing)
  const urlParams = new URLSearchParams(window.location.search);
  const characterId = urlParams.get('id');
  
  // Update page title and button text based on mode (create or edit)
  if (characterId) {
    document.getElementById('form-title').textContent = 'Edit Character';
    document.getElementById('submit-btn').textContent = 'Update Character';
    document.title = 'Edit Character | Northern Attitude';
  }
  
  // Set up position selection
  setupPositionSelection();
  
  // Load teams for dropdown
  loadTeams();
  
  // Set up avatar preview functionality
  setupAvatarPreview();
  
  // If editing, load character data
  if (characterId) {
    loadCharacterData(characterId);
  }
  
  // Set up form submission
  document.getElementById('character-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    if (characterId) {
      updateCharacter(characterId);
    } else {
      createCharacter();
    }
  });
});

// Function to set up position selection
function setupPositionSelection() {
  const positionOptions = document.querySelectorAll('.position-option');
  
  positionOptions.forEach(option => {
    option.addEventListener('click', function() {
      const position = this.getAttribute('data-position');
      
      // Remove selected class from all options
      positionOptions.forEach(opt => opt.classList.remove('selected'));
      
      // Add selected class to clicked option
      this.classList.add('selected');
      
      // Set hidden input value
      document.getElementById('position').value = position;
      
      // Hide all position descriptions
      document.querySelectorAll('.position-description').forEach(desc => {
        desc.style.display = 'none';
      });
      
      // Show selected position description
      const descriptionElement = document.getElementById(`position-${position}-description`);
      if (descriptionElement) {
        descriptionElement.style.display = 'block';
      }
      
      // Update dynamic stats based on position
      updateDynamicStats(position);
    });
  });
}

// Function to update dynamic stats based on selected position
function updateDynamicStats(position) {
  const container = document.getElementById('dynamic-stats-container');
  container.innerHTML = '';
  
  let statsHTML = '<div class="stats-grid">';
  
  // Add position-specific stats
  if (position === 'C') {
    statsHTML += `
      <div class="stat-input-group">
        <label for="stat-faceoff-pct">Faceoff %</label>
        <input type="number" id="stat-faceoff-pct" class="stat-input" value="50.0" min="0" max="100" step="0.1">
      </div>
    `;
  } else if (position === 'D') {
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
        <input type="number" id="stat-ice-time" class="stat-input" value="20" min="0" max="60" step="0.1">
      </div>
    `;
  } else if (position === 'G') {
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
        <label for="stat-gaa">Goals Against Avg</label>
        <input type="number" id="stat-gaa" class="stat-input" value="2.50" min="0" step="0.01">
      </div>
      <div class="stat-input-group">
        <label for="stat-save-pct">Save %</label>
        <input type="number" id="stat-save-pct" class="stat-input" value=".900" min="0" max="1" step="0.001">
      </div>
      <div class="stat-input-group">
        <label for="stat-shutouts">Shutouts</label>
        <input type="number" id="stat-shutouts" class="stat-input" value="0" min="0">
      </div>
    `;
  }
  
  // Add shooting percentage for forwards
  if (position === 'LW' || position === 'RW' || position === 'C') {
    statsHTML += `
      <div class="stat-input-group">
        <label for="stat-shooting-pct">Shooting %</label>
        <input type="number" id="stat-shooting-pct" class="stat-input" value="10.0" min="0" max="100" step="0.1">
      </div>
    `;
  }
  
  statsHTML += '</div>';
  container.innerHTML = statsHTML;
}

// Function to load teams for dropdown
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
    
    // Add teams to dropdown
    teams.forEach(team => {
      const option = document.createElement('option');
      option.value = team.id;
      option.textContent = team.name;
      teamSelect.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading teams:', error);
    window.authUtils.showFormError('character-form', 'Failed to load teams. Please try again later.');
  }
}

// Function to set up avatar preview
function setupAvatarPreview() {
  const avatarInput = document.getElementById('avatar-file');
  const avatarPreview = document.getElementById('avatar-preview');
  
  avatarInput.addEventListener('change', function() {
    if (this.files && this.files[0]) {
      const reader = new FileReader();
      
      reader.onload = function(e) {
        avatarPreview.src = e.target.result;
      };
      
      reader.readAsDataURL(this.files[0]);
    }
  });
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
    
    // Set avatar preview if available
    if (character.avatar_url) {
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

// Function to create a new character
async function createCharacter() {
  try {
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    // Get character data
    const characterData = getCharacterFormData();
    
    // Create FormData object for avatar upload
    const formData = new FormData();
    const avatarFile = document.getElementById('avatar-file').files[0];
    
    // Show loading state
    const submitButton = document.getElementById('submit-btn');
    const originalButtonText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Creating...';
    
    // Clear previous messages
    window.authUtils.clearFormMessages('character-form');
    
    // First, upload avatar if provided
    let avatarUrl = null;
    if (avatarFile) {
      formData.append('avatar', avatarFile);
      
      const avatarResponse = await fetch('/api/upload/avatar', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!avatarResponse.ok) {
        throw new Error('Failed to upload avatar');
      }
      
      const avatarData = await avatarResponse.json();
      avatarUrl = avatarData.url;
    }
    
    // Add avatar URL to character data if available
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

// Function to update an existing character
async function updateCharacter(characterId) {
  try {
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    // Get character data
    const characterData = getCharacterFormData();
    
    // Create FormData object for avatar upload
    const formData = new FormData();
    const avatarFile = document.getElementById('avatar-file').files[0];
    
    // Show loading state
    const submitButton = document.getElementById('submit-btn');
    const originalButtonText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Updating...';
    
    // Clear previous messages
    window.authUtils.clearFormMessages('character-form');
    
    // First, upload avatar if provided
    let avatarUrl = null;
    if (avatarFile) {
      formData.append('avatar', avatarFile);
      
      const avatarResponse = await fetch('/api/upload/avatar', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!avatarResponse.ok) {
        throw new Error('Failed to upload avatar');
      }
      
      const avatarData = await avatarResponse.json();
      avatarUrl = avatarData.url;
    }
    
    // Add avatar URL to character data if available
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

// Function to validate the form
function validateForm() {
  // Clear previous messages
  window.authUtils.clearFormMessages('character-form');
  
  // Check character name
  const characterName = document.getElementById('character-name').value.trim();
  if (!characterName) {
    window.authUtils.showFormError('character-form', 'Character name is required');
    return false;
  }
  
  // Check position
  const position = document.getElementById('position').value;
  if (!position) {
    window.authUtils.showFormError('character-form', 'Please select a position');
    return false;
  }
  
  return true;
}

// Function to get character data from form
function getCharacterFormData() {
  const characterName = document.getElementById('character-name').value.trim();
  const teamId = document.getElementById('team-id').value || null;
  const position = document.getElementById('position').value;
  const bio = document.getElementById('character-bio').value.trim();
  
  // Get common stats
  const games = parseInt(document.getElementById('stat-games').value) || 0;
  const goals = parseInt(document.getElementById('stat-goals').value) || 0;
  const assists = parseInt(document.getElementById('stat-assists').value) || 0;
  const plusMinus = parseInt(document.getElementById('stat-plus-minus').value) || 0;
  const penalties = parseInt(document.getElementById('stat-penalties').value) || 0;
  const shots = parseInt(document.getElementById('stat-shots').value) || 0;
  
  // Build stats object with common stats
  const stats = {
    games,
    goals,
    assists,
    plus_minus: plusMinus,
    penalties,
    shots
  };
  
  // Add position-specific stats
  if (position === 'C') {
    stats.faceoff_pct = parseFloat(document.getElementById('stat-faceoff-pct').value) || 50.0;
  } else if (position === 'D') {
    stats.blocks = parseInt(document.getElementById('stat-blocks').value) || 0;
    stats.hits = parseInt(document.getElementById('stat-hits').value) || 0;
    stats.ice_time = Math.round(parseFloat(document.getElementById('stat-ice-time').value) * 60) || 1200; // Convert minutes to seconds
  } else if (position === 'G') {
    stats.wins = parseInt(document.getElementById('stat-wins').value) || 0;
    stats.losses = parseInt(document.getElementById('stat-losses').value) || 0;
    stats.gaa = parseFloat(document.getElementById('stat-gaa').value) || 2.50;
    stats.save_pct = document.getElementById('stat-save-pct').value || '.900';
    stats.shutouts = parseInt(document.getElementById('stat-shutouts').value) || 0;
  }
  
  // Add shooting percentage for forwards
  if (position === 'LW' || position === 'RW' || position === 'C') {
    stats.shooting_pct = parseFloat(document.getElementById('stat-shooting-pct').value) || 10.0;
  }
  
  return {
    name: characterName,
    team_id: teamId,
    position,
    bio,
    stats_json: JSON.stringify(stats)
  };
}