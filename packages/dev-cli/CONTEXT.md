# Dev CLI Context

This CLI is agent-first.

- Default output is JSON.
- `--text` switches to human-readable output.
- `--dry-run` previews generated files without writing them.
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
