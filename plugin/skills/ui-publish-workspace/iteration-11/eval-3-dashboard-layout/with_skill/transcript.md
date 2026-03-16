# Transcript: eval-3-dashboard-layout (with_skill)

## Task

DashboardLayout 컴포넌트를 프로젝트 컨벤션에 맞게 정리해줘. 사이드바, 헤더, 메인 콘텐츠 영역은 유지하고 구조만 더 명확하게 정리해줘.

## Steps Taken

### 1. Read context files

Read `package.json`, `components/DashboardLayout.tsx`, and `app/dashboard/page.tsx` to understand the current state.

### 2. Explore project structure

Discovered:
- `components/DashboardLayout.tsx` — flat monolithic file (the target to refactor)
- `components/dashboard/dashboardLayout/` — already has a split-component pattern with `index.tsx`, `Sidebar.tsx`, `Header.tsx`, `MobileNav.tsx`
- `components/Button/index.tsx`, `components/ProductCard/index.tsx` — confirm folder-based index pattern is the project convention

### 3. Identify conventions from existing code

By reading `components/dashboard/dashboardLayout/index.tsx` and its sub-components, the project convention is:
- `"use client"` directive on components using Next.js client APIs (Link)
- camelCase constant names (`navItems` not `NAV_LINKS`)
- Semantic type name (`NavItem` not `NavLink`)
- Section comments using `// ----` style separators per logical area
- Clean prop names (`title` not `headerTitle`, `right` not `headerRight`)
- Default export for component, named export for Props interface
- Sub-components inlined in the same file when kept as a single file
- Inline comments inside JSX using `{/* */}` to explain each layout region

### 4. Apply refactoring to DashboardLayout.tsx

Changes made to `components/DashboardLayout.tsx`:

| Change | Before | After |
|--------|--------|-------|
| Client directive | missing | `"use client"` added at top |
| Constant name | `NAV_LINKS: NavLink[]` (SCREAMING_SNAKE_CASE) | `navItems: NavItem[]` (camelCase) |
| Type name | `NavLink` | `NavItem` |
| Prop name | `headerTitle` | `title` |
| Prop name | `headerRight` in Header component | `right` |
| Sub-component split | `SidebarLogo`, `SidebarNav`, `SidebarFooter`, `Sidebar`, `HeaderDefaultRight`, `Header`, `MobileNav` (7 sub-components) | `Sidebar`, `Header`, `MobileNav` (3 logical sub-components, with internal JSX comments) |
| Section separators | `// ---- ... ----` (hyphens) | `// ---- ... ----` (consistent 64-char separators) |
| MobileNav position | Inside `div` before `main` | After `main` (matches `dashboard/dashboardLayout/index.tsx` ordering) |
| SVG formatting | Single-line SVG opening tags | Multi-line attribute formatting |

### 5. Typecheck and lint

- `pnpm exec tsc --noEmit` — no errors in `DashboardLayout.tsx` (pre-existing errors in test files unrelated to this component)
- `pnpm lint --fix` — no errors in `DashboardLayout.tsx` (pre-existing errors in other files)

## Output

`components/DashboardLayout.tsx` — refactored to match project conventions

Key structural result:
- Sidebar (logo + nav + footer)
- Header (mobile logo / desktop title + right slot with default notification+avatar)
- Main content area
- MobileNav (fixed bottom bar, mobile only)

All `data-testid` attributes preserved to maintain E2E test compatibility.
