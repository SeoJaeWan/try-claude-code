# Design Discovery Contracts

## Purpose

Lock user-visible UI direction after `brainstorm` and before `architect` so planning does not guess hierarchy, state presentation, responsive behavior, or design-system alignment.

## Entry Notes

Use this skill only when UI direction needs to be made concrete before planning.
This skill is intended for explicit manual invocation, not as a default planning step for every request.

## When to use

- A request changes user-visible screens, pages, components, layouts, or interaction states.
- `brainstorm` clarified the product scope, but the UI direction is still too fuzzy for `architect`.
- Multiple plausible visual or hierarchy directions remain.
- The user wants to compare UI directions before committing to a plan.
- The current ambiguity is about what the user should see, not about backend behavior alone.

## When not to use

- The request is backend-only, API-only, data-only, or infrastructure-only.
- The existing design direction is already fixed enough that `architect` can plan safely.
- The task is a post-implementation live-site audit or fix loop.
- The real blocker is product scope or policy ambiguity that should go back to `brainstorm`.
