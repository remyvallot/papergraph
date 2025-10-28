// ===== INTERNATIONALIZATION (i18n) =====
// Simple translation system for French/English

const translations = {
    fr: {
        // App title
        appTitle: 'papergraph',
        welcomeMessage: 'Bienvenue sur Papergraph!',
        
        // Main menu
        menuNew: 'Nouveau',
        menuNewProject: 'Créer nouveau projet',
        menuImport: 'Importer un projet',
        menuExport: 'Exporter',
        menuExportProject: 'Exporter projet',
        menuExportBibtex: 'Exporter BibTeX',
        menuImportBibtex: 'Importer BibTeX',
        menuExportPdf: 'Exporter PDF',
        menuExportImage: 'Exporter Image',
        
        // Toolbar
        toolbarAdd: 'Ajouter',
        toolbarFilter: 'Filtrer',
        toolbarSearch: 'Rechercher',
        toolbarCenter: 'Recentrer',
        toolbarLock: 'Lock View',
        toolbarGrid: 'Grille',
        toolbarSettings: 'Paramètres',
        
        // Search
        searchPlaceholder: 'Rechercher...',
        searchResults: 'résultat(s)',
        
        // Article modal
        modalNewArticle: 'Nouvel Article',
        modalEditArticle: 'Modifier Article',
        modalTitle: 'Titre',
        modalAuthors: 'Auteurs',
        modalAuthorsPlaceholder: 'ex: John Doe, Jane Smith',
        modalCategories: 'Catégories (séparées par des virgules)',
        modalCategoriesPlaceholder: 'ex: idée, méthodologie, résultats',
        modalText: 'Texte / Notes / Résumé',
        modalDoi: 'DOI',
        modalDoiPlaceholder: 'ex: 10.1234/example.2024',
        modalLink: 'Lien (URL)',
        modalLinkPlaceholder: 'https://...',
        modalPdf: 'Fichier PDF (URL ou chemin)',
        modalPdfPlaceholder: 'https://... ou chemin local',
        modalCustomFields: 'Champs personnalisés',
        modalAddField: '➕ Ajouter un champ',
        modalSave: '💾 Enregistrer',
        modalCancel: 'Annuler',
        modalDelete: 'Supprimer',
        
        // Import zone
        importDropPdf: 'Glissez un PDF ici',
        importOr: 'ou',
        importPaste: 'Collez un DOI, arXiv ID ou BibTeX (ex: @article{...})',
        importBrowse: 'Parcourir...',
        importManualToggle: '✏️ Saisie manuelle / modifier',
        importManualHide: '▼ Masquer la saisie manuelle',
        
        // Settings modal
        settingsTitle: '⚙️ Paramètres',
        settingsNodeDisplay: 'Affichage des nœuds',
        settingsNodeFormat: 'Format d\'affichage :',
        settingsNodeFormatTitle: 'Titre complet',
        settingsNodeFormatFirstAuthor: 'Premier auteur + année (ex: Doe 2024)',
        settingsNodeFormatAllAuthors: 'Tous les auteurs + année',
        settingsNodeFormatShort: 'Titre court (30 premiers caractères)',
        settingsTheme: 'Thème',
        settingsDarkMode: 'Mode sombre',
        settingsLanguage: 'Langue / Language',
        settingsSupport: 'Support',
        settingsReportBug: '🐛 Signaler un bug',
        settingsSave: '💾 Enregistrer',
        settingsCancel: 'Annuler',
        
        // Notifications
        notifSettingsSaved: 'Paramètres enregistrés',
        notifArticleAdded: 'Article ajouté',
        notifArticleUpdated: 'Article mis à jour',
        notifArticleDeleted: 'Article supprimé',
        notifProjectExported: 'Projet exporté',
        notifBibtexExported: 'article(s) exporté(s) en BibTeX',
        notifBibtexImported: 'article(s) importé(s) depuis BibTeX',
        notifBibtexParsed: 'Données BibTeX importées dans le formulaire',
        notifError: 'Erreur',
        notifNoArticles: 'Aucun article à exporter',
        notifNoBibtex: 'Aucune entrée BibTeX trouvée',
        
        // Footer
        footerLastUpdate: 'Dernière mise à jour: Oct 2025',
        
        // List view
        listTitle: 'Titre',
        listAuthors: 'Auteurs',
        listYear: 'Année',
        listCategories: 'Catégories',
        listActions: 'Actions',
        
        // Connection modal
        connectionLabel: 'Étiquette de la connexion',
        connectionLabelPlaceholder: 'ex: cite, contredit, étend'
    },
    en: {
        // App title
        appTitle: 'papergraph',
        welcomeMessage: 'Welcome to Papergraph!',
        
        // Main menu
        menuNew: 'New',
        menuNewProject: 'Create new project',
        menuImport: 'Import project',
        menuExport: 'Export',
        menuExportProject: 'Export project',
        menuExportBibtex: 'Export BibTeX',
        menuImportBibtex: 'Import BibTeX',
        menuExportPdf: 'Export PDF',
        menuExportImage: 'Export Image',
        
        // Toolbar
        toolbarAdd: 'Add',
        toolbarFilter: 'Filter',
        toolbarSearch: 'Search',
        toolbarCenter: 'Center',
        toolbarLock: 'Lock View',
        toolbarGrid: 'Grid',
        toolbarSettings: 'Settings',
        
        // Search
        searchPlaceholder: 'Search...',
        searchResults: 'result(s)',
        
        // Article modal
        modalNewArticle: 'New Article',
        modalEditArticle: 'Edit Article',
        modalTitle: 'Title',
        modalAuthors: 'Authors',
        modalAuthorsPlaceholder: 'e.g.: John Doe, Jane Smith',
        modalCategories: 'Categories (comma-separated)',
        modalCategoriesPlaceholder: 'e.g.: idea, methodology, results',
        modalText: 'Text / Notes / Abstract',
        modalDoi: 'DOI',
        modalDoiPlaceholder: 'e.g.: 10.1234/example.2024',
        modalLink: 'Link (URL)',
        modalLinkPlaceholder: 'https://...',
        modalPdf: 'PDF File (URL or path)',
        modalPdfPlaceholder: 'https://... or local path',
        modalCustomFields: 'Custom fields',
        modalAddField: '➕ Add field',
        modalSave: '💾 Save',
        modalCancel: 'Cancel',
        modalDelete: 'Delete',
        
        // Import zone
        importDropPdf: 'Drop a PDF here',
        importOr: 'or',
        importPaste: 'Paste a DOI, arXiv ID, or BibTeX (e.g.: @article{...})',
        importBrowse: 'Browse...',
        importManualToggle: '✏️ Manual entry / edit',
        importManualHide: '▼ Hide manual entry',
        
        // Settings modal
        settingsTitle: '⚙️ Settings',
        settingsNodeDisplay: 'Node Display',
        settingsNodeFormat: 'Display format:',
        settingsNodeFormatTitle: 'Full title',
        settingsNodeFormatFirstAuthor: 'First author + year (e.g.: Doe 2024)',
        settingsNodeFormatAllAuthors: 'All authors + year',
        settingsNodeFormatShort: 'Short title (first 30 characters)',
        settingsTheme: 'Theme',
        settingsDarkMode: 'Dark mode',
        settingsLanguage: 'Langue / Language',
        settingsSupport: 'Support',
        settingsReportBug: '🐛 Report a bug',
        settingsSave: '💾 Save',
        settingsCancel: 'Cancel',
        
        // Notifications
        notifSettingsSaved: 'Settings saved',
        notifArticleAdded: 'Article added',
        notifArticleUpdated: 'Article updated',
        notifArticleDeleted: 'Article deleted',
        notifProjectExported: 'Project exported',
        notifBibtexExported: 'article(s) exported to BibTeX',
        notifBibtexImported: 'article(s) imported from BibTeX',
        notifBibtexParsed: 'BibTeX data imported into form',
        notifError: 'Error',
        notifNoArticles: 'No articles to export',
        notifNoBibtex: 'No BibTeX entries found',
        
        // Footer
        footerLastUpdate: 'Last update: Oct 2025',
        
        // List view
        listTitle: 'Title',
        listAuthors: 'Authors',
        listYear: 'Year',
        listCategories: 'Categories',
        listActions: 'Actions',
        
        // Connection modal
        connectionLabel: 'Connection label',
        connectionLabelPlaceholder: 'e.g.: cites, contradicts, extends'
    }
};

// Get translation
function t(key) {
    const lang = appSettings.language || 'fr';
    return translations[lang][key] || translations['fr'][key] || key;
}

// Update all translatable elements in the DOM
function updateLanguage() {
    const lang = appSettings.language || 'fr';
    
    // Update elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const translation = translations[lang][key];
        
        if (translation) {
            if (el.tagName === 'INPUT' && el.hasAttribute('placeholder')) {
                el.placeholder = translation;
            } else {
                el.textContent = translation;
            }
        }
    });
    
    // Update HTML lang attribute
    document.documentElement.lang = lang;
}
