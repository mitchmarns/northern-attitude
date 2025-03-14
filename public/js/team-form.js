// team-form.js - Updated to handle logo URLs only

// Function to create a new team
async function createTeam() {
  try {
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    // Get team data
    const teamName = document.getElementById('team-name').value.trim();
    const teamDescription = document.getElementById('team-description').value.trim();
    const primaryColor = document.getElementById('primary-color').value;
    const secondaryColor = document.getElementById('secondary-color').value;
    const logoUrl = document.getElementById('logo-url').value.trim();
    
    // Validate logo URL if provided
    if (logoUrl) {
      // Optional: Additional URL validation if needed
      const urlPattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
        '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
        '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
        '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
        '(\\#[-a-z\\d_]*)?$','i'); // fragment locator
      
      if (!urlPattern.test(logoUrl)) {
        window.authUtils.showFormError('team-form', 'Please enter a valid image URL');
        return;
      }
    }
    
    // Show loading state
    const submitButton = document.getElementById('submit-btn');
    const originalButtonText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Creating...';
    
    // Clear previous messages
    window.authUtils.clearFormMessages('team-form');
    
    // Prepare team data
    const teamData = {
      name: teamName,
      description: teamDescription || null,
      logo_url: logoUrl || null,
      primary_color: primaryColor,
      secondary_color: secondaryColor
    };
    
    // Create team
    const response = await fetch('/api/teams', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(teamData),
      credentials: 'include'
    });
    
    // Reset button state
    submitButton.disabled = false;
    submitButton.textContent = originalButtonText;
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create team');
    }
    
    const data = await response.json();
    
    // Show success message
    window.authUtils.showFormSuccess('team-form', 'Team created successfully!');
    
    // Redirect to team detail page
    setTimeout(() => {
      window.location.href = `team-detail.html?id=${data.id}`;
    }, 1500);
  } catch (error) {
    console.error('Error creating team:', error);
    
    // Reset button state
    const submitButton = document.getElementById('submit-btn');
    submitButton.disabled = false;
    submitButton.textContent = 'Create Team';
    
    // Show error message
    window.authUtils.showFormError('team-form', error.message || 'Failed to create team. Please try again later.');
  }
}

// Function to load team data for editing
async function loadTeamData(teamId) {
  try {
    const response = await fetch(`/api/teams/${teamId}`, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch team data');
    }
    
    const team = await response.json();
    
    // Update form title and submit button
    document.getElementById('form-title').textContent = 'Edit Team';
    document.getElementById('submit-btn').textContent = 'Update Team';
    
    // Populate form fields
    document.getElementById('team-name').value = team.name;
    document.getElementById('team-description').value = team.description || '';
    
    // Set logo URL
    if (team.logo_url) {
      document.getElementById('logo-url').value = team.logo_url;
      document.getElementById('logo-preview').src = team.logo_url;
    }
    
    // Set colors
    if (team.primary_color) {
      document.getElementById('primary-color').value = team.primary_color;
      document.getElementById('primary-color-preview').style.backgroundColor = team.primary_color;
    }
    
    if (team.secondary_color) {
      document.getElementById('secondary-color').value = team.secondary_color;
      document.getElementById('secondary-color-preview').style.backgroundColor = team.secondary_color;
    }
  } catch (error) {
    console.error('Error loading team data:', error);
    window.authUtils.showFormError('team-form', 'Failed to load team data. Please try again later.');
  }
}

// Function to update an existing team
async function updateTeam(teamId) {
  try {
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    // Get team data
    const teamName = document.getElementById('team-name').value.trim();
    const teamDescription = document.getElementById('team-description').value.trim();
    const primaryColor = document.getElementById('primary-color').value;
    const secondaryColor = document.getElementById('secondary-color').value;
    const logoUrl = document.getElementById('logo-url').value.trim();
    
    // Validate logo URL if provided
    if (logoUrl) {
      const urlPattern = new RegExp('^(https?:\\/\\/)?'+ 
        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ 
        '((\\d{1,3}\\.){3}\\d{1,3}))'+ 
        '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ 
        '(\\?[;&a-z\\d%_.~+=-]*)?'+ 
        '(\\#[-a-z\\d_]*)?$','i');
      
      if (!urlPattern.test(logoUrl)) {
        window.authUtils.showFormError('team-form', 'Please enter a valid image URL');
        return;
      }
    }
    
    // Show loading state
    const submitButton = document.getElementById('submit-btn');
    const originalButtonText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Updating...';
    
    // Clear previous messages
    window.authUtils.clearFormMessages('team-form');
    
    // Prepare team update data
    const teamData = {
      name: teamName,
      description: teamDescription || null,
      primary_color: primaryColor,
      secondary_color: secondaryColor
    };
    
    // Add logo URL if provided
    if (logoUrl) {
      teamData.logo_url = logoUrl;
    }
    
    // Update team
    const response = await fetch(`/api/teams/${teamId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(teamData),
      credentials: 'include'
    });
    
    // Reset button state
    submitButton.disabled = false;
    submitButton.textContent = originalButtonText;
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update team');
    }
    
    // Show success message
    window.authUtils.showFormSuccess('team-form', 'Team updated successfully!');
    
    // Redirect to team detail page
    setTimeout(() => {
      window.location.href = `team-detail.html?id=${teamId}`;
    }, 1500);
  } catch (error) {
    console.error('Error updating team:', error);
    
    // Reset button state
    const submitButton = document.getElementById('submit-btn');
    submitButton.disabled = false;
    submitButton.textContent = 'Update Team';
    
    // Show error message
    window.authUtils.showFormError('team-form', error.message || 'Failed to update team. Please try again later.');
  }
}

// Validation function
function validateForm() {
  // Reset error messages
  window.authUtils.clearFormMessages('team-form');
  
  // Validate team name
  const teamName = document.getElementById('team-name').value.trim();
  if (!teamName) {
    window.authUtils.showFormError('team-form', 'Team name is required');
    return false;
  }
  return true;
}

// Set up form submission handling
document.addEventListener('DOMContentLoaded', function() {
  // Check if user is authenticated
  window.authUtils.checkAuth(true);
  
  // Set up form submission
  const teamForm = document.getElementById('team-form');
  if (teamForm) {
    teamForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      // Check if we're editing an existing team
      const urlParams = new URLSearchParams(window.location.search);
      const teamId = urlParams.get('id');
      
      if (teamId) {
        // Update existing team
        updateTeam(teamId);
      } else {
        // Create new team
        createTeam();
      }
    });
  }
});