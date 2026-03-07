# Dashboard Layout Component - Workflow Simulation

## Task

Create a dashboard layout component with sidebar, header, and main content area.

---

## Workflow Steps (Following ui-publish Skill)

### Step 1: Read Request

The user requests a dashboard layout component consisting of three areas:
- **Sidebar** - left navigation panel (responsive: hidden on mobile, icon-only on tablet, full on desktop)
- **Header** - top bar with page title and actions
- **Main Content** - primary content area

### Step 2: Read Design System Guidelines

Referenced the following design documents:
- `theme-tokens.md` - Dark mode default, Developer-First Minimal concept, 4px spacing scale, responsive breakpoints (Mobile 0-767px, Tablet 768-1023px, Desktop 1024-1279px, Wide 1280px+)
- `font.md` - Pretendard Variable font, font-sans usage via Tailwind
- `components.md` - Sidebar (web), Header, Card-based layout patterns
- `pages.md` - Dashboard page pattern: grid layout, card-based sections, responsive (Mobile 1-col, Tablet+ 2-col)

### Step 3: Read Coding Conventions

Referenced the following coding rules:
- `code-style.md` - Arrow functions, props destructured in body (not parameter), early return pattern
- `naming.md` - Event handlers use `handle` prefix, callback props use `on` prefix
- `folder-structure.md` - Layout components go in `components/common/` or `components/layouts/`, UI components receive props only (no logic)

### Step 4: Check Existing Components (CODEMAPS)

Would check `.claude/try-claude/codemaps/frontend.md` if present to avoid duplicating existing layout components.

### Step 5: Read Implementation Values

Would read `tailwind.config.js` and `app/globals.css` for actual color tokens, spacing values, and CSS variables.

### Step 6: Generate Boilerplate (if available)

Would attempt:
```bash
node .claude/try-claude/references/coding-rules/scripts/generate.mjs component DashboardLayout
```
If scripts are not found, implement manually (as simulated below).

### Step 7: Create Component

**File location:** `components/common/dashboardLayout/index.tsx`

Following the skill's layout-first principle: visual structure only, no business logic, placeholder props for handlers.

```tsx
// components/common/dashboardLayout/index.tsx
"use client";

import { Menu, X, Home, Settings, BarChart3, FileText, Bell, Search, User } from "lucide-react";
import { useState } from "react";

type NavItem = {
  icon: React.ReactNode;
  label: string;
  href: string;
  isActive?: boolean;
};

type DashboardLayoutProps = {
  children: React.ReactNode;
  title?: string;
  navItems?: NavItem[];
  onNavItemClick?: (href: string) => void;
  onNotificationClick?: () => void;
  onProfileClick?: () => void;
  onSearchChange?: (value: string) => void;
};

const DEFAULT_NAV_ITEMS: NavItem[] = [
  { icon: <Home size={20} />, label: "Home", href: "/", isActive: true },
  { icon: <BarChart3 size={20} />, label: "Analytics", href: "/analytics" },
  { icon: <FileText size={20} />, label: "Documents", href: "/documents" },
  { icon: <Settings size={20} />, label: "Settings", href: "/settings" },
];

const DashboardLayout = (props: DashboardLayoutProps) => {
  const {
    children,
    title = "Dashboard",
    navItems = DEFAULT_NAV_ITEMS,
    onNavItemClick,
    onNotificationClick,
    onProfileClick,
    onSearchChange,
  } = props;

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleToggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const handleNavItemClick = (href: string) => {
    onNavItemClick?.(href);
    setIsSidebarOpen(false);
  };

  return (
    <div className="flex h-screen w-full bg-bg-primary text-text-primary font-sans">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={handleToggleSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col
          bg-bg-secondary border-r border-border-default
          transition-transform duration-200 ease-out
          w-64 lg:w-[200px]
          md:relative md:translate-x-0
          md:w-16 lg:w-[200px]
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Sidebar Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-border-subtle">
          <span className="text-lg font-semibold hidden lg:block">App</span>
          <button
            className="p-2 rounded-md hover:bg-bg-tertiary md:hidden"
            onClick={handleToggleSidebar}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {navItems.map((item) => (
              <li key={item.href}>
                <button
                  className={`
                    flex w-full items-center gap-3 rounded-lg px-3 py-2.5
                    text-sm font-medium transition-colors duration-100
                    ${
                      item.isActive
                        ? "bg-accent-primaryMuted text-accent-primary"
                        : "text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
                    }
                  `}
                  onClick={() => handleNavItemClick(item.href)}
                >
                  <span className="shrink-0">{item.icon}</span>
                  <span className="hidden lg:block">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-border-subtle p-4">
          <button
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-text-secondary hover:bg-bg-tertiary"
            onClick={onProfileClick}
          >
            <User size={20} />
            <span className="hidden lg:block">Profile</span>
          </button>
        </div>
      </aside>

      {/* Main Area (Header + Content) */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border-default bg-bg-secondary px-4 lg:px-6">
          {/* Left: Mobile menu + Title */}
          <div className="flex items-center gap-3">
            <button
              className="p-2 rounded-md hover:bg-bg-tertiary md:hidden"
              onClick={handleToggleSidebar}
              aria-label="Open sidebar"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-lg font-semibold lg:text-xl">{title}</h1>
          </div>

          {/* Right: Search + Notifications */}
          <div className="flex items-center gap-2">
            {/* Search (desktop only) */}
            <div className="relative hidden sm:block">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              />
              <input
                type="text"
                placeholder="Search..."
                className="h-9 w-48 rounded-lg border border-border-default bg-bg-primary pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none lg:w-64"
                onChange={(e) => onSearchChange?.(e.target.value)}
              />
            </div>

            <button
              className="relative p-2 rounded-md hover:bg-bg-tertiary"
              onClick={onNotificationClick}
              aria-label="Notifications"
            >
              <Bell size={20} />
              {/* Notification dot */}
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-semantic-error" />
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="mx-auto max-w-[1440px]">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
```

### Step 8: Apply Animations

The skill specifies using `motion/react` or `tw-animate-css`. For a layout component, subtle transitions are applied via Tailwind utility classes:
- Sidebar slide: `transition-transform duration-200 ease-out`
- Hover states: `transition-colors duration-100`
- Overlay fade: handled by conditional rendering (could enhance with `motion/react` AnimatePresence)

### Step 9: Export as Default Export

The component uses `export default DashboardLayout` as required.

### Step 10: Run Typecheck

Would execute:
```bash
pnpm run typecheck
# or fallback: pnpm exec tsc --noEmit
```
Fix any type errors before proceeding.

### Step 11: Verify and Auto-fix Lint

Would execute:
```bash
pnpm lint --fix
```
Manually fix any remaining errors and repeat until clean.

### Step 12: Return Results

Component created at `components/common/dashboardLayout/index.tsx`.

---

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| Dark mode default | Per theme-tokens.md: "Developer-First Dark Minimal" |
| Mobile-first responsive | Per theme-tokens.md breakpoint strategy |
| Sidebar: hidden mobile, icon tablet, full desktop | Per theme-tokens.md: Mobile (bottom nav/hidden), Tablet (icon 64px), Desktop (text 200px) |
| 4px spacing scale | Per theme-tokens.md spacing system |
| Semantic color tokens | Per theme-tokens.md: `bg.primary`, `bg.secondary`, `text.primary`, etc. |
| Props destructured in body | Per code-style.md convention |
| Arrow function + default export | Per code-style.md and skill requirements |
| No business logic | Per layout-first principle: visual only |
| lucide-react icons | Per skill code style requirements |
| max-w-[1440px] on content | Per theme-tokens.md: Wide viewport max width limit |
| `handle` prefix for handlers | Per naming.md convention |
| `on` prefix for callback props | Per naming.md convention |

---

## Component API

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `React.ReactNode` | required | Main content area |
| `title` | `string` | `"Dashboard"` | Header page title |
| `navItems` | `NavItem[]` | default items | Sidebar navigation items |
| `onNavItemClick` | `(href: string) => void` | - | Navigation callback |
| `onNotificationClick` | `() => void` | - | Notification bell callback |
| `onProfileClick` | `() => void` | - | Profile button callback |
| `onSearchChange` | `(value: string) => void` | - | Search input callback |

---

## Responsive Behavior

| Viewport | Sidebar | Header | Content |
|----------|---------|--------|---------|
| Mobile (0-767px) | Hidden (hamburger toggle, overlay) | Menu button + title + notifications | Full width, p-4 |
| Tablet (768-1023px) | Icon-only (64px, fixed) | Title + search + notifications | Flex-1, p-4 |
| Desktop (1024px+) | Full text (200px, fixed) | Title + wide search + notifications | Flex-1, p-6, max-w-1440px |

---

## File Structure

```
components/
└── common/
    └── dashboardLayout/
        └── index.tsx    # DashboardLayout component
```

This follows the folder-structure.md convention: layout components used across multiple pages belong in `components/common/`.
