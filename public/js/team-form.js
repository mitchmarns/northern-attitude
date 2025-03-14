// Update to team-form.js to handle image URLs instead of file uploads

// Function to set up logo preview
function setupLogoPreview() {
  const logoUrlInput = document.getElementById('logo-url');
  const previewButton = document.getElementById('preview-logo-btn');
  const logoPreview = document.getElementById('logo-preview');
  
  previewButton.addEventListener('click', function() {
    const imageUrl = logoUrlInput.value.trim();
    
    if (imageUrl) {
      // Update the preview image
      logoPreview.src = imageUrl;
      
      // Handle load errors by reverting to placeholder
      logoPreview.onerror = function() {
        logoPreview.src = '/api/placeholder/120/120';
        window.authUtils.showFormError('team-form', 'Invalid image URL or image could not be loaded');
      };
    } else {
      // If no URL, show placeholder
      logoPreview.src = '/api/placeholder/120/120';
    }
  });
}

// Create a new team with image URL
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
    
    // Show loading state
    const submitButton = document.getElementById('submit-btn');
    const originalButtonText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Creating...';
    
    // Clear previous messages
    window.authUtils.clearFormMessages('team-form');
    
    // Create team data
    const teamData = {
      name: teamName,
      description: teamDescription,
      logo_url: logoUrl,
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
      throw new Error('Failed to create team');
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
    window.authUtils.showFormError('team-form', 'Failed to create team. Please try again later.');
  }
}

// Function to load team data for editing - modified for image URLs
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
    
    // Populate form with team data
    document.getElementById('team-name').value = team.name;
    document.getElementById('team-description').value = team.description || '';
    
    // Set logo URL if available
    if (team.logo_url) {
      document.getElementById('logo-url').value = team.logo_url;
      document.getElementById('logo-preview').src = team.logo_url;
    }
    
    // Load team colors
    if (team.primary_color) {
      document.getElementById('primary-color').value = team.primary_color;
    }
    
    if (team.secondary_color) {
      document.getElementById('secondary-color').value = team.secondary_color;
    }
  } catch (error) {
    console.error('Error loading team data:', error);
    
    // Show error message
    const errorMessage = document.getElementById('team-form-error');
    errorMessage.textContent = 'Failed to load team data. Please try again later.';
    errorMessage.style.display = 'block';
  }
}

// Update team function - modified for image URLs
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
    
    // Show loading state
    const submitButton = document.getElementById('submit-btn');
    const originalButtonText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Updating...';
    
    // Clear previous messages
    window.authUtils.clearFormMessages('team-form');
    
    // Create team data
    const teamData = {
      name: teamName,
      description: teamDescription,
      primary_color: primaryColor,
      secondary_color: secondaryColor
    };
    
    // Add logo URL if available
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
      throw new Error('Failed to update team');
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
    window.authUtils.showFormError('team-form', 'Failed to update team. Please try again later.');
  }
}