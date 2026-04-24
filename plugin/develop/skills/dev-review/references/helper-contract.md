# Helper Script Contract

The deterministic generator is `plugin/develop/skills/dev-review/scripts/generate-review-data.mjs`. The skill invokes it once per round and must be able to rely on the output without re-validating git state.

This contract defines the CLI, what the script reads, what it writes, and what it guarantees. Any change to the contract is a breaking change — update the consumers in this skill's SKILL.md and runner Step 4 together.

## CLI

```bash
node {CLAUDE_PLUGIN_ROOT}/develop/skills/dev-review/scripts/generate-review-data.mjs \
  --task-slug       <string>         # required
  --plan-path       <path>           # required, must exist
  --worktree        <path>           # required, must exist and contain task_branch checked out
  --base            <branch>         # required, base branch name
  --task-branch     <branch>         # required, task branch name
  --iteration       <integer>        # required, 1 for first round, N+1 after rework
  --out             <path>           # required, where to write review-data.partial.json
  --diffs-dir       <path>           # optional, defaults to {out-dir}/assets/diffs/
  --available-agents-dir <path>      # optional, can be repeated; defaults to searching
                                     #   plugin/develop/agents/ and .claude/agents/
  --prior-feedback  <path-or-empty>  # optional; previous round's feedback.json
  --prior-history   <path-or-empty>  # optional; previous round's review-history.json
  --log-level       <error|warn|info|debug>  # optional, default "warn"
```

All paths may be absolute or relative to `process.cwd()`. The script resolves them to absolute internally and prints the resolved paths to stderr at `info` level.

Exit codes:

- `0` — `review-data.partial.json` written, deterministic fields populated, fallback cards present
- `2` — invalid arguments (missing required, malformed iteration, etc.)
- `3` — git invocation failed (worktree missing, branch missing, no commits in range)
- `4` — plan parsing failed (file missing, malformed)
- `5` — I/O failure (cannot write output, cannot read asset)
- `10` — unexpected internal error

Exit code `0` is the only success. Any non-zero exit must stop the runner; partial output is never trustworthy.

## What the helper reads

1. **Plan** (`--plan-path`)
   - `plan.md` top-level text for `overview.user_request` and `overview.plan_summary`
   - `plan.md` `**Branch:**` header to cross-check `--task-branch`
   - Phase index table (`| # | Phase | Agent |`) for agent-track inference (used in `change_map` track assignment heuristic)
   - Linked phase files (`phases/NN-slug.md`) for `owner_agent` and `file_impacts` extraction
   - Every included file contributes to `plan_signature` (short SHA-256 of concatenated contents)

2. **Worktree** (`--worktree`)
   - `git -C {worktree} rev-parse HEAD` → `task_head_sha`
   - `git -C {worktree} rev-parse --abbrev-ref HEAD` cross-checked against `--task-branch`
   - `git -C {worktree} log --format="%H%x00%s%x00%b%x00%an%x00%ae%x00%aI" {base}..HEAD` → commits in order
   - `git -C {worktree} diff --numstat {base}..HEAD` → total_files_changed / change_map totals
   - Per commit: `git -C {worktree} show --format= --numstat {sha}` → files_changed additions/deletions
   - Per commit: `git -C {worktree} show --format= --name-status {sha}` → files_changed kinds (A/M/D/R)
   - Per commit: `git -C {worktree} diff {parent}..{sha}` → parsed into `diff_hunks[]`, also written as raw `.diff` to `--diffs-dir`
   - `git -C {worktree} diff --name-status {base}..HEAD` → `final.merge_impact`

3. **Available agents** (`--available-agents-dir`, repeatable)
   - Defaults: `plugin/develop/agents/*.md` and `.claude/agents/*.md` relative to `CLAUDE_PLUGIN_ROOT` and workspace root
   - Each `*.md` with YAML frontmatter containing `name` and `description` becomes an entry in `available_agents[]`
   - Files without valid frontmatter are skipped with a `warn` log

4. **Prior round artifacts** (`--prior-feedback`, `--prior-history`, optional)
   - When `--iteration > 1`, these should be the paths to the previous round's artifacts (typically the live `feedback.json` / `review-history.json` under the same `plans/{task_slug}/dev-review/`)
   - Used to compute `commits[].addressed_by_this_commit[]` and to emit the upcoming round's entry skeleton into history (the skill finalizes the round summary in Step 5)

## What the helper writes

1. `--out` (`review-data.partial.json`)
   - Every deterministic field from the schema, populated
   - `commits[].cards` is **empty** (the interpretation agent fills it)
   - `commits[].tests_added` is **empty**
   - `commits[].deviations` is **empty**
   - `overview.plan_vs_result`, `deviations_summary`, `open_risks` are **empty**
   - `overview.interpretation_skipped` is `false` (the skill flips it to `true` if the agent fails)
   - Every commit has a non-empty `_fallback_cards` array, at minimum one card per commit

2. `{diffs-dir}/{short_sha}.diff` (one per commit)
   - Full unified diff for that commit vs its parent in the task branch
   - No git header stripping; the UI hides what it doesn't need

3. `{diffs-dir}/_index.json` (single file)
   - Simple map `{ "short_sha": "relative_path_to_diff" }` — convenient for the UI and future tooling

The helper does not touch `feedback.json`, `review-history.json`, or the HTML assets. The skill owns those.

## Determinism and idempotency

- Given the same inputs, the helper produces byte-identical output. This is critical because the skill diffs outputs between rounds to decide whether the package actually changed.
- The helper sorts arrays deterministically where order is not semantically meaningful: `change_map` by track name, `available_agents` by agent name, `files_changed` by path.
- Timestamps in the output (`generated_at`) break determinism. The helper accepts `--now <iso8601>` for test reproducibility; production runs use `new Date().toISOString()`.

## Fallback card rules

Every commit MUST end up with at least one card in the final `review-data.json`. The helper ensures this by producing `_fallback_cards`:

- **Minimum card** (always emitted): title = "이 commit은 N개 파일을 수정했습니다 (+X/-Y)" where N, X, Y come from `files_changed`. Description = "자동 생성된 요약. 파일 변경 목록과 전체 diff를 참고하세요." Evidence = empty. `fallback: true`.

- **Supplementary cards** (emitted when obviously derivable):
  - One card per changed test file: title = "테스트 변경: {path}", evidence = first 20 lines of the file's post-change content
  - One card per added file with size ≥ 50 lines: title = "새 파일: {path}", evidence = first 30 lines of the file
  - Capped at 3 supplementary cards to avoid fallback noise

The skill only uses `_fallback_cards` when the interpretation agent produces no cards for that commit. Partial interpretation (e.g., 2 agent cards + fallback supplementaries) is not mixed; it's agent-or-fallback per commit.

## Addressed-by-this-commit computation

When `--prior-history` points to a populated file and the latest round has at least one `needs-change` item, for each new commit (commits whose `sha` is not in the prior round's `resulting_task_head_sha` chain):

- For each prior `items[]` with `user_status == "needs-change"` and `target.file`:
  - If this commit's `files_changed[].path === prior.target.file`: add an `addressed_by_this_commit` entry with `resolution_evidence` drawn from the first hunk touching the target line range, falling back to the first hunk of that file.

- For prior cards with `target === null`, no automatic addressing. The reviewer must manually mark the prior card approved.

The helper emits `addressed_by_this_commit` on the commit side only. The corresponding "still-open vs addressed" badge on the prior card side is computed by the UI from the union of all commits' `addressed_by_this_commit`.

## Logging and diagnostics

The helper writes structured lines to stderr at `info` and above:

```
[dev-review-gen] info worktree=abs path=/..., task_head_sha=abc123...
[dev-review-gen] info commits_in_range=4, plan_signature=a3f1c...
[dev-review-gen] warn phase file missing: plans/.../phases/03-cleanup.md — skipping
[dev-review-gen] info wrote review-data.partial.json (23 KB) and 4 diffs
```

stdout is reserved for future machine-readable output and MUST stay empty in the current version. The skill ignores stdout.

## Guardrails

- Do NOT write anywhere other than `--out` and `--diffs-dir`.
- Do NOT shell out to anything except `git` (ideally via an allowlist of args).
- Do NOT embed the interpretation agent's output; this script is the deterministic half.
- Do NOT partially write `--out` on error. Write to a temp file and rename on success.
- Do NOT let a parse failure on one commit block the whole output — log a `warn`, emit `_fallback_cards` for that commit with an extra "diff parse failed" hint, and continue.
- Do NOT populate `cards[]`, `tests_added[]`, `deviations[]`, or any of the three interpretation overview fields. Those belong to the agent.
- Do NOT mutate `prior_feedback` or `prior_history`. Treat them strictly as read-only inputs.
