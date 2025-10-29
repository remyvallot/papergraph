// ===== TAG ZONES =====
// Zone visualization, interaction, and management

function drawTagZones(ctx) {
    if (!tagZones || tagZones.length === 0) return;
    
    // Track title positions to prevent overlaps
    const titleBounds = [];
    
    // Sort zones by size (largest first) so smaller zones are drawn on top
    const sortedZones = [...tagZones].sort((a, b) => {
        const areaA = a.width * a.height;
        const areaB = b.width * b.height;
        return areaB - areaA; // Descending order (largest first)
    });
    
    sortedZones.forEach((zone, index) => {
        // Convert color to rgba with low opacity
        const color = zone.color;
        const r = parseInt(color.substr(1, 2), 16);
        const g = parseInt(color.substr(3, 2), 16);
        const b = parseInt(color.substr(5, 2), 16);
        
        // Draw semi-transparent background
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.1)`;
        ctx.fillRect(zone.x, zone.y, zone.width, zone.height);
        
        // Draw border (inset by half the lineWidth to prevent overflow)
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.3)`;
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 5]);
        // Inset the stroke by 1.5px (half of lineWidth) to keep it within bounds
        const halfStroke = ctx.lineWidth / 2;
        ctx.strokeRect(
            zone.x + halfStroke, 
            zone.y + halfStroke, 
            zone.width - ctx.lineWidth, 
            zone.height - ctx.lineWidth
        );
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
    showZoneRadialMenu(zoneIndex);
}

function showZoneRadialMenu(zoneIndex) {
    const zone = tagZones[zoneIndex];
    const canvas = network.canvas.frame.canvas;
    const rect = canvas.getBoundingClientRect();
    
    // Calculate text width to center menu above title
    const ctx = canvas.getContext('2d');
    ctx.font = 'bold 24px Arial';
    const textMetrics = ctx.measureText(zone.tag);
    const textWidth = textMetrics.width;
    const textPadding = 10;
    
    // Position: centered above the zone title
    const menuCanvasPos = {
        x: zone.x + 10 + textPadding + (textWidth / 2),
        y: zone.y + 10 - 35
    };
    const menuDomPos = network.canvasToDOM(menuCanvasPos);
    const menuX = rect.left + menuDomPos.x;
    const menuY = rect.top + menuDomPos.y;
    
    // Remove existing menu if any
    hideZoneDeleteButton();
    
    // Create menu container
    const menuContainer = document.createElement('div');
    menuContainer.id = 'zoneRadialMenu';
    menuContainer.className = 'zone-radial-menu';
    menuContainer.style.position = 'fixed';
    menuContainer.style.pointerEvents = 'none';
    menuContainer.style.zIndex = '10000';
    document.body.appendChild(menuContainer);
    
    const buttons = [
        {
            id: 'zone-color-btn',
            icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
            </svg>`,
            action: () => openZoneColorDialog(zoneIndex),
            hoverColor: '#9b59b6',
            offsetX: -50,
            offsetY: 0,
            title: 'Changer la couleur'
        },
        {
            id: 'zone-delete-btn',
            icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>`,
            action: () => {
                if (selectedZoneIndex !== -1) {
                    if (confirm('Supprimer cette zone/tag ?')) {
                        deleteZone(selectedZoneIndex);
                        hideZoneDeleteButton();
                    }
                }
            },
            hoverColor: '#e74c3c',
            offsetX: 50,
            offsetY: 0,
            title: 'Supprimer la zone'
        }
    ];
    
    buttons.forEach((btnConfig, index) => {
        const btn = document.createElement('button');
        btn.id = btnConfig.id;
        btn.className = 'zone-radial-btn';
        btn.title = btnConfig.title;
        btn.innerHTML = btnConfig.icon;
        btn.style.position = 'fixed';
        btn.style.width = '40px';
        btn.style.height = '40px';
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
        btn.style.left = (menuX + btnConfig.offsetX) + 'px';
        btn.style.top = (menuY + btnConfig.offsetY) + 'px';
        btn.style.opacity = '0';
        btn.style.transform = 'scale(0)';
        
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
        
        setTimeout(() => {
            btn.style.opacity = '1';
            btn.style.transform = 'scale(1)';
        }, index * 50);
    });
}

function openZoneColorDialog(zoneIndex) {
    const zone = tagZones[zoneIndex];
    
    const defaultColors = [
        '#e74c3c', '#f39c12', '#f1c40f', '#2ecc71',
        '#1abc9c', '#3498db', '#9b59b6'
    ];
    
    const modal = document.createElement('div');
    modal.id = 'zoneColorModal';
    modal.style.position = 'fixed';
    modal.style.top = '50%';
    modal.style.left = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.backgroundColor = 'white';
    modal.style.border = '2px solid #4a90e2';
    modal.style.borderRadius = '12px';
    modal.style.padding = '24px';
    modal.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)';
    modal.style.zIndex = '10002';
    modal.style.minWidth = '340px';
    
    const colorPaletteHTML = defaultColors.map(color => 
        `<div class="color-option" data-color="${color}" 
              style="width: 28px; height: 28px; background: ${color}; border-radius: 6px; cursor: pointer; 
                     border: ${zone.color === color ? '2px solid #2c3e50' : '2px solid transparent'}; 
                     transform: ${zone.color === color ? 'scale(1.1)' : 'scale(1)'}; 
                     transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
         </div>`
    ).join('');
    
    modal.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 15px; color: #2c3e50; font-size: 1.1rem;">
            Changer la couleur de "${zone.tag}"
        </div>
        <div style="margin-bottom: 15px;">
            <label style="display: block; margin-bottom: 8px; color: #666; font-size: 0.9rem; font-weight: 600;">Couleur de la zone :</label>
            <div id="zoneColorPalette" style="display: grid; grid-template-columns: repeat(8, 1fr); gap: 6px;">
                ${colorPaletteHTML}
                <div class="color-option color-picker-option" id="zoneCustomColorOption"
                     style="width: 28px; height: 28px; background: ${zone.color}; border-radius: 6px; cursor: pointer; 
                            border: 2px solid transparent; transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.1); position: relative; display: flex; align-items: center; justify-content: center;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
                        <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
                    </svg>
                </div>
            </div>
            <div id="zoneCustomColorPicker" style="display: none; margin-top: 12px; padding: 12px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e0e0e0;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <input type="color" id="zoneColorPickerInput" value="${zone.color}" style="width: 48px; height: 48px; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;">
                    <input type="text" id="zoneColorHex" value="${zone.color}" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-family: monospace; font-size: 0.9rem;">
                </div>
            </div>
        </div>
        <div style="display: flex; gap: 10px;">
            <button id="cancelZoneColor" style="flex: 1; padding: 10px; background: #e0e0e0; color: #333; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.95rem;">
                Annuler
            </button>
            <button id="applyZoneColor" style="flex: 1; padding: 10px; background: #4a90e2; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.95rem;">
                Appliquer
            </button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    let selectedColor = zone.color;
    
    const colorOptions = document.querySelectorAll('#zoneColorPalette .color-option:not(#zoneCustomColorOption)');
    const customColorOption = document.getElementById('zoneCustomColorOption');
    const customColorPickerDiv = document.getElementById('zoneCustomColorPicker');
    const colorPickerInput = document.getElementById('zoneColorPickerInput');
    const colorHex = document.getElementById('zoneColorHex');
    
    if (colorPickerInput && colorHex) {
        colorPickerInput.addEventListener('input', (e) => {
            selectedColor = e.target.value;
            colorHex.value = selectedColor;
            customColorOption.style.background = selectedColor;
        });
        
        colorHex.addEventListener('input', (e) => {
            const hex = e.target.value;
            if (/^#[0-9A-F]{6}$/i.test(hex)) {
                selectedColor = hex;
                colorPickerInput.value = hex;
                customColorOption.style.background = hex;
            }
        });
    }
    
    colorOptions.forEach((option) => {
        option.addEventListener('click', () => {
            customColorPickerDiv.style.display = 'none';
            document.querySelectorAll('#zoneColorPalette .color-option').forEach(opt => {
                opt.style.border = '2px solid transparent';
                opt.style.transform = 'scale(1)';
            });
            option.style.border = '2px solid #2c3e50';
            option.style.transform = 'scale(1.1)';
            selectedColor = option.getAttribute('data-color');
        });
        
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
    
    customColorOption.addEventListener('click', () => {
        const isVisible = customColorPickerDiv.style.display !== 'none';
        customColorPickerDiv.style.display = isVisible ? 'none' : 'block';
        
        if (!isVisible) {
            document.querySelectorAll('#zoneColorPalette .color-option:not(#zoneCustomColorOption)').forEach(opt => {
                opt.style.border = '2px solid transparent';
                opt.style.transform = 'scale(1)';
            });
            customColorOption.style.border = '2px solid #2c3e50';
            customColorOption.style.transform = 'scale(1.1)';
            selectedColor = colorPickerInput.value;
            setTimeout(() => colorPickerInput.click(), 100);
        }
    });
    
    document.getElementById('applyZoneColor').addEventListener('click', () => {
        applyZoneColor(zoneIndex, selectedColor);
    });
    document.getElementById('cancelZoneColor').addEventListener('click', closeZoneColorDialog);
    
    const escapeHandler = (e) => {
        if (e.key === 'Escape') {
            closeZoneColorDialog();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
}

function closeZoneColorDialog() {
    const modal = document.getElementById('zoneColorModal');
    if (modal) modal.remove();
}

function applyZoneColor(zoneIndex, newColor) {
    if (zoneIndex < 0 || zoneIndex >= tagZones.length) return;
    
    const zone = tagZones[zoneIndex];
    zone.color = newColor;
    
    saveToLocalStorage();
    
    // Update graph to refresh node colors immediately
    if (network) {
        const currentView = network.getViewPosition();
        const currentScale = network.getScale();
        updateGraph();
        // Restore view position to avoid movement
        network.moveTo({
            position: currentView,
            scale: currentScale,
            animation: false
        });
    }
    
    closeZoneColorDialog();
    hideZoneDeleteButton(); // Close the radial menu
    showNotification(`Couleur de "${zone.tag}" mise à jour`, 'success');
}

function hideZoneDeleteButton() {
    const menu = document.getElementById('zoneRadialMenu');
    if (menu) {
        menu.remove();
    }
    
    // Also hide any old delete button if it exists
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
    console.log('🎨 checkNodeZoneMembership called');
    let updatedCount = 0;
    
    appData.articles.forEach(article => {
        const pos = network.getPositions([article.id])[article.id];
        if (!pos) {
            return;
        }
        
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
                },
                font: { color: getContrastColor(smallestZone.color) }
            });
            updatedCount++;
        } else {
            // Node not in any zone - use default color
            network.body.data.nodes.update({
                id: article.id,
                color: {
                    border: '#4a90e2',
                    background: '#e3f2fd'
                },
                font: { color: '#333333' }
            });
        }
    });
    
    console.log(`✅ checkNodeZoneMembership completed - updated ${updatedCount} nodes with zone colors`);
    
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
    
    const handleSize = 10 / network.getScale(); // Reduced from 20 to 10
    
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
    
    // Find ALL zones that contain this point
    const matchingZones = [];
    
    for (let i = 0; i < tagZones.length; i++) {
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
            
            matchingZones.push({ zoneIndex: i, zone: zone, area: zone.width * zone.height });
        }
    }
    
    // Return the smallest zone (highest priority)
    if (matchingZones.length > 0) {
        matchingZones.sort((a, b) => a.area - b.area); // Smallest first
        return { zoneIndex: matchingZones[0].zoneIndex, zone: matchingZones[0].zone };
    }
    
    return { zoneIndex: -1, zone: null };
}

function getZoneTitleClick(event) {
    const canvas = network.canvas.frame.canvas;
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const mousePos = network.DOMtoCanvas({ x: mouseX, y: mouseY });
    
    // Find ALL zones whose title contains this point
    const matchingZones = [];
    
    for (let i = 0; i < tagZones.length; i++) {
        const zone = tagZones[i];
        
        const titleX = zone.x + 10;
        const titleY = zone.y + 10;
        const titleWidth = zone.tag.length * 15 + 20;
        const titleHeight = 50;
        
        if (mousePos.x >= titleX && mousePos.x <= titleX + titleWidth &&
            mousePos.y >= titleY && mousePos.y <= titleY + titleHeight) {
            matchingZones.push({ zoneIndex: i, zone: zone, area: zone.width * zone.height });
        }
    }
    
    // Return the smallest zone (highest priority)
    if (matchingZones.length > 0) {
        matchingZones.sort((a, b) => a.area - b.area); // Smallest first
        return { zoneIndex: matchingZones[0].zoneIndex, zone: matchingZones[0].zone };
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
    
    // Store original positions of nested zones (zones completely inside this zone)
    zoneMoving.originalNestedZones = {};
    const tolerance = 5; // Small tolerance for floating point errors
    
    tagZones.forEach((otherZone, idx) => {
        if (idx !== zoneIndex) {
            // Check if otherZone is completely inside the moving zone (with tolerance)
            const isInside = otherZone.x >= (zone.x - tolerance) &&
                           otherZone.y >= (zone.y - tolerance) &&
                           (otherZone.x + otherZone.width) <= (zone.x + zone.width + tolerance) &&
                           (otherZone.y + otherZone.height) <= (zone.y + zone.height + tolerance);
            
            if (isInside) {
                zoneMoving.originalNestedZones[idx] = {
                    x: otherZone.x,
                    y: otherZone.y
                };
            }
        }
    });
    
    console.log(`📦 Moving zone "${zone.tag}" with ${Object.keys(zoneMoving.originalNestedZones).length} nested zones`);
    
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
    
    // Move nested zones
    if (zoneMoving.originalNestedZones) {
        const nestedCount = Object.keys(zoneMoving.originalNestedZones).length;
        if (nestedCount > 0) {
            console.log(`📦 Moving ${nestedCount} nested zones...`);
        }
        Object.keys(zoneMoving.originalNestedZones).forEach(zoneIdx => {
            const idx = parseInt(zoneIdx);
            const origZone = zoneMoving.originalNestedZones[zoneIdx];
            tagZones[idx].x = origZone.x + dx;
            tagZones[idx].y = origZone.y + dy;
            console.log(`📦 Moved nested zone ${idx} (${tagZones[idx].tag}) by dx=${dx.toFixed(1)}, dy=${dy.toFixed(1)}`);
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
    zoneMoving.originalNestedZones = {};
    
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
