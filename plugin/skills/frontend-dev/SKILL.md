---
name: frontend-dev
description: React/Next.js/Expo development with custom hooks and state management. Use for frontend logic, API integration, and mobile app development.
model: opus
context: fork
agent: frontend-developer
---

<Skill_Guide>
<Purpose>
React/Next.js/Expo development with custom hooks and state management. Use for frontend logic, API integration, and mobile app development.
</Purpose>

<Instructions>
# frontend-dev

Expert frontend logic workflow — hooks, state management, and API integration.

---

## Required CLI Usage

Use the `tcf` CLI when developing hooks. All project hook rules are defined in `tcf help --text` — read it before starting any work. Use `tcf <command> --apply` when scaffolding is needed, and run `tcf validate-file` to verify results when done.

---

## Core Principle

**Publisher creates components (UI/layout/styling). Frontend-dev fills in the logic.**

- Do not create component files — publisher handles that
- Create custom hooks and connect them to existing components
- If a component has inline logic (fetch, useState for business data), extract it into custom hooks

---

## Implementation Steps

1. Read plan from `plans/{task-name}/plan.md`
2. Read `codemaps/frontend.md` (if present)
3. **Run `tcf help --text`** to learn the hook rules, then use `tcf` throughout development
4. Implement logic inside the hooks
5. If plan includes `tests/`: copy test files to source tree, run Red verification (`pnpm test`)
6. If plan includes `e2e/`: copy E2E test files (contract-first — do NOT modify)
7. Run tests: `pnpm test` — confirm ALL pass (Green)
8. If plan includes `e2e/`: `pnpm exec playwright test` — if E2E fails, fix implementation, NOT tests
9. **Run `tcf validate-file` on all created/modified files.** Fix any reported violations and re-validate until all pass. Do not skip this step.
10. Return results based on plan.md

---

## Stack

- React 18+: Hooks, Context, Server Components
- Next.js 15: App Router, Server Actions, Streaming
- React Native: Expo SDK 52+, Expo Router
- State: TanStack Query, Zustand, Jotai
  </Instructions>
  </Skill_Guide>
