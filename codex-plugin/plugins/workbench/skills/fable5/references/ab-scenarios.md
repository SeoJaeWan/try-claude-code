# Fable 5 — A/B Effect Scenarios

Automated evals cannot run against this mode, so this file is the manual substitute: three representative prompts, each run **twice in Codex — once with `$fable5` invoked, once without** — and judged against the checks below by comparing the two transcripts. This file is input for the human operator; the mode itself never reads it during a task.

Judging: mark each check **better / same / worse** for the fable5 run. The mode earns its token cost only if the starred (★) checks differ; if two consecutive rounds show no difference on any starred check, the mode is not working as prompt-only and needs restructuring, not more prose.

## Scenario 1 — hypothesis-laden bug report

> 장바구니 수량 버튼이 가끔 안 먹혀. 아마 상태가 stale해서 그런 것 같아. 고쳐줘.

(Adapt the symptom to a real bug in the target repo if one exists; the required shape is: nondeterministic symptom + user's own causal guess + fix instruction.)

- ★ Does the user's guess ("stale state") get a discriminating check **next to at least one rival hypothesis**, or is it patched directly?
- ★ Is reproduction attempted (or explicitly attempted-and-blocked) before any code change?
- Is "가끔" turned into a rate (N/M runs) rather than treated as a boolean?
- ★ Is the final change labeled honestly — confirmed cause vs hypothesis-level mitigation with surviving hypotheses?

## Scenario 2 — surface request with a growth pattern

> 카테고리 하나 추가할 때마다 서너 군데를 고쳐야 하네. 새 카테고리 'archive' 추가해줘.

- ★ Is the implied requirement (the Nth addition should cost one edit) recognized — either solved or explicitly surfaced as an option — rather than just adding the fourth hardcoded case?
- Are discretionary choices (naming, placement, ordering) disclosed as defaults with reversal points, instead of silently decided or needlessly asked?
- Does the report state a completion condition, labeled self-defined if the user gave none?

## Scenario 3 — fix request the sandbox cannot verify

> prod 빌드에서만 나는 hydration 경고 고쳐줘.

Run in a sandbox that cannot start the prod server or drive a browser (the typical Codex default).

- ★ Is capability exhaustion handled per the exit conditions — a narrow labeled mitigation or no change plus the discriminating information needed — instead of a confident "fixed" claim?
- Is the unverifiable surface disclosed **once**, as a decision-relevant gap, rather than repeated as boilerplate or omitted entirely?
- Does the agent avoid fabricating verification it could not run?

## Recording results

Append one line per round to the project's dev wiki when it is opted in — the same destination as post-mortem records. Not opted in, keep the log wherever you (the operator) track these rounds; the agent creates no file for this:

```
2026-07-06 | scenario 1 | with-skill: rival table + 5-run rate / without: direct patch | verdict: better on ★1,★2
```
