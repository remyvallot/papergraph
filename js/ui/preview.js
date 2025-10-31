// ===== ARTICLE PREVIEW =====
// Preview panel display and management

function showArticlePreview(articleId) {
    const article = appData.articles.find(a => a.id === articleId);
    if (!article) return;
    
    currentPreviewArticleId = articleId;
    console.log('showArticlePreview: Loading article', articleId, article);
    
    const preview = document.getElementById('articlePreview');
    
    // Update BibTeX ID if available
    const citationKeyElement = document.getElementById('previewCitationKey');
    if (article.bibtexId) {
        citationKeyElement.textContent = article.bibtexId;
        citationKeyElement.style.display = 'inline-block';
        citationKeyElement.setAttribute('data-field', 'bibtexId');
    } else {
        citationKeyElement.style.display = 'none';
    }
    
    // Update title
    document.getElementById('previewTitle').textContent = article.title || 'Sans titre';
    
    // Update authors/meta
    const authorsElement = document.getElementById('previewAuthors');
    if (article.authors) {
        authorsElement.textContent = article.authors;
    } else {
        authorsElement.textContent = '';
    }
    
    // Update category badges - show ALL categories with same colors as graph
    const categoryBadge = document.getElementById('previewCategoryBadge');
    if (article.categories && article.categories.length > 0) {
        // Clear existing content
        categoryBadge.innerHTML = '';
        
        // Create a badge for each category
        article.categories.forEach(category => {
            const badge = document.createElement('span');
            badge.className = 'category-badge';
            badge.textContent = category;
            
            // Use zone color if available (same as graph)
            const zone = tagZones.find(z => z.tag === category);
            if (zone) {
                badge.style.background = zone.color;
                badge.style.borderColor = zone.color;
                badge.style.color = getContrastColor(zone.color);
            }
            
            categoryBadge.appendChild(badge);
        });
        
        categoryBadge.style.display = 'flex';
        categoryBadge.style.flexWrap = 'wrap';
        categoryBadge.style.gap = '4px';
    } else {
        categoryBadge.style.display = 'none';
    }
    
    // Update description/text
    const textElement = document.getElementById('previewText');
    textElement.textContent = article.text || '';
    
    console.log('Preview updated with:', {
        title: article.title,
        authors: article.authors,
        text: article.text
    });
    
    // Handle DOI
    const doiContainer = document.getElementById('previewDoiContainer');
    const doiElement = document.getElementById('previewDoi');
    if (article.doi) {
        doiElement.href = `https://doi.org/${article.doi}`;
        doiElement.textContent = article.doi;
        doiContainer.style.display = 'flex';
    } else {
        doiContainer.style.display = 'none';
    }
    
    // Handle Link
    const linkContainer = document.getElementById('previewLinkContainer');
    const linkElement = document.getElementById('previewLink');
    if (article.link) {
        linkElement.href = article.link;
        const displayLink = article.link.length > 40 ? article.link.substring(0, 37) + '...' : article.link;
        linkElement.textContent = displayLink;
        linkContainer.style.display = 'flex';
    } else {
        linkContainer.style.display = 'none';
    }
    
    // Handle PDF
    const pdfContainer = document.getElementById('previewPdfContainer');
    const pdfElement = document.getElementById('previewPdf');
    if (article.pdf) {
        pdfElement.href = article.pdf;
        const displayPdf = article.pdf.length > 40 ? article.pdf.substring(0, 37) + '...' : article.pdf;
        pdfElement.textContent = displayPdf;
        pdfContainer.style.display = 'flex';
    } else {
        pdfContainer.style.display = 'none';
    }
    
    // Show preview panel
    preview.classList.add('active');
    
    // Setup inline editing once
    if (!inlineEditingSetup) {
        setupInlineEditing();
        inlineEditingSetup = true;
    }
}

function closeArticlePreview() {
    // Save any ongoing edits before closing
    if (currentEditingElement) {
        // Determine which field is being edited
        let field = null;
        if (currentEditingElement.id === 'previewTitle') field = 'title';
        else if (currentEditingElement.id === 'previewAuthors') field = 'authors';
        else if (currentEditingElement.id === 'previewText') field = 'text';
        
        if (field) {
            saveInlineEdit(currentEditingElement, field);
        }
    }
    
    const preview = document.getElementById('articlePreview');
    preview.classList.remove('active');
    currentPreviewArticleId = null;
}

function setupInlineEditing() {
    // Make BibTeX ID editable
    const bibtexIdElement = document.getElementById('previewCitationKey');
    bibtexIdElement.contentEditable = 'true';
    
    bibtexIdElement.addEventListener('focus', () => {
        currentEditingElement = bibtexIdElement;
        originalContent = bibtexIdElement.textContent;
        bibtexIdElement.classList.add('editing');
    });
    
    bibtexIdElement.addEventListener('blur', () => {
        if (currentEditingElement === bibtexIdElement) {
            saveInlineEdit(bibtexIdElement, 'bibtexId');
        }
    });
    
    bibtexIdElement.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveInlineEdit(bibtexIdElement, 'bibtexId');
            bibtexIdElement.blur();
        }
        if (e.key === 'Escape') {
            bibtexIdElement.textContent = originalContent;
            bibtexIdElement.classList.remove('editing');
            currentEditingElement = null;
            bibtexIdElement.blur();
        }
    });
    
    // Make title editable
    const titleElement = document.getElementById('previewTitle');
    titleElement.contentEditable = 'true';
    
    titleElement.addEventListener('focus', () => {
        currentEditingElement = titleElement;
        originalContent = titleElement.textContent;
        titleElement.classList.add('editing');
    });
    
    titleElement.addEventListener('blur', () => {
        if (currentEditingElement === titleElement) {
            saveInlineEdit(titleElement, 'title');
        }
    });
    
    titleElement.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveInlineEdit(titleElement, 'title');
            titleElement.blur();
        }
        if (e.key === 'Escape') {
            titleElement.textContent = originalContent;
            titleElement.classList.remove('editing');
            currentEditingElement = null;
            titleElement.blur();
        }
    });
    
    // Make authors editable
    const authorsElement = document.getElementById('previewAuthors');
    authorsElement.contentEditable = 'true';
    
    authorsElement.addEventListener('focus', () => {
        currentEditingElement = authorsElement;
        originalContent = authorsElement.textContent;
        authorsElement.classList.add('editing');
    });
    
    authorsElement.addEventListener('blur', () => {
        if (currentEditingElement === authorsElement) {
            saveInlineEdit(authorsElement, 'authors');
        }
    });
    
    authorsElement.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveInlineEdit(authorsElement, 'authors');
            authorsElement.blur();
        }
        if (e.key === 'Escape') {
            authorsElement.textContent = originalContent;
            authorsElement.classList.remove('editing');
            currentEditingElement = null;
            authorsElement.blur();
        }
    });
    
    // Make description editable
    const descriptionElement = document.getElementById('previewText');
    descriptionElement.contentEditable = 'true';
    
    descriptionElement.addEventListener('focus', () => {
        currentEditingElement = descriptionElement;
        originalContent = descriptionElement.textContent;
        descriptionElement.classList.add('editing');
    });
    
    descriptionElement.addEventListener('blur', () => {
        if (currentEditingElement === descriptionElement) {
            saveInlineEdit(descriptionElement, 'text');
        }
    });
    
    descriptionElement.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            // Ctrl+Enter to save
            e.preventDefault();
            saveInlineEdit(descriptionElement, 'text');
            descriptionElement.blur();
        }
        if (e.key === 'Escape') {
            descriptionElement.textContent = originalContent;
            descriptionElement.classList.remove('editing');
            currentEditingElement = null;
            descriptionElement.blur();
        }
    });
}

function saveInlineEdit(element, field) {
    // Prevent double save
    if (!currentEditingElement || currentEditingElement !== element) {
        return;
    }
    
    element.classList.remove('editing');
    currentEditingElement = null;
    
    if (!currentPreviewArticleId) return;
    
    const article = appData.articles.find(a => a.id === currentPreviewArticleId);
    if (!article) return;
    
    const newValue = element.textContent.trim();
    
    if (newValue !== originalContent.trim()) {
        article[field] = newValue;
        
        // Update graph node
        if (network) {
            if (field === 'title') {
                const labelFormat = localStorage.getItem('nodeLabelFormat') || 'bibtexId';
                if (labelFormat === 'title') {
                    network.body.data.nodes.update({
                        id: currentPreviewArticleId,
                        label: newValue
                    });
                }
            } else if (field === 'bibtexId') {
                const labelFormat = localStorage.getItem('nodeLabelFormat') || 'bibtexId';
                if (labelFormat === 'bibtexId') {
                    network.body.data.nodes.update({
                        id: currentPreviewArticleId,
                        label: newValue
                    });
                }
            } else if (field === 'text') {
                const tooltipText = newValue ? newValue.substring(0, 100) + '...' : article.title;
                network.body.data.nodes.update({
                    id: currentPreviewArticleId,
                    title: tooltipText
                });
            }
        }
        
        renderListView();
        saveToLocalStorage(true);
        showNotification('Article mis à jour!', 'success');
    }
}
