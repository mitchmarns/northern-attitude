// character-profile.js - Client-side functionality for character profiles

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
    
    // Parse stats from JSON
    const stats = JSON.parse(character.stats_json);
    
    // Create the profile container
    const profileContainer = document.getElementById('profile-container');
    profileContainer.innerHTML = '';
    
    // Create sidebar
    const sidebar = createProfileSidebar(character, stats);
    profileContainer.appendChild(sidebar);
    
    // Create main content
    const content = createProfileContent(character, stats);
    profileContainer.appendChild(content);
    
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
    }, 0);
    
  } catch (error) {
    console.error('Error loading character profile:', error);
    
    // Show error message
    const errorMessage = document.getElementById('character-profile-error');
    errorMessage.textContent = 'Failed to load character profile. Please try again later.';
    errorMessage.style.display = 'block';
    
    // Clear container
    document.getElementById('profile-container').innerHTML = '';
  }
}

// Function to create profile sidebar
function createProfileSidebar(character, stats) {
  const sidebar = document.createElement('div');
  sidebar.className = 'profile-sidebar';
  
  // Character basic info
  sidebar.innerHTML = `
    <div class="character-avatar">
      <img src="${character.avatar_url || '/api/placeholder/150/150'}" alt="${character.name}">
    </div>
    <h2 class="character-name">${character.name}</h2>
    <div class="character-position">${getFullPosition(character.position)}</div>
    <div class="character-team">${character.team_name || 'No Team'}</div>
    <div class="character-status ${character.is_active ? 'active' : 'inactive'}">${character.is_active ? 'Active Character' : 'Inactive'}</div>
  `;
  
  // Add statistics block
  const statBlock = document.createElement('div');
  statBlock.className = 'stat-block';
  statBlock.innerHTML = `
    <h4>Player Statistics</h4>
    <div class="stat-grid">
      <div class="stat-item">
        <span class="stat-label">Goals</span>
        <span class="stat-value">${stats.goals || 0}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Assists</span>
        <span class="stat-value">${stats.assists || 0}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Games</span>
        <span class="stat-value">${stats.games || 0}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Points</span>
        <span class="stat-value">${(stats.goals || 0) + (stats.assists || 0)}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">+/-</span>
        <span class="stat-value">${stats.plus_minus || 0}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">PIM</span>
        <span class="stat-value">${stats.penalties || 0}</span>
      </div>
    </div>
  `;
  sidebar.appendChild(statBlock);
  
  // Add additional stats based on position
  if (character.position === 'C' || character.position === 'LW' || character.position === 'RW') {
    // Forward-specific stats
    const forwardStats = document.createElement('div');
    forwardStats.className = 'stat-block';
    forwardStats.innerHTML = `
      <h4>Forward Stats</h4>
      <div class="stat-grid">
        <div class="stat-item">
          <span class="stat-label">Shots</span>
          <span class="stat-value">${stats.shots || 0}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Shot %</span>
          <span class="stat-value">${stats.shooting_pct || '0.0'}%</span>
        </div>
        ${character.position === 'C' ? `
        <div class="stat-item">
          <span class="stat-label">Faceoff %</span>
          <span class="stat-value">${stats.faceoff_pct || '0.0'}%</span>
        </div>
        ` : ''}
      </div>
    `;
    sidebar.appendChild(forwardStats);
  } else if (character.position === 'D') {
    // Defense-specific stats
    const defenseStats = document.createElement('div');
    defenseStats.className = 'stat-block';
    defenseStats.innerHTML = `
      <h4>Defense Stats</h4>
      <div class="stat-grid">
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
      </div>
    `;
    sidebar.appendChild(defenseStats);
  } else if (character.position === 'G') {
    // Goalie-specific stats
    const goalieStats = document.createElement('div');
    goalieStats.className = 'stat-block';
    goalieStats.innerHTML = `
      <h4>Goalie Stats</h4>
      <div class="stat-grid">
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
      </div>
    `;
    sidebar.appendChild(goalieStats);
  }
  
  // Add action buttons
  const actionButtons = document.createElement('div');
  actionButtons.className = 'action-buttons';
  actionButtons.innerHTML = `
    <a href="character-form.html?id=${character.id}" class="btn btn-primary">Edit Character</a>
    <button id="delete-character-btn" class="btn btn-danger">Delete</button>
  `;
  
  // If character is not active, add "Set Active" button
  if (!character.is_active) {
    const setActiveBtn = document.createElement('button');
    setActiveBtn.className = 'btn btn-secondary';
    setActiveBtn.textContent = 'Set as Active';
    setActiveBtn.addEventListener('click', () => setActiveCharacter(character.id));
    actionButtons.insertBefore(setActiveBtn, actionButtons.firstChild);
  }
  
  sidebar.appendChild(actionButtons);
  
  return sidebar;
}

// Function to create profile main content
function createProfileContent(character, stats) {
  const content = document.createElement('div');
  content.className = 'profile-content';
  
  // Character bio section
  const bioSection = document.createElement('div');
  bioSection.className = 'profile-section';
  bioSection.innerHTML = `
    <h3>About ${character.name}</h3>
    <div class="character-bio">
      ${character.bio || `<em>No biography provided for ${character.name} yet.</em>`}
    </div>
  `;
  content.appendChild(bioSection);
  
  // Career highlights
  const highlightsSection = document.createElement('div');
  highlightsSection.className = 'profile-section';
  highlightsSection.innerHTML = `
    <h3>Career Highlights</h3>
    <div class="stats-highlight">
      <div class="highlight-stat">
        <div class="highlight-value">${stats.goals || 0}</div>
        <div class="highlight-label">Goals</div>
      </div>
      <div class="highlight-stat">
        <div class="highlight-value">${stats.assists || 0}</div>
        <div class="highlight-label">Assists</div>
      </div>
      <div class="highlight-stat">
        <div class="highlight-value">${stats.games || 0}</div>
        <div class="highlight-label">Games</div>
      </div>
    </div>
  `;
  content.appendChild(highlightsSection);
  
  // Recent games section
  const gamesSection = document.createElement('div');
  gamesSection.className = 'profile-section';
  gamesSection.innerHTML = `
    <h3>Recent Games</h3>
    <div class="games-list" id="recent-games">
      <p><em>Loading recent games...</em></p>
    </div>
  `;
  content.appendChild(gamesSection);
  
  // Load recent games
  setTimeout(() => {
    loadRecentGames(character.id);
  }, 0);
  
  return content;
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
    
    // Clear loading message
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