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

**Read first (스킬 번들 참조):**

- `${CLAUDE_SKILL_ROOT}/references/naming.md` — 훅 네이밍, handle 접두사, 배열 변수
- `${CLAUDE_SKILL_ROOT}/references/folder-structure.md` — 훅/컴포넌트 배치 규칙, queries/ vs mutations/
- `${CLAUDE_SKILL_ROOT}/references/code-style.md` — Props 처리, Early Return

**Read from consumer repo (프로젝트 루트 기준):**

- `codemaps/frontend.md` - Existing pages, routes, components (if present)

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

generate.mjs는 이 플러그인에 번들된 스크립트다. `${CLAUDE_PLUGIN_ROOT}` 변수로 접근한다.

```bash
# Custom hook boilerplate
node ${CLAUDE_PLUGIN_ROOT}/references/coding-rules/scripts/generate.mjs hook <hookName> [--form]

# API hook boilerplate (query)
node ${CLAUDE_PLUGIN_ROOT}/references/coding-rules/scripts/generate.mjs api-hook <hookName> --method query

# API hook boilerplate (mutation)
node ${CLAUDE_PLUGIN_ROOT}/references/coding-rules/scripts/generate.mjs api-hook <hookName> --method mutation

# Test suite boilerplate
node ${CLAUDE_PLUGIN_ROOT}/references/coding-rules/scripts/generate.mjs test-suite <targetName> --type hook
```

---

## Coding Rules

코드를 작성할 때 반드시 이 스킬에 번들된 references를 읽고 따른다:

- `${CLAUDE_SKILL_ROOT}/references/naming.md` — use{Verb}{Resource} 훅 네이밍, handle 접두사, 배열 변수 복수형
- `${CLAUDE_SKILL_ROOT}/references/folder-structure.md` — 훅/컴포넌트 배치 규칙, index.ts export 패턴, queries/ vs mutations/ 구분
- `${CLAUDE_SKILL_ROOT}/references/code-style.md` — Props 처리, Early Return, 삼항 연산자 규칙

---

## Core Principle

**Component = UI (from ui-publish) + Custom Hooks (from frontend-dev)**

- ui-publish creates layout (no logic)
- YOU add functionality via custom hooks
- 기존 컴포넌트에 인라인 로직(fetch, useState)이 있으면, 새 기능 추가 전에 먼저 커스텀 훅으로 추출한다

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
10. **기존 인라인 로직 추출**: 수정할 컴포넌트에 직접적인 fetch, useState, useEffect 등 인라인 로직이 있으면, 새 기능 구현 전에 먼저 커스텀 훅으로 추출한다. 인라인 로직 위에 기능을 쌓으면 컴포넌트가 비대해지고 테스트가 어려워진다.
11. Implement:
    - Custom hooks (use `{hooksRoot}` rules from `folder-structure.md`)
    - State management integration
    - Connect to UI components from ui-publish
12. Run tests: `pnpm test` — confirm ALL pass (Green)
13. Run E2E tests: `pnpm exec playwright test` — confirm E2E pass. If E2E fails, fix implementation, NOT tests.
14. Run typecheck:
    - `pnpm run typecheck` (if no script exists, use `pnpm exec tsc --noEmit`)
    - No type errors allowed before proceeding to the next step
16. Verify and auto-fix lint:

```bash
pnpm lint --fix
```

- Manually fix any errors that cannot be auto-fixed
- Repeat until lint is clean

17. Run build verification (`pnpm build`)
    - 목적: TypeScript/ESLint에서 놓치는 프레임워크 설정 충돌을 조기 탐지
    - 기준: build exit code 0, blocking 에러 없음
18. Commit changes
19. Return results based on plan.md

---

## Folder Structure

`folder-structure.md`의 `{hooksRoot}` 규칙을 단일 기준으로 사용:

```
{hooksRoot}/
├── apis/
│   ├── queries/       # GET (데이터 조회): useFetchOrder, useGetUser
│   └── mutations/     # POST/PUT/DELETE (데이터 변경): useLogin, useCreateMemo
├── utils/             # Utility hooks (useDebounce, useLocalStorage)
└── {feature}/         # Page-specific hooks (필요 시)
```

API 훅은 반드시 queries/ 또는 mutations/ 하위에 배치하고 apis/ 직하에 두지 않는다.
로그인, 회원가입 등 인증 관련 훅은 데이터를 변경하는 동작이므로 mutations/에 배치한다.
각 훅은 `{hookName}/index.ts` 디렉토리 패턴으로 생성한다.

---

## Stack Specializations

- React 18+: Hooks, Context, Server Components
- Next.js 15: App Router, Server Actions, Streaming
- React Native: Expo SDK 52+, Expo Router
- State: TanStack Query, Zustand, Jotai
- Styling: Tailwind CSS, shadcn/ui
  </Instructions>
  </Skill_Guide>
