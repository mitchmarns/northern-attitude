function renderTeamFormFields(team = {}) {
  return `
    <div class="form-col-12">
      <div class="form-group">
        <label for="name">Team Name</label>
        <div class="input-container">
          <input type="text" id="name" name="name" class="form-control" value="${team.name || ''}" required>
        </div>
      </div>
    </div>
    
    <div class="form-col-12">
      <div class="form-group">
        <label for="description">Description</label>
        <div class="input-container">
          <textarea id="description" name="description" class="form-control">${team.description || ''}</textarea>
        </div>
      </div>
    </div>
    
    <div class="form-col-6">
      <div class="form-group">
        <label for="city">City</label>
        <div class="input-container">
          <input type="text" id="city" name="city" class="form-control" value="${team.city || ''}">
        </div>
      </div>
    </div>
    
    <div class="form-col-6">
      <div class="form-group">
        <label for="mascot">Mascot</label>
        <div class="input-container">
          <input type="text" id="mascot" name="mascot" class="form-control" value="${team.mascot || ''}">
        </div>
      </div>
    </div>
    
    <div class="form-col-12">
      <div class="form-group">
        <label for="logo_url">Logo URL</label>
        <div class="input-container">
          <input type="url" id="logo_url" name="logo_url" class="form-control" value="${team.logo_url || ''}">
        </div>
      </div>
    </div>
    
    <div class="form-col-12">
      <div class="form-group">
        <label>Team Colors</label>
        <div class="colors-container">
          <div class="colors-group">
            <div class="color-input-group">
              <label for="primary_color">Primary</label>
              <input type="color" id="primary_color" name="primary_color" class="form-control form-control-color" 
                value="${team.primary_color || '#0066CC'}" title="Choose primary team color">
            </div>
            <div class="color-input-group">
              <label for="secondary_color">Secondary</label>
              <input type="color" id="secondary_color" name="secondary_color" class="form-control form-control-color" 
                value="${team.secondary_color || '#FFFFFF'}" title="Choose secondary team color">
            </div>
            <div class="color-input-group">
              <label for="accent_color">Accent</label>
              <input type="color" id="accent_color" name="accent_color" class="form-control form-control-color" 
                value="${team.accent_color || '#969696'}" title="Choose accent team color">
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}