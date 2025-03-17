import { getFullPosition } from "../utils.js";

export async function loadRecentGames(characterId) {
  const gamesContainer = document.getElementById("recent-games");
  if (!gamesContainer) return;

  try {
    const response = await fetch(
      `/api/characters/${characterId}/games?limit=5`,
      {
        method: "GET",
        credentials: "include",
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch recent games");
    }

    const games = await response.json();

    // Clear container
    gamesContainer.innerHTML = "";

    if (games.length === 0) {
      gamesContainer.innerHTML = "<p><em>No recent games found.</em></p>";
      return;
    }

    // Add each game to the list
    games.forEach((game) => {
      const gameItem = document.createElement("div");
      gameItem.className = "game-item";

      // Format game date
      const gameDate = new Date(game.date);
      const formattedDate = gameDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

      // Game result (win/loss/tie)
      let result = "";
      if (game.status === "completed") {
        if (game.character_team_id === game.home_team_id) {
          if (game.home_score > game.away_score) result = "W";
          else if (game.home_score < game.away_score) result = "L";
          else result = "T";
        } else {
          if (game.away_score > game.home_score) result = "W";
          else if (game.away_score < game.home_score) result = "L";
          else result = "T";
        }
      }

      gameItem.innerHTML = `
        <div>
          <div class="game-teams">${game.home_team_name} vs ${
        game.away_team_name
      } ${result ? `(${result})` : ""}</div>
          <div class="game-date">${formattedDate}</div>
        </div>
        <div class="game-stats">
          ${game.goals || 0}G ${game.assists || 0}A ${
        (game.goals || 0) + (game.assists || 0)
      }P
        </div>
      `;

      gamesContainer.appendChild(gameItem);
    });
  } catch (error) {
    console.error("Error loading recent games:", error);
    gamesContainer.innerHTML = "<p><em>Failed to load recent games.</em></p>";
  }
}