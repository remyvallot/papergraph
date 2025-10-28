// ===== TAG ZONES =====
// Zone visualization, interaction, and management

function drawTagZones(ctx) {
    if (!tagZones || tagZones.length === 0) return;
    
    // Track title positions to prevent overlaps
    const titleBounds = [];
    
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
        
        // Calculate initial title position
        let titleX = zone.x + 10;
        let titleY = zone.y + 10;
        
        // Check for overlap with existing titles and adjust
        let adjusted = false;
        const maxWidth = zone.width - 20; // Maximum width for title
        
        for (const bound of titleBounds) {
            const currentBound = {
                x: titleX,
                y: titleY,
                width: textWidth + textPadding * 2,
                height: textHeight + textPadding
            };
            
            // Check if overlapping
            if (!(currentBound.x + currentBound.width < bound.x ||
                  currentBound.x > bound.x + bound.width ||
                  currentBound.y + currentBound.height < bound.y ||
                  currentBound.y > bound.y + bound.height)) {
                // Overlapping - shift down
                titleY = bound.y + bound.height + 5;
                adjusted = true;
            }
        }
        
        // Make sure title stays within zone
        if (titleY + textHeight + textPadding > zone.y + zone.height - 10) {
            titleY = zone.y + zone.height - textHeight - textPadding - 10;
        }
        
        // Truncate text if too wide
        let displayText = zone.tag;
        if (textWidth + textPadding * 2 > maxWidth) {
            // Truncate text
            const ellipsis = '...';
            let truncated = zone.tag;
            while (ctx.measureText(truncated + ellipsis).width + textPadding * 2 > maxWidth && truncated.length > 0) {
                truncated = truncated.slice(0, -1);
            }
            displayText = truncated + ellipsis;
        }
        
        const finalTextMetrics = ctx.measureText(displayText);
        const finalTextWidth = finalTextMetrics.width;
        
        // Only draw background and text if NOT editing this zone
        if (!zoneEditing.active || zoneEditing.zoneIndex !== index) {
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.2)`;
            ctx.fillRect(
                titleX, 
                titleY, 
                finalTextWidth + textPadding * 2, 
                textHeight + textPadding
            );
            
            // Text
            ctx.fillStyle = color;
            ctx.fillText(displayText, titleX + textPadding, titleY + textPadding);
            
            // Store this title's bounds
            titleBounds.push({
                x: titleX,
                y: titleY,
                width: finalTextWidth + textPadding * 2,
                height: textHeight + textPadding
            });
        }
    });
}

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
        x: zone.x + 10 + textPadding + (textWidth / 2),
        y: zone.y + 10 - 35
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

function hideZoneDeleteButton() {
    const deleteBtn = document.getElementById('zoneDeleteBtn');
    if (deleteBtn) {
        deleteBtn.classList.remove('active');
    }
}

function isNodeInZone(nodePos, zone) {
    return nodePos.x >= zone.x && 
           nodePos.x <= zone.x + zone.width &&
           nodePos.y >= zone.y && 
           nodePos.y <= zone.y + zone.height;
}

function updateZoneSizes() {
    // Automatic zone resizing disabled - zones maintain manual size
    // User can manually resize zones using drag handles
    return;
    
    /* DISABLED - Automatic resizing
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
    */
}

function checkNodeZoneMembership() {
    appData.articles.forEach(article => {
        const pos = network.getPositions([article.id])[article.id];
        if (!pos) return;
        
        // Find all zones containing this node
        const containingZones = [];
        
        tagZones.forEach(zone => {
            const isInZone = isNodeInZone(pos, zone);
            const hasTag = article.categories.includes(zone.tag);
            
            if (isInZone) {
                containingZones.push(zone);
                
                // Add tag if not present
                if (!hasTag) {
                    article.categories.push(zone.tag);
                }
            } else if (hasTag) {
                // Node exited zone - remove tag
                article.categories = article.categories.filter(c => c !== zone.tag);
            }
        });
        
        // Determine node color based on smallest containing zone
        if (containingZones.length > 0) {
            // Sort zones by area (width * height) to find smallest
            containingZones.sort((a, b) => {
                const areaA = a.width * a.height;
                const areaB = b.width * b.height;
                return areaA - areaB;
            });
            
            // Apply color from smallest zone
            const smallestZone = containingZones[0];
            network.body.data.nodes.update({
                id: article.id,
                color: {
                    background: smallestZone.color,
                    border: darkenColor(smallestZone.color, 20)
                }
            });
        } else {
            // Node not in any zone - use default color
            network.body.data.nodes.update({
                id: article.id,
                color: {
                    border: '#4a90e2',
                    background: '#e3f2fd'
                }
            });
        }
    });
    
    saveToLocalStorage();
    updateCategoryFilters();
    renderListView();
}

function getZoneResizeHandle(event) {
    const canvas = network.canvas.frame.canvas;
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const mousePos = network.DOMtoCanvas({ x: mouseX, y: mouseY });
    
    const handleSize = 20 / network.getScale();
    
    for (let i = 0; i < tagZones.length; i++) {
        const zone = tagZones[i];
        
        const nearLeft = Math.abs(mousePos.x - zone.x) < handleSize;
        const nearRight = Math.abs(mousePos.x - (zone.x + zone.width)) < handleSize;
        const nearTop = Math.abs(mousePos.y - zone.y) < handleSize;
        const nearBottom = Math.abs(mousePos.y - (zone.y + zone.height)) < handleSize;
        
        const inHorizontalRange = mousePos.y >= zone.y - handleSize && mousePos.y <= zone.y + zone.height + handleSize;
        const inVerticalRange = mousePos.x >= zone.x - handleSize && mousePos.x <= zone.x + zone.width + handleSize;
        
        // Check corners first
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
        
        // Check edges
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

function updateZoneCursor(event) {
    const canvas = network.canvas.frame.canvas;
    const resizeHandle = getZoneResizeHandle(event);
    
    if (resizeHandle.zoneIndex !== -1) {
        // Set cursor based on handle type
        const cursorMap = {
            'nw': 'nwse-resize',
            'ne': 'nesw-resize',
            'sw': 'nesw-resize',
            'se': 'nwse-resize',
            'n': 'ns-resize',
            's': 'ns-resize',
            'w': 'ew-resize',
            'e': 'ew-resize'
        };
        canvas.style.cursor = cursorMap[resizeHandle.handle] || 'default';
    } else {
        canvas.style.cursor = 'default';
    }
}

function getZoneAtPosition(event) {
    const canvas = network.canvas.frame.canvas;
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const mousePos = network.DOMtoCanvas({ x: mouseX, y: mouseY });
    
    const handleSize = 20 / network.getScale();
    
    // Check zones from top to bottom
    for (let i = tagZones.length - 1; i >= 0; i--) {
        const zone = tagZones[i];
        
        if (mousePos.x >= zone.x && mousePos.x <= zone.x + zone.width &&
            mousePos.y >= zone.y && mousePos.y <= zone.y + zone.height) {
            
            // But NOT on title area
            const titleX = zone.x + 10;
            const titleY = zone.y + 10;
            const titleWidth = 200;
            const titleHeight = 50;
            
            if (mousePos.x >= titleX && mousePos.x <= titleX + titleWidth &&
                mousePos.y >= titleY && mousePos.y <= titleY + titleHeight) {
                continue;
            }
            
            // And NOT on resize handles
            const nearLeft = Math.abs(mousePos.x - zone.x) < handleSize;
            const nearRight = Math.abs(mousePos.x - (zone.x + zone.width)) < handleSize;
            const nearTop = Math.abs(mousePos.y - zone.y) < handleSize;
            const nearBottom = Math.abs(mousePos.y - (zone.y + zone.height)) < handleSize;
            
            if (nearLeft || nearRight || nearTop || nearBottom) {
                continue;
            }
            
            return { zoneIndex: i, zone: zone };
        }
    }
    
    return { zoneIndex: -1, zone: null };
}

function getZoneTitleClick(event) {
    const canvas = network.canvas.frame.canvas;
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const mousePos = network.DOMtoCanvas({ x: mouseX, y: mouseY });
    
    for (let i = 0; i < tagZones.length; i++) {
        const zone = tagZones[i];
        
        const titleX = zone.x + 10;
        const titleY = zone.y + 10;
        const titleWidth = zone.tag.length * 15 + 20;
        const titleHeight = 50;
        
        if (mousePos.x >= titleX && mousePos.x <= titleX + titleWidth &&
            mousePos.y >= titleY && mousePos.y <= titleY + titleHeight) {
            return { zoneIndex: i, zone: zone };
        }
    }
    
    return { zoneIndex: -1, zone: null };
}

function startZoneMove(event, zoneIndex) {
    zoneMoving.active = true;
    zoneMoving.zoneIndex = zoneIndex;
    zoneMoving.originalZone = { ...tagZones[zoneIndex] };
    
    const canvas = network.canvas.frame.canvas;
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
    
    // Disable network interactions
    network.setOptions({
        interaction: {
            dragNodes: false,
            dragView: false,
            zoomView: false
        }
    });
}

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
    
    // Move nodes with this tag
    if (zoneMoving.originalNodePositions) {
        Object.keys(zoneMoving.originalNodePositions).forEach(nodeId => {
            const origPos = zoneMoving.originalNodePositions[nodeId];
            const newX = origPos.x + dx;
            const newY = origPos.y + dy;
            network.moveNode(nodeId, newX, newY);
        });
    }
    
    network.redraw();
}

function endZoneMove() {
    zoneMoving.active = false;
    zoneMoving.readyToMove = false;
    zoneMoving.zoneIndex = -1;
    zoneMoving.originalZone = null;
    zoneMoving.originalNodePositions = {};
    
    // Re-enable network interactions
    network.setOptions({
        interaction: {
            dragNodes: true,
            dragView: false,
            zoomView: true,
            hover: true
        }
    });
    
    // Update all zone sizes
    setTimeout(() => {
        updateZoneSizes();
        saveToLocalStorage();
    }, 200);
}

function startEditZoneTitle(event, zoneIndex) {
    if (zoneEditing.active) return;
    
    const zone = tagZones[zoneIndex];
    const canvas = network.canvas.frame.canvas;
    
    zoneEditing.active = true;
    zoneEditing.zoneIndex = zoneIndex;
    
    // Disable interactions during editing
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
    
    // Get canvas context to measure text
    const ctx = canvas.getContext('2d');
    ctx.font = 'bold 24px Arial';
    const textMetrics = ctx.measureText(zone.tag);
    const textWidth = textMetrics.width;
    
    // Get zone title position in DOM
    const rect = canvas.getBoundingClientRect();
    const textPadding = 10;
    const titleCanvasPos = { x: zone.x + 10 + textPadding, y: zone.y + 10 + textPadding };
    const titlePos = network.canvasToDOM(titleCanvasPos);
    
    // Create input element
    const input = document.createElement('input');
    input.type = 'text';
    input.value = zone.tag;
    input.style.position = 'absolute';
    input.style.left = (rect.left + titlePos.x) + 'px';
    input.style.top = (rect.top + titlePos.y) + 'px';
    input.style.width = Math.max(textWidth + 20, 150) + 'px';
    input.style.fontSize = '24px';
    input.style.fontWeight = 'bold';
    input.style.fontFamily = 'Arial';
    input.style.padding = '0';
    input.style.margin = '0';
    input.style.border = 'none';
    input.style.borderRadius = '0';
    input.style.zIndex = '10001';
    input.style.color = color;
    input.style.backgroundColor = `rgba(${r}, ${g}, ${b}, 0.15)`;
    input.style.outline = 'none';
    input.style.boxSizing = 'border-box';
    input.style.lineHeight = '1';
    
    document.body.appendChild(input);
    zoneEditing.inputElement = input;
    zoneEditing.backgroundElement = null;
    
    network.redraw();
    
    input.focus();
    input.select();
    
    // Auto-resize input
    const autoResize = () => {
        const ctx = canvas.getContext('2d');
        ctx.font = 'bold 24px Arial';
        const newWidth = Math.max(ctx.measureText(input.value).width + 20, 150);
        input.style.width = newWidth + 'px';
    };
    
    input.addEventListener('input', autoResize);
    
    // Save on blur or enter
    const saveEdit = () => {
        if (!zoneEditing.active) return;
        
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
    
    const handleClickOutside = (e) => {
        if (e.target !== input) {
            saveEdit();
        }
    };
    
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
            
            document.removeEventListener('mousedown', handleClickOutside);
            
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
    
    const canvas = network.canvas.frame.canvas;
    if (canvas) {
        canvas.style.cursor = 'default';
    }
    
    showNotification(`Zone "${tagToRemove}" supprimée`, 'success');
}

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
    
    // Disable network interactions
    network.setOptions({
        interaction: {
            dragNodes: false,
            dragView: false,
            zoomView: false
        }
    });
}

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

function endZoneResize() {
    zoneResizing.active = false;
    zoneResizing.zoneIndex = -1;
    zoneResizing.handle = null;
    zoneResizing.originalZone = null;
    
    // Re-enable network interactions
    network.setOptions({
        interaction: {
            dragNodes: true,
            dragView: false,
            zoomView: true,
            hover: true
        }
    });
    
    checkNodeZoneMembership();
}
