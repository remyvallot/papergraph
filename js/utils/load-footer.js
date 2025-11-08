// Load included HTML files
async function loadIncludes() {
    try {
        // Find all elements with data-include attribute
        const includeElements = document.querySelectorAll('[data-include]');
        
        // Load each include
        for (const element of includeElements) {
            const fileName = element.getAttribute('data-include');
            const filePath = `${fileName}.html`;
            
            try {
                const response = await fetch(filePath);
                if (!response.ok) throw new Error(`${fileName} not found`);
                const html = await response.text();
                element.innerHTML = html;
            } catch (error) {
                console.error(`Error loading ${fileName}:`, error);
            }
        }
    } catch (error) {
        console.error('Error loading includes:', error);
    }
}

// Load includes when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadIncludes);
} else {
    loadIncludes();
}
