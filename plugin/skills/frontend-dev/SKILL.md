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

## CLI 필수 사용

이 프로젝트는 `tcf` CLI로 hook을 관리한다. **모든 작업에서 반드시 `tcf`를 실행해야 한다.**

1. 먼저 `tcf --help`를 실행하여 사용 가능한 명령어를 확인한다
2. 요청받은 작업에 맞는 `tcf` 명령어를 매칭한다 (hook, apiHook, validateFile, batch 등)
3. 해당 명령어의 `tcf help <command> --text`로 사용법을 읽는다
4. `tcf <command> --apply`로 실행한다

---

## Core Principle

**Publisher가 컴포넌트(UI/layout/styling)를 만들고, frontend-dev가 로직을 채운다.**

- 컴포넌트 파일은 직접 생성하지 않는다 — publisher가 담당
- custom hook을 만들어 기존 컴포넌트에 연결한다
- 컴포넌트에 인라인 로직(fetch, useState for business data)이 있으면 custom hook으로 추출한다

---

## Implementation Steps

1. Read plan from `plans/{task-name}/plan.md`
2. Read `codemaps/frontend.md` (if present)
3. **`tcf --help`를 실행**하고 요청에 맞는 명령어를 찾는다
4. **`tcf help <command> --text`로 사용법을 읽고, `tcf <command> --apply`로 scaffold를 생성**한다
5. 생성된 파일 안에서 로직을 구현한다
6. If plan includes `tests/`: copy test files to source tree, run Red verification (`pnpm test`)
7. If plan includes `e2e/`: copy E2E test files (contract-first — do NOT modify)
8. Run tests: `pnpm test` — confirm ALL pass (Green)
9. If plan includes `e2e/`: `pnpm exec playwright test` — if E2E fails, fix implementation, NOT tests
10. **반드시 `tcf validate-file`을 실행하여 생성/수정한 모든 파일을 검증한다.** 위반이 보고되면 코드를 수정하고 통과할 때까지 재검증한다. 이 단계를 건너뛰지 않는다.
11. Return results based on plan.md

---

## Stack

- React 18+: Hooks, Context, Server Components
- Next.js 15: App Router, Server Actions, Streaming
- React Native: Expo SDK 52+, Expo Router
- State: TanStack Query, Zustand, Jotai
  </Instructions>
  </Skill_Guide>
