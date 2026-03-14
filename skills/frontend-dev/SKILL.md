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

generate.mjs는 이 스킬과 같은 플러그인 안에 있다. 이 SKILL.md 파일의 위치에서 `../../references/coding-rules/scripts/generate.mjs`로 접근할 수 있다.

```bash
# Custom hook boilerplate
node ../../references/coding-rules/scripts/generate.mjs hook <hookName> [--form]

# API hook boilerplate (query)
node ../../references/coding-rules/scripts/generate.mjs api-hook <hookName> --method query

# API hook boilerplate (mutation)
node ../../references/coding-rules/scripts/generate.mjs api-hook <hookName> --method mutation

# Test suite boilerplate
node ../../references/coding-rules/scripts/generate.mjs test-suite <targetName> --type hook
```

> 위 경로는 이 SKILL.md 기준 상대경로다. 실행 시 이 SKILL.md의 실제 위치를 기준으로 절대경로를 구성하라.

---

## Coding Rules 준수

파일이나 폴더를 생성·배치할 때 반드시 아래 문서를 읽고 따른다:

- `references/coding-rules/folder-structure.md` — 훅/컴포넌트 배치 규칙, index.ts export 패턴, queries/ vs mutations/ 구분
- `references/coding-rules/naming.md` — use{Verb}{Resource} 훅 네이밍, handle 접두사, 배열 변수 복수형

이 문서들은 이 SKILL.md 기준 `../../references/coding-rules/`에 있다.

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
10. Implement:
    - Custom hooks (use `{hooksRoot}` rules from `folder-structure.md`)
    - State management integration
    - Connect to UI components from ui-publish
11. **테스트 파일 생성**: 플랜에 테스트가 없는 경우에도 생성한 훅에 대한 테스트 파일을 작성한다. generate.mjs의 `test-suite` 명령으로 보일러플레이트를 생성한 후 테스트 케이스를 추가한다.
12. Run tests: `pnpm test` — confirm ALL pass (Green)
13. Run E2E tests: `pnpm exec playwright test` — confirm E2E pass. If E2E fails, fix implementation, NOT tests.
14. Run typecheck:
    - `pnpm run typecheck` (if no script exists, use `pnpm exec tsc --noEmit`)
    - No type errors allowed before proceeding to the next step
15. Verify and auto-fix lint:

```bash
pnpm lint --fix
```

- Manually fix any errors that cannot be auto-fixed
- Repeat until lint is clean

16. Run build verification (`pnpm build`)
    - 목적: TypeScript/ESLint에서 놓치는 프레임워크 설정 충돌을 조기 탐지
    - 기준: build exit code 0, blocking 에러 없음
17. Commit changes
18. Return results based on plan.md

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
