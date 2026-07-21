# Collection Contract

`llm-script` stores evidence of script source used during Codex shell work. It is collection-only: later aggregation or script creation is a separate, user-directed workflow outside this skill.

## Storage Boundary

The default root is `${CODEX_HOME:-~/.codex}/workbench/llm-script`:

```text
config.json
workspaces.json
source/
  records/YYYY/MM/DD/<UTC timestamp>-<random suffix>.json
```

The `source` directory is the collection repository clone. Each detected entrypoint execution creates a new JSON record. Repeated executions remain separate evidence and must not be deduplicated. If one shell call executes multiple detected entrypoints, write one record per entrypoint.

The runtime hook resolves this root from a persistent `LLM_SCRIPT_ROOT` environment variable when present, then falls back to the default path. Do not use a custom staging root unless future Codex hook processes receive the same persistent environment value.

Write records atomically and never rewrite an existing record.

## Record Content

A record contains only the minimum context needed to identify the use and preserve the source snapshot. `command` is a normalized invocation: omit environment assignments, secret-bearing arguments, and inline source that is already present in `source.code`.

```json
{
  "schemaVersion": 1,
  "capturedAt": "2026-07-21T04:03:21.123Z",
  "workspace": "example-project",
  "cwd": "packages/tooling",
  "command": "node scripts/check.mjs",
  "runtime": "node",
  "source": {
    "kind": "file",
    "path": "scripts/check.mjs",
    "language": "javascript",
    "redacted": false,
    "code": "import fs from \"node:fs\";\n"
  }
}
```

`source.kind` may be `file`, `inline`, `heredoc`, or `shell`. Use a workspace-relative path for a file entrypoint and `null` when no path applies. Keep `cwd` workspace-relative and do not persist absolute home-directory paths.

Capture the actual detected entrypoint source rather than recording only a filename or invocation. Do not traverse imports or copy dependency sources.

Do not store:

- a reason or explanation for using the command;
- user prompts, transcripts, session identifiers, or model reasoning;
- the hook process environment or a separate environment dump (environment assignments that are part of captured source remain source code);
- stdout, stderr, exit status, or other execution results;
- generated summaries, rankings, catalogs, candidates, or promotion state.

## Opt-in and Runtime Behavior

Capture only when the canonical workspace path has an enabled entry in `workspaces.json`. When setup, configuration, the source clone, or a matching workspace mapping is absent, the hook exits successfully without output or writes.

The `PostToolUse` hook is best effort. Its payload may not expose a separate `exec_command` workdir, so resolve relative file entrypoints only from the session cwd or an unambiguous static `cd` in the submitted command; absolute paths remain independently resolvable. It runs after the shell call, so files deleted or changed during that call may be missed or may no longer match the executed bytes. Recover inline and heredoc source from the submitted command when safely detectable. A simple shell command that does not execute a script is not a capture candidate.

Do not guess whether a conditional `&&` or `||` branch executed. A static `cd <workspace-path> && <script>` may update the resolution basis when the directory still exists; otherwise, collect only unconditionally reached segments.

Hook execution must stay silent on success, no-op, and recoverable failure so collection does not add model-visible output.

## Source Safety

- Resolve file entrypoints canonically and capture only files inside the registered workspace. Inline and heredoc source may still be captured from the submitted command.
- Skip `.git`, `node_modules`, vendor trees, environment files, credential files, private keys, certificates, binary content, and oversized source.
- Sanitize secret-bearing command arguments and high-confidence literal secrets in source before persistence. Set `source.redacted` when source text changes.
- Skip the entire record when the source cannot be stored safely.
- Keep the source snapshot bounded; the default maximum is 128 KiB.

## Git Boundary

Capture may leave new record files in the collection clone's working tree. Neither the hook nor setup/status may pull, add, commit, push, merge, rebase, reset, clean, or stash. The user owns all synchronization and history decisions.
