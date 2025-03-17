document.addEventListener('DOMContentLoaded', function() {
  // Check authentication
  window.authUtils.checkAuth(true);
  window.authUtils.setupLogoutButton();

  // Cache DOM elements
  const elements = {
    threadsContainer: document.getElementById('threads-container'),
    createThreadBtn: document.getElementById('create-thread-btn'),
    createThreadModal: document.getElementById('create-thread-modal'),
    closeCreateThreadModal: document.getElementById('close-create-thread-modal'),
    createThreadForm: document.getElementById('create-thread-form'),
    locationFilter: document.getElementById('location-filter'),
    statusFilter: document.getElementById('status-filter'),
    errorContainer: document.getElementById('threads-error'),
    successContainer: document.getElementById('threads-success')
  };

  // Current page and filter state
  let currentPage = 1;
  let currentFilters = {};

  // Initialize event listeners
  function initEventListeners() {
    // Create thread button
    elements.createThreadBtn.addEventListener('click', openCreateThreadModal);
    
    // Close modal buttons
    elements.closeCreateThreadModal.addEventListener('click', closeCreateThreadModal);
    
    // Create thread form submission
    elements.createThreadForm.addEventListener('submit', handleCreateThread);
    
    // Filter event listeners
    elements.locationFilter.addEventListener('change', applyFilters);
    elements.statusFilter.addEventListener('change', applyFilters);
  }

  // Open create thread modal
  function openCreateThreadModal() {
    elements.createThreadModal.style.display = 'flex';
  }

  // Close create thread modal
  function closeCreateThreadModal() {
    elements.createThreadModal.style.display = 'none';
  }

  // Handle thread creation
  async function handleCreateThread(e) {
    e.preventDefault();
    
    const title = document.getElementById('thread-title').value.trim();
    const description = document.getElementById('thread-description').value.trim();
    const location = document.getElementById('thread-location').value;
    
    try {
      const response = await fetch('/api/threads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title, description, location }),
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (response.ok) {
        showSuccess('Thread created successfully!');
        closeCreateThreadModal();
        loadThreads(); // Refresh threads list
      } else {
        showError(data.message || 'Failed to create thread');
      }
    } catch (error) {
      console.error('Error creating thread:', error);
      showError('Failed to create thread. Please try again.');
    }
  }

  // Apply filters
  function applyFilters() {
    currentFilters = {
      location: elements.locationFilter.value,
      status: elements.statusFilter.value
    };
    currentPage = 1;
    loadThreads();
  }

  // Load threads with pagination and filtering
  async function loadThreads() {
    try {
      // Construct query parameters
      const params = new URLSearchParams({
        page: currentPage,
        ...currentFilters
      });
      
      const response = await fetch(`/api/threads?${params}`, {
        method: 'GET',
        credentials: 'include'
      });
      
      const data = await response.json();
      
      // Clear previous threads
      elements.threadsContainer.innerHTML = '';
      
      // Render threads
      data.threads.forEach(thread => {
        const threadCard = createThreadCard(thread);
        elements.threadsContainer.appendChild(threadCard);
      });
      
      // Render pagination
      renderPagination(data.pagination);
    } catch (error) {
      console.error('Error loading threads:', error);
      showError('Failed to load threads. Please try again.');
    }
  }

  // Create thread card
  function createThreadCard(thread) {
    const card = document.createElement('div');
    card.className = 'thread-card';
    
    card.innerHTML = `
      <div class="thread-header">
        <h3 class="thread-title">${thread.title}</h3>
        <div class="thread-meta">
          <span class="thread-status ${thread.status}">${thread.status}</span>
        </div>
      </div>
      
      <div class="thread-creator">
        <img 
          src="${thread.creator_avatar || '/api/placeholder/30/30'}" 
          alt="${thread.creator_name}" 
          class="thread-creator-avatar"
        >
        <span>Started by ${thread.creator_name}</span>
      </div>
      
      ${thread.description ? `<p class="thread-description">${thread.description}</p>` : ''}
      
      <div class="thread-stats">
        <div>
          <strong>Location:</strong> ${thread.location || 'Unspecified'}
        </div>
        <div>
          <strong>Posts:</strong> ${thread.post_count}
          <strong>Participants:</strong> ${thread.participant_count}
        </div>
      </div>
      
      <div class="thread-actions">
        <button class="btn btn-secondary btn-sm view-thread" data-thread-id="${thread.id}">
          View Thread
        </button>
      </div>
    `;
    
    // Add event listener to view thread
    const viewThreadBtn = card.querySelector('.view-thread');
    viewThreadBtn.addEventListener('click', () => openThreadDetails(thread.id));
    
    return card;
  }

  // Render pagination controls
  function renderPagination(pagination) {
    const paginationContainer = document.getElementById('pagination');
    paginationContainer.innerHTML = '';
    
    // Previous button
    if (pagination.currentPage > 1) {
      const prevBtn = document.createElement('button');
      prevBtn.textContent = 'Previous';
      prevBtn.className = 'btn btn-secondary';
      prevBtn.addEventListener('click', () => {
        currentPage--;
        loadThreads();
      });
      paginationContainer.appendChild(prevBtn);
    }
    
    // Page info
    const pageInfo = document.createElement('span');
    pageInfo.textContent = `Page ${pagination.currentPage} of ${pagination.totalPages}`;
    paginationContainer.appendChild(pageInfo);
    
    // Next button
    if (pagination.currentPage < pagination.totalPages) {
      const nextBtn = document.createElement('button');
      nextBtn.textContent = 'Next';
      nextBtn.className = 'btn btn-secondary';
      nextBtn.addEventListener('click', () => {
        currentPage++;
        loadThreads();
      });
      paginationContainer.appendChild(nextBtn);
    }
  }

  // Open thread details modal
  async function openThreadDetails(threadId) {
    try {
      const response = await fetch(`/api/threads/${threadId}`, {
        method: 'GET',
        credentials: 'include'
      });
      
      const data = await response.json();
      
      // Create thread details modal
      const modalHtml = `
        <div class="thread-details-modal" id="thread-details-modal">
          <div class="thread-details-content">
            <div class="thread-details-header">
              <h2>${data.thread.title}</h2>
              <button id="close-thread-details" class="close-modal">&times;</button>
            </div>
            
            <div class="thread-details-body">
              <div class="thread-details-meta">
                <p>Location: ${data.thread.location || 'Unspecified'}</p>
                <p>Created by: ${data.thread.creator_name}</p>
              </div>
              
              <div class="thread-posts">
                ${data.posts.map(post => `
                  <div class="thread-post">
                    <div class="thread-post-header">
                      <img 
                        src="${post.character_avatar || '/api/placeholder/40/40'}" 
                        alt="${post.character_name}" 
                        class="thread-post-avatar"
                      >
                      <div>
                        <div class="thread-post-author">${post.character_name}</div>
                        <div class="thread-post-meta">
                          ${post.character_position ? `${post.character_position} | ` : ''}
                          ${post.character_team || 'No Team'}
                        </div>
                      </div>
                    </div>
                    <div class="thread-post-content">
                      ${post.content}
                    </div>
                  </div>
                `).join('')}
              </div>
              
              <div class="thread-participants">
                <h4>Participants:</h4>
                ${data.participants.map(participant => `
                  <img 
                    src="${participant.avatar_url || '/api/placeholder/30/30'}" 
                    alt="${participant.name}" 
                    class="thread-participant-avatar" 
                    title="${participant.name}"
                  >
                `).join('')}
              </div>
            </div>
            
            <div class="thread-details-footer">
              <form id="thread-reply-form" class="thread-reply-form">
                <input 
                  type="text" 
                  id="thread-reply-input" class="form-control thread-reply-input" 
                  placeholder="Write your reply..."
                  required
                >
                <button type="submit" class="btn btn-primary">Post Reply</button>
              </form>
            </div>
          </div>
        </div>
      `;
      
      // Create a temporary div to parse HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = modalHtml;
      const threadDetailsModal = tempDiv.firstChild;
      
      // Add to body
      document.body.appendChild(threadDetailsModal);
      
      // Close modal functionality
      const closeDetailsBtn = threadDetailsModal.querySelector('#close-thread-details');
      closeDetailsBtn.addEventListener('click', () => {
        threadDetailsModal.remove();
      });
      
      // Modal background click to close
      threadDetailsModal.addEventListener('click', (e) => {
        if (e.target === threadDetailsModal) {
          threadDetailsModal.remove();
        }
      });
      
      // Reply form submission
      const replyForm = threadDetailsModal.querySelector('#thread-reply-form');
      replyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const replyInput = replyForm.querySelector('#thread-reply-input');
        const content = replyInput.value.trim();
        
        if (!content) return;
        
        try {
          const response = await fetch(`/api/threads/${threadId}/posts`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content }),
            credentials: 'include'
          });
          
          const data = await response.json();
          
          if (response.ok) {
            // Refresh thread details
            replyInput.value = '';
            openThreadDetails(threadId);
            showSuccess('Reply posted successfully!');
          } else {
            showError(data.message || 'Failed to post reply');
          }
        } catch (error) {
          console.error('Error posting reply:', error);
          showError('Failed to post reply. Please try again.');
        }
      });
      
      // Show modal
      threadDetailsModal.style.display = 'flex';
    } catch (error) {
      console.error('Error fetching thread details:', error);
      showError('Failed to load thread details. Please try again.');
    }
  }

  // Show success message
  function showSuccess(message) {
    elements.successContainer.textContent = message;
    elements.successContainer.style.display = 'block';
    
    // Hide after 3 seconds
    setTimeout(() => {
      elements.successContainer.style.display = 'none';
    }, 3000);
  }

  // Show error message
  function showError(message) {
    elements.errorContainer.textContent = message;
    elements.errorContainer.style.display = 'block';
    
    // Hide after 3 seconds
    setTimeout(() => {
      elements.errorContainer.style.display = 'none';
    }, 3000);
  }

  // Initialize the page
  function init() {
    initEventListeners();
    loadThreads();
  }

  // Start the application
  init();
});