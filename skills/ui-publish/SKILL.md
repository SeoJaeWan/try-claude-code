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

## Documentation References

**Read first (structure and principles):**
- `.claude/try-claude/references/design/theme-tokens.md` - Color/spacing structure, design principles (required)
- `.claude/try-claude/references/design/font.md` - Typography system, font loading (required)
- `.claude/try-claude/references/design/components.md` - Component variants, structure
- `.claude/try-claude/references/design/pages.md` - Page layout patterns
- `.claude/try-claude/references/design/references.md` - Design references
- `.claude/try-claude/references/coding-rules/naming.md` - Naming conventions
- `.claude/try-claude/references/coding-rules/folder-structure.md` - Folder structure
- `.claude/try-claude/references/coding-rules/code-style.md` - Code style
- `.claude/try-claude/codemaps/frontend.md` - Existing component structure (if present)

**Read actual implementation values:**
- `tailwind.config.js` - Actual colors, spacing, fontSize, borderRadius
- `app/globals.css` - CSS variables, global styles
- `components/ui/` - Actual component implementations

**For latest docs, use WebSearch/WebFetch (official docs first).**

---

## Boilerplate Generation

Before creating components, generate boilerplate using coding-rules scripts:

```bash
# Component boilerplate
node .claude/try-claude/references/coding-rules/scripts/generate.mjs component <ComponentName>

# Next.js page structure
node .claude/try-claude/references/coding-rules/scripts/generate.mjs structure <pagePath> [--create]
```

> If scripts are not found (init-try not run), skip boilerplate generation and implement manually.

---

## Why CODEMAPS/frontend.md? (if present)

- ✅ Understand existing component folder structure
- ✅ Place new components in consistent locations
- ✅ Avoid duplicate components
- ✅ Reuse existing patterns

---

## Key Responsibilities

- ALL UI/visual component creation
- Layout implementation (header, footer, sidebar, grid, flex)
- Page structure and templates
- Tailwind CSS styling
- shadcn/ui component integration
- motion/react animations
- Responsive design (mobile-first)

---

## Layout-First Principle

**Focus on visual structure, NOT functionality:**
- Create UI components without business logic
- Leave onClick, onSubmit handlers empty or with placeholder props
- DO NOT implement: API calls, state management, form validation, auth logic
- Frontend-dev skill will add functionality later

---

## Implementation Steps

1. Read request (image, URL, or description)
2. Use WebSearch/WebFetch for UI library docs (React, Tailwind, shadcn/ui, motion/react)
3. Read design system guidelines (structure and principles)
4. Read CODEMAPS/frontend.md (if present)
5. Read actual implementation values (tailwind.config.js, components/ui/)
6. Create component following project conventions
7. Use shadcn/ui components — first locate the actual shared UI component path in the project
   - 목적: 기존 UI 컴포넌트 위치와 naming을 재사용해 중복 생성을 방지
   - 일반 우선순위: `src/components/ui` -> `app/components/ui` -> `components/ui`
8. Apply animations with motion/react or tw-animate-css
9. Export as default export
10. Run typecheck:
    - `pnpm run typecheck` (if no script exists, use `pnpm exec tsc --noEmit`)
    - No type errors allowed before proceeding to the next step
11. Verify and auto-fix lint:
    ```bash
    pnpm lint --fix
    ```
    - Manually fix any errors that cannot be auto-fixed
    - Repeat until lint is clean
12. Return results based on plan.md

---

## Font Usage (REQUIRED)

**Pretendard Variable:** `<repo-root>/.claude/assets/fonts/PretendardVariable.ttf` (project-level asset, not managed by the plugin)
- Use for ALL UI text (sans-serif)
- Variable font supports weights 100-900
- Font family: `"Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"`
- **DO NOT** use other fonts unless explicitly requested

---

## Code Style

- Arrow functions, props destructuring, default export
- Import ordering, constant definitions
- Use lucide-react for icons
- Mobile-first responsive design

---

## E2E Test Trigger

- **After you create UI, Playwright Test Agents automatically generate E2E tests**
- Your UI layout serves as foundation for E2E tests
- Playwright Planner → Generator → Healer pipeline handles all E2E automation
- DO NOT write E2E tests manually — delegate to Playwright Test Agents
</Instructions>
</Skill_Guide>
