# Migration Skill Simulation Result

## Task

Sync try-claude references (`.claude/try-claude/references/`) with the latest plugin defaults (`references/`).

## Skill Followed

**Path:** `skills/migration/SKILL.md`

## Simulated Workflow Steps

### Step 1: Verify Prerequisite

Confirmed `.claude/try-claude/project.json` exists with:
- `schemaVersion`: 1.0.0
- `pluginId`: try-claude
- `pluginVersion`: 0.1.0
- `lastSyncedAt`: 2026-03-06T14:10:45.567Z
- 15 `managedReferences` entries tracked

### Step 2: Command That Would Be Executed

```bash
node skills/migration/scripts/run.mjs --repo-root C:/Users/sjw73/Desktop/dev/try-claude-code
```

The script (`skills/migration/scripts/run.mjs`) imports utilities from `skills/init-try/scripts/runtime-state.mjs` and autodetects the plugin root via `import.meta.url`.

### Step 3: What the Script Does (Behavior Analysis)

The `runMigration` function performs these operations:

1. **Loads `project.json`** from `.claude/try-claude/project.json` and reads existing `managedReferences` into a Map keyed by relative path.

2. **Lists plugin reference files** from `references/` (the plugin source of truth). There are 15 markdown files across `coding-rules/`, `design/`, and root.

3. **For each plugin reference file**, compares against the repo-local copy in `.claude/try-claude/references/`:

   - **If the repo-local file does not exist** (reseeded): Writes the plugin content and creates a new tracking entry.
   - **If no existing tracking entry** (tracked-existing): Builds a new entry to begin tracking.
   - **If mergeMode is `markdown-sections`** (14 of 15 files): Uses `mergeMarkdownSections()` to perform section-level merge:
     - Unchanged sections (matching `sectionHashes`) are updated to latest plugin content
     - Edited sections (hash mismatch) are preserved as-is
     - New plugin sections are appended
     - Local-only sections are kept
   - **If mergeMode is `whole-file`** (1 file: `package-manager.md`): Updates only if the current file hash matches the recorded hash (no user modifications); skips otherwise.

4. **Stale entries** (tracked in `project.json` but no longer in plugin defaults) are carried forward without deletion.

5. **Writes updated `project.json`** with new timestamps and hashes.

### Step 4: Current State Analysis

| Category | Plugin Files | Repo-Local Files | Tracked in project.json |
|----------|-------------|-----------------|------------------------|
| coding-rules | 9 | 9 | 9 |
| design | 5 | 5 | 5 |
| root | 1 (sample-domain.md) | 1 | 1 |
| **Total** | **15** | **15** | **15** |

All 15 plugin reference files have corresponding repo-local copies and tracking entries. The file sets are in perfect 1:1 correspondence.

### Step 5: Expected Migration Output

Since this is the same repo acting as both plugin and target, and `project.json` was last synced on 2026-03-06, the expected result depends on whether any plugin reference files have changed since that sync date.

The likely output would be:

```json
{
  "status": "ok",
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

The `lastSyncedAt` timestamp in `project.json` would be updated to the current execution time, even if no file content changed.

## Merge Modes Summary

| File | Merge Mode |
|------|-----------|
| coding-rules/code-style.md | markdown-sections |
| coding-rules/comments.md | markdown-sections |
| coding-rules/completion.md | markdown-sections |
| coding-rules/folder-structure.md | markdown-sections |
| coding-rules/git.md | markdown-sections |
| coding-rules/naming.md | markdown-sections |
| coding-rules/package-manager.md | whole-file |
| coding-rules/testing.md | markdown-sections |
| coding-rules/typescript.md | markdown-sections |
| design/components.md | markdown-sections |
| design/font.md | markdown-sections |
| design/pages.md | markdown-sections |
| design/references.md | markdown-sections |
| design/theme-tokens.md | markdown-sections |
| sample-domain.md | markdown-sections |

## Key Observations

1. The migration script is non-destructive: it never deletes local reference files even if they disappear from the plugin.
2. 14 of 15 files use `markdown-sections` merge mode, enabling granular section-level sync while preserving user edits.
3. Only `package-manager.md` uses `whole-file` mode, meaning it will only be updated if the user has not modified it.
4. The script was blocked from actual execution due to Bash permission restrictions; this is a simulated analysis based on code inspection.
