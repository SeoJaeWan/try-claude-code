# Dev Wiki Update Contract

## Purpose

Update the project wiki so it reflects current development rules and observable project facts. The wiki is a maintained reference, not a chronological log.

## Input

The user may provide:

- A new convention
- A folder placement rule
- A naming rule
- A testing or verification rule
- An architecture boundary
- A workflow command
- A project-specific prohibition or exception
- A request to infer or refresh wiki content from the repository itself

The repository may provide observable evidence:

- Package scripts, dependencies, and config files
- CI workflows, hooks, and local tool configuration
- Folder structure, source roots, route folders, and module boundaries
- Test files, test runner config, fixtures, and mocks
- API clients, DTO/type placement, env references, SDK usage, DB/auth/storage boundaries
- Recent Git commit messages, branch names, merge commits, tags, and release clues

## Required Handling

For each rule:

1. Identify the rule owner document.
2. Check whether the topic already exists.
3. Update existing prose when present.
4. Create a focused section or document when absent.
5. Remove or reconcile contradiction when the new rule supersedes old guidance.
6. Leave Git diff as the history.

For repository-derived updates:

1. Identify the question the wiki document should answer.
2. Gather the smallest useful set of source evidence.
3. Prefer current source, config, scripts, and tests over stale wiki prose.
4. Separate evidence into:
   - **확정 규칙**: confirmed by user instruction, existing project docs, config, or enforced tooling.
   - **관찰된 관례**: repeated in source, tests, commit history, or workflows, but not explicitly enforced.
   - **추정**: weakly supported by headings, partial docs, common local patterns, or nearby evidence, but not repeated or enforced.
   - **확인 필요**: plausible but not proven enough to write as guidance.
5. Update only `conventions/`, `architecture/`, and `workflows/`.
6. Do not update `graph/`; route graph refreshes to `dev-wiki-graph`.

Do not skip a standard topic only because the evidence is incomplete. If the schema says the document owns the topic and the project has partial evidence, write the best-supported inference under `추정` or `확인 필요` with a short evidence note.

## Writing Shape

Prefer this shape inside the target document:

```markdown
## <주제>

### 규칙

...

### 이유

...

### 예외

...
```

Use shorter sections when the rule is simple. Do not force all three subsections when they add noise.

For evidence-derived documents, prefer this shape when uncertainty matters:

```markdown
## <주제>

### 확정 규칙

...

### 관찰된 관례

...

### 추정

...

### 확인 필요

...
```

Omit empty sections only when there is no useful evidence or inference for that section. Do not write a mandatory rule when the evidence only supports an observed convention or inference.

## Inference Standard

Use inference deliberately:

- If a document contains a heading such as "브랜치 전략" but no body, write a `확인 필요` entry that names the missing details and any nearby clues.
- If recent commits mostly use `feat:`, `fix:`, `docs:`, or similar prefixes, write a `관찰된 관례` entry for the observed commit style and note the sample size.
- If branch names visible locally suggest `feature/*`, `hotfix/*`, or release branches, write a `추정` entry and name the source command or evidence.
- If only common industry practice supports the idea and the repository has no clue, keep it in `확인 필요`, not `확정 규칙`.
- Prefer a short imperfect wiki note over leaving a schema-owned standard document empty.

## Evidence Checks

Use these source checks when relevant:

| Wiki target | Useful evidence |
| --- | --- |
| `workflows/commands.md` | `package.json` scripts, task runner config, README commands |
| `workflows/test-and-quality.md` | CI workflows, test scripts, test runner config, existing test folders |
| `workflows/git.md` | recent `git log`, branch names, merge commits, tags, existing Git docs |
| `workflows/release.md` | CI/CD workflows, release scripts, tag history, deployment docs |
| `conventions/folder-structure.md` | top-level folders, source roots, app/router directories, package boundaries |
| `conventions/testing.md` | test file locations, test helpers, fixtures, mocks, test config |
| `conventions/api.md` | API clients, generated clients, DTO/type folders, error handling helpers |
| `conventions/ui.md` | component folders, design-system packages, Storybook, styling config |
| `architecture/overview.md` | project metadata, README, source roots, major entry points |
| `architecture/layers.md` | import direction, route/domain/shared folders, lint/path rules |
| `architecture/module-boundaries.md` | module folders, public exports, package boundaries, lint boundaries |
| `architecture/state.md` | state libraries, cache clients, persistence helpers, URL/form state patterns |
| `architecture/external-boundaries.md` | env references, DB/auth/storage/API SDKs, HTTP clients, secret docs |

## Verification

After editing, run:

```bash
git -C .codex/dev-wiki/source status --short
```

Report only dev wiki repo changes relevant to the update.
