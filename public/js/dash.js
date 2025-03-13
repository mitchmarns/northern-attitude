document.addEventListener('DOMContentLoaded', function() {
  // Check if user is authenticated
  function checkAuthStatus() {
      const authInfo = JSON.parse(localStorage.getItem('authInfo') || sessionStorage.getItem('authInfo') || 'null');
      
      if (!authInfo || !authInfo.authenticated) {
          // User is not logged in, redirect to login page
          window.location.href = 'login.html';
          return null;
      }
      
      return authInfo;
  }
  
  // Verify authentication on page load
  const authInfo = checkAuthStatus();
  
  // If authentication check passed, update the UI with user info
  if (authInfo) {
      // Update welcome message or username display if needed
      // For example, if you have a username display element:
      // document.getElementById('username-display').textContent = authInfo.username;
      
      // Set up logout functionality
      const logoutLink = document.getElementById('logout-link');
      if (logoutLink) {
          logoutLink.addEventListener('click', function(e) {
              e.preventDefault();
              
              // Clear authentication data
              localStorage.removeItem('authInfo');
              sessionStorage.removeItem('authInfo');
              
              // Redirect to login page
              window.location.href = 'login.html';
          });
      }
  }
});