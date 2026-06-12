# Dev Wiki Document Targets

Use this routing table when deciding where a user-provided rule or repository-derived observation belongs.

Do not route updates to `{project}/graph/`; graph artifacts are owned by `dev-wiki-graph`.

| Rule type | Primary target |
| --- | --- |
| General coding style, helper patterns, forbidden implementation patterns | `conventions/coding.md` |
| File names, folder names, component names, hook names, test names | `conventions/naming.md` |
| Where to create files, folder ownership, package boundaries | `conventions/folder-structure.md` |
| Test layers, fixtures, mocks, verification commands | `conventions/testing.md` |
| UI component usage, design system, accessibility | `conventions/ui.md` |
| API path, request/response shape, error format | `conventions/api.md` |
| Rule conflict order, precedence, project-specific rule application | `conventions/rule-application.md` |
| Whole-project structure and intent | `architecture/overview.md` |
| Layering and dependency direction | `architecture/layers.md` |
| Module ownership and cross-module rules | `architecture/module-boundaries.md` |
| State ownership, cache, persistence state | `architecture/state.md` |
| DB, env, auth, storage, external API boundaries | `architecture/external-boundaries.md` |
| Local run setup and environment preparation | `workflows/local-dev.md` |
| Build, lint, typecheck, test commands | `workflows/commands.md` |
| Required checks before handoff or pull request | `workflows/test-and-quality.md` |
| Branch naming, PR target, merge style, commit message, hotfix Git procedure | `workflows/git.md` |
| Release, versioning, deployment, migration operation | `workflows/release.md` |

## Repository-Derived Routing

| Observed evidence | Primary target |
| --- | --- |
| `package.json` scripts and task runner commands | `workflows/commands.md` |
| CI jobs, required checks, lint/type/test gates | `workflows/test-and-quality.md` |
| Git commit message patterns, branch names, merge commits, tags used as Git markers | `workflows/git.md` |
| Deploy jobs, release scripts, deployment docs, rollback or production verification steps | `workflows/release.md` |
| Top-level folders, source roots, app/router directories, package boundaries | `conventions/folder-structure.md` |
| Repeated file/function/component/hook/test naming patterns | `conventions/naming.md` |
| Test file placement, test runner config, fixtures, mocks, helpers | `conventions/testing.md` |
| API clients, DTO/type folders, generated clients, request/response helpers | `conventions/api.md` |
| Component folders, design-system packages, Storybook, styling or accessibility config | `conventions/ui.md` |
| README/project metadata and major entry points | `architecture/overview.md` |
| Import direction, path aliases, route/domain/shared layering, lint boundaries | `architecture/layers.md` |
| Module folders, public exports, cross-module imports, package boundaries | `architecture/module-boundaries.md` |
| State libraries, cache clients, persistence helpers, URL/form state patterns | `architecture/state.md` |
| Env references, DB/auth/storage/API SDKs, HTTP clients, secret handling | `architecture/external-boundaries.md` |

Use the standard files from the dev wiki schema even when a project has not populated them yet. Write "아직 기록된 규칙이 없습니다." or "해당 없음" instead of deleting standard files.
