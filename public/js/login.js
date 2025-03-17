// Fixed login.js with improved error handling and redirection
document.addEventListener('DOMContentLoaded', function() {
  const loginForm = document.getElementById('login-form');
  
  // Add error and success message divs if they don't exist
  const authSubtitle = document.querySelector('.auth-subtitle');
  
  // Create error div if it doesn't exist
  let errorDiv = document.getElementById('login-form-error');
  if (!errorDiv) {
    errorDiv = document.createElement('div');
    errorDiv.className = 'auth-error';
    errorDiv.id = 'login-form-error';
    authSubtitle.parentNode.insertBefore(errorDiv, authSubtitle.nextSibling);
  }
  
  // Create success div if it doesn't exist
  let successDiv = document.getElementById('login-form-success');
  if (!successDiv) {
    successDiv = document.createElement('div');
    successDiv.className = 'auth-success';
    successDiv.id = 'login-form-success';
    authSubtitle.parentNode.insertBefore(successDiv, authSubtitle.nextSibling);
  }
  
  // Check if the user is already logged in
  window.authUtils.checkAuth(false, true);
  
  // Handle login form submission
  loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Get form values
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('remember')?.checked || false;
    
    // Reset error messages
    window.authUtils.clearFormMessages('login-form');
    
    // Client-side validation
    if (!validateEmail(email)) {
      window.authUtils.showFormError('login-form', 'Please enter a valid email address');
      return;
    }
    
    if (password.length < 1) {
      window.authUtils.showFormError('login-form', 'Please enter your password');
      return;
    }
    
    try {
      // Show loading state
      const submitButton = loginForm.querySelector('button[type="submit"]');
      const originalButtonText = submitButton.textContent;
      submitButton.disabled = true;
      submitButton.textContent = 'Signing in...';
      
      // Send login request to server
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password, rememberMe }),
        credentials: 'include'
      });
      
      // Parse response
      const data = await response.json();
      
      // Reset button state
      submitButton.disabled = false;
      submitButton.textContent = originalButtonText;
      
      if (response.ok) {
        // Login successful
        window.authUtils.showFormSuccess('login-form', 'Login successful! Redirecting...');
        
        // Store user data in localStorage for persistence across page reloads
        // (only non-sensitive data)
        const userData = {
          id: data.user.id,
          username: data.user.username,
          email: data.user.email,
          role: data.user.role
        };
        
        // Get redirect URL from query string or use default
        const redirectUrl = window.authUtils.getQueryParam('redirect') || 'dash.html';
        
        // Ensure redirect URL starts with slash if it's a relative path
        const targetUrl = redirectUrl.startsWith('/') ? 
          redirectUrl : 
          `/html/${redirectUrl}`;
        
        // Redirect after a short delay
        setTimeout(() => {
          window.location.href = targetUrl;
        }, 1000);
      } else {
        // Login failed
        window.authUtils.showFormError('login-form', data.message || 'Login failed. Please try again.');
      }
    } catch (error) {
      console.error('Login error:', error);
      window.authUtils.showFormError('login-form', 'An error occurred. Please try again later.');
      
      // Reset button state in case of error
      const submitButton = loginForm.querySelector('button[type="submit"]');
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Sign In';
      }
    }
  });
  
  // Helper function for email validation
  function validateEmail(email) {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(email);
  }
  
  // Set up forgot password link
  const forgotPasswordLink = document.querySelector('.forgot-password');
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', function(e) {
      e.preventDefault();
      window.location.href = 'forgot-password.html';
    });
  }
});