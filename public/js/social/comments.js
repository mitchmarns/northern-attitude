// public/js/social/comments.js - Comment functionality

import * as api from './api.js';
import * as ui from './ui.js';

// DOM elements
const elements = {
  commentModal: document.getElementById('comment-modal'),
  closeCommentModal: document.getElementById('close-comment-modal'),
  fullCommentsList: document.querySelector('.full-comments-list'),
  modalCommentForm: document.getElementById('modal-comment-form'),
  modalCommentInput: document.getElementById('modal-comment-input')
};

// Initialize the comments module
export function init(state) {
  // Set up event listeners
  setupEventListeners(state);
}

// Set up comment-related event listeners
function setupEventListeners(state) {
  // Comment modal events
  if (elements.closeCommentModal) {
    elements.closeCommentModal.addEventListener('click', () => {
      hideCommentModal();
    });
  }
  
  // Modal comment form
  if (elements.modalCommentForm) {
    elements.modalCommentForm.addEventListener('submit', (e) => {
      e.preventDefault();
      submitModalComment(state.currentPostId, state);
    });
  }
  
  // Close comment modal when clicking outside
  if (elements.commentModal) {
    elements.commentModal.addEventListener('click', (e) => {
      if (e.target === elements.commentModal) {
        hideCommentModal();
      }
    });
  }
}

// Toggle comments section visibility
export function toggleComments(postElement, postId, state) {
  if (!postElement || !postId) return;
  
  const commentsSection = postElement.querySelector('.post-comments');
  if (commentsSection) {
    // Toggle visibility
    const isVisible = commentsSection.style.display !== 'none';
    
    if (isVisible) {
      commentsSection.style.display = 'none';
    } else {
      commentsSection.style.display = 'block';
      
      // Load comments if not already loaded
      const commentsList = commentsSection.querySelector('.comments-list');
      if (commentsList && commentsList.children.length === 0) {
        loadComments(postId, commentsList);
      }
      
      // Focus on comment input
      const commentInput = commentsSection.querySelector('.comment-input');
      if (commentInput) {
        commentInput.focus();
      }
    }
  }
}

// Show comments modal for a post
export function showCommentsModal(postId, state) {
  if (!elements.commentModal || !postId) return;
  
  state.currentPostId = postId;
  
  // Show loading state
  if (elements.fullCommentsList) {
    elements.fullCommentsList.innerHTML = '<div class="loading-comments">Loading comments...</div>';
  }
  
  // Show modal
  elements.commentModal.style.display = 'flex';
  
  // Load all comments for the post
  loadAllComments(postId);
  
  // Focus on comment input
  if (elements.modalCommentInput) {
    elements.modalCommentInput.focus();
  }
}

// Hide comments modal
export function hideCommentModal() {
  if (elements.commentModal) {
    elements.commentModal.style.display = 'none';
  }
}

// Load comments for a post (limited view)
export async function loadComments(postId, container) {
  if (!container || !postId) return;
  
  try {
    // Show loading indicator
    container.innerHTML = '<div class="loading-comments">Loading comments...</div>';
    
    // Fetch comments from API
    const comments = await api.fetchComments(postId);
    
    // Clear loading indicator
    container.innerHTML = '';
    
    if (comments.length === 0) {
      container.innerHTML = '<div class="no-comments">No comments yet. Be the first to comment!</div>';
      return;
    }
    
    // Create comment elements
    comments.forEach(comment => {
      const commentElement = createCommentElement(comment);
      container.appendChild(commentElement);
    });
    
    // Add "view more comments" button if there are more than 5 comments
    if (comments.length === 5) {
      const viewMoreButton = document.createElement('button');
      viewMoreButton.className = 'view-more-comments';
      viewMoreButton.textContent = 'View more comments';
      container.appendChild(viewMoreButton);
    }
  } catch (error) {
    console.error('Error loading comments:', error);
    container.innerHTML = '<div class="loading-error">Failed to load comments. Please try again.</div>';
  }
}

// Load all comments for a post (in modal)
async function loadAllComments(postId) {
  if (!elements.fullCommentsList || !postId) return;
  
  try {
    // Fetch all comments from API (no limit)
    const comments = await api.fetchComments(postId, 50);
    
    // Clear loading indicator
    elements.fullCommentsList.innerHTML = '';
    
    if (comments.length === 0) {
      elements.fullCommentsList.innerHTML = '<div class="no-comments">No comments yet. Be the first to comment!</div>';
      return;
    }
    
    // Create comment elements
    comments.forEach(comment => {
      const commentElement = createCommentElement(comment);
      elements.fullCommentsList.appendChild(commentElement);
    });
  } catch (error) {
    console.error('Error loading comments:', error);
    elements.fullCommentsList.innerHTML = '<div class="loading-error">Failed to load comments. Please try again.</div>';
  }
}

// Create comment element
function createCommentElement(comment) {
  const commentElement = document.createElement('div');
  commentElement.className = 'comment';
  
  // Format timestamp
  const timestamp = comment.created_at ? new Date(comment.created_at) : new Date();
  const formattedTime = ui.formatTimestamp(timestamp);
  
  commentElement.innerHTML = `
    <div class="comment-avatar">
      <img src="${comment.author_avatar || '/api/placeholder/40/40'}" alt="${comment.author_name || 'Commenter'}">
    </div>
    <div class="comment-content">
      <div class="comment-author">${comment.author_name || 'Unknown'}</div>
      <div class="comment-text">${comment.content || ''}</div>
      <div class="comment-time">${formattedTime}</div>
    </div>
  `;
  
  return commentElement;
}

// Add a comment to a post (from post view)
export async function addComment(postId, content, postElement) {
  const state = window.socialApp.state;
  
  if (!postId || !content || !postElement || !state.selectedCharacterId) return;
  
  try {
    // Make API call to add comment
    await api.addComment(postId, state.selectedCharacterId, content);
    
    // Update UI
    // 1. Update comment count
    const commentCountElement = postElement.querySelector('.post-stats span:nth-child(2)');
    if (commentCountElement) {
      const currentText = commentCountElement.textContent;
      const currentCount = parseInt(currentText) || 0;
      commentCountElement.textContent = `${currentCount + 1} comments`;
    }
    
    // 2. Reload comments to show the new one
    const commentsContainer = postElement.querySelector('.comments-list');
    if (commentsContainer) {
      loadComments(postId, commentsContainer);
    }
    
    // Show success message
    ui.showMessage('Comment added successfully!', 'success');
    
  } catch (error) {
    console.error('Error adding comment:', error);
    ui.showMessage('Failed to add comment. Please try again.', 'error');
  }
}

// Submit a comment from the modal
async function submitModalComment(postId, state) {
  if (!postId || !elements.modalCommentInput || !state.selectedCharacterId) return;
  
  const content = elements.modalCommentInput.value.trim();
  
  if (!content) {
    return;
  }
  
  try {
    // Make API call to add comment
    await api.addComment(postId, state.selectedCharacterId, content);
    
    // Clear input
    elements.modalCommentInput.value = '';
    
    // Reload comments to show the new one
    loadAllComments(postId);
    
    // Show success message
    ui.showMessage('Comment added successfully!', 'success');
    
  } catch (error) {
    console.error('Error adding comment:', error);
    ui.showMessage('Failed to add comment. Please try again.', 'error');
  }
}