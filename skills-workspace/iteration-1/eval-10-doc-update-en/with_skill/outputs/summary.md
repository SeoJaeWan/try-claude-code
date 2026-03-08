# doc-update Skill Evaluation (English prompt, with_skill)

## Skill Read: skills/doc-update/SKILL.md

## Script Pipeline
1. detect_changes.mjs -> changes.json (SHA256 hashing, silent fallback)
2. extract_structure.mjs -> extracted_structure.json

## Service Root Detection
- walkDirectoriesForRoots() scanning for app/, apps/, src/, pages/
- Excludes 30+ infrastructure directories
- Special pages/ validation

## CODEMAPS
- .claude/try-claude/codemaps/ with INDEX.md, backend.md, frontend.md, database.md, architecture.md
- Incremental update logic

## HUMANMAPS
- 1:1 mapping from codemaps .md to .html
- Sidebar nav, Mermaid.js, highlight.js, responsive, Korean language
