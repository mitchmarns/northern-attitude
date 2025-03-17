import { DOM } from './dom-manager.js';
import { updateFormSections, populateStatsInputs, updatePositionStats } from './ui-controllers.js';
import { validateForm, selectCharacterRole } from './form-validators.js';
import { CHARACTER_TYPES } from './config.js'

// Function to create a new character - more efficient API interaction
export async function createCharacter() {
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
    const headerImageUrl = DOM['header-image-url'].value.trim(); // Make sure to get this value

    // Prepare character data - use a single object construction
    const characterData = {
      name: characterName,
      character_type: characterType,
      team_id: teamId,
      bio: bio || null,
      avatar_url: avatarUrl || null,
      header_image_url: headerImageUrl || null,
      age: document.getElementById('character-age')?.value,
      nationality: document.getElementById('character-nationality')?.value,
      hometown: document.getElementById('character-hometown')?.value,
      height: document.getElementById('character-height')?.value,
      weight: document.getElementById('character-weight')?.value,
      handedness: document.getElementById('character-handedness')?.value,
      years_pro: document.getElementById('character-years-pro')?.value,
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

    console.log('Sending character data to server:', characterData);

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
export async function updateCharacter(characterId) {
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
      team_id: formData.teamId,
      bio: formData.bio || null,
      avatar_url: formData.avatarUrl || null,
      header_image_url: formData.headerImageUrl || null // Include header image in update data
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
export async function loadCharacterData(characterId) {
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
export function selectCharacterType(type) {
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

export function selectPlayerPosition(position) {
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