---
name: branch-work-report
description: Current Git work-branch reporting by commit. Use when the user asks to summarize, report, review, or organize work done on the current branch, especially in Korean phrases such as "작업 내역 정리", "커밋 단위로 정리", "브랜치 작업 보고", "작업 보고서", or asks for feedback on branch commits. This skill inspects Git history and diffs only; it does not edit code, commit, push, or open PRs.
---

# Branch Work Report

Use this skill to produce a review-ready report for the current Git work branch. The report must follow the branch's commits, explain what each commit did in enough detail for a reviewer to understand the implementation without reopening every diff, and include actionable feedback where the diff suggests a risk or improvement.

## Core Rules

- Do NOT edit files, stage, commit, push, open PRs, or run destructive Git commands.
- Use Korean for user-facing prose unless the user asks otherwise. Keep branch names, commit messages, paths, commands, identifiers, and URLs exact.
- Treat `main`, `master`, and `develop` as protected baseline branches, not work branches.
- If the current branch is `main`, `master`, or `develop`, say that it is not a work branch and ask for the target branch or comparison range.
- Prefer evidence from Git commands over memory or conversation history.
- Inspect changed code deeply enough to explain implementation mechanics, not just file names or commit subjects.
- Keep feedback grounded in the diff. Do not invent issues.
- If there is no meaningful feedback for a commit, say `피드백: 특이사항 없음`.
- If the worktree has uncommitted changes, mention them separately from committed work. Do not fold uncommitted changes into commit summaries unless the user explicitly asks.
- Do NOT let `작업 내용` or `영향 범위` collapse into a single vague sentence. A report that only says "플로우를 구현했습니다" or "위치 기능에 영향" is too shallow.

## Evidence Workflow

1. Identify the repository and branch:

```bash
git rev-parse --show-toplevel
git branch --show-current
git status --short
```

2. Choose the comparison base:

- If the user names a base branch or range, use it.
- Otherwise prefer the first existing ref from this order: `origin/develop`, `develop`, `origin/main`, `main`, `origin/master`, `master`.
- Use the merge-base, not a raw branch tip, when comparing a work branch to its base.

Useful commands:

```bash
git merge-base HEAD <base-ref>
git log --reverse --decorate --oneline <merge-base>..HEAD
```

3. Inspect each commit in order:

```bash
git show --stat --name-status --find-renames --find-copies <commit>
git show --format=fuller --find-renames --find-copies <commit>
```

Read the diff enough to explain behavior, data flow, UI changes, tests, docs, and risk. For very large commits, first use `--stat`, `--name-status`, and focused path diffs, then state that the commit is large and summarize by subsystem.

For commits that touch application behavior, also inspect nearby source when the diff alone is not enough:

```bash
rg "<changed identifier or route segment>" <likely source/test paths>
sed -n '<start>,<end>p' <changed-file>
```

Use nearby reads to understand call sites, state ownership, API boundaries, and test expectations. Keep this scoped to the commit being explained.

4. Inspect branch-level context:

```bash
git diff --stat <merge-base>...HEAD
git diff --name-status <merge-base>...HEAD
```

Use this to catch cross-commit themes, missing tests, broad refactors, generated files, config changes, or review hotspots.

## Detail Contract

For each non-trivial commit, write enough detail to answer:

- Why: what product, technical, or workflow problem the commit addresses.
- What changed: the concrete UI, state, API, schema, utility, config, or test changes.
- How it works: the important data/control flow, state transitions, validation rules, caching behavior, external SDK/API calls, or lifecycle behavior.
- Where it lands: the main files/modules and why those files matter.
- How it is verified: tests added/changed, existing tests affected, or manual checks implied by the change.
- What could break: compatibility, edge cases, environment assumptions, mobile/web differences, race conditions, performance, security, or quota concerns.
- For bug-fix commits, what evidence supports the root cause: reproduced symptom, hypotheses ruled out, measurement-tool validation, repeated-run evidence for flaky behavior, runtime modes checked, and regression coverage left behind.

Use 3-6 bullets under `작업 내용` for normal commits. Use 6-10 bullets or grouped sub-bullets for large feature commits. Mechanical rename/version-only commits can be shorter, but still explain whether behavior changed.

When explaining `영향 범위`, name specific surfaces instead of broad categories. Cover the relevant items from this list:

- 사용자 플로우: route, screen, step, interaction, validation message, empty/error/loading state.
- 데이터/API 계약: request/response shape, generated types, SDK headers, query params, server actions, cache keys.
- 상태/저장소: store fields, React Query cache, localStorage/sessionStorage, native bridge state, URL params.
- 공통 컴포넌트/전역 설정: layout, font, provider, config, lint/test/build behavior.
- 운영/런타임: env vars, rate limit, external service quota, SSR/client boundary, mobile webview/native behavior.
- 테스트/검증: added coverage, broken/stale tests, manual QA needed.
- 진단/잔류물: repro scripts, temporary probes, debug logs, screenshots, artifacts, or promoted regression checks.

Avoid generic impact phrases such as `위치 기능 전체`, `앱 전체`, or `테스트에 영향` unless they are followed by concrete examples.

## Feedback Heuristics

For each commit, consider whether feedback is needed in these areas:

- Commit scope: mixed concerns, oversized commit, unclear message, or changes that would be easier to review if split.
- Behavior risk: changed control flow, edge cases, error handling, auth/session state, permissions, persistence, API contracts, schema changes, migrations, or backward compatibility.
- Test risk: logic changed without nearby tests, removed tests, brittle snapshots, missing regression coverage, or manual-only verification.
- Diagnostic risk: unknown-cause bug fixes without reproduced symptoms, falsified hypotheses, measurement-tool validation, repeated-run evidence for flaky behavior, or dev/prod/runtime-mode verification.
- Maintainability: duplicated logic, naming drift, dead code, inconsistent local patterns, hidden coupling, or config/documentation drift.
- Residual artifact risk: temporary probes, debug logging, scratch diagnostic scripts, screenshots, or task-only artifacts committed without an explicit promotion reason.
- Review focus: files or paths reviewers should inspect carefully.

Feedback must be specific. Prefer:

`피드백: API 응답 필드명이 바뀌었는데 기존 호출부 호환 테스트가 보이지 않아서, <path> 주변 regression test를 확인하는 게 좋아 보여.`

Avoid:

`피드백: 테스트를 더 하면 좋습니다.`

## Output Format

Default to this structure:

```markdown
**브랜치 작업 보고**

- 현재 브랜치: `<branch>`
- 비교 기준: `<base-ref>` / merge-base `<short-sha>`
- 커밋 범위: `<base>..HEAD`
- 커밋 수: <n>
- 워킹트리: <clean or uncommitted summary>

**전체 요약**
- <branch-level outcome>
- <major subsystem or behavior change>
- <tests/docs/config note>

**커밋별 작업 내역**

1. `<short-sha>` <commit subject>
   - 변경 파일:
     - <important paths grouped by concern, not a raw full file dump>
   - 작업 내용:
     - 의도: <why this commit exists>
     - 구현: <specific implementation mechanics from diff/code>
     - 데이터/상태 흐름: <API params, store fields, cache, lifecycle, validation, or "해당 없음">
     - 진단/검증: <tests added/changed, repro/measurement evidence, hypotheses ruled out, runtime modes checked, or likely manual checks>
   - 영향 범위:
     - 사용자/화면: <specific routes/screens/interactions or "해당 없음">
     - API/데이터: <specific contracts/types/cache/query/env or "해당 없음">
     - 상태/런타임: <specific stores/native bridge/storage/config/runtime concerns or "해당 없음">
     - 테스트/진단/리뷰 포인트: <specific tests, stale mocks, temporary probes/artifacts, promoted checks, files to review, or "해당 없음">
   - 피드백: <actionable review note or "특이사항 없음">

**전체 피드백**
- <cross-commit review note>
- <merge-before checklist item>

**검증/확인**
- 확인한 명령: `<git command>`, `<git command>`
- 테스트 실행 여부: <ran/not run; if not run, why>
```

If there are many commits, group low-risk mechanical commits only after listing their commit hashes and explaining the grouping rule. Do not hide risky commits inside a group.

## Shallow Report Smells

Before finalizing, revise the report if any of these are true:

- Most commits have only one `작업 내용` bullet.
- `영향 범위` repeats the same broad phrase as the commit subject.
- A feature commit does not mention state, API/data flow, validation, or tests even though the diff includes them.
- Feedback says only "테스트 필요" without naming the missing or stale test surface.
- Bug-fix feedback says only "재현 필요" or "검증 필요" without naming the missing symptom, hypothesis check, runtime mode, or regression surface.
- The whole report could have been written from `git log --oneline` and `--stat` without reading diffs.

## Final Quality Bar

The user should be able to hand the report to a reviewer and understand:

- what branch was reviewed
- what base it was compared against
- what each commit changed and how the important pieces work
- which user-visible flows, data/API contracts, state stores, runtime assumptions, and tests are affected
- for bug-fix commits, what evidence supports the root cause and whether temporary diagnostics were removed or intentionally promoted
- what feedback or review focus each commit deserves
- what remains to verify before merge
