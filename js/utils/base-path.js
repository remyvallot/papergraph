/**
 * Base Path Configuration
 * 
 * Handles GitHub Pages deployment with subdirectory
 * e.g., remyvallot.github.io/beta-papergraph/
 */

// Detect if we're on GitHub Pages
const isGitHubPages = window.location.hostname.includes('github.io');

// Extract base path from current URL
// Example: /beta.papergraph/index.html -> /beta.papergraph/
function detectBasePath() {
    const path = window.location.pathname;
    
    if (!isGitHubPages) {
        return '/'; // Local or custom domain
    }
    
    // Match pattern: /repo-name/ (supports dots, hyphens, etc.)
    // Extract everything between first / and second /
    const match = path.match(/^\/([^\/]+)\//);
    if (match) {
        return `/${match[1]}/`;
    }
    
    // If no match (root path), check if we need base path from hostname
    // hostname: remyvallot.github.io -> no base path needed (user site)
    // hostname: remyvallot.github.io/beta.papergraph -> extract from path
    if (path === '/' || path === '') {
        // We might be at the root of a project site, try to detect from referrer
        return '/';
    }
    
    return '/';
}

export const BASE_PATH = detectBasePath();

/**
 * Get full URL with base path
 * @param {string} path - Relative path (e.g., 'projects.html' or 'editor.html?id=123')
 * @returns {string} Full path with base
 */
export function getUrl(path) {
    // Remove leading slash if present
    path = path.replace(/^\//, '');
    
    // Combine base path with relative path
    const fullPath = BASE_PATH + path;
    
    // Remove double slashes
    return fullPath.replace(/\/+/g, '/');
}

/**
 * Navigate to a page with correct base path
 * @param {string} path - Relative path
 */
export function navigateTo(path) {
    window.location.href = getUrl(path);
}

/**
 * Get current page name (without path or query string)
 * @returns {string} Current page name (e.g., 'index.html')
 */
export function getCurrentPage() {
    const path = window.location.pathname;
    return path.substring(path.lastIndexOf('/') + 1).split('?')[0] || 'index.html';
}

// Log configuration for debugging
console.log('🌐 Base Path Configuration:', {
    isGitHubPages,
    basePath: BASE_PATH,
    currentUrl: window.location.href,
    currentPage: getCurrentPage()
});
