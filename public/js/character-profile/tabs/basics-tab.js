import { getFullPosition } from "../utils.js";

export async function updateBasicsTab(character, stats) {
  // Skip if any critical fields don't exist
  const basicElements = ["basics-full-name", "basics-position", "basics-team"];

  // Check if the basics tab is available
  const missing = basicElements.some((id) => !document.getElementById(id));
  if (missing) return;

  // Update all basics fields with a more conservative approach
  updateBasicsField("full-name", character.name);
  
  // For non-provided fields, use a neutral placeholder
  updateBasicsField("age", character.age || "—");
  updateBasicsField("dob", "Not specified");
  updateBasicsField("nationality", character.nationality || "—");
  updateBasicsField("hometown", character.hometown || "—");

  updateBasicsField("height", character.height || "—");
  updateBasicsField("weight", character.weight ? `${character.weight} lbs` : "—");
  updateBasicsField("handedness", character.handedness || "—");

  // Use stats for jersey number, defaulting to "—" if not available
  const jerseyNumber = stats?.jersey_number || "—";
  updateBasicsField("jersey", jerseyNumber);
  
  // Position and team
  updateBasicsField("position", character.position ? getFullPosition(character.position) : "—");
  updateBasicsField("team", character.team_name || "—");
  updateBasicsField("years-pro", character.years_pro || "—");

  // Handle non-player character types
  const roleSection = document.getElementById("basics-role-section");
  if (roleSection) {
    if (character.character_type !== "player") {
      roleSection.style.display = "block";
      updateBasicsField("role", character.role || "—");
      updateBasicsField("organization", character.team_name || "—");
      updateBasicsField("experience", character.years_pro ? `${character.years_pro} years` : "—");
    } else {
      roleSection.style.display = "none";
    }
  }
}

export async function updateBasicsField(fieldId, value) {
  const element = document.getElementById(`basics-${fieldId}`);
  if (element) {
    if (value && value !== "—") {
      element.textContent = value;
      element.classList.remove("empty");
    } else {
      element.textContent = "—";
      element.classList.add("empty");
    }
  }
}