document.addEventListener('DOMContentLoaded', function() {
  const signupForm = document.getElementById('signup-form');
  
  // Add error message div to the form (insert after subtitle)
  const authSubtitle = document.querySelector('.auth-subtitle');
  const errorDiv = document.createElement('div');
  errorDiv.className = 'auth-error';
  errorDiv.id = 'auth-error';
  authSubtitle.parentNode.insertBefore(errorDiv, authSubtitle.nextSibling);
  
  // Add success message div
  const successDiv = document.createElement('div');
  successDiv.className = 'auth-success';
  successDiv.id = 'auth-success';
  authSubtitle.parentNode.insertBefore(successDiv, authSubtitle.nextSibling);
  
  signupForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      // Get form values
      const username = document.getElementById('username').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirm-password').value;
      const termsAccepted = document.getElementById('terms').checked;
      
      // Reset error messages
      errorDiv.style.display = 'none';
      errorDiv.textContent = '';
      successDiv.style.display = 'none';
      
      // Validate form
      if (username.length < 3) {
          showError('Username must be at least 3 characters long');
          return;
      }
      
      if (!validateEmail(email)) {
          showError('Please enter a valid email address');
          return;
      }
      
      if (password.length < 8) {
          showError('Password must be at least 8 characters long');
          return;
      }
      
      if (password !== confirmPassword) {
          showError('Passwords do not match');
          return;
      }
      
      if (!termsAccepted) {
          showError('You must accept the Terms of Service and Privacy Policy');
          return;
      }
      
      // If we get here, validation passed

      // In a real application, this is where you would send an AJAX request to your server
      // For demonstration, we'll just simulate account creation with localStorage
      
      // Check if email already exists
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      if (users.some(user => user.email === email)) {
          showError('An account with this email already exists');
          return;
      }
      
      // Store the new user
      const newUser = {
          id: Date.now().toString(),
          username,
          email,
          password: hashPassword(password), // In a real app, use proper password hashing on the server
          createdAt: new Date().toISOString()
      };
      
      users.push(newUser);
      localStorage.setItem('users', JSON.stringify(users));
      
      // Show success message
      showSuccess('Account created successfully! Redirecting to login...');
      
      // Redirect to login after a delay
      setTimeout(() => {
          window.location.href = 'login.html';
      }, 2000);
  });
  
  // Helper functions
  function showError(message) {
      const errorDiv = document.getElementById('auth-error');
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
  }
  
  function showSuccess(message) {
      const successDiv = document.getElementById('auth-success');
      successDiv.textContent = message;
      successDiv.style.display = 'block';
  }
  
  function validateEmail(email) {
      const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      return re.test(email);
  }
  
  // Simple password hashing function - NOT for production use!
  // In a real app, use bcrypt or similar on the server side
  function hashPassword(password) {
      // This is just for demo purposes
      return btoa(password);
  }
});