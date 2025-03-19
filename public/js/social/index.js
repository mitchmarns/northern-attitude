// public/js/social/index.js - Main entry point for social functionality

// Import all modules
import * as character from './character.js';
import * as feed from './feed.js';
import * as post from './post.js';
import * as comments from './comments.js';
import * as interactions from './interactions.js';
import * as ui from './ui.js';
import * as api from './api.js';
import * as hashtags from './hashtags.js';
import * as notifications from './notifications.js';

// Shared state - accessible to all modules
export const state = {
  selectedCharacterId: null,
  userCharacters: [],
  currentFeed: 'all',
  currentHashtag: null,
  postData: {
    content: '',
    imageUrl: null
  },
  pagination: {
    lastPage: 1,
    isLoadingMore: false
  },
  currentPostId: null
};

// Initialize the application
export function init() {
  // Check authentication
  window.authUtils.checkAuth(true);
  window.authUtils.setupLogoutButton();
  
  // Initialize all modules
  character.init(state);
  feed.init(state);
  post.init(state);
  comments.init(state);
  interactions.init(state);
  ui.init(state);
  hashtags.init(state);
  notifications.init(state);

  
  // Set up infinite scroll
  setupInfiniteScroll();
  
  // Load supporting content
  api.loadNotificationsCount(state.selectedCharacterId);
  api.loadTrendingHashtags();
  api.loadSuggestedFollows(state.selectedCharacterId);
  api.loadUpcomingGames();

  // Add periodic notification refresh
  notifications.setupNotificationRefresh(state);
}

// Set up infinite scroll
function setupInfiniteScroll() {
  window.addEventListener('scroll', () => {
    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
    
    if (scrollTop + clientHeight >= scrollHeight - 200 && !state.pagination.isLoadingMore) {
      state.pagination.isLoadingMore = true;
      feed.loadMorePosts();
    }
  });
}

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', init);