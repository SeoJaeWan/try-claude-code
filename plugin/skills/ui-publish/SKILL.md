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

All file creation goes through `tcp` CLI. Never create component files manually — the CLI enforces naming, folder structure (index.tsx pattern), and export conventions that are impossible to get right by hand.

---

## CLI-First Workflow

Every component must be created via `tcp`. Run `tcp --help` first to see available commands.

```bash
# See all commands and rules
tcp --help

# Create a component (generates ComponentName/index.tsx)
tcp component --json '{"name":"ReviewCard","path":"components/reviewCard"}' --apply

# Create UI state snippet
tcp uiState --json '{"category":"uiInteraction","pattern":"toggle","name":"menu"}'

# Batch multiple operations
tcp batch --json '{"ops":[...]}' --apply
```

After `tcp` creates the scaffold, implement the visual layout inside the generated files.

---

## Layout-First Principle

**Focus on visual structure, NOT business logic:**
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
4. **Run `tcp` CLI to create all component scaffolds with `--apply`** — this is the first action before writing any code
5. Implement visual layout inside the generated files
6. If plan includes `e2e/`: copy E2E test files (contract-first — do NOT modify)
7. If plan includes `e2e/`: `pnpm exec playwright test` — if E2E fails, fix implementation, NOT tests
8. Return results based on plan.md
  </Instructions>
  </Skill_Guide>
