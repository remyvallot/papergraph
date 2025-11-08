/**
 * GitHub Gallery Submission Module v4.0
 * Uses Supabase Edge Function with bot token for PR creation
 */

import { loadProject } from '../auth/projects.js';

/**
 * Submit a project to the gallery by calling Supabase Edge Function
 * The Edge Function uses a GitHub bot token to create the PR
 */
export async function submitToGallery({ projectId, title, description, author, affiliation, thumbnail }) {
    console.log('🚀 Starting gallery submission via Supabase Edge Function...');
    
    // Get session
    const { supabase } = await import('../auth/config.js');
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
        throw new Error('Not authenticated. Please sign in to submit to the gallery.');
    }
    
    console.log('👤 User authenticated:', session.user.email);
    
    // Load project data
    console.log('📦 Loading project:', projectId);
    const project = await loadProject(projectId);
    
    if (!project || !project.data) {
        throw new Error('Project not found');
    }
    
    console.log('✅ Project loaded:', project.name);
    
    // Convert thumbnail to base64 if provided
    let thumbnailBase64 = null;
    if (thumbnail) {
        console.log('🖼️ Converting thumbnail to base64...');
        thumbnailBase64 = await fileToBase64(thumbnail);
    }
    
    // Prepare submission data
    const submissionData = {
        projectId,
        projectData: project.data,
        title,
        description,
        author,
        affiliation,
        thumbnailBase64
    };
    
    console.log('📤 Sending submission to Supabase Edge Function...');
    
    try {
        // Call Supabase Edge Function
        const { data, error } = await supabase.functions.invoke('submit-to-gallery', {
            body: submissionData
        });
        
        if (error) {
            console.error('❌ Supabase function error:', error);
            throw new Error(`Submission failed: ${error.message || 'Unknown error'}`);
        }
        
        if (!data || !data.success) {
            console.error('❌ Submission failed:', data?.error);
            throw new Error(`Submission failed: ${data?.error || 'Unknown error'}`);
        }
        
        console.log('✅ Pull request created:', data.prUrl);
        console.log('📋 PR Number:', data.prNumber);
        console.log('📁 Folder:', data.folderName);
        
        return {
            success: true,
            prUrl: data.prUrl,
            prNumber: data.prNumber,
            folderName: data.folderName
        };
        
    } catch (error) {
        console.error('❌ Submission error:', error);
        throw error;
    }
}

/**
 * Convert file to base64
 */
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            // Remove data URL prefix (e.g., "data:image/png;base64,")
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Open submit to gallery modal and populate with user data
 */
export async function openSubmitToGalleryModal() {
    const { supabase } = await import('../auth/config.js');
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
        console.log('⚠️ User not logged in');
        alert('Please sign in to submit to the gallery.');
        return;
    }
    
    const modal = document.getElementById('submitGalleryModal');
    if (!modal) {
        console.error('Submit gallery modal not found');
        return;
    }
    
    modal.style.display = 'block';
    
    // Get current project ID from URL (if in editor)
    const urlParams = new URLSearchParams(window.location.search);
    const currentProjectId = urlParams.get('id');
    
    // Load user's projects
    try {
        const { loadProjects } = await import('../auth/projects.js');
        const projects = await loadProjects();
        
        const select = document.getElementById('submitProjectSelect');
        if (select) {
            select.innerHTML = '<option value="">Choose a project...</option>';
            
            projects.forEach(project => {
                const option = document.createElement('option');
                option.value = project.id;
                option.textContent = project.name;
                // Pre-select current project if we're in the editor
                if (currentProjectId && project.id === currentProjectId) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
        }
        
        // Pre-fill author info
        const fullName = session.user.user_metadata?.full_name || 
                        session.user.user_metadata?.name || 
                        session.user.email || '';
        const authorField = document.getElementById('submitAuthor');
        if (authorField) {
            authorField.value = fullName;
        }
    } catch (error) {
        console.error('Error loading projects:', error);
        alert('Failed to load your projects. Please try again.');
        if (typeof window.closeSubmitGalleryModal === 'function') {
            window.closeSubmitGalleryModal();
        }
    }
}

// Module info
console.log('✅ github-submit.js v4.0.0 loaded - Supabase Edge Function workflow');
