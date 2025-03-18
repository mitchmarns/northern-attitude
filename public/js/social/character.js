// public/js/social/character.js - Character selection and display functionality

import * as api from './api.js';
import * as feed from './feed.js';

// DOM elements
const elements = {
  characterSelector: document.getElementById('character-selector'),
  activeCharacterAvatar: document.getElementById('active-character-avatar'),
  activeCharacterName: document.getElementById('active-character-name'),
  activeCharacterPosition: document.getElementById('active-character-position'),
  activeCharacterTeam: document.getElementById('active-character-team'),
  composerAvatar: document.getElementById('composer-avatar'),
  composerCharacterName: document.getElementById('composer-character-name'),
  composerCharacterTeam: document.getElementById('composer-character-team'),
  modalCommentAvatar: document.getElementById('modal-comment-avatar')
};

// Initialize the character module
export function init(state) {
  // Set up event listeners
  setupEventListeners(state);
  
  // Load user's characters
  loadUserCharacters(state);
}

// Set up character-related event listeners
function setupEventListeners(state) {
  if (elements.characterSelector) {
    elements.characterSelector.addEventListener('change', () => {
      const characterId = parseInt(elements.characterSelector.value);
      
      if (characterId) {
        state.selectedCharacterId = characterId;
        
        // Find selected character from the dropdown options
        const selectedOption = elements.characterSelector.options[elements.characterSelector.selectedIndex];
        
        // Get the character data from the data attributes
        const character = {
          id: characterId,
          name: selectedOption.textContent,
          position: selectedOption.dataset.position || '',
          team_name: selectedOption.dataset.team || '',
          avatar_url: selectedOption.dataset.avatar || '/api/placeholder/80/80'
        };
        
        updateActiveCharacter(character, state);
        
        // Load feed for selected character
        feed.loadFeed('all', 1);
        
        // Load suggested follows for selected character
        api.loadSuggestedFollows(characterId);
      }
    });
  }
}

// Load user's characters
export async function loadUserCharacters(state) {
  try {
    const characters = await api.fetchCharacters();
    
    // Populate character selector
    populateCharacterSelector(characters, state);
  } catch (error) {
    console.error('Error loading characters:', error);
    // Show error message in character selector
    if (elements.characterSelector) {
      elements.characterSelector.innerHTML = '<option value="">Error loading characters</option>';
    }
  }
}

// Populate character selector dropdown
function populateCharacterSelector(characters, state) {
  if (!elements.characterSelector) return;
  
  // Clear existing options except the first one
  while (elements.characterSelector.options.length > 1) {
    elements.characterSelector.remove(1);
  }
  
  if (characters.length === 0) {
    // If no characters, show a message
    elements.characterSelector.innerHTML = '<option value="">No characters found</option>';
    return;
  }
  
  // Add character options
  characters.forEach(character => {
    const option = document.createElement('option');
    option.value = character.id;
    option.textContent = character.name;
    option.dataset.position = character.position || '';
    option.dataset.team = character.team_name || '';
    option.dataset.avatar = character.avatar_url || '/api/placeholder/80/80';
    
    // Set active character as selected
    if (character.is_active) {
      option.selected = true;
      state.selectedCharacterId = character.id;
      updateActiveCharacter(character, state);
    }
    
    elements.characterSelector.appendChild(option);
  });
  
  // If no character was active, select the first one
  if (!state.selectedCharacterId && characters.length > 0) {
    elements.characterSelector.value = characters[0].id;
    state.selectedCharacterId = characters[0].id;
    updateActiveCharacter(characters[0], state);
  }
  
  // Try to load feed for the selected character
  if (state.selectedCharacterId) {
    feed.loadFeed(state.currentFeed);
  }
}

// Update active character display
export function updateActiveCharacter(character, state) {
  if (!character) return;
  
  // Update active character card
  if (elements.activeCharacterAvatar) {
    elements.activeCharacterAvatar.src = character.avatar_url || '/api/placeholder/80/80';
    elements.activeCharacterAvatar.alt = character.name;
  }
  
  if (elements.activeCharacterName) {
    elements.activeCharacterName.textContent = character.name;
  }
  
  if (elements.activeCharacterPosition) {
    elements.activeCharacterPosition.textContent = character.position;
  }
  
  if (elements.activeCharacterTeam) {
    elements.activeCharacterTeam.textContent = character.team_name || 'No Team';
  }
  
  // Update composer
  if (elements.composerAvatar) {
    elements.composerAvatar.src = character.avatar_url || '/api/placeholder/40/40';
    elements.composerAvatar.alt = character.name;
  }
  
  if (elements.composerCharacterName) {
    elements.composerCharacterName.textContent = character.name;
  }
  
  if (elements.composerCharacterTeam) {
    elements.composerCharacterTeam.textContent = character.team_name || 'No Team';
  }
  
  // Update modal comment avatar
  if (elements.modalCommentAvatar) {
    elements.modalCommentAvatar.src = character.avatar_url || '/api/placeholder/40/40';
    elements.modalCommentAvatar.alt = character.name;
  }
  
  // Update post submit button state based on content
  const postSubmitBtn = document.getElementById('post-submit-btn');
  if (postSubmitBtn) {
    postSubmitBtn.disabled = !state.postData.content.trim() && !state.postData.imageUrl;
  }
}

// Get selected character data
export function getSelectedCharacter() {
  if (!elements.characterSelector || !elements.characterSelector.value) {
    return null;
  }
  
  const selectedOption = elements.characterSelector.options[elements.characterSelector.selectedIndex];
  
  return {
    id: parseInt(elements.characterSelector.value),
    name: selectedOption.textContent,
    position: selectedOption.dataset.position || '',
    team_name: selectedOption.dataset.team || '',
    avatar_url: selectedOption.dataset.avatar || '/api/placeholder/80/80'
  };
}