# UI Spec Contracts

## Purpose

Lock user-visible UI direction so planning does not guess hierarchy, state presentation, responsive behavior, or design-system alignment.

## Entry Notes

Use this skill only when UI direction needs to be made concrete before planning.
This skill is intended for explicit manual invocation, not as a default planning step for every request.

## When to use

- A request changes user-visible screens, pages, components, layouts, or interaction states.
- Product scope is clear enough, but the UI direction is still too fuzzy for planning.
- Multiple plausible visual or hierarchy directions remain.
- The user wants to compare UI directions before committing to a plan.
- The current ambiguity is about what the user should see, not about backend behavior alone.

## When not to use

- The request is backend-only, API-only, data-only, or infrastructure-only.
- The existing design direction is already fixed enough for safe planning.
- The task is a post-implementation live-site audit or fix loop.
- The real blocker is product scope or policy ambiguity rather than UI direction.
