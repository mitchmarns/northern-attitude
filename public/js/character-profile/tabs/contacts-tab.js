// public/js/character-profile/tabs/contacts-tab.js
import { getFullPosition } from "../utils.js";

export async function setupContactsTab(character) {
  if (!character) return;

  // Cache DOM elements
  const elements = {
    searchBtn: document.getElementById("contacts-search-btn"),
    searchInput: document.getElementById("contacts-search"),
    searchResults: document.getElementById("contacts-results"),
    savedContacts: document.getElementById("saved-contacts"),
    editModal: document.getElementById("contact-edit-modal"),
    contactForm: document.getElementById("contact-form"),
    originalName: document.getElementById("contact-original-name"),
    customName: document.getElementById("contact-custom-name"),
    customImage: document.getElementById("contact-custom-image"),
    targetId: document.getElementById("contact-target-id"),
    originalAvatar: document.getElementById("original-avatar-preview"),
    customAvatar: document.getElementById("custom-avatar-preview"),
    previewBtn: document.getElementById("preview-contact-btn"),
    deleteBtn: document.getElementById("delete-contact-btn"),
    cancelBtn: document.getElementById("cancel-contact-btn"),
    contactsError: document.getElementById("contacts-error"),
    contactsSuccess: document.getElementById("contacts-success"),
  };

  // Check if required elements exist
  if (!elements.searchBtn || !elements.searchInput || !elements.savedContacts) {
    console.error("Missing required contact tab elements");
    return;
  }

  // Load saved contacts
  loadSavedContacts(character.id);

  // Set up event listeners
  elements.searchBtn.addEventListener("click", () => {
    const query = elements.searchInput.value.trim();
    if (query.length < 2) {
      showContactsMessage(
        "error",
        "Please enter at least 2 characters to search"
      );
      return;
    }

    searchCharacters(query, character.id);
  });

  elements.searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      elements.searchBtn.click();
    }
  });

  // Set up contact form submission
  if (elements.contactForm) {
    elements.contactForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const targetId = elements.targetId.value;
      const customName = elements.customName.value.trim();
      const customImage = elements.customImage.value.trim();

      await saveContact(character.id, targetId, customName, customImage);
      closeContactModal();
      loadSavedContacts(character.id);
    });
  }

  // Set up preview button
  if (elements.previewBtn) {
    elements.previewBtn.addEventListener("click", () => {
      const imageUrl = elements.customImage.value.trim();
      if (imageUrl) {
        elements.customAvatar.src = imageUrl;
        elements.customAvatar.onerror = () => {
          elements.customAvatar.src = "/api/placeholder/80/80";
          showContactsMessage(
            "error",
            "Invalid image URL or image could not be loaded"
          );
        };
      } else {
        elements.customAvatar.src = elements.originalAvatar.src;
      }
    });
  }

  // Set up delete button
  if (elements.deleteBtn) {
    elements.deleteBtn.addEventListener("click", async () => {
      const targetId = elements.targetId.value;
      await deleteContact(character.id, targetId);
      closeContactModal();
      loadSavedContacts(character.id);
    });
  }

  // Set up cancel button
  if (elements.cancelBtn) {
    elements.cancelBtn.addEventListener("click", closeContactModal);
  }

  // Close modal on background click
  if (elements.editModal) {
    elements.editModal.addEventListener("click", (e) => {
      if (e.target === elements.editModal) {
        closeContactModal();
      }
    });
  }

  // Helper function to close contact modal
  function closeContactModal() {
    if (elements.editModal) {
      elements.editModal.style.display = "none";
    }
  }

  // Helper function to show contact messages
  function showContactsMessage(type, message) {
    const element =
      type === "error" ? elements.contactsError : elements.contactsSuccess;
    if (element) {
      element.textContent = message;
      element.style.display = "block";

      // Hide after a delay
      setTimeout(() => {
        element.style.display = "none";
      }, 5000);
    }
  }

  // Function to search for characters
  async function searchCharacters(query, excludeId) {
    if (!elements.searchResults) return;

    // Show loading indicator
    elements.searchResults.innerHTML =
      '<p class="loading-text">Searching...</p>';

    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(
          query
        )}&excludeUserId=${excludeId}`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to search characters");
      }

      const characters = await response.json();

      if (characters.length === 0) {
        elements.searchResults.innerHTML =
          '<p class="empty-text">No characters found matching your search.</p>';
        return;
      }

      // Build search results
      elements.searchResults.innerHTML = "";

      characters.forEach((character) => {
        const resultItem = document.createElement("div");
        resultItem.className = "character-result";
        resultItem.innerHTML = `
          <div class="character-avatar">
            <img src="${
              character.avatar_url || "/api/placeholder/60/60"
            }" alt="${character.name}">
          </div>
          <div class="character-info">
            <div class="character-name">${character.name}</div>
            <div class="character-details">
              <span>${getFullPosition(character.position) || "Unknown"}</span>
              <span>${character.team_name || "No Team"}</span>
            </div>
          </div>
        `;

        // Add click event to open edit modal
        resultItem.addEventListener("click", () => {
          openContactEditModal(character);
        });

        elements.searchResults.appendChild(resultItem);
      });
    } catch (error) {
      console.error("Error searching characters:", error);
      elements.searchResults.innerHTML =
        '<p class="error-text">Failed to search characters. Please try again.</p>';
    }
  }

  // Function to load saved contacts
  async function loadSavedContacts(characterId) {
    if (!elements.savedContacts) return;

    // Show loading indicator
    elements.savedContacts.innerHTML =
      '<p class="loading-text">Loading your contacts...</p>';

    try {
      const response = await fetch(`/api/characters/${characterId}/contacts`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to load contacts");
      }

      const contacts = await response.json();

      if (contacts.length === 0) {
        elements.savedContacts.innerHTML =
          '<p class="empty-text">You haven\'t saved any contacts yet. Search for characters above to add them to your contacts.</p>';
        return;
      }

      // Build contacts list
      elements.savedContacts.innerHTML = "";

      contacts.forEach((contact) => {
        const contactItem = document.createElement("div");
        contactItem.className = "contact-card";
        contactItem.innerHTML = `
          <div class="contact-avatar">
            <img src="${
              contact.custom_image ||
              contact.original_avatar ||
              "/api/placeholder/60/60"
            }" alt="${contact.custom_name || contact.original_name}">
          </div>
          <div class="contact-info">
            <div class="contact-name">${
              contact.custom_name || contact.original_name
            }</div>
            ${
              contact.custom_name
                ? `<div class="contact-original">(${contact.original_name})</div>`
                : ""
            }
          </div>
        `;

        // Add click event to open edit modal
        contactItem.addEventListener("click", () => {
          openContactEditModal(
            {
              id: contact.target_character_id,
              name: contact.original_name,
              avatar_url: contact.original_avatar,
            },
            contact
          );
        });

        elements.savedContacts.appendChild(contactItem);
      });
    } catch (error) {
      console.error("Error loading contacts:", error);
      elements.savedContacts.innerHTML =
        '<p class="error-text">Failed to load contacts. Please try again.</p>';
    }
  }

  // Function to open contact edit modal
  function openContactEditModal(character, existingContact = null) {
    if (!elements.editModal || !elements.originalName || !elements.targetId)
      return;

    // Set form values
    elements.originalName.value = character.name;
    elements.targetId.value = character.id;

    // Set avatar previews
    elements.originalAvatar.src =
      character.avatar_url || "/api/placeholder/80/80";
    elements.customAvatar.src =
      existingContact?.custom_image ||
      character.avatar_url ||
      "/api/placeholder/80/80";

    // Populate existing contact data if available
    if (existingContact) {
      elements.customName.value = existingContact.custom_name || "";
      elements.customImage.value = existingContact.custom_image || "";
    } else {
      elements.customName.value = "";
      elements.customImage.value = "";
    }

    // Show modal
    elements.editModal.style.display = "flex";
  }

  // Function to save contact
  async function saveContact(characterId, targetId, customName, customImage) {
    try {
      const response = await fetch(
        `/api/characters/${characterId}/contacts/${targetId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            custom_name: customName || null,
            custom_image: customImage || null,
          }),
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to save contact");
      }

      showContactsMessage("success", "Contact saved successfully");
      return true;
    } catch (error) {
      console.error("Error saving contact:", error);
      showContactsMessage("error", "Failed to save contact. Please try again.");
      return false;
    }
  }

  // Function to delete contact
  async function deleteContact(characterId, targetId) {
    try {
      const response = await fetch(
        `/api/characters/${characterId}/contacts/${targetId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete contact");
      }

      showContactsMessage("success", "Contact deleted successfully");
      return true;
    } catch (error) {
      console.error("Error deleting contact:", error);
      showContactsMessage(
        "error",
        "Failed to delete contact. Please try again."
      );
      return false;
    }
  }
}