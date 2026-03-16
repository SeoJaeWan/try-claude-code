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

## Step 0 — Run tcp CLI (before anything else)

The very first thing you do — before reading existing code, before writing any file — is scaffold every new component through `tcp`. Start with `tcp help component --text` to read the path/naming policies and examples at low token cost. Use `tcp help component` only when you need the structured JSON contract, and use top-level `tcp --help` only for command discovery. If placement is unclear, run `tcp guide component` and follow the `components/common/{component}` or `components/{domain}/{component}` rule.

**Why this matters:** The project is migrating from flat `ComponentName.tsx` files to a directory-based `ComponentName/index.tsx` pattern. You will see old flat files in the codebase — ignore that pattern. All new components go through `tcp` which enforces the new standard. If you create a flat `.tsx` file instead of using the CLI, the component will not match the project's target structure.

After `tcp` writes the scaffold, open the generated `index.tsx` and implement the visual layout inside it.

---

## Layout-First Principle

Focus on visual structure, NOT business logic:
- UI interaction state is allowed (sidebar toggle, accordion, modal open/close, tab selection)
- DO NOT implement: API calls, form data management, auth logic, data filtering
- Leave data-dependent handlers as placeholder props — frontend-dev skill will add functionality later

---

## Font Usage

**Pretendard Variable:** `<repo-root>/.claude/assets/fonts/PretendardVariable.ttf`
- Use for ALL UI text (sans-serif), weights 100-900
- Font family: `"Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"`

---

## Implementation Steps

1. Read plan from `plans/{task-name}/plan.md` (if present)
2. Read `codemaps/frontend.md` (if present)
3. Read project theme/style: `tailwind.config.js`, `app/globals.css`
4. **Run `tcp help component --text`, then `tcp guide component` when placement is ambiguous, then `tcp component --apply` (or `tcp batch --apply`) for every new component** — this is the first action before writing any code
5. Open each generated `index.tsx` and implement the visual layout inside it
6. If plan includes `e2e/`: copy E2E test files (contract-first — do NOT modify)
7. If plan includes `e2e/`: `pnpm exec playwright test` — if E2E fails, fix implementation, NOT tests
8. Return results based on plan.md
  </Instructions>
  </Skill_Guide>
