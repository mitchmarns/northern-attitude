document.addEventListener('DOMContentLoaded', function() {
  const resetPasswordForm = document.getElementById('reset-password-form');
  
  // Get token from URL query string
  const token = window.authUtils.getQueryParam('token');
  const resetTokenInput = document.getElementById('reset-token');
  const submitButton = resetPasswordForm.querySelector('button[type="submit"]');
  
  // If no token, show error and disable form
  if (!token) {
    window.authUtils.showFormError('reset-password-form', 'Invalid or missing reset token. Please request a new password reset link.');
    submitButton.disabled = true;
    
    // Disable all inputs - using a more efficient approach with a single query
    resetPasswordForm.querySelectorAll('input').forEach(input => input.disabled = true);
    return;
  }
  
  // Set token in hidden field
  resetTokenInput.value = token;
  
  resetPasswordForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Get form values - cache DOM elements to avoid repetitive lookups
    const newPassword = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    // Reset messages
    window.authUtils.clearFormMessages('reset-password-form');
    
    // Validate password
    if (newPassword.length < 8) {
      window.authUtils.showFormError('reset-password-form', 'Password must be at least 8 characters long');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      window.authUtils.showFormError('reset-password-form', 'Passwords do not match');
      return;
    }
    
    try {
      // Show loading state
      const originalButtonText = submitButton.textContent;
      submitButton.disabled = true;
      submitButton.textContent = 'Resetting...';
      
      // Send password reset request
      const response = await fetch('/api/auth/password-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token, newPassword, confirmPassword })
      });
      
      // Parse response
      const data = await response.json();
      
      // Reset button state
      submitButton.disabled = false;
      submitButton.textContent = originalButtonText;
      
      if (response.ok) {
        // Password reset successful
        window.authUtils.showFormSuccess('reset-password-form', 'Password reset successful! Redirecting to login...');
        
        // Disable form - get all inputs once and reuse the collection
        const formInputs = resetPasswordForm.querySelectorAll('input');
        formInputs.forEach(input => {
          input.disabled = true;
        });
        submitButton.disabled = true;
        
        // Redirect to login after a delay - use setTimeout directly
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 3000);
      } else {
        // Password reset failed
        window.authUtils.showFormError('reset-password-form', data.message || 'Password reset failed. Please try again.');
      }
    } catch (error) {
      console.error('Password reset error:', error);
      window.authUtils.showFormError('reset-password-form', 'An error occurred. Please try again later.');
      
      // Reset button state
      submitButton.disabled = false;
      submitButton.textContent = 'Reset Password';
    }
  });
});