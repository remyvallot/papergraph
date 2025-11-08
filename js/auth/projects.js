/**
 * Projects Module
 * Handles CRUD operations for projects in Supabase
 */

import { supabase } from './config.js';
import { getCurrentUser } from './auth.js';

/**
 * Load all projects for the current user
 */
export async function loadProjects() {
    const user = await getCurrentUser();
    
    if (!user) {
        throw new Error('User not authenticated');
    }

    // Get projects owned by user
    const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

    if (error) {
        console.error('Load projects error:', error);
        throw error;
    }

    return data || [];
}

/**
 * Load a specific project by ID
 */
export async function loadProject(projectId) {
    const user = await getCurrentUser();
    
    if (!user) {
        throw new Error('User not authenticated');
    }

    // Get project owned by user
    const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .eq('user_id', user.id)
        .single();

    if (error) {
        console.error('Load project error:', error);
        throw error;
    }

    if (!data) {
        throw new Error('Project not found or access denied');
    }

    return data;
}

/**
 * Create a new project
 */
export async function createProject(name, initialData = null) {
    const user = await getCurrentUser();
    
    if (!user) {
        throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
        .from('projects')
        .insert([
            {
                user_id: user.id,
                name: name,
                data: initialData || { nodes: [], edges: [] }
            }
        ])
        .select()
        .single();

    if (error) {
        throw error;
    }

    return data;
}

/**
 * Update a project's data
 * Uses SECURITY DEFINER function to allow editors to update
 */
export async function updateProject(projectId, projectData) {
    const user = await getCurrentUser();
    
    if (!user) {
        throw new Error('User not authenticated');
    }

    // Use RPC function to update (handles permissions internally)
    const { data, error } = await supabase
        .rpc('update_project_if_member', {
            proj_id: projectId,
            project_data: projectData
        });

    if (error) {
        console.error('Update project error:', error);
        throw error;
    }

    if (data && !data.success) {
        throw new Error(data.error || 'Failed to update project');
    }

    // Return success indicator
    return { success: true, role: data?.role };
}

/**
 * Rename a project
 * Uses SECURITY DEFINER function to allow editors to rename
 */
export async function renameProject(projectId, newName) {
    const user = await getCurrentUser();
    
    if (!user) {
        throw new Error('User not authenticated');
    }

    // Use RPC function to rename (handles permissions internally)
    const { data, error } = await supabase
        .rpc('update_project_if_member', {
            proj_id: projectId,
            project_name: newName
        });

    if (error) {
        console.error('Rename project error:', error);
        throw error;
    }

    if (data && !data.success) {
        throw new Error(data.error || 'Failed to rename project');
    }

    return { success: true, role: data?.role };
}

/**
 * Delete a project
 */
export async function deleteProject(projectId) {
    const user = await getCurrentUser();
    
    if (!user) {
        throw new Error('User not authenticated');
    }

    const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)
        .eq('user_id', user.id);

    if (error) {
        throw error;
    }

    return true;
}

/**
 * Save current project data (auto-save)
 * Throttled to avoid excessive API calls
 */
let saveTimeout = null;
export function autoSaveProject(projectId, projectData, delay = 2000) {
    if (saveTimeout) {
        clearTimeout(saveTimeout);
    }

    saveTimeout = setTimeout(async () => {
        try {
            await updateProject(projectId, projectData);
            console.log('Project auto-saved');
        } catch (error) {
            console.error('Auto-save failed:', error);
        }
    }, delay);
}

/**
 * Get project stats
 */
export async function getProjectStats(projectId) {
    const project = await loadProject(projectId);
    
    if (!project) return null;

    const data = project.data || { nodes: [], edges: [] };
    
    return {
        nodeCount: data.nodes?.length || 0,
        edgeCount: data.edges?.length || 0,
        lastUpdated: project.updated_at || project.created_at
    };
}
