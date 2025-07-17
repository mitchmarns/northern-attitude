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
  
  // Initialize custom media previews if available
  initializeMediaPreviews();
}

// Initialize media previews for banner, sidebar, and Spotify
function initializeMediaPreviews() {
  // Banner URL preview
  const bannerUrlInput = document.getElementById('bannerUrl');
  if (bannerUrlInput) {
    const updateBannerPreview = () => {
      const url = bannerUrlInput.value.trim();
      const previewContainer = document.getElementById('banner-preview');
      if (previewContainer) {
        if (url) {
          previewContainer.innerHTML = `
            <img src="${url}" alt="Banner Preview" style="width: 100%; height: 100px; object-fit: cover; border-radius: var(--radius-md);" onerror="imageLoadError(this)">
          `;
        } else {
          previewContainer.innerHTML = `<div class="empty-preview">No banner image</div>`;
        }
      }
    };
    
    bannerUrlInput.addEventListener('input', updateBannerPreview);
    updateBannerPreview(); // Initial preview
  }
  
  // Sidebar URL preview
  const sidebarUrlInput = document.getElementById('sidebarUrl');
  if (sidebarUrlInput) {
    const updateSidebarPreview = () => {
      const url = sidebarUrlInput.value.trim();
      const previewContainer = document.getElementById('sidebar-preview');
      if (previewContainer) {
        if (url) {
          previewContainer.innerHTML = `
            <img src="${url}" alt="Sidebar Preview" style="width: 100%; height: 150px; object-fit: cover; border-radius: var(--radius-md);" onerror="imageLoadError(this)">
          `;
        } else {
          previewContainer.innerHTML = `<div class="empty-preview">No sidebar image</div>`;
        }
      }
    };
    
    sidebarUrlInput.addEventListener('input', updateSidebarPreview);
    updateSidebarPreview(); // Initial preview
  }
  
  // Spotify embed preview
  const spotifyEmbedInput = document.getElementById('spotifyEmbed');
  if (spotifyEmbedInput) {
    const updateSpotifyPreview = () => {
      const embedCode = spotifyEmbedInput.value.trim();
      const previewContainer = document.getElementById('spotify-preview');
      if (previewContainer) {
        if (embedCode && embedCode.includes('<iframe') && embedCode.includes('spotify.com/embed')) {
          // Basic validation that this looks like a Spotify embed
          previewContainer.innerHTML = '<div class="empty-preview">Spotify embed code entered</div>';
        } else {
          previewContainer.innerHTML = '<div class="empty-preview">No Spotify embed code</div>';
        }
      }
    };
    
    spotifyEmbedInput.addEventListener('input', updateSpotifyPreview);
    updateSpotifyPreview(); // Initial preview
  }
}

// This function renders character form fields for the edit page
function renderCharacterFormFields(character = {}) {
  // Add debug output for teams data
  console.log("Rendering form with teams:", character.teams);
  console.log("Character data:", character); // Add debugging to see full character data
  
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
        
        <div class="row">
          <div class="col">
            <div class="form-group">
              <label for="birthday">Birthday</label>
              <input 
                type="date" 
                id="birthday" 
                name="birthday" 
                class="form-control" 
                value="${character.birthday || ''}"
              />
            </div>
          </div>
          <div class="col">
            <div class="form-group">
              <label for="zodiac">Zodiac</label>
              <input 
                type="text" 
                id="zodiac" 
                name="zodiac" 
                class="form-control" 
                value="${character.zodiac || ''}"
              />
            </div>
          </div>
        </div>
        
        <div class="row">
          <div class="col">
            <div class="form-group">
              <label for="hometown">Hometown</label>
              <input 
                type="text" 
                id="hometown" 
                name="hometown" 
                class="form-control" 
                value="${character.hometown || ''}"
              />
            </div>
          </div>
          <div class="col">
            <div class="form-group">
              <label for="education">Education</label>
              <input 
                type="text" 
                id="education" 
                name="education" 
                class="form-control" 
                value="${character.education || ''}"
              />
            </div>
          </div>
          <div class="col">
            <div class="form-group">
              <label for="occupation">Occupation</label>
              <input 
                type="text" 
                id="occupation" 
                name="occupation" 
                class="form-control" 
                value="${character.occupation || ''}"
              />
            </div>
          </div>
        </div>
        
        <div class="row">
          <div class="col">
            <div class="form-group">
              <label for="sexuality">Sexuality</label>
              <input 
                type="text" 
                id="sexuality" 
                name="sexuality" 
                class="form-control" 
                value="${character.sexuality || ''}"
              />
            </div>
          </div>
          <div class="col">
            <div class="form-group">
              <label for="pronouns">Pronouns</label>
              <input 
                type="text" 
                id="pronouns" 
                name="pronouns" 
                class="form-control" 
                value="${character.pronouns || ''}"
              />
            </div>
          </div>
          <div class="col">
            <div class="form-group">
              <label for="languages">Languages</label>
              <input 
                type="text" 
                id="languages" 
                name="languages" 
                class="form-control" 
                value="${character.languages || ''}"
              />
            </div>
          </div>
          <div class="col">
            <div class="form-group">
              <label for="religion">Religion</label>
              <input 
                type="text" 
                id="religion" 
                name="religion" 
                class="form-control" 
                value="${character.religion || ''}"
              />
            </div>
          </div>
        </div>

        <div class="form-group">
          <label for="quote">Character Quote</label>
          <textarea 
            id="quote" 
            name="quote" 
            class="form-control" 
            rows="2"
            placeholder="A memorable quote from your character"
          >${character.quote || ''}</textarea>
        </div>
      </div>
      
      <!-- Avatar URL and preview -->
      <div class="col" style="flex: 0 0 30%;">
        <h3>Character Image</h3>
        
        <div class="form-group">
          <div class="mb-2" id="avatar-preview-container">
            <div style="width: 100%; height: 250px; background-color: #555; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center;" id="avatar-preview">
              ${character.url || character.avatarUrl ? 
                `<img src="${character.url || character.avatarUrl}" alt="Avatar Preview" style="width: 100%; height: 250px; object-fit: cover; border-radius: var(--radius-md);" onerror="imageLoadError(this)">` :
                `<i class="ph-duotone ph-user-circle" style="font-size: 3rem; color: #999;"></i>`
              }
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
    
    <!-- Custom Media Section -->
    <h3>Profile Customization</h3>
    <div class="row">
      <!-- Banner Image -->
      <div class="col">
        <div class="form-group">
          <label for="bannerUrl">Banner Image URL</label>
          <div id="banner-preview" class="media-preview mb-2" style="height: 100px; background-color: #555; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; overflow: hidden;">
            ${character.bannerUrl ? 
              `<img src="${character.bannerUrl}" alt="Banner Preview" style="width: 100%; height: 100%; object-fit: cover;">` : 
              '<div class="empty-preview">No banner image</div>'
            }
          </div>
          <input 
            type="url" 
            id="bannerUrl" 
            name="bannerUrl" 
            class="form-control" 
            placeholder="https://example.com/banner.jpg"
            value="${character.bannerUrl || ''}"
          />
          <small style="color: rgba(255, 255, 255, 0.5);">Recommended size: 1200x300px</small>
        </div>
      </div>
      
      <!-- Sidebar Image -->
      <div class="col">
        <div class="form-group">
          <label for="sidebarUrl">Sidebar Image URL</label>
          <div id="sidebar-preview" class="media-preview mb-2" style="height: 150px; background-color: #555; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; overflow: hidden;">
            ${character.sidebarUrl ? 
              `<img src="${character.sidebarUrl}" alt="Sidebar Preview" style="width: 100%; height: 100%; object-fit: cover;">` : 
              '<div class="empty-preview">No sidebar image</div>'
            }
          </div>
          <input 
            type="url" 
            id="sidebarUrl" 
            name="sidebarUrl" 
            class="form-control" 
            placeholder="https://example.com/sidebar.jpg"
            value="${character.sidebarUrl || ''}"
          />
          <small style="color: rgba(255, 255, 255, 0.5);">Recommended size: 250x400px</small>
        </div>
      </div>
      
      <!-- Spotify Embed -->
      <div class="col">
        <div class="form-group">
          <label for="spotifyEmbed">Spotify Embed Code</label>
          <div id="spotify-preview" class="media-preview mb-2" style="height: 80px; background-color: #555; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center;">
            ${character.spotifyEmbed && character.spotifyEmbed.includes('<iframe') ? 
              '<div class="empty-preview">Spotify embed code entered</div>' : 
              '<div class="empty-preview">No Spotify embed code</div>'
            }
          </div>
          <textarea 
            id="spotifyEmbed" 
            name="spotifyEmbed" 
            class="form-control" 
            placeholder="<iframe style=&quot;border-radius:12px&quot; src=&quot;https://open.spotify.com/embed/playlist/...&quot; width=&quot;100%&quot;..."
            rows="4"
          >${character.spotifyEmbed || ''}</textarea>
          <small style="color: rgba(255, 255, 255, 0.5);">
            Paste the full iframe embed code from Spotify<br>
            (Share > Embed > Copy Code)
          </small>
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
          
          <div class="row">
            <div class="col">
              <div class="form-group">
                <label for="strengths">Strengths</label>
                <textarea 
                  id="strengths" 
                  name="strengths" 
                  class="form-control" 
                  rows="4"
                >${character.strengths || ''}</textarea>
              </div>
            </div>
            <div class="col">
              <div class="form-group">
                <label for="weaknesses">Weaknesses</label>
                <textarea 
                  id="weaknesses" 
                  name="weaknesses" 
                  class="form-control" 
                  rows="4"
                >${character.weaknesses || ''}</textarea>
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
          
          <div class="form-group">
            <label for="favFood">Favorite Food</label>
            <input 
              type="text" 
              id="favFood" 
              name="favFood" 
              class="form-control" 
              value="${character.favFood || ''}"
            />
          </div>
          <div class="form-group">
            <label for="favMusic">Favorite Music</label>
            <input 
              type="text" 
              id="favMusic" 
              name="favMusic" 
              class="form-control" 
              value="${character.favMusic || ''}"
            />
          </div>
          <div class="form-group">
            <label for="favMovies">Favorite Movies</label>
            <input 
              type="text" 
              id="favMovies" 
              name="favMovies" 
              class="form-control" 
              value="${character.favMovies || ''}"
            />
          </div>
          <div class="form-group">
            <label for="favColor">Favorite Color</label>
            <input 
              type="text" 
              id="favColor" 
              name="favColor" 
              class="form-control" 
              value="${character.favColor || ''}"
            />
          </div>
          <div class="form-group">
            <label for="favSports">Favorite Sports</label>
            <input 
              type="text" 
              id="favSports" 
              name="favSports" 
              class="form-control" 
              value="${character.favSports || ''}"
            />
          </div>
          <div class="form-group">
            <label for="inspiration">Inspiration</label>
            <textarea 
              id="inspiration" 
              name="inspiration" 
              class="form-control" 
              rows="4"
            >${character.inspiration || ''}</textarea>
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

// Add styles for the media previews
document.addEventListener('DOMContentLoaded', () => {
  const style = document.createElement('style');
  style.textContent = `
    .empty-preview {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      color: #999;
      font-style: italic;
    }
    
    .media-preview {
      transition: all 0.3s ease;
    }
    
    .media-preview:hover {
      opacity: 0.8;
    }
  `;
  document.head.appendChild(style);
});