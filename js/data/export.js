// ===== EXPORT / IMPORT FUNCTIONS =====
// Project export, import, and PDF generation

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
        
        // Clear edge control points
        edgeControlPoints = {};
        window.edgeControlPoints = {};
        nextControlPointId = -1;
        window.nextControlPointId = -1;
        
        // Remove all control point nodes (negative IDs) from the network
        if (network) {
            const allNodes = network.body.data.nodes.get();
            const controlPointNodes = allNodes.filter(node => node.id < 0);
            if (controlPointNodes.length > 0) {
                network.body.data.nodes.remove(controlPointNodes.map(n => n.id));
                console.log('🗑️ Removed', controlPointNodes.length, 'control point nodes');
            }
            
            // Remove all segment edges (IDs containing _seg_)
            const allEdges = network.body.data.edges.get();
            const segmentEdges = allEdges.filter(edge => edge.id.toString().includes('_seg_'));
            if (segmentEdges.length > 0) {
                network.body.data.edges.remove(segmentEdges.map(e => e.id));
                console.log('🗑️ Removed', segmentEdges.length, 'segment edges');
            }
        }
        
        // Clear ALL localStorage data including positions and control points
        localStorage.removeItem('papermap_data');
        localStorage.removeItem('papermap_zones');
        localStorage.removeItem('papermap_positions');
        localStorage.removeItem('papermap_edge_control_points');
        localStorage.removeItem('papermap_next_control_point_id');
        window.savedNodePositions = {};
        
        saveToLocalStorage();
        updateCategoryFilters();
        renderListView();
        updateGraph();
        closeArticlePreview();
        
        showNotification('Nouveau projet créé!', 'success');
    }
}

function exportProject() {
    // Include tagZones and node positions in the export
    const exportData = {
        ...appData,
        tagZones: tagZones,
        nodePositions: window.savedNodePositions || {}
    };
    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `papergraph_${new Date().toISOString().split('T')[0]}.json`;
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
    a.download = `papergraph_${new Date().toISOString().split('T')[0]}.png`;
    a.click();
    
    showNotification('Image exportée en PNG!', 'success');
}

function exportToSVG() {
    if (!network) {
        showNotification('Le graphe n\'est pas encore initialisé', 'error');
        return;
    }
    
    try {
        const canvas = network.canvas.frame.canvas;
        
        // Use the actual canvas dimensions (what's visible)
        const width = canvas.width;
        const height = canvas.height;
        
        // Get all positions in canvas coordinates
        const positions = network.getPositions();
        const scale = network.getScale();
        const viewPosition = network.getViewPosition();
        
        let svgElements = [];
        
        // Get nodes data first (needed for edge arrow positioning)
        const nodes = network.body.data.nodes.get();
        
        // Draw zones first (background)
        if (tagZones && tagZones.length > 0) {
            const sortedZones = [...tagZones].sort((a, b) => {
                const areaA = a.width * a.height;
                const areaB = b.width * b.height;
                return areaB - areaA;
            });
            
            sortedZones.forEach(zone => {
                const topLeft = network.canvasToDOM({ x: zone.x, y: zone.y });
                const bottomRight = network.canvasToDOM({ x: zone.x + zone.width, y: zone.y + zone.height });
                
                const x = topLeft.x;
                const y = topLeft.y;
                const w = bottomRight.x - topLeft.x;
                const h = bottomRight.y - topLeft.y;
                
                const color = zone.color;
                const r = parseInt(color.substr(1, 2), 16);
                const g = parseInt(color.substr(3, 2), 16);
                const b = parseInt(color.substr(5, 2), 16);
                
                // Zone background (with scaled stroke)
                const zoneStrokeWidth = 3 * scale;
                const zoneDashArray = `${10 * scale},${5 * scale}`;
                svgElements.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" 
                    fill="rgba(${r},${g},${b},0.1)" 
                    stroke="rgba(${r},${g},${b},0.3)" 
                    stroke-width="${zoneStrokeWidth}" 
                    stroke-dasharray="${zoneDashArray}"/>`);
                
                // Zone title with background (only if tag is not empty)
                if (zone.tag && zone.tag.trim() !== '') {
                    const titleCanvasX = zone.x + 10;
                    const titleCanvasY = zone.y + 10;
                    const titlePos = network.canvasToDOM({ x: titleCanvasX, y: titleCanvasY });
                    const titleX = titlePos.x;
                    const titleY = titlePos.y;
                    const textPadding = 10 * scale;
                    const textPaddingRight = 5 * scale; // Less padding on the right
                    
                    // Font size scaled by zoom level
                    const fontSize = 24 * scale;
                    
                    // Measure text width accurately using canvas
                    const ctx = network.canvas.frame.canvas.getContext('2d');
                    ctx.save();
                    ctx.font = `bold ${fontSize}px Arial`;
                    const textWidth = ctx.measureText(zone.tag).width;
                    ctx.restore();
                    
                    const textHeight = fontSize * 1.2;
                    
                    // Title background rectangle
                    svgElements.push(`<rect x="${titleX}" y="${titleY}" 
                        width="${textWidth + textPadding + textPaddingRight}" 
                        height="${textHeight + textPadding}" 
                        fill="rgba(${r},${g},${b},0.2)"/>`);
                    
                    // Title text (centered vertically in the background)
                    const textY = titleY + textPadding + fontSize * 0.8;
                    svgElements.push(`<text x="${titleX + textPadding}" y="${textY}" 
                        font-family="Arial" font-size="${fontSize}" font-weight="bold" 
                        fill="${color}">${escapeXml(zone.tag)}</text>`);
                }
            });
        }
        
        // Draw edges
        const edges = network.body.data.edges.get();
        edges.forEach(edge => {
            const fromPos = positions[edge.from];
            const toPos = positions[edge.to];
            
            if (fromPos && toPos) {
                const from = network.canvasToDOM(fromPos);
                const to = network.canvasToDOM(toPos);
                
                let x1 = from.x;
                let y1 = from.y;
                let x2 = to.x;
                let y2 = to.y;
                
                // Save original positions for label placement
                const origX1 = x1;
                const origY1 = y1;
                const origX2 = x2;
                const origY2 = y2;
                
                // Get edge style properties
                const color = edge.color?.color || '#848484';
                const width = (edge.width || 1) * scale;
                
                // Variable to track the last point before reaching the target (for arrow angle)
                let arrowFromX = x1;
                let arrowFromY = y1;
                
                // Check if edge has control points (smooth curve)
                const edgeId = `${edge.from}_${edge.to}`;
                const controlPointIds = window.edgeControlPoints?.[edgeId];
                
                if (controlPointIds && controlPointIds.length > 0) {
                    // Draw smooth curve using quadratic/cubic bezier
                    const controlPoints = controlPointIds.map(cpId => {
                        const cpPos = positions[cpId];
                        if (cpPos) {
                            const cpDom = network.canvasToDOM(cpPos);
                            return { x: cpDom.x, y: cpDom.y };
                        }
                        return null;
                    }).filter(cp => cp !== null);
                    
                    if (controlPoints.length > 0) {
                        let pathData = `M ${x1} ${y1}`;
                        
                        if (controlPoints.length === 1) {
                            // Quadratic bezier with one control point
                            pathData += ` Q ${controlPoints[0].x} ${controlPoints[0].y}, ${x2} ${y2}`;
                            // For arrow: tangent is from control point to end point
                            arrowFromX = controlPoints[0].x;
                            arrowFromY = controlPoints[0].y;
                        } else {
                            // Cubic bezier or smooth curve through multiple points
                            controlPoints.forEach((cp, i) => {
                                if (i === 0) {
                                    pathData += ` L ${cp.x} ${cp.y}`;
                                } else {
                                    pathData += ` L ${cp.x} ${cp.y}`;
                                }
                            });
                            pathData += ` L ${x2} ${y2}`;
                            // For arrow: use last control point
                            const lastCP = controlPoints[controlPoints.length - 1];
                            arrowFromX = lastCP.x;
                            arrowFromY = lastCP.y;
                        }
                        
                        svgElements.push(`<path d="${pathData}" 
                            stroke="${color}" stroke-width="${width}" 
                            fill="none"/>`);
                    } else {
                        // No valid control points, draw straight line with smooth curve
                        const midX = (x1 + x2) / 2;
                        const midY = (y1 + y2) / 2;
                        const dx = x2 - x1;
                        const dy = y2 - y1;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        
                        // Add slight curve (continuous roundness: 0.15)
                        const offset = dist * 0.15;
                        const perpX = -dy / dist * offset;
                        const perpY = dx / dist * offset;
                        const cx = midX + perpX;
                        const cy = midY + perpY;
                        
                        svgElements.push(`<path d="M ${x1} ${y1} Q ${cx} ${cy}, ${x2} ${y2}" 
                            stroke="${color}" stroke-width="${width}" 
                            fill="none"/>`);
                        
                        // For arrow: tangent is from control point to end point
                        arrowFromX = cx;
                        arrowFromY = cy;
                    }
                } else {
                    // Draw smooth curved line (continuous roundness: 0.15)
                    const midX = (x1 + x2) / 2;
                    const midY = (y1 + y2) / 2;
                    const dx = x2 - x1;
                    const dy = y2 - y1;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    
                    // Add slight curve
                    const offset = dist * 0.15;
                    const perpX = -dy / dist * offset;
                    const perpY = dx / dist * offset;
                    const cx = midX + perpX;
                    const cy = midY + perpY;
                    
                    svgElements.push(`<path d="M ${x1} ${y1} Q ${cx} ${cy}, ${x2} ${y2}" 
                        stroke="${color}" stroke-width="${width}" 
                        fill="none"/>`);
                    
                    // For arrow: tangent is from control point to end point
                    arrowFromX = cx;
                    arrowFromY = cy;
                }
                
                // Draw arrow only if target is not a control point (subnode)
                if (edge.to >= 0) {
                    const visToNode = network.body.nodes[edge.to];
                    if (!visToNode || !visToNode.shape) {
                        return;
                    }
                    
                    // Step 1: Calculate the tangent at the end of the quadratic Bezier curve
                    // For a quadratic Bezier Q(t) = (1-t)²P0 + 2(1-t)t P1 + t²P2
                    // The derivative at t=1 is: Q'(1) = 2(P2 - P1)
                    // So the tangent direction is from the control point to the end point
                    const dx = x2 - arrowFromX;
                    const dy = y2 - arrowFromY;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance === 0) return; // Avoid division by zero
                    
                    // Normalized direction vector (tangent to the curve at endpoint)
                    const dirX = dx / distance;
                    const dirY = dy / distance;
                    
                    // Step 2: Get node dimensions in canvas space and convert to DOM space
                    const nodeCanvasW = visToNode.shape.width || 100;
                    const nodeCanvasH = visToNode.shape.height || 40;
                    
                    // Transform node dimensions to DOM space using scale
                    // The scale factor is already embedded in the network transformation
                    // We need to convert a size difference in canvas to DOM
                    const topLeft = network.canvasToDOM({ x: toPos.x - nodeCanvasW/2, y: toPos.y - nodeCanvasH/2 });
                    const bottomRight = network.canvasToDOM({ x: toPos.x + nodeCanvasW/2, y: toPos.y + nodeCanvasH/2 });
                    const nodeW = bottomRight.x - topLeft.x;
                    const nodeH = bottomRight.y - topLeft.y;
                    
                    // Step 3: Calculate intersection with node border (rectangle)
                    // Using parametric approach: find where ray hits the rectangle
                    const halfW = nodeW / 2;
                    const halfH = nodeH / 2;
                    
                    // Calculate distance from node center to border along the direction vector
                    let borderDist;
                    if (Math.abs(dirX) > 0.001) {
                        const tX = halfW / Math.abs(dirX);
                        const tY = Math.abs(dirY) > 0.001 ? halfH / Math.abs(dirY) : Infinity;
                        borderDist = Math.min(tX, tY);
                    } else {
                        borderDist = halfH / Math.abs(dirY);
                    }
                    
                    // Step 4: Position arrow tip at the node border
                    const tipX = x2 - dirX * borderDist;
                    const tipY = y2 - dirY * borderDist;
                    
                    // Step 5: Calculate arrow angle
                    const angle = Math.atan2(dirY, dirX);
                    
                    // Step 6: Draw arrow wings
                    const arrowSize = 10 * scale;
                    const arrowAngle = Math.PI / 6; // 30 degrees
                    
                    const wing1X = tipX - arrowSize * Math.cos(angle - arrowAngle);
                    const wing1Y = tipY - arrowSize * Math.sin(angle - arrowAngle);
                    const wing2X = tipX - arrowSize * Math.cos(angle + arrowAngle);
                    const wing2Y = tipY - arrowSize * Math.sin(angle + arrowAngle);
                    
                    svgElements.push(`<path d="M ${tipX} ${tipY} L ${wing1X} ${wing1Y} L ${wing2X} ${wing2Y} Z" fill="${color}"/>`);
                }
                
                // Draw edge label if present
                if (edge.label) {
                    // Use original positions for label placement on the curve
                    const midX = (origX1 + origX2) / 2;
                    const midY = (origY1 + origY2) / 2;
                    
                    // Get label font properties (scaled by zoom)
                    const labelFontSize = (edge.font?.size || 11) * scale;
                    const labelFontColor = edge.font?.color || '#666666';
                    const labelFontFace = (edge.font?.face || 'Arial, sans-serif').replace(/["']/g, '');
                    
                    // White background for label readability
                    const labelWidth = String(edge.label).length * labelFontSize * 0.6;
                    const labelHeight = labelFontSize + 4;
                    
                    svgElements.push(`<rect x="${midX - labelWidth/2}" y="${midY - labelHeight/2}" 
                        width="${labelWidth}" height="${labelHeight}" 
                        fill="white" fill-opacity="0.8"/>`);
                    
                    svgElements.push(`<text x="${midX}" y="${midY}" 
                        font-family="${labelFontFace}" font-size="${labelFontSize}" 
                        fill="${labelFontColor}" text-anchor="middle" 
                        dominant-baseline="middle">${escapeXml(edge.label)}</text>`);
                }
            }
        });
        
        // Draw nodes (already retrieved at the beginning)
        nodes.forEach(node => {
            const pos = positions[node.id];
            if (!pos) return;
            
            const domPos = network.canvasToDOM(pos);
            const x = domPos.x;
            const y = domPos.y;
            
            // Skip control points (negative IDs)
            if (node.id < 0) {
                // Draw small control point (scaled appropriately)
                const cpRadius = 3 * scale;
                svgElements.push(`<circle cx="${x}" cy="${y}" r="${cpRadius}" 
                    fill="#848484" stroke="none"/>`);
                return;
            }
            
            // Get the actual rendered node from vis-network
            const visNode = network.body.nodes[node.id];
            if (!visNode) return;
            
            // Get node visual properties
            const color = node.color?.background || '#e3f2fd';
            const borderColor = node.color?.border || '#4a90e2';
            const borderWidth = (node.borderWidth || 3) * scale;
            
            // Get font properties (scaled by zoom)
            const fontSize = (node.font?.size || 14) * scale;
            const fontColor = node.font?.color || '#333333';
            const fontFace = (node.font?.face || 'Arial').replace(/["']/g, '');
            
            // Get actual size from vis-network's rendering (scaled by zoom)
            const shape = visNode.shape;
            let nodeWidth = (shape.width || 100) * scale;
            let nodeHeight = (shape.height || 40) * scale;
            
            // Draw node as rounded rectangle (box shape)
            const nodeX = x - nodeWidth / 2;
            const nodeY = y - nodeHeight / 2;
            const borderRadius = 20 * scale;
            
            svgElements.push(`<rect x="${nodeX}" y="${nodeY}" 
                width="${nodeWidth}" height="${nodeHeight}" 
                rx="${borderRadius}" ry="${borderRadius}"
                fill="${color}" 
                stroke="${borderColor}" 
                stroke-width="${borderWidth}"/>`);
            
            // Draw node label if present
            const label = node.label || '';
            if (label) {
                const lines = String(label).split('\n');
                const lineHeight = fontSize * 1.2;
                const startY = y - ((lines.length - 1) * lineHeight) / 2;
                
                lines.forEach((line, i) => {
                    svgElements.push(`<text x="${x}" y="${startY + i * lineHeight}" 
                        font-family="${fontFace}" font-size="${fontSize}" 
                        fill="${fontColor}" text-anchor="middle" 
                        dominant-baseline="middle">${escapeXml(line)}</text>`);
                });
            }
        });
        
        // Create SVG content
        const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" 
     width="${width}" height="${height}" 
     viewBox="0 0 ${width} ${height}">
  <title>PaperGraph Export</title>
  <rect width="100%" height="100%" fill="white"/>
  ${svgElements.join('\n  ')}
</svg>`;
        
        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `papergraph_${new Date().toISOString().split('T')[0]}.svg`;
        a.click();
        
        URL.revokeObjectURL(url);
        showNotification('Image vectorielle exportée en SVG!', 'success');
    } catch (error) {
        console.error('Erreur lors de l\'export SVG:', error);
        showNotification('Erreur lors de l\'export SVG: ' + error.message, 'error');
    }
}

// Helper function to escape XML special characters
function escapeXml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
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
                
                // Extract node positions if present
                if (imported.nodePositions) {
                    window.savedNodePositions = imported.nodePositions;
                    delete imported.nodePositions;  // Remove from appData
                } else {
                    window.savedNodePositions = {};
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
                
                // Recenter the graph view to show all imported content
                setTimeout(() => {
                    if (typeof window.fitGraphView === 'function') {
                        window.fitGraphView();
                    }
                }, 300); // Small delay to ensure graph is fully rendered
                
                showNotification('Projet importé!', 'success');
                
                // Close onboarding if it's open
                if (typeof window.closeOnboarding === 'function') {
                    window.closeOnboarding();
                }
            }
        } catch (err) {
            showNotification('Erreur lors de l\'import: ' + err.message, 'error');
        }
    };
    reader.readAsText(file);
    
    // Reset file input
    e.target.value = '';
}

function exportToPdf() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const margin = 20;
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const contentWidth = pageWidth - 2 * margin;
    let yPosition = margin;
    
    // ===== HELPER FUNCTIONS =====
    
    const checkNewPage = (requiredSpace = 30) => {
        if (yPosition + requiredSpace > pageHeight - margin) {
            doc.addPage();
            yPosition = margin;
            return true;
        }
        return false;
    };
    
    const drawBox = (x, y, width, height, fillColor, borderColor) => {
        doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
        doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
        doc.setLineWidth(0.3);
        doc.roundedRect(x, y, width, height, 2, 2, 'FD');
    };
    
    // ===== TITLE PAGE =====
    
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(44, 62, 80); // #2c3e50
    doc.text('Research Articles', pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 10;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(127, 140, 141); // #7f8c8d
    doc.text(`Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 
             pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 8;
    doc.setFontSize(10);
    doc.text(`${appData.articles.length} article${appData.articles.length !== 1 ? 's' : ''} • ${appData.connections.length} connection${appData.connections.length !== 1 ? 's' : ''}`, 
             pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 15;
    
    // ===== GROUP ARTICLES BY CATEGORY =====
    
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
                if (!categorized[cat].includes(article)) {
                    categorized[cat].push(article);
                }
            });
        }
    });
    
    const sortedCategories = Object.keys(categorized).sort();
    if (uncategorized.length > 0) {
        sortedCategories.push('Uncategorized');
        categorized['Uncategorized'] = uncategorized;
    }
    
    // ===== RENDER ARTICLES =====
    
    sortedCategories.forEach((category, catIndex) => {
        checkNewPage(20);
        
        // Category header
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(74, 144, 226); // #4a90e2
        doc.text(category, margin, yPosition);
        yPosition += 8;
        
        // Category articles
        categorized[category].forEach((article, artIndex) => {
            const boxHeight = 28 + (article.abstract ? 20 : 0);
            checkNewPage(boxHeight + 5);
            
            const boxY = yPosition;
            
            // Draw article box (like list view)
            drawBox(margin, boxY, contentWidth, boxHeight, 
                    [248, 249, 250], // #f8f9fa background
                    [233, 236, 239]); // #e9ecef border
            
            const innerMargin = margin + 4;
            let innerY = boxY + 5;
            
            // BibTeX ID (small, gray, monospace)
            if (article.bibtexId) {
                doc.setFontSize(7);
                doc.setFont('courier', 'normal');
                doc.setTextColor(150, 150, 150);
                doc.text(article.bibtexId, innerMargin, innerY);
                innerY += 4;
            }
            
            // Title (bold, dark blue)
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(44, 62, 80); // #2c3e50
            const titleLines = doc.splitTextToSize(article.title, contentWidth - 8);
            titleLines.forEach(line => {
                doc.text(line, innerMargin, innerY);
                innerY += 4;
            });
            
            // Authors (italic, smaller)
            if (article.authors) {
                doc.setFontSize(9);
                doc.setFont('helvetica', 'italic');
                doc.setTextColor(100, 100, 100);
                const authorLines = doc.splitTextToSize(article.authors, contentWidth - 8);
                authorLines.forEach(line => {
                    doc.text(line, innerMargin, innerY);
                    innerY += 3.5;
                });
            }
            
            // Publication info (small, gray)
            const pubInfo = [];
            if (article.journal || article.booktitle) pubInfo.push(article.journal || article.booktitle);
            if (article.year) pubInfo.push(article.year);
            if (article.volume) pubInfo.push(`Vol. ${article.volume}`);
            if (article.pages) pubInfo.push(`pp. ${article.pages}`);
            
            if (pubInfo.length > 0) {
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(120, 120, 120);
                doc.text(pubInfo.join(' • '), innerMargin, innerY);
                innerY += 4;
            }
            
            // Abstract (if present, very small)
            if (article.abstract) {
                doc.setFontSize(7);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(100, 100, 100);
                const abstractLines = doc.splitTextToSize(
                    article.abstract.substring(0, 300) + (article.abstract.length > 300 ? '...' : ''), 
                    contentWidth - 8
                );
                abstractLines.slice(0, 3).forEach(line => {
                    doc.text(line, innerMargin, innerY);
                    innerY += 3;
                });
            }
            
            // DOI/Link (bottom, small, blue)
            if (article.doi || article.link) {
                innerY = boxY + boxHeight - 4;
                doc.setFontSize(7);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(74, 144, 226); // #4a90e2
                const link = article.doi ? `DOI: ${article.doi}` : `URL: ${article.link}`;
                doc.text(link, innerMargin, innerY);
            }
            
            yPosition += boxHeight + 4;
        });
        
        yPosition += 4; // Extra space between categories
    });
    
    // ===== FOOTER ON EACH PAGE =====
    
    const pageCount = doc.internal.getNumberOfPages();
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        doc.text('Generated by papergraph', pageWidth - margin, pageHeight - 10, { align: 'right' });
    }
    
    // Save PDF
    doc.save(`papergraph_${new Date().toISOString().split('T')[0]}.pdf`);
    showNotification('PDF exported!', 'success');
}

// ===== BIBTEX EXPORT =====

function exportToBibtex() {
    if (appData.articles.length === 0) {
        showNotification('Aucun article à exporter', 'warning');
        return;
    }
    
    let bibtexContent = '';
    
    appData.articles.forEach(article => {
        bibtexContent += articleToBibTeX(article) + '\n';
    });
    
    const blob = new Blob([bibtexContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `papergraph_${new Date().toISOString().split('T')[0]}.bib`;
    a.click();
    
    URL.revokeObjectURL(url);
    showNotification(`${appData.articles.length} article(s) exporté(s) en BibTeX!`, 'success');
}
