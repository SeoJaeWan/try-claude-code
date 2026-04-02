---
name: init-codex
description: "Symlink shared .codex assets (skills/, agents/) to a central vault directory, so every project shares one source of truth. Triggers on 'init-codex', 'codex setup', 'codex init', 'link codex', 'codex 초기화', 'codex 연결', 'codex 세팅'. Use when setting up a new project's .codex or checking existing symlink status. Works on Windows, macOS, and Linux."
model: haiku
allowed-tools: Bash, Read, Write, Glob, AskUserQuestion
---

<Skill_Guide>
<Purpose>
Link the shared portions of a project's `.codex/` directory (skills/ and agents/) to a
central vault via symlinks. Project-specific files (config.toml, artifacts/) stay local
and git-tracked.
</Purpose>

<Instructions>

# Init Codex — Shared .codex Symlink Setup

Connect `.codex/skills/` and `.codex/agents/` to a central vault directory,
enabling one-edit-all-projects sync while keeping project-specific config local.

## What Gets Shared vs What Stays Local

| Path | Shared? | Reason |
|------|---------|--------|
| `.codex/skills/` | **Yes** — symlink to vault | Reusable skill definitions, identical across projects |
| `.codex/agents/` | **Yes** — symlink to vault | Reusable agent definitions, identical across projects |
| `.codex/config.toml` | **No** — stays local | Project-specific settings (max_threads, features) |
| `.codex/artifacts/` | **No** — stays local | Project-specific outputs (brainstorm results, plans) |

## Prerequisites

- A sync-capable folder must exist and be accessible (Google Drive, Dropbox, iCloud, or any local path)

## Step 1: Detect Environment

```bash
OS="$(uname -s)"   # Darwin, Linux, MINGW64_NT-*, MSYS_NT-*, etc.
PROJECT_DIR=$(pwd)
```

| OS detection | Platform | Symlink method |
|-------------|----------|---------------|
| `Darwin` | macOS | `ln -s` (native) |
| `Linux` | Linux / WSL | `ln -s` (native) |
| `MINGW*` or `MSYS*` | Windows (Git Bash) | `MSYS=winsymlinks:nativestrict ln -s` |

## Step 2: Ask for Vault Path

There is no default vault path — always ask the user via AskUserQuestion on first run:

> "Where is your vault directory? The codex subdirectory (`{vault}/codex/`) will hold shared skills and agents. Examples:
> - Google Drive: `G:/내 드라이브/ClaudeMemory` (Win) or `~/Google Drive/ClaudeMemory` (Mac)
> - Dropbox: `~/Dropbox/ClaudeMemory`
> - Any local path works too."

Store `VAULT_BASE` from the answer, then derive `CODEX_VAULT="$VAULT_BASE/codex"`.
Verify the path is accessible before proceeding.

## Step 3: Check Current Status

```bash
file .codex/skills
file .codex/agents
```

| Status | Action |
|--------|--------|
| Valid symlink | Skip |
| Broken symlink | Delete and recreate |
| Regular directory | Backup (`.bak`) then symlink |
| Does not exist | Create symlink |

Show results as a table and confirm with AskUserQuestion before proceeding.

## Step 4: Prepare Vault Target

```bash
mkdir -p "$CODEX_VAULT/skills"
mkdir -p "$CODEX_VAULT/agents"
```

**Merge local content into vault** — for each local file that does not already exist in
the vault, copy it over. This handles both first-time bootstrap (vault empty) and the
case where local has unique files that the vault lacks. Files that already exist in the
vault are never overwritten — the vault is the source of truth.

```bash
# Copy local-only files into vault (skip files that already exist in vault)
merge_into_vault() {
  local src="$1" dst="$2"
  if [ -d "$src" ] && [ ! -L "$src" ]; then
    find "$src" -maxdepth 1 -mindepth 1 | while read -r item; do
      local name="$(basename "$item")"
      if [ ! -e "$dst/$name" ]; then
        cp -r "$item" "$dst/$name"
      fi
    done
  fi
}

merge_into_vault ".codex/skills" "$CODEX_VAULT/skills"
merge_into_vault ".codex/agents" "$CODEX_VAULT/agents"
```

## Step 5: Clear Existing Paths and Create Symlinks

Step 4 already merged local content into the vault, so nothing is lost here.

```bash
# Helper: clear a path so ln -s can write to it
# - Real file/dir → rename to .bak
# - Broken or valid symlink → delete (content is already in vault)
clear_path() {
  local p="$1"
  if [ -L "$p" ]; then
    rm "$p"
  elif [ -e "$p" ]; then
    mv "$p" "$p.bak"
  fi
}

mkdir -p .codex
clear_path ".codex/skills"
clear_path ".codex/agents"
```

**macOS / Linux:**
```bash
ln -s "$CODEX_VAULT/skills" .codex/skills
ln -s "$CODEX_VAULT/agents" .codex/agents
```

**Windows (Git Bash):**
```bash
export MSYS=winsymlinks:nativestrict
ln -s "$CODEX_VAULT/skills" .codex/skills
ln -s "$CODEX_VAULT/agents" .codex/agents
```

The `MSYS` env var tells Git Bash to create real Windows symlinks instead of file copies.
This works without admin privileges on modern Windows (Developer Mode or default policy).

If `ln -s` fails on Windows, it usually means Developer Mode is off. Guide the user:
> "Enable Developer Mode in Windows Settings > For developers, then retry."

Do NOT touch config.toml or artifacts/ — they remain local.

## Step 6: Verify

```bash
file .codex/skills
file .codex/agents
ls .codex/skills/
ls .codex/agents/
```

## Step 7: Report

```
| Item       | Status | Project Path       | → Vault Path                      |
|------------|--------|--------------------|-----------------------------------|
| skills/    | ✅/❌  | .codex/skills/     | → .../codex/skills/               |
| agents/    | ✅/❌  | .codex/agents/     | → .../codex/agents/               |
| config     | local  | .codex/config.toml | (not symlinked, project-specific) |
| artifacts  | local  | .codex/artifacts/  | (not symlinked, project-specific) |
```

## Git Tracking

Git does NOT follow directory symlinks — it stores the symlink itself as a blob containing
the target path. After symlinking `.codex/skills/` → vault, git tracks the symlink pointer,
not the individual files inside the vault.

This means:
- Files previously tracked under `.codex/skills/` will appear **deleted** after symlinking
- `git status` will show `.codex/skills` as a new symlink entry (type change)
- The repo is NOT self-contained without vault access — cloning elsewhere yields a dangling symlink

**Recommended `.gitignore` addition** — since the symlink points to an external location
that may not exist on other machines, add symlinked paths to `.gitignore`:

```
.codex/skills
.codex/agents
```

If the project needs these files in git history (e.g., for CI), keep them as real
directories and do NOT use this skill — use a copy-based sync approach instead.

## Important Notes

- Always backup existing directories before creating symlinks (rename to `.bak`)
- Always quote vault paths — they may contain spaces or non-ASCII characters
- On Windows Git Bash, always set `export MSYS=winsymlinks:nativestrict` before `ln -s`
- Do NOT symlink config.toml or artifacts/ — these are project-specific
- Do NOT overwrite vault contents if they already exist
- Do NOT touch items that are already properly linked
- Add symlinked paths to `.gitignore` — git cannot follow directory symlinks, so tracking them just records a dangling pointer

</Instructions>
</Skill_Guide>
