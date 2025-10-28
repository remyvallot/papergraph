// ===== GRAPH VISUALIZATION =====
// vis-network graph initialization, data preparation, and update logic

let searchHighlightedNodes = [];

function initializeGraph() {
    const container = document.getElementById('graphContainer');
    const graphData = getGraphData();
    
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
            enabled: false,  // Disabled by default
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
                avoidOverlap: 1.0  // Increased to prevent overlap
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
    console.log('Data:', graphData);
    
    network = new vis.Network(container, graphData, options);
    
    // Enable right-click drag for panning
    const canvas = network.canvas.frame.canvas;
    let dragStartPos = { x: 0, y: 0 };
    
    canvas.addEventListener('mousedown', (event) => {
        if (event.button === 2) { // Right click
            event.preventDefault();
            isDraggingView = true;
            dragStartPos = { x: event.clientX, y: event.clientY };
            
            // Hide selection box and radial menus when starting to pan
            hideSelectionBox();
            hideRadialMenu();
            hideSelectionRadialMenu();
        } else if (event.button === 0 && !connectionMode.active) {
            // Check if clicking on zone edge/corner for resize first
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
                selectedZoneIndex = titleClick.zoneIndex;
                
                const canvas = network.canvas.frame.canvas;
                const rect = canvas.getBoundingClientRect();
                const mouseX = event.clientX - rect.left;
                const mouseY = event.clientY - rect.top;
                const mousePos = network.DOMtoCanvas({ x: mouseX, y: mouseY });
                
                zoneMoving.startX = mousePos.x;
                zoneMoving.startY = mousePos.y;
                zoneMoving.zoneIndex = titleClick.zoneIndex;
                zoneMoving.originalZone = { ...tagZones[titleClick.zoneIndex] };
                zoneMoving.readyToMove = true;
                
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
            
            // Check if clicking inside a zone
            const clickPos = { x: event.offsetX, y: event.offsetY };
            const nodeId = network.getNodeAt(clickPos);
            const edgeId = network.getEdgeAt(clickPos);
            
            if (!nodeId && !edgeId) {
                const zoneClick = getZoneAtPosition(event);
                if (zoneClick.zone !== null) {
                    event.preventDefault();
                    event.stopPropagation();
                    selectedZoneIndex = zoneClick.zoneIndex;
                    
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
                    if (selectedZoneIndex !== -1) {
                        selectedZoneIndex = -1;
                        hideZoneDeleteButton();
                        network.redraw();
                    }
                    
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
                hideZoneDeleteButton();
                startEditZoneTitle(event, titleClick.zoneIndex);
            }
        }
    }, true);
    
    canvas.addEventListener('contextmenu', (event) => {
        event.preventDefault();
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
            const canvas = network.canvas.frame.canvas;
            const rect = canvas.getBoundingClientRect();
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;
            const mousePos = network.DOMtoCanvas({ x: mouseX, y: mouseY });
            
            const dx = Math.abs(mousePos.x - zoneMoving.startX);
            const dy = Math.abs(mousePos.y - zoneMoving.startY);
            
            if (dx > 5 || dy > 5) {
                zoneMoving.active = true;
                zoneMoving.readyToMove = false;
                
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
        
        if (!isDraggingView && !zoneMoving.active && !zoneResizing.active && !multiSelection.active && !connectionMode.active) {
            updateZoneCursor(event);
        }
    }, true);
    
    canvas.addEventListener('mouseup', (event) => {
        if (event.button === 2) {
            isDraggingView = false;
        } else if (event.button === 0 && (zoneMoving.active || zoneMoving.readyToMove)) {
            event.preventDefault();
            event.stopPropagation();
            
            if (zoneMoving.readyToMove && !zoneMoving.active && selectedZoneIndex !== -1) {
                showZoneDeleteButton(selectedZoneIndex);
            }
            
            if (zoneMoving.active) {
                endZoneMove();
            }
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
    
    network.canvas.body.container.addEventListener('mousemove', (event) => {
        if (!isDraggingView && !zoneMoving.active && !zoneResizing.active && !multiSelection.active && !connectionMode.active && !zoneEditing.active) {
            updateZoneCursor(event);
        }
    }, false);
    
    network.on('stabilizationIterationsDone', function () {
        console.log('=== Graph stabilization complete ===');
        console.log('Saved positions available:', window.savedNodePositions ? Object.keys(window.savedNodePositions).length : 0);
        
        // Position nodes and save positions after initial load
        if (window.savedNodePositions && Object.keys(window.savedNodePositions).length > 0) {
            // Restore saved positions
            console.log('Restoring saved positions for', Object.keys(window.savedNodePositions).length, 'nodes');
            const nodesToUpdate = [];
            Object.keys(window.savedNodePositions).forEach(nodeId => {
                const pos = window.savedNodePositions[nodeId];
                nodesToUpdate.push({
                    id: parseInt(nodeId),
                    x: pos.x,
                    y: pos.y,
                    fixed: { x: false, y: false }
                });
            });
            if (nodesToUpdate.length > 0) {
                network.body.data.nodes.update(nodesToUpdate);
                console.log('✓ Applied saved positions to', nodesToUpdate.length, 'nodes');
                // Fit after restoring positions
                setTimeout(() => {
                    network.fit();
                    console.log('Graph fitted after position restoration');
                }, 100);
            }
        } else {
            console.log('No saved positions, initializing zones from tags');
            // Initial positioning for new project
            if (tagZones.length === 0 && appData.articles.length > 0) {
                initializeZonesFromTags();
            }
            positionNodesInZones();
            network.fit();
        }
    });
    
    let lastEdgeClickTime = 0;
    let lastEdgeClickId = null;
    
    network.on('click', (params) => {
        if (connectionMode.active) {
            handleConnectionModeClick(params);
        } else if (params.nodes.length > 0) {
            const nodeId = params.nodes[0];
            
            // Hide selection box when clicking on a node
            hideSelectionBox();
            
            if (selectedNodeId !== null && selectedNodeId !== nodeId) {
                hideRadialMenu();
                hideEdgeMenu();
                hideZoneDeleteButton();
                hideSelectionRadialMenu();
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
            const edgeId = params.edges[0];
            const now = Date.now();
            
            if (edgeId === lastEdgeClickId && now - lastEdgeClickTime < 300) {
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
            
            if (!connectionMode.active) {
                selectedEdgeId = edgeId;
                selectedNodeId = null;
                
                hideRadialMenu();
                hideZoneDeleteButton();
                hideSelectionRadialMenu();
                closeArticlePreview();
                
                // Hide selection box when clicking on an edge
                hideSelectionBox();
                
                const container = document.getElementById('graphContainer');
                const rect = container.getBoundingClientRect();
                
                const screenX = rect.left + params.pointer.DOM.x + 30;
                const screenY = rect.top + params.pointer.DOM.y - 22;
                
                showEdgeMenu(screenX, screenY, edgeId);
                
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
            
            // Hide selection box when clicking on empty space
            hideSelectionBox();
        }
    });
    
    function openRadialMenuForNode(nodeId) {
        selectedNodeId = nodeId;
        selectedEdgeId = null;
        
        showArticlePreview(nodeId);
        
        const nodePosition = network.getPositions([nodeId])[nodeId];
        const canvasPosition = network.canvasToDOM(nodePosition);
        
        const container = document.getElementById('graphContainer');
        const rect = container.getBoundingClientRect();
        
        const screenX = rect.left + canvasPosition.x;
        const screenY = rect.top + canvasPosition.y;
        
        const node = network.body.nodes[nodeId];
        const nodeWidth = node.shape.width || 100;
        const nodeHeight = node.shape.height || 50;
        
        showRadialMenu(screenX, screenY, nodeId, nodeWidth, nodeHeight);
        
        network.setOptions({ 
            interaction: { 
                dragNodes: true,
                dragView: false,
                zoomView: false,
                hover: true,
                hoverConnectedEdges: false
            } 
        });
    }
    
    network.on('dragging', (params) => {
        // Save state on first drag event
        if (params.nodes.length > 0 && !multiSelection.wasDragging) {
            multiSelection.wasDragging = true;
            
            // Check if we're dragging nodes that are part of a multi-selection
            const isDraggingSelection = params.nodes.some(nodeId => 
                multiSelection.selectedNodes.includes(nodeId)
            );
            
            if (isDraggingSelection) {
                // Save if we had a selection menu active
                multiSelection.menuActive = document.getElementById('selectionRadialMenu')?.classList.contains('active') || 
                                           multiSelection.selectedNodes.length > 0;
                console.log('Dragging selection, saved state:', multiSelection);
            }
        }
        
        // Hide selection box and selection radial menu when dragging nodes
        if (params.nodes.length > 0) {
            hideSelectionBox();
            hideSelectionRadialMenu();
            
            // Also hide single node radial menu if dragging multiple nodes
            if (params.nodes.length > 1) {
                hideRadialMenu();
            }
        }
        
        // Update radial menu position only for single node drag
        if (params.nodes.length === 1 && document.getElementById('radialMenu').classList.contains('active')) {
            const nodeId = params.nodes[0];
            if (nodeId === selectedNodeId) {
                const nodePosition = network.getPositions([nodeId])[nodeId];
                const canvasPosition = network.canvasToDOM(nodePosition);
                
                const container = document.getElementById('graphContainer');
                const rect = container.getBoundingClientRect();
                
                const screenX = rect.left + canvasPosition.x;
                const screenY = rect.top + canvasPosition.y;
                
                const node = network.body.nodes[nodeId];
                const nodeWidth = node.shape.width || 100;
                const nodeHeight = node.shape.height || 50;
                
                updateRadialMenuPosition(screenX, screenY, nodeWidth, nodeHeight);
            }
        }
        
        if (params.nodes.length > 0) {
            const nodeId = params.nodes[0];
            const nodePos = network.getPositions([nodeId])[nodeId];
            const article = appData.articles.find(a => a.id === nodeId);
            
            if (article) {
                tagZones.forEach(zone => {
                    const isInZone = isNodeInZone(nodePos, zone);
                    const hasTag = article.categories.includes(zone.tag);
                    
                    if (isInZone && !hasTag) {
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
                        article.categories = article.categories.filter(c => c !== zone.tag);
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
    
    network.on('dragEnd', (params) => {
        if (params.nodes.length > 0) {
            updateZoneSizes();
            checkNodeZoneMembership();
            
            // CRITICAL: Update savedNodePositions immediately after drag
            const positions = network.getPositions();
            window.savedNodePositions = positions;
            console.log('Node dragged - positions updated in memory:', Object.keys(positions).length, 'nodes');
            
            // Save to localStorage
            saveToLocalStorage(true);
            
            // Reset drag state
            multiSelection.wasDragging = false;
            
            // Close onboarding if it's open (user has dragged a node)
            if (typeof window.closeOnboarding === 'function') {
                window.closeOnboarding();
            }
        }
    });
    
    network.on('stabilizationProgress', (params) => {
        updateRadialMenuIfActive();
    });
    
    network.on('beforeDrawing', (ctx) => {
        // Draw grid if enabled
        if (gridEnabled) {
            const scale = network.getScale();
            const viewPosition = network.getViewPosition();
            const canvasSize = network.canvas.frame.canvas;
            
            // Calculate visible area in canvas coordinates
            const topLeft = network.DOMtoCanvas({ x: 0, y: 0 });
            const bottomRight = network.DOMtoCanvas({ 
                x: canvasSize.width, 
                y: canvasSize.height 
            });
            
            // Grid spacing (in canvas coordinates)
            const spacing = 60;
            
            // Calculate grid bounds
            const minX = Math.floor(topLeft.x / spacing) * spacing;
            const maxX = Math.ceil(bottomRight.x / spacing) * spacing;
            const minY = Math.floor(topLeft.y / spacing) * spacing;
            const maxY = Math.ceil(bottomRight.y / spacing) * spacing;
            
            // Draw grid dots
            ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
            for (let x = minX; x <= maxX; x += spacing) {
                for (let y = minY; y <= maxY; y += spacing) {
                    ctx.beginPath();
                    ctx.arc(x, y, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
        
        // Draw tag zones
        drawTagZones(ctx);
        
        if (network.physics.physicsEnabled) {
            updateRadialMenuIfActive();
        }
    });
    
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
        let nodeColor = { border: '#4a90e2', background: '#e3f2fd' };
        
        if (article.categories.length > 0) {
            const firstCategory = article.categories[0];
            const zone = tagZones.find(z => z.tag === firstCategory);
            if (zone) {
                nodeColor = {
                    background: zone.color,
                    border: darkenColor(zone.color, 20)
                };
            }
        }
        
        const labelFormat = localStorage.getItem('nodeLabelFormat') || 'bibtexId';
        
        const nodeData = {
            id: article.id,
            label: getNodeLabel(article, labelFormat),
            color: nodeColor
        };
        
        // Load saved position if available
        if (window.savedNodePositions && window.savedNodePositions[article.id]) {
            nodeData.x = window.savedNodePositions[article.id].x;
            nodeData.y = window.savedNodePositions[article.id].y;
            nodeData.fixed = { x: false, y: false }; // Allow manual movement but use saved position
        }
        
        return nodeData;
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
        searchHighlightedNodes = [];
        
        // IMPORTANT: Get positions BEFORE setData (setData will reset positions)
        const currentPositions = network.getPositions();
        const savedPositions = window.savedNodePositions || {};
        
        console.log('=== UPDATE GRAPH DEBUG ===');
        console.log('Current positions count:', Object.keys(currentPositions).length);
        console.log('Saved positions count:', Object.keys(savedPositions).length);
        
        const graphData = getGraphData();
        console.log('Graph data nodes count:', graphData.nodes.get().length);
        
        network.setData(graphData);
        
        // Restore positions - prioritize savedPositions (from localStorage), then currentPositions
        const nodesToUpdate = [];
        const newNodes = []; // Nodes without any saved position
        
        // Get all node IDs from the DataSet
        const allNodes = graphData.nodes.get();
        
        allNodes.forEach(node => {
            // PRIORITY 1: Saved positions from localStorage (persists across refreshes)
            if (savedPositions[node.id]) {
                const savedPos = savedPositions[node.id];
                // Accept any position (even 0,0 might be intentional)
                console.log(`✓ Node ${node.id}: Using saved position`, savedPos);
                nodesToUpdate.push({
                    id: node.id,
                    x: savedPos.x,
                    y: savedPos.y,
                    fixed: { x: false, y: false }
                });
            }
            // PRIORITY 2: Current session positions (before setData)
            else if (currentPositions[node.id]) {
                const currPos = currentPositions[node.id];
                console.log(`✓ Node ${node.id}: Using current position`, currPos);
                nodesToUpdate.push({
                    id: node.id,
                    x: currPos.x,
                    y: currPos.y,
                    fixed: { x: false, y: false }
                });
            } 
            // NEW NODE: Needs positioning
            else {
                console.log(`⚠ Node ${node.id}: New node (no saved position)`);
                newNodes.push(node.id);
            }
        });
        
        if (nodesToUpdate.length > 0) {
            console.log('Restoring positions for', nodesToUpdate.length, 'nodes');
            network.body.data.nodes.update(nodesToUpdate);
        }
        
        // Only position new nodes to avoid overlap
        if (newNodes.length > 0) {
            console.log('Positioning new nodes:', newNodes);
            positionNodesInZones();
        }
        
        // Don't call stabilize if we have saved positions
        if (nodesToUpdate.length === 0 && newNodes.length === 0) {
            network.stabilize(10);
        }
    } catch (error) {
        console.error('Error updating graph:', error);
    }
}

// ===== GRAPH SEARCH ===== [VERSION 2025-10-27-16:00]
function searchInGraph(searchTerm = '') {
    console.log('[SEARCH] Function called with term:', searchTerm);
    if (!network) return;
    
    const resultCount = document.getElementById('searchResultCount');
    
    // Clear previous highlights first
    if (searchHighlightedNodes.length > 0) {
        console.log('Clearing previous search highlights:', searchHighlightedNodes.length);
        const nodesToUpdate = searchHighlightedNodes.map(nodeId => {
            const article = appData.articles.find(a => a.id === nodeId);
            let resetBorder = '#4a90e2';
            let resetBackground = '#e3f2fd';
            
            // Restore original color based on category
            if (article && article.categories.length > 0) {
                const firstCategory = article.categories[0];
                const zone = tagZones.find(z => z.tag === firstCategory);
                if (zone) {
                    resetBackground = zone.color;
                    resetBorder = darkenColor(zone.color, 20);
                }
            }
            
            return {
                id: nodeId,
                borderWidth: 3,
                color: {
                    border: resetBorder,
                    background: resetBackground,
                    highlight: {
                        border: resetBorder,
                        background: resetBackground
                    }
                }
            };
        });
        network.body.data.nodes.update(nodesToUpdate);
        searchHighlightedNodes = [];
        network.redraw();  // Force redraw after clearing
    }
    
    if (!searchTerm || searchTerm.trim() === '') {
        if (resultCount) resultCount.textContent = '';
        return;
    }
    
    const term = searchTerm.toLowerCase().trim();
    const matchingArticles = [];
    
    appData.articles.forEach(article => {
        let matches = false;
        
        if (article.title.toLowerCase().includes(term)) {
            matches = true;
        }
        
        if (article.categories.some(cat => cat.toLowerCase().includes(term))) {
            matches = true;
        }
        
        if (article.authors && article.authors.toLowerCase().includes(term)) {
            matches = true;
        }
        
        if (article.text && article.text.toLowerCase().includes(term)) {
            matches = true;
        }
        
        if (matches) {
            matchingArticles.push(article);
        }
    });
    
    if (resultCount) {
        if (matchingArticles.length === 0) {
            resultCount.textContent = '0';
            resultCount.style.color = '#999';
        } else {
            resultCount.textContent = `${matchingArticles.length}`;
            resultCount.style.color = '#4a90e2';
        }
    }
    
    if (matchingArticles.length === 0) {
        return;
    }
    
    const matchingNodeIds = matchingArticles.map(a => a.id);
    searchHighlightedNodes = matchingNodeIds;
    
    console.log('Highlighting nodes with yellow border:', matchingNodeIds.length);
    
    const nodesToUpdate = matchingNodeIds.map(nodeId => {
        const article = appData.articles.find(a => a.id === nodeId);
        
        // Get original border color
        let originalBorder = '#4a90e2';
        let originalBackground = '#e3f2fd';
        
        if (article && article.categories.length > 0) {
            const firstCategory = article.categories[0];
            const zone = tagZones.find(z => z.tag === firstCategory);
            if (zone) {
                originalBorder = darkenColor(zone.color, 20);
                originalBackground = zone.color;
            }
        }
        
        return {
            id: nodeId,
            borderWidth: 4,
            color: {
                border: '#ffd54f',  // Yellow border like list view
                background: originalBackground,  // Keep original background
                highlight: {
                    border: '#ffb300',
                    background: originalBackground
                }
            }
        };
    });
    network.body.data.nodes.update(nodesToUpdate);
    network.redraw();  // Force redraw after highlighting
    
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
        network.fit({
            nodes: matchingNodeIds,
            animation: {
                duration: 500,
                easingFunction: 'easeInOutQuad'
            }
        });
    }
}

// ===== MULTI-SELECTION BOX =====
function hideSelectionBox() {
    if (multiSelection.selectionBox) {
        multiSelection.selectionBox.style.display = 'none';
    }
    multiSelection.selectedNodes = [];
    multiSelection.active = false;
}

function startSelectionBox(event) {
    if (connectionMode.active) return;
    
    multiSelection.active = true;
    
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
    
    const boxLeft = parseFloat(multiSelection.selectionBox.style.left);
    const boxTop = parseFloat(multiSelection.selectionBox.style.top);
    const boxWidth = parseFloat(multiSelection.selectionBox.style.width);
    const boxHeight = parseFloat(multiSelection.selectionBox.style.height);
    
    // If box is too small (just a click), hide it and cancel
    if (boxWidth < 10 && boxHeight < 10) {
        multiSelection.selectionBox.style.display = 'none';
        multiSelection.active = false;
        
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
        return;
    }
    
    const topLeft = network.DOMtoCanvas({ 
        x: boxLeft, 
        y: boxTop 
    });
    const bottomRight = network.DOMtoCanvas({ 
        x: boxLeft + boxWidth, 
        y: boxTop + boxHeight 
    });
    
    multiSelection.selectedNodes = [];
    appData.articles.forEach(article => {
        const pos = network.getPositions([article.id])[article.id];
        if (pos) {
            if (pos.x >= topLeft.x && pos.x <= bottomRight.x &&
                pos.y >= topLeft.y && pos.y <= bottomRight.y) {
                multiSelection.selectedNodes.push(article.id);
            }
        }
    });
    
    if (multiSelection.selectionBox) {
        multiSelection.selectionBox.style.border = '2px dashed #4a90e2';
    }
    multiSelection.active = false;
    
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
    
    if (multiSelection.selectedNodes.length > 0) {
        network.selectNodes(multiSelection.selectedNodes);
        
        const menuX = rect.left + boxLeft + boxWidth / 2;
        const menuY = rect.top + boxTop - 30;
        
        showSelectionRadialMenu(menuX, menuY);
    }
}

// ===== SNAP TO GRID =====
function snapNodesToGrid(nodeIds, realtime = false) {
    if (!network) return;
    
    const gridSpacing = 60; // Match the grid display spacing
    const positions = network.getPositions(nodeIds);
    const nodesToUpdate = [];
    
    nodeIds.forEach(nodeId => {
        const pos = positions[nodeId];
        if (pos) {
            // Snap to nearest grid point
            const snappedX = Math.round(pos.x / gridSpacing) * gridSpacing;
            const snappedY = Math.round(pos.y / gridSpacing) * gridSpacing;
            
            // Always update position during drag for immediate feedback
            nodesToUpdate.push({
                id: nodeId,
                x: snappedX,
                y: snappedY,
                fixed: false
            });
        }
    });
    
    if (nodesToUpdate.length > 0) {
        network.body.data.nodes.update(nodesToUpdate);
    }
}

// ===== NODE LABEL FORMATTING =====

function getNodeLabel(article, format) {
    switch(format) {
        case 'bibtexId':
            return article.bibtexId || article.id;
        case 'title':
            return article.title || 'Untitled';
        case 'citation':
            const author = article.authors ? article.authors.split(',')[0].trim() : 'Unknown';
            const year = article.year || 'n.d.';
            return `${author}, ${year}`;
        case 'author':
            return article.authors ? article.authors.split(',')[0].trim() : 'Unknown Author';
        default:
            return article.title || 'Untitled';
    }
}

function applyNodeLabelFormat(format) {
    localStorage.setItem('nodeLabelFormat', format);
    
    if (!network) return;
    
    const nodesToUpdate = appData.articles.map(article => ({
        id: article.id,
        label: getNodeLabel(article, format)
    }));
    
    network.body.data.nodes.update(nodesToUpdate);
    showNotification(`Node labels updated to: ${format}`, 'success');
}

