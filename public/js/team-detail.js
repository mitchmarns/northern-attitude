// team-detail.js - Client-side functionality for team detail view

document.addEventListener('DOMContentLoaded', function() {
  // Check if user is authenticated, redirect to login if not
  window.authUtils.checkAuth(true);
  
  // Set up logout functionality
  window.authUtils.setupLogoutButton();
  
  // Get team ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const teamId = urlParams.get('id');
  
  if (!teamId) {
    // No team ID provided, redirect to teams list
    window.location.href = 'teams.html';
    return;
  }
  
  // Load team data
  loadTeamData(teamId);
  
  // Load team roster
  loadTeamRoster(teamId);
  
  // Check if user is on this team and set up appropriate UI
  checkUserTeamStatus(teamId);
  
  // Set up join/leave team functionality
  document.getElementById('join-team-btn')?.addEventListener('click', function() {
    joinTeam(teamId);
  });
  
  document.getElementById('leave-team-btn')?.addEventListener('click', function() {
    showLeaveConfirmation(teamId);
  });
  
  // Set up modal close functionality
  document.getElementById('cancel-leave')?.addEventListener('click', hideLeaveModal);
  
  document.getElementById('confirm-leave')?.addEventListener('click', function() {
    leaveTeam(teamId);
  });
  
  // Close modal when clicking outside of it
  const leaveModal = document.getElementById('leave-modal');
  if (leaveModal) {
    leaveModal.addEventListener('click', function(e) {
      if (e.target === this) {
        hideLeaveModal();
      }
    });
  }
});

// Function to load team data
async function loadTeamData(teamId) {
  try {
    const response = await fetch(`/api/teams/${teamId}`, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch team data');
    }
    
    const team = await response.json();
    displayTeamData(team);
    
    // Update page title
    document.title = `${team.name} | Northern Attitude`;
  } catch (error) {
    console.error('Error loading team data:', error);
    const errorMessage = document.getElementById('team-detail-error');
    errorMessage.textContent = 'Failed to load team data. Please try again later.';
    errorMessage.style.display = 'block';
  }
}

// Function to display team data
function displayTeamData(team) {
  // Set team name in header
  const teamNameElement = document.getElementById('team-name');
  if (teamNameElement) {
    teamNameElement.textContent = team.name;
  }
  
  // Set team details
  const teamLogoElement = document.getElementById('team-logo');
  if (teamLogoElement) {
    teamLogoElement.src = team.logo_url || '/api/placeholder/150/150';
    teamLogoElement.alt = `${team.name} logo`;
  }
  
  const teamRecordElement = document.getElementById('team-record');
  if (teamRecordElement) {
    teamRecordElement.textContent = team.record || '0-0-0';
  }
  
  // Set team description
  const teamDescriptionElement = document.getElementById('team-description');
  if (teamDescriptionElement) {
    teamDescriptionElement.textContent = team.description || 'No team description available.';
  }
  
  // Display owner information if available
  if (team.owner) {
    const ownerElement = document.getElementById('team-owner');
    if (ownerElement) {
      ownerElement.textContent = team.owner.username;
    }
  }
  
  // Display team staff
  if (team.staff && team.staff.length > 0) {
    const staffContainer = document.getElementById('team-staff');
    if (staffContainer) {
      staffContainer.innerHTML = '';
      
      team.staff.forEach(staffMember => {
        const staffItem = document.createElement('div');
        staffItem.className = 'staff-item';
        staffItem.innerHTML = `
          <span class="staff-name">${staffMember.username}</span>
          <span class="staff-role">${staffMember.role}</span>
        `;
        staffContainer.appendChild(staffItem);
      });
    }
  } else {
    const staffContainer = document.getElementById('team-staff');
    if (staffContainer) {
      staffContainer.innerHTML = '<p>No staff members assigned to this team.</p>';
    }
  }
  
  // Display additional team stats if available
  if (team.stats) {
    const statsContainer = document.getElementById('team-stats');
    if (statsContainer) {
      statsContainer.innerHTML = `
        <div class="stat-item">
          <span class="stat-label">Games Played</span>
          <span class="stat-value">${team.stats.games_played || 0}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Wins</span>
          <span class="stat-value">${team.stats.wins || 0}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Losses</span>
          <span class="stat-value">${team.stats.losses || 0}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Ties</span>
          <span class="stat-value">${team.stats.ties || 0}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Goals For</span>
          <span class="stat-value">${team.stats.goals_for || 0}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Goals Against</span>
          <span class="stat-value">${team.stats.goals_against || 0}</span>
        </div>
      `;
    }
  }
}

// Function to load team roster
async function loadTeamRoster(teamId) {
  try {
    const response = await fetch(`/api/teams/${teamId}/roster`, {
      method: 'GET',
      credentials: 'include'
    });
    
    console.log('Roster Response Status:', response.status);
    
    if (!response.ok) {
      throw new Error('Failed to fetch team roster');
    }
    
    const roster = await response.json();
    
    // Add detailed logging
    console.log('Roster Raw Data:', roster);
    console.log('Roster Length:', roster.length);
    
    if (roster.length === 0) {
      console.log('Roster is empty');
    }
    
    displayTeamRoster(roster);
  } catch (error) {
    console.error('Error loading team roster:', error);
    const rosterContainer = document.getElementById('team-roster');
    if (rosterContainer) {
      rosterContainer.innerHTML = `<p>Failed to load team roster: ${error.message}</p>`;
    }
  }
}

// Function to display team roster
function displayTeamRoster(roster) {
  const rosterContainer = document.getElementById('team-roster');
  if (!rosterContainer) return;
  
  // Clear container
  rosterContainer.innerHTML = '';
  
  if (roster.length === 0) {
    rosterContainer.innerHTML = '<p>No players on this team yet.</p>';
    return;
  }
  
  // Create roster table
  const table = document.createElement('table');
  table.className = 'roster-table';
  
  // Create table header
  const thead = document.createElement('thead');
  thead.innerHTML = `
    <tr>
      <th>Player</th>
      <th>Position</th>
      <th>Games</th>
      <th>Goals</th>
      <th>Assists</th>
      <th>Points</th>
      <th>+/-</th>
    </tr>
  `;
  table.appendChild(thead);
  
  // Create table body
  const tbody = document.createElement('tbody');
  
  roster.forEach(player => {
    // Safely parse stats
    let stats = {};
    try {
      stats = JSON.parse(player.stats_json);
    } catch (error) {
      console.error('Error parsing stats for player:', player.character_name, error);
      stats = {};
    }
    
    // Calculate points
    const points = (stats.goals || 0) + (stats.assists || 0);
    
    const playerRow = document.createElement('tr');
    playerRow.innerHTML = `
      <td>
        <div class="player-info">
          <img src="${player.avatar_url || '/api/placeholder/50/50'}" alt="${player.character_name}" class="player-avatar">
          <a href="character-profile.html?id=${player.character_id}" class="player-name">${player.character_name}</a>
        </div>
      </td>
      <td>${player.position}</td>
      <td>${stats.games || 0}</td>
      <td>${stats.goals || 0}</td>
      <td>${stats.assists || 0}</td>
      <td>${points}</td>
      <td>${stats.plus_minus || 0}</td>
    `;
    
    tbody.appendChild(playerRow);
  });
  
  table.appendChild(tbody);
  rosterContainer.appendChild(table);
}

// Function to check if user is on this team
async function checkUserTeamStatus(teamId) {
  try {
    const response = await fetch(`/api/user/team-status/${teamId}`, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch user team status');
    }
    
    const { isOnTeam, isOwner, isStaff } = await response.json();
    
    // Show/hide buttons based on user status
    const joinTeamBtn = document.getElementById('join-team-btn');
    const leaveTeamBtn = document.getElementById('leave-team-btn');
    const manageTeamBtn = document.getElementById('manage-team-btn');
    
    if (joinTeamBtn) {
      joinTeamBtn.style.display = isOnTeam ? 'none' : 'inline-block';
    }
    
    if (leaveTeamBtn) {
      leaveTeamBtn.style.display = (isOnTeam && !isOwner) ? 'inline-block' : 'none';
    }
    
    if (manageTeamBtn) {
      manageTeamBtn.style.display = (isOwner || isStaff) ? 'inline-block' : 'none';
      
      // Set up event listener for manage team button
      if (isOwner || isStaff) {
        manageTeamBtn.addEventListener('click', function() {
          window.location.href = `team-management.html?id=${teamId}`;
        });
      }
    }
  } catch (error) {
    console.error('Error checking user team status:', error);
  }
}

// Function to join a team
async function joinTeam(teamId) {
  try {
    const response = await fetch(`/api/teams/${teamId}/join`, {
      method: 'POST',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to join team');
    }
    
    // Show success message
    const successMessage = document.getElementById('team-detail-success');
    successMessage.textContent = 'Successfully joined team!';
    successMessage.style.display = 'block';
    
    // Update UI after join
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  } catch (error) {
    console.error('Error joining team:', error);
    
    // Show error message
    const errorMessage = document.getElementById('team-detail-error');
    errorMessage.textContent = 'Failed to join team. Please try again later.';
    errorMessage.style.display = 'block';
  }
}

// Function to show leave team confirmation modal
function showLeaveConfirmation(teamId) {
  const leaveModal = document.getElementById('leave-modal');
  if (leaveModal) {
    leaveModal.style.display = 'flex';
  }
}

// Function to hide leave team confirmation modal
function hideLeaveModal() {
  const leaveModal = document.getElementById('leave-modal');
  if (leaveModal) {
    leaveModal.style.display = 'none';
  }
}

// Function to leave a team
async function leaveTeam(teamId) {
  try {
    const response = await fetch(`/api/teams/${teamId}/leave`, {
      method: 'POST',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to leave team');
    }
    
    // Hide modal
    hideLeaveModal();
    
    // Show success message
    const successMessage = document.getElementById('team-detail-success');
    successMessage.textContent = 'Successfully left team!';
    successMessage.style.display = 'block';
    
    // Update UI after leave
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  } catch (error) {
    console.error('Error leaving team:', error);
    
    // Hide modal
    hideLeaveModal();
    
    // Show error message
    const errorMessage = document.getElementById('team-detail-error');
    errorMessage.textContent = 'Failed to leave team. Please try again later.';
    errorMessage.style.display = 'block';
  }
}