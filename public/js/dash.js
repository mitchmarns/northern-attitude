// dash.js - Frontend JavaScript for hockey roleplay dashboard
document.addEventListener('DOMContentLoaded', function() {
  // Check if user is authenticated, redirect to login if not
  window.authUtils.checkAuth(true);
  
  // Set up logout functionality
  window.authUtils.setupLogoutButton();
  
  // Load all data for the dashboard
  loadMyCharacters();
  loadUpcomingGames();
  loadMyTeam();
  loadUnreadMessages();
  loadRecentActivity();
  loadTeamInvitations();
  checkTeamCreationPermission();
  
  // Add event listener for creating new teams
  const createTeamBtn = document.getElementById('create-team-btn');
  if (createTeamBtn) {
    createTeamBtn.addEventListener('click', function() {
      window.location.href = 'team-form.html';
    });
  }
});

// Function to load and display user's characters
function loadMyCharacters() {
  fetch('/api/my-characters', {
    credentials: 'include'
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`Failed to fetch characters data: ${response.status}`);
    }
    return response.json();
  })
  .then(characters => {
    const characterCard = document.getElementById('characters-card');
    if (characterCard) {
      // Clear previous content
      characterCard.innerHTML = '<h4>My Characters</h4>';
      
      if (characters.length > 0) {
        const activeChar = characters.find(char => char.is_active);
        
        // Add character count
        const countPara = document.createElement('p');
        countPara.innerHTML = `You have <span class="accent-text">${characters.length}</span> character${characters.length !== 1 ? 's' : ''}`;
        characterCard.appendChild(countPara);
        
        // Add active character info
        if (activeChar) {
          const activePara = document.createElement('p');
          activePara.innerHTML = `Active: <span class="accent-text">${activeChar.name}</span> (${activeChar.position})`;
          characterCard.appendChild(activePara);
          
          // Add team info if character is on a team
          if (activeChar.team_id) {
            const teamPara = document.createElement('p');
            teamPara.innerHTML = `Team: <span class="accent-text">${activeChar.team_name || 'Unknown'}</span>`;
            characterCard.appendChild(teamPara);
          } else {
            const teamPara = document.createElement('p');
            teamPara.innerHTML = '<span class="accent-text">Not on a team</span>';
            characterCard.appendChild(teamPara);
          }
        } else {
          const activePara = document.createElement('p');
          activePara.innerHTML = '<span class="accent-text">No active character</span>';
          characterCard.appendChild(activePara);
        }
      } else {
        const noPara = document.createElement('p');
        noPara.textContent = 'You haven\'t created any characters yet.';
        characterCard.appendChild(noPara);
        
        const createPara = document.createElement('p');
        createPara.textContent = 'Create your first character to get started!';
        characterCard.appendChild(createPara);
      }
      
      // Add link to manage characters
      const link = document.createElement('a');
      link.href = 'my-characters.html';
      link.textContent = 'Manage Characters →';
      characterCard.appendChild(link);
    }
  })
  .catch(error => {
    console.error('Error loading characters:', error);
    displayError('characters-card', 'Failed to load character data. Please try again later.');
  });
}

// Function to load and display upcoming games
function loadUpcomingGames() {
  fetch('/api/upcoming-games?limit=2', {
    credentials: 'include'
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to fetch upcoming games data');
    }
    return response.json();
  })
  .then(games => {
    const gamesCard = document.getElementById('games-card');
    if (gamesCard) {
      // Clear previous content
      gamesCard.innerHTML = '<h4>Upcoming Games</h4>';
      
      if (games.length > 0) {
        games.forEach(game => {
          const gameDate = new Date(game.date);
          
          // Format the date
          const options = { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' };
          const formattedDate = gameDate.toLocaleDateString('en-US', options);
          
          const matchPara = document.createElement('p');
          matchPara.innerHTML = `<span class="accent-text">${game.home_team_name}</span> vs <span class="accent-text">${game.away_team_name}</span>`;
          gamesCard.appendChild(matchPara);
          
          const datePara = document.createElement('p');
          datePara.textContent = formattedDate;
          gamesCard.appendChild(datePara);
        });
      } else {
        const noPara = document.createElement('p');
        noPara.textContent = 'No upcoming games scheduled.';
        gamesCard.appendChild(noPara);
        
        const checkPara = document.createElement('p');
        checkPara.textContent = 'Check back later for updates.';
        gamesCard.appendChild(checkPara);
      }
      
      // Add link to view schedule
      const link = document.createElement('a');
      link.href = '#';
      link.textContent = 'View Schedule →';
      gamesCard.appendChild(link);
    }
  })
  .catch(error => {
    console.error('Error loading upcoming games:', error);
    displayError('games-card', 'Failed to load game data.');
  });
}

// Function to load and display user's team
function loadMyTeam() {
  // First, get user's characters to find if any are on a team
  fetch('/api/my-characters', {
    credentials: 'include'
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to fetch characters data');
    }
    return response.json();
  })
  .then(characters => {
    // Find characters on a team
    const teamCharacters = characters.filter(char => char.team_id);
    
    if (teamCharacters.length > 0) {
      // Get first character's team
      const teamId = teamCharacters[0].team_id;
      
      // Now fetch team details
      return fetch(`/api/teams/${teamId}`, {
        method: 'GET', // Explicitly specify GET method
        credentials: 'include'
      })
      .then(response => {
        if (!response.ok) {
          // If fetching team details fails, return a fallback team object
          return {
            name: teamCharacters[0].team_name || 'My Team',
            record: '0-0-0',
            id: teamId
          };
        }
        return response.json();
      })
      .then(team => {
        updateTeamCard(team);
        setupTeamLinks(team.id);
        checkTeamManagementPermission(team.id);
        return team;
      });
    } else {
      // User doesn't have a character on a team
      updateTeamCard(null);
      return null;
    }
  })
  .catch(error => {
    console.error('Error loading team data:', error);
    displayError('team-card', 'Failed to load team data.');
    updateTeamCard(null); // Ensure team card is updated even on error
  });
}

// Function to update the team card with team data
function updateTeamCard(team) {
  const teamCard = document.getElementById('team-card');
  if (teamCard) {
    // Clear previous content
    teamCard.innerHTML = '<h4>My Team</h4>';
    
    if (team) {
      const namePara = document.createElement('p');
      namePara.innerHTML = `<span class="accent-text">${team.name}</span>`;
      teamCard.appendChild(namePara);
      
      const recordPara = document.createElement('p');
      recordPara.innerHTML = `Record: <span class="accent-text">${team.record || '0-0-0'}</span>`;
      teamCard.appendChild(recordPara);
      
      // Add link to team details
      const link = document.createElement('a');
      link.href = `team-detail.html?id=${team.id}`;
      link.id = 'team-details-link';
      link.textContent = 'Team Details →';
      teamCard.appendChild(link);
    } else {
      const noPara = document.createElement('p');
      noPara.textContent = 'You\'re not on a team yet.';
      teamCard.appendChild(noPara);
      
      const joinPara = document.createElement('p');
      joinPara.textContent = 'Join a team or create your own!';
      teamCard.appendChild(joinPara);
      
      // Add link to teams list
      const link = document.createElement('a');
      link.href = 'teams.html';
      link.textContent = 'Browse Teams →';
      teamCard.appendChild(link);
    }
  }
}

// Function to set up team-related links
function setupTeamLinks(teamId) {
  // Update team details link
  const teamDetailsLink = document.getElementById('team-details-link');
  if (teamDetailsLink) {
    teamDetailsLink.href = `team-detail.html?id=${teamId}`;
  }
}

// Function to check if user has permission to manage their team
function checkTeamManagementPermission(teamId) {
  fetch(`/api/teams/${teamId}/permissions`, {
    credentials: 'include'
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to fetch team permissions');
    }
    return response.json();
  })
  .then(permissions => {
    // Show manage team link if user can manage the team
    if (permissions.canManageTeam) {
      const manageTeamLink = document.getElementById('manage-team-link');
      if (manageTeamLink) {
        manageTeamLink.href = `team-management.html?id=${teamId}`;
        manageTeamLink.style.display = 'block';
      }
    }
  })
  .catch(error => {
    console.error('Error checking team permissions:', error);
  });
}

// Function to check if user has permission to create teams
function checkTeamCreationPermission() {
  fetch('/api/user/permissions', {
    credentials: 'include'
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to fetch user permissions');
    }
    return response.json();
  })
  .then(permissions => {
    // Show create team button if user has permission
    if (permissions.canCreateTeam) {
      const createTeamBtn = document.getElementById('create-team-btn');
      if (createTeamBtn) {
        createTeamBtn.style.display = 'inline-block';
      }
    }
  })
  .catch(error => {
    console.error('Error checking user permissions:', error);
  });
}

// Function to load team invitations
function loadTeamInvitations() {
  fetch('/api/user/team-invitations', {
    method: 'GET', // Explicitly specify GET method
    credentials: 'include',
    headers: {
      'Accept': 'application/json'
    }
  })
  .then(response => {
    // Log the full response for debugging
    console.log('Team Invitations Response:', response);
    
    if (!response.ok) {
      // Log detailed error info
      return response.text().then(errorText => {
        console.error('Error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      });
    }
    return response.json();
  })
  .then(data => {
    console.log('Team Invitations Data:', data);
    
    const invitations = data.invitations || [];
    const invitesSection = document.getElementById('team-invites-section');
    const invitesContainer = document.getElementById('team-invites-container');
    
    if (invitations.length > 0 && invitesSection && invitesContainer) {
      // Show section if there are invitations
      invitesSection.style.display = 'block';
      invitesContainer.innerHTML = '';
      
      // Create invitation cards
      invitations.forEach(invitation => {
        const inviteCard = document.createElement('div');
        inviteCard.className = 'invite-card';
        
        inviteCard.innerHTML = `
          <div class="invite-info">
            <h4>Invitation to join ${invitation.team_name}</h4>
            <p>You've been invited to join this team for character ${invitation.character_name}.</p>
          </div>
          <div class="invite-actions">
            <button class="btn btn-primary accept-invite" data-request-id="${invitation.id}">Accept</button>
            <button class="btn btn-secondary decline-invite" data-request-id="${invitation.id}">Decline</button>
          </div>
        `;
        
        invitesContainer.appendChild(inviteCard);
      });
      
      // Add event listeners for accept/decline buttons
      document.querySelectorAll('.accept-invite').forEach(button => {
        button.addEventListener('click', function() {
          const requestId = this.getAttribute('data-request-id');
          acceptTeamInvitation(requestId);
        });
      });
      
      document.querySelectorAll('.decline-invite').forEach(button => {
        button.addEventListener('click', function() {
          const requestId = this.getAttribute('data-request-id');
          declineTeamInvitation(requestId);
        });
      });
    } else if (invitesSection) {
      // Hide section if no invitations
      invitesSection.style.display = 'none';
    }
  })
  .catch(error => {
    console.error('Error loading team invitations:', error);
    
    // Optional: show user-friendly error message
    const invitesSection = document.getElementById('team-invites-section');
    if (invitesSection) {
      const errorMessage = document.createElement('p');
      errorMessage.textContent = 'Unable to load team invitations. Please try again later.';
      errorMessage.style.color = 'red';
      invitesSection.innerHTML = '';
      invitesSection.appendChild(errorMessage);
    }
  });
}

// Function to accept a team invitation
function acceptTeamInvitation(requestId) {
  fetch(`/api/teams/join-requests/${requestId}/approve`, {
    method: 'POST',
    credentials: 'include'
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to accept invitation');
    }
    return response.json();
  })
  .then(() => {
    // Reload dashboard data
    loadMyCharacters();
    loadMyTeam();
    loadTeamInvitations();
  })
  .catch(error => {
    console.error('Error accepting invitation:', error);
    alert('Failed to accept invitation. Please try again.');
  });
}

// Function to decline a team invitation
function declineTeamInvitation(requestId) {
  fetch(`/api/teams/join-requests/${requestId}/reject`, {
    method: 'POST',
    credentials: 'include'
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to decline invitation');
    }
    return response.json();
  })
  .then(() => {
    // Reload invitations
    loadTeamInvitations();
  })
  .catch(error => {
    console.error('Error declining invitation:', error);
    alert('Failed to decline invitation. Please try again.');
  });
}

// Function to load and display unread messages count
function loadUnreadMessages() {
  fetch('/api/unread-messages', {
    credentials: 'include'
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to fetch messages data');
    }
    return response.json();
  })
  .then(data => {
    const messagesCard = document.getElementById('messages-card');
    if (messagesCard) {
      // Clear previous content
      messagesCard.innerHTML = '<h4>Messages</h4>';
      
      const countPara = document.createElement('p');
      countPara.innerHTML = `You have <span class="accent-text">${data.count}</span> unread message${data.count !== 1 ? 's' : ''}`;
      messagesCard.appendChild(countPara);
      
      // Add link to view messages
      const link = document.createElement('a');
      link.href = '#';
      link.textContent = 'View Messages →';
      messagesCard.appendChild(link);
    }
    
    // Update message badge in sidebar
    const messageBadge = document.getElementById('message-badge');
    if (messageBadge && data.count > 0) {
      messageBadge.textContent = data.count;
      messageBadge.style.display = 'inline-block';
    } else if (messageBadge) {
      messageBadge.style.display = 'none';
    }
  })
  .catch(error => {
    console.error('Error loading messages:', error);
    displayError('messages-card', 'Failed to load message data.');
  });
}

// Function to load recent activity
function loadRecentActivity() {
  const activityList = document.getElementById('recent-activity-list');
  if (!activityList) return;
  
  // For demonstration purposes, using static data
  // In a real app, you would fetch this from an API endpoint
  const recentActivities = [
    {
      text: 'You created a new character',
      timestamp: 'Today',
      link: 'my-characters.html'
    },
    {
      text: 'Toronto played against Vancouver',
      timestamp: 'Yesterday',
      link: '#'
    },
    {
      text: 'Mark Stevens scored 2 goals',
      timestamp: '3 days ago',
      link: '#'
    },
    {
      text: 'Team practice scheduled',
      timestamp: '5 days ago',
      link: '#'
    }
  ];
  
  // Clear and update activity list
  activityList.innerHTML = '';
  
  if (recentActivities.length > 0) {
    recentActivities.forEach(activity => {
      const activityItem = document.createElement('div');
      activityItem.className = 'activity-item';
      
      activityItem.innerHTML = `
        <a href="${activity.link}">${activity.text}</a>
        <span class="activity-time">${activity.timestamp}</span>
      `;
      
      activityList.appendChild(activityItem);
    });
  } else {
    activityList.innerHTML = '<p>No recent activity</p>';
  }
}

// Function to display error messages
function displayError(elementId, message = 'Please try again later') {
  const element = document.getElementById(elementId);
  if (element) {
    // Keep the heading if it exists
    const heading = element.querySelector('h4');
    element.innerHTML = '';
    
    if (heading) {
      element.appendChild(heading);
    }
    
    const errorPara = document.createElement('p');
    errorPara.innerHTML = `<span class="accent-text">Error loading data</span>`;
    element.appendChild(errorPara);
    
    const messagePara = document.createElement('p');
    messagePara.textContent = message;
    element.appendChild(messagePara);
  }
}

// Add some CSS for the new elements
document.addEventListener('DOMContentLoaded', function() {
  const style = document.createElement('style');
  style.textContent = `
    .action-buttons {
      display: flex;
      gap: var(--spacing-sm);
    }
    
    .badge {
      display: none;
      background-color: var(--header);
      color: white;
      border-radius: 50%;
      padding: 2px 6px;
      font-size: 0.8rem;
      margin-left: 5px;
    }
    
    .activity-item {
      margin-bottom: 10px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding-bottom: 5px;
    }
    
    .activity-item a {
      display: block;
      color: var(--lighttext);
      text-decoration: none;
      transition: var(--transition-fast);
    }
    
    .activity-item a:hover {
      color: var(--header);
    }
    
    .activity-time {
      font-size: 0.8rem;
      color: rgba(255, 255, 255, 0.5);
    }
    
    .invite-card {
      background-color: rgba(0, 0, 0, 0.2);
      border-radius: 4px;
      padding: var(--spacing-sm);
      margin-bottom: var(--spacing-sm);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .invite-actions {
      display: flex;
      gap: 5px;
    }
    
    #team-invites-section {
      margin-top: var(--spacing-md);
    }
  `;
  document.head.appendChild(style);
});