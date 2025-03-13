// team-form.js - Client-side functionality for team creation and editing

document.addEventListener('DOMContentLoaded', function() {
  // Check if user is authenticated
  window.authUtils.checkAuth(true);
  
  // Set up logout functionality
  window.authUtils.setupLogoutButton();
  
  // Get team ID from URL (if editing)
  const urlParams = new URLSearchParams(window.location.search);
  const teamId = urlParams.get('id');
  
  // Check if user has permission to create/edit teams
  checkTeamPermissions(teamId);
  
  // If editing, load team data
  if (teamId) {
    document.getElementById('form-title').textContent = 'Edit Team';
    document.getElementById('submit-btn').textContent = 'Update Team';
    loadTeamData(teamId);
  }
  
  // Set up team logo preview
  setupLogoPreview();
  
  // Set up form submission
  document.getElementById('team-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    if (teamId) {
      updateTeam(teamId);
    } else {
      createTeam();
    }
  });
});

// Function to check if user has permission to create/edit teams
async function checkTeamPermissions(teamId) {
  try {
    let endpoint = '/api/user/permissions';
    
    if (teamId) {
      endpoint = `/api/teams/${teamId}/permissions`;
    }
    
    const response = await fetch(endpoint, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch permissions');
    }
    
    const permissions = await response.json();
    
    if (!permissions.canCreateTeam && !teamId) {
      // Redirect to teams list if user can't create teams
      window.location.href = 'teams.html';
      return;
    }
    
    if (!permissions.canEditTeam && teamId) {
      // Redirect to team detail if user can't edit this team
      window.location.href = `team-detail.html?id=${teamId}`;
      return;
    }
  } catch (error) {
    console.error('Error checking permissions:', error);
    window.location.href = 'teams.html';
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
    
    // Populate form with team data
    document.getElementById('team-name').value = team.name;
    document.getElementById('team-description').value = team.description || '';
    
    // Set logo preview if available
    if (team.logo_url) {
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

// Function to set up logo preview
function setupLogoPreview() {
  const logoInput = document.getElementById('logo-file');
  const logoPreview = document.getElementById('logo-preview');
  
  logoInput.addEventListener('change', function() {
    if (this.files && this.files[0]) {
      const reader = new FileReader();
      
      reader.onload = function(e) {
        logoPreview.src = e.target.result;
      };
      
      reader.readAsDataURL(this.files[0]);
    }
  });
}

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
    
    // Create FormData for logo upload
    const formData = new FormData();
    const logoFile = document.getElementById('logo-file').files[0];
    
    // Show loading state
    const submitButton = document.getElementById('submit-btn');
    const originalButtonText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Creating...';
    
    // Clear previous messages
    window.authUtils.clearFormMessages('team-form');
    
    // First, upload logo if provided
    let logoUrl = null;
    if (logoFile) {
      formData.append('logo', logoFile);
      
      const logoResponse = await fetch('/api/upload/team-logo', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!logoResponse.ok) {
        throw new Error('Failed to upload team logo');
      }
      
      const logoData = await logoResponse.json();
      logoUrl = logoData.url;
    }
    
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
    
    // Create FormData for logo upload
    const formData = new FormData();
    const logoFile = document.getElementById('logo-file').files[0];
    
    // Show loading state
    const submitButton = document.getElementById('submit-btn');
    const originalButtonText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Updating...';
    
    // Clear previous messages
    window.authUtils.clearFormMessages('team-form');
    
    // First, upload logo if provided
    let logoUrl = null;
    if (logoFile) {
      formData.append('logo', logoFile);
      
      const logoResponse = await fetch('/api/upload/team-logo', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!logoResponse.ok) {
        throw new Error('Failed to upload team logo');
      }
      
      const logoData = await logoResponse.json();
      logoUrl = logoData.url;
    }
    
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

// Function to validate the form
function validateForm() {
  // Clear previous messages
  window.authUtils.clearFormMessages('team-form');
  
  // Check team name
  const teamName = document.getElementById('team-name').value.trim();
  if (!teamName) {
    window.authUtils.showFormError('team-form', 'Team name is required');
    return false;
  }
  
  return true;
}