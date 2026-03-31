# Dev CLI Context

This CLI is agent-first.

- Default output is JSON.
- Spec-driven commands accept `--json` only.
- For low-token agent lookups, prefer command-scoped JSON help such as `frontend component --help`; use top-level `--help` only for command discovery or structured field access.
- Preview is the default. `--apply` writes files.
- Commands must be deterministic and non-interactive by default.
- Command semantics are manifest-driven. Each host package (frontend, backend) owns its `src/manifest.mjs`.
- Naming prefixes like `handle`, `on`, `use` are defined in the package-owned manifest, not hardcoded in core.
- Validators and template context are driven by manifest command definitions.

There is no profile selection, mode configuration, or remote fetch.  Commands are available immediately from the package-owned manifest.

Supported commands per alias are determined by the manifest the host package injects into `runCli({ manifest })`.
