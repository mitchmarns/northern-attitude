// character-phone.js - Client-side functionality for character messaging

document.addEventListener('DOMContentLoaded', function() {
  // Check if user is authenticated
  window.authUtils.checkAuth(true);
  
  // Set up logout functionality
  window.authUtils.setupLogoutButton();
  
  // Initialize variables
  let currentCharacterId = null;
  let currentConversationId = null;
  let userCharacters = [];
  let conversations = [];
  let activeConversation = null;
  let selectedRecipientId = null;
  let selectedRecipientName = null;
  
  // Cache DOM elements
  const elements = {
    characterSelector: document.getElementById('character-selector'),
    phoneTime: document.getElementById('phone-time'),
    conversationList: document.getElementById('conversation-list'),
    messagesApp: document.getElementById('messages-app'),
    conversationApp: document.getElementById('conversation-app'),
    backToMessages: document.getElementById('back-to-messages'),
    conversationTitle: document.getElementById('conversation-title'),
    conversationInfo: document.getElementById('conversation-info'),
    messagesContainer: document.getElementById('messages-container'),
    messageForm: document.getElementById('message-form'),
    messageInput: document.getElementById('message-input'),
    newMessageBtn: document.getElementById('new-message-btn'),
    newMessageModal: document.getElementById('new-message-modal'),
    closeModal: document.getElementById('close-modal'),
    searchCharacters: document.getElementById('search-characters'),
    searchResults: document.getElementById('search-results'),
    newMessageContent: document.getElementById('new-message-content'),
    sendNewMessage: document.getElementById('send-new-message'),
    cancelNewMessage: document.getElementById('cancel-new-message'),
    conversationInfoModal: document.getElementById('conversation-info-modal'),
    conversationInfoTitle: document.getElementById('conversation-info-title'),
    participantsList: document.getElementById('participants-list'),
    closeInfoModal: document.getElementById('close-info-modal'),
    closeInfoBtn: document.getElementById('close-info-btn'),
    phoneError: document.getElementById('phone-error'),
    phoneSuccess: document.getElementById('phone-success')
  };
  
  // Ensure modals are hidden initially
  if (elements.newMessageModal) {
    elements.newMessageModal.style.display = 'none';
  }
  if (elements.conversationInfoModal) {
    elements.conversationInfoModal.style.display = 'none';
  }
  
  // Load user's characters
  loadUserCharacters();
  
  // Set up event listeners
  setupEventListeners();
  
  // Update phone time
  updatePhoneTime();
  setInterval(updatePhoneTime, 60000); // Update every minute
  
  // If URL has parameters for a new message, handle them only after user clicks "New Message"
  const urlParams = new URLSearchParams(window.location.search);
  const newMessage = urlParams.get('new') === '1';
  const senderId = urlParams.get('sender');
  const recipientId = urlParams.get('recipient');
  const recipientName = urlParams.get('name');
  
  // Flag to indicate if the user wants to create a new message based on URL params
  let hasDirectMessageParams = newMessage && senderId && recipientId && recipientName;
  
  // Functions
  
  // Function to load user's characters
  async function loadUserCharacters() {
    try {
      const response = await fetch('/api/messages/user-characters', {
        method: 'GET',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch characters');
      }
      
      userCharacters = await response.json();
      
      // Populate character selector
      populateCharacterSelector();
      
    } catch (error) {
      console.error('Error loading characters:', error);
      showError('Failed to load characters. Please try again later.');
    }
  }
  
  // Function to populate character selector
  function populateCharacterSelector() {
    if (!elements.characterSelector) return;
    
    // Clear existing options
    elements.characterSelector.innerHTML = '<option value="">Select a character</option>';
    
    // Add character options
    userCharacters.forEach(character => {
      const option = document.createElement('option');
      option.value = character.id;
      option.textContent = character.name;
      option.selected = character.is_active;
      elements.characterSelector.appendChild(option);
    });
    
    // Set current character to active character if available
    const activeCharacter = userCharacters.find(char => char.is_active);
    if (activeCharacter) {
      elements.characterSelector.value = activeCharacter.id;
      currentCharacterId = activeCharacter.id;
      loadCharacterConversations(activeCharacter.id);
    }
  }
  
  // Function to load character's conversations
  async function loadCharacterConversations(characterId) {
    try {
      // Show loading indicator
      if (elements.conversationList) {
        elements.conversationList.innerHTML = '<div class="loading-indicator">Loading conversations...</div>';
      }
      
      const response = await fetch(`/api/messages/characters/${characterId}/conversations`, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }
      
      conversations = await response.json();
      
      // Add participants to each conversation
      for (const conversation of conversations) {
        // Fetch participants for each conversation
        try {
          const participantsResponse = await fetch(`/api/messages/conversations/${conversation.id}/participants?characterId=${characterId}`, {
            method: 'GET',
            credentials: 'include'
          });
          
          if (participantsResponse.ok) {
            conversation.participants = await participantsResponse.json();
          }
        } catch (error) {
          console.error(`Error fetching participants for conversation ${conversation.id}:`, error);
        }
      }
      
      // Display conversations
      displayConversations(conversations, characterId);
      
    } catch (error) {
      console.error('Error loading conversations:', error);
      if (elements.conversationList) {
        elements.conversationList.innerHTML = '<div class="no-conversations">Failed to load conversations. Please try again.</div>';
      }
    }
  }
  
  // Function to display conversations
  function displayConversations(conversations, characterId) {
    if (!elements.conversationList) return;
    
    // Clear conversation list
    elements.conversationList.innerHTML = '';
    
    if (conversations.length === 0) {
      elements.conversationList.innerHTML = '<div class="no-conversations">No conversations yet.<br>Start a new conversation with the + button.</div>';
      return;
    }
    
    // Create conversation items
    conversations.forEach(conversation => {
      const conversationItem = document.createElement('div');
      conversationItem.className = 'conversation-item';
      
      // Get conversation title and avatar
      let title = conversation.title;
      let avatarUrl = null;
      
      if (!conversation.is_group && conversation.participants && conversation.participants.length > 0) {
        // For one-on-one conversations, use the other participant's info
        const otherParticipant = conversation.participants.find(p => p.character_id != characterId);
        if (otherParticipant) {
          title = otherParticipant.custom_name || otherParticipant.name;
          avatarUrl = otherParticipant.custom_image || otherParticipant.avatar_url;
        }
      }
      
      // Format date
      const lastMessageDate = conversation.last_message_at ? new Date(conversation.last_message_at) : new Date(conversation.created_at);
      const formattedDate = formatDate(lastMessageDate);
      
      conversationItem.innerHTML = `
        <div class="conversation-avatar">
          <img src="${avatarUrl || '/api/placeholder/50/50'}" alt="${title}">
        </div>
        <div class="conversation-details">
          <div class="conversation-header">
            <div class="conversation-name">${title || 'Conversation'}</div>
            <div class="conversation-time">${formattedDate}</div>
          </div>
          <div class="conversation-preview">
            <div class="conversation-last-message">${conversation.last_message || 'No messages yet'}</div>
            ${conversation.unread_count > 0 ? 
              `<div class="conversation-unread">${conversation.unread_count}</div>` : ''}
          </div>
        </div>
      `;
      
      // Add click event
      conversationItem.addEventListener('click', () => {
        openConversation(conversation.id, characterId);
      });
      
      elements.conversationList.appendChild(conversationItem);
    });
  }
  
  // Function to open a conversation
  async function openConversation(conversationId, characterId) {
    try {
      currentConversationId = conversationId;
      
      // Show conversation app, hide messages app
      if (elements.messagesApp) elements.messagesApp.style.display = 'none';
      if (elements.conversationApp) elements.conversationApp.style.display = 'flex';
      
      // Show loading indicator
      if (elements.messagesContainer) {
        elements.messagesContainer.innerHTML = '<div class="loading-indicator">Loading messages...</div>';
      }
      
      // Get conversation messages
      const response = await fetch(`/api/messages/conversations/${conversationId}/messages?characterId=${characterId}`, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      
      const messages = await response.json();
      
      // Get conversation participants
      const participantsResponse = await fetch(`/api/messages/conversations/${conversationId}/participants?characterId=${characterId}`, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (!participantsResponse.ok) {
        throw new Error('Failed to fetch participants');
      }
      
      const participants = await participantsResponse.json();
      
      // Find the current conversation
      activeConversation = conversations.find(c => c.id === conversationId);
      
      // Update conversation title
      if (activeConversation && elements.conversationTitle) {
        if (activeConversation.is_group) {
          elements.conversationTitle.textContent = activeConversation.title || 'Group Conversation';
        } else {
          // Find the other participant
          const otherParticipant = participants.find(p => p.character_id != characterId);
          elements.conversationTitle.textContent = otherParticipant?.custom_name || otherParticipant?.name || 'Conversation';
        }
      }
      
      // Store participants for the info modal
      if (activeConversation) {
        activeConversation.participants = participants;
      }
      
      // Display messages
      displayMessages(messages, characterId);
      
      // Focus on input
      if (elements.messageInput) {
        elements.messageInput.focus();
      }
      
    } catch (error) {
      console.error('Error opening conversation:', error);
      if (elements.messagesContainer) {
        elements.messagesContainer.innerHTML = '<div class="no-messages">Failed to load messages. Please try again.</div>';
      }
    }
  }
  
  // Function to display messages
  function displayMessages(messages, characterId) {
    if (!elements.messagesContainer) return;
    
    // Clear messages container
    elements.messagesContainer.innerHTML = '';
    
    if (messages.length === 0) {
      elements.messagesContainer.innerHTML = '<div class="no-messages">No messages yet. Start the conversation!</div>';
      return;
    }
    
    // Group messages by date
    const messagesByDate = groupMessagesByDate(messages);
    
    // Create message groups
    Object.entries(messagesByDate).forEach(([date, dateMessages]) => {
      // Add date separator
      const dateSeparator = document.createElement('div');
      dateSeparator.className = 'date-separator';
      dateSeparator.textContent = date;
      elements.messagesContainer.appendChild(dateSeparator);
      
      // Add messages for this date
      dateMessages.forEach(message => {
        const messageElement = document.createElement('div');
        messageElement.className = `message-bubble message-${message.sender_character_id == characterId ? 'outgoing' : 'incoming'}`;
        
        // Format message time
        const messageTime = new Date(message.created_at);
        const formattedTime = messageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Show sender info for group conversations or messages from others
        let senderHtml = '';
        if (activeConversation && (activeConversation.is_group || message.sender_character_id != characterId)) {
          senderHtml = `
            <div class="message-character-info">
              <div class="message-sender">${message.custom_name || message.sender_name}</div>
              ${message.sender_position ? `<div class="message-position">${message.sender_position}</div>` : ''}
              ${message.team_name ? `<div class="message-team">${message.team_name}</div>` : ''}
            </div>
          `;
        }
        
        messageElement.innerHTML = `
          ${senderHtml}
          <div class="message-content">${message.content}</div>
          <div class="message-time">${formattedTime}</div>
        `;
        
        elements.messagesContainer.appendChild(messageElement);
      });
    });
    
    // Scroll to bottom
    scrollToBottom();
  }
  
  // Function to send a message
  async function sendMessage(conversationId, characterId, content) {
    try {
      const response = await fetch(`/api/messages/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content,
          sender_character_id: characterId
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      
      // Clear message input
      if (elements.messageInput) {
        elements.messageInput.value = '';
      }
      
      // Reload conversation to show the new message
      openConversation(conversationId, characterId);
      
    } catch (error) {
      console.error('Error sending message:', error);
      showError('Failed to send message. Please try again.');
    }
  }
  
  // Function to start a new conversation
  async function startNewConversation(senderCharacterId, recipientCharacterId, content) {
    try {
      console.log('Starting new conversation between characters:', senderCharacterId, recipientCharacterId);
      
      // Create or find conversation
      const response = await fetch('/api/messages/conversations/one-to-one', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sender_character_id: senderCharacterId,
          recipient_character_id: recipientCharacterId
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        console.error('Failed to create conversation. Response:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error details:', errorText);
        throw new Error('Failed to create conversation: ' + response.statusText);
      }
      
      const data = await response.json();
      const conversationId = data.conversation_id;
      
      console.log('Created/found conversation with ID:', conversationId);
      
      // Send message if content provided
      if (content) {
        console.log('Sending message to conversation:', conversationId);
        const msgResponse = await fetch(`/api/messages/conversations/${conversationId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            content,
            sender_character_id: senderCharacterId
          }),
          credentials: 'include'
        });
        
        if (!msgResponse.ok) {
          console.error('Failed to send message. Response:', msgResponse.status, msgResponse.statusText);
          throw new Error('Failed to send message');
        }
        
        console.log('Message sent successfully');
      }
      
      // Close modal
      closeNewMessageModal();
      
      // Reload conversations and open the new one
      await loadCharacterConversations(senderCharacterId);
      openConversation(conversationId, senderCharacterId);
      
      // Show success message
      showSuccess('Message sent successfully!');
      
    } catch (error) {
      console.error('Error starting conversation:', error);
      showError('Failed to start conversation. Please try again. Error: ' + error.message);
    }
  }

  function getFullPosition(positionCode) {
    const positions = {
      C: "Center",
      LW: "Left Wing",
      RW: "Right Wing",
      D: "Defense",
      G: "Goalie",
    };
  
    return positions[positionCode] || positionCode;
  }
  
  // Function to search for characters
  async function searchCharacters(query, excludeId) {
    if (!elements.searchResults) return;
  
    // Show loading indicator
    elements.searchResults.innerHTML =
      '<p class="loading-text">Searching...</p>';
  
      try {
        // Build the URL, only adding excludeUserId if it's actually defined
        let searchUrl = `/api/search?q=${encodeURIComponent(query)}`;
        if (excludeId && excludeId !== "undefined") {
          searchUrl += `&excludeUserId=${excludeId}`;
        }
      
        const response = await fetch(searchUrl, {
          method: 'GET',
          credentials: 'include',
        });
  
      if (!response.ok) {
        throw new Error('Failed to search characters');
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
          selectedRecipientId = character.id;
          selectedRecipientName = character.name;
          
          // Update search input and clear results
          elements.searchCharacters.value = character.name;
          elements.searchResults.innerHTML = '';
          
          // Focus on message content
          elements.newMessageContent.focus();
        });
  
        elements.searchResults.appendChild(resultItem);
      });
    } catch (error) {
      console.error("Error searching characters:", error);
      elements.searchResults.innerHTML =
        '<p class="error-text">Failed to search characters. Please try again.</p>';
    }
  }
  
  // Function to display character search results
  function displaySearchResults(characters) {
    if (!elements.searchResults) return;
    
    // Clear search results
    elements.searchResults.innerHTML = '';
    
    if (characters.length === 0) {
      elements.searchResults.innerHTML = '<div class="no-results">No characters found</div>';
      return;
    }
    
    // Create character items
    characters.forEach(character => {
      const characterItem = document.createElement('div');
      characterItem.className = 'character-result';
      
      characterItem.innerHTML = `
        <div class="character-result-avatar">
          <img src="${character.avatar_url || '/api/placeholder/40/40'}" alt="${character.name}">
        </div>
        <div class="character-result-info">
          <div class="character-result-name">${character.name}</div>
          <div class="character-result-details">
            <div class="character-result-position">${character.position || 'Unknown position'}</div>
            <div class="character-result-team">${character.team_name || 'No team'}</div>
          </div>
        </div>
      `;
      
      // Add click event
      characterItem.addEventListener('click', () => {
        // Select this character as recipient
        selectedRecipientId = character.id;
        selectedRecipientName = character.name;
        
        // Update search input and clear results
        if (elements.searchCharacters) {
          elements.searchCharacters.value = character.name;
        }
        elements.searchResults.innerHTML = '';
        
        // Focus on message content
        if (elements.newMessageContent) {
          elements.newMessageContent.focus();
        }
      });
      
      elements.searchResults.appendChild(characterItem);
    });
  }
  
  // Function to show conversation participants
  function showConversationParticipants() {
    if (!elements.participantsList || !activeConversation || !activeConversation.participants) return;
    
    // Clear participants list
    elements.participantsList.innerHTML = '';
    
    // Set modal title
    if (elements.conversationInfoTitle) {
      elements.conversationInfoTitle.textContent = activeConversation.is_group ? 
        activeConversation.title || 'Group Conversation' : 
        'Conversation Info';
    }
    
    // Add participants
    activeConversation.participants.forEach(participant => {
      const participantItem = document.createElement('div');
      participantItem.className = 'participant-item';
      
      participantItem.innerHTML = `
        <div class="participant-avatar">
          <img src="${participant.avatar_url || '/api/placeholder/50/50'}" alt="${participant.name}">
        </div>
        <div class="participant-info">
          <div class="participant-name">${participant.name}</div>
          <div class="participant-details">
            <div class="participant-position">${participant.position || 'Unknown position'}</div>
            <div class="participant-team">${participant.team_name || 'No team'}</div>
          </div>
        </div>
      `;
      
      elements.participantsList.appendChild(participantItem);
    });
    
    // Show modal only if it exists
    if (elements.conversationInfoModal) {
      elements.conversationInfoModal.style.display = 'flex';
    }
  }
  
  // Function to open new message modal
  function openNewMessageModal() {
    // Make sure the modal exists
    if (!elements.newMessageModal) return;
    
    // Reset modal fields
    if (elements.searchCharacters) elements.searchCharacters.value = '';
    if (elements.newMessageContent) elements.newMessageContent.value = '';
    if (elements.searchResults) elements.searchResults.innerHTML = '';
    selectedRecipientId = null;
    selectedRecipientName = null;
    
    // If we have direct message parameters from URL, use them
    if (hasDirectMessageParams && elements.characterSelector) {
      elements.characterSelector.value = senderId;
      currentCharacterId = senderId;
      
      if (elements.searchCharacters) {
        elements.searchCharacters.value = recipientName;
      }
      selectedRecipientId = recipientId;
      selectedRecipientName = recipientName;
      
      // Clear the flag so we don't do this again
      hasDirectMessageParams = false;
    }
    
    // Show modal
    elements.newMessageModal.style.display = 'flex';
    
    // Focus search input or message content
    setTimeout(() => {
      if (selectedRecipientId && elements.newMessageContent) {
        elements.newMessageContent.focus();
      } else if (elements.searchCharacters) {
        elements.searchCharacters.focus();
      }
    }, 100);
  }
  
  // Function to close new message modal
  function closeNewMessageModal() {
    if (elements.newMessageModal) {
      elements.newMessageModal.style.display = 'none';
    }
  }
  
  // Function to close conversation info modal
  function closeConversationInfoModal() {
    if (elements.conversationInfoModal) {
      elements.conversationInfoModal.style.display = 'none';
    }
  }
  
  // Function to show error message
  function showError(message) {
    if (!elements.phoneError) return;
    
    elements.phoneError.textContent = message;
    elements.phoneError.style.display = 'block';
    
    // Hide after a timeout
    setTimeout(() => {
      elements.phoneError.style.display = 'none';
    }, 5000);
  }
  
  // Function to show success message
  function showSuccess(message) {
    if (!elements.phoneSuccess) return;
    
    elements.phoneSuccess.textContent = message;
    elements.phoneSuccess.style.display = 'block';
    
    // Hide after a timeout
    setTimeout(() => {
      elements.phoneSuccess.style.display = 'none';
    }, 5000);
  }
  
  // Helper function to update phone time
  function updatePhoneTime() {
    if (!elements.phoneTime) return;
    
    const now = new Date();
    elements.phoneTime.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  // Helper function to scroll messages to bottom
  function scrollToBottom() {
    if (elements.messagesContainer) {
      elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
    }
  }
  
  // Helper function to format date
  function formatDate(date) {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Check if it's today
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Check if it's yesterday
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    // If it's within the last 7 days, show the day name
    if (now - date < 7 * 24 * 60 * 60 * 1000) {
      return date.toLocaleDateString([], { weekday: 'long' });
    }
    
    // Otherwise, show full date
    return date.toLocaleDateString();
  }
  
  // Helper function to group messages by date
  function groupMessagesByDate(messages) {
    const messagesByDate = {};
    
    messages.forEach(message => {
      const messageDate = new Date(message.created_at);
      const dateKey = messageDate.toLocaleDateString();
      
      if (!messagesByDate[dateKey]) {
        messagesByDate[dateKey] = [];
      }
      
      messagesByDate[dateKey].push(message);
    });
    
    return messagesByDate;
  }
  
  // Setup event listeners
  function setupEventListeners() {
    // Character selector change
    if (elements.characterSelector) {
      elements.characterSelector.addEventListener('change', () => {
        const characterId = elements.characterSelector.value;
        
        if (characterId) {
          currentCharacterId = characterId;
          loadCharacterConversations(characterId);
        } else {
          // No character selected
          if (elements.conversationList) {
            elements.conversationList.innerHTML = '<div class="loading-indicator">Select a character to view messages</div>';
          }
        }
      });
    }
    
    // Back button in conversation view
    if (elements.backToMessages) {
      elements.backToMessages.addEventListener('click', () => {
        // Hide conversation view, show messages list
        if (elements.conversationApp) elements.conversationApp.style.display = 'none';
        if (elements.messagesApp) elements.messagesApp.style.display = 'flex';
        
        // Clear current conversation
        currentConversationId = null;
        activeConversation = null;
      });
    }
    
    // Message form submission
    if (elements.messageForm) {
      elements.messageForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        if (!currentCharacterId || !currentConversationId) return;
        
        const content = elements.messageInput ? elements.messageInput.value.trim() : '';
        if (!content) return;
        
        sendMessage(currentConversationId, currentCharacterId, content);
      });
    }
    
    // New message button - handle both the new message and URL params case
    if (elements.newMessageBtn) {
      elements.newMessageBtn.addEventListener('click', (e) => {
        e.preventDefault();
        
        if (!currentCharacterId) {
          showError('Please select a character first');
          return;
        }
        
        openNewMessageModal();
      });
    }
    
    // Conversation info button
    if (elements.conversationInfo) {
      elements.conversationInfo.addEventListener('click', (e) => {
        e.preventDefault();
        showConversationParticipants();
      });
    }
    
    // Close modal buttons
    if (elements.closeModal) {
      elements.closeModal.addEventListener('click', closeNewMessageModal);
    }
    
    if (elements.cancelNewMessage) {
      elements.cancelNewMessage.addEventListener('click', closeNewMessageModal);
    }
    
    if (elements.closeInfoModal) {
      elements.closeInfoModal.addEventListener('click', closeConversationInfoModal);
    }
    
    if (elements.closeInfoBtn) {
      elements.closeInfoBtn.addEventListener('click', closeConversationInfoModal);
    }
    
    // Character search
    if (elements.searchCharacters) {
      elements.searchCharacters.addEventListener('input', debounce(() => {
        const query = elements.searchCharacters.value.trim();
        
        if (query.length >= 2) {
          searchCharacters(query);
        } else if (elements.searchResults) {
          elements.searchResults.innerHTML = '';
        }
      }, 300));
    }
    
    // Send new message button
    if (elements.sendNewMessage) {
      elements.sendNewMessage.addEventListener('click', () => {
        if (!currentCharacterId) {
          showError('Please select a character first');
          return;
        }
        
        if (!selectedRecipientId) {
          showError('Please select a recipient');
          return;
        }
        
        const content = elements.newMessageContent ? elements.newMessageContent.value.trim() : '';
        if (!content) {
          showError('Please enter a message');
          return;
        }
        
        startNewConversation(currentCharacterId, selectedRecipientId, content);
      });
    }
    
    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
      if (elements.newMessageModal && e.target === elements.newMessageModal) {
        closeNewMessageModal();
      }
      
      if (elements.conversationInfoModal && e.target === elements.conversationInfoModal) {
        closeConversationInfoModal();
      }
    });
    
    // Phone home button - go back to messages list
    const phoneHomeButton = document.querySelector('.phone-home-button');
    if (phoneHomeButton) {
      phoneHomeButton.addEventListener('click', () => {
        // Hide conversation view, show messages list
        if (elements.conversationApp) elements.conversationApp.style.display = 'none';
        if (elements.messagesApp) elements.messagesApp.style.display = 'flex';
        
        // Clear current conversation
        currentConversationId = null;
        activeConversation = null;
      });
    }
    
    // Auto-refresh conversations every 30 seconds
    setInterval(() => {
      if (document.visibilityState === 'visible' && currentCharacterId) {
        loadCharacterConversations(currentCharacterId);
        
        if (currentConversationId) {
          openConversation(currentConversationId, currentCharacterId);
        }
      }
    }, 30000);
  }
  
  // Helper function for debouncing
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
});