// ===== TOOLBAR & MULTI-SELECTION =====
// Toolbar actions, multi-tag dialog, and multi-selection operations

function toggleCategoryDropdown() {
    const dropdown = document.getElementById('categoryDropdown');
    dropdown.classList.toggle('active');
}

function toggleGrid() {
    if (!network) return;
    
    gridEnabled = !gridEnabled;
    localStorage.setItem('gridEnabled', gridEnabled);
    const btn = document.getElementById('toggleGridBtn');
    const label = btn.querySelector('.btn-label');
    
    if (gridEnabled) {
        btn.classList.add('active');
        btn.title = 'Masquer la grille';
        if (label) label.textContent = 'Grille';
    } else {
        btn.classList.remove('active');
        btn.title = 'Afficher la grille';
        if (label) label.textContent = 'Grille';
    }
    
    network.redraw();
}

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

function openMultiTagDialog(isEmptyAreaMode = false) {
    const savedSelectedNodes = isEmptyAreaMode ? [] : [...multiSelection.selectedNodes];
    
    if (!isEmptyAreaMode) {
        hideSelectionRadialMenu();
        multiSelection.selectedNodes = savedSelectedNodes;
    }
    
    const defaultColors = [
        '#e74c3c', '#f39c12', '#f1c40f', '#2ecc71',
        '#1abc9c', '#3498db', '#9b59b6'
    ];
    
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
    
    const colorPaletteHTML = defaultColors.map(color => 
        `<div class="color-option" data-color="${color}" 
              style="width: 28px; height: 28px; background: ${color}; border-radius: 6px; cursor: pointer; 
                     border: 2px solid transparent; transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
         </div>`
    ).join('');
    
    modal.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 15px; color: #2c3e50; font-size: 1.1rem;">
            ${isEmptyAreaMode ? 'Créer une zone de tag' : 'Ajouter un tag'}
        </div>
        ${!isEmptyAreaMode ? `<div style="color: #666; margin-bottom: 15px; font-size: 0.9rem;">
            ${multiSelection.selectedNodes.length} nœud(s) sélectionné(s)
        </div>` : ''}
        <div style="position: relative; margin-bottom: 15px;">
            <input type="text" id="multiTagInput" placeholder="Nom du tag" 
                   style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 8px; font-size: 0.95rem;">
            <div id="tagWarning" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: #e74c3c; font-size: 0.85rem; font-weight: 600; display: none;">
                ⚠ Tag existe déjà
            </div>
        </div>
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
                ${isEmptyAreaMode ? 'Créer' : 'Appliquer'}
            </button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    let selectedColor = defaultColors[0];
    
    const tagInput = document.getElementById('multiTagInput');
    const tagWarning = document.getElementById('tagWarning');
    
    tagInput.focus();
    
    // Check if tag exists in real-time
    tagInput.addEventListener('input', (e) => {
        const tagName = e.target.value.trim();
        if (tagName) {
            const existingTag = appData.articles.some(article => 
                article.categories.some(cat => cat.toLowerCase() === tagName.toLowerCase())
            );
            const existingZone = tagZones.some(zone => 
                zone.tag.toLowerCase() === tagName.toLowerCase()
            );
            
            if (existingTag || existingZone) {
                tagWarning.style.display = 'block';
                tagInput.style.paddingRight = '150px';
            } else {
                tagWarning.style.display = 'none';
                tagInput.style.paddingRight = '10px';
            }
        } else {
            tagWarning.style.display = 'none';
            tagInput.style.paddingRight = '10px';
        }
    });
    
    const colorOptions = document.querySelectorAll('.color-option:not(#customColorOption)');
    const customColorOption = document.getElementById('customColorOption');
    const customColorPickerDiv = document.getElementById('customColorPicker');
    const colorPickerInput = document.getElementById('colorPickerInput');
    const colorHex = document.getElementById('colorHex');
    
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
    
    colorOptions.forEach((option, index) => {
        if (index === 0) {
            option.style.border = '2px solid #2c3e50';
            option.style.transform = 'scale(1.1)';
        }
        
        option.addEventListener('click', () => {
            customColorPickerDiv.style.display = 'none';
            document.querySelectorAll('.color-option').forEach(opt => {
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
            document.querySelectorAll('.color-option:not(#customColorOption)').forEach(opt => {
                opt.style.border = '2px solid transparent';
                opt.style.transform = 'scale(1)';
            });
            customColorOption.style.border = '2px solid #2c3e50';
            customColorOption.style.transform = 'scale(1.1)';
            selectedColor = colorPickerInput.value;
            setTimeout(() => colorPickerInput.click(), 100);
        }
    });
    
    document.getElementById('applyMultiTag').addEventListener('click', () => {
        if (isEmptyAreaMode) {
            applyEmptyAreaZoneFromDialog(selectedColor);
        } else {
            applyMultiTagFromDialog(selectedColor);
        }
    });
    document.getElementById('cancelMultiTag').addEventListener('click', closeMultiTagDialog);
    
    const escapeHandler = (e) => {
        if (e.key === 'Escape') {
            closeMultiTagDialog();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
    
    document.getElementById('multiTagInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            if (isEmptyAreaMode) {
                applyEmptyAreaZoneFromDialog(selectedColor);
            } else {
                applyMultiTagFromDialog(selectedColor);
            }
        }
    });
}

function closeMultiTagDialog() {
    const modal = document.getElementById('multiTagModal');
    if (modal) modal.remove();
    
    if (multiSelection.selectionBox) {
        multiSelection.selectionBox.style.display = 'none';
        multiSelection.selectionBox.style.border = '2px dashed #4a90e2';
    }
    
    if (network) network.unselectAll();
    multiSelection.selectedNodes = [];
    
    // Clear empty area selection when dialog is closed/cancelled
    if (multiSelection.emptyAreaSelection) {
        multiSelection.emptyAreaSelection = null;
        hideEmptyAreaMenu();
    }
}

function applyMultiTagFromDialog(tagColor) {
    const tagName = document.getElementById('multiTagInput').value.trim();
    
    if (!tagName) {
        showNotification('Veuillez entrer un nom de tag', 'error');
        return;
    }
    
    if (!tagColor) tagColor = '#e74c3c';
    
    // Calculate bounding box
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
    
    const padding = 100;
    const zone = {
        tag: tagName,
        color: tagColor,
        x: minX - padding,
        y: minY - padding,
        width: maxX - minX + padding * 2,
        height: maxY - minY + padding * 2
    };
    
    const existingIndex = tagZones.findIndex(z => z.tag === tagName);
    if (existingIndex >= 0) {
        tagZones[existingIndex] = zone;
    } else {
        tagZones.push(zone);
    }
    
    // Apply tag to nodes
    multiSelection.selectedNodes.forEach(nodeId => {
        const article = appData.articles.find(a => a.id === nodeId);
        if (article) {
            if (!article.categories.includes(tagName)) {
                article.categories.push(tagName);
            }
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
    network.redraw();
    
    if (multiSelection.selectionBox) {
        multiSelection.selectionBox.style.display = 'none';
        multiSelection.selectionBox.style.border = '2px dashed #4a90e2';
    }
    
    const appliedCount = multiSelection.selectedNodes.length;
    showNotification(`Tag "${tagName}" appliqué à ${appliedCount} nœud(s)`, 'success');
    closeMultiTagDialog();
}

function applyEmptyAreaZoneFromDialog(zoneColor) {
    const zoneName = document.getElementById('multiTagInput').value.trim();
    
    if (!zoneName) {
        showNotification('Veuillez entrer un nom de zone', 'error');
        return;
    }
    
    if (!multiSelection.emptyAreaSelection) {
        showNotification('Aucune zone sélectionnée', 'error');
        return;
    }
    
    const area = multiSelection.emptyAreaSelection;
    
    const zone = {
        tag: zoneName,
        color: zoneColor || '#e74c3c',
        x: area.x,
        y: area.y,
        width: area.width,
        height: area.height
    };
    
    // Check if zone with this tag already exists
    const existingZoneIndex = tagZones.findIndex(z => z.tag === zoneName);
    if (existingZoneIndex !== -1) {
        showNotification('Une zone avec ce tag existe déjà', 'error');
        return;
    }
    
    tagZones.push(zone);
    
    // Save current view position before updating graph
    const currentView = network.getViewPosition();
    const currentScale = network.getScale();
    
    saveToLocalStorage();
    updateCategoryFilters();
    updateGraph();
    
    // Restore view position to avoid camera movement
    network.moveTo({
        position: currentView,
        scale: currentScale,
        animation: false
    });
    
    closeMultiTagDialog();
    hideEmptyAreaMenu();
    
    // Clear the empty area selection and hide selection box
    multiSelection.emptyAreaSelection = null;
    if (multiSelection.selectionBox) {
        multiSelection.selectionBox.style.display = 'none';
    }
    
    showNotification(`Zone "${zoneName}" créée`, 'success');
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
    
    multiSelection.selectedNodes.forEach(nodeId => {
        const articleIndex = appData.articles.findIndex(a => a.id === nodeId);
        if (articleIndex >= 0) {
            appData.articles.splice(articleIndex, 1);
        }
        
        appData.connections = appData.connections.filter(
            conn => conn.from !== nodeId && conn.to !== nodeId
        );
    });
    
    updateGraph();
    renderListView();
    updateCategoryFilters();
    saveToLocalStorage();
    
    showNotification(`${count} nœud(s) supprimé(s)`, 'info');
    hideSelectionRadialMenu();
}
