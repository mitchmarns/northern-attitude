# Copilot Instructions for This Project

## General Principles

- **Backend Mapping Only:**  
  All mapping from database field names (snake_case) to frontend field names (camelCase) must be done in the backend controller.  
  The EJS templates should receive a `character` object already in the exact shape and naming the form expects.  
  *Do not perform any mapping or renaming in EJS or client-side JS.*

- **No Redundant Assignments:**  
  Do not include lines like `if (character.favFood) character.favFood = character.favFood;`.  
  If the backend sends the correct data, these are unnecessary.

- **No Debug Logging in Templates:**  
  Remove all `console.log` or debug output from EJS and client-side JS.  
  Use backend logging for debugging data issues.

- **Pass Only What’s Needed:**  
  Only pass the fields the form will use, already mapped and validated.

- **Keep Templates Clean:**  
  EJS should only render fields and call rendering functions.  
  Avoid logic in the template or client-side JS that transforms or renames data.

- **Consistent Naming:**  
  Use camelCase for all JavaScript variables and object keys.  
  Use snake_case for database columns.  
  Map between them only in the backend.

- **Validation:**  
  Perform all validation in the backend.  
  Use client-side validation only for user experience, not as a security measure.

- **Testing:**  
  Add unit and integration tests for all controllers and utility functions.  
  Use a tool like Jest or Mocha.

- **Configuration:**  
  Store all environment-specific values in `.env` and load with `dotenv`.

## Example: Backend Controller (Node/Express)

```js
// filepath: controllers/characterController.js
const mapCharacterForForm = (characterFromDb) => ({
  id: characterFromDb.id,
  name: characterFromDb.name,
  avatarUrl: characterFromDb.url,
  bannerUrl: characterFromDb.banner_url,
  sidebarUrl: characterFromDb.sidebar_url,
  spotifyEmbed: characterFromDb.spotify_embed,
  jerseyNumber: characterFromDb.jersey_number,
  isPrivate: Boolean(characterFromDb.is_private),
  fullBio: characterFromDb.full_bio,
  quote: characterFromDb.quote || characterFromDb.QUOTE,
  birthday: characterFromDb.birthday,
  zodiac: characterFromDb.zodiac,
  hometown: characterFromDb.hometown,
  education: characterFromDb.education,
  occupation: characterFromDb.occupation,
  sexuality: characterFromDb.sexuality,
  pronouns: characterFromDb.pronouns,
  languages: characterFromDb.languages,
  religion: characterFromDb.religion,
  strengths: characterFromDb.strengths,
  weaknesses: characterFromDb.weaknesses,
  favFood: characterFromDb.fav_food,
  favMusic: characterFromDb.fav_music,
  favMovies: characterFromDb.fav_movies,
  favColor: characterFromDb.fav_color,
  favSports: characterFromDb.fav_sports,
  inspiration: characterFromDb.inspiration,
  teamId: characterFromDb.team_id,
  // ...add other fields as needed
});
```

## Example: EJS Template

```html
<!-- filepath: views/characters/edit.ejs -->
<script>
  // Data is already mapped and ready for the form
  const character = <%- JSON.stringify(character) %>;
  const teams = <%- JSON.stringify(teams) %>;
  document.getElementById('form-fields').innerHTML = renderCharacterFormFields(character);
  // ...initialize form, toolbar, etc...
</script>
```

---

**Summary:**  
- Do all data mapping and transformation in the backend.  
- Pass only mapped, ready-to-use data to EJS.  
- Keep EJS and client-side JS as simple as possible.  
- Use consistent naming conventions.  
- Document any non-obvious logic.
