# Gallery Projects

This directory contains community-submitted projects that appear in the PaperGraph gallery.

## Structure

Each project is stored in a folder with the format: `username_YYYY-MM-DD`

Each project folder contains:
- `project.papergraph` - The project data file
- `metadata.json` - Project metadata (title, description, author, affiliation)
- `preview.png` - Project thumbnail image (optional)

## index.json

The `index.json` file contains an array of all gallery projects with their metadata.

Example entry:
```json
{
  "title": "Neural Networks in Computer Vision",
  "description": "A comprehensive survey of neural network architectures used in modern computer vision systems.",
  "author": "Dr. Jane Smith",
  "affiliation": "MIT Computer Science",
  "path": "janesmith_2025-01-15",
  "submittedAt": "2025-01-15T10:30:00.000Z",
  "thumbnail": true
}
```

## Submission Process

Projects are submitted through the gallery interface, which:
1. Creates a new branch in the repository
2. Adds the project files to this directory
3. Creates a pull request for review

After review and approval by maintainers:
1. The PR is merged
2. The project entry is added to `index.json`
3. The project appears in the gallery

## Guidelines

Projects should:
- Be complete and well-organized
- Have meaningful connections between articles
- Include accurate metadata
- Use appropriate tags and zones
- Be suitable for public viewing

Projects will be rejected if they:
- Contain inappropriate content
- Are incomplete or poorly organized
- Violate copyright or academic integrity
- Don't follow the submission format
