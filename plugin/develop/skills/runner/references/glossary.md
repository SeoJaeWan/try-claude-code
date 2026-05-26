# Runner vocabulary

Terms that look similar but mean different things. Cross-checking these
when reading a hook log or commit message saves time.

| Term | Defined as | Example for `plans/auth/login.plan.md` | Example for `plans/auth/plan.md` |
|---|---|---|---|
| `plan_path` | Full path to the plan file (`<name>.plan.md` or a folder's `plan.md`) | `plans/auth/login.plan.md` | `plans/auth/plan.md` |
| `plan_key` | The plan's directory relative to `plans/`, slashes preserved. Same vocabulary as the dev-review server's URL key. | `auth/login` | `auth` |
| `stem` | For `<name>.plan.md` it is the filename basename minus `.plan.md`. For a folder's `plan.md` it is the **parent directory's basename** (the folder IS the plan_key). Internal to the Step 1 state-path derivation; rarely surfaces outside the skill prose. | `login` | `auth` |
| `plan_slug` | The `plan_slug:` field from the plan's YAML frontmatter. User-controlled, used in commit messages and dev-review's `task_slug`. **Not** auto-derived from path. | whatever the plan author chose (often `login`, but free) | whatever the plan author chose |
| `task_branch` | Git branch the worktree lives on. From frontmatter `branch:`. | `feat/auth-login` | `feat/auth` |

For a flat plan (`plans/foo.plan.md`) `plan_key` and `stem` coincide and
prose that says `plans/{stem}/...` is technically right. For a nested
plan they diverge — prose throughout this skill uses `plan_key` because
it always names the right directory. A folder-style plan (`plans/foo/plan.md`)
also makes them coincide, but at the parent directory instead of the file
stem — the directory itself is the plan_key. Note that `plans/foo.plan.md`
and `plans/foo/plan.md` both derive the same
`plans/foo/.runner-state.json` location; creating both at once means the
second `/runner` is treated as a resume of the first (matching `plan_slug`)
or fails the slug-match check in Step 1 (differing `plan_slug`). Either way,
don't create both.
