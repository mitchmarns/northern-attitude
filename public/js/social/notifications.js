// public/js/social/notifications.js
import * as api from './api.js';
import * as ui from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
  const badge = document.getElementById('notifications-badge');
  console.log('Notifications badge element:', badge);
  if (!badge) {
    console.error('Notifications badge element not found in the DOM');
  }
});

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
    console.log(`Fetching notifications for character ${state.selectedCharacterId}`);
    const notifications = await api.fetchNotifications(state.selectedCharacterId);
    console.log('Received notifications:', notifications);
    
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
  if (!elements.notificationsContainer) {
    console.log('Creating notifications container dynamically');
    // Find parent element where notifications should go
    const navItem = document.querySelector('.social-nav li:nth-child(3)'); // Adjust selector as needed
    
    if (navItem) {
      const container = document.createElement('div');
      container.id = 'notifications-container';
      container.className = 'notifications-container';
      navItem.appendChild(container);
      elements.notificationsContainer = container;
    } else {
      console.error('Cannot find parent element to attach notifications container');
      return;
    }
  }
  
  console.log('Displaying', notifications.length, 'notifications in container');
  
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
    // Log each notification as we process it
    console.log('Processing notification:', notification);
    
    const notificationElement = document.createElement('div');
    notificationElement.className = `notification-item ${notification.is_read ? 'read' : 'unread'}`;
    notificationElement.dataset.notificationId = notification.id;
    
    // Format notification text based on type
    const notificationText = formatNotificationText(notification);
    
    notificationElement.innerHTML = `
      <div class="notification-avatar">
        <img src="${notification.actor_avatar || '/api/placeholder/40/40'}" 
             alt="${notification.actor_name}"
             style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;" />
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
  if (!elements.notificationsBadge) {
    console.error('Notification badge element not found');
    return;
  }
  
  const unreadCount = notifications.filter(n => !n.is_read).length;
  console.log(`Updating badge with ${unreadCount} unread notifications`);
  
  elements.notificationsBadge.textContent = unreadCount;
  elements.notificationsBadge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
  
  // Force visibility check
  if (unreadCount > 0) {
    console.log('Badge should be visible now');
    elements.notificationsBadge.style.backgroundColor = 'var(--accent)';
    elements.notificationsBadge.style.color = 'white';
    elements.notificationsBadge.style.padding = '2px 6px';
    elements.notificationsBadge.style.borderRadius = '10px';
    elements.notificationsBadge.style.fontSize = '0.75rem';
    elements.notificationsBadge.style.display = 'inline-block';
  }
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
  }, 30000); // Refresh every 30 secs
}