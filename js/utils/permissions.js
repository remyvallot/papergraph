/**
 * Permission checks for collaborative editing
 * Enforces read-only mode for viewers
 */

/**
 * Check if current user can edit the project
 * @returns {boolean} True if user can edit
 */
export function canEdit() {
    // If no role is set, assume full permissions (local mode)
    if (!window.currentUserRole) {
        return true;
    }
    
    // Viewers cannot edit
    if (window.currentUserRole === 'viewer') {
        return false;
    }
    
    // Owners and editors can edit
    return true;
}

/**
 * Check if current user is read-only
 * @returns {boolean} True if user is in read-only mode
 */
export function isReadOnly() {
    return window.isReadOnly === true;
}

/**
 * Show read-only notification
 */
export function showReadOnlyNotification() {
    if (typeof showNotification === 'function') {
        showNotification('You have view-only access to this project', 'warning');
    } else {
        alert('You have view-only access to this project');
    }
}

/**
 * Execute action if user has edit permission
 * @param {Function} action - Action to execute
 * @param {string} actionName - Name of the action (for logging)
 * @returns {boolean} True if action was executed
 */
export function executeIfCanEdit(action, actionName = 'action') {
    if (!canEdit()) {
        console.warn(`${actionName} blocked: user is read-only`);
        showReadOnlyNotification();
        return false;
    }
    
    action();
    return true;
}

/**
 * Get current user role
 * @returns {string|null} 'owner', 'editor', 'viewer', or null
 */
export function getUserRole() {
    return window.currentUserRole || null;
}

/**
 * Check if user is owner
 * @returns {boolean} True if user is owner
 */
export function isOwner() {
    return window.currentUserRole === 'owner';
}

/**
 * Check if user is editor or owner
 * @returns {boolean} True if user can edit
 */
export function isEditorOrOwner() {
    return window.currentUserRole === 'owner' || window.currentUserRole === 'editor';
}
