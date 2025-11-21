// ===== BIBTEX PARSER =====
// Parse BibTeX entries and extract all fields

/**
 * Generate a BibTeX citation key from article metadata
 * Format: AuthorYEAR or Author1Author2YEAR for multiple authors
 * @param {object} article - The article object
 * @returns {string} Generated citation key
 */
function generateBibtexId(article) {
    if (!article) return 'unknown';
    
    let key = '';
    
    // Get first author's last name
    if (article.authors) {
        // Split by comma or "and" to handle both BibTeX formats
        const authors = article.authors.split(/,| and /i).map(a => a.trim());
        if (authors.length === 1) {
            // Single author: get last name
            const parts = authors[0].split(' ').filter(p => p);
            const lastName = parts[parts.length - 1];
            key = lastName.toLowerCase().replace(/[^a-z0-9]/g, '');
        } else if (authors.length === 2) {
            // Two authors: FirstLastSecondLast
            const lastNames = authors.map(author => {
                const parts = author.split(' ').filter(p => p);
                return parts[parts.length - 1];
            });
            key = lastNames.map(n => n.toLowerCase().replace(/[^a-z0-9]/g, '')).join('');
        } else {
            // Three or more: FirstEtAl
            const parts = authors[0].split(' ').filter(p => p);
            const lastName = parts[parts.length - 1];
            key = lastName.toLowerCase().replace(/[^a-z0-9]/g, '') + 'etal';
        }
    }
    
    // Add year
    if (article.year) {
        key += article.year;
    }
    
    // If key is empty, use fallback
    if (!key) {
        key = 'article' + (article.id || Date.now());
    }
    
    // Check for duplicates and add suffix if needed
    let finalKey = key;
    let suffix = 0;
    const existingKeys = appData.articles
        .filter(a => a.id !== article.id && a.bibtexId)
        .map(a => a.bibtexId);
    
    while (existingKeys.includes(finalKey)) {
        suffix++;
        finalKey = key + String.fromCharCode(97 + suffix - 1); // a, b, c, etc.
    }
    
    return finalKey;
}

/**
 * Parse a BibTeX entry string into a structured object
 * Supports all entry types: @article, @book, @inproceedings, @misc, @phdthesis, etc.
 * @param {string} bibtexString - The BibTeX entry as a string
 * @returns {object|null} Parsed article object or null if invalid
 */
async function parseBibTeXEntry(bibtexString) {
    if (!bibtexString || typeof bibtexString !== 'string') {
        return null;
    }
    
    bibtexString = bibtexString.trim();
    
    // Match the entry type and citation key
    const entryMatch = bibtexString.match(/@(\w+)\s*\{\s*([^,]+)\s*,/);
    if (!entryMatch) {
        return null;
    }
    
    const entryType = entryMatch[1].toLowerCase(); // article, book, inproceedings, etc.
    const citationKey = entryMatch[2].trim();
    
    // Extract all fields
    const fields = {};
    
    // Find all field = {value} or field = "value" pairs
    // We need to handle nested braces properly
    const fieldPattern = /(\w+)\s*=\s*(["{])/g;
    let match;
    
    while ((match = fieldPattern.exec(bibtexString)) !== null) {
        const fieldName = match[1].toLowerCase();
        const delimiter = match[2]; // Either { or "
        const startPos = match.index + match[0].length;
        
        let fieldValue = '';
        
        if (delimiter === '{') {
            // Count braces to find the end
            let braceCount = 1;
            let pos = startPos;
            
            while (pos < bibtexString.length && braceCount > 0) {
                if (bibtexString[pos] === '{') {
                    braceCount++;
                } else if (bibtexString[pos] === '}') {
                    braceCount--;
                }
                if (braceCount > 0) {
                    fieldValue += bibtexString[pos];
                }
                pos++;
            }
        } else {
            // Find closing quote
            let pos = startPos;
            while (pos < bibtexString.length && bibtexString[pos] !== '"') {
                fieldValue += bibtexString[pos];
                pos++;
            }
        }
        
        fields[fieldName] = fieldValue.trim();
    }
    
    // Check if we need to fetch arXiv abstract
    let abstractText = fields.abstract || fields.note || '';
    const urlField = fields.url || '';
    
    // If no abstract but has arXiv URL, try to fetch from arXiv
    if (!fields.abstract && urlField.includes('arxiv.org')) {
        try {
            const arxivId = extractArxivId(urlField);
            if (arxivId) {
                const fetchedAbstract = await fetchArxivAbstract(arxivId);
                if (fetchedAbstract) {
                    abstractText = fetchedAbstract;
                }
            }
        } catch (error) {
            console.warn('Failed to fetch arXiv abstract:', error);
        }
    }
    
    // Build the article object with BibTeX fields
    const article = {
        id: Date.now() + Math.random(), // Temporary ID, will be replaced
        bibtexId: citationKey,
        citationKey: citationKey, // Keep for backward compatibility
        entryType: entryType,
        
        // Standard fields
        title: fields.title || '',
        authors: fields.author || '',
        year: fields.year || '',
        month: fields.month || '',
        date: buildDateFromBibTeX(fields.year, fields.month),
        
        // Publication details
        journal: fields.journal || '',
        booktitle: fields.booktitle || '',
        publisher: fields.publisher || '',
        institution: fields.institution || '',
        organization: fields.organization || '',
        school: fields.school || '',
        
        // Volume/Issue/Pages
        volume: fields.volume || '',
        number: fields.number || '',
        pages: fields.pages || '',
        
        // Identifiers
        doi: fields.doi || '',
        isbn: fields.isbn || '',
        issn: fields.issn || '',
        url: fields.url || '',
        
        // Notes and abstract
        text: abstractText,
        note: fields.note || '',
        abstract: abstractText,
        
        // Additional fields
        edition: fields.edition || '',
        series: fields.series || '',
        chapter: fields.chapter || '',
        address: fields.address || '',
        howpublished: fields.howpublished || '',
        
        // Keywords/categories - DO NOT import keywords as categories
        keywords: fields.keywords || '',
        categories: [], // Empty by default, user adds tags manually
        
        // PDF link
        pdf: fields.pdf || fields.file || '',
        link: fields.url || '',
        
        // Store original BibTeX
        originalBibTeX: bibtexString
    };
    
    return article;
}

/**
 * Build a date string from BibTeX year and month
 * @param {string} year - Year (e.g., "2024")
 * @param {string} month - Month (can be numeric "01" or text "jan", "January")
 * @returns {string} ISO date string (YYYY-MM-DD) or empty
 */
function buildDateFromBibTeX(year, month) {
    if (!year) return '';
    
    let monthNum = '01';
    if (month) {
        // Convert month name to number
        const monthMap = {
            'jan': '01', 'january': '01',
            'feb': '02', 'february': '02',
            'mar': '03', 'march': '03',
            'apr': '04', 'april': '04',
            'may': '05',
            'jun': '06', 'june': '06',
            'jul': '07', 'july': '07',
            'aug': '08', 'august': '08',
            'sep': '09', 'september': '09',
            'oct': '10', 'october': '10',
            'nov': '11', 'november': '11',
            'dec': '12', 'december': '12'
        };
        
        const monthLower = month.toLowerCase();
        monthNum = monthMap[monthLower] || month.padStart(2, '0');
    }
    
    return `${year}-${monthNum}-01`;
}

/**
 * Parse keywords/tags from BibTeX keywords field
 * @param {string} keywords - Comma or semicolon separated keywords
 * @returns {Array} Array of category strings
 */
function parseCategories(keywords) {
    if (!keywords) return [];
    
    return keywords
        .split(/[,;]/)
        .map(k => k.trim())
        .filter(k => k.length > 0);
}

/**
 * Detect if a string contains a BibTeX entry
 * @param {string} text - Text to check
 * @returns {boolean} True if text looks like BibTeX
 */
function isBibTeXFormat(text) {
    if (!text || typeof text !== 'string') return false;
    
    text = text.trim();
    return /^@\w+\s*\{/.test(text);
}

/**
 * Extract multiple BibTeX entries from a text block
 * @param {string} text - Text containing one or more BibTeX entries
 * @returns {Promise<Array>} Array of parsed article objects
 */
async function parseMultipleBibTeXEntries(text) {
    if (!text || typeof text !== 'string') return [];
    
    const entries = [];
    const matches = [];
    
    // Find all @ENTRYTYPE{ positions
    const entryStarts = [];
    const entryTypeRegex = /@(\w+)\s*\{/g;
    let match;
    
    while ((match = entryTypeRegex.exec(text)) !== null) {
        entryStarts.push({
            index: match.index,
            type: match[1],
            openBraceIndex: match.index + match[0].length - 1
        });
    }
    
    // Extract each complete entry by matching braces
    for (let i = 0; i < entryStarts.length; i++) {
        const start = entryStarts[i];
        let braceCount = 1;
        let pos = start.openBraceIndex + 1;
        
        // Find the matching closing brace
        while (pos < text.length && braceCount > 0) {
            if (text[pos] === '{') {
                braceCount++;
            } else if (text[pos] === '}') {
                braceCount--;
            }
            pos++;
        }
        
        if (braceCount === 0) {
            // Extract the complete entry
            const entryText = text.substring(start.index, pos);
            matches.push(entryText);
        }
    }
    
    // Parse entries sequentially to allow arXiv fetching
    for (const entryText of matches) {
        const entry = await parseBibTeXEntry(entryText);
        if (entry) {
            entries.push(entry);
        }
    }
    
    return entries;
}

/**
 * Extract arXiv ID from URL
 * @param {string} url - URL containing arXiv ID
 * @returns {string|null} arXiv ID or null
 */
function extractArxivId(url) {
    const match = url.match(/arxiv\.org\/abs\/(\d+\.\d+)/);
    return match ? match[1] : null;
}

/**
 * Fetch abstract from arXiv API
 * @param {string} arxivId - arXiv ID (e.g., "2010.08895")
 * @returns {Promise<string|null>} Abstract text or null
 */
async function fetchArxivAbstract(arxivId) {
    try {
        // CALL SUPABASE FUNCTION
        const { data: xmlText, error } = await window.supabaseClient.functions.invoke('fetch-arxiv', {
            body: { arxivId: arxivId }
        });

        if (error) throw error;
        
        // Parse XML to extract abstract
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        const summaryElement = xmlDoc.querySelector('entry summary');
        
        if (summaryElement) {
            return summaryElement.textContent.trim();
        }
        
        return null;
    } catch (error) {
        console.error('Error fetching arXiv abstract:', error);
        return null;
    }
}

/**
 * Convert an article object back to BibTeX format
 * @param {object} article - Article object
 * @returns {string} BibTeX formatted string
 */
function articleToBibTeX(article) {
    if (!article) return '';
    
    // Use original BibTeX if available
    if (article.originalBibTeX) {
        return article.originalBibTeX;
    }
    
    const entryType = article.entryType || 'article';
    const citationKey = article.bibtexId || article.citationKey || `article${article.id}`;
    
    let bibtex = `@${entryType}{${citationKey},\n`;
    
    // Add fields that have values
    const fieldMap = {
        title: article.title,
        author: article.authors,
        year: article.year,
        month: article.month,
        journal: article.journal,
        booktitle: article.booktitle,
        publisher: article.publisher,
        volume: article.volume,
        number: article.number,
        pages: article.pages,
        doi: article.doi,
        isbn: article.isbn,
        url: article.link || article.url,
        abstract: article.abstract || article.text,
        keywords: article.keywords || (article.categories ? article.categories.join(', ') : ''),
        note: article.note
    };
    
    for (const [field, value] of Object.entries(fieldMap)) {
        if (value) {
            bibtex += `  ${field} = {${value}},\n`;
        }
    }
    
    bibtex += '}\n';
    
    return bibtex;
}

