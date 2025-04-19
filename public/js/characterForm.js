// This function handles the functionality for character form tabs
function initializeCharacterTabs() {
  const tabLinks = document.querySelectorAll('.character-tab-link');
  const tabContents = document.querySelectorAll('.character-tab-pane');
  
  // Initialize tabs - hide all tab content first
  tabContents.forEach(tab => {
    tab.style.display = 'none';
  });
  
  // Show the first tab by default
  if (tabLinks.length > 0 && tabContents.length > 0) {
    tabLinks[0].classList.add('active');
    const firstTabId = tabLinks[0].getAttribute('href');
    const firstTab = document.querySelector(firstTabId);
    if (firstTab) {
      firstTab.style.display = 'block';
    }
  }
  
  // Add click handlers to tab links
  tabLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Remove active class from all tabs and hide tab content
      tabLinks.forEach(l => l.classList.remove('active'));
      tabContents.forEach(t => {
        t.style.display = 'none';
      });
      
      // Add active class to clicked tab and show its content
      this.classList.add('active');
      const targetId = this.getAttribute('href');
      const targetTab = document.querySelector(targetId);
      if (targetTab) {
        targetTab.style.display = 'block';
      }
    });
  });
}

// Function to toggle team-related fields based on character role
function toggleTeamFields() {
  const role = document.getElementById('role').value;
  const teamFields = document.getElementById('teamFields');
  const playerFields = document.getElementById('playerFields');
  
  if (!teamFields || !playerFields) return;
  
  if (role === 'Player' || role === 'Staff') {
    teamFields.style.display = 'block';
    playerFields.style.display = role === 'Player' ? 'block' : 'none';
  } else {
    teamFields.style.display = 'none';
    playerFields.style.display = 'none';
  }
}

// Handle image preview
function initializeAvatarPreview() {
  const avatarUrlInput = document.getElementById('avatarUrl');
  if (!avatarUrlInput) return;
  
  // Show avatar preview if URL exists on page load
  const avatarUrl = avatarUrlInput.value;
  if (avatarUrl) {
    document.getElementById('avatar-preview').innerHTML = `
      <img src="${avatarUrl}" alt="Avatar Preview" style="width: 100%; height: 250px; object-fit: cover; border-radius: var(--radius-md);" onerror="imageLoadError(this)">
    `;
  }
  
  avatarUrlInput.addEventListener('input', function(e) {
    const url = e.target.value.trim();
    updateAvatarPreview(url);
  });
}

function updateAvatarPreview(url) {
  const previewContainer = document.getElementById('avatar-preview');
  if (!previewContainer) return;
  
  if (url) {
    previewContainer.innerHTML = `
      <img src="${url}" alt="Avatar Preview" style="width: 100%; height: 250px; object-fit: cover; border-radius: var(--radius-md);" onerror="imageLoadError(this)">
    `;
  } else {
    previewContainer.innerHTML = `<i class="ph-duotone ph-user-circle" style="font-size: 3rem; color: #999;"></i>`;
  }
}

// Handle image errors
function imageLoadError(img) {
  img.onerror = null;
  img.parentNode.innerHTML = `
    <div style="width: 100%; height: 250px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #999;">
      <i class="ph-duotone ph-exclamation-mark" style="font-size: 2rem; margin-bottom: 10px;"></i>
      <span>Invalid image URL</span>
    </div>
  `;
}

// Initialize all form functionality
function initializeCharacterForm() {
  // Initialize tabs
  initializeCharacterTabs();
  
  // Initialize avatar preview
  initializeAvatarPreview();
  
  // Set up role field change listener
  const roleSelect = document.getElementById('role');
  if (roleSelect) {
    roleSelect.addEventListener('change', toggleTeamFields);
    // Initial toggle is now called separately after form rendering
  }
}

// This function renders character form fields for the edit page
function renderCharacterFormFields(character = {}) {
  // Add debug output for teams data
  console.log("Rendering form with teams:", character.teams);
  
  // Make sure teams array exists
  if (!Array.isArray(character.teams)) {
    console.warn("Teams is not an array, setting default empty array");
    character.teams = [];
  }
  
  return `
    <div class="row">
      <!-- Basic Information -->
      <div class="col" style="flex: 0 0 70%;">
        <h3>Basic Information</h3>
        
        <div class="form-group">
          <label for="name">Character Name *</label>
          <input 
            type="text" 
            id="name" 
            name="name" 
            class="form-control" 
            value="${character.name || ''}"
            required
          />
        </div>
        
        <div class="row">
          <div class="col">
            <div class="form-group">
              <label for="nickname">Nickname</label>
              <input 
                type="text" 
                id="nickname" 
                name="nickname" 
                class="form-control" 
                value="${character.nickname || ''}"
              />
            </div>
          </div>
          
          <div class="col">
            <div class="form-group">
              <label for="age">Age</label>
              <input 
                type="text" 
                id="age" 
                name="age" 
                class="form-control" 
                value="${character.age || ''}"
              />
            </div>
          </div>
          
          <div class="col">
            <div class="form-group">
              <label for="gender">Gender</label>
              <input 
                type="text" 
                id="gender" 
                name="gender" 
                class="form-control" 
                value="${character.gender || ''}"
              />
            </div>
          </div>
        </div>

        <div class="form-group">
          <label for="role">Character Role</label>
          <select id="role" name="role" class="form-control">
            <option value="Civilian" ${character.role === 'Civilian' ? 'selected' : ''}>Civilian</option>
            <option value="Player" ${character.role === 'Player' ? 'selected' : ''}>Player</option>
            <option value="Staff" ${character.role === 'Staff' ? 'selected' : ''}>Staff</option>
          </select>
        </div>
        
        <div id="teamFields" style="display: ${(character.role === 'Player' || character.role === 'Staff') ? 'block' : 'none'};">
          <div class="form-group">
            <label for="teamId">Team</label>
            <select id="teamId" name="teamId" class="form-control">
              <option value="">-- Select a team --</option>
              ${character.teams && character.teams.map(team => 
                `<option value="${team.id}" ${character.teamId == team.id ? 'selected' : ''}>${team.name}</option>`
              ).join('')}
            </select>
          </div>
          
          <div id="playerFields" style="display: ${character.role === 'Player' ? 'block' : 'none'};">
            <div class="form-group">
              <label for="position">Position</label>
              <input 
                type="text" 
                id="position" 
                name="position" 
                class="form-control" 
                value="${character.position || ''}" 
                placeholder="e.g., Center, Left Wing, Goalie, etc."
              />
            </div>
            
            <div class="form-group">
              <label for="jerseyNumber">Jersey Number</label>
              <input 
                type="number" 
                id="jerseyNumber" 
                name="jerseyNumber" 
                class="form-control" 
                min="1"
                max="99"
                value="${character.jerseyNumber || ''}" 
                placeholder="1-99"
              />
            </div>
          </div>
        </div>
      </div>
      
      <!-- Avatar URL and preview -->
      <div class="col" style="flex: 0 0 30%;">
        <h3>Character Image</h3>
        
        <div class="form-group">
          <div class="mb-2" id="avatar-preview-container">
            <div style="width: 100%; height: 250px; background-color: #555; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center;" id="avatar-preview">
              <i class="ph-duotone ph-user-circle" style="font-size: 3rem; color: #999;"></i>
            </div>
          </div>
          
          <label for="avatarUrl">Avatar Image URL</label>
            <input 
              type="url" 
              id="avatarUrl" 
              name="avatarUrl" 
              class="form-control" 
              placeholder="https://example.com/image.jpg"
              value="${character.avatarUrl || character.url || ''}"
            />
          <small style="color: rgba(255, 255, 255, 0.5);">Enter a direct link to an image (JPG, PNG, or GIF)</small>
        </div>
        
        <div class="form-group">
          <label for="faceclaim">Faceclaim (Optional)</label>
          <input 
            type="text" 
            id="faceclaim" 
            name="faceclaim" 
            class="form-control" 
            value="${character.faceclaim || ''}"
            placeholder="Actor/Model name"
          />
        </div>
      </div>
    </div>
    
    <hr style="border-color: rgba(255, 255, 255, 0.1); margin: 30px 0;">
    
    <!-- Character Details Tabs -->
    <div class="character-tabs mb-4">
      <div class="character-tab-links">
        <a href="#tab-personality" class="character-tab-link active">Personality</a>
        <a href="#tab-appearance" class="character-tab-link">Appearance</a>
        <a href="#tab-background" class="character-tab-link">Background</a>
        <a href="#tab-details" class="character-tab-link">Additional Details</a>
      </div>
      
      <div class="character-tab-content">
        <!-- Personality Tab -->
        <div id="tab-personality" class="character-tab-pane active">
          <div class="form-group">
            <label for="personality">Personality</label>
            <textarea 
              id="personality" 
              name="personality" 
              class="form-control" 
              rows="8"
            >${character.personality || ''}</textarea>
          </div>
          
          <div class="row">
            <div class="col">
              <div class="form-group">
                <label for="likes">Likes</label>
                <textarea 
                  id="likes" 
                  name="likes" 
                  class="form-control" 
                  rows="4"
                >${character.likes || ''}</textarea>
              </div>
            </div>
            
            <div class="col">
              <div class="form-group">
                <label for="dislikes">Dislikes</label>
                <textarea 
                  id="dislikes" 
                  name="dislikes" 
                  class="form-control" 
                  rows="4"
                >${character.dislikes || ''}</textarea>
              </div>
            </div>
          </div>
          
          <div class="row">
            <div class="col">
              <div class="form-group">
                <label for="fears">Fears</label>
                <textarea 
                  id="fears" 
                  name="fears" 
                  class="form-control" 
                  rows="4"
                >${character.fears || ''}</textarea>
              </div>
            </div>
            
            <div class="col">
              <div class="form-group">
                <label for="goals">Goals</label>
                <textarea 
                  id="goals" 
                  name="goals" 
                  class="form-control" 
                  rows="4"
                >${character.goals || ''}</textarea>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Appearance Tab -->
        <div id="tab-appearance" class="character-tab-pane">
          <div class="form-group">
            <label for="appearance">Physical Appearance</label>
            <textarea 
              id="appearance" 
              name="appearance" 
              class="form-control" 
              rows="12"
            >${character.appearance || ''}</textarea>
          </div>
        </div>
        
        <!-- Background Tab -->
        <div id="tab-background" class="character-tab-pane">
          <div class="form-group">
            <label for="background">Character Background</label>
            <textarea 
              id="background" 
              name="background" 
              class="form-control" 
              rows="12"
            >${character.background || ''}</textarea>
          </div>
        </div>
        
        <!-- Additional Details Tab -->
        <div id="tab-details" class="character-tab-pane">
          <div class="form-group">
            <label for="skills">Skills & Abilities</label>
            <textarea 
              id="skills" 
              name="skills" 
              class="form-control" 
              rows="6"
            >${character.skills || ''}</textarea>
          </div>
          
          <div class="form-group">
            <label for="fullBio">Full Biography</label>
            <textarea 
              id="fullBio" 
              name="fullBio" 
              class="form-control" 
              rows="12"
            >${character.fullBio || ''}</textarea>
            <small style="color: rgba(255, 255, 255, 0.5);">Use this for any additional information about your character</small>
          </div>
        </div>
      </div>
    </div>
    
    <div class="form-group">
      <div class="d-flex align-center">
        <input type="checkbox" id="isPrivate" name="isPrivate" ${character.isPrivate ? 'checked' : ''}>
        <label for="isPrivate" style="margin-left: 10px; margin-bottom: 0;">Make this character private (only visible to you)</label>
      </div>
    </div>
  `;
}

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // For edit page that uses renderCharacterFormFields
  const formFieldsContainer = document.getElementById('form-fields');
  if (formFieldsContainer) {
    // The edit page will call initializeCharacterForm separately
    // Do nothing here, as edit.ejs handles initialization
  } else {
    // For create page
    initializeCharacterForm();
    toggleTeamFields(); // Make sure initial state is set
  }
});