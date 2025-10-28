// ===== BIBTEX FUNCTIONS =====
// BibTeX import and export functionality

// ===== BIBTEX PARSER =====
function parseBibtex(bibtexString) {
    const entries = [];
    
    // Match each BibTeX entry
    const entryRegex = /@(\w+)\s*\{\s*([^,]+)\s*,\s*([\s\S]*?)\n\}/g;
    let match;
    
    while ((match = entryRegex.exec(bibtexString)) !== null) {
        const type = match[1].toLowerCase();
        const citationKey = match[2].trim();
        const fields = match[3];
        
        const entry = {
            type: type,
            citationKey: citationKey,
            title: '',
            authors: '',
            year: '',
            journal: '',
            doi: '',
            url: '',
            abstract: ''
        };
        
        // Parse fields
        const fieldRegex = /(\w+)\s*=\s*\{([^}]*)\}|(\w+)\s*=\s*"([^"]*)"/g;
        let fieldMatch;
        
        while ((fieldMatch = fieldRegex.exec(fields)) !== null) {
            const fieldName = (fieldMatch[1] || fieldMatch[3]).toLowerCase();
            const fieldValue = (fieldMatch[2] || fieldMatch[4]).trim();
            
            switch (fieldName) {
                case 'title':
                    entry.title = fieldValue.replace(/[{}]/g, '');
                    break;
                case 'author':
                    entry.authors = fieldValue.replace(/[{}]/g, '').replace(/ and /g, ', ');
                    break;
                case 'year':
                    entry.year = fieldValue;
                    break;
                case 'journal':
                case 'booktitle':
                    entry.journal = fieldValue.replace(/[{}]/g, '');
                    break;
                case 'doi':
                    entry.doi = fieldValue;
                    break;
                case 'url':
                    entry.url = fieldValue;
                    break;
                case 'abstract':
                    entry.abstract = fieldValue.replace(/[{}]/g, '');
                    break;
            }
        }
        
        entries.push(entry);
    }
    
    return entries;
}

// ===== BIBTEX IMPORT FROM FILE =====
function importBibtexFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.bib';
    
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const bibtexString = event.target.result;
                const entries = parseBibtex(bibtexString);
                
                if (entries.length === 0) {
                    showNotification('Aucune entrée BibTeX trouvée', 'error');
                    return;
                }
                
                // Import each entry
                entries.forEach(entry => {
                    importBibtexEntry(entry);
                });
                
                showNotification(`${entries.length} article(s) importé(s) depuis BibTeX`, 'success');
                
            } catch (error) {
                console.error('Error parsing BibTeX:', error);
                showNotification('Erreur lors de l\'import BibTeX', 'error');
            }
        };
        reader.readAsText(file);
    };
    
    input.click();
}

// ===== BIBTEX IMPORT FROM CLIPBOARD =====
function importBibtexFromClipboard(bibtexString) {
    try {
        const entries = parseBibtex(bibtexString);
        
        if (entries.length === 0) {
            showNotification('Aucune entrée BibTeX valide trouvée', 'error');
            return false;
        }
        
        // Import the first entry (for article modal)
        const entry = entries[0];
        
        // Fill the article form with BibTeX data
        document.getElementById('articleTitle').value = entry.title || '';
        document.getElementById('articleAuthors').value = entry.authors || '';
        document.getElementById('articleYear').value = entry.year || '';
        document.getElementById('articleJournal').value = entry.journal || '';
        document.getElementById('articleDoi').value = entry.doi || '';
        document.getElementById('articleLink').value = entry.url || '';
        document.getElementById('articleText').value = entry.abstract || '';
        
        showNotification('Données BibTeX importées dans le formulaire', 'success');
        return true;
        
    } catch (error) {
        console.error('Error parsing BibTeX:', error);
        showNotification('Erreur lors du parsing BibTeX', 'error');
        return false;
    }
}

// ===== BIBTEX ENTRY IMPORT =====
function importBibtexEntry(entry) {
    const newArticle = {
        id: appData.nextArticleId++,
        title: entry.title || 'Sans titre',
        authors: entry.authors || '',
        year: entry.year || '',
        journal: entry.journal || '',
        doi: entry.doi || '',
        link: entry.url || '',
        pdf: '',
        text: entry.abstract || '',
        categories: [],
        x: Math.random() * 800 - 400,
        y: Math.random() * 600 - 300
    };
    
    appData.articles.push(newArticle);
    saveToLocalStorage();
    
    if (network) {
        const nodeColor = { background: '#e3f2fd', border: '#4a90e2' };
        
        network.body.data.nodes.add({
            id: newArticle.id,
            label: '',
            title: newArticle.title,
            x: newArticle.x,
            y: newArticle.y,
            color: nodeColor
        });
    }
    
    renderListView();
}

// ===== BIBTEX EXPORT =====
function exportAllToBibtex() {
    if (appData.articles.length === 0) {
        showNotification('Aucun article à exporter', 'error');
        return;
    }
    
    let bibtexString = '';
    
    appData.articles.forEach((article, index) => {
        // Generate citation key: FirstAuthorYear or Article1, Article2, etc.
        let citationKey = `Article${index + 1}`;
        
        if (article.authors && article.year) {
            const firstAuthor = article.authors.split(',')[0].split(' ').pop().replace(/[^a-zA-Z]/g, '');
            citationKey = `${firstAuthor}${article.year}`;
        }
        
        // Determine entry type
        const entryType = article.journal ? 'article' : 'misc';
        
        bibtexString += `@${entryType}{${citationKey},\n`;
        
        if (article.title) {
            bibtexString += `  title = {${article.title}},\n`;
        }
        
        if (article.authors) {
            // Convert comma-separated to "and" format
            const authors = article.authors.split(',').map(a => a.trim()).join(' and ');
            bibtexString += `  author = {${authors}},\n`;
        }
        
        if (article.year) {
            bibtexString += `  year = {${article.year}},\n`;
        }
        
        if (article.journal) {
            bibtexString += `  journal = {${article.journal}},\n`;
        }
        
        if (article.doi) {
            bibtexString += `  doi = {${article.doi}},\n`;
        }
        
        if (article.link) {
            bibtexString += `  url = {${article.link}},\n`;
        }
        
        if (article.text) {
            bibtexString += `  abstract = {${article.text}},\n`;
        }
        
        bibtexString += `}\n\n`;
    });
    
    // Download the BibTeX file
    const blob = new Blob([bibtexString], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'papergraph-export.bib';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showNotification(`${appData.articles.length} article(s) exporté(s) en BibTeX`, 'success');
}
