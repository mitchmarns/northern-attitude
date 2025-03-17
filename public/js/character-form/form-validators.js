import { DOM } from './dom-manager.js';
// Validate form inputs
export function validateForm() {
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

export function selectCharacterRole(role) {
  // Find and select the role radio button
  const roleInput = document.querySelector(`input[name="character-role"][value="${role}"]`);
  if (roleInput) {
    roleInput.checked = true;
  }
}