// ===== APPLICATION STATE =====
// Central state management for the Papermap application

let appData = {
    articles: [],
    connections: [],
    nextArticleId: 1,
    nextConnectionId: 1
};

let currentEditingArticleId = null;
let network = null;
let currentCategoryFilter = '';
let activeFilters = {
    category: null
};

let connectionMode = {
    active: false,
    fromNodeId: null,
    tempEdge: null
};

let selectedNodeId = null;
let selectedEdgeId = null;
let physicsEnabled = false;  // Physics disabled by default
let gridEnabled = false;
let currentPulseInterval = null;

// Multi-selection state
let multiSelection = {
    active: false,
    selectedNodes: [],
    selectionBox: null,
    startX: 0,
    startY: 0,
    menuActive: false,
    wasDragging: false  // Track if we were dragging to restore state
};

// Tag zones state
let tagZones = [];

// View dragging state
let isDraggingView = false;

// Zone resizing state
let zoneResizing = {
    active: false,
    zoneIndex: -1,
    handle: null, // 'nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'
    startX: 0,
    startY: 0,
    originalZone: null
};

// Zone moving state
let zoneMoving = {
    active: false,
    readyToMove: false,
    zoneIndex: -1,
    startX: 0,
    startY: 0,
    originalZone: null
};

// Zone editing state
let zoneEditing = {
    active: false,
    zoneIndex: -1,
    inputElement: null,
    backgroundElement: null
};

// Selected zone for delete button
let selectedZoneIndex = -1;

let currentEditingElement = null;
let originalContent = '';
let inlineEditingSetup = false;
let currentPreviewArticleId = null;  // ID of article currently shown in preview
