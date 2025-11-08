// ===== LOCAL STORAGE =====
// Functions for saving and loading application data

function saveToLocalStorage(silent = false) {
    try {
        // Check if we're in gallery read-only mode
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('source') === 'gallery') {
            if (!silent) {
                showNotification('Gallery projects are read-only. Use Export to save your own copy.', 'info');
            }
            return;
        }
        
        // Save node positions if network exists
        if (network) {
            const positions = network.getPositions();
            localStorage.setItem('papermap_positions', JSON.stringify(positions));
            // Also update global saved positions
            window.savedNodePositions = positions;
            console.log('Positions saved to localStorage:', Object.keys(positions).length, 'nodes');
        }
        
        localStorage.setItem('papermap_data', JSON.stringify(appData));
        localStorage.setItem('papermap_zones', JSON.stringify(tagZones));
        localStorage.setItem('papermap_edge_control_points', JSON.stringify(edgeControlPoints));
        localStorage.setItem('papermap_next_control_point_id', nextControlPointId.toString());
        console.log('Data saved to localStorage');
        
        // Also save to cloud if enabled (async, non-blocking)
        if (typeof window.isCloudStorageEnabled === 'function' && window.isCloudStorageEnabled()) {
            // Dynamically import and call cloud save
            import('./cloud-storage.js').then(module => {
                module.saveToCloud(true); // Silent cloud save
            }).catch(err => {
                console.warn('Cloud save skipped:', err.message);
            });
        }
        
        if (!silent) {
            // showNotification('Projet sauvegardé!', 'success');
        }
    } catch (e) {
        showNotification('Erreur lors de la sauvegarde: ' + e.message, 'error');
    }
}

function loadFromLocalStorage() {
    try {
        // Check if we're loading a gallery project
        if (window.isReadOnlyMode && window.galleryProjectData) {
            console.log('📖 Loading gallery project in read-only mode');
            const galleryData = window.galleryProjectData.data;
            
            // Load project data structure - support both formats
            if (galleryData.nodes && galleryData.edges) {
                // Cloud format (nodes/edges)
                appData = {
                    articles: galleryData.nodes || [],
                    connections: galleryData.edges || []
                };
                tagZones = galleryData.zones || [];
                window.savedNodePositions = galleryData.positions || {};
            } else if (galleryData.articles && galleryData.connections) {
                // Editor format (articles/connections)
                appData = {
                    articles: galleryData.articles || [],
                    connections: galleryData.connections || []
                };
                tagZones = galleryData.tagZones || galleryData.zones || [];
                window.savedNodePositions = galleryData.nodePositions || galleryData.positions || {};
            }
            
            console.log('✓ Loaded gallery project:', appData.articles.length, 'articles');
            console.log('✓ Loaded gallery zones:', tagZones.length, 'zones');
            
            // Initialize control points
            edgeControlPoints = {};
            window.edgeControlPoints = edgeControlPoints;
            nextControlPointId = -1;
            window.nextControlPointId = nextControlPointId;
            
            return;
        }
        
        const saved = localStorage.getItem('papermap_data');
        if (saved) {
            appData = JSON.parse(saved);
            console.log('✓ Loaded appData:', appData.articles.length, 'articles');
        }
        
        // Load tag zones from localStorage
        const savedZones = localStorage.getItem('papermap_zones');
        if (savedZones) {
            tagZones = JSON.parse(savedZones);
            console.log('✓ Loaded tagZones:', tagZones.length, 'zones');
        } else {
            // Create zones from existing tags if no zones saved
            initializeZonesFromTags();
        }
        
        // Load edge control points
        const savedControlPoints = localStorage.getItem('papermap_edge_control_points');
        if (savedControlPoints) {
            edgeControlPoints = JSON.parse(savedControlPoints);
            window.edgeControlPoints = edgeControlPoints; // Update global reference
            console.log('✓ Loaded edge control points:', Object.keys(edgeControlPoints).length, 'edges with control points');
        } else {
            edgeControlPoints = {};
            window.edgeControlPoints = edgeControlPoints;
        }
        
        // Load next control point ID
        const savedNextId = localStorage.getItem('papermap_next_control_point_id');
        if (savedNextId) {
            nextControlPointId = parseInt(savedNextId);
            window.nextControlPointId = nextControlPointId; // Update global reference
            console.log('✓ Loaded next control point ID:', nextControlPointId);
        } else {
            nextControlPointId = -1;
            window.nextControlPointId = nextControlPointId;
        }
        
        // Load saved node positions - CRITICAL for position persistence
        const savedPositions = localStorage.getItem('papermap_positions');
        if (savedPositions) {
            window.savedNodePositions = JSON.parse(savedPositions);
            console.log('✓ Loaded node positions:', Object.keys(window.savedNodePositions).length, 'nodes');
            console.log('Sample positions:', Object.entries(window.savedNodePositions).slice(0, 3));
        } else {
            window.savedNodePositions = {};
            console.log('⚠ No saved positions found in localStorage');
        }
    } catch (e) {
        console.error('Error loading from localStorage:', e);
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
    if (!network) return;
    
    // Get current positions of ALL nodes to avoid overlap
    const currentPositions = network.getPositions();
    const savedPositions = window.savedNodePositions || {};
    const occupiedPositions = [];
    
    // Record all existing node positions (from saved or current)
    Object.keys(currentPositions).forEach(nodeId => {
        const pos = currentPositions[nodeId];
        // Check if node has a saved position
        const savedPos = savedPositions[nodeId];
        if (savedPos && (savedPos.x !== 0 || savedPos.y !== 0)) {
            occupiedPositions.push({ x: savedPos.x, y: savedPos.y, nodeId: parseInt(nodeId) });
        } else if (pos && (pos.x !== 0 || pos.y !== 0)) {
            occupiedPositions.push({ x: pos.x, y: pos.y, nodeId: parseInt(nodeId) });
        }
    });
    
    const minDistance = 220; // Increased minimum distance between nodes
    
    function isPositionOccupied(x, y, currentNodeId = null) {
        return occupiedPositions.some(pos => {
            // Don't check against itself
            if (currentNodeId !== null && pos.nodeId === currentNodeId) {
                return false;
            }
            const distance = Math.sqrt(Math.pow(pos.x - x, 2) + Math.pow(pos.y - y, 2));
            return distance < minDistance;
        });
    }
    
    const nodesToUpdate = [];
    
    // Handle nodes WITH tags (position in zones)
    if (tagZones.length > 0) {
        tagZones.forEach(zone => {
            // Find all articles with this tag
            const articlesWithTag = appData.articles.filter(a => a.categories.includes(zone.tag));
            
            if (articlesWithTag.length === 0) return;
            
            // Get zone center
            const zoneCenterX = zone.x + zone.width / 2;
            const zoneCenterY = zone.y + zone.height / 2;
            
            // Calculate grid layout for nodes inside zone - increased spacing
            const nodeSpacing = 250;
            const cols = Math.max(2, Math.ceil(Math.sqrt(articlesWithTag.length * zone.width / zone.height)));
            const rows = Math.ceil(articlesWithTag.length / cols);
            
            // Calculate starting position (top-left of grid, centered in zone)
            const gridWidth = (cols - 1) * nodeSpacing;
            const gridHeight = (rows - 1) * nodeSpacing;
            const startX = zoneCenterX - gridWidth / 2;
            const startY = zoneCenterY - gridHeight / 2;
            
            // Position each node with collision detection
            articlesWithTag.forEach((article, index) => {
                const col = index % cols;
                const row = Math.floor(index / cols);
                const preferredX = startX + col * nodeSpacing;
                const preferredY = startY + row * nodeSpacing;
                
                // Check if node already has a saved or valid position - DON'T reposition existing nodes
                const savedPos = savedPositions[article.id];
                const existingPos = currentPositions[article.id];
                
                if (savedPos && (savedPos.x !== 0 || savedPos.y !== 0)) {
                    // Node has saved position, keep it
                    console.log(`Node ${article.id} has saved position, skipping`);
                    return;
                }
                
                if (existingPos && (existingPos.x !== 0 || existingPos.y !== 0)) {
                    // Node already positioned in current session, keep it
                    console.log(`Node ${article.id} has current position, skipping`);
                    return;
                }
                
                // Find free position for new node only
                console.log(`Positioning new node ${article.id}`);
                const position = findFreePositionInZone(preferredX, preferredY, zone, article.id, occupiedPositions, isPositionOccupied);
                
                // Update occupied positions list
                const existingIndex = occupiedPositions.findIndex(p => p.nodeId === article.id);
                if (existingIndex >= 0) {
                    occupiedPositions[existingIndex] = { x: position.x, y: position.y, nodeId: article.id };
                } else {
                    occupiedPositions.push({ x: position.x, y: position.y, nodeId: article.id });
                }
                
                // Add to update batch
                nodesToUpdate.push({
                    id: article.id,
                    x: position.x,
                    y: position.y,
                    fixed: false
                });
            });
        });
    }
    
    // Handle nodes WITHOUT tags (position in grid)
    const untaggedArticles = appData.articles.filter(a => !a.categories || a.categories.length === 0);
    
    if (untaggedArticles.length > 0) {
        // Create a grid layout for untagged nodes
        const nodeSpacing = 250;
        const cols = Math.ceil(Math.sqrt(untaggedArticles.length));
        const rows = Math.ceil(untaggedArticles.length / cols);
        
        // Start position (centered on canvas)
        const startX = -((cols - 1) * nodeSpacing) / 2;
        const startY = -((rows - 1) * nodeSpacing) / 2;
        
        untaggedArticles.forEach((article, index) => {
            // Check if already has a saved or valid position - DON'T reposition existing nodes
            const savedPos = savedPositions[article.id];
            const existingPos = currentPositions[article.id];
            
            if (savedPos && (savedPos.x !== 0 || savedPos.y !== 0)) {
                console.log(`Untagged node ${article.id} has saved position, skipping`);
                return; // Keep saved position
            }
            
            if (existingPos && (existingPos.x !== 0 || existingPos.y !== 0)) {
                console.log(`Untagged node ${article.id} has current position, skipping`);
                return; // Keep existing position
            }
            
            console.log(`Positioning new untagged node ${article.id}`);
            
            const col = index % cols;
            const row = Math.floor(index / cols);
            let x = startX + col * nodeSpacing;
            let y = startY + row * nodeSpacing;
            
            // Check for collision and adjust
            let attempts = 0;
            while (isPositionOccupied(x, y, article.id) && attempts < 50) {
                x += (Math.random() - 0.5) * 100;
                y += (Math.random() - 0.5) * 100;
                attempts++;
            }
            
            // Update occupied positions
            const existingIndex = occupiedPositions.findIndex(p => p.nodeId === article.id);
            if (existingIndex >= 0) {
                occupiedPositions[existingIndex] = { x, y, nodeId: article.id };
            } else {
                occupiedPositions.push({ x, y, nodeId: article.id });
            }
            
            nodesToUpdate.push({
                id: article.id,
                x: x,
                y: y,
                fixed: false
            });
        });
    }
    
    // Apply all position updates at once
    if (nodesToUpdate.length > 0) {
        network.body.data.nodes.update(nodesToUpdate);
        saveToLocalStorage(true);
    }
}

function findFreePositionInZone(preferredX, preferredY, zone, nodeId, occupiedPositions, isPositionOccupied) {
    const padding = 120;
    const maxAttempts = 100;
    const spiralStep = 40;
    
    // Try preferred position first
    if (!isPositionOccupied(preferredX, preferredY, nodeId)) {
        return { x: preferredX, y: preferredY };
    }
    
    // Spiral outward to find free spot
    for (let attempt = 1; attempt < maxAttempts; attempt++) {
        const angle = attempt * 0.5;
        const radius = attempt * spiralStep;
        
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
            const testX = preferredX + Math.cos(angle + a) * radius;
            const testY = preferredY + Math.sin(angle + a) * radius;
            
            // Check if within zone bounds
            if (testX >= zone.x + padding && testX <= zone.x + zone.width - padding &&
                testY >= zone.y + padding && testY <= zone.y + zone.height - padding) {
                
                if (!isPositionOccupied(testX, testY, nodeId)) {
                    return { x: testX, y: testY };
                }
            }
        }
    }
    
    // Fallback: random position in zone with collision check
    for (let i = 0; i < 20; i++) {
        const testX = zone.x + padding + Math.random() * (zone.width - 2 * padding);
        const testY = zone.y + padding + Math.random() * (zone.height - 2 * padding);
        if (!isPositionOccupied(testX, testY, nodeId)) {
            return { x: testX, y: testY };
        }
    }
    
    // Last resort
    return {
        x: zone.x + padding + Math.random() * (zone.width - 2 * padding),
        y: zone.y + padding + Math.random() * (zone.height - 2 * padding)
    };
}
