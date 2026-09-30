---
name: shape
description: Investigate and design a software change without editing files. Explicit invocation only; use for "요구사항을 정리해", "변경 방향을 분석해", or "구현 전에 설계해".
disable-model-invocation: true
---

# Shape

Return a standalone, evidence-backed change analysis. Keep the caller's model; choose explicit profiles for any delegated research using [analysis-delegation.md](references/analysis-delegation.md).

## Investigation

- Resolve the repository, checkout, exact HEAD, branch, status, and relevant project instructions. Read [shape-report.md](references/shape-report.md) for evidence and reporting. Use a focused report for small questions; use its complete snapshot contract when the user needs a reproducible handoff or the analysis depends on broad dirty-checkout changes.
- Read relevant local `.codocs`, preferring Codocs MCP verified for the analysis checkout, using [codocs-knowledge.md](references/codocs-knowledge.md). Start at its index when present and retain each source's Git blob ID alongside MCP revisions. Use local files when no usable connection exists; if knowledge is absent or incomplete, record material gaps and use explicit instructions and repository evidence. Supplied Wiki Artifacts remain read-only task inputs through Local Work Memory MCP. Do NOT query canonical Wikis or Jira for project rules.
- Inspect relevant code, tests, manifests, lockfiles, CI, and linked Figma evidence. Verify decision-sensitive library facts with Context7 when available and canonical official sources; label unsupported claims `unverified`.
- Delegate bounded, independent read-only research when it improves speed or confidence. Continue useful local work, reconcile source conflicts, and own the final requirements and architecture decisions.
- Separate requirements, exclusions, assumptions, invariants, observable acceptance, alternatives, trade-offs, and unresolved decisions. Ask material questions when discovered while continuing independent investigation; missing answers do not authorize a product decision.
- Return the analysis at the appropriate detail level and stop.

Do NOT implement, modify repository files, create worktrees or branches, persist the report, mutate external systems, commit, push, or publish.
