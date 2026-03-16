# @seojaewan/tcf

Frontend CLI for the Try Claude Code profile system.

## Install

```bash
npm i -g @seojaewan/tcf
```

## Usage

```bash
tcf --help
tcf mode show
```

The CLI resolves profile channels from `profiles/registry.json` on the `main` branch of `SeoJaeWan/try-claude-code`.
For local verification before that file is published remotely, override `TRY_CLAUDE_PROFILE_REGISTRY_URL` and `TRY_CLAUDE_PROFILE_RAW_BASE_URL`.
