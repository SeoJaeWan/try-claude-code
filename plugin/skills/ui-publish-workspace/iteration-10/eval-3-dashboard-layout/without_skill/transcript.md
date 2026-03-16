# Transcript: DashboardLayout Refactor (without skill)

## Task
DashboardLayout 컴포넌트를 프로젝트 컨벤션에 맞게 정리.
사이드바, 헤더, 메인 콘텐츠 영역 유지, 구조만 더 명확하게 정리.

## Files Read
- `features/ui-publish-fixture/package.json` — project deps (Next.js 16, React 19, Tailwind v4)
- `features/ui-publish-fixture/components/DashboardLayout.tsx` — original monolithic component
- `features/ui-publish-fixture/app/dashboard/page.tsx` — page using the layout
- `features/ui-publish-fixture/components/dashboard/dashboardLayout/index.tsx` — existing split version (reference)
- `features/ui-publish-fixture/components/dashboard/dashboardLayout/Sidebar.tsx`
- `features/ui-publish-fixture/components/dashboard/dashboardLayout/Header.tsx`
- `features/ui-publish-fixture/components/dashboard/dashboardLayout/MobileNav.tsx`
- `features/ui-publish-fixture/app/globals.css`

## Analysis

The original `DashboardLayout.tsx` was a ~243 line monolithic component. The project also has
a well-structured split version at `components/dashboard/dashboardLayout/` as a reference for
the expected conventions.

Key conventions observed from the split version:
- Props type: named export (`DashboardLayoutProps`)
- Component: default export
- Internal sub-components (Sidebar, Header, MobileNav) declared in file scope
- `navLinks` constant declared once and shared between Sidebar and MobileNav
- Section comments using `─── Name ───` separator style
- Tailwind classes: mobile-first responsive, dark mode variants

## Changes Made

Refactored `components/DashboardLayout.tsx`:

1. **Section organization** — Added clear `─── Types ───`, `─── Nav data ───`, `─── Sidebar ───`, `─── Header ───`, `─── MobileNav ───`, `─── DashboardLayout ───` section separators for visual clarity.

2. **Shared navLinks constant** — Extracted nav data as a single `navLinks` constant, shared between `Sidebar` and `MobileNav` (eliminates duplication from original where each had its own copy).

3. **Internal sub-components** — Extracted `Sidebar`, `Header`, and `MobileNav` as private file-scope functions. Removes one big monolithic render tree and gives each section a clear name and props interface.

4. **Cleaner prop naming** — `Header` now takes `{ title, right }` (concise) instead of passing through the outer prop names directly.

5. **Tailwind class ordering** — Reordered to consistent mobile-first pattern (e.g. `hidden flex-col ... md:flex md:w-60` instead of `hidden md:flex md:w-60 flex-col`).

6. **Removed unused NavLink interface** — The intermediate `interface NavLink` was removed since TypeScript infers the type from the array literal.

7. **Export pattern preserved** — `DashboardLayoutProps` as named export, `DashboardLayout` as default export.

## Output Files

- `outputs/DashboardLayout.tsx` — refactored component

## TypeCheck Result

Pre-existing errors in unrelated files (`hooks/apis/queries/useFetchOrder/__tests__/`, `playwright.config.ts`).
No new errors introduced by the refactor.
