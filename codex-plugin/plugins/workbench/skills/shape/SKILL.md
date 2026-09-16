---
name: shape
description: Investigate a software change through read-only repository exploration, user-supplied Wiki Artifact context, local `.codocs` project knowledge and linked Figma context, requirements analysis, source-backed research, and architecture decisions. Invoke only through the explicit `$workbench:shape` selector; use for "요구사항을 정리해", "변경 방향을 분석해", or "구현 전에 설계해" requests.
---

# Shape

Produce a standalone evidence-backed change analysis without implementing or persisting it.

Read [references/shape-report.md](references/shape-report.md) before starting. Follow its snapshot, evidence, identity, and report requirements.

## Procedure

1. Confirm the current directory is a usable Git repository. Resolve the repository root, checkout root, Git common dir, HEAD, branch, and worktree inventory.
2. Capture the complete content-sensitive snapshot defined by the reference. Permit a dirty checkout only as read-only `adopted_dirty` evidence.
3. Read relevant local `.codocs` documents as the project knowledge and architecture basis: start with the index when present, then follow relevant concepts, policies, conventions, and contracts. Resolve user-supplied Wiki Artifact references through the Local Work Memory MCP’s current contract as read-only task input, preserving provenance. Do NOT query canonical Wikis for implementation rules or require Wiki architecture access. Record missing local knowledge and decision-critical conflicts rather than inventing policy.
4. Use the supplied requirements and relevant linked Figma evidence. Do NOT query Jira, including when an issue key or URL appears in the input. Keep external systems read-only.
5. Inspect repository code, manifests, lockfiles, tests, CI, and project instructions before external research.
6. Separate requirements, constraints, exclusions, assumptions, risks, unresolved decisions, invariants, and observable acceptance criteria.
7. Verify version-sensitive claims with Context7 when available and canonical official sources. Label unsupported material claims `unverified`.
8. Record architecture decisions with alternatives, evidence, trade-offs, confidence, and invalidation conditions.
9. Return the complete report and stop.

Do NOT modify repository files, create a worktree or branch, persist the report, mutate Jira or Figma, commit, push, publish, or perform work outside this skill's analysis scope.
