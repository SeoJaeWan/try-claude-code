# @seojaewan/tcb

Backend CLI for the Try Claude Code profile system.

## Install

```bash
npm i -g @seojaewan/tcb
```

## Usage

```bash
tcb --help
tcb mode set --mode personal --version v1
tcb mode show
```

`tcb mode set --mode personal --version v1` refreshes a local snapshot of `main/profiles/tcb/{mode}/{version}` from `SeoJaeWan/try-claude-code`.
Inspect the stored selection with `tcb mode show`, use `tcb --help` even before mode setup for minimal setup guidance, and rerun `mode set` whenever you want to refresh the cached profile snapshot.
