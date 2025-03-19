// public/js/social/notifications.js
import * as api from './api.js';
import * as ui from './ui.js';

// DOM elements
const elements = {
  notificationsBadge: document.getElementById('notifications-badge'),
  notificationsContainer: document.getElementById('notifications-container')
};

// Initialize notifications module
export function init(state) {
  // Set up event listeners
  setupEventListeners(state);
  
  // Load notifications for the active character
  loadNotifications(state);
}

// Set up event listeners
function setupEventListeners(state) {
  // Mark notifications as read when clicked
  if (elements.notificationsContainer) {
    elements.notificationsContainer.addEventListener('click', async (e) => {
      const notificationElement = e.target.closest('.notification-item');
      
      if (notificationElement) {
        const notificationId = notificationElement.dataset.notificationId;
        
        try {
          // Mark this specific notification as read
          await markNotificationsAsRead(
            state.selectedCharacterId, 
            [parseInt(notificationId)]
          );
          
          // Remove or visually update the notification
          notificationElement.classList.add('read');
          
          // Handle any specific action based on notification type
          handleNotificationAction(notificationElement);
        } catch (error) {
          console.error('Error marking notification as read:', error);
        }
      }
    });
  }
}

// Load notifications for the active character
export async function loadNotifications(state) {
  if (!state.selectedCharacterId) {
    console.error('No character selected');
    return;
  }
  
  try {
    // Fetch notifications
    const notifications = await api.fetchNotifications(
      state.selectedCharacterId
    );
    
    // Display notifications
    displayNotifications(notifications);
    
    // Update notifications badge
    updateNotificationsBadge(notifications);
  } catch (error) {
    console.error('Error loading notifications:', error);
  }
}

// Display notifications in the notifications container
function displayNotifications(notifications) {
  if (!elements.notificationsContainer) return;
  
  // Clear existing notifications
  elements.notificationsContainer.innerHTML = '';
  
  if (notifications.length === 0) {
    elements.notificationsContainer.innerHTML = `
      <div class="no-notifications">
        No new notifications
      </div>
    `;
    return;
  }
  
  // Create notification elements
  notifications.forEach(notification => {
    const notificationElement = document.createElement('div');
    notificationElement.className = `notification-item ${notification.is_read ? 'read' : 'unread'}`;
    notificationElement.dataset.notificationId = notification.id;
    
    // Format notification text based on type
    const notificationText = formatNotificationText(notification);
    
    notificationElement.innerHTML = `
      <div class="notification-avatar">
        <img src="${notification.actor_avatar || '/api/placeholder/40/40'}" alt="${notification.actor_name}">
      </div>
      <div class="notification-content">
        <p>${notificationText}</p>
        <small class="notification-time">
          ${ui.formatTimestamp(new Date(notification.created_at))}
        </small>
      </div>
    `;
    
    elements.notificationsContainer.appendChild(notificationElement);
  });
}

// Format notification text based on action type
function formatNotificationText(notification) {
  switch (notification.action_type) {
    case 'tag':
      return `${notification.actor_name} tagged you in a post`;
    case 'like':
      return `${notification.actor_name} liked your post`;
    case 'comment':
      return `${notification.actor_name} commented on your post`;
    case 'follow':
      return `${notification.actor_name} started following you`;
    default:
      return `New notification from ${notification.actor_name}`;
  }
}

// Handle specific notification action
function handleNotificationAction(notificationElement) {
  // You can add specific handling for different notification types
  // For example, navigate to the related post or profile
}

// Update notifications badge with unread count
function updateNotificationsBadge(notifications) {
  if (!elements.notificationsBadge) return;
  
  const unreadCount = notifications.filter(n => !n.is_read).length;
  
  elements.notificationsBadge.textContent = unreadCount;
  elements.notificationsBadge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
}

// Mark notifications as read
async function markNotificationsAsRead(characterId, notificationIds) {
  try {
    await fetch('/api/social/notifications/read', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        characterId, 
        notificationIds 
      }),
      credentials: 'include'
    });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
  }
}

// Optional: Auto-refresh notifications periodically
export function setupNotificationRefresh(state) {
  setInterval(() => {
    loadNotifications(state);
  }, 60000); // Refresh every minute
}