---
name: init-codex-runtime
description: Install the planning plugin's `.codex` runtime into the current project by wiring `.codex/skills` to this plugin's bundled skills, copying named planning agents into `.codex/agents`, and seeding `.codex/config.toml`. Triggers on 'init-codex-runtime', 'install planning runtime', 'planning runtime setup', 'codex planning runtime', 'planning plugin install'. Use when a project should execute the bundled `planning` workflow through `.codex` runtime files instead of relying on manually managed local copies.
---

<Skill_Guide>
<Purpose>
Install the plugin-managed planning runtime into the current project so the bundled
planning skills and named planning agents can run through `.codex`.
</Purpose>

<Instructions>
# init-codex-runtime

Use this skill when the current project should consume the planning plugin as the
source of truth for `.codex/skills`, `.codex/agents`, and baseline `.codex/config.toml`
values.

## What this installs

| Path | Source | Install mode |
|------|--------|--------------|
| `.codex/skills/` | plugin `skills/` | symlink by default, copy fallback |
| `.codex/agents/*.toml` | plugin `templates/.codex/agents/` | file copy |
| `.codex/config.toml` | plugin `templates/.codex/config.toml` | create or merge |

This skill does **not** manage `~/.codex/reviewWiki`. The review wiki remains an
external stable path, typically backed by Obsidian.

## Step 1. Resolve the plugin root

Prefer these locations in order:

1. Repo-local source: `./plugins/codex-planning-stack/`
2. Installed plugin cache under `~/.codex/plugins/cache/*/codex-planning-stack/*/`

The install script lives at:

- `<plugin-root>/scripts/install-runtime.mjs`

If no plugin root is found, stop and report the blocker instead of guessing.

## Step 2. Run the installer

Run:

```bash
node "<plugin-root>/scripts/install-runtime.mjs"
```

Run from the target project root.

Default behavior:

- `.codex/skills` becomes a symlink to the plugin's `skills/` directory
- if symlink creation fails, the script falls back to copying the skill tree
- `.codex/agents/*.toml` files are copied from the plugin templates
- `.codex/config.toml` is created if missing, otherwise `[agents].max_threads` is merged conservatively

## Step 3. Verify the runtime

Confirm all of the following:

- `.codex/skills/` exists
- `.codex/agents/plan-architect.toml` exists
- `.codex/agents/plan-reviewer.toml` exists
- `.codex/agents/plan-materializer.toml` exists
- `.codex/config.toml` exists

When verification fails, report the exact missing path.

## Step 4. Report the result

Summarize:

- resolved plugin root
- whether `.codex/skills` was symlinked or copied
- whether any existing agent files were backed up
- whether `config.toml` was created, updated, or left unchanged
- reminder that `~/.codex/reviewWiki` is still external

## Guardrails

- Do not overwrite unrelated `.codex/artifacts/` or `.codex/reviews/` content.
- Do not delete unknown files under `.codex/agents/`; back up only conflicting managed files.
- Do not silently skip installer errors.
- Do not point review wiki paths into the plugin bundle.

</Instructions>
</Skill_Guide>
