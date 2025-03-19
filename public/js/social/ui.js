// public/js/social/ui.js - UI utilities and modal handling

import * as post from './post.js';

// DOM elements
const elements = {
  imageModal: document.getElementById('image-preview-modal'),
  closeImageModal: document.getElementById('close-image-modal'),
  imageUrlInput: document.getElementById('image-url-input'),
  previewImageBtn: document.getElementById('preview-image-btn'),
  previewImage: document.getElementById('preview-image'),
  cancelImageBtn: document.getElementById('cancel-image-btn'),
  addImageToPostBtn: document.getElementById('add-image-to-post-btn')
};

// Initialize the UI module
export function init(state) {
  // Set up event listeners
  setupEventListeners(state);
}

// Set up UI-related event listeners
function setupEventListeners(state) {
  // Image modal events
  if (elements.closeImageModal) {
    elements.closeImageModal.addEventListener('click', () => {
      hideImageModal();
    });
  }
  
  if (elements.previewImageBtn) {
    elements.previewImageBtn.addEventListener('click', () => {
      const imageUrl = elements.imageUrlInput.value.trim();
      if (imageUrl) {
        previewImage(imageUrl);
      }
    });
  }
  
  if (elements.cancelImageBtn) {
    elements.cancelImageBtn.addEventListener('click', () => {
      hideImageModal();
    });
  }
  
  if (elements.addImageToPostBtn) {
    elements.addImageToPostBtn.addEventListener('click', () => {
      const imageUrl = elements.imageUrlInput.value.trim();
      if (imageUrl) {
        state.postData.imageUrl = imageUrl;
        post.updatePostPreview(state);
        hideImageModal();
        
        // Enable submit button
        const postSubmitBtn = document.getElementById('post-submit-btn');
        if (postSubmitBtn) {
          postSubmitBtn.disabled = false;
        }
      }
    });
  }
  
  // Close image modal when clicking outside
  if (elements.imageModal) {
    elements.imageModal.addEventListener('click', (e) => {
      if (e.target === elements.imageModal) {
        hideImageModal();
      }
    });
  }
}

// Show image modal for adding an image to a post
export function showImageModal(state) {
  if (!elements.imageModal) return;
  
  // Reset input
  if (elements.imageUrlInput) {
    elements.imageUrlInput.value = state.postData.imageUrl || '';
  }
  
  // Reset preview
  if (elements.previewImage) {
    elements.previewImage.src = state.postData.imageUrl || '/api/placeholder/400/300';
  }
  
  // Show modal
  elements.imageModal.style.display = 'flex';
  
  // Focus input
  if (elements.imageUrlInput) {
    elements.imageUrlInput.focus();
  }
}

// Hide image modal
export function hideImageModal() {
  if (elements.imageModal) {
    elements.imageModal.style.display = 'none';
  }
}

// Preview an image in the image modal
export function previewImage(imageUrl) {
  if (!elements.previewImage) return;
  
  elements.previewImage.src = imageUrl;
  
  // Handle error
  elements.previewImage.onerror = function() {
    elements.previewImage.src = '/api/placeholder/400/300';
    showMessage('Failed to load image. Please check the URL.', 'error');
  };
}

// Format timestamp for display
export function formatTimestamp(date) {
  // Get current date for comparison
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  
  // Handle future dates (or small clock inconsistencies)
  if (diffSec < -300) { // More than 5 minutes in the future - display actual date
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return date.toLocaleDateString(undefined, options);
  } else if (diffSec < 0) { // Less than 5 minutes in the future - treat as "just now"
    return 'Just now';
  }
  
  // Calculate time units for past dates
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);
  
  // Format based on how much time has passed
  if (diffSec < 30) {
    return 'Just now';
  } else if (diffSec < 60) {
    return `${diffSec} seconds ago`;
  } else if (diffMin < 60) {
    return diffMin === 1 ? '1 minute ago' : `${diffMin} minutes ago`;
  } else if (diffHours < 24) {
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  } else if (diffDays < 7) {
    return diffDays === 1 ? 'Yesterday' : `${diffDays} days ago`;
  } else if (diffMonths < 12) {
    return diffMonths === 1 ? '1 month ago' : `${diffMonths} months ago`;
  } else {
    // More than a year ago, use the date
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString(undefined, options);
  }
}

// Insert text at cursor position in a textarea or input
export function insertTextAtCursor(input, text) {
  if (!input) return;
  
  const start = input.selectionStart;
  const end = input.selectionEnd;
  const value = input.value;
  
  input.value = value.substring(0, start) + text + value.substring(end);
  
  // Move cursor after the inserted text
  const newCursorPos = start + text.length;
  input.setSelectionRange(newCursorPos, newCursorPos);
}

// Get closest element with selector (similar to jQuery's closest)
export function getClosestElement(element, selector) {
  if (!element || !selector) return null;
  
  while (element && !element.matches(selector)) {
    element = element.parentElement;
  }
  
  return element;
}

// Show message (success or error) to the user
export function showMessage(message, type = 'success') {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message-toast ${type}-message`;
  messageDiv.textContent = message;
  
  // Add to body
  document.body.appendChild(messageDiv);
  
  // Add visible class after a small delay for animation
  setTimeout(() => {
    messageDiv.classList.add('visible');
  }, 10);
  
  // Remove after 3 seconds
  setTimeout(() => {
    messageDiv.classList.remove('visible');
    
    // Remove from DOM after animation completes
    setTimeout(() => {
      messageDiv.remove();
    }, 300);
  }, 3000);
}