// ===== SETTINGS & PROJECT TITLE =====
// Manage settings modal and project title

// Project title management
let projectTitle = 'Mon Projet';

function initializeProjectTitle() {
    const titleInput = document.getElementById('projectTitle');
    const settingsTitleInput = document.getElementById('settingsProjectTitle');
    
    // Load saved title
    const savedTitle = localStorage.getItem('papermap_project_title');
    if (savedTitle) {
        projectTitle = savedTitle;
        titleInput.value = projectTitle;
        if (settingsTitleInput) {
            settingsTitleInput.value = projectTitle;
        }
    }
    
    // Sync title inputs
    titleInput.addEventListener('input', (e) => {
        projectTitle = e.target.value || 'Mon Projet';
        if (settingsTitleInput) {
            settingsTitleInput.value = projectTitle;
        }
        localStorage.setItem('papermap_project_title', projectTitle);
    });
    
    titleInput.addEventListener('blur', () => {
        if (!titleInput.value.trim()) {
            titleInput.value = 'Mon Projet';
            projectTitle = 'Mon Projet';
            if (settingsTitleInput) {
                settingsTitleInput.value = projectTitle;
            }
            localStorage.setItem('papermap_project_title', projectTitle);
        }
    });
    
    if (settingsTitleInput) {
        settingsTitleInput.addEventListener('input', (e) => {
            projectTitle = e.target.value || 'Mon Projet';
            titleInput.value = projectTitle;
            localStorage.setItem('papermap_project_title', projectTitle);
        });
    }
}

// Settings modal management
function openSettingsModal() {
    const modal = document.getElementById('settingsModal');
    const settingsTitleInput = document.getElementById('settingsProjectTitle');
    
    // Sync current title
    if (settingsTitleInput) {
        settingsTitleInput.value = projectTitle;
    }
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeSettingsModal() {
    const modal = document.getElementById('settingsModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

// Export function to get project title for exports
function getProjectTitle() {
    return projectTitle || 'papergraph_export';
}

// ===== LOAD SETTINGS =====
function loadSettings() {
    const saved = localStorage.getItem('papergraph_settings');
    if (saved) {
        try {
            appSettings = JSON.parse(saved);
        } catch (e) {
            console.error('Error loading settings:', e);
        }
    }
    
    // Apply loaded settings
    applySettings();
}

// ===== APPLY SETTINGS =====
function applySettings() {
    // Apply dark mode
    if (appSettings.darkMode) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
    
    // Apply language
    document.documentElement.lang = appSettings.language;
    if (typeof updateLanguage === 'function') {
        updateLanguage();
    }
    
    // Update node labels if network exists
    if (network && appSettings.nodeLabelFormat !== 'title') {
        updateNodeLabels();
    }
}

// ===== UPDATE NODE LABELS =====
function updateNodeLabels() {
    if (!network) return;
    
    const nodesToUpdate = appData.articles.map(article => {
        let label = '';
        
        switch (appSettings.nodeLabelFormat) {
            case 'firstAuthorYear':
                if (article.authors && article.year) {
                    // Split by comma or "and" to handle both formats
                    const authorsList = article.authors.split(/,| and /i);
                    const firstAuthor = authorsList[0].trim().split(' ').pop();
                    label = `${firstAuthor} ${article.year}`;
                } else if (article.authors) {
                    const authorsList = article.authors.split(/,| and /i);
                    label = authorsList[0].trim().split(' ').pop();
                } else if (article.year) {
                    label = article.year;
                } else {
                    label = article.title.substring(0, 20) + '...';
                }
                break;
                
            case 'allAuthorsYear':
                if (article.authors && article.year) {
                    label = `${article.authors} (${article.year})`;
                } else if (article.authors) {
                    label = article.authors;
                } else if (article.year) {
                    label = article.year;
                } else {
                    label = article.title.substring(0, 30) + '...';
                }
                break;
                
            case 'shortTitle':
                label = article.title.substring(0, 30) + (article.title.length > 30 ? '...' : '');
                break;
                
            case 'title':
            default:
                label = ''; // Empty label (title shown in tooltip)
                break;
        }
        
        return {
            id: article.id,
            label: label
        };
    });
    
    network.body.data.nodes.update(nodesToUpdate);
}

// ===== GENERATE CITATION KEY =====
// Helper function for BibTeX-style citation keys
function generateCitationKey(article) {
    if (article.authors && article.year) {
        // Split by comma or "and" to handle both formats
        const authorsList = article.authors.split(/,| and /i);
        const firstAuthor = authorsList[0].trim().split(' ').pop().replace(/[^a-zA-Z]/g, '');
        return `${firstAuthor}${article.year}`;
    }
    return `Article${article.id}`;
}
