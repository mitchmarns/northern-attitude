// main.js - Frontend JavaScript for hockey roleplay dashboard
document.addEventListener('DOMContentLoaded', function() {
  // Load all data for the dashboard
  loadMyCharacters();
  loadUpcomingGames();
  loadMyTeam();
  loadUnreadMessages();
  loadRecentActivity();
});

// Function to load and display user's characters
function loadMyCharacters() {
  fetch('/api/my-characters')
      .then(response => {
          if (!response.ok) {
              throw new Error(`Failed to fetch characters data: ${response.status}`);
          }
          return response.json();
      })
      .then(characters => {
          const characterCard = document.querySelector('.card:nth-child(1)');
          if (characterCard) {
              const paragraphs = characterCard.querySelectorAll('p');
              
              if (paragraphs.length >= 2) {
                  // Update character count
                  paragraphs[0].innerHTML = `You have <span class="accent-text">${characters.length}</span> active characters`;
                  
                  // Update latest character info
                  if (characters.length > 0) {
                      const latestChar = characters[0];
                      const positionInitial = latestChar.position.charAt(0);
                      paragraphs[1].innerHTML = `Latest character: <span class="accent-text">${latestChar.name} (${positionInitial})</span>`;
                  } else {
                      paragraphs[1].textContent = 'No characters created yet';
                  }
              }
          }
      })
      .catch(error => {
          console.error('Error loading characters:', error);
          displayError('characters', 'Failed to load character data. Please try again later.');
      });
}

// Function to load and display upcoming games
function loadUpcomingGames() {
  fetch('/api/upcoming-games?limit=1')
      .then(response => {
          if (!response.ok) {
              throw new Error('Failed to fetch upcoming games data');
          }
          return response.json();
      })
      .then(games => {
          const gamesCard = document.querySelector('.card:nth-child(2)');
          if (gamesCard) {
              const paragraphs = gamesCard.querySelectorAll('p');
              
              if (paragraphs.length >= 2) {
                  if (games.length > 0) {
                      const nextGame = games[0];
                      const gameDate = new Date(nextGame.date);
                      
                      // Format the date
                      const options = { weekday: 'long', hour: 'numeric', minute: 'numeric' };
                      const formattedDate = gameDate.toLocaleDateString('en-US', options);
                      
                      paragraphs[0].innerHTML = `<span class="accent-text">${nextGame.home_team_name}</span> vs <span class="accent-text">${nextGame.away_team_name}</span>`;
                      paragraphs[1].textContent = formattedDate;
                  } else {
                      paragraphs[0].textContent = 'No upcoming games';
                      paragraphs[1].textContent = 'Check back later';
                  }
              }
          }
      })
      .catch(error => {
          console.error('Error loading upcoming games:', error);
          displayError('games');
      });
}

// Function to load and display user's team
function loadMyTeam() {
  fetch('/api/my-team')
      .then(response => {
          if (!response.ok) {
              throw new Error('Failed to fetch team data');
          }
          return response.json();
      })
      .then(team => {
          const teamCard = document.querySelector('.card:nth-child(3)');
          if (teamCard) {
              const paragraphs = teamCard.querySelectorAll('p');
              
              if (paragraphs.length >= 2) {
                  if (team) {
                      paragraphs[0].innerHTML = `<span class="accent-text">${team.name}</span>`;
                      paragraphs[1].innerHTML = `Record: <span class="accent-text">${team.record}</span>`;
                  } else {
                      paragraphs[0].textContent = 'No team assigned';
                      paragraphs[1].textContent = 'Join a team to see stats';
                  }
              }
          }
      })
      .catch(error => {
          console.error('Error loading team data:', error);
          displayError('team');
      });
}

// Function to load and display unread messages count
function loadUnreadMessages() {
  fetch('/api/unread-messages')
      .then(response => {
          if (!response.ok) {
              throw new Error('Failed to fetch messages data');
          }
          return response.json();
      })
      .then(data => {
          const messagesCard = document.querySelector('.card:nth-child(4)');
          if (messagesCard) {
              const paragraph = messagesCard.querySelector('p');
              
              if (paragraph) {
                  paragraph.innerHTML = `You have <span class="accent-text">${data.count}</span> unread messages`;
              }
          }
      })
      .catch(error => {
          console.error('Error loading messages:', error);
          displayError('messages');
      });
}

// Function to load recent activity (simplified for demo)
function loadRecentActivity() {
  // For this example, we'll just update with static data
  // In a real app, you would fetch this from an API endpoint
  
  const activityList = document.querySelector('.sidebar h3:nth-of-type(3) + ul');
  if (activityList) {
      // Clear previous content
      activityList.innerHTML = '';
      
      // Add activity items
      const activities = [
          { text: 'Toronto vs Vancouver (4-2)', link: '#game-4' },
          { text: 'Mark Stevens scored 2 goals', link: '#player-stats-1' },
          { text: 'Team practice scheduled', link: '#events' }
      ];
      
      activities.forEach(activity => {
          const li = document.createElement('li');
          const a = document.createElement('a');
          a.href = activity.link;
          a.textContent = activity.text;
          li.appendChild(a);
          activityList.appendChild(li);
      });
  }
}

// Function to display error messages
function displayError(section, message = 'Please try again later') {
  let card;
  
  switch(section) {
      case 'characters':
          card = document.querySelector('.card:nth-child(1)');
          break;
      case 'games':
          card = document.querySelector('.card:nth-child(2)');
          break;
      case 'team':
          card = document.querySelector('.card:nth-child(3)');
          break;
      case 'messages':
          card = document.querySelector('.card:nth-child(4)');
          break;
      default:
          return;
  }
  
  if (card) {
      const paragraphs = card.querySelectorAll('p');
      if (paragraphs.length > 0) {
          paragraphs[0].innerHTML = `<span class="accent-text">Error loading data</span>`;
          if (paragraphs.length > 1) {
              paragraphs[1].textContent = message;
          }
      }
  }
}

// Add event listener for the "New Character" button
document.addEventListener('DOMContentLoaded', function() {
  const newCharBtn = document.querySelector('.btn-primary');
  if (newCharBtn) {
      newCharBtn.addEventListener('click', function() {
          alert('Character creation form will be implemented soon!');
          // In a real app, you would show a modal or navigate to a character creation page
      });
  }
});