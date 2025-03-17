// Fixed signup.js with improved error handling and redirection
document.addEventListener('DOMContentLoaded', function() {
  const signupForm = document.getElementById('signup-form');
  
  // Add error and success message divs if they don't exist
  const authSubtitle = document.querySelector('.auth-subtitle');
  
  // Create error div if it doesn't exist
  let errorDiv = document.getElementById('signup-form-error');
  if (!errorDiv) {
    errorDiv = document.createElement('div');
    errorDiv.className = 'auth-error';
    errorDiv.id = 'signup-form-error';
    authSubtitle.parentNode.insertBefore(errorDiv, authSubtitle.nextSibling);
  }
  
  // Create success div if it doesn't exist
  let successDiv = document.getElementById('signup-form-success');
  if (!successDiv) {
    successDiv = document.createElement('div');
    successDiv.className = 'auth-success';
    successDiv.id = 'signup-form-success';
    authSubtitle.parentNode.insertBefore(successDiv, authSubtitle.nextSibling);
  }
  
  // Check if the user is already logged in
  window.authUtils.checkAuth(false, true);
  
  // Handle signup form submission
  signupForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Get form values
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const termsAccepted = document.getElementById('terms').checked;
    
    // Reset error messages
    window.authUtils.clearFormMessages('signup-form');
    
    // Client-side validation
    if (username.length < 3) {
      window.authUtils.showFormError('signup-form', 'Username must be at least 3 characters long');
      return;
    }
    
    if (!validateEmail(email)) {
      window.authUtils.showFormError('signup-form', 'Please enter a valid email address');
      return;
    }
    
    if (password.length < 8) {
      window.authUtils.showFormError('signup-form', 'Password must be at least 8 characters long');
      return;
    }
    
    if (password !== confirmPassword) {
      window.authUtils.showFormError('signup-form', 'Passwords do not match');
      return;
    }
    
    if (!termsAccepted) {
      window.authUtils.showFormError('signup-form', 'You must accept the Terms of Service and Privacy Policy');
      return;
    }
    
    try {
      // Show loading state
      const submitButton = signupForm.querySelector('button[type="submit"]');
      const originalButtonText = submitButton.textContent;
      submitButton.disabled = true;
      submitButton.textContent = 'Creating account...';
      
      // Send registration request to server
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          username, 
          email, 
          password,
          confirmPassword
        }),
        credentials: 'include'
      });
      
      // Parse response
      const data = await response.json();
      
      // Reset button state
      submitButton.disabled = false;
      submitButton.textContent = originalButtonText;
      
      if (response.ok) {
        // Registration successful
        window.authUtils.showFormSuccess('signup-form', 'Account created successfully! Redirecting to login...');
        
        // Clear form
        signupForm.reset();
        
        // Redirect to login page after a short delay
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 2000);
      } else {
        // Registration failed
        window.authUtils.showFormError('signup-form', data.message || 'Registration failed. Please try again.');
      }
    } catch (error) {
      console.error('Registration error:', error);
      window.authUtils.showFormError('signup-form', 'An error occurred. Please try again later.');
      
      // Reset button state
      const submitButton = signupForm.querySelector('button[type="submit"]');
      submitButton.disabled = false;
      submitButton.textContent = 'Create Account';
    }
  });
  
  // Helper function for email validation
  function validateEmail(email) {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(email);
  }
});