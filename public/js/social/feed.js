// public/js/social/feed.js - Feed loading and display

import * as api from './api.js';
import * as post from './post.js';
import * as comments from './comments.js';
import * as interactions from './interactions.js';
import * as ui from './ui.js';

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
  if (elements.feedLoading) {
    elements.feedLoading.style.display = 'block';
  }
  
  // Set current feed type
  state.currentFeed = feedType;
  
  // Update active tab
  elements.feedTabs.forEach(tab => {
    if (tab.dataset.feed === feedType) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });
  
  try {
    const data = await api.fetchFeed(feedType, state.selectedCharacterId, page);
    
    // Hide loading indicator
    if (elements.feedLoading) {
      elements.feedLoading.style.display = 'none';
    }
    
    // Clear feed or append based on page
    if (page === 1) {
      if (elements.socialFeed) {
        elements.socialFeed.innerHTML = '';
      }
    }
    
    // Add posts to feed
    if (data.posts && data.posts.length > 0) {
      data.posts.forEach(post => {
        const postElement = createPostElement(post);
        if (elements.socialFeed) {
          elements.socialFeed.appendChild(postElement);
        }
      });
    } else if (page === 1) {
      // Show empty state if no posts on first page
      if (elements.socialFeed) {
        elements.socialFeed.innerHTML = '<div class="empty-feed">No posts to show</div>';
      }
    }
    
    // Update state
    state.pagination.lastPage = page;
    state.pagination.isLoadingMore = false;
  } catch (error) {
    console.error('Error loading feed:', error);
    
    // Hide loading indicator
    if (elements.feedLoading) {
      elements.feedLoading.style.display = 'none';
    }
    
    // Show error message
    if (elements.socialFeed) {
      elements.socialFeed.innerHTML = `<div class="error-feed">Failed to load feed: ${error.message}</div>`;
    }
    
    state.pagination.isLoadingMore = false;
  }
}

// Load more posts (for infinite scroll)
export function loadMorePosts() {
  const state = window.socialApp.state;
  if (state.pagination.isLoadingMore) return;
  
  state.pagination.isLoadingMore = true;
  loadFeed(state.currentFeed, state.pagination.lastPage + 1);
}

// Create a post element from post data
function createPostElement(postData) {
  const postElement = document.createElement('article');
  postElement.className = 'social-post';
  postElement.dataset.postId = postData.id;
  
  // Format timestamp
  const timestamp = postData.created_at ? new Date(postData.created_at) : new Date();
  const formattedTime = ui.formatTimestamp(timestamp);
  
  // Build the post's HTML content
  postElement.innerHTML = `
    <div class="post-header">
      <div class="post-avatar">
        <img src="${postData.author_avatar || '/api/placeholder/60/60'}" alt="${postData.author_name || 'Author'}">
      </div>
      <div class="post-info">
        <div class="post-author">${postData.author_name || 'Unknown Author'}</div>
        <div class="post-meta">${postData.author_position || ''} ${postData.author_team ? '• ' + postData.author_team : ''} • ${formattedTime}</div>
      </div>
      <div class="post-menu">
        <button class="post-menu-btn">•••</button>
      </div>
    </div>
    <div class="post-content">
      <p>${post.formatPostContent(postData.content || '')}</p>
      ${postData.media_url ? `<div class="post-image"><img src="${postData.media_url}" alt="Post image"></div>` : ''}
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
        comments.addComment(postData.id, commentInput.value.trim(), postElement);
        commentInput.value = '';
      }
    });
  }
  
  return postElement;
}