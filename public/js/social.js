// social.js - Main entry point for social feed functionality
// This file just imports and initializes the modular social app

// Create a global namespace for the social app
window.socialApp = {};

// Import the main module
import * as socialIndex from './social/index.js';

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Initialize the app
  socialIndex.init();
  
  // Share state globally
  window.socialApp.state = socialIndex.state;
});