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
4. **Use `tcp` CLI to create component scaffolds** — do NOT create component files manually:
   ```bash
   # Inspect current publisher rules
   tcp --help
   tcp --help --text

   # Component
   tcp component <ComponentName> --path page/homePage

   # Shared type
   tcp type <TypeName> --path types/common

   # Validate content against active profile
   tcp validate component --content "const HomePage = () => { return <div />; }"
   ```
5. Implement visual layout inside the generated files
6. If plan includes `e2e/`: copy E2E test files (contract-first — do NOT modify)
7. If plan includes `e2e/`: `pnpm exec playwright test` — if E2E fails, fix implementation, NOT tests
8. Return results based on plan.md

## CLI Notes

- `tcp --help` defaults to JSON for agent consumption.
- Use `tcp --help --text` only when you need a human-readable summary.
- `tcp component` requires `--path`.
- Publisher must not add business logic. `useEffect`, `fetch`, `axios`, `useQuery`, `useMutation` are blocked by CLI rules.
  </Instructions>
  </Skill_Guide>
