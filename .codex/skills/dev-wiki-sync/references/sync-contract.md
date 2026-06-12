# Dev Wiki Sync Contract

## Purpose

Refresh a project dev wiki from the current repository. The sync checks standard non-graph wiki files against observable project facts and updates stale, empty, missing, or incomplete guidance.

## Scope

Sync these targets:

- `{project}/README.md`
- `{project}/project.json`
- `{project}/conventions/**`
- `{project}/architecture/**`
- `{project}/workflows/**`

Do not sync `{project}/graph/**`; route graph refreshes to `dev-wiki-graph`.

## Evidence Levels

Classify every synced statement:

- **확정 규칙**: confirmed by user instruction, existing project docs, config, or enforced tooling.
- **관찰된 관례**: repeated in source, tests, commit history, or workflows, but not explicitly enforced.
- **추정**: weakly supported by headings, partial docs, common local patterns, or nearby evidence.
- **확인 필요**: plausible or schema-required, but not proven enough to write as guidance.
- **해당 없음**: the schema topic does not apply to this project after checking reasonable evidence.

Do not omit a schema-owned standard document just because evidence is incomplete. Prefer a short `추정`, `확인 필요`, or `해당 없음` note over leaving placeholder text untouched.

## Required Handling

1. Read the schema and configured project root.
2. Inventory standard non-graph files, including untracked files.
3. Gather evidence for each standard target.
4. Compare current wiki prose with repository evidence.
5. Replace stale or contradictory text instead of appending conflicting notes.
6. Preserve useful human-authored guidance when it does not conflict with current evidence.
7. Update empty placeholders such as "아직 기록된 규칙이 없습니다." whenever evidence, inference, or a confirmation-needed note can improve them.
8. Leave Git diff as the history.

## Writing Shape

For evidence-derived sections, prefer:

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

Omit empty sections. Do not write a mandatory rule when evidence only supports an observed convention or inference.

## Inference Rules

- If recent commits mostly use prefixes such as `feat:`, `fix:`, or `docs:`, record the observed commit style and sample size in `workflows/git.md`.
- If local branches suggest `feature/*`, `hotfix/*`, or release branches, record a `추정` with the source command or evidence.
- If a document contains a heading but no body, record `확인 필요` with the missing details and nearby clues.
- If only common industry practice supports the idea and the repo has no clue, use `확인 필요`, not `확정 규칙`.
- If no evidence suggests a schema topic applies, write `해당 없음` with the checked evidence.

## Final Report

The final response must include:

- Updated files: each changed standard wiki file with the topic updated.
- Evidence level: mark each file or section as `확정 규칙`, `관찰된 관례`, `추정`, `확인 필요`, `해당 없음`, or user-provided rule if the user supplied one during sync.
- Confirmation needed: a separate list of every `확인 필요` item, including the file, topic, current best guess when available, and the exact question the user should confirm.
- Skipped standard files: schema-owned files intentionally left unchanged, with evidence checked and reason.
- Excluded graph files: any `graph/` changes noticed but not touched.
- Verification: summarize `git -C .codex/dev-wiki/source status --short`.

Use concise confirmation questions that the user can answer directly. If there are many items, group them by file and prioritize decisions that affect future implementation behavior.

When the user explicitly asks to commit, stage relevant non-graph sync files, including untracked standard documents. Do not stage graph artifacts from this skill.
