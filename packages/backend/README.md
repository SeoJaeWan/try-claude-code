# @seojaewan/backend

Backend CLI for the Try Claude Code profile system.

## Install

```bash
npm i -g @seojaewan/backend
```

## Quick Start

```bash
backend --help
backend mode set --mode personal --version v1
backend mode show
```

`backend mode set --mode personal --version v1` refreshes a local snapshot of `main/profiles/backend/{mode}/{version}` from `SeoJaeWan/try-claude-code`.
Inspect the stored selection with `backend mode show`, use `backend --help` even before mode setup for minimal setup guidance, and rerun `mode set` whenever you want to refresh the cached profile snapshot.
