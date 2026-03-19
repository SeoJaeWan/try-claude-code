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

The CLI resolves the active contract from `main/profiles/tcb/{mode}/{version}` on `SeoJaeWan/try-claude-code`.
Set the active remote contract with `tcb mode set --mode personal --version v1`, inspect the stored selection with `tcb mode show`, and use `tcb --help` even before mode setup for minimal setup guidance.
