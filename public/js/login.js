document.addEventListener('DOMContentLoaded', function() {
  const loginForm = document.getElementById('login-form');
  
  // Add error message div to the form (insert after subtitle)
  const authSubtitle = document.querySelector('.auth-subtitle');
  const errorDiv = document.createElement('div');
  errorDiv.className = 'auth-error';
  errorDiv.id = 'auth-error';
  authSubtitle.parentNode.insertBefore(errorDiv, authSubtitle.nextSibling);
  
  loginForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      // Get form values
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const rememberMe = document.getElementById('remember')?.checked || false;
      
      // Reset error messages
      errorDiv.style.display = 'none';
      
      // Validate form
      if (!validateEmail(email)) {
          showError('Please enter a valid email address');
          return;
      }
      
      if (password.length < 1) {
          showError('Please enter your password');
          return;
      }
      
      // In a real application, this is where you would send an AJAX request to your server
      // For demonstration, we'll check against localStorage
      
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const user = users.find(user => user.email === email);
      
      if (!user) {
          showError('No account found with this email address');
          return;
      }
      
      // Check password (in a real app, use proper password verification)
      if (user.password !== hashPassword(password)) {
          showError('Incorrect password');
          return;
      }
      
      // Login successful
      
      // Store authentication state
      const authInfo = {
          userId: user.id,
          username: user.username,
          email: user.email,
          authenticated: true,
          loginTime: new Date().toISOString()
      };
      
      // In a real app, you'd use a secure HTTP-only cookie or JWT token
      if (rememberMe) {
          localStorage.setItem('authInfo', JSON.stringify(authInfo));
      } else {
          sessionStorage.setItem('authInfo', JSON.stringify(authInfo));
      }
      
      // Redirect to dashboard
      window.location.href = 'dash.html';
  });
  
  // Helper functions
  function showError(message) {
      const errorDiv = document.getElementById('auth-error');
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
  }
  
  function validateEmail(email) {
      const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      return re.test(email);
  }
  
  // Simple password hashing function - NOT for production use!
  function hashPassword(password) {
      return btoa(password);
  }
  
  // Check if user is already logged in
  function checkAuthStatus() {
      const authInfo = JSON.parse(localStorage.getItem('authInfo') || sessionStorage.getItem('authInfo') || 'null');
      
      if (authInfo && authInfo.authenticated) {
          // User is already logged in, redirect to dashboard
          window.location.href = 'dash.html';
      }
  }
  
  // Check auth status when page loads
  checkAuthStatus();
});