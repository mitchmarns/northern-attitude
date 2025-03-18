// public/js/social/post.js - Post creation and formatting

import * as api from './api.js';
import * as feed from './feed.js';
import * as ui from './ui.js';

// DOM elements
const elements = {
  postForm: document.getElementById('post-form'),
  postContent: document.getElementById('post-content'),
  postPreview: document.getElementById('post-preview'),
  postSubmitBtn: document.getElementById('post-submit-btn'),
  postVisibility: document.getElementById('post-visibility'),
  addImageBtn: document.getElementById('add-image-btn'),
  addHashtagBtn: document.getElementById('add-hashtag-btn'),
  addMentionBtn: document.getElementById('add-mention-btn'),
  templatesBtn: document.getElementById('templates-btn'),
  templateButtons: document.querySelectorAll('[data-template]'),
  templatesDropdown: document.getElementById('templates-dropdown')
};

// Initialize the post module
export function init(state) {
  // Set up event listeners
  setupEventListeners(state);
}

// Set up post-related event listeners
function setupEventListeners(state) {
  // Post content input
  if (elements.postContent) {
    elements.postContent.addEventListener('input', () => {
      state.postData.content = elements.postContent.value;
      
      // Enable submit button if there's content
      if (elements.postSubmitBtn) {
        elements.postSubmitBtn.disabled = !state.postData.content.trim() && !state.postData.imageUrl;
      }
      
      // Update preview if needed
      updatePostPreview(state);
    });
  }
  
  // Post form submission
  if (elements.postForm) {
    elements.postForm.addEventListener('submit', (e) => {
      e.preventDefault();
      submitPost(state);
    });
  }
  
  // Add image button
  if (elements.addImageBtn) {
    elements.addImageBtn.addEventListener('click', () => {
      ui.showImageModal(state);
    });
  }
  
  // Add hashtag button
  if (elements.addHashtagBtn) {
    elements.addHashtagBtn.addEventListener('click', () => {
      ui.insertTextAtCursor(elements.postContent, ' #');
      elements.postContent.focus();
    });
  }
  
  // Add mention button
  if (elements.addMentionBtn) {
    elements.addMentionBtn.addEventListener('click', () => {
      ui.insertTextAtCursor(elements.postContent, ' @');
      elements.postContent.focus();
    });
  }
  
  // Template buttons
  elements.templateButtons.forEach(button => {
    button.addEventListener('click', () => {
      const templateType = button.dataset.template;
      applyTemplate(templateType, state);
      
      // Hide dropdown
      if (elements.templatesDropdown) {
        elements.templatesDropdown.style.display = 'none';
      }
    });
  });
  
  // Templates dropdown toggle
  if (elements.templatesBtn) {
    elements.templatesBtn.addEventListener('click', () => {
      if (elements.templatesDropdown) {
        elements.templatesDropdown.style.display = 
          elements.templatesDropdown.style.display === 'block' ? 'none' : 'block';
      }
    });
  }
  
  // Close templates dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (elements.templatesDropdown && 
        e.target !== elements.templatesBtn && 
        !elements.templatesBtn.contains(e.target)) {
      elements.templatesDropdown.style.display = 'none';
    }
  });
}

// Update post preview
export function updatePostPreview(state) {
  if (!elements.postPreview) return;
  
  // Clear previous preview
  elements.postPreview.innerHTML = '';
  
  // If there's an image URL, show the image
  if (state.postData.imageUrl) {
    const previewImage = document.createElement('img');
    previewImage.src = state.postData.imageUrl;
    previewImage.alt = 'Post preview image';
    elements.postPreview.appendChild(previewImage);
  }
  
  // If there's text content, show formatted text
  if (state.postData.content) {
    const previewText = document.createElement('p');
    previewText.innerHTML = formatPostContent(state.postData.content);
    elements.postPreview.appendChild(previewText);
  }
  
  // Show or hide preview container based on content
  elements.postPreview.style.display = 
    state.postData.imageUrl || state.postData.content.trim() 
      ? 'block' 
      : 'none';
}

// Format post content with hashtags, mentions, and links
export function formatPostContent(content) {
  if (!content) return '';
  
  // Escape HTML to prevent XSS
  let safeContent = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  
  // Format hashtags
  safeContent = safeContent.replace(/#(\w+)/g, '<a href="#" class="hashtag">#$1</a>');
  
  // Format mentions
  safeContent = safeContent.replace(/@(\w+)/g, '<a href="#" class="mention">@$1</a>');
  
  // Format URLs
  safeContent = safeContent.replace(
    /(https?:\/\/[^\s]+)/g, 
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
  );
  
  return safeContent;
}

// Submit a new post
async function submitPost(state) {
  // Ensure we have a selected character and some content
  if (!state.selectedCharacterId) {
    ui.showMessage('Please select a character to post as', 'error');
    return;
  }

  if (!state.postData.content.trim() && !state.postData.imageUrl) {
    ui.showMessage('Please enter some content or add an image', 'error');
    return;
  }

  try {
    // Disable submit button and show loading state
    if (elements.postSubmitBtn) {
      elements.postSubmitBtn.disabled = true;
      elements.postSubmitBtn.textContent = 'Posting...';
    }

    // Send post to server
    await api.createPost(
      state.selectedCharacterId,
      state.postData.content.trim(),
      state.postData.imageUrl,
      elements.postVisibility ? elements.postVisibility.value : 'public'
    );

    // Reset form and state
    state.postData.content = '';
    state.postData.imageUrl = null;
    
    if (elements.postContent) {
      elements.postContent.value = '';
    }
    
    if (elements.postPreview) {
      elements.postPreview.innerHTML = '';
      elements.postPreview.style.display = 'none';
    }

    // Reload feed
    feed.loadFeed(state.currentFeed, 1);

    // Show success message
    ui.showMessage('Post created successfully!', 'success');

  } catch (error) {
    console.error('Error creating post:', error);
    ui.showMessage('Failed to create post. Please try again.', 'error');
  } finally {
    // Re-enable submit button
    if (elements.postSubmitBtn) {
      elements.postSubmitBtn.disabled = false;
      elements.postSubmitBtn.textContent = 'Post';
    }
  }
}

// Apply a post template
function applyTemplate(templateType, state) {
  if (!elements.postContent) return;
  
  let template = '';
  
  switch (templateType) {
    case 'pregame':
      template = 'Ready for tonight\'s game against [opponent]. Looking forward to a competitive matchup! #GameDay #HockeyTime';
      break;
    case 'postgame':
      template = 'Great [win/loss] tonight against [opponent]. [Happy/Disappointed] with how the team played, especially our [strength/weakness]. Looking to build on this for the next game! #HockeyLife';
      break;
    case 'media':
      template = 'Thanks to the media for the interview today. Excited to share my thoughts on [topic] and discuss the upcoming [event/game]. #Hockey #MediaDay';
      break;
    case 'team':
      template = 'Important team announcement: [announcement details]. #TeamNews #HockeyAnnouncement';
      break;
    default:
      return;
  }
  
  // Set template text
  elements.postContent.value = template;
  elements.postContent.focus();
  
  // Update state
  state.postData.content = template;
  
  // Update preview
  updatePostPreview(state);
  
  // Enable submit button
  if (elements.postSubmitBtn) {
    elements.postSubmitBtn.disabled = false;
  }
}