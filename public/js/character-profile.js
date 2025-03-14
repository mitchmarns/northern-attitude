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

// Function to load character profile data
async function loadCharacterProfile(characterId) {
  try {
    const response = await fetch(`/api/characters/${characterId}`, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch character data');
    }
    
    const character = await response.json();
    
    // Update page title with character name
    document.title = `${character.name} | Northern Attitude`;
    document.getElementById('page-title').textContent = character.name;
    
    // Update name banner
    document.getElementById('banner-character-name').textContent = character.name;
    
    // Add jersey number if available (mock data for now)
    const jerseyNumber = getJerseyNumberFromStats(character) || 
                         Math.floor(Math.random() * 98) + 1; // Random number between 1-99
    document.getElementById('jersey-number').textContent = jerseyNumber;
    
    // Parse stats from JSON
    const stats = JSON.parse(character.stats_json);
    
    // Update profile sidebar
    updateProfileSidebar(character, stats);
    
    // Update profile content
    updateProfileContent(character, stats);
    
    // Update stats tab
    updateStatsTab(character, stats);
    
    // Update games tab
    loadRecentGames(characterId);
    
    // Update bio tab
    updateBioTab(character);
    
    // Set up delete button functionality
    setTimeout(() => {
      const deleteBtn = document.getElementById('delete-character-btn');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', function() {
          showDeleteModal(character.id, character.name);
        });
      }
      
      // Set up confirm delete functionality
      document.getElementById('confirm-delete').addEventListener('click', function() {
        deleteCharacter(character.id);
      });
      
      // Set "Set Active" button if not active
      const setActiveBtn = document.getElementById('set-active-btn');
      if (setActiveBtn && !character.is_active) {
        setActiveBtn.style.display = 'inline-block';
        setActiveBtn.addEventListener('click', function() {
          setActiveCharacter(character.id);
        });
      }
      
      // Set edit character link
      const editCharacterLink = document.getElementById('edit-character-link');
      if (editCharacterLink) {
        editCharacterLink.href = `character-form.html?id=${character.id}`;
      }
    }, 0);
    
  } catch (error) {
    console.error('Error loading character profile:', error);
    
    // Show error message
    const errorMessage = document.getElementById('character-profile-error');
    errorMessage.textContent = 'Failed to load character profile. Please try again later.';
    errorMessage.style.display = 'block';
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
function updateProfileSidebar(character, stats) {
  // Update avatar
  const avatarElement = document.getElementById('character-avatar');
  if (avatarElement) {
    avatarElement.src = character.avatar_url || '/api/placeholder/150/150';
    avatarElement.alt = character.name;
  }
  
  // Update character info
  document.getElementById('sidebar-character-name').textContent = character.name;
  document.getElementById('character-position').textContent = getFullPosition(character.position);
  document.getElementById('character-team').textContent = character.team_name || 'No Team';
  
  // Update status
  const statusElement = document.getElementById('character-status');
  statusElement.textContent = character.is_active ? 'Active Character' : 'Inactive';
  statusElement.className = character.is_active ? 'character-status active' : 'character-status inactive';
  
  // Update main stats
  const mainStatsElement = document.getElementById('main-stats');
  mainStatsElement.innerHTML = '';
  
  // Add common stats for players
  if (character.character_type === 'player') {
    const commonStats = [
      { label: 'Goals', value: stats.goals || 0 },
      { label: 'Assists', value: stats.assists || 0 },
      { label: 'Games', value: stats.games || 0 },
      { label: 'Points', value: (stats.goals || 0) + (stats.assists || 0) },
      { label: '+/-', value: stats.plus_minus || 0 },
      { label: 'PIM', value: stats.penalties || 0 }
    ];
    
    commonStats.forEach(stat => {
      const statItem = document.createElement('div');
      statItem.className = 'stat-item';
      statItem.innerHTML = `
        <span class="stat-label">${stat.label}</span>
        <span class="stat-value">${stat.value}</span>
      `;
      mainStatsElement.appendChild(statItem);
    });
    
    // Add position-specific stats
    const positionStatsTitle = document.getElementById('position-stats-title');
    const positionStatsContainer = document.getElementById('position-stats');
    
    switch(character.position) {
      case 'C':
        positionStatsTitle.textContent = 'Center Stats';
        positionStatsContainer.innerHTML = `
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
        positionStatsTitle.textContent = 'Wing Stats';
        positionStatsContainer.innerHTML = `
          <div class="stat-item">
            <span class="stat-label">Shooting %</span>
            <span class="stat-value">${stats.shooting_pct || '0.0'}%</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Shots</span>
            <span class="stat-value">${stats.shots || 0}</span>
          </div>
        `;
        break;
      case 'D':
        positionStatsTitle.textContent = 'Defense Stats';
        positionStatsContainer.innerHTML = `
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
        positionStatsTitle.textContent = 'Goalie Stats';
        positionStatsContainer.innerHTML = `
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
  } else {
    // For non-player types, hide stats blocks
    document.getElementById('position-stats-block').style.display = 'none';
    
    // Add role instead of stats for non-players
    mainStatsElement.innerHTML = `
      <div class="stat-item" style="grid-column: 1 / span 2;">
        <span class="stat-label">Role</span>
        <span class="stat-value">${character.role || 'Unspecified'}</span>
      </div>
    `;
  }
}

// Function to update profile content
function updateProfileContent(character, stats) {
  // Update about heading
  document.getElementById('about-heading').textContent = `About ${character.name}`;
  
  // Update bio
  const bioElement = document.getElementById('character-bio');
  if (character.bio) {
    bioElement.innerHTML = `<p>${character.bio.replace(/\n/g, '</p><p>')}</p>`;
  } else {
    bioElement.innerHTML = `<p><em>No biography provided for ${character.name} yet.</em></p>`;
  }
  
  // Update career highlights
  const highlightsContainer = document.getElementById('career-highlights');
  
  // For player type
  if (character.character_type === 'player') {
    highlightsContainer.innerHTML = `
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
    highlightsContainer.innerHTML = `
      <div class="highlight-stat">
        <div class="highlight-value">${character.role || 'N/A'}</div>
        <div class="highlight-label">Role</div>
      </div>
    `;
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