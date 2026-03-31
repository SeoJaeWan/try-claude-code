---
name: init-codex
description: "Symlink shared .codex assets (skills/, agents/) to Obsidian vault on Google Drive, so every project shares one source of truth. Triggers on 'init-codex', 'codex setup', 'codex init', 'link codex', 'codex 초기화', 'codex 연결', 'codex 세팅'. Use when setting up a new project's .codex or checking existing symlink status."
model: haiku
allowed-tools: Bash, Read, Write, Glob, AskUserQuestion
---

<Skill_Guide>
<Purpose>
Link the shared portions of a project's `.codex/` directory (skills/ and agents/) to an
Obsidian vault on Google Drive via symlinks. Project-specific files (config.toml, artifacts/)
stay local and git-tracked.
</Purpose>

<Instructions>

# Init Codex — Shared .codex Symlink Setup

Connect `.codex/skills/` and `.codex/agents/` to a central Obsidian vault on Google Drive,
enabling one-edit-all-projects sync while keeping project-specific config local.

## What Gets Shared vs What Stays Local

| Path | Shared? | Reason |
|------|---------|--------|
| `.codex/skills/` | **Yes** — symlink to vault | Reusable skill definitions, identical across projects |
| `.codex/agents/` | **Yes** — symlink to vault | Reusable agent definitions, identical across projects |
| `.codex/config.toml` | **No** — stays local | Project-specific settings (max_threads, features) |
| `.codex/artifacts/` | **No** — stays local | Project-specific outputs (brainstorm results, plans) |

## Prerequisites

- Google Drive desktop must be installed and mounted
- An Obsidian vault must exist inside Google Drive

## Configuration

```
VAULT_BASE: G:\내 드라이브\ClaudeMemory
CODEX_VAULT: {VAULT_BASE}/codex
```

This path may differ per user environment. On first run, confirm via AskUserQuestion.

## Execution Steps

### Step 1: Detect Environment

```bash
PROJECT_DIR=$(pwd)
PROJECT_NAME=$(basename "$PROJECT_DIR")
VAULT_BASE="G:/내 드라이브/ClaudeMemory"
CODEX_VAULT="$VAULT_BASE/codex"
```

- Verify Google Drive mount: check if vault base path is accessible
- If inaccessible, ask for the correct path via AskUserQuestion
- Check if `.codex/` directory exists at project root

### Step 2: Check Current Status

Inspect each target independently:

```bash
file .codex/skills
file .codex/agents
```

| Status | Meaning | Action |
|--------|---------|--------|
| `symbolic link to ...` (valid target) | Already linked | Skip |
| `broken symbolic link` | Link target missing | Delete and recreate |
| Regular directory | Not yet symlinked | Backup then symlink |
| Does not exist | Fresh setup | Create symlink |

Show results to the user as a table and confirm whether to proceed via AskUserQuestion.

### Step 3: Prepare Vault Target

Create the vault-side directories if they do not exist:

```bash
mkdir -p "$CODEX_VAULT/skills"
mkdir -p "$CODEX_VAULT/agents"
```

**First-time bootstrap** — if the vault directories are empty but the project has
existing content, **move** (not copy) the project's files into the vault so nothing
is lost:

```bash
# Only if vault target is empty AND local source is a real directory (not symlink)
if [ -d .codex/skills ] && [ ! -L .codex/skills ] && [ -z "$(ls -A "$CODEX_VAULT/skills")" ]; then
  cp -r .codex/skills/* "$CODEX_VAULT/skills/"
fi
# Same pattern for agents/
```

Do NOT overwrite existing vault files — the vault is the source of truth once populated.

### Step 4: Backup and Create Symlinks

```bash
export MSYS=winsymlinks:nativestrict

# Backup existing local directories (only if they are real directories, not symlinks)
[ -d .codex/skills ] && [ ! -L .codex/skills ] && mv .codex/skills .codex/skills.bak
[ -d .codex/agents ] && [ ! -L .codex/agents ] && mv .codex/agents .codex/agents.bak

# Ensure .codex/ directory exists
mkdir -p .codex

# Create symlinks
ln -s "$CODEX_VAULT/skills" .codex/skills
ln -s "$CODEX_VAULT/agents" .codex/agents
```

- If `ln -s` fails, provide the user with manual `mklink /D` commands as a fallback
- Do NOT touch config.toml or artifacts/ — they remain local

### Step 5: Update .gitignore

Append ignore rules if not already present:

```bash
# Check and add to .gitignore
grep -qxF '.codex/skills/' .gitignore 2>/dev/null || echo '.codex/skills/' >> .gitignore
grep -qxF '.codex/agents/' .gitignore 2>/dev/null || echo '.codex/agents/' >> .gitignore
```

If these paths are already git-tracked, inform the user:

```
The following paths are currently tracked by git and need to be untracked:
  git rm --cached -r .codex/skills/ .codex/agents/
Run this command? (This only removes git tracking, not the files themselves.)
```

Wait for user confirmation before running `git rm --cached`.

### Step 6: Verify

```bash
# Confirm symlinks
file .codex/skills
file .codex/agents

# Read test — list contents through symlink
ls .codex/skills/
ls .codex/agents/
```

### Step 7: Report Results

Output the final status as a table:

```
| Item       | Status | Project Path    | -> Vault Path                          |
|------------|--------|-----------------|----------------------------------------|
| skills/    | OK     | .codex/skills/  | -> .../ClaudeMemory/codex/skills/      |
| agents/    | OK     | .codex/agents/  | -> .../ClaudeMemory/codex/agents/      |
| config     | local  | .codex/config.toml | (not symlinked, project-specific)   |
| artifacts  | local  | .codex/artifacts/  | (not symlinked, project-specific)   |
```

## Important Notes

- Always backup existing directories before creating symlinks (rename to `.bak`)
- Always quote vault paths — they contain spaces (Korean characters in path)
- Always set `export MSYS=winsymlinks:nativestrict` before running `ln -s`
- Do NOT symlink config.toml or artifacts/ — these are project-specific
- Do NOT overwrite vault contents if they already exist
- Do NOT touch items that are already properly linked
- Do NOT use `mklink /J` (Junction) — it fails on Google Drive virtual drives

---

**Integration:**
- **Related:** `init-memory` skill (same pattern, different target)
- **Next:** none
- **Final step:** Yes

</Instructions>
</Skill_Guide>
