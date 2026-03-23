# @seojaewan/frontend

Frontend CLI for the Try Claude Code profile system.

## Install

```bash
npm i -g @seojaewan/frontend
```

## Quick Start

```bash
frontend --help
frontend mode set --mode personal --version v1
frontend mode show
```

`frontend mode set --mode personal --version v1` refreshes a local snapshot of `main/profiles/frontend/{mode}/{version}` from `SeoJaeWan/try-claude-code`.
Inspect the stored selection with `frontend mode show`, use `frontend --help` even before mode setup for minimal setup guidance, and rerun `mode set` whenever you want to refresh the cached profile snapshot.
