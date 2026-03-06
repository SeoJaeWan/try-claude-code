---
name: init-try
description: Bootstrap the repo-local try-claude runtime under .claude/try-claude and seed managed references.
---

<Skill_Guide>
<Purpose>
Create or refresh `.claude/try-claude/` in the current repository without generating runnable JS files inside the consumer repo.
</Purpose>

<Instructions>
# init-try

Bootstrap the repo-local runtime state used by try-claude.

## What It Creates

- `.claude/try-claude/project.json`
- `.claude/try-claude/references/`
- `.claude/try-claude/plans/`
- `.claude/try-claude/reports/`
- `.claude/try-claude/logs/`
- `.claude/try-claude/codemaps/`
- `.claude/try-claude/humanmaps/`

## Execution

Run the helper using the script bundled with this skill:

```bash
node skills/init-try/scripts/run.mjs --repo-root <repo-root>
```

> Path is relative to the plugin root. The script resolves `--plugin-root` automatically from its own `import.meta.url`.

## Behavior

1. Ensure the repo-local runtime directories exist.
2. Seed missing `references/**` files into `.claude/try-claude/references/`.
3. Preserve existing reference files.
4. Write `.claude/try-claude/project.json`.
5. Track managed references in `project.json.managedReferences`.
6. Use section-aware tracking for markdown files with unique `##` headings.
7. Do not generate `init-try.js`, `migration.js`, or other runnable JS files in the consumer repo.

## Output

The helper prints a JSON summary including:

- `runtimeRoot`
- `seededCount`
- `keptCount`
- `trackedCount`
- `projectJsonPath`

</Instructions>
</Skill_Guide>
