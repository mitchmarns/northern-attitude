import { DOM } from './dom-manager.js';
import { selectCharacterType, selectPlayerPosition } from './form-handlers.js';
import { CHARACTER_TYPES, POSITION_STATS_TEMPLATES } from './config.js'

// Setup character type selection functionality
export function setupCharacterTypeSelection() {
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
export function setupAvatarPreview() {
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
export function previewImage(imageUrl, imgElement, placeholderUrl) {
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
export function updateFormSections(type) {
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
export function generateRoleOptions(roles) {
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
export function updatePositionStats(position) {
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

export function populateStatsInputs(stats) {
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