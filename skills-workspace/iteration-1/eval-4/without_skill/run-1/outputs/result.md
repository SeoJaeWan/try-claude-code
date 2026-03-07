# PR Creation Simulation (without_skill)

## Current State
- Branch: `0.1.0`
- Changed files: `.claude/settings.local.json` (staged), `skills/accessibility-review/SKILL.md`, `skills/web-quality-audit/SKILL.md` (unstaged), `skills-workspace/` (untracked)

## Workflow
1. Run `git status`, `git diff --stat`, `git log`
2. Current branch is `0.1.0` — need to create a feature branch first
3. Stage and commit changes
4. Push to remote
5. Create PR with `gh pr create`

## PR Title
`refactor: update skill definitions and local settings`

## PR Body
```markdown
## Summary
Updates skill definitions and local configuration.

## Changes
- Updated accessibility-review SKILL.md
- Updated web-quality-audit SKILL.md
- Modified local settings

## Test plan
- [ ] Verified locally
```

## Git Commands
```bash
git checkout -b feat/update-skills
git add .
git commit -m "refactor: update skill definitions and local settings"
git push -u origin feat/update-skills
gh pr create --title "refactor: update skill definitions and local settings" --body "..."
```
