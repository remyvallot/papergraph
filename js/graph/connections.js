// ===== CONNECTIONS =====
// Connection/edge management and creation

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
    
    // Close onboarding if it's open
    if (typeof window.closeOnboarding === 'function') {
        window.closeOnboarding();
    }
}

function editConnectionLabel(edgeId) {
    const connection = appData.connections.find(c => c.id === edgeId);
    if (!connection) return;
    
    const currentLabel = connection.label || '';
    const newLabel = prompt('Label de la connexion (optionnel):', currentLabel);
    
    if (newLabel !== null) {
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
    
    // Use the pointer position directly (where user clicked)
    const container = document.getElementById('graphContainer');
    const rect = container.getBoundingClientRect();
    const screenPos = {
        x: rect.left + pointerDOM.x,
        y: rect.top + pointerDOM.y
    };
    
    // Create inline input
    const input = document.createElement('input');
    input.type = 'text';
    input.value = connection.label || '';
    input.placeholder = 'Label';
    input.style.position = 'fixed';
    input.style.left = screenPos.x + 'px';
    input.style.top = screenPos.y + 'px';
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
    
    isEditingEdgeLabel = true;
    
    const save = () => {
        connection.label = input.value.trim();
        isEditingEdgeLabel = false;
        
        // Just rebuild this specific edge instead of calling updateGraph
        rebuildEdgeWithControlPoints(edgeId);
        
        saveToLocalStorage();
        input.remove();
        if (connection.label) {
            showNotification('Label mis à jour!', 'success');
        }
    };
    
    input.addEventListener('blur', save);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            save();
        } else if (e.key === 'Escape') {
            isEditingEdgeLabel = false;
            input.remove();
        }
    });
    
    // Close when clicking outside
    const clickHandler = (e) => {
        if (e.target !== input && input.parentElement) {
            save();
            document.removeEventListener('click', clickHandler);
        }
    };
    setTimeout(() => {
        document.addEventListener('click', clickHandler);
    }, 100);
}

function deleteConnection(edgeId) {
    console.log('🗑️ Deleting connection:', edgeId);
    
    // Check if edgeId is a segment, extract actual edge ID
    let actualEdgeId = edgeId;
    if (typeof edgeId === 'string' && edgeId.includes('_seg_')) {
        actualEdgeId = parseInt(edgeId.split('_seg_')[0]);
        console.log('📍 Detected segment edge, actual edge ID:', actualEdgeId);
    }
    
    // Delete all control points for THIS SPECIFIC edge only
    if (edgeControlPoints[actualEdgeId]) {
        const controlPointsToDelete = edgeControlPoints[actualEdgeId];
        console.log('🗑️ Deleting', controlPointsToDelete.length, 'control points for edge', actualEdgeId, ':', controlPointsToDelete);
        
        // Remove control point nodes from network
        controlPointsToDelete.forEach(cpId => {
            try {
                network.body.data.nodes.remove(cpId);
                console.log('✅ Removed control point node:', cpId);
            } catch (error) {
                console.error('❌ Error removing control point node:', cpId, error);
            }
        });
        
        // Remove segment edges for THIS SPECIFIC edge only
        // Use exact matching to avoid removing segments from other edges
        const segmentEdgesToRemove = network.body.data.edges.get({
            filter: (edge) => {
                const edgeIdStr = edge.id.toString();
                if (!edgeIdStr.includes('_seg_')) return false;
                const parts = edgeIdStr.split('_seg_');
                const edgeNum = parseInt(parts[0]);
                return edgeNum === actualEdgeId;
            }
        });
        
        if (segmentEdgesToRemove.length > 0) {
            console.log('🗑️ Removing', segmentEdgesToRemove.length, 'segment edges for edge', actualEdgeId);
            network.body.data.edges.remove(segmentEdgesToRemove.map(e => e.id));
        }
        
        // Remove from edgeControlPoints map
        delete edgeControlPoints[actualEdgeId];
        console.log('✅ Cleared control points for edge', actualEdgeId);
    }
    
    // Remove the main edge if it exists (it might not if it has control points)
    try {
        if (network.body.data.edges.get(actualEdgeId)) {
            network.body.data.edges.remove(actualEdgeId);
            console.log('✅ Removed main edge:', actualEdgeId);
        }
    } catch (error) {
        console.log('Note: Main edge', actualEdgeId, 'not found in network (this is ok if it had control points)');
    }
    
    // Remove the connection from appData
    appData.connections = appData.connections.filter(c => c.id !== actualEdgeId);
    console.log('✅ Connection removed from appData');
    
    updateGraph();
    saveToLocalStorage();
    showNotification('Connexion supprimée', 'info');
}

function showEdgeMenu(x, y, edgeId) {
    const menu = document.getElementById('edgeMenu');
    
    console.log('📍 ========== SHOWING EDGE MENU ==========');
    console.log('📍 Position:', x, y);
    console.log('📍 Edge ID:', edgeId, 'Type:', typeof edgeId);
    console.log('📍 =========================================');
    
    // Store original click position (screen coordinates)
    menu.dataset.originalX = x;
    menu.dataset.originalY = y;
    
    // Position menu with offset (down and left)
    const offsetX = -30;  // Décalage vers la gauche
    const offsetY = 30;   // Décalage vers le bas
    menu.style.left = (x + offsetX) + 'px';
    menu.style.top = (y + offsetY) + 'px';
    menu.classList.add('active');
    
    // Position buttons in a circle around the click point
    const buttons = menu.querySelectorAll('.edge-btn');
    console.log('Found', buttons.length, 'buttons in edge menu');
    
    const radius = 60;
    const startAngle = -Math.PI / 2; // Start at top
    const angleStep = (2 * Math.PI) / buttons.length;
    
    buttons.forEach((button, index) => {
        const angle = startAngle + angleStep * index;
        const btnX = Math.cos(angle) * radius;
        const btnY = Math.sin(angle) * radius;
        
        button.style.left = (btnX - 22) + 'px';
        button.style.top = (btnY - 22) + 'px';
        
        // Clone button to remove ALL old event listeners
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        
        // Attach click handler to the clean button with the correct edgeId captured in closure
        newButton.addEventListener('click', function handleEdgeButtonClick(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('🔵 Edge button clicked:', newButton.dataset.action, 'for edge:', edgeId);
            
            const action = newButton.dataset.action;
            
            if (action === 'add-control') {
                console.log('Adding control point to edge:', edgeId);
                hideEdgeMenu();
                
                // Get the original click position and convert to canvas coordinates
                const originalX = parseFloat(menu.dataset.originalX);
                const originalY = parseFloat(menu.dataset.originalY);
                const canvasPos = network.DOMtoCanvas({ x: originalX, y: originalY });
                
                console.log('📍 Canvas position for control point:', canvasPos);
                addControlPointToEdge(edgeId, canvasPos);
            } else if (action === 'edit-label') {
                console.log('Editing label for edge:', edgeId);
                hideEdgeMenu();
                
                // Use the ORIGINAL click position (not menu position)
                const container = document.getElementById('graphContainer');
                const rect = container.getBoundingClientRect();
                const originalX = parseFloat(menu.dataset.originalX);
                const originalY = parseFloat(menu.dataset.originalY);
                const pointerDOM = {
                    x: originalX - rect.left,
                    y: originalY - rect.top
                };
                console.log('Opening edit at original position:', pointerDOM);
                editEdgeLabelInline(edgeId, null, pointerDOM);
            } else if (action === 'delete') {
                console.log('Deleting edge:', edgeId);
                hideEdgeMenu();
                deleteConnection(edgeId);
            }
        });
        
        console.log(`Button ${index} (${newButton.dataset.action}) positioned at:`, newButton.style.left, newButton.style.top);
    });
    
    // Store edgeId for the menu actions
    menu.dataset.edgeId = edgeId;
    selectedEdgeId = edgeId;
    console.log('✓ Edge menu shown, selectedEdgeId:', selectedEdgeId);
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

function startConnectionMode(fromNodeId) {
    // Cannot start connection from a control point
    if (fromNodeId < 0) {
        console.log('⚠️ Cannot start connection from control point:', fromNodeId);
        return;
    }
    
    connectionMode.active = true;
    connectionMode.fromNodeId = fromNodeId;
    connectionMode.hoveredNodeId = null;
    
    // Show indicator
    document.getElementById('connectionModeIndicator').classList.add('active');
    
    // Change cursor
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
                    hover: '#848484'
                }
            }
        });
        
        // Create temporary invisible node for cursor tracking
        const tempNodeId = 'temp-cursor-node';
        connectionMode.tempNode = tempNodeId;
        
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
        
        // Update temp node on mouse move
        const canvas = network.canvas.frame.canvas;
        connectionMode.mouseMoveHandler = function(event) {
            if (!connectionMode.active) return;
            
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            
            const canvasPos = network.DOMtoCanvas({x: x, y: y});
            
            if (!connectionMode.hoveredNodeId) {
                network.body.data.nodes.update({
                    id: tempNodeId,
                    x: canvasPos.x,
                    y: canvasPos.y
                });
            }
        };
        
        canvas.addEventListener('mousemove', connectionMode.mouseMoveHandler);
        
        // Track hover for snapping
        connectionMode.hoverHandler = function(params) {
            if (connectionMode.active && params.node !== connectionMode.fromNodeId) {
                connectionMode.hoveredNodeId = params.node;
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
    
    showNotification('Cliquez sur un nœud pour créer la connexion', 'info');
}

function handleConnectionModeClick(params) {
    if (params.nodes.length > 0) {
        const toNodeId = params.nodes[0];
        
        // Ignore control points (negative IDs) - they are not valid connection targets
        if (toNodeId < 0) {
            console.log('⚠️ Cannot connect to control point:', toNodeId);
            return;
        }
        
        if (toNodeId === connectionMode.tempNode) {
            return;
        }
        
        if (toNodeId === connectionMode.fromNodeId) {
            showNotification('Un article ne peut pas se connecter à lui-même', 'error');
            return;
        }
        
        // Check if connection exists
        const exists = appData.connections.some(c => 
            c.from === connectionMode.fromNodeId && c.to === toNodeId
        );
        
        if (exists) {
            showNotification('Cette connexion existe déjà', 'error');
            cancelConnectionMode();
            return;
        }
        
        // Remove temporary preview
        if (connectionMode.tempEdge && network) {
            try {
                network.body.data.edges.remove(connectionMode.tempEdge);
            } catch (e) {}
            connectionMode.tempEdge = null;
        }
        
        // Remove temporary node
        if (connectionMode.tempNode && network) {
            try {
                network.body.data.nodes.remove(connectionMode.tempNode);
            } catch (e) {}
            connectionMode.tempNode = null;
        }
        
        // Create connection
        connectionMode.toNodeId = toNodeId;
        createConnection('');
    } else {
        // Cancel on empty click
        cancelConnectionMode();
    }
}

function cancelConnectionMode() {
    connectionMode.active = false;
    connectionMode.fromNodeId = null;
    connectionMode.toNodeId = null;
    connectionMode.hoveredNodeId = null;
    
    // Remove listeners
    if (connectionMode.mouseMoveHandler && network) {
        const canvas = network.canvas.frame.canvas;
        canvas.removeEventListener('mousemove', connectionMode.mouseMoveHandler);
        connectionMode.mouseMoveHandler = null;
    }
    
    if (connectionMode.hoverHandler && network) {
        network.off('hoverNode', connectionMode.hoverHandler);
        connectionMode.hoverHandler = null;
    }
    if (connectionMode.blurHandler && network) {
        network.off('blurNode', connectionMode.blurHandler);
        connectionMode.blurHandler = null;
    }
    
    // Remove temporary edge
    if (connectionMode.tempEdge && network) {
        try {
            network.body.data.edges.remove(connectionMode.tempEdge);
        } catch (e) {}
    }
    connectionMode.tempEdge = null;
    
    // Remove temporary node
    if (connectionMode.tempNode && network) {
        try {
            network.body.data.nodes.remove(connectionMode.tempNode);
        } catch (e) {}
    }
    connectionMode.tempNode = null;
    
    document.getElementById('connectionModeIndicator').classList.remove('active');
    
    if (network) {
        network.canvas.body.container.style.cursor = 'default';
        network.setOptions({
            interaction: {
                hover: true,
                hoverConnectedEdges: true,
                selectConnectedEdges: true
            },
            edges: {
                hoverWidth: 0.5,
                selectionWidth: 1,
                color: {
                    hover: '#4a90e2'
                }
            }
        });
    }
    
    showNotification('Mode connexion annulé', 'info');
}

// ===== EDGE CONTROL POINTS =====
// System for adding/removing control points on edges to route them around nodes

let edgeControlPoints = {}; // { edgeId: [controlPointNodeId, ...] }
let nextControlPointId = -1; // Negative IDs for control points

// Expose globally for access from other modules
window.edgeControlPoints = edgeControlPoints;
window.nextControlPointId = nextControlPointId;

// Add control point to an edge
function addControlPointToEdge(edgeId, clickPosition = null) {
    console.log('🔵 ========== ADD CONTROL POINT TO EDGE ==========');
    console.log('🔵 Called with edgeId:', edgeId, 'Type:', typeof edgeId);
    console.log('🔵 Click position:', clickPosition);
    console.log('� Current edgeControlPoints:', JSON.stringify(edgeControlPoints));
    console.log('� Next control point ID:', nextControlPointId);
    console.log('🔵 ================================================');
    
    // Check if this is a segment edge (contains _seg_)
    let actualEdgeId = edgeId;
    let segmentIndex = -1;
    
    if (typeof edgeId === 'string' && edgeId.includes('_seg_')) {
        // Extract original edge ID and segment index
        const parts = edgeId.split('_seg_');
        actualEdgeId = parseInt(parts[0]);
        segmentIndex = parseInt(parts[1]);
        console.log('📍 Detected segment edge. Original edge:', actualEdgeId, 'Segment:', segmentIndex);
    }
    
    const connection = appData.connections.find(c => c.id === actualEdgeId);
    if (!connection) {
        console.error('❌ Connection not found for edgeId:', actualEdgeId);
        console.log('Available connections:', appData.connections);
        return;
    }
    
    console.log('✓ Connection found:', connection);
    
    // Get edge position (we need to find the actual visual edge)
    let edge;
    if (segmentIndex >= 0) {
        // Get the segment edge
        edge = network.body.data.edges.get(edgeId);
        console.log('📍 Using segment edge:', edgeId, edge);
    } else {
        edge = network.body.data.edges.get(actualEdgeId);
        console.log('📍 Using main edge:', actualEdgeId, edge);
    }
    
    if (!edge) {
        console.error('❌ Edge not found in vis-network:', edgeId);
        console.log('Available edges:', network.body.data.edges.get());
        return;
    }
    
    console.log('✓ Edge found in network:', edge);
    console.log('✓ Edge connects from node', edge.from, 'to node', edge.to);
    
    // Verify the edge belongs to the correct connection
    if (segmentIndex < 0) {
        // For main edges, verify from/to match the connection
        if (edge.from !== connection.from || edge.to !== connection.to) {
            console.error('❌ Edge mismatch! Edge:', edge, 'Connection:', connection);
            console.error('This edge does not belong to the expected connection!');
            return;
        }
    }
    
    const fromPos = network.getPositions([edge.from])[edge.from];
    const toPos = network.getPositions([edge.to])[edge.to];
    
    console.log('📍 From node', edge.from, 'position:', fromPos);
    console.log('📍 To node', edge.to, 'position:', toPos);
    
    if (!fromPos || !toPos) {
        console.error('❌ Could not get positions for edge nodes');
        return;
    }
    
    // Create control point node at click position or middle of the segment
    const controlPointId = nextControlPointId--;
    window.nextControlPointId = nextControlPointId; // Sync with global
    
    const controlPoint = clickPosition ? {
        x: clickPosition.x,
        y: clickPosition.y
    } : {
        x: (fromPos.x + toPos.x) / 2,
        y: (fromPos.y + toPos.y) / 2
    };
    
    console.log('🎯 Creating control point node:', controlPointId, 'at:', controlPoint, clickPosition ? '(click position)' : '(center)');
    console.log('🎯 For edge', actualEdgeId, 'connecting', connection.from, '->', connection.to);
    
    // Add control point node - small center with transparent border for larger interaction
    try {
        network.body.data.nodes.add({
            id: controlPointId,
            x: controlPoint.x,
            y: controlPoint.y,
            shape: 'dot',
            size: 2, // Small visible center
            color: {
                background: '#848484', // Grey visible center
                border: 'rgba(132, 132, 132, 0.01)', // Nearly transparent border for interaction
                highlight: {
                    background: '#4a90e2',
                    border: '#3578ba'
                }
            },
            borderWidth: 3, // Wide transparent border = larger click area
            physics: false,
            fixed: false,
            label: '',
            group: 'controlPoint',
            chosen: {
                node: function(values, id, selected, hovering) {
                    if (hovering) {
                        // On hover: larger visible size with visible border
                        values.size = 5;
                        values.borderWidth = 2;
                        values.borderColor = '#666666';
                    } else {
                        // Not hovering: small visible center with transparent border
                        values.size = 2;
                        values.borderWidth = 3;
                        values.borderColor = 'rgba(132, 132, 132, 0.01)';
                    }
                }
            }
        });
        console.log('✅ Control point node added to network');
    } catch (error) {
        console.error('❌ Error adding control point node:', error);
        return;
    }
    
    // Store control point at the right position - ONLY for this specific edge
    if (!edgeControlPoints[actualEdgeId]) {
        edgeControlPoints[actualEdgeId] = [];
        console.log('📝 Created new control points array for edge', actualEdgeId);
    }
    
    // Double-check that this control point doesn't already exist in ANY edge
    for (const [existingEdgeId, existingPoints] of Object.entries(edgeControlPoints)) {
        if (existingPoints.includes(controlPointId)) {
            console.error('❌ Control point', controlPointId, 'already exists in edge', existingEdgeId);
            return;
        }
    }
    
    if (segmentIndex >= 0 && edgeControlPoints[actualEdgeId].length > 0) {
        // We're clicking on a segment between existing control points
        // segmentIndex corresponds to the position in the chain
        // Chain is: from -> cp[0] -> cp[1] -> ... -> to
        // Segment 0: from -> cp[0]
        // Segment 1: cp[0] -> cp[1]
        // Segment N: cp[N-1] -> to
        // So clicking on segment i means we want to insert AFTER cp[i-1]
        // which is at position i in the array
        edgeControlPoints[actualEdgeId].splice(segmentIndex, 0, controlPointId);
        console.log('✅ Control point', controlPointId, 'inserted at index', segmentIndex, 'in existing chain for edge', actualEdgeId);
    } else {
        // First control point or clicking on original edge
        edgeControlPoints[actualEdgeId].push(controlPointId);
        console.log('✅ Control point', controlPointId, 'added to edge', actualEdgeId, '(first or at end)');
    }
    
    console.log('✅ Edge', actualEdgeId, 'now has points:', edgeControlPoints[actualEdgeId]);
    console.log('📊 All edgeControlPoints:', edgeControlPoints);
    
    // Rebuild edges through control points
    console.log('🔄 Calling rebuildEdgeWithControlPoints...');
    rebuildEdgeWithControlPoints(actualEdgeId);
    
    console.log('💾 Saving to localStorage...');
    saveToLocalStorage();
    
    showNotification('Point de contrôle ajouté', 'success');
    console.log('✅ addControlPointToEdge complete');
}

// Remove control point from edge
function removeControlPointFromEdge(controlPointId) {
    console.log('🗑️ Removing control point:', controlPointId);
    
    // Find which edge this control point belongs to
    let edgeId = null;
    let pointIndex = -1;
    
    for (const [eid, points] of Object.entries(edgeControlPoints)) {
        const idx = points.indexOf(controlPointId);
        if (idx !== -1) {
            edgeId = parseInt(eid);
            pointIndex = idx;
            break;
        }
    }
    
    if (edgeId === null) {
        console.error('❌ Control point not found in any edge');
        return;
    }
    
    // Remove control point node
    network.body.data.nodes.remove(controlPointId);
    
    // Remove from array
    edgeControlPoints[edgeId].splice(pointIndex, 1);
    
    // Remove entry if no more control points
    if (edgeControlPoints[edgeId].length === 0) {
        delete edgeControlPoints[edgeId];
    }
    
    // Rebuild edges
    rebuildEdgeWithControlPoints(edgeId);
    saveToLocalStorage();
    showNotification('Point de contrôle supprimé', 'success');
}

// Rebuild edge path through control points
function rebuildEdgeWithControlPoints(edgeId) {
    console.log('🔄 rebuildEdgeWithControlPoints called for edge:', edgeId);
    
    const connection = appData.connections.find(c => c.id === edgeId);
    if (!connection) {
        console.error('❌ Connection not found for edge:', edgeId);
        return;
    }
    
    const controlPoints = edgeControlPoints[edgeId] || [];
    
    console.log('� Edge', edgeId, 'has', controlPoints.length, 'control points:', controlPoints);
    console.log('📊 Connection:', connection);
    
    // Remove all intermediate edges for this connection - use exact matching
    const edgesToRemove = network.body.data.edges.get({
        filter: (edge) => {
            const edgeIdStr = edge.id.toString();
            if (!edgeIdStr.includes('_seg_')) return false;
            const parts = edgeIdStr.split('_seg_');
            const edgeNum = parseInt(parts[0]);
            return edgeNum === edgeId;
        }
    });
    
    console.log('🗑️ Removing', edgesToRemove.length, 'segment edges for edge', edgeId);
    network.body.data.edges.remove(edgesToRemove.map(e => e.id));
    
    if (controlPoints.length === 0) {
        // No control points - restore original edge with label
        console.log('⚪ No control points - restoring original edge');
        if (!network.body.data.edges.get(edgeId)) {
            network.body.data.edges.add({
                id: edgeId,
                from: connection.from,
                to: connection.to,
                label: connection.label || '', // Always show label
                smooth: {
                    enabled: true,
                    type: 'continuous', // Same as segments for consistency
                    roundness: 0.15
                }
            });
            console.log('✅ Original edge restored with label:', connection.label);
        } else {
            // Edge exists, just update its label and smooth
            network.body.data.edges.update({
                id: edgeId,
                label: connection.label || '',
                smooth: {
                    enabled: true,
                    type: 'continuous',
                    roundness: 0.15
                }
            });
            console.log('✅ Edge label updated:', connection.label);
        }
    } else {
        // Has control points - create chain of smooth curved edges
        console.log('🔗 Building edge chain with control points');
        
        // Remove original edge if it exists
        if (network.body.data.edges.get(edgeId)) {
            network.body.data.edges.remove(edgeId);
            console.log('🗑️ Removed original edge', edgeId);
        }
        
        // Build chain: from -> cp1 -> cp2 -> ... -> to
        const chain = [connection.from, ...controlPoints, connection.to];
        console.log('📍 Chain:', chain);
        
        // Find the longest segment to place the label
        let longestSegmentIndex = 0;
        let maxDistance = 0;
        
        for (let i = 0; i < chain.length - 1; i++) {
            const fromPos = network.getPositions([chain[i]])[chain[i]];
            const toPos = network.getPositions([chain[i + 1]])[chain[i + 1]];
            const distance = Math.sqrt(
                Math.pow(toPos.x - fromPos.x, 2) + 
                Math.pow(toPos.y - fromPos.y, 2)
            );
            
            if (distance > maxDistance) {
                maxDistance = distance;
                longestSegmentIndex = i;
            }
        }
        
        console.log('📏 Longest segment is', longestSegmentIndex, 'with distance', maxDistance);
        
        // Create segments
        for (let i = 0; i < chain.length - 1; i++) {
            const segmentId = `${edgeId}_seg_${i}`;
            const isLast = (i === chain.length - 2);
            const isLongest = (i === longestSegmentIndex);
            
            const newEdge = {
                id: segmentId,
                from: chain[i],
                to: chain[i + 1],
                label: isLongest ? (connection.label || '') : '', // Label on longest segment
                arrows: isLast ? { to: { enabled: true } } : { to: { enabled: false } }, // Arrow only on last segment
                smooth: {
                    enabled: true,
                    type: 'continuous', // Continuous for smoother transitions at control points
                    roundness: 0.15 // Lower roundness to avoid sharp angles at control points
                },
                color: {
                    color: '#848484',
                    highlight: '#4a90e2'
                }
            };
            
            console.log(`➕ Adding/updating segment ${i}:`, segmentId, 'from', chain[i], 'to', chain[i + 1], 'label:', newEdge.label);
            
            // Use update if exists, add if not
            try {
                const existing = network.body.data.edges.get(segmentId);
                if (existing) {
                    network.body.data.edges.update(newEdge);
                } else {
                    network.body.data.edges.add(newEdge);
                }
            } catch (e) {
                console.error('Error adding/updating segment:', e);
            }
        }
        
        console.log('✅ Created', chain.length - 1, 'segment edges');
    }
    
    console.log('🎨 Redrawing network...');
    
    // Force network to update smooth settings
    network.setOptions({
        edges: {
            smooth: {
                enabled: true,
                type: 'continuous',
                roundness: 0.15
            }
        }
    });
    
    network.redraw();
    console.log('✅ rebuildEdgeWithControlPoints complete');
}

// Update all edges with control points after node movement
function updateAllEdgesWithControlPoints() {
    Object.keys(edgeControlPoints).forEach(edgeId => {
        rebuildEdgeWithControlPoints(parseInt(edgeId));
    });
}

// Restore control point nodes after loading from storage
function restoreControlPointNodes() {
    console.log('🔄 Restoring control point nodes from storage...');
    
    const savedPositions = window.savedNodePositions || {};
    const controlPointsToRestore = [];
    
    Object.entries(edgeControlPoints).forEach(([edgeId, controlPointIds]) => {
        const connection = appData.connections.find(c => c.id === parseInt(edgeId));
        if (!connection) {
            console.warn('⚠️ Connection not found for edge:', edgeId);
            return;
        }
        
        controlPointIds.forEach((cpId, index) => {
            // Check if node already exists
            if (network.body.data.nodes.get(cpId)) {
                console.log('✓ Control point node', cpId, 'already exists');
                return;
            }
            
            // Try to get saved position first
            let position;
            if (savedPositions[cpId]) {
                position = savedPositions[cpId];
                console.log('✓ Using saved position for control point', cpId, ':', position);
            } else {
                // Calculate default position if not saved
                console.warn('⚠️ No saved position for control point', cpId, ', calculating default');
                
                const fromPos = savedPositions[connection.from] || network.getPositions([connection.from])[connection.from];
                const toPos = savedPositions[connection.to] || network.getPositions([connection.to])[connection.to];
                
                if (!fromPos || !toPos) {
                    console.error('❌ Cannot calculate position for control point', cpId);
                    return;
                }
                
                // Distribute evenly along the edge
                const ratio = (index + 1) / (controlPointIds.length + 1);
                position = {
                    x: fromPos.x + (toPos.x - fromPos.x) * ratio,
                    y: fromPos.y + (toPos.y - fromPos.y) * ratio
                };
            }
            
            controlPointsToRestore.push({
                id: cpId,
                x: position.x,
                y: position.y,
                shape: 'dot',
                size: 2, // Small visible center
                color: {
                    background: '#848484',
                    border: 'rgba(132, 132, 132, 0.01)', // Nearly transparent border for interaction
                    highlight: {
                        background: '#4a90e2',
                        border: '#3578ba'
                    }
                },
                borderWidth: 3, // Wide transparent border = larger click area
                physics: false,
                fixed: false,
                label: '',
                group: 'controlPoint',
                chosen: {
                    node: function(values, id, selected, hovering) {
                        if (hovering) {
                            // On hover: larger visible size with visible border
                            values.size = 5;
                            values.borderWidth = 2;
                            values.borderColor = '#666666';
                        } else {
                            // Not hovering: small visible center with transparent border
                            values.size = 2;
                            values.borderWidth = 3;
                            values.borderColor = 'rgba(132, 132, 132, 0.01)';
                        }
                    }
                }
            });
        });
    });
    
    if (controlPointsToRestore.length > 0) {
        network.body.data.nodes.add(controlPointsToRestore);
        console.log('✅ Restored', controlPointsToRestore.length, 'control point nodes');
    } else {
        console.log('⚪ No control points to restore');
    }
}

// Check if a node is a control point
function isControlPoint(nodeId) {
    return nodeId < 0;
}

// Show menu for control point
function showControlPointMenu(x, y, controlPointId) {
    const existingMenu = document.getElementById('controlPointMenu');
    if (existingMenu) {
        existingMenu.remove();
    }
    
    const menu = document.createElement('div');
    menu.id = 'controlPointMenu';
    menu.style.position = 'fixed';
    menu.style.left = (x - 22) + 'px';
    menu.style.top = (y - 22) + 'px';
    menu.style.zIndex = '10000';
    menu.className = 'edge-menu active';
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'edge-btn edge-delete';
    deleteBtn.style.left = '-22px';
    deleteBtn.style.top = '-22px';
    deleteBtn.title = 'Supprimer point de contrôle';
    deleteBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
    `;
    deleteBtn.onclick = () => {
        removeControlPointFromEdge(controlPointId);
        menu.remove();
        // Re-enable interactions
        if (network) {
            network.setOptions({ 
                interaction: { 
                    dragNodes: true,
                    dragView: true,
                    zoomView: true
                } 
            });
        }
    };
    
    menu.appendChild(deleteBtn);
    document.body.appendChild(menu);
    
    // Auto-hide when clicking elsewhere
    setTimeout(() => {
        const clickOutside = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', clickOutside);
                // Re-enable interactions
                if (network) {
                    network.setOptions({ 
                        interaction: { 
                            dragNodes: true,
                            dragView: true,
                            zoomView: true
                        } 
                    });
                }
            }
        };
        document.addEventListener('click', clickOutside);
    }, 100);
}

// Expose functions globally for access from other modules
window.rebuildEdgeWithControlPoints = rebuildEdgeWithControlPoints;
