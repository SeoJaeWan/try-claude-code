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

The CLI resolves the active contract from `main/profiles/publisher/{mode}/{version}` on `SeoJaeWan/try-claude-code`.
Set the active remote contract with `tcp mode set --mode personal --version v1`, inspect the stored selection with `tcp mode show`, and use `tcp --help` even before mode setup for minimal setup guidance.
