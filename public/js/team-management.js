// team-management.js - Client-side functionality for team management

document.addEventListener('DOMContentLoaded', function() {
  // Check if user is authenticated
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
  
  // Set up back button
  const backBtn = document.getElementById('back-to-team');
  if (backBtn) {
    backBtn.href = `team-detail.html?id=${teamId}`;
  }
  
  // Check if user has permission to manage this team
  checkTeamPermissions(teamId);
  
  // Load team data
  loadTeamData(teamId);
  
  // Load team roster
  loadTeamRoster(teamId);
  
  // Load staff members
  loadTeamStaff(teamId);
  
  // Load join requests
  loadJoinRequests(teamId);
  
  // Set up form submissions
  setupFormSubmissions(teamId);
  
  // Set up modal functionality
  setupModals(teamId);
});

// Function to check if user has permission to manage this team
async function checkTeamPermissions(teamId) {
  try {
    const response = await fetch(`/api/teams/${teamId}/permissions`, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch permissions');
    }
    
    const permissions = await response.json();
    
    if (!permissions.canManageTeam) {
      // Redirect to team detail if user can't manage this team
      window.location.href = `team-detail.html?id=${teamId}`;
      return;
    }
  } catch (error) {
    console.error('Error checking permissions:', error);
    window.location.href = `team-detail.html?id=${teamId}`;
  }
}

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
    
    // Set team name in header and delete confirmation
    const teamNameElement = document.getElementById('team-name');
    if (teamNameElement) {
      teamNameElement.textContent = team.name;
    }
    
    // Populate settings form
    populateSettingsForm(team);
    
    // Update page title
    document.title = `Manage ${team.name} | Northern Attitude`;
  } catch (error) {
    console.error('Error loading team data:', error);
    const errorMessage = document.getElementById('team-management-error');
    errorMessage.textContent = 'Failed to load team data. Please try again later.';
    errorMessage.style.display = 'block';
  }
}

// Function to populate settings form with team data
function populateSettingsForm(team) {
  document.getElementById('settings-team-name').value = team.name;
  document.getElementById('settings-team-description').value = team.description || '';
  
  // Set team colors
  if (team.primary_color) {
    document.getElementById('settings-primary-color').value = team.primary_color;
    document.getElementById('settings-primary-color-preview').style.backgroundColor = team.primary_color;
  }
  
  if (team.secondary_color) {
    document.getElementById('settings-secondary-color').value = team.secondary_color;
    document.getElementById('settings-secondary-color-preview').style.backgroundColor = team.secondary_color;
  }
  
  // Set logo preview
  if (team.logo_url) {
    document.getElementById('settings-logo-preview').src = team.logo_url;
  }
}

// Function to load team roster
async function loadTeamRoster(teamId) {
  try {
    const response = await fetch(`/api/teams/${teamId}/roster`, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch team roster');
    }
    
    const roster = await response.json();
    displayTeamRoster(roster, teamId);
  } catch (error) {
    console.error('Error loading team roster:', error);
    const rosterContainer = document.getElementById('team-roster');
    if (rosterContainer) {
      rosterContainer.innerHTML = '<p>Failed to load team roster. Please try again later.</p>';
    }
  }
}

// Function to display team roster
function displayTeamRoster(roster, teamId) {
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
      <th>Character</th>
      <th>Actions</th>
    </tr>
  `;
  table.appendChild(thead);
  
  // Create table body
  const tbody = document.createElement('tbody');
  
  // Add players
  roster.forEach(player => {
    const playerRow = document.createElement('tr');
    playerRow.innerHTML = `
      <td>${player.username}</td>
      <td>${getFullPosition(player.position)}</td>
      <td>
        <a href="character-profile.html?id=${player.character_id}" class="player-name">${player.character_name}</a>
      </td>
      <td>
        <div class="player-actions">
          <button class="btn btn-danger btn-xs remove-player-btn" data-player-id="${player.character_id}" data-player-name="${player.character_name}">Remove</button>
        </div>
      </td>
    `;
    tbody.appendChild(playerRow);
  });
  
  table.appendChild(tbody);
  rosterContainer.appendChild(table);
  
  // Add event listeners for remove buttons
  document.querySelectorAll('.remove-player-btn').forEach(button => {
    button.addEventListener('click', function() {
      const playerId = this.getAttribute('data-player-id');
      const playerName = this.getAttribute('data-player-name');
      showRemovePlayerModal(playerId, playerName, teamId);
    });
  });
}

// Function to load team staff
async function loadTeamStaff(teamId) {
  try {
    const response = await fetch(`/api/teams/${teamId}/staff`, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch team staff');
    }
    
    const staff = await response.json();
    displayTeamStaff(staff, teamId);
  } catch (error) {
    console.error('Error loading team staff:', error);
    const staffContainer = document.getElementById('staff-list');
    if (staffContainer) {
      staffContainer.innerHTML = '<p>Failed to load team staff. Please try again later.</p>';
    }
  }
}

// Function to display team staff
function displayTeamStaff(staff, teamId) {
  const staffContainer = document.getElementById('staff-list');
  if (!staffContainer) return;
  
  // Clear container
  staffContainer.innerHTML = '';
  
  if (staff.length === 0) {
    staffContainer.innerHTML = '<p>No staff members assigned to this team.</p>';
    return;
  }
  
  // Add each staff member
  staff.forEach(member => {
    const staffItem = document.createElement('div');
    staffItem.className = 'staff-item';
    
    staffItem.innerHTML = `
      <div class="staff-info">
        <div class="staff-avatar">
          <img src="${member.avatar_url || '/api/placeholder/30/30'}" alt="${member.username}">
        </div>
        <span class="staff-name">${member.username}</span>
        <span class="staff-role">${member.role}</span>
      </div>
      <div class="staff-actions">
        <button class="btn btn-danger btn-xs remove-staff-btn" data-staff-id="${member.id}" data-staff-name="${member.username}">Remove</button>
      </div>
    `;
    
    staffContainer.appendChild(staffItem);
  });
  
  // Add event listeners for remove buttons
  document.querySelectorAll('.remove-staff-btn').forEach(button => {
    button.addEventListener('click', function() {
      const staffId = this.getAttribute('data-staff-id');
      const staffName = this.getAttribute('data-staff-name');
      showRemoveStaffModal(staffId, staffName, teamId);
    });
  });
}

// Function to load join requests
async function loadJoinRequests(teamId) {
  try {
    const response = await fetch(`/api/teams/${teamId}/join-requests`, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch join requests');
    }
    
    const requests = await response.json();
    displayJoinRequests(requests, teamId);
  } catch (error) {
    console.error('Error loading join requests:', error);
    const requestsContainer = document.getElementById('join-requests');
    if (requestsContainer) {
      requestsContainer.innerHTML = '<p>Failed to load join requests. Please try again later.</p>';
    }
  }
}

// Function to display join requests
function displayJoinRequests(requests, teamId) {
  const requestsContainer = document.getElementById('join-requests');
  if (!requestsContainer) return;
  
  // Clear container
  requestsContainer.innerHTML = '';
  
  if (requests.length === 0) {
    requestsContainer.innerHTML = '<p>No pending join requests.</p>';
    return;
  }
  
  // Add each request
  requests.forEach(request => {
    const requestItem = document.createElement('div');
    requestItem.className = 'request-item';
    
    requestItem.innerHTML = `
      <div class="request-user">
        <div class="user-avatar">
          <img src="${request.avatar_url || '/api/placeholder/30/30'}" alt="${request.username}">
        </div>
        <span>${request.username}</span>
      </div>
      <div class="request-actions">
        <button class="btn btn-primary btn-xs approve-request-btn" data-request-id="${request.id}">Approve</button>
        <button class="btn btn-danger btn-xs reject-request-btn" data-request-id="${request.id}">Reject</button>
      </div>
    `;
    
    requestsContainer.appendChild(requestItem);
  });
  
  // Add event listeners for request buttons
  document.querySelectorAll('.approve-request-btn').forEach(button => {
    button.addEventListener('click', function() {
      const requestId = this.getAttribute('data-request-id');
      approveJoinRequest(requestId, teamId);
    });
  });
  
  document.querySelectorAll('.reject-request-btn').forEach(button => {
    button.addEventListener('click', function() {
      const requestId = this.getAttribute('data-request-id');
      rejectJoinRequest(requestId, teamId);
    });
  });
}

// Function to set up form submissions
function setupFormSubmissions(teamId) {
  // Invite player form
  const invitePlayerForm = document.getElementById('invite-player-form');
  if (invitePlayerForm) {
    invitePlayerForm.addEventListener('submit', function(e) {
      e.preventDefault();
      invitePlayer(teamId);
    });
  }
  
  // Add staff form
  const addStaffForm = document.getElementById('add-staff-form');
  if (addStaffForm) {
    addStaffForm.addEventListener('submit', function(e) {
      e.preventDefault();
      addStaffMember(teamId);
    });
  }
  
  // Team settings form
  const teamSettingsForm = document.getElementById('team-settings-form');
  if (teamSettingsForm) {
    teamSettingsForm.addEventListener('submit', function(e) {
      e.preventDefault();
      updateTeamSettings(teamId);
    });
  }
  
  // Delete team button
  const deleteTeamBtn = document.getElementById('delete-team-btn');
  if (deleteTeamBtn) {
    deleteTeamBtn.addEventListener('click', function() {
      showDeleteTeamModal(teamId);
    });
  }
}

// Function to set up modal functionality
function setupModals(teamId) {
  // Remove player modal
  const removePlayerModal = document.getElementById('remove-player-modal');
  const cancelRemovePlayer = document.getElementById('cancel-remove-player');
  
  if (cancelRemovePlayer) {
    cancelRemovePlayer.addEventListener('click', hideRemovePlayerModal);
  }
  
  if (removePlayerModal) {
    removePlayerModal.addEventListener('click', function(e) {
      if (e.target === this) {
        hideRemovePlayerModal();
      }
    });
  }
  
  // Remove staff modal
  const removeStaffModal = document.getElementById('remove-staff-modal');
  const cancelRemoveStaff = document.getElementById('cancel-remove-staff');
  
  if (cancelRemoveStaff) {
    cancelRemoveStaff.addEventListener('click', hideRemoveStaffModal);
  }
  
  if (removeStaffModal) {
    removeStaffModal.addEventListener('click', function(e) {
      if (e.target === this) {
        hideRemoveStaffModal();
      }
    });
  }
  
  // Delete team modal
  const deleteTeamModal = document.getElementById('delete-team-modal');
  const cancelDeleteTeam = document.getElementById('cancel-delete-team');
  
  if (cancelDeleteTeam) {
    cancelDeleteTeam.addEventListener('click', hideDeleteTeamModal);
  }
  
  if (deleteTeamModal) {
    deleteTeamModal.addEventListener('click', function(e) {
      if (e.target === this) {
        hideDeleteTeamModal();
      }
    });
  }
  
  // Set up confirm delete team button
  const confirmDeleteTeam = document.getElementById('confirm-delete-team');
  if (confirmDeleteTeam) {
    confirmDeleteTeam.addEventListener('click', function() {
      deleteTeam(teamId);
    });
  }
}

// Function to invite a player to the team
async function invitePlayer(teamId) {
  try {
    const username = document.getElementById('invite-username').value.trim();
    
    if (!username) {
      return;
    }
    
    const response = await fetch(`/api/teams/${teamId}/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username }),
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to send invite');
    }
    
    // Show success message
    const successMessage = document.getElementById('team-management-success');
    successMessage.textContent = 'Invitation sent successfully!';
    successMessage.style.display = 'block';
    
    // Clear input
    document.getElementById('invite-username').value = '';
    
    // Refresh join requests
    setTimeout(() => {
      loadJoinRequests(teamId);
    }, 1000);
  } catch (error) {
    console.error('Error inviting player:', error);
    
    // Show error message
    const errorMessage = document.getElementById('team-management-error');
    errorMessage.textContent = 'Failed to send invitation. Please try again later.';
    errorMessage.style.display = 'block';
  }
}

// Function to add a staff member
async function addStaffMember(teamId) {
  try {
    const username = document.getElementById('staff-username').value.trim();
    const role = document.getElementById('staff-role').value;
    
    if (!username || !role) {
      return;
    }
    
    const response = await fetch(`/api/teams/${teamId}/staff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, role }),
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to add staff member');
    }
    
    // Show success message
    const successMessage = document.getElementById('team-management-success');
    successMessage.textContent = 'Staff member added successfully!';
    successMessage.style.display = 'block';
    
    // Clear input
    document.getElementById('staff-username').value = '';
    
    // Refresh staff list
    setTimeout(() => {
      loadTeamStaff(teamId);
    }, 1000);
  } catch (error) {
    console.error('Error adding staff member:', error);
    
    // Show error message
    const errorMessage = document.getElementById('team-management-error');
    errorMessage.textContent = 'Failed to add staff member. Please try again later.';
    errorMessage.style.display = 'block';
  }
}

// Function to update team settings
async function updateTeamSettings(teamId) {
  try {
    const name = document.getElementById('settings-team-name').value.trim();
    const description = document.getElementById('settings-team-description').value.trim();
    const primaryColor = document.getElementById('settings-primary-color').value;
    const secondaryColor = document.getElementById('settings-secondary-color').value;
    const logoFile = document.getElementById('settings-logo-file').files[0];
    
    if (!name) {
      // Show error message
      const errorMessage = document.getElementById('team-management-error');
      errorMessage.textContent = 'Team name is required.';
      errorMessage.style.display = 'block';
      return;
    }
    
    // Show loading state
    const submitButton = document.querySelector('#team-settings-form button[type="submit"]');
    const originalButtonText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Saving...';
    
    // First, upload logo if provided
    let logoUrl = null;
    if (logoFile) {
      const formData = new FormData();
      formData.append('logo', logoFile);
      
      const logoResponse = await fetch('/api/upload/team-logo', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!logoResponse.ok) {
        throw new Error('Failed to upload team logo');
      }
      
      const logoData = await logoResponse.json();
      logoUrl = logoData.url;
    }
    
    // Prepare update data
    const updateData = {
      name,
      description,
      primary_color: primaryColor,
      secondary_color: secondaryColor
    };
    
    // Add logo URL if available
    if (logoUrl) {
      updateData.logo_url = logoUrl;
    }
    
    // Update team
    const response = await fetch(`/api/teams/${teamId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData),
      credentials: 'include'
    });
    
    // Reset button state
    submitButton.disabled = false;
    submitButton.textContent = originalButtonText;
    
    if (!response.ok) {
      throw new Error('Failed to update team settings');
    }
    
    // Show success message
    const successMessage = document.getElementById('team-management-success');
    successMessage.textContent = 'Team settings updated successfully!';
    successMessage.style.display = 'block';
    
    // Refresh team data
    setTimeout(() => {
      loadTeamData(teamId);
    }, 1000);
  } catch (error) {
    console.error('Error updating team settings:', error);
    
    // Reset button state
    const submitButton = document.querySelector('#team-settings-form button[type="submit"]');
    submitButton.disabled = false;
    submitButton.textContent = 'Save Settings';
    
    // Show error message
    const errorMessage = document.getElementById('team-management-error');
    errorMessage.textContent = 'Failed to update team settings. Please try again later.';
    errorMessage.style.display = 'block';
  }
}

// Function to approve a join request
async function approveJoinRequest(requestId, teamId) {
  try {
    const response = await fetch(`/api/teams/join-requests/${requestId}/approve`, {
      method: 'POST',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to approve join request');
    }
    
    // Show success message
    const successMessage = document.getElementById('team-management-success');
    successMessage.textContent = 'Join request approved!';
    successMessage.style.display = 'block';
    
    // Refresh join requests and roster
    setTimeout(() => {
      loadJoinRequests(teamId);
      loadTeamRoster(teamId);
    }, 1000);
  } catch (error) {
    console.error('Error approving join request:', error);
    
    // Show error message
    const errorMessage = document.getElementById('team-management-error');
    errorMessage.textContent = 'Failed to approve join request. Please try again later.';
    errorMessage.style.display = 'block';
  }
}

// Function to reject a join request
async function rejectJoinRequest(requestId, teamId) {
  try {
    const response = await fetch(`/api/teams/join-requests/${requestId}/reject`, {
      method: 'POST',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to reject join request');
    }
    
    // Show success message
    const successMessage = document.getElementById('team-management-success');
    successMessage.textContent = 'Join request rejected.';
    successMessage.style.display = 'block';
    
    // Refresh join requests
    setTimeout(() => {
      loadJoinRequests(teamId);
    }, 1000);
  } catch (error) {
    console.error('Error rejecting join request:', error);
    
    // Show error message
    const errorMessage = document.getElementById('team-management-error');
    errorMessage.textContent = 'Failed to reject join request. Please try again later.';
    errorMessage.style.display = 'block';
  }
}

// Function to show remove player modal
function showRemovePlayerModal(playerId, playerName, teamId) {
  const modal = document.getElementById('remove-player-modal');
  const message = modal.querySelector('.modal-message');
  
  // Update message
  message.textContent = `Are you sure you want to remove ${playerName} from the team?`;
  
  // Store player ID on confirm button
  const confirmButton = document.getElementById('confirm-remove-player');
  confirmButton.setAttribute('data-player-id', playerId);
  
  // Set up confirm button event listener
  confirmButton.onclick = function() {
    removePlayer(playerId, teamId);
  };
  
  // Show modal
  modal.style.display = 'flex';
}

// Function to hide remove player modal
function hideRemovePlayerModal() {
  const modal = document.getElementById('remove-player-modal');
  modal.style.display = 'none';
}

// Function to remove a player from the team
async function removePlayer(playerId, teamId) {
  try {
    const response = await fetch(`/api/teams/${teamId}/players/${playerId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to remove player');
    }
    
    // Hide modal
    hideRemovePlayerModal();
    
    // Show success message
    const successMessage = document.getElementById('team-management-success');
    successMessage.textContent = 'Player removed successfully.';
    successMessage.style.display = 'block';
    
    // Refresh roster
    setTimeout(() => {
      loadTeamRoster(teamId);
    }, 1000);
  } catch (error) {
    console.error('Error removing player:', error);
    
    // Hide modal
    hideRemovePlayerModal();
    
    // Show error message
    const errorMessage = document.getElementById('team-management-error');
    errorMessage.textContent = 'Failed to remove player. Please try again later.';
    errorMessage.style.display = 'block';
  }
}

// Function to show remove staff modal
function showRemoveStaffModal(staffId, staffName, teamId) {
  const modal = document.getElementById('remove-staff-modal');
  const message = modal.querySelector('.modal-message');
  
  // Update message
  message.textContent = `Are you sure you want to remove ${staffName} from the team staff?`;
  
  // Store staff ID on confirm button
  const confirmButton = document.getElementById('confirm-remove-staff');
  confirmButton.setAttribute('data-staff-id', staffId);
  
  // Set up confirm button event listener
  confirmButton.onclick = function() {
    removeStaffMember(staffId, teamId);
  };
  
  // Show modal
  modal.style.display = 'flex';
}

// Function to hide remove staff modal
function hideRemoveStaffModal() {
  const modal = document.getElementById('remove-staff-modal');
  modal.style.display = 'none';
}

// Function to remove a staff member
async function removeStaffMember(staffId, teamId) {
  try {
    const response = await fetch(`/api/teams/${teamId}/staff/${staffId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to remove staff member');
    }
    
    // Hide modal
    hideRemoveStaffModal();
    
    // Show success message
    const successMessage = document.getElementById('team-management-success');
    successMessage.textContent = 'Staff member removed successfully.';
    successMessage.style.display = 'block';
    
    // Refresh staff list
    setTimeout(() => {
      loadTeamStaff(teamId);
    }, 1000);
  } catch (error) {
    console.error('Error removing staff member:', error);
    
    // Hide modal
    hideRemoveStaffModal();
    
    // Show error message
    const errorMessage = document.getElementById('team-management-error');
    errorMessage.textContent = 'Failed to remove staff member. Please try again later.';
    errorMessage.style.display = 'block';
  }
}

// Function to show delete team modal
function showDeleteTeamModal(teamId) {
  const modal = document.getElementById('delete-team-modal');
  document.getElementById('delete-confirm').value = '';
  document.getElementById('confirm-delete-team').disabled = true;
  
  // Show modal
  modal.style.display = 'flex';
}

// Function to hide delete team modal
function hideDeleteTeamModal() {
  const modal = document.getElementById('delete-team-modal');
  modal.style.display = 'none';
}

// Function to delete a team
async function deleteTeam(teamId) {
  try {
    const response = await fetch(`/api/teams/${teamId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete team');
    }
    
    // Hide modal
    hideDeleteTeamModal();
    
    // Show success message (briefly)
    const successMessage = document.getElementById('team-management-success');
    successMessage.textContent = 'Team deleted successfully. Redirecting to teams list...';
    successMessage.style.display = 'block';
    
    // Redirect to teams list
    setTimeout(() => {
      window.location.href = 'teams.html';
    }, 2000);
  } catch (error) {
    console.error('Error deleting team:', error);
    
    // Hide modal
    hideDeleteTeamModal();
    
    // Show error message
    const errorMessage = document.getElementById('team-management-error');
    errorMessage.textContent = 'Failed to delete team. Please try again later.';
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