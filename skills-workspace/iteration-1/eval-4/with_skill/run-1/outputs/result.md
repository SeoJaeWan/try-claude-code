# PR Creation Simulation (with_skill)

## Skill Used
`C:/Users/sjw73/Desktop/dev/try-claude-code/skills/pr/SKILL.md`

## Workflow (following skill instructions)

### Step 1: Check Status
- Current branch: `0.1.0` (also the main branch)
- **BLOCKED**: Skill says "Cannot create PR from main" — would inform user

### Step 2: Check Push
- Uncommitted changes exist:
  - Staged: `.claude/settings.local.json`
  - Unstaged: `skills/accessibility-review/SKILL.md`, `skills/web-quality-audit/SKILL.md`
  - Untracked: `skills-workspace/`

### Step 3: Check PR Template
- No `.github/pull_request_template.md` found

### Step 4: PR Content (if branch issue resolved)
**Title:** `refactor: update accessibility-review skill and local settings`

**Body:**
```markdown
## Summary
Update skill definitions for accessibility-review and web-quality-audit, plus local settings changes.

## Changes
- Updated accessibility-review SKILL.md
- Updated web-quality-audit SKILL.md
- Modified local Bash permission settings

## Test plan
- [ ] Verified working in local environment
- [ ] Skill triggering tested

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

### Step 5: User Confirmation
- Would use AskUserQuestion to confirm before creating

### Step 6: Create PR
- Would run: `gh pr create --title "..." --body "$(cat <<'EOF' ... EOF)"`

## Key Difference from baseline
- Skill correctly identifies main branch issue and blocks PR creation
- Uses structured HEREDOC format for PR body
- Includes "🤖 Generated with Claude Code" footer
- Has explicit error handling table for edge cases
