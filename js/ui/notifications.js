/**
 * Notifications Module
 * 
 * Handle in-app notifications for project invitations, @ mentions, and collaborations
 */

import { supabase } from '../auth/config.js';

let notificationChannel = null;
let unreadCount = 0;
let notifications = [];

/**
 * Initialize notification system
 */
export async function initNotifications() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    // Load initial notifications
    await loadNotifications();
    
    // Subscribe to realtime notifications
    subscribeToNotifications(user.id);
    
    // Update UI
    updateNotificationBadge();
    
    console.log('✅ Notifications system initialized');
}

/**
 * Load notifications from database
 */
async function loadNotifications() {
    try {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);
        
        if (error) throw error;
        
        notifications = data || [];
        unreadCount = notifications.filter(n => !n.read).length;
        
        return notifications;
    } catch (error) {
        console.error('Error loading notifications:', error);
        return [];
    }
}

/**
 * Subscribe to realtime notifications
 */
function subscribeToNotifications(userId) {
    notificationChannel = supabase
        .channel(`notifications:${userId}`)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`
        }, (payload) => {
            console.log('🔔 New notification:', payload);
            
            // Add to array
            notifications.unshift(payload.new);
            unreadCount++;
            
            // Update UI
            updateNotificationBadge();
            showToastNotification(payload.new);
        })
        .subscribe();
}

/**
 * Update notification badge count
 */
function updateNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    if (!badge) return;
    
    if (unreadCount > 0) {
        badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

/**
 * Show toast notification for new notification
 */
function showToastNotification(notification) {
    if (typeof window.showNotification === 'function') {
        const message = getNotificationMessage(notification);
        window.showNotification(message, 'info');
    }
}

/**
 * Get human-readable message from notification
 */
function getNotificationMessage(notification) {
    switch (notification.type) {
        case 'project_invite':
            return `You've been invited to "${notification.data?.project_name || 'a project'}"`;
        case 'project_shared':
            return `${notification.data?.shared_by || 'Someone'} shared a project with you`;
        case 'mention':
            return `${notification.data?.mentioned_by || 'Someone'} mentioned you`;
        case 'member_added':
            return `You've been added to "${notification.data?.project_name || 'a project'}"`;
        default:
            return notification.message || 'New notification';
    }
}

/**
 * Mark notification as read
 */
export async function markAsRead(notificationId) {
    try {
        const { error } = await supabase
            .from('notifications')
            .update({ read: true })
            .eq('id', notificationId);
        
        if (error) throw error;
        
        // Update local state
        const notification = notifications.find(n => n.id === notificationId);
        if (notification && !notification.read) {
            notification.read = true;
            unreadCount = Math.max(0, unreadCount - 1);
            updateNotificationBadge();
        }
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead() {
    try {
        const { error } = await supabase
            .from('notifications')
            .update({ read: true })
            .eq('read', false);
        
        if (error) throw error;
        
        // Update local state
        notifications.forEach(n => n.read = true);
        unreadCount = 0;
        updateNotificationBadge();
    } catch (error) {
        console.error('Error marking all as read:', error);
    }
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId) {
    try {
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', notificationId);
        
        if (error) throw error;
        
        // Update local state
        const index = notifications.findIndex(n => n.id === notificationId);
        if (index !== -1) {
            if (!notifications[index].read) {
                unreadCount = Math.max(0, unreadCount - 1);
            }
            notifications.splice(index, 1);
            updateNotificationBadge();
        }
    } catch (error) {
        console.error('Error deleting notification:', error);
    }
}

/**
 * Open notifications panel
 */
export function openNotificationsPanel() {
    const panel = document.getElementById('notificationsPanel');
    if (!panel) {
        createNotificationsPanel();
    }
    
    renderNotifications();
    
    const overlay = document.getElementById('notificationsOverlay');
    const notifPanel = document.getElementById('notificationsPanel');
    
    if (overlay && notifPanel) {
        overlay.style.display = 'block';
        notifPanel.classList.add('active');
    }
}

/**
 * Close notifications panel
 */
export function closeNotificationsPanel() {
    const overlay = document.getElementById('notificationsOverlay');
    const panel = document.getElementById('notificationsPanel');
    
    if (overlay && panel) {
        overlay.style.display = 'none';
        panel.classList.remove('active');
    }
}

/**
 * Create notifications panel HTML
 */
function createNotificationsPanel() {
    const existing = document.getElementById('notificationsPanel');
    if (existing) return;
    
    const panel = document.createElement('div');
    panel.id = 'notificationsPanel';
    panel.className = 'notifications-panel';
    panel.innerHTML = `
        <div class="notifications-header">
            <h3>Notifications</h3>
            <div class="notifications-actions">
                <button onclick="window.notificationsModule.markAllAsRead()" class="mark-all-read-btn" title="Mark all as read">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="9 11 12 14 22 4"/>
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                    </svg>
                </button>
                <button onclick="window.notificationsModule.closeNotificationsPanel()" class="close-panel-btn">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
        </div>
        <div id="notificationsList" class="notifications-list"></div>
    `;
    
    document.body.appendChild(panel);
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'notificationsOverlay';
    overlay.className = 'notifications-overlay';
    overlay.onclick = closeNotificationsPanel;
    document.body.appendChild(overlay);
}

/**
 * Render notifications list
 */
function renderNotifications() {
    const list = document.getElementById('notificationsList');
    if (!list) return;
    
    if (notifications.length === 0) {
        list.innerHTML = `
            <div class="notifications-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                <p>No notifications yet</p>
            </div>
        `;
        return;
    }
    
    list.innerHTML = notifications.map(notif => {
        const timeAgo = getTimeAgo(notif.created_at);
        const icon = getNotificationIcon(notif.type);
        
        return `
            <div class="notification-item ${notif.read ? 'read' : 'unread'}" data-id="${notif.id}">
                <div class="notification-icon">${icon}</div>
                <div class="notification-content">
                    <div class="notification-message">${getNotificationMessage(notif)}</div>
                    <div class="notification-time">${timeAgo}</div>
                </div>
                <div class="notification-actions">
                    ${!notif.read ? `
                        <button onclick="window.notificationsModule.markAsRead('${notif.id}')" class="notification-mark-read" title="Mark as read">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="20 6 9 17 4 12"/>
                            </svg>
                        </button>
                    ` : ''}
                    <button onclick="window.notificationsModule.deleteNotification('${notif.id}')" class="notification-delete" title="Delete">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Get icon for notification type
 */
function getNotificationIcon(type) {
    switch (type) {
        case 'project_invite':
        case 'project_shared':
            return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="18" cy="5" r="3"/>
                <circle cx="6" cy="12" r="3"/>
                <circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>`;
        case 'mention':
            return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="4"/>
                <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"/>
            </svg>`;
        case 'member_added':
            return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="8.5" cy="7" r="4"/>
                <line x1="20" y1="8" x2="20" y2="14"/>
                <line x1="23" y1="11" x2="17" y2="11"/>
            </svg>`;
        default:
            return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>`;
    }
}

/**
 * Get human-readable time ago
 */
function getTimeAgo(timestamp) {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
}

/**
 * Cleanup
 */
export function stopNotifications() {
    if (notificationChannel) {
        notificationChannel.unsubscribe();
        notificationChannel = null;
    }
    
    notifications = [];
    unreadCount = 0;
}

// Expose to window for onclick handlers
if (typeof window !== 'undefined') {
    window.notificationsModule = {
        markAsRead,
        markAllAsRead,
        deleteNotification,
        openNotificationsPanel,
        closeNotificationsPanel
    };
}
