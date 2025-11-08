// ===== INITIALIZATION & EVENT LISTENERS =====
// Application initialization and all event bindings

// Check if we're in read-only mode (gallery project)
const urlParams = new URLSearchParams(window.location.search);
const isReadOnlyMode = urlParams.get('mode') === 'readonly';
let galleryProjectData = null;

if (isReadOnlyMode) {
    // Load gallery project from sessionStorage
    const galleryData = sessionStorage.getItem('galleryProject');
    if (galleryData) {
        galleryProjectData = JSON.parse(galleryData);
        console.log('📖 Read-only mode active - Gallery project loaded');
    }
}

// Export read-only state
window.isReadOnlyMode = isReadOnlyMode;
window.galleryProjectData = galleryProjectData;

function initializeEventListeners() {
    // View toggle switch
    const viewToggle = document.getElementById('viewToggle');
    viewToggle.addEventListener('change', (e) => {
        const tagModal = document.getElementById('multiTagModal');
        if (tagModal) {
            closeMultiTagDialog();
        }
        switchView(e.target.checked ? 'list' : 'graph');
    });
    
    // Logo menu button
    const logoMenuBtn = document.getElementById('logoMenuBtn');
    const mainDropdown = document.getElementById('mainDropdown');
    const importSubmenu = document.getElementById('importSubmenu');
    const exportSubmenu = document.getElementById('exportSubmenu');
    const nodeLabelSubmenu = document.getElementById('nodeLabelSubmenu');
    
    let activeSubmenu = null;
    
    logoMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        mainDropdown.classList.toggle('active');
        closeAllSubmenus();
    });
    
    // Close all submenus
    function closeAllSubmenus() {
        if (importSubmenu) importSubmenu.classList.remove('active');
        if (exportSubmenu) exportSubmenu.classList.remove('active');
        if (nodeLabelSubmenu) nodeLabelSubmenu.classList.remove('active');
        activeSubmenu = null;
    }
    
    // Position and show submenu
    function showSubmenu(submenu, triggerButton) {
        if (!submenu) return; // Safety check
        closeAllSubmenus();
        const rect = triggerButton.getBoundingClientRect();
        submenu.style.top = `${rect.top}px`;
        submenu.style.left = `${rect.right + 10}px`; // 10px spacing to the right
        submenu.classList.add('active');
        activeSubmenu = submenu;
    }
    
    // Submenu triggers with hover
    const importMenuBtn = document.getElementById('actionImportMenu');
    const exportMenuBtn = document.getElementById('actionExportMenu');
    const nodeLabelMenuBtn = document.getElementById('actionNodeLabelMenu');
    
    if (importMenuBtn) {
        importMenuBtn.addEventListener('mouseenter', function() {
            showSubmenu(importSubmenu, this);
        });
    }
    
    if (exportMenuBtn) {
        exportMenuBtn.addEventListener('mouseenter', function() {
            showSubmenu(exportSubmenu, this);
        });
    }
    
    if (nodeLabelMenuBtn) {
        nodeLabelMenuBtn.addEventListener('mouseenter', function() {
            showSubmenu(nodeLabelSubmenu, this);
        });
    }

    
    // Close submenus when hovering over non-submenu items in main dropdown only
    const mainDropdownItems = mainDropdown.querySelectorAll('.dropdown-menu-item:not(.has-submenu)');
    mainDropdownItems.forEach(item => {
        item.addEventListener('mouseenter', function() {
            closeAllSubmenus();
        });
    });
    
    // Keep submenu open when hovering over it
    [importSubmenu, exportSubmenu, nodeLabelSubmenu].filter(Boolean).forEach(submenu => {
        submenu.addEventListener('mouseenter', function() {
            this.classList.add('active');
        });
        
        submenu.addEventListener('mouseleave', function() {
            this.classList.remove('active');
        });
    });
    
    // Close submenus when leaving main dropdown
    mainDropdown.addEventListener('mouseleave', function(e) {
        // Only close if not moving to a submenu
        setTimeout(() => {
            const notHoveringAnySubmenu = 
                (!importSubmenu || !importSubmenu.matches(':hover')) && 
                (!exportSubmenu || !exportSubmenu.matches(':hover')) && 
                (!nodeLabelSubmenu || !nodeLabelSubmenu.matches(':hover'));
            
            if (notHoveringAnySubmenu) {
                closeAllSubmenus();
            }
        }, 100);
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        const clickedInDropdown = mainDropdown.contains(e.target) || logoMenuBtn.contains(e.target);
        const clickedInSubmenu = 
            (importSubmenu && importSubmenu.contains(e.target)) ||
            (exportSubmenu && exportSubmenu.contains(e.target)) ||
            (nodeLabelSubmenu && nodeLabelSubmenu.contains(e.target));
        
        if (!clickedInDropdown && !clickedInSubmenu) {
            mainDropdown.classList.remove('active');
            closeAllSubmenus();
        }
    });
    
    // Node label format selection
    const nodeLabelOptions = document.querySelectorAll('.node-label-option');
    nodeLabelOptions.forEach(option => {
        option.addEventListener('click', function() {
            const format = this.dataset.format;
            nodeLabelOptions.forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
            applyNodeLabelFormat(format);
            mainDropdown.classList.remove('active');
            closeAllSubmenus();
        });
    });
    
    // Load saved node label format
    const savedFormat = localStorage.getItem('nodeLabelFormat') || 'bibtexId';
    const savedOption = document.querySelector(`[data-format="${savedFormat}"]`);
    if (savedOption) {
        savedOption.classList.add('selected');
    }
    
    // Setup Editor User Dropdown
    async function setupEditorUserDropdown() {
        try {
            const config = await import('../auth/config.js');
            const { data: { session } } = await config.supabase.auth.getSession();
            
            if (session && session.user) {
                const user = session.user;
                const editorUserAvatarBtn = document.getElementById('editorUserAvatarBtn');
                const editorUserAvatar = document.getElementById('editorUserAvatar');
                const editorUserDropdown = document.getElementById('editorUserDropdown');
                
                if (!editorUserAvatarBtn || !editorUserAvatar || !editorUserDropdown) {
                    console.error('User dropdown elements not found');
                    return;
                }
                
                // Populate user info
                const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture;
                const username = user.user_metadata?.username;
                const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email.split('@')[0];
                const email = user.email;
                const provider = user.app_metadata?.provider || 'email';
                
                if (avatarUrl) {
                    editorUserAvatar.src = avatarUrl;
                    const editorUserAvatarDropdown = document.getElementById('editorUserAvatarDropdown');
                    if (editorUserAvatarDropdown) {
                        editorUserAvatarDropdown.src = avatarUrl;
                    }
                }
                
                // Display name first, then username below
                const editorUserNameDropdown = document.getElementById('editorUserNameDropdown');
                if (editorUserNameDropdown) {
                    editorUserNameDropdown.textContent = displayName;
                }
                
                const usernameElement = document.getElementById('editorUserUsernameDropdown');
                if (usernameElement) {
                    if (username) {
                        usernameElement.textContent = `@${username}`;
                        usernameElement.style.display = 'block';
                    } else {
                        usernameElement.style.display = 'none';
                    }
                }
                
                editorUserAvatarBtn.style.display = 'flex';
                
                // Remove existing event listeners by cloning and replacing
                const newAvatarBtn = editorUserAvatarBtn.cloneNode(true);
                editorUserAvatarBtn.parentNode.replaceChild(newAvatarBtn, editorUserAvatarBtn);
                
                // Toggle dropdown - attach to new button
                newAvatarBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    editorUserDropdown.classList.toggle('active');
                });
                
                // Close dropdown when clicking outside
                const closeDropdownHandler = (e) => {
                    if (!newAvatarBtn.contains(e.target) && !editorUserDropdown.contains(e.target)) {
                        editorUserDropdown.classList.remove('active');
                    }
                };
                
                // Remove any previous handler with same identifier
                document.removeEventListener('click', window.editorDropdownCloseHandler);
                window.editorDropdownCloseHandler = closeDropdownHandler;
                document.addEventListener('click', closeDropdownHandler);
                
                // Sign out button
                const editorSignOut = document.getElementById('editorSignOut');
                if (editorSignOut) {
                    // Remove existing listeners
                    const newSignOutBtn = editorSignOut.cloneNode(true);
                    editorSignOut.parentNode.replaceChild(newSignOutBtn, editorSignOut);
                    
                    newSignOutBtn.addEventListener('click', async () => {
                        await config.supabase.auth.signOut();
                        window.location.href = 'index.html';
                    });
                }
            }
        } catch (error) {
            console.log('User not authenticated or error loading user data');
        }
    }
    
    setupEditorUserDropdown();
    
    // Dark Theme Toggle (in user dropdown)
    const editorThemeToggle = document.getElementById('editorThemeToggle');
    const themeToggleText = document.getElementById('themeToggleText');
    const savedTheme = localStorage.getItem('theme') || 'light';
    
    // Apply saved theme on load
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        if (themeToggleText) themeToggleText.textContent = 'Light Mode';
    }
    
    if (editorThemeToggle) {
        editorThemeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-theme');
            const isDark = document.body.classList.contains('dark-theme');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            if (themeToggleText) {
                themeToggleText.textContent = isDark ? 'Light Mode' : 'Dark Mode';
            }
        });
    }
    
    // Dropdown menu actions
    // Note: actionNewProject button removed from dropdown menu
    
    const actionImportBtn = document.getElementById('actionImport');
    if (actionImportBtn) {
        actionImportBtn.addEventListener('click', () => {
            document.getElementById('fileInput').click();
            mainDropdown.classList.remove('active');
            closeAllSubmenus();
            // Close onboarding if it's open
            if (typeof window.closeOnboarding === 'function') {
                window.closeOnboarding();
            }
        });
    }
    
    const actionImportBibtexBtn = document.getElementById('actionImportBibtex');
    if (actionImportBibtexBtn) {
        actionImportBibtexBtn.addEventListener('click', () => {
            document.getElementById('bibtexFileInput').click();
            mainDropdown.classList.remove('active');
            closeAllSubmenus();
            // Close onboarding if it's open
            if (typeof window.closeOnboarding === 'function') {
                window.closeOnboarding();
            }
        });
    }
    
    document.getElementById('actionExport').addEventListener('click', () => {
        exportProject();
        mainDropdown.classList.remove('active');
        closeAllSubmenus();
    });
    
    document.getElementById('actionExportBibtex').addEventListener('click', () => {
        exportToBibtex();
        mainDropdown.classList.remove('active');
        closeAllSubmenus();
    });
    
    document.getElementById('actionExportPdf').addEventListener('click', () => {
        exportToPdf();
        mainDropdown.classList.remove('active');
        closeAllSubmenus();
    });
    
    document.getElementById('actionExportImage').addEventListener('click', () => {
        exportToImage();
        mainDropdown.classList.remove('active');
        closeAllSubmenus();
    });
    
    document.getElementById('actionExportSVG').addEventListener('click', () => {
        exportToSVG();
        mainDropdown.classList.remove('active');
        closeAllSubmenus();
    });
    
    // Help menu actions
    document.getElementById('actionHelp').addEventListener('click', () => {
        window.open('https://github.com/remyvallot/papergraph#readme', '_blank');
        mainDropdown.classList.remove('active');
        closeAllSubmenus();
    });
    
    // Gallery menu actions
    document.getElementById('actionExploreGallery').addEventListener('click', () => {
        window.location.href = 'gallery.html';
        mainDropdown.classList.remove('active');
        closeAllSubmenus();
    });
    
    const actionSubmitToGalleryBtn = document.getElementById('actionSubmitToGallery');
    if (actionSubmitToGalleryBtn) {
        actionSubmitToGalleryBtn.addEventListener('click', async () => {
            mainDropdown.classList.remove('active');
            closeAllSubmenus();
            
            // Check if user is logged in
            try {
                const { supabase } = await import('../auth/config.js');
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    if (confirm('You need to be signed in to submit to the gallery. Go to sign in page?')) {
                        window.location.href = 'index.html#auth';
                    }
                    return;
                }
                
                // Import and call the submit function
                const { openSubmitToGalleryModal } = await import('../data/github-submit.js');
                await openSubmitToGalleryModal();
            } catch (error) {
                console.error('Error opening submit modal:', error);
                alert('Failed to open submit modal. Please try again.');
            }
        });
    }
    
    document.getElementById('actionReportBug').addEventListener('click', () => {
        window.open('https://github.com/remyvallot/papergraph/issues/new', '_blank');
        mainDropdown.classList.remove('active');
        closeAllSubmenus();
    });
    
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', importProject);
    }
    
    const bibtexFileInput = document.getElementById('bibtexFileInput');
    if (bibtexFileInput) {
        bibtexFileInput.addEventListener('change', importBibtexFile);
    }
    
    // Toolbar actions
    document.getElementById('addArticleBtn').addEventListener('click', () => {
        openArticleModal();
    });
    document.getElementById('categoryFilterBtn').addEventListener('click', toggleCategoryDropdown);
    // Function to recenter/fit the graph view
    function fitGraphView() {
        if (!network) return;
        
        // Calculate bounding box including both nodes and tagzones
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        let hasContent = false;
        
        // Include nodes
        const positions = network.getPositions();
        Object.values(positions).forEach(pos => {
            minX = Math.min(minX, pos.x);
            minY = Math.min(minY, pos.y);
            maxX = Math.max(maxX, pos.x);
            maxY = Math.max(maxY, pos.y);
            hasContent = true;
        });
        
        // Include tagzones
        if (tagZones && tagZones.length > 0) {
            tagZones.forEach(zone => {
                minX = Math.min(minX, zone.x);
                minY = Math.min(minY, zone.y);
                maxX = Math.max(maxX, zone.x + zone.width);
                maxY = Math.max(maxY, zone.y + zone.height);
                hasContent = true;
            });
        }
        
        if (hasContent) {
            // Add padding (20% of the bounding box size to avoid menu bar)
            const paddingX = (maxX - minX) * 0.2;
            const paddingY = (maxY - minY) * 0.2;
            
            // Adjust view to include tagzones with padding
            network.moveTo({
                position: {
                    x: (minX + maxX) / 2,
                    y: (minY + maxY) / 2
                },
                scale: Math.min(
                    network.canvas.frame.canvas.width / (maxX - minX + 2 * paddingX),
                    network.canvas.frame.canvas.height / (maxY - minY + 2 * paddingY)
                ) * 0.85
            });
        }
    }
    
    // Expose globally for use in import/export
    window.fitGraphView = fitGraphView;
    
    document.getElementById('fitGraphBtn').addEventListener('click', fitGraphView);
    
    document.getElementById('toggleGridBtn').addEventListener('click', toggleGrid);
    
    // Load grid state from localStorage
    const savedGridState = localStorage.getItem('gridEnabled');
    if (savedGridState === 'true') {
        gridEnabled = true;
        const btn = document.getElementById('toggleGridBtn');
        btn.classList.add('active');
    }
    
    // Search toggle
    document.getElementById('searchToggleBtn').addEventListener('click', () => {
        const searchBtn = document.getElementById('searchToggleBtn');
        const searchBox = document.querySelector('.toolbar-search');
        
        searchBtn.classList.add('hidden');
        searchBox.classList.remove('collapsed');
        
        setTimeout(() => {
            document.getElementById('searchBoxToolbar').focus();
        }, 100);
    });
    
    document.getElementById('searchCloseBtn').addEventListener('click', () => {
        const searchBtn = document.getElementById('searchToggleBtn');
        const searchBox = document.querySelector('.toolbar-search');
        const searchInput = document.getElementById('searchBoxToolbar');
        const resultCount = document.getElementById('searchResultCount');
        
        searchBox.classList.add('collapsed');
        setTimeout(() => {
            searchBtn.classList.remove('hidden');
        }, 400);
        
        searchInput.value = '';
        if (resultCount) resultCount.textContent = '';
        
        // Reset search in both views
        const graphView = document.getElementById('graphView');
        const listView = document.getElementById('listView');
        
        if (graphView.classList.contains('active')) {
            searchInGraph('');
        } else if (listView.classList.contains('active')) {
            renderListView('');
        }
    });
    
    // Search input
    document.getElementById('searchBoxToolbar').addEventListener('input', (e) => {
        const searchTerm = e.target.value;
        const graphView = document.getElementById('graphView');
        const listView = document.getElementById('listView');
        
        // Close onboarding if it's open (user is searching)
        if (searchTerm && typeof window.closeOnboarding === 'function') {
            window.closeOnboarding();
        }
        
        if (graphView.classList.contains('active')) {
            searchInGraph(searchTerm);
        } else if (listView.classList.contains('active')) {
            renderListView(searchTerm);
        }
    });
    
    // Search input - Escape key to close
    document.getElementById('searchBoxToolbar').addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.getElementById('searchCloseBtn').click();
        }
    });
    
    // Category filter
    document.getElementById('categoryFilter').addEventListener('change', (e) => {
        currentCategoryFilter = e.target.value;
        activeFilters.category = e.target.value || null;
        
        // Close onboarding if it's open (user is filtering)
        if (typeof window.closeOnboarding === 'function') {
            window.closeOnboarding();
        }
        
        const graphView = document.getElementById('graphView');
        if (graphView.classList.contains('active')) {
            updateGraph();
        } else {
            renderListView(document.getElementById('searchBoxToolbar').value);
        }
        document.getElementById('categoryDropdown').classList.remove('active');
        
        updateActiveFiltersDisplay();
    });
    
    // Global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Escape key - hide selection box and menus
        if (e.key === 'Escape') {
            hideSelectionBox();
            hideRadialMenu();
            hideEdgeMenu();
            hideSelectionRadialMenu();
            hideZoneDeleteButton();
            return;
        }
        
        // Delete/Backspace key
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
                return;
            }
            
            e.preventDefault();
            
            if (selectedNodeId !== null) {
                if (confirm('Delete this article?')) {
                    deleteArticleById(selectedNodeId);
                    selectedNodeId = null;
                    hideRadialMenu();
                }
            } else if (selectedEdgeId !== null) {
                if (confirm('Delete this connection?')) {
                    deleteConnection(selectedEdgeId);
                    hideEdgeMenu();
                }
            } else if (selectedZoneIndex !== -1) {
                if (confirm('Delete this zone/tag?')) {
                    deleteZone(selectedZoneIndex);
                }
            }
        }
    });
    
    // Radial menu actions
    document.querySelector('.radial-connect').addEventListener('click', () => {
        if (selectedNodeId) {
            startConnectionMode(selectedNodeId);
            hideRadialMenu();
        }
    });
    
    document.querySelector('.radial-delete').addEventListener('click', () => {
        if (selectedNodeId) {
            deleteArticleById(selectedNodeId);
            hideRadialMenu();
        }
    });
    
    // Connection mode
    document.getElementById('cancelConnectionMode').addEventListener('click', cancelConnectionMode);
    
    // Modal
    document.getElementById('articleForm').addEventListener('submit', (e) => {
        saveArticle(e);
    });
    document.getElementById('deleteArticleBtn').addEventListener('click', () => {
        deleteArticle();
    });
    
    // Import functionality
    setupImportZone();
    
    // Manual form toggle
    document.getElementById('toggleManualBtn').addEventListener('click', toggleManualForm);
    
    // Close modals
    document.querySelectorAll('.close').forEach(el => {
        el.addEventListener('click', () => {
            closeModal();
        });
    });
    
    // Close modal on outside click
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModal();
        }
    });
    
    // Close radial menu when clicking on canvas
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.radial-menu') && !e.target.closest('.edge-menu') && !e.target.closest('.vis-network')) {
            hideRadialMenu();
            hideEdgeMenu();
        }
    });
    
    // Edge menu actions are now handled directly in showEdgeMenu() via onclick
}

function switchView(view) {
    const graphView = document.getElementById('graphView');
    const listView = document.getElementById('listView');
    const viewToggle = document.getElementById('viewToggle');
    const graphOnlyElements = document.querySelectorAll('.graph-only');
    
    // Close onboarding if it's open (user is interacting with the app)
    if (typeof window.closeOnboarding === 'function') {
        window.closeOnboarding();
    }
    
    // Hide selection box when switching views
    hideSelectionBox();
    
    // Clear search input when switching views
    const searchInput = document.getElementById('searchBoxToolbar');
    if (searchInput && searchInput.value) {
        searchInput.value = '';
        if (graphView.classList.contains('active')) {
            searchInGraph('');
        }
    }
    
    if (view === 'graph') {
        graphView.classList.add('active');
        listView.classList.remove('active');
        viewToggle.checked = false;
        
        // Show graph-only elements with animation
        graphOnlyElements.forEach(el => {
            el.style.display = 'flex';
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    el.classList.add('visible');
                });
            });
        });
        
        if (network) {
            network.fit();
        }
    } else {
        graphView.classList.remove('active');
        listView.classList.add('active');
        viewToggle.checked = true;
        
        // Hide graph-only elements with animation
        graphOnlyElements.forEach(el => {
            el.classList.remove('visible');
            setTimeout(() => {
                el.style.display = 'none';
            }, 400);
        });
        
        renderListView();
    }
}
