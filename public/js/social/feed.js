// public/js/social/feed.js - Feed loading and display

import * as api from './api.js';
import * as post from './post.js';
import * as comments from './comments.js';
import * as interactions from './interactions.js';
import * as ui from './ui.js';
import * as hashtags from './hashtags.js';

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

  // Event delegation for hashtag and mention clicks in posts
  document.addEventListener('click', async (e) => {
    // Check if a hashtag link was clicked
    if (e.target.classList.contains('hashtag') || e.target.parentElement.classList.contains('hashtag')) {
      e.preventDefault();
      
      // Get the hashtag text (remove the # symbol)
      const hashtagElement = e.target.classList.contains('hashtag') ? e.target : e.target.parentElement;
      const hashtag = hashtagElement.textContent.substring(1);
      
      // Filter feed by hashtag
      hashtags.filterByHashtag(hashtag, state);
    }
    
    // Check if a mention link was clicked for tagging
    if (e.target.classList.contains('mention') || e.target.parentElement.classList.contains('mention')) {
      e.preventDefault();
      
      // Get the character name
      const mentionElement = e.target.classList.contains('mention') ? e.target : e.target.parentElement;
      // Get the name attribute which contains the raw mention
      const characterName = mentionElement.dataset.name;
      
      console.log(`Mention clicked: @${characterName}`);
      
      // Find character(s) with this name
      const characters = await post.findCharactersByUsername(characterName);
      
      if (characters.length === 0) {
        // Try again with spaces added to the name if there are none
        // This helps with names like "declanthorne" -> "declan thorne"
        if (!characterName.includes(' ')) {
          // Try to split the name at capital letters or common break points
          const nameWithSpaces = characterName
            .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space between camelCase
            .replace(/([a-zA-Z])(\d)/g, '$1 $2') // Add space between letters and numbers
            .toLowerCase();
          
          console.log(`Trying again with spaces: "${nameWithSpaces}"`);
          const alternativeCharacters = await post.findCharactersByUsername(nameWithSpaces);
          
          if (alternativeCharacters.length > 0) {
            showCharacterSelectionModal(alternativeCharacters);
            return;
          }
        }
        
        // If no character found, offer to create one
        const createNew = confirm(`No character found with name @${characterName}. Would you like to create a new character?`);
        if (createNew) {
          window.location.href = 'character-form.html'; // Redirect to character creation
        }
        return;
      }
      
      // If only one character, tag that character
      if (characters.length === 1) {
        await tagCharacter(characters[0]);
        return;
      }
      
      // If multiple characters, show selection modal
      showCharacterSelectionModal(characters);
    }
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

// Load more posts (for infinite scroll)
export function loadMorePosts() {
  const state = window.socialApp.state;
  if (state.pagination.isLoadingMore) return;
  
  state.pagination.isLoadingMore = true;
  loadFeed(state.currentFeed, state.pagination.lastPage + 1);
}

// Create an image gallery HTML for multiple images
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
      <p>${post.formatPostContent(postData.content || '')}</p>
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
        const state = window.socialApp.state;
        comments.addComment(postData.id, commentInput.value.trim(), postElement);
        commentInput.value = '';
      }
    });
  }
  
  // Set up interaction event listeners
  setupInteractionListeners(postElement, postData);
  
  return postElement;
}

// Set up post interaction listeners
function setupInteractionListeners(postElement, postData) {
  // Like button
  const likeButton = postElement.querySelector('.like-btn');
  if (likeButton) {
    likeButton.addEventListener('click', async () => {
      const state = window.socialApp.state;
      try {
        await interactions.toggleLike(likeButton, postData.id, state);
      } catch (error) {
        console.error('Error toggling like:', error);
      }
    });
  }
  
  // Comment button
  const commentButton = postElement.querySelector('.comment-btn');
  if (commentButton) {
    commentButton.addEventListener('click', () => {
      const commentSection = postElement.querySelector('.post-comments');
      comments.toggleComments(postElement, postData.id);
    });
  }
}

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

// Function to show character selection modal
function showCharacterSelectionModal(characters) {
  // Remove any existing modal first
  const existingModal = document.querySelector('.character-selection-modal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // Create a modal dynamically
  const modal = document.createElement('div');
  modal.className = 'modal character-selection-modal';
  modal.style.display = 'flex';
  
  // Create modal content with better styling
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>Select Character to Tag</h3>
        <button class="close-modal">&times;</button>
      </div>
      <div class="modal-body">
        <p>Multiple characters match this name. Please select which one you want to tag:</p>
        <div class="character-list">
          ${characters.map(char => `
            <div class="character-option" data-character-id="${char.id}">
              <img src="${char.avatar_url || '/api/placeholder/50/50'}" alt="${char.name}">
              <div class="character-info">
                <div class="character-name">${char.name}</div>
                <div class="character-details">
                  ${char.position || ''} ${char.team_name ? `| ${char.team_name}` : ''}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
  
  // Add to body
  document.body.appendChild(modal);
  
  // Add some additional style to make it look better
  const style = document.createElement('style');
  style.textContent = `
    .character-option {
      display: flex;
      align-items: center;
      padding: 10px;
      border-radius: 4px;
      cursor: pointer;
      margin-bottom: 8px;
      background-color: var(--accent-bg, rgba(90, 128, 149, 0.1));
      transition: background-color 0.2s;
    }
    
    .character-option:hover {
      background-color: var(--accent-bg-hover, rgba(90, 128, 149, 0.2));
    }
    
    .character-option img {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      object-fit: cover;
      margin-right: 12px;
    }
    
    .character-name {
      font-weight: bold;
      color: var(--header, #5a8095);
      margin-bottom: 3px;
    }
    
    .character-details {
      font-size: 0.85rem;
      color: var(--lighttext, #e8e9e8);
    }
  `;
  document.head.appendChild(style);
  
  // Close button functionality
  modal.querySelector('.close-modal').addEventListener('click', () => {
    modal.remove();
    style.remove();
  });
  
  // Character selection
  modal.querySelectorAll('.character-option').forEach(option => {
    option.addEventListener('click', async () => {
      const characterId = option.dataset.characterId;
      const character = characters.find(c => c.id === characterId || c.id === parseInt(characterId));
      
      if (character) {
        await tagCharacter(character);
        
        // Remove the modal after tagging
        modal.remove();
        style.remove();
      }
    });
  });
  
  // Close when clicking outside the modal content
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
      style.remove();
    }
  });
}

// Helper function to tag a character
async function tagCharacter(character) {
  try {
    // Get the post element - select either the focused or hovered post
    const postElement = document.querySelector('.social-post:focus, .social-post:hover');
    
    if (!postElement) {
      ui.showMessage('Cannot tag character. Please select a post first.', 'error');
      return;
    }
    
    const postId = postElement.dataset.postId;
    if (!postId) {
      ui.showMessage('Invalid post selected. Please try again.', 'error');
      return;
    }
    
    // Get the current user's character - either the selected one or the first available
    let taggerCharacterId = window.socialApp.state.selectedCharacterId;
    
    // If no character is selected, try to use any available character
    if (!taggerCharacterId && window.socialApp.state.userCharacters) {
      const firstCharacter = window.socialApp.state.userCharacters[0];
      if (firstCharacter) {
        taggerCharacterId = firstCharacter.id;
      }
    }
    
    if (!taggerCharacterId) {
      ui.showMessage('You need to have at least one character to tag others', 'error');
      return;
    }
    
    // Make the API request to tag the character
    const result = await api.tagCharacterInPost(
      postId, 
      taggerCharacterId, 
      character.id
    );
    
    ui.showMessage(`Tagged ${character.name} in the post`, 'success');
  } catch (error) {
    console.error('Error tagging character:', error);
    ui.showMessage('Failed to tag character', 'error');
  }
}