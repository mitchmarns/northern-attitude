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
    successContainer: document.getElementById('threads-success'),
    threadDetailsModal: document.getElementById('thread-details-modal'),
    closeThreadDetailsModal: document.getElementById('close-thread-details-modal')
  };

  // Make sure modals are hidden initially
  if (elements.createThreadModal) {
    elements.createThreadModal.style.display = 'none';
  }
  
  if (elements.threadDetailsModal) {
    elements.threadDetailsModal.style.display = 'none';
  }

  // Current page and filter state
  let currentPage = 1;
  let currentFilters = {};

  // Initialize event listeners
  function initEventListeners() {
    // Create thread button
    if (elements.createThreadBtn) {
      elements.createThreadBtn.addEventListener('click', openCreateThreadModal);
    }
    
    // Close modal buttons
    if (elements.closeCreateThreadModal) {
      elements.closeCreateThreadModal.addEventListener('click', closeCreateThreadModal);
    }
    
    // Close thread details modal
    if (elements.closeThreadDetailsModal) {
      elements.closeThreadDetailsModal.addEventListener('click', closeThreadDetailsModal);
    }
    
    // Create thread form submission
    if (elements.createThreadForm) {
      elements.createThreadForm.addEventListener('submit', handleCreateThread);
    }
    
    // Filter event listeners
    if (elements.locationFilter) {
      elements.locationFilter.addEventListener('change', applyFilters);
    }
    
    if (elements.statusFilter) {
      elements.statusFilter.addEventListener('change', applyFilters);
    }
    
    // Modal background click handlers
    if (elements.createThreadModal) {
      elements.createThreadModal.addEventListener('click', function(e) {
        if (e.target === elements.createThreadModal) {
          closeCreateThreadModal();
        }
      });
    }
    
    if (elements.threadDetailsModal) {
      elements.threadDetailsModal.addEventListener('click', function(e) {
        if (e.target === elements.threadDetailsModal) {
          closeThreadDetailsModal();
        }
      });
    }
  }

  // Open create thread modal
  function openCreateThreadModal() {
    if (elements.createThreadModal) {
      elements.createThreadModal.style.display = 'flex';
    }
  }

  // Close create thread modal
  function closeCreateThreadModal() {
    if (elements.createThreadModal) {
      elements.createThreadModal.style.display = 'none';
    }
  }
  
  // Close thread details modal
  function closeThreadDetailsModal() {
    if (elements.threadDetailsModal) {
      elements.threadDetailsModal.style.display = 'none';
    }
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
      location: elements.locationFilter ? elements.locationFilter.value : '',
      status: elements.statusFilter ? elements.statusFilter.value : ''
    };
    currentPage = 1;
    loadThreads();
  }

  // Load threads with pagination and filtering
  async function loadThreads() {
    try {
      // Show loading state
      if (elements.threadsContainer) {
        elements.threadsContainer.innerHTML = '<div class="loading-indicator">Loading threads...</div>';
      }
      
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
      if (elements.threadsContainer) {
        elements.threadsContainer.innerHTML = '';
        
        // Render threads
        if (data.threads && data.threads.length > 0) {
          data.threads.forEach(thread => {
            const threadCard = createThreadCard(thread);
            elements.threadsContainer.appendChild(threadCard);
          });
        } else {
          elements.threadsContainer.innerHTML = '<div class="empty-state">No threads found matching your criteria.</div>';
        }
      }
      
      // Render pagination
      renderPagination(data.pagination || { currentPage: 1, totalPages: 1 });
    } catch (error) {
      console.error('Error loading threads:', error);
      showError('Failed to load threads. Please try again.');
      
      if (elements.threadsContainer) {
        elements.threadsContainer.innerHTML = '<div class="error-state">Failed to load threads. Please try again.</div>';
      }
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
          <strong>Posts:</strong> ${thread.post_count || 0}
          <strong>Participants:</strong> ${thread.participant_count || 0}
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
    if (viewThreadBtn) {
      viewThreadBtn.addEventListener('click', () => openThreadDetails(thread.id));
    }
    
    return card;
  }

  // Render pagination controls
  function renderPagination(pagination) {
    const paginationContainer = document.getElementById('pagination');
    if (!paginationContainer) return;
    
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
    pageInfo.className = 'pagination-info';
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
      // Show loading state in thread details modal
      if (elements.threadDetailsModal) {
        const detailsContent = elements.threadDetailsModal.querySelector('.modal-body');
        if (detailsContent) {
          detailsContent.innerHTML = '<div class="loading-indicator">Loading thread details...</div>';
        }
        
        // Show the modal
        elements.threadDetailsModal.style.display = 'flex';
      }
      
      const response = await fetch(`/api/threads/${threadId}`, {
        method: 'GET',
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to load thread details');
      }
      
      // Update thread details in modal
      updateThreadDetailsModal(data.thread, data.posts || [], data.participants || []);
      
    } catch (error) {
      console.error('Error fetching thread details:', error);
      showError('Failed to load thread details. Please try again.');
      
      // Hide the modal on error
      if (elements.threadDetailsModal) {
        elements.threadDetailsModal.style.display = 'none';
      }
    }
  }
  
  // Update thread details modal with fetched data
  function updateThreadDetailsModal(thread, posts, participants) {
    if (!elements.threadDetailsModal) return;
    
    // Update title
    const titleElement = document.getElementById('details-thread-title');
    if (titleElement) {
      titleElement.textContent = thread.title || 'Thread Details';
    }
    
    // Update description
    const descriptionElement = document.getElementById('details-thread-description');
    if (descriptionElement) {
      descriptionElement.innerHTML = thread.description || '<em>No description provided</em>';
    }
    
    // Update location and status
    const locationElement = document.getElementById('details-thread-location');
    if (locationElement) {
      locationElement.textContent = thread.location || 'Unspecified';
    }
    
    const statusElement = document.getElementById('details-thread-status');
    if (statusElement) {
      statusElement.textContent = thread.status || 'unknown';
      statusElement.className = `thread-status ${thread.status}`;
    }
    
    // Update posts
    const postsContainer = document.getElementById('thread-posts');
    if (postsContainer) {
      postsContainer.innerHTML = '';
      
      if (posts.length > 0) {
        posts.forEach(post => {
          const postElement = document.createElement('div');
          postElement.className = 'thread-post';
          
          postElement.innerHTML = `
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
                  ${post.character_team || 'No Team'} | 
                  Posted: ${formatDate(new Date(post.created_at))}
                </div>
              </div>
            </div>
            <div class="thread-post-content">
              ${post.content}
            </div>
          `;
          
          postsContainer.appendChild(postElement);
        });
      } else {
        postsContainer.innerHTML = '<div class="empty-state">No posts in this thread yet. Be the first to reply!</div>';
      }
    }
    
    // Set up reply form submission
    const replyForm = document.getElementById('new-post-form');
    if (replyForm) {
      // Remove any existing event listeners
      const newReplyForm = replyForm.cloneNode(true);
      replyForm.parentNode.replaceChild(newReplyForm, replyForm);
      
      // Add new event listener
      newReplyForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const content = document.getElementById('post-content').value.trim();
        if (!content) return;
        
        submitThreadReply(thread.id, content);
      });
    }
    
    // Set up close thread button
    const closeThreadBtn = document.getElementById('close-thread-btn');
    if (closeThreadBtn) {
      // Remove any existing event listeners
      const newCloseBtn = closeThreadBtn.cloneNode(true);
      closeThreadBtn.parentNode.replaceChild(newCloseBtn, closeThreadBtn);
      
      // Add new event listener
      newCloseBtn.addEventListener('click', function() {
        closeThread(thread.id);
      });
      
      // Only show for thread creators or admins
      newCloseBtn.style.display = thread.canClose ? 'block' : 'none';
    }
  }
  
  // Submit a reply to a thread
  async function submitThreadReply(threadId, content) {
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
        showSuccess('Reply posted successfully!');
        
        // Clear the form
        const contentInput = document.getElementById('post-content');
        if (contentInput) {
          contentInput.value = '';
        }
        
        // Refresh thread details
        openThreadDetails(threadId);
      } else {
        showError(data.message || 'Failed to post reply');
      }
    } catch (error) {
      console.error('Error posting reply:', error);
      showError('Failed to post reply. Please try again.');
    }
  }
  
  // Close a thread
  async function closeThread(threadId) {
    try {
      const response = await fetch(`/api/threads/${threadId}/close`, {
        method: 'POST',
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (response.ok) {
        showSuccess('Thread closed successfully!');
        
        // Refresh thread details and thread list
        openThreadDetails(threadId);
        loadThreads();
      } else {
        showError(data.message || 'Failed to close thread');
      }
    } catch (error) {
      console.error('Error closing thread:', error);
      showError('Failed to close thread. Please try again.');
    }
  }

  // Helper function to format dates
  function formatDate(date) {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(date);
  }

  // Show success message
  function showSuccess(message) {
    if (!elements.successContainer) return;
    
    elements.successContainer.textContent = message;
    elements.successContainer.style.display = 'block';
    
    // Hide after 3 seconds
    setTimeout(() => {
      elements.successContainer.style.display = 'none';
    }, 3000);
  }

  // Show error message
  function showError(message) {
    if (!elements.errorContainer) return;
    
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