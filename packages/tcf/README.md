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

The CLI resolves the active contract from `main/profiles/frontend/{mode}/{version}` on `SeoJaeWan/try-claude-code`.
Set the active remote contract with `tcf mode set --mode personal --version v1`, inspect the stored selection with `tcf mode show`, and use `tcf --help` even before mode setup for minimal setup guidance.
