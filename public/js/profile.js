// Update profile.js - Function to set up avatar upload preview using URLs

function setupAvatarUpload() {
  const avatarUrlInput = document.getElementById('avatar-url');
  const previewButton = document.getElementById('preview-avatar-btn');
  const avatarPreview = document.getElementById('avatar-image');
  
  previewButton.addEventListener('click', function() {
    const imageUrl = avatarUrlInput.value.trim();
    
    if (!imageUrl) {
      window.authUtils.showFormError('profile-form', 'Please enter an image URL');
      return;
    }
    
    // Update the preview image
    avatarPreview.src = imageUrl;
    
    // Handle load errors
    avatarPreview.onerror = function() {
      avatarPreview.src = '/api/placeholder/150/150';
      window.authUtils.showFormError('profile-form', 'Invalid image URL or image could not be loaded');
    };
    
    // Handle successful load
    avatarPreview.onload = function() {
      window.authUtils.clearFormMessages('profile-form');
    };
  });
}

// Additional function to update avatar in profile
async function updateAvatar() {
  const avatarUrl = document.getElementById('avatar-url').value.trim();
  
  if (!avatarUrl) {
    window.authUtils.showFormError('profile-form', 'Please enter an image URL');
    return;
  }
  
  try {
    const response = await fetch('/api/users/avatar', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ avatar_url: avatarUrl }),
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to update avatar');
    }
    
    window.authUtils.showFormSuccess('profile-form', 'Avatar updated successfully');
  } catch (error) {
    console.error('Avatar update error:', error);
    window.authUtils.showFormError('profile-form', 'An error occurred while updating your avatar');
  }
}