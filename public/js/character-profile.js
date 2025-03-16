// character-profile.js - Fixed version to address profile loading error

document.addEventListener('DOMContentLoaded', function() {
  // Check if user is authenticated
  window.authUtils.checkAuth(true);
  
  // Set up logout functionality
  window.authUtils.setupLogoutButton();
  
  // Get character ID from URL query parameters
  const urlParams = new URLSearchParams(window.location.search);
  const characterId = urlParams.get('id');
  
  if (!characterId) {
    // No character ID provided, show error and redirect after delay
    const errorMessage = document.getElementById('character-profile-error');
    if (errorMessage) {
      errorMessage.textContent = 'No character ID provided. Redirecting to character list...';
      errorMessage.style.display = 'block';
      
      setTimeout(() => {
        window.location.href = 'my-characters.html';
      }, 3000);
    }
    return;
  }
  
  // Load character profile
  loadCharacterProfile(characterId);
  
  // Set up modal close functionality
  const cancelDeleteBtn = document.getElementById('cancel-delete');
  if (cancelDeleteBtn) {
    cancelDeleteBtn.addEventListener('click', hideDeleteModal);
  }
  
  // Clicking outside the modal also closes it
  const deleteModal = document.getElementById('delete-modal');
  if (deleteModal) {
    deleteModal.addEventListener('click', function(e) {
      if (e.target === this) {
        hideDeleteModal();
      }
    });
  }
});

// Function to load character profile data
async function loadCharacterProfile(characterId) {
  try {
    // Fetch character data
    const response = await fetch(`/api/characters/${characterId}`, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch character data');
    }
    
    const character = await response.json();
    
    // Cache elements we'll use repeatedly
    const elements = {
      title: document.getElementById('page-title'),
      bannerName: document.getElementById('banner-character-name'),
      jerseyNumber: document.getElementById('jersey-number'),
      avatar: document.getElementById('character-avatar'),
      sidebarName: document.getElementById('sidebar-character-name'),
      position: document.getElementById('character-position'),
      team: document.getElementById('character-team'),
      status: document.getElementById('character-status'),
      mainStats: document.getElementById('main-stats'),
      positionStatsTitle: document.getElementById('position-stats-title'),
      positionStats: document.getElementById('position-stats'),
      aboutHeading: document.getElementById('about-heading'),
      characterBio: document.getElementById('character-bio'),
      careerHighlights: document.getElementById('career-highlights'),
      positionStatsBlock: document.getElementById('position-stats-block'),
      deleteBtn: document.getElementById('delete-character-btn'),
      confirmDelete: document.getElementById('confirm-delete'),
      setActiveBtn: document.getElementById('set-active-btn'),
      editCharacterLink: document.getElementById('edit-character-link'),
      messageCharacterBtn: document.getElementById('message-character-btn')
    };

    // Ensure all required elements exist
    const requiredElements = ['title', 'bannerName', 'avatar', 'sidebarName', 'position', 'team', 'status'];
    const missingElements = requiredElements.filter(key => !elements[key]);
    
    if (missingElements.length > 0) {
      console.error('Missing required DOM elements:', missingElements);
      throw new Error('Missing required DOM elements');
    }
    
    // Parse stats from JSON once - with error handling
    let stats = {};
    try {
      if (character.stats_json) {
        stats = JSON.parse(character.stats_json);
      }
    } catch (e) {
      console.error('Error parsing stats JSON:', e);
      stats = {}; // Fallback to empty object
    }

    // Update page title and header
    document.title = `${character.name} | Northern Attitude`;
    elements.title.textContent = character.name;
    elements.bannerName.textContent = character.name;
    
    // Add jersey number if available
    const jerseyNumber = stats.jersey_number || 
                         Math.floor(Math.random() * 98) + 1; // Random number between 1-99
    elements.jerseyNumber.textContent = jerseyNumber;
    
    // Update header image
    updateHeaderImage(character);
    
    // Update all page data concurrently for better performance
    const updatePromises = [
      updateProfileSidebar(elements, character, stats),
      updateProfileContent(elements, character, stats),
      updateStatsTab(character, stats),
      updateBioTab(character),
      loadRecentGames(characterId),
      updateBasicsTab(character, stats)
    ];
    
    // Wait for all updates to complete
    await Promise.all(updatePromises);
    
    // Set up button functionality
    setupButtons(elements, character);
    
    // Setup contacts tab only after we have the character data
    setupContactsTab(character);
    
  } catch (error) {
    console.error('Error loading character profile:', error);
    
    // Show error message
    const errorMessage = document.getElementById('character-profile-error');
    if (errorMessage) {
      errorMessage.textContent = 'Failed to load character profile. Please try again later.';
      errorMessage.style.display = 'block';
    }
  }
}

// Update header image function
function updateHeaderImage(character) {
  const nameBanner = document.getElementById('name-banner');
  
  if (nameBanner && character.header_image_url) {
    // Set the header image as background
    nameBanner.style.backgroundImage = `url('${character.header_image_url}')`;
    nameBanner.style.backgroundSize = 'cover';
    nameBanner.style.backgroundPosition = 'center';
  } else if (nameBanner) {
    // If no header image provided, use a gradient background
    nameBanner.style.backgroundImage = 'none';
    nameBanner.style.backgroundColor = 'var(--dark-bg)';
  }
}

// Function to update profile sidebar
function updateProfileSidebar(elements, character, stats) {
  // Update avatar with error handling
  if (elements.avatar) {
    elements.avatar.src = character.avatar_url || '/api/placeholder/150/150';
    elements.avatar.alt = character.name;
    
    // Add error handler for avatar
    elements.avatar.onerror = () => {
      elements.avatar.src = '/api/placeholder/150/150';
    };
  }
  
  // Update character info
  elements.sidebarName.textContent = character.name;
  elements.position.textContent = getFullPosition(character.position);
  elements.team.textContent = character.team_name || 'No Team';
  
  // Update status with class change
  elements.status.textContent = character.is_active ? 'Active Character' : 'Inactive';
  elements.status.className = character.is_active ? 'character-status active' : 'character-status inactive';
  
  // Update main stats
  updateCharacterStats(elements, character, stats);
}

// Function to update profile content
function updateProfileContent(elements, character, stats) {
  // Update about heading
  if (elements.aboutHeading) {
    elements.aboutHeading.textContent = `About ${character.name}`;
  }
  
  // Update bio with proper error handling
  if (elements.characterBio) {
    if (character.bio) {
      elements.characterBio.innerHTML = `<p>${character.bio.replace(/\n/g, '</p><p>')}</p>`;
    } else {
      elements.characterBio.innerHTML = `<p><em>No biography provided for ${character.name} yet.</em></p>`;
    }
  }
  
  // Update career highlights
  updateCareerHighlights(elements, character, stats);
}

function updateCareerHighlights(elements, character, stats) {
  if (!elements.careerHighlights) return;
  
  if (character.character_type === 'player') {
    elements.careerHighlights.innerHTML = `
      <div class="highlight-stat">
        <div class="highlight-value">${stats.goals || 0}</div>
        <div class="highlight-label">Goals</div>
      </div>
      <div class="highlight-stat">
        <div class="highlight-value">${stats.assists || 0}</div>
        <div class="highlight-label">Assists</div>
      </div>
      <div class="highlight-stat">
        <div class="highlight-value">${(stats.goals || 0) + (stats.assists || 0)}</div>
        <div class="highlight-label">Points</div>
      </div>
      <div class="highlight-stat">
        <div class="highlight-value">${stats.games || 0}</div>
        <div class="highlight-label">Games</div>
      </div>
    `;
  } else {
    // For non-player types
    elements.careerHighlights.innerHTML = `
      <div class="highlight-stat">
        <div class="highlight-value">${character.role || 'N/A'}</div>
        <div class="highlight-label">Role</div>
      </div>
    `;
  }
}

function updateCharacterStats(elements, character, stats) {
  // Skip if main stats element doesn't exist
  if (!elements.mainStats) return;
  
  // Clear existing stats
  elements.mainStats.innerHTML = '';
  
  // Define stats structure based on character type
  if (character.character_type === 'player') {
    // Add common stats for players
    const commonStats = [
      { label: 'Goals', value: stats.goals || 0 },
      { label: 'Assists', value: stats.assists || 0 },
      { label: 'Games', value: stats.games || 0 },
      { label: 'Points', value: (stats.goals || 0) + (stats.assists || 0) },
      { label: '+/-', value: stats.plus_minus || 0 },
      { label: 'PIM', value: stats.penalties || 0 }
    ];
    
    // Build stats HTML using document fragment for better performance
    const fragment = document.createDocumentFragment();
    
    commonStats.forEach(stat => {
      const statItem = document.createElement('div');
      statItem.className = 'stat-item';
      statItem.innerHTML = `
        <span class="stat-label">${stat.label}</span>
        <span class="stat-value">${stat.value}</span>
      `;
      fragment.appendChild(statItem);
    });
    
    elements.mainStats.appendChild(fragment);
    
    // Add position-specific stats
    updatePositionSpecificStats(elements, character.position, stats);
  } else if (elements.positionStatsBlock) {
    // For non-player types, show role instead of stats
    elements.positionStatsBlock.style.display = 'none';
    
    const roleItem = document.createElement('div');
    roleItem.className = 'stat-item';
    roleItem.style.gridColumn = '1 / span 2';
    roleItem.innerHTML = `
      <span class="stat-label">Role</span>
      <span class="stat-value">${character.role || 'Unspecified'}</span>
    `;
    elements.mainStats.appendChild(roleItem);
  }
}

// Function to update stats tab
function updateStatsTab(character, stats) {
  // For player type only
  if (character.character_type === 'player') {
    const headerRow = document.getElementById('stats-header-row');
    const statsBody = document.getElementById('stats-body');
    
    if (!headerRow || !statsBody) return;
    
    // Create headers based on position
    let headers = ['Season', 'Team', 'GP', 'G', 'A', 'P', '+/-', 'PIM'];
    
    // Add position-specific headers
    switch(character.position) {
      case 'C':
        headers.push('FO%');
        headers.push('S%');
        break;
      case 'LW':
      case 'RW':
        headers.push('S%');
        break;
      case 'D':
        headers.push('Blocks');
        headers.push('Hits');
        break;
      case 'G':
        headers = ['Season', 'Team', 'GP', 'W', 'L', 'GAA', 'SV%', 'SO'];
        break;
    }
    
    // Create header row
    headerRow.innerHTML = headers.map(header => `<th>${header}</th>`).join('');
    
    // Mock data for previous seasons - would normally come from the API
    const currentSeason = '2024-2025';
    const previousSeasons = [
      {
        season: '2023-2024',
        games: Math.floor(stats.games * 1.5) || 0,
        goals: Math.floor(stats.goals * 1.2) || 0,
        assists: Math.floor(stats.assists * 1.3) || 0,
        plus_minus: Math.floor(stats.plus_minus * 0.8) || 0,
        penalties: Math.floor(stats.penalties * 1.1) || 0
      },
      {
        season: '2022-2023',
        games: Math.floor(stats.games * 0.8) || 0,
        goals: Math.floor(stats.goals * 0.7) || 0,
        assists: Math.floor(stats.assists * 0.9) || 0,
        plus_minus: Math.floor(stats.plus_minus * 0.5) || 0,
        penalties: Math.floor(stats.penalties * 1.4) || 0
      }
    ];
    
    // Create rows
    const seasons = [
      { season: currentSeason, stats: stats },
      ...previousSeasons
    ];
    
    // Create rows based on position
    statsBody.innerHTML = '';
    
    seasons.forEach(season => {
      const row = document.createElement('tr');
      let cells = [];
      
      // Common stats
      const currentStats = season.stats;
      const points = (currentStats.goals || 0) + (currentStats.assists || 0);
      
      if (character.position === 'G') {
        // Goalie stats
        cells = [
          season.season,
          character.team_name || 'No Team',
          currentStats.games || 0,
          currentStats.wins || 0,
          currentStats.losses || 0,
          currentStats.gaa || '0.00',
          currentStats.save_pct || '.000',
          currentStats.shutouts || 0
        ];
      } else {
        // Skater stats
        cells = [
          season.season,
          character.team_name || 'No Team',
          currentStats.games || 0,
          currentStats.goals || 0,
          currentStats.assists || 0,
          points,
          currentStats.plus_minus || 0,
          currentStats.penalties || 0
        ];
        
        // Add position-specific stats
        switch(character.position) {
          case 'C':
            cells.push(currentStats.faceoff_pct || '0.0');
            cells.push(currentStats.shooting_pct || '0.0');
            break;
          case 'LW':
          case 'RW':
            cells.push(currentStats.shooting_pct || '0.0');
            break;
          case 'D':
            cells.push(currentStats.blocks || 0);
            cells.push(currentStats.hits || 0);
            break;
        }
      }
      
      // Create row cells
      row.innerHTML = cells.map(cell => `<td>${cell}</td>`).join('');
      statsBody.appendChild(row);
    });
  } else {
    // For non-player types
    const statsTab = document.getElementById('stats');
    if (statsTab) {
      statsTab.innerHTML = `
        <h2>Role Information</h2>
        <div class="info-section">
          <p>Detailed statistics are not available for ${character.character_type} characters.</p>
          <p>Role: ${character.role || 'Unspecified'}</p>
        </div>
      `;
    }
  }
}

// Get position title efficiently
function getPositionTitle(position) {
  const titles = {
    'C': 'Center Stats',
    'LW': 'Wing Stats',
    'RW': 'Wing Stats',
    'D': 'Defense Stats',
    'G': 'Goalie Stats'
  };
  
  return titles[position] || 'Position Stats';
}

function updatePositionSpecificStats(elements, position, stats) {
  if (!elements.positionStatsTitle || !elements.positionStats) return;
  
  elements.positionStatsTitle.textContent = getPositionTitle(position);
  
  // Create position stats content
  let statsHTML = '';
  
  switch(position) {
    case 'C':
      statsHTML = `
        <div class="stat-item">
          <span class="stat-label">Faceoff %</span>
          <span class="stat-value">${stats.faceoff_pct || '0.0'}%</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Shooting %</span>
          <span class="stat-value">${stats.shooting_pct || '0.0'}%</span>
        </div>
      `;
      break;
    case 'LW':
    case 'RW':
      statsHTML = `
        <div class="stat-item">
          <span class="stat-label">Shooting %</span>
          <span class="stat-value">${stats.shooting_pct || '0.0'}%</span>
        </div>
      `;
      break;
    case 'D':
      statsHTML = `
        <div class="stat-item">
          <span class="stat-label">Blocks</span>
          <span class="stat-value">${stats.blocks || 0}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Hits</span>
          <span class="stat-value">${stats.hits || 0}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">TOI/Game</span>
          <span class="stat-value">${formatIceTime(stats.ice_time)}</span>
        </div>
      `;
      break;
    case 'G':
      statsHTML = `
        <div class="stat-item">
          <span class="stat-label">Wins</span>
          <span class="stat-value">${stats.wins || 0}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Losses</span>
          <span class="stat-value">${stats.losses || 0}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">GAA</span>
          <span class="stat-value">${stats.gaa || '0.00'}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">SV%</span>
          <span class="stat-value">${stats.save_pct || '.000'}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Shutouts</span>
          <span class="stat-value">${stats.shutouts || 0}</span>
        </div>
      `;
      break;
  }
  
  elements.positionStats.innerHTML = statsHTML;
}

// Function to update bio tab
function updateBioTab(character) {
  const bioElement = document.getElementById('full-bio');
  if (!bioElement) return;
  
  if (character.bio) {
    // Create a more detailed bio with sections
    const bioHTML = `
      <h1>${character.name}</h1>
      
      <h2>${character.character_type === 'player' ? getFullPosition(character.position) : character.role}</h2>
      
      <div class="character-bio">
        <p>${character.bio.replace(/\n\n/g, '</p><p>')}</p>
      </div>
      
      <div class="fancy-divider"></div>
      
      <h2>${character.team_name ? `Member of ${character.team_name}` : 'Currently Unaffiliated'}</h2>
      
      <p class="quote">
        Character quotes would appear here if provided in the data.
      </p>
    `;
    
    bioElement.innerHTML = bioHTML;
  } else {
    bioElement.innerHTML = `
      <h1>${character.name}</h1>
      <p>No detailed biography has been provided for this character yet.</p>
      <p>You can add a biography by editing the character profile.</p>
      <a href="character-form.html?id=${character.id}" class="btn btn-primary">Edit Character</a>
    `;
  }
}

// Add this new function to update the basics tab
function updateBasicsTab(character, stats) {
  // Skip if any critical fields don't exist
  const basicElements = [
    'basics-full-name',
    'basics-position',
    'basics-team'
  ];
  
  // Check if the basics tab is available
  const missing = basicElements.some(id => !document.getElementById(id));
  if (missing) return;
  
  // Extract the basic info we have
  const jerseyNumber = stats.jersey_number || Math.floor(Math.random() * 98) + 1;
  const position = getFullPosition(character.position);
  const teamName = character.team_name || 'No Team';
  
  // Generate random but consistent age
  const characterId = parseInt(character.id);
  const ageBase = characterId % 20; // Use character ID to create a consistent "random" age
  const age = 18 + ageBase; // Hockey players are usually at least 18
  
  // Calculate birth date based on age
  const today = new Date();
  const birthYear = today.getFullYear() - age;
  const birthDate = new Date(birthYear, Math.floor(characterId % 12), (characterId % 28) + 1);
  const formattedBirthDate = birthDate.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  // Generate height and weight based on position
  let height, weight;
  switch(character.position) {
    case 'G':
      height = `6'${2 + (characterId % 3)}"`;
      weight = 190 + (characterId % 15);
      break;
    case 'D':
      height = `6'${1 + (characterId % 4)}"`;
      weight = 200 + (characterId % 20);
      break;
    default: // Forward positions
      height = `5'${11 + (characterId % 4)}"`;
      weight = 180 + (characterId % 25);
      break;
  }
  
  // Generate a list of nationalities for hockey players
  const nationalities = [
    'Canadian', 'American', 'Swedish', 'Finnish', 'Russian', 
    'Czech', 'Slovak', 'German', 'Swiss', 'Danish'
  ];
  const nationality = nationalities[characterId % nationalities.length];
  
  // List of sample hometowns
  const hometowns = [
    'Toronto, ON', 'Montreal, QC', 'Vancouver, BC', 'Boston, MA', 
    'Minneapolis, MN', 'Detroit, MI', 'Stockholm, Sweden', 'Moscow, Russia',
    'Helsinki, Finland', 'Prague, Czech Republic', 'Bratislava, Slovakia'
  ];
  const hometown = hometowns[characterId % hometowns.length];
  
  // Handedness (shoots/catches)
  const handedness = (characterId % 3 === 0) ? 'Left' : 'Right';
  
  // Years as a professional
  const yearsPro = Math.max(1, Math.floor(age / 5));
  
  // Update the basics fields
  updateBasicsField('full-name', character.name);
  updateBasicsField('age', age);
  updateBasicsField('dob', formattedBirthDate);
  updateBasicsField('nationality', nationality);
  updateBasicsField('hometown', hometown);
  
  updateBasicsField('height', height);
  updateBasicsField('weight', `${weight} lbs`);
  updateBasicsField('handedness', handedness);
  
  updateBasicsField('jersey', jerseyNumber);
  updateBasicsField('position', position);
  updateBasicsField('team', teamName);
  updateBasicsField('years-pro', yearsPro);
  
  // Handle non-player character types
  const roleSection = document.getElementById('basics-role-section');
  if (roleSection) {
    if (character.character_type !== 'player') {
      roleSection.style.display = 'block';
      updateBasicsField('role', character.role || 'Unspecified');
      updateBasicsField('organization', teamName);
      updateBasicsField('experience', `${yearsPro} years`);
    } else {
      roleSection.style.display = 'none';
    }
  }
}

// Helper function to update a basics field value
function updateBasicsField(fieldId, value) {
  const element = document.getElementById(`basics-${fieldId}`);
  if (element) {
    if (value) {
      element.textContent = value;
      element.classList.remove('empty');
    } else {
      element.textContent = 'Not specified';
      element.classList.add('empty');
    }
  }
}

// Function to load recent games for a character
async function loadRecentGames(characterId) {
  const gamesContainer = document.getElementById('recent-games');
  if (!gamesContainer) return;

  try {
    const response = await fetch(`/api/characters/${characterId}/games?limit=5`, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch recent games');
    }
    
    const games = await response.json();
    
    // Clear container
    gamesContainer.innerHTML = '';
    
    if (games.length === 0) {
      gamesContainer.innerHTML = '<p><em>No recent games found.</em></p>';
      return;
    }
    
    // Add each game to the list
    games.forEach(game => {
      const gameItem = document.createElement('div');
      gameItem.className = 'game-item';
      
      // Format game date
      const gameDate = new Date(game.date);
      const formattedDate = gameDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
      
      // Game result (win/loss/tie)
      let result = '';
      if (game.status === 'completed') {
        if (game.character_team_id === game.home_team_id) {
          if (game.home_score > game.away_score) result = 'W';
          else if (game.home_score < game.away_score) result = 'L';
          else result = 'T';
        } else {
          if (game.away_score > game.home_score) result = 'W';
          else if (game.away_score < game.home_score) result = 'L';
          else result = 'T';
        }
      }
      
      gameItem.innerHTML = `
        <div>
          <div class="game-teams">${game.home_team_name} vs ${game.away_team_name} ${result ? `(${result})` : ''}</div>
          <div class="game-date">${formattedDate}</div>
        </div>
        <div class="game-stats">
          ${game.goals || 0}G ${game.assists || 0}A ${(game.goals || 0) + (game.assists || 0)}P
        </div>
      `;
      
      gamesContainer.appendChild(gameItem);
    });
    
  } catch (error) {
    console.error('Error loading recent games:', error);
    gamesContainer.innerHTML = '<p><em>Failed to load recent games.</em></p>';
  }
}

function setupButtons(elements, character) {
  if (elements.deleteBtn) {
    elements.deleteBtn.addEventListener('click', () => {
      showDeleteModal(character.id, character.name);
    });
  }
  
  // Set up confirm delete functionality
  if (elements.confirmDelete) {
    elements.confirmDelete.addEventListener('click', () => {
      deleteCharacter(character.id);
    });
  }
  
  // Set "Set Active" button if not active
  if (elements.setActiveBtn && !character.is_active) {
    elements.setActiveBtn.style.display = 'inline-block';
    elements.setActiveBtn.addEventListener('click', () => {
      setActiveCharacter(character.id);
    });
  }
  
  // Set edit character link
  if (elements.editCharacterLink) {
    elements.editCharacterLink.href = `character-form.html?id=${character.id}`;
  }
  
  // Message Character button
  if (elements.messageCharacterBtn) {
    elements.messageCharacterBtn.addEventListener('click', () => {
      // Redirect to messages with this character
      window.location.href = `messages.html?new=1&recipient=${character.id}&name=${encodeURIComponent(character.name)}`;
    });
  }
}

// Complete the setActiveCharacter function
async function setActiveCharacter(characterId) {
  try {
    // Show loading/processing indication
    const successMessage = document.getElementById('character-profile-success');
    const errorMessage = document.getElementById('character-profile-error');
    
    // Clear previous messages
    if (successMessage) successMessage.style.display = 'none';
    if (errorMessage) errorMessage.style.display = 'none';
    
    const response = await fetch(`/api/characters/${characterId}/set-active`, {
      method: 'PUT',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to set character as active');
    }
    
    // Show success message
    if (successMessage) {
      successMessage.textContent = 'Character set as active successfully.';
      successMessage.style.display = 'block';
    }
    
    // Reload the page to reflect the change
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  } catch (error) {
    console.error('Error setting active character:', error);
    
    // Show error message
    const errorMessage = document.getElementById('character-profile-error');
    if (errorMessage) {
      errorMessage.textContent = 'Failed to set character as active. Please try again.';
      errorMessage.style.display = 'block';
    }
  }
}

// Function to show delete confirmation modal
function showDeleteModal(characterId, characterName) {
  const modal = document.getElementById('delete-modal');
  if (!modal) return;
  
  // If there's a message element, update it with character name
  const message = modal.querySelector('.modal-message');
  if (message) {
    message.textContent = `Are you sure you want to delete ${characterName}? This action cannot be undone.`;
  }
  
  // Show the modal
  modal.style.display = 'flex';
}

// Function to hide delete confirmation modal
function hideDeleteModal() {
  const modal = document.getElementById('delete-modal');
  if (modal) {
    modal.style.display = 'none';
  }
}

// Function to delete a character
async function deleteCharacter(characterId) {
  try {
    const response = await fetch(`/api/characters/${characterId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete character');
    }
    
    // Hide modal
    hideDeleteModal();
    
    // Show success message
    const successMessage = document.getElementById('character-profile-success');
    if (successMessage) {
      successMessage.textContent = 'Character deleted successfully. Redirecting...';
      successMessage.style.display = 'block';
    }
    
    // Redirect to character list
    setTimeout(() => {
      window.location.href = 'my-characters.html';
    }, 1500);
    
  } catch (error) {
    console.error('Error deleting character:', error);
    
    // Hide modal
    hideDeleteModal();
    
    // Show error message
    const errorMessage = document.getElementById('character-profile-error');
    if (errorMessage) {
      errorMessage.textContent = 'Failed to delete character. Please try again.';
      errorMessage.style.display = 'block';
    }
  }
}

// Helper function to get full position name
function getFullPosition(positionCode) {
  const positions = {
    'C': 'Center',
    'LW': 'Left Wing',
    'RW': 'Right Wing',
    'D': 'Defense',
    'G': 'Goalie'
  };
  
  return positions[positionCode] || positionCode;
}

// Helper function to format ice time (minutes to MM:SS format)
function formatIceTime(minutes) {
  if (!minutes) return '00:00';
  
  const mins = Math.floor(minutes);
  const secs = Math.round((minutes - mins) * 60);
  
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Function to set up the contacts tab
function setupContactsTab(character) {
  if (!character) return;
  
  // Cache DOM elements
  const elements = {
    searchBtn: document.getElementById('contacts-search-btn'),
    searchInput: document.getElementById('contacts-search'),
    searchResults: document.getElementById('contacts-results'),
    savedContacts: document.getElementById('saved-contacts'),
    editModal: document.getElementById('contact-edit-modal'),
    contactForm: document.getElementById('contact-form'),
    originalName: document.getElementById('contact-original-name'),
    customName: document.getElementById('contact-custom-name'),
    customImage: document.getElementById('contact-custom-image'),
    targetId: document.getElementById('contact-target-id'),
    originalAvatar: document.getElementById('original-avatar-preview'),
    customAvatar: document.getElementById('custom-avatar-preview'),
    previewBtn: document.getElementById('preview-contact-btn'),
    deleteBtn: document.getElementById('delete-contact-btn'),
    cancelBtn: document.getElementById('cancel-contact-btn'),
    contactsError: document.getElementById('contacts-error'),
    contactsSuccess: document.getElementById('contacts-success')
  };
  
  // Check if required elements exist
  if (!elements.searchBtn || !elements.searchInput || !elements.savedContacts) {
    console.error('Missing required contact tab elements');
    return;
  }
  
  // Load saved contacts
  loadSavedContacts(character.id);
  
  // Set up event listeners
  elements.searchBtn.addEventListener('click', () => {
    const query = elements.searchInput.value.trim();
    if (query.length < 2) {
      showContactsMessage('error', 'Please enter at least 2 characters to search');
      return;
    }
    
    searchCharacters(query, character.id);
  });
  
  elements.searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      elements.searchBtn.click();
    }
  });
  
  // Set up contact form submission
  if (elements.contactForm) {
    elements.contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const targetId = elements.targetId.value;
      const customName = elements.customName.value.trim();
      const customImage = elements.customImage.value.trim();
      
      await saveContact(character.id, targetId, customName, customImage);
      closeContactModal();
      loadSavedContacts(character.id);
    });
  }
  
  // Set up preview button
  if (elements.previewBtn) {
    elements.previewBtn.addEventListener('click', () => {
      const imageUrl = elements.customImage.value.trim();
      if (imageUrl) {
        elements.customAvatar.src = imageUrl;
        elements.customAvatar.onerror = () => {
          elements.customAvatar.src = '/api/placeholder/80/80';
          showContactsMessage('error', 'Invalid image URL or image could not be loaded');
        };
      } else {
        elements.customAvatar.src = elements.originalAvatar.src;
      }
    });
  }
  
  // Set up delete button
  if (elements.deleteBtn) {
    elements.deleteBtn.addEventListener('click', async () => {
      const targetId = elements.targetId.value;
      await deleteContact(character.id, targetId);
      closeContactModal();
      loadSavedContacts(character.id);
    });
  }
  
  // Set up cancel button
  if (elements.cancelBtn) {
    elements.cancelBtn.addEventListener('click', closeContactModal);
  }
  
  // Close modal on background click
  if (elements.editModal) {
    elements.editModal.addEventListener('click', (e) => {
      if (e.target === elements.editModal) {
        closeContactModal();
      }
    });
  }
  
  // Helper function to close contact modal
  function closeContactModal() {
    if (elements.editModal) {
      elements.editModal.style.display = 'none';
    }
  }
  
  // Helper function to show contact messages
  function showContactsMessage(type, message) {
    const element = type === 'error' ? elements.contactsError : elements.contactsSuccess;
    if (element) {
      element.textContent = message;
      element.style.display = 'block';
      
      // Hide after a delay
      setTimeout(() => {
        element.style.display = 'none';
      }, 5000);
    }
  }
  
  // Function to search for characters
  async function searchCharacters(query, excludeId) {
    if (!elements.searchResults) return;
    
    // Show loading indicator
    elements.searchResults.innerHTML = '<p class="loading-text">Searching...</p>';
    
    try {
      const response = await fetch(`/api/characters/search?q=${encodeURIComponent(query)}&excludeUserId=${excludeId}`, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to search characters');
      }
      
      const characters = await response.json();
      
      if (characters.length === 0) {
        elements.searchResults.innerHTML = '<p class="empty-text">No characters found matching your search.</p>';
        return;
      }
      
      // Build search results
      elements.searchResults.innerHTML = '';
      
      characters.forEach(character => {
        const resultItem = document.createElement('div');
        resultItem.className = 'character-result';
        resultItem.innerHTML = `
          <div class="character-avatar">
            <img src="${character.avatar_url || '/api/placeholder/60/60'}" alt="${character.name}">
          </div>
          <div class="character-info">
            <div class="character-name">${character.name}</div>
            <div class="character-details">
              <span>${getFullPosition(character.position) || 'Unknown'}</span>
              <span>${character.team_name || 'No Team'}</span>
            </div>
          </div>
        `;
        
        // Add click event to open edit modal
        resultItem.addEventListener('click', () => {
          openContactEditModal(character);
        });
        
        elements.searchResults.appendChild(resultItem);
      });
      
    } catch (error) {
      console.error('Error searching characters:', error);
      elements.searchResults.innerHTML = '<p class="error-text">Failed to search characters. Please try again.</p>';
    }
  }
  
  // Function to load saved contacts
  async function loadSavedContacts(characterId) {
    if (!elements.savedContacts) return;
    
    // Show loading indicator
    elements.savedContacts.innerHTML = '<p class="loading-text">Loading your contacts...</p>';
    
    try {
      const response = await fetch(`/api/characters/${characterId}/contacts`, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to load contacts');
      }
      
      const contacts = await response.json();
      
      if (contacts.length === 0) {
        elements.savedContacts.innerHTML = '<p class="empty-text">You haven\'t saved any contacts yet. Search for characters above to add them to your contacts.</p>';
        return;
      }
      
      // Build contacts list
      elements.savedContacts.innerHTML = '';
      
      contacts.forEach(contact => {
        const contactItem = document.createElement('div');
        contactItem.className = 'contact-card';
        contactItem.innerHTML = `
          <div class="contact-avatar">
            <img src="${contact.custom_image || contact.original_avatar || '/api/placeholder/60/60'}" alt="${contact.custom_name || contact.original_name}">
          </div>
          <div class="contact-info">
            <div class="contact-name">${contact.custom_name || contact.original_name}</div>
            ${contact.custom_name ? `<div class="contact-original">(${contact.original_name})</div>` : ''}
          </div>
        `;
        
        // Add click event to open edit modal
        contactItem.addEventListener('click', () => {
          openContactEditModal({
            id: contact.target_character_id,
            name: contact.original_name,
            avatar_url: contact.original_avatar
          }, contact);
        });
        
        elements.savedContacts.appendChild(contactItem);
      });
      
    } catch (error) {
      console.error('Error loading contacts:', error);
      elements.savedContacts.innerHTML = '<p class="error-text">Failed to load contacts. Please try again.</p>';
    }
  }
  
  // Function to open contact edit modal
  function openContactEditModal(character, existingContact = null) {
    if (!elements.editModal || !elements.originalName || !elements.targetId) return;
    
    // Set form values
    elements.originalName.value = character.name;
    elements.targetId.value = character.id;
    
    // Set avatar previews
    elements.originalAvatar.src = character.avatar_url || '/api/placeholder/80/80';
    elements.customAvatar.src = existingContact?.custom_image || character.avatar_url || '/api/placeholder/80/80';
    
    // Populate existing contact data if available
    if (existingContact) {
      elements.customName.value = existingContact.custom_name || '';
      elements.customImage.value = existingContact.custom_image || '';
    } else {
      elements.customName.value = '';
      elements.customImage.value = '';
    }
    
    // Show modal
    elements.editModal.style.display = 'flex';
  }
  
  // Function to save contact
  async function saveContact(characterId, targetId, customName, customImage) {
    try {
      const response = await fetch(`/api/characters/${characterId}/contacts/${targetId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          custom_name: customName || null,
          custom_image: customImage || null
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to save contact');
      }
      
      showContactsMessage('success', 'Contact saved successfully');
      return true;
    } catch (error) {
      console.error('Error saving contact:', error);
      showContactsMessage('error', 'Failed to save contact. Please try again.');
      return false;
    }
  }
  
  // Function to delete contact
  async function deleteContact(characterId, targetId) {
    try {
      const response = await fetch(`/api/characters/${characterId}/contacts/${targetId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete contact');
      }
      
      showContactsMessage('success', 'Contact deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting contact:', error);
      showContactsMessage('error', 'Failed to delete contact. Please try again.');
      return false;
    }
  }
}