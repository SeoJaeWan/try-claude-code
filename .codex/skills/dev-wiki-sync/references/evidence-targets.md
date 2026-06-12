# Dev Wiki Sync Evidence Targets

Use this routing table when syncing repository evidence into standard dev wiki documents.

| Evidence | Primary target |
| --- | --- |
| Project name, package name, stack, source roots, key paths | `project.json` |
| Wiki entry links or section overview | `README.md` |
| General coding style, helper patterns, forbidden implementation patterns | `conventions/coding.md` |
| Top-level folders, source roots, app/router directories, package boundaries | `conventions/folder-structure.md` |
| Repeated file/function/component/hook/test naming patterns | `conventions/naming.md` |
| Test runner config, test file placement, fixtures, mocks, helpers, verification commands | `conventions/testing.md` |
| API clients, DTO/type folders, generated clients, request/response helpers, error handling helpers | `conventions/api.md` |
| Component folders, design-system packages, Storybook, styling config, accessibility clues | `conventions/ui.md` |
| Rule precedence, conflict handling, project-specific rule application | `conventions/rule-application.md` |
| README/project metadata, major entry points, source roots | `architecture/overview.md` |
| Import direction, path aliases, route/domain/shared layering, lint boundaries | `architecture/layers.md` |
| Module folders, public exports, cross-module imports, package boundaries | `architecture/module-boundaries.md` |
| State libraries, cache clients, persistence helpers, URL/form state patterns | `architecture/state.md` |
| Env references, DB/auth/storage/API SDKs, HTTP clients, secret handling | `architecture/external-boundaries.md` |
| `package.json` scripts and task runner commands | `workflows/commands.md` |
| Local run docs, env examples, dev server ports, seed/mock setup | `workflows/local-dev.md` |
| CI jobs, required checks, lint/type/test gates, coverage tools | `workflows/test-and-quality.md` |
| Git commit message patterns, branch names, merge commits, tags used as Git markers | `workflows/git.md` |
| Deploy jobs, release scripts, deployment docs, rollback or production verification steps | `workflows/release.md` |

## Useful Commands

Use targeted commands, not broad reads, when possible:

```bash
find .codex/dev-wiki/source/{project} -maxdepth 3 -type f | sort
git -C .codex/dev-wiki/source status --short
git log --oneline -n 30
git branch --all --no-color
find .github -maxdepth 3 -type f 2>/dev/null | sort
find . -maxdepth 3 -type f \( -name 'package.json' -o -name 'pnpm-workspace.yaml' -o -name 'turbo.json' -o -name 'vite.config.*' -o -name 'next.config.*' -o -name 'tsconfig.json' \) | sort
find . -maxdepth 4 -type f \( -name '*test*' -o -name '*spec*' \) | sort
rg -n "process\\.env|import\\.meta\\.env|fetch\\(|axios|ky|graphql|createClient|auth|storage|cache|zustand|redux|queryClient|useQuery" .
```

Avoid scanning generated dependency folders or build outputs.
