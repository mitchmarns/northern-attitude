// teams.js - Client-side functionality for teams listing

document.addEventListener('DOMContentLoaded', function() {
  // Check if user is authenticated, redirect to login if not
  window.authUtils.checkAuth(true);
  
  // Set up logout functionality
  window.authUtils.setupLogoutButton();
  
  // Load all teams
  loadTeams();
  
  // Check if user has permission to create teams
  checkTeamCreationPermission();
});

// Function to load all teams
async function loadTeams() {
  try {
    const response = await fetch('/api/teams', {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch teams');
    }
    
    const teams = await response.json();
    displayTeams(teams);
  } catch (error) {
    console.error('Error loading teams:', error);
    const errorMessage = document.getElementById('teams-error');
    errorMessage.textContent = 'Failed to load teams. Please try again later.';
    errorMessage.style.display = 'block';
  }
}

// Function to display teams in the UI
function displayTeams(teams) {
  const container = document.getElementById('teams-container');
  
  // Clear loading message
  container.innerHTML = '';
  
  if (teams.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>No teams found</h3>
        <p>There are currently no teams in the league.</p>
      </div>
    `;
    return;
  }
  
  // Create team grid
  const teamGrid = document.createElement('div');
  teamGrid.className = 'teams-grid';
  
  // Add each team
  teams.forEach(team => {
    const teamCard = createTeamCard(team);
    teamGrid.appendChild(teamCard);
  });
  
  container.appendChild(teamGrid);
}

// Function to create a team card
function createTeamCard(team) {
  const card = document.createElement('div');
  card.className = 'team-card';
  
  card.innerHTML = `
    <div class="team-logo">
      <img src="${team.logo_url || '/api/placeholder/80/80'}" alt="${team.name} logo">
    </div>
    <h3 class="team-name">${team.name}</h3>
    <div class="team-record">${team.record || '0-0-0'}</div>
    <a href="team-detail.html?id=${team.id}" class="btn btn-primary btn-sm">View Team</a>
  `;
  
  return card;
}

// Function to check if user has permission to create teams
async function checkTeamCreationPermission() {
  try {
    const response = await fetch('/api/user/permissions', {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch user permissions');
    }
    
    const permissions = await response.json();
    
    // Show create team button if user has permission
    if (permissions.canCreateTeam) {
      const createTeamBtn = document.getElementById('create-team-btn');
      if (createTeamBtn) {
        createTeamBtn.style.display = 'block';
        
        // Add event listener for create team button
        createTeamBtn.addEventListener('click', function() {
          window.location.href = 'team-form.html';
        });
      }
    }
  } catch (error) {
    console.error('Error checking team creation permission:', error);
  }
}