# init-try Skill Evaluation (English prompt, with_skill)

## Skill Read: skills/init-try/SKILL.md

## Steps
1. Run `node skills/init-try/scripts/run.mjs --repo-root <repo-root>`
2. Creates runtime directories, seeds 24 reference files, builds managed reference entries with SHA256 hashes, writes project.json

## Directories Created
`.claude/try-claude/` with subdirs: references/, plans/, reports/, logs/, codemaps/, humanmaps/, jira-review/

## Files Created
24 reference files + `.claude/try-claude/project.json`

## project.json Structure
- schemaVersion ("1.0.0"), pluginId ("try-claude"), pluginVersion ("0.1.0"), lastSyncedAt
- managedReferences[]: path, hash (SHA256 hex), mergeMode ("markdown-sections"/"whole-file"), sectionHashes (per-heading SHA256 map with __preamble__ key), lastSyncedAt

## SHA256 Tracking
Content is \r\n-normalized before hashing. Markdown files with unique ## headings use section-level tracking; others use whole-file tracking.
