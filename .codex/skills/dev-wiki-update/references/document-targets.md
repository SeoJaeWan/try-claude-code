# Dev Wiki Document Targets

Use this routing table when deciding where a user-provided rule belongs.

| Rule type | Primary target |
| --- | --- |
| General coding style, helper patterns, forbidden implementation patterns | `conventions/coding.md` |
| File names, folder names, component names, hook names, test names | `conventions/naming.md` |
| Where to create files, folder ownership, package boundaries | `conventions/folder-structure.md` |
| Test layers, fixtures, mocks, verification commands | `conventions/testing.md` |
| UI component usage, design system, accessibility | `conventions/ui.md` |
| API path, request/response shape, error format | `conventions/api.md` |
| Schema, migration, persistence, entity rules | `conventions/data.md` |
| Whole-project structure and intent | `architecture/overview.md` |
| Layering and dependency direction | `architecture/layers.md` |
| Module ownership and cross-module rules | `architecture/module-boundaries.md` |
| State ownership, cache, persistence state | `architecture/state.md` |
| DB, env, auth, storage, external API boundaries | `architecture/external-boundaries.md` |
| Local run setup and environment preparation | `workflows/local-dev.md` |
| Build, lint, typecheck, test commands | `workflows/commands.md` |
| Required checks before handoff or pull request | `workflows/test-and-quality.md` |
| Release, versioning, deployment, migration operation | `workflows/release.md` |

Create optional target files only when the project has a rule that belongs there.
