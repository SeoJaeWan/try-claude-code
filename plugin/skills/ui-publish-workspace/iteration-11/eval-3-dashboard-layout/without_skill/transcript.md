# DashboardLayout Refactor — Without Skill Guidance

## Task
`components/DashboardLayout.tsx`를 프로젝트 컨벤션에 맞게 정리.
사이드바, 헤더, 메인 콘텐츠 영역을 유지하면서 구조를 더 명확하게.

## Analysis

### Existing file: `components/DashboardLayout.tsx`
- 단일 파일에 모든 서브 컴포넌트 포함 (SidebarLogo, SidebarNav, SidebarFooter, Header, HeaderDefaultRight, MobileNav)
- `NAV_LINKS` — SCREAMING_SNAKE_CASE 상수
- `interface NavLink` — local, unexported
- Sub-components are local functions, not exportable

### Project convention (from `components/dashboard/dashboardLayout/` and `components/ProductCard/`):
- **Folder-based structure**: 컴포넌트를 폴더로 분리, `index.tsx` + 개별 파일
- **Named exports for Props types**: `export interface XxxProps`
- **Default export for component**: `export default function Xxx`
- **`"use client"` at top** of client-interactive files
- **`navLinks` camelCase** constant (not `NAV_LINKS`)
- **Inline JSX comments** (`{/* ... */}`) for section labeling

## Changes Made

### Structure: monolithic → folder split

```
components/DashboardLayout.tsx  (before — monolithic)

components/dashboard/dashboardLayout/  (after — folder split)
├── index.tsx        # Root layout shell (Sidebar + Header + main + MobileNav)
├── Sidebar.tsx      # Desktop sidebar (logo + nav + footer)
├── Header.tsx       # Sticky top header (mobile logo + desktop title + right slot)
├── MobileNav.tsx    # Fixed bottom nav for mobile
└── navLinks.tsx     # Shared nav link data (avoids duplication between Sidebar/MobileNav)
```

### Key convention fixes applied
| Before | After |
|--------|-------|
| `NAV_LINKS` | `navLinks` |
| `interface NavLink` (unexported) | `export interface NavLink` in `navLinks.tsx` |
| `SidebarLogo`, `SidebarNav`, `SidebarFooter` as local functions | Inlined inside `Sidebar.tsx` with section comments |
| `HeaderDefaultRight` as local function | Inlined as default fallback in `Header.tsx` |
| `headerTitle` / `headerRight` props passed through | `title` / `right` in `Header.tsx` (cleaner prop names) |
| `Header({ headerTitle, headerRight })` | `Header({ title, right })` |
| No `"use client"` | Added to `Sidebar.tsx`, `Header.tsx`, `MobileNav.tsx` |

## Output Files

- `components/dashboard/dashboardLayout/index.tsx`
- `components/dashboard/dashboardLayout/Sidebar.tsx`
- `components/dashboard/dashboardLayout/Header.tsx`
- `components/dashboard/dashboardLayout/MobileNav.tsx`
- `components/dashboard/dashboardLayout/navLinks.tsx`
