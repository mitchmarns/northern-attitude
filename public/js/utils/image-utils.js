/**
 * Utility functions for handling images
 */

// Function to handle image loading errors
function handleImageError(img) {
  // Check if there's a data-fallback attribute first
  if (img.getAttribute('data-fallback')) {
    img.src = img.getAttribute('data-fallback');
  } else {
    // Otherwise use default avatar
    img.src = '/img/default-character.png';
  }
  
  // Add class for styling
  img.classList.add('image-fallback');
  
  // Remove onerror to prevent endless loop if fallback also fails
  img.onerror = null;
}

// Get the appropriate image URL from a character object
function getCharacterImageUrl(character) {
  if (!character) return '/img/default-character.png';
  
  // Try avatar_url first, then url, then fallback
  return character.avatar_url || character.url || '/img/default-character.png';
}

// Handle all avatar images in the page
document.addEventListener('DOMContentLoaded', function() {
  // Add error handler to all avatars
  const avatarImages = document.querySelectorAll(
    '.profile-avatar, .post-avatar, .comment-avatar img, .active-character-avatar, .suggested-avatar, .character-image'
  );
  
  avatarImages.forEach(img => {
    img.onerror = function() {
      handleImageError(this);
    };
    
    // Force the error handler for images that are already broken
    if (img.complete && img.naturalHeight === 0) {
      handleImageError(img);
    }
  });
});

// Export the functions for direct use
window.handleImageError = handleImageError;
window.getCharacterImageUrl = getCharacterImageUrl;
