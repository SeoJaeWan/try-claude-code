# Dev CLI Context

This CLI is agent-first.

- Default output is JSON.
- `--text` switches to human-readable output.
- Spec-driven commands accept `--json` only.
- Preview is the default. `--apply` writes files.
- `batch` executes ordered ops in one request and writes once at the end.
- Commands must be deterministic and non-interactive by default.
- Active profile resolution order is:
  1. explicit flags
  2. repo-local pin
  3. global default
  4. built-in fallback (`personal/v1`)

Alias to profile kind mapping:

- `tcp` -> `publisher`
- `tcf` -> `frontend`
- `tcb` -> `backend`
