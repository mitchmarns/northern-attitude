document.addEventListener('DOMContentLoaded', function() {
  // Check if user is authenticated, redirect to login if not
  window.authUtils.checkAuth(true);
  
  // Set up logout functionality
  window.authUtils.setupLogoutButton();
  
  // Add username display to the header if it doesn't exist
  const headerContent = document.querySelector('.header-content');
  if (headerContent) {
    // Check if the username display already exists
    let usernameDisplay = document.getElementById('username-display');
    
    if (!usernameDisplay) {
      // Create a container for the username display and logout
      const userContainer = document.createElement('div');
      userContainer.className = 'user-container';
      
      // Add username display
      usernameDisplay = document.createElement('span');
      usernameDisplay.id = 'username-display';
      usernameDisplay.className = 'username-display';
      
      // Add logout link
      const logoutLink = document.createElement('a');
      logoutLink.id = 'logout-link';
      logoutLink.href = '#';
      logoutLink.textContent = 'Log Out';
      logoutLink.className = 'logout-link';
      
      // Append to the container
      userContainer.appendChild(usernameDisplay);
      userContainer.appendChild(document.createTextNode(' | '));
      userContainer.appendChild(logoutLink);
      
      // Add to the header
      headerContent.appendChild(userContainer);
      
      // Set up the logout button
      window.authUtils.setupLogoutButton();
    }
  }
  
  // Update the UI with the current user's info
  if (window.currentUser) {
    const usernameDisplay = document.getElementById('username-display');
    if (usernameDisplay) {
      usernameDisplay.textContent = window.currentUser.username;
    }
  }
});