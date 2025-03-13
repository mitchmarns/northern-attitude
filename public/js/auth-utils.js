// auth-utils.js - Client-side authentication utilities

// Update the checkAuth function in auth-utils.js
async function checkAuth(redirectToLogin = true, redirectToHome = false) {
  try {
    const response = await fetch('/api/auth/current-user', {
      method: 'GET',
      credentials: 'include'
    });
    
    if (response.ok) {
      const data = await response.json();
      const user = data.user;
      
      // Store user info in JS memory (not localStorage)
      window.currentUser = user;
      
      // Update UI with user info if on authenticated pages
      updateUserUI(user);
      
      // If we're on a public page but should redirect authenticated users
      if (redirectToHome && window.location.pathname.includes('/html/login.html') || 
          window.location.pathname.includes('/html/signup.html') || 
          window.location.pathname.includes('/html/forgot-password.html') ||
          window.location.pathname.includes('/html/reset-password.html') ||
          window.location.pathname === '/' ||
          window.location.pathname === '/index.html') {
        window.location.href = '/html/dash.html';
        return null;
      }
      
      return user;
    } else {
      // If we're on a protected page, redirect to login
      if (redirectToLogin && (
          window.location.pathname.includes('/html/dash.html') || 
          window.location.pathname.includes('/html/profile.html') ||
          window.location.pathname.includes('/html/my-characters.html') ||
          window.location.pathname.includes('/html/character-profile.html') ||
          window.location.pathname.includes('/html/character-form.html')
      )) {
        window.location.href = '/html/login.html?redirect=' + encodeURIComponent(window.location.pathname);
        return null;
      }
      
      return null;
    }
  } catch (error) {
    console.error('Authentication check failed:', error);
    
    if (redirectToLogin && !window.location.pathname.includes('/html/login.html')) {
      window.location.href = '/html/login.html?redirect=' + encodeURIComponent(window.location.pathname);
    }
    
    return null;
  }
}

// Update UI elements with user info
function updateUserUI(user) {
  if (!user) return;
  
  // If we have a username display element, update it
  const usernameDisplay = document.getElementById('username-display');
  if (usernameDisplay) {
    usernameDisplay.textContent = user.username;
  }
  
  // If we have other user-specific UI elements, update them here
}

// Handle logout
async function logout() {
  try {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
    
    if (response.ok) {
      // Clear any client-side user data
      window.currentUser = null;
      
      // Redirect to login page
      window.location.href = '/login.html';
    } else {
      console.error('Logout failed');
    }
  } catch (error) {
    console.error('Logout error:', error);
  }
}

// Set up logout button event listener
function setupLogoutButton() {
  const logoutButton = document.getElementById('logout-link');
  if (logoutButton) {
    logoutButton.addEventListener('click', function(e) {
      e.preventDefault();
      logout();
    });
  }
}

// Show error message in form
function showFormError(formId, message) {
  const errorDiv = document.getElementById(`${formId}-error`);
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
  }
}

// Show success message in form
function showFormSuccess(formId, message) {
  const successDiv = document.getElementById(`${formId}-success`);
  if (successDiv) {
    successDiv.textContent = message;
    successDiv.style.display = 'block';
  }
}

// Clear form messages
function clearFormMessages(formId) {
  const errorDiv = document.getElementById(`${formId}-error`);
  const successDiv = document.getElementById(`${formId}-success`);
  
  if (errorDiv) {
    errorDiv.style.display = 'none';
    errorDiv.textContent = '';
  }
  
  if (successDiv) {
    successDiv.style.display = 'none';
    successDiv.textContent = '';
  }
}

// Get URL query parameters
function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

// Export utilities
window.authUtils = {
  checkAuth,
  updateUserUI,
  logout,
  setupLogoutButton,
  showFormError,
  showFormSuccess,
  clearFormMessages,
  getQueryParam
};