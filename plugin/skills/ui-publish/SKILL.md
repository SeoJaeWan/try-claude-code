---
name: ui-publish
description: UI/UX component creation (layout-first, no logic). Use for all visual work, layouts, styling, and responsive design.
model: sonnet
context: fork
agent: publisher
---

<Skill_Guide>
<Purpose>
UI/UX component creation (layout-first, no logic). Use for all visual work, layouts, styling, and responsive design.
</Purpose>

<Instructions>
# ui-publish

Expert UI publisher for production-ready React components (visual only, no business logic).

---

## CLI 필수 사용

이 프로젝트는 `tcp` CLI로 컴포넌트를 관리한다. **모든 작업에서 반드시 `tcp`를 실행해야 한다.**

1. 먼저 `tcp --help`를 실행하여 사용 가능한 명령어를 확인한다
2. 요청받은 작업에 맞는 `tcp` 명령어를 매칭한다 (component, validateFile, batch 등)
3. 해당 명령어의 `tcp help <command> --text`로 사용법을 읽는다
4. `tcp <command> --apply`로 실행한다

기존 코드에 flat 파일(`ComponentName.tsx`)이 있더라도 이를 따르지 않는다. `tcp`가 생성하는 directory-based 패턴이 이 프로젝트의 target 구조다.

---

## Layout-First Principle

시각적 구조에만 집중하고, 비즈니스 로직은 구현하지 않는다:
- UI 인터랙션 상태는 허용 (sidebar toggle, accordion, modal open/close, tab selection)
- 구현 금지: API 호출, form 데이터 관리, 인증 로직, 데이터 필터링
- 데이터 의존 핸들러는 placeholder props로 남겨둔다 — frontend-dev 스킬이 나중에 채운다

---

## Font

**Pretendard Variable:** `<repo-root>/.claude/assets/fonts/PretendardVariable.ttf`
- 모든 UI 텍스트에 사용 (sans-serif), weights 100-900
- Font family: `"Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"`

---

## Implementation Steps

1. Read plan from `plans/{task-name}/plan.md` (if present)
2. Read `codemaps/frontend.md` (if present)
3. Read project theme/style: `tailwind.config.js`, `app/globals.css`
4. **`tcp --help`를 실행**하고 요청에 맞는 명령어를 찾는다
5. **`tcp help <command> --text`로 사용법을 읽고, `tcp <command> --apply`로 scaffold를 생성**한다
6. 생성된 파일 안에서 visual layout을 구현한다
7. If plan includes `e2e/`: copy E2E test files (contract-first — do NOT modify)
8. If plan includes `e2e/`: `pnpm exec playwright test` — if E2E fails, fix implementation, NOT tests
9. **반드시 `tcp validate-file`을 실행하여 생성/수정한 모든 파일을 검증한다.** 위반이 보고되면 코드를 수정하고 통과할 때까지 재검증한다. 이 단계를 건너뛰지 않는다.
10. Return results based on plan.md
  </Instructions>
  </Skill_Guide>
