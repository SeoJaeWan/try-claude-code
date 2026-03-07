# Migration Skill -- Simulation Result

## Task

Sync local references under `.claude/try-claude/references/` with the latest plugin defaults from `references/`.

## Skill Used

- **Skill path**: `skills/migration/SKILL.md`
- **Script**: `skills/migration/scripts/run.mjs`

## Prerequisite Check

- `.claude/try-claude/project.json` exists with `schemaVersion: 1.0.0`, `pluginId: try-claude`, `pluginVersion: 0.1.0`.
- Last synced: `2026-03-06T14:10:45.567Z`.
- 15 managed reference entries are tracked.

## Simulated Execution

Command that would be run:

```bash
node skills/migration/scripts/run.mjs --repo-root C:/Users/sjw73/Desktop/dev/try-claude-code
```

### File-by-File Analysis

The script compares each plugin reference file against the corresponding runtime file in `.claude/try-claude/`.

| # | Reference Path | Merge Mode | Simulated Action |
|---|----------------|------------|------------------|
| 1 | `references/coding-rules/code-style.md` | markdown-sections | no-change |
| 2 | `references/coding-rules/comments.md` | markdown-sections | no-change |
| 3 | `references/coding-rules/completion.md` | markdown-sections | no-change |
| 4 | `references/coding-rules/folder-structure.md` | markdown-sections | no-change |
| 5 | `references/coding-rules/git.md` | markdown-sections | no-change |
| 6 | `references/coding-rules/naming.md` | markdown-sections | no-change |
| 7 | `references/coding-rules/package-manager.md` | whole-file | no-change |
| 8 | `references/coding-rules/testing.md` | markdown-sections | no-change |
| 9 | `references/coding-rules/typescript.md` | markdown-sections | no-change |
| 10 | `references/design/components.md` | markdown-sections | no-change |
| 11 | `references/design/font.md` | markdown-sections | no-change |
| 12 | `references/design/pages.md` | markdown-sections | no-change |
| 13 | `references/design/references.md` | markdown-sections | no-change |
| 14 | `references/design/theme-tokens.md` | markdown-sections | no-change |
| 15 | `references/sample-domain.md` | markdown-sections | no-change |

### Rationale

- All 15 plugin reference files already exist in `.claude/try-claude/references/` (no reseeding needed).
- All 15 files are already tracked in `project.json` with recorded hashes and section hashes.
- The plugin source (`references/`) and runtime copy (`.claude/try-claude/references/`) contain the same set of files. Since no plugin defaults have changed since the last sync (the repo is on the same version `0.1.0`), all files are expected to produce `no-change` actions.
- No files were user-modified (hashes match), so no skips are expected.
- No new plugin reference files were introduced, so no reseeding occurs.

### Simulated Output

```json
{
  "status": "ok",
  "runtimeRoot": ".claude/try-claude",
  "updatedCount": 0,
  "reseededCount": 0,
  "skippedCount": 0,
  "trackedCount": 15,
  "projectJsonPath": ".claude/try-claude/project.json",
  "actions": [
    { "path": "references/coding-rules/code-style.md", "action": "no-change" },
    { "path": "references/coding-rules/comments.md", "action": "no-change" },
    { "path": "references/coding-rules/completion.md", "action": "no-change" },
    { "path": "references/coding-rules/folder-structure.md", "action": "no-change" },
    { "path": "references/coding-rules/git.md", "action": "no-change" },
    { "path": "references/coding-rules/naming.md", "action": "no-change" },
    { "path": "references/coding-rules/package-manager.md", "action": "no-change" },
    { "path": "references/coding-rules/testing.md", "action": "no-change" },
    { "path": "references/coding-rules/typescript.md", "action": "no-change" },
    { "path": "references/design/components.md", "action": "no-change" },
    { "path": "references/design/font.md", "action": "no-change" },
    { "path": "references/design/pages.md", "action": "no-change" },
    { "path": "references/design/references.md", "action": "no-change" },
    { "path": "references/design/theme-tokens.md", "action": "no-change" },
    { "path": "references/sample-domain.md", "action": "no-change" }
  ]
}
```

## Migration Behavior Summary

The migration skill follows a well-defined algorithm:

1. **Reads** `project.json` to get the current tracked reference state.
2. **Iterates** over all plugin reference files from the `references/` directory.
3. **For each file**, applies one of these strategies:
   - **Reseed**: If the runtime file does not exist, copy it from plugin defaults.
   - **Markdown-sections merge**: For files with `mergeMode: "markdown-sections"`, compare section-level hashes to update unchanged sections, preserve user-edited sections, append new plugin sections, and keep local-only sections.
   - **Whole-file fallback**: For `mergeMode: "whole-file"`, update only if the file still matches the previously synced hash; skip if user-modified.
4. **Carries forward** stale entries (local references no longer present in plugin defaults) without deleting them.
5. **Updates** `project.json` with new hashes, timestamps, and managed reference metadata.

## Conclusion

Since the plugin version has not changed and no reference defaults have been modified since the last sync, all 15 files are already up to date. The migration produces no updates, no reseeds, and no skips. The `project.json` would be refreshed with a new `lastSyncedAt` timestamp.
