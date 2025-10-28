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
        
        // Clear ALL localStorage data including positions
        localStorage.removeItem('papermap_data');
        localStorage.removeItem('papermap_zones');
        localStorage.removeItem('papermap_positions');
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
