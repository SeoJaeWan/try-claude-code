# Dev CLI Context

This CLI is agent-first.

- Default output is JSON.
- Spec-driven commands accept `--json` only.
- For low-token agent lookups, prefer command-scoped JSON help such as `frontend component --help`; use top-level `--help` only for command discovery or structured field access.
- Preview is the default. `--apply` writes files.
- `batch` executes ordered ops in one request and writes once at the end.
- Commands must be deterministic and non-interactive by default.
- Command semantics are recipe-driven.
- Naming prefixes like `handle`, `on`, `use` are owned by profile/version recipes, not hardcoded in core.
- Validators and template context are also driven by profile recipes.
- Active profile resolution order is:
  1. stored global selection from `mode set`
  2. unset state until the user configures one

- Only `mode set --mode <mode> --version <major>` can change the active profile.
- General commands do not accept `--mode`, `--version`, or `--profile` overrides.
- `mode show` returns the stored value only and does not revalidate remote availability.
- `--help` provides minimal setup guidance even when no active mode is configured.

Active profile keys are alias-native:

- `frontend`
- `backend`
