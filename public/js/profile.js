// profile.js - Client-side profile management

document.addEventListener('DOMContentLoaded', function() {
  // Check if user is authenticated, redirect to login if not
  window.authUtils.checkAuth(true);
  
  // Set up logout functionality
  window.authUtils.setupLogoutButton();
  
  // Load user profile data
  loadProfileData();
  
  // Load teams for dropdown
  loadTeams();
  
  // Set up tab functionality
  setupTabs();
  
  // Set up form submissions
  setupFormSubmissions();
  
  // Set up avatar upload preview
  setupAvatarUpload();
});

// Function to load user profile data
async function loadProfileData() {
  try {
    const response = await fetch('/api/users/profile', {
      method: 'GET',
      credentials: 'include'
    });
    
    if (response.ok) {
      const data = await response.json();
      populateProfileForm(data.profile);
      populateAccountForm(data.profile);
      populatePrivacyForm(data.profile);
      
      // Update avatar if available
      if (data.profile.avatar_url) {
        document.getElementById('avatar-image').src = data.profile.avatar_url;
      }
    } else {
      console.error('Error loading profile data');
      window.authUtils.showFormError('profile-form', 'Failed to load profile data');
    }
  } catch (error) {
    console.error('Profile data fetch error:', error);
    window.authUtils.showFormError('profile-form', 'An error occurred while loading your profile');
  }
}

// Function to load teams for the dropdown
async function loadTeams() {
  try {
    const response = await fetch('/api/teams', {
      method: 'GET',
      credentials: 'include'
    });
    
    if (response.ok) {
      const teams = await response.json();
      const dropdown = document.getElementById('favorite-team');
      
      // Clear existing options except the first one
      while (dropdown.options.length > 1) {
        dropdown.remove(1);
      }
      
      // Add team options
      teams.forEach(team => {
        const option = document.createElement('option');
        option.value = team.id;
        option.textContent = team.name;
        dropdown.appendChild(option);
      });
    } else {
      console.error('Error loading teams');
    }
  } catch (error) {
    console.error('Teams fetch error:', error);
  }
}

// Function to populate profile form with user data
function populateProfileForm(profile) {
  if (!profile) return;
  
  const form = document.getElementById('profile-form');
  
  // Set form values
  form.querySelector('#display-name').value = profile.display_name || '';
  form.querySelector('#location').value = profile.location || '';
  form.querySelector('#bio').value = profile.bio || '';
  
  // Set favorite team
  if (profile.favorite_team_id) {
    form.querySelector('#favorite-team').value = profile.favorite_team_id;
  }
  
  // Set preferred position
  if (profile.favorite_position) {
    form.querySelector('#favorite-position').value = profile.favorite_position;
  }
  
  // Set experience level
  if (profile.experience_level) {
    const experienceRadio = form.querySelector(`input[name="experience"][value="${profile.experience_level}"]`);
    if (experienceRadio) {
      experienceRadio.checked = true;
    }
  }
}

// Function to populate account form with user data
function populateAccountForm(profile) {
  if (!profile) return;
  
  const form = document.getElementById('account-form');
  
  // Set username and email
  form.querySelector('#username').value = profile.username || '';
  form.querySelector('#email').value = profile.email || '';
}

// Function to populate privacy form with user data
function populatePrivacyForm(profile) {
  if (!profile || !profile.privacy_settings) return;
  
  const form = document.getElementById('privacy-form');
  const settings = profile.privacy_settings;
  
  // Set visibility
  if (settings.visibility) {
    const visibilityRadio = form.querySelector(`input[name="visibility"][value="${settings.visibility}"]`);
    if (visibilityRadio) {
      visibilityRadio.checked = true;
    }
  }
  
  // Set communication preferences
  if (settings.preferences) {
    if (settings.preferences.includes('messages')) {
      form.querySelector('#receive-messages').checked = true;
    }
    
    if (settings.preferences.includes('online-status')) {
      form.querySelector('#show-online-status').checked = true;
    }
    
    if (settings.preferences.includes('email-notifications')) {
      form.querySelector('#email-notifications').checked = true;
    }
  }
}

// Function to set up tab functionality
function setupTabs() {
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
      
      // Clear any form messages when switching tabs
      window.authUtils.clearFormMessages('profile-form');
      window.authUtils.clearFormMessages('account-form');
      window.authUtils.clearFormMessages('privacy-form');
    });
  });
}

// Function to set up form submissions
function setupFormSubmissions() {
  // Profile form submission
  const profileForm = document.getElementById('profile-form');
  profileForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Get form values
    const formData = {
      display_name: document.getElementById('display-name').value.trim(),
      location: document.getElementById('location').value.trim(),
      bio: document.getElementById('bio').value.trim(),
      favorite_team_id: document.getElementById('favorite-team').value,
      favorite_position: document.getElementById('favorite-position').value,
      experience_level: document.querySelector('input[name="experience"]:checked')?.value || ''
    };
    
    try {
      window.authUtils.clearFormMessages('profile-form');
      
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData),
        credentials: 'include'
      });
      
      if (response.ok) {
        window.authUtils.showFormSuccess('profile-form', 'Profile updated successfully');
      } else {
        const data = await response.json();
        window.authUtils.showFormError('profile-form', data.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      window.authUtils.showFormError('profile-form', 'An error occurred. Please try again later');
    }
  });
  
  // Account form submission
  const accountForm = document.getElementById('account-form');
  accountForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Get form values
    const email = document.getElementById('email').value.trim();
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmNewPassword = document.getElementById('confirm-new-password').value;
    
    // Validate passwords if trying to change
    if (newPassword || confirmNewPassword) {
      if (newPassword.length < 8) {
        window.authUtils.showFormError('account-form', 'New password must be at least 8 characters long');
        return;
      }
      
      if (newPassword !== confirmNewPassword) {
        window.authUtils.showFormError('account-form', 'New passwords do not match');
        return;
      }
      
      if (!currentPassword) {
        window.authUtils.showFormError('account-form', 'Current password is required to change password');
        return;
      }
    }
    
    // Prepare data
    const formData = {
      email: email
    };
    
    // Only include password fields if trying to change password
    if (newPassword && currentPassword) {
      formData.current_password = currentPassword;
      formData.new_password = newPassword;
    }
    
    try {
      window.authUtils.clearFormMessages('account-form');
      
      const response = await fetch('/api/users/account', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData),
        credentials: 'include'
      });
      
      if (response.ok) {
        window.authUtils.showFormSuccess('account-form', 'Account updated successfully');
        
        // Clear password fields
        document.getElementById('current-password').value = '';
        document.getElementById('new-password').value = '';
        document.getElementById('confirm-new-password').value = '';
      } else {
        const data = await response.json();
        window.authUtils.showFormError('account-form', data.message || 'Failed to update account');
      }
    } catch (error) {
      console.error('Account update error:', error);
      window.authUtils.showFormError('account-form', 'An error occurred. Please try again later');
    }
  });
  
  // Privacy form submission
  const privacyForm = document.getElementById('privacy-form');
  privacyForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Get form values
    const visibility = document.querySelector('input[name="visibility"]:checked')?.value || 'members';
    
    // Get checked preferences
    const preferences = [];
    document.querySelectorAll('input[name="preferences"]:checked').forEach(checkbox => {
      preferences.push(checkbox.value);
    });
    
    const formData = {
      privacy_settings: {
        visibility: visibility,
        preferences: preferences
      }
    };
    
    try {
      window.authUtils.clearFormMessages('privacy-form');
      
      const response = await fetch('/api/users/privacy', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData),
        credentials: 'include'
      });
      
      if (response.ok) {
        window.authUtils.showFormSuccess('privacy-form', 'Privacy settings updated successfully');
      } else {
        const data = await response.json();
        window.authUtils.showFormError('privacy-form', data.message || 'Failed to update privacy settings');
      }
    } catch (error) {
      console.error('Privacy settings update error:', error);
      window.authUtils.showFormError('privacy-form', 'An error occurred. Please try again later');
    }
  });
}

// Function to set up avatar upload preview and handling
function setupAvatarUpload() {
  const avatarInput = document.getElementById('avatar-file');
  const avatarPreview = document.getElementById('avatar-image');
  
  avatarInput.addEventListener('change', async function(e) {
    const file = e.target.files[0];
    
    if (!file) return;
    
    // Check file type
    if (!file.type.match('image.*')) {
      window.authUtils.showFormError('profile-form', 'Please select an image file (JPEG, PNG)');
      return;
    }
    
    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      window.authUtils.showFormError('profile-form', 'Image size should be less than 2MB');
      return;
    }
    
    // Show preview
    const reader = new FileReader();
    reader.onload = function(e) {
      avatarPreview.src = e.target.result;
    };
    reader.readAsDataURL(file);
    
    // Upload avatar to server
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      
      const response = await fetch('/api/users/avatar', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (response.ok) {
        window.authUtils.showFormSuccess('profile-form', 'Avatar updated successfully');
      } else {
        const data = await response.json();
        window.authUtils.showFormError('profile-form', data.message || 'Failed to upload avatar');
      }
    } catch (error) {
      console.error('Avatar upload error:', error);
      window.authUtils.showFormError('profile-form', 'An error occurred while uploading your avatar');
    }
  });
}