// Updated auth-utils.js - Client-side authentication utilities
window.authUtils = (function() {
  // Cache commonly used element selectors
  const SELECTORS = {
    protectedPaths: [
      '/html/dash.html',
      '/html/profile.html',
      '/html/my-characters.html',
      '/html/character-profile.html',
      '/html/character-form.html',
      '/html/team-detail.html',
      '/html/team-management.html',
      '/html/messages.html'
    ],
    publicPaths: [
      '/html/login.html',
      '/html/signup.html',
      '/html/forgot-password.html',
      '/html/reset-password.html',
      '/',
      '/index.html'
    ]
  };

  // Current user data cache
  let currentUserData = null;

  // Create a throttled version of checkAuth to prevent rapid consecutive calls
  const throttledCheckAuth = throttle(checkAuth, 300);

  // Function to check authentication status
  async function checkAuth(redirectToLogin = true, redirectToHome = false) {
    try {
      // If we already have user data in memory, use it
      if (currentUserData) {
        return handleAuthSuccess(currentUserData, redirectToHome);
      }

      // Fetch current user data
      const response = await fetch('/api/auth/current-user', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      // Process response
      if (response.ok) {
        const data = await response.json();
        currentUserData = data.user;
        return handleAuthSuccess(currentUserData, redirectToHome);
      } else {
        return handleAuthFailure(redirectToLogin);
      }
    } catch (error) {
      console.error('Authentication check failed:', error);
      return handleAuthFailure(redirectToLogin);
    }
  }

  // Handle the successful authentication case
  function handleAuthSuccess(user, redirectToHome) {
    // Update UI with user info
    updateUserUI(user);
    
    // If we're on a public page but should redirect authenticated users
    if (redirectToHome && isPublicPage()) {
      window.location.href = '/html/dash.html';
      return null;
    }
    
    return user;
  }

  // Handle the failed authentication case
  function handleAuthFailure(redirectToLogin) {
    // Clear user data cache
    currentUserData = null;
    
    // If we're on a protected page, redirect to login
    if (redirectToLogin && isProtectedPage()) {
      const currentPath = window.location.pathname;
      window.location.href = '/html/login.html?redirect=' + encodeURIComponent(currentPath);
      return null;
    }
    
    return null;
  }

  // Check if current page is protected
  function isProtectedPage() {
    const currentPath = window.location.pathname;
    return SELECTORS.protectedPaths.some(path => currentPath.includes(path));
  }

  // Check if current page is public
  function isPublicPage() {
    const currentPath = window.location.pathname;
    return SELECTORS.publicPaths.some(path => currentPath === path);
  }

  // Update UI elements with user info
  function updateUserUI(user) {
    if (!user) return;
    
    // Update username display if it exists
    const usernameDisplay = document.getElementById('username-display');
    if (usernameDisplay) {
      usernameDisplay.textContent = user.username;
    }
    
    // Show/hide user menu if it exists
    const userMenu = document.querySelector('.user-menu');
    if (userMenu) {
      userMenu.style.display = 'block';
    }
    
    // Add other user-specific UI updates here...
  }

  // Function to handle logout
  async function logout() {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      // Clear user data regardless of response
      currentUserData = null;
      
      // Redirect to login page
      window.location.href = '/html/login.html';
    } catch (error) {
      console.error('Logout error:', error);
      // Still redirect to login page even if logout fails server-side
      window.location.href = '/html/login.html';
    }
  }

  // Set up logout button event listener
  function setupLogoutButton() {
    const logoutButton = document.getElementById('logout-link');
    if (logoutButton) {
      // Remove any existing listeners first
      const newLogoutBtn = logoutButton.cloneNode(true);
      logoutButton.parentNode.replaceChild(newLogoutBtn, logoutButton);
      
      // Add the event listener
      newLogoutBtn.addEventListener('click', handleLogout);
    }
  }

  // Handler function for logout
  function handleLogout(e) {
    e.preventDefault();
    logout();
  }

  // Show error message in form
  function showFormError(formId, message) {
    const errorDiv = document.getElementById(`${formId}-error`);
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
      
      // Scroll to error message for better UX
      errorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  // Show success message in form
  function showFormSuccess(formId, message) {
    const successDiv = document.getElementById(`${formId}-success`);
    if (successDiv) {
      successDiv.textContent = message;
      successDiv.style.display = 'block';
      
      // Scroll to success message for better UX
      successDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  // Clear form messages
  function clearFormMessages(formId) {
    // Use selectors that can find elements even if they don't have the exact ID format
    const selectors = [
      `#${formId}-error`, 
      `#${formId}-success`,
      `.${formId}-error`,
      `.${formId}-success`
    ];
    
    // Try different selectors to find the message elements
    selectors.forEach(selector => {
      const element = document.querySelector(selector);
      if (element) {
        element.style.display = 'none';
        element.textContent = '';
      }
    });
  }

  // Get URL query parameters
  function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
  }

  // Throttle function to limit how often a function can be called
  function throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // Public API
  return {
    checkAuth: throttledCheckAuth,
    updateUserUI,
    logout,
    setupLogoutButton,
    showFormError,
    showFormSuccess,
    clearFormMessages,
    getQueryParam
  };
})();