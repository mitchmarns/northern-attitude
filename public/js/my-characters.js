// my-characters.js - Client-side functionality for character management

document.addEventListener('DOMContentLoaded', function() {
  // Check if user is authenticated, redirect to login if not
  window.authUtils.checkAuth(true);
  
  // Set up logout functionality
  window.authUtils.setupLogoutButton();
  
  // Load user's characters
  loadMyCharacters();
  
  // Set up event listener for create character button
  document.getElementById('create-character-btn').addEventListener('click', function() {
    window.location.href = 'character-form.html';
  });
});

// Function to load user's characters
async function loadMyCharacters() {
  try {
    const response = await fetch('/api/my-characters', {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch character data');
    }
    
    const characters = await response.json();
    
    // Get the container element
    const characterContainer = document.getElementById('character-container');
    
    // Clear loading message
    characterContainer.innerHTML = '';
    
    if (characters.length === 0) {
      // Show empty state if no characters
      displayEmptyState(characterContainer);
    } else {
      // Create the character list container
      const characterList = document.createElement('div');
      characterList.className = 'character-list';
      
      // Add each character card
      characters.forEach(character => {
        const characterCard = createCharacterCard(character);
        characterList.appendChild(characterCard);
      });
      
      characterContainer.appendChild(characterList);
    }
  } catch (error) {
    console.error('Error loading characters:', error);
    
    // Show error message
    const errorMessage = document.getElementById('character-list-error');
    errorMessage.textContent = 'Failed to load characters. Please try again later.';
    errorMessage.style.display = 'block';
    
    // Clear container
    document.getElementById('character-container').innerHTML = '';
  }
}

// Function to create a character card element
function createCharacterCard(character) {
  // Create the card element
  const card = document.createElement('div');
  card.className = 'character-card';
  if (character.is_active) {
    card.classList.add('active');
  }
  
  // Parse character stats from JSON
  const stats = JSON.parse(character.stats_json);
  
  // Create HTML structure for character card
  card.innerHTML = `
    ${character.is_active ? '<div class="active-badge">Active</div>' : ''}
    <div class="character-header">
      <div class="character-avatar">
        <img src="${character.avatar_url || '/api/placeholder/60/60'}" alt="${character.name}">
      </div>
      <div class="character-info">
        <h3>${character.name}</h3>
        <div class="position">${getFullPosition(character.position)}</div>
        <div class="team">${character.team_name || 'No Team'}</div>
      </div>
    </div>
    
    <div class="character-stats">
      <div class="stat">
        <div class="stat-name">GOALS</div>
        <div class="stat-value">${stats.goals || 0}</div>
      </div>
      <div class="stat">
        <div class="stat-name">ASSISTS</div>
        <div class="stat-value">${stats.assists || 0}</div>
      </div>
      <div class="stat">
        <div class="stat-name">GAMES</div>
        <div class="stat-value">${stats.games || 0}</div>
      </div>
    </div>
    
    <div class="character-actions">
      <a href="character-profile.html?id=${character.id}">View Profile</a>
      ${!character.is_active ? `<a href="#" data-character-id="${character.id}" class="set-active-link">Set Active</a>` : ''}
      <a href="character-form.html?id=${character.id}">Edit</a>
    </div>
  `;
  
  // Add event listener for "Set Active" link
  setTimeout(() => {
    const setActiveLink = card.querySelector('.set-active-link');
    if (setActiveLink) {
      setActiveLink.addEventListener('click', function(e) {
        e.preventDefault();
        setActiveCharacter(character.id);
      });
    }
  }, 0);
  
  return card;
}

// Function to set a character as active
async function setActiveCharacter(characterId) {
  try {
    // Show loading/processing indication
    const successMessage = document.getElementById('character-list-success');
    const errorMessage = document.getElementById('character-list-error');
    
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
    
    // Reload characters to reflect the change
    setTimeout(() => {
      loadMyCharacters();
    }, 1000);
    
  } catch (error) {
    console.error('Error setting active character:', error);
    
    // Show error message
    const errorMessage = document.getElementById('character-list-error');
    errorMessage.textContent = 'Failed to set character as active. Please try again.';
    errorMessage.style.display = 'block';
  }
}

// Function to display empty state when user has no characters
function displayEmptyState(container) {
  const emptyState = document.createElement('div');
  emptyState.className = 'no-characters';
  
  emptyState.innerHTML = `
    <h3>You haven't created any characters yet</h3>
    <p>Create your first hockey player character to join teams, play games, and participate in the league.</p>
    <button id="empty-create-btn" class="btn btn-primary">Create Your First Character</button>
  `;
  
  container.appendChild(emptyState);
  
  // Add event listener for the create button
  setTimeout(() => {
    document.getElementById('empty-create-btn').addEventListener('click', function() {
      window.location.href = 'character-form.html';
    });
  }, 0);
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