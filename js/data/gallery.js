/**
 * Gallery Module
 * Handles loading and displaying projects from the gallery
 */

/**
 * Load and display gallery projects
 */
export async function loadGalleryProjects() {
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const galleryGrid = document.getElementById('galleryGrid');
    
    try {
        console.log('📥 Loading gallery projects...');
        
        // Scan projects folder for all subdirectories
        const projects = await scanProjectsFolder();
        
        console.log(`✅ Loaded ${projects.length} projects`);
        
        // Hide loading state
        if (loadingState) loadingState.style.display = 'none';
        
        if (!projects || projects.length === 0) {
            if (emptyState) emptyState.style.display = 'block';
            if (galleryGrid) galleryGrid.style.display = 'none';
            return;
        }
        
        // Show grid, hide empty state
        if (emptyState) emptyState.style.display = 'none';
        if (galleryGrid) {
            galleryGrid.style.display = 'grid';
            galleryGrid.innerHTML = '';
            
            // Display projects
            projects.forEach(project => {
                const card = createProjectCard(project);
                galleryGrid.appendChild(card);
            });
        }
        
    } catch (error) {
        console.error('❌ Error loading gallery:', error);
        
        // Show error state
        if (loadingState) loadingState.style.display = 'none';
        if (emptyState) {
            emptyState.style.display = 'block';
            const heading = emptyState.querySelector('h2');
            const text = emptyState.querySelector('p');
            if (heading) heading.textContent = 'Failed to load gallery';
            if (text) text.textContent = 'Please try again later.';
        }
        if (galleryGrid) galleryGrid.style.display = 'none';
    }
}

/**
 * Scan the projects folder for all project directories
 * Each project folder should contain a metadata.json file
 */
async function scanProjectsFolder() {
    const projects = [];
    
    // Try multiple methods to discover projects
    
    // Method 1: Try GitHub API first (works from anywhere)
    try {
        const githubResponse = await fetch(
            'https://api.github.com/repos/remyvallot/papergraph/contents/projects',
            {
                headers: {
                    'Accept': 'application/vnd.github.v3+json'
                }
            }
        );
        
        if (githubResponse.ok) {
            const contents = await githubResponse.json();
            const folders = contents.filter(item => 
                item.type === 'dir' && 
                !item.name.startsWith('.') && 
                item.name !== 'README.md'
            );
            
            console.log(`Found ${folders.length} projects via GitHub API`);
            
            // Load metadata for each folder in parallel
            const metadataPromises = folders.map(async (folder) => {
                try {
                    const metadataResponse = await fetch(`projects/${folder.name}/metadata.json`);
                    if (metadataResponse.ok) {
                        return await metadataResponse.json();
                    }
                } catch (err) {
                    console.warn(`Failed to load metadata for ${folder.name}:`, err);
                }
                return null;
            });
            
            const results = await Promise.all(metadataPromises);
            projects.push(...results.filter(p => p !== null));
            
            if (projects.length > 0) {
                console.log(`Successfully loaded ${projects.length} projects`);
                // Sort and return
                projects.sort((a, b) => {
                    const dateA = new Date(a.submittedAt || 0);
                    const dateB = new Date(b.submittedAt || 0);
                    return dateB - dateA;
                });
                return projects;
            }
        }
    } catch (error) {
        console.warn('GitHub API failed:', error);
    }
    
    // // Method 2: Try known project folders (for localhost/development)
    // console.log('Trying to load known projects...');
    // const knownFolders = ['remyvallot_2025-11-08'];
    
    // for (const folderName of knownFolders) {
    //     try {
    //         const metadataResponse = await fetch(`projects/${folderName}/metadata.json`);
    //         if (metadataResponse.ok) {
    //             const metadata = await metadataResponse.json();
    //             projects.push(metadata);
    //             console.log(`Loaded project: ${metadata.title}`);
    //         }
    //     } catch (err) {
    //         console.warn(`Failed to load ${folderName}:`, err);
    //     }
    // }
    
    // Sort by submission date (newest first)
    projects.sort((a, b) => {
        const dateA = new Date(a.submittedAt || 0);
        const dateB = new Date(b.submittedAt || 0);
        return dateB - dateA;
    });
    
    return projects;
}

/**
 * Create a project card element
 */
function createProjectCard(project) {
    const card = document.createElement('div');
    card.className = 'pg-project-card';
    card.style.cursor = 'pointer';
    
    // Helper to escape HTML
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Always try to load preview.png, fallback to placeholder if it fails
    const thumbnailHTML = `<img src="projects/${project.path}/preview.png" alt="${escapeHtml(project.title)}" onerror="this.parentElement.innerHTML='<div class=\\'pg-project-placeholder\\'>${project.title.charAt(0).toUpperCase()}</div>'">`;
    
    card.innerHTML = `
        ${thumbnailHTML}
        <div class="pg-project-info">
            <h3>${escapeHtml(project.title)}</h3>
            <p style="color: #666; font-size: 0.9rem; margin: 8px 0; line-height: 1.4;">${escapeHtml(project.description)}</p>
            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #f0f0f0;">
                <div style="font-size: 0.85rem; color: #999; margin-bottom: 4px;">
                    <strong style="color: #666;">${escapeHtml(project.author)}</strong>
                </div>
                <div style="font-size: 0.8rem; color: #999;">
                    ${escapeHtml(project.affiliation)}
                </div>
            </div>
        </div>
    `;
    
    // Click to open project
    card.addEventListener('click', () => openGalleryProject(project));
    
    return card;
}

/**
 * Open a gallery project in read-only mode
 */
export async function openGalleryProject(project) {
    try {
        // Load project data
        const response = await fetch(`projects/${project.path}/project.papergraph`);
        
        if (!response.ok) {
            throw new Error('Failed to load project');
        }
        
        const projectData = await response.json();
        
        // Store project data in sessionStorage for the viewer
        sessionStorage.setItem('galleryProject', JSON.stringify({
            data: projectData,
            metadata: {
                id: `gallery_${project.path}`, // Generate unique ID from path
                title: project.title,
                description: project.description,
                author: project.author,
                affiliation: project.affiliation,
                path: project.path
            }
        }));
        
        // Navigate to viewer (read-only mode)
        window.location.href = 'viewer.html';
        
    } catch (error) {
        console.error('Error opening project:', error);
        alert('Failed to open project. Please try again.');
    }
}

/**
 * Copy a gallery project to user's workspace
 */
export async function copyProjectToWorkspace(projectData, metadata) {
    try {
        // Import required modules
        const { supabase } = await import('../auth/config.js');
        const { getCurrentUser } = await import('../auth/auth.js');
        const { createProject } = await import('../auth/projects.js');
        
        // Check if user is logged in
        const user = await getCurrentUser();
        
        if (!user) {
            // Redirect to sign in
            if (confirm('You need to sign in to copy this project to your workspace.\n\nSign in now?')) {
                window.location.href = 'index.html#auth';
            }
            return;
        }
        
        // Create a copy of the project
        const projectName = `${metadata.title} (from gallery)`;
        const newProject = await createProject(projectName, projectData);
        
        // Show success message
        alert(`✅ Project copied to your workspace!\n\nOpening in editor...`);
        
        // Navigate to the new project
        window.location.href = `editor.html?id=${newProject.id}`;
        
    } catch (error) {
        console.error('Error copying project:', error);
        alert('Failed to copy project to workspace: ' + error.message);
    }
}

/**
 * Check if user has GitHub authentication
 */
export async function checkGitHubAuth() {
    try {
        const { supabase } = await import('../auth/config.js');
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session || !session.user) {
            return false;
        }
        
        // Check if user has GitHub provider
        const provider = session.user.app_metadata?.provider;
        return provider === 'github';
        
    } catch (error) {
        console.error('Error checking GitHub auth:', error);
        return false;
    }
}

/**
 * Prompt user to connect with GitHub
 */
export async function promptGitHubLogin() {
    if (confirm('GitHub authentication is required to submit projects.\n\nSign in with GitHub now?')) {
        const { supabase } = await import('../auth/config.js');
        
        await supabase.auth.signInWithOAuth({
            provider: 'github',
            options: {
                redirectTo: `${window.location.origin}/gallery.html`,
                scopes: 'repo' // Need repo scope to create pull requests
            }
        });
    }
}
