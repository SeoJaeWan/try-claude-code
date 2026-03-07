# Dashboard Layout Component

## Overview

A React + TypeScript dashboard layout component featuring three core areas: a collapsible sidebar, a top header bar, and a scrollable main content region.

## Files Created

```
components/DashboardLayout/
  index.ts                       - Barrel exports
  DashboardLayout.tsx            - Root layout component
  DashboardLayout.module.css     - Layout styles
  Sidebar.tsx                    - Sidebar navigation component
  Sidebar.module.css             - Sidebar styles
  Header.tsx                     - Header bar component
  Header.module.css              - Header styles
  DashboardLayout.example.tsx    - Usage example
```

## Features

### Sidebar
- Fixed-position left sidebar (260px wide)
- Collapse/expand toggle (collapses to 72px icon-only mode)
- Nested navigation items with expand/collapse
- Badge support (numeric or text)
- Active item highlighting
- Brand/logo area at top
- Mobile: slides in/out with overlay backdrop

### Header
- Fixed-height top bar (64px)
- Page title display
- Sidebar toggle button (separate desktop/mobile buttons)
- Notification bell icon
- User avatar with dropdown menu (profile, preferences, logout)
- Click-outside detection to close dropdown

### Main Content
- Flexible, scrollable content area
- Receives children via props for full composability
- Responsive padding (24px desktop, 16px mobile)

## Component API

### DashboardLayout Props

| Prop           | Type                     | Default       | Description                          |
|----------------|--------------------------|---------------|--------------------------------------|
| children       | `ReactNode`              | required      | Main content area                    |
| sidebarItems   | `SidebarItem[]`          | `[]`          | Navigation items for sidebar         |
| title          | `string`                 | `'Dashboard'` | Header title                         |
| user           | `UserInfo`               | `undefined`   | User info for header menu            |
| onNavigate     | `(path: string) => void` | `undefined`   | Callback on sidebar item click       |
| onLogout       | `() => void`             | `undefined`   | Callback on logout button click      |

### SidebarItem

| Field    | Type             | Description                        |
|----------|------------------|------------------------------------|
| id       | `string`         | Unique identifier                  |
| label    | `string`         | Display text                       |
| icon     | `ReactNode`      | Optional icon element              |
| path     | `string`         | Route path                         |
| badge    | `string | number`| Optional badge value               |
| children | `SidebarItem[]`  | Optional nested sub-items          |

### UserInfo

| Field     | Type     | Description           |
|-----------|----------|-----------------------|
| name      | `string` | Display name          |
| email     | `string` | Email (shown in menu) |
| avatarUrl | `string` | Avatar image URL      |
| role      | `string` | User role label       |

## Usage

```tsx
import { DashboardLayout } from './components/DashboardLayout';

<DashboardLayout
  title="Overview"
  sidebarItems={navItems}
  user={currentUser}
  onNavigate={(path) => router.push(path)}
  onLogout={() => auth.signOut()}
>
  <YourPageContent />
</DashboardLayout>
```

## Technical Decisions

- **CSS Modules**: Chosen for scoped styling without external dependencies.
- **No external libraries**: Zero dependencies beyond React itself.
- **Accessibility**: ARIA roles and labels on navigation, menu, and toggle buttons.
- **Responsive**: Mobile breakpoint at 768px with overlay sidebar and adapted header.
- **State management**: Local `useState` only; no global state needed for layout concerns.
