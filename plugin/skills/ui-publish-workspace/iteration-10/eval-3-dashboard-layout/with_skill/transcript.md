# Transcript: eval-3-dashboard-layout (with_skill)

## Task
DashboardLayout 컴포넌트를 프로젝트 컨벤션에 맞게 정리해줘. 사이드바, 헤더, 메인 콘텐츠 영역은 유지하고 구조만 더 명확하게 정리해줘.

## Date
2026-03-16

## Files Read
- `features/ui-publish-fixture/components/DashboardLayout.tsx` (original)
- `features/ui-publish-fixture/app/dashboard/page.tsx`
- `features/ui-publish-fixture/package.json`
- `features/ui-publish-fixture/app/globals.css`
- `features/ui-publish-fixture/components/StatsCard.tsx` (for convention reference)

## Analysis

The original `DashboardLayout.tsx` was a single large function component (~242 lines) with all UI logic inlined:
- Inline SVG icons repeated inside `navLinks` array
- Nav active-state class logic mixed inline in JSX
- No clear visual boundary between sidebar, header, mobile nav sections
- Hard to scan at a glance what the three layout regions are

## Changes Made

### `components/DashboardLayout.tsx`
Refactored with the following structural improvements:

1. **Icon constants extracted** — Five SVG icons (`IconHome`, `IconTodo`, `IconProfile`, `IconSettings`, `IconBell`) extracted as named constants at the top, removing inline SVG duplication from data arrays and JSX.

2. **NavLink interface added** — Explicit `NavLink` type for the nav data array.

3. **Class helper functions** — `getSidebarLinkClass()` and `getMobileLinkClass()` extract the active/inactive Tailwind class logic out of JSX, making it easy to read and modify.

4. **Sub-sections as functions** — Layout regions broken into clearly named sub-functions:
   - `SidebarLogo` — logo area in sidebar
   - `SidebarNav` — navigation links in sidebar
   - `SidebarFooter` — settings item at bottom of sidebar
   - `Sidebar` — composes the above three (maps to `<aside>`)
   - `HeaderLeft` — mobile logo + desktop page title
   - `HeaderRightDefault` — default bell + avatar placeholder
   - `Header` — composes header slot (maps to `<header>`)
   - `MobileBottomNav` — fixed bottom nav for mobile

5. **Root layout function** — `DashboardLayout` now reads as three clear structural blocks: `<Sidebar>`, `<Header>` + `<main>`, `<MobileBottomNav>` — immediately visible at a glance.

6. **All data-testid attributes preserved** — No regressions to existing E2E tests.

7. **Visual output unchanged** — Same Tailwind classes, same responsive breakpoints, same dark mode support.

## Verification
- `pnpm exec tsc --noEmit` — No errors in DashboardLayout.tsx (pre-existing errors in unrelated test/hook files)
- `pnpm lint --fix` — No errors in DashboardLayout.tsx (pre-existing errors in other files)

## Output Files
- `outputs/DashboardLayout.tsx`
