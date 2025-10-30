// ===== IMPORT FUNCTIONS =====
// DOI, arXiv, and PDF import functionality

// ===== IMPORT ZONE SETUP =====

function setupImportZone() {
    const dropZone = document.getElementById('dropZone');
    const quickImport = document.getElementById('quickImport');
    const browseBtn = document.getElementById('browseFileBtn');
    const fileInput = document.getElementById('pdfFileInput');
    
    if (!dropZone || !quickImport) return; // Elements might not exist in all views
    
    // Drag and drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });
    
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            const fileName = file.name.toLowerCase();
            
            if (file.type === 'application/pdf' || fileName.endsWith('.pdf')) {
                handlePdfFile(file);
            } else if (fileName.endsWith('.bib') || fileName.endsWith('.bibtex')) {
                handleBibFile(file);
            } else {
                showImportStatus('Please drop a PDF or .bib file', 'error');
            }
        }
    });
    
    // Browse button
    if (browseBtn && fileInput) {
        browseBtn.addEventListener('click', () => {
            fileInput.click();
        });
        
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                const file = e.target.files[0];
                const fileName = file.name.toLowerCase();
                
                if (file.type === 'application/pdf' || fileName.endsWith('.pdf')) {
                    handlePdfFile(file);
                } else if (fileName.endsWith('.bib') || fileName.endsWith('.bibtex')) {
                    handleBibFile(file);
                } else {
                    showImportStatus('Please select a PDF or .bib file', 'error');
                }
            }
        });
    }
    
    // Quick import on Enter or blur
    quickImport.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            processQuickImport();
        }
    });
    
    // Auto-detect BibTeX on paste
    quickImport.addEventListener('paste', (e) => {
        setTimeout(() => {
            const value = quickImport.value.trim();
            if (isBibTeXFormat(value)) {
                processQuickImport();
            }
        }, 10); // Small delay to let paste complete
    });
    
    quickImport.addEventListener('blur', () => {
        if (quickImport.value.trim()) {
            processQuickImport();
        }
    });
    
    // BibTeX buttons
    const parseBibtexBtn = document.getElementById('parseBibtexBtn');
    const cancelBibtexBtn = document.getElementById('cancelBibtexBtn');
    
    if (parseBibtexBtn) {
        parseBibtexBtn.addEventListener('click', processBibTeXImport);
    }
    
    if (cancelBibtexBtn) {
        cancelBibtexBtn.addEventListener('click', hideBibTeXPasteArea);
    }
}

function toggleManualForm() {
    const manualForm = document.getElementById('manualForm');
    const btn = document.getElementById('toggleManualBtn');
    
    if (!manualForm || !btn) return;
    
    if (manualForm.classList.contains('collapsed')) {
        manualForm.classList.remove('collapsed');
        btn.textContent = '▼ Collapse';
    } else {
        manualForm.classList.add('collapsed');
        btn.textContent = '✏️ Manual Entry / Edit';
    }
}

function processQuickImport() {
    const input = document.getElementById('quickImport');
    if (!input) return;
    
    const value = input.value.trim();
    if (!value) return;
    
    // Detect if BibTeX entry
    if (isBibTeXFormat(value)) {
        showBibTeXPasteArea(value);
        return;
    }
    
    // PRIORITY 1: Check for DOI FIRST (always starts with "10.")
    // This prevents false arXiv detection for DOIs like "10.1016/j.ress.2024.110120"
    if (value.includes('10.') || value.includes('doi.org')) {
        console.log('Attempting to extract DOI from:', value);
        
        // More robust DOI extraction - allow letters, numbers, dots, slashes, hyphens, parentheses
        // Remove any trailing punctuation that's not part of the DOI
        const doiMatch = value.match(/10\.\d{4,}(?:\.\d+)?\/[A-Za-z0-9\.\-_\(\)\/]+/);
        
        console.log('Extracted DOI:', doiMatch ? doiMatch[0] : 'none');
        
        if (doiMatch) {
            // Clean up trailing punctuation if user pasted URL with period at end
            let doi = doiMatch[0].replace(/[.,;:!?]+$/, '');
            console.log('Cleaned DOI:', doi);
            importFromDoi(doi);
            return;
        } else {
            showImportStatus('Format DOI invalide', 'error');
            return;
        }
    }
    
    // PRIORITY 2: Check for arXiv (only if NOT a DOI)
    if (value.toLowerCase().includes('arxiv') || /\d{4}\.\d{4,5}/.test(value) || /[a-z\-]+\/\d{7}/i.test(value)) {
        // arXiv formats:
        // - New: 2301.12345 or 2301.12345v1
        // - Old: 1210.0686 (2007-2014, YYMM.NNNN with 4 digits)
        // - Very old: cs/0701001, hep-th/9901001 (pre-2007)
        // - URL: https://arxiv.org/abs/1210.0686
        
        console.log('Attempting to extract arXiv ID from:', value);
        
        // Extract arXiv ID from various formats
        let arxivMatch = null;
        
        // Try new/old numeric format (YYMM.NNNNN or YYMM.NNNN)
        // Must have exactly 4 digits before dot, and 4 or 5 digits after
        arxivMatch = value.match(/(\d{4}\.\d{4,5})(?:v\d+)?/);
        
        // Try old format (category/number like cs/0701001)
        if (!arxivMatch) {
            arxivMatch = value.match(/([a-z\-]+\/\d{7})(?:v\d+)?/i);
        }
        
        console.log('Extracted arXiv ID:', arxivMatch ? arxivMatch[1] : 'none');
        
        if (arxivMatch) {
            importFromArxiv(arxivMatch[1]);
        } else {
            showImportStatus('Format arXiv invalide - impossible d\'extraire l\'ID', 'error');
        }
    } else {
        showImportStatus('Format non reconnu. Utilisez un DOI (10.xxxx/...), arXiv ID (2301.12345, 1210.0686 ou cs/0701001) ou BibTeX (@article{...})', 'error');
    }
}

// ===== BIBTEX HANDLING =====

function showBibTeXPasteArea(initialValue = '') {
    const quickImport = document.getElementById('quickImport');
    const bibtexArea = document.querySelector('.bibtex-paste-area');
    const bibtexTextarea = document.getElementById('bibtexPasteArea');
    const dropIcon = document.querySelector('.drop-icon');
    const dropText = document.querySelector('.drop-text');
    const dropOr = document.querySelector('.drop-or');
    const browseBtn = document.getElementById('browseFileBtn');
    
    if (!bibtexArea || !bibtexTextarea) return;
    
    // Hide normal import elements
    if (quickImport) quickImport.style.display = 'none';
    if (dropIcon) dropIcon.style.display = 'none';
    if (dropText) dropText.style.display = 'none';
    if (dropOr) dropOr.style.display = 'none';
    if (browseBtn) browseBtn.style.display = 'none';
    
    // Show BibTeX area
    bibtexArea.style.display = 'block';
    bibtexTextarea.value = initialValue;
    bibtexTextarea.focus();
}

function hideBibTeXPasteArea() {
    const quickImport = document.getElementById('quickImport');
    const bibtexArea = document.querySelector('.bibtex-paste-area');
    const dropIcon = document.querySelector('.drop-icon');
    const dropText = document.querySelector('.drop-text');
    const dropOr = document.querySelector('.drop-or');
    const browseBtn = document.getElementById('browseFileBtn');
    
    // Show normal import elements
    if (quickImport) {
        quickImport.style.display = 'block';
        quickImport.value = '';
    }
    if (dropIcon) dropIcon.style.display = 'block';
    if (dropText) dropText.style.display = 'block';
    if (dropOr) dropOr.style.display = 'block';
    if (browseBtn) browseBtn.style.display = 'block';
    
    // Hide BibTeX area
    if (bibtexArea) {
        bibtexArea.style.display = 'none';
        const textarea = document.getElementById('bibtexPasteArea');
        if (textarea) textarea.value = '';
    }
}

async function processBibTeXImport() {
    const bibtexTextarea = document.getElementById('bibtexPasteArea');
    if (!bibtexTextarea) return;
    
    const bibtexText = bibtexTextarea.value.trim();
    if (!bibtexText) {
        showImportStatus('Veuillez coller une entrée BibTeX', 'error');
        return;
    }
    
    showImportStatus('Traitement des entrées BibTeX...', 'loading');
    
    try {
        // Parse BibTeX entries (now async to fetch arXiv abstracts)
        const articles = await parseMultipleBibTeXEntries(bibtexText);
        
        if (articles.length === 0) {
            showImportStatus('Aucune entrée BibTeX valide trouvée', 'error');
            return;
        }
        
        if (articles.length === 1) {
            // Single entry: populate form (don't auto-open manual form)
            const article = articles[0];
            
            // Store the imported article data globally so it can be used when saving
            pendingImportArticle = article;
            
            fillFormWithArticleData(article);
            showImportStatus(`✓ Entrée BibTeX importée: ${article.title}`, 'success');
            hideBibTeXPasteArea();
            // Don't automatically open manual form - let user decide
            
            // Close onboarding if it's open
            if (typeof window.closeOnboarding === 'function') {
                window.closeOnboarding();
            }
        } else {
            // Multiple entries: import all directly with column layout
            const verticalSpacing = 100; // Vertical spacing between nodes
            const horizontalSpacing = 300; // Horizontal spacing between columns
            const maxPerColumn = 10; // Maximum articles per column
            
            const numColumns = Math.ceil(articles.length / maxPerColumn);
            
            articles.forEach((article, index) => {
                article.id = appData.nextArticleId++;
                
                // Calculate column and row position
                const columnIndex = Math.floor(index / maxPerColumn);
                const rowIndex = index % maxPerColumn;
                const articlesInColumn = Math.min(maxPerColumn, articles.length - columnIndex * maxPerColumn);
                
                // Position in grid (centered)
                article.x = (columnIndex - (numColumns - 1) / 2) * horizontalSpacing;
                article.y = (rowIndex - (articlesInColumn - 1) / 2) * verticalSpacing;
                
                appData.articles.push(article);
            });
            
            saveToLocalStorage();
            updateGraph();
            renderListView();
            
            // Save initial positions to ensure they persist
            setTimeout(() => {
                if (network && window.savedNodePositions) {
                    const positions = network.getPositions();
                    window.savedNodePositions = { ...window.savedNodePositions, ...positions };
                    console.log('Saved positions for newly imported articles');
                    
                    // Check node zone membership to update colors after positions are set
                    if (typeof checkNodeZoneMembership === 'function') {
                        console.log('Checking zone membership for imported nodes...');
                        checkNodeZoneMembership();
                        console.log('Applied zone colors to imported nodes');
                        
                        // Force graph update to reflect new colors
                        const currentView = network.getViewPosition();
                        const currentScale = network.getScale();
                        updateGraph();
                        // Restore view position
                        network.moveTo({
                            position: currentView,
                            scale: currentScale,
                            animation: false
                        });
                        console.log('Graph updated with correct colors');
                    }
                    
                    saveToLocalStorage(true); // Silent save after all updates
                }
            }, 200);
            
            closeModal();
            
            // Close onboarding if it's open
            if (typeof window.closeOnboarding === 'function') {
                window.closeOnboarding();
            }
            
            showNotification(`✓ ${articles.length} articles importés depuis BibTeX`, 'success');
        }
    } catch (error) {
        console.error('BibTeX parse error:', error);
        showImportStatus('Erreur lors du traitement de l\'entrée BibTeX', 'error');
    }
}

function fillFormWithArticleData(article) {
    // Fill all form fields with article data
    const fieldMap = {
        'articleTitle': article.title,
        'articleAuthors': article.authors,
        'articleYear': article.year,
        'articleType': article.entryType || 'article',
        'articleJournal': article.journal || article.booktitle,
        'articleVolume': article.volume,
        'articleNumber': article.number,
        'articlePages': article.pages,
        'articlePublisher': article.publisher || article.institution,
        'articleDoi': article.doi,
        'articleIsbn': article.isbn,
        'articleIssn': article.issn,
        'articleLink': article.link || article.url,
        'articlePdf': article.pdf,
        'articleAbstract': article.abstract,
        'articleNote': article.note,
        'articleCategories': article.categories ? article.categories.join(', ') : article.keywords
    };
    
    for (const [fieldId, value] of Object.entries(fieldMap)) {
        const field = document.getElementById(fieldId);
        if (field && value) {
            field.value = value;
        }
    }
}

// ===== BIB FILE HANDLING =====

async function handleBibFile(file) {
    showImportStatus('Reading .bib file...', 'loading');
    
    try {
        const text = await file.text();
        
        if (!text.trim()) {
            showImportStatus('Empty .bib file', 'error');
            return;
        }
        
        // Show in the BibTeX paste area for review/editing
        showBibTeXPasteArea(text);
        showImportStatus('✓ .bib file loaded. Review and click Import.', 'success');
        
        // Close onboarding if it's open
        if (typeof window.closeOnboarding === 'function') {
            window.closeOnboarding();
        }
        
    } catch (error) {
        console.error('Error reading .bib file:', error);
        showImportStatus('Error reading .bib file', 'error');
    }
}

// ===== PDF HANDLING =====

async function handlePdfFile(file) {
    showImportStatus('Extraction des métadonnées du PDF...', 'loading');
    
    try {
        // Use PDF.js library if available, otherwise extract basic info
        if (typeof pdfjsLib !== 'undefined') {
            await extractPdfMetadata(file);
        } else {
            // Fallback: just use filename
            const filename = file.name.replace('.pdf', '');
            const titleField = document.getElementById('articleTitle');
            const pdfField = document.getElementById('articlePdf');
            
            if (titleField) titleField.value = filename;
            
            // Create local URL
            const pdfUrl = URL.createObjectURL(file);
            if (pdfField) pdfField.value = pdfUrl;
            
            // Try to extract DOI from filename
            const doiMatch = filename.match(/10\.\d{4,}[^\s]*/);
            if (doiMatch) {
                const doiField = document.getElementById('articleDoi');
                if (doiField) doiField.value = doiMatch[0];
                showImportStatus('PDF chargé. Tentative d\'import via DOI trouvé...', 'loading');
                await importFromDoi(doiMatch[0]);
            } else {
                showImportStatus('✓ Fichier PDF chargé (nom extrait). Utilisez DOI/arXiv pour plus d\'infos.', 'success');
                toggleManualForm(); // Show form for manual entry
            }
        }
    } catch (error) {
        console.error('PDF processing error:', error);
        showImportStatus('Erreur lors du traitement du PDF', 'error');
    }
}

async function extractPdfMetadata(file) {
    // This would use PDF.js to extract metadata from PDF
    const arrayBuffer = await file.arrayBuffer();
    
    // Try to find DOI in PDF content (basic search)
    const text = await extractTextFromPdf(arrayBuffer);
    const doiMatch = text.match(/10\.\d{4,}\/[^\s\n]+/);
    
    if (doiMatch) {
        const doi = doiMatch[0].replace(/[.,;]$/, ''); // Remove trailing punctuation
        showImportStatus('DOI trouvé dans le PDF, import en cours...', 'loading');
        await importFromDoi(doi);
    } else {
        const filename = file.name.replace('.pdf', '');
        const titleField = document.getElementById('articleTitle');
        const pdfField = document.getElementById('articlePdf');
        
        if (titleField) titleField.value = filename;
        const pdfUrl = URL.createObjectURL(file);
        if (pdfField) pdfField.value = pdfUrl;
        
        showImportStatus('PDF chargé, mais aucun DOI trouvé. Veuillez compléter manuellement.', 'success');
        toggleManualForm();
    }
}

async function extractTextFromPdf(arrayBuffer) {
    // Simple text extraction - would need PDF.js for full implementation
    const uint8Array = new Uint8Array(arrayBuffer);
    const text = new TextDecoder().decode(uint8Array);
    return text;
}

// ===== DOI IMPORT =====

async function importFromDoi(doi) {
    if (!doi) {
        const input = document.getElementById('quickImport');
        if (input) doi = input.value.trim();
    }
    
    if (!doi) {
        showImportStatus('Veuillez entrer un DOI', 'error');
        return;
    }
    
    // Check if DOI already exists
    const existingArticle = appData.articles.find(a => a.doi && a.doi.toLowerCase() === doi.toLowerCase());
    if (existingArticle) {
        const confirmImport = confirm(
            `⚠️ Attention : Un article avec ce DOI existe déjà :\n\n` +
            `"${existingArticle.title}"\n\n` +
            `Voulez-vous quand même importer ce DOI ?`
        );
        if (!confirmImport) {
            showImportStatus('Import annulé', 'info');
            const input = document.getElementById('quickImport');
            if (input) input.value = '';
            resetImportZone();
            return;
        }
    }
    
    console.log('📚 Importing DOI:', doi);
    showImportStatus('Récupération des métadonnées...', 'loading');
    
    try {
        // Try to fetch BibTeX first for better metadata
        let bibtexData = null;
        try {
            console.log('Fetching BibTeX from CrossRef...');
            const bibtexResponse = await fetch(`https://api.crossref.org/works/${doi}/transform/application/x-bibtex`);
            console.log('BibTeX response status:', bibtexResponse.status);
            if (bibtexResponse.ok) {
                const bibtexText = await bibtexResponse.text();
                console.log('BibTeX text received:', bibtexText.substring(0, 200) + '...');
                bibtexData = await parseBibTeXEntry(bibtexText);
                console.log('BibTeX parsed:', bibtexData);
            }
        } catch (e) {
            console.log('BibTeX fetch failed, falling back to JSON:', e);
        }
        
        // Use CrossRef API to get metadata
        console.log('Fetching JSON metadata from CrossRef...');
        const response = await fetch(`https://api.crossref.org/works/${doi}`);
        console.log('JSON response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('CrossRef API error:', errorText);
            throw new Error(`DOI non trouvé (status ${response.status})`);
        }
        
        const data = await response.json();
        const work = data.message;
        console.log('Work data received:', work);
        
        // Fill form fields - prioritize BibTeX data if available
        const titleField = document.getElementById('articleTitle');
        const authorsField = document.getElementById('articleAuthors');
        const textField = document.getElementById('articleText');
        const doiField = document.getElementById('articleDoi');
        const linkField = document.getElementById('articleLink');
        const yearField = document.getElementById('articleYear');
        const journalField = document.getElementById('articleJournal');
        const volumeField = document.getElementById('articleVolume');
        const pagesField = document.getElementById('articlePages');
        const publisherField = document.getElementById('articlePublisher');
        const entryTypeField = document.getElementById('articleEntryType');
        
        if (titleField) titleField.value = (bibtexData?.title || work.title?.[0] || '').replace(/[{}]/g, '');
        
        // Authors
        const authors = work.author?.map(a => {
            return `${a.given || ''} ${a.family || ''}`.trim();
        }).join(', ') || bibtexData?.author || '';
        if (authorsField) authorsField.value = authors;
        
        // Abstract
        if (textField) textField.value = work.abstract || '';
        
        // DOI
        if (doiField) doiField.value = doi;
        
        // Year
        const year = work.published?.['date-parts']?.[0]?.[0] || 
                     work.created?.['date-parts']?.[0]?.[0] || 
                     bibtexData?.year || '';
        if (yearField) yearField.value = year;
        
        // Journal/Booktitle
        const journal = work['container-title']?.[0] || bibtexData?.journal || bibtexData?.booktitle || '';
        if (journalField) journalField.value = journal;
        
        // Volume
        if (volumeField && work.volume) volumeField.value = work.volume;
        
        // Pages
        if (pagesField && work.page) pagesField.value = work.page;
        
        // Publisher
        if (publisherField && work.publisher) publisherField.value = work.publisher;
        
        // Entry type
        if (entryTypeField && work.type) {
            const typeMapping = {
                'journal-article': 'article',
                'proceedings-article': 'inproceedings',
                'book-chapter': 'inbook',
                'book': 'book',
                'dissertation': 'phdthesis'
            };
            entryTypeField.value = typeMapping[work.type] || 'article';
        }
        
        // Link
        if (work.URL && linkField) {
            linkField.value = work.URL;
        }
        
        showImportStatus('✓ Métadonnées importées avec succès !', 'success');
        
        // Show success summary
        showImportSuccess({
            title: (bibtexData?.title || work.title?.[0] || '').replace(/[{}]/g, ''),
            authors: authors,
            doi: doi
        });
        
        // Clear quick import
        const input = document.getElementById('quickImport');
        if (input) input.value = '';
        
    } catch (error) {
        console.error('Error importing DOI:', error);
        showImportStatus(`Erreur: ${error.message}`, 'error');
        toggleManualForm(); // Show manual form on error
    }
}

// ===== ARXIV IMPORT =====

async function importFromArxiv(arxivId) {
    console.log('importFromArxiv called with:', arxivId);
    
    if (!arxivId) {
        const input = document.getElementById('quickImport');
        if (input) arxivId = input.value.trim();
    }
    
    if (!arxivId) {
        showImportStatus('Veuillez entrer un ID arXiv', 'error');
        return;
    }
    
    console.log('Processing arXiv ID:', arxivId);
    
    // Check if arXiv ID already exists (in link or pdf fields)
    const existingArticle = appData.articles.find(a => {
        const linkHasArxiv = a.link && a.link.includes(arxivId);
        const pdfHasArxiv = a.pdf && a.pdf.includes(arxivId);
        return linkHasArxiv || pdfHasArxiv;
    });
    
    if (existingArticle) {
        const confirmImport = confirm(
            `⚠️ Attention : Un article avec cet ID arXiv existe déjà :\n\n` +
            `"${existingArticle.title}"\n\n` +
            `Voulez-vous quand même importer cet article ?`
        );
        if (!confirmImport) {
            showImportStatus('Import annulé', 'info');
            const input = document.getElementById('quickImport');
            if (input) input.value = '';
            resetImportZone();
            return;
        }
    }
    
    showImportStatus('Récupération des métadonnées arXiv...', 'loading');
    
    try {
        // Use arXiv API
        console.log('Fetching arXiv ID:', arxivId);
        const response = await fetch(`https://export.arxiv.org/api/query?id_list=${arxivId}`);
        
        if (!response.ok) {
            throw new Error('Impossible de contacter arXiv');
        }
        
        const text = await response.text();
        console.log('arXiv API response received, length:', text.length);
        
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, 'text/xml');
        
        // Check for parsing errors
        const parserError = xml.querySelector('parsererror');
        if (parserError) {
            console.error('XML parsing error:', parserError.textContent);
            throw new Error('Erreur de parsing XML de la réponse arXiv');
        }
        
        const entry = xml.querySelector('entry');
        if (!entry) {
            console.error('No entry found in XML response');
            console.log('Full XML content:', text);
            
            // Check if there's an error message in the feed
            const totalResults = xml.querySelector('totalResults')?.textContent;
            if (totalResults === '0') {
                throw new Error(`Article arXiv non trouvé pour l'ID: ${arxivId}`);
            }
            
            throw new Error('Article arXiv non trouvé - réponse invalide');
        }
        
        console.log('Entry found, extracting metadata...');
        
        // Extract metadata with better error handling
        const title = entry.querySelector('title')?.textContent.trim().replace(/\s+/g, ' ') || '';
        const summary = entry.querySelector('summary')?.textContent.trim().replace(/\s+/g, ' ') || '';
        const authors = Array.from(entry.querySelectorAll('author name'))
            .map(a => a.textContent.trim())
            .join(', ');
        const pdfLink = entry.querySelector('link[title="pdf"]')?.getAttribute('href') || '';
        const htmlLink = entry.querySelector('id')?.textContent.trim() || '';
        
        // Extract published date (must be before using 'year' in log)
        const publishedDate = entry.querySelector('published')?.textContent.trim() || '';
        const year = publishedDate ? new Date(publishedDate).getFullYear() : '';
        
        console.log('Extracted:', { title: title.substring(0, 50), authors, year });
        console.log('Published date:', publishedDate, '→ Year:', year);
        
        // Validate that we got meaningful data
        if (!title || title.length < 5) {
            throw new Error('Titre non trouvé dans la réponse arXiv');
        }
        
        // Try to fetch BibTeX from arXiv (arxiv2bib service or similar)
        let bibtexData = null;
        try {
            console.log('Fetching BibTeX from arXiv...');
            const bibtexUrl = `https://arxiv.org/bibtex/${arxivId}`;
            const bibtexResponse = await fetch(bibtexUrl);
            if (bibtexResponse.ok) {
                const bibtexText = await bibtexResponse.text();
                console.log('BibTeX response:', bibtexText.substring(0, 200));
                bibtexData = await parseBibTeXEntry(bibtexText);
                console.log('BibTeX parsed:', bibtexData);
            } else {
                console.log('BibTeX fetch failed with status:', bibtexResponse.status);
            }
        } catch (e) {
            console.log('arXiv BibTeX fetch failed:', e);
        }
        
        // Fill form fields
        const titleField = document.getElementById('articleTitle');
        const authorsField = document.getElementById('articleAuthors');
        const textField = document.getElementById('articleText');
        const linkField = document.getElementById('articleLink');
        const pdfField = document.getElementById('articlePdf');
        const yearField = document.getElementById('articleYear');
        const entryTypeField = document.getElementById('articleEntryType');
        const journalField = document.getElementById('articleJournal');
        
        if (titleField) titleField.value = (bibtexData?.title || title).replace(/[{}]/g, '');
        if (authorsField) authorsField.value = bibtexData?.author || authors;
        if (textField) textField.value = summary;
        if (linkField) linkField.value = htmlLink;
        if (pdfLink && pdfField) pdfField.value = pdfLink;
        if (yearField) yearField.value = bibtexData?.year || year;
        
        // Set entry type (arXiv papers are typically preprints/misc)
        if (entryTypeField) {
            entryTypeField.value = bibtexData?.entryType || 'misc';
        }
        
        // Set journal if available from BibTeX
        if (journalField && bibtexData?.journal) {
            journalField.value = bibtexData.journal;
        } else if (journalField) {
            journalField.value = 'arXiv preprint';
        }
        
        showImportStatus('✓ Métadonnées arXiv importées avec succès !', 'success');
        
        // Show success summary
        showImportSuccess({
            title: (bibtexData?.title || title).replace(/[{}]/g, ''),
            authors: bibtexData?.author || authors,
            doi: ''
        });
        
        // Clear quick import
        const input = document.getElementById('quickImport');
        if (input) input.value = '';
        
    } catch (error) {
        console.error('Error importing arXiv:', error);
        showImportStatus(`Erreur: ${error.message}`, 'error');
        toggleManualForm(); // Show manual form on error
    }
}

// ===== IMPORT UI HELPERS =====

function showImportStatus(message, type) {
    const status = document.getElementById('importStatus');
    if (!status) return;
    
    status.textContent = message;
    status.className = `import-status show ${type}`;
    
    if (type === 'success' || type === 'error') {
        setTimeout(() => {
            status.classList.remove('show');
        }, 5000);
    }
}

function resetImportZone() {
    // Clear quick import input
    const quickInput = document.getElementById('quickImport');
    if (quickInput) quickInput.value = '';
    
    // Hide import status
    const status = document.getElementById('importStatus');
    if (status) status.classList.remove('show');
    
    // Show drop zone, hide success summary
    const dropZone = document.getElementById('dropZone');
    const importZone = document.querySelector('.import-zone');
    
    if (importZone) {
        // Remove any existing summary
        const existingSummary = importZone.querySelector('.import-summary');
        if (existingSummary) {
            existingSummary.remove();
        }
    }
    
    // Show drop zone
    if (dropZone) dropZone.style.display = 'block';
}

function showImportSuccess(data) {
    // Hide drop zone
    const dropZone = document.getElementById('dropZone');
    if (dropZone) dropZone.style.display = 'none';
    
    // Close onboarding if it's open (user has successfully imported metadata)
    if (typeof window.closeOnboarding === 'function') {
        window.closeOnboarding();
    }
    
    // Create success summary
    const importZone = document.querySelector('.import-zone');
    if (!importZone) return;
    
    // Remove existing summary if any
    const existingSummary = importZone.querySelector('.import-summary');
    if (existingSummary) {
        existingSummary.remove();
    }
    
    const summary = document.createElement('div');
    summary.className = 'import-summary';
    summary.innerHTML = `
        <div class="import-success-icon">✓</div>
        <h3>Article importé</h3>
        <div class="import-details">
            <p><strong>Titre:</strong> ${data.title || 'Non disponible'}</p>
            <p><strong>Auteurs:</strong> ${data.authors || 'Non disponible'}</p>
            ${data.doi ? `<p><strong>DOI:</strong> ${data.doi}</p>` : ''}
        </div>
        <button type="button" id="reimportBtn" class="btn-secondary">↻ Réimporter</button>
    `;
    
    importZone.insertBefore(summary, importZone.firstChild);
    
    // Add reimport button listener
    const reimportBtn = document.getElementById('reimportBtn');
    if (reimportBtn) {
        reimportBtn.addEventListener('click', () => {
            resetImportZone();
            // Clear form fields
            const fields = ['articleTitle', 'articleAuthors', 'articleText', 'articleDoi', 'articleLink', 'articlePdf'];
            fields.forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (field) field.value = '';
            });
        });
    }
}

// ===== BIBTEX FILE IMPORT =====

async function importBibtexFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
        const text = await file.text();
        const articles = await parseMultipleBibTeXEntries(text);
        
        if (articles.length === 0) {
            showNotification('❌ Aucune entrée BibTeX valide trouvée dans le fichier', 'error');
            return;
        }
        
        // Import all articles with column layout
        const verticalSpacing = 100; // Vertical spacing between nodes
        const horizontalSpacing = 300; // Horizontal spacing between columns
        const maxPerColumn = 10; // Maximum articles per column
        
        const numColumns = Math.ceil(articles.length / maxPerColumn);
        
        articles.forEach((article, index) => {
            article.id = appData.nextArticleId++;
            
            // Calculate column and row position
            const columnIndex = Math.floor(index / maxPerColumn);
            const rowIndex = index % maxPerColumn;
            const articlesInColumn = Math.min(maxPerColumn, articles.length - columnIndex * maxPerColumn);
            
            // Position in grid (centered)
            article.x = (columnIndex - (numColumns - 1) / 2) * horizontalSpacing;
            article.y = (rowIndex - (articlesInColumn - 1) / 2) * verticalSpacing;
            
            appData.articles.push(article);
        });
        
        saveToLocalStorage();
        updateGraph();
        renderListView();
        
        // Save initial positions to ensure they persist
        setTimeout(() => {
            if (network && window.savedNodePositions) {
                const positions = network.getPositions();
                window.savedNodePositions = { ...window.savedNodePositions, ...positions };
                console.log('Saved positions for newly imported articles from .bib file');
                
                // Check node zone membership to update colors after positions are set
                if (typeof checkNodeZoneMembership === 'function') {
                    console.log('Checking zone membership for imported nodes from .bib file...');
                    checkNodeZoneMembership();
                    console.log('Applied zone colors to imported nodes from .bib file');
                    
                    // Force graph update to reflect new colors
                    const currentView = network.getViewPosition();
                    const currentScale = network.getScale();
                    updateGraph();
                    // Restore view position
                    network.moveTo({
                        position: currentView,
                        scale: currentScale,
                        animation: false
                    });
                    console.log('Graph updated with correct colors');
                }
                
                saveToLocalStorage(true); // Silent save after all updates
            }
        }, 200);
        
        // Center view on imported nodes
        if (typeof network !== 'undefined' && network) {
            network.fit({
                animation: {
                    duration: 500,
                    easingFunction: 'easeInOutQuad'
                }
            });
        }
        
        showNotification(`✓ ${articles.length} article(s) importé(s) depuis BibTeX`, 'success');
        
    } catch (error) {
        console.error('Error importing BibTeX file:', error);
        showNotification('❌ Erreur lors de l\'import du fichier BibTeX', 'error');
    } finally {
        // Reset file input
        event.target.value = '';
    }
}
