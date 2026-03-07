# init-try: Bootstrap the try-claude Runtime

## Skill

- **Path:** `C:/Users/sjw73/Desktop/dev/try-claude-code/skills/init-try/SKILL.md`
- **Purpose:** Create or refresh `.claude/try-claude/` in the current repository and seed managed references.

## Simulated Execution

### Command

```bash
node skills/init-try/scripts/run.mjs --repo-root C:/Users/sjw73/Desktop/dev/try-claude-code
```

### Steps Performed (Simulated)

1. **Parsed arguments:** `--repo-root` resolved to `C:/Users/sjw73/Desktop/dev/try-claude-code`. `--plugin-root` auto-resolved from script location to the repo root.

2. **Loaded plugin metadata** from `.claude-plugin/plugin.json`:
   - `pluginId`: `try-claude` (fallback, since `id` field absent)
   - `pluginVersion`: `0.1.0`

3. **Ensured runtime directories exist** under `.claude/try-claude/`:
   - `references/`
   - `plans/`
   - `reports/`
   - `logs/`
   - `codemaps/`
   - `humanmaps/`
   - `jira-review/`

4. **Listed plugin reference files** from `references/` (15 files):
   - `references/coding-rules/code-style.md`
   - `references/coding-rules/comments.md`
   - `references/coding-rules/completion.md`
   - `references/coding-rules/folder-structure.md`
   - `references/coding-rules/git.md`
   - `references/coding-rules/naming.md`
   - `references/coding-rules/package-manager.md`
   - `references/coding-rules/testing.md`
   - `references/coding-rules/typescript.md`
   - `references/design/components.md`
   - `references/design/font.md`
   - `references/design/pages.md`
   - `references/design/references.md`
   - `references/design/theme-tokens.md`
   - `references/sample-domain.md`

5. **Seeded vs. kept references:** All 15 reference files already exist in `.claude/try-claude/references/`, so the script would **keep** all 15 and seed 0 new files.

6. **Built managed reference entries** for each file:
   - Markdown files with unique `## ` headings use `markdown-sections` merge mode with per-section SHA-256 hashes.
   - Files without valid sections (e.g., `package-manager.md`) use `whole-file` merge mode when their hash matches the plugin source.

7. **Wrote `project.json`** at `.claude/try-claude/project.json` with:
   - `schemaVersion`: `1.0.0`
   - `pluginId`: `try-claude`
   - `pluginVersion`: `0.1.0`
   - `lastSyncedAt`: current ISO timestamp
   - `managedReferences`: 15 entries sorted by path

### Simulated Output (JSON Summary)

```json
{
  "status": "ok",
  "runtimeRoot": "C:/Users/sjw73/Desktop/dev/try-claude-code/.claude/try-claude",
  "seededCount": 0,
  "keptCount": 15,
  "trackedCount": 15,
  "projectJsonPath": "C:/Users/sjw73/Desktop/dev/try-claude-code/.claude/try-claude/project.json",
  "seeded": [],
  "kept": [
    "references/coding-rules/code-style.md",
    "references/coding-rules/comments.md",
    "references/coding-rules/completion.md",
    "references/coding-rules/folder-structure.md",
    "references/coding-rules/git.md",
    "references/coding-rules/naming.md",
    "references/coding-rules/package-manager.md",
    "references/coding-rules/testing.md",
    "references/coding-rules/typescript.md",
    "references/design/components.md",
    "references/design/font.md",
    "references/design/pages.md",
    "references/design/references.md",
    "references/design/theme-tokens.md",
    "references/sample-domain.md"
  ]
}
```

## Key Observations

- The runtime was already initialized (all directories and reference files pre-exist), so this is a **refresh** run with no new seeding.
- The `plugin.json` lacks an `id` field, so the script falls back to the hardcoded `PLUGIN_ID = 'try-claude'`.
- Section-aware merge tracking is active for 14 of the 15 reference files; `package-manager.md` uses whole-file tracking.
- No runnable JS files were generated in the consumer repo, consistent with the skill's behavioral constraints.
