import { DOM, cacheDOMElements} from './dom-manager.js';
import { setupCharacterTypeSelection, setupAvatarPreview } from './ui-controllers.js';
import { createCharacter, updateCharacter, loadCharacterData, selectCharacterType } from './form-handlers.js';
import { loadTeams } from './utils.js';

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