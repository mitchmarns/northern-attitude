import { getFullPosition } from "./utils.js";
import { updateCharacterStats } from "./tabs/stats-tab.js";

export async function updateHeaderImage(character) {
  const nameBanner = document.getElementById("name-banner");

  if (nameBanner && character.header_image_url) {
    // Set the header image as background
    nameBanner.style.backgroundImage = `url('${character.header_image_url}')`;
    nameBanner.style.backgroundSize = "cover";
    nameBanner.style.backgroundPosition = "center";
  } else if (nameBanner) {
    // If no header image provided, use a gradient background
    nameBanner.style.backgroundImage = "none";
    nameBanner.style.backgroundColor = "var(--dark-bg)";
  }
}

export async function updateProfileSidebar(elements, character, stats = {}) {
  // Update avatar with error handling
  if (elements.avatar) {
    elements.avatar.src = character.avatar_url || "/api/placeholder/150/150";
    elements.avatar.alt = character.name;

    // Add error handler for avatar
    elements.avatar.onerror = () => {
      elements.avatar.src = "/api/placeholder/150/150";
    };
  }

  // Update character info
  elements.sidebarName.textContent = character.name;
  elements.position.textContent = getFullPosition(character.position);
  elements.team.textContent = character.team_name || "No Team";

  // Update status with class change
  elements.status.textContent = character.is_active
    ? "Active Character"
    : "Inactive";
  elements.status.className = character.is_active
    ? "character-status active"
    : "character-status inactive";

  // Update main stats
  updateCharacterStats(elements, character, stats);
}

export async function updateProfileContent(elements, character, stats) {
  // Update about heading
  if (elements.aboutHeading) {
    elements.aboutHeading.textContent = `About ${character.name}`;
  }

  // Update bio with proper error handling
  if (elements.characterBio) {
    if (character.bio) {
      elements.characterBio.innerHTML = `<p>${character.bio.replace(
        /\n/g,
        "</p><p>"
      )}</p>`;
    } else {
      elements.characterBio.innerHTML = `<p><em>No biography provided for ${character.name} yet.</em></p>`;
    }
  }

  // Update career highlights
  updateCareerHighlights(elements, character, stats);
}

export async function updateCareerHighlights(elements, character, stats) {
  if (!elements.careerHighlights) return;

  if (character.character_type === "player") {
    elements.careerHighlights.innerHTML = `
      <div class="highlight-stat">
        <div class="highlight-value">${stats.goals || 0}</div>
        <div class="highlight-label">Goals</div>
      </div>
      <div class="highlight-stat">
        <div class="highlight-value">${stats.assists || 0}</div>
        <div class="highlight-label">Assists</div>
      </div>
      <div class="highlight-stat">
        <div class="highlight-value">${
          (stats.goals || 0) + (stats.assists || 0)
        }</div>
        <div class="highlight-label">Points</div>
      </div>
      <div class="highlight-stat">
        <div class="highlight-value">${stats.games || 0}</div>
        <div class="highlight-label">Games</div>
      </div>
    `;
  } else {
    // For non-player types
    elements.careerHighlights.innerHTML = `
      <div class="highlight-stat">
        <div class="highlight-value">${character.role || "N/A"}</div>
        <div class="highlight-label">Role</div>
      </div>
    `;
  }
}

export async function setupButtons(elements, character) {
  console.log(
    "Setting up buttons for character:",
    character.id,
    character.name
  );

  // Delete Character Button
  const deleteBtn = document.getElementById("delete-character-btn");
  if (deleteBtn) {
    console.log("Delete button found, adding click event");
    // Remove any existing event listeners first
    const newDeleteBtn = deleteBtn.cloneNode(true);
    deleteBtn.parentNode.replaceChild(newDeleteBtn, deleteBtn);

    newDeleteBtn.addEventListener("click", function () {
      console.log("Delete button clicked");
      showDeleteModal(character.id, character.name);
    });
  } else {
    console.error("Delete button not found in DOM");
  }

  // Confirm Delete Button
  const confirmDeleteBtn = document.getElementById("confirm-delete");
  if (confirmDeleteBtn) {
    console.log("Confirm delete button found, adding click event");
    // Remove any existing event listeners first
    const newConfirmBtn = confirmDeleteBtn.cloneNode(true);
    confirmDeleteBtn.parentNode.replaceChild(newConfirmBtn, confirmDeleteBtn);

    newConfirmBtn.addEventListener("click", function () {
      console.log("Confirm delete button clicked");
      deleteCharacter(character.id);
    });
  } else {
    console.error("Confirm delete button not found in DOM");
  }

  // Set Active Button - only show if character is not active
  const setActiveBtn = document.getElementById("set-active-btn");
  if (setActiveBtn) {
    console.log(
      "Setting active button display based on character.is_active:",
      character.is_active
    );
    // Clone and replace to remove any existing event listeners
    const newSetActiveBtn = setActiveBtn.cloneNode(true);
    setActiveBtn.parentNode.replaceChild(newSetActiveBtn, setActiveBtn);

    if (!character.is_active) {
      newSetActiveBtn.style.display = "inline-block";
      newSetActiveBtn.addEventListener("click", function () {
        console.log("Set active button clicked");
        setActiveCharacter(character.id);
      });
    } else {
      // Ensure button is hidden if character is already active
      newSetActiveBtn.style.display = "none";
    }
  } else {
    console.error("Set active button not found in DOM");
  }

  // Edit Character Link - Convert to button if it's not already
  const editCharacterLink = document.getElementById("edit-character-link");
  if (editCharacterLink) {
    console.log("Setting edit character link");

    // Check if it's an anchor or button
    if (editCharacterLink.tagName === "A") {
      editCharacterLink.href = `character-form.html?id=${character.id}`;
    } else {
      // Remove any existing event listeners first
      const newEditBtn = editCharacterLink.cloneNode(true);
      editCharacterLink.parentNode.replaceChild(newEditBtn, editCharacterLink);

      newEditBtn.addEventListener("click", function () {
        console.log("Edit button clicked");
        window.location.href = `character-form.html?id=${character.id}`;
      });
    }
  } else {
    console.error("Edit character link not found in DOM");
  }

  // Message Character Button
  const messageCharacterBtn = document.getElementById("message-character-btn");
  if (messageCharacterBtn) {
    console.log("Message button found, adding click event");
    // Remove any existing event listeners first
    const newMsgBtn = messageCharacterBtn.cloneNode(true);
    messageCharacterBtn.parentNode.replaceChild(newMsgBtn, messageCharacterBtn);

    newMsgBtn.addEventListener("click", function () {
      console.log("Message button clicked");
      // Redirect to messages with this character
      window.location.href = `messages.html?new=1&sender=${
        character.id
      }&recipient=${character.id}&name=${encodeURIComponent(character.name)}`;
    });
  } else {
    console.error("Message button not found in DOM");
  }
}