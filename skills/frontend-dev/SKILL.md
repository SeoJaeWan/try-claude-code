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

Expert frontend development workflow for React, Next.js, and React Native.

---

## Documentation References

**Read first:**

- `references/coding-rules/` - All coding rules
- `references/design/` - Design system (structure, principles)
- `codemaps/frontend.md` - Existing pages, routes, components (if present)
- `references/domain.md` - User scenarios and business logic

**Read actual values:**

- `tailwind.config.js` - Colors, spacing, fonts
- `app/globals.css` - CSS variables
- `components/ui/` - Existing components

**Read plan:**

- `plans/{task-name}/plan.md` - Implementation plan

**For latest docs, use WebSearch/WebFetch (official docs first).**

---

## Boilerplate Generation

Before implementing hooks, **always attempt to generate boilerplate first** using coding-rules scripts. The generated boilerplate includes correct hook structure, naming conventions, and test scaffolding — building on top of it prevents common mistakes like inconsistent patterns.

```bash
# Custom hook boilerplate
node references/coding-rules/scripts/generate.mjs hook <hookName> [--form]

# API hook boilerplate (query)
node references/coding-rules/scripts/generate.mjs api-hook <hookName> --method query

# API hook boilerplate (mutation)
node references/coding-rules/scripts/generate.mjs api-hook <hookName> --method mutation

# Test suite boilerplate
node references/coding-rules/scripts/generate.mjs test-suite <targetName> --type hook
```

---

## Core Principle

**Component = UI (from ui-publish) + Custom Hooks (from frontend-dev)**

- ui-publish creates layout (no logic)
- YOU add functionality via custom hooks

---

## Key Responsibilities

- Custom hooks (API, utils, page-specific)
- State management (TanStack Query, Zustand, Jotai)
- API integration with backend
- Connect hooks to UI components
- Mobile app development (Expo)

---

## TDD Workflow

1. **Copy unit test files** from `plans/{task-name}/tests/` to source tree
   - Read `tests/manifest.md` for file list and destination paths
   - Strip `tests/` prefix to get destination path
2. **Copy E2E test files** from `plans/{task-name}/e2e/` to the project's e2e test directory
   - Read `e2e/manifest.md` (if present) for file list and destination paths
   - E2E tests are plan artifacts (contract-first) — do NOT modify them
3. **Red verification**: `pnpm test` — tests must FAIL
4. **Implement** hooks/logic to pass tests
5. **Green verification**: `pnpm test` — ALL pass
6. **E2E verification**: `pnpm exec playwright test` — E2E must pass. If E2E fails, fix implementation, NOT tests.

---

## Implementation Steps

1. Read plan from `plans/{task-name}/plan.md`
2. Copy unit test files from `plans/{task-name}/tests/` to source tree (read `manifest.md` for paths)
3. Copy E2E test files from `plans/{task-name}/e2e/` to the project's e2e test directory (if present)
4. Red verification: `pnpm test` — confirm tests FAIL (no implementation yet)
5. Read domain.md (user scenarios)
6. Read CODEMAPS/frontend.md (if present)
7. Read design/ (design principles)
8. Use WebSearch/WebFetch if needed (React, Next.js, Expo, TanStack Query)
9. Confirm the current branch matches plan header (`**Branch:**`)
10. Implement:
    - Custom hooks (use `{hooksRoot}` rules from `folder-structure.md`)
    - State management integration
    - Connect to UI components from ui-publish
11. Run tests: `pnpm test` — confirm ALL pass (Green)
12. Run E2E tests: `pnpm exec playwright test` — confirm E2E pass. If E2E fails, fix implementation, NOT tests.
13. Run typecheck:
    - `pnpm run typecheck` (if no script exists, use `pnpm exec tsc --noEmit`)
    - No type errors allowed before proceeding to the next step
14. Verify and auto-fix lint:

```bash
pnpm lint --fix
```

- Manually fix any errors that cannot be auto-fixed
- Repeat until lint is clean

15. Run build verification (`pnpm build`)
    - 목적: TypeScript/ESLint에서 놓치는 프레임워크 설정 충돌을 조기 탐지
    - 기준: build exit code 0, blocking 에러 없음
16. Commit changes
17. Return results based on plan.md

---

## Folder Structure

`folder-structure.md`의 `{hooksRoot}` 규칙을 단일 기준으로 사용:

```
{hooksRoot}/
├── apis/          # API hooks (queries/, mutations/)
├── utils/         # Utility hooks (useDebounce, useLocalStorage)
└── {feature}/     # Page-specific hooks (필요 시)
```

---

## Stack Specializations

- React 18+: Hooks, Context, Server Components
- Next.js 15: App Router, Server Actions, Streaming
- React Native: Expo SDK 52+, Expo Router
- State: TanStack Query, Zustand, Jotai
- Styling: Tailwind CSS, shadcn/ui
  </Instructions>
  </Skill_Guide>
