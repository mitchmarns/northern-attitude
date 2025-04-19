document.addEventListener('DOMContentLoaded', function() {
  // Initialize the tab functionality
  initializeCharacterTabs();

  // Add line break support for paragraphs
  formatTextFields();
});

// Handle tab functionality similar to the form tabs
function initializeCharacterTabs() {
  const tabLinks = document.querySelectorAll('.character-tab-link');
  const tabContents = document.querySelectorAll('.character-tab-pane');
  
  // Initialize tabs - hide all tab content first
  tabContents.forEach(tab => {
    tab.style.display = 'none';
  });
  
  // Show the first tab by default
  if (tabLinks.length > 0 && tabContents.length > 0) {
    tabLinks[0].classList.add('active');
    const firstTabId = tabLinks[0].getAttribute('href');
    const firstTab = document.querySelector(firstTabId);
    if (firstTab) {
      firstTab.style.display = 'block';
    }
  }
  
  // Add click handlers to tab links
  tabLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Remove active class from all tabs and hide tab content
      tabLinks.forEach(l => l.classList.remove('active'));
      tabContents.forEach(t => {
        t.style.display = 'none';
      });
      
      // Add active class to clicked tab and show its content
      this.classList.add('active');
      const targetId = this.getAttribute('href');
      const targetTab = document.querySelector(targetId);
      if (targetTab) {
        targetTab.style.display = 'block';
      }
    });
  });
}

// Format text fields to preserve line breaks
function formatTextFields() {
  const textSections = [
    '.info-section p',
    '.bio-section p'
  ];
  
  textSections.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      // Replace newlines with <br> tags if they don't already contain HTML
      if (!/<\/?[a-z][\s\S]*>/i.test(el.innerHTML)) {
        el.innerHTML = el.innerHTML.replace(/\n/g, '<br>');
      }
    });
  });
}
