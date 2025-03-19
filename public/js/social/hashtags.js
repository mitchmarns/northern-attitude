// public/js/social/hashtags.js - Hashtag functionality for social feed

import * as api from './api.js';
import * as feed from './feed.js';
import * as ui from './ui.js';

// DOM elements
const elements = {
  trendingHashtagsList: document.getElementById('trending-hashtags'),
  feedTabs: document.querySelectorAll('.tab-btn'),
  socialFeed: document.getElementById('social-feed')
};

// Initialize the hashtags module
export function init(state) {
  // Set up event listeners
  setupEventListeners(state);
  
  // Load trending hashtags
  loadTrendingHashtags();
}

// Set up hashtag-related event listeners
function setupEventListeners(state) {
  // Event delegation for hashtag clicks in posts
  document.addEventListener('click', (e) => {
    // Check if a hashtag link was clicked
    if (e.target.classList.contains('hashtag') || e.target.parentElement.classList.contains('hashtag')) {
      e.preventDefault();
      
      // Get the hashtag text (remove the # symbol)
      const hashtagElement = e.target.classList.contains('hashtag') ? e.target : e.target.parentElement;
      const hashtag = hashtagElement.textContent.substring(1);
      
      // Filter feed by hashtag
      filterByHashtag(hashtag, state);
    }
  });
  
  // Event delegation for trending hashtag clicks
  if (elements.trendingHashtagsList) {
    elements.trendingHashtagsList.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Check if a trending hashtag was clicked
      const hashtagItem = e.target.closest('a');
      if (hashtagItem) {
        // Get the hashtag text (remove the # symbol)
        const hashtag = hashtagItem.textContent.substring(1);
        
        // Filter feed by hashtag
        filterByHashtag(hashtag, state);
      }
    });
  }
}

// Load trending hashtags from the server
export async function loadTrendingHashtags() {
  if (!elements.trendingHashtagsList) return;
  
  try {
    // Show loading state
    elements.trendingHashtagsList.innerHTML = '<li>Loading trending hashtags...</li>';
    
    // Fetch trending hashtags from server
    const response = await fetch('/api/social/trending-hashtags', {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch trending hashtags');
    }
    
    const hashtags = await response.json();
    
    // Clear loading message
    elements.trendingHashtagsList.innerHTML = '';
    
    if (hashtags.length === 0) {
      elements.trendingHashtagsList.innerHTML = '<li>No trending hashtags</li>';
      return;
    }
    
    // Add hashtags to the list
    hashtags.forEach(hashtag => {
      const li = document.createElement('li');
      const link = document.createElement('a');
      link.href = "#";
      link.classList.add('hashtag');
      link.textContent = `#${hashtag.name}`;
      
      if (hashtag.count) {
        const count = document.createElement('span');
        count.classList.add('hashtag-count');
        count.textContent = hashtag.count;
        li.appendChild(count);
      }
      
      li.appendChild(link);
      elements.trendingHashtagsList.appendChild(li);
    });
  } catch (error) {
    console.error('Error loading trending hashtags:', error);
    elements.trendingHashtagsList.innerHTML = '<li>Failed to load trending hashtags</li>';
  }
}

// Filter feed by hashtag
export function filterByHashtag(hashtag, state) {
  if (!state) {
    console.error("State is undefined in filterByHashtag");
    state = window.socialApp.state; // Fallback to global state
    if (!state) {
      console.error("Global state is also undefined");
      return; // Can't proceed without state
    }
  }
  
  console.log(`Filtering by hashtag: #${hashtag}, characterId: ${state.selectedCharacterId}`);
  
  // Make sure we have a selected character
  if (!state.selectedCharacterId) {
    console.error("No character selected, cannot filter by hashtag");
    ui.showMessage("Please select a character before using hashtags", "error");
    return;
  }
  
  // Update UI to show we're filtering by hashtag
  updateFilterUI(hashtag);
  
  // Set current feed type to 'hashtag'
  state.currentFeed = 'hashtag';
  state.currentHashtag = hashtag;
  
  // Load posts with the hashtag
  loadHashtagPosts(hashtag, 1);
}

// Load posts that contain a specific hashtag
async function loadHashtagPosts(hashtag, page = 1) {
  try {
    const characterId = window.socialApp.state.selectedCharacterId;
    
    if (!characterId) {
      console.error('No character selected');
      if (elements.socialFeed) {
        elements.socialFeed.innerHTML = `
          <div class="error-feed">
            <p>Error: Please select a character first.</p>
            <button class="btn btn-secondary" id="clear-hashtag-filter">Clear Filter</button>
          </div>
        `;
        
        // Add event listener to clear filter button
        document.getElementById('clear-hashtag-filter')?.addEventListener('click', () => {
          clearHashtagFilter();
        });
      }
      return;
    }
    
    console.log(`Loading hashtag posts: #${hashtag}, page ${page}, characterId ${characterId}`);
    
    // Show loading indicator
    if (elements.socialFeed) {
      elements.socialFeed.innerHTML = `
        <div id="feed-loading" class="feed-loading">
          <div class="loading-spinner"></div>
          <p>Loading posts with #${hashtag}...</p>
        </div>
      `;
    }
    
    // Fetch posts with the hashtag - make sure to include characterId parameter
    const url = `/api/social/hashtag/${hashtag}?characterId=${characterId}&page=${page}`;
    console.log(`Fetching from URL: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error response: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`Failed to fetch hashtag posts: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`Received ${data.posts ? data.posts.length : 0} posts for hashtag #${hashtag}`);
    
    // Clear loading indicator
    if (elements.socialFeed) {
      elements.socialFeed.innerHTML = '';
    }
    
    // Add posts to feed
    if (data.posts && data.posts.length > 0) {
      data.posts.forEach(post => {
        const postElement = feed.createPostElement(post);
        if (elements.socialFeed) {
          elements.socialFeed.appendChild(postElement);
        }
      });
    } else {
      // Show empty state
      if (elements.socialFeed) {
        elements.socialFeed.innerHTML = `
          <div class="empty-feed">
            <p>No posts found with #${hashtag}</p>
            <button class="btn btn-secondary" id="clear-hashtag-filter">Clear Filter</button>
          </div>
        `;
        
        // Add event listener to clear filter button
        document.getElementById('clear-hashtag-filter')?.addEventListener('click', () => {
          clearHashtagFilter();
        });
      }
    }
    
    // Update pagination state
    window.socialApp.state.pagination.lastPage = page;
    window.socialApp.state.pagination.isLoadingMore = false;
  } catch (error) {
    console.error('Error loading hashtag posts:', error);
    
    // Show error message
    if (elements.socialFeed) {
      elements.socialFeed.innerHTML = `
        <div class="error-feed">
          <p>Failed to load posts with #${hashtag}: ${error.message}</p>
          <button class="btn btn-secondary" id="clear-hashtag-filter">Clear Filter</button>
        </div>
      `;
      
      // Add event listener to clear filter button
      document.getElementById('clear-hashtag-filter')?.addEventListener('click', () => {
        clearHashtagFilter();
      });
    }
  }
}

// Update UI to show we're filtering by hashtag
function updateFilterUI(hashtag) {
  // Remove active class from all tabs
  if (elements.feedTabs) {
    elements.feedTabs.forEach(tab => {
      tab.classList.remove('active');
    });
  }
  
  // Add hashtag filter indicator to the feed
  const filterIndicator = document.createElement('div');
  filterIndicator.className = 'hashtag-filter-indicator';
  filterIndicator.innerHTML = `
    <span>Showing posts with </span>
    <span class="filter-hashtag">#${hashtag}</span>
    <button class="clear-filter-btn" id="clear-hashtag-btn">×</button>
  `;
  
  // Add filter indicator if it doesn't exist already
  const existingIndicator = document.querySelector('.hashtag-filter-indicator');
  if (existingIndicator) {
    existingIndicator.parentNode.replaceChild(filterIndicator, existingIndicator);
  } else {
    const mainContent = document.querySelector('.social-main-content');
    const feedTabs = document.querySelector('.feed-tabs');
    
    if (mainContent && feedTabs) {
      mainContent.insertBefore(filterIndicator, feedTabs.nextSibling);
    }
  }
  
  // Add event listener to clear filter button
  document.getElementById('clear-hashtag-btn')?.addEventListener('click', () => {
    clearHashtagFilter();
  });
}

// Clear hashtag filter and return to normal feed
function clearHashtagFilter() {
  // Remove filter indicator
  const filterIndicator = document.querySelector('.hashtag-filter-indicator');
  if (filterIndicator) {
    filterIndicator.remove();
  }
  
  // Reset feed state
  const state = window.socialApp.state;
  state.currentFeed = 'all';
  state.currentHashtag = null;
  
  // Reactivate "All Posts" tab
  if (elements.feedTabs) {
    elements.feedTabs.forEach(tab => {
      if (tab.dataset.feed === 'all') {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
  }
  
  // Reload regular feed
  feed.loadFeed('all', 1);
}

// Helper function to check if a post contains a hashtag
export function postContainsHashtag(post, hashtag) {
  if (!post.content) return false;
  
  // Create regex to find the hashtag
  const regex = new RegExp(`#${hashtag}\\b`, 'i');
  return regex.test(post.content);
}