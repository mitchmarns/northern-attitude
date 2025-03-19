// public/js/social/feed.js - Feed loading and display

import * as api from './api.js';
import * as post from './post.js';
import * as comments from './comments.js';
import * as interactions from './interactions.js';
import * as ui from './ui.js';
import * as hashtags from './hashtags.js';

// Import the required functions specifically
import { formatPostContent } from './post.js'; // Import formatPostContent from post.js
// The formatTimestamp function is imported via ui module

// DOM elements
const elements = {
  feedTabs: document.querySelectorAll('.tab-btn'),
  socialFeed: document.getElementById('social-feed'),
  feedLoading: document.getElementById('feed-loading')
};

// Initialize the feed module
export function init(state) {
  // Set up event listeners
  setupEventListeners(state);
}

// Set up feed-related event listeners
function setupEventListeners(state) {
  // Feed tab buttons
  elements.feedTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Update active state on tabs
      elements.feedTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      const feedType = tab.dataset.feed;
      state.currentFeed = feedType;
      loadFeed(feedType, 1);
    });
  });
}

// Load feed data
export async function loadFeed(feedType = 'all', page = 1) {
  const state = window.socialApp.state;
  
  if (!state.selectedCharacterId) {
    console.error('No character selected');
    return;
  }
  
  // Show loading indicator
  const feedLoading = document.getElementById('feed-loading');
  if (feedLoading) {
    feedLoading.style.display = 'block';
  }
  
  // Set current feed type
  state.currentFeed = feedType;
  
  // Update active tab
  const feedTabs = document.querySelectorAll('.tab-btn');
  feedTabs.forEach(tab => {
    if (tab.dataset.feed === feedType) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });
  
  try {
    let data;
    
    // Handle different feed types including hashtag filter
    if (feedType === 'hashtag' && state.currentHashtag) {
      data = await api.getPostsByHashtag(
        state.currentHashtag, 
        state.selectedCharacterId, 
        page
      );
    } else {
      // Existing feed types (all, following, team)
      console.log(`Loading ${feedType} feed, page ${page} for character ${state.selectedCharacterId}`);
      data = await api.fetchFeed(feedType, state.selectedCharacterId, page);
    }
    
    console.log("Feed data received:", data);
    
    // Hide loading indicator
    if (feedLoading) {
      feedLoading.style.display = 'none';
    }
    
    // Clear feed or append based on page
    const socialFeed = document.getElementById('social-feed');
    if (page === 1 && socialFeed) {
      socialFeed.innerHTML = '';
    }
    
    // Add posts to feed
    if (data.posts && data.posts.length > 0) {
      data.posts.forEach(post => {
        const postElement = createPostElement(post);
        if (socialFeed) {
          socialFeed.appendChild(postElement);
        }
      });
    } else if (page === 1 && socialFeed) {
      // Show empty state if no posts on first page
      if (feedType === 'hashtag' && state.currentHashtag) {
        socialFeed.innerHTML = `
          <div class="empty-feed">
            <p>No posts found with hashtag #${state.currentHashtag}</p>
            <button class="btn btn-secondary clear-filter-btn">Clear Filter</button>
          </div>
        `;
        
        // Add click handler for clear filter button
        const clearFilterBtn = socialFeed.querySelector('.clear-filter-btn');
        if (clearFilterBtn) {
          clearFilterBtn.addEventListener('click', () => {
            hashtags.clearHashtagFilter();
          });
        }
      } else {
        socialFeed.innerHTML = '<div class="empty-feed">No posts to show</div>';
      }
    }
    
    // Update state
    state.pagination.lastPage = page;
    state.pagination.isLoadingMore = false;
  } catch (error) {
    console.error('Error loading feed:', error);
    
    // Hide loading indicator
    if (feedLoading) {
      feedLoading.style.display = 'none';
    }
    
    // Show error message
    const socialFeed = document.getElementById('social-feed');
    if (socialFeed) {
      socialFeed.innerHTML = `<div class="error-feed">Failed to load feed: ${error.message}</div>`;
    }
    
    state.pagination.isLoadingMore = false;
  }
}

function createImageGalleryHtml(images) {
  // Limit display to 4 images, with "+X more" for additional images
  const displayImages = images.slice(0, 4);
  const extraImagesCount = Math.max(0, images.length - 4);
  
  let html = `<div class="post-feed-gallery image-count-${displayImages.length}">`;
  
  // Add images to gallery
  displayImages.forEach((imageUrl, index) => {
    html += `
      <div class="gallery-image">
        <img src="${imageUrl}" alt="Gallery image ${index + 1}">
      </div>
    `;
  });
  
  // Add "more images" indicator if needed
  if (extraImagesCount > 0) {
    html += `<div class="more-images-indicator">+${extraImagesCount} more</div>`;
  }
  
  html += '</div>';
  return html;
}

// Load more posts (for infinite scroll)
export function loadMorePosts() {
  const state = window.socialApp.state;
  if (state.pagination.isLoadingMore) return;
  
  state.pagination.isLoadingMore = true;
  loadFeed(state.currentFeed, state.pagination.lastPage + 1);
}

// Note: We're using formatTimestamp from ui.js instead of defining it here

// Create a post element from post data
export function createPostElement(postData) {
  const postElement = document.createElement('article');
  postElement.className = 'social-post';
  postElement.dataset.postId = postData.id;
  
  // Format timestamp
  let timestamp;
  try {
    if (postData.created_at) {
      if (typeof postData.created_at === 'string') {
        timestamp = new Date(postData.created_at.replace(' ', 'T'));
      } else if (typeof postData.created_at === 'number') {
        timestamp = new Date(postData.created_at);
      } else {
        timestamp = postData.created_at;
      }
    } else {
      timestamp = new Date();
    }
    console.log(`Post #${postData.id} parsed timestamp:`, timestamp.toISOString());
  } catch (e) {
    console.error(`Error parsing timestamp for post #${postData.id}:`, e);
    timestamp = new Date(); // Fallback to current date
  }
  
  // Format the timestamp for display
  const formattedTime = ui.formatTimestamp(timestamp);
  
  // Create image gallery HTML if we have multiple images
  let mediaHtml = '';
  if (postData.images && postData.images.length > 0) {
    mediaHtml = createImageGalleryHtml(postData.images);
  } else if (postData.media_url) {
    // Fallback to single image for backward compatibility
    mediaHtml = `<div class="post-image"><img src="${postData.media_url}" alt="Post image"></div>`;
  }
  
  // Build the post's HTML content
  postElement.innerHTML = `
    <div class="post-header">
      <div class="post-avatar">
        <img src="${postData.author_avatar || '/api/placeholder/60/60'}" alt="${postData.author_name || 'Author'}">
      </div>
      <div class="post-info">
        <div class="post-author">${postData.author_name || 'Unknown Author'}</div>
        <div class="post-meta">${postData.author_position || ''} ${postData.author_team ? '• ' + postData.author_team : ''} • <span class="post-time" data-timestamp="${timestamp.toISOString()}">${formattedTime}</span></div>
      </div>
      <div class="post-menu">
        <button class="post-menu-btn">•••</button>
      </div>
    </div>
    <div class="post-content">
      <p>${formatPostContent(postData.content || '')}</p>
      ${mediaHtml}
    </div>
    <div class="post-footer">
      <div class="post-stats">
        <span>${postData.likes_count || 0} likes</span>
        <span>${postData.comments_count || 0} comments</span>
      </div>
      <div class="post-actions">
        <button class="action-btn like-btn ${postData.is_liked ? 'liked' : ''}" title="Like this post">
          <span class="icon">❤️</span> Like
        </button>
        <button class="action-btn comment-btn" title="Comment on this post">
          <span class="icon">💬</span> Comment
        </button>
        <button class="action-btn share-btn" title="Share this post">
          <span class="icon">🔄</span> Share
        </button>
      </div>
    </div>
    <div class="post-comments" style="display: none;">
      <div class="comments-list">
        <!-- Comments will be loaded here -->
      </div>
      <div class="comment-composer">
        <div class="comment-avatar">
          <img src="${document.getElementById('composer-avatar')?.src || '/api/placeholder/40/40'}" alt="Your character">
        </div>
        <form class="comment-form">
          <input type="text" class="comment-input" placeholder="Write a comment...">
          <button type="submit">Post</button>
        </form>
      </div>
    </div>
  `;
  
  // Set up comment form submission
  const commentForm = postElement.querySelector('.comment-form');
  if (commentForm) {
    commentForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const commentInput = commentForm.querySelector('.comment-input');
      if (commentInput && commentInput.value.trim()) {
        // We'll integrate this with our comments module
        const state = window.socialApp.state;
        window.socialApp.comments.addComment(postData.id, commentInput.value.trim(), postElement);
        commentInput.value = '';
      }
    });
  }
  
  return postElement;
}

// Note: We're using formatPostContent from post.js instead of defining it here

// Periodically refresh timestamps (every minute)
setInterval(() => {
  // Find all timestamp elements
  const timeElements = document.querySelectorAll('.post-time');
  
  // Update each one
  timeElements.forEach(element => {
    const timestampIso = element.getAttribute('data-timestamp');
    if (timestampIso) {
      try {
        const timestamp = new Date(timestampIso);
        element.textContent = ui.formatTimestamp(timestamp);
      } catch (e) {
        console.error('Error updating timestamp:', e);
      }
    }
  });
}, 60000); // 60 seconds