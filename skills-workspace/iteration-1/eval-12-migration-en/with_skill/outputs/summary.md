# migration Skill Evaluation (English prompt, with_skill)

## Skill Read: skills/migration/SKILL.md

## SHA256 Hash Comparison
- computeHash() normalizes line endings, compares currentHash vs existingEntry.hash vs pluginHash
- 14 markdown files: markdown-sections mode
- 10 other files: whole-file mode

## Section-level Merge
- Preserves user-edited sections
- Updates unchanged sections to latest plugin defaults
- Adds new sections/files, never deletes local-only content

## File Counts
- 24 plugin references total
- Prerequisite: project.json must exist (run init-try first)

## managedReferences Hash Updates
- Each entry: path, hash, mergeMode, sectionHashes, lastSyncedAt
