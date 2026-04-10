---
name: init-memory
description: "Initialize Claude Code memory symlinks to an external vault (Obsidian, Google Drive, Dropbox, etc.). Triggers on 'init-memory', 'memory setup', 'memory init', 'link memory', '메모리 초기화', '메모리 연결', '메모리 세팅'. Use this when setting up memory sync for a new project or checking existing symlink status. Works on Windows, macOS, and Linux."
model: haiku
allowed-tools: Bash, Read, Write, Glob, AskUserQuestion
---

<Skill_Guide>
<Purpose>
Link Claude Code's 3-layer memory (User/Project/Auto) to an external vault via symlinks.
Skip items that are already linked. Only set up missing or broken ones.
</Purpose>

<Instructions>

# Init Memory — External Vault Memory Sync

Connect Claude Code memory to an external vault (Obsidian, Google Drive, Dropbox, iCloud, etc.)
via symlinks, enabling cross-device sync and visual management.

## Prerequisites

- A sync-capable folder must exist and be accessible (Google Drive, Dropbox, iCloud, or any local path)
- The vault directory structure will be created automatically if missing

## Step 1: Detect Environment

Detect OS and shell to determine the symlink strategy:

```bash
OS="$(uname -s)"   # Darwin, Linux, MINGW64_NT-*, MSYS_NT-*, etc.
```

| OS detection | Platform | Symlink method |
|-------------|----------|---------------|
| `Darwin` | macOS | `ln -s` (native) |
| `Linux` | Linux / WSL | `ln -s` (native) |
| `MINGW*` or `MSYS*` | Windows (Git Bash) | `MSYS=winsymlinks:nativestrict ln -s` |

Collect project info:

```bash
PROJECT_DIR=$(pwd)
```

Compute `PROJECT_KEY` — Claude Code encodes the absolute OS-native path by replacing
every non-alphanumeric character (`:`, `\`, `/`, spaces, etc.) with `-`.

**Windows (Git Bash):**
```bash
# Git Bash pwd returns POSIX paths like /c/Users/USER/...
# Convert to native Windows path first, then encode
native_path=$(cygpath -w "$PROJECT_DIR")          # C:\Users\USER\Desktop\dev\my-project
PROJECT_KEY=$(echo "$native_path" | sed 's/[^a-zA-Z0-9]/-/g')
# Result: C--Users-USER-Desktop-dev-my-project
```

**macOS / Linux:**
```bash
PROJECT_KEY=$(echo "$PROJECT_DIR" | sed 's/[^a-zA-Z0-9]/-/g')
# /Users/foo/dev/my-project → -Users-foo-dev-my-project
```

**Validation** — if `~/.claude/projects/` already exists, verify the computed key
matches an existing folder. If it does not match and an existing folder clearly
corresponds to this project (e.g., same trailing segment), ask the user to confirm
via AskUserQuestion which key to use. Never silently proceed with an empty or
unverified PROJECT_KEY.

## Step 2: Ask for Vault Path

There is no default vault path — always ask the user via AskUserQuestion on first run:

> "Where is your vault directory? Examples:
> - Google Drive: `G:/내 드라이브/ClaudeMemory` (Win) or `~/Google Drive/ClaudeMemory` (Mac)
> - Dropbox: `~/Dropbox/ClaudeMemory`
> - iCloud: `~/Library/Mobile Documents/com~apple~CloudDocs/ClaudeMemory`
> - Any local path works too."

Store this as `VAULT_BASE`. Verify the path is accessible before proceeding.

## Step 3: 3-Layer Memory Structure

| Layer | Claude Code Path | Storage | Git tracked? |
|-------|-----------------|---------|-------------|
| User memory (global) | `~/.claude/CLAUDE.md` | Vault symlink → `{VAULT_BASE}/user-memory/CLAUDE.md` | No |
| Project memory | `./.claude/CLAUDE.md` | **Direct file in repo** (no symlink) | **Yes** |
| Auto-memory | `~/.claude/projects/{PROJECT_KEY}/memory/` | Vault symlink → `{VAULT_BASE}/projects/{PROJECT_KEY}/auto-memory/` | No |

**Project memory is NOT symlinked.** It lives directly in the repo as `.claude/CLAUDE.md`
so the team can share project context via git. The `.gitignore` should allow it:

```gitignore
.claude/*
!.claude/CLAUDE.md
```

## Step 4: Check Current Status

Check each layer's current state:

**User memory & Auto-memory (symlink-based):**

```bash
# For each of the 2 symlink paths, check status
# macOS/Linux: file <path> or ls -la <path>
# Windows Git Bash: file <path>
```

| Status | Action |
|--------|--------|
| Valid symlink | Skip |
| Broken symlink | Delete and recreate |
| Regular file/folder exists | Backup (rename to `.bak`) then create symlink |
| Does not exist | Create new |

**Project memory (direct file, NOT symlinked):**

```bash
# Check .claude/CLAUDE.md
file "$PROJECT_DIR/.claude/CLAUDE.md"
```

| Status | Action |
|--------|--------|
| Regular file exists | Skip (already correct) |
| Symlink (legacy) | Replace with real file: read target content, delete symlink, write content directly |
| Does not exist | Create with project name header |

Also verify `.gitignore` contains the pattern to track it:
```bash
grep -q '!.claude/CLAUDE.md' "$PROJECT_DIR/.gitignore"
```
If missing, add `.claude/*` and `!.claude/CLAUDE.md` lines.

Show results as a table and confirm with AskUserQuestion before proceeding.

## Step 5: Check for Legacy Vault Layout

Older versions of this skill stored project data under `{VAULT_BASE}/projects/{basename}`
(e.g., `projects/try-claude-code/`). The current layout uses `PROJECT_KEY` (full-path
encoding) to avoid collisions between repos that share the same directory name.

```bash
PROJECT_BASENAME=$(basename "$PROJECT_DIR")
LEGACY_DIR="$VAULT_BASE/projects/$PROJECT_BASENAME"
TARGET_DIR="$VAULT_BASE/projects/$PROJECT_KEY"
```

Skip this step only if LEGACY_DIR does not exist — meaning there is nothing to migrate.
If LEGACY_DIR and TARGET_DIR are the same path (e.g., PROJECT_BASENAME equals PROJECT_KEY),
also skip.

If LEGACY_DIR exists, always show its contents and ask the user via AskUserQuestion,
regardless of whether TARGET_DIR already exists. The legacy directory may contain files
from this project, other repos that shared the same basename, or both. Automated decisions
about this data are not safe.

Build the prompt dynamically based on whether TARGET_DIR exists:

**When TARGET_DIR does NOT exist** (offer all 3 options):

> "Found legacy vault data at `{LEGACY_DIR}`:
>
> {list files with sizes}
>
> This may belong to this project, another repo with the same folder name, or both.
> The new unique path for this project is `{TARGET_DIR}` (does not exist yet).
>
> Options:
> 1. **Adopt** — rename `{LEGACY_DIR}` → `{TARGET_DIR}` (use ONLY if no other repo shares this legacy path)
> 2. **Copy** — copy into new `{TARGET_DIR}`, keep legacy in place for other repos
> 3. **Skip** — start fresh with an empty vault directory"

**When TARGET_DIR already exists** (Adopt is NOT safe — `mv` into an existing directory
creates a nested subdirectory instead of a rename, corrupting the layout):

> "Found legacy vault data at `{LEGACY_DIR}`:
>
> {list files with sizes}
>
> Target `{TARGET_DIR}` already exists with: {list its files}
>
> Options:
> 1. **Copy** — copy legacy files that don't exist in target, keep legacy in place
> 2. **Skip** — leave everything as-is"

Execute the user's choice and record the outcome for the final report:

- **Adopt** (only when TARGET_DIR does not exist):
  ```bash
  mv "$LEGACY_DIR" "$TARGET_DIR"
  ```
- **Copy**:
  ```bash
  mkdir -p "$TARGET_DIR"
  for item in "$LEGACY_DIR"/*; do
    [ -e "$item" ] || continue
    name="$(basename "$item")"
    if [ -e "$TARGET_DIR/$name" ]; then
      echo "SKIPPED (already in target): $name"
    else
      cp -r "$item" "$TARGET_DIR/$name"
      echo "COPIED: $name"
    fi
  done
  ```
  Show the user which files were copied and which were skipped.
- **Skip**: do nothing.

## Step 6: Create Vault Targets & Project Memory

### 6a. Vault directories (User memory & Auto-memory only)

```bash
mkdir -p "$VAULT_BASE/user-memory"
mkdir -p "$VAULT_BASE/projects/$PROJECT_KEY/auto-memory"
```

Seed the vault from local files. There are three cases per item:

| Vault file | Local file | Action |
|-----------|-----------|--------|
| Missing | Missing | Create empty file in vault |
| Missing | Exists (real) | Copy local → vault |
| Exists | Missing | Nothing to do |
| Exists | Exists (real) | Compare; if different, ask user which to keep |

**User memory:**
```bash
LOCAL="$HOME/.claude/CLAUDE.md"
VAULT="$VAULT_BASE/user-memory/CLAUDE.md"
if [ ! -f "$VAULT" ]; then
  if [ -f "$LOCAL" ] && [ ! -L "$LOCAL" ]; then cp "$LOCAL" "$VAULT"; else touch "$VAULT"; fi
elif [ -f "$LOCAL" ] && [ ! -L "$LOCAL" ] && ! diff -q "$LOCAL" "$VAULT" > /dev/null 2>&1; then
  # Vault and local differ — ask user which to keep
  # Show: AskUserQuestion with a brief diff summary
  # Options: (a) Keep vault version, (b) Overwrite vault with local, (c) Keep both (save local as CLAUDE.md.local in vault)
fi
```

**Auto-memory (directory)** — merge local-only files into vault, never overwrite:
```bash
LOCAL_DIR="$HOME/.claude/projects/$PROJECT_KEY/memory"
VAULT_DIR="$VAULT_BASE/projects/$PROJECT_KEY/auto-memory"
if [ -d "$LOCAL_DIR" ] && [ ! -L "$LOCAL_DIR" ]; then
  for item in "$LOCAL_DIR"/*; do
    [ -e "$item" ] || continue
    name="$(basename "$item")"
    if [ ! -e "$VAULT_DIR/$name" ]; then
      cp -r "$item" "$VAULT_DIR/$name"
    elif ! diff -q "$item" "$VAULT_DIR/$name" > /dev/null 2>&1; then
      echo "CONFLICT: $name differs between local and vault"
      # Ask user which version to keep via AskUserQuestion
    fi
  done
fi
```

### 6b. Project memory (direct file, NO vault sync)

Project memory is stored directly in the repo at `.claude/CLAUDE.md` and tracked by git.
Do NOT copy it to the vault or create a symlink.

```bash
PROJECT_CLAUDE="$PROJECT_DIR/.claude/CLAUDE.md"
mkdir -p "$PROJECT_DIR/.claude"

if [ -L "$PROJECT_CLAUDE" ]; then
  # Legacy symlink — convert to real file
  CONTENT=$(cat "$PROJECT_CLAUDE" 2>/dev/null || echo "")
  rm "$PROJECT_CLAUDE"
  echo "$CONTENT" > "$PROJECT_CLAUDE"
  echo "Converted project CLAUDE.md from symlink to real file"
elif [ ! -f "$PROJECT_CLAUDE" ]; then
  PROJECT_NAME=$(basename "$PROJECT_DIR")
  echo "# Project Memory - $PROJECT_NAME" > "$PROJECT_CLAUDE"
  echo "Created new project CLAUDE.md"
fi
```

Ensure `.gitignore` allows tracking:
```bash
if ! grep -q '!.claude/CLAUDE.md' "$PROJECT_DIR/.gitignore" 2>/dev/null; then
  # Add .claude/* and !.claude/CLAUDE.md if not present
  echo -e ".claude/*\n!.claude/CLAUDE.md" >> "$PROJECT_DIR/.gitignore"
fi
```

## Step 7: Clear Existing Paths and Create Symlinks

Before creating each symlink, remove whatever currently occupies that path.
Steps 5–6 already migrated and seeded content to the vault, so nothing is lost here.

```bash
# Helper: clear a path so ln -s can write to it
# - Real file/dir → rename to .bak
# - Broken or valid symlink → delete (target is already in vault)
clear_path() {
  local p="$1"
  if [ -L "$p" ]; then
    rm "$p"
  elif [ -e "$p" ]; then
    mv "$p" "$p.bak"
  fi
}
```

Ensure parent directories exist (critical for fresh setups where `~/.claude/` or
the project key directory may not exist yet):

```bash
mkdir -p "$HOME/.claude"
mkdir -p "$HOME/.claude/projects/$PROJECT_KEY"
```

Only create symlinks for **User memory** and **Auto-memory** (NOT project memory):

**macOS / Linux:**
```bash
clear_path "$HOME/.claude/CLAUDE.md"
clear_path "$HOME/.claude/projects/$PROJECT_KEY/memory"

ln -s "$VAULT_BASE/user-memory/CLAUDE.md" "$HOME/.claude/CLAUDE.md"
ln -s "$VAULT_BASE/projects/$PROJECT_KEY/auto-memory" "$HOME/.claude/projects/$PROJECT_KEY/memory"
```

**Windows (Git Bash):**
```bash
export MSYS=winsymlinks:nativestrict

clear_path "$HOME/.claude/CLAUDE.md"
clear_path "$HOME/.claude/projects/$PROJECT_KEY/memory"

ln -s "$VAULT_BASE/user-memory/CLAUDE.md" "$HOME/.claude/CLAUDE.md"
ln -s "$VAULT_BASE/projects/$PROJECT_KEY/auto-memory" "$HOME/.claude/projects/$PROJECT_KEY/memory"
```

**Project memory** (`.claude/CLAUDE.md`) is handled in Step 6b as a direct file — no symlink.

The `MSYS` env var tells Git Bash to create real Windows symlinks instead of file copies.
This works without admin privileges on modern Windows (Developer Mode or default policy).

If `ln -s` fails on Windows, it usually means Developer Mode is off. Guide the user:
> "Enable Developer Mode in Windows Settings > For developers, then retry."

## Step 8: Verify

```bash
# Confirm symlinks resolve (user memory & auto-memory)
file ~/.claude/CLAUDE.md
file ~/.claude/projects/$PROJECT_KEY/memory

# Confirm project memory is a real file (NOT a symlink)
file .claude/CLAUDE.md

# Write-through test (auto-memory directory)
echo "test" > ~/.claude/projects/$PROJECT_KEY/memory/test.txt
cat "$VAULT_BASE/projects/$PROJECT_KEY/auto-memory/test.txt"
rm ~/.claude/projects/$PROJECT_KEY/memory/test.txt

# Verify .gitignore allows project CLAUDE.md
grep '!.claude/CLAUDE.md' .gitignore
```

## Step 9: Report

Include all actions taken so the user has a full record.

**Memory status:**
```
| Layer          | Status | Path                     | Storage                        |
|----------------|--------|--------------------------|--------------------------------|
| User memory    | ✅/❌  | ~/.claude/CLAUDE.md      | Vault symlink                  |
| Project memory | ✅/❌  | ./.claude/CLAUDE.md      | Direct file (git tracked)      |
| Auto-memory    | ✅/❌  | .../memory/              | Vault symlink                  |
```

**Migration summary** (only if Step 5 ran):
- Legacy path found: `{LEGACY_DIR}`
- User chose: Adopt / Copy / Skip
- Files copied: {list} / Files skipped: {list}
- Legacy directory: removed (Adopt) / still exists at `{path}` (Copy/Skip)

**Content conflicts** (only if Step 6 found differences):
- Which files differed between local and vault
- Which version was kept for each

## Important Notes

- Always backup existing files before creating symlinks (rename to `.bak`)
- Always quote vault paths — they may contain spaces or non-ASCII characters
- On Windows Git Bash, always set `export MSYS=winsymlinks:nativestrict` before `ln -s`
- Do NOT touch items that are already properly linked
- Do NOT overwrite existing vault files — the vault is the source of truth once populated

</Instructions>
</Skill_Guide>
