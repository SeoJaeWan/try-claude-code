---
name: fable5
description: Fact-first operating mode for complex work, unknown-cause bugs, high-uncertainty implementation, refactors that need staged validation, and tasks where Codex should explicitly separate facts from assumptions, reproduce before fixing, falsify hypotheses with cheap measurements, make scoped changes, and leave durable reasoning. Use when the user says "fable5", "Fable 5 방식", "fable처럼", asks to apply the Fable 5 workflow, wants deeper diagnosis before implementation, or asks Codex to judge whether verification is sufficient.
---

# Fable 5

Use this skill as an operating mode for complex or uncertain work. It does not replace `issue-brief`, `brainstorm`, `test-brief`, `executor`, or `visual-grounding`; it governs how to use them and how deeply to diagnose, implement, verify, and report.

## Core Rule

Classify every important claim as one of:

- **Confirmed Fact**: supported by source, code, runtime output, reproduction, or direct user instruction.
- **Unconfirmed Assumption**: plausible but not yet measured.
- **User Decision**: preference, strategy, external account value, or reversible/irreversible choice only the user can decide.

Act on confirmed facts. Turn assumptions into facts with the cheapest useful check. Escalate user decisions instead of guessing.

## Workflow

1. **Interpret the request**
   - Classify the utterance: implementation command, design question, bug report, documentation request, or review.
   - Separate explicit requirements from implied requirements.
   - Define the completion condition before editing.

2. **Fix the contract before code when needed**
   - For broad design, structure, routing, or workflow changes, write or update the relevant brief/spec first.
   - Include rejected alternatives and why they were rejected.
   - Keep small obvious changes lightweight; documentation is a tool, not a ritual.

3. **Find the standard before inventing one**
   - Read the nearest existing conventions, file layout, tests, scripts, generated boundaries, CI/workflow commands, and product references.
   - Treat repository evidence as stronger than memory.
   - Treat stale docs as context, not truth, when they conflict with current source.

4. **Plan by reversible checkpoints**
   - Split work so each step ends in a verifiable state.
   - Keep refactors and behavior changes separated when practical.
   - Make each step narrow enough that a regression has a small suspect surface.

5. **Diagnose unknown-cause bugs before fixing**
   - Reproduce or measure before editing production code.
   - Keep multiple hypotheses alive until checks falsify them.
   - Start with cheap checks: `rg`, static reads, DOM/event stack, focused scripts, repeated runs, runtime matrices.
   - Validate the measurement tool itself when coordinates, screenshots, timers, mocks, cached builds, or flaky behavior are involved.
   - Use temporary source probes only when external observation cannot distinguish causes, and remove them after confirmation.

6. **Change the cause, not the symptom**
   - Prefer cause-level fixes over masking or retrying around symptoms.
   - Be cautious with deleting lifecycle, cleanup, cancellation, or guard code; state why deletion is safe.
   - Fix byproduct bugs only when they are in the same responsibility boundary and the fix is narrow.

7. **Verify at the right layer**
   - Run focused mechanical checks first: typecheck, lint, tests, build, or the local equivalent.
   - Measure the actual artifact when the output matters: HTML, metadata, API shape, generated files, UI state, or pixel delta.
   - For interaction bugs, verify the runtime modes the user actually uses: dev/prod, StrictMode, HMR/fresh start, viewport, auth/data state, browser, or device mode.
   - For flaky symptoms, compare before/after frequency using the same repeated-run method.

8. **Leave useful residue**
   - Put design decisions in documents.
   - Put counterintuitive code reasoning in code comments.
   - Promote valuable regression checks to permanent tests or verification scripts.
   - Remove one-off probes, debug logs, and task-only diagnostics.
   - Report what was proven, what was falsified, what changed, what was verified, and what risk remains.

## Workbench Routing

Use the existing workbench skills when they fit:

- Use `issue-brief` to turn prompt/Jira/QA/design/API evidence into confirmed facts, assumptions, and work units.
- Use `brainstorm` to make a diagnostic or implementation plan for one selected unit.
- Use `test-brief` when a contract test, regression test, or measurement/promotion plan should precede implementation.
- Use `executor` to perform the scoped implementation or diagnostic loop.
- Use `visual-grounding` for UI fidelity or interaction evidence.
- Use `branch-work-report` to review whether commits preserve evidence, validation, and cleanup.

Do not create a parallel debug flow when the normal workbench flow can carry the work. Increase diagnostic depth inside the existing flow.

## Reference

Read `references/operating-principles.md` when:

- the task is broad, risky, or ambiguous;
- the cause of a bug is unknown;
- verification sufficiency is part of the question;
- you need the full Fable 5 checklist or examples from the source notes.
