---
name: branch-work-report
description: Current Git work-branch reporting by commit. Use when the user asks to summarize, report, review, or organize work done on the current branch, especially in Korean phrases such as "작업 내역 정리", "커밋 단위로 정리", "브랜치 작업 보고", "작업 보고서", or asks for feedback on branch commits. This skill inspects Git history and diffs only; it does not edit code, commit, push, or open PRs.
---

# Branch Work Report

Use this skill to produce a review-ready report for the current Git work branch. The report must follow the branch's commits, explain what each commit did in detail, and include actionable feedback where the diff suggests a risk or improvement.

## Core Rules

- Do NOT edit files, stage, commit, push, open PRs, or run destructive Git commands.
- Use Korean for user-facing prose unless the user asks otherwise. Keep branch names, commit messages, paths, commands, identifiers, and URLs exact.
- Treat `main`, `master`, and `develop` as protected baseline branches, not work branches.
- If the current branch is `main`, `master`, or `develop`, say that it is not a work branch and ask for the target branch or comparison range.
- Prefer evidence from Git commands over memory or conversation history.
- Keep feedback grounded in the diff. Do not invent issues.
- If there is no meaningful feedback for a commit, say `피드백: 특이사항 없음`.
- If the worktree has uncommitted changes, mention them separately from committed work. Do not fold uncommitted changes into commit summaries unless the user explicitly asks.

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

4. Inspect branch-level context:

```bash
git diff --stat <merge-base>...HEAD
git diff --name-status <merge-base>...HEAD
```

Use this to catch cross-commit themes, missing tests, broad refactors, generated files, config changes, or review hotspots.

## Feedback Heuristics

For each commit, consider whether feedback is needed in these areas:

- Commit scope: mixed concerns, oversized commit, unclear message, or changes that would be easier to review if split.
- Behavior risk: changed control flow, edge cases, error handling, auth/session state, permissions, persistence, API contracts, schema changes, migrations, or backward compatibility.
- Test risk: logic changed without nearby tests, removed tests, brittle snapshots, missing regression coverage, or manual-only verification.
- Maintainability: duplicated logic, naming drift, dead code, inconsistent local patterns, hidden coupling, or config/documentation drift.
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
   - 변경 파일: <important paths or grouped paths>
   - 작업 내용:
     - <specific detail from diff>
     - <specific detail from diff>
   - 영향 범위: <user-visible behavior, API, tests, docs, tooling, or internal-only>
   - 피드백: <actionable review note or "특이사항 없음">

**전체 피드백**
- <cross-commit review note>
- <merge-before checklist item>

**검증/확인**
- 확인한 명령: `<git command>`, `<git command>`
- 테스트 실행 여부: <ran/not run; if not run, why>
```

If there are many commits, group low-risk mechanical commits only after listing their commit hashes and explaining the grouping rule. Do not hide risky commits inside a group.

## Final Quality Bar

The user should be able to hand the report to a reviewer and understand:

- what branch was reviewed
- what base it was compared against
- what each commit changed
- what feedback or review focus each commit deserves
- what remains to verify before merge
