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

Expert UI publisher for production-ready React components (visual only, no logic).

---

## Coding Rules

코드를 작성할 때 반드시 이 스킬에 번들된 references를 읽고 따른다:

- `${CLAUDE_SKILL_ROOT}/references/naming.md` — 네이밍 컨벤션, handle 접두사 규칙
- `${CLAUDE_SKILL_ROOT}/references/folder-structure.md` — 컴포넌트 배치 규칙, index.tsx export 패턴
- `${CLAUDE_SKILL_ROOT}/references/code-style.md` — Props 처리, Early Return 등 코드 스타일

---

## Design System

UI 작업 전 디자인 시스템을 반드시 참조한다:

- `${CLAUDE_PLUGIN_ROOT}/references/design/theme-tokens.md` — Color/spacing, design principles
- `${CLAUDE_PLUGIN_ROOT}/references/design/font.md` — Typography system
- `${CLAUDE_PLUGIN_ROOT}/references/design/components.md` — Component variants
- `${CLAUDE_PLUGIN_ROOT}/references/design/pages.md` — Page layout patterns
- `${CLAUDE_PLUGIN_ROOT}/references/design/references.md` — Design references

---

## Boilerplate Generation

Before creating components, **always attempt to generate boilerplate first**. The generated boilerplate includes correct default export pattern and project conventions.

generate.mjs는 플러그인에 번들된 스크립트다. `${CLAUDE_PLUGIN_ROOT}` 변수로 접근한다.

```bash
# Component boilerplate
node ${CLAUDE_PLUGIN_ROOT}/references/coding-rules/scripts/generate.mjs component <ComponentName>
```

---

## Layout-First Principle

**Focus on visual structure, NOT functionality:**
- Create UI components without business logic
- Leave onClick, onSubmit handlers empty or with placeholder props
- DO NOT implement: API calls, state management, form validation, auth logic
- Frontend-dev skill will add functionality later

---

## Font Usage

**Pretendard Variable:** `<repo-root>/.claude/assets/fonts/PretendardVariable.ttf`
- Use for ALL UI text (sans-serif)
- Variable font supports weights 100-900
- Font family: `"Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"`

---

## Implementation Steps

1. Read plan from `plans/{task-name}/plan.md` (if present)
2. Read design system guidelines (see Design System section above)
3. Read `codemaps/frontend.md` (if present)
4. Read actual values: `tailwind.config.js`, `app/globals.css`, `components/ui/`
5. Run boilerplate script — build on top of the generated files
6. Create component following project conventions
7. Use shadcn/ui components — locate existing shared UI component path first
8. Export as default export (Props 타입은 named export, 컴포넌트는 default export)
9. If plan includes `e2e/`: copy E2E test files (contract-first — do NOT modify)
10. Run typecheck: `pnpm run typecheck` (or `pnpm exec tsc --noEmit`)
11. Verify and auto-fix lint: `pnpm lint --fix`
12. If plan includes `e2e/`: `pnpm exec playwright test` — if E2E fails, fix implementation, NOT tests
13. Return results based on plan.md
  </Instructions>
  </Skill_Guide>
