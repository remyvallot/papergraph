// ===== ARTICLE MODAL =====
// Article creation and editing modal

function openArticleModal(articleId = null) {
    const modal = document.getElementById('articleModal');
    const modalTitle = document.getElementById('modalTitle');
    const form = document.getElementById('articleForm');
    const deleteBtn = document.getElementById('deleteArticleBtn');
    
    currentEditingArticleId = articleId;
    
    // Hide selection box when opening modal
    hideSelectionBox();
    
    // Reset form
    form.reset();
    
    // Reset import zone to initial state
    resetImportZone();
    
    // Always collapse manual form on open
    const manualForm = document.getElementById('manualForm');
    const toggleBtn = document.getElementById('toggleManualBtn');
    manualForm.classList.add('collapsed');
    toggleBtn.textContent = '✏️ Manual Entry / Edit';
    
    if (articleId) {
        // Edit mode - show manual form directly with data
        modalTitle.textContent = 'Éditer l\'article';
        deleteBtn.style.display = 'inline-block';
        
        const article = appData.articles.find(a => a.id === articleId);
        if (article) {
            document.getElementById('articleTitle').value = article.title || '';
            document.getElementById('articleAuthors').value = article.authors || '';
            document.getElementById('articleYear').value = article.year || '';
            document.getElementById('articleType').value = article.entryType || 'article';
            document.getElementById('articleJournal').value = article.journal || article.booktitle || '';
            document.getElementById('articleVolume').value = article.volume || '';
            document.getElementById('articleNumber').value = article.number || '';
            document.getElementById('articlePages').value = article.pages || '';
            document.getElementById('articlePublisher').value = article.publisher || article.institution || '';
            document.getElementById('articleDoi').value = article.doi || '';
            document.getElementById('articleIsbn').value = article.isbn || '';
            document.getElementById('articleIssn').value = article.issn || '';
            document.getElementById('articleLink').value = article.link || article.url || '';
            document.getElementById('articlePdf').value = article.pdf || '';
            document.getElementById('articleAbstract').value = article.abstract || article.text || '';
            document.getElementById('articleNote').value = article.note || '';
            document.getElementById('articleCategories').value = article.categories ? article.categories.join(', ') : '';
            
            // Hide import zone and show manual form in edit mode
            document.querySelector('.import-zone').style.display = 'none';
            document.getElementById('manualFormToggle').style.display = 'none';
            manualForm.classList.remove('collapsed');
        }
    } else {
        // New article mode
        modalTitle.textContent = 'New Article';
        deleteBtn.style.display = 'none';
        
        // Show import zone in new article mode
        document.querySelector('.import-zone').style.display = 'block';
        document.getElementById('manualFormToggle').style.display = 'block';
    }
    
    modal.classList.add('active');
}

function closeModal() {
    document.getElementById('articleModal').classList.remove('active');
    currentEditingArticleId = null;
    pendingImportArticle = null; // Clear pending import data
    resetImportZone();
}

function saveArticle(e) {
    e.preventDefault();
    
    const title = document.getElementById('articleTitle').value.trim();
    const authors = document.getElementById('articleAuthors').value.trim();
    const year = document.getElementById('articleYear').value.trim();
    const entryType = document.getElementById('articleType').value;
    const journal = document.getElementById('articleJournal').value.trim();
    const volume = document.getElementById('articleVolume').value.trim();
    const number = document.getElementById('articleNumber').value.trim();
    const pages = document.getElementById('articlePages').value.trim();
    const publisher = document.getElementById('articlePublisher').value.trim();
    const doi = document.getElementById('articleDoi').value.trim();
    const isbn = document.getElementById('articleIsbn').value.trim();
    const issn = document.getElementById('articleIssn').value.trim();
    const link = document.getElementById('articleLink').value.trim();
    const pdf = document.getElementById('articlePdf').value.trim();
    const abstract = document.getElementById('articleAbstract').value.trim();
    const note = document.getElementById('articleNote').value.trim();
    const categoriesText = document.getElementById('articleCategories').value.trim();
    
    const categories = categoriesText 
        ? categoriesText.split(',').map(c => c.trim()).filter(c => c)
        : [];
    
    if (currentEditingArticleId) {
        // Update existing article
        const article = appData.articles.find(a => a.id === currentEditingArticleId);
        if (article) {
            article.title = title;
            article.authors = authors;
            article.year = year;
            article.entryType = entryType;
            article.journal = journal;
            article.volume = volume;
            article.number = number;
            article.pages = pages;
            article.publisher = publisher;
            article.doi = doi;
            article.isbn = isbn;
            article.issn = issn;
            article.link = link;
            article.pdf = pdf;
            article.abstract = abstract;
            article.note = note;
            article.text = abstract || note; // Keep backward compatibility
            article.categories = categories;
            
            // Generate BibTeX ID if missing
            if (!article.bibtexId && (article.authors || article.title)) {
                article.bibtexId = generateBibtexId(article);
            }
        }
    } else {
        // Create new article
        const newArticle = {
            id: appData.nextArticleId++,
            title,
            authors,
            year,
            entryType,
            journal,
            volume,
            number,
            pages,
            publisher,
            doi,
            isbn,
            issn,
            link,
            pdf,
            abstract,
            note,
            text: abstract || note,
            categories
        };
        
        // If this is from a BibTeX import, preserve imported fields
        if (pendingImportArticle) {
            // Preserve important BibTeX fields
            newArticle.bibtexId = pendingImportArticle.bibtexId;
            newArticle.citationKey = pendingImportArticle.citationKey;
            newArticle.entryType = pendingImportArticle.entryType;
            newArticle.originalBibTeX = pendingImportArticle.originalBibTeX;
            
            // Preserve additional BibTeX fields that might not be in the form
            if (pendingImportArticle.booktitle) newArticle.booktitle = pendingImportArticle.booktitle;
            if (pendingImportArticle.month) newArticle.month = pendingImportArticle.month;
            if (pendingImportArticle.date) newArticle.date = pendingImportArticle.date;
            if (pendingImportArticle.institution) newArticle.institution = pendingImportArticle.institution;
            if (pendingImportArticle.organization) newArticle.organization = pendingImportArticle.organization;
            if (pendingImportArticle.school) newArticle.school = pendingImportArticle.school;
            if (pendingImportArticle.edition) newArticle.edition = pendingImportArticle.edition;
            if (pendingImportArticle.series) newArticle.series = pendingImportArticle.series;
            if (pendingImportArticle.chapter) newArticle.chapter = pendingImportArticle.chapter;
            if (pendingImportArticle.address) newArticle.address = pendingImportArticle.address;
            if (pendingImportArticle.howpublished) newArticle.howpublished = pendingImportArticle.howpublished;
            if (pendingImportArticle.keywords) newArticle.keywords = pendingImportArticle.keywords;
            
            // Clear the pending import
            pendingImportArticle = null;
        } else {
            // Generate BibTeX ID for manually created article
            if (authors || title) {
                newArticle.bibtexId = generateBibtexId(newArticle);
            }
        }
        
        appData.articles.push(newArticle);
        
        // If category filter is active and new article doesn't match, reset filter
        if (currentCategoryFilter && !categories.includes(currentCategoryFilter)) {
            currentCategoryFilter = '';
            document.getElementById('categoryFilter').value = '';
        }
    }
    
    closeModal();
    updateCategoryFilters();
    updateGraph();
    renderListView();
    saveToLocalStorage(true);  // Silent save, notification already shown
    showNotification('Article saved!', 'success');
    
    // Close onboarding if it's open
    if (typeof window.closeOnboarding === 'function') {
        window.closeOnboarding();
    }
    
    // Update preview if it's open
    if (currentEditingArticleId && selectedNodeId === currentEditingArticleId) {
        showArticlePreview(currentEditingArticleId);
    }
}

function deleteArticle() {
    if (!currentEditingArticleId) return;
    
    if (confirm('Supprimer cet article ?')) {
        deleteArticleById(currentEditingArticleId);
        closeModal();
    }
}

function deleteArticleById(articleId) {
    // Remove article
    appData.articles = appData.articles.filter(a => a.id !== articleId);
    
    // Find connections that will be removed
    const connectionsToRemove = appData.connections.filter(c => 
        c.from === articleId || c.to === articleId
    );
    
    // Clean up control points for these connections
    connectionsToRemove.forEach(conn => {
        if (edgeControlPoints[conn.id]) {
            const controlPointsToDelete = edgeControlPoints[conn.id];
            console.log('🗑️ Cleaning up control points for connection', conn.id, ':', controlPointsToDelete);
            
            // Remove control point nodes from network
            if (network && network.body && network.body.data) {
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
                        return edgeNum === conn.id;
                    }
                });
                if (segmentEdges.length > 0) {
                    network.body.data.edges.remove(segmentEdges.map(e => e.id));
                    console.log('🗑️ Removed', segmentEdges.length, 'segment edges for connection', conn.id);
                }
            }
            
            // Remove from edgeControlPoints
            delete edgeControlPoints[conn.id];
        }
    });
    
    // Remove connections
    appData.connections = appData.connections.filter(c => 
        c.from !== articleId && c.to !== articleId
    );
    
    updateCategoryFilters();
    updateGraph();
    renderListView();
    saveToLocalStorage();
    showNotification('Article deleted', 'info');
    
    // Close onboarding if it's open
    if (typeof window.closeOnboarding === 'function') {
        window.closeOnboarding();
    }
}

function toggleManualForm() {
    const manualForm = document.getElementById('manualForm');
    const toggleBtn = document.getElementById('toggleManualBtn');
    
    if (manualForm.classList.contains('collapsed')) {
        manualForm.classList.remove('collapsed');
        toggleBtn.textContent = '🔼 Collapse';
    } else {
        manualForm.classList.add('collapsed');
        toggleBtn.textContent = '✏️ Manual Entry / Edit';
    }
}
