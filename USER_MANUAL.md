# papergraph User Manual

Complete guide to all features and functionality.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Interface Overview](#interface-overview)
3. [Managing Articles](#managing-articles)
4. [Creating Connections](#creating-connections)
5. [Using Tags and Categories](#using-tags-and-categories)
6. [Working with Zones](#working-with-zones)
7. [Toolbar Features](#toolbar-features)
8. [Dropdown Menu](#dropdown-menu)
9. [View Modes](#view-modes)
10. [Import & Export](#import--export)
11. [Search and Filters](#search-and-filters)
12. [Tips & Shortcuts](#tips--shortcuts)

---

## Getting Started

### First Launch

When you open papergraph for the first time, you'll see an onboarding screen with three options:

1. **Continue with existing project** - If you have data saved in localStorage
2. **Start a new empty project** - Begin from scratch
3. **Explore the gallery** - See example projects (coming soon)

**Screenshot placeholder: Onboarding screen**

### Creating Your First Article

1. Click the **"+"** button in the toolbar
2. Fill in the article details:
   - **Title** (required)
   - **Authors**
   - **Year**
   - **Source** (journal/conference)
   - **DOI** or **URL**
   - **Notes**
   - **Tags** (comma-separated)
3. Click **Save**

**Screenshot placeholder: Article modal**

---

## Interface Overview

The papergraph interface consists of several key components:

### Main Elements

- **Logo Menu Button** (top-left) - Opens the dropdown menu
- **Toolbar** (top-right) - Quick actions and view toggle
- **Main Canvas** - Graph view or list view
- **Article Preview** (right panel) - Details of selected article

**Screenshot placeholder: Interface overview with labels**

---

## Managing Articles

### Adding Articles

There are multiple ways to add articles:

#### Manual Entry
1. Click the **"+"** button in the toolbar
2. Fill in the form manually
3. Click **Save**

#### Import from DOI
1. Click **"+"** button
2. Click **"Import from DOI"** in the modal
3. Enter the DOI
4. Article metadata is automatically fetched and filled

#### Import from arXiv
1. Click **"+"** button
2. Click **"Import from arXiv"** in the modal
3. Enter the arXiv ID (e.g., 2301.12345)
4. Article metadata is automatically fetched

#### Import from PDF
1. Go to **Dropdown Menu** → **File** → **Import** → **PDF**
2. Select a PDF file
3. Metadata is extracted automatically

**Screenshot placeholder: Import options in modal**

### Editing Articles

1. Click on an article node (graph view) or row (list view)
2. The article preview panel opens on the right
3. Click the **Edit** button (pencil icon)
4. Modify the fields
5. Click **Save**

**Screenshot placeholder: Article preview panel with edit button**

### Deleting Articles

1. Open the article preview panel
2. Click the **Delete** button (trash icon)
3. Confirm deletion
4. The article and all its connections are removed

---

## Creating Connections

Connections represent relationships between articles (e.g., "cites", "builds on", "contradicts").

### How to Create a Connection

1. **Click on a node** in the graph view
2. A **radial menu** appears around the node with 8 connection points
3. **Click one of the connection points** to start creating a link
4. **Click on the target node** you want to connect to
5. A modal appears asking for a **label** (optional)
6. Click **Save**

**Screenshot placeholder: Radial menu around selected node**

**Screenshot placeholder: Connection modal with label input**

### Connection Tips

- Connections are directional (from source to target)
- You can add labels like "cites", "extends", "refutes", etc.
- Connections appear as arrows in the graph view
- Hover over a connection to see its label

### Editing Connection Labels

1. Click on the connection line (edge)
2. The connection modal opens
3. Edit the label
4. Click **Save**

### Deleting Connections

1. Click on the connection line
2. Click **Delete** in the connection modal
3. Confirm deletion

**Screenshot placeholder: Selected connection with highlight**

---

## Using Tags and Categories

Tags help organize articles into categories. Each tag is represented by a colored zone in the graph view.

### Adding Tags to Articles

When creating or editing an article:
1. In the **Tags** field, enter tags separated by commas
2. Example: `machine learning, computer vision, deep learning`
3. Tags are automatically color-coded

**Screenshot placeholder: Tags field in article modal**

### How Tags Work

- Each unique tag creates a **zone** in the graph view
- Zones are color-coded circles that group related articles
- Articles can have multiple tags
- Articles appear in all zones corresponding to their tags

### Managing Tags

Tags are managed through zones (see next section).

---

## Working with Zones

Zones are visual groupings in the graph view that correspond to tags/categories.

### What Are Zones?

- Colored circular areas that group articles by tag
- Each zone represents one category/tag
- Articles automatically appear in zones based on their tags
- Zones help visually organize your research map

**Screenshot placeholder: Graph view with multiple colored zones**

### Moving Zones

1. **Hover** over a zone background
2. **Click and drag** to reposition the zone
3. All nodes in that zone move with it

### Resizing Zones

1. Look for the **resize handle** (small circle) at the edge of the zone
2. **Click and drag** the handle to make the zone larger or smaller

**Screenshot placeholder: Zone with resize handle highlighted**

### Zone Colors

Each zone is automatically assigned a distinct color. The color is used:
- As the zone background
- As the node color for articles in that category
- In the category badges in list view and preview panel

---

## Toolbar Features

The toolbar appears at the top-right of the interface.

**Screenshot placeholder: Toolbar with labeled buttons**

### Toolbar Buttons (Left to Right)

1. **Add Article (+)** - Create a new article manually or import from DOI/arXiv/PDF
2. **Search** - Filter articles by title, author, year, or tags
3. **Category Filter** - Show only articles from specific categories
4. **Export** - Quick access to export menu
5. **Help (?)** - Show keyboard shortcuts and tips
6. **View Toggle** - Switch between graph and list view

### Add Article Button (+)

Opens the article modal with options:
- Manual entry
- Import from DOI
- Import from arXiv
- Import from PDF

### Search Bar

- Click to expand the search input
- Type to filter articles in real-time
- Searches: title, authors, year, source, tags, notes
- Press **Esc** to clear

**Screenshot placeholder: Expanded search bar with results**

### Category Filter

- Click to open dropdown of all tags
- Select **All Categories** to show everything
- Select a specific tag to show only articles with that tag
- Affects both graph and list views

**Screenshot placeholder: Category filter dropdown**

### Help Button (?)

Opens a modal with:
- Keyboard shortcuts
- Quick tips
- Link to this manual

---

## Dropdown Menu

Access the dropdown menu by clicking the **papergraph logo** in the top-left corner.

**Screenshot placeholder: Full dropdown menu**

### File Section

#### New Project
- Creates a completely new empty project
- **Warning**: All unsaved data will be lost
- Use **Export** first to save your current work

#### Import
Opens submenu with import options:

1. **Project (JSON)** - Import a previously exported papergraph project
2. **BibTeX** - Import articles from a `.bib` file
3. **PDF** - Import article metadata from a PDF file

**Screenshot placeholder: Import submenu**

#### Export
Opens submenu with export options:

1. **Project (JSON)** - Save your entire project (articles, connections, zones, positions)
2. **BibTeX** - Export all articles as a `.bib` file for citation managers
3. **PDF Report** - Generate a formatted PDF document of all articles
4. **Image (PNG)** - Export the current graph view as an image

**Screenshot placeholder: Export submenu**

### View Section

#### Node Labels
Opens submenu to control what appears on graph nodes:

1. **Title** - Show article title on nodes (default)
2. **Authors** - Show first author on nodes
3. **Year** - Show publication year on nodes
4. **None** - Show no labels (clean view)

**Screenshot placeholder: Node labels submenu**

### Help Section

#### Help & Shortcuts
- Opens the help modal with keyboard shortcuts
- Links to this user manual

---

## View Modes

papergraph has two view modes: **Graph View** and **List View**.

### Switching Views

Use the toggle switch in the toolbar (top-right):
- **Graph icon** (left) = Graph View
- **List icon** (right) = List View

**Screenshot placeholder: View toggle switch**

### Graph View

The graph view displays articles as nodes connected by edges.

**Features:**
- **Drag nodes** to reposition them (positions are saved)
- **Click node** to see article preview
- **Click node** to show radial menu for creating connections
- **Zoom** with mouse wheel
- **Pan** by dragging empty space
- **Multi-select** by dragging a selection box around multiple nodes

**Screenshot placeholder: Graph view with nodes and connections**

#### Graph Controls

- **Scroll wheel** - Zoom in/out
- **Left-click + drag** (on empty space) - Pan the view
- **Left-click** (on node) - Select node and show radial menu
- **Drag** (on node) - Move node
- **Drag selection box** - Select multiple nodes

### List View

The list view displays articles in a sortable table.

**Screenshot placeholder: List view table**

#### Table Columns

1. **Title** - Article title (clickable)
2. **Authors** - Author list
3. **Year** - Publication year
4. **Source** - Journal or conference
5. **Categories** - Tags as colored badges

#### Sorting

Click any column header to sort:
- First click: Ascending order
- Second click: Descending order
- Third click: Return to default order

**Screenshot placeholder: Sorted list view**

#### Interactions

- **Click any row** to open article preview panel
- **Hover over category badges** to see full tag name
- Search and filters work in both views

---

## Import & Export

### Import Options

#### Import Project (JSON)
1. **Menu** → **File** → **Import** → **Project**
2. Select a `.json` file (previously exported from papergraph)
3. Confirm replacement of current project
4. All articles, connections, zones, and node positions are restored

**Use case**: Sharing projects, backup/restore, moving between devices

#### Import BibTeX
1. **Menu** → **File** → **Import** → **BibTeX**
2. Select a `.bib` file
3. Articles are automatically parsed and added to your project
4. Existing articles are preserved

**Use case**: Import from Zotero, Mendeley, or other reference managers

#### Import from DOI
1. Click **+** button in toolbar
2. Click **Import from DOI** in the modal
3. Enter DOI (e.g., `10.1038/nature12373`)
4. Article metadata is fetched from CrossRef API

**Use case**: Quick add single articles

#### Import from arXiv
1. Click **+** button in toolbar
2. Click **Import from arXiv** in the modal
3. Enter arXiv ID (e.g., `2301.12345`)
4. Article metadata is fetched from arXiv API

**Use case**: Add preprints and recent papers

#### Import from PDF
1. **Menu** → **File** → **Import** → **PDF**
2. Drag & drop PDF or click to browse
3. Metadata is extracted automatically
4. Review and edit before saving

**Use case**: Bulk import from local PDF library

**Screenshot placeholder: PDF import drop zone**

### Export Options

#### Export Project (JSON)
1. **Menu** → **File** → **Export** → **Project**
2. A `.json` file is downloaded
3. Includes: all articles, connections, zones, node positions

**Use case**: Backup, sharing, version control

#### Export BibTeX
1. **Menu** → **File** → **Export** → **BibTeX**
2. A `.bib` file is downloaded with all articles
3. Can be imported into citation managers

**Use case**: Integration with LaTeX, Zotero, Mendeley

#### Export PDF Report
1. **Menu** → **File** → **Export** → **PDF**
2. A formatted PDF report is generated
3. Includes all article details organized by category

**Use case**: Print documentation, sharing with non-technical collaborators

#### Export Image (PNG)
1. **Menu** → **File** → **Export** → **Image**
2. The current graph view is exported as PNG
3. Useful for presentations and publications

**Use case**: Figures for papers, presentations, documentation

---

## Search and Filters

### Search Bar

Located in the toolbar (magnifying glass icon).

**Screenshot placeholder: Search bar in action**

#### How to Use
1. Click the search icon to expand
2. Type your search query
3. Results update in real-time
4. Works in both graph and list views

#### What Gets Searched
- Article titles
- Author names
- Publication year
- Source (journal/conference)
- Tags
- Notes

#### Search Tips
- Search is case-insensitive
- Partial matches work (e.g., "learn" finds "learning")
- Multiple words are treated as separate queries
- Press **Esc** to clear and show all articles

### Category Filters

Located in the toolbar (filter icon).

**Screenshot placeholder: Category filter dropdown**

#### How to Use
1. Click the filter icon
2. Select a category from the dropdown
3. Only articles with that tag are shown
4. Select **All Categories** to remove filter

#### Filter Behavior
- Filters work in both graph and list views
- In graph view: nodes without the tag are hidden
- In list view: rows without the tag are hidden
- Filtered nodes' connections are also hidden

---

## Tips & Shortcuts

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **Ctrl/Cmd + S** | Save (trigger localStorage save) |
| **Esc** | Close modals, clear search |
| **Delete** | Delete selected node or connection |
| **Ctrl/Cmd + A** | Select all nodes (graph view) |

### Graph View Tips

1. **Organize spatially** - Position related articles near each other
2. **Use zones** - Move zones to create visual regions
3. **Node positions are saved** - Your layout is preserved
4. **Multi-select** - Drag selection box to move multiple nodes at once
5. **Zoom to focus** - Use mouse wheel to zoom in on specific areas

### Workflow Tips

1. **Start with import** - Import existing bibliography (BibTeX) or papers (PDF)
2. **Tag consistently** - Use consistent tag names for better organization
3. **Add connections early** - Link articles as you read them
4. **Use labels** - Label connections with relationship type ("cites", "extends", etc.)
5. **Export regularly** - Save JSON backups of your project
6. **Use notes** - Add personal notes and insights to articles

### Organization Strategies

#### By Topic
- Create tags for research areas: "machine learning", "NLP", "computer vision"
- Use zones to visualize topic clusters

#### By Project
- Tag articles by project: "thesis", "paper-1", "review-2024"
- Filter to focus on one project at a time

#### By Status
- Use tags like "to-read", "reading", "read", "cited"
- Track your reading progress

#### By Methodology
- Tag by method: "survey", "experimental", "theoretical"
- Find similar methodological approaches

### Performance Tips

1. **Large projects** (100+ articles): Use filters to focus on subsets
2. **Complex graphs**: Zoom in to reduce rendering load
3. **Export regularly**: Browser localStorage has limits (~5-10MB)
4. **Clean up**: Delete irrelevant articles and connections periodically

---

## Common Workflows

### Workflow 1: Literature Review

1. **Import papers** from BibTeX or PDF
2. **Add tags** by research theme
3. **Read and annotate** - Add notes as you read
4. **Create connections** - Link related papers
5. **Identify gaps** - Look for sparse areas in the graph
6. **Export PDF report** - Generate review document

### Workflow 2: Writing a Paper

1. **Filter by project tag** (e.g., "paper-2024")
2. **Review connections** - Ensure logical flow
3. **Check citations** - Use graph to verify all references
4. **Export BibTeX** - Import into LaTeX
5. **Export PNG** - Include graph figure in paper

### Workflow 3: Collaborative Research

1. **Export project JSON** - Share with collaborators
2. **Collaborators import** - Everyone works on same structure
3. **Each adds notes/connections** - Personal insights preserved
4. **Merge projects** - Combine exports (manual for now)
5. **Share final graph PNG** - Visual summary of research

### Workflow 4: Research Onboarding

1. **Senior creates project** - Key papers and structure
2. **Export JSON** - Shared with new team member
3. **Junior imports** - Instant overview of field
4. **Explore connections** - Understand paper relationships
5. **Add new papers** - Expand knowledge base

---

## Troubleshooting

### Articles Not Showing

- Check if a category filter is active
- Check if search is active (clear with Esc)
- Refresh the page (data persists in localStorage)

### Connections Not Visible

- Ensure both nodes are visible (check filters)
- Zoom out to see full graph
- Check if connection was saved (click node to verify)

### Node Positions Not Saving

- Ensure you're not in private/incognito mode
- Check browser localStorage is enabled
- Export JSON as backup

### Import Not Working

- Check file format (JSON for projects, .bib for BibTeX)
- Ensure file is not corrupted
- Try importing in a new empty project

### Performance Issues

- Reduce number of visible nodes (use filters)
- Close other browser tabs
- Export and start a new focused project
- Clear browser cache

---

## Data and Privacy

### Where Is Data Stored?

All data is stored locally in your browser's **localStorage**:
- **Key**: `papermap_data` - Articles and connections
- **Key**: `papermap_zones` - Zone positions and colors
- **Key**: `papermap_positions` - Node positions

### Privacy

- **No server**: Data never leaves your browser
- **No tracking**: No analytics or telemetry
- **No account**: No login required
- **No cloud**: You control your data

### Data Limits

- localStorage typically allows 5-10MB per domain
- Approximately 1000-2000 articles depending on notes/metadata
- Export to JSON if approaching limits

### Backup Strategy

1. **Regular exports** - Export JSON weekly
2. **Version control** - Keep dated backups
3. **Git-friendly** - JSON exports work well with version control
4. **Cloud sync** - Store exports in Dropbox/Drive/iCloud

---

## Advanced Features

### Multi-Select Nodes

1. **Click and drag** on empty space to create selection box
2. Multiple nodes turn selected
3. **Drag any selected node** to move all selected nodes together
4. Click empty space to deselect

**Screenshot placeholder: Multi-select box with multiple nodes selected**

### Custom Node Labels

Change what appears on nodes via **Menu** → **View** → **Node Labels**:
- **Title** - Full or truncated title
- **Authors** - First author surname
- **Year** - Publication year
- **None** - Clean minimal view

### Zone Customization

Zones automatically adapt:
- **Color** - Auto-generated from tag name
- **Size** - Based on number of articles
- **Position** - Draggable and persistent

### BibTeX Keys

When exporting to BibTeX, citation keys are auto-generated:
- Format: `FirstAuthorYear` (e.g., `Smith2023`)
- Handles special characters
- Ensures uniqueness

---

## Future Features

Features planned for future releases:

- [ ] Collaborative real-time editing
- [ ] Advanced search with Boolean operators
- [ ] Custom zone colors
- [ ] Import from Google Scholar
- [ ] Export to various citation formats
- [ ] Annotation highlighting
- [ ] Timeline view
- [ ] Citation network analysis
- [ ] Mobile app

---

## Getting Help

### Resources

- **This Manual** - Complete feature documentation
- **Help Button (?)** - In-app quick reference
- **GitHub Issues** - Report bugs and request features
- **README.md** - Quick start and technical overview

### Support

For questions, bugs, or feature requests:
1. Check this manual first
2. Search existing GitHub issues
3. Open a new issue with details

---

## Credits

**papergraph** is built with:
- [vis-network](https://visjs.org/) by Almende B.V.
- [jsPDF](https://github.com/parallax/jsPDF) by James Hall
- Vanilla JavaScript - No frameworks!

---

**End of User Manual**

Last updated: October 2025
