// Cache DOM elements used repeatedly
export const DOM = {};

// Initialize cache of DOM elements
export function cacheDOMElements() {
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