---
name: frontend-dev
description: "React/Next.js/Expo development with UI components, custom hooks, and state management. Use for frontend UI, API integration, and mobile app development."
model: opus
context: fork
agent: frontend-developer
---

<Skill_Guide>
<Purpose>
React/Next.js/Expo development with UI components, custom hooks, and state management.
Use for frontend UI, API integration, and mobile app development.
</Purpose>

<Instructions>
# frontend-dev

Expert frontend workflow — UI components, hooks, state management, and API integration.

## Core Principle

**Frontend-dev owns both UI structure and frontend logic.**

- Create or update component files when the task includes layout, styling, responsive UI, or UI interaction state
- Create custom hooks and API hooks when the task includes reusable business/data logic or server-state integration
- If a component has inline logic that should be reused or tested separately, extract it into hooks before expanding the UI further

## Convention Discovery (do this before writing any code)

Every project has its own conventions — directory layout, naming style, import patterns,
file structure. Your job is to discover them from the existing code, not to guess or
impose defaults. Skip any step whose target does not exist in the project.

### 1. Detect the stack

Look for framework markers to understand what you are working with:

| File / Dir | Indicates |
|---|---|
| `next.config.*` | Next.js |
| `app/` dir with `layout.tsx` | Next.js App Router |
| `pages/` dir | Next.js Pages Router or plain React |
| `app.json` or `expo` key in package.json | Expo / React Native |
| `vite.config.*` | Vite-based React |
| `package.json` dependencies | React version, state libs, CSS approach |

### 2. Scan existing patterns

Read 2-3 representative examples of each file type that already exists in the project.
Extract the following conventions by observation — do not assume:

- **Directory structure**: Where do components, hooks, utils, types live?
- **File naming**: `index.tsx` vs `ComponentName.tsx`? camelCase vs PascalCase folders?
- **Export style**: default export or named export?
- **Function style**: arrow functions or function declarations?
- **Props pattern**: inline types, separate interface, or imported type?
- **State management**: which libraries are actually used? (TanStack Query, Zustand, Redux, Jotai, Context, etc.)
- **Styling approach**: Tailwind, CSS Modules, styled-components, etc.
- **Import patterns**: absolute paths (`@/`), relative paths, barrel exports?
- **Logic boundaries**: where does data-fetching live? In components, hooks, server actions?

### 3. Summarize conventions before implementing

Before writing any code, state the discovered conventions in 5-10 bullet points.
This ensures you and the project are aligned. If you cannot find enough examples
(e.g., greenfield project), fall back to the framework's official conventions.

## Implementation Steps

1. Read plan from `plans/{task-name}/plan.md` (if present)
2. Read `codemaps/frontend.md` (if present)
3. **Run Convention Discovery** (above) — scan existing code for patterns
4. Read project theme/style when the task includes UI work: `tailwind.config.*`, `app/globals.css`, component library tokens
5. Implement the required UI and logic, following discovered conventions exactly
6. If plan includes `tests/`: copy test files to source tree, run Red verification (`pnpm test`)
7. If plan includes `e2e/`: copy E2E test files (contract-first — do NOT modify)
8. Run tests: `pnpm test` — confirm ALL pass (Green)
9. If plan includes `e2e/`: `pnpm exec playwright test` — if E2E fails, fix implementation, NOT tests
10. Return results based on plan.md

## What to avoid

- Do NOT invent conventions that do not exist in the codebase — follow what is already there
- Do NOT put business/data logic (fetch, useQuery, useMutation) inside UI components when the project separates them into hooks
- Do NOT change existing file organization patterns to match some "ideal" structure
- Do NOT add libraries that are not already in `package.json` without asking

</Instructions>
</Skill_Guide>
