// dash.js - Simplified version without team invitations
document.addEventListener('DOMContentLoaded', function() {
  // Check if user is authenticated, redirect to login if not
  window.authUtils.checkAuth(true);
  
  // Set up logout functionality
  window.authUtils.setupLogoutButton();
  
  // Cache DOM elements for better performance
  const elements = {
    // Dashboard cards
    characterCard: document.getElementById('characters-card'),
    gamesCard: document.getElementById('games-card'),
    teamCard: document.getElementById('team-card'),
    messagesCard: document.getElementById('messages-card'),
    
    // Other elements
    recentActivityList: document.getElementById('recent-activity-list'),
    messageBadge: document.getElementById('message-badge'),
    manageTeamLink: document.getElementById('manage-team-link'),
    teamDetailsLink: document.getElementById('team-details-link'),
    // Remove team invites section references
    createTeamBtn: document.getElementById('create-team-btn')
  };
  
  // Initialize data - using Promise.all for parallel loading
  Promise.all([
    loadData('my-characters', updateCharactersCard),
    loadData('upcoming-games?limit=2', updateGamesCard),
    loadData('my-team', updateTeamCard),
    loadData('unread-messages', updateMessagesCard),
    // Remove loadTeamInvitations()
    checkTeamCreationPermission()
  ]).catch(err => {
    console.error('Error initializing dashboard:', err);
  });
  
  // Set up event listeners
  setupEventListeners();
  
  // Generic data loading function to reduce code duplication
  async function loadData(endpoint, updateFunction) {
    try {
      const response = await fetch(`/api/${endpoint}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch ${endpoint}: ${response.status}`);
      }
      
      const data = await response.json();
      updateFunction(data);
      return data;
    } catch (error) {
      console.error(`Error loading ${endpoint}:`, error);
      displayError(endpoint.split('?')[0].replace('-', '_'), error.message);
      return null;
    }
  }
  
  // Update functions for each component
  function updateCharactersCard(characters) {
    if (!elements.characterCard) return;
    
    // Clear previous content, preserving heading
    const heading = document.createElement('h4');
    heading.textContent = 'My Characters';
    elements.characterCard.innerHTML = '';
    elements.characterCard.appendChild(heading);
    
    if (characters && characters.length > 0) {
      const activeChar = characters.find(char => char.is_active);
      
      // Create elements once rather than multiple innerHTML operations
      createAndAppendElement('p', elements.characterCard, 
        `You have <span class="accent-text">${characters.length}</span> character${characters.length !== 1 ? 's' : ''}`);
      
      if (activeChar) {
        createAndAppendElement('p', elements.characterCard, 
          `Active: <span class="accent-text">${activeChar.name}</span> (${activeChar.position})`);
        
        if (activeChar.team_id) {
          createAndAppendElement('p', elements.characterCard, 
            `Team: <span class="accent-text">${activeChar.team_name || 'Unknown'}</span>`);
        } else {
          createAndAppendElement('p', elements.characterCard, 
            '<span class="accent-text">Not on a team</span>');
        }
      } else {
        createAndAppendElement('p', elements.characterCard, 
          '<span class="accent-text">No active character</span>');
      }
    } else {
      createAndAppendElement('p', elements.characterCard, 'You haven\'t created any characters yet.');
      createAndAppendElement('p', elements.characterCard, 'Create your first character to get started!');
    }
    
    const link = createAndAppendElement('a', elements.characterCard);
    link.href = 'my-characters.html';
    link.textContent = 'Manage Characters →';
  }
  
  function updateGamesCard(games) {
    if (!elements.gamesCard) return;
    
    // Clear previous content, preserving heading
    const heading = document.createElement('h4');
    heading.textContent = 'Upcoming Games';
    elements.gamesCard.innerHTML = '';
    elements.gamesCard.appendChild(heading);
    
    if (games && games.length > 0) {
      games.forEach(game => {
        const gameDate = new Date(game.date);
        
        // Format the date - use Intl for better localization
        const formattedDate = new Intl.DateTimeFormat('en-US', {
          weekday: 'short', 
          month: 'short', 
          day: 'numeric', 
          hour: 'numeric', 
          minute: '2-digit'
        }).format(gameDate);
        
        createAndAppendElement('p', elements.gamesCard, 
          `<span class="accent-text">${game.home_team_name}</span> vs <span class="accent-text">${game.away_team_name}</span>`);
        
        createAndAppendElement('p', elements.gamesCard, formattedDate);
      });
    } else {
      createAndAppendElement('p', elements.gamesCard, 'No upcoming games scheduled.');
      createAndAppendElement('p', elements.gamesCard, 'Check back later for updates.');
    }
    
    const link = createAndAppendElement('a', elements.gamesCard);
    link.href = '#';
    link.textContent = 'View Schedule →';
  }
  
  function updateTeamCard(team) {
    if (!elements.teamCard) return;
    
    // Clear previous content, preserving heading
    const heading = document.createElement('h4');
    heading.textContent = 'My Team';
    elements.teamCard.innerHTML = '';
    elements.teamCard.appendChild(heading);
    
    if (team) {
      createAndAppendElement('p', elements.teamCard, 
        `<span class="accent-text">${team.name}</span>`);
      
      createAndAppendElement('p', elements.teamCard, 
        `Record: <span class="accent-text">${team.record || '0-0-0'}</span>`);
      
      const link = createAndAppendElement('a', elements.teamCard);
      link.href = `team-detail.html?id=${team.id}`;
      link.id = 'team-details-link';
      link.textContent = 'Team Details →';
      
      // Check if user can manage this team
      checkTeamManagementPermission(team.id);
    } else {
      createAndAppendElement('p', elements.teamCard, 'You\'re not on a team yet.');
      createAndAppendElement('p', elements.teamCard, 'Join a team by selecting one in the character editor!');
      
      const link = createAndAppendElement('a', elements.teamCard);
      link.href = 'teams.html';
      link.textContent = 'Browse Teams →';
    }
  }
  
  function updateMessagesCard(data) {
    if (!elements.messagesCard) return;
    
    // Clear previous content, preserving heading
    const heading = document.createElement('h4');
    heading.textContent = 'Messages';
    elements.messagesCard.innerHTML = '';
    elements.messagesCard.appendChild(heading);
    
    const count = data?.count || 0;
    
    createAndAppendElement('p', elements.messagesCard, 
      `You have <span class="accent-text">${count}</span> unread message${count !== 1 ? 's' : ''}`);
    
    const link = createAndAppendElement('a', elements.messagesCard);
    link.href = 'messages.html';
    link.textContent = 'View Messages →';
    
    // Update badge in sidebar
    if (elements.messageBadge) {
      elements.messageBadge.textContent = count;
      elements.messageBadge.style.display = count > 0 ? 'inline-block' : 'none';
    }
  }
  
  // Removed all team invitations related functions
  
  // Check if user has permission to manage their team
  async function checkTeamManagementPermission(teamId) {
    try {
      const response = await fetch(`/api/teams/${teamId}/permissions`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch team permissions');
      }
      
      const permissions = await response.json();
      
      // Show manage team link if user can manage the team
      if (permissions.canManageTeam && elements.manageTeamLink) {
        elements.manageTeamLink.href = `team-management.html?id=${teamId}`;
        elements.manageTeamLink.style.display = 'block';
      }
    } catch (error) {
      console.error('Error checking team permissions:', error);
    }
  }
  
  // Check if user has permission to create teams
  async function checkTeamCreationPermission() {
    try {
      const response = await fetch('/api/user/permissions', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch user permissions');
      }
      
      const permissions = await response.json();
      
      // Show create team button if user has permission
      if (permissions.canCreateTeam && elements.createTeamBtn) {
        elements.createTeamBtn.style.display = 'inline-block';
      }
    } catch (error) {
      console.error('Error checking user permissions:', error);
    }
  }
  
  // Function to display error messages
  function displayError(cardId, message = 'Please try again later') {
    const card = document.getElementById(`${cardId}-card`);
    if (!card) return;
    
    // Keep the heading if it exists
    const heading = card.querySelector('h4');
    card.innerHTML = '';
    
    if (heading) {
      card.appendChild(heading);
    } else {
      const newHeading = document.createElement('h4');
      newHeading.textContent = cardId.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()); // Convert id to title case
      card.appendChild(newHeading);
    }
    
    createAndAppendElement('p', card, 
      `<span class="accent-text">Error loading data</span>`);
    
    createAndAppendElement('p', card, message);
  }
  
  // Helper function to create and append elements
  function createAndAppendElement(type, parent, html) {
    const element = document.createElement(type);
    if (html) element.innerHTML = html;
    parent.appendChild(element);
    return element;
  }
  
  // Helper function to show toast messages
  function showToast(message, duration = 3000) {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      toastContainer.style.position = 'fixed';
      toastContainer.style.bottom = '20px';
      toastContainer.style.right = '20px';
      toastContainer.style.zIndex = '1000';
      document.body.appendChild(toastContainer);
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.style.backgroundColor = 'rgba(50, 50, 50, 0.9)';
    toast.style.color = 'white';
    toast.style.padding = '12px 20px';
    toast.style.borderRadius = '4px';
    toast.style.marginTop = '10px';
    toast.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    
    // Add to container
    toastContainer.appendChild(toast);
    
    // Show toast
    setTimeout(() => {
      toast.style.opacity = '1';
    }, 10);
    
    // Hide and remove after duration
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, duration);
  }
  
  // Set up event listeners for the page
  function setupEventListeners() {
    // Add event listener for create team button if it exists
    if (elements.createTeamBtn) {
      elements.createTeamBtn.addEventListener('click', () => {
        window.location.href = 'team-form.html';
      });
    }
    
    // Add event listener for recent activity refresh
    loadRecentActivity();
  }
  
  // Function to load recent activity
  function loadRecentActivity() {
    // For this example, this is still static data
    // In a real app, you would fetch this from an API endpoint
    if (!elements.recentActivityList) return;
    
    // Clear the list
    elements.recentActivityList.innerHTML = '';
    
    const activities = [
      { text: 'Toronto vs Vancouver (4-2)', link: '#game-4', time: 'Today' },
      { text: 'Mark Stevens scored 2 goals', link: '#player-stats-1', time: 'Yesterday' },
      { text: 'Team practice scheduled', link: '#events', time: '3 days ago' }
    ];
    
    // Create activity items using document fragment
    const fragment = document.createDocumentFragment();
    
    activities.forEach(activity => {
      const activityItem = document.createElement('div');
      activityItem.className = 'activity-item';
      
      activityItem.innerHTML = `
        <a href="${activity.link}">${activity.text}</a>
        <span class="activity-time">${activity.time}</span>
      `;
      
      fragment.appendChild(activityItem);
    });
    
    elements.recentActivityList.appendChild(fragment);
  }
});