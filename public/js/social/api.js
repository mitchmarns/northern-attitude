// public/js/social/api.js - API communication functions

// DOM elements for updating with API data
const elements = {
  notificationsBadge: document.getElementById('notifications-badge'),
  trendingHashtags: document.getElementById('trending-hashtags'),
  suggestedFollows: document.getElementById('suggested-follows-container'),
  upcomingGames: document.getElementById('upcoming-games-container')
};

// Fetch user's characters
export async function fetchCharacters() {
  const response = await fetch('/api/social/characters', {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch characters: ' + response.status);
  }
  
  return response.json();
}

// Fetch feed posts
export async function fetchFeed(feedType, characterId, page = 1, limit = 10) {
  const response = await fetch(`/api/social/feed/${feedType}?characterId=${characterId}&page=${page}&limit=${limit}`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch ${feedType} feed: ${response.status}`);
  }
  
  return response.json();
}

// Create a new post
export async function createPost(characterId, content, images, visibility) {
  // Check if images is an array or a single URL string
  const isMultipleImages = Array.isArray(images);
  const imagesArray = isMultipleImages ? images : (images ? [images] : []);
  
  const response = await fetch('/api/social/posts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      characterId,
      content,
      images: imagesArray,  // Send as an array in all cases
      visibility
    }),
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error('Failed to create post: ' + response.status);
  }
  
  return response.json();
}

// Toggle like on a post
export async function toggleLike(postId, characterId) {
  const response = await fetch(`/api/social/posts/${postId}/like`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ characterId }),
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error('Failed to toggle like: ' + response.status);
  }
  
  return response.json();
}

// Fetch comments for a post
export async function fetchComments(postId, limit = 5) {
  const response = await fetch(`/api/social/posts/${postId}/comments?limit=${limit}`, {
    method: 'GET',
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch comments: ' + response.status);
  }
  
  return response.json();
}

// Add a comment to a post
export async function addComment(postId, characterId, content, parentCommentId = null) {
  const response = await fetch(`/api/social/posts/${postId}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      characterId,
      content,
      parentCommentId
    }),
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error('Failed to add comment: ' + response.status);
  }
  
  return response.json();
}

// Toggle follow relationship
export async function toggleFollow(characterId, targetId) {
  const response = await fetch(`/api/social/characters/${targetId}/follow`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ characterId }),
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error('Failed to toggle follow: ' + response.status);
  }
  
  return response.json();
}

// Load notifications count
export async function loadNotificationsCount(characterId) {
  if (!elements.notificationsBadge || !characterId) return;
  
  try {
    const response = await fetch(`/api/social/notifications-count?characterId=${characterId}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch notifications count');
    }
    
    const data = await response.json();
    
    // Update notifications badge
    const count = data.count || 0;
    elements.notificationsBadge.textContent = count;
    elements.notificationsBadge.style.display = count > 0 ? 'inline-block' : 'none';
  } catch (error) {
    console.error('Error loading notifications count:', error);
    // Fallback display or hide badge
    elements.notificationsBadge.textContent = '0';
    elements.notificationsBadge.style.display = 'none';
  }
}

// Load trending hashtags
export async function loadTrendingHashtags() {
  if (!elements.trendingHashtags) return;
  
  try {
    const response = await fetch('/api/social/trending-hashtags', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch trending hashtags');
    }
    
    const hashtags = await response.json();
    
    // Clear existing content
    elements.trendingHashtags.innerHTML = '';
    
    // Create hashtag elements
    hashtags.forEach(hashtag => {
      const li = document.createElement('li');
      li.innerHTML = `<a href="#">#${hashtag.name}</a>`;
      elements.trendingHashtags.appendChild(li);
    });
  } catch (error) {
    console.error('Error loading trending hashtags:', error);
    fallbackTrendingHashtags();
  }
}

// Fallback trending hashtags
function fallbackTrendingHashtags() {
  if (!elements.trendingHashtags) return;
  
  // Fallback hashtags
  const fallbackHashtags = ['GameDay', 'NHLDraft', 'TrainingCamp', 'TORvsVAN', 'InjuryUpdate'];
  
  // Clear existing content
  elements.trendingHashtags.innerHTML = '';
  
  // Create hashtag elements
  fallbackHashtags.forEach(tag => {
    const li = document.createElement('li');
    li.innerHTML = `<a href="#">#${tag}</a>`;
    elements.trendingHashtags.appendChild(li);
  });
}

// Load suggested follows
export async function loadSuggestedFollows(characterId) {
  if (!elements.suggestedFollows || !characterId) return;
  
  try {
    const response = await fetch(`/api/social/suggested-follows?characterId=${characterId}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch suggested follows');
    }
    
    const suggestions = await response.json();
    
    // Clear existing content
    elements.suggestedFollows.innerHTML = '';
    
    // Create suggestion elements
    suggestions.forEach(suggestion => {
      const suggestionElement = document.createElement('div');
      suggestionElement.className = 'suggested-follow-item';
      suggestionElement.innerHTML = `
        <div class="suggested-avatar">
          <img src="${suggestion.avatar_url || '/api/placeholder/40/40'}" alt="${suggestion.name}">
        </div>
        <div class="suggested-info">
          <div class="suggested-name">${suggestion.name}</div>
          <div class="suggested-meta">
            ${suggestion.position || ''} ${suggestion.team_name ? `| ${suggestion.team_name}` : ''}
          </div>
        </div>
        <button class="btn btn-secondary btn-sm follow-btn" data-character-id="${suggestion.id}">Follow</button>
      `;
      
      elements.suggestedFollows.appendChild(suggestionElement);
    });
  } catch (error) {
    console.error('Error loading suggested follows:', error);
    fallbackSuggestedFollows();
  }
}

// Add to existing exports in api.js
export async function tagCharacterInPost(postId, taggerCharacterId, taggedCharacterId) {
  const response = await fetch(`/api/social/posts/${postId}/tag`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ 
      taggerCharacterId, 
      taggedCharacterId 
    }),
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error('Failed to tag character in post');
  }
  
  return response.json();
}

// Function to fetch notifications
export async function fetchNotifications(characterId, limit = 20) {
  const response = await fetch(`/api/social/notifications?characterId=${characterId}&limit=${limit}`, {
    method: 'GET',
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch notifications');
  }
  
  return response.json();
}

// Fallback suggested follows
function fallbackSuggestedFollows() {
  if (!elements.suggestedFollows) return;
  
  // Clear existing content
  elements.suggestedFollows.innerHTML = '';
  
  // Create two sample follow suggestions
  const suggestions = [
    {
      name: 'Toronto Maple Leafs',
      meta: 'Official Team',
      avatar: '/api/placeholder/40/40'
    },
    {
      name: 'NHL News',
      meta: 'Official Media',
      avatar: '/api/placeholder/40/40'
    }
  ];
  
  suggestions.forEach(suggestion => {
    const suggestionElement = document.createElement('div');
    suggestionElement.className = 'suggested-follow-item';
    suggestionElement.innerHTML = `
      <div class="suggested-avatar">
        <img src="${suggestion.avatar}" alt="${suggestion.name}">
      </div>
      <div class="suggested-info">
        <div class="suggested-name">${suggestion.name}</div>
        <div class="suggested-meta">${suggestion.meta}</div>
      </div>
      <button class="btn btn-secondary btn-sm follow-btn">Follow</button>
    `;
    
    elements.suggestedFollows.appendChild(suggestionElement);
  });
}

// Load upcoming games
export async function loadUpcomingGames() {
  if (!elements.upcomingGames) return;
  
  try {
    const response = await fetch('/api/games/upcoming', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch upcoming games');
    }
    
    const games = await response.json();
    
    // Clear existing content
    elements.upcomingGames.innerHTML = '';
    
    // Create game elements
    games.forEach(game => {
      const gameElement = document.createElement('div');
      gameElement.className = 'game-card';
      
      // Format date
      const gameDate = new Date(game.date);
      const formattedDate = formatDateTime(gameDate);
      
      gameElement.innerHTML = `
        <div class="game-teams">
          <div class="game-team">
            <img src="/api/placeholder/30/30" alt="${game.home_team_name}">
            <span>${game.home_team_name}</span>
          </div>
          <span class="vs">vs</span>
          <div class="game-team">
            <img src="/api/placeholder/30/30" alt="${game.away_team_name}">
            <span>${game.away_team_name}</span>
          </div>
        </div>
        <div class="game-details">
          <div class="game-time">${formattedDate}</div>
          <div class="game-location">${game.location || 'TBD'}</div>
        </div>
      `;
      
      elements.upcomingGames.appendChild(gameElement);
    });
  } catch (error) {
    console.error('Error loading upcoming games:', error);
    fallbackUpcomingGames();
  }
}

// Fallback upcoming games
function fallbackUpcomingGames() {
  if (!elements.upcomingGames) return;
  
  // Clear existing content
  elements.upcomingGames.innerHTML = '';
  
  // Create game elements
  const games = [
    {
      home: 'TOR',
      away: 'VAN',
      time: 'Today, 7:00 PM ET',
      location: 'Scotiabank Arena'
    },
    {
      home: 'MTL',
      away: 'BOS',
      time: 'Tomorrow, 6:30 PM ET',
      location: 'Bell Centre'
    }
  ];
  
  games.forEach(game => {
    const gameElement = document.createElement('div');
    gameElement.className = 'game-card';
    gameElement.innerHTML = `
      <div class="game-teams">
        <div class="game-team">
          <img src="/api/placeholder/30/30" alt="${game.home}">
          <span>${game.home}</span>
        </div>
        <span class="vs">vs</span>
        <div class="game-team">
          <img src="/api/placeholder/30/30" alt="${game.away}">
          <span>${game.away}</span>
        </div>
      </div>
      <div class="game-details">
        <div class="game-time">${game.time}</div>
        <div class="game-location">${game.location}</div>
      </div>
    `;
    
    elements.upcomingGames.appendChild(gameElement);
  });
}

// Helper function to format date and time
export function formatDateTime(date) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
}

/**
 * Get posts by hashtag
 * @param {string} hashtag - The hashtag to search for
 * @param {number} characterId - Character ID for viewing permissions
 * @param {number} page - Page number for pagination
 * @param {number} limit - Results per page
 */
export async function getPostsByHashtag(hashtag, characterId, page = 1, limit = 10) {
  const response = await fetch(`/api/social/hashtag/${hashtag}?characterId=${characterId}&page=${page}&limit=${limit}`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch posts for hashtag #${hashtag}: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Extract and format hashtags from post content
 * @param {string} content - Post content
 * @returns {string[]} - Array of extracted hashtags
 */
export function extractHashtags(content) {
  if (!content) return [];
  
  const hashtagRegex = /#(\w+)/g;
  const matches = content.match(hashtagRegex);
  
  if (!matches) return [];
  
  // Extract just the hashtag text without the # symbol
  return matches.map(tag => tag.substring(1).toLowerCase());
}

/**
 * Get trending hashtags with counts
 * @param {number} limit - Number of hashtags to retrieve
 * @param {number} days - Time period to consider
 */
export async function getTrendingHashtags(limit = 10, days = 7) {
  const response = await fetch(`/api/social/trending-hashtags?limit=${limit}&days=${days}`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch trending hashtags');
  }
  
  return response.json();
}

/**
 * Add hashtags to a post through the API
 * @param {number} postId - Post ID
 * @param {string[]} hashtags - Array of hashtags
 */
export async function addHashtagsToPost(postId, hashtags) {
  // If no hashtags, no need to make API call
  if (!hashtags || hashtags.length === 0) return;
  
  const response = await fetch(`/api/social/posts/${postId}/hashtags`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ hashtags }),
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error('Failed to add hashtags to post');
  }
  
  return response.json();
}