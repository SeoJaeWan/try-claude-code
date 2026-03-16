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

All file creation goes through `tcf` CLI. Never create hook files manually — the CLI enforces naming, folder structure, export patterns, and API hook naming rules that are impossible to get right by hand.

---

## CLI-First Workflow

Every hook file must be created via `tcf`. Start with the narrowest help that matches the job: `tcf help hook --text` for non-API hooks or `tcf help apiHook --text` for API hooks. Use `tcf help <command>` JSON only when you need structured fields, and use top-level `tcf --help` only for command discovery.

After `tcf` creates the scaffold, implement the business logic inside the generated files.

---

## Core Principle

**Publisher creates components (UI/layout/styling). You fill in the logic.**

- DO NOT create component files — publisher handles that
- YOU create custom hooks via `tcf` and connect them to existing components
- If a component has inline logic (fetch, useState for business data), extract it into custom hooks first

---

## Implementation Steps

1. Read plan from `plans/{task-name}/plan.md`
2. Read `codemaps/frontend.md` (if present)
3. **Run `tcf help <target-command> --text`, then `tcf` CLI to create all hook scaffolds with `--apply`** — this is the first action before writing any code
4. If plan includes `tests/`: copy test files to source tree, run Red verification (`pnpm test`)
5. If plan includes `e2e/`: copy E2E test files (contract-first — do NOT modify)
6. Implement logic inside the generated files
7. Run tests: `pnpm test` — confirm ALL pass (Green)
8. If plan includes `e2e/`: `pnpm exec playwright test` — if E2E fails, fix implementation, NOT tests
9. **Run `tcf validate-file` on every hook file you created or modified** — pass all files at once using `--json '{"files":["path1","path2"]}'`. If any violation is reported, fix the code to satisfy the rule and re-run validation until all pass. This step is non-negotiable because tcf enforces folder casing, path policy, export patterns, and naming rules that are easy to get wrong even when you scaffolded via tcf.
10. Commit changes
11. Return results based on plan.md

---

## Stack Specializations

- React 18+: Hooks, Context, Server Components
- Next.js 15: App Router, Server Actions, Streaming
- React Native: Expo SDK 52+, Expo Router
- State: TanStack Query, Zustand, Jotai
  </Instructions>
  </Skill_Guide>
