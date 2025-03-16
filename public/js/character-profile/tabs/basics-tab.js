export async function updateBasicsTab(character, stats) {
  // Skip if any critical fields don't exist
  const basicElements = ["basics-full-name", "basics-position", "basics-team"];

  // Check if the basics tab is available
  const missing = basicElements.some((id) => !document.getElementById(id));
  if (missing) return;

  // Extract the basic info we have
  const jerseyNumber = stats?.jersey_number || Math.floor(Math.random() * 98) + 1;
  const position = getFullPosition(character.position);
  const teamName = character.team_name || 'No Team';

  // Generate random but consistent age
  const characterId = parseInt(character.id);
  const ageBase = characterId % 20; // Use character ID to create a consistent "random" age
  const age = 18 + ageBase; // Hockey players are usually at least 18

  // Calculate birth date based on age
  const today = new Date();
  const birthYear = today.getFullYear() - age;
  const birthDate = new Date(
    birthYear,
    Math.floor(characterId % 12),
    (characterId % 28) + 1
  );
  const formattedBirthDate = birthDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Generate height and weight based on position
  let height, weight;
  switch (character.position) {
    case "G":
      height = `6'${2 + (characterId % 3)}"`;
      weight = 190 + (characterId % 15);
      break;
    case "D":
      height = `6'${1 + (characterId % 4)}"`;
      weight = 200 + (characterId % 20);
      break;
    default: // Forward positions
      height = `5'${11 + (characterId % 4)}"`;
      weight = 180 + (characterId % 25);
      break;
  }

  // Generate a list of nationalities for hockey players
  const nationalities = [
    "Canadian",
    "American",
    "Swedish",
    "Finnish",
    "Russian",
    "Czech",
    "Slovak",
    "German",
    "Swiss",
    "Danish",
  ];
  const nationality = nationalities[characterId % nationalities.length];

  // List of sample hometowns
  const hometowns = [
    "Toronto, ON",
    "Montreal, QC",
    "Vancouver, BC",
    "Boston, MA",
    "Minneapolis, MN",
    "Detroit, MI",
    "Stockholm, Sweden",
    "Moscow, Russia",
    "Helsinki, Finland",
    "Prague, Czech Republic",
    "Bratislava, Slovakia",
  ];
  const hometown = hometowns[characterId % hometowns.length];

  // Handedness (shoots/catches)
  const handedness = (characterId % 3 === 0) ? 'Left' : 'Right';

  // Years as a professional
  const yearsPro = Math.max(1, Math.floor(age / 5));

  // Update the basics fields
  updateBasicsField("full-name", character.name);
  updateBasicsField("age", age);
  updateBasicsField("dob", formattedBirthDate);
  updateBasicsField("nationality", nationality);
  updateBasicsField("hometown", hometown);

  updateBasicsField("height", height);
  updateBasicsField("weight", `${weight} lbs`);
  updateBasicsField("handedness", handedness);

  updateBasicsField("jersey", jerseyNumber);
  updateBasicsField("position", position);
  updateBasicsField("team", teamName);
  updateBasicsField("years-pro", yearsPro);

  // Handle non-player character types
  const roleSection = document.getElementById("basics-role-section");
  if (roleSection) {
    if (character.character_type !== "player") {
      roleSection.style.display = "block";
      updateBasicsField("role", character.role || "Unspecified");
      updateBasicsField("organization", teamName);
      updateBasicsField("experience", `${yearsPro} years`);
    } else {
      roleSection.style.display = "none";
    }
  }
}

export async function updateBasicsField(fieldId, value) {
  const element = document.getElementById(`basics-${fieldId}`);
  if (element) {
    if (value) {
      element.textContent = value;
      element.classList.remove("empty");
    } else {
      element.textContent = "Not specified";
      element.classList.add("empty");
    }
  }
}