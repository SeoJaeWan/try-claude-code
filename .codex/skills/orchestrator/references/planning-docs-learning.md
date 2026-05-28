# Planning Docs Learning

## Purpose

Step 7 converts submitted planning docs rounds into reusable planning-quality evidence without making plan wiki ingestion a blocking approval gate.

## When to Run

- Run after a submitted planning docs round has been preserved in `review-history.json` and either approved or triaged.
- Do not run on unsubmitted `feedback.json`, stale `plan_signature`, or untriaged non-approved feedback.
- Run before resetting `feedback.json`, regenerating the planning docs package, changing `plan_signature`, or invoking the next role when feasible.

## Inputs

Inspect:

- `plans/{task-slug}/planning-docs/feedback.json`
- `plans/{task-slug}/planning-docs/review-history.json`
- current `plan.md`
- fresh `plans/_orchestrator/review/{task-slug}/review.md`
- `tdd.md` when present

Preserve provenance back to:

- plan path
- `task_slug`
- `plan_signature`
- review round
- triage route
- raw feedback source

## Capture Candidates

Capture reusable planning guidance candidates from:

- feedback that caused `plan_revision`
- feedback that routed to `ui_direction`
- feedback that exposed a repeatable `request_lock` or `scope_decision` planning gap
- planning-quality issues the cold review did not catch
- planning docs feedback later connected to a TDD blocker

Keep as raw-only or skip:

- simple questions
- preference-only comments
- implementation trivia
- already-covered plan content that only needed explanation
- feedback too task-specific to generalize

## Plan Wiki Boundary

- If invoking `plan-wiki-ingest`, pass source type `planning-docs`.
- Do not write pattern rules directly from untriaged browser feedback.
- Do not store full raw user feedback in pattern rules.
- Pattern rules must be generalized planning guidance with raw evidence backlinks.
- If `plan-wiki-ingest` is missing or does not yet support `planning-docs` source evidence, report that learning capture was preserved as nonblocking evidence and continue orchestration.
- If learning capture or plan wiki ingest fails, report the failure but do not invalidate current planning docs approval or block TDD unless the failure corrupted authoritative planning docs artifacts.
