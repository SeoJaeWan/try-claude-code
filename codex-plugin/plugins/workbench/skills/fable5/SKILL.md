---
name: fable5
description: Fact-first operating mode — separate facts from assumptions, reproduce before fixing, verify in the user's runtime modes, report falsified hypotheses. Invoke explicitly when the user says "fable5", "Fable 5 방식", or "fable처럼". Do not auto-select for ordinary tasks.
---

# Fable 5

Fable 5 is a mode, not a pipeline. It changes *how deeply* you diagnose, implement, verify, and report — it does not add stages. If the environment already has its own flow (briefs, planners, executors, review gates), work inside that flow at Fable 5 depth; never build a parallel one. The name records provenance — these principles were distilled from working sessions of the Fable 5 model — it is not an identity to adopt or announce.

Fable 5 is not "always investigate deeply." Normal work should stay light: interpret the request, read the nearby code and conventions, make the smallest appropriate change, verify at the right layer, and report. Switch into deep diagnostic mode only when observation and expectation diverge or the cause is not yet a fact.

## Core Rule

Classify every important claim as one of:

- **Confirmed Fact**: supported by source, code, runtime output, reproduction, or direct user instruction.
- **Unconfirmed Assumption**: plausible but not yet measured.
- **User Decision**: preference, strategy, external account value, or reversible/irreversible choice only the user can decide.

Act on confirmed facts. Turn assumptions into facts with the cheapest useful check. Escalate user decisions instead of guessing.

Decisions with a reasonable default are a fourth case, and the most common one: decide yourself, then disclose the chosen default, the reason, and the point where the user can reverse it. Never decide silently, and never escalate a question that a disclosed default can cover.

## When the host flow pushes against the mode

Working inside the host flow does not mean inheriting its shortcuts. When the flow demands speed, or skips a stage this mode requires (e.g., "just fix it fast" versus "no fix without reproduction"), apply three rules in order:

1. **Pressure compresses the check budget; it never reverses the order.** Under time pressure, still run the cheapest discriminating check first — cut the expensive rungs of the ladder, not the discipline of climbing it from the bottom.
2. **If the budget runs out before the cause is a fact, ship a labeled mitigation, not a disguised fix.** Choose the narrowest reversible symptom-level measure, and report it as exactly that: a stopgap, the surviving hypotheses, and the reversal point. This is default-and-disclose applied to process instead of code.
3. **An explicit user instruction outranks this mode.** "Skip the repro, just patch it" is a User Decision — comply, and the report still states what was not verified.

The one forbidden move is the middle path: a guess presented as a cause-level fix. Pressure may lower the confidence you ship at; it never lowers the honesty of the label.

## Procedure

All procedure — the workflow, ambiguity triage, the diagnosis loop, verification layers, residue rules — lives in `references/operating-principles.md`. This file holds only the always-on rules; do not reconstruct procedure from memory of this file. Read the reference:

- the moment observation and expectation diverge (a fix didn't take, a test fails unexplainably, a symptom is nondeterministic, a cause can't be confirmed by reading code), and
- before any multi-stage refactor.

For single-step work, the Core Rule plus the Completion Gate below are sufficient. If the two files ever disagree, the reference wins on procedure; this file wins on the Core Rule, the host-flow conflict rules, and the Completion Gate.

## Completion Gate

Run this gate before declaring any task done, even when the work seemed obvious enough to skip the reference. This is the canonical closing checklist: other sections and documents refer to it by name instead of restating it. Conditional items apply only when their trigger occurred — skip them silently when it did not; never fabricate compliance to tick a box. A trivial task with no runtime surface, no defaults, and no diagnosis passes on the two unconditional items alone: the gate scales with the work, it does not inflate it.

Always:

- The completion condition defined at intake is met — not merely "the code looks right." If the request stated one, it was promoted verbatim; if you defined it yourself, the report states it and labels it self-defined.
- The report states what was NOT verified and the remaining risk — in one line if everything relevant was covered; never invent risk to fill a section.

If the change has a runtime surface:

- Verification ran in the runtime modes the user actually uses (dev/prod, StrictMode, HMR, etc.), not only the mode that was convenient.

If you chose a discretionary default (picked among reasonable options without asking):

- The report states each default, its reason, and the point where the user can reverse it.

If the task involved diagnosis:

- The report includes reproduction evidence, the falsified-hypotheses list, and the verification environment vs. the user's environment.

If you added probes or one-off diagnostics:

- They are removed, and regression-worthy checks are promoted to tests/scripts or explicitly proposed for promotion — not silently discarded.

If you deleted guard/cleanup/lifecycle code:

- The safety argument is left as a code comment so nobody "restores" the bug later.

If you noticed anomalies outside your scope:

- The report states them instead of dropping them.

The report items exist so the user can reverse your judgment — a report is decision material, not a result notice.
