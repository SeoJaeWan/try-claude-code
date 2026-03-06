---
name: migration
description: Sync repo-local managed references under .claude/try-claude with the latest plugin reference defaults.
---

<Skill_Guide>
<Purpose>
Update managed reference files in `.claude/try-claude/` while preserving user-edited markdown sections.
</Purpose>

<Instructions>
# migration

Synchronize repo-local managed references with the latest plugin defaults.

## Prerequisite

Run this skill only after `init-try` has created `.claude/try-claude/project.json`.

## Execution

Run the helper using the script bundled with this skill:

```bash
node skills/migration/scripts/run.mjs --repo-root <repo-root>
```

> Path is relative to the plugin root. The script resolves `--plugin-root` automatically from its own `import.meta.url`.

## Behavior

1. Read `.claude/try-claude/project.json`.
2. Compare current repo-local references against plugin `references/**`.
3. For markdown files with unique `##` headings:
    - update unchanged sections
    - preserve edited sections
    - append new plugin sections
    - keep local-only sections
4. For whole-file fallback:
    - update only if the file still matches the previously synced hash
    - skip when the file was user-modified
5. Add newly introduced plugin reference files.
6. Do not delete local reference files when a plugin default disappears.
7. Update `project.json` metadata after sync.

## Output

The helper prints a JSON summary including:

- `updatedCount`
- `reseededCount`
- `skippedCount`
- `trackedCount`
- `projectJsonPath`

</Instructions>
</Skill_Guide>
