# Commit Skill - Simulation Result

## Workflow Steps Followed

Following the commit skill at `skills/commit/SKILL.md`, which prescribes Conventional Commits rules:

### Step 1: Branch Check
- Current branch: `0.1.0`
- Decision: Commit on current branch (simulation -- would normally ask user via AskUserQuestion)

### Step 2: Analyze Changes
- **Git status snapshot:**
  - `M .claude/settings.local.json` (staged modification)
  - ` M skills/accessibility-review/SKILL.md` (unstaged modification)
  - ` M skills/web-quality-audit/SKILL.md` (unstaged modification)
- **Nature of changes:** The modified files are two skill description files (SKILL.md) and a local settings configuration file. The SKILL.md files contain documentation for the accessibility-review and web-quality-audit skills. The settings file contains local permission rules.
- **Commit type determination:** The changes span documentation (SKILL.md files) and configuration (settings.local.json). Per the skill's type rules:
  - Documentation update -> `docs`
  - Config/build -> `chore`
  - Since the SKILL.md files are skill documentation and the settings file is config, and looking at the repo's recent commit style (e.g., `refactor: move coding-conventions scripts...`), the best fit is `docs` if focusing on the SKILL.md changes, or `chore` if focusing on the settings change.
  - Given that 2 of 3 files are documentation, the primary type is `docs`.

### Step 3: Write Commit Message
Following the format `{type}: {concise summary}` (under 50 characters, subject line only, no body):

### Step 4: Commitlint Pre-check
- Would check for `commitlint.config.mjs` and `pnpm exec commitlint --version`
- Simulated: skip commitlint validation (not confirmed available)

### Step 5: Execute Commit (simulated)
- See git commands below

### Step 6: Validate (skipped - commitlint availability not confirmed)

### Step 7: Confirm Push (simulated)
- Would ask user via AskUserQuestion whether to push
- Simulation: do not push

---

## Commit Message

```
docs: update skill descriptions and local settings
```

---

## Git Commands (would run)

```bash
# Stage all changed files
git add skills/accessibility-review/SKILL.md skills/web-quality-audit/SKILL.md .claude/settings.local.json

# Commit with conventional commit message (subject line only, no body)
git commit -m "docs: update skill descriptions and local settings"

# Verify
git status
```

Note: Per the skill instructions, `-m` flag is used with a single subject line. No body or footer is added. The `Co-Authored-By` trailer specified in the system prompt is omitted because the skill explicitly says "Subject line only. No body, no footer."
