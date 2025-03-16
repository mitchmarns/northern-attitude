export async function setActiveCharacter(characterId) {
  console.log("Setting character as active:", characterId);
  try {
    // Show loading/processing indication
    const successMessage = document.getElementById("character-profile-success");
    const errorMessage = document.getElementById("character-profile-error");

    // Clear previous messages
    if (successMessage) successMessage.style.display = "none";
    if (errorMessage) errorMessage.style.display = "none";

    const response = await fetch(`/api/characters/${characterId}/set-active`, {
      method: "PUT",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to set character as active");
    }

    // Show success message
    if (successMessage) {
      successMessage.textContent = "Character set as active successfully.";
      successMessage.style.display = "block";
    }

    // Reload the page to reflect the change
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  } catch (error) {
    console.error("Error setting active character:", error);

    // Show error message
    const errorMessage = document.getElementById("character-profile-error");
    if (errorMessage) {
      errorMessage.textContent =
        "Failed to set character as active. Please try again.";
      errorMessage.style.display = "block";
    }
  }
}

export async function deleteCharacter(characterId) {
  console.log("Deleting character:", characterId);
  try {
    const response = await fetch(`/api/characters/${characterId}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to delete character");
    }

    // Hide the modal first
    hideDeleteModal();

    // Show success message
    const successMessage = document.getElementById("character-profile-success");
    if (successMessage) {
      successMessage.textContent =
        "Character deleted successfully. Redirecting...";
      successMessage.style.display = "block";
    }

    // Redirect to character list after delay
    setTimeout(() => {
      window.location.href = "my-characters.html";
    }, 1500);
  } catch (error) {
    console.error("Error deleting character:", error);

    // Hide the modal
    hideDeleteModal();

    // Show error message
    const errorMessage = document.getElementById("character-profile-error");
    if (errorMessage) {
      errorMessage.textContent =
        "Failed to delete character. Please try again.";
      errorMessage.style.display = "block";
    }
  }
}