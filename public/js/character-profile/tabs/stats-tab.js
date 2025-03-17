import { getFullPosition } from "../utils.js";

export async function updateCharacterStats(elements, character, stats = {}) {
  // Skip if main stats element doesn't exist
  if (!elements.mainStats) return;

  // Clear existing stats
  elements.mainStats.innerHTML = "";

  // Define stats structure based on character type
  if (character.character_type === "player") {
    // Add common stats for players
    const commonStats = [
      { label: "Goals", value: stats.goals || 0 },
      { label: "Assists", value: stats.assists || 0 },
      { label: "Games", value: stats.games || 0 },
      { label: "Points", value: (stats.goals || 0) + (stats.assists || 0) },
      { label: "+/-", value: stats.plus_minus || 0 },
      { label: "PIM", value: stats.penalties || 0 },
    ];

    // Build stats HTML using document fragment for better performance
    const fragment = document.createDocumentFragment();

    commonStats.forEach((stat) => {
      const statItem = document.createElement("div");
      statItem.className = "stat-item";
      statItem.innerHTML = `
        <span class="stat-label">${stat.label}</span>
        <span class="stat-value">${stat.value}</span>
      `;
      fragment.appendChild(statItem);
    });

    elements.mainStats.appendChild(fragment);

    // Add position-specific stats
    updatePositionSpecificStats(elements, character.position, stats);
  } else if (elements.positionStatsBlock) {
    // For non-player types, show role instead of stats
    elements.positionStatsBlock.style.display = "none";

    const roleItem = document.createElement("div");
    roleItem.className = "stat-item";
    roleItem.style.gridColumn = "1 / span 2";
    roleItem.innerHTML = `
      <span class="stat-label">Role</span>
      <span class="stat-value">${character.role || "Unspecified"}</span>
    `;
    elements.mainStats.appendChild(roleItem);
  }
}

export async function updateStatsTab(character, stats) {
  // For player type only
  if (character.character_type === "player") {
    const headerRow = document.getElementById("stats-header-row");
    const statsBody = document.getElementById("stats-body");

    if (!headerRow || !statsBody) return;

    // Create headers based on position
    let headers = ["Season", "Team", "GP", "G", "A", "P", "+/-", "PIM"];

    // Add position-specific headers
    switch (character.position) {
      case "C":
        headers.push("FO%");
        headers.push("S%");
        break;
      case "LW":
      case "RW":
        headers.push("S%");
        break;
      case "D":
        headers.push("Blocks");
        headers.push("Hits");
        break;
      case "G":
        headers = ["Season", "Team", "GP", "W", "L", "GAA", "SV%", "SO"];
        break;
    }

    // Create header row
    headerRow.innerHTML = headers
      .map((header) => `<th>${header}</th>`)
      .join("");

    // Mock data for previous seasons - would normally come from the API
    const currentSeason = "2024-2025";
    const previousSeasons = [
      {
        season: "2023-2024",
        games: Math.floor(stats.games * 1.5) || 0,
        goals: Math.floor(stats.goals * 1.2) || 0,
        assists: Math.floor(stats.assists * 1.3) || 0,
        plus_minus: Math.floor(stats.plus_minus * 0.8) || 0,
        penalties: Math.floor(stats.penalties * 1.1) || 0,
      },
      {
        season: "2022-2023",
        games: Math.floor(stats.games * 0.8) || 0,
        goals: Math.floor(stats.goals * 0.7) || 0,
        assists: Math.floor(stats.assists * 0.9) || 0,
        plus_minus: Math.floor(stats.plus_minus * 0.5) || 0,
        penalties: Math.floor(stats.penalties * 1.4) || 0,
      },
    ];

    // Create rows
    const seasons = [
      { season: currentSeason, stats: stats },
      ...previousSeasons,
    ];

    // Create rows based on position
    statsBody.innerHTML = "";

    seasons.forEach((season) => {
      const row = document.createElement("tr");
      let cells = [];

      // Common stats
      const currentStats = season.stats || {};
      const points = (currentStats.goals || 0) + (currentStats.assists || 0);

      if (character.position === "G") {
        // Goalie stats
        cells = [
          season.season,
          character.team_name || "No Team",
          currentStats.games || 0,
          currentStats.wins || 0,
          currentStats.losses || 0,
          currentStats.gaa || "0.00",
          currentStats.save_pct || ".000",
          currentStats.shutouts || 0,
        ];
      } else {
        // Skater stats
        cells = [
          season.season,
          character.team_name || "No Team",
          currentStats.games || 0,
          currentStats.goals || 0,
          currentStats.assists || 0,
          points,
          currentStats.plus_minus || 0,
          currentStats.penalties || 0,
        ];

        // Add position-specific stats
        switch (character.position) {
          case "C":
            cells.push(currentStats.faceoff_pct || "0.0");
            cells.push(currentStats.shooting_pct || "0.0");
            break;
          case "LW":
          case "RW":
            cells.push(currentStats.shooting_pct || "0.0");
            break;
          case "D":
            cells.push(currentStats.blocks || 0);
            cells.push(currentStats.hits || 0);
            break;
        }
      }

      // Create row cells
      row.innerHTML = cells.map((cell) => `<td>${cell}</td>`).join("");
      statsBody.appendChild(row);
    });
  } else {
    // For non-player types
    const statsTab = document.getElementById("stats");
    if (statsTab) {
      statsTab.innerHTML = `
        <h2>Role Information</h2>
        <div class="info-section">
          <p>Detailed statistics are not available for ${
            character.character_type
          } characters.</p>
          <p>Role: ${character.role || "Unspecified"}</p>
        </div>
      `;
    }
  }
}

export function getPositionTitle(position) {
  const titles = {
    C: "Center Stats",
    LW: "Wing Stats",
    RW: "Wing Stats",
    D: "Defense Stats",
    G: "Goalie Stats",
  };

  return titles[position] || "Position Stats";
}

export async function updatePositionSpecificStats(elements, position, stats) {
  const positionTitle = getPositionTitle(position);

  if (!elements.positionStatsTitle || !elements.positionStats) return;

  elements.positionStatsTitle.textContent = positionTitle;

  // Create position stats content
  let statsHTML = "";

  switch (position) {
    case "C":
      statsHTML = `
        <div class="stat-item">
          <span class="stat-label">Faceoff %</span>
          <span class="stat-value">${stats.faceoff_pct || "0.0"}%</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Shooting %</span>
          <span class="stat-value">${stats.shooting_pct || "0.0"}%</span>
        </div>
      `;
      break;
    case "LW":
    case "RW":
      statsHTML = `
        <div class="stat-item">
          <span class="stat-label">Shooting %</span>
          <span class="stat-value">${stats.shooting_pct || "0.0"}%</span>
        </div>
      `;
      break;
    case "D":
      statsHTML = `
        <div class="stat-item">
          <span class="stat-label">Blocks</span>
          <span class="stat-value">${stats.blocks || 0}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Hits</span>
          <span class="stat-value">${stats.hits || 0}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">TOI/Game</span>
          <span class="stat-value">${formatIceTime(stats.ice_time)}</span>
        </div>
      `;
      break;
    case "G":
      statsHTML = `
        <div class="stat-item">
          <span class="stat-label">Wins</span>
          <span class="stat-value">${stats.wins || 0}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Losses</span>
          <span class="stat-value">${stats.losses || 0}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">GAA</span>
          <span class="stat-value">${stats.gaa || "0.00"}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">SV%</span>
          <span class="stat-value">${stats.save_pct || ".000"}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Shutouts</span>
          <span class="stat-value">${stats.shutouts || 0}</span>
        </div>
      `;
      break;
  }

  elements.positionStats.innerHTML = statsHTML;
}

export function formatIceTime(minutes) {
  if (!minutes) return "00:00";

  const mins = Math.floor(minutes);
  const secs = Math.round((minutes - mins) * 60);

  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}