document.addEventListener('DOMContentLoaded', function() {
  // Tab Switching Logic
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      tab.classList.add('active');
      const targetTab = tab.getAttribute('data-tab');
      document.getElementById(targetTab).classList.add('active');
    });
  });

  // Popup Modal functionality for Instagram gallery
  const images = document.querySelectorAll('#instagram-gallery img');
  const modal = document.getElementById('image-modal');
  const modalImg = document.getElementById('modal-image');
  const captionText = document.getElementById('caption');
  const closeBtn = document.querySelector('.close');
  images.forEach(image => {
    image.addEventListener('click', () => {
      modal.style.display = 'block';
      modalImg.src = image.src;
      captionText.textContent = image.alt;
    });
  });
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      modal.style.display = 'none';
    });
  }
  window.addEventListener('click', (event) => {
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  });

  // Format text fields to preserve line breaks
  function formatTextFields() {
    // For .bio-section p and .info-section .value
    const selectors = [
      '.bio-section p',
      '.info-section .value'
    ];
    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        if (!/<\/?[a-z][\s\S]*>/i.test(el.innerHTML)) {
          el.innerHTML = el.innerHTML.replace(/\n/g, '<br>');
        }
      });
    });
  }
  formatTextFields();
});
