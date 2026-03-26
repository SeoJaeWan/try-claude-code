---
name: init-memory
description: "Initialize Claude Code memory symlinks to Obsidian vault on Google Drive. Triggers on 'init-memory', 'memory setup', 'memory init', 'link memory', '메모리 초기화', '메모리 연결', '메모리 세팅'. Use this when setting up memory sync for a new project or checking existing symlink status."
model: haiku
allowed-tools: Bash, Read, Write, Glob, AskUserQuestion
---

<Skill_Guide>
<Purpose>
Link Claude Code's 3-layer memory (User/Project/Auto) to an Obsidian vault on Google Drive via symlinks.
Skip items that are already linked. Only set up missing or broken ones.
</Purpose>

<Instructions>

# Init Memory — Obsidian + Google Drive Memory Sync

Connect Claude Code memory to an Obsidian vault on Google Drive via symlinks,
enabling cross-device sync and visual management through Obsidian.

## Prerequisites

- Google Drive desktop must be installed and mounted
- An Obsidian vault must exist inside Google Drive

## Configuration

```
VAULT_BASE: G:\내 드라이브\ClaudeMemory
```

This path may differ per user environment. On first run, confirm via AskUserQuestion.

## 3-Layer Memory Structure

| Layer | Claude Code Path | Obsidian Target Path |
|-------|-----------------|---------------------|
| User memory (global) | `~/.claude/CLAUDE.md` | `{VAULT_BASE}/user-memory/CLAUDE.md` |
| Project memory | `./.claude/CLAUDE.md` | `{VAULT_BASE}/projects/{PROJECT_NAME}/CLAUDE.md` |
| Auto-memory | `~/.claude/projects/{PROJECT_KEY}/memory/` | `{VAULT_BASE}/projects/{PROJECT_NAME}/auto-memory/` |

- **PROJECT_NAME**: Current directory's folder name (e.g., `try-claude-code`)
- **PROJECT_KEY**: Encoded path under `~/.claude/projects/` (e.g., `C--Users-USER-Desktop-dev-try-claude-code`)

## Execution Steps

### Step 1: Detect Environment

```bash
# Current project info
PROJECT_DIR=$(pwd)
PROJECT_NAME=$(basename "$PROJECT_DIR")

# Detect PROJECT_KEY — find matching folder under ~/.claude/projects/
# Convert pwd path to C--Users-USER-... format and match
```

- Verify Google Drive mount: check if `G:\` or user-specified path is accessible
- If inaccessible, ask for the correct path via AskUserQuestion

### Step 2: Check Current Status

Check the current state of all 3 items:

```bash
# For each path
file <path>
```

| Status | Meaning | Action |
|--------|---------|--------|
| `symbolic link to ...` (valid) | Already linked | Skip |
| `broken symbolic link` | Link is broken | Delete and recreate |
| Regular file/folder exists | Not a symlink | Backup then create symlink |
| File not found | Not set up | Create new |

Show results to the user as a table and confirm whether to proceed via AskUserQuestion.

### Step 3: Create Target Folders/Files in Obsidian Vault

Create Google Drive target paths if they do not exist:

```bash
mkdir -p "{VAULT_BASE}/user-memory"
mkdir -p "{VAULT_BASE}/projects/{PROJECT_NAME}/auto-memory"
touch "{VAULT_BASE}/user-memory/CLAUDE.md"        # Empty file if new
touch "{VAULT_BASE}/projects/{PROJECT_NAME}/CLAUDE.md"
```

Do NOT overwrite existing files.

### Step 4: Create Symlinks

Use `MSYS=winsymlinks:nativestrict` with `ln -s` in Git Bash.
No admin privileges required. Works with Google Drive virtual drives.

```bash
export MSYS=winsymlinks:nativestrict

# File symlinks (User memory, Project memory)
ln -s "G:/내 드라이브/ClaudeMemory/user-memory/CLAUDE.md" "/c/Users/USER/.claude/CLAUDE.md"
ln -s "G:/내 드라이브/ClaudeMemory/projects/{PROJECT_NAME}/CLAUDE.md" "{PROJECT_PATH}/.claude/CLAUDE.md"

# Directory symlink (Auto-memory)
ln -s "G:/내 드라이브/ClaudeMemory/projects/{PROJECT_NAME}/auto-memory" "/c/Users/USER/.claude/projects/{PROJECT_KEY}/memory"
```

- If a regular file/folder already exists, rename it to `{original_name}.bak` before creating the symlink
- If `ln -s` fails, provide the user with manual `mklink` commands to run in an admin cmd as a fallback

### Step 5: Verify

Verify all 3 symlinks:

```bash
# For each symlink
file <path>                          # Confirm symbolic link
echo "test" > <path>/test.txt       # Write test (auto-memory only)
cat <google_drive_path>/test.txt    # Read verification
rm <path>/test.txt                  # Cleanup
```

### Step 6: Report Results

Output the final status as a table:

```
| Layer          | Status | Claude Code Path         | → Obsidian Path                |
|----------------|--------|--------------------------|--------------------------------|
| User memory    | ✅     | ~/.claude/CLAUDE.md      | → .../user-memory/CLAUDE.md    |
| Project memory | ✅     | ./.claude/CLAUDE.md      | → .../projects/xxx/CLAUDE.md   |
| Auto-memory    | ✅     | .../memory/              | → .../projects/xxx/auto-memory/|
```

## Important Notes

- Always backup existing files before creating symlinks (rename to `.bak`)
- Always quote Google Drive paths — they may contain spaces
- Always set `export MSYS=winsymlinks:nativestrict` before running `ln -s`
- Do NOT touch items that are already properly linked
- Do NOT use `mklink` (cmd) or Junction (`mklink /J`) — they fail on Google Drive virtual drives

---

**Integration:**
- **Previous:** N/A (user-invoked directly)
- **Next:** none
- **Final step:** Yes

</Instructions>
</Skill_Guide>
