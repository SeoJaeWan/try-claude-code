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

## Coding Rules

코드를 작성할 때 반드시 이 스킬에 번들된 references를 읽고 따른다:

- `${CLAUDE_SKILL_ROOT}/references/naming.md` — use{Verb}{Resource} 훅 네이밍, 배열 변수 복수형
- `${CLAUDE_SKILL_ROOT}/references/folder-structure.md` — 훅 배치 규칙, index.ts export 패턴, queries/ vs mutations/ 구분

---

## Boilerplate Generation

Before implementing hooks, **always attempt to generate boilerplate first**.

generate.mjs는 플러그인에 번들된 스크립트다. `${CLAUDE_PLUGIN_ROOT}` 변수로 접근한다.

```bash
# Custom hook boilerplate
node ${CLAUDE_PLUGIN_ROOT}/references/coding-rules/scripts/generate.mjs hook <hookName> [--form]

# API hook boilerplate (query)
node ${CLAUDE_PLUGIN_ROOT}/references/coding-rules/scripts/generate.mjs api-hook <hookName> --method query

# API hook boilerplate (mutation)
node ${CLAUDE_PLUGIN_ROOT}/references/coding-rules/scripts/generate.mjs api-hook <hookName> --method mutation
```

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
3. Read coding rules (`${CLAUDE_SKILL_ROOT}/references/`)
4. If plan includes `tests/`: copy test files to source tree (read `manifest.md` for paths), run Red verification (`pnpm test`)
5. If plan includes `e2e/`: copy E2E test files (contract-first — do NOT modify)
6. **Extract inline logic**: if target component has inline fetch, useState (for business data), useEffect — extract into custom hooks first
7. Implement:
    - Custom hooks (use `{hooksRoot}` rules from `folder-structure.md`)
    - State management integration
    - Connect hooks to components created by publisher
8. Run tests: `pnpm test` — confirm ALL pass (Green)
9. If plan includes `e2e/`: `pnpm exec playwright test` — if E2E fails, fix implementation, NOT tests
10. Run typecheck: `pnpm run typecheck` (or `pnpm exec tsc --noEmit`)
11. Verify and auto-fix lint: `pnpm lint --fix`
12. Commit changes
13. Return results based on plan.md

---

## Folder Structure

`folder-structure.md`의 `{hooksRoot}` 규칙을 단일 기준으로 사용:

```
{hooksRoot}/
├── apis/
│   ├── queries/       # GET (data fetching): useFetchOrder, useGetUser
│   └── mutations/     # POST/PUT/DELETE (data modification): useLogin, useCreateMemo
├── utils/             # Utility hooks (useDebounce, useLocalStorage)
└── {feature}/         # Page-specific hooks (when needed)
```

API hooks must be placed under queries/ or mutations/, never directly under apis/.
Auth-related hooks (login, register) are mutations (they modify data).
Each hook uses the `{hookName}/index.ts` directory pattern.

---

## Stack Specializations

- React 18+: Hooks, Context, Server Components
- Next.js 15: App Router, Server Actions, Streaming
- React Native: Expo SDK 52+, Expo Router
- State: TanStack Query, Zustand, Jotai
  </Instructions>
  </Skill_Guide>
