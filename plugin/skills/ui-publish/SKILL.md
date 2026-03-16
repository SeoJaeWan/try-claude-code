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

## Required CLI Usage

Use the `tcp` CLI when developing components. All project component rules are defined in `tcp help --text` — read it before starting any work. Use `tcp <command> --apply` when scaffolding is needed, and run `tcp validate-file` to verify results when done.

---

## Layout-First Principle

Focus on visual structure only — do not implement business logic:
- UI interaction state is allowed (sidebar toggle, accordion, modal open/close, tab selection)
- Do not implement: API calls, form data management, auth logic, data filtering
- Leave data-dependent handlers as placeholder props — the frontend-dev skill fills them in later

---

## Font

**Pretendard Variable:** `<repo-root>/.claude/assets/fonts/PretendardVariable.ttf`
- Use for all UI text (sans-serif), weights 100-900
- Font family: `"Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"`

---

## Implementation Steps

1. Read plan from `plans/{task-name}/plan.md` (if present)
2. Read `codemaps/frontend.md` (if present)
3. Read project theme/style: `tailwind.config.js`, `app/globals.css`
4. **Run `tcp help --text`** to learn the component rules, then use `tcp` throughout development
5. Implement the visual layout inside the component
6. If plan includes `e2e/`: copy E2E test files (contract-first — do NOT modify)
7. If plan includes `e2e/`: `pnpm exec playwright test` — if E2E fails, fix implementation, NOT tests
8. **Run `tcp validate-file` on all created/modified files.** Fix any reported violations and re-validate until all pass. Do not skip this step.
9. Return results based on plan.md
  </Instructions>
  </Skill_Guide>
