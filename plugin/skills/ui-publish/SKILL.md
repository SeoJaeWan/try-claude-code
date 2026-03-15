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

## Coding Rules

Read `${CLAUDE_SKILL_ROOT}/references/coding-rules.md` before writing code — it covers naming conventions, component structure, folder placement, and the UI component principle.

---

## Boilerplate Generation

Before creating components, **always attempt to generate boilerplate first**.

generate.mjs는 플러그인에 번들된 스크립트다. `${CLAUDE_PLUGIN_ROOT}` 변수로 접근한다.

```bash
# Component boilerplate
node ${CLAUDE_PLUGIN_ROOT}/references/coding-rules/scripts/generate.mjs component <ComponentName>
```

---

## Layout-First Principle

**Focus on visual structure, NOT business logic:**
- UI interaction state is allowed (sidebar toggle, accordion, modal open/close, tab selection)
- DO NOT implement: API calls, form data management, auth logic, data filtering
- Leave data-dependent handlers as placeholder props — frontend-dev skill will add functionality later

---

## Font Usage

**Pretendard Variable:** `<repo-root>/.claude/assets/fonts/PretendardVariable.ttf`
- Use for ALL UI text (sans-serif)
- Variable font supports weights 100-900
- Font family: `"Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"`

---

## Implementation Steps

1. Read plan from `plans/{task-name}/plan.md` (if present)
2. Read `codemaps/frontend.md` (if present)
3. Read project theme/style: `tailwind.config.js`, `app/globals.css`
4. Read coding rules (`${CLAUDE_SKILL_ROOT}/references/coding-rules.md`)
5. Run boilerplate script — build on top of the generated files
6. Create component following project conventions
7. Export as default export (Props interface as named export, component as default export)
8. If plan includes `e2e/`: copy E2E test files (contract-first — do NOT modify)
9. If plan includes `e2e/`: `pnpm exec playwright test` — if E2E fails, fix implementation, NOT tests
10. Return results based on plan.md
  </Instructions>
  </Skill_Guide>
