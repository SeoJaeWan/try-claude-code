# Sample Domain Reference

> This file is a sample reference document demonstrating the seeded overlay structure.
> Replace it with your project's actual domain documentation.

## Purpose

Reference documents in the `references/` directory provide context to AI agents
during task execution. They describe business rules, coding conventions, domain
terminology, and architectural decisions.

## Categories

| Category | Example | Description |
|---|---|---|
| `coding-rules/` | `naming.md`, `code-style.md` | Language and framework conventions |
| `design/` | `theme-tokens.md`, `components.md` | UI/UX design specifications |
| Domain docs | `domain.md` (user-created) | Project-specific business logic |
| Codemaps | `backend.md`, `database.md` (user-created) | Existing codebase structure maps |

## Managed vs User-Owned

This sample file is **managed** -- it is seeded by `init-try` and tracked in
`project.json`'s `managedReferences` array. If you modify it, `migration` uses
section-aware sync for markdown files and preserves user-edited sections.

To create **user-owned** reference documents (e.g., `domain.md`), simply add
files to the `references/` directory. They will not be tracked or overwritten
by the plugin.
