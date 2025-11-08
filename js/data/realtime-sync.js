/**
 * Realtime Synchronization Module
 * 
 * Handles real-time updates between collaborators using Supabase Realtime
 */

import { supabase } from '../auth/config.js';
import { generateColorFromString } from '../utils/helpers.js';

let realtimeChannel = null;
let projectId = null;
let isEnabled = false;
let lastUpdateTimestamp = Date.now();

// Store active collaborators
let activeCollaborators = new Map(); // userId -> { username, email, isOnline, lastSeen }

/**
 * Update collaborator avatars display
 */
function updateCollaboratorAvatars() {
    const container = document.getElementById('collaboratorAvatars');
    if (!container) return;
    
    // Clear existing avatars
    container.innerHTML = '';
    
    // Filter online collaborators (excluding current user)
    const currentUserId = supabase.auth.getUser()?.then(u => u.data?.user?.id);
    const onlineCollaborators = Array.from(activeCollaborators.values())
        .filter(collab => collab.isOnline && collab.userId !== currentUserId);
    
    if (onlineCollaborators.length === 0) {
        return; // Hide container if no collaborators
    }
    
    // Show first 4 collaborators
    const maxDisplay = 4;
    const displayCount = Math.min(onlineCollaborators.length, maxDisplay);
    
    for (let i = 0; i < displayCount; i++) {
        const collab = onlineCollaborators[i];
        const avatar = createCollaboratorAvatar(collab);
        container.appendChild(avatar);
    }
    
    // Add "+N" badge if more than 4
    if (onlineCollaborators.length > maxDisplay) {
        const moreCount = onlineCollaborators.length - maxDisplay;
        const moreBadge = document.createElement('div');
        moreBadge.className = 'collaborator-more-badge';
        moreBadge.textContent = `+${moreCount}`;
        moreBadge.title = `${moreCount} more collaborator${moreCount > 1 ? 's' : ''}`;
        container.appendChild(moreBadge);
    }
}

/**
 * Create avatar element for a collaborator
 */
function createCollaboratorAvatar(collab) {
    const avatar = document.createElement('div');
    avatar.className = 'collaborator-avatar';
    avatar.dataset.userId = collab.userId;
    
    if (!collab.isOnline) {
        avatar.classList.add('inactive');
    }
    
    // Generate initials
    const initials = getInitials(collab.username || collab.email);
    
    // Generate color from user ID
    const bgColor = generateColorFromString(collab.userId);
    avatar.style.backgroundColor = bgColor;
    
    // If avatar_url exists, use image
    if (collab.avatar_url) {
        const img = document.createElement('img');
        img.src = collab.avatar_url;
        img.alt = collab.username || collab.email;
        avatar.appendChild(img);
    } else {
        // Use initials
        avatar.textContent = initials;
    }
    
    // Add tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'collaborator-avatar-tooltip';
    tooltip.textContent = collab.username || collab.email;
    avatar.appendChild(tooltip);
    
    return avatar;
}

/**
 * Get initials from username or email
 */
function getInitials(text) {
    if (!text) return '?';
    
    // If email, use first letter
    if (text.includes('@')) {
        return text.charAt(0).toUpperCase();
    }
    
    // If username, get first two letters or first letter of each word
    const words = text.trim().split(/\s+/);
    if (words.length > 1) {
        return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
    }
    
    return text.substring(0, 2).toUpperCase();
}

/**
 * Fetch collaborator profile from Supabase
 */
async function fetchCollaboratorProfile(userId) {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, email, username, full_name, avatar_url')
            .eq('id', userId)
            .single();
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching collaborator profile:', error);
        return null;
    }
}

/**
 * Add or update a collaborator
 */
async function addCollaborator(userId, isOnline = true) {
    if (!userId) return;
    
    // Check if already exists
    if (activeCollaborators.has(userId)) {
        const existing = activeCollaborators.get(userId);
        existing.isOnline = isOnline;
        existing.lastSeen = Date.now();
        activeCollaborators.set(userId, existing);
    } else {
        // Fetch profile
        const profile = await fetchCollaboratorProfile(userId);
        if (profile) {
            activeCollaborators.set(userId, {
                userId: userId,
                email: profile.email,
                username: profile.username || profile.full_name,
                avatar_url: profile.avatar_url,
                isOnline: isOnline,
                lastSeen: Date.now()
            });
        }
    }
    
    updateCollaboratorAvatars();
}

/**
 * Remove a collaborator
 */
function removeCollaborator(userId) {
    if (activeCollaborators.has(userId)) {
        const collab = activeCollaborators.get(userId);
        collab.isOnline = false;
        activeCollaborators.set(userId, collab);
        updateCollaboratorAvatars();
    }
}

/**
 * Initialize realtime sync for a project
 * @param {string} projId - Project UUID
 * @param {Function} onUpdate - Callback when project is updated
 */
export async function initRealtimeSync(projId, onUpdate) {
    if (!projId) {
        console.warn('Cannot init realtime: no project ID');
        return;
    }
    
    projectId = projId;
    isEnabled = true;
    
    // Cleanup existing channel
    if (realtimeChannel) {
        realtimeChannel.unsubscribe();
    }
    
    console.log('🔄 Initializing realtime sync for project:', projectId);
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        console.warn('No authenticated user for realtime sync');
        return;
    }
    
    // Subscribe to project changes AND presence
    realtimeChannel = supabase
        .channel(`project-changes:${projectId}`)
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'projects',
            filter: `id=eq.${projectId}`
        }, (payload) => {
            console.log('📡 Received update from Supabase:', payload);
            
            // Ignore updates that we just made (within 2 seconds)
            const now = Date.now();
            if (now - lastUpdateTimestamp < 2000) {
                console.log('⏭️ Skipping own update');
                return;
            }
            
            // Call update callback
            if (onUpdate && payload.new && payload.new.data) {
                onUpdate(payload.new.data, payload.new.updated_at);
            }
        })
        .on('presence', { event: 'sync' }, () => {
            const state = realtimeChannel.presenceState();
            console.log('👥 Presence sync:', state);
            
            // Update collaborator list
            const presenceIds = Object.keys(state);
            presenceIds.forEach(userId => {
                if (userId !== user.id) {
                    addCollaborator(userId, true);
                }
            });
            
            // Mark offline users who left
            activeCollaborators.forEach((collab, userId) => {
                if (!presenceIds.includes(userId) && userId !== user.id) {
                    removeCollaborator(userId);
                }
            });
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
            console.log('👋 User joined:', key);
            if (key !== user.id) {
                addCollaborator(key, true);
            }
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
            console.log('👋 User left:', key);
            if (key !== user.id) {
                removeCollaborator(key);
            }
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                console.log('✅ Realtime sync enabled');
                
                // Track our presence
                await realtimeChannel.track({
                    user_id: user.id,
                    online_at: new Date().toISOString()
                });
            } else if (status === 'CHANNEL_ERROR') {
                console.error('❌ Realtime sync error');
            }
        });
}

/**
 * Mark that we just updated the project (to avoid processing our own updates)
 */
export function markLocalUpdate() {
    lastUpdateTimestamp = Date.now();
}

/**
 * Disable realtime sync
 */
export function disableRealtimeSync() {
    if (realtimeChannel) {
        realtimeChannel.unsubscribe();
        realtimeChannel = null;
    }
    
    isEnabled = false;
    activeCollaborators.clear();
    
    // Clear avatars
    const container = document.getElementById('collaboratorAvatars');
    if (container) {
        container.innerHTML = '';
    }
    
    console.log('🔌 Realtime sync disabled');
}

/**
 * Handle incoming project data update
 * @param {Object} newData - New project data from Supabase
 * @param {string} updatedAt - Timestamp of update
 */
export function handleProjectUpdate(newData, updatedAt) {
    console.log('🔄 Applying remote project update...');
    
    // Update appData
    if (typeof window.appData !== 'undefined') {
        // Nodes
        if (newData.nodes && Array.isArray(newData.nodes)) {
            window.appData.articles = newData.nodes;
            if (window.appData.articles.length > 0) {
                const maxId = Math.max(...window.appData.articles.map(a => parseInt(a.id) || 0));
                window.appData.nextArticleId = maxId + 1;
            }
        }
        
        // Edges
        if (newData.edges && Array.isArray(newData.edges)) {
            window.appData.connections = newData.edges;
            if (window.appData.connections.length > 0) {
                const maxId = Math.max(...window.appData.connections.map(c => parseInt(c.id) || 0));
                window.appData.nextConnectionId = maxId + 1;
            }
        }
    }
    
    // Update positions
    if (newData.positions && typeof window.savedNodePositions !== 'undefined') {
        window.savedNodePositions = newData.positions;
    }
    
    // Update zones
    if (newData.zones && Array.isArray(newData.zones) && typeof window.tagZones !== 'undefined') {
        window.tagZones.length = 0;
        window.tagZones.push(...newData.zones);
    }
    
    // Update edge control points
    if (newData.edgeControlPoints && typeof window.edgeControlPoints !== 'undefined') {
        window.edgeControlPoints = newData.edgeControlPoints;
    }
    
    // Refresh the graph visualization
    refreshGraph();
    
    // Show notification
    showUpdateNotification(updatedAt);
    
    console.log('✅ Remote update applied');
}

/**
 * Refresh the graph with current data
 */
function refreshGraph() {
    if (!window.network || typeof window.appData === 'undefined') {
        console.warn('Cannot refresh graph: network or appData not available');
        return;
    }
    
    try {
        // Get current view state
        const currentView = window.network.getViewPosition();
        const currentScale = window.network.getScale();
        
        // Update graph data
        const nodes = window.appData.articles.map(article => ({
            id: article.id,
            label: article.title || 'Untitled',
            title: article.authors || '',
            color: article.color || '#3b82f6',
            font: {
                color: getContrastColor(article.color || '#3b82f6')
            }
        }));
        
        const edges = window.appData.connections.map(conn => ({
            id: conn.id,
            from: conn.from,
            to: conn.to,
            label: conn.label || '',
            smooth: conn.smooth || { type: 'curvedCW', roundness: 0.2 }
        }));
        
        window.network.setData({
            nodes: new vis.DataSet(nodes),
            edges: new vis.DataSet(edges)
        });
        
        // Restore node positions
        if (window.savedNodePositions) {
            Object.entries(window.savedNodePositions).forEach(([nodeId, pos]) => {
                try {
                    window.network.moveNode(nodeId, pos.x, pos.y);
                } catch (e) {
                    // Node might not exist anymore
                }
            });
        }
        
        // Restore view
        window.network.moveTo({
            position: currentView,
            scale: currentScale,
            animation: false
        });
        
        // Redraw zones
        if (typeof window.drawTagZones === 'function') {
            window.drawTagZones();
        }
        
        console.log('🔄 Graph refreshed with remote data');
    } catch (error) {
        console.error('Error refreshing graph:', error);
    }
}

/**
 * Get contrasting text color for a background color
 */
function getContrastColor(hexColor) {
    // Remove # if present
    const hex = hexColor.replace('#', '');
    
    // Convert to RGB
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    return luminance > 0.5 ? '#000000' : '#ffffff';
}

/**
 * Show notification about update
 */
function showUpdateNotification(timestamp) {
    if (typeof window.showNotification === 'function') {
        const timeStr = new Date(timestamp).toLocaleTimeString();
        window.showNotification(`Project updated by collaborator (${timeStr})`, 'info');
    }
}

/**
 * Check if realtime is enabled
 */
export function isRealtimeEnabled() {
    return isEnabled;
}
