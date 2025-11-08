// ===== GRAPH VISUALIZATION =====
// vis-network graph initialization, data preparation, and update logic

let searchHighlightedNodes = [];

// Calculate luminance to determine text color contrast
function getContrastColor(hexColor) {
    // Remove # if present
    const hex = hexColor.replace('#', '');
    
    // Convert to RGB
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Calculate relative luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Return white for dark backgrounds, dark for light backgrounds
    // Threshold adjusted to 0.55 to allow more dark text on lighter backgrounds
    return luminance > 0.55 ? '#333333' : '#ffffff';
}

function initializeGraph() {
    const container = document.getElementById('graphContainer');
    const graphData = getGraphData();
    
    // Check if we're in gallery viewer mode (read-only)
    const isGalleryViewer = window.isGalleryViewer || false;
    const isReadOnly = window.isReadOnlyMode || isGalleryViewer;
    console.log(`📊 Initializing graph - Gallery viewer: ${isGalleryViewer}, Read-only mode: ${isReadOnly}`);
    
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
                enabled: true,
                type: 'continuous', // Continuous smooth curves
                roundness: 0.15 // Low roundness for smoother transitions at control points
            },
            hoverWidth: 0,
            chosen: false
        },
        physics: {
            enabled: false  // Physics disabled
        },
        interaction: {
            hover: true,
            hoverConnectedEdges: true,
            selectConnectedEdges: true,
            tooltipDelay: 200,
            dragView: false,  // Disable default left-click drag
            multiselect: !isReadOnly,  // Disable multi-selection in read-only mode
            selectable: true,
            dragNodes: !isReadOnly  // Disable node dragging in read-only mode
        }
    };
    
    console.log('Initializing graph with container:', container);
    console.log('Data:', graphData);
    
    network = new vis.Network(container, graphData, options);
    
    // Force disable node dragging in gallery viewer mode
    if (isGalleryViewer) {
        network.setOptions({
            interaction: {
                dragNodes: false,
                dragView: false,
                selectable: true  // Keep selection enabled for viewing cards
            },
            manipulation: {
                enabled: false
            }
        });
        
        // Also fix nodes in place so they can't be moved programmatically
        const allNodes = network.body.data.nodes.get();
        allNodes.forEach(node => {
            network.body.data.nodes.update({
                id: node.id,
                fixed: { x: true, y: true }
            });
        });
    }
    
    // Make network globally accessible for other modules
    window.network = network;
    
    // Enable right-click drag for panning
    const canvas = network.canvas.frame.canvas;
    let dragStartPos = { x: 0, y: 0 };
    
    canvas.addEventListener('mousedown', (event) => {
        // In gallery viewer mode, ONLY allow panning (both left and right click)
        const isGalleryViewer = window.isGalleryViewer || false;
        
        if (isGalleryViewer) {
            // In gallery viewer, both left and right click do panning
            if (event.button === 0 || event.button === 2) {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation(); // Stop vis-network from handling this event
                isDraggingView = true;
                dragStartPos = { x: event.clientX, y: event.clientY };
                
                // Hide selection box and radial menus when starting to pan
                hideSelectionBox();
                hideRadialMenu();
                hideSelectionRadialMenu();
            }
            return; // Exit early - no other interactions allowed in gallery viewer
        }
        
        // Normal editor mode - right click for panning
        if (event.button === 2) {
            event.preventDefault();
            event.stopPropagation();
            isDraggingView = true;
            dragStartPos = { x: event.clientX, y: event.clientY };
            
            // Hide selection box and radial menus when starting to pan
            hideSelectionBox();
            hideRadialMenu();
            hideSelectionRadialMenu();
            return;
        }
        
        // Left click interactions (only in normal editor mode)
        if (event.button === 0 && !connectionMode.active) {
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
                
                // Find and store nested zones
                zoneMoving.originalNestedZones = findNestedZones(titleClick.zoneIndex);
                
                network.redraw();
                return;
            }
            
            // Check if clicking inside a zone or selection box
            const clickPos = { x: event.offsetX, y: event.offsetY };
            const nodeId = network.getNodeAt(clickPos);
            const edgeId = network.getEdgeAt(clickPos);
            
            if (!nodeId && !edgeId) {
                // PRIORITY 1: Check if clicking inside an existing selection box FIRST
                if (multiSelection.selectionBox && multiSelection.selectionBox.style.display !== 'none') {
                    const canvas = network.canvas.frame.canvas;
                    const rect = canvas.getBoundingClientRect();
                    const mouseX = event.clientX - rect.left;
                    const mouseY = event.clientY - rect.top;
                    
                    const boxLeft = parseFloat(multiSelection.selectionBox.style.left);
                    const boxTop = parseFloat(multiSelection.selectionBox.style.top);
                    const boxWidth = parseFloat(multiSelection.selectionBox.style.width);
                    const boxHeight = parseFloat(multiSelection.selectionBox.style.height);
                    
                    // Check if click is inside the selection box
                    if (mouseX >= boxLeft && mouseX <= boxLeft + boxWidth &&
                        mouseY >= boxTop && mouseY <= boxTop + boxHeight) {
                        event.preventDefault();
                        event.stopPropagation();
                        startSelectionBoxDrag(event, mouseX, mouseY, boxLeft, boxTop);
                        return;
                    }
                }
                
                // PRIORITY 2: Check if clicking inside a zone (only if NOT inside selection box)
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
                    
                    // Find and store nested zones
                    zoneMoving.originalNestedZones = findNestedZones(zoneClick.zoneIndex);
                    
                    network.redraw();
                    return;
                } else {
                    if (selectedZoneIndex !== -1) {
                        selectedZoneIndex = -1;
                        hideZoneDeleteButton();
                        network.redraw();
                    }
                    
                    // PRIORITY 3: Start new selection box
                    event.preventDefault();
                    event.stopPropagation();
                    startSelectionBox(event);
                }
            }
        }
    }, true);
    
    canvas.addEventListener('dblclick', (event) => {
        // Disable zone title editing in gallery viewer mode
        if (!connectionMode.active && !window.isGalleryViewer) {
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
        } else if (multiSelection.boxDragging) {
            event.preventDefault();
            event.stopPropagation();
            updateSelectionBoxDrag(event);
        } else if (multiSelection.active) {
            event.preventDefault();
            event.stopPropagation();
            updateSelectionBox(event);
        }
        
        if (!isDraggingView && !zoneMoving.active && !zoneResizing.active && !multiSelection.active && !multiSelection.boxDragging && !connectionMode.active) {
            updateZoneCursor(event);
        }
    }, true);
    
    canvas.addEventListener('mouseup', (event) => {
        const isGalleryViewer = window.isGalleryViewer || false;
        
        // Stop panning on right click release
        if (event.button === 2) {
            isDraggingView = false;
            return;
        }
        
        // Stop panning on left click release in gallery viewer
        if (event.button === 0 && isGalleryViewer) {
            if (isDraggingView) {
                isDraggingView = false;
            }
            return; // Exit early - no other interactions in gallery viewer
        }
        
        // Normal editor interactions for left click
        if (event.button === 0 && (zoneMoving.active || zoneMoving.readyToMove)) {
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
        } else if (event.button === 0 && multiSelection.boxDragging) {
            event.preventDefault();
            event.stopPropagation();
            endSelectionBoxDrag();
        } else if (event.button === 0 && multiSelection.active) {
            event.preventDefault();
            event.stopPropagation();
            endSelectionBox();
        }
    }, true);
    
    network.canvas.body.container.addEventListener('mousemove', (event) => {
        if (!isDraggingView && !zoneMoving.active && !zoneResizing.active && !multiSelection.active && !multiSelection.boxDragging && !connectionMode.active && !zoneEditing.active) {
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
                
                // Check node zone membership to update colors after positions are restored
                setTimeout(() => {
                    if (typeof checkNodeZoneMembership === 'function' && tagZones.length > 0) {
                        console.log('🎨 Checking zone membership after project load...');
                        checkNodeZoneMembership();
                    }
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
            return;
        }
        
        if (params.nodes.length > 0) {
            const nodeId = params.nodes[0];
            
            // Check if it's a control point (negative ID)
            if (isControlPoint(nodeId)) {
                const container = document.getElementById('graphContainer');
                const rect = container.getBoundingClientRect();
                const screenX = rect.left + params.pointer.DOM.x;
                const screenY = rect.top + params.pointer.DOM.y;
                
                showControlPointMenu(screenX, screenY, nodeId);
                return;
            }
            
            // Ctrl+Click for multi-selection
            if (params.event.srcEvent.ctrlKey || params.event.srcEvent.metaKey) {
                console.log('🔵 Ctrl+Click on node:', nodeId);
                
                // If this node is NOT in the selection, add it
                if (!multiSelection.selectedNodes.includes(nodeId)) {
                    multiSelection.selectedNodes.push(nodeId);
                    selectedNodeId = nodeId; // Update for next selection
                } else {
                    // Node already selected - remove it (toggle)
                    multiSelection.selectedNodes = multiSelection.selectedNodes.filter(id => id !== nodeId);
                    // Update selectedNodeId to the last remaining node or null
                    selectedNodeId = multiSelection.selectedNodes.length > 0 ? multiSelection.selectedNodes[multiSelection.selectedNodes.length - 1] : null;
                }
                
                console.log('→ Selection now:', multiSelection.selectedNodes);
                
                if (multiSelection.selectedNodes.length > 0) {
                    network.selectNodes(multiSelection.selectedNodes);
                    
                    // Calculate bounding box of all selected nodes
                    const positions = network.getPositions(multiSelection.selectedNodes);
                    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                    
                    Object.values(positions).forEach(pos => {
                        minX = Math.min(minX, pos.x);
                        minY = Math.min(minY, pos.y);
                        maxX = Math.max(maxX, pos.x);
                        maxY = Math.max(maxY, pos.y);
                    });
                    
                    // Add padding (50 units in canvas coordinates)
                    const padding = 50;
                    minX -= padding;
                    minY -= padding;
                    maxX += padding;
                    maxY += padding;
                    
                    // Convert to DOM coordinates
                    const topLeft = network.canvasToDOM({ x: minX, y: minY });
                    const bottomRight = network.canvasToDOM({ x: maxX, y: maxY });
                    
                    const graphContainer = document.getElementById('graphContainer');
                    const containerRect = graphContainer.getBoundingClientRect();
                    
                    // Create or update selection box
                    if (!multiSelection.selectionBox) {
                        multiSelection.selectionBox = document.createElement('div');
                        multiSelection.selectionBox.id = 'selectionBox';
                        multiSelection.selectionBox.style.position = 'absolute';
                        multiSelection.selectionBox.style.pointerEvents = 'none';
                        multiSelection.selectionBox.style.zIndex = '1000';
                        document.querySelector('#graphContainer > div').appendChild(multiSelection.selectionBox);
                    }
                    
                    multiSelection.selectionBox.style.border = '2px dashed #4a90e2';
                    multiSelection.selectionBox.style.backgroundColor = 'rgba(74, 144, 226, 0.1)';
                    multiSelection.selectionBox.style.left = topLeft.x + 'px';
                    multiSelection.selectionBox.style.top = topLeft.y + 'px';
                    multiSelection.selectionBox.style.width = (bottomRight.x - topLeft.x) + 'px';
                    multiSelection.selectionBox.style.height = (bottomRight.y - topLeft.y) + 'px';
                    multiSelection.selectionBox.style.display = 'block';
                    
                    console.log('📦 Calculating zones for selected nodes...');
                    // Calculate which zones to drag with the selected nodes
                    // For each node, find the SMALLEST zone that contains it
                    const zonesSet = new Set();
                    multiSelection.selectedNodes.forEach(nodeId => {
                        const article = appData.articles.find(a => a.id === nodeId);
                        console.log(`Node ${nodeId} categories:`, article?.categories);
                        if (article && article.categories.length > 0) {
                            // Find all zones for this node's categories
                            const nodeZones = [];
                            article.categories.forEach(tag => {
                                const zoneIdx = tagZones.findIndex(z => z.tag === tag);
                                if (zoneIdx !== -1) {
                                    const zone = tagZones[zoneIdx];
                                    nodeZones.push({ idx: zoneIdx, zone: zone, area: zone.width * zone.height });
                                }
                            });
                            
                            console.log(`Node ${nodeId} has ${nodeZones.length} zones:`, nodeZones);
                            // Sort by size and keep only the smallest zone for this node
                            if (nodeZones.length > 0) {
                                nodeZones.sort((a, b) => a.area - b.area);
                                zonesSet.add(nodeZones[0].idx); // Add only the smallest zone
                                console.log(`Selected smallest zone ${nodeZones[0].idx} for node ${nodeId}`);
                            }
                        }
                    });
                    
                    console.log('Final zones to drag:', Array.from(zonesSet));
                    
                    // Convert to array (already the smallest zones)
                    multiSelection.selectedZonesForDrag = Array.from(zonesSet);
                    
                    // Position menu at center top of selection box
                    const menuX = containerRect.left + (topLeft.x + bottomRight.x) / 2;
                    const menuY = containerRect.top + topLeft.y - 30;
                    
                    showSelectionRadialMenu(menuX, menuY);
                } else {
                    hideSelectionRadialMenu();
                    hideSelectionBox();
                    network.unselectAll();
                }
                
                closeArticlePreview();
                hideRadialMenu();
                
                // Important: return here to avoid executing the rest of the click handler
                return;
            }
            
            // Set selected node ID for keyboard shortcuts
            selectedNodeId = nodeId;
            selectedEdgeId = null;
            console.log('✅ Set selectedNodeId to:', selectedNodeId);
            
            // Hide selection box when clicking on a node (unless in multi-selection mode)
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
            
            // Extract actual edge ID if it's a segment
            let actualEdgeId = edgeId;
            if (typeof edgeId === 'string' && edgeId.includes('_seg_')) {
                actualEdgeId = parseInt(edgeId.split('_seg_')[0]);
            }
            
            if (actualEdgeId === lastEdgeClickId && now - lastEdgeClickTime < 300) {
                // Double-click detected - open inline editor for the ORIGINAL edge
                hideEdgeMenu();
                editEdgeLabelInline(actualEdgeId, null, params.pointer.DOM);
                lastEdgeClickTime = 0;
                lastEdgeClickId = null;
                return;
            }
            
            lastEdgeClickTime = now;
            lastEdgeClickId = actualEdgeId;
            
            if (!connectionMode.active) {
                selectedEdgeId = edgeId; // Keep the visual edge ID for menu
                selectedNodeId = null;
                
                hideRadialMenu();
                hideZoneDeleteButton();
                hideSelectionRadialMenu();
                closeArticlePreview();
                
                // Hide selection box when clicking on an edge and clear selection
                hideSelectionBox();
                multiSelection.selectedNodes = [];
                multiSelection.selectedZonesForDrag = [];
                if (network) network.unselectAll();
                
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
            
            // Hide selection box when clicking on empty space and clear selection
            hideSelectionBox();
            multiSelection.selectedNodes = [];
            multiSelection.selectedZonesForDrag = [];
            if (network) network.unselectAll();
        }
    });
    
    let isAdjustingViewForNode = false; // Flag to prevent infinite loops
    
    function openRadialMenuForNode(nodeId) {
        // Prevent recursive calls
        if (isAdjustingViewForNode) return;
        
        selectedNodeId = nodeId;
        selectedEdgeId = null;
        
        const nodePosition = network.getPositions([nodeId])[nodeId];
        const canvasPosition = network.canvasToDOM(nodePosition);
        
        const container = document.getElementById('graphContainer');
        const rect = container.getBoundingClientRect();
        
        const node = network.body.nodes[nodeId];
        const nodeWidth = node.shape.width || 100;
        const nodeHeight = node.shape.height || 50;
        
        // Check if node or radial menu would be behind the preview card
        const previewWidth = 400;
        const menuRadius = 70; // Approximate radial menu radius
        const margin = 70;
        const leftThreshold = previewWidth + margin;
        
        // Check if menu buttons would be behind card
        const menuLeft = canvasPosition.x - menuRadius;
        
        if (menuLeft < leftThreshold) {
            isAdjustingViewForNode = true;
            
            const currentView = network.getViewPosition();
            const currentScale = network.getScale();
            
            // Calculate how much to shift right (in canvas coordinates)
            const targetX = leftThreshold + menuRadius;
            const shiftNeeded = (targetX - canvasPosition.x) / currentScale;
            
            // Move view without animation to avoid loops
            network.moveTo({
                position: { x: currentView.x - shiftNeeded, y: currentView.y },
                scale: currentScale,
                animation: false
            });
            
            // Wait for view to update then show menu
            setTimeout(() => {
                const newCanvasPosition = network.canvasToDOM(nodePosition);
                const screenX = rect.left + newCanvasPosition.x;
                const screenY = rect.top + newCanvasPosition.y;
                showRadialMenu(screenX, screenY, nodeId, nodeWidth, nodeHeight);
                showArticlePreview(nodeId);
                isAdjustingViewForNode = false;
            }, 50);
        } else {
            const screenX = rect.left + canvasPosition.x;
            const screenY = rect.top + canvasPosition.y;
            showRadialMenu(screenX, screenY, nodeId, nodeWidth, nodeHeight);
            showArticlePreview(nodeId);
        }
        
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
    
    // Prevent dragging in gallery viewer mode
    network.on('dragStart', (params) => {
        if (window.isGalleryViewer && params.nodes && params.nodes.length > 0) {
            // Cancel the drag by not allowing it to proceed
            return false;
        }
    });
    
    network.on('dragging', (params) => {
        // Block dragging in gallery viewer mode
        if (window.isGalleryViewer) {
            return false;
        }
        
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
                
                // Store initial positions of zones that are part of the selection
                if (multiSelection.selectedZonesForDrag.length > 0) {
                    multiSelection.zonesDragStart = {};
                    multiSelection.selectedZonesForDrag.forEach(zoneIdx => {
                        const zone = tagZones[zoneIdx];
                        multiSelection.zonesDragStart[zoneIdx] = { x: zone.x, y: zone.y };
                    });
                    
                    // Also store initial node position for calculating delta
                    const firstNode = params.nodes[0];
                    const pos = network.getPositions([firstNode])[firstNode];
                    multiSelection.nodeDragStart = { x: pos.x, y: pos.y };
                }
            }
        }
        
        // Move zones along with nodes if they're part of the selection
        if (params.nodes.length > 0 && multiSelection.selectedZonesForDrag.length > 0 && multiSelection.nodeDragStart) {
            const firstNode = params.nodes[0];
            const currentPos = network.getPositions([firstNode])[firstNode];
            
            const dx = currentPos.x - multiSelection.nodeDragStart.x;
            const dy = currentPos.y - multiSelection.nodeDragStart.y;
            
            multiSelection.selectedZonesForDrag.forEach(zoneIdx => {
                const zone = tagZones[zoneIdx];
                const startPos = multiSelection.zonesDragStart[zoneIdx];
                zone.x = startPos.x + dx;
                zone.y = startPos.y + dy;
            });
            
            network.redraw();
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
                            },
                            font: { color: getContrastColor(zone.color) }
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
                            },
                            font: { color: '#333333' }
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
        // Block dragEnd in gallery viewer mode
        if (window.isGalleryViewer) {
            return false;
        }
        
        if (params.nodes.length > 0) {
            // Save zones to localStorage if they were moved during this drag
            if (multiSelection.selectedZonesForDrag.length > 0) {
                saveToLocalStorage(true);
            }
            
            // Clean up zone drag tracking
            multiSelection.zonesDragStart = {};
            multiSelection.nodeDragStart = null;
            
            updateZoneSizes();
            checkNodeZoneMembership();
            
            // CRITICAL: Update savedNodePositions immediately after drag
            const positions = network.getPositions();
            window.savedNodePositions = positions;
            console.log('Node dragged - positions updated in memory:', Object.keys(positions).length, 'nodes');
            
            // Check if any dragged node is a control point (negative ID)
            const draggedControlPoints = params.nodes.filter(nodeId => nodeId < 0);
            
            if (draggedControlPoints.length > 0) {
                console.log('🎯 Control point(s) moved:', draggedControlPoints);
                
                // Find all edges that use these control points and rebuild them
                const edgesToRebuild = new Set();
                for (const edgeId in window.edgeControlPoints) {
                    const controlPoints = window.edgeControlPoints[edgeId];
                    if (controlPoints.some(cpId => draggedControlPoints.includes(cpId))) {
                        edgesToRebuild.add(edgeId);
                    }
                }
                
                console.log('🔄 Rebuilding', edgesToRebuild.size, 'edges to recalculate label position');
                edgesToRebuild.forEach(edgeId => {
                    if (typeof window.rebuildEdgeWithControlPoints === 'function') {
                        window.rebuildEdgeWithControlPoints(parseInt(edgeId));
                    }
                });
            }
            
            // Save to localStorage
            saveToLocalStorage(true);
            
            // Reset drag state
            multiSelection.wasDragging = false;
            
            // Close onboarding if it's open (user has dragged a node)
            if (typeof window.closeOnboarding === 'function') {
                window.closeOnboarding();
            }
            
            // Force a complete redraw to clear any artifacts
            network.redraw();
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
            
            // Draw grid dots - check dark theme
            const isDarkTheme = document.body.classList.contains('dark-theme');
            ctx.fillStyle = isDarkTheme ? 'rgba(232, 234, 240, 0.2)' : 'rgba(0, 0, 0, 0.15)';
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
    });
    
    network.on('hoverNode', (params) => {
        if (connectionMode.active && params.node !== connectionMode.fromNodeId) {
            network.canvas.body.container.style.cursor = "url('assets/cursors/pointer.svg'), pointer";
        }
    });
    
    network.on('blurNode', () => {
        if (connectionMode.active) {
            network.canvas.body.container.style.cursor = "url('assets/cursors/crosshair.svg'), crosshair";
        }
    });
    
    network.on('zoom', () => {
        // Close selection box and menu when zooming
        if (multiSelection.selectionBox && multiSelection.selectionBox.style.display !== 'none') {
            hideSelectionBox();
            hideSelectionRadialMenu();
            hideEmptyAreaMenu();
            if (network) network.unselectAll();
            multiSelection.selectedNodes = [];
            multiSelection.selectedZonesForDrag = [];
            multiSelection.emptyAreaSelection = null;
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
        let fontColor = '#333333'; // Default dark text
        
        if (article.categories.length > 0) {
            // Find the SMALLEST zone for this article (in case of nested zones)
            const articleZones = [];
            article.categories.forEach(tag => {
                const zone = tagZones.find(z => z.tag === tag);
                if (zone) {
                    articleZones.push({ zone, area: zone.width * zone.height });
                }
            });
            
            if (articleZones.length > 0) {
                // Sort by area and use the smallest zone
                articleZones.sort((a, b) => a.area - b.area);
                const smallestZone = articleZones[0].zone;
                
                nodeColor = {
                    background: smallestZone.color,
                    border: darkenColor(smallestZone.color, 20)
                };
                // Calculate appropriate text color based on background
                fontColor = getContrastColor(smallestZone.color);
            }
        }
        
        const labelFormat = localStorage.getItem('nodeLabelFormat') || 'bibtexId';
        
        const nodeData = {
            id: article.id,
            label: getNodeLabel(article, labelFormat),
            color: nodeColor,
            font: { color: fontColor }
        };
        
        // Load saved position if available
        if (window.savedNodePositions && window.savedNodePositions[article.id]) {
            nodeData.x = window.savedNodePositions[article.id].x;
            nodeData.y = window.savedNodePositions[article.id].y;
            nodeData.fixed = { x: false, y: false }; // Allow manual movement but use saved position
        }
        // Check for initial position on article object (for newly imported articles)
        else if (article.x !== undefined && article.y !== undefined) {
            nodeData.x = article.x;
            nodeData.y = article.y;
            nodeData.fixed = { x: false, y: false };
        }
        
        return nodeData;
    }));
    
    const articleIds = new Set(filteredArticles.map(a => a.id));
    
    // Only create edges for connections WITHOUT control points
    // Connections with control points will be built by rebuildEdgeWithControlPoints()
    const edges = new vis.DataSet(appData.connections
        .filter(conn => {
            // Must connect valid articles
            if (!articleIds.has(conn.from) || !articleIds.has(conn.to)) {
                return false;
            }
            // Skip if this connection has control points (will be handled separately)
            if (window.edgeControlPoints && window.edgeControlPoints[conn.id]) {
                console.log('⏭️ Skipping edge', conn.id, 'in getGraphData (has control points)');
                return false;
            }
            return true;
        })
        .map(conn => ({
            id: conn.id,
            from: conn.from,
            to: conn.to,
            label: conn.label || '',
            smooth: {
                enabled: true,
                type: 'continuous',
                roundness: 0.15
            }
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
        
        // Get current view position and scale to restore later
        const viewPosition = network.getViewPosition();
        const scale = network.getScale();
        
        console.log('=== UPDATE GRAPH - Preserving view ===');
        console.log('View position:', viewPosition, 'Scale:', scale);
        
        // IMPORTANT: Get positions BEFORE any updates
        const currentPositions = network.getPositions();
        const savedPositions = window.savedNodePositions || {};
        
        // Get existing control point nodes to preserve them
        const existingNodes = network.body.data.nodes.get();
        const controlPointNodes = existingNodes.filter(node => node.id < 0);
        const existingControlPointIds = new Set(controlPointNodes.map(n => n.id));
        
        console.log('📊 Found', controlPointNodes.length, 'existing control point nodes');
        
        // Get new data from appData
        const graphData = getGraphData();
        const newNodesData = graphData.nodes.get();
        const newEdgesData = graphData.edges.get();
        
        // Get IDs
        const newNodeIds = new Set(newNodesData.map(n => n.id));
        const existingArticleNodeIds = existingNodes.filter(n => n.id > 0).map(n => n.id);
        
        // Find nodes to remove (article nodes that no longer exist)
        const nodesToRemove = existingArticleNodeIds.filter(id => !newNodeIds.has(id));
        
        // Find nodes to add (new article nodes)
        const nodesToAdd = newNodesData.filter(node => {
            const existing = network.body.data.nodes.get(node.id);
            return !existing;
        });
        
        // Update existing nodes (preserve control points)
        const nodesToUpdate = [];
        
        newNodesData.forEach(node => {
            if (savedPositions[node.id]) {
                nodesToUpdate.push({
                    id: node.id,
                    x: savedPositions[node.id].x,
                    y: savedPositions[node.id].y,
                    fixed: { x: false, y: false }
                });
            } else if (currentPositions[node.id]) {
                nodesToUpdate.push({
                    id: node.id,
                    x: currentPositions[node.id].x,
                    y: currentPositions[node.id].y,
                    fixed: { x: false, y: false }
                });
            }
        });
        
        // Apply changes
        if (nodesToRemove.length > 0) {
            console.log('🗑️ Removing', nodesToRemove.length, 'nodes');
            network.body.data.nodes.remove(nodesToRemove);
        }
        
        if (nodesToAdd.length > 0) {
            console.log('➕ Adding', nodesToAdd.length, 'new nodes');
            network.body.data.nodes.add(nodesToAdd);
        }
        
        if (nodesToUpdate.length > 0) {
            console.log('🔄 Updating', nodesToUpdate.length, 'node positions');
            network.body.data.nodes.update(nodesToUpdate);
        }
        
        // Update edges (preserve control point edges)
        const existingEdges = network.body.data.edges.get();
        const existingEdgeIds = new Set(existingEdges.map(e => e.id));
        const newEdgeIds = new Set(newEdgesData.map(e => e.id));
        
        // Remove edges that no longer exist (but not segment edges)
        const edgesToRemove = existingEdges
            .filter(e => !e.id.toString().includes('_seg_') && !newEdgeIds.has(e.id))
            .map(e => e.id);
        
        if (edgesToRemove.length > 0) {
            console.log('🗑️ Removing', edgesToRemove.length, 'edges');
            network.body.data.edges.remove(edgesToRemove);
            
            // Also clean up control points for removed edges
            edgesToRemove.forEach(edgeId => {
                if (edgeControlPoints[edgeId]) {
                    const controlPointsToDelete = edgeControlPoints[edgeId];
                    console.log('🗑️ Cleaning up control points for removed edge', edgeId, ':', controlPointsToDelete);
                    
                    // Remove control point nodes
                    controlPointsToDelete.forEach(cpId => {
                        try {
                            network.body.data.nodes.remove(cpId);
                        } catch (error) {
                            console.error('Error removing control point node:', cpId, error);
                        }
                    });
                    
                    // Remove segment edges - use exact matching to avoid removing wrong segments
                    const segmentEdges = network.body.data.edges.get({
                        filter: (edge) => {
                            const edgeIdStr = edge.id.toString();
                            if (!edgeIdStr.includes('_seg_')) return false;
                            const parts = edgeIdStr.split('_seg_');
                            const edgeNum = parseInt(parts[0]);
                            return edgeNum === edgeId;
                        }
                    });
                    if (segmentEdges.length > 0) {
                        network.body.data.edges.remove(segmentEdges.map(e => e.id));
                        console.log('🗑️ Removed', segmentEdges.length, 'segment edges for edge', edgeId);
                    }
                    
                    // Remove from edgeControlPoints
                    delete edgeControlPoints[edgeId];
                }
            });
        }
        
        // Add or update edges (only for edges WITHOUT control points)
        newEdgesData.forEach(edge => {
            // Double-check: never add/update an edge that has control points
            if (edgeControlPoints[edge.id]) {
                console.log('⏭️ Skipping edge', edge.id, 'in updateGraph (has control points)');
                return;
            }
            
            if (existingEdgeIds.has(edge.id)) {
                network.body.data.edges.update(edge);
            } else {
                network.body.data.edges.add(edge);
            }
        });
        
        // Restore view position and scale
        network.moveTo({
            position: viewPosition,
            scale: scale,
            animation: false
        });
        
        // Rebuild ALL edges with control points (not just ones without segments)
        Object.keys(edgeControlPoints).forEach(edgeId => {
            const edgeIdNum = parseInt(edgeId);
            
            // Check if the connection still exists in appData
            const connectionExists = appData.connections.find(c => c.id === edgeIdNum);
            if (!connectionExists) {
                console.warn('⚠️ Edge', edgeIdNum, 'has control points but no connection in appData - cleaning up');
                // Clean up orphaned control points
                const controlPointsToDelete = edgeControlPoints[edgeIdNum];
                if (controlPointsToDelete) {
                    controlPointsToDelete.forEach(cpId => {
                        try {
                            network.body.data.nodes.remove(cpId);
                        } catch (error) {
                            console.error('Error removing orphaned control point:', cpId, error);
                        }
                    });
                }
                delete edgeControlPoints[edgeIdNum];
                return;
            }
            
            // First, remove the simple edge if it exists
            if (network.body.data.edges.get(edgeIdNum)) {
                console.log('Removing simple edge', edgeIdNum, 'before rebuilding with control points');
                network.body.data.edges.remove(edgeIdNum);
            }
            
            console.log('🔄 Rebuilding edge', edgeIdNum, 'with control points');
            rebuildEdgeWithControlPoints(edgeIdNum);
        });
        
        console.log('✓ Graph updated, view preserved');
    } catch (error) {
        console.error('Error updating graph:', error);
    }
}

// ===== PERMISSIONS & READ-ONLY MODE =====
// Enable or disable graph interaction based on user permissions
function setGraphInteractionMode(readOnly = false) {
    if (!network) {
        console.warn('Cannot set interaction mode: network not initialized');
        return;
    }
    
    console.log(`🔒 Setting graph interaction mode: ${readOnly ? 'READ-ONLY' : 'EDIT'}`);
    
    // Update interaction options
    network.setOptions({
        interaction: {
            hover: true,
            hoverConnectedEdges: true,
            selectConnectedEdges: true,
            tooltipDelay: 200,
            dragView: false,
            multiselect: !readOnly, // Disable multi-selection in read-only
            selectable: true,
            dragNodes: !readOnly // KEY: Disable node dragging in read-only mode
        },
        manipulation: {
            enabled: false // Always disable built-in manipulation UI
        }
    });
    
    // Visual feedback: update toolbar buttons
    if (readOnly) {
        // Disable edit buttons
        const editButtons = [
            'addArticleBtn',
            'deleteArticleBtn',
            'toggleGridBtn'
        ];
        
        editButtons.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.disabled = true;
                btn.classList.add('disabled');
                btn.title = 'View-only access - you cannot edit this project';
            }
        });
        
        // Show read-only indicator
        showReadOnlyIndicator();
    } else {
        // Enable edit buttons
        const editButtons = [
            'addArticleBtn',
            'deleteArticleBtn',
            'toggleGridBtn'
        ];
        
        editButtons.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.disabled = false;
                btn.classList.remove('disabled');
                btn.title = '';
            }
        });
        
        hideReadOnlyIndicator();
    }
}

// Show read-only indicator in UI
function showReadOnlyIndicator() {
    // Check if indicator already exists
    let indicator = document.getElementById('readOnlyIndicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'readOnlyIndicator';
        indicator.className = 'read-only-indicator';
        indicator.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <span>View Only</span>
        `;
        
        // Insert after toolbar
        const toolbar = document.querySelector('.toolbar');
        if (toolbar) {
            toolbar.parentNode.insertBefore(indicator, toolbar.nextSibling);
        }
    }
    indicator.style.display = 'flex';
}

// Hide read-only indicator
function hideReadOnlyIndicator() {
    const indicator = document.getElementById('readOnlyIndicator');
    if (indicator) {
        indicator.style.display = 'none';
    }
}

// Make function globally available
window.setGraphInteractionMode = setGraphInteractionMode;

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
    // NOTE: Don't reset selectedNodes here - it's managed elsewhere
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

function startSelectionBoxDrag(event, mouseX, mouseY, boxLeft, boxTop) {
    multiSelection.boxDragging = true;
    multiSelection.boxDragStart = { x: mouseX, y: mouseY };
    multiSelection.originalBoxPosition = { left: boxLeft, top: boxTop };
    
    // Store initial positions of nodes and zones for dragging
    const canvas = network.canvas.frame.canvas;
    const rect = canvas.getBoundingClientRect();
    const boxWidth = parseFloat(multiSelection.selectionBox.style.width);
    const boxHeight = parseFloat(multiSelection.selectionBox.style.height);
    
    const topLeft = network.DOMtoCanvas({ x: boxLeft, y: boxTop });
    const bottomRight = network.DOMtoCanvas({ x: boxLeft + boxWidth, y: boxTop + boxHeight });
    
    // Store initial node positions
    multiSelection.nodeDragStart = {};
    multiSelection.selectedNodes.forEach(nodeId => {
        const pos = network.getPositions([nodeId])[nodeId];
        if (pos) {
            multiSelection.nodeDragStart[nodeId] = { x: pos.x, y: pos.y };
        }
    });
    
    // Store initial zone positions for zones fully inside the selection
    multiSelection.zonesDragStart = {};
    console.log(`📦 Storing start positions for ${multiSelection.selectedZonesForDrag.length} zones...`);
    multiSelection.selectedZonesForDrag.forEach(zoneIdx => {
        const zone = tagZones[zoneIdx];
        multiSelection.zonesDragStart[zoneIdx] = { x: zone.x, y: zone.y };
        console.log(`  Zone ${zoneIdx} (${zone.tag}): start at x=${zone.x.toFixed(1)}, y=${zone.y.toFixed(1)}`);
    });
    
    network.setOptions({
        interaction: {
            dragNodes: false,
            dragView: false,
            zoomView: false,
            hover: false
        }
    });
}

function updateSelectionBoxDrag(event) {
    if (!multiSelection.boxDragging) return;
    
    const canvas = network.canvas.frame.canvas;
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    const dx = mouseX - multiSelection.boxDragStart.x;
    const dy = mouseY - multiSelection.boxDragStart.y;
    
    // Move the selection box
    const newLeft = multiSelection.originalBoxPosition.left + dx;
    const newTop = multiSelection.originalBoxPosition.top + dy;
    
    multiSelection.selectionBox.style.left = newLeft + 'px';
    multiSelection.selectionBox.style.top = newTop + 'px';
    
    // Calculate canvas coordinate delta
    const canvasDxStart = network.DOMtoCanvas({ x: multiSelection.boxDragStart.x, y: multiSelection.boxDragStart.y });
    const canvasDxCurrent = network.DOMtoCanvas({ x: mouseX, y: mouseY });
    const canvasDx = canvasDxCurrent.x - canvasDxStart.x;
    const canvasDy = canvasDxCurrent.y - canvasDxStart.y;
    
    // Move all selected nodes
    Object.keys(multiSelection.nodeDragStart).forEach(nodeId => {
        const startPos = multiSelection.nodeDragStart[nodeId];
        network.moveNode(nodeId, startPos.x + canvasDx, startPos.y + canvasDy);
    });
    
    // Move all selected zones
    if (multiSelection.selectedZonesForDrag && multiSelection.selectedZonesForDrag.length > 0) {
        console.log(`📦 Moving ${multiSelection.selectedZonesForDrag.length} zones with selection box...`);
        multiSelection.selectedZonesForDrag.forEach(zoneIdx => {
            const zone = tagZones[zoneIdx];
            const startPos = multiSelection.zonesDragStart[zoneIdx];
            if (startPos) {
                zone.x = startPos.x + canvasDx;
                zone.y = startPos.y + canvasDy;
                console.log(`  Moved zone ${zoneIdx} (${zone.tag}) by dx=${canvasDx.toFixed(1)}, dy=${canvasDy.toFixed(1)}`);
            } else {
                console.warn(`  ⚠️ No start position for zone ${zoneIdx}`);
            }
        });
    } else {
        console.log('No zones to move (selectedZonesForDrag empty)');
    }
    
    network.redraw();
}

function endSelectionBoxDrag() {
    if (!multiSelection.boxDragging) return;
    
    multiSelection.boxDragging = false;
    
    // Update zone membership for moved nodes
    checkNodeZoneMembership();
    
    // Save positions
    const positions = network.getPositions();
    window.savedNodePositions = positions;
    saveToLocalStorage(true);
    
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
    
    // Check if any tag zones are completely within the selection
    const fullySelectedZones = [];
    console.log('🔍 Checking for zones in selection box...');
    tagZones.forEach((zone, idx) => {
        const zoneFullyInSelection = zone.x >= topLeft.x && 
                                     zone.y >= topLeft.y &&
                                     zone.x + zone.width <= bottomRight.x &&
                                     zone.y + zone.height <= bottomRight.y;
        
        if (zoneFullyInSelection) {
            console.log(`✅ Zone "${zone.tag}" is fully selected`);
            fullySelectedZones.push({ zone, idx });
            
            // Add all nodes with this zone's tag to selection
            appData.articles.forEach(article => {
                if (article.categories.includes(zone.tag) && !multiSelection.selectedNodes.includes(article.id)) {
                    multiSelection.selectedNodes.push(article.id);
                    console.log(`  Added node ${article.id} (has tag "${zone.tag}")`);
                }
            });
        }
    });
    
    console.log(`📦 Found ${fullySelectedZones.length} fully selected zones`);
    
    // Add nodes that are directly in the selection box
    appData.articles.forEach(article => {
        const pos = network.getPositions([article.id])[article.id];
        if (pos) {
            if (pos.x >= topLeft.x && pos.x <= bottomRight.x &&
                pos.y >= topLeft.y && pos.y <= bottomRight.y) {
                if (!multiSelection.selectedNodes.includes(article.id)) {
                    multiSelection.selectedNodes.push(article.id);
                }
            }
        }
    });
    
    if (multiSelection.selectionBox) {
        multiSelection.selectionBox.style.border = '2px dashed #4a90e2';
    }
    multiSelection.active = false;
    
    // Store fully selected zones for dragging, sorted by size (smallest first)
    // This ensures the smallest zone is in the foreground when dragging
    fullySelectedZones.sort((a, b) => {
        const areaA = a.zone.width * a.zone.height;
        const areaB = b.zone.width * b.zone.height;
        return areaA - areaB;
    });
    multiSelection.selectedZonesForDrag = fullySelectedZones.map(fz => fz.idx);
    console.log(`📦 Zones to drag:`, multiSelection.selectedZonesForDrag);
    console.log(`📦 Selected ${multiSelection.selectedNodes.length} nodes total`);
    
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
    } else {
        // No nodes selected, but allow creating a zone on the selected area
        const menuX = rect.left + boxLeft + boxWidth / 2;
        const menuY = rect.top + boxTop - 30;
        
        // Store the area for zone creation (reuse topLeft and bottomRight calculated above)
        multiSelection.emptyAreaSelection = {
            x: topLeft.x,
            y: topLeft.y,
            width: bottomRight.x - topLeft.x,
            height: bottomRight.y - topLeft.y
        };
        
        console.log('Empty area selection:', multiSelection.emptyAreaSelection);
        showEmptyAreaMenu(menuX, menuY);
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
            // Split by comma or "and" to handle both formats
            const authorsList = article.authors ? article.authors.split(/,| and /i) : [];
            const author = authorsList.length > 0 ? authorsList[0].trim() : 'Unknown';
            const year = article.year || 'n.d.';
            return `${author}, ${year}`;
        case 'author':
            // Split by comma or "and" to handle both formats
            const authors = article.authors ? article.authors.split(/,| and /i) : [];
            return authors.length > 0 ? authors[0].trim() : 'Unknown Author';
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

