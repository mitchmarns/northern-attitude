// public/js/character-profile/utils.js

export function showDeleteModal(characterId, characterName) {
  console.log(
    "Showing delete modal for character:",
    characterId,
    characterName
  );
  const deleteModal = document.getElementById("delete-modal");

  if (!deleteModal) {
    console.error("Delete modal not found in the DOM");
    return;
  }

  // Update the message text
  const modalMessage = deleteModal.querySelector(".modal-message");
  if (modalMessage) {
    modalMessage.textContent = `Are you sure you want to delete ${characterName}? This action cannot be undone.`;
  }

  // Display the modal - ensure it has the right styles
  deleteModal.style.display = "flex";
  deleteModal.style.position = "fixed";
  deleteModal.style.top = "0";
  deleteModal.style.left = "0";
  deleteModal.style.width = "100%";
  deleteModal.style.height = "100%";
  deleteModal.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
  deleteModal.style.zIndex = "1000";
  deleteModal.style.justifyContent = "center";
  deleteModal.style.alignItems = "center";
}

export function hideDeleteModal() {
  console.log("Hiding delete modal");
  const deleteModal = document.getElementById("delete-modal");
  if (deleteModal) {
    deleteModal.style.display = "none";
  } else {
    console.error("Delete modal not found in the DOM");
  }
}

export function getFullPosition(positionCode) {
  const positions = {
    C: "Center",
    LW: "Left Wing",
    RW: "Right Wing",
    D: "Defense",
    G: "Goalie",
  };

  return positions[positionCode] || positionCode;
}

export function formatIceTime(minutes) {
  if (!minutes) return "00:00";

  const mins = Math.floor(minutes);
  const secs = Math.round((minutes - mins) * 60);

  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
}