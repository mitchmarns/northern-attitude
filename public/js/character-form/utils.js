import { DOM } from './dom-manager.js';

// Load teams from the API
export async function loadTeams() {
  try {
    const response = await fetch('/api/teams', {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch teams');
    }
    
    const teams = await response.json();
    
    // Update team dropdown
    if (DOM['team-id']) {
      // Save current selection if any
      const currentSelection = DOM['team-id'].value;
      
      // Clear existing options
      DOM['team-id'].innerHTML = '<option value="">Not on a team</option>';
      
      // Sort teams alphabetically for better user experience
      teams.sort((a, b) => a.name.localeCompare(b.name));
      
      // Add option for each team
      teams.forEach(team => {
        const option = document.createElement('option');
        option.value = team.id;
        option.textContent = team.name;
        DOM['team-id'].appendChild(option);
      });
      
      // Restore selection if it exists
      if (currentSelection) {
        DOM['team-id'].value = currentSelection;
      }
      
      // Add helpful label text
      const teamLabel = document.querySelector('label[for="team-id"]');
      if (teamLabel) {
        teamLabel.textContent = 'Choose Team';
      }
      
      const teamHelpText = document.querySelector('#team-id + .form-text');
      if (teamHelpText) {
        teamHelpText.textContent = 'Select a team for your character to join';
      }
    }
  } catch (error) {
    console.error('Error loading teams:', error);
    
    // Show fallback message in dropdown
    if (DOM['team-id']) {
      DOM['team-id'].innerHTML = '<option value="">Unable to load teams</option>';
    }
  }
}

// Get player stats from form inputs
export function getPlayerStats(position) {
  // Get jersey number
  const jerseyNumber = DOM['jersey-number'] ? 
    parseInt(DOM['jersey-number'].value) || null : null;
  
  // Get common stats
  const games = document.getElementById('stat-games') ? 
    parseInt(document.getElementById('stat-games').value) || 0 : 0;
    
  const goals = document.getElementById('stat-goals') ? 
    parseInt(document.getElementById('stat-goals').value) || 0 : 0;
    
  const assists = document.getElementById('stat-goals') ? 
    parseInt(document.getElementById('stat-assists').value) || 0 : 0;
    
  const plusMinus = document.getElementById('stat-plus-minus') ? 
    parseInt(document.getElementById('stat-plus-minus').value) || 0 : 0;
    
  const penalties = document.getElementById('stat-penalties') ? 
    parseInt(document.getElementById('stat-penalties').value) || 0 : 0;
    
  const shots = document.getElementById('stat-shots') ? 
    parseInt(document.getElementById('stat-shots').value) || 0 : 0;
  
  // Create base stats object
  const stats = {
    jersey_number: jerseyNumber,
    games: games,
    goals: goals,
    assists: assists,
    plus_minus: plusMinus,
    penalties: penalties,
    shots: shots
  };
  
  // Add position-specific stats
  switch (position) {
    case 'C':
      stats.faceoff_pct = parseFloat(document.getElementById('stat-faceoff-pct')?.value) || 50.0;
      stats.shooting_pct = parseFloat(document.getElementById('stat-shooting-pct')?.value) || 10.0;
      break;
    case 'LW':
    case 'RW':
      stats.shooting_pct = parseFloat(document.getElementById('stat-shooting-pct')?.value) || 10.0;
      break;
    case 'D':
      stats.blocks = parseInt(document.getElementById('stat-blocks')?.value) || 0;
      stats.hits = parseInt(document.getElementById('stat-hits')?.value) || 0;
      stats.ice_time = parseFloat(document.getElementById('stat-ice-time')?.value) || 20.0;
      break;
    case 'G':
      stats.wins = parseInt(document.getElementById('stat-wins')?.value) || 0;
      stats.losses = parseInt(document.getElementById('stat-losses')?.value) || 0;
      stats.gaa = parseFloat(document.getElementById('stat-gaa')?.value) || 2.50;
      stats.save_pct = document.getElementById('stat-save-pct')?.value || '.900';
      stats.shutouts = parseInt(document.getElementById('stat-shutouts')?.value) || 0;
      break;
  }
  
  // Convert to JSON string
  return JSON.stringify(stats);
}