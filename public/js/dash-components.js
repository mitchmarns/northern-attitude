// dash-components.js - Extra dashboard functionality
// This module provides additional dashboard components and visualizations

/**
 * Initializes additional dashboard features
 */
export function initDashboardExtras() {
  console.log('Dashboard extras initialized');
  
  // Add any dashboard enhancements here
  enhanceActivityList();
  setupQuickAccess();
}

/**
 * Enhances the activity list with hover effects and timestamps
 */
function enhanceActivityList() {
  const activityItems = document.querySelectorAll('.activity-item');
  
  activityItems.forEach(item => {
    // Add hover effect
    item.addEventListener('mouseenter', () => {
      item.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
    });
    
    item.addEventListener('mouseleave', () => {
      item.style.backgroundColor = 'transparent';
    });
    
    // Format timestamps if they exist
    const timeElement = item.querySelector('.activity-time');
    if (timeElement) {
      // Add tooltip with actual date/time for relative timestamps
      if (['Today', 'Yesterday'].includes(timeElement.textContent)) {
        const date = new Date();
        if (timeElement.textContent === 'Yesterday') {
          date.setDate(date.getDate() - 1);
        }
        timeElement.title = date.toLocaleDateString();
      }
    }
  });
}

/**
 * Sets up quick access panel for frequently used features
 */
function setupQuickAccess() {
  // Create quick access panel if it doesn't exist
  if (!document.querySelector('.quick-access-panel')) {
    const sidebarNav = document.querySelector('.sidebar nav:first-of-type');
    
    if (!sidebarNav) return;
    
    // Add help button to sidebar
    const helpLink = document.createElement('a');
    helpLink.href = '#';
    helpLink.className = 'help-link';
    helpLink.textContent = 'Need Help?';
    helpLink.style.display = 'block';
    helpLink.style.marginTop = '20px';
    helpLink.style.textAlign = 'center';
    helpLink.style.padding = '8px';
    helpLink.style.backgroundColor = 'var(--accent-bg)';
    helpLink.style.borderRadius = '4px';
    
    helpLink.addEventListener('click', (e) => {
      e.preventDefault();
      showHelpTooltip(helpLink);
    });
    
    sidebarNav.parentNode.insertBefore(helpLink, sidebarNav.nextSibling);
  }
}

/**
 * Shows a help tooltip with useful information
 * @param {HTMLElement} targetElement - Element to show tooltip near
 */
function showHelpTooltip(targetElement) {
  // Remove any existing tooltip
  const existingTooltip = document.querySelector('.help-tooltip');
  if (existingTooltip) {
    existingTooltip.remove();
  }
  
  // Create tooltip
  const tooltip = document.createElement('div');
  tooltip.className = 'help-tooltip';
  tooltip.style.position = 'absolute';
  tooltip.style.zIndex = '1000';
  tooltip.style.backgroundColor = 'var(--card-bg)';
  tooltip.style.border = '1px solid var(--border)';
  tooltip.style.borderRadius = '4px';
  tooltip.style.padding = '15px';
  tooltip.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
  tooltip.style.width = '250px';
  
  tooltip.innerHTML = `
    <h4 style="margin-top: 0;">Help & Tips</h4>
    <ul style="padding-left: 20px; margin-bottom: 10px;">
      <li>Create a character in the Players section</li>
      <li>Join a team to participate in games</li>
      <li>Check messages for team updates</li>
      <li>View your character's profile to track stats</li>
    </ul>
    <button id="close-help" style="background: var(--accent); border: none; color: white; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Close</button>
  `;
  
  // Position tooltip
  const rect = targetElement.getBoundingClientRect();
  tooltip.style.top = rect.bottom + window.scrollY + 5 + 'px';
  tooltip.style.left = rect.left + window.scrollX + 'px';
  
  // Add to document
  document.body.appendChild(tooltip);
  
  // Add close button functionality
  document.getElementById('close-help').addEventListener('click', () => {
    tooltip.remove();
  });
  
  // Close when clicking outside
  document.addEventListener('click', function closeTooltip(e) {
    if (!tooltip.contains(e.target) && e.target !== targetElement) {
      tooltip.remove();
      document.removeEventListener('click', closeTooltip);
    }
  });
}

// Add any additional exports here
export const dashboardVersion = '1.0.0';