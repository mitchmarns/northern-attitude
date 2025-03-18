// public/js/social/interactions.js - Likes, shares, follows

import * as api from './api.js';
import * as comments from './comments.js';
import * as ui from './ui.js';

// Initialize the interactions module
export function init(state) {
  // Set up global event delegation for post interactions
  document.addEventListener('click', (e) => handlePostInteractions(e, state));
}

// Handle post interactions via event delegation
function handlePostInteractions(e, state) {
  // Comment button clicks
  if (e.target.classList.contains('comment-btn') || e.target.parentElement.classList.contains('comment-btn')) {
    const postElement = ui.getClosestElement(e.target, '.social-post');
    if (postElement) {
      const postId = postElement.dataset.postId;
      comments.toggleComments(postElement, postId, state);
    }
  }
  
  // View more comments button
  if (e.target.classList.contains('view-more-comments') || e.target.closest('.view-more-comments')) {
    const postElement = ui.getClosestElement(e.target, '.social-post');
    if (postElement) {
      const postId = postElement.dataset.postId;
      comments.showCommentsModal(postId, state);
    }
  }
  
  // Like button clicks
  if (e.target.classList.contains('like-btn') || e.target.parentElement.classList.contains('like-btn')) {
    const button = e.target.classList.contains('like-btn') ? e.target : e.target.parentElement;
    const postElement = ui.getClosestElement(button, '.social-post');
    if (postElement) {
      const postId = postElement.dataset.postId;
      toggleLike(button, postId, state);
    }
  }
  
  // Follow button clicks
  if (e.target.classList.contains('follow-btn')) {
    const targetId = e.target.dataset.characterId;
    if (targetId && state.selectedCharacterId) {
      toggleFollow(e.target, targetId, state);
    }
  }
}

// Toggle like on a post
export async function toggleLike(likeButton, postId, state) {
  if (!likeButton || !postId || !state.selectedCharacterId) return;
  
  try {
    // Toggle UI state immediately for better user experience
    const wasLiked = likeButton.classList.contains('liked');
    likeButton.classList.toggle('liked');
    
    // Update like count
    const postElement = ui.getClosestElement(likeButton, '.social-post');
    const likeCountElement = postElement?.querySelector('.post-stats span:first-child');
    if (likeCountElement) {
      const currentText = likeCountElement.textContent;
      const currentCount = parseInt(currentText) || 0;
      const newCount = wasLiked ? currentCount - 1 : currentCount + 1;
      likeCountElement.textContent = `${newCount} likes`;
    }
    
    // Send API request
    await api.toggleLike(postId, state.selectedCharacterId);
    
  } catch (error) {
    console.error('Error toggling like:', error);
    
    // Revert UI changes if the request fails
    likeButton.classList.toggle('liked');
    
    const postElement = ui.getClosestElement(likeButton, '.social-post');
    const likeCountElement = postElement?.querySelector('.post-stats span:first-child');
    
    if (likeCountElement) {
      const currentText = likeCountElement.textContent;
      const currentCount = parseInt(currentText) || 0;
      const wasLiked = likeButton.classList.contains('liked');
      const originalCount = wasLiked ? currentCount - 1 : currentCount + 1;
      likeCountElement.textContent = `${originalCount} likes`;
    }
    
    ui.showMessage('Failed to update like status', 'error');
  }
}

// Toggle follow relationship
export async function toggleFollow(followButton, targetId, state) {
  if (!followButton || !targetId || !state.selectedCharacterId) return;
  
  try {
    // Update UI immediately for better user experience
    const isFollowing = followButton.classList.contains('following');
    
    if (isFollowing) {
      followButton.textContent = 'Follow';
      followButton.classList.remove('following');
    } else {
      followButton.textContent = 'Following';
      followButton.classList.add('following');
    }
    
    // Send API request
    await api.toggleFollow(state.selectedCharacterId, targetId);
    
  } catch (error) {
    console.error('Error toggling follow:', error);
    
    // Revert UI changes if the request fails
    const isFollowing = followButton.classList.contains('following');
    
    if (isFollowing) {
      followButton.textContent = 'Follow';
      followButton.classList.remove('following');
    } else {
      followButton.textContent = 'Following';
      followButton.classList.add('following');
    }
    
    ui.showMessage('Failed to update follow status', 'error');
  }
}