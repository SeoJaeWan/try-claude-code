# HUMANMAPS Page Spec

Specification for generating HUMANMAPS HTML from CODEMAPS.

---

## Common Layout

- Sidebar navigation (navigation between all pages)
- Mermaid.js CDN (diagram rendering)
- highlight.js CDN (code syntax highlighting)
- Responsive design
- Shared assets/style.css

## index.html (← INDEX.md)

- Project overview, Tech Stack badge table
- Getting Started (Prerequisites, Installation, Development)
- Mermaid system overview diagram
- Link cards to other pages

## architecture.html (← architecture.md)

- Mermaid architecture diagram + data flow diagram
- Role description per technology stack

## backend.html (← backend.md)

- API endpoint table (Method badges: GET=green, POST=blue, PUT=orange, DELETE=red)
- Per-endpoint details (Parameters, Request/Response examples)
- Module/service structure

## frontend.html (← frontend.md)

- **Per-page component tree** — generate a Mermaid tree diagram for each route/page
  - Examples: `/` (home), `/login`, `/dashboard`, `/settings` — each as a separate tree
  - Hierarchy: page → layout → section → individual components
  - Shared components separated into a dedicated "Shared Components" section
- Per-component Props table
- Usage example code (with syntax highlighting)

## database.html (← database.md)

- Mermaid ER diagram
- Per-table column details (Name, Type, Nullable, Default)
- RLS policies
