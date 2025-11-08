// ===== APPLICATION STATE =====
// Central state management for the Papermap application

let appData = {
    articles: [],
    connections: [],
    nextArticleId: 1,
    nextConnectionId: 1
};

// ===== USER PERMISSIONS =====
// Tracks current user's role for permission checks
let currentUserRole = null; // 'owner', 'editor', 'viewer', or null
let isReadOnly = false; // Computed from currentUserRole

let isEditingEdgeLabel = false; // Flag to prevent view adjustments during edge label editing

let currentEditingArticleId = null;
let pendingImportArticle = null; // Store imported article data before saving
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
    wasDragging: false,  // Track if we were dragging to restore state
    emptyAreaSelection: null,  // Store empty area selection for zone creation
    emptyAreaClickHandler: null,  // Handler for clicking outside empty area menu
    selectedZonesForDrag: [],  // Zones to move when dragging selection
    zonesDragStart: {},  // Original zone positions when dragging starts
    nodeDragStart: null,  // Store initial node position for zone dragging
    boxDragging: false,  // Track if we're dragging the selection box itself
    boxDragStart: { x: 0, y: 0 },  // Start position for box drag
    originalBoxPosition: { left: 0, top: 0 }  // Original box position
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
    originalZone: null,
    originalNodePositions: {},
    originalNestedZones: {}
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
