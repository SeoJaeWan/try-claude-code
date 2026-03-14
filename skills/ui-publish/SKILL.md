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
- `references/design/theme-tokens.md` - Color/spacing structure, design principles (required)
- `references/design/font.md` - Typography system, font loading (required)
- `references/design/components.md` - Component variants, structure
- `references/design/pages.md` - Page layout patterns
- `references/design/references.md` - Design references
- `references/coding-rules/naming.md` - Naming conventions
- `references/coding-rules/folder-structure.md` - Folder structure
- `references/coding-rules/code-style.md` - Code style
- `codemaps/frontend.md` - Existing component structure (if present)

**Read actual implementation values:**
- `tailwind.config.js` - Actual colors, spacing, fontSize, borderRadius
- `app/globals.css` - CSS variables, global styles
- `components/ui/` - Actual component implementations

**For latest docs, refer to local project files and existing component implementations.**

---

## Boilerplate Generation

Before creating components, **always attempt to generate boilerplate first** using coding-rules scripts. The generated boilerplate includes correct default export pattern and project conventions — building on top of it prevents common mistakes like missing default exports or wrong file structure.

```bash
# Component boilerplate (generates default export, Props interface, etc.)
node references/coding-rules/scripts/generate.mjs component <ComponentName>

# Next.js page structure
node references/coding-rules/scripts/generate.mjs structure <pagePath> [--create]
```

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
6. Run boilerplate script (see Boilerplate Generation section) — build on top of the generated files
7. Create component following project conventions
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

## Export Pattern

Props 타입은 named export, 컴포넌트는 반드시 default export — 이 패턴을 일관되게 지켜야 프로젝트 전체의 import 컨벤션이 유지된다.

```tsx
// ✅ Correct
export interface ProductCardProps {
  title: string;
  price: number;
  imageUrl: string;
}

export default function ProductCard({ title, price, imageUrl }: ProductCardProps) {
  return ( /* ... */ );
}

// ❌ Wrong — named export for component
export const ProductCard = ({ ... }: ProductCardProps) => { ... };
```

---

## Code Style

- Arrow functions, props destructuring, default export
- Import ordering, constant definitions
- Use lucide-react for icons
- Mobile-first responsive design

---

## E2E Tests

- E2E 테스트는 계획 단계에서 `plan-e2e-test` skill이 contract artifact로 생성한다
- UI publisher는 E2E 테스트를 트리거하거나 작성하지 않는다
- E2E 테스트는 plan artifact로 이미 동결되어 있으며, 구현이 이를 통과해야 한다
</Instructions>
</Skill_Guide>
