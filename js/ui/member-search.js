/**
 * Member Search & Invite System
 * 
 * Autocomplete search for @ mentions and email invites
 */

import { supabase } from '../auth/config.js';

let searchContainer = null;
let searchInput = null;
let resultsDropdown = null;
let selectedIndex = -1;
let currentProjectId = null;
let onMemberSelected = null;

/**
 * Initialize member search in a given input element
 * @param {string} inputId - ID of the input element
 * @param {string} projectId - Project UUID
 * @param {Function} callback - Callback when member is selected
 */
export function initMemberSearch(inputId, projectId, callback) {
    searchInput = document.getElementById(inputId);
    currentProjectId = projectId;
    onMemberSelected = callback;
    
    if (!searchInput) {
        console.error('Member search input not found:', inputId);
        return;
    }
    
    // Create results dropdown
    resultsDropdown = document.createElement('div');
    resultsDropdown.className = 'member-search-dropdown';
    resultsDropdown.style.display = 'none';
    searchInput.parentElement.appendChild(resultsDropdown);
    
    // Listen for @ character and search
    searchInput.addEventListener('input', handleInput);
    searchInput.addEventListener('keydown', handleKeydown);
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !resultsDropdown.contains(e.target)) {
            hideDropdown();
        }
    });
    
    console.log('✅ Member search initialized');
}

/**
 * Handle input changes
 */
function handleInput(e) {
    const value = e.target.value;
    
    // Check if @ is typed
    if (value.includes('@')) {
        const atIndex = value.lastIndexOf('@');
        const searchQuery = value.substring(atIndex + 1);
        
        if (searchQuery.length >= 0) {
            searchMembers(searchQuery);
        }
    } else {
        hideDropdown();
    }
}

/**
 * Handle keyboard navigation
 */
function handleKeydown(e) {
    if (resultsDropdown.style.display === 'none') return;
    
    const items = resultsDropdown.querySelectorAll('.member-search-item');
    
    switch (e.key) {
        case 'ArrowDown':
            e.preventDefault();
            selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
            updateSelection(items);
            break;
            
        case 'ArrowUp':
            e.preventDefault();
            selectedIndex = Math.max(selectedIndex - 1, -1);
            updateSelection(items);
            break;
            
        case 'Enter':
            e.preventDefault();
            if (selectedIndex >= 0 && items[selectedIndex]) {
                items[selectedIndex].click();
            }
            break;
            
        case 'Escape':
            e.preventDefault();
            hideDropdown();
            break;
    }
}

/**
 * Update visual selection in dropdown
 */
function updateSelection(items) {
    items.forEach((item, index) => {
        if (index === selectedIndex) {
            item.classList.add('selected');
            item.scrollIntoView({ block: 'nearest' });
        } else {
            item.classList.remove('selected');
        }
    });
}

/**
 * Search for members in Supabase profiles table
 */
async function searchMembers(query) {
    if (!query) {
        showAllUsers();
        return;
    }
    
    try {
        // Search by username or email
        const { data, error } = await supabase
            .from('profiles')
            .select('id, email, username, full_name, avatar_url')
            .or(`username.ilike.%${query}%,email.ilike.%${query}%,full_name.ilike.%${query}%`)
            .limit(10);
        
        if (error) throw error;
        
        displayResults(data, query);
    } catch (error) {
        console.error('Error searching members:', error);
        showErrorMessage('Failed to search members');
    }
}

/**
 * Show all available users (when @ is typed without query)
 */
async function showAllUsers() {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, email, username, full_name, avatar_url')
            .limit(10);
        
        if (error) throw error;
        
        displayResults(data, '');
    } catch (error) {
        console.error('Error fetching users:', error);
    }
}

/**
 * Display search results in dropdown
 */
function displayResults(users, query) {
    resultsDropdown.innerHTML = '';
    selectedIndex = -1;
    
    if (!users || users.length === 0) {
        // Show "Invite by email" option
        if (isValidEmail(query)) {
            const inviteItem = createInviteEmailItem(query);
            resultsDropdown.appendChild(inviteItem);
        } else {
            const noResults = document.createElement('div');
            noResults.className = 'member-search-no-results';
            noResults.textContent = 'No members found';
            resultsDropdown.appendChild(noResults);
        }
    } else {
        users.forEach(user => {
            const item = createMemberItem(user);
            resultsDropdown.appendChild(item);
        });
        
        // Add "Invite by email" option if query looks like email
        if (isValidEmail(query) && !users.some(u => u.email === query)) {
            const divider = document.createElement('div');
            divider.className = 'member-search-divider';
            resultsDropdown.appendChild(divider);
            
            const inviteItem = createInviteEmailItem(query);
            resultsDropdown.appendChild(inviteItem);
        }
    }
    
    showDropdown();
}

/**
 * Create member item element
 */
function createMemberItem(user) {
    const item = document.createElement('div');
    item.className = 'member-search-item';
    
    // Avatar
    const avatar = document.createElement('div');
    avatar.className = 'member-search-avatar';
    
    if (user.avatar_url) {
        const img = document.createElement('img');
        img.src = user.avatar_url;
        img.alt = user.username || user.email;
        avatar.appendChild(img);
    } else {
        const initials = getInitials(user.username || user.full_name || user.email);
        avatar.textContent = initials;
        avatar.style.backgroundColor = generateColorFromString(user.id);
    }
    
    // Info
    const info = document.createElement('div');
    info.className = 'member-search-info';
    
    const name = document.createElement('div');
    name.className = 'member-search-name';
    name.textContent = user.username || user.full_name || user.email;
    
    const email = document.createElement('div');
    email.className = 'member-search-email';
    email.textContent = user.email;
    
    info.appendChild(name);
    if (user.username || user.full_name) {
        info.appendChild(email);
    }
    
    item.appendChild(avatar);
    item.appendChild(info);
    
    // Click handler
    item.addEventListener('click', () => {
        selectMember(user);
    });
    
    return item;
}

/**
 * Create "Invite by email" item
 */
function createInviteEmailItem(email) {
    const item = document.createElement('div');
    item.className = 'member-search-item member-search-invite';
    
    const icon = document.createElement('div');
    icon.className = 'member-search-icon';
    icon.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
        </svg>
    `;
    
    const info = document.createElement('div');
    info.className = 'member-search-info';
    
    const text = document.createElement('div');
    text.className = 'member-search-name';
    text.textContent = `Invite ${email}`;
    
    const hint = document.createElement('div');
    hint.className = 'member-search-email';
    hint.textContent = 'Send email invitation';
    
    info.appendChild(text);
    info.appendChild(hint);
    
    item.appendChild(icon);
    item.appendChild(info);
    
    // Click handler
    item.addEventListener('click', () => {
        inviteByEmail(email);
    });
    
    return item;
}

/**
 * Handle member selection
 */
function selectMember(user) {
    if (onMemberSelected) {
        onMemberSelected(user);
    }
    
    // Clear input and hide dropdown
    const atIndex = searchInput.value.lastIndexOf('@');
    searchInput.value = searchInput.value.substring(0, atIndex);
    hideDropdown();
}

/**
 * Invite member by email
 */
async function inviteByEmail(email) {
    try {
        // Add to pending_invites table
        const { data, error } = await supabase
            .from('pending_invites')
            .insert({
                project_id: currentProjectId,
                email: email,
                role: 'editor',
                invited_by: (await supabase.auth.getUser()).data.user.id
            })
            .select()
            .single();
        
        if (error) throw error;
        
        // TODO: Call Edge Function to send email
        console.log('📧 Email invitation sent to:', email);
        
        if (typeof window.showNotification === 'function') {
            window.showNotification(`Invitation sent to ${email}`, 'success');
        }
        
        // Clear input and hide dropdown
        const atIndex = searchInput.value.lastIndexOf('@');
        searchInput.value = searchInput.value.substring(0, atIndex);
        hideDropdown();
    } catch (error) {
        console.error('Error inviting by email:', error);
        if (typeof window.showNotification === 'function') {
            window.showNotification('Failed to send invitation', 'error');
        }
    }
}

/**
 * Show dropdown
 */
function showDropdown() {
    resultsDropdown.style.display = 'block';
    
    // Position dropdown below input
    const rect = searchInput.getBoundingClientRect();
    resultsDropdown.style.top = `${rect.bottom + 4}px`;
    resultsDropdown.style.left = `${rect.left}px`;
    resultsDropdown.style.width = `${rect.width}px`;
}

/**
 * Hide dropdown
 */
function hideDropdown() {
    resultsDropdown.style.display = 'none';
    selectedIndex = -1;
}

/**
 * Show error message
 */
function showErrorMessage(message) {
    resultsDropdown.innerHTML = `
        <div class="member-search-error">${message}</div>
    `;
    showDropdown();
}

/**
 * Check if string is valid email
 */
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Get initials from name
 */
function getInitials(text) {
    if (!text) return '?';
    
    if (text.includes('@')) {
        return text.charAt(0).toUpperCase();
    }
    
    const words = text.trim().split(/\s+/);
    if (words.length > 1) {
        return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
    }
    
    return text.substring(0, 2).toUpperCase();
}

/**
 * Generate color from string (simple hash)
 */
function generateColorFromString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const hue = hash % 360;
    return `hsl(${hue}, 65%, 55%)`;
}

/**
 * Cleanup
 */
export function destroyMemberSearch() {
    if (searchInput) {
        searchInput.removeEventListener('input', handleInput);
        searchInput.removeEventListener('keydown', handleKeydown);
    }
    
    if (resultsDropdown && resultsDropdown.parentElement) {
        resultsDropdown.parentElement.removeChild(resultsDropdown);
    }
    
    searchInput = null;
    resultsDropdown = null;
    currentProjectId = null;
    onMemberSelected = null;
}
