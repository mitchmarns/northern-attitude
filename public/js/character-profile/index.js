import { loadCharacterProfile } from "./profile-data.js";
import { updateHeaderImage, updateProfileSidebar, updateProfileContent, setupButtons } from "./profile-ui.js";
import { updateCharacterStats, updateStatsTab, updatePositionSpecificStats } from "./tabs/stats-tab.js";
import { updateBioTab } from "./tabs/bio-tab.js";
import { updateBasicsTab, updateBasicsField } from "./tabs/basics-tab.js";
import { loadRecentGames } from "./tabs/recent-games-tab.js";
import { setActiveCharacter, deleteCharacter } from "./character-actions.js";
import { showDeleteModal, hideDeleteModal, getFullPosition, formatIceTime } from "./utils.js";
import { setupContactsTab } from "./tabs/contacts-tab.js";

document.addEventListener("DOMContentLoaded", function () {
  // Check if user is authenticated
  window.authUtils.checkAuth(true);

  // Set up logout functionality
  window.authUtils.setupLogoutButton();

  // Get character ID from URL query parameters
  const urlParams = new URLSearchParams(window.location.search);
  const characterId = urlParams.get("id");

  if (!characterId) {
    // No character ID provided, show error and redirect after delay
    const errorMessage = document.getElementById("character-profile-error");
    if (errorMessage) {
      errorMessage.textContent =
        "No character ID provided. Redirecting to character list...";
      errorMessage.style.display = "block";

      setTimeout(() => {
        window.location.href = "my-characters.html";
      }, 3000);
    }
    return;
  }

  // Load character profile
  loadCharacterProfile(characterId);

  // Set up modal close functionality
  const cancelDeleteBtn = document.getElementById("cancel-delete");
  if (cancelDeleteBtn) {
    console.log("Setting up cancel delete button");
    cancelDeleteBtn.addEventListener("click", hideDeleteModal);
  } else {
    console.error("Cancel delete button not found");
  }

  const deleteModal = document.getElementById("delete-modal");
  if (deleteModal) {
    console.log("Setting up delete modal background click");
    deleteModal.addEventListener("click", function (e) {
      if (e.target === this) {
        hideDeleteModal();
      }
    });
  } else {
    console.error("Delete modal element not found");
  }
});

export {
  loadCharacterProfile,
  updateHeaderImage,
  updateProfileSidebar,
  updateProfileContent,
  setupButtons,
  updateCharacterStats,
  updateStatsTab,
  updatePositionSpecificStats,
  updateBioTab,
  updateBasicsTab,
  updateBasicsField,
  loadRecentGames,
  setActiveCharacter,
  deleteCharacter,
  showDeleteModal,
  hideDeleteModal,
  getFullPosition,
  formatIceTime,
  setupContactsTab
};