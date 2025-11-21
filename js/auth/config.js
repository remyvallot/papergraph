/**
 * Supabase Configuration
 * 
 * Setup Instructions:
 * 1. Create a project at https://supabase.com
 * 2. Go to Project Settings > API
 * 3. Copy your Project URL and anon/public key
 * 4. Replace the placeholders below with your actual credentials
 * 5. Enable GitHub and Google OAuth providers in Authentication > Providers
 * 6. Set up redirect URLs in your OAuth app settings
 */

// ============================================================================
// 🌐 DEPLOYMENT CONFIGURATION - Change this for production
// ============================================================================

// Production URL - Change this single value to deploy to different domains
const PRODUCTION_BASE_URL = 'https://remyvallot.github.io/papergraph';
// const PRODUCTION_BASE_URL = 'https://papergraph.net';


// Automatically detect environment
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const BASE_URL = isDevelopment ? window.location.origin : PRODUCTION_BASE_URL;

// ============================================================================

// IMPORTANT: Replace these with your actual Supabase credentials
const SUPABASE_URL = "https://lqbcatqdfsgvbwenqupq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxYmNhdHFkZnNndmJ3ZW5xdXBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMzIzNzcsImV4cCI6MjA3NzYwODM3N30.Ub5dYZG_N9MScPugiYlwNlKhDl_Y6L9F4YMFsXtgvp8";

// Detect GitHub Pages base path
const isGitHubPages = window.location.hostname.includes('github.io');

// Extract base path: /beta.papergraph/ or /
function getBasePath() {
    if (isDevelopment) return '/';
    
    if (!isGitHubPages) return '/';
    
    const path = window.location.pathname;
    const match = path.match(/^\/([^\/]+)\//);
    return match ? `/${match[1]}/` : '/';
}

const basePath = getBasePath();

// Initialize Supabase client
export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Configuration constants
export const config = {
    baseUrl: BASE_URL,
    redirectUrl: BASE_URL,
    basePath: basePath,
    isDevelopment: isDevelopment,
    providers: {
        github: 'github',
        google: 'google'
    }
};

console.log('🔧 Supabase Config:', {
    baseUrl: config.baseUrl,
    redirectUrl: config.redirectUrl,
    basePath: config.basePath,
    isDevelopment: config.isDevelopment,
    isGitHubPages: isGitHubPages
});

/**
 * Check if Supabase is properly configured
 */
export function isConfigured() {
    return SUPABASE_URL !== 'YOUR_SUPABASE_URL' && 
           SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY' &&
           SUPABASE_URL.includes('supabase.co');
}

/**
 * Get configuration status message
 */
export function getConfigStatus() {
    if (!isConfigured()) {
        return {
            configured: false,
            message: 'Supabase is not configured. Please update js/auth/config.js with your credentials.'
        };
    }
    
    return {
        configured: true,
        message: 'Supabase is configured and ready.'
    };
}
