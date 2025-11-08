/**
 * Authentication Module
 * Handles Supabase authentication with OAuth and email/password
 */

import { supabase, config } from './config.js';

/**
 * Get the current session
 */
export async function getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
        console.error('Error getting session:', error);
        return null;
    }
    
    return session;
}

/**
 * Get the current user
 */
export async function getCurrentUser() {
    const session = await getSession();
    return session?.user || null;
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        throw error;
    }

    return data;
}

/**
 * Sign up with email and password
 */
export async function signUpWithEmail(email, password) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    });

    if (error) {
        throw error;
    }

    return data;
}

/**
 * Sign in with OAuth provider (GitHub or Google)
 */
export async function signInWithOAuth(provider) {
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
            redirectTo: `${config.redirectUrl}/projects.html`
        }
    });

    if (error) {
        throw error;
    }

    return data;
}

/**
 * Sign out
 */
export async function signOut() {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
        throw error;
    }
}

/**
 * Send password reset email
 */
export async function resetPassword(email) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${config.redirectUrl}/reset-password.html`
    });

    if (error) {
        throw error;
    }

    return data;
}

/**
 * Update password
 */
export async function updatePassword(newPassword) {
    const { data, error } = await supabase.auth.updateUser({
        password: newPassword
    });

    if (error) {
        throw error;
    }

    return data;
}

/**
 * Check if user is authenticated
 * Redirects to index.html if not authenticated
 */
export async function requireAuth() {
    const session = await getSession();
    
    if (!session) {
        window.location.href = 'index.html';
        return null;
    }
    
    return session.user;
}

/**
 * Check if user is authenticated
 * Redirects to projects.html if authenticated
 */
export async function redirectIfAuthenticated() {
    const session = await getSession();
    
    if (session) {
        window.location.href = 'projects.html';
        return true;
    }
    
    return false;
}

/**
 * Listen to authentication state changes
 */
export function onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange((event, session) => {
        callback(event, session);
    });
}

/**
 * Get user profile information
 */
export async function getUserProfile() {
    const user = await getCurrentUser();
    
    if (!user) return null;
    
    return {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.user_metadata?.name || user.email,
        avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
        provider: user.app_metadata?.provider || 'email',
    };
}
