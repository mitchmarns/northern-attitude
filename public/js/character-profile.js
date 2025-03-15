// character-profile.js - Enhanced client-side functionality for character profiles

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
    errorMessage.textContent = 'No character ID provided. Redirecting to character list...';
    errorMessage.style.display = 'block';
    
    setTimeout(() => {
      window.location.href = 'my-characters.html';
    }, 3000);
    return;
  }
  
  // Load character profile
  loadCharacterProfile(characterId);
  
  // Set up modal close functionality
  document.getElementById('cancel-delete').addEventListener('click', hideDeleteModal);
  
  // Clicking outside the modal also closes it
  document.getElementById('delete-modal').addEventListener('click', function(e) {
    if (e.target === this) {
      hideDeleteModal();
    }
  });
});

function cacheDOMElements() {
  const elements = [
    'character-form', 'character-type', 'character-type-description', 
    'name-banner', // Add this line
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
      editCharacterLink: document.getElementById('edit-character-link')
    };
    
    // Parse stats from JSON once
    const stats = JSON.parse(character.stats_json);

    // Update page title and header
    document.title = `${character.name} | Northern Attitude`;
    elements.title.textContent = character.name;
    elements.bannerName.textContent = character.name;
    
    // Add jersey number if available (mock data for now)
    const jerseyNumber = stats.jersey_number || 
                         Math.floor(Math.random() * 98) + 1; // Random number between 1-99
    elements.jerseyNumber.textContent = jerseyNumber;
    
    // Update header image - Add this line
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
    setupContactsTab(character);
    
  } catch (error) {
    console.error('Error loading character profile:', error);
    
    // Show error message
    const errorMessage = document.getElementById('character-profile-error');
    errorMessage.textContent = 'Failed to load character profile. Please try again later.';
    errorMessage.style.display = 'block';
  }
}

// Add this new function to update the basics tab
function updateBasicsTab(character, stats) {
  // These fields would normally come from extended character data
  // For now, we'll generate some sample data based on the character info we have
  
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
  if (character.character_type !== 'player') {
    document.getElementById('basics-role-section').style.display = 'block';
    updateBasicsField('role', character.role || 'Unspecified');
    updateBasicsField('organization', teamName);
    updateBasicsField('experience', `${yearsPro} years`);
  } else {
    document.getElementById('basics-role-section').style.display = 'none';
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
}

function updateHeaderImage(character) {
  const nameBanner = document.getElementById('name-banner');
  
  if (nameBanner && character.header_image_url) {
    // Set the header image as background
    nameBanner.style.backgroundImage = `url('${character.header_image_url}')`;
    console.log('Setting header image background:', character.header_image_url);
  } else {
    // If no header image provided, use a gradient background
    nameBanner.style.backgroundImage = 'none';
    nameBanner.style.backgroundColor = 'var(--dark-bg)';
    console.log('No header image available, using default background');
  }
}


// Extract jersey number from stats if possible
function getJerseyNumberFromStats(character) {
  try {
    const stats = JSON.parse(character.stats_json);
    return stats.jersey_number || null;
  } catch (e) {
    return null;
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
  elements.aboutHeading.textContent = `About ${character.name}`;
  
  // Update bio with proper error handling
  if (character.bio) {
    elements.characterBio.innerHTML = `<p>${character.bio.replace(/\n/g, '</p><p>')}</p>`;
  } else {
    elements.characterBio.innerHTML = `<p><em>No biography provided for ${character.name} yet.</em></p>`;
  }
  
  // Update career highlights more efficiently
  updateCareerHighlights(elements, character, stats);
}

function updateCareerHighlights(elements, character, stats) {
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
  } else {
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
    
    // Create a row with current stats
    let rowData = [];
    
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
    document.getElementById('stats').innerHTML = `
      <h2>Role Information</h2>
      <div class="info-section">
        <p>Detailed statistics are not available for ${character.character_type} characters.</p>
        <p>Role: ${character.role || 'Unspecified'}</p>
      </div>
    `;
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

// Function to load recent games for a character
async function loadRecentGames(characterId) {
  try {
    const response = await fetch(`/api/characters/${characterId}/games?limit=5`, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch recent games');
    }
    
    const games = await response.json();
    const gamesContainer = document.getElementById('recent-games');
    
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
    document.getElementById('recent-games').innerHTML = '<p><em>Failed to load recent games.</em></p>';
  }
}

// Function to set a character as active
async function setActiveCharacter(characterId) {
  try {
    // Show loading/processing indication
    const successMessage = document.getElementById('character-profile-success');
    const errorMessage = document.getElementById('character-profile-error');
    
    // Clear previous messages
    successMessage.style.display = 'none';
    errorMessage.style.display = 'none';
    
    const response = await fetch(`/api/characters/${characterId}/set-active`, {
      method: 'PUT',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to set character as active');
    }
    
    // Show success message
    successMessage.textContent = 'Character set as active successfully.';
    successMessage.style.display = 'block';
    
    // Reload the page to reflect the change
    setTimeout(() => {
      window.location.reload();
    }, 1000);
    
  } catch (error) {
    console.error('Error setting active character:', error);
    
    // Show error message
    const errorMessage = document.getElementById('character-profile-error');
    errorMessage.textContent = 'Failed to set character as active. Please try again.';
    errorMessage.style.display = 'block';
  }
}

// Function to show delete confirmation modal
function showDeleteModal(characterId, characterName) {
  const modal = document.getElementById('delete-modal');
  const message = modal.querySelector('.modal-message');
  
  // Update message with character name
  message.textContent = `Are you sure you want to delete ${characterName}? This action cannot be undone.`;
  
  // Set character ID on confirm button
  document.getElementById('confirm-delete').setAttribute('data-character-id', characterId);
  
  // Show modal
  modal.style.display = 'flex';
}

// Function to hide delete confirmation modal
function hideDeleteModal() {
  document.getElementById('delete-modal').style.display = 'none';
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
    successMessage.textContent = 'Character deleted successfully. Redirecting to character list...';
    successMessage.style.display = 'block';
    
    // Redirect to character list after a short delay
    setTimeout(() => {
      window.location.href = 'my-characters.html';
    }, 2000);
    
  } catch (error) {
    console.error('Error deleting character:', error);
    
    // Hide modal
    hideDeleteModal();
    
    // Show error message
    const errorMessage = document.getElementById('character-profile-error');
    errorMessage.textContent = 'Failed to delete character. Please try again.';
    errorMessage.style.display = 'block';
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

// Helper function to format ice time
function formatIceTime(seconds) {
  if (!seconds) return '00:00';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Add Message Character button functionality
const messageCharacterBtn = document.getElementById('message-character-btn');
if (messageCharacterBtn && character.id) {
  messageCharacterBtn.addEventListener('click', () => {
    // Check if this is the user's own character
    if (character.user_id === currentUserId) {
      showError('You cannot message your own character');
      return;
    }
    
    // Get the currently active character from localStorage
    const authInfo = JSON.parse(localStorage.getItem('authInfo') || sessionStorage.getItem('authInfo') || '{}');
    if (authInfo && authInfo.activeCharacterId) {
      // Redirect to character phone with query parameters
      window.location.href = `character-phone.html?new=1&sender=${authInfo.activeCharacterId}&recipient=${character.id}&name=${encodeURIComponent(character.name)}`;
    } else {
      // No active character, show error
      showError('You need to have an active character to send messages');
    }
  });
}

// Setup contacts tab functionality
function setupContactsTab(character) {
  // Cache DOM elements
  const elements = {
    searchInput: document.getElementById('contacts-search'),
    searchButton: document.getElementById('contacts-search-btn'),
    resultsContainer: document.getElementById('contacts-results'),
    savedContactsContainer: document.getElementById('saved-contacts'),
    contactsError: document.getElementById('contacts-error'),
    contactsSuccess: document.getElementById('contacts-success'),
    
    // Modal elements
    modal: document.getElementById('contact-edit-modal'),
    form: document.getElementById('contact-form'),
    targetIdInput: document.getElementById('contact-target-id'),
    originalNameInput: document.getElementById('contact-original-name'),
    customNameInput: document.getElementById('contact-custom-name'),
    customImageInput: document.getElementById('contact-custom-image'),
    previewButton: document.getElementById('preview-contact-btn'),
    originalAvatarPreview: document.getElementById('original-avatar-preview'),
    customAvatarPreview: document.getElementById('custom-avatar-preview'),
    cancelButton: document.getElementById('cancel-contact-btn'),
    deleteButton: document.getElementById('delete-contact-btn'),
    formError: document.getElementById('contact-form-error')
  };
  
  // Check if elements exist
  if (!elements.searchInput || !elements.searchButton || !elements.resultsContainer) {
    console.error('Contacts tab elements not found');
    return;
  }
  
  // Load saved contacts
  loadSavedContacts(character.id);
  
  // Set up search functionality
  elements.searchButton.addEventListener('click', () => {
    const query = elements.searchInput.value.trim();
    if (query.length < 2) {
      showContactsError('Please enter at least 2 characters to search');
      return;
    }
    
    searchCharacters(query, character.id);
  });
  
  // Search on enter key
  elements.searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      elements.searchButton.click();
    }
  });
  
  // Contact modal functionality
  if (elements.modal) {
    // Close modal when clicking cancel
    elements.cancelButton.addEventListener('click', () => {
      elements.modal.style.display = 'none';
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
      if (e.target === elements.modal) {
        elements.modal.style.display = 'none';
      }
    });
    
    // Preview button
    elements.previewButton.addEventListener('click', () => {
      const imageUrl = elements.customImageInput.value.trim();
      
      if (imageUrl) {
        elements.customAvatarPreview.src = imageUrl;
        
        // Handle load errors
        elements.customAvatarPreview.onerror = () => {
          elements.customAvatarPreview.src = elements.originalAvatarPreview.src;
          showFormError('contact-form', 'Invalid image URL or image could not be loaded');
        };
        
        // Clear errors on successful load
        elements.customAvatarPreview.onload = () => {
          elements.formError.style.display = 'none';
        };
      } else {
        // If no URL entered, use original avatar
        elements.customAvatarPreview.src = elements.originalAvatarPreview.src;
        elements.formError.style.display = 'none';
      }
    });
    
    // Form submission
    elements.form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const targetId = elements.targetIdInput.value;
      const customName = elements.customNameInput.value.trim();
      const customImage = elements.customImageInput.value.trim();
      
      if (!targetId) {
        showFormError('contact-form', 'Missing target character ID');
        return;
      }
      
      try {
        const response = await fetch(`/api/characters/${character.id}/contacts/${targetId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            custom_name: customName,
            custom_image: customImage
          }),
          credentials: 'include'
        });
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || 'Failed to update contact');
        }
        
        // Close modal
        elements.modal.style.display = 'none';
        
        // Show success message
        showContactsSuccess('Contact updated successfully');
        
        // Reload contacts
        loadSavedContacts(character.id);
      } catch (error) {
        console.error('Error updating contact:', error);
        showFormError('contact-form', error.message || 'Failed to update contact');
      }
    });
    
    // Delete button
    elements.deleteButton.addEventListener('click', async () => {
      const targetId = elements.targetIdInput.value;
      
      if (!targetId) {
        showFormError('contact-form', 'Missing target character ID');
        return;
      }
      
      // Confirm deletion
      if (!confirm('Are you sure you want to delete this contact? This will remove your custom settings for this character.')) {
        return;
      }
      
      try {
        const response = await fetch(`/api/characters/${character.id}/contacts/${targetId}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || 'Failed to delete contact');
        }
        
        // Close modal
        elements.modal.style.display = 'none';
        
        // Show success message
        showContactsSuccess('Contact deleted successfully');
        
        // Reload contacts
        loadSavedContacts(character.id);
      } catch (error) {
        console.error('Error deleting contact:', error);
        showFormError('contact-form', error.message || 'Failed to delete contact');
      }
    });
  }


  // Helper function to show contacts error
  function showContactsError(message) {
    if (elements.contactsError) {
      elements.contactsError.textContent = message;
      elements.contactsError.style.display = 'block';
      
      // Auto-hide after a few seconds
      setTimeout(() => {
        elements.contactsError.style.display = 'none';
      }, 5000);
    }
  }

    // Helper function to show contacts success
    function showContactsSuccess(message) {
      if (elements.contactsSuccess) {
        elements.contactsSuccess.textContent = message;
        elements.contactsSuccess.style.display = 'block';
        
        // Auto-hide after a few seconds
        setTimeout(() => {
          elements.contactsSuccess.style.display = 'none';
        }, 5000);
      }
    }

// Helper function to show form error
function showFormError(formId, message) {
  const errorDiv = document.getElementById(`${formId}-error`);
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
  }
}

// Function to load saved contacts
async function loadSavedContacts(characterId) {
  try {
    const response = await fetch(`/api/characters/${characterId}/contacts`, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch contacts');
    }
    
    const contacts = await response.json();
    
    if (elements.savedContactsContainer) {
      if (contacts.length === 0) {
        elements.savedContactsContainer.innerHTML = '<p class="empty-text">No saved contacts yet. Search for characters above to add them.</p>';
        return;
      }
      
      // Clear container
      elements.savedContactsContainer.innerHTML = '';
      
      // Create contact cards
      contacts.forEach(contact => {
        const contactCard = document.createElement('div');
        contactCard.className = 'contact-card';
        
        // Use custom name/image if available, otherwise use original
        const displayName = contact.custom_name || contact.original_name;
        const displayImage = contact.custom_image || contact.original_avatar || '/api/placeholder/80/80';
        
        contactCard.innerHTML = `
          <div class="contact-avatar">
            <img src="${displayImage}" alt="${displayName}">
          </div>
          <div class="contact-info">
            <div class="contact-name">${displayName}</div>
            <div class="contact-original">${contact.custom_name ? `(${contact.original_name})` : ''}</div>
          </div>
          <button class="btn btn-secondary btn-sm edit-contact-btn">Edit</button>
        `;
        
        // Add edit button event
        const editButton = contactCard.querySelector('.edit-contact-btn');
        editButton.addEventListener('click', () => {
          openContactEditModal(character.id, contact);
        });
        
        elements.savedContactsContainer.appendChild(contactCard);
      });
    }
  } catch (error) {
    console.error('Error loading contacts:', error);
    if (elements.savedContactsContainer) {
      elements.savedContactsContainer.innerHTML = '<p class="error-text">Failed to load contacts. Please try again later.</p>';
    }
  }
}

// Function to search for characters
async function searchCharacters(query, characterId) {
  try {
    // Show loading state
    elements.resultsContainer.innerHTML = '<p class="loading-text">Searching...</p>';
    
    const response = await fetch(`/api/characters/search?q=${encodeURIComponent(query)}`, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to search characters');
    }
    
    const characters = await response.json();
    
    // Filter out the current character
    const filteredCharacters = characters.filter(char => char.id !== characterId);
    
    if (filteredCharacters.length === 0) {
      elements.resultsContainer.innerHTML = '<p class="empty-text">No characters found matching your search.</p>';
      return;
    }
    
    // Clear container
    elements.resultsContainer.innerHTML = '';
    
    // Create character cards
    filteredCharacters.forEach(char => {
      const characterCard = document.createElement('div');
      characterCard.className = 'character-result';
      
      characterCard.innerHTML = `
        <div class="character-avatar">
          <img src="${char.avatar_url || '/api/placeholder/60/60'}" alt="${char.name}">
        </div>
        <div class="character-info">
          <div class="character-name">${char.name}</div>
          <div class="character-details">
            <span class="character-position">${char.position || 'Unknown position'}</span>
            ${char.team_name ? `<span class="character-team">${char.team_name}</span>` : ''}
          </div>
        </div>
        <button class="btn btn-primary btn-sm add-contact-btn">Add Contact</button>
      `;
      
      // Add button event
      const addButton = characterCard.querySelector('.add-contact-btn');
      addButton.addEventListener('click', async () => {
        // Check if contact already exists
        try {
          const contactResponse = await fetch(`/api/characters/${characterId}/contacts/${char.id}`, {
            method: 'GET',
            credentials: 'include'
          });
          
          if (contactResponse.ok) {
            const contact = await contactResponse.json();
            openContactEditModal(characterId, contact);
          } else {
            // Create new contact modal
            openContactEditModal(characterId, {
              target_character_id: char.id,
              original_name: char.name,
              original_avatar: char.avatar_url
            });
          }
        } catch (error) {
          console.error('Error checking contact:', error);
          showContactsError('Failed to check if contact exists');
        }
      });
      
      elements.resultsContainer.appendChild(characterCard);
    });
  } catch (error) {
    console.error('Error searching characters:', error);
    elements.resultsContainer.innerHTML = '<p class="error-text">Failed to search characters. Please try again later.</p>';
  }
}

// Function to open contact edit modal
function openContactEditModal(characterId, contact) {
  // Set form values
  elements.targetIdInput.value = contact.target_character_id;
  elements.originalNameInput.value = contact.original_name;
  elements.customNameInput.value = contact.custom_name || '';
  elements.customImageInput.value = contact.custom_image || '';
  
  // Set preview images
  elements.originalAvatarPreview.src = contact.original_avatar || '/api/placeholder/80/80';
  elements.customAvatarPreview.src = contact.custom_image || contact.original_avatar || '/api/placeholder/80/80';
  
  // Clear error message
  elements.formError.style.display = 'none';
  
  // Show modal
  elements.modal.style.display = 'flex';
}
}

