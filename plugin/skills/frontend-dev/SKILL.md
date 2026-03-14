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

## Coding Rules

코드를 작성할 때 반드시 이 스킬에 번들된 references를 읽고 따른다:

- `${CLAUDE_SKILL_ROOT}/references/naming.md` — use{Verb}{Resource} 훅 네이밍, handle 접두사, 배열 변수 복수형
- `${CLAUDE_SKILL_ROOT}/references/folder-structure.md` — 훅/컴포넌트 배치 규칙, index.ts export 패턴, queries/ vs mutations/ 구분
- `${CLAUDE_SKILL_ROOT}/references/code-style.md` — Props 처리, Early Return, 삼항 연산자 규칙

---

## Boilerplate Generation

Before implementing hooks, **always attempt to generate boilerplate first** using coding-rules scripts. The generated boilerplate includes correct hook structure, naming conventions, and test scaffolding — building on top of it prevents common mistakes like inconsistent patterns.

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

**Component = UI (from ui-publish) + Custom Hooks (from frontend-dev)**

- ui-publish creates layout (no logic)
- YOU add functionality via custom hooks
- 기존 컴포넌트에 인라인 로직(fetch, useState)이 있으면, 새 기능 추가 전에 먼저 커스텀 훅으로 추출한다

---

## Implementation Steps

1. Read plan from `plans/{task-name}/plan.md`
2. Read `codemaps/frontend.md` (if present)
3. Read coding rules (`${CLAUDE_SKILL_ROOT}/references/`)
4. If plan includes `tests/`: copy test files to source tree (read `manifest.md` for paths), run Red verification (`pnpm test`)
5. If plan includes `e2e/`: copy E2E test files (contract-first — do NOT modify)
6. **기존 인라인 로직 추출**: 수정할 컴포넌트에 인라인 fetch, useState, useEffect가 있으면 먼저 커스텀 훅으로 추출한다
7. Implement:
    - Custom hooks (use `{hooksRoot}` rules from `folder-structure.md`)
    - State management integration
    - Connect to UI components from ui-publish
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
