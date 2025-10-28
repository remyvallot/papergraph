// ===== CATEGORY FILTERS =====
// Filter management and UI

function updateCategoryFilters() {
    const allCategories = new Set();
    appData.articles.forEach(article => {
        article.categories.forEach(cat => allCategories.add(cat));
    });
    
    const sortedCategories = Array.from(allCategories).sort();
    
    // Update the graph dropdown filter only
    const select = document.getElementById('categoryFilter');
    if (!select) return;
    const currentValue = select.value;
    
    select.innerHTML = '<option value="">Toutes les catégories</option>';
    sortedCategories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        select.appendChild(option);
    });
    
    select.value = currentValue;
}

function toggleCategoryDropdown() {
    const dropdown = document.getElementById('categoryDropdown');
    dropdown.classList.toggle('active');
}

function updateActiveFiltersDisplay() {
    const container = document.getElementById('activeFilters');
    container.innerHTML = '';
    
    // Category filter
    if (activeFilters.category) {
        const chip = createFilterChip('Catégorie', activeFilters.category, () => {
            removeFilter('category');
        });
        container.appendChild(chip);
    }
}

function createFilterChip(label, value, onRemove) {
    const chip = document.createElement('div');
    chip.className = 'filter-chip';
    
    const labelSpan = document.createElement('span');
    labelSpan.className = 'filter-chip-label';
    labelSpan.textContent = label + ':';
    
    const valueSpan = document.createElement('span');
    valueSpan.className = 'filter-chip-value';
    valueSpan.textContent = value;
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'filter-chip-remove';
    removeBtn.innerHTML = '×';
    removeBtn.title = 'Supprimer le filtre';
    removeBtn.onclick = onRemove;
    
    chip.appendChild(labelSpan);
    chip.appendChild(valueSpan);
    chip.appendChild(removeBtn);
    
    return chip;
}

function removeFilter(filterType) {
    if (filterType === 'category') {
        activeFilters.category = null;
        currentCategoryFilter = '';
        document.getElementById('categoryFilter').value = '';
    }
    
    updateActiveFiltersDisplay();
    
    // Update the views
    const graphView = document.getElementById('graphView');
    if (graphView.classList.contains('active')) {
        updateGraph();
    } else {
        const searchInput = document.getElementById('searchBoxToolbar');
        renderListView(searchInput ? searchInput.value : '');
    }
}
