# Brainstorm Contracts

## Purpose

Clarify ambiguous requests or establish bounded diagnostic baselines by locking the user's requested outcome, affected work bundles, public boundaries, execution-agent boundary, ownership rules, exclusions, test strategy decisions, current-state evidence, and pre-planning risk areas in the user's own language before planning starts.

## Entry Notes

Use this as the entrypoint when ambiguity or unknown current-system state can change architecture, scope, tooling, API contracts, product policy, UX, or delivery strategy.

## When to use

- Request is ambiguous: "add login", "make dashboard", "improve UX".
- Multiple approaches are plausible and tradeoffs matter.
- Library/framework/pattern choices need to be made.
- Business-rule, UX, validation, permission, or state behavior policy is missing.
- Acceptance criteria are missing or vague.
- Test strategy choices governed by the active plan wiki decision policy can change the later plan.
- Public props, callback names, state ownership, or exclusions are still unclear.
- Required execution areas or excluded execution areas are unclear, such as whether a request needs only frontend work, backend work, infra work, visual audit work, or no implementation plan at all.
- User-visible screens, layout, hierarchy, or state presentation are changing and the UI direction is still fuzzy.
- The user wants clarification questions before committing to a plan.
- Existing implementation, design-system, docs, runtime, preview, API, or visual parity problems must be diagnosed before the planning scope can be locked.
- The user asks for a fix, cleanup, realignment, parity recovery, consistency review, or problem investigation, but the exact affected items are not yet known.
- A bounded full-surface inventory is needed to separate confirmed facts, intended differences, missing evidence, and later planning decisions.

## When not to use

- Request is already decision-complete with clear scope, acceptance criteria, and touched public contracts.
- Task is straightforward with no meaningful tradeoff.
- A focused bug has a known file, known failing behavior, and clear acceptance criteria that can be executed directly.
- The user explicitly asks for immediate implementation and the affected boundary is already narrow and decision-complete.
