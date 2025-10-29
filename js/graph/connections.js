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
    
    // Get node positions
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
    
    isEditingEdgeLabel = true;
    
    const save = () => {
        connection.label = input.value.trim();
        isEditingEdgeLabel = false;
        updateGraph();
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
    appData.connections = appData.connections.filter(c => c.id !== edgeId);
    updateGraph();
    saveToLocalStorage();
    showNotification('Connexion supprimée', 'info');
}

function showEdgeMenu(x, y, edgeId) {
    const menu = document.getElementById('edgeMenu');
    
    // Position menu at click position
    menu.style.left = (x - 22) + 'px';
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

function startConnectionMode(fromNodeId) {
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
