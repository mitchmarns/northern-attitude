// public/js/character-profile/character-data.js
import { updateHeaderImage, updateProfileSidebar, updateProfileContent, setupButtons } from "./profile-ui.js";
import { updateCharacterStats, updateStatsTab } from "./tabs/stats-tab.js";
import { updateBioTab } from "./tabs/bio-tab.js";
import { updateBasicsTab } from "./tabs/basics-tab.js";
import { loadRecentGames } from "./tabs/recent-games-tab.js";
import { setupContactsTab } from "./tabs/contacts-tab.js";
import { getFullPosition } from "./utils.js";

export async function loadCharacterProfile(characterId) {
  try {
    // Fetch character data
    const response = await fetch(`/api/characters/${characterId}`, {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch character data");
    }

    const character = await response.json();

    // Cache elements we'll use repeatedly
    const elements = {
      title: document.getElementById("page-title"),
      bannerName: document.getElementById("banner-character-name"),
      jerseyNumber: document.getElementById("jersey-number"),
      avatar: document.getElementById("character-avatar"),
      sidebarName: document.getElementById("sidebar-character-name"),
      position: document.getElementById("character-position"),
      team: document.getElementById("character-team"),
      status: document.getElementById("character-status"),
      mainStats: document.getElementById("main-stats"),
      positionStatsTitle: document.getElementById("position-stats-title"),
      positionStats: document.getElementById("position-stats"),
      aboutHeading: document.getElementById("about-heading"),
      characterBio: document.getElementById("character-bio"),
      careerHighlights: document.getElementById("career-highlights"),
      positionStatsBlock: document.getElementById("position-stats-block"),
      deleteBtn: document.getElementById("delete-character-btn"),
      confirmDelete: document.getElementById("confirm-delete"),
      setActiveBtn: document.getElementById("set-active-btn"),
      editCharacterLink: document.getElementById("edit-character-link"),
      messageCharacterBtn: document.getElementById("message-character-btn"),
    };

    // Ensure all required elements exist
    const requiredElements = [
      "title",
      "bannerName",
      "avatar",
      "sidebarName",
      "position",
      "team",
      "status",
    ];
    const missingElements = requiredElements.filter((key) => !elements[key]);

    if (missingElements.length > 0) {
      console.error("Missing required DOM elements:", missingElements);
      throw new Error("Missing required DOM elements");
    }

    // Parse stats from JSON once - with error handling
    let stats = {};
    try {
      if (character.stats_json) {
        stats = JSON.parse(character.stats_json);
      }
    } catch (e) {
      console.error("Error parsing stats JSON:", e);
      stats = {}; // Fallback to empty object
    }

    // Update page title and header
    document.title = `${character.name} | Northern Attitude`;
    elements.title.textContent = character.name;
    elements.bannerName.textContent = character.name;

    // Add jersey number if available
    const jerseyNumber =
      stats.jersey_number || Math.floor(Math.random() * 98) + 1; // Random number between 1-99
    elements.jerseyNumber.textContent = jerseyNumber;

    // Update header image
    updateHeaderImage(character);

    // Update all page data concurrently for better performance
    await Promise.all([
      updateProfileSidebar(elements, character, stats),
      updateProfileContent(elements, character, stats),
      updateCharacterStats(elements, character, stats),
      updateStatsTab(character, stats),
      updateBioTab(character),
      loadRecentGames(characterId),
      updateBasicsTab(character, stats)
    ]);
    
    // Set up button functionality
    setupButtons(elements, character);

    // Setup contacts tab only after we have the character data
    setupContactsTab(character);

    return character;
  } catch (error) {
    console.error("Error loading character profile:", error);

    // Show error message
    const errorMessage = document.getElementById("character-profile-error");
    if (errorMessage) {
      errorMessage.textContent =
        "Failed to load character profile. Please try again later.";
      errorMessage.style.display = "block";
    }
    
    throw error;
  }
}