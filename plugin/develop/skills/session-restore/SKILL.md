---
name: session-restore
description: Restore worktree context from a previous session into the current session by scanning git worktrees on disk. Triggers on 'resume', 'continue', '이어서', '복구', '워크트리 복구'.
---

# session-restore skill

Scan existing git worktrees on disk and register them into the current session so the stop-review gate can track them.

## When to use

User says "resume", "continue", "이어서", "복구", or starts a session after an unexpected close and needs to re-attach worktrees.

## Steps

### 1. Run the restore script

```bash
node plugin/develop/scripts/session-restore.mjs
```

The script reads `$CODEX_COMPANION_SESSION_ID` automatically and calls `addWorktree()` for each discovered non-main worktree.

If the project root is not `$PWD`, pass it explicitly:

```bash
node plugin/develop/scripts/session-restore.mjs --cwd /path/to/project
```

### 2. Parse the output

The script prints a single JSON line:

```json
{ "registered": [ { "path": "...", "branch": "...", "lastCommit": "..." } ] }
```

### 3. Report to the user

**If `registered` is non-empty**, show each worktree:

```
워크트리 {N}개가 현재 세션에 등록되었습니다:

- {path}  (branch: {branch})
  마지막 커밋: {lastCommit}
```

Then remind: "stop-review gate가 이 worktree를 이제 감시합니다."

**If `registered` is empty**, reply:

```
현재 프로젝트에 추가 worktree가 없습니다. 복구할 내용이 없어요.
```

**If `error` field is present** (e.g. session ID not set), surface the error message directly.

## Do NOT

- Do NOT create new worktrees or branches.
- Do NOT modify any files in the worktrees.
- Do NOT run `git checkout` or switch branches.
- Do NOT ask for confirmation before registering — just register and report.
