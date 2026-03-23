# @seojaewan/tcp

Publisher CLI for the Try Claude Code profile system.

## Install

```bash
npm i -g @seojaewan/tcp
```

## Usage

```bash
tcp --help
tcp mode set --mode personal --version v1
tcp mode show
```

`tcp mode set --mode personal --version v1` refreshes a local snapshot of `main/profiles/tcp/{mode}/{version}` from `SeoJaeWan/try-claude-code`.
Inspect the stored selection with `tcp mode show`, use `tcp --help` even before mode setup for minimal setup guidance, and rerun `mode set` whenever you want to refresh the cached profile snapshot.
