import { getFullPosition } from "../utils.js";

export async function updateBioTab(character) {
  const bioElement = document.getElementById("full-bio");
  if (!bioElement) return;

  if (character.bio) {
    // Create a more detailed bio with sections
    const bioHTML = `
      <h1>${character.name}</h1>
      
      <h2>${
        character.character_type === "player"
          ? getFullPosition(character.position)
          : character.role
      }</h2>
      
      <div class="character-bio">
        <p>${character.bio.replace(/\n\n/g, "</p><p>")}</p>
      </div>
      
      <div class="fancy-divider"></div>
      
      <h2>${
        character.team_name
          ? `Member of ${character.team_name}`
          : "Currently Unaffiliated"
      }</h2>
      
      <p class="quote">
        Character quotes would appear here if provided in the data.
      </p>
    `;

    bioElement.innerHTML = bioHTML;
  } else {
    bioElement.innerHTML = `
      <h1>${character.name}</h1>
      <p>No detailed biography has been provided for this character yet.</p>
      <p>You can add a biography by editing the character profile.</p>
      <a href="character-form.html?id=${character.id}" class="btn btn-primary">Edit Character</a>
    `;
  }
}