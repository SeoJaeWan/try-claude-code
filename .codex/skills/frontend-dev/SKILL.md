---
name: frontend-dev
description: React/Next.js/Expo development with custom hooks and state management. Use for frontend logic, API integration, and mobile app development.
---

<Skill_Guide>
<Purpose>
React/Next.js/Expo development with custom hooks and state management. Use for frontend logic, API integration, and mobile app development.
</Purpose>

<Instructions>
# frontend-dev

Expert frontend logic workflow — hooks, state management, and API integration.

---

## Never develop hooks without tcf

All hook conventions — file structure, naming, import patterns, test rules — are defined in the `tcf` CLI. Without tcf you are guessing at conventions, and guesses are wrong. Read `tcf help --text` first, scaffold with `tcf <command> --apply`, and always run `tcf validate-file` on every created/modified file when you are done. Fix any violations and re-validate until all pass.

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
3. Implement logic inside the hooks
4. If plan includes `tests/`: copy test files to source tree, run Red verification (`pnpm test`)
5. If plan includes `e2e/`: copy E2E test files (contract-first — do NOT modify)
6. Run tests: `pnpm test` — confirm ALL pass (Green)
7. If plan includes `e2e/`: `pnpm exec playwright test` — if E2E fails, fix implementation, NOT tests
8. **Run `tcf validate-file` on all created/modified files.** Fix any reported violations and re-validate until all pass. Do not skip this step.
9. Return results based on plan.md

---

## Stack

- React 18+: Hooks, Context, Server Components
- Next.js 15: App Router, Server Actions, Streaming
- React Native: Expo SDK 52+, Expo Router
- State: TanStack Query, Zustand, Jotai
  </Instructions>
  </Skill_Guide>
