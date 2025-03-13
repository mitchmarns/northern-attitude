document.addEventListener('DOMContentLoaded', function() {
  const forgotPasswordForm = document.getElementById('forgot-password-form');
  
  forgotPasswordForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Get email
    const email = document.getElementById('email').value.trim();
    
    // Reset messages
    window.authUtils.clearFormMessages('forgot-password-form');
    
    // Validate email
    if (!validateEmail(email)) {
      window.authUtils.showFormError('forgot-password-form', 'Please enter a valid email address');
      return;
    }
    
    try {
      // Show loading state
      const submitButton = forgotPasswordForm.querySelector('button[type="submit"]');
      const originalButtonText = submitButton.textContent;
      submitButton.disabled = true;
      submitButton.textContent = 'Sending...';
      
      // Send password reset request
      const response = await fetch('/api/auth/password-reset-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });
      
      // Parse response
      const data = await response.json();
      
      // Reset button state
      submitButton.disabled = false;
      submitButton.textContent = originalButtonText;
      
      // Always show success message to prevent email enumeration
      window.authUtils.showFormSuccess(
        'forgot-password-form', 
        'If your email is registered, you will receive password reset instructions shortly.'
      );
      
      // Clear the form
      forgotPasswordForm.reset();
      
    } catch (error) {
      console.error('Password reset request error:', error);
      window.authUtils.showFormError('forgot-password-form', 'An error occurred. Please try again later.');
    }
  });
  
  // Helper function for email validation
  function validateEmail(email) {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(email);
  }
});