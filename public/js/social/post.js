// public/js/social/post.js - Post creation and formatting with multi-image support

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
  
  // Image upload elements
  imageUrlInput: document.getElementById('image-url-input'),
  addToGalleryBtn: document.getElementById('add-to-gallery-btn'),
  imageCounter: document.getElementById('image-counter'),
  
  // Existing elements
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
  // Initialize post data if not exists
  if (!state.postData) {
    state.postData = {
      content: '',
      images: [],
      visibility: 'public'
    };
  }
  
  // Set up event listeners
  setupEventListeners(state);
}

// Set up post-related event listeners
function setupEventListeners(state) {
  // Post content input
  if (elements.postContent) {
    elements.postContent.addEventListener('input', () => {
      state.postData.content = elements.postContent.value;
      updateSubmitButtonState(state);
      updatePostPreview(state);
    });
  }
  
  // Image URL input and add to gallery
  if (elements.imageUrlInput && elements.addToGalleryBtn) {
    elements.addToGalleryBtn.addEventListener('click', () => {
      const imageUrl = elements.imageUrlInput.value.trim();
      if (imageUrl) {
        addImageToGallery(imageUrl, state);
        elements.imageUrlInput.value = ''; // Clear input
      }
    });
    
    // Support Enter key in image URL input
    elements.imageUrlInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const imageUrl = elements.imageUrlInput.value.trim();
        if (imageUrl) {
          addImageToGallery(imageUrl, state);
          elements.imageUrlInput.value = ''; // Clear input
        }
      }
    });
  }
  
  // Post form submission
  if (elements.postForm) {
    elements.postForm.addEventListener('submit', (e) => {
      e.preventDefault();
      submitPost(state);
    });
  }
  
  // Existing event listeners from the previous implementation
  setupTemplateAndToolbarListeners(state);
}

// Add image to gallery
export function addImageToGallery(imageUrl, state) {
  // Validate URL (basic check)
  const urlPattern = /^(https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp))/i;
  if (!urlPattern.test(imageUrl)) {
    ui.showMessage('Please enter a valid image URL', 'error');
    return false;
  }
  
  // Initialize images array if not exists
  if (!state.postData.images) {
    state.postData.images = [];
  }
  
  // Check maximum images
  if (state.postData.images.length >= 10) {
    ui.showMessage('Maximum of 10 images allowed', 'error');
    return false;
  }
  
  // Add image to array
  state.postData.images.push(imageUrl);
  
  // Update counter and preview
  updateImageCounter(state);
  updatePostPreview(state);
  updateSubmitButtonState(state);
  
  return true;
}

// Remove image from gallery
export function removeImageFromGallery(index, state) {
  if (!state.postData.images || index >= state.postData.images.length) return;
  
  // Remove image at index
  state.postData.images.splice(index, 1);
  
  // Update counter and preview
  updateImageCounter(state);
  updatePostPreview(state);
  updateSubmitButtonState(state);
}

// Update image counter
function updateImageCounter(state) {
  if (elements.imageCounter) {
    const imageCount = state.postData.images ? state.postData.images.length : 0;
    elements.imageCounter.textContent = `${imageCount}/10 images`;
  }
}

// Update post preview
export function updatePostPreview(state) {
  if (!elements.postPreview) return;
  
  // Clear previous preview
  elements.postPreview.innerHTML = '';
  
  // Hide preview if no content and no images
  if ((!state.postData.content || state.postData.content.trim() === '') && 
      (!state.postData.images || state.postData.images.length === 0)) {
    elements.postPreview.style.display = 'none';
    return;
  }
  
  // Show preview container
  elements.postPreview.style.display = 'block';
  
  // Add text content if exists
  if (state.postData.content && state.postData.content.trim() !== '') {
    const previewText = document.createElement('p');
    previewText.innerHTML = formatPostContent(state.postData.content);
    elements.postPreview.appendChild(previewText);
  }
  
  // Add images if exist
  if (state.postData.images && state.postData.images.length > 0) {
    const galleryElement = createImageGallery(state.postData.images, true);
    elements.postPreview.appendChild(galleryElement);
  }
}

// Create image gallery element
export function createImageGallery(images, isEditable = false) {
  const galleryElement = document.createElement('div');
  galleryElement.className = `image-gallery image-count-${Math.min(images.length, 4)}`;
  
  // Add images to gallery
  images.slice(0, 4).forEach((imageUrl, index) => {
    const imageContainer = document.createElement('div');
    imageContainer.className = 'gallery-image-container';
    
    const imageElement = document.createElement('img');
    imageElement.src = imageUrl;
    imageElement.alt = `Gallery image ${index + 1}`;
    
    // Add remove button if editable
    if (isEditable) {
      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-image-btn';
      removeBtn.innerHTML = '&times;';
      removeBtn.dataset.index = index;
      removeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        removeImageFromGallery(index, window.socialApp.state);
      });
      
      imageContainer.appendChild(imageElement);
      imageContainer.appendChild(removeBtn);
    } else {
      imageContainer.appendChild(imageElement);
    }
    
    galleryElement.appendChild(imageContainer);
  });
  
  // Add more images indicator
  if (images.length > 4) {
    const moreIndicator = document.createElement('div');
    moreIndicator.className = 'more-images-indicator';
    moreIndicator.textContent = `+${images.length - 4} more`;
    galleryElement.appendChild(moreIndicator);
  }
  
  return galleryElement;
}

// Update submit button state
function updateSubmitButtonState(state) {
  if (elements.postSubmitBtn) {
    // Enable submit if there's content or images
    const hasContent = state.postData.content && state.postData.content.trim() !== '';
    const hasImages = state.postData.images && state.postData.images.length > 0;
    
    elements.postSubmitBtn.disabled = !(hasContent || hasImages);
  }
}

// Submit post
async function submitPost(state) {
  // Ensure we have a selected character
  if (!state.selectedCharacterId) {
    ui.showMessage('Please select a character to post as', 'error');
    return;
  }

  // Ensure we have content or images
  if ((!state.postData.content || state.postData.content.trim() === '') && 
      (!state.postData.images || state.postData.images.length === 0)) {
    ui.showMessage('Please enter some content or add images', 'error');
    return;
  }

  try {
    // Prevent double submission
    if (isSubmitting) return;
    isSubmitting = true;
    
    // Disable submit button
    if (elements.postSubmitBtn) {
      elements.postSubmitBtn.disabled = true;
      elements.postSubmitBtn.textContent = 'Posting...';
    }
    
    // Create post
    await api.createPost(
      state.selectedCharacterId,
      state.postData.content.trim(),
      state.postData.images, // Send entire images array
      elements.postVisibility ? elements.postVisibility.value : 'public'
    );
    
    // Reset post data
    state.postData.content = '';
    state.postData.images = [];
    
    // Reset form
    if (elements.postContent) {
      elements.postContent.value = '';
    }
    
    // Clear preview
    if (elements.postPreview) {
      elements.postPreview.innerHTML = '';
      elements.postPreview.style.display = 'none';
    }
    
    // Reset image counter
    updateImageCounter(state);
    
    // Reload feed
    feed.loadFeed(state.currentFeed, 1);
    
    // Show success message
    ui.showMessage('Post created successfully!', 'success');
    
  } catch (error) {
    console.error('Error creating post:', error);
    ui.showMessage('Failed to create post. Please try again.', 'error');
  } finally {
    // Reset submission flag
    isSubmitting = false;
    
    // Reset submit button
    if (elements.postSubmitBtn) {
      elements.postSubmitBtn.disabled = false;
      elements.postSubmitBtn.textContent = 'Post';
    }
  }
}

// Setup template and toolbar listeners
export function setupTemplateAndToolbarListeners(state) {
  // Hashtag button - FIXED to avoid inserting multiple hashtags
  if (elements.addHashtagBtn) {
    elements.addHashtagBtn.addEventListener('click', () => {
      if (elements.postContent) {
        // Get current cursor position and text
        const cursorPos = elements.postContent.selectionStart;
        const text = elements.postContent.value;
        
        // Check if we're already at a hashtag
        if (cursorPos > 0 && text.charAt(cursorPos - 1) === '#') {
          // We're already at a hashtag, don't add another one
          elements.postContent.focus();
          return;
        }
        
        // Check if we need to add a space before the hashtag
        let insertText = '#';
        if (cursorPos > 0 && text.charAt(cursorPos - 1) !== ' ' && text.charAt(cursorPos - 1) !== '\n') {
          insertText = ' #';
        }
        
        ui.insertTextAtCursor(elements.postContent, insertText);
        elements.postContent.focus();
      }
    });
  }
  
  // Mention button - IMPROVED similar to hashtag button
  if (elements.addMentionBtn) {
    elements.addMentionBtn.addEventListener('click', () => {
      if (elements.postContent) {
        // Get current cursor position and text
        const cursorPos = elements.postContent.selectionStart;
        const text = elements.postContent.value;
        
        // Check if we're already at a mention
        if (cursorPos > 0 && text.charAt(cursorPos - 1) === '@') {
          // We're already at a mention, don't add another one
          elements.postContent.focus();
          return;
        }
        
        // Check if we need to add a space before the mention
        let insertText = '@';
        if (cursorPos > 0 && text.charAt(cursorPos - 1) !== ' ' && text.charAt(cursorPos - 1) !== '\n') {
          insertText = ' @';
        }
        
        ui.insertTextAtCursor(elements.postContent, insertText);
        elements.postContent.focus();
      }
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
  
  // Update submit button state
  updateSubmitButtonState(state);
}

// Format post content with interactive mentions
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
  
  // Format mentions with data attributes
  // Updated regex to capture more complex usernames (including spaces)
  safeContent = safeContent.replace(
    /@(\w+(?:\s\w+)*)/g, 
    (match, name) => `<a href="#" class="mention" data-name="${name.trim()}">${match}</a>`
  );
  
  // Format URLs
  safeContent = safeContent.replace(
    /(https?:\/\/[^\s]+)/g, 
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
  );
  
  return safeContent;
}

// Function to find characters by username
export async function findCharactersByUsername(name) {
  try {
    // Trim whitespace and handle spaces properly
    const searchTerm = name.trim();
    
    // If the name is empty after trimming, return empty array
    if (!searchTerm) {
      return [];
    }
    
    console.log(`Searching for character: "${searchTerm}"`);
    
    // Make the API request with the cleaned search term
    const response = await fetch(`/api/search/characters?q=${encodeURIComponent(searchTerm)}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error(`Error status: ${response.status} searching for "${searchTerm}"`);
      throw new Error('Failed to search characters');
    }
    
    const data = await response.json();
    console.log(`Found ${data.length} characters matching "${searchTerm}"`);
    return data;
  } catch (error) {
    console.error('Error finding characters:', error);
    // Return empty array instead of failing completely
    return [];
  }
}

// Update mentions extraction to be case-insensitive and handle more scenarios
export function extractMentions(content) {
  if (!content) return [];
  
  const mentionRegex = /@(\w+)/g;
  const matches = content.match(mentionRegex);
  
  if (!matches) return [];
  
  return matches.map(mention => mention.substring(1).toLowerCase());
}