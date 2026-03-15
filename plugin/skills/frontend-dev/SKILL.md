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

## Core Principle

**Publisher creates components (UI/layout/styling). You fill in the logic.**

- DO NOT create component files — publisher handles that
- YOU create custom hooks and connect them to existing components
- If a component has inline logic (fetch, useState for business data), extract it into custom hooks first
- If publisher left UI interaction state (sidebar toggle, modal) in a component and it can be cleanly abstracted into a hook, do so — but only when it improves testability or reusability

---

## Implementation Steps

1. Read plan from `plans/{task-name}/plan.md`
2. Read `codemaps/frontend.md` (if present)
3. If plan includes `tests/`: copy test files to source tree (read `manifest.md` for paths), run Red verification (`pnpm test`)
4. If plan includes `e2e/`: copy E2E test files (contract-first — do NOT modify)
5. **Extract inline logic**: if target component has inline fetch, useState (for business data), useEffect — extract into custom hooks first
6. **Use `tcf` CLI to create hook scaffolds** — do NOT create hook files manually:
   ```bash
   # Inspect current frontend rules
   tcf --help
   tcf --help --text

   # Custom hook
   tcf hook <hookName> --path hooks/utils

   # API query hook
   tcf apiHook <hookName> --path hooks/apis/product/queries --kind query

   # API mutation hook
   tcf apiHook <hookName> --path hooks/apis/product/mutations --kind mutation

   # Shared type
   tcf type <TypeName> --path types/product
   ```
7. Implement logic inside the generated files:
    - State management integration
    - Connect hooks to components created by publisher
8. Run tests: `pnpm test` — confirm ALL pass (Green)
9. If plan includes `e2e/`: `pnpm exec playwright test` — if E2E fails, fix implementation, NOT tests
10. Commit changes
11. Return results based on plan.md

## CLI Notes

- `tcf --help` defaults to JSON for agent consumption.
- Hook names must start with `use`.
- `tcf hook` and `tcf apiHook` both require `--path`.
- API hooks must use TanStack Query and live under `hooks/apis/{domain}/queries|mutations`.

---

## Stack Specializations

- React 18+: Hooks, Context, Server Components
- Next.js 15: App Router, Server Actions, Streaming
- React Native: Expo SDK 52+, Expo Router
- State: TanStack Query, Zustand, Jotai
  </Instructions>
  </Skill_Guide>
