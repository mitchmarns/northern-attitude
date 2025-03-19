// public/js/social/post.js - Post creation and formatting

import * as api from './api.js';
import * as feed from './feed.js';
import * as ui from './ui.js';

// DOM elements
const elements = {
  // Existing elements...
  postForm: document.getElementById('post-form'),
  postContent: document.getElementById('post-content'),
  postPreview: document.getElementById('post-preview'),
  postSubmitBtn: document.getElementById('post-submit-btn'),
  postVisibility: document.getElementById('post-visibility'),
  addImageBtn: document.getElementById('add-image-btn'),
  
  // New elements for multi-image functionality
  imageGallery: document.getElementById('image-gallery'),
  imageUrlInput: document.getElementById('image-url-input'),
  addToGalleryBtn: document.getElementById('add-to-gallery-btn'),
  imageCounter: document.getElementById('image-counter'),
  
  // Existing elements continued...
  addHashtagBtn: document.getElementById('add-hashtag-btn'),
  addMentionBtn: document.getElementById('add-mention-btn'),
  templatesBtn: document.getElementById('templates-btn'),
  templateButtons: document.querySelectorAll('[data-template]'),
  templatesDropdown: document.getElementById('templates-dropdown')
};

// Flag to prevent double submissions
let isSubmitting = false;

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
  
  // Attach click handler directly to the submit button instead of form submission
  if (elements.postSubmitBtn) {
    elements.postSubmitBtn.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Prevent double submission
      if (isSubmitting) {
        return;
      }
      
      // Submit the post
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
  if (elements.templateButtons) {
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
  }
  
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
  
  // If there are images, create a gallery
  if (state.postData.images && state.postData.images.length > 0) {
    const galleryElement = createImageGallery(state.postData.images);
    elements.postPreview.appendChild(galleryElement);
  }
  // For backward compatibility
  else if (state.postData.imageUrl) {
    const singleImage = document.createElement('img');
    singleImage.src = state.postData.imageUrl;
    singleImage.alt = 'Post preview image';
    elements.postPreview.appendChild(singleImage);
  }
  
  // If there's text content, show formatted text
  if (state.postData.content) {
    const previewText = document.createElement('p');
    previewText.innerHTML = formatPostContent(state.postData.content);
    elements.postPreview.appendChild(previewText);
  }
  
  // Show or hide preview container based on content
  elements.postPreview.style.display = 
    (state.postData.images && state.postData.images.length > 0) || 
    state.postData.imageUrl || 
    state.postData.content.trim() 
      ? 'block' 
      : 'none';

  if (elements.addToGalleryBtn) {
    elements.addToGalleryBtn.addEventListener('click', () => {
      const imageUrl = elements.imageUrlInput.value.trim();
      if (imageUrl) {
        if (addImageToGallery(imageUrl, state)) {
          // Clear input after successful addition
          elements.imageUrlInput.value = '';
        }
      }
    });
  }
  
  // Add keyboard support for image input
  if (elements.imageUrlInput) {
    elements.imageUrlInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const imageUrl = elements.imageUrlInput.value.trim();
        if (imageUrl) {
          if (addImageToGallery(imageUrl, state)) {
            // Clear input after successful addition
            elements.imageUrlInput.value = '';
          }
        }
      }
    });
  }
}

// Create an image gallery element
function createImageGallery(images) {
  const galleryElement = document.createElement('div');
  galleryElement.className = 'image-gallery';
  
  // Apply different layouts based on number of images
  galleryElement.classList.add(`image-count-${Math.min(images.length, 4)}`);
  
  // Add images to gallery
  images.slice(0, 4).forEach((imageUrl, index) => {
    const imageContainer = document.createElement('div');
    imageContainer.className = 'gallery-image-container';
    
    const imageElement = document.createElement('img');
    imageElement.src = imageUrl;
    imageElement.alt = `Gallery image ${index + 1}`;
    
    // Add remove button
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-image-btn';
    removeBtn.innerHTML = '&times;';
    removeBtn.dataset.index = index;
    removeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      removeImageFromGallery(index);
    });
    
    imageContainer.appendChild(imageElement);
    imageContainer.appendChild(removeBtn);
    galleryElement.appendChild(imageContainer);
  });
  
  // If there are more than 4 images, add a "+X more" indicator
  if (images.length > 4) {
    const moreIndicator = document.createElement('div');
    moreIndicator.className = 'more-images-indicator';
    moreIndicator.textContent = `+${images.length - 4} more`;
    galleryElement.appendChild(moreIndicator);
  }
  
  return galleryElement;
}

// Add image to gallery
export function addImageToGallery(imageUrl, state) {
  // Initialize images array if it doesn't exist
  if (!state.postData.images) {
    state.postData.images = [];
  }
  
  // Maximum of 10 images per post
  if (state.postData.images.length >= 10) {
    ui.showMessage('Maximum of 10 images allowed per post', 'error');
    return false;
  }
  
  // Add image to array
  state.postData.images.push(imageUrl);
  
  // Update counter if it exists
  if (elements.imageCounter) {
    elements.imageCounter.textContent = `${state.postData.images.length}/10 images`;
  }
  
  // Update preview
  updatePostPreview(state);
  
  // Enable submit button
  if (elements.postSubmitBtn) {
    elements.postSubmitBtn.disabled = false;
  }
  
  return true;
}

// Remove image from gallery
export function removeImageFromGallery(index, state) {
  if (!state.postData.images || index >= state.postData.images.length) return;
  
  // Remove image at index
  state.postData.images.splice(index, 1);
  
  // Update counter if it exists
  if (elements.imageCounter) {
    elements.imageCounter.textContent = `${state.postData.images.length}/10 images`;
  }
  
  // Update preview
  updatePostPreview(state);
  
  // Disable submit button if no content
  if (elements.postSubmitBtn) {
    elements.postSubmitBtn.disabled = 
      !state.postData.content.trim() && 
      state.postData.images.length === 0 && 
      !state.postData.imageUrl;
  }
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

  if (!state.postData.content.trim() && 
      (!state.postData.images || state.postData.images.length === 0) && 
      !state.postData.imageUrl) {
    ui.showMessage('Please enter some content or add images', 'error');
    return;
  }

  try {
    // Set submitting flag to prevent double submissions
    isSubmitting = true;
    
    // Disable submit button and show loading state
    if (elements.postSubmitBtn) {
      elements.postSubmitBtn.disabled = true;
      elements.postSubmitBtn.textContent = 'Posting...';
    }

    // Send post to server
    // Note: The API will need to be updated to handle multiple images
    await api.createPost(
      state.selectedCharacterId,
      state.postData.content.trim(),
      state.postData.images || state.postData.imageUrl,  // Send the images array or fallback to single imageUrl
      elements.postVisibility ? elements.postVisibility.value : 'public'
    );

    // Reset form and state
    state.postData.content = '';
    state.postData.imageUrl = null;
    state.postData.images = [];
    
    if (elements.postContent) {
      elements.postContent.value = '';
    }
    
    if (elements.postPreview) {
      elements.postPreview.innerHTML = '';
      elements.postPreview.style.display = 'none';
    }
    
    // Update image counter
    if (elements.imageCounter) {
      elements.imageCounter.textContent = '0/10 images';
    }

    // Reload feed
    feed.loadFeed(state.currentFeed, 1);

    // Show success message
    ui.showMessage('Post created successfully!', 'success');

  } catch (error) {
    console.error('Error creating post:', error);
    ui.showMessage('Failed to create post. Please try again.', 'error');
  } finally {
    // Reset submitting flag
    isSubmitting = false;
    
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