// Character type configurations for reuse
export const CHARACTER_TYPES = {
  player: {
    description: 'Players are the athletes who compete on the ice, representing their teams in hockey matches.',
    roles: null, // Roles handled by position selection
    requiresPosition: true,
    requiresStats: true
  },
  coach: {
    description: 'Coaches guide and train players, developing strategies and leading teams to success.',
    roles: [
      'Head Coach', 
      'Assistant Coach', 
      'Goalie Coach', 
      'Skill Development Coach', 
      'Strength and Conditioning Coach'
    ],
    requiresPosition: false,
    requiresStats: false
  },
  staff: {
    description: 'Team staff members provide crucial support behind the scenes, ensuring smooth team operations.',
    roles: [
      'Team Manager', 
      'Equipment Manager', 
      'Athletic Therapist', 
      'Team Doctor', 
      'Video Coordinator', 
      'Team Analyst'
    ],
    requiresPosition: false,
    requiresStats: false
  },
  executive: {
    description: 'League executives and administrators manage the broader aspects of hockey operations.',
    roles: [
      'League Commissioner', 
      'General Manager', 
      'Director of Hockey Operations', 
      'Scouting Director', 
      'Player Development Coordinator'
    ],
    requiresPosition: false,
    requiresStats: false
  },
  fan: {
    description: 'Passionate supporters who are deeply involved in the hockey community and team culture.',
    roles: [
      'Season Ticket Holder', 
      'Team Superfan', 
      'Hockey Blogger', 
      'Fan Club President', 
      'Community Organizer'
    ],
    requiresPosition: false,
    requiresStats: false
  },
  media: {
    description: 'Media professionals who cover, analyze, and report on hockey events and stories.',
    roles: [
      'Sports Journalist', 
      'Broadcaster', 
      'Hockey Analyst', 
      'Podcast Host', 
      'Commentator'
    ],
    requiresPosition: false,
    requiresStats: false
  }
};

// Position-specific stats templates for efficiency
export const POSITION_STATS_TEMPLATES = {
  'C': `
    <div class="stat-input-group">
      <label for="stat-faceoff-pct">Faceoff %</label>
      <input type="number" id="stat-faceoff-pct" class="stat-input" value="50.0" min="0" max="100" step="0.1">
    </div>
    <div class="stat-input-group">
      <label for="stat-shooting-pct">Shooting %</label>
      <input type="number" id="stat-shooting-pct" class="stat-input" value="10.0" min="0" max="100" step="0.1">
    </div>
  `,
  'LW': `
    <div class="stat-input-group">
      <label for="stat-shooting-pct">Shooting %</label>
      <input type="number" id="stat-shooting-pct" class="stat-input" value="10.0" min="0" max="100" step="0.1">
    </div>
  `,
  'RW': `
    <div class="stat-input-group">
      <label for="stat-shooting-pct">Shooting %</label>
      <input type="number" id="stat-shooting-pct" class="stat-input" value="10.0" min="0" max="100" step="0.1">
    </div>
  `,
  'D': `
    <div class="stat-input-group">
      <label for="stat-blocks">Blocked Shots</label>
      <input type="number" id="stat-blocks" class="stat-input" value="0" min="0">
    </div>
    <div class="stat-input-group">
      <label for="stat-hits">Hits</label>
      <input type="number" id="stat-hits" class="stat-input" value="0" min="0">
    </div>
    <div class="stat-input-group">
      <label for="stat-ice-time">Avg. Ice Time (min)</label>
      <input type="number" id="stat-ice-time" class="stat-input" value="20.0" min="0" step="0.1">
    </div>
  `,
  'G': `
    <div class="stat-input-group">
      <label for="stat-wins">Wins</label>
      <input type="number" id="stat-wins" class="stat-input" value="0" min="0">
    </div>
    <div class="stat-input-group">
      <label for="stat-losses">Losses</label>
      <input type="number" id="stat-losses" class="stat-input" value="0" min="0">
    </div>
    <div class="stat-input-group">
      <label for="stat-gaa">Goals Against Average</label>
      <input type="number" id="stat-gaa" class="stat-input" value="2.50" min="0" step="0.01">
    </div>
    <div class="stat-input-group">
      <label for="stat-save-pct">Save Percentage</label>
      <input type="text" id="stat-save-pct" class="stat-input" value=".900">
    </div>
    <div class="stat-input-group">
      <label for="stat-shutouts">Shutouts</label>
      <input type="number" id="stat-shutouts" class="stat-input" value="0" min="0">
    </div>
  `
};