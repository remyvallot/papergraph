// ===== LIST VIEW =====
// List view rendering and interactions

function renderListView(searchTerm = '') {
    const listContainer = document.getElementById('listContainer');
    const resultCount = document.getElementById('searchResultCount');
    let filteredArticles = appData.articles;
    
    // Filter by category
    if (currentCategoryFilter) {
        filteredArticles = filteredArticles.filter(a => a.categories.includes(currentCategoryFilter));
    }
    
    // Filter by date range
    if (activeFilters.dateRange) {
        filteredArticles = filteredArticles.filter(article => {
            if (!article.date) return !activeFilters.dateRange.start && !activeFilters.dateRange.end;
            
            const articleDate = new Date(article.date);
            const startDate = activeFilters.dateRange.start ? new Date(activeFilters.dateRange.start) : null;
            const endDate = activeFilters.dateRange.end ? new Date(activeFilters.dateRange.end) : null;
            
            if (startDate && articleDate < startDate) return false;
            if (endDate && articleDate > endDate) return false;
            
            return true;
        });
    }
    
    // Filter by search term (same power as graph search)
    if (searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        filteredArticles = filteredArticles.filter(a => {
            // Check title
            if (a.title.toLowerCase().includes(term)) return true;
            
            // Check text/notes
            if (a.text && a.text.toLowerCase().includes(term)) return true;
            
            // Check categories/tags
            if (a.categories.some(cat => cat.toLowerCase().includes(term))) return true;
            
            // Check authors
            if (a.authors && a.authors.toLowerCase().includes(term)) return true;
            
            return false;
        });
    }
    
    // Update result count in search bar
    if (resultCount && searchTerm) {
        if (filteredArticles.length === 0) {
            resultCount.textContent = '0';
            resultCount.style.color = '#999';
        } else {
            resultCount.textContent = `${filteredArticles.length}`;
            resultCount.style.color = '#4a90e2';
        }
    } else if (resultCount) {
        resultCount.textContent = '';
    }
    
    listContainer.innerHTML = '';
    
    if (filteredArticles.length === 0) {
        listContainer.innerHTML = '<div style="text-align: center; padding: 3rem; color: #999;">No article found</div>';
        return;
    }
    
    filteredArticles.forEach(article => {
        const item = document.createElement('div');
        item.className = 'article-list-item';
        
        // Add highlight class if this article matches search
        if (searchTerm && searchTerm.trim()) {
            item.classList.add('search-match');
        }
        
        // Header with title and actions
        const header = document.createElement('div');
        header.className = 'article-list-header';
        
        // Title container (includes citation key and title)
        const titleContainer = document.createElement('div');
        titleContainer.className = 'article-list-title-container';
        
        // BibTeX ID
        if (article.bibtexId) {
            const citationKey = document.createElement('div');
            citationKey.className = 'citation-key';
            citationKey.contentEditable = window.isGalleryViewer ? 'false' : 'true';
            citationKey.textContent = article.bibtexId;
            citationKey.onclick = (e) => e.stopPropagation();
            citationKey.ondblclick = (e) => {
                e.stopPropagation();
                citationKey.focus();
                // Select all text on double click
                const selection = window.getSelection();
                const range = document.createRange();
                range.selectNodeContents(citationKey);
                selection.removeAllRanges();
                selection.addRange(range);
            };
            citationKey.onblur = function() {
                const newValue = this.textContent.trim();
                if (newValue && newValue !== article.bibtexId) {
                    article.bibtexId = newValue;
                    saveToLocalStorage(true);
                    showNotification('BibTeX ID mis à jour!', 'success');
                    // Update graph label if needed
                    const labelFormat = localStorage.getItem('nodeLabelFormat') || 'bibtexId';
                    if (labelFormat === 'bibtexId' && network) {
                        network.body.data.nodes.update({
                            id: article.id,
                            label: newValue
                        });
                    }
                }
            };
            citationKey.onkeydown = function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.blur();
                }
            };
            titleContainer.appendChild(citationKey);
        }
        
        const title = document.createElement('div');
        title.className = 'article-list-title';
        title.contentEditable = window.isGalleryViewer ? 'false' : 'true';
        title.textContent = article.title;
        title.onclick = (e) => e.stopPropagation();
        title.ondblclick = (e) => {
            e.stopPropagation();
            title.classList.add('editing');
        };
        title.onblur = () => {
            title.classList.remove('editing');
            if (title.textContent.trim() !== article.title) {
                article.title = title.textContent.trim();
                saveToLocalStorage();
                updateGraph();
            }
        };
        title.onkeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                title.blur();
            }
            if (e.key === 'Escape') {
                title.textContent = article.title;
                title.blur();
            }
        };
        titleContainer.appendChild(title);
        header.appendChild(titleContainer);
        
        const actions = document.createElement('div');
        actions.className = 'article-list-actions';
        
        // Don't show edit button in gallery viewer mode
        if (!window.isGalleryViewer) {
            const editBtn = document.createElement('button');
            editBtn.className = 'article-action-btn';
            editBtn.title = 'Éditer dans le modal';
            editBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>`;
            editBtn.onclick = () => openArticleModal(article.id);
            actions.appendChild(editBtn);
        }
        
        header.appendChild(actions);
        item.appendChild(header);
        
        // Meta section
        const meta = document.createElement('div');
        meta.className = 'article-list-meta';
        
        // Authors
        const authors = document.createElement('div');
        authors.className = 'article-list-authors';
        authors.contentEditable = window.isGalleryViewer ? 'false' : 'true';
        authors.textContent = article.authors || '';
        authors.onclick = (e) => e.stopPropagation();
        authors.ondblclick = (e) => {
            e.stopPropagation();
            authors.classList.add('editing');
        };
        authors.onblur = () => {
            authors.classList.remove('editing');
            article.authors = authors.textContent.trim();
            saveToLocalStorage();
        };
        authors.onkeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                authors.blur();
            }
            if (e.key === 'Escape') {
                authors.textContent = article.authors || '';
                authors.blur();
            }
        };
        meta.appendChild(authors);
        
        // Categories
        if (article.categories && article.categories.length > 0) {
            const categories = document.createElement('div');
            categories.className = 'article-list-categories';
            article.categories.forEach(cat => {
                const badge = document.createElement('span');
                badge.className = 'article-list-category';
                badge.textContent = cat;
                
                // Find zone color for this category
                const zone = tagZones.find(z => z.tag === cat);
                if (zone) {
                    badge.style.background = zone.color;
                    badge.style.borderColor = zone.color;
                    badge.style.color = getContrastColor(zone.color);
                }
                
                categories.appendChild(badge);
            });
            meta.appendChild(categories);
        }
        
        item.appendChild(meta);
        
        // Text/Notes
        const text = document.createElement('div');
        text.className = 'article-list-text';
        text.contentEditable = window.isGalleryViewer ? 'false' : 'true';
        text.textContent = article.text || '';
        text.onclick = (e) => e.stopPropagation();
        text.ondblclick = (e) => {
            e.stopPropagation();
            text.classList.add('editing');
        };
        text.onblur = () => {
            text.classList.remove('editing');
            article.text = text.textContent.trim();
            saveToLocalStorage();
        };
        text.onkeydown = (e) => {
            if (e.key === 'Escape') {
                text.textContent = article.text || '';
                text.blur();
            }
        };
        item.appendChild(text);
        
        // Links section
        const hasLinks = article.doi || article.link || article.pdf;
        if (hasLinks) {
            const links = document.createElement('div');
            links.className = 'article-list-links';
            
            if (article.doi) {
                const doiLink = document.createElement('a');
                doiLink.className = 'article-list-link';
                doiLink.href = article.doi.startsWith('http') ? article.doi : `https://doi.org/${article.doi}`;
                doiLink.target = '_blank';
                doiLink.innerHTML = '📄 DOI';
                doiLink.onclick = (e) => e.stopPropagation();
                links.appendChild(doiLink);
            }
            
            if (article.link) {
                const webLink = document.createElement('a');
                webLink.className = 'article-list-link';
                webLink.href = article.link;
                webLink.target = '_blank';
                webLink.innerHTML = '🔗 Lien';
                webLink.onclick = (e) => e.stopPropagation();
                links.appendChild(webLink);
            }
            
            if (article.pdf) {
                const pdfLink = document.createElement('a');
                pdfLink.className = 'article-list-link';
                pdfLink.href = article.pdf;
                pdfLink.target = '_blank';
                pdfLink.innerHTML = '📕 PDF';
                pdfLink.onclick = (e) => e.stopPropagation();
                links.appendChild(pdfLink);
            }
            
            item.appendChild(links);
        }
        
        listContainer.appendChild(item);
    });
}
