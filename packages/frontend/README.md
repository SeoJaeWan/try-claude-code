# @seojaewan/frontend

Frontend CLI — package-owned manifest for UI components, hooks, and frontend snippets.

## Install

```bash
npm i -g @seojaewan/frontend
```

## Quick Start

```bash
frontend --help
frontend component --help
frontend component --json "{\"name\":\"ReviewCard\",\"path\":\"components/common/reviewCard\"}"
frontend validate-file src/components/common/reviewCard
```

`frontend --help` returns a manifest-driven summary JSON with all available commands, whenToUse guidance, and workflow flows.
Use `frontend <command> --help` for command-scoped detail before scaffolding.
