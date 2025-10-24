// ===== DATA STRUCTURE =====
let appData = {
    articles: [],
    connections: [],
    nextArticleId: 1,
    nextConnectionId: 1
};

let currentEditingArticleId = null;
let network = null;
let currentCategoryFilter = '';
let activeFilters = {
    category: null
};
let connectionMode = {
    active: false,
    fromNodeId: null,
    tempEdge: null
};
let selectedNodeId = null;
let selectedEdgeId = null;
let physicsEnabled = true;
let currentPulseInterval = null;

// Multi-selection state
let multiSelection = {
    active: false,
    selectedNodes: [],
    selectionBox: null,
    startX: 0,
    startY: 0,
    menuActive: false
};

// Tag zones state
let tagZones = [];

// View dragging state
let isDraggingView = false;

// Zone resizing state
let zoneResizing = {
    active: false,
    zoneIndex: -1,
    handle: null, // 'nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'
    startX: 0,
    startY: 0,
    originalZone: null
};

// Zone moving state
let zoneMoving = {
    active: false,
    readyToMove: false,
    zoneIndex: -1,
    startX: 0,
    startY: 0,
    originalZone: null
};

// Zone editing state
let zoneEditing = {
    active: false,
    zoneIndex: -1,
    inputElement: null,
    backgroundElement: null
};

// Selected zone for delete button
let selectedZoneIndex = -1;

let currentEditingElement = null;
let originalContent = '';
let inlineEditingSetup = false;
let currentPreviewArticleId = null;  // ID of article currently shown in preview

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    loadFromLocalStorage();
    initializeEventListeners();
    updateCategoryFilters();
    renderListView();
    
    // Initialize graph-only buttons visibility (default to graph view)
    const graphOnlyElements = document.querySelectorAll('.graph-only');
    graphOnlyElements.forEach(el => {
        el.style.display = 'flex';
        el.classList.add('visible');
    });
    
    // Initialize graph after a short delay to ensure DOM is ready
    setTimeout(() => {
        initializeGraph();
        // Position nodes in their zones after graph is initialized
        setTimeout(() => {
            positionNodesInZones();
        }, 200);
    }, 100);
    
    showNotification('Bienvenue sur Papermap!', 'success');
});

// ===== EVENT LISTENERS =====
function initializeEventListeners() {
    // View toggle switch
    const viewToggle = document.getElementById('viewToggle');
    viewToggle.addEventListener('change', (e) => {
        // Close tag modal if open
        const tagModal = document.getElementById('multiTagModal');
        if (tagModal) {
            closeMultiTagDialog();
        }
        switchView(e.target.checked ? 'list' : 'graph');
    });
    
    // Logo menu button
    const logoMenuBtn = document.getElementById('logoMenuBtn');
    const mainDropdown = document.getElementById('mainDropdown');
    
    logoMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        mainDropdown.classList.toggle('active');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!mainDropdown.contains(e.target) && !logoMenuBtn.contains(e.target)) {
            mainDropdown.classList.remove('active');
        }
    });
    
    // Dropdown menu actions
    document.getElementById('actionNewProject').addEventListener('click', () => {
        newProject();
        mainDropdown.classList.remove('active');
    });
    
    document.getElementById('actionImport').addEventListener('click', () => {
        document.getElementById('fileInput').click();
        mainDropdown.classList.remove('active');
    });
    
    document.getElementById('actionExport').addEventListener('click', () => {
        exportProject();
        mainDropdown.classList.remove('active');
    });
    
    document.getElementById('actionExportPdf').addEventListener('click', () => {
        exportToPdf();
        mainDropdown.classList.remove('active');
    });
    
    document.getElementById('actionExportImage').addEventListener('click', () => {
        exportToImage();
        mainDropdown.classList.remove('active');
    });
    
    document.getElementById('fileInput').addEventListener('change', importProject);
    
    // Toolbar actions
    document.getElementById('addArticleBtn').addEventListener('click', () => openArticleModal());
    document.getElementById('categoryFilterBtn').addEventListener('click', toggleCategoryDropdown);
    document.getElementById('fitGraphBtn').addEventListener('click', () => {
        if (network) network.fit();
    });
    
    document.getElementById('togglePhysicsBtn').addEventListener('click', togglePhysics);
    
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
            searchInGraph(''); // Clear graph highlights
        } else if (listView.classList.contains('active')) {
            renderListView('');
        }
    });
    
    // Search input
    document.getElementById('searchBoxToolbar').addEventListener('input', (e) => {
        const searchTerm = e.target.value;
        const graphView = document.getElementById('graphView');
        const listView = document.getElementById('listView');
        
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
    
    // Category filter (for graph dropdown)
    document.getElementById('categoryFilter').addEventListener('change', (e) => {
        currentCategoryFilter = e.target.value;
        activeFilters.category = e.target.value || null;
        
        const graphView = document.getElementById('graphView');
        if (graphView.classList.contains('active')) {
            updateGraph();
        } else {
            renderListView(document.getElementById('searchBoxToolbar').value);
        }
        document.getElementById('categoryDropdown').classList.remove('active');
        
        // Update active filters display
        updateActiveFiltersDisplay();
    });
    
    // Global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Delete/Backspace key
        if (e.key === 'Delete' || e.key === 'Backspace') {
            // Don't delete if typing in an input field
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
                return;
            }
            
            e.preventDefault();
            
            // Delete selected node
            if (selectedNodeId !== null) {
                if (confirm('Supprimer cet article ?')) {
                    deleteArticle(selectedNodeId);
                    hideRadialMenu();
                }
            }
            // Delete selected edge
            else if (selectedEdgeId !== null) {
                if (confirm('Supprimer cette connexion ?')) {
                    deleteConnection(selectedEdgeId);
                    hideEdgeMenu();
                }
            }
            // Delete selected zone
            else if (selectedZoneIndex !== -1) {
                if (confirm('Supprimer cette zone/tag ?')) {
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
    document.getElementById('articleForm').addEventListener('submit', saveArticle);
    document.getElementById('deleteArticleBtn').addEventListener('click', deleteArticle);
    document.getElementById('addCustomFieldBtn').addEventListener('click', addCustomField);
    
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
    
    // Edge menu actions
    document.querySelector('.edge-delete')?.addEventListener('click', () => {
        if (selectedEdgeId !== null) {
            deleteConnection(selectedEdgeId);
            hideEdgeMenu();
        }
    });
}

// ===== VIEW SWITCHING =====
function switchView(view) {
    const graphView = document.getElementById('graphView');
    const listView = document.getElementById('listView');
    const viewToggle = document.getElementById('viewToggle');
    const graphOnlyElements = document.querySelectorAll('.graph-only');
    
    // Clear search input when switching views
    const searchInput = document.getElementById('searchBoxToolbar');
    if (searchInput && searchInput.value) {
        searchInput.value = '';
        // Clear graph highlights if switching from graph
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
            // Force display first, then trigger animation
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

// ===== GRAPH VIEW =====
function initializeGraph() {
    const container = document.getElementById('graphContainer');
    const data = getGraphData();
    
    const options = {
        nodes: {
            shape: 'box',
            margin: 10,
            borderWidth: 3,
            borderWidthSelected: 3,
            shapeProperties: {
                borderRadius: 20
            },
            widthConstraint: {
                minimum: 80,
                maximum: 200
            },
            font: {
                size: 14,
                color: '#333333',
                bold: {
                    color: '#333333',
                    size: 14,
                    face: 'arial',
                    vadjust: 0,
                    mod: ''  // Empty mod means no bold
                }
            },
            color: {
                border: '#4a90e2',
                background: '#e3f2fd',
                highlight: {
                    border: '#357abd',
                    background: '#90caf9'
                }
            },
            chosen: {
                node: function(values, id, selected, hovering) {
                    // Disable all font modifications (no bold on hover/select)
                    if (hovering || selected) {
                        // Only add glow effect, no text changes
                        values.shadowColor = hovering ? 'rgba(74, 144, 226, 0.5)' : 'rgba(53, 122, 189, 0.7)';
                        values.shadowSize = hovering ? 15 : 20;
                        values.shadowX = 0;
                        values.shadowY = 0;
                    }
                },
                label: false  // Completely disable label modifications on hover/select
            }
        },
        edges: {
            arrows: {
                to: {
                    enabled: true,
                    scaleFactor: 1
                }
            },
            color: {
                color: '#848484',
                highlight: '#4a90e2',
                hover: '#848484'
            },
            font: {
                size: 12,
                align: 'middle'
            },
            smooth: {
                type: 'continuous'
            },
            hoverWidth: 0
        },
        physics: {
            enabled: true,
            stabilization: {
                enabled: true,
                iterations: 50,
                updateInterval: 25,
                onlyDynamicEdges: false,
                fit: true
            },
            barnesHut: {
                gravitationalConstant: -1000,
                centralGravity: 0.1,
                springLength: 200,
                springConstant: 0.02,
                damping: 0.9,
                avoidOverlap: 0.2
            },
            solver: 'barnesHut',
            timestep: 0.35,
            adaptiveTimestep: true
        },
        interaction: {
            hover: true,
            hoverConnectedEdges: true,
            selectConnectedEdges: true,
            tooltipDelay: 200,
            dragView: false,  // Disable default left-click drag
            multiselect: true,  // Enable multi-selection
            selectable: true
        }
    };
    
    console.log('Initializing graph with container:', container);
    console.log('Data:', data);
    
    network = new vis.Network(container, data, options);
    
    // Enable right-click drag for panning
    const canvas = network.canvas.frame.canvas;
    let dragStartPos = { x: 0, y: 0 };
    
    canvas.addEventListener('mousedown', (event) => {
        if (event.button === 2) { // Right click
            event.preventDefault();
            isDraggingView = true;
            dragStartPos = { x: event.clientX, y: event.clientY };
            // Don't change cursor
        } else if (event.button === 0 && !connectionMode.active) {
            // Check if clicking on zone edge/corner for resize first (priority over title)
            const resizeHandle = getZoneResizeHandle(event);
            if (resizeHandle.zone !== null) {
                event.preventDefault();
                event.stopPropagation();
                startZoneResize(event, resizeHandle.zoneIndex, resizeHandle.handle);
                return;
            }
            
            // Check if clicking on zone title
            const titleClick = getZoneTitleClick(event);
            if (titleClick.zone !== null) {
                event.preventDefault();
                event.stopPropagation();
                // Select the zone (but don't show delete button yet, wait for mouseup)
                selectedZoneIndex = titleClick.zoneIndex;
                
                // Prepare to start moving on drag
                const canvas = network.canvas.frame.canvas;
                const rect = canvas.getBoundingClientRect();
                const mouseX = event.clientX - rect.left;
                const mouseY = event.clientY - rect.top;
                const mousePos = network.DOMtoCanvas({ x: mouseX, y: mouseY });
                
                zoneMoving.startX = mousePos.x;
                zoneMoving.startY = mousePos.y;
                zoneMoving.zoneIndex = titleClick.zoneIndex;
                zoneMoving.originalZone = { ...tagZones[titleClick.zoneIndex] };
                zoneMoving.readyToMove = true; // Flag to indicate we're ready to move on mousemove
                
                // Store original positions of nodes in this zone
                const zone = tagZones[titleClick.zoneIndex];
                zoneMoving.originalNodePositions = {};
                appData.articles.forEach(article => {
                    if (article.categories.includes(zone.tag)) {
                        const pos = network.getPositions([article.id])[article.id];
                        if (pos) {
                            zoneMoving.originalNodePositions[article.id] = { x: pos.x, y: pos.y };
                        }
                    }
                });
                
                network.redraw();
                return;
            }
            
            // Check if clicking inside a zone (empty area)
            const clickPos = { x: event.offsetX, y: event.offsetY };
            const nodeId = network.getNodeAt(clickPos);
            const edgeId = network.getEdgeAt(clickPos);
            
            if (!nodeId && !edgeId) {
                const zoneClick = getZoneAtPosition(event);
                if (zoneClick.zone !== null) {
                    event.preventDefault();
                    event.stopPropagation();
                    // Select the zone
                    selectedZoneIndex = zoneClick.zoneIndex;
                    
                    // Prepare to start moving on drag
                    const canvas = network.canvas.frame.canvas;
                    const rect = canvas.getBoundingClientRect();
                    const mouseX = event.clientX - rect.left;
                    const mouseY = event.clientY - rect.top;
                    const mousePos = network.DOMtoCanvas({ x: mouseX, y: mouseY });
                    
                    zoneMoving.startX = mousePos.x;
                    zoneMoving.startY = mousePos.y;
                    zoneMoving.zoneIndex = zoneClick.zoneIndex;
                    zoneMoving.originalZone = { ...tagZones[zoneClick.zoneIndex] };
                    zoneMoving.readyToMove = true;
                    
                    // Store original positions of nodes in this zone
                    const zone = tagZones[zoneClick.zoneIndex];
                    zoneMoving.originalNodePositions = {};
                    appData.articles.forEach(article => {
                        if (article.categories.includes(zone.tag)) {
                            const pos = network.getPositions([article.id])[article.id];
                            if (pos) {
                                zoneMoving.originalNodePositions[article.id] = { x: pos.x, y: pos.y };
                            }
                        }
                    });
                    
                    network.redraw();
                    return;
                } else {
                    // Deselect zone if clicking elsewhere
                    if (selectedZoneIndex !== -1) {
                        selectedZoneIndex = -1;
                        hideZoneDeleteButton();
                        network.redraw();
                    }
                    
                    // Click on empty space (not on zone) - start selection box
                    event.preventDefault();
                    event.stopPropagation();
                    startSelectionBox(event);
                }
            }
        }
    }, true);
    
    canvas.addEventListener('dblclick', (event) => {
        if (!connectionMode.active) {
            const titleClick = getZoneTitleClick(event);
            if (titleClick.zone !== null) {
                event.preventDefault();
                event.stopPropagation();
                // Hide delete button if visible
                hideZoneDeleteButton();
                startEditZoneTitle(event, titleClick.zoneIndex);
            }
        }
    }, true);
    
    canvas.addEventListener('contextmenu', (event) => {
        event.preventDefault(); // Prevent context menu
    });
    
    canvas.addEventListener('mousemove', (event) => {
        if (isDraggingView) {
            const dx = event.clientX - dragStartPos.x;
            const dy = event.clientY - dragStartPos.y;
            
            const currentPos = network.getViewPosition();
            const scale = network.getScale();
            
            network.moveTo({
                position: {
                    x: currentPos.x - dx / scale,
                    y: currentPos.y - dy / scale
                },
                animation: false
            });
            
            dragStartPos = { x: event.clientX, y: event.clientY };
        } else if (zoneMoving.readyToMove) {
            // Start moving if we've moved the mouse enough
            const canvas = network.canvas.frame.canvas;
            const rect = canvas.getBoundingClientRect();
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;
            const mousePos = network.DOMtoCanvas({ x: mouseX, y: mouseY });
            
            const dx = Math.abs(mousePos.x - zoneMoving.startX);
            const dy = Math.abs(mousePos.y - zoneMoving.startY);
            
            if (dx > 5 || dy > 5) { // Threshold to start moving
                zoneMoving.active = true;
                zoneMoving.readyToMove = false;
                // Don't change cursor
                
                // Disable network interactions
                network.setOptions({
                    interaction: {
                        dragNodes: false,
                        dragView: false,
                        zoomView: false
                    }
                });
            }
        } else if (zoneMoving.active) {
            event.preventDefault();
            event.stopPropagation();
            updateZoneMove(event);
        } else if (zoneResizing.active) {
            event.preventDefault();
            event.stopPropagation();
            updateZoneResize(event);
        } else if (multiSelection.active) {
            event.preventDefault();
            event.stopPropagation();
            updateSelectionBox(event);
        }
        
        // Always update cursor when not in active mode (readyToMove is ok, it means we haven't started moving yet)
        if (!isDraggingView && !zoneMoving.active && !zoneResizing.active && !multiSelection.active && !connectionMode.active) {
            updateZoneCursor(event);
        }
    }, true);
    
    canvas.addEventListener('mouseup', (event) => {
        if (event.button === 2) {
            isDraggingView = false;
            // Don't change cursor
        } else if (event.button === 0 && (zoneMoving.active || zoneMoving.readyToMove)) {
            event.preventDefault();
            event.stopPropagation();
            
            // If we didn't actually move (just clicked), show delete button
            if (zoneMoving.readyToMove && !zoneMoving.active && selectedZoneIndex !== -1) {
                showZoneDeleteButton(selectedZoneIndex);
            }
            
            if (zoneMoving.active) {
                endZoneMove();
            }
            // Reset ready to move state
            zoneMoving.readyToMove = false;
            zoneMoving.active = false;
        } else if (event.button === 0 && zoneResizing.active) {
            event.preventDefault();
            event.stopPropagation();
            endZoneResize();
        } else if (event.button === 0 && multiSelection.active) {
            event.preventDefault();
            event.stopPropagation();
            endSelectionBox();
        }
    }, true);
    
    // Simple cursor update on mousemove
    network.canvas.body.container.addEventListener('mousemove', (event) => {
        if (!isDraggingView && !zoneMoving.active && !zoneResizing.active && !multiSelection.active && !connectionMode.active && !zoneEditing.active) {
            updateZoneCursor(event);
        }
    }, false);
    
    network.on('stabilizationIterationsDone', function () {
        console.log('Graph stabilization complete');
        network.fit();
        
        // Initialize zones from tags if not already loaded
        if (tagZones.length === 0 && appData.articles.length > 0) {
            initializeZonesFromTags();
        }
    });
    
    // Click on node - show radial menu
    // Track last click for double-click detection on edges
    let lastEdgeClickTime = 0;
    let lastEdgeClickId = null;
    
    network.on('click', (params) => {
        if (connectionMode.active) {
            handleConnectionModeClick(params);
        } else if (params.nodes.length > 0) {
            const nodeId = params.nodes[0];
            
            // If clicking a different node while menu is open, close and reopen
            if (selectedNodeId !== null && selectedNodeId !== nodeId) {
                hideRadialMenu();
                hideEdgeMenu();
                hideZoneDeleteButton();
                hideSelectionRadialMenu();
                // Very small delay to ensure menu is fully closed before reopening
                setTimeout(() => {
                    openRadialMenuForNode(nodeId);
                }, 1);
            } else {
                hideEdgeMenu();
                hideZoneDeleteButton();
                hideSelectionRadialMenu();
                openRadialMenuForNode(nodeId);
            }
        } else if (params.edges.length > 0) {
            // Click on edge - check for double-click
            const edgeId = params.edges[0];
            const now = Date.now();
            
            // Check for double-click
            if (edgeId === lastEdgeClickId && now - lastEdgeClickTime < 300) {
                // Double-click detected!
                const edge = network.body.data.edges.get(edgeId);
                if (edge) {
                    hideEdgeMenu();
                    editEdgeLabelInline(edgeId, edge, params.pointer.DOM);
                }
                lastEdgeClickTime = 0;
                lastEdgeClickId = null;
                return;
            }
            
            lastEdgeClickTime = now;
            lastEdgeClickId = edgeId;
            
            // Show edge menu immediately (like for nodes)
            if (!connectionMode.active) {
                selectedEdgeId = edgeId;
                selectedNodeId = null;
                
                hideRadialMenu();
                hideZoneDeleteButton();
                hideSelectionRadialMenu();
                closeArticlePreview();
                
                // Get container offset
                const container = document.getElementById('graphContainer');
                const rect = container.getBoundingClientRect();
                
                // Calculate position offset from edge (to the side, not on it)
                const screenX = rect.left + params.pointer.DOM.x + 30;  // Offset to the right
                const screenY = rect.top + params.pointer.DOM.y - 22;   // Vertically centered
                
                showEdgeMenu(screenX, screenY, edgeId);
                
                // Disable interactions
                network.setOptions({ 
                    interaction: { 
                        dragNodes: false,
                        dragView: false,
                        zoomView: false
                    } 
                });
            }
        } else {
            hideRadialMenu();
            hideEdgeMenu();
            hideZoneDeleteButton();
            hideSelectionRadialMenu();
            closeArticlePreview();
        }
    });
    
    // Helper function to open radial menu for a node
    function openRadialMenuForNode(nodeId) {
        selectedNodeId = nodeId;
        selectedEdgeId = null;
        
        // Show article preview
        showArticlePreview(nodeId);
        
        // Get node position in canvas coordinates, then convert to DOM
        const nodePosition = network.getPositions([nodeId])[nodeId];
        const canvasPosition = network.canvasToDOM(nodePosition);
        
        // Get container offset to calculate screen position
        const container = document.getElementById('graphContainer');
        const rect = container.getBoundingClientRect();
        
        const screenX = rect.left + canvasPosition.x;
        const screenY = rect.top + canvasPosition.y;
        
        // Get node dimensions to position menu around it
        const node = network.body.nodes[nodeId];
        const nodeWidth = node.shape.width || 100;
        const nodeHeight = node.shape.height || 50;
        
        showRadialMenu(screenX, screenY, nodeId, nodeWidth, nodeHeight);
        
        // Keep drag enabled but disable panning and zoom when menu is open
        network.setOptions({ 
            interaction: { 
                dragNodes: true,  // Allow dragging nodes
                dragView: false,
                zoomView: false,
                hover: true,
                hoverConnectedEdges: false
            } 
        });
    }
    
    // Update radial menu position when dragging a node
    network.on('dragging', (params) => {
        if (params.nodes.length > 0 && document.getElementById('radialMenu').classList.contains('active')) {
            const nodeId = params.nodes[0];
            if (nodeId === selectedNodeId) {
                // Get updated node position
                const nodePosition = network.getPositions([nodeId])[nodeId];
                const canvasPosition = network.canvasToDOM(nodePosition);
                
                const container = document.getElementById('graphContainer');
                const rect = container.getBoundingClientRect();
                
                const screenX = rect.left + canvasPosition.x;
                const screenY = rect.top + canvasPosition.y;
                
                // Get node dimensions
                const node = network.body.nodes[nodeId];
                const nodeWidth = node.shape.width || 100;
                const nodeHeight = node.shape.height || 50;
                
                // Update button positions
                updateRadialMenuPosition(screenX, screenY, nodeWidth, nodeHeight);
            }
        }
        
        // Check if node is being dragged into/out of tag zones
        if (params.nodes.length > 0) {
            const nodeId = params.nodes[0];
            const nodePos = network.getPositions([nodeId])[nodeId];
            const article = appData.articles.find(a => a.id === nodeId);
            
            if (article) {
                tagZones.forEach(zone => {
                    const isInZone = isNodeInZone(nodePos, zone);
                    const hasTag = article.categories.includes(zone.tag);
                    
                    if (isInZone && !hasTag) {
                        // Node entered zone - add tag
                        article.categories.push(zone.tag);
                        network.body.data.nodes.update({
                            id: nodeId,
                            color: {
                                background: zone.color,
                                border: darkenColor(zone.color, 20)
                            }
                        });
                        saveToLocalStorage();
                        updateCategoryFilters();
                        renderListView();
                        showNotification(`Tag "${zone.tag}" ajouté`, 'success');
                    } else if (!isInZone && hasTag) {
                        // Node left zone - remove tag
                        article.categories = article.categories.filter(c => c !== zone.tag);
                        // Reset to default color
                        network.body.data.nodes.update({
                            id: nodeId,
                            color: {
                                border: '#4a90e2',
                                background: '#e3f2fd'
                            }
                        });
                        saveToLocalStorage();
                        updateCategoryFilters();
                        renderListView();
                        showNotification(`Tag "${zone.tag}" retiré`, 'info');
                    }
                });
            }
        }
    });
    
    // Update zone sizes when dragging ends
    network.on('dragEnd', (params) => {
        if (params.nodes.length > 0) {
            // Update all zone sizes (not just the one being moved)
            updateZoneSizes();
            // Check if dragged nodes entered/exited zones
            checkNodeZoneMembership();
        }
    });
    
    // Double click - for nodes only (edges are handled in click event)
    network.on('doubleClick', (params) => {
        // Edge double-clicks are handled in the click event for better reliability
        // Could add node double-click actions here in the future
    });
    
    // Update radial menu during physics simulation
    network.on('stabilizationProgress', (params) => {
        updateRadialMenuIfActive();
    });
    
    // Update radial menu after each animation frame when physics is active
    network.on('beforeDrawing', (ctx) => {
        // Draw tag zones in background
        drawTagZones(ctx);
        
        if (network.physics.physicsEnabled) {
            updateRadialMenuIfActive();
        }
    });
    
    // Mouse hover for connection mode
    network.on('hoverNode', (params) => {
        if (connectionMode.active && params.node !== connectionMode.fromNodeId) {
            network.canvas.body.container.style.cursor = 'pointer';
        }
    });
    
    network.on('blurNode', () => {
        if (connectionMode.active) {
            network.canvas.body.container.style.cursor = 'crosshair';
        }
    });
    
    console.log('Graph initialized successfully');
}

function getGraphData() {
    const filteredArticles = currentCategoryFilter 
        ? appData.articles.filter(a => a.categories.includes(currentCategoryFilter))
        : appData.articles;
    
    console.log('Current filter:', currentCategoryFilter);
    console.log('Total articles:', appData.articles.length);
    console.log('Filtered articles:', filteredArticles.length);
    
    const nodes = new vis.DataSet(filteredArticles.map(article => {
        // Find zone color for this article
        let nodeColor = { border: '#4a90e2', background: '#e3f2fd' };
        
        if (article.categories.length > 0) {
            // Use the first category's zone color if available
            const firstCategory = article.categories[0];
            const zone = tagZones.find(z => z.tag === firstCategory);
            if (zone) {
                nodeColor = {
                    background: zone.color,
                    border: darkenColor(zone.color, 20)
                };
            }
        }
        
        return {
            id: article.id,
            label: article.title,
            color: nodeColor
        };
    }));
    
    const articleIds = new Set(filteredArticles.map(a => a.id));
    const edges = new vis.DataSet(appData.connections
        .filter(conn => articleIds.has(conn.from) && articleIds.has(conn.to))
        .map(conn => ({
            id: conn.id,
            from: conn.from,
            to: conn.to,
            label: conn.label || ''
        })));
    
    console.log('Nodes:', nodes.get());
    console.log('Edges:', edges.get());
    
    return { nodes, edges };
}

function updateGraph() {
    if (!network) {
        console.log('Network not initialized, initializing now...');
        initializeGraph();
        return;
    }
    
    try {
        // Clear search highlights when updating graph
        searchHighlightedNodes = [];
        
        // Save current positions of nodes
        const currentPositions = network.getPositions();
        console.log('Saved positions:', currentPositions);
        
        const data = getGraphData();
        console.log('Updating graph with data:', data);
        
        // Update nodes and edges directly without destroying
        network.setData(data);
        
        // Restore positions immediately
        if (Object.keys(currentPositions).length > 0) {
            const nodesToUpdate = [];
            data.nodes.forEach(node => {
                if (currentPositions[node.id]) {
                    nodesToUpdate.push({
                        id: node.id,
                        x: currentPositions[node.id].x,
                        y: currentPositions[node.id].y,
                        fixed: false
                    });
                }
            });
            if (nodesToUpdate.length > 0) {
                network.body.data.nodes.update(nodesToUpdate);
            }
        }
        
        // Stabilize without moving nodes too much
        network.stabilize(10);
    } catch (error) {
        console.error('Error updating graph:', error);
    }
}

// ===== GRAPH SEARCH =====
let searchHighlightedNodes = [];

function searchInGraph(searchTerm = '') {
    if (!network) return;
    
    const resultCount = document.getElementById('searchResultCount');
    
    // Clear previous highlights
    if (searchHighlightedNodes.length > 0) {
        const nodesToUpdate = searchHighlightedNodes.map(nodeId => ({
            id: nodeId,
            borderWidth: 3,
            color: undefined // Reset to default color
        }));
        network.body.data.nodes.update(nodesToUpdate);
        searchHighlightedNodes = [];
    }
    
    // If no search term, reset and return
    if (!searchTerm || searchTerm.trim() === '') {
        if (resultCount) resultCount.textContent = '';
        return;
    }
    
    const term = searchTerm.toLowerCase().trim();
    const matchingArticles = [];
    
    // Search in articles
    appData.articles.forEach(article => {
        let matches = false;
        
        // Check title
        if (article.title.toLowerCase().includes(term)) {
            matches = true;
        }
        
        // Check categories/tags
        if (article.categories.some(cat => cat.toLowerCase().includes(term))) {
            matches = true;
        }
        
        // Check authors
        if (article.authors && article.authors.toLowerCase().includes(term)) {
            matches = true;
        }
        
        // Check text/notes
        if (article.text && article.text.toLowerCase().includes(term)) {
            matches = true;
        }
        
        if (matches) {
            matchingArticles.push(article);
        }
    });
    
    // Update result count
    if (resultCount) {
        if (matchingArticles.length === 0) {
            resultCount.textContent = '0';
            resultCount.style.color = '#999';
        } else {
            resultCount.textContent = `${matchingArticles.length}`;
            resultCount.style.color = '#4a90e2';
        }
    }
    
    // If no matches, don't show notification in graph view (counter is enough)
    if (matchingArticles.length === 0) {
        return;
    }
    
    // Highlight matching nodes
    const matchingNodeIds = matchingArticles.map(a => a.id);
    searchHighlightedNodes = matchingNodeIds;
    
    // Update node appearance for highlights
    const nodesToUpdate = matchingNodeIds.map(nodeId => ({
        id: nodeId,
        borderWidth: 5,
        color: {
            border: '#ff6b6b',
            background: '#ffe0e0',
            highlight: {
                border: '#ff6b6b',
                background: '#ffcccc'
            }
        }
    }));
    network.body.data.nodes.update(nodesToUpdate);
    
    // If single result, focus on it
    if (matchingNodeIds.length === 1) {
        network.selectNodes([matchingNodeIds[0]]);
        network.focus(matchingNodeIds[0], {
            scale: 1.5,
            animation: {
                duration: 500,
                easingFunction: 'easeInOutQuad'
            }
        });
    } else {
        // Multiple results - fit all of them in view
        network.fit({
            nodes: matchingNodeIds,
            animation: {
                duration: 500,
                easingFunction: 'easeInOutQuad'
            }
        });
    }
}

// ===== HELPER: Highlight search terms =====
function highlightSearchTerm(text, searchTerm) {
    if (!searchTerm || !text) return text;
    
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

// ===== LIST VIEW =====
function renderListView(searchTerm = '') {
    const listContainer = document.getElementById('listContainer');
    const resultCount = document.getElementById('searchResultCount');
    let filteredArticles = appData.articles;
    
    // Filter by category
    if (currentCategoryFilter) {
        filteredArticles = filteredArticles.filter(a => a.categories.includes(currentCategoryFilter));
    }
    
    // Filter by date range
    if (activeFilters.dateRange) {
        filteredArticles = filteredArticles.filter(article => {
            if (!article.date) return !activeFilters.dateRange.start && !activeFilters.dateRange.end;
            
            const articleDate = new Date(article.date);
            const startDate = activeFilters.dateRange.start ? new Date(activeFilters.dateRange.start) : null;
            const endDate = activeFilters.dateRange.end ? new Date(activeFilters.dateRange.end) : null;
            
            if (startDate && articleDate < startDate) return false;
            if (endDate && articleDate > endDate) return false;
            
            return true;
        });
    }
    
    // Filter by search term (same power as graph search)
    if (searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        filteredArticles = filteredArticles.filter(a => {
            // Check title
            if (a.title.toLowerCase().includes(term)) return true;
            
            // Check text/notes
            if (a.text && a.text.toLowerCase().includes(term)) return true;
            
            // Check categories/tags
            if (a.categories.some(cat => cat.toLowerCase().includes(term))) return true;
            
            // Check authors
            if (a.authors && a.authors.toLowerCase().includes(term)) return true;
            
            return false;
        });
    }
    
    // Update result count in search bar
    if (resultCount && searchTerm) {
        if (filteredArticles.length === 0) {
            resultCount.textContent = '0';
            resultCount.style.color = '#999';
        } else {
            resultCount.textContent = `${filteredArticles.length}`;
            resultCount.style.color = '#4a90e2';
        }
    } else if (resultCount) {
        resultCount.textContent = '';
    }
    
    listContainer.innerHTML = '';
    
    if (filteredArticles.length === 0) {
        listContainer.innerHTML = '<div style="text-align: center; padding: 3rem; color: #999;">Aucun article trouvé</div>';
        return;
    }
    
    filteredArticles.forEach(article => {
        const item = document.createElement('div');
        item.className = 'article-list-item';
        
        // Add highlight class if this article matches search
        if (searchTerm && searchTerm.trim()) {
            item.classList.add('search-match');
        }
        
        // Header with title and actions
        const header = document.createElement('div');
        header.className = 'article-list-header';
        
        const title = document.createElement('div');
        title.className = 'article-list-title';
        title.contentEditable = 'true';
        title.textContent = article.title;
        title.onclick = (e) => e.stopPropagation();
        title.ondblclick = (e) => {
            e.stopPropagation();
            title.classList.add('editing');
        };
        title.onblur = () => {
            title.classList.remove('editing');
            if (title.textContent.trim() !== article.title) {
                article.title = title.textContent.trim();
                saveToLocalStorage();
                updateGraph();
            }
        };
        title.onkeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                title.blur();
            }
            if (e.key === 'Escape') {
                title.textContent = article.title;
                title.blur();
            }
        };
        header.appendChild(title);
        
        const actions = document.createElement('div');
        actions.className = 'article-list-actions';
        
        const editBtn = document.createElement('button');
        editBtn.className = 'article-action-btn';
        editBtn.title = 'Éditer dans le modal';
        editBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>`;
        editBtn.onclick = () => openArticleModal(article.id);
        actions.appendChild(editBtn);
        
        header.appendChild(actions);
        item.appendChild(header);
        
        // Meta section
        const meta = document.createElement('div');
        meta.className = 'article-list-meta';
        
        // Authors
        const authors = document.createElement('div');
        authors.className = 'article-list-authors';
        authors.contentEditable = 'true';
        authors.textContent = article.authors || '';
        authors.onclick = (e) => e.stopPropagation();
        authors.ondblclick = (e) => {
            e.stopPropagation();
            authors.classList.add('editing');
        };
        authors.onblur = () => {
            authors.classList.remove('editing');
            article.authors = authors.textContent.trim();
            saveToLocalStorage();
        };
        authors.onkeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                authors.blur();
            }
            if (e.key === 'Escape') {
                authors.textContent = article.authors || '';
                authors.blur();
            }
        };
        meta.appendChild(authors);
        
        // Categories
        if (article.categories && article.categories.length > 0) {
            const categories = document.createElement('div');
            categories.className = 'article-list-categories';
            article.categories.forEach(cat => {
                const badge = document.createElement('span');
                badge.className = 'article-list-category';
                badge.textContent = cat;
                categories.appendChild(badge);
            });
            meta.appendChild(categories);
        }
        
        item.appendChild(meta);
        
        // Text/Notes
        const text = document.createElement('div');
        text.className = 'article-list-text';
        text.contentEditable = 'true';
        text.textContent = article.text || '';
        text.onclick = (e) => e.stopPropagation();
        text.ondblclick = (e) => {
            e.stopPropagation();
            text.classList.add('editing');
        };
        text.onblur = () => {
            text.classList.remove('editing');
            article.text = text.textContent.trim();
            saveToLocalStorage();
        };
        text.onkeydown = (e) => {
            if (e.key === 'Escape') {
                text.textContent = article.text || '';
                text.blur();
            }
        };
        item.appendChild(text);
        
        // Links section
        const hasLinks = article.doi || article.link || article.pdf;
        if (hasLinks) {
            const links = document.createElement('div');
            links.className = 'article-list-links';
            
            if (article.doi) {
                const doiLink = document.createElement('a');
                doiLink.className = 'article-list-link';
                doiLink.href = article.doi.startsWith('http') ? article.doi : `https://doi.org/${article.doi}`;
                doiLink.target = '_blank';
                doiLink.innerHTML = '📄 DOI';
                doiLink.onclick = (e) => e.stopPropagation();
                links.appendChild(doiLink);
            }
            
            if (article.link) {
                const webLink = document.createElement('a');
                webLink.className = 'article-list-link';
                webLink.href = article.link;
                webLink.target = '_blank';
                webLink.innerHTML = '🔗 Lien';
                webLink.onclick = (e) => e.stopPropagation();
                links.appendChild(webLink);
            }
            
            if (article.pdf) {
                const pdfLink = document.createElement('a');
                pdfLink.className = 'article-list-link';
                pdfLink.href = article.pdf;
                pdfLink.target = '_blank';
                pdfLink.innerHTML = '📕 PDF';
                pdfLink.onclick = (e) => e.stopPropagation();
                links.appendChild(pdfLink);
            }
            
            item.appendChild(links);
        }
        
        listContainer.appendChild(item);
    });
}

// ===== ARTICLE MODAL =====
function openArticleModal(articleId = null) {
    const modal = document.getElementById('articleModal');
    const modalTitle = document.getElementById('modalTitle');
    const form = document.getElementById('articleForm');
    const deleteBtn = document.getElementById('deleteArticleBtn');
    
    currentEditingArticleId = articleId;
    
    // Reset form
    form.reset();
    document.getElementById('customFieldsList').innerHTML = '';
    
    // Reset import zone to initial state
    resetImportZone();
    
    // Always collapse manual form on open
    const manualForm = document.getElementById('manualForm');
    const toggleBtn = document.getElementById('toggleManualBtn');
    manualForm.classList.add('collapsed');
    toggleBtn.textContent = '✏️ Saisie manuelle / modifier';
    
    if (articleId) {
        // Edit mode - show manual form directly with data
        modalTitle.textContent = 'Éditer l\'article';
        deleteBtn.style.display = 'inline-block';
        
        const article = appData.articles.find(a => a.id === articleId);
        if (article) {
            document.getElementById('articleTitle').value = article.title;
            document.getElementById('articleAuthors').value = article.authors || '';
            document.getElementById('articleCategories').value = article.categories.join(', ');
            document.getElementById('articleText').value = article.text || '';
            document.getElementById('articleDoi').value = article.doi || '';
            document.getElementById('articleLink').value = article.link || '';
            document.getElementById('articlePdf').value = article.pdf || '';
            
            // Load custom fields
            if (article.customFields) {
                Object.entries(article.customFields).forEach(([key, value]) => {
                    addCustomField(key, value);
                });
            }
            
            // Hide import zone and show manual form in edit mode
            document.querySelector('.import-zone').style.display = 'none';
            document.getElementById('manualFormToggle').style.display = 'none';
            manualForm.classList.remove('collapsed');
        }
    } else {
        // New article mode
        modalTitle.textContent = 'Nouvel Article';
        deleteBtn.style.display = 'none';
        
        // Show import zone in new article mode
        document.querySelector('.import-zone').style.display = 'block';
        document.getElementById('manualFormToggle').style.display = 'block';
    }
    
    modal.classList.add('active');
}

function closeModal() {
    document.getElementById('articleModal').classList.remove('active');
    currentEditingArticleId = null;
    resetImportZone();
}

function addCustomField(key = '', value = '') {
    const container = document.getElementById('customFieldsList');
    const fieldDiv = document.createElement('div');
    fieldDiv.className = 'custom-field';
    
    const keyInput = document.createElement('input');
    keyInput.type = 'text';
    keyInput.placeholder = 'Nom du champ';
    keyInput.value = key;
    
    const valueInput = document.createElement('input');
    valueInput.type = 'text';
    valueInput.placeholder = 'Valeur';
    valueInput.value = value;
    
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = '✖';
    removeBtn.onclick = () => fieldDiv.remove();
    
    fieldDiv.appendChild(keyInput);
    fieldDiv.appendChild(valueInput);
    fieldDiv.appendChild(removeBtn);
    container.appendChild(fieldDiv);
}

function saveArticle(e) {
    e.preventDefault();
    
    const title = document.getElementById('articleTitle').value.trim();
    const authors = document.getElementById('articleAuthors').value.trim();
    const categoriesText = document.getElementById('articleCategories').value.trim();
    const text = document.getElementById('articleText').value.trim();
    const doi = document.getElementById('articleDoi').value.trim();
    const link = document.getElementById('articleLink').value.trim();
    const pdf = document.getElementById('articlePdf').value.trim();
    
    const categories = categoriesText 
        ? categoriesText.split(',').map(c => c.trim()).filter(c => c)
        : [];
    
    // Get custom fields
    const customFields = {};
    document.querySelectorAll('.custom-field').forEach(fieldDiv => {
        const inputs = fieldDiv.querySelectorAll('input');
        const key = inputs[0].value.trim();
        const value = inputs[1].value.trim();
        if (key) {
            customFields[key] = value;
        }
    });
    
    if (currentEditingArticleId) {
        // Update existing article
        const article = appData.articles.find(a => a.id === currentEditingArticleId);
        if (article) {
            article.title = title;
            article.authors = authors;
            article.categories = categories;
            article.text = text;
            article.doi = doi;
            article.link = link;
            article.pdf = pdf;
            article.customFields = customFields;
        }
    } else {
        // Create new article
        const newArticle = {
            id: appData.nextArticleId++,
            title,
            authors,
            categories,
            text,
            doi,
            link,
            pdf,
            customFields
        };
        appData.articles.push(newArticle);
        
        // If category filter is active and new article doesn't match, reset filter
        if (currentCategoryFilter && !categories.includes(currentCategoryFilter)) {
            currentCategoryFilter = '';
            document.getElementById('categoryFilter').value = '';
        }
    }
    
    closeModal();
    updateCategoryFilters();
    updateGraph();
    renderListView();
    saveToLocalStorage(true);  // Silent save, notification already shown
    showNotification('Article enregistré!', 'success');
    
    // Update preview if it's open
    if (currentEditingArticleId && selectedNodeId === currentEditingArticleId) {
        showArticlePreview(currentEditingArticleId);
    }
}

// ===== ARTICLE PREVIEW =====
function showArticlePreview(articleId) {
    const article = appData.articles.find(a => a.id === articleId);
    if (!article) return;
    
    currentPreviewArticleId = articleId;  // Store the article ID for inline editing
    console.log('showArticlePreview: Loading article', articleId, article);
    
    const preview = document.getElementById('articlePreview');
    
    // Update title
    document.getElementById('previewTitle').textContent = article.title || 'Sans titre';
    
    // Update authors/meta
    const authorsElement = document.getElementById('previewAuthors');
    if (article.authors) {
        authorsElement.textContent = article.authors;
    } else {
        authorsElement.textContent = '';
    }
    
    // Update category badge
    const categoryBadge = document.getElementById('previewCategoryBadge');
    if (article.categories && article.categories.length > 0) {
        categoryBadge.textContent = article.categories[0];
        categoryBadge.style.display = 'inline-block';
    } else {
        categoryBadge.style.display = 'none';
    }
    
    // Update description/text
    const textElement = document.getElementById('previewText');
    textElement.textContent = article.text || '';
    
    console.log('Preview updated with:', {
        title: article.title,
        authors: article.authors,
        text: article.text
    });
    
    // Handle DOI
    const doiContainer = document.getElementById('previewDoiContainer');
    const doiElement = document.getElementById('previewDoi');
    if (article.doi) {
        doiElement.href = `https://doi.org/${article.doi}`;
        doiElement.textContent = article.doi;
        doiContainer.style.display = 'flex';
    } else {
        doiContainer.style.display = 'none';
    }
    
    // Handle Link
    const linkContainer = document.getElementById('previewLinkContainer');
    const linkElement = document.getElementById('previewLink');
    if (article.link) {
        linkElement.href = article.link;
        const displayLink = article.link.length > 40 ? article.link.substring(0, 37) + '...' : article.link;
        linkElement.textContent = displayLink;
        linkContainer.style.display = 'flex';
    } else {
        linkContainer.style.display = 'none';
    }
    
    // Handle PDF
    const pdfContainer = document.getElementById('previewPdfContainer');
    const pdfElement = document.getElementById('previewPdf');
    if (article.pdf) {
        pdfElement.href = article.pdf;
        const displayPdf = article.pdf.length > 40 ? article.pdf.substring(0, 37) + '...' : article.pdf;
        pdfElement.textContent = displayPdf;
        pdfContainer.style.display = 'flex';
    } else {
        pdfContainer.style.display = 'none';
    }
    
    // Show preview panel
    preview.classList.add('active');
    
    // Setup inline editing once
    if (!inlineEditingSetup) {
        setupInlineEditing();
        inlineEditingSetup = true;
    }
}

function closeArticlePreview() {
    // Save any ongoing edits before closing
    if (currentEditingElement) {
        // Determine which field is being edited
        let field = null;
        if (currentEditingElement.id === 'previewTitle') field = 'title';
        else if (currentEditingElement.id === 'previewAuthors') field = 'authors';
        else if (currentEditingElement.id === 'previewText') field = 'text';
        
        if (field) {
            saveInlineEdit(currentEditingElement, field);
        }
    }
    
    const preview = document.getElementById('articlePreview');
    preview.classList.remove('active');
    currentPreviewArticleId = null;  // Reset preview article ID
}

function setupInlineEditing() {
    // Make title editable - no double-click needed, just focus
    const titleElement = document.getElementById('previewTitle');
    titleElement.contentEditable = 'true';
    
    titleElement.addEventListener('focus', () => {
        currentEditingElement = titleElement;
        originalContent = titleElement.textContent;
        titleElement.classList.add('editing');
    });
    
    titleElement.addEventListener('blur', () => {
        if (currentEditingElement === titleElement) {
            saveInlineEdit(titleElement, 'title');
        }
    });
    
    titleElement.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveInlineEdit(titleElement, 'title');
            titleElement.blur();
        }
        if (e.key === 'Escape') {
            titleElement.textContent = originalContent;
            titleElement.classList.remove('editing');
            currentEditingElement = null;
            titleElement.blur();
        }
    });
    
    // Make authors editable - no double-click needed, just focus
    const authorsElement = document.getElementById('previewAuthors');
    authorsElement.contentEditable = 'true';
    
    authorsElement.addEventListener('focus', () => {
        currentEditingElement = authorsElement;
        originalContent = authorsElement.textContent;
        authorsElement.classList.add('editing');
    });
    
    authorsElement.addEventListener('blur', () => {
        if (currentEditingElement === authorsElement) {
            saveInlineEdit(authorsElement, 'authors');
        }
    });
    
    authorsElement.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveInlineEdit(authorsElement, 'authors');
            authorsElement.blur();
        }
        if (e.key === 'Escape') {
            authorsElement.textContent = originalContent;
            authorsElement.classList.remove('editing');
            currentEditingElement = null;
            authorsElement.blur();
        }
    });
    
    // Make description editable - no double-click needed, just focus
    const descriptionElement = document.getElementById('previewText');
    descriptionElement.contentEditable = 'true';
    
    descriptionElement.addEventListener('focus', () => {
        currentEditingElement = descriptionElement;
        originalContent = descriptionElement.textContent;
        descriptionElement.classList.add('editing');
    });
    
    descriptionElement.addEventListener('blur', () => {
        if (currentEditingElement === descriptionElement) {
            saveInlineEdit(descriptionElement, 'text');
        }
    });
    
    descriptionElement.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            // Ctrl+Enter to save (Enter alone adds new line)
            e.preventDefault();
            saveInlineEdit(descriptionElement, 'text');
            descriptionElement.blur();
        }
        if (e.key === 'Escape') {
            descriptionElement.textContent = originalContent;
            descriptionElement.classList.remove('editing');
            currentEditingElement = null;
            descriptionElement.blur();
        }
    });
}

function startEditing(element) {
    if (currentEditingElement && currentEditingElement !== element) {
        currentEditingElement.classList.remove('editing');
    }
    currentEditingElement = element;
    originalContent = element.textContent;
    element.classList.add('editing');
    
    // Select all text
    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
}

function saveInlineEdit(element, field) {
    // Prevent double save
    if (!currentEditingElement || currentEditingElement !== element) {
        console.log('SaveInlineEdit: Skipped - no current editing element');
        return;
    }
    
    element.classList.remove('editing');
    currentEditingElement = null;
    
    if (!currentPreviewArticleId) {
        console.log('SaveInlineEdit: No preview article ID');
        return;
    }
    
    const article = appData.articles.find(a => a.id === currentPreviewArticleId);
    if (!article) {
        console.log('SaveInlineEdit: Article not found for id:', currentPreviewArticleId);
        return;
    }
    
    const newValue = element.textContent.trim();
    
    console.log('SaveInlineEdit:', field, 'Old:', originalContent, 'New:', newValue);
    
    if (newValue !== originalContent.trim()) {
        article[field] = newValue;
        
        console.log('Article updated in appData:', article);
        
        // Update the graph node visuals
        if (network) {
            if (field === 'title') {
                // Update node label (displayed text)
                network.body.data.nodes.update({
                    id: currentPreviewArticleId,
                    label: newValue
                });
            } else if (field === 'text') {
                // Update node tooltip (hover text)
                const tooltipText = newValue ? newValue.substring(0, 100) + '...' : article.title;
                network.body.data.nodes.update({
                    id: currentPreviewArticleId,
                    title: tooltipText
                });
            }
        }
        
        // Refresh list view and save
        renderListView();
        saveToLocalStorage(true);  // Silent save
        
        // DO NOT refresh preview - it would reload old data
        // The preview already shows the updated value in the DOM
        
        showNotification('Article mis à jour!', 'success');
    }
}

function deleteArticle() {
    if (!currentEditingArticleId) return;
    
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) return;
    
    // Disable physics temporarily
    const wasPhysicsEnabled = physicsEnabled;
    if (network) {
        network.setOptions({ physics: { enabled: false } });
    }
    
    // Remove article
    appData.articles = appData.articles.filter(a => a.id !== currentEditingArticleId);
    
    // Remove connections
    appData.connections = appData.connections.filter(c => 
        c.from !== currentEditingArticleId && c.to !== currentEditingArticleId
    );
    
    closeModal();
    updateGraph();
    renderListView();
    updateCategoryFilters();
    saveToLocalStorage();
    
    // Restore physics state
    setTimeout(() => {
        if (network && wasPhysicsEnabled) {
            network.setOptions({ physics: { enabled: true } });
        }
    }, 100);
    
    showNotification('Article supprimé!', 'success');
}

// ===== CATEGORY FILTERS =====
function updateCategoryFilters() {
    const allCategories = new Set();
    appData.articles.forEach(article => {
        article.categories.forEach(cat => allCategories.add(cat));
    });
    
    const sortedCategories = Array.from(allCategories).sort();
    
    // Update the graph dropdown filter only
    const select = document.getElementById('categoryFilter');
    if (!select) return;
    const currentValue = select.value;
    
    select.innerHTML = '<option value="">Toutes les catégories</option>';
    sortedCategories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        select.appendChild(option);
    });
    
    select.value = currentValue;
}

// ===== ACTIVE FILTERS DISPLAY =====
function updateActiveFiltersDisplay() {
    const container = document.getElementById('activeFilters');
    container.innerHTML = '';
    
    // Category filter
    if (activeFilters.category) {
        const chip = createFilterChip('Catégorie', activeFilters.category, () => {
            removeFilter('category');
        });
        container.appendChild(chip);
    }
}

function createFilterChip(label, value, onRemove) {
    const chip = document.createElement('div');
    chip.className = 'filter-chip';
    
    const labelSpan = document.createElement('span');
    labelSpan.className = 'filter-chip-label';
    labelSpan.textContent = label + ':';
    
    const valueSpan = document.createElement('span');
    valueSpan.className = 'filter-chip-value';
    valueSpan.textContent = value;
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'filter-chip-remove';
    removeBtn.innerHTML = '×';
    removeBtn.title = 'Supprimer le filtre';
    removeBtn.onclick = onRemove;
    
    chip.appendChild(labelSpan);
    chip.appendChild(valueSpan);
    chip.appendChild(removeBtn);
    
    return chip;
}

function removeFilter(filterType) {
    if (filterType === 'category') {
        activeFilters.category = null;
        currentCategoryFilter = '';
        document.getElementById('categoryFilter').value = '';
    }
    
    updateActiveFiltersDisplay();
    
    // Update the views
    const graphView = document.getElementById('graphView');
    if (graphView.classList.contains('active')) {
        updateGraph();
    } else {
        const searchInput = document.getElementById('searchBoxToolbar');
        renderListView(searchInput ? searchInput.value : '');
    }
}

// ===== STORAGE =====
function saveToLocalStorage(silent = false) {
    try {
        localStorage.setItem('papermap_data', JSON.stringify(appData));
        localStorage.setItem('papermap_zones', JSON.stringify(tagZones));
        console.log('Data saved to localStorage:', appData);
        if (!silent) {
            // showNotification('Projet sauvegardé!', 'success');
        }
    } catch (e) {
        showNotification('Erreur lors de la sauvegarde: ' + e.message, 'error');
    }
}

function loadFromLocalStorage() {
    try {
        const saved = localStorage.getItem('papermap_data');
        if (saved) {
            appData = JSON.parse(saved);
        }
        
        // Load tag zones from localStorage
        const savedZones = localStorage.getItem('papermap_zones');
        if (savedZones) {
            tagZones = JSON.parse(savedZones);
        } else {
            // Create zones from existing tags if no zones saved
            initializeZonesFromTags();
        }
    } catch (e) {
        showNotification('Erreur lors du chargement: ' + e.message, 'error');
    }
}

// Initialize tag zones from existing article tags
function initializeZonesFromTags() {
    if (!network || appData.articles.length === 0) return;
    
    // Get all unique tags
    const allTags = new Set();
    appData.articles.forEach(article => {
        article.categories.forEach(tag => allTags.add(tag));
    });
    
    // Create a zone for each tag
    allTags.forEach(tag => {
        // Find all nodes with this tag
        const nodesWithTag = appData.articles.filter(a => a.categories.includes(tag));
        
        if (nodesWithTag.length === 0) return;
        
        // Calculate bounding box
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        nodesWithTag.forEach(article => {
            const pos = network.getPositions([article.id])[article.id];
            if (pos) {
                minX = Math.min(minX, pos.x);
                minY = Math.min(minY, pos.y);
                maxX = Math.max(maxX, pos.x);
                maxY = Math.max(maxY, pos.y);
            }
        });
        
        // Generate a color for this tag (hash-based for consistency)
        const color = generateColorFromString(tag);
        
        // Add padding
        const padding = 100;
        const zone = {
            tag: tag,
            color: color,
            x: minX - padding,
            y: minY - padding,
            width: maxX - minX + padding * 2,
            height: maxY - minY + padding * 2
        };
        
        tagZones.push(zone);
    });
    
    // Save zones
    saveToLocalStorage(true);
}

// Position nodes inside their zones after loading project
function positionNodesInZones() {
    if (!network || tagZones.length === 0) return;
    
    tagZones.forEach(zone => {
        // Find all articles with this tag
        const articlesWithTag = appData.articles.filter(a => a.categories.includes(zone.tag));
        
        if (articlesWithTag.length === 0) return;
        
        // Get zone center
        const zoneCenterX = zone.x + zone.width / 2;
        const zoneCenterY = zone.y + zone.height / 2;
        
        // Calculate grid layout for nodes inside zone
        const padding = 80;
        const nodeSpacing = 150;
        const cols = Math.ceil(Math.sqrt(articlesWithTag.length));
        const rows = Math.ceil(articlesWithTag.length / cols);
        
        // Calculate starting position (top-left of grid, centered in zone)
        const gridWidth = (cols - 1) * nodeSpacing;
        const gridHeight = (rows - 1) * nodeSpacing;
        const startX = zoneCenterX - gridWidth / 2;
        const startY = zoneCenterY - gridHeight / 2;
        
        // Position each node
        articlesWithTag.forEach((article, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            const x = startX + col * nodeSpacing;
            const y = startY + row * nodeSpacing;
            
            // Make sure node stays within zone bounds
            const clampedX = Math.max(zone.x + padding, Math.min(zone.x + zone.width - padding, x));
            const clampedY = Math.max(zone.y + padding, Math.min(zone.y + zone.height - padding, y));
            
            network.moveNode(article.id, clampedX, clampedY);
        });
    });
    
    network.redraw();
}

// Generate consistent color from string (for tag colors)
function generateColorFromString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const h = hash % 360;
    const s = 65 + (hash % 20); // 65-85%
    const l = 65 + (hash % 15); // 65-80%
    
    // Convert HSL to RGB
    const hslToRgb = (h, s, l) => {
        s /= 100;
        l /= 100;
        const k = n => (n + h / 30) % 12;
        const a = s * Math.min(l, 1 - l);
        const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
        return [255 * f(0), 255 * f(8), 255 * f(4)];
    };
    
    const [r, g, b] = hslToRgb(h, s, l);
    return '#' + [r, g, b].map(x => Math.round(x).toString(16).padStart(2, '0')).join('');
}

// ===== EXPORT / IMPORT =====
function newProject() {
    if (confirm('Créer un nouveau projet vide ? Les données non exportées seront perdues.')) {
        appData = {
            articles: [],
            connections: [],
            nextArticleId: 1,
            nextConnectionId: 1
        };
        tagZones = [];
        currentCategoryFilter = '';
        selectedNodeId = null;
        selectedEdgeIndex = -1;
        
        saveToLocalStorage();
        updateCategoryFilters();
        renderListView();
        updateGraph();
        closeArticlePreview();
        
        showNotification('Nouveau projet créé!', 'success');
    }
}

function exportProject() {
    // Include tagZones in the export
    const exportData = {
        ...appData,
        tagZones: tagZones
    };
    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `papermap_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    showNotification('Projet exporté!', 'success');
}

function exportToImage() {
    if (!network) {
        showNotification('Le graphe n\'est pas encore initialisé', 'error');
        return;
    }
    
    const canvas = network.canvas.frame.canvas;
    const url = canvas.toDataURL('image/png');
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `papermap_${new Date().toISOString().split('T')[0]}.png`;
    a.click();
    
    showNotification('Image exportée!', 'success');
}

function importProject(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const imported = JSON.parse(event.target.result);
            
            if (!imported.articles || !imported.connections) {
                throw new Error('Format de fichier invalide');
            }
            
            if (confirm('Cela va remplacer le projet actuel. Continuer ?')) {
                // Extract tagZones if present
                if (imported.tagZones) {
                    tagZones = imported.tagZones;
                    delete imported.tagZones;  // Remove from appData
                } else {
                    // If no zones in file, they will be created from tags
                    tagZones = [];
                }
                
                appData = imported;
                updateGraph();
                renderListView();
                updateCategoryFilters();
                
                // Initialize zones if none were imported
                if (tagZones.length === 0) {
                    initializeZonesFromTags();
                }
                
                saveToLocalStorage();
                showNotification('Projet importé!', 'success');
            }
        } catch (err) {
            showNotification('Erreur lors de l\'import: ' + err.message, 'error');
        }
    };
    reader.readAsText(file);
    
    // Reset file input
    e.target.value = '';
}

// ===== PDF EXPORT =====
function exportToPdf() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    let yPosition = 20;
    const margin = 20;
    const pageWidth = doc.internal.pageSize.width;
    const maxWidth = pageWidth - 2 * margin;
    
    // Title
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('Papermap - Export des Articles', margin, yPosition);
    yPosition += 15;
    
    // Group by category
    const categorized = {};
    const uncategorized = [];
    
    appData.articles.forEach(article => {
        if (article.categories.length === 0) {
            uncategorized.push(article);
        } else {
            article.categories.forEach(cat => {
                if (!categorized[cat]) {
                    categorized[cat] = [];
                }
                categorized[cat].push(article);
            });
        }
    });
    
    // Sort categories
    const sortedCategories = Object.keys(categorized).sort();
    
    // Function to add text with wrapping
    const addText = (text, size, bold = false) => {
        doc.setFontSize(size);
        doc.setFont(undefined, bold ? 'bold' : 'normal');
        const lines = doc.splitTextToSize(text, maxWidth);
        
        lines.forEach(line => {
            if (yPosition > doc.internal.pageSize.height - margin) {
                doc.addPage();
                yPosition = margin;
            }
            doc.text(line, margin, yPosition);
            yPosition += size * 0.5;
        });
        yPosition += 3;
    };
    
    // Add categorized articles
    sortedCategories.forEach(category => {
        addText(`Catégorie: ${category}`, 14, true);
        yPosition += 3;
        
        categorized[category].forEach(article => {
            addText(article.title, 12, true);
            
            if (article.text) {
                addText(article.text, 10);
            }
            
            if (article.customFields && Object.keys(article.customFields).length > 0) {
                Object.entries(article.customFields).forEach(([key, value]) => {
                    addText(`${key}: ${value}`, 9);
                });
            }
            
            yPosition += 5;
        });
        
        yPosition += 5;
    });
    
    // Add uncategorized articles
    if (uncategorized.length > 0) {
        addText('Sans catégorie', 14, true);
        yPosition += 3;
        
        uncategorized.forEach(article => {
            addText(article.title, 12, true);
            
            if (article.text) {
                addText(article.text, 10);
            }
            
            if (article.customFields && Object.keys(article.customFields).length > 0) {
                Object.entries(article.customFields).forEach(([key, value]) => {
                    addText(`${key}: ${value}`, 9);
                });
            }
            
            yPosition += 5;
        });
    }
    
    // Save PDF
    doc.save(`papermap_export_${new Date().toISOString().split('T')[0]}.pdf`);
    showNotification('PDF exporté!', 'success');
}

// ===== NOTIFICATIONS =====
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ===== RADIAL MENU =====
function showRadialMenu(x, y, nodeId, nodeWidth = 100, nodeHeight = 50) {
    const menu = document.getElementById('radialMenu');
    
    // Clear any previous pulse animation and reset previous node
    if (currentPulseInterval) {
        clearInterval(currentPulseInterval);
        currentPulseInterval = null;
    }
    
    // Reset the previously selected node if any
    if (selectedNodeId !== null && selectedNodeId !== nodeId && network && network.body.nodes[selectedNodeId]) {
        const prevNode = network.body.nodes[selectedNodeId];
        if (prevNode && prevNode.options) {
            prevNode.options.shadow = false;
            prevNode.options.borderWidth = 3;
        }
    }
    
    // Position buttons AROUND the box, not in a circle
    // Calculate positions based on actual node dimensions
    const padding = 15; // Distance from node edge to button
    
    // Position individual buttons around the node box
    const connectBtn = document.querySelector('.radial-connect');
    const deleteBtn = document.querySelector('.radial-delete');
    
    // Right center (connect/lien)
    connectBtn.style.left = (x + nodeWidth/2 + padding) + 'px';
    connectBtn.style.top = (y - 22) + 'px';
    
    // Left center (delete)
    deleteBtn.style.left = (x - nodeWidth/2 - padding - 44) + 'px';
    deleteBtn.style.top = (y - 22) + 'px';
    
    // Force reflow to restart animation
    menu.classList.remove('active');
    void menu.offsetWidth; // Trigger reflow
    menu.classList.add('active');
    
    // Apply pulse effect only to the selected node
    if (network && nodeId !== null) {
        const node = network.body.nodes[nodeId];
        if (node) {
            let intensity = 0.2;
            let growing = true;
            
            currentPulseInterval = setInterval(() => {
                if (!document.getElementById('radialMenu').classList.contains('active')) {
                    clearInterval(currentPulseInterval);
                    currentPulseInterval = null;
                    return;
                }
                
                if (growing) {
                    intensity += 0.05;
                    if (intensity >= 0.7) growing = false;
                } else {
                    intensity -= 0.05;
                    if (intensity <= 0.2) growing = true;
                }
                
                if (node.options) {
                    node.options.shadow = {
                        enabled: true,
                        color: `rgba(74, 144, 226, ${intensity})`,
                        size: 15 + intensity * 15,
                        x: 0,
                        y: 0
                    };
                    
                    node.options.borderWidth = 3 + intensity * 2;
                }
                
                network.redraw();
            }, 80);
        }
    }
}

function updateRadialMenuPosition(x, y, nodeWidth, nodeHeight) {
    const padding = 15;
    
    const connectBtn = document.querySelector('.radial-connect');
    const deleteBtn = document.querySelector('.radial-delete');
    
    // Right center (connect/lien)
    connectBtn.style.left = (x + nodeWidth/2 + padding) + 'px';
    connectBtn.style.top = (y - 22) + 'px';
    
    // Left center (delete)
    deleteBtn.style.left = (x - nodeWidth/2 - padding - 44) + 'px';
    deleteBtn.style.top = (y - 22) + 'px';
}

function updateRadialMenuIfActive() {
    // Only update if menu is active and a node is selected
    if (!document.getElementById('radialMenu').classList.contains('active') || !selectedNodeId) {
        return;
    }
    
    // Get updated node position
    const nodePosition = network.getPositions([selectedNodeId])[selectedNodeId];
    if (!nodePosition) return;
    
    const canvasPosition = network.canvasToDOM(nodePosition);
    
    const container = document.getElementById('graphContainer');
    const rect = container.getBoundingClientRect();
    
    const screenX = rect.left + canvasPosition.x;
    const screenY = rect.top + canvasPosition.y;
    
    // Get node dimensions
    const node = network.body.nodes[selectedNodeId];
    if (!node) return;
    
    const nodeWidth = node.shape.width || 100;
    const nodeHeight = node.shape.height || 50;
    
    // Update button positions
    updateRadialMenuPosition(screenX, screenY, nodeWidth, nodeHeight);
}

function hideRadialMenu() {
    const menu = document.getElementById('radialMenu');
    menu.classList.remove('active');
    
    // Clear pulse interval
    if (currentPulseInterval) {
        clearInterval(currentPulseInterval);
        currentPulseInterval = null;
    }
    
    // Reset only the selected node (not all nodes)
    if (selectedNodeId !== null && network && network.body.nodes[selectedNodeId]) {
        const node = network.body.nodes[selectedNodeId];
        if (node && node.options) {
            node.options.shadow = false;
            node.options.borderWidth = 3;
        }
        network.redraw();
    }
    
    selectedNodeId = null;
    
    // Re-enable node dragging and canvas interactions
    if (network) {
        network.setOptions({ 
            interaction: { 
                dragNodes: true,
                dragView: true,
                zoomView: true,
                hover: true,
                tooltipDelay: 200
            } 
        });
    }
}

// ===== TOOLBAR =====
function toggleCategoryDropdown() {
    // Toggle the category dropdown for both graph and list views
    const dropdown = document.getElementById('categoryDropdown');
    dropdown.classList.toggle('active');
}

// ===== QUICK TAG MODAL =====
function openQuickTagModal(articleId) {
    const article = appData.articles.find(a => a.id === articleId);
    if (!article) return;
    
    const newTag = prompt('Ajouter une catégorie:', '');
    if (newTag && newTag.trim()) {
        if (!article.categories.includes(newTag.trim())) {
            article.categories.push(newTag.trim());
            updateGraph();
            renderListView();
            updateCategoryFilters();
            saveToLocalStorage();
            showNotification('Catégorie ajoutée!', 'success');
        }
    }
}

// ===== CONNECTION MODE =====
function startConnectionMode(fromNodeId) {
    connectionMode.active = true;
    connectionMode.fromNodeId = fromNodeId;
    connectionMode.hoveredNodeId = null;
    
    // Show indicator
    document.getElementById('connectionModeIndicator').classList.add('active');
    
    // Change cursor and disable edge hover completely
    if (network) {
        network.canvas.body.container.style.cursor = 'crosshair';
        network.setOptions({
            interaction: {
                hover: true,
                hoverConnectedEdges: false,
                selectConnectedEdges: false
            },
            edges: {
                hoverWidth: 0,
                selectionWidth: 0,
                color: {
                    hover: '#848484'  // Keep same color on hover (no effect)
                }
            }
        });
        
        // Create temporary invisible node that will follow cursor
        const tempNodeId = 'temp-cursor-node';
        connectionMode.tempNode = tempNodeId;
        
        // Get source node position to initialize temp node
        const sourcePos = network.getPositions([fromNodeId])[fromNodeId];
        
        network.body.data.nodes.add({
            id: tempNodeId,
            x: sourcePos.x,
            y: sourcePos.y,
            shape: 'dot',
            size: 1,
            physics: false,
            opacity: 0,
            color: {
                background: 'transparent',
                border: 'transparent'
            }
        });
        
        // Create temporary preview edge
        const tempEdgeId = 'temp-connection-preview';
        connectionMode.tempEdge = tempEdgeId;
        
        // Add temporary edge to network
        network.body.data.edges.add({
            id: tempEdgeId,
            from: fromNodeId,
            to: tempNodeId,
            color: {
                color: '#3498db',
                opacity: 0.5
            },
            dashes: [5, 5],
            width: 2,
            arrows: {
                to: {
                    enabled: true,
                    scaleFactor: 0.5
                }
            },
            physics: false,
            smooth: false
        });
        
        // Update temp node position on mouse move
        const canvas = network.canvas.frame.canvas;
        connectionMode.mouseMoveHandler = function(event) {
            if (!connectionMode.active) return;
            
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            
            // Convert DOM coordinates to canvas coordinates
            const canvasPos = network.DOMtoCanvas({x: x, y: y});
            
            // Update temp node position if not hovering a target node
            if (!connectionMode.hoveredNodeId) {
                network.body.data.nodes.update({
                    id: tempNodeId,
                    x: canvasPos.x,
                    y: canvasPos.y
                });
            }
        };
        
        canvas.addEventListener('mousemove', connectionMode.mouseMoveHandler);
        
        // Track hover on nodes for snapping
        connectionMode.hoverHandler = function(params) {
            if (connectionMode.active && params.node !== connectionMode.fromNodeId) {
                connectionMode.hoveredNodeId = params.node;
                // Snap to hovered node
                network.body.data.edges.update({
                    id: tempEdgeId,
                    to: params.node,
                    color: {
                        color: '#27ae60',
                        opacity: 0.7
                    }
                });
            }
        };
        
        connectionMode.blurHandler = function() {
            if (connectionMode.active) {
                connectionMode.hoveredNodeId = null;
                // Revert to following cursor via temp node
                network.body.data.edges.update({
                    id: tempEdgeId,
                    to: tempNodeId,
                    color: {
                        color: '#3498db',
                        opacity: 0.5
                    }
                });
            }
        };
        
        network.on('hoverNode', connectionMode.hoverHandler);
        network.on('blurNode', connectionMode.blurHandler);
    }
    
    // Highlight other nodes with animation
    const nodes = network.body.data.nodes;
    nodes.forEach(node => {
        if (node.id !== fromNodeId) {
            network.body.nodes[node.id].shape.boundingBox.left += Math.random() * 4 - 2;
        }
    });
    
    showNotification('Cliquez sur un nœud pour créer la connexion', 'info');
}

function handleConnectionModeClick(params) {
    if (params.nodes.length > 0) {
        const toNodeId = params.nodes[0];
        
        // Ignore click on temp cursor node
        if (toNodeId === connectionMode.tempNode) {
            return;
        }
        
        if (toNodeId === connectionMode.fromNodeId) {
            showNotification('Un article ne peut pas se connecter à lui-même', 'error');
            return;
        }
        
        // Check if connection already exists
        const exists = appData.connections.some(c => 
            c.from === connectionMode.fromNodeId && c.to === toNodeId
        );
        
        if (exists) {
            showNotification('Cette connexion existe déjà', 'error');
            cancelConnectionMode();
            return;
        }
        
        // Remove temporary preview edge before creating real connection
        if (connectionMode.tempEdge && network) {
            try {
                network.body.data.edges.remove(connectionMode.tempEdge);
            } catch (e) {
                // Edge may not exist
            }
            connectionMode.tempEdge = null;
        }
        
        // Remove temporary cursor node
        if (connectionMode.tempNode && network) {
            try {
                network.body.data.nodes.remove(connectionMode.tempNode);
            } catch (e) {
                // Node may not exist
            }
            connectionMode.tempNode = null;
        }
        
        // Create connection directly without label
        connectionMode.toNodeId = toNodeId;
        createConnection('');
    } else {
        // Clicked in empty space - cancel
        cancelConnectionMode();
    }
}

function cancelConnectionMode() {
    connectionMode.active = false;
    connectionMode.fromNodeId = null;
    connectionMode.toNodeId = null;
    connectionMode.hoveredNodeId = null;
    
    // Remove mouse move listener
    if (connectionMode.mouseMoveHandler && network) {
        const canvas = network.canvas.frame.canvas;
        canvas.removeEventListener('mousemove', connectionMode.mouseMoveHandler);
        connectionMode.mouseMoveHandler = null;
    }
    
    // Remove hover listeners
    if (connectionMode.hoverHandler && network) {
        network.off('hoverNode', connectionMode.hoverHandler);
        connectionMode.hoverHandler = null;
    }
    if (connectionMode.blurHandler && network) {
        network.off('blurNode', connectionMode.blurHandler);
        connectionMode.blurHandler = null;
    }
    
    // Remove temporary preview edge
    if (connectionMode.tempEdge && network) {
        try {
            network.body.data.edges.remove(connectionMode.tempEdge);
        } catch (e) {
            // Edge may not exist
        }
    }
    connectionMode.tempEdge = null;
    
    // Remove temporary cursor node
    if (connectionMode.tempNode && network) {
        try {
            network.body.data.nodes.remove(connectionMode.tempNode);
        } catch (e) {
            // Node may not exist
        }
    }
    connectionMode.tempNode = null;
    
    document.getElementById('connectionModeIndicator').classList.remove('active');
    
    if (network) {
        network.canvas.body.container.style.cursor = 'default';
        // Re-enable edge hover
        network.setOptions({
            interaction: {
                hover: true,
                hoverConnectedEdges: true,
                selectConnectedEdges: true
            },
            edges: {
                hoverWidth: function(width) { return width + 0.5; },
                selectionWidth: function(width) { return width + 1; },
                color: {
                    hover: '#4a90e2'
                }
            }
        });
    }
}

// ===== MULTI-SELECTION FUNCTIONS =====
function startSelectionBox(event) {
    if (connectionMode.active) return;
    
    multiSelection.active = true;
    
    // Disable vis-network interactions during selection
    network.setOptions({
        interaction: {
            dragNodes: false,
            dragView: false,
            zoomView: false,
            hover: false
        }
    });
    
    const canvas = network.canvas.frame.canvas;
    const rect = canvas.getBoundingClientRect();
    
    multiSelection.startX = event.clientX - rect.left;
    multiSelection.startY = event.clientY - rect.top;
    
    // Create selection box element
    if (!multiSelection.selectionBox) {
        multiSelection.selectionBox = document.createElement('div');
        multiSelection.selectionBox.id = 'selectionBox';
        multiSelection.selectionBox.style.position = 'absolute';
        multiSelection.selectionBox.style.border = '2px dashed #4a90e2';
        multiSelection.selectionBox.style.backgroundColor = 'rgba(74, 144, 226, 0.1)';
        multiSelection.selectionBox.style.pointerEvents = 'none';
        multiSelection.selectionBox.style.zIndex = '1000';
        canvas.parentElement.appendChild(multiSelection.selectionBox);
    }
    
    // Reset box style for new selection
    multiSelection.selectionBox.style.border = '2px dashed #4a90e2';
    multiSelection.selectionBox.style.left = multiSelection.startX + 'px';
    multiSelection.selectionBox.style.top = multiSelection.startY + 'px';
    multiSelection.selectionBox.style.width = '0px';
    multiSelection.selectionBox.style.height = '0px';
    multiSelection.selectionBox.style.display = 'block';
}

function updateSelectionBox(event) {
    if (!multiSelection.active || !multiSelection.selectionBox) return;
    
    const canvas = network.canvas.frame.canvas;
    const rect = canvas.getBoundingClientRect();
    const currentX = event.clientX - rect.left;
    const currentY = event.clientY - rect.top;
    
    const left = Math.min(multiSelection.startX, currentX);
    const top = Math.min(multiSelection.startY, currentY);
    const width = Math.abs(currentX - multiSelection.startX);
    const height = Math.abs(currentY - multiSelection.startY);
    
    multiSelection.selectionBox.style.left = left + 'px';
    multiSelection.selectionBox.style.top = top + 'px';
    multiSelection.selectionBox.style.width = width + 'px';
    multiSelection.selectionBox.style.height = height + 'px';
}

function endSelectionBox() {
    if (!multiSelection.active) return;
    
    const canvas = network.canvas.frame.canvas;
    const rect = canvas.getBoundingClientRect();
    
    // Get box dimensions in DOM coordinates (relative to canvas)
    const boxLeft = parseFloat(multiSelection.selectionBox.style.left);
    const boxTop = parseFloat(multiSelection.selectionBox.style.top);
    const boxWidth = parseFloat(multiSelection.selectionBox.style.width);
    const boxHeight = parseFloat(multiSelection.selectionBox.style.height);
    
    console.log('Selection box DOM coords:', { boxLeft, boxTop, boxWidth, boxHeight });
    
    // Convert to canvas coordinates
    const topLeft = network.DOMtoCanvas({ 
        x: boxLeft, 
        y: boxTop 
    });
    const bottomRight = network.DOMtoCanvas({ 
        x: boxLeft + boxWidth, 
        y: boxTop + boxHeight 
    });
    
    console.log('Selection box canvas coords:', { topLeft, bottomRight });
    
    // Find all nodes within the selection box
    multiSelection.selectedNodes = [];
    appData.articles.forEach(article => {
        const pos = network.getPositions([article.id])[article.id];
        if (pos) {
            console.log(`Node ${article.id} at:`, pos);
            if (pos.x >= topLeft.x && pos.x <= bottomRight.x &&
                pos.y >= topLeft.y && pos.y <= bottomRight.y) {
                multiSelection.selectedNodes.push(article.id);
                console.log(`  -> Selected!`);
            }
        }
    });
    
    console.log('Selected nodes:', multiSelection.selectedNodes);
    
    // Keep selection box visible (don't hide it)
    // Keep border dashed (animated) - don't change to solid
    if (multiSelection.selectionBox) {
        // Already dashed, keep it as is
        multiSelection.selectionBox.style.border = '2px dashed #4a90e2';
    }
    multiSelection.active = false;
    
    // Re-enable vis-network interactions
    network.setOptions({
        interaction: {
            dragNodes: true,
            dragView: false,
            zoomView: true,
            hover: true,
            hoverConnectedEdges: true,
            selectConnectedEdges: true,
            multiselect: true,
            selectable: true
        }
    });
    
    // If nodes were selected, show radial menu above selection
    if (multiSelection.selectedNodes.length > 0) {
        // Highlight selected nodes
        network.selectNodes(multiSelection.selectedNodes);
        
        // Position menu above center of selection box
        const menuX = rect.left + boxLeft + boxWidth / 2;
        const menuY = rect.top + boxTop - 30; // 30px above the selection box
        
        showSelectionRadialMenu(menuX, menuY);
    }
}

function showSelectionRadialMenu(x, y) {
    multiSelection.menuActive = true;
    
    // Create container for radial menu buttons
    const menuContainer = document.createElement('div');
    menuContainer.id = 'selectionRadialMenu';
    menuContainer.style.position = 'fixed';
    menuContainer.style.pointerEvents = 'none';
    menuContainer.style.zIndex = '10000';
    document.body.appendChild(menuContainer);
    
    // Button configurations
    const buttons = [
        {
            id: 'selection-tag-btn',
            icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                <line x1="7" y1="7" x2="7.01" y2="7"/>
            </svg>`,
            action: openMultiTagDialog,
            hoverColor: '#27ae60',
            offsetX: -50,
            offsetY: 0
        },
        {
            id: 'selection-delete-btn',
            icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                <line x1="10" y1="11" x2="10" y2="17"/>
                <line x1="14" y1="11" x2="14" y2="17"/>
            </svg>`,
            action: deleteSelectedNodes,
            hoverColor: '#e74c3c',
            offsetX: 50,
            offsetY: 0
        }
    ];
    
    // Create buttons
    buttons.forEach((btnConfig, index) => {
        const btn = document.createElement('button');
        btn.id = btnConfig.id;
        btn.className = 'selection-radial-btn';
        btn.innerHTML = btnConfig.icon;
        btn.style.position = 'fixed';
        btn.style.width = '44px';
        btn.style.height = '44px';
        btn.style.borderRadius = '50%';
        btn.style.border = 'none';
        btn.style.background = 'white';
        btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.25)';
        btn.style.cursor = 'pointer';
        btn.style.display = 'flex';
        btn.style.alignItems = 'center';
        btn.style.justifyContent = 'center';
        btn.style.color = '#333';
        btn.style.transition = 'transform 0.2s, box-shadow 0.2s, background 0.2s, color 0.2s';
        btn.style.pointerEvents = 'all';
        btn.style.left = (x + btnConfig.offsetX) + 'px';
        btn.style.top = (y + btnConfig.offsetY) + 'px';
        btn.style.opacity = '0';
        btn.style.transform = 'scale(0)';
        
        // Hover effect
        btn.addEventListener('mouseenter', () => {
            btn.style.background = btnConfig.hoverColor;
            btn.style.color = 'white';
            btn.style.transform = 'scale(1.15)';
            btn.style.boxShadow = '0 6px 16px rgba(0,0,0,0.35)';
        });
        
        btn.addEventListener('mouseleave', () => {
            btn.style.background = 'white';
            btn.style.color = '#333';
            btn.style.transform = 'scale(1)';
            btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.25)';
        });
        
        btn.addEventListener('click', () => {
            btnConfig.action();
        });
        
        menuContainer.appendChild(btn);
        
        // Animate button appearance
        setTimeout(() => {
            btn.style.opacity = '1';
            btn.style.transform = 'scale(1)';
        }, index * 50);
    });
    
    // Add keyboard handler for Delete/Backspace
    const keyHandler = (e) => {
        if (multiSelection.menuActive && (e.key === 'Delete' || e.key === 'Backspace')) {
            e.preventDefault();
            deleteSelectedNodes();
            document.removeEventListener('keydown', keyHandler);
        } else if (e.key === 'Escape') {
            hideSelectionRadialMenu();
            document.removeEventListener('keydown', keyHandler);
        }
    };
    document.addEventListener('keydown', keyHandler);
    
    // Store handler so we can remove it later
    menuContainer.dataset.keyHandler = 'active';
}

function hideSelectionRadialMenu() {
    const menu = document.getElementById('selectionRadialMenu');
    if (menu) {
        menu.remove();
    }
    multiSelection.menuActive = false;
    
    // Hide selection box
    if (multiSelection.selectionBox) {
        multiSelection.selectionBox.style.display = 'none';
        // Reset border to dashed for next selection
        multiSelection.selectionBox.style.border = '2px dashed #4a90e2';
    }
    
    // Deselect nodes
    if (network) {
        network.unselectAll();
    }
    multiSelection.selectedNodes = [];
}

function openMultiTagDialog() {
    // Save selected nodes before hiding menu (which clears the selection)
    const savedSelectedNodes = [...multiSelection.selectedNodes];
    
    console.log('Opening tag dialog, saved nodes:', savedSelectedNodes);
    
    hideSelectionRadialMenu();
    
    // Restore selected nodes
    multiSelection.selectedNodes = savedSelectedNodes;
    
    // Default color palette
    const defaultColors = [
        '#e74c3c', // red
        '#f39c12', // orange
        '#f1c40f', // yellow
        '#2ecc71', // green
        '#1abc9c', // turquoise
        '#3498db', // blue
        '#9b59b6'  // purple
    ];
    
    // Create modal for tag input
    const modal = document.createElement('div');
    modal.id = 'multiTagModal';
    modal.style.position = 'fixed';
    modal.style.top = '50%';
    modal.style.left = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.backgroundColor = 'white';
    modal.style.border = '2px solid #4a90e2';
    modal.style.borderRadius = '12px';
    modal.style.padding = '24px';
    modal.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)';
    modal.style.zIndex = '10001';
    modal.style.minWidth = '340px';
    
    // Generate color palette HTML
    const colorPaletteHTML = defaultColors.map(color => 
        `<div class="color-option" data-color="${color}" 
              style="width: 28px; height: 28px; background: ${color}; border-radius: 6px; cursor: pointer; 
                     border: 2px solid transparent; transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
         </div>`
    ).join('');
    
    modal.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 15px; color: #2c3e50; font-size: 1.1rem;">
            Ajouter un tag
        </div>
        <div style="color: #666; margin-bottom: 15px; font-size: 0.9rem;">
            ${multiSelection.selectedNodes.length} nœud(s) sélectionné(s)
        </div>
        <input type="text" id="multiTagInput" placeholder="Nom du tag" 
               style="width: 100%; padding: 10px; margin-bottom: 15px; border: 2px solid #ddd; border-radius: 8px; font-size: 0.95rem;">
        <div style="margin-bottom: 15px;">
            <label style="display: block; margin-bottom: 8px; color: #666; font-size: 0.9rem; font-weight: 600;">Couleur du tag :</label>
            <div id="colorPalette" style="display: grid; grid-template-columns: repeat(8, 1fr); gap: 6px;">
                ${colorPaletteHTML}
                <div class="color-option color-picker-option" id="customColorOption"
                     style="width: 28px; height: 28px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 6px; cursor: pointer; 
                            border: 2px solid transparent; transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.1); position: relative; display: flex; align-items: center; justify-content: center;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
                        <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
                    </svg>
                </div>
            </div>
            <div id="customColorPicker" style="display: none; margin-top: 12px; padding: 12px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e0e0e0;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <input type="color" id="colorPickerInput" value="#4a90e2" style="width: 48px; height: 48px; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;">
                    <input type="text" id="colorHex" value="#4a90e2" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-family: monospace; font-size: 0.9rem;">
                </div>
            </div>
        </div>
        <div style="display: flex; gap: 10px;">
            <button id="cancelMultiTag" style="flex: 1; padding: 10px; background: #e0e0e0; color: #333; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.95rem;">
                Annuler
            </button>
            <button id="applyMultiTag" style="flex: 1; padding: 10px; background: #4a90e2; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.95rem;">
                Appliquer
            </button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Track selected color (default to first color)
    let selectedColor = defaultColors[0];
    
    // Focus on input
    document.getElementById('multiTagInput').focus();
    
    // Color palette selection
    const colorOptions = document.querySelectorAll('.color-option:not(#customColorOption)');
    const customColorOption = document.getElementById('customColorOption');
    const customColorPickerDiv = document.getElementById('customColorPicker');
    const colorPickerInput = document.getElementById('colorPickerInput');
    const colorHex = document.getElementById('colorHex');
    
    // Update from color picker (only if elements exist)
    if (colorPickerInput && colorHex) {
        colorPickerInput.addEventListener('input', (e) => {
            selectedColor = e.target.value;
            colorHex.value = selectedColor;
            customColorOption.style.background = selectedColor;
        });
        
        // Update from hex input
        colorHex.addEventListener('input', (e) => {
            const hex = e.target.value;
            if (/^#[0-9A-F]{6}$/i.test(hex)) {
                selectedColor = hex;
                colorPickerInput.value = hex;
                customColorOption.style.background = hex;
            }
        });
    }
    
    colorOptions.forEach((option, index) => {
        // Select first color by default
        if (index === 0) {
            option.style.border = '2px solid #2c3e50';
            option.style.transform = 'scale(1.1)';
        }
        
        option.addEventListener('click', () => {
            // Hide custom color picker
            customColorPickerDiv.style.display = 'none';
            // Deselect all
            document.querySelectorAll('.color-option').forEach(opt => {
                opt.style.border = '2px solid transparent';
                opt.style.transform = 'scale(1)';
            });
            // Select clicked
            option.style.border = '2px solid #2c3e50';
            option.style.transform = 'scale(1.1)';
            selectedColor = option.getAttribute('data-color');
            console.log('Color selected from palette:', selectedColor);
        });
        
        // Hover effect
        option.addEventListener('mouseenter', () => {
            if (option.style.border !== '2px solid #2c3e50') {
                option.style.transform = 'scale(1.05)';
            }
        });
        option.addEventListener('mouseleave', () => {
            if (option.style.border !== '2px solid #2c3e50') {
                option.style.transform = 'scale(1)';
            }
        });
    });
    
    // Custom color option - toggle RGB picker
    customColorOption.addEventListener('click', () => {
        const isVisible = customColorPickerDiv.style.display !== 'none';
        customColorPickerDiv.style.display = isVisible ? 'none' : 'block';
        
        if (!isVisible) {
            // Deselect all palette colors
            document.querySelectorAll('.color-option:not(#customColorOption)').forEach(opt => {
                opt.style.border = '2px solid transparent';
                opt.style.transform = 'scale(1)';
            });
            // Select custom option
            customColorOption.style.border = '2px solid #2c3e50';
            customColorOption.style.transform = 'scale(1.1)';
            // Update selected color to current picker value
            selectedColor = colorPickerInput.value;
            // Auto-open the color picker
            setTimeout(() => {
                colorPickerInput.click();
            }, 100);
        }
    });
    
    customColorOption.addEventListener('mouseenter', () => {
        if (customColorOption.style.border !== '2px solid #2c3e50') {
            customColorOption.style.transform = 'scale(1.05)';
        }
    });
    
    customColorOption.addEventListener('mouseleave', () => {
        if (customColorOption.style.border !== '2px solid #2c3e50') {
            customColorOption.style.transform = 'scale(1)';
        }
    });
    
    // Event listeners
    document.getElementById('applyMultiTag').addEventListener('click', () => {
        console.log('Apply button clicked, selectedColor:', selectedColor);
        applyMultiTagFromDialog(selectedColor);
    });
    document.getElementById('cancelMultiTag').addEventListener('click', closeMultiTagDialog);
    
    // Close on escape
    const escapeHandler = (e) => {
        if (e.key === 'Escape') {
            closeMultiTagDialog();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
    
    // Apply on enter
    document.getElementById('multiTagInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            console.log('Enter pressed, selectedColor:', selectedColor);
            applyMultiTagFromDialog(selectedColor);
        }
    });
}

function closeMultiTagDialog() {
    const modal = document.getElementById('multiTagModal');
    if (modal) {
        modal.remove();
    }
    
    // Hide selection box
    if (multiSelection.selectionBox) {
        multiSelection.selectionBox.style.display = 'none';
        multiSelection.selectionBox.style.border = '2px dashed #4a90e2';
    }
    
    // Deselect nodes
    if (network) {
        network.unselectAll();
    }
    multiSelection.selectedNodes = [];
}

function applyMultiTagFromDialog(tagColor) {
    const tagName = document.getElementById('multiTagInput').value.trim();
    
    console.log('applyMultiTagFromDialog called with color:', tagColor);
    console.log('Tag name:', tagName);
    console.log('Selected nodes:', multiSelection.selectedNodes);
    
    if (!tagName) {
        showNotification('Veuillez entrer un nom de tag', 'error');
        return;
    }
    
    // Use default color if not provided
    if (!tagColor) {
        tagColor = '#e74c3c'; // Default red
        console.log('No color provided, using default:', tagColor);
    }
    
    // Calculate bounding box for selected nodes
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    multiSelection.selectedNodes.forEach(nodeId => {
        const pos = network.getPositions([nodeId])[nodeId];
        if (pos) {
            minX = Math.min(minX, pos.x);
            minY = Math.min(minY, pos.y);
            maxX = Math.max(maxX, pos.x);
            maxY = Math.max(maxY, pos.y);
        }
    });
    
    // Add padding to the zone
    const padding = 100;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;
    
    // Create tag zone
    const zone = {
        tag: tagName,
        color: tagColor,
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
    };
    
    // Check if zone already exists for this tag, update it
    const existingIndex = tagZones.findIndex(z => z.tag === tagName);
    if (existingIndex >= 0) {
        tagZones[existingIndex] = zone;
    } else {
        tagZones.push(zone);
    }
    
    // Apply tag to all selected nodes
    multiSelection.selectedNodes.forEach(nodeId => {
        const article = appData.articles.find(a => a.id === nodeId);
        if (article) {
            if (!article.categories.includes(tagName)) {
                article.categories.push(tagName);
            }
            // Update node color
            network.body.data.nodes.update({
                id: nodeId,
                color: {
                    background: tagColor,
                    border: darkenColor(tagColor, 20)
                }
            });
        }
    });
    
    saveToLocalStorage();
    updateCategoryFilters();
    renderListView();
    
    // Redraw to show the zone
    network.redraw();
    
    // Hide selection box
    if (multiSelection.selectionBox) {
        multiSelection.selectionBox.style.display = 'none';
        multiSelection.selectionBox.style.border = '2px dashed #4a90e2';
    }
    
    // Save count before closing (which clears the selection)
    const appliedCount = multiSelection.selectedNodes.length;
    
    showNotification(`Tag "${tagName}" appliqué à ${appliedCount} nœud(s)`, 'success');
    closeMultiTagDialog();
}

function deleteSelectedNodes() {
    if (multiSelection.selectedNodes.length === 0) return;
    
    const count = multiSelection.selectedNodes.length;
    const message = count === 1 
        ? 'Voulez-vous vraiment supprimer ce nœud ?' 
        : `Voulez-vous vraiment supprimer ces ${count} nœuds ?`;
    
    if (!confirm(message)) {
        hideSelectionRadialMenu();
        return;
    }
    
    // Delete all selected nodes
    multiSelection.selectedNodes.forEach(nodeId => {
        // Remove article
        const articleIndex = appData.articles.findIndex(a => a.id === nodeId);
        if (articleIndex >= 0) {
            appData.articles.splice(articleIndex, 1);
        }
        
        // Remove connections
        appData.connections = appData.connections.filter(
            conn => conn.from !== nodeId && conn.to !== nodeId
        );
    });
    
    // Check and remove tags that have no more articles
    const allArticleTags = new Set();
    appData.articles.forEach(article => {
        if (article.tags && Array.isArray(article.tags)) {
            article.tags.forEach(tag => allArticleTags.add(tag));
        }
    });
    
    // Remove tags that are no longer used
    if (appData.tags) {
        const removedTags = [];
        appData.tags = appData.tags.filter(tag => {
            const isUsed = allArticleTags.has(tag.name);
            if (!isUsed) {
                removedTags.push(tag.name);
            }
            return isUsed;
        });
        
        if (removedTags.length > 0) {
            console.log('Tags supprimés (plus d\'articles):', removedTags);
        }
    }
    
    // Also check and remove categories/zones that have no more articles
    const allArticleCategories = new Set();
    appData.articles.forEach(article => {
        if (article.categories && Array.isArray(article.categories)) {
            article.categories.forEach(cat => allArticleCategories.add(cat));
        }
    });
    
    console.log('Categories restantes:', Array.from(allArticleCategories));
    console.log('Zones avant filtrage:', tagZones.map(z => z.tag));
    
    // Remove tag zones that are no longer used
    const removedZones = [];
    tagZones = tagZones.filter(zone => {
        const isUsed = allArticleCategories.has(zone.tag);
        if (!isUsed) {
            removedZones.push(zone.tag);
        }
        return isUsed;
    });
    
    console.log('Zones après filtrage:', tagZones.map(z => z.tag));
    if (removedZones.length > 0) {
        console.log('Zones supprimées (plus d\'articles):', removedZones);
    }
    
    hideSelectionRadialMenu();
    updateGraph();
    renderListView();
    saveToLocalStorage();
    
    // Force redraw to update zones
    if (network) {
        network.redraw();
    }
    
    showNotification(`${count} nœud(s) supprimé(s)`, 'success');
}

function showMultiTagMenu(x, y) {
    // Remove existing menu if any
    const existingMenu = document.getElementById('multiTagMenu');
    if (existingMenu) {
        existingMenu.remove();
    }
    
    // Create menu
    const menu = document.createElement('div');
    menu.id = 'multiTagMenu';
    menu.style.position = 'fixed';
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.style.backgroundColor = 'white';
    menu.style.border = '2px solid #4a90e2';
    menu.style.borderRadius = '10px';
    menu.style.padding = '15px';
    menu.style.boxShadow = '0 4px 12px rgba(0,0,0,0.25)';
    menu.style.zIndex = '10000';
    menu.style.minWidth = '200px';
    
    menu.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 10px; color: #333;">
            ${multiSelection.selectedNodes.length} nœud(s) sélectionné(s)
        </div>
        <input type="text" id="multiTagInput" placeholder="Nom du tag" 
               style="width: 100%; padding: 8px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 5px;">
        <input type="color" id="multiTagColor" value="#4a90e2" 
               style="width: 100%; height: 40px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 5px; cursor: pointer;">
        <div style="display: flex; gap: 10px;">
            <button id="applyMultiTag" style="flex: 1; padding: 8px; background: #4a90e2; color: white; border: none; border-radius: 5px; cursor: pointer;">
                Appliquer
            </button>
            <button id="cancelMultiTag" style="flex: 1; padding: 8px; background: #ccc; color: #333; border: none; border-radius: 5px; cursor: pointer;">
                Annuler
            </button>
        </div>
    `;
    
    document.body.appendChild(menu);
    
    // Focus on input
    document.getElementById('multiTagInput').focus();
    
    // Event listeners
    document.getElementById('applyMultiTag').addEventListener('click', applyMultiTag);
    document.getElementById('cancelMultiTag').addEventListener('click', closeMultiTagMenu);
    
    // Close on escape
    const escapeHandler = (e) => {
        if (e.key === 'Escape') {
            closeMultiTagMenu();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
    
    // Apply on enter
    document.getElementById('multiTagInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            applyMultiTag();
        }
    });
}

function applyMultiTag() {
    const tagName = document.getElementById('multiTagInput').value.trim();
    const tagColor = document.getElementById('multiTagColor').value;
    
    if (!tagName) {
        showNotification('Veuillez entrer un nom de tag', 'error');
        return;
    }
    
    // Calculate bounding box for selected nodes
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    multiSelection.selectedNodes.forEach(nodeId => {
        const pos = network.getPositions([nodeId])[nodeId];
        if (pos) {
            minX = Math.min(minX, pos.x);
            minY = Math.min(minY, pos.y);
            maxX = Math.max(maxX, pos.x);
            maxY = Math.max(maxY, pos.y);
        }
    });
    
    // Add padding to the zone
    const padding = 100;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;
    
    // Create tag zone
    const zone = {
        tag: tagName,
        color: tagColor,
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
    };
    
    // Check if zone already exists for this tag, update it
    const existingIndex = tagZones.findIndex(z => z.tag === tagName);
    if (existingIndex >= 0) {
        tagZones[existingIndex] = zone;
    } else {
        tagZones.push(zone);
    }
    
    // Apply tag to all selected nodes
    multiSelection.selectedNodes.forEach(nodeId => {
        const article = appData.articles.find(a => a.id === nodeId);
        if (article) {
            if (!article.categories.includes(tagName)) {
                article.categories.push(tagName);
            }
            // Update node color
            network.body.data.nodes.update({
                id: nodeId,
                color: {
                    background: tagColor,
                    border: darkenColor(tagColor, 20)
                }
            });
        }
    });
    
    saveToLocalStorage();
    updateCategoryFilters();
    renderListView();
    
    // Redraw to show the zone
    network.redraw();
    
    showNotification(`Tag "${tagName}" appliqué à ${multiSelection.selectedNodes.length} nœud(s)`, 'success');
    closeMultiTagMenu();
}

function closeMultiTagMenu() {
    const menu = document.getElementById('multiTagMenu');
    if (menu) {
        menu.remove();
    }
    
    // Deselect nodes
    if (network) {
        network.unselectAll();
    }
    multiSelection.selectedNodes = [];
}

// Helper function to darken a color
function darkenColor(color, percent) {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) - amt;
    const G = (num >> 8 & 0x00FF) - amt;
    const B = (num & 0x0000FF) - amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255))
        .toString(16).slice(1);
}

// Draw tag zones in background
function drawTagZones(ctx) {
    if (!tagZones || tagZones.length === 0) return;
    
    tagZones.forEach((zone, index) => {
        // Convert color to rgba with low opacity
        const color = zone.color;
        const r = parseInt(color.substr(1, 2), 16);
        const g = parseInt(color.substr(3, 2), 16);
        const b = parseInt(color.substr(5, 2), 16);
        
        // Draw semi-transparent background
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.1)`;
        ctx.fillRect(zone.x, zone.y, zone.width, zone.height);
        
        // Draw border
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.3)`;
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 5]);
        ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);
        ctx.setLineDash([]);
        
        // Draw tag name at top-left corner
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.7)`;
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        // Background for text
        const textMetrics = ctx.measureText(zone.tag);
        const textWidth = textMetrics.width;
        const textHeight = 30;
        const textPadding = 10;
        
        // Only draw background and text if NOT editing this zone
        if (!zoneEditing.active || zoneEditing.zoneIndex !== index) {
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.2)`;
            ctx.fillRect(
                zone.x + 10, 
                zone.y + 10, 
                textWidth + textPadding * 2, 
                textHeight + textPadding
            );
            
            // Text
            ctx.fillStyle = color;
            ctx.fillText(zone.tag, zone.x + 10 + textPadding, zone.y + 10 + textPadding);
        }
    });
}

// Show zone delete button (like radial menu)
function showZoneDeleteButton(zoneIndex) {
    const zone = tagZones[zoneIndex];
    const canvas = network.canvas.frame.canvas;
    const rect = canvas.getBoundingClientRect();
    
    // Calculate text width to center button above title
    const ctx = canvas.getContext('2d');
    ctx.font = 'bold 24px Arial';
    const textMetrics = ctx.measureText(zone.tag);
    const textWidth = textMetrics.width;
    const textPadding = 10;
    
    // Position: centered above the zone title
    const buttonCanvasPos = {
        x: zone.x + 10 + textPadding + (textWidth / 2),  // Center of the title
        y: zone.y + 10 - 35  // Above the title (35px up to account for button size and spacing)
    };
    const buttonDomPos = network.canvasToDOM(buttonCanvasPos);
    
    // Create or update delete button
    let deleteBtn = document.getElementById('zoneDeleteBtn');
    if (!deleteBtn) {
        deleteBtn = document.createElement('button');
        deleteBtn.id = 'zoneDeleteBtn';
        deleteBtn.className = 'zone-delete-btn';
        deleteBtn.title = 'Supprimer la zone';
        deleteBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
        `;
        deleteBtn.addEventListener('click', () => {
            if (selectedZoneIndex !== -1) {
                if (confirm('Supprimer cette zone/tag ?')) {
                    deleteZone(selectedZoneIndex);
                    hideZoneDeleteButton();
                }
            }
        });
        document.body.appendChild(deleteBtn);
    }
    
    deleteBtn.style.left = (rect.left + buttonDomPos.x - 20) + 'px';
    deleteBtn.style.top = (rect.top + buttonDomPos.y - 20) + 'px';
    deleteBtn.classList.add('active');
}

// Hide zone delete button
function hideZoneDeleteButton() {
    const deleteBtn = document.getElementById('zoneDeleteBtn');
    if (deleteBtn) {
        deleteBtn.classList.remove('active');
    }
}

// Check if node is inside a zone
function isNodeInZone(nodePos, zone) {
    return nodePos.x >= zone.x && 
           nodePos.x <= zone.x + zone.width &&
           nodePos.y >= zone.y && 
           nodePos.y <= zone.y + zone.height;
}

// Update zone sizes to fit their tagged nodes
function updateZoneSizes() {
    tagZones.forEach(zone => {
        // Find all nodes with this tag
        const nodesWithTag = appData.articles.filter(a => a.categories.includes(zone.tag));
        
        if (nodesWithTag.length === 0) return;
        
        // Calculate bounding box
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        nodesWithTag.forEach(article => {
            const pos = network.getPositions([article.id])[article.id];
            if (pos) {
                minX = Math.min(minX, pos.x);
                minY = Math.min(minY, pos.y);
                maxX = Math.max(maxX, pos.x);
                maxY = Math.max(maxY, pos.y);
            }
        });
        
        // Add padding
        const padding = 100;
        zone.x = minX - padding;
        zone.y = minY - padding;
        zone.width = maxX - minX + padding * 2;
        zone.height = maxY - minY + padding * 2;
    });
    
    network.redraw();
}

// Check if nodes should have their tags updated based on zone membership
function checkNodeZoneMembership() {
    appData.articles.forEach(article => {
        const pos = network.getPositions([article.id])[article.id];
        if (!pos) return;
        
        tagZones.forEach(zone => {
            const isInZone = isNodeInZone(pos, zone);
            const hasTag = article.categories.includes(zone.tag);
            
            if (isInZone && !hasTag) {
                // Node entered zone - add tag
                article.categories.push(zone.tag);
                network.body.data.nodes.update({
                    id: article.id,
                    color: {
                        background: zone.color,
                        border: darkenColor(zone.color, 20)
                    }
                });
            } else if (!isInZone && hasTag) {
                // Node exited zone - remove tag
                article.categories = article.categories.filter(c => c !== zone.tag);
                network.body.data.nodes.update({
                    id: article.id,
                    color: {
                        border: '#4a90e2',
                        background: '#e3f2fd'
                    }
                });
            }
        });
    });
    
    saveToLocalStorage();
    updateCategoryFilters();
    renderListView();
}

// Get resize handle at mouse position
function getZoneResizeHandle(event) {
    const canvas = network.canvas.frame.canvas;
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const mousePos = network.DOMtoCanvas({ x: mouseX, y: mouseY });
    
    const handleSize = 20 / network.getScale(); // Adjust for zoom
    
    for (let i = 0; i < tagZones.length; i++) {
        const zone = tagZones[i];
        
        // Check if mouse is near the zone borders (not inside)
        const nearLeft = Math.abs(mousePos.x - zone.x) < handleSize;
        const nearRight = Math.abs(mousePos.x - (zone.x + zone.width)) < handleSize;
        const nearTop = Math.abs(mousePos.y - zone.y) < handleSize;
        const nearBottom = Math.abs(mousePos.y - (zone.y + zone.height)) < handleSize;
        
        const inHorizontalRange = mousePos.y >= zone.y - handleSize && mousePos.y <= zone.y + zone.height + handleSize;
        const inVerticalRange = mousePos.x >= zone.x - handleSize && mousePos.x <= zone.x + zone.width + handleSize;
        
        // Check corners first (higher priority)
        if (nearLeft && nearTop && inHorizontalRange && inVerticalRange) {
            return { zoneIndex: i, handle: 'nw', zone: zone };
        }
        if (nearRight && nearTop && inHorizontalRange && inVerticalRange) {
            return { zoneIndex: i, handle: 'ne', zone: zone };
        }
        if (nearLeft && nearBottom && inHorizontalRange && inVerticalRange) {
            return { zoneIndex: i, handle: 'sw', zone: zone };
        }
        if (nearRight && nearBottom && inHorizontalRange && inVerticalRange) {
            return { zoneIndex: i, handle: 'se', zone: zone };
        }
        
        // Check edges (must be near edge AND in valid range)
        if (nearLeft && inHorizontalRange && !nearTop && !nearBottom) {
            return { zoneIndex: i, handle: 'w', zone: zone };
        }
        if (nearRight && inHorizontalRange && !nearTop && !nearBottom) {
            return { zoneIndex: i, handle: 'e', zone: zone };
        }
        if (nearTop && inVerticalRange && !nearLeft && !nearRight) {
            return { zoneIndex: i, handle: 'n', zone: zone };
        }
        if (nearBottom && inVerticalRange && !nearLeft && !nearRight) {
            return { zoneIndex: i, handle: 's', zone: zone };
        }
    }
    
    return { zoneIndex: -1, handle: null, zone: null };
}

// Update cursor based on zone resize handle
function updateZoneCursor(event) {
    // Cursor management disabled - too many conflicts with vis-network
    return;
    
    /*
    if (zoneEditing.active) return; // Don't change cursor during editing
    
    const canvas = network.canvas.frame.canvas;
    const container = network.canvas.body.container;
    
    // Don't change cursor if in certain modes
    if (isDraggingView || multiSelection.active || connectionMode.active) {
        return;
    }
    
    // Don't update cursor if actively moving or resizing
    if (zoneMoving.active || zoneResizing.active) {
        return;
    }
    
    // Check resize handle first (priority over title)
    const handle = getZoneResizeHandle(event);
    if (handle.zone !== null) {
        const cursors = {
            'nw': 'nw-resize',
            'ne': 'ne-resize',
            'sw': 'sw-resize',
            'se': 'se-resize',
            'n': 'n-resize',
            's': 's-resize',
            'e': 'e-resize',
            'w': 'w-resize'
        };
        container.style.cursor = cursors[handle.handle];
        return;
    }
    
    // Then check title
    const titleClick = getZoneTitleClick(event);
    if (titleClick.zone !== null) {
        container.style.cursor = 'move';
    } else {
        // Always reset to default when not hovering zone elements
        container.style.cursor = 'default';
    }
    */
}

// Check if clicking inside a zone (empty area, not on title or handles)
function getZoneAtPosition(event) {
    const canvas = network.canvas.frame.canvas;
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const mousePos = network.DOMtoCanvas({ x: mouseX, y: mouseY });
    
    const handleSize = 20 / network.getScale();
    
    // Check zones from top to bottom (reverse order for proper z-index)
    for (let i = tagZones.length - 1; i >= 0; i--) {
        const zone = tagZones[i];
        
        // Check if inside zone bounds
        if (mousePos.x >= zone.x && mousePos.x <= zone.x + zone.width &&
            mousePos.y >= zone.y && mousePos.y <= zone.y + zone.height) {
            
            // But NOT on title area
            const titleX = zone.x + 10;
            const titleY = zone.y + 10;
            const titleWidth = 200; // Approximate
            const titleHeight = 50;
            
            if (mousePos.x >= titleX && mousePos.x <= titleX + titleWidth &&
                mousePos.y >= titleY && mousePos.y <= titleY + titleHeight) {
                continue; // Skip, this is the title
            }
            
            // And NOT on resize handles
            const nearLeft = Math.abs(mousePos.x - zone.x) < handleSize;
            const nearRight = Math.abs(mousePos.x - (zone.x + zone.width)) < handleSize;
            const nearTop = Math.abs(mousePos.y - zone.y) < handleSize;
            const nearBottom = Math.abs(mousePos.y - (zone.y + zone.height)) < handleSize;
            
            if (nearLeft || nearRight || nearTop || nearBottom) {
                continue; // Skip, this is a handle
            }
            
            return { zoneIndex: i, zone: zone };
        }
    }
    
    return { zoneIndex: -1, zone: null };
}

// Check if clicking on zone title
function getZoneTitleClick(event) {
    const canvas = network.canvas.frame.canvas;
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const mousePos = network.DOMtoCanvas({ x: mouseX, y: mouseY });
    
    for (let i = 0; i < tagZones.length; i++) {
        const zone = tagZones[i];
        
        // Title is at top-left corner
        const titleX = zone.x + 10;
        const titleY = zone.y + 10;
        const titleWidth = zone.tag.length * 15 + 20; // Approximate width
        const titleHeight = 50;
        
        if (mousePos.x >= titleX && mousePos.x <= titleX + titleWidth &&
            mousePos.y >= titleY && mousePos.y <= titleY + titleHeight) {
            return { zoneIndex: i, zone: zone };
        }
    }
    
    return { zoneIndex: -1, zone: null };
}

// Start moving a zone
function startZoneMove(event, zoneIndex) {
    zoneMoving.active = true;
    zoneMoving.zoneIndex = zoneIndex;
    zoneMoving.originalZone = { ...tagZones[zoneIndex] };
    
    const canvas = network.canvas.frame.canvas;
    const container = network.canvas.body.container;
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const mousePos = network.DOMtoCanvas({ x: mouseX, y: mouseY });
    
    zoneMoving.startX = mousePos.x;
    zoneMoving.startY = mousePos.y;
    
    // Store original positions of nodes in this zone
    const zone = tagZones[zoneIndex];
    zoneMoving.originalNodePositions = {};
    appData.articles.forEach(article => {
        if (article.categories.includes(zone.tag)) {
            const pos = network.getPositions([article.id])[article.id];
            if (pos) {
                zoneMoving.originalNodePositions[article.id] = { x: pos.x, y: pos.y };
            }
        }
    });
    
    // Don't change cursor
    
    // Disable network interactions
    network.setOptions({
        interaction: {
            dragNodes: false,
            dragView: false,
            zoomView: false
        }
    });
}

// Update zone position during move
function updateZoneMove(event) {
    if (!zoneMoving.active) return;
    
    const canvas = network.canvas.frame.canvas;
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const mousePos = network.DOMtoCanvas({ x: mouseX, y: mouseY });
    
    const dx = mousePos.x - zoneMoving.startX;
    const dy = mousePos.y - zoneMoving.startY;
    
    const zone = tagZones[zoneMoving.zoneIndex];
    const orig = zoneMoving.originalZone;
    
    zone.x = orig.x + dx;
    zone.y = orig.y + dy;
    
    // Move nodes that have this tag using their original positions
    if (zoneMoving.originalNodePositions) {
        Object.keys(zoneMoving.originalNodePositions).forEach(nodeId => {
            const origPos = zoneMoving.originalNodePositions[nodeId];
            const newX = origPos.x + dx;
            const newY = origPos.y + dy;
            
            // Just move the node, don't fix it during drag
            network.moveNode(nodeId, newX, newY);
        });
    }
    
    network.redraw();
}

// End zone move
function endZoneMove() {
    const movedZoneIndex = zoneMoving.zoneIndex;
    
    zoneMoving.active = false;
    zoneMoving.readyToMove = false;
    zoneMoving.zoneIndex = -1;
    zoneMoving.originalZone = null;
    zoneMoving.originalNodePositions = {}; // Clear stored positions
    
    const canvas = network.canvas.frame.canvas;
    const container = network.canvas.body.container;
    // Don't change cursor - let vis-network handle it
    
    // Re-enable network interactions
    network.setOptions({
        interaction: {
            dragNodes: true,
            dragView: false,
            zoomView: true,
            hover: true
        }
    });
    
    // Wait a bit for physics to settle, then adjust ALL zones to contain their nodes
    setTimeout(() => {
        // Update all zone sizes to adapt to node positions
        updateZoneSizes();
        saveToLocalStorage();
    }, 200);
    
    // DON'T modify tags when moving a zone - the zone adapts to keep its nodes
    // Tag modification only happens on manual node drag or zone resize
}

// Edit zone title inline
function startEditZoneTitle(event, zoneIndex) {
    if (zoneEditing.active) return;
    
    const zone = tagZones[zoneIndex];
    const canvas = network.canvas.frame.canvas;
    
    zoneEditing.active = true;
    zoneEditing.zoneIndex = zoneIndex;
    
    // Disable zoom and interactions during editing
    network.setOptions({
        interaction: {
            dragNodes: false,
            dragView: false,
            zoomView: false,
            hover: false
        }
    });
    
    // Get zone color
    const color = zone.color;
    const r = parseInt(color.substr(1, 2), 16);
    const g = parseInt(color.substr(3, 2), 16);
    const b = parseInt(color.substr(5, 2), 16);
    
    // Get exact canvas context to measure text
    const ctx = canvas.getContext('2d');
    ctx.font = 'bold 24px Arial';
    const textMetrics = ctx.measureText(zone.tag);
    const textWidth = textMetrics.width;
    
    // Get zone title position in DOM - exact same position as the rendered title
    const rect = canvas.getBoundingClientRect();
    const textPadding = 10;
    // Title is drawn at zone.x + 10 + textPadding, zone.y + 10 + textPadding (canvas coords)
    // textBaseline is 'top', so text starts at this Y position
    const titleCanvasPos = { x: zone.x + 10 + textPadding, y: zone.y + 10 + textPadding };
    const titlePos = network.canvasToDOM(titleCanvasPos);
    
    // Create input element positioned EXACTLY over the canvas text
    const input = document.createElement('input');
    input.type = 'text';
    input.value = zone.tag;
    input.style.position = 'absolute';
    input.style.left = (rect.left + titlePos.x) + 'px';
    input.style.top = (rect.top + titlePos.y) + 'px';
    input.style.width = Math.max(textWidth + 20, 150) + 'px'; // Width based on text + some margin
    input.style.fontSize = '24px';
    input.style.fontWeight = 'bold';
    input.style.fontFamily = 'Arial';
    input.style.padding = '0';
    input.style.margin = '0';
    input.style.border = 'none';
    input.style.borderRadius = '0';
    input.style.zIndex = '10001';
    input.style.color = color;
    input.style.backgroundColor = `rgba(${r}, ${g}, ${b}, 0.15)`; // Very subtle background
    input.style.outline = 'none';
    input.style.boxSizing = 'border-box';
    input.style.lineHeight = '1';
    
    document.body.appendChild(input);
    zoneEditing.inputElement = input;
    zoneEditing.backgroundElement = null; // No separate background
    
    // Redraw to hide the canvas text
    network.redraw();
    
    input.focus();
    input.select();
    
    // Auto-resize input as user types
    const autoResize = () => {
        const ctx = canvas.getContext('2d');
        ctx.font = 'bold 24px Arial';
        const newWidth = Math.max(ctx.measureText(input.value).width + 20, 150);
        input.style.width = newWidth + 'px';
    };
    
    input.addEventListener('input', autoResize);
    
    // Save on blur or enter
    const saveEdit = () => {
        if (!zoneEditing.active) return; // Already cleaned up
        
        const newTag = input.value.trim();
        const oldTag = zone.tag;
        
        if (newTag && newTag !== '' && newTag !== oldTag) {
            // Update all articles with this tag
            appData.articles.forEach(article => {
                const index = article.categories.indexOf(oldTag);
                if (index !== -1) {
                    article.categories[index] = newTag;
                }
            });
            
            // Update zone
            zone.tag = newTag;
            
            saveToLocalStorage();
            updateCategoryFilters();
            renderListView();
            showNotification(`Zone renommée en "${newTag}"`, 'success');
        }
        
        input.remove();
        zoneEditing.active = false;
        zoneEditing.zoneIndex = -1;
        zoneEditing.inputElement = null;
        zoneEditing.backgroundElement = null;
        
        // Remove document click listener
        document.removeEventListener('mousedown', handleClickOutside);
        
        // Re-enable interactions
        network.setOptions({
            interaction: {
                dragNodes: true,
                dragView: false,
                zoomView: true,
                hover: true,
                hoverConnectedEdges: true,
                selectConnectedEdges: true,
                multiselect: true,
                selectable: true
            }
        });
        
        network.redraw();
    };
    
    // Handle clicks outside the input
    const handleClickOutside = (e) => {
        if (e.target !== input) {
            saveEdit();
        }
    };
    
    // Add document click listener after a short delay to avoid immediate trigger
    setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
    }, 100);
    
    input.addEventListener('blur', saveEdit);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            saveEdit();
        } else if (e.key === 'Escape') {
            input.remove();
            zoneEditing.active = false;
            zoneEditing.zoneIndex = -1;
            zoneEditing.inputElement = null;
            zoneEditing.backgroundElement = null;
            
            // Remove document click listener
            document.removeEventListener('mousedown', handleClickOutside);
            
            // Re-enable interactions
            network.setOptions({
                interaction: {
                    dragNodes: true,
                    dragView: false,
                    zoomView: true,
                    hover: true,
                    hoverConnectedEdges: true,
                    selectConnectedEdges: true,
                    multiselect: true,
                    selectable: true
                }
            });
            
            network.redraw();
        }
    });
}

// Delete a zone
function deleteZone(zoneIndex) {
    const zone = tagZones[zoneIndex];
    const tagToRemove = zone.tag;
    
    // Remove tag from all articles
    appData.articles.forEach(article => {
        article.categories = article.categories.filter(c => c !== tagToRemove);
    });
    
    // Remove zone
    tagZones.splice(zoneIndex, 1);
    selectedZoneIndex = -1;
    
    saveToLocalStorage();
    updateCategoryFilters();
    renderListView();
    updateGraph();
    
    // Reset cursor
    const canvas = network.canvas.frame.canvas;
    if (canvas) {
        canvas.style.cursor = 'default';
    }
    
    showNotification(`Zone "${tagToRemove}" supprimée`, 'success');
}

// Start resizing a zone
function startZoneResize(event, zoneIndex, handle) {
    zoneResizing.active = true;
    zoneResizing.zoneIndex = zoneIndex;
    zoneResizing.handle = handle;
    zoneResizing.originalZone = { ...tagZones[zoneIndex] };
    
    const canvas = network.canvas.frame.canvas;
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const mousePos = network.DOMtoCanvas({ x: mouseX, y: mouseY });
    
    zoneResizing.startX = mousePos.x;
    zoneResizing.startY = mousePos.y;
    
    // Don't change cursor
    
    // Disable network interactions
    network.setOptions({
        interaction: {
            dragNodes: false,
            dragView: false,
            zoomView: false
        }
    });
}

// Update zone size during resize
function updateZoneResize(event) {
    if (!zoneResizing.active) return;
    
    const canvas = network.canvas.frame.canvas;
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const mousePos = network.DOMtoCanvas({ x: mouseX, y: mouseY });
    
    const dx = mousePos.x - zoneResizing.startX;
    const dy = mousePos.y - zoneResizing.startY;
    
    const zone = tagZones[zoneResizing.zoneIndex];
    const orig = zoneResizing.originalZone;
    
    switch (zoneResizing.handle) {
        case 'nw':
            zone.x = orig.x + dx;
            zone.y = orig.y + dy;
            zone.width = orig.width - dx;
            zone.height = orig.height - dy;
            break;
        case 'ne':
            zone.y = orig.y + dy;
            zone.width = orig.width + dx;
            zone.height = orig.height - dy;
            break;
        case 'sw':
            zone.x = orig.x + dx;
            zone.width = orig.width - dx;
            zone.height = orig.height + dy;
            break;
        case 'se':
            zone.width = orig.width + dx;
            zone.height = orig.height + dy;
            break;
        case 'n':
            zone.y = orig.y + dy;
            zone.height = orig.height - dy;
            break;
        case 's':
            zone.height = orig.height + dy;
            break;
        case 'e':
            zone.width = orig.width + dx;
            break;
        case 'w':
            zone.x = orig.x + dx;
            zone.width = orig.width - dx;
            break;
    }
    
    // Enforce minimum size
    const minSize = 100;
    if (zone.width < minSize) {
        zone.width = minSize;
        zone.x = orig.x;
    }
    if (zone.height < minSize) {
        zone.height = minSize;
        zone.y = orig.y;
    }
    
    network.redraw();
}

// End zone resize
function endZoneResize() {
    zoneResizing.active = false;
    zoneResizing.zoneIndex = -1;
    zoneResizing.handle = null;
    zoneResizing.originalZone = null;
    
    // Don't change cursor - let vis-network handle it
    
    // Re-enable network interactions
    network.setOptions({
        interaction: {
            dragNodes: true,
            dragView: false,
            zoomView: true,
            hover: true
        }
    });
    
    // Check if nodes entered/exited zones after resize
    checkNodeZoneMembership();
}

function createConnection(label) {
    if (!connectionMode.fromNodeId || !connectionMode.toNodeId) return;
    
    appData.connections.push({
        id: appData.nextConnectionId++,
        from: connectionMode.fromNodeId,
        to: connectionMode.toNodeId,
        label: label
    });
    
    cancelConnectionMode();
    updateGraph();
    saveToLocalStorage();
    showNotification('Connexion créée!', 'success');
}

function editConnectionLabel(edgeId) {
    const connection = appData.connections.find(c => c.id === edgeId);
    if (!connection) return;
    
    const currentLabel = connection.label || '';
    const newLabel = prompt('Label de la connexion (optionnel):', currentLabel);
    
    if (newLabel !== null) {  // null means cancelled
        connection.label = newLabel.trim();
        updateGraph();
        saveToLocalStorage();
        showNotification('Label mis à jour!', 'success');
    }
}

function editEdgeLabelInline(edgeId, edge, pointerDOM) {
    const connection = appData.connections.find(c => c.id === edgeId);
    if (!connection) {
        console.log('Connection not found:', edgeId);
        return;
    }
    
    // Get actual node positions from the network
    let canvasPos;
    try {
        const positions = network.getPositions([edge.from, edge.to]);
        const fromPos = positions[edge.from];
        const toPos = positions[edge.to];
        
        if (!fromPos || !toPos) {
            throw new Error('Node positions not available');
        }
        
        // Calculate middle point of the edge
        canvasPos = network.canvasToDOM({
            x: (fromPos.x + toPos.x) / 2,
            y: (fromPos.y + toPos.y) / 2
        });
    } catch (e) {
        console.error('Error getting canvas position:', e);
        // Fallback to pointer position
        const container = document.getElementById('graphContainer');
        const rect = container.getBoundingClientRect();
        canvasPos = {
            x: rect.left + pointerDOM.x,
            y: rect.top + pointerDOM.y
        };
    }
    
    // Create inline input
    const input = document.createElement('input');
    input.type = 'text';
    input.value = connection.label || '';
    input.placeholder = 'Label';
    input.style.position = 'fixed';
    input.style.left = canvasPos.x + 'px';
    input.style.top = canvasPos.y + 'px';
    input.style.transform = 'translate(-50%, -50%)';
    input.style.padding = '4px 8px';
    input.style.border = '1px solid #e0e0e0';
    input.style.borderRadius = '4px';
    input.style.fontSize = '11px';
    input.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    input.style.zIndex = '10000';
    input.style.background = 'rgba(255, 255, 255, 0.95)';
    input.style.backdropFilter = 'blur(8px)';
    input.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
    input.style.minWidth = '80px';
    input.style.textAlign = 'center';
    input.style.outline = 'none';
    input.style.color = '#666';
    
    document.body.appendChild(input);
    input.focus();
    input.select();
    
    console.log('Input created and focused');
    
    // Save on Enter
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            connection.label = input.value.trim();
            updateGraph();
            saveToLocalStorage();
            input.remove();
            if (connection.label) {
                showNotification('Label mis à jour!', 'success');
            }
        } else if (e.key === 'Escape') {
            input.remove();
        }
    });
    
    // Cancel on blur (click outside)
    input.addEventListener('blur', () => {
        input.remove();
    });
}

function deleteArticleById(articleId) {
    const article = appData.articles.find(a => a.id === articleId);
    if (!article) return;
    
    if (!confirm(`Supprimer l'article "${article.title}" ?`)) return;
    
    deleteArticle(articleId);
}

function deleteArticle(articleId) {
    // Disable physics temporarily to prevent repositioning
    const wasPhysicsEnabled = physicsEnabled;
    if (network) {
        network.setOptions({ physics: { enabled: false } });
    }
    
    // Remove article
    appData.articles = appData.articles.filter(a => a.id !== articleId);
    
    // Remove connections
    appData.connections = appData.connections.filter(c => 
        c.from !== articleId && c.to !== articleId
    );
    
    saveToLocalStorage();
    updateCategoryFilters();
    renderListView();
    updateGraph();
    
    // Re-enable physics if it was enabled
    if (wasPhysicsEnabled && network) {
        setTimeout(() => {
            network.setOptions({ physics: { enabled: true } });
        }, 100);
    }
    
    showNotification('Article supprimé', 'success');
}

function deleteConnection(edgeId) {
    appData.connections = appData.connections.filter(c => c.id !== edgeId);
    selectedEdgeId = null;
    
    saveToLocalStorage();
    updateGraph();
    
    showNotification('Connexion supprimée', 'success');
}

// ===== EDGE MENU =====}

// ===== EDGE MENU =====
function showEdgeMenu(x, y, edgeId) {
    const menu = document.getElementById('edgeMenu');
    
    // Position menu at click position
    menu.style.left = (x - 22) + 'px';  // Center the button (44/2 = 22)
    menu.style.top = (y - 22) + 'px';
    menu.classList.add('active');
}

function hideEdgeMenu() {
    const menu = document.getElementById('edgeMenu');
    menu.classList.remove('active');
    selectedEdgeId = null;
    
    // Re-enable interactions
    if (network) {
        network.setOptions({ 
            interaction: { 
                dragNodes: true,
                dragView: true,
                zoomView: true,
                hover: true,
                tooltipDelay: 200
            } 
        });
    }
}

function deleteConnection(edgeId) {
    if (!confirm('Supprimer cette connexion ?')) return;
    
    // Disable physics temporarily
    const wasPhysicsEnabled = physicsEnabled;
    if (network) {
        network.setOptions({ physics: { enabled: false } });
    }
    
    // Find and remove the connection
    appData.connections = appData.connections.filter(c => c.id !== edgeId);
    
    updateGraph();
    saveToLocalStorage();
    
    // Restore physics state
    setTimeout(() => {
        if (network && wasPhysicsEnabled) {
            network.setOptions({ physics: { enabled: true } });
        }
    }, 100);
    
    showNotification('Connexion supprimée!', 'success');
}

// ===== PHYSICS TOGGLE =====
function togglePhysics() {
    physicsEnabled = !physicsEnabled;
    
    if (network) {
        network.setOptions({
            physics: {
                enabled: physicsEnabled
            }
        });
    }
    
    const btn = document.getElementById('togglePhysicsBtn');
    if (physicsEnabled) {
        btn.classList.remove('active');
        showNotification('Physique activée', 'info');
    } else {
        btn.classList.add('active');
        showNotification('Physique désactivée - placement manuel', 'info');
    }
}

// ===== AUTO-IMPORT FUNCTIONS =====
function resetImportZone() {
    // Clear quick import input
    document.getElementById('quickImport').value = '';
    
    // Hide import status
    const status = document.getElementById('importStatus');
    status.classList.remove('show');
    
    // Show drop zone, hide success summary
    const dropZone = document.getElementById('dropZone');
    const importZone = document.querySelector('.import-zone');
    
    // Remove any existing summary
    const existingSummary = importZone.querySelector('.import-summary');
    if (existingSummary) {
        existingSummary.remove();
    }
    
    // Show drop zone
    dropZone.style.display = 'block';
}

function showImportSuccess(data) {
    // Hide drop zone
    document.getElementById('dropZone').style.display = 'none';
    
    // Create success summary
    const importZone = document.querySelector('.import-zone');
    
    // Remove existing summary if any
    const existingSummary = importZone.querySelector('.import-summary');
    if (existingSummary) {
        existingSummary.remove();
    }
    
    const summary = document.createElement('div');
    summary.className = 'import-summary';
    summary.innerHTML = `
        <div class="import-success-icon">✓</div>
        <h3>Article importé</h3>
        <div class="import-details">
            <p><strong>Titre:</strong> ${data.title || 'Non disponible'}</p>
            <p><strong>Auteurs:</strong> ${data.authors || 'Non disponible'}</p>
            ${data.doi ? `<p><strong>DOI:</strong> ${data.doi}</p>` : ''}
        </div>
        <button type="button" id="reimportBtn" class="btn-secondary">↻ Réimporter</button>
    `;
    
    importZone.insertBefore(summary, importZone.firstChild);
    
    // Add reimport button listener
    document.getElementById('reimportBtn').addEventListener('click', () => {
        resetImportZone();
        // Clear form fields
        document.getElementById('articleTitle').value = '';
        document.getElementById('articleAuthors').value = '';
        document.getElementById('articleText').value = '';
        document.getElementById('articleDoi').value = '';
        document.getElementById('articleLink').value = '';
        document.getElementById('articlePdf').value = '';
    });
}

function setupImportZone() {
    const dropZone = document.getElementById('dropZone');
    const quickImport = document.getElementById('quickImport');
    const browseBtn = document.getElementById('browseFileBtn');
    const fileInput = document.getElementById('pdfFileInput');
    
    // Drag and drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });
    
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type === 'application/pdf') {
            handlePdfFile(files[0]);
        } else {
            showImportStatus('Veuillez déposer un fichier PDF', 'error');
        }
    });
    
    // Browse button
    browseBtn.addEventListener('click', () => {
        fileInput.click();
    });
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handlePdfFile(e.target.files[0]);
        }
    });
    
    // Quick import on Enter or blur
    quickImport.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            processQuickImport();
        }
    });
    
    quickImport.addEventListener('blur', () => {
        if (quickImport.value.trim()) {
            processQuickImport();
        }
    });
}

function toggleManualForm() {
    const manualForm = document.getElementById('manualForm');
    const btn = document.getElementById('toggleManualBtn');
    
    if (manualForm.classList.contains('collapsed')) {
        manualForm.classList.remove('collapsed');
        btn.textContent = '▼ Masquer la saisie manuelle';
    } else {
        manualForm.classList.add('collapsed');
        btn.textContent = '✏️ Saisie manuelle / modifier';
    }
}

function processQuickImport() {
    const input = document.getElementById('quickImport').value.trim();
    
    if (!input) return;
    
    // Detect if DOI or arXiv
    if (input.includes('10.') || input.includes('doi.org')) {
        // Extract DOI
        const doiMatch = input.match(/10\.\d{4,}\/[^\s]+/);
        if (doiMatch) {
            importFromDoi(doiMatch[0]);
        } else {
            showImportStatus('Format DOI invalide', 'error');
        }
    } else if (/^\d{4}\.\d{4,5}(v\d+)?$/.test(input) || input.includes('arxiv')) {
        // arXiv format: 2301.12345 or arXiv:2301.12345
        const arxivMatch = input.match(/(\d{4}\.\d{4,5}(v\d+)?)/);
        if (arxivMatch) {
            importFromArxiv(arxivMatch[1]);
        } else {
            showImportStatus('Format arXiv invalide', 'error');
        }
    } else {
        showImportStatus('Format non reconnu. Utilisez un DOI (10.xxxx/...) ou arXiv ID (2301.12345)', 'error');
    }
}

async function handlePdfFile(file) {
    showImportStatus('Extraction des métadonnées du PDF...', 'loading');
    
    try {
        // Use PDF.js library if available, otherwise extract basic info
        if (typeof pdfjsLib !== 'undefined') {
            await extractPdfMetadata(file);
        } else {
            // Fallback: just use filename
            const filename = file.name.replace('.pdf', '');
            document.getElementById('articleTitle').value = filename;
            
            // Create local URL
            const pdfUrl = URL.createObjectURL(file);
            document.getElementById('articlePdf').value = pdfUrl;
            
            // Try to extract DOI from filename
            const doiMatch = filename.match(/10\.\d{4,}[^\s]*/);
            if (doiMatch) {
                document.getElementById('articleDoi').value = doiMatch[0];
                showImportStatus('PDF chargé. Tentative d\'import via DOI trouvé...', 'loading');
                await importFromDoi(doiMatch[0]);
            } else {
                showImportStatus('✓ Fichier PDF chargé (nom extrait). Utilisez DOI/arXiv pour plus d\'infos.', 'success');
                toggleManualForm(); // Show form for manual entry
            }
        }
    } catch (error) {
        console.error('PDF processing error:', error);
        showImportStatus('Erreur lors du traitement du PDF', 'error');
    }
}

async function extractPdfMetadata(file) {
    // This would use PDF.js to extract metadata from PDF
    // For now, simplified version
    const arrayBuffer = await file.arrayBuffer();
    
    // Try to find DOI in PDF content (basic search)
    const text = await extractTextFromPdf(arrayBuffer);
    const doiMatch = text.match(/10\.\d{4,}\/[^\s\n]+/);
    
    if (doiMatch) {
        const doi = doiMatch[0].replace(/[.,;]$/, ''); // Remove trailing punctuation
        showImportStatus('DOI trouvé dans le PDF, import en cours...', 'loading');
        await importFromDoi(doi);
    } else {
        const filename = file.name.replace('.pdf', '');
        document.getElementById('articleTitle').value = filename;
        const pdfUrl = URL.createObjectURL(file);
        document.getElementById('articlePdf').value = pdfUrl;
        showImportStatus('PDF chargé, mais aucun DOI trouvé. Veuillez compléter manuellement.', 'success');
        toggleManualForm();
    }
}

async function extractTextFromPdf(arrayBuffer) {
    // Simple text extraction - would need PDF.js for full implementation
    const uint8Array = new Uint8Array(arrayBuffer);
    const text = new TextDecoder().decode(uint8Array);
    return text;
}

function showImportStatus(message, type) {
    const status = document.getElementById('importStatus');
    status.textContent = message;
    status.className = `import-status show ${type}`;
    
    if (type === 'success' || type === 'error') {
        setTimeout(() => {
            status.classList.remove('show');
        }, 5000);
    }
}

async function importFromDoi(doi) {
    if (!doi) {
        const input = document.getElementById('quickImport');
        doi = input.value.trim();
    }
    
    if (!doi) {
        showImportStatus('Veuillez entrer un DOI', 'error');
        return;
    }
    
    // Check if DOI already exists
    const existingArticle = appData.articles.find(a => a.doi && a.doi.toLowerCase() === doi.toLowerCase());
    if (existingArticle) {
        const confirmImport = confirm(
            `⚠️ Attention : Un article avec ce DOI existe déjà :\n\n` +
            `"${existingArticle.title}"\n\n` +
            `Voulez-vous quand même importer ce DOI ?`
        );
        if (!confirmImport) {
            showImportStatus('Import annulé', 'info');
            document.getElementById('quickImport').value = '';
            resetImportZone();
            return;
        }
    }
    
    showImportStatus('Récupération des métadonnées...', 'loading');
    
    try {
        // Use CrossRef API to get metadata
        const response = await fetch(`https://api.crossref.org/works/${doi}`);
        
        if (!response.ok) {
            throw new Error('DOI non trouvé');
        }
        
        const data = await response.json();
        const work = data.message;
        
        // Fill form fields
        document.getElementById('articleTitle').value = work.title?.[0] || '';
        
        // Authors
        const authors = work.author?.map(a => {
            return `${a.given || ''} ${a.family || ''}`.trim();
        }).join(', ') || '';
        document.getElementById('articleAuthors').value = authors;
        
        // Abstract
        document.getElementById('articleText').value = work.abstract || '';
        
        // DOI
        document.getElementById('articleDoi').value = doi;
        
        // Link
        if (work.URL) {
            document.getElementById('articleLink').value = work.URL;
        }
        
        showImportStatus('✓ Métadonnées importées avec succès !', 'success');
        
        // Show success summary
        showImportSuccess({
            title: work.title?.[0] || '',
            authors: authors,
            doi: doi
        });
        
        // Clear quick import
        document.getElementById('quickImport').value = '';
        
    } catch (error) {
        console.error('Error importing DOI:', error);
        showImportStatus(`Erreur: ${error.message}`, 'error');
        toggleManualForm(); // Show manual form on error
    }
}

async function importFromArxiv(arxivId) {
    if (!arxivId) {
        const input = document.getElementById('quickImport');
        arxivId = input.value.trim();
    }
    
    if (!arxivId) {
        showImportStatus('Veuillez entrer un ID arXiv', 'error');
        return;
    }
    
    // Check if arXiv ID already exists (in link or pdf fields)
    const existingArticle = appData.articles.find(a => {
        const linkHasArxiv = a.link && a.link.includes(arxivId);
        const pdfHasArxiv = a.pdf && a.pdf.includes(arxivId);
        return linkHasArxiv || pdfHasArxiv;
    });
    
    if (existingArticle) {
        const confirmImport = confirm(
            `⚠️ Attention : Un article avec cet ID arXiv existe déjà :\n\n` +
            `"${existingArticle.title}"\n\n` +
            `Voulez-vous quand même importer cet article ?`
        );
        if (!confirmImport) {
            showImportStatus('Import annulé', 'info');
            document.getElementById('quickImport').value = '';
            resetImportZone();
            return;
        }
    }
    
    showImportStatus('Récupération des métadonnées arXiv...', 'loading');
    
    try {
        // Use arXiv API
        const response = await fetch(`https://export.arxiv.org/api/query?id_list=${arxivId}`);
        
        if (!response.ok) {
            throw new Error('Impossible de contacter arXiv');
        }
        
        const text = await response.text();
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, 'text/xml');
        
        const entry = xml.querySelector('entry');
        if (!entry) {
            throw new Error('Article arXiv non trouvé');
        }
        
        // Extract metadata
        const title = entry.querySelector('title')?.textContent.trim() || '';
        const summary = entry.querySelector('summary')?.textContent.trim() || '';
        const authors = Array.from(entry.querySelectorAll('author name'))
            .map(a => a.textContent.trim())
            .join(', ');
        const pdfLink = entry.querySelector('link[title="pdf"]')?.getAttribute('href') || '';
        const htmlLink = entry.querySelector('id')?.textContent.trim() || '';
        
        // Fill form fields
        document.getElementById('articleTitle').value = title;
        document.getElementById('articleAuthors').value = authors;
        document.getElementById('articleText').value = summary;
        document.getElementById('articleLink').value = htmlLink;
        if (pdfLink) {
            document.getElementById('articlePdf').value = pdfLink;
        }
        
        showImportStatus('✓ Métadonnées arXiv importées avec succès !', 'success');
        
        // Show success summary
        showImportSuccess({
            title: title,
            authors: authors,
            doi: ''
        });
        
        // Clear quick import
        document.getElementById('quickImport').value = '';
        
    } catch (error) {
        console.error('Error importing arXiv:', error);
        showImportStatus(`Erreur: ${error.message}`, 'error');
        toggleManualForm(); // Show manual form on error
    }
}

function importFromPdf() {
    const fileInput = document.getElementById('importPdf');
    const file = fileInput.files[0];
    
    if (!file) {
        showImportStatus('Veuillez sélectionner un fichier PDF', 'error');
        return;
    }
    
    showImportStatus('Extraction du PDF en cours... (fonctionnalité limitée)', 'loading');
    
    // PDF text extraction requires a library like PDF.js
    // For now, we'll just set the filename as title
    const filename = file.name.replace('.pdf', '');
    
    if (!document.getElementById('articleTitle').value) {
        document.getElementById('articleTitle').value = filename;
    }
    
    // Create a local URL for the PDF
    const pdfUrl = URL.createObjectURL(file);
    document.getElementById('articlePdf').value = pdfUrl;
    
    showImportStatus('⚠️ Nom du fichier extrait. Pour une extraction complète, utilisez DOI ou arXiv.', 'success');
}
