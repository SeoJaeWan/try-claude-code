# @seojaewan/tcf

Frontend CLI for the Try Claude Code profile system.

## Install

```bash
npm i -g @seojaewan/tcf
```

## Usage

```bash
tcf --help
tcf mode set --mode personal --version v1
tcf mode show
```

`tcf mode set --mode personal --version v1` refreshes a local snapshot of `main/profiles/tcf/{mode}/{version}` from `SeoJaeWan/try-claude-code`.
Inspect the stored selection with `tcf mode show`, use `tcf --help` even before mode setup for minimal setup guidance, and rerun `mode set` whenever you want to refresh the cached profile snapshot.
