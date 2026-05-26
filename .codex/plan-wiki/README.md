# Plan Wiki

This workspace uses a project-local clone of the shared plan wiki repository.

- Source repository clone: `.codex/plan-wiki/source`
- Planning root: `.codex/plan-wiki/source/wiki`
- Docs root: `.codex/plan-wiki/source`

Run setup before planning if `.codex/plan-wiki/source/wiki/registry.json` is missing.

The shared repo URL is stored in `config.json` as a standard GitHub HTTPS URL so macOS, Windows, and CI environments do not depend on a machine-local SSH host alias. Authentication is handled by the local Git credential manager, GitHub CLI, or an environment-specific override.
