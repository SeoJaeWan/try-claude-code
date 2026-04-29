# Helper Script Contract (v2)

The deterministic generator is `plugin/develop/skills/dev-review/scripts/generate-review-data.mjs`. The skill invokes it once per round and relies on its output without re-validating git state.

In v2 the helper produces the **final** `review-data.json` directly — no `.partial.json`, no interpretation step, no agent. Every field is deterministic.

## CLI

```bash
node {CLAUDE_PLUGIN_ROOT}/develop/skills/dev-review/scripts/generate-review-data.mjs \
  --task-slug       <string>         # required
  --plan-path       <path>           # required, must exist (used for plan_signature only)
  --worktree        <path>           # required, must exist with task_branch checked out
  --base            <branch>         # required, base branch name
  --task-branch     <branch>         # required, task branch name
  --iteration       <integer>        # required, 1 for first round, N+1 after rework
  --out             <path>           # required, where to write review-data.json
  --diffs-dir       <path>           # optional, defaults to {out-dir}/assets/diffs/
  --available-agents-dir <path>      # optional, repeatable; defaults to plugin + .claude
  --log-level       <error|warn|info|debug>  # optional, default "warn"
  --now             <iso8601>        # optional, for test reproducibility
```

All paths may be absolute or relative to `process.cwd()`. The script resolves them internally and prints the resolved paths to stderr at `info` level.

Exit codes:

- `0` — `review-data.json` written, all deterministic fields populated
- `2` — invalid arguments (missing required, malformed iteration)
- `3` — git invocation failed (worktree missing, branch missing, no commits in range)
- `4` — plan parsing failed (file missing — only used for signature)
- `5` — I/O failure (cannot write output, cannot read asset)
- `10` — unexpected internal error

Exit code `0` is the only success. Any non-zero exit must stop the runner.

## What the helper reads

1. **Plan** (`--plan-path`)
   - Parsed only to compute `plan_signature` (short SHA-256 of plan.md + linked phase files).
   - The helper does NOT extract `user_request` / `plan_summary` / `major_changes` anymore — v2 has no overview section.

2. **Worktree** (`--worktree`)
   - `git -C {worktree} rev-parse HEAD` → `task_head_sha`
   - `git -C {worktree} rev-parse --abbrev-ref HEAD` cross-checked against `--task-branch`
   - `git -C {worktree} log --format="%H%x00%s%x00%b%x00%an%x00%ae%x00%aI" {base}..HEAD` → commits in order
   - Per commit: `git -C {worktree} show --format= --numstat {sha}` → files_changed additions/deletions
   - Per commit: `git -C {worktree} show --format= --name-status {sha}` → files_changed kinds (A/M/D/R)
   - Per commit: `git -C {worktree} diff {parent}..{sha}` → written as raw `.diff` to `--diffs-dir`. The browser parses these via `diff2html` on demand.
   - Per commit binary detection: `git -C {worktree} diff --numstat {parent}..{sha}` returns `-\t-\tpath` for binaries → `binary: true`.

3. **Available agents** (`--available-agents-dir`, repeatable)
   - Defaults (in order): `${workspaceRoot}/plugin/develop/agents/*.md`, `${workspaceRoot}/.claude/agents/*.md`, `${CLAUDE_PLUGIN_ROOT}/develop/agents/*.md`, `${CLAUDE_PLUGIN_ROOT}/agents/*.md`.
   - Each `*.md` with YAML frontmatter containing `name` and `description` becomes an entry in `available_agents[]`, sorted by name.
   - Files without valid frontmatter are skipped with a `warn` log.

The helper does NOT read prior `feedback.json` / `review-history.json`. v2 has no `addressed_by_this_commit` or cross-round linking; the skill handles round boundaries directly when it merges feedback from the previous round.

## What the helper writes

1. `--out` (`review-data.json`) — final, deterministic output
   - All schema-v2 fields populated.
   - No `.partial` suffix; the file is consumed directly by browser and skill.

2. `{diffs-dir}/{short_sha}.diff` (one per commit)
   - Full unified diff for that commit vs its parent.
   - For root commits (no parent), `git show --format= {sha}` is used.
   - No git header stripping; diff2html handles it.

3. `{diffs-dir}/_index.json` (single file)
   - Map `{ "short_sha": "relative_path_to_diff" }` — convenience.

The helper does NOT touch `feedback.json` or `review-history.json`. The skill owns those.

## Stale schema cleanup

Before writing, the helper checks `--out`'s parent folder. If `review-data.json` already exists with `schema_version < 2`, the helper:

1. Logs `warn: stale schema_version detected, wiping data folder`
2. Deletes `review-data.json`, `feedback.json`, `review-history.json`, and `assets/diffs/` recursively (within the data folder; never escapes).
3. Recreates `assets/diffs/` and proceeds.

This is the one-time migration path. v2-or-newer schemas pass through untouched.

## Determinism and idempotency

- Given the same inputs, byte-identical output. The skill diffs outputs between rounds to decide whether the package actually changed.
- Arrays sorted deterministically: `available_agents` by name, `files_changed` by path. `commits[]` ordered chronologically (matches `git log --reverse`, oldest first).
- Timestamps: `generated_at` accepts `--now <iso8601>` for tests; production uses `new Date().toISOString()`.

## Logging and diagnostics

Structured stderr lines at `info` and above:

```
[dev-review-gen] info worktree=/abs/... task_head_sha=abc123...
[dev-review-gen] info commits_in_range=4 plan_signature=a3f1c...
[dev-review-gen] warn stale schema_version=1 detected, wiping data folder
[dev-review-gen] info wrote review-data.json (12 KB) and 4 diffs
```

stdout is reserved for future machine-readable output and MUST stay empty.

## Guardrails

- Do NOT write anywhere other than `--out`, `--diffs-dir`, and (for stale-schema cleanup) within the data folder.
- Do NOT shell out to anything except `git`.
- Do NOT partially write `--out` on error. Write to a temp file and rename on success.
- Do NOT let a parse failure on one commit block the whole output — log a `warn`, mark the file as `binary: true` if applicable, and continue.
- Do NOT populate any v1-only fields (`overview`, `cards`, `_fallback_cards`, `tests_added`, `deviations`, `addressed_by_this_commit`, `final`). Schema is v2.
- Do NOT read or mutate `feedback.json` / `review-history.json`. The skill owns those files.
