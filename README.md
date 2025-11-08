# ![Papergraph Logo](assets/logo-papergraph.svg) Papergraph 


## Map your research. Connect ideas.

Papergraph is a lightweight, visual knowledge manager for research papers. Build a graph of papers, capture notes, group concepts by tags, and export/share your map. It's free to use at https://papergraph.net

##  What you can do

- Build your literature map in two complementary views:
    - Graph View — visual, spatial map with nodes and links
    - List View — fast editing, inline notes and metadata
- Import from DOI, arXiv, PDF, or BibTeX (paste or .bib file)
- Export your work to project files, BibTeX, PDF, PNG, or SVG
- Tag papers and organize them in colored zones on the canvas
- Save locally by default; optional cloud save and gallery sharing

## Views

### 📈 Graph View
A spatial canvas for mapping your reading and connecting concepts.

- Nodes: every paper becomes a node. Labels can be citation key, title, etc.
- Links: draw directional connections between papers to express relationships; curved edges with labels are supported.
- Node links: each node keeps your DOI/URL/PDF for quick access.
- Tag Zones ("tagzone"): create colored rectangular zones from your tags, move/resize them, and keep related nodes together. Nested zones are supported.
- Selection and layout: box-select multiple nodes, drag to reposition, and fit/zoom the view. Node positions are persisted.

### 📝 List View
A compact, editable list optimized for quick capture and review.

- Inline editing: title, authors, and notes are directly editable.
- Note taking: a free-text notes field per paper; great for summaries or quotes.
- Tags: categories are shown as color badges derived from tag zones.
- Powerful search and filters: search title, authors, notes, and tags; filter by tag/category and date.
- Quick links: open DOI/URL/PDF directly from the list.

## 📥 Import
Multiple ways to bring papers into your map:

- DOI: paste a DOI or doi.org URL; metadata is fetched via Crossref.
- arXiv: paste an arXiv ID or URL; metadata is fetched from arXiv (with BibTeX fallback when available).
- PDF: drag and drop a PDF; filename is used and we try to detect a DOI inside the file to enrich metadata.
- BibTeX:
  - Paste one or many BibTeX entries to import at once
  - Drop a .bib/.bibtex file (bulk import supported)
- Project file: import a previously exported Papergraph project (.papergraph JSON)

Notes
- Duplicate checks are performed for DOI/arXiv IDs (you can override).
- When importing many BibTeX entries, nodes are laid out in columns automatically.

## 📤 Export
Choose the best format for your next step:

- Project (.papergraph): complete graph state (nodes, links, zones, positions)
- BibTeX (.bib): export all entries as BibTeX
- PDF: a clean list-style report grouped by categories
- PNG: snapshot of the current graph canvas
- SVG: scalable vector export of the graph (zones, nodes, curved edges, labels)

## 📊 Data model (quick reference)

- Article fields: title, authors, year, journal/booktitle, pages, DOI, URL, PDF, abstract, notes, categories (tags), BibTeX ID, and more
- Connections: directional links between articles, with optional labels and smooth control points
- Tag Zones: colored rectangles named after tags; positions and sizes are saved

## 💻 Using the app

Online
- Use it for free at https://papergraph.net

Local (static)
- This is a static web app. You can open `index.html` with a local web server for best results (for example, VS Code Live Server).
- Some imports (DOI/arXiv) call external APIs; you'll need an internet connection for those features.

Optional cloud sync and gallery
- If you sign in (Supabase auth), you can save projects to the cloud and submit them to the public Gallery. The app can generate a PR to this repo with your project files.

## 🤝 Call for contributions

Papergraph is MIT-licensed and community-driven. There are two great ways to contribute:

1) 🛠️ Improve the app
- Fix a bug, improve UI/UX, or add a small feature
- Open an issue to discuss ideas, or a PR with a focused change
- Keep changes minimal and well-scoped; include a short description, screenshots/gifs when UI changes

2) 🌟 Share your research maps
- From the app, use "Submit to Gallery" to propose your project
- A GitHub pull request will be opened automatically; maintainers review and merge

💡 Ideas that help a lot
- Better importers (parsers, heuristics, PDF metadata)
- Graph ergonomics (shortcuts, alignment helpers, layout presets)
- List view productivity (templates, richer note editor)
- Accessibility and internationalization polish

## 🗺️ Backlog / Roadmap

Themes collected from initial idea list. Not a committed schedule; use to prioritize.

### 📥 Import & Parsing
- Clean Zotero/BibTeX titles with excessive braces (e.g. `{Predicting the {Output} ...}`)
- LaTeX support in notes (render math / inline equations) and potentially take inspiration from markdown formating

### 📤 Export
- Improved PDF export (layout options, richer styling, per-section toggles)

### 📈 Graph & Interactions
- Ctrl+Click multi-selection with quick Tag menu
- Fix Ctrl+Click conflicts (delete vs full contextual menu)
- Paste (Ctrl+V) to create a node directly from copied BibTeX / DOI / arXiv / plain text
- Auto-detect and suggest links for a newly added node (title similarity / DOI match / shared tags)
- known bug : glow effect on node hover appears only once and no longer if clicked on it.

### ✏️ Editing & Productivity
- Undo / Redo (Ctrl+Z / Ctrl+Y) for node moves, edits, link creation, tag changes

### 🎨 Theming & Accessibility
- Dark mode (persisted preference, high-contrast option). Partially implemented for `editor.html`

### 🤖 AI Assist (optional, privacy-aware)
- AI summary of a single node (abstract + notes condensation)
- AI summary of an imported PDF
- AI global summary of the graph using node + connection context

### 👥 Collaboration
- Real-time multi-user editing and shareable project links
- Share button in editor view.
- Realtime presence indicator via avatar


## 🔧 Development

- No build required for basic usage; it's a static site (HTML/CSS/JS under `js/`, `css/`)
- Supabase functions and auth are optional; see `supabase/functions/README.md` if you want to enable gallery submissions locally
- Key sources:
  - Graph: `js/graph/`
  - List view: `js/ui/list-view.js`
  - Import: `js/data/import.js`, `js/data/bibtex-parser.js`
  - Export: `js/data/export.js`
  - Storage: `js/data/storage.js`, `js/data/cloud-storage.js`

## 📄 License

MIT License — see `LICENSE`.
