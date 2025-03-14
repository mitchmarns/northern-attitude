// profile.js - Client-side functionality for user profiles

document.addEventListener('DOMContentLoaded', function() {
  // Check if user is authenticated
  window.authUtils.checkAuth(true);
  
  // Set up logout functionality
  window.authUtils.setupLogoutButton();

  // Set up tab switching
  setupTabSwitching();
  
  // Set up avatar preview functionality
  setupAvatarPreview();
  
  // Set up form submissions
  setupFormSubmissions();
  
  // Load user profile data
  loadUserProfile();
});

// Function to set up tab switching
function setupTabSwitching() {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Remove active class from all buttons and contents
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      // Add active class to clicked button and corresponding content
      button.classList.add('active');
      const tabId = button.getAttribute('data-tab');
      document.getElementById(tabId).classList.add('active');
    });
  });
}

// Function to set up avatar preview
function setupAvatarPreview() {
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

// Function to set up form submissions
function setupFormSubmissions() {
  // Profile Info Form
  const profileForm = document.getElementById('profile-form');
  if (profileForm) {
    profileForm.addEventListener('submit', function(e) {
      e.preventDefault();
      updateProfileInfo();
    });
  }
  
  // Account Settings Form
  const accountForm = document.getElementById('account-form');
  if (accountForm) {
    accountForm.addEventListener('submit', function(e) {
      e.preventDefault();
      updateAccountSettings();
    });
  }
  
  // Privacy Settings Form
  const privacyForm = document.getElementById('privacy-form');
  if (privacyForm) {
    privacyForm.addEventListener('submit', function(e) {
      e.preventDefault();
      updatePrivacySettings();
    });
  }
}

// Function to load user profile data
async function loadUserProfile() {
  try {
    const response = await fetch('/api/users/profile', {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch profile data');
    }
    
    const data = await response.json();
    const profile = data.profile;
    
    // Populate profile info
    document.getElementById('display-name').value = profile.display_name || '';
    document.getElementById('location').value = profile.location || '';
    document.getElementById('bio').value = profile.bio || '';
    
    // Set avatar if available
    if (profile.avatar_url) {
      document.getElementById('avatar-url').value = profile.avatar_url;
      document.getElementById('avatar-image').src = profile.avatar_url;
    }
    
    // Set experience level
    if (profile.experience_level) {
      const experienceRadio = document.getElementById(profile.experience_level);
      if (experienceRadio) {
        experienceRadio.checked = true;
      }
    }
    
    // Populate account settings
    document.getElementById('username').value = profile.username || '';
    document.getElementById('email').value = profile.email || '';
    
    // Populate privacy settings
    if (profile.privacy_settings) {
      // Set visibility
      const visibilitySelect = document.getElementById('profile-visibility');
      if (visibilitySelect && profile.privacy_settings.visibility) {
        visibilitySelect.value = profile.privacy_settings.visibility;
      }
      
      // Set notification preferences
      if (Array.isArray(profile.privacy_settings.preferences)) {
        profile.privacy_settings.preferences.forEach(pref => {
          const checkbox = document.getElementById(`${pref}-notifications`);
          if (checkbox) {
            checkbox.checked = true;
          }
        });
      }
    }
  } catch (error) {
    console.error('Error loading profile:', error);
    window.authUtils.showFormError('profile-form', 'Failed to load profile data. Please try again later.');
  }
}

// Function to update profile info
async function updateProfileInfo() {
  try {
    // Get form values
    const displayName = document.getElementById('display-name').value.trim();
    const location = document.getElementById('location').value.trim();
    const bio = document.getElementById('bio').value.trim();
    const avatarUrl = document.getElementById('avatar-url').value.trim();
    const experience = document.querySelector('input[name="experience"]:checked')?.value;
    
    // Validate required fields
    if (!displayName) {
      window.authUtils.showFormError('profile-form', 'Display name is required');
      return;
    }
    
    // Show loading state
    const submitButton = document.querySelector('#profile-form button[type="submit"]');
    const originalButtonText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Saving...';
    
    // Clear previous messages
    window.authUtils.clearFormMessages('profile-form');
    
    // Prepare update data
    const updateData = {
      display_name: displayName,
      bio: bio,
      location: location,
      experience_level: experience || 'beginner'
    };
    
    // Update avatar URL
    if (avatarUrl) {
      await updateAvatar(avatarUrl);
    }
    
    // Update profile
    const response = await fetch('/api/users/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData),
      credentials: 'include'
    });
    
    // Reset button state
    submitButton.disabled = false;
    submitButton.textContent = originalButtonText;
    
    if (!response.ok) {
      throw new Error('Failed to update profile');
    }
    
    // Show success message
    window.authUtils.showFormSuccess('profile-form', 'Profile updated successfully!');
  } catch (error) {
    console.error('Error updating profile:', error);
    
    // Reset button state
    const submitButton = document.querySelector('#profile-form button[type="submit"]');
    submitButton.disabled = false;
    submitButton.textContent = 'Save Profile';
    
    // Show error message
    window.authUtils.showFormError('profile-form', 'Failed to update profile. Please try again later.');
  }
}

// Function to update avatar
async function updateAvatar(avatarUrl) {
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
    
    return true;
  } catch (error) {
    console.error('Error updating avatar:', error);
    throw error;
  }
}

// Function to update account settings
async function updateAccountSettings() {
  try {
    // Get form values
    const email = document.getElementById('email').value.trim();
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-new-password').value;
    
    // Validate required fields
    if (!email) {
      window.authUtils.showFormError('account-form', 'Email is required');
      return;
    }
    
    // Validate email format
    if (!validateEmail(email)) {
      window.authUtils.showFormError('account-form', 'Please enter a valid email address');
      return;
    }
    
    // Validate password if changing
    if (newPassword || confirmPassword) {
      if (!currentPassword) {
        window.authUtils.showFormError('account-form', 'Current password is required to set a new password');
        return;
      }
      
      if (newPassword.length < 8) {
        window.authUtils.showFormError('account-form', 'New password must be at least 8 characters');
        return;
      }
      
      if (newPassword !== confirmPassword) {
        window.authUtils.showFormError('account-form', 'New passwords do not match');
        return;
      }
    }
    
    // Show loading state
    const submitButton = document.querySelector('#account-form button[type="submit"]');
    const originalButtonText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Updating...';
    
    // Clear previous messages
    window.authUtils.clearFormMessages('account-form');
    
    // Prepare update data
    const updateData = {
      email: email
    };
    
    // Add password data if changing
    if (newPassword) {
      updateData.current_password = currentPassword;
      updateData.new_password = newPassword;
    }
    
    // Update account
    const response = await fetch('/api/users/account', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData),
      credentials: 'include'
    });
    
    // Reset button state
    submitButton.disabled = false;
    submitButton.textContent = originalButtonText;
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || 'Failed to update account');
    }
    
    // Show success message
    window.authUtils.showFormSuccess('account-form', 'Account settings updated successfully!');
    
    // Clear password fields
    document.getElementById('current-password').value = '';
    document.getElementById('new-password').value = '';
    document.getElementById('confirm-new-password').value = '';
  } catch (error) {
    console.error('Error updating account settings:', error);
    
    // Reset button state
    const submitButton = document.querySelector('#account-form button[type="submit"]');
    submitButton.disabled = false;
    submitButton.textContent = 'Update Account';
    
    // Show error message
    window.authUtils.showFormError('account-form', error.message || 'Failed to update account settings. Please try again later.');
  }
}

// Function to update privacy settings
async function updatePrivacySettings() {
  try {
    // Get form values
    const visibility = document.getElementById('profile-visibility').value;
    
    // Get selected notification preferences
    const notificationCheckboxes = document.querySelectorAll('input[name="notifications"]:checked');
    const preferences = Array.from(notificationCheckboxes).map(checkbox => checkbox.value);
    
    // Show loading state
    const submitButton = document.querySelector('#privacy-form button[type="submit"]');
    const originalButtonText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Saving...';
    
    // Clear previous messages
    window.authUtils.clearFormMessages('privacy-form');
    
    // Prepare update data
    const updateData = {
      privacy_settings: {
        visibility: visibility,
        preferences: preferences
      }
    };
    
    // Update privacy settings
    const response = await fetch('/api/users/privacy', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData),
      credentials: 'include'
    });
    
    // Reset button state
    submitButton.disabled = false;
    submitButton.textContent = originalButtonText;
    
    if (!response.ok) {
      throw new Error('Failed to update privacy settings');
    }
    
    // Show success message
    window.authUtils.showFormSuccess('privacy-form', 'Privacy settings updated successfully!');
  } catch (error) {
    console.error('Error updating privacy settings:', error);
    
    // Reset button state
    const submitButton = document.querySelector('#privacy-form button[type="submit"]');
    submitButton.disabled = false;
    submitButton.textContent = 'Save Privacy Settings';
    
    // Show error message
    window.authUtils.showFormError('privacy-form', 'Failed to update privacy settings. Please try again later.');
  }
}

// Helper function for email validation
function validateEmail(email) {
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return re.test(email);
}